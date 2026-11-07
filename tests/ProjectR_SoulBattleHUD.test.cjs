"use strict";
// I3: SOUL戦闘の専用バトルHUD(ProjectR_SoulBattleHUD)。表示だけのプラグインなので、(1)SOUL戦闘の間だけ有効 (2)通常HUDを隠して正確に戻す
// (3)表示する値は既存の実行中APIの読み取りだけ (4)解像度・オプションプラグインの欠如・繰り返し・失敗でも安全 (5)戦闘の中身(ダメージ・カード・AI)は変えない、を実エンジン(Map004 + 全plugin)で確かめる。
// 描画(Bitmap/PIXI)はハーネスでは行われない。見た目は実機のスクリーンショット(tools/mz_cdp/soul_hud_verify.cjs)で確認する。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const vm = require("node:vm");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { buildWorld, plain, attachHpBars, barHp, handIds, aimDegree, center } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const quietly = fn => { const original = console.log; console.log = () => {}; try { return fn(); } finally { console.log = original; } };
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];

// ---- 世界: A16テストと同じアリーナ + 画面の表示物の代用品(実機ではHendrix/BattleHUDが作るもの) ----
const display = (original = true) => ({ renderable: original, visible: true, parent: null });
const container = () => ({ children: [], addChild(c) { c.parent = this; this.children.push(c); return c; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = null; } });
function decorate(scene, originals = {}) {
    const tilemap = container();
    const sp = scene._spriteset;
    sp.addChild = c => { c.parent = sp; sp.children.push(c); return c; };
    sp.removeChild = c => { const i = sp.children.indexOf(c); if (i >= 0) sp.children.splice(i, 1); c.parent = null; };
    sp._tilemap = tilemap;
    const bars = sp._eventHpBars;
    bars.forEach((bar, i) => { bar.renderable = i === 1 && originals.bar1 === false ? false : true; });
    const extra = { hudLayer: display(), menuButton: display(originals.menuButton ?? true), hendrixHud: display(), battleExtra: display() };
    scene._projectRBattleHudLayer = extra.hudLayer; scene._menuButton = extra.menuButton; scene.hendrixHuds = [{ container: extra.hendrixHud, index: 0, x: 0, y: 0, updateHUD() {}, updateDrag() {}, evaluateX: () => 0, evaluateY: () => 0 }];
    scene._decor = { tilemap, extra };
    return scene._decor;
}
function arenaWorld(options = {}) {
    const w = buildWorld();
    assert.equal(w.failures.length, 0);
    w.enterMap(4, 25, 26); frames(w, 5);
    w.run("Math.random = () => 0.999;");
    w.sb = w.ctx.ProjectRSoulSandbox; w.soul = w.ctx.ProjectRSoulBattle; w.hud = w.ctx.ProjectRSoulBattleHUD; w.deck = w.ctx.ProjectRCardDeck; w.bf = w.ctx.ProjectRBossFramework;
    w.sc = () => w.ctx.SceneManager._scene;
    w.originals = options.originals || {};
    w.decor = decorate(w.sc(), options.originals);
    w.ends = []; w.soul.onEnd(e => w.ends.push(plain(e).reason));
    w.calls = [];
    const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { w.calls.push({ name, args }); return original.apply(this, arguments); };
    return w;
}
function a16(options = {}, worldOptions = {}) {
    const w = arenaWorld(worldOptions);
    const r = quietly(() => plain(w.sb.start("a16", { stage: false, openingHand: HAND, ...options })));
    assert.equal(r.ok, true, JSON.stringify(r));
    w.heart = r.heartEventId;
    prepareDisplay(w);
    frames(w, 6);
    return w;
}
// ハーネスのPIXI代用品には renderable が無いので、実機の DisplayObject と同じく true を持たせる(開発用ラベル・ハートのHPバー)。
function prepareDisplay(w) {
    const sp = w.sc()._spriteset;
    for (const child of sp.children) if (child._projectRSoulBattleLabel && child.renderable === undefined) child.renderable = true;
    // 敵HPバー(ハートのバー + ダミー2体のバー)。ダミー(イベント3)のバーだけ、元から renderable=false にできる(元の値の保存を確かめる)
    const wanted = [w.heart, 3, 4].filter(id => id && !sp._eventHpBars.some(b => b._event === w.ctx.$gameMap.event(id)));
    if (wanted.length) attachHpBars(w, wanted, 1000);
    sp._eventHpBars.forEach((bar, i) => { if (bar.renderable === undefined) bar.renderable = true; if (bar._event.eventId() === 3 && w.originals.bar1 === false && !w.bar1Set) { bar.renderable = false; w.bar1Set = true; } });
}
const hurt = (w, id, amount) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: `-${amount}`, exceedMaxHealth: "false" });
const hiddenFlags = w => ({ layer: w.decor.extra.hudLayer.renderable, menu: w.decor.extra.menuButton.renderable, hendrix: w.decor.extra.hendrixHud.renderable, bars: w.sc()._spriteset._eventHpBars.map(b => b.renderable) });
const dimCount = w => w.decor.tilemap.children.filter(c => c._projectRSoulDim).length;
const model = w => plain(w.hud.getViewModel());
const slotAt = (w, i) => model(w).hand[i];

