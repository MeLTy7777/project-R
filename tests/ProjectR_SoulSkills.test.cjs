"use strict";
// I6: SOUL戦闘のスキル(承認済み9枚: 絶・サイコポンポス・葦笛・エロスの矢・神託・竪琴・ヴェイル・月桂冠・ヒュアキントス)。ProjectR_SoulSkills。
//   実エンジン(全plugin)で、各カードのLv1〜3の効果・時間・上限・ATTACK終了時の解除・通常マップの定義を確かめる。
// ハーネスは描画をしない。見た目・実際の入力は tools/mz_cdp/soul_skills_verify.cjs。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const vm = require("node:vm");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { buildWorld, plain, attachHpBars, barHp, handIds, aimDegree } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const frames = (w, n) => { for (let i = 0; i < n; i++) { w.ctx.Graphics.frameCount = (w.ctx.Graphics.frameCount || 0) + 1; w.frames(1); } };   // CombatPresence の終了猶予のため frameCount を進める
const quietly = fn => { const original = console.log; console.log = () => {}; try { return fn(); } finally { console.log = original; } };
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];
const STAGE_ID = 6;

// ---------------------------------------------------------------- 世界 ----------------------------------------------------------------
const container = () => ({ children: [], addChild(c) { c.parent = this; this.children.push(c); return c; }, addChildAt(c, i) { c.parent = this; this.children.splice(i, 0, c); return c; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = null; } });
const display = (original = true) => ({ renderable: original, visible: true, parent: null });
// 画面の表示物の代用品(実機では Spriteset/Hendrix/BattleHUD が作る)。プレイヤー・仲間のSpriteは安定した配列で持つ。
function decorate(w) {
    const scene = w.sc();
    const sp = scene._spriteset, ctx = w.ctx;
    sp.addChild = c => { c.parent = sp; sp.children.push(c); return c; };
    sp.removeChild = c => { const i = sp.children.indexOf(c); if (i >= 0) sp.children.splice(i, 1); c.parent = null; };
    sp._tilemap = container();
    sp.scale = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y === undefined ? x : y; } };
    sp.x = 0; sp.y = 0;
    sp._baseSprite = Object.assign(container(), { children: [{ _blackScreen: true }] });          // MZ は最背面に不透明な黒い画面を置く
    if (!scene.children.includes(sp)) scene.children.push(sp);          // 実機では Spriteset_Map は Scene_Map の子
    const player = { _character: ctx.$gamePlayer, renderable: true, visible: true, children: [{ renderable: true, name: "shadow" }, { renderable: true, name: "nameplate" }], x: 0, y: 0, addChild() {}, removeChild() {} };
    const other = { _character: { eventId: () => 99 }, renderable: true, children: [], x: 0, y: 0, addChild() {}, removeChild() {} };
    Object.defineProperty(sp, "_characterSprites", { configurable: true, writable: true, value: [player, other] });
    const extra = { hudLayer: display(), menuButton: display(), hendrixHud: display() };
    scene._projectRBattleHudLayer = extra.hudLayer; scene._menuButton = extra.menuButton;
    scene.hendrixHuds = [{ container: extra.hendrixHud, index: 0, x: 0, y: 0, updateHUD() {}, updateDrag() {}, evaluateX: () => 0, evaluateY: () => 0 }];
    w.parts = { player, other, extra, sp };
    return w.parts;
}
const mapJson = id => read(`data/Map${String(id).padStart(3, "0")}.json`);
// マップ移動の完了を模擬する(本物は Scene_Map が Game_Player.performTransfer を呼ぶ)
function arrive(w) {
    const ctx = w.ctx, id = ctx.$gamePlayer.newMapId();
    ctx.$dataMap = w.run("(text) => JSON.parse(text)")(mapJson(id));
    ctx.DataManager.onLoad(ctx.$dataMap);
    ctx.$gamePlayer.performTransfer();
    ctx.$gameTemp.initCharacterTempDatas(); ctx.$gameMap.initMapCharactersCache(); ctx.$gamePlayer.setupCollideTriggerEventIds();
    decorate(w);
    return id;
}
function world({ size = [1920, 1080], origin = { map: 1, x: 12, y: 20 } } = {}) {
    const w = buildWorld();
    assert.equal(w.failures.length, 0, JSON.stringify(w.failures));
    w.enterMap(origin.map, origin.x, origin.y); frames(w, 4);
    w.ctx.Graphics._width = size[0]; w.ctx.Graphics._height = size[1];
    w.run("Math.random = () => 0.999;");
    w.sc = () => w.ctx.SceneManager._scene;
    w.stage = w.ctx.ProjectRSoulStage; w.sb = w.ctx.ProjectRSoulSandbox; w.soul = w.ctx.ProjectRSoulBattle; w.hud = w.ctx.ProjectRSoulBattleHUD; w.deck = w.ctx.ProjectRCardDeck; w.bf = w.ctx.ProjectRBossFramework;
    w.at = w.ctx.ProjectRApolloTest;
    w.origin = origin;
    decorate(w);
    w.ends = []; w.soul.onEnd(e => w.ends.push(plain(e).reason));
    w.transfers = [];
    const p = w.ctx.$gamePlayer, original = p.reserveTransfer;
    p.reserveTransfer = function(...args) { w.transfers.push(args.slice(0, 4)); return original.apply(this, args); };
    w.calls = [];
    const callCommand = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { w.calls.push({ name, args }); return callCommand.apply(this, arguments); };
    return w;
}
const stageState = w => plain(w.stage.getState());
const snapshot = w => JSON.stringify({ deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null, dirty: w.at.isDirty(), cardBattle: w.deck.isCardBattleActive(),
    sources: plain(w.ctx.ProjectRCombatSession.sources()), weapon: w.ctx.$gameParty.leader().equips()[0]?.id ?? 0, move: w.run("playerMovementDisabled"), boss: w.bf.getState()?.bossId ?? null });
const hurt = (w, id, amount) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: `-${amount}`, exceedMaxHealth: "false" });
// a16を専用ステージで始める: 開始 → 移動の予約 → 到着 → 準備の実行
function a16(w, options = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, ...options })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    assert.equal(stageState(w).state, "entering");
    arrive(w);
    frames(w, 8);                                         // 到着 → active → 準備(3フレーム待ち)
    const status = plain(w.sb.status && quietly(() => w.sb.status()));
    assert.equal(stageState(w).state, "active", JSON.stringify(stageState(w)));
    assert.equal(w.soul.isActive(), true, "SOUL戦闘が始まった " + JSON.stringify(status.a16 || null));
    const heart = w.soul.getState().heart.eventId;
    w.heart = heart;
    attachHpBars(w, [heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });   // attachHpBars が差し替えるので、安定した配列へ戻す
    frames(w, 4);
    return w;
}
const mouseAt = (w, sx, sy) => { const m = w.stage.toStage(sx, sy); w.mouse(Math.round(m.x), Math.round(m.y)); };   // 画面座標(sx, sy)にカーソルがある状態(ステージ座標で持つ)