// ---------------------------------------------------------------- 登録・安全性 ----------------------------------------------------------------
test("登録と範囲: SOULの後・BattleHUD/CombatExtrasHUD/Sandboxの後に1回だけ。表示専用(ゲームの状態・ダメージ・セーブを書き換えない)。保護されたファイルは変更なし", () => {
    const config = {};
    vm.runInNewContext(read("js/plugins.js"), config);
    const names = config.$plugins.map(p => p.name);
    assert.equal(names.filter(n => n === "ProjectR_SoulBattleHUD").length, 1);
    const index = names.indexOf("ProjectR_SoulBattleHUD");
    for (const dep of ["ProjectR_SoulBattle", "ProjectR_BattleHUD", "ProjectR_CombatExtrasHUD", "ProjectR_SoulBattleSandbox", "ProjectR_BossFramework"]) assert.ok(names.indexOf(dep) >= 0 && names.indexOf(dep) < index, dep + " より後");
    assert.equal(config.$plugins[index].status, true);
    const source = read("js/plugins/ProjectR_SoulBattleHUD.js");
    const header = source.split("*/")[0];
    assert.match(header, /@base ProjectR_SoulBattle\b/);
    const code = source.split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /UpdateEventHp|\.setHp\(|gainHp|saveGame|StorageManager|\$gameSystem\.\w+\s*=[^=]|\$gameSystem\._\w+\s*=[^=]|\$gameVariables\.setValue|\$gameSwitches\.setValue/, "ゲーム状態・セーブを書かない(通常HUDの visible も触らないことは下の挙動テストで確認)");
    assert.doesNotMatch(code, /requestUseCard|startCardBattle|endCardBattle|registerBoss|\.start\(|\.end\(|skipPhase|moveHeartTo/, "戦闘の制御を呼ばない");
    const status = cp.execFileSync("git", ["status", "--porcelain"], { cwd: project, encoding: "utf8" }).split(/\r?\n/);
    for (const file of ["js/plugins/ProjectR_BattleHUD.js", "js/plugins/ProjectR_CombatExtrasHUD.js",
        "js/plugins/ProjectR_BossFramework.js", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Hotbar_Creator.js", "js/plugins/Hendrix_Action_Engine.js", "data/Skills.json", "data/Weapons.json", "data/Enemies.json"]) {
        assert.ok(!status.some(line => line.slice(3) === file), file + " は変更されていない");
    }
});

// ---------------------------------------------------------------- 有効になる条件 ----------------------------------------------------------------
test("SOUL戦闘の間だけ有効: 通常のマップ戦闘(カード戦闘・敵が画面内)では何も隠さず、レイヤーも暗転も作らない", () => {
    const w = arenaWorld();
    frames(w, 10);
    assert.deepEqual([w.hud.isActive(), w.hud.getState().hiddenCount, !!w.sc()._projectRSoulHud, dimCount(w)], [false, 0, false, 0]);
    assert.equal(plain(w.ctx.ProjectRCombatTestArena.startScenario("apollo")).ok, true);
    frames(w, 30);
    assert.equal(w.deck.isCardBattleActive(), true, "カード戦闘は動いている");
    assert.deepEqual(hiddenFlags(w), { layer: true, menu: true, hendrix: true, bars: w.sc()._spriteset._eventHpBars.map(() => true) });
    assert.deepEqual([w.hud.isActive(), w.hud.getState().hiddenCount, !!w.sc()._projectRSoulHud, dimCount(w)], [false, 0, false, 0]);
    assert.equal(w.hud.getViewModel(), null, "SOULでなければビューモデルは無い");
    // P0のハート単体(SOULコントローラなし)でも有効にならない
    w.ctx.ProjectRCombatTestArena.endTest(); frames(w, 5);
    const c = center(w);
    assert.equal(w.ctx.ProjectRSoulBattlePoC.start({ centerX: c.x, centerY: c.y - 8, pattern: "static" }).ok, true);
    frames(w, 10);
    assert.equal(w.hud.isActive(), false);
    w.ctx.ProjectRSoulBattlePoC.end("t");
});

test("開始: 通常HUD(BattleHUD・メニューボタン・Hendrix HUD・敵HPバー・開発用ラベル)を隠し、暗転をタイルマップ内に挿入し、専用レイヤーをBattleHUDの上に付ける。visible/セーブは触らない", () => {
    const w = a16();
    frames(w, 6);
    const flags = hiddenFlags(w);
    assert.equal(flags.layer, false); assert.equal(flags.menu, false); assert.equal(flags.hendrix, false);
    assert.ok(flags.bars.length >= 1 && flags.bars.every(v => v === false), "敵HPバーは全て隠れる(ハートのバーも)");
    const label = w.sc()._spriteset.children.find(c => c._projectRSoulBattleLabel);
    assert.ok(label, "開発用ラベルがある"); assert.equal(label.renderable, false);
    for (const obj of [w.decor.extra.hudLayer, w.decor.extra.hendrixHud]) assert.equal(obj.visible, true, "visible は触らない(メニューボタンの visible はMZ本体が管理する)");
    const state = plain(w.hud.getState());
    assert.deepEqual([state.active, state.layer, state.layerVisible, state.dim], [true, true, true, true]);
    assert.equal(state.hiddenCount, 3 + w.sc()._spriteset._eventHpBars.length + 1, "BattleHUD・メニューボタン・Hendrix HUD・敵HPバー全て・ラベルを記録している");
    assert.equal(dimCount(w), 1);
    const dim = w.decor.tilemap.children.find(c => c._projectRSoulDim);
    assert.equal(dim.z, 2, "地面の上・通常優先のキャラの下");
    assert.ok(dim.z > 1 && dim.z < 3);
    const layer = w.sc()._projectRSoulHud;
    assert.equal(layer.parent, w.sc(), "シーンの子");
    const kids = w.sc().children;
    assert.ok(kids.indexOf(layer) > kids.indexOf(w.decor.extra.hudLayer) || !kids.includes(w.decor.extra.hudLayer), "BattleHUDの上");
    assert.equal(JSON.stringify(w.ctx.$gameSystem).includes("SoulHud"), false, "セーブに何も足さない");
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), false, "セーブ禁止はSOUL側の責務のまま");
});

// ---------------------------------------------------------------- ビューモデル(既存APIの読み取り) ----------------------------------------------------------------
// カード管理ワークブック(_ProjectR_DesignSources/ProjectR_CardManagement_Template(3)(4).xlsx 「カード一覧」のカード名)。HUDが英字のIDから作った名前(GOLDEN VOLLEY など)を出さないことを確かめる
const WORKBOOK_NAMES = { hermes_issen: "一閃", hermes_psychopomp: "サイコポンポス", hermes_veil: "ヴェイル", hermes_strength: "ストレングス", hermes_sweep: "薙ぎ払い", hermes_reed_flute: "葦笛", hermes_zetsu: "絶",
    apollo_golden_volley: "黄金の矢", apollo_eros_arrow: "エロスの矢", apollo_lyre_rhythm: "竪琴", apollo_laurel_wreath: "月桂冠", apollo_hyacinthus: "ヒュアキントス", apollo_gigas_slayer: "ギガース殺し", apollo_oracle: "神託", apollo_plague_rain: "疫病の矢" };
test("表示する値は実行中のAPIそのもの: ボス名/HP/フェーズ=BossFramework、フェーズ/残り時間=SOUL、プレイヤーHP=先頭アクター、手札=本物のデッキ(名前・Level・Cooldown)", () => {
    const w = a16();
    const m = model(w);
    const hud = plain(w.bf.getHudState()), st = plain(w.soul.getState()), leader = w.ctx.$gameParty.leader();
    assert.equal(m.phase, "attack");
    assert.deepEqual([m.boss.source, m.boss.name, m.boss.hp, m.boss.maxHp, m.boss.phaseLabel, m.boss.phaseIndex, m.boss.phaseCount], ["bossFramework", hud.name, hud.hp, hud.maxHp, hud.phaseLabel, hud.phaseIndex, hud.phaseCount]);
    assert.ok(Math.abs(m.secondsLeft - st.secondsLeft) < 0.2 && m.round === st.round);
    assert.deepEqual([m.player.name, m.player.hp, m.player.maxHp], [leader.name(), leader.hp, leader.mhp]);
    assert.deepEqual(m.hand.map(s => s.cardId), HAND, "手札は5枚・本物の順番");
    assert.deepEqual(m.hand.map(s => s.key), ["Q", "W", "E", "R", "T"], "SOULのカード枠のキー");
    const defs = w.deck.definitions;
    for (const slot of m.hand) {
        assert.equal(slot.level, w.deck.getPersistentData().cardOwnership[slot.cardId].level, slot.cardId + " のLevel");
        assert.equal(slot.cooldownSeconds, defs.card(slot.cardId).cooldownSeconds, slot.cardId + " のCooldown");
        const shown = w.ctx.ProjectRBattleHUD.getCardPresentation(slot.cardId).name;
        assert.equal(slot.name, /[^\u0000-\u007f]/.test(shown) ? shown : WORKBOOK_NAMES[slot.cardId], slot.cardId + " の名前: BattleHUDが日本語の名前を持てばそれ、なければワークブックのカード名");
        assert.equal(slot.state, "ready", slot.cardId);
    }
    assert.equal(m.hand[0].cooldownSeconds, 7, "一閃のCooldown(7秒)");
    const state = plain(w.deck.getBattleState());
    assert.deepEqual(m.counts, { draw: state.drawPile.length, discard: state.discardPile.length, cooldown: state.cooldownPile.length });
    assert.equal(m.cardBattle, true);
});

test("カード名のラベル: 15枚すべて、ワークブックのカード名(日本語)で出る。英字のIDから作った名前にならない。キーの表示は Q/W/E/R/T", () => {
    const groups = [["hermes_issen", "hermes_psychopomp", "hermes_veil", "hermes_strength", "hermes_sweep"], ["hermes_reed_flute", "hermes_zetsu", "apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm"],
        ["apollo_laurel_wreath", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle", "apollo_plague_rain"]];
    const seen = [];
    for (const group of groups) {
        const w = a16({ openingHand: group });
        const m = model(w);
        assert.deepEqual(m.hand.map(slot => slot.cardId), group, "手札: " + JSON.stringify(m.hand.map(x => x.cardId)));
        assert.deepEqual(m.hand.map(slot => slot.key), ["Q", "W", "E", "R", "T"]);
        for (const slot of m.hand) { assert.equal(slot.name, WORKBOOK_NAMES[slot.cardId], slot.cardId); assert.doesNotMatch(slot.name, /^[\u0000-\u007f]+$/, slot.cardId + " は日本語の名前"); seen.push(slot.cardId); }
        quietly(() => w.sb.stop());
    }
    assert.equal(new Set(seen).size, 15, "15枚すべて");
    assert.deepEqual(plain(a16 && Object.keys(WORKBOOK_NAMES)).sort(), plain(JSON.parse(fs.readFileSync(path.join(project, "data/ProjectR_CardBalance.json"), "utf8")).cards && Object.keys(JSON.parse(fs.readFileSync(path.join(project, "data/ProjectR_CardBalance.json"), "utf8")).cards)).sort(), "ワークブックの15枚 = バランス表の15枚");
    for (const id of Object.keys(WORKBOOK_NAMES)) assert.equal(JSON.parse(fs.readFileSync(path.join(project, "data/ProjectR_CardBalance.json"), "utf8")).cards[id].name, WORKBOOK_NAMES[id], id + " のバランス表の名前 = ワークブック");
});

test("敵のHPバーとHPの数値・ボス名のパネルは表示しない(承認済み・仕様 BT-065 / ボスの絵を大きく出す): ボスの表示はフェーズ(形態)の小さなチップだけ。HPが変わっても描き直さない。プレイヤーHP・フェーズ・残り時間・日本語のカード名は表示する。値そのものは読める", () => {
    const code = fs.readFileSync(path.join(project, "js/plugins/ProjectR_SoulBattleHUD.js"), "utf8");
    const block = code.slice(code.indexOf("// ボスのフェーズ(形態)だけ"), code.indexOf("// マナ(準備ループの SOUL のときだけ"));      // フェーズのチップの描画だけ(次のマナ・プレイヤーのパネルは含めない)
    assert.ok(block.length > 100, "ボスのフェーズの描画部分を取り出せた");
    assert.doesNotMatch(block, /bar\(|hpBoss|boss\.hp|maxHp|boss\.ratio|boss\.name/, "フェーズのチップはHPバー・HPの数値・ボス名を描かない");
    const w = a16();
    frames(w, 4);
    const hud = w.sc()._projectRSoulHud, m0 = model(w);
    assert.equal(w.ctx.ProjectRSoulBattleHUD.PANELS.boss, undefined, "ボス名のパネルは無い");
    assert.equal(hud.panels.boss, undefined, "ボス名のパネルのSpriteも無い");
    assert.ok(hud.panels.phase, "フェーズのチップ");
    // dev_boss は3形態: フェーズのチップは出る。名前・HPは署名に無い
    hurt(w, w.heart, 400); frames(w, 8);
    const before = hud.panels.phase._sig;
    assert.ok(before && /第二形態/.test(before) && !/dev_boss|SOUL/.test(before), "チップはフェーズだけ(ボス名なし): " + before);
    assert.equal(hud.panels.phase.visible, true);
    assert.doesNotMatch(before, /\b[5-9]\d\d\b/, "署名にもHPを含めない(HPで描き直さない)");
    hurt(w, w.heart, 100); frames(w, 8);
    assert.equal(hud.panels.phase._sig, before, "HPが減ってもチップは変わらない(HPを表示していない)");
    const m1 = model(w);
    assert.ok(m1.boss.hp < m0.boss.hp, "HPの値そのものは読める(表示しないだけ): " + [m0.boss.hp, m1.boss.hp]);
    assert.equal(m1.boss.name, m0.boss.name, "名前の値も読める(表示しないだけ)");
    assert.match(hud.panels.player._sig, /\d/, "プレイヤーHPのパネルはHPを含む");
    assert.equal(m1.phase, "attack"); assert.ok(m1.secondsLeft > 0, "フェーズ・残り時間は表示");
    assert.deepEqual(m1.hand.map(slot => slot.name), ["一閃", "黄金の矢", "エロスの矢", "薙ぎ払い", "ギガース殺し"], "カード名は日本語のまま(英字のIDの小さな名前も出さない)");
    assert.doesNotMatch(code.slice(code.indexOf("// 手札5枚"), code.indexOf("// 山札など")), /humanize\(slot/, "英字のID名をカードに添えない");
    quietly(() => w.sb.stop());
});

// ---------------------------------------------------------------- 山札の動き(引く・使う・Cooldownが終わる・シャッフル)を見えるようにする ----------------------------------------------------------------
const deckState = w => plain(w.deck.getBattleState());
const useRaw = (w, index = 0) => { const card = deckState(w).hand[index]; assert.ok(card, "手札がある"); return plain(w.deck.useBattleCard(card.instanceId)); };   // 山札の規則そのもの(消費 → Cooldown → 引く)だけ。発動はしない

test("山札の動きが見える: 使う → 手札から消えてクールダウンへ(その山が光る)、山札から1枚引く(引いたカードに NEW)、少ししたら元へ戻る。山札の規則・数はHUDが変えない", () => {
    const w = a16({ attackSeconds: 600 });
    frames(w, 8);
    const idle = model(w);
    assert.equal(idle.deck.last, "", "何も起きていなければ、動きの表示は空");
    assert.deepEqual(idle.deck.flash, { draw: false, cooldown: false, discard: false });
    assert.equal(idle.deck.shuffle, false);
    const base = JSON.stringify(deckState(w));
    frames(w, 30);
    assert.equal(JSON.stringify(deckState(w)), base, "見ているだけでは山札は動かない(HUDは読むだけ)");
    const used = deckState(w).hand[0].cardId;
    const before = deckState(w);
    useRaw(w, 0); frames(w, 6);
    const m = model(w), st = deckState(w);
    assert.equal(st.drawPile.length, before.drawPile.length - 1, "山札から1枚引いた");
    assert.equal(st.cooldownPile.length, before.cooldownPile.length + 1, "使ったカードはクールダウンへ");
    assert.deepEqual(m.counts, { draw: st.drawPile.length, discard: st.discardPile.length, cooldown: st.cooldownPile.length }, "数は本物の山札そのまま");
    assert.equal(m.deck.flash.cooldown, true, "クールダウンの山が光る");
    assert.equal(m.deck.flash.draw, true, "山札も光る(引いた)");
    assert.match(m.deck.last, /^(使用|引いた): /, "いちばん新しい動きが文字で出る: " + m.deck.last);
    const fresh = m.hand.map(slot => slot.fresh);
    assert.deepEqual(fresh, [false, false, false, false, true], "引いたカード(いちばん右の枠)だけが NEW");
    const hud = w.sc()._projectRSoulHud;
    assert.match(hud.panels.counts._sig, /"cooldown":true/, "山札のパネルの署名に光の状態が入る(描き直される)");
    assert.match(hud.cardPanels[4]._sig, /true\]$/, "NEWのカード枠の署名に入る(描き直される)");
    // 少ししたら元へ戻る(ずっと光らない)
    frames(w, 130);
    const later = model(w);
    assert.deepEqual(later.deck.flash, { draw: false, cooldown: false, discard: false }, "光は消える");
    assert.equal(later.hand.every(slot => !slot.fresh), true, "NEWも消える");
    // Cooldownが終わると捨て札へ(その山が光る)
    w.deck.updateCooldown(100); frames(w, 6);
    const back = model(w), st2 = deckState(w);
    assert.equal(st2.cooldownPile.length, 0);
    assert.equal(st2.discardPile.length, 1, "終わったカードは捨て札へ");
    assert.equal(back.deck.flash.discard, true, "捨て札の山が光る");
    assert.match(back.deck.last, /^回復: 1枚 → 捨て札/, back.deck.last);
    quietly(() => w.sb.stop());
});

test("シャッフルが見える: 山札が空のときに引くと、捨て札を混ぜて山札に戻す。そのときだけ SHUFFLE を出す(枚数つき)。普通に引いただけでは出さない", () => {
    const w = a16({ attackSeconds: 600 });
    frames(w, 8);
    // 山札(25枚)を引き切る
    for (let i = 0; i < 25; i++) useRaw(w, 0);
    frames(w, 6);
    assert.equal(deckState(w).drawPile.length, 0, "山札は空");
    assert.equal(model(w).deck.shuffle, false, "普通に引いただけではシャッフルは出ない");
    assert.equal(deckState(w).discardPile.length, 0);
    frames(w, 130);
    w.deck.updateCooldown(100); frames(w, 6);                          // Cooldownが終わる → 捨て札へ
    const discard = deckState(w).discardPile.length;
    assert.ok(discard >= 20, "捨て札がたまった: " + discard);
    frames(w, 130);
    useRaw(w, 0); frames(w, 6);                                        // 山札が空 → 捨て札を混ぜて山札へ → 1枚引く
    const after = deckState(w), m = model(w);
    assert.equal(after.discardPile.length, 0, "捨て札は山札へ戻った");
    assert.equal(after.drawPile.length, discard - 1, "混ぜた山札から1枚引いた");
    assert.equal(m.deck.shuffle, true, "SHUFFLE が出る");
    assert.equal(m.deck.shuffleCount, discard, "混ぜた枚数");
    assert.equal(m.deck.last, `シャッフル: 捨て札${discard}枚 → 山札`);
    assert.match(w.sc()._projectRSoulHud.panels.counts._sig, /"shuffle":true/, "山札のパネルにSHUFFLEの印");
    frames(w, 130);
    assert.equal(model(w).deck.shuffle, false, "しばらくしたら消える");
    quietly(() => w.sb.stop());
});

test("山札の表示はSOUL戦闘の間だけ・片づけで消える: SOULを終えれば記録を捨てる。次のSOUL戦闘で古い動きが出ない。山札の表示コードは山札を書き換えない", () => {
    const code = fs.readFileSync(path.join(project, "js/plugins/ProjectR_SoulBattleHUD.js"), "utf8");
    const block = code.slice(code.indexOf("const observeDeck"), code.indexOf("const watchView"));
    assert.ok(block.length > 200);
    assert.doesNotMatch(block, /requestUseCard|useBattleCard|updateCooldown|startBattle|startCardBattle|endBattle|setDeck|drawOne|\.push\(\{ *instance/, "山札の表示は読むだけ(山札・Cooldownを動かす呼び出しを持たない)");
    const w = a16({ attackSeconds: 600 });
    frames(w, 8);
    useRaw(w, 0); frames(w, 6);
    assert.notEqual(model(w).deck.last, "");
    quietly(() => w.sb.stop()); frames(w, 6);
    assert.equal(w.hud.isActive(), false);
    const w2 = a16({ attackSeconds: 600 });
    frames(w2, 8);
    assert.equal(model(w2).deck.last, "", "次の戦闘では前の動きが残っていない");
    quietly(() => w2.sb.stop());
});

test("値は並行して持たない: ハートのHP・プレイヤーHP・時間・手札が変われば、次の更新でビューモデルも変わる(HUD側にキャッシュした値を持たない)", () => {
    const w = a16({ attackSeconds: 30 });
    const id = w.heart;
    const hp0 = model(w).boss.hp;
    hurt(w, id, 400); frames(w, 6);
    const m1 = model(w);
    assert.deepEqual([m1.boss.hp, m1.boss.phaseLabel, m1.boss.phaseIndex], [plain(w.bf.getHudState()).hp, plain(w.bf.getHudState()).phaseLabel, 1]);
    const leader = w.ctx.$gameParty.leader(); leader._hp = 100; frames(w, 6);
    assert.equal(model(w).player.hp, 100);
    const t0 = model(w).secondsLeft; frames(w, 70);
    assert.ok(model(w).secondsLeft < t0 - 0.9, "残り時間が減る");
    const before = handIds(w);
    const cast = plain(w.deck.requestUseCard(0)); assert.ok(cast.ok || cast.pending, JSON.stringify(cast)); frames(w, 12);
    const after = handIds(w);
    assert.notDeepEqual(after, before);
    assert.deepEqual(model(w).hand.map(s => s.cardId), after, "手札の入れ替わりを反映");
    assert.equal(model(w).counts.cooldown, plain(w.deck.getBattleState()).cooldownPile.length);
    leader._hp = leader.mhp;
});

test("カード枠の表示状態: 攻撃中=ready、移動カード(絶)=moveLock、防御ターン=全てlocked。同じカードのCooldown中の残り秒数を出す", () => {
    const w = a16({ openingHand: ["hermes_zetsu", "hermes_issen", "hermes_issen", "hermes_sweep", "apollo_golden_volley"] });
    frames(w, 6);
    let m = model(w);
    assert.equal(m.hand[0].state, "ready", "絶は SOUL専用の構えとして使えるので ready(移動の遮断が残る高速移動は moveLock)");
    assert.equal(m.hand[0].cooldownSeconds, 6, "SOUL中の絶のCooldown(6秒)");
    assert.deepEqual(m.hand.slice(1).map(s => s.state), ["ready", "ready", "ready", "ready"]);
    const cast = plain(w.deck.requestUseCard(1)); assert.equal(cast.ok, true, JSON.stringify(cast)); frames(w, 15);
    m = model(w);
    const issen = m.hand.filter(s => s.cardId === "hermes_issen");
    assert.ok(issen.length >= 1 && issen.every(s => s.cooling > 5 && s.cooling <= 7), "Cooldown中の同名カードの残り秒数 " + JSON.stringify(issen));
    const pile = plain(w.deck.getBattleState()).cooldownPile.find(e => e.instance.cardId === "hermes_issen");
    assert.ok(Math.abs(issen[0].cooling - pile.remainingSeconds) < 0.5);
    w.soul.skipPhase(); frames(w, 6);
    m = model(w);
    assert.equal(m.phase, "defense");
    assert.ok(m.hand.every(s => s.empty || s.state === "locked"), "防御ターンは全て LOCK 表示");
    // 防御ターンでも カードは本当に使えない(HUDではなくSOULの責務)。表示と一致する
    const pile0 = plain(w.deck.getBattleState()).cooldownPile.length;
    assert.equal(plain(w.deck.requestUseCard(2)).reason, "soulDefense");
    assert.equal(plain(w.deck.getBattleState()).cooldownPile.length, pile0);
});

test("防御ターン: バトルボックスの予約レイアウトだけ(攻撃の枠は消える)。ハート操作・弾幕・当たり判定は足さない: プレイヤー/ハート/弾の状態はHUDの有無で変わらない", () => {
    const w = a16();
    const layer = w.sc()._projectRSoulHud;
    assert.equal(layer.box.visible, false, "攻撃ターンはボックス無し");
    assert.ok(layer.corners.every(c => c.visible), "攻撃ターンは戦闘エリアの枠");
    w.soul.skipPhase(); frames(w, 8);
    assert.equal(w.hud.getViewModel().phase, "defense");
    assert.equal(layer.box.visible, true, "防御ターンはボックス");
    assert.ok(layer.corners.every(c => !c.visible), "枠は消える");
    const events = () => w.ctx.$gameMap.events().filter(e => e && !e._erased).length;
    const e0 = events(), player0 = [w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY];
    frames(w, 60);
    assert.equal(events(), e0, "HUDは弾やイベントを増やさない(弾幕なし)");
    assert.deepEqual([w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY], player0, "プレイヤーは動かない(ハート操作なし)");
    const dodge = plain(w.ctx.ProjectRSoulBattleDodge.getState());
    assert.equal(dodge.active, true);
    assert.equal(w.soul.getState().lockedPlayer, true);
    assert.equal(w.ctx.ProjectRCardBattleInput.getBlockedReason({ code: "KeyU" }), "soulDefense");
    w.soul.skipPhase(); frames(w, 8);
    assert.equal(layer.box.visible, false); assert.ok(layer.corners.every(c => c.visible));
});

// ---------------------------------------------------------------- 復元 ----------------------------------------------------------------
const checkRestored = (w, label, originals) => {
    const flags = hiddenFlags(w);
    assert.equal(flags.layer, true, label + ": BattleHUDの表示が元通り");
    assert.equal(flags.menu, originals.menu, label + ": メニューボタンが元通り(元がfalseならfalseのまま)");
    assert.equal(flags.hendrix, true, label);
    assert.deepEqual(flags.bars, originals.bars, label + ": 敵HPバーが元通り");
    const state = plain(w.hud.getState());
    assert.deepEqual([state.active, state.hiddenCount, state.dim, state.layerVisible], [false, 0, false, false], label);
    assert.equal(dimCount(w), 0, label + ": 暗転は外れる");
    assert.equal(w.sc()._spriteset.children.filter(c => c._projectRSoulBattleLabel).length, 0, label + ": ラベルは片づく");
};
test("元の表示へ正確に戻す: 勝利・外から終了・カード戦闘の終了・戦闘セッション一括終了・マップ読み直しのどれでも1回だけ復元(元から隠れていた物は隠れたまま)", () => {
    const cases = {
        victory: w => { hurt(w, w.heart, 1500); frames(w, 8); },
        externalEnd: w => { w.soul.end("external"); frames(w, 4); },
        cardBattleEnded: w => { w.deck.endCardBattle(); frames(w, 4); },
        combatEnded: w => { w.ctx.ProjectRCombatSession.endAll("external"); frames(w, 4); },
        mapChanged: w => { w.ctx.$gameMap.setup(4); frames(w, 4); }
    };
    for (const [reason, trigger] of Object.entries(cases)) {
        const w = a16({}, { originals: { menuButton: false, bar1: false } });
        frames(w, 4);
        assert.equal(w.decor.extra.menuButton.renderable, false);
        assert.equal(w.hud.isActive(), true);
        const restoredBefore = w.hud.getState().restores;
        trigger(w);
        assert.ok(w.ends.length >= 1, reason + ": SOULが終わった " + JSON.stringify(w.ends));
        const state = plain(w.hud.getState());
        assert.equal(state.restores, restoredBefore + 1, reason + ": 復元は1回だけ");
        assert.deepEqual([state.active, state.hiddenCount, state.dim, state.layerVisible], [false, 0, false, false], reason);
        assert.equal(dimCount(w), 0, reason);
        assert.equal(w.decor.extra.menuButton.renderable, false, reason + ": 元からfalseだったメニューボタンはfalseのまま");
        assert.equal(w.decor.extra.hudLayer.renderable, true, reason + ": BattleHUDは元通り");
        assert.equal(w.decor.extra.hendrixHud.renderable, true, reason);
        const bars = w.sc()._spriteset._eventHpBars;
        const barOf3 = bars.find(x => x._event.eventId() === 3);
        assert.equal(barOf3.renderable, false, reason + ": 元からfalseだったバーはfalseのまま");
        assert.ok(bars.filter(x => x !== barOf3).every(x => x.renderable === true), reason + ": 他のバーは元通り");
        assert.equal(w.sc()._spriteset.children.filter(c => c._projectRSoulBattleLabel).length, 0, reason + ": ラベルは片づく");
        frames(w, 20);
        assert.equal(plain(w.hud.getState()).restores, restoredBefore + 1, reason + ": 以後も何も起きない");
    }
});

test("stop(): F8の stop() で終了しても(アリーナ退出の直前に)通常HUDは元に戻る。status()/stop()/start(\"a16\") は従来どおり", () => {
    const w = a16();
    const st = quietly(() => plain(w.sb.status()));
    assert.equal(st.a16.deckSize, 30);
    assert.equal(typeof w.sb.start, "function"); assert.equal(typeof w.sb.status, "function"); assert.equal(typeof w.sb.stop, "function");
    const stopped = quietly(() => plain(w.sb.stop()));
    assert.equal(stopped.ok, true);
    // アリーナ退出の予約(マップ移動)があるため、ここではHUDの片づけを直接確認する(ハーネスはマップ移動後のフレームを回せない)
    w.sc().update();
    assert.deepEqual([w.hud.isActive(), w.hud.getState().hiddenCount, dimCount(w)], [false, 0, 0]);
    assert.equal(w.decor.extra.hudLayer.renderable, true);
});

test("繰り返しの開始: 開始・終了を3回繰り返しても、隠す対象の記録は重複せず元の値を上書きしない(毎回元のtrueへ戻る)。暗転は常に1枚。ボスが無い普通のシナリオではハートのHPだけを表示する", () => {
    const w = arenaWorld();
    for (let i = 0; i < 3; i++) {
        const r = quietly(() => plain(w.sb.start("dodge")));
        assert.equal(r.ok, true, "周回" + i + " " + JSON.stringify(r));
        frames(w, 6);
        assert.equal(w.hud.isActive(), true);
        assert.equal(dimCount(w), 1);
        const count1 = w.hud.getState().hiddenCount;
        frames(w, 20);
        assert.equal(w.hud.getState().hiddenCount, count1, "毎フレーム増えない");
        assert.equal(w.decor.extra.hudLayer.renderable, false);
        const m = model(w);
        assert.equal(m.boss.source, "heart", "BossFrameworkのボスが無いシナリオ");
        assert.equal(m.hand.length, 5);
        w.soul.end("t"); frames(w, 4);
        assert.equal(w.decor.extra.hudLayer.renderable, true, "周回" + i + ": 元のtrueへ戻る");
        assert.equal(w.decor.extra.menuButton.renderable, true);
        assert.deepEqual([w.hud.getState().hiddenCount, dimCount(w)], [0, 0]);
    }
    assert.equal(w.hud.getState().activations, 3);
    assert.equal(w.hud.getState().restores, 3);
});

// 実機で見つかった不具合の再発防止: 独自メソッドの名前が PIXI / MZ の Sprite・Container の名前を上書きしてはいけない(例: render は PIXI の描画関数)。
// ハーネスは描画しないので、名前の衝突そのものを検査する。
test("名前の衝突なし: 専用レイヤー/パネルの独自メソッドは、PIXI・MZ の Sprite/Container の既存メソッドを上書きしない(update だけは意図して空にする)", () => {
    const w = a16();
    const layer = w.sc()._projectRSoulHud;
    const panel = layer.panels.phase;
    const PIXI_NAMES = ["render", "renderAdvanced", "renderCanvas", "renderWebGL", "_render", "updateTransform", "calculateBounds", "getBounds", "getLocalBounds", "containsPoint", "destroy", "setParent", "addChild", "addChildAt",
        "removeChild", "removeChildAt", "setTransform", "toGlobal", "toLocal", "displayObjectUpdateTransform", "_calculateBounds", "onTextureUpdate", "updateFrame", "_refresh", "_refreshFrame", "setFrame", "move", "setHue", "setBlendColor", "setColorTone", "isOnScreen"];
    for (const object of [layer, panel, layer.corners[0]]) {
        const proto = Object.getPrototypeOf(object);
        if (proto === w.ctx.Sprite.prototype) continue;
        for (const name of Object.getOwnPropertyNames(proto)) {
            if (name === "constructor" || name === "update") continue;
            assert.ok(!PIXI_NAMES.includes(name), name + " は PIXI/MZ の名前と衝突する");
            assert.ok(!(name in w.ctx.Sprite.prototype), name + " は MZ の Sprite に既にある");
        }
    }
    const own = Object.getOwnPropertyNames(Object.getPrototypeOf(layer)).filter(n => n !== "constructor" && n !== "update");
    assert.ok(own.length >= 5 && own.every(n => n.startsWith("hud")), "Layerの独自メソッドは hud~ で始める " + own.join());
    assert.equal(Object.prototype.hasOwnProperty.call(Object.getPrototypeOf(layer), "render"), false, "Layer は PIXI の render を上書きしていない");
});

// ---------------------------------------------------------------- 堅牢性 ----------------------------------------------------------------
test("シーンが作り直されても(メニューから戻る等)SOULが続いていれば、新しいシーンで隠し直し、古いシーンの分は先に戻す", () => {
    const w = a16();
    const oldDecor = w.decor, oldScene = w.sc();
    assert.equal(oldDecor.extra.hudLayer.renderable, false);
    // 新しいシーン(同じ stub 構成)に差し替える
    const next = Object.create(Object.getPrototypeOf(oldScene));
    Object.assign(next, oldScene);
    next.children = []; next._projectRSoulHud = null; next._projectRSoulDim = null;
    next._spriteset = Object.assign(Object.create(Object.getPrototypeOf(oldScene._spriteset) || Object.prototype), { update() {}, children: [], _eventHpBars: [], _characterSprites: [] });
    w.ctx.SceneManager._scene = next; 
    const newDecor = decorate(next);
    next._spriteset.addChild = c => { c.parent = next._spriteset; next._spriteset.children.push(c); return c; };
    next._spriteset.removeChild = c => { const i = next._spriteset.children.indexOf(c); if (i >= 0) next._spriteset.children.splice(i, 1); };
    next._spriteset._tilemap = newDecor.tilemap;
    w.scene = next;
    try { next.update(); } catch (error) { /* ハーネスの Scene.update が古いシーン参照を使う場合は直接 refresh 相当を回す */ }
    assert.equal(oldDecor.extra.hudLayer.renderable, true, "古いシーンの通常HUDは先に戻る");
    assert.equal(oldDecor.tilemap.children.filter(c => c._projectRSoulDim).length, 0, "古い暗転は外れる");
    assert.equal(newDecor.extra.hudLayer.renderable, false, "新しいシーンで隠し直す");
    assert.equal(newDecor.tilemap.children.filter(c => c._projectRSoulDim).length, 1);
    assert.equal(w.hud.getState().hiddenCount > 0, true);
    // シーンの終了(terminate)でも戻る
    try { next.terminate(); } catch (error) { /* ハーネスのstubには元の terminate が使う Window の hide が無い。HUDの片づけは元の呼び出しより前に済む */ }
    assert.equal(newDecor.extra.hudLayer.renderable, true);
    assert.equal(w.hud.getState().hiddenCount, 0);
});

test("解像度の変更: 専用レイヤーは 1920x1080 基準で拡大縮小され、暗転は新しい画面サイズで作り直される(重複しない)", () => {
    const w = a16();
    const layer = w.sc()._projectRSoulHud;
    const g = w.ctx.Graphics;
    const w0 = g.width, h0 = g.height;
    assert.ok(Math.abs(layer.scale.x - w0 / 1920) < 1e-9 && Math.abs(layer.scale.y - h0 / 1080) < 1e-9);
    const dim0 = w.decor.tilemap.children.find(c => c._projectRSoulDim);
    assert.deepEqual([dim0._dimW, dim0._dimH], [w0, h0]);
    for (const [nw, nh] of [[1920, 1080], [1280, 720], [640, 360]]) {
        g._width = nw; g._height = nh;
        frames(w, 3);
        assert.ok(Math.abs(layer.scale.x - nw / 1920) < 1e-9 && Math.abs(layer.scale.y - nh / 1080) < 1e-9, `${nw}x${nh}: 拡大率`);
        const dims = w.decor.tilemap.children.filter(c => c._projectRSoulDim);
        assert.equal(dims.length, 1, `${nw}x${nh}: 暗転は1枚`);
        assert.deepEqual([dims[0]._dimW, dims[0]._dimH], [nw, nh], `${nw}x${nh}: 暗転のサイズ`);
        assert.equal(w.hud.getState().active, true);
    }
    g._width = w0; g._height = h0;
});

test("無いオプションプラグイン・表示物があっても安全: BattleHUD/BossFramework/ハート/表示物が無くても例外なく動き、読めない値は空で表示する", () => {
    const w = a16();
    const ctx = w.ctx;
    // BattleHUD が無い(名前の解決を自前の既定へ)
    const savedHud = ctx.ProjectRBattleHUD; ctx.ProjectRBattleHUD = undefined;
    frames(w, 6);
    let m = model(w);
    assert.equal(m.hand[0].name, "一閃", "BattleHUDが無ければワークブックのカード名(それも無ければカードIDから作った名前)");
    ctx.ProjectRBattleHUD = savedHud;
    // BossFramework のHUD状態が読めない → SOULのハートのHPだけ
    const savedGet = w.bf.getHudState; w.bf.getHudState = () => null;
    frames(w, 6);
    m = model(w);
    assert.equal(m.boss.source, "heart"); assert.equal(m.boss.name, "SOUL");
    assert.equal(m.boss.hp, plain(ctx.ProjectRSoulBattlePoC.getState()).hp);
    w.bf.getHudState = () => { throw new Error("boom"); };
    frames(w, 6);
    assert.equal(model(w).boss.source, "heart", "例外でも落ちない");
    w.bf.getHudState = savedGet;
    // カードデッキ・パーティが読めない
    const savedBattle = w.deck.getBattleState; w.deck.getBattleState = () => null;
    frames(w, 6);
    m = model(w);
    assert.deepEqual([m.cardBattle, m.counts, m.hand.every(s => s.empty)], [false, null, true], "カード戦闘が読めなければ空の枠");
    w.deck.getBattleState = savedBattle;
    // 表示物がまったく無いシーン
    const scene = w.sc();
    scene._projectRBattleHudLayer = undefined; scene._menuButton = undefined; scene.hendrixHuds = []; scene._skillUI = undefined;
    frames(w, 6);
    assert.equal(w.hud.isActive(), true);
    assert.equal(w.hud.getState().lastError, "", "表示の例外は出ていない");
    // 通常HUDの表示物は renderable を持たない(古い部品)でも落ちない
    scene._menuButton = { visible: true };
    frames(w, 6);
    assert.equal(w.hud.isActive(), true);
});

test("失敗しても安全: 描画の準備が例外を出したら、通常HUDを元に戻して専用HUDを止める(ゲームは進む)。メッセージ中は専用レイヤーを隠す。setEnabled(false)で即座に元へ", () => {
    // 描画の失敗
    const w = a16();
    assert.equal(w.decor.extra.hudLayer.renderable, false);
    const warn = console.warn; let warned = 0; console.warn = () => { warned++; };
    const original = w.ctx.Bitmap.prototype.fillRect;
    try {
        w.ctx.Bitmap.prototype.fillRect = function() { throw new Error("render boom"); };
        // 暗転の作り直し(解像度の変更)で描画が必要になる
        w.ctx.Graphics._width = 1280; w.ctx.Graphics._height = 720;
        frames(w, 3);
    } finally { w.ctx.Bitmap.prototype.fillRect = original; console.warn = warn; w.ctx.Graphics._width = 816; w.ctx.Graphics._height = 624; }
    assert.ok(warned >= 1, "警告を出す");
    frames(w, 5);
    assert.equal(w.soul.isActive(), true, "SOUL戦闘は続く(表示の失敗でゲームを止めない)");
    // 失敗した戦闘では専用HUDを止め、通常HUDは元の表示のまま(毎フレーム警告を出し続けない)
    const failedState = plain(w.hud.getState());
    assert.deepEqual([failedState.failed, failedState.active, failedState.hiddenCount, w.decor.extra.hudLayer.renderable], [true, false, 0, true]);
    assert.ok(failedState.lastReason.startsWith("error") && failedState.lastError.includes("render boom"), failedState.lastError);
    assert.equal(warned, 1, "警告は1回だけ");
    // 次のSOUL戦闘では、また試す(失敗の記録は戦闘ごと)
    w.soul.end("t"); frames(w, 3);
    assert.equal(plain(w.hud.getState()).failed, false);
    // メッセージ中は専用レイヤーを隠す(BattleHUDと同じ)
    const w2 = a16();
    const layer = w2.sc()._projectRSoulHud;
    assert.equal(layer.visible, true);
    w2.ctx.$gameMessage.add("hello"); frames(w2, 3);
    assert.equal(layer.visible, false, "メッセージ中は隠れる");
    w2.ctx.$gameMessage.clear(); frames(w2, 3);
    assert.equal(layer.visible, true);
    // 無効化
    assert.equal(w2.hud.setEnabled(false), false);
    frames(w2, 2);
    assert.deepEqual([w2.hud.isActive(), w2.hud.getState().hiddenCount, dimCount(w2), w2.decor.extra.hudLayer.renderable], [false, 0, 0, true]);
    assert.equal(w2.soul.isActive(), true, "戦闘は続く");
    assert.equal(w2.hud.setEnabled(true), true);
    frames(w2, 3);
    assert.equal(w2.hud.isActive(), true);
});

test("パネルは本物のプレイヤー/ハートに重なると薄くなる(照準・ハートを隠さない)。離れれば元の濃さへ戻る", () => {
    const w = a16();
    const layer = w.sc()._projectRSoulHud, ctx = w.ctx;
    const sx = layer._lastScaleX, sy = layer._lastScaleY;
    const savedX = ctx.$gamePlayer.screenX, savedY = ctx.$gamePlayer.screenY;
    ctx.$gamePlayer.screenX = () => 498 * sx; ctx.$gamePlayer.screenY = () => (37 + 24) * sy;   // フェーズのチップの真ん中
    const evs = w.ctx.$gameMap.event(w.heart);
    const sxh = evs.screenX, syh = evs.screenY;
    evs.screenX = () => 100 * sx; evs.screenY = () => (500 + 24) * sy;                           // 画面の左・中央(どのパネルとも重ならない)
    frames(w, 40);
    assert.ok(layer.panels.phase.alpha < 0.5 && layer.panels.phase.alpha >= 0.44, "重なったパネルは薄い(最低0.45) " + layer.panels.phase.alpha);
    assert.equal(layer.panels.player.alpha, 1, "重ならないパネルは濃いまま");
    ctx.$gamePlayer.screenX = savedX; ctx.$gamePlayer.screenY = savedY; evs.screenX = sxh; evs.screenY = syh;
    ctx.$gamePlayer.screenX = () => 960 * sx; ctx.$gamePlayer.screenY = () => 540 * sy;
    frames(w, 60);
    assert.equal(layer.panels.phase.alpha, 1, "離れれば元の濃さ");
    ctx.$gamePlayer.screenX = savedX; ctx.$gamePlayer.screenY = savedY;
});

// ---------------------------------------------------------------- 戦闘の中身は変えない(I2の流れの回帰) ----------------------------------------------------------------
test("戦闘の中身はHUDの有無で変わらない: 同じカードを同じ状況で使った結果(ダメージ・手札・Cooldown山・セッション・フェーズ)が、専用HUD有効/無効で一致する", () => {
    const run = enabled => {
        const w = a16({ openingHand: ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"] });
        w.hud.setEnabled(enabled);
        frames(w, 4);
        const c = w.ctx.$gamePlayer.centerPositionPoint(), h = w.ctx.ProjectRSoulBattlePoC.getState().hitCenter;
        aimDegree(w, Math.atan2(h.x - c.x, c.y - h.y) * 180 / Math.PI, Math.hypot(h.x - c.x, c.y - h.y));
        const cast = plain(w.deck.requestUseCard(0)); assert.equal(cast.ok, true, JSON.stringify(cast));
        frames(w, 220);
        const hurtHits = w.calls.filter(x => x.name === "UpdateEventHp" && String(x.args.eventId) === String(w.heart)).length;
        return { damage: 1000 - barHp(w, w.heart), hits: hurtHits, hand: handIds(w), pile: plain(w.deck.getBattleState()).cooldownPile.length, phase: w.soul.getPhase(),
            sources: plain(w.ctx.ProjectRCombatSession.sources()).sort(), bf: plain(w.bf.getState()).hp, save: w.ctx.$gameSystem.isSaveEnabled(), move: w.run("playerMovementDisabled") };
    };
    const on = run(true), off = run(false);
    assert.deepEqual(on, off, "HUDの有無で戦闘の結果が同じ");
    assert.deepEqual([on.damage, on.hits], [300, 4], "一閃Lv3の従来の値(300・4回)");
});

test("I2の流れ: 勝利でSOULが1回だけ終わり、デッキ・指輪・所持・ダミー・武器が全て元に戻り、専用HUDも片づく。a16は再び開始できる", () => {
    const w = arenaWorld();
    const before = JSON.stringify({ deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null, dirty: w.ctx.ProjectRApolloTest.isDirty() });
    const r = quietly(() => plain(w.sb.start("a16", { stage: false, openingHand: HAND })));
    assert.equal(r.ok, true);
    w.heart = r.heartEventId; prepareDisplay(w);
    frames(w, 6);
    assert.equal(w.hud.isActive(), true);
    hurt(w, r.heartEventId, 400); frames(w, 6);
    assert.equal(model(w).boss.phaseIndex, 1);
    hurt(w, r.heartEventId, 350); frames(w, 6);
    assert.equal(model(w).boss.phaseIndex, 2);
    hurt(w, r.heartEventId, 400); frames(w, 8);
    assert.deepEqual(w.ends, ["victory"]);
    assert.equal(JSON.stringify({ deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null, dirty: w.ctx.ProjectRApolloTest.isDirty() }), before);
    assert.deepEqual([w.hud.isActive(), w.hud.getState().hiddenCount, dimCount(w)], [false, 0, 0]);
    assert.equal(w.decor.extra.hudLayer.renderable, true);
});

console.log(`\n${passed} tests passed`);