// ---------------------------------------------------------------- I4-A 攻撃の起点・重複Spriteの除去 ----------------------------------------------------------------
const TILE = 48;
const heartTile = w => plain(w.ctx.ProjectRSoulBattlePoC.getState().hitCenter);
const cursorAtTile = (w, tx, ty) => w.mouse(Math.round(tx * TILE), Math.round(ty * TILE));              // ステージにいる間、TouchInput はステージ座標(= タイル x 48)
const newEvents = (w, before) => w.ctx.$gameMap.events().filter(e => e && !before.has(e));
const eventCenter = e => ({ x: e._realX + 0.5, y: e._realY + 0.5 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const playerCenter = w => { const p = w.ctx.$gamePlayer.centerPositionPoint(); return { x: p.x, y: p.y }; };
const quiet = w => { w.ctx.ProjectRSoulBattleDodge.disarm(); return w; };                                // 位置の検証のため、ハートの回避を止める(静止ハート)
const ready = (options = {}) => { const w = quiet(a16(world(), options)); frames(w, 2); return w; };

// ---------------------------------------------------------------- I6 SOUL戦闘のスキル(承認済み9枚) ----------------------------------------------------------------
const SK = w => w.ctx.ProjectRSoulSkills;
const CM = w => w.ctx.ProjectRCardModifiers;
const DG = w => w.ctx.ProjectRSoulBattleDodge;
const leader = w => w.ctx.$gameParty.leader();
const setHp = (w, hp) => { const a = leader(w); a._hp = hp; return a.hp; };
const heartHpNow = w => barHp(w, w.heart);
const cardIndex = (w, id) => plain(w.deck.getBattleState()).hand.findIndex(x => x.cardId === id);
const useCard = (w, id) => { const i = cardIndex(w, id); assert.ok(i >= 0, id + " が手札にある " + JSON.stringify(handIds(w))); return plain(w.deck.requestUseCard(i)); };
const effects = w => plain(SK(w).getEffects());
const kinds = w => effects(w).map(e => e.kind);
const heartDamage = (w, amount) => hurt(w, w.heart, amount);
const lv = level => ({ level });
const startSkills = (hand, options = {}) => { const w = quiet(a16(world(), { openingHand: hand, ...options })); frames(w, 2); return w; };

test("登録と範囲: SOULスキルは SOULの入力・ステージ・Dodgeの後、HUDの前に1回だけ。SOULが動いていない間は何もしない(定義・Cooldownを変えない)。ゲームの状態・セーブを書かない", () => {
    const names = (() => { const c = {}; vm.runInNewContext(read("js/plugins.js"), c); return c.$plugins.map(p => p.name); })();
    assert.equal(names.filter(n => n === "ProjectR_SoulSkills").length, 1);
    const i = names.indexOf("ProjectR_SoulSkills");
    for (const dep of ["ProjectR_SoulBattle", "ProjectR_SoulBattleStage", "ProjectR_SoulBattleInput", "ProjectR_SoulBattleDodge", "ProjectR_ApolloLyreRhythm", "ProjectR_ApolloErosArrow", "ProjectR_HermesZetsu", "ProjectR_HermesVeil", "ProjectR_CardModifiers"]) assert.ok(names.indexOf(dep) >= 0 && names.indexOf(dep) < i, dep + " より後");
    assert.ok(i < names.indexOf("ProjectR_SoulBattleHUD"), "HUDより前");
    const code = read("js/plugins/ProjectR_SoulSkills.js").split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /\$gameSystem|StorageManager|saveGame|\.setHp\(|_hp\s*=|\$gameVariables\.setValue|\$gameSwitches\.setValue|\.consume|useCard/, "セーブ・HPの直接書き込み・カードの消費を扱わない");
    const w = world();
    assert.equal(SK(w).isActive(), false);
    const z = w.deck.definitions.card("hermes_zetsu");
    assert.deepEqual([z.category, z.cooldownSeconds], ["movement", 0.5], "SOULの外では絶の定義は元のまま");
    assert.deepEqual([...SK(w).REPLACED].sort(), ["apollo_oracle", "apollo_hyacinthus", "apollo_laurel_wreath", "hermes_psychopomp", "hermes_reed_flute", "hermes_veil", "hermes_zetsu"].sort());
    assert.equal(SK(w).getEffects().length, 0);
});

test("絶(SOUL専用の構え): 移動せず1枚消費・Cooldown 6秒。0.8秒以内の最初の通常武器の命中が ×1.5/×2/×3。Lv3は1秒間 攻撃間隔が半分。通常武器が無ければ非消費。ATTACKが終われば消える。移動カードの遮断の定義はSOULの外で元へ戻る", () => {
    for (const level of [1, 2, 3]) {
        const w = startSkills(["hermes_zetsu", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { weapon: "sword", level });
        const z = w.deck.definitions.card("hermes_zetsu");
        assert.deepEqual([z.category, z.cooldownSeconds], ["special", 6], "SOUL中は移動カードの分類から外れ、Cooldown 6秒");
        const p0 = [w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY], pile = plain(w.deck.getBattleState()).cooldownPile.length;
        const r = useCard(w, "hermes_zetsu");
        assert.equal(r.ok, true, JSON.stringify(r));
        assert.deepEqual([w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY], p0, "移動しない");
        assert.equal(plain(w.deck.getBattleState()).cooldownPile.length, pile + 1, "1枚消費");
        const entry = plain(w.deck.getBattleState()).cooldownPile.find(e => e.instance.cardId === "hermes_zetsu");
        assert.ok(entry && Math.abs(entry.remainingSeconds - 6) < 0.05, "Cooldown 6秒: " + (entry && entry.remainingSeconds));
        const bonus = plain(CM(w).getWeaponHitBonus());
        assert.equal(bonus.multiplier, [1.5, 2, 3][level - 1], `Lv${level} 倍率`);
        assert.ok(bonus.remaining > 0.7 && bonus.remaining <= 0.8 + 1e-6, "0.8秒: " + bonus.remaining);
        assert.equal(w.ctx.ProjectRSwordSystem.getCooldownScale(), level >= 3 ? 2 : 1, level >= 3 ? "Lv3は攻撃間隔が半分" : "Lv1・2は変えない");
        frames(w, 60);
        assert.equal(plain(CM(w).getWeaponHitBonus()), null, "0.8秒で消える");
        assert.equal(w.ctx.ProjectRSwordSystem.getCooldownScale(), 1, "1秒後に攻撃間隔は元へ");
        quietly(() => w.sb.stop());
    }
    // 倍率が実際のダメージに乗る(最初の1回だけ)
    const base = startSkills(["hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil", "hermes_psychopomp"], { weapon: "sword", level: 3 });
    const heart = heartTile(base);
    cursorAtTile(base, heart.x, heart.y); frames(base, 3);
    const hp0 = heartHpNow(base);
    base.attackClick(); frames(base, 6);
    const plainDrop = hp0 - heartHpNow(base);
    quietly(() => base.sb.stop());
    const w = startSkills(["hermes_zetsu", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { weapon: "sword", level: 3 });
    cursorAtTile(w, heart.x, heart.y); frames(w, 3);
    assert.equal(useCard(w, "hermes_zetsu").ok, true);
    const before = heartHpNow(w);
    w.attackClick(); frames(w, 6);
    const boosted = before - heartHpNow(w);
    assert.ok(plainDrop > 0 && boosted >= plainDrop * 2.4, `最初の命中は約×3: ${plainDrop} → ${boosted}`);
    frames(w, 40);
    const before2 = heartHpNow(w);
    w.attackClick(); frames(w, 6);
    assert.ok(before2 - heartHpNow(w) <= plainDrop * 1.3, "2回目は通常");
    quietly(() => w.sb.stop());
    // 通常武器が無ければ使えない(非消費)
    const nw = startSkills(["hermes_zetsu", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { weapon: "sword", level: 1 });
    nw.ctx.$gameParty.leader().forceChangeEquip(0, null); frames(nw, 3);
    const pile = plain(nw.deck.getBattleState()).cooldownPile.length;
    const refused = useCard(nw, "hermes_zetsu");
    assert.deepEqual([refused.ok, refused.detail || refused.reason], [false, "noWeapon"]);
    assert.equal(plain(nw.deck.getBattleState()).cooldownPile.length, pile, "非消費");
    quietly(() => nw.sb.stop());
    // SOULが終われば定義は元へ(通常のマップの絶は元のまま)
    const w3 = startSkills(["hermes_zetsu", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { weapon: "sword" });
    assert.equal(SK(w3).getState().defsSwapped, true);
    quietly(() => w3.sb.stop()); arrive(w3); frames(w3, 3);
    const z = w3.deck.definitions.card("hermes_zetsu");
    assert.deepEqual([z.category, z.cooldownSeconds, SK(w3).getState().defsSwapped], ["movement", 0.5, false], "終了後は元の定義");
});

test("サイコポンポス: 使用後10秒間、敵ハートにダメージが当たるたびに魂(最大3つ)。カーソルを重ねるか2秒で回収し、プレイヤーHP +50/+100/+150(Lv3は回収から3秒 攻撃力+3%)。ATTACKが終わる時に残りを回収", () => {
    for (const [level, amount] of [[1, 50], [2, 100], [3, 150]]) {
        const w = startSkills(["hermes_psychopomp", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { level });
        const heart = heartTile(w);
        cursorAtTile(w, 2, 2); frames(w, 2);                                              // カーソルは魂から遠く
        setHp(w, 100);
        assert.equal(useCard(w, "hermes_psychopomp").ok, true);
        assert.deepEqual(kinds(w), ["psychopomp"]);
        heartDamage(w, 20); frames(w, 2);
        let e = effects(w).find(x => x.kind === "psychopomp");
        assert.equal(e.souls, 1, "命中のたびに魂が1つ");
        frames(w, 60);
        assert.equal(leader(w).hp, 100, "回収前は回復しない(1秒)");
        frames(w, 70);
        assert.equal(leader(w).hp, 100 + amount, `Lv${level}: 2秒で自動回収 +${amount}`);
        // 上限3つ
        for (let i = 0; i < 5; i++) { heartDamage(w, 5); frames(w, 1); }
        e = effects(w).find(x => x.kind === "psychopomp");
        assert.equal(e.souls, 2, "最初の1つを使った残りの上限(3つのうち)");
        quietly(() => w.sb.stop());
    }
    // カーソルを重ねるとすぐ回収する / 回復はHPの空きまで / Lv3の攻撃力+3%(重ね掛け)
    const w = startSkills(["hermes_psychopomp", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { level: 3 });
    const heart = heartTile(w);
    cursorAtTile(w, heart.x, heart.y); frames(w, 2);
    setHp(w, leader(w).mhp - 40);
    useCard(w, "hermes_psychopomp");
    heartDamage(w, 10); frames(w, 3);
    assert.equal(leader(w).hp, leader(w).mhp, "カーソルが魂の上なら即回収。回復量はHPの空き(40)まで");
    const hook = w.ctx.ProjectRCardModifiers;
    assert.equal(effects(w).find(x => x.kind === "psychopomp").souls, 0);
    // 魂を残してATTACKが終わる → 自動回収して全効果を終える
    cursorAtTile(w, 2, 2); frames(w, 2);
    setHp(w, 100);
    heartDamage(w, 10); frames(w, 2);
    assert.equal(effects(w).find(x => x.kind === "psychopomp").souls, 1);
    w.soul.skipPhase(); frames(w, 3);
    assert.equal(w.soul.getPhase(), "defense");
    assert.equal(leader(w).hp, 250, "残った魂はATTACK終了時に自動回収(+150)");
    assert.deepEqual(effects(w), [], "DEFENSEへ持ち越さない");
    void hook;
    quietly(() => w.sb.stop());
});

test("葦笛: カーソル中心の半径8マスに敵ハートがいれば、4秒(ボスは2秒)回避AIが停止。ダメージで起きる。Lv2: 眠っている間の最初の命中 +50、Lv3: その命中は確定クリティカル。範囲外は効果なしで消費。ATTACK終了で解除", () => {
    const w = startSkills(["hermes_reed_flute", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { level: 3 });
    const heart = heartTile(w);
    DG(w).arm({ boss: "dev_boss" });
    cursorAtTile(w, heart.x + 5, heart.y); frames(w, 2);
    assert.equal(useCard(w, "hermes_reed_flute").ok, true);
    let mods = plain(DG(w).getModifiers());
    assert.equal(mods.frozen, true, "回避AIが停止");
    const e = effects(w).find(x => x.kind === "reed");
    assert.ok(e, "葦笛の効果が動いている");
    const st = plain(DG(w).getState());
    assert.equal(!!st.boss, true, "SOULのボス(dev_boss)の設定");
    frames(w, 100);
    assert.equal(plain(DG(w).getModifiers()).frozen, true, "ボスは2秒(120フレーム)まで: 100フレーム後はまだ停止");
    frames(w, 30);
    assert.equal(plain(DG(w).getModifiers()).frozen, false, "ボスは2秒で解除");
    assert.deepEqual(kinds(w), []);
    quietly(() => w.sb.stop());
    // ボスでない敵(AIがボスの設定でない)は4秒
    const w2 = startSkills(["hermes_reed_flute", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { level: 1 });
    DG(w2).arm({ profile: "balanced" });
    cursorAtTile(w2, heartTile(w2).x, heartTile(w2).y); frames(w2, 2);
    useCard(w2, "hermes_reed_flute");
    frames(w2, 200);
    assert.equal(plain(DG(w2).getModifiers()).frozen, true, "ボスでなければ4秒(240フレーム): 200フレーム後も停止");
    frames(w2, 50);
    assert.equal(plain(DG(w2).getModifiers()).frozen, false);
    // ダメージで起きる + Lv別の加算・確定クリティカル
    const drops = {};
    for (const level of [1, 2, 3]) {
        const w3 = startSkills(["hermes_reed_flute", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { level });
        DG(w3).arm({ profile: "evasive" });
        const h = heartTile(w3);
        cursorAtTile(w3, h.x, h.y); frames(w3, 2);
        const hp0 = heartHpNow(w3);
        heartDamage(w3, 50); frames(w3, 1);
        const base = hp0 - heartHpNow(w3);
        useCard(w3, "hermes_reed_flute");
        assert.equal(plain(DG(w3).getModifiers()).frozen, true);
        const hp1 = heartHpNow(w3);
        heartDamage(w3, 50); frames(w3, 2);
        drops[level] = { base, slept: hp1 - heartHpNow(w3) };
        assert.equal(plain(DG(w3).getModifiers()).frozen, false, "ダメージで起きる");
        const hp2 = heartHpNow(w3);
        heartDamage(w3, 50); frames(w3, 1);
        assert.equal(hp2 - heartHpNow(w3), base, "起きた後は通常のダメージ");
        quietly(() => w3.sb.stop());
    }
    assert.equal(drops[1].slept, drops[1].base, "Lv1は加算なし");
    assert.equal(drops[2].slept, drops[2].base + 50, "Lv2: 眠っている間の最初の命中 +50");
    assert.ok(drops[3].slept >= drops[3].base + 50, "Lv3: +50 に加えて確定クリティカル " + JSON.stringify(drops[3]));
    // 範囲外
    const w4 = startSkills(["hermes_reed_flute", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { level: 1 });
    DG(w4).arm({ profile: "evasive" });
    cursorAtTile(w4, heartTile(w4).x - 9, heartTile(w4).y); frames(w4, 2);
    const pile = plain(w4.deck.getBattleState()).cooldownPile.length;
    assert.equal(useCard(w4, "hermes_reed_flute").ok, true);
    assert.equal(plain(w4.deck.getBattleState()).cooldownPile.length, pile + 1, "範囲外でもカードは消費");
    assert.equal(plain(DG(w4).getModifiers()).frozen, false, "範囲外は効果なし");
    // ATTACK終了で解除
    const w5 = startSkills(["hermes_reed_flute", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { level: 1 });
    DG(w5).arm({ profile: "balanced" });
    cursorAtTile(w5, heartTile(w5).x, heartTile(w5).y); frames(w5, 2);
    useCard(w5, "hermes_reed_flute");
    w5.soul.skipPhase(); frames(w5, 2);
    assert.deepEqual([plain(DG(w5).getModifiers()).frozen, effects(w5)], [false, []], "DEFENSEへ持ち越さない");
    quietly(() => w5.sb.stop()); quietly(() => w4.sb.stop()); quietly(() => w2.sb.stop());
});


const setLevel = (w, id, level) => { const r = plain(w.deck.setCardLevel(id, level)); assert.ok(r.ok !== false, JSON.stringify(r)); };
const lastHit = (w, source) => plain(CM(w).getWeaponHitLog()).filter(e => e.type === "hit" && e.source === source).pop();

test("ヴェイル: カーソルに追従する魔法陣(半径5・5秒)。中の敵ハートは攻撃の予兆への反応が6フレーム遅れる(Lv2: 移動速度 −15%)。範囲外へ出れば解除。Lv3: 中の敵ハートへの攻撃のクリティカル率 +15ポイント(最終50%まで)。ATTACK終了で消える", () => {
    for (const level of [1, 2]) {
        const w = startSkills(["hermes_veil", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"], { level });
        DG(w).arm({ boss: "dev_boss" });
        const heart = heartTile(w);
        cursorAtTile(w, heart.x - 3, heart.y); frames(w, 2);
        assert.equal(useCard(w, "hermes_veil").ok, true);
        frames(w, 2);
        let m = plain(DG(w).getModifiers());
        assert.deepEqual([m.delay, m.scale, m.ids], [6, level >= 2 ? 0.85 : 1, ["soul_veil"]], `Lv${level}: 反応の遅れ6フレーム・速度 ${level >= 2 ? "−15%" : "そのまま"}`);
        // 追従: カーソルが魔法陣の半径(5マス)の外へ動けば解除、戻れば再び
        cursorAtTile(w, heart.x - 7.5, heart.y); frames(w, 2);
        assert.equal(plain(DG(w).getModifiers()).delay, 0, "範囲外へ出れば妨害は解除");
        cursorAtTile(w, heart.x + 2, heart.y); frames(w, 2);
        assert.equal(plain(DG(w).getModifiers()).delay, 6, "魔法陣がカーソルに追従して戻る");
        // 5秒で消える
        frames(w, 330);
        assert.deepEqual([kinds(w), plain(DG(w).getModifiers()).ids], [[], []], "5秒で魔法陣と妨害が消える");
        quietly(() => w.sb.stop());
    }
    // 反応の遅れは、AIが攻撃の予兆に気づく時刻に足される(観測の範囲・必中化はしない)
    const src = read("js/plugins/ProjectR_SoulBattleDodge.js");
    assert.match(src, /cfg\.reactionFrames \+ jitter \+ hesitation \+ modifierEffect\(\)\.delay/);
    // Lv3 のクリティカル
    const crit = withVeil => {
        const w = startSkills(["hermes_veil", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"], { level: 1 });
        setLevel(w, "hermes_veil", 3);
        const heart = heartTile(w);
        cursorAtTile(w, heart.x - 1, heart.y); frames(w, 2);
        if (withVeil) { assert.equal(useCard(w, "hermes_veil").ok, true); frames(w, 2); }
        assert.equal(useCard(w, "hermes_sweep").ok, true);
        frames(w, 16);
        const hit = lastHit(w, "hermes_sweep");
        quietly(() => w.sb.stop());
        return hit;
    };
    const plainHit = crit(false), veilHit = crit(true);
    assert.ok(plainHit && veilHit && Number.isFinite(plainHit.critChance), JSON.stringify([plainHit, veilHit]));
    assert.ok(Math.abs((veilHit.critChance - plainHit.critChance) - 0.15) < 1e-9 || veilHit.critChance === 0.5 || veilHit.critChance === 1, `魔法陣の中: +15ポイント(最終50%上限): ${plainHit.critChance} → ${veilHit.critChance}`);
    assert.ok(veilHit.critChance > plainHit.critChance, "クリティカル率が上がる");
});

test("月桂冠: カーソル地点に半径5の根(7秒・固定)。敵ハートが中にいる間、プレイヤーHP 毎秒+20(1使用最大100)。Lv2: 毎秒30ダメージ・移動速度 −15%。Lv3: 移動速度の低下は −25%(置換)。範囲外では停止。ATTACK終了で消える", () => {
    for (const level of [1, 2, 3]) {
        const w = startSkills(["apollo_laurel_wreath", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"], { level });
        // 回避AIは動かさない(静止ハートで時間・量を測る。AIは当たると円の外へ逃げうるため)
        const heart = heartTile(w);
        cursorAtTile(w, heart.x - 3, heart.y); frames(w, 2);
        setHp(w, 100);
        const hp0 = heartHpNow(w);
        assert.equal(useCard(w, "apollo_laurel_wreath").ok, true);
        frames(w, 60);
        const healed1 = leader(w).hp - 100;
        assert.ok(healed1 >= 19 && healed1 <= 21, `Lv${level}: 毎秒+20: ${healed1}`);
        const m = plain(DG(w).getModifiers());
        const damage = hp0 - heartHpNow(w);
        if (level === 1) { assert.deepEqual([m.scale, damage], [1, 0], "Lv1は減速・ダメージなし"); }
        else {
            assert.equal(m.scale, level === 2 ? 0.85 : 0.75, `Lv${level}: 移動速度の低下(Lv3は置換で −25%)`);
            assert.ok(damage >= 25 && damage <= 35, "毎秒30ダメージ: " + damage);
        }
        // 1使用の上限 100(毎秒20 x 7秒 = 140 は 100 で止まる)
        frames(w, 250);
        assert.equal(leader(w).hp - 100, 100, "1使用の回復は最大100");
        frames(w, 120);
        assert.deepEqual([kinds(w), plain(DG(w).getModifiers()).ids], [[], []], "7秒で根が消え、減速も解除");
        quietly(() => w.sb.stop());
    }
    // 根は固定。敵ハートが円の外なら、回復・ダメージ・減速は止まる
    const w = startSkills(["apollo_laurel_wreath", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"], { level: 3 });
    DG(w).arm({ boss: "dev_boss" });
    const heart = heartTile(w);
    cursorAtTile(w, heart.x - 7, heart.y); frames(w, 2);
    setHp(w, 100);
    const hp0 = heartHpNow(w);
    useCard(w, "apollo_laurel_wreath");
    cursorAtTile(w, heart.x, heart.y); frames(w, 120);                                      // 起点は発動時のカーソル(固定): カーソルを動かしても根は動かない
    assert.deepEqual([leader(w).hp, heartHpNow(w), plain(DG(w).getModifiers()).scale], [100, hp0, 1], "円の外の敵ハートには何も起きない");
    assert.equal(plain(DG(w).getModifiers()).ids.length, 0);
    // 途中で円の外へ出たら止まる
    const poc = w.ctx.ProjectRSoulBattlePoC;
    quietly(() => w.sb.stop());
    void poc;
    // ATTACK終了で消える
    const w2 = startSkills(["apollo_laurel_wreath", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"], { level: 3 });
    DG(w2).arm({ boss: "dev_boss" });
    cursorAtTile(w2, heartTile(w2).x, heartTile(w2).y); frames(w2, 2);
    useCard(w2, "apollo_laurel_wreath"); frames(w2, 30);
    assert.ok(plain(DG(w2).getModifiers()).scale < 1);
    w2.soul.skipPhase(); frames(w2, 3);
    assert.deepEqual([effects(w2), plain(DG(w2).getModifiers()).ids], [[], []], "DEFENSEへ持ち越さない");
    quietly(() => w2.sb.stop());
});

test("ヒュアキントス: 使用後3秒(Lv3は5秒)以内の最初の命中で、命中地点に花(8秒・半径2。Lv2〜は3)。花の中での追加命中ごとにプレイヤーHP +10/+15/+20(1使用最大80/100/120)。命中が無ければ消費のみ。ATTACK終了で消える", () => {
    for (const [level, heal, cap, radius] of [[1, 10, 80, 2], [2, 15, 100, 3], [3, 20, 120, 3]]) {
        const w = startSkills(["apollo_hyacinthus", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"], { level });
        setHp(w, 50);
        assert.equal(useCard(w, "apollo_hyacinthus").ok, true);
        assert.equal(effects(w)[0].bloom, undefined, "まだ花は無い");
        heartDamage(w, 10); frames(w, 2);
        let e = effects(w).find(x => x.kind === "hyacinth");
        assert.deepEqual([e.bloom && e.bloom.radius, leader(w).hp], [radius, 50], `最初の命中で開花(半径${radius})。この命中では回復しない`);
        heartDamage(w, 10); frames(w, 1);
        assert.equal(leader(w).hp, 50 + heal, `Lv${level}: 花の中の追加命中 +${heal}`);
        // 上限
        for (let i = 0; i < 20; i++) { heartDamage(w, 1); frames(w, 1); }
        assert.equal(leader(w).hp - 50, cap, `1使用の回復は最大${cap}`);
        // 花の外では回復しない
        const poc = w.ctx.ProjectRSoulBattlePoC, home = heartTile(w);
        quietly(() => w.sb.stop());
    }
    // 受付の時間: Lv1は3秒、Lv3は5秒。命中が無ければ何も起きず終わる
    for (const [level, seconds] of [[1, 3], [3, 5]]) {
        const w = startSkills(["apollo_hyacinthus", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"], { level });
        const pile = plain(w.deck.getBattleState()).cooldownPile.length;
        useCard(w, "apollo_hyacinthus");
        assert.equal(plain(w.deck.getBattleState()).cooldownPile.length, pile + 1, "消費される");
        frames(w, seconds * 60 - 20);
        assert.deepEqual(kinds(w), ["hyacinth"], `${seconds}秒の途中はまだ受付中`);
        frames(w, 40);
        assert.deepEqual(kinds(w), [], `${seconds}秒を過ぎれば、命中が無ければ消える`);
        setHp(w, 100); heartDamage(w, 10); frames(w, 2);
        assert.equal(leader(w).hp, 100, "消えた後は何も起きない");
        quietly(() => w.sb.stop());
    }
    // 受付の間の命中で開花し、花は最大8秒。花の外(半径より遠い)の命中は回復しない
    const w = startSkills(["apollo_hyacinthus", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"], { level: 1 });
    setHp(w, 50);
    useCard(w, "apollo_hyacinthus");
    heartDamage(w, 10); frames(w, 2);
    const poc = w.ctx.ProjectRSoulBattlePoC, home = heartTile(w);
    assert.equal(plain(poc.moveHeartTo(home.x + 2.6, home.y)).ok, true); frames(w, 1);
    heartDamage(w, 10); frames(w, 1);
    assert.equal(leader(w).hp, 50, "花(半径2)の外での命中は回復しない");
    assert.equal(plain(poc.moveHeartTo(home.x + 1, home.y)).ok, true); frames(w, 1);
    heartDamage(w, 10); frames(w, 1);
    assert.equal(leader(w).hp, 60, "花の中での追加命中は回復する");
    frames(w, 8 * 60 + 10);
    assert.deepEqual(kinds(w), [], "花は最大8秒");
    // ATTACK終了で消える
    const w2 = startSkills(["apollo_hyacinthus", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"], { level: 3 });
    useCard(w2, "apollo_hyacinthus"); heartDamage(w2, 10); frames(w2, 2);
    assert.deepEqual(kinds(w2), ["hyacinth"]);
    w2.soul.skipPhase(); frames(w2, 3);
    assert.deepEqual(effects(w2), [], "DEFENSEへ持ち越さない");
    quietly(() => w2.sb.stop()); quietly(() => w.sb.stop());
});


const stopped = w => !!w.ctx.$gameMap.eventsPaused;
const framesLeft = w => w.soul.getState().framesLeft;
const arrows = w => w.ctx.$gameMap.events().filter(e => e && !e._erased && /<projectR(Golden|Eros|Gigas|Plague)Arrow>|<projectRGoldenVolley>|<projectRGunBullet>/.test(String(e.event?.()?.note || "")));
const fireGun = w => { const r = w.attackClick(); frames(w, 1); return r; };
const posOf = e => [e._realX, e._realY];

test("神託(時間停止): ATTACKの3秒、敵ハートの動き・自分の攻撃の動きがすべて止まる。ATTACKの時間も止まり、解除で元どおり再開。停止中に放った弾は止まったまま当たり判定も進まず、解除後に当たる(ダメージは通常と同じ・二重にならない)", () => {
    const hand = ["apollo_oracle", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"];
    // 通常(神託なし)の銃弾のダメージ・到達時間(銃は発射した瞬間に弾が出る。停止中も撃てる)
    const base = startSkills(hand, { level: 1, weapon: "gun" });
    const h0 = heartTile(base);
    cursorAtTile(base, h0.x, h0.y); frames(base, 2);
    const hpA = heartHpNow(base);
    base.attackClick(); frames(base, 1);
    let arriveBase = null;
    for (let i = 1; i <= 240 && arriveBase === null; i++) { frames(base, 1); if (heartHpNow(base) < hpA) arriveBase = i; }
    frames(base, 60);
    const dropBase = hpA - heartHpNow(base);
    quietly(() => base.sb.stop());
    assert.ok(arriveBase !== null && dropBase > 0, "基準の矢が当たる");

    const w = startSkills(hand, { level: 1, weapon: "gun" });
    DG(w).arm({ boss: "dev_boss" });
    cursorAtTile(w, h0.x, h0.y); frames(w, 2);
    const dogFrame = plain(DG(w).getState()).frame, timer = framesLeft(w), pos0 = heartTile(w);
    assert.equal(useCard(w, "apollo_oracle").ok, true);
    assert.equal(stopped(w), true, "時間停止");
    assert.deepEqual(kinds(w), ["oracle"]);
    // 停止中に矢を放つ(カードも使える)
    const hpB = heartHpNow(w);
    fireGun(w);
    frames(w, 2);
    const flying = arrows(w);
    assert.ok(flying.length >= 1, "停止中に矢が出た");
    const where = flying.map(posOf);
    frames(w, 100);
    assert.deepEqual(arrows(w).map(posOf), where, "停止中、矢は動かない");
    assert.equal(heartHpNow(w), hpB, "停止中は当たり判定も進まない");
    assert.equal(plain(DG(w).getState()).frame, dogFrame, "敵の回避AIの時間も止まる");
    assert.equal(framesLeft(w), timer, "ATTACKの残り時間も止まる(停止は戦闘時間を食わない)");
    assert.deepEqual(heartTile(w), pos0, "敵ハートは動かない");
    let waited = 0;
    for (; waited < 200 && stopped(w); waited++) frames(w, 1);
    assert.equal(stopped(w), false, "解除された");
    assert.ok(Math.abs(waited + 102 - 180) <= 2, "3秒(180フレーム)で解除: " + (waited + 102));
    assert.deepEqual(kinds(w), [], "Lv1は解除後の強化なし");
    // 解除後に当たる。ダメージは通常と同じ・1回ぶん
    let arrive = null;
    for (let i = 1; i <= 240 && arrive === null; i++) { frames(w, 1); if (heartHpNow(w) < hpB) arrive = i; }
    frames(w, 60);
    assert.ok(arrive !== null, "解除後に矢が当たる");
    assert.equal(hpB - heartHpNow(w), dropBase, "ダメージは通常と同じ(二重・欠落なし)");
    assert.ok(Math.abs(arrive - arriveBase) <= 3, `到達までの時間も通常と同じ(Lv1は弾速そのまま): ${arrive} vs ${arriveBase}`);
    assert.equal(w.soul.getPhase(), "attack");
    assert.ok(framesLeft(w) < timer, "解除後はATTACKの時間が進む");
    quietly(() => w.sb.stop());
});

test("神託 Lv2/Lv3: 停止中に放った弾は解除後に弾速+20%。解除後3秒は通常武器の攻撃間隔も20%短い。Lv3は解除後3秒のクリティカル率 +30ポイント。通常の弾(停止中でない弾)は速くならない", () => {
    const hand = ["apollo_oracle", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"];
    const arrival = level => {
        const w = startSkills(hand, { level, weapon: "gun" });
        const h = heartTile(w);
        cursorAtTile(w, h.x, h.y); frames(w, 2);
        const hp0 = heartHpNow(w);
        useCard(w, "apollo_oracle");
        fireGun(w); frames(w, 2);
        frames(w, 180);
        const scales = [w.ctx.ProjectRSwordSystem.getCooldownScale(), w.ctx.ProjectRGunSystem.getCooldownScale()];
        let t = null;
        for (let i = 1; i <= 300 && t === null; i++) { frames(w, 1); if (heartHpNow(w) < hp0) t = i; }
        const out = { t, scales, kinds: kinds(w) };
        quietly(() => w.sb.stop());
        return out;
    };
    const a1 = arrival(1), a2 = arrival(2), a3 = arrival(3);
    assert.ok(a1.t && a2.t && a3.t, JSON.stringify([a1, a2, a3]));
    assert.deepEqual(a1.scales, [1, 1]);
    assert.deepEqual(a2.scales, [1.2, 1.2], "解除後の通常武器の攻撃間隔 20%短縮(近接の弾速の読み替え)");
    assert.ok(a2.t < a1.t, `Lv2は解除後に速い: ${a1.t} → ${a2.t}`);
    assert.ok(Math.abs(a2.t - a1.t / 1.2) <= 4, `弾速+20%(到達時間 1/1.2): 期待 ${(a1.t / 1.2).toFixed(1)} 実際 ${a2.t}`);
    assert.ok(Math.abs(a3.t - a2.t) <= 2);
    // 解除後3秒で強化は終わり、攻撃間隔は元へ。クリティカル(Lv3)
    const crit = (level, delay) => {
        const w = startSkills(["apollo_oracle", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"], { level: 1 });
        setLevel(w, "apollo_oracle", level);
        const h = heartTile(w);
        cursorAtTile(w, h.x - 1, h.y); frames(w, 2);
        useCard(w, "apollo_oracle");
        frames(w, 182 + delay);
        const scale = w.ctx.ProjectRSwordSystem.getCooldownScale();
        assert.equal(useCard(w, "hermes_sweep").ok, true);
        frames(w, 16);
        const hit = lastHit(w, "hermes_sweep");
        const out = { chance: hit && hit.critChance, scale, kinds: kinds(w) };
        quietly(() => w.sb.stop());
        return out;
    };
    const c2 = crit(2, 0), c3 = crit(3, 0), c3late = crit(3, 200);
    assert.ok(c2.chance !== undefined && Math.abs((c3.chance - c2.chance) - 0.3) < 1e-9, `Lv3: クリティカル率 +30ポイント: ${c2.chance} → ${c3.chance}`);
    assert.equal(c3late.chance, c2.chance, "解除後3秒を過ぎれば通常");
    assert.deepEqual([c3late.scale, c3late.kinds], [1, []], "3秒後に強化は全て終わる");
});

test("神託の安全: ATTACKが終わる時・SOULが終わる時は必ず解除される(停止中にフェーズが移っても、停止が残らない・矢の状態や当たり判定が壊れない・次のATTACKが普通に始まる)", () => {
    const hand = ["apollo_oracle", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"];
    const w = startSkills(hand, { level: 2, weapon: "gun" });
    const h = heartTile(w);
    cursorAtTile(w, h.x, h.y); frames(w, 2);
    const hp0 = heartHpNow(w);
    useCard(w, "apollo_oracle"); fireGun(w); frames(w, 20);
    assert.equal(stopped(w), true);
    w.soul.skipPhase(); frames(w, 2);
    assert.equal(w.soul.getPhase(), "defense", "停止中でもフェーズは移れる");
    assert.deepEqual([stopped(w), effects(w), SK(w).getState().ownPause], [false, [], false], "DEFENSEには停止も強化も持ち越さない");
    assert.deepEqual([w.ctx.ProjectRSwordSystem.getCooldownScale(), w.ctx.ProjectRGunSystem.getCooldownScale()], [1, 1]);
    frames(w, 200);
    assert.ok(heartHpNow(w) <= hp0, "放った矢は続きから普通に飛ぶ(止まったまま残らない)");
    const afterDefense = arrows(w).length;
    assert.ok(afterDefense <= 3, "矢が溜まり続けない");
    // 次のATTACKが普通に始まり、普通に使える
    while (w.soul.getPhase() !== "attack") { w.soul.skipPhase(); frames(w, 3); }
    assert.equal(stopped(w), false);
    assert.equal(w.soul.getPhase(), "attack");
    frames(w, 30);
    assert.ok(framesLeft(w) > 0 && framesLeft(w) < 20 * 60 + 1, "ATTACKの時間は普通に進む");
    quietly(() => w.sb.stop());
    // 停止中にSOULを終える
    const w2 = startSkills(hand, { level: 3, weapon: "gun" });
    useCard(w2, "apollo_oracle"); frames(w2, 10);
    assert.equal(stopped(w2), true);
    quietly(() => w2.sb.stop()); arrive(w2); frames(w2, 5);
    assert.deepEqual([stopped(w2), SK(w2).getState().ownPause, effects(w2)], [false, false, []], "SOULの終了で停止は必ず外れる");
    // 他の理由で止まっている間は、神託は止め直さない(会話などの停止を壊さない)
    const w3 = startSkills(hand, { level: 1 });
    w3.ctx.$gameMap.eventsPaused = true;
    useCard(w3, "apollo_oracle");
    assert.equal(SK(w3).getState().ownPause, false, "他の停止の上に重ねて持たない");
    w3.ctx.$gameMap.eventsPaused = false;
    quietly(() => w3.sb.stop());
    // ATTACK終了ではなく自然な時間切れ(短いATTACK)でも
    const w4 = startSkills(hand, { level: 1, attackSeconds: 6 });
    frames(w4, 6 * 60 - 40);
    useCard(w4, "apollo_oracle");
    assert.equal(stopped(w4), true);
    frames(w4, 180 + 60);
    assert.equal(stopped(w4), false);
    for (let i = 0; i < 120 && w4.soul.getPhase() === "attack"; i++) frames(w4, 1);
    assert.equal(w4.soul.getPhase(), "defense", "停止の後、ATTACKは残りの時間で普通に終わってDEFENSEへ");
    assert.deepEqual([stopped(w4), effects(w4)], [false, []]);
    quietly(() => w4.sb.stop());
});

test("エロスの矢: 元の矢・ビームのまま、敵ハートに当てた矢1本ごとにプレイヤーHP +5(1回の使用で最大 Lv1=50 / Lv2〜=100)。Lv3のビームは 100HP/秒。DEFENSEには持ち越さない", () => {
    const heals = {};
    for (const level of [1, 2, 3]) {
        const w = startSkills(["apollo_eros_arrow", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"], { level });
        const h = heartTile(w);
        cursorAtTile(w, h.x, h.y); frames(w, 2);
        setHp(w, 1);
        const hp0 = heartHpNow(w);
        const reserved = useCard(w, "apollo_eros_arrow");
        assert.equal(reserved.pending, true, "エロスの矢は予約 → 左クリックで確定(元の規則)");
        w.attackClick();
        frames(w, 60 * 5);
        heals[level] = { heal: leader(w).hp - 1, damage: hp0 - heartHpNow(w) };
        quietly(() => w.sb.stop());
    }
    assert.ok(heals[1].heal > 0 && heals[1].heal <= 50 && heals[1].heal % 5 === 0, "Lv1: 5の倍数・最大50 " + JSON.stringify(heals));
    assert.ok(heals[2].heal > 0 && heals[2].heal <= 100 && heals[2].heal % 5 === 0, "Lv2: 最大100 " + JSON.stringify(heals));
    assert.ok(heals[3].heal > 100, "Lv3: ビームは100HP/秒で回復 " + JSON.stringify(heals));
});

test("竪琴: 元のリズム入力(左クリック)のまま、速度の音符 = カードのCooldown短縮(−10%・8秒)、病の音符 = 敵ハート(距離は問わない)、全部同じ音符で効果量×1.5。ATTACK終了で終了", () => {
    const lyreHand = ["apollo_lyre_rhythm", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"];
    const lyre = w => w.ctx.ProjectRApolloLyreRhythm;
    const pressKind = (w, kind) => {
        for (let i = 0; i < 700; i++) {
            const s = plain(lyre(w).getSession());
            if (!s) return null;
            const n = plain(lyre(w).getNotes()).find(x => x.kind === kind && x.state === "flowing" && Math.abs(s.frame - x.arrive) <= 1);
            if (n) { w.attackClick(); frames(w, 1); return plain(lyre(w).getResults()).pop(); }
            frames(w, 1);
        }
        return null;
    };
    const begin = level => {
        const w = startSkills(lyreHand, { level, weapon: "sword" });
        const h = heartTile(w);
        cursorAtTile(w, h.x, h.y); frames(w, 2);
        assert.equal(useCard(w, "apollo_lyre_rhythm").ok, true);
        return w;
    };
    // 速度 → Cooldown短縮
    let w = begin(1);
    const r = pressKind(w, "speed");
    assert.ok(r && r.hit && r.kind === "speed", JSON.stringify(r));
    const e = effects(w).find(x => x.kind === "lyreCooldown");
    assert.ok(e && Math.abs(e.cut - 0.1) < 1e-9, "Cooldown −10%: " + JSON.stringify(effects(w)));
    assert.equal(plain(CM(w).moveSpeedFactor()), 1, "移動速度は変えない(SOULでは動かない)");
    const before = plain(w.deck.getBattleState()).cooldownPile.find(x => x.instance.cardId === "apollo_lyre_rhythm").remainingSeconds;
    frames(w, 60);
    const after = plain(w.deck.getBattleState()).cooldownPile.find(x => x.instance.cardId === "apollo_lyre_rhythm").remainingSeconds;
    assert.ok(Math.abs((before - after) - 1 / 0.9) < 0.06, `Cooldown が 1/0.9 の速さで進む: ${(before - after).toFixed(3)}`);
    frames(w, 8 * 60);
    assert.ok(!kinds(w).includes("lyreCooldown"), "8秒で終わる");
    quietly(() => w.sb.stop());
    // 病 → 敵ハート(プレイヤーから遠くても)
    w = begin(1);
    const rp = pressKind(w, "plague");
    assert.ok(rp && rp.hit && rp.kind === "plague" && rp.enemies && rp.enemies.length === 1, JSON.stringify(rp));
    const status = w.ctx.ProjectRApolloStatus, key = status.targetKeyOfEvent(w.heart);
    assert.equal(status.has(key, "lyre_plague"), true, "敵ハートに病の状態");
    assert.ok(distance(heartTile(w), playerCenter(w)) > 5, "プレイヤーの半径5マスの外でも効く");
    // ATTACK終了で解除
    w.soul.skipPhase(); frames(w, 3);
    assert.deepEqual([status.has(key, "lyre_plague"), lyre(w).getSession(), effects(w)], [false, null, []], "DEFENSEへ持ち越さない");
    quietly(() => w.sb.stop());
    // 全部同じ音符(Lv2): 効果量 ×1.5(画面全体は使わない)
    w = begin(2);
    setHp(w, 1);
    const res = [pressKind(w, "heal"), pressKind(w, "heal"), pressKind(w, "heal")];
    assert.ok(res.every(x => x && x.hit), JSON.stringify(res));
    assert.equal(res[0].healed, 100, "1回目 +100");
    assert.equal(res[2].wide, true);
    assert.equal(res[2].healed, 150, "全部同じ音符: 効果量×1.5(100 → 150)");
    quietly(() => w.sb.stop());
});

test("竪琴の冷却短縮は『冷却山札』だけを速める: 絶の0.8秒の窓・状態異常・敵AI・ATTACK残り時間・SOULスキルの時計は通常の速さのまま(コアのBattleDeckSession以外を呼ばない)", () => {
    const lyreHand = ["apollo_lyre_rhythm", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_psychopomp"];
    const lyre = w => w.ctx.ProjectRApolloLyreRhythm;
    const cd = w => plain(w.deck.getBattleState()).cooldownPile.find(x => x.instance.cardId === "apollo_lyre_rhythm")?.remainingSeconds;
    const prepare = withBuff => {
        const w = startSkills(lyreHand, { level: 1, weapon: "sword" });
        const h = heartTile(w);
        cursorAtTile(w, h.x, h.y); frames(w, 2);
        DG(w).arm({ boss: "dev_boss" });
        assert.equal(useCard(w, "apollo_lyre_rhythm").ok, true);
        if (withBuff) {
            let r = null;
            for (let i = 0; i < 700 && !r; i++) {
                const s = plain(lyre(w).getSession());
                const n = s && plain(lyre(w).getNotes()).find(x => x.kind === "speed" && x.state === "flowing" && Math.abs(s.frame - x.arrive) <= 1);
                if (n) { w.attackClick(); frames(w, 1); r = plain(lyre(w).getResults()).pop(); } else frames(w, 1);
            }
            assert.ok(r && r.hit, "速度の音符を叩けた");
            assert.ok(kinds(w).includes("lyreCooldown"), "冷却短縮が掛かっている");
        } else {
            frames(w, 2);
        }
        return w;
    };
    const key = w => w.ctx.ProjectRApolloStatus.targetKeyOfEvent(w.heart);
    // 計測用の時計を全部仕掛ける(絶の窓 = armWeaponHitBonus、状態異常、ATTACK残り、敵AI、SOULスキルの時計)
    const probe = w => {
        assert.equal(plain(CM(w).armWeaponHitBonus({ id: "probe", multiplier: 2, seconds: 5, source: "probe" })).ok, true);
        assert.equal(plain(w.ctx.ProjectRApolloStatus.apply(key(w), "probe_status", { seconds: 5 })).ok, true);
        return snap(w);
    };
    const snap = w => ({
        window: plain(CM(w).getWeaponHitBonus()).remaining,
        status: plain(w.ctx.ProjectRApolloStatus.list(key(w))).find(x => x.id === "probe_status").remaining,
        phase: framesLeft(w),
        dodge: plain(DG(w).getState()).frame,
        clock: SK(w).getState().clock,
        cooldown: cd(w)
    });
    const run = withBuff => {
        const w = prepare(withBuff);
        const a = probe(w);
        frames(w, 60);
        const b = snap(w);
        quietly(() => w.sb.stop());
        return { a, b, d: { window: a.window - b.window, status: a.status - b.status, phase: a.phase - b.phase, dodge: b.dodge - a.dodge, clock: b.clock - a.clock, cooldown: a.cooldown - b.cooldown } };
    };
    const control = run(false), buffed = run(true);
    // 冷却山札だけが 1/0.9 の速さ(通常は 1秒/秒)
    assert.ok(Math.abs(control.d.cooldown - 1) < 0.02, "通常は 1秒/秒: " + control.d.cooldown);
    assert.ok(Math.abs(buffed.d.cooldown - 1 / 0.9) < 0.03, "冷却短縮中は 1/0.9: " + buffed.d.cooldown);
    // 他の時計は、冷却短縮の有無で一切変わらない
    for (const k of ["window", "status", "phase", "dodge", "clock"]) {
        assert.ok(Math.abs(buffed.d[k] - control.d[k]) < 1e-9, `${k} は冷却短縮の影響を受けない: 通常 ${control.d[k]} / 冷却短縮中 ${buffed.d[k]}`);
    }
    assert.ok(Math.abs(buffed.d.window - 1) < 0.02 && Math.abs(buffed.d.status - 1) < 0.02, "絶の窓・状態異常は1秒/秒: " + JSON.stringify(buffed.d));
    assert.equal(buffed.d.phase, 60, "ATTACKの残り時間は60フレーム");
    assert.equal(buffed.d.dodge, 60, "敵AIの時間は60フレーム");
    // 実装の形: deck.updateCooldown(全タイマー共通)を、冷却短縮のために呼ばない
    const src = read("js/plugins/ProjectR_SoulSkills.js");
    assert.ok(!/deck\??\.updateCooldown\??\.?\(/.test(src.replace(/\/\/.*$/gm, "")), "deck.updateCooldown を呼ばない");
});

test("後片づけ・DEFENSE: SOULを途中で終えても、全スキルの効果・Dodgeの修飾・攻撃間隔・命中フック・定義の差し替えが残らない。DEFENSEにスキルの効果は持ち越されず、カード・通常攻撃は使えない(ハートのマウス操作だけ)", () => {
    const w = startSkills(["hermes_zetsu", "hermes_psychopomp", "apollo_hyacinthus", "hermes_veil", "apollo_laurel_wreath"], { level: 3, weapon: "sword" });
    DG(w).arm({ boss: "dev_boss" });
    const h = heartTile(w);
    cursorAtTile(w, h.x, h.y); frames(w, 2);
    for (const id of ["hermes_zetsu", "hermes_psychopomp", "apollo_hyacinthus", "hermes_veil", "apollo_laurel_wreath"]) { const r = useCard(w, id); assert.equal(r.ok, true, id + " " + JSON.stringify(r)); }
    frames(w, 10);
    assert.ok(kinds(w).length >= 4, kinds(w).join());
    assert.ok(SK(w).getState().hook);
    w.soul.skipPhase(); frames(w, 3);
    assert.deepEqual([w.soul.getPhase(), effects(w), plain(DG(w).getModifiers()).ids, plain(CM(w).getWeaponHitBonus())], ["defense", [], [], null], "DEFENSEには何も持ち越さない");
    // DEFENSE: カード・通常攻撃は使えない
    const hand = handIds(w);
    for (let i = 0; i < hand.length; i++) assert.equal(plain(w.deck.requestUseCard(i)).reason, "soulDefense");
    const swings0 = w.ctx.ProjectRSwordSystem.status().swings;
    w.attackClick(); frames(w, 5);
    assert.equal(w.ctx.ProjectRSwordSystem.status().swings, swings0, "DEFENSEでは通常攻撃できない");
    while (w.soul.getPhase() !== "attack") { w.soul.skipPhase(); frames(w, 3); }
    useCard(w, handIds(w).find(id => id === "hermes_veil" || id === "apollo_laurel_wreath") || handIds(w)[0]);
    quietly(() => w.sb.stop()); arrive(w); frames(w, 5);
    assert.deepEqual([effects(w), plain(DG(w).getModifiers()).ids, SK(w).getState().hook, SK(w).getState().defsSwapped, w.ctx.ProjectRSwordSystem.getCooldownScale()], [[], [], false, false, 1], "SOULの終了で全て元へ");
    const z = w.deck.definitions.card("hermes_zetsu");
    assert.deepEqual([z.category, z.cooldownSeconds], ["movement", 0.5]);
});

console.log(`${passed} tests passed`);
