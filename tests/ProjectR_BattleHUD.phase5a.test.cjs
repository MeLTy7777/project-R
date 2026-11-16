"use strict";
// Phase 5A: カード戦闘HUD。既存ProjectR_BattleHUD.jsを実ソースのまま読み込み、
// 実Core・実Input・実Manager・実Gauge・実Activation・実Hermes/Apollo Ultimateの上で、
// HUDのview-model(adapter)と、Sprite木が受け取った文字列/表示状態を検証する。
// Sprite/Bitmap/PIXIは記録用のdoubleであり、これはピクセル描画やMZ実機のテストではない。
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8").replace(/\r\n/g, "\n");                                  // 改行は LF に正規化する(Windows の git は autocrlf で CRLF にチェックアウトする。内容の判定は変えない)
const plain = value => JSON.parse(JSON.stringify(value));
function fixtureLoader(file) {
    const text = read(file), f = { require, __dirname, console };
    vm.runInNewContext(text.slice(0, text.indexOf("\nlet passed = 0;")) + "\nthis.createGame = loadGame;", f);
    return f.createGame;
}
const loadGame = fixtureLoader("tests/ProjectR_HermesSwordsmanship.test.cjs");
const HUD_FILE = "js/plugins/ProjectR_BattleHUD.js";
const GAUGE_FILE = "js/plugins/ProjectR_UltimateGauge.js", ACT_FILE = "js/plugins/ProjectR_UltimateActivation.js";
const HERMES_FILE = "js/plugins/ProjectR_HermesUltimate.js", APOLLO_FILE = "js/plugins/ProjectR_ApolloUltimate.js";
const mgr = g => g.ProjectRGodSummonManager, gauge = g => g.ProjectRUltimateGauge;
const deck = g => g.ProjectRCardDeck, act = g => g.ProjectRUltimateActivation;

const productionConfig = {}; vm.runInNewContext(read("js/plugins.js"), productionConfig);
const keyboardParameters = productionConfig.$plugins.find(p => p.name === "Hendrix_Keyboard_Gamepad").parameters;
const skillsData = JSON.parse(read("data/Skills.json"));
const SWORD = "hermes_sword_attack", ARROW = "apollo_golden_arrow";

// ---- 描画double: Sprite/Bitmap/PIXI/ImageManager。記録だけで描画はしない ----
function installUi(g) {
    g.textDraws = 0;
    class Bitmap {
        constructor(width, height) { this.width = width; this.height = height; this.lastText = ""; }
        clear() { this.lastText = ""; }
        drawText(text) { this.lastText = String(text); g.textDraws++; }
        resize(width, height) { this.width = width; this.height = height; }
        addLoadListener(callback) { callback(this); }
    }
    class Sprite {
        constructor() {
            this.children = []; this.visible = true; this.alpha = 1; this.x = 0; this.y = 0;
            this.anchor = { set() {} }; this.scale = { set() {} };
            this.initialize(...arguments);
        }
        initialize(bitmap) { this.bitmap = bitmap || null; }
        addChild(child) { this.children.push(child); return child; }
        addChildAt(child) { this.children.push(child); return child; }
        setFrame() {}
        update() { for (const child of this.children) child.update?.(); }
    }
    class Graphics2D {}
    for (const name of ["lineStyle", "beginFill", "endFill", "drawPolygon", "drawRect", "drawRoundedRect",
        "drawCircle", "arc", "moveTo", "lineTo", "clear"]) Graphics2D.prototype[name] = function() { return this; };
    Object.assign(g, {
        Bitmap, Sprite, PIXI: { Graphics: Graphics2D },
        ImageManager: { iconWidth: 32, iconHeight: 32, faceWidth: 144, faceHeight: 144,
            loadSystem: () => new Bitmap(), loadFace: () => new Bitmap(), loadBitmap: () => new Bitmap() },
        TextManager: { param: () => "PARAM" }
    });
    g.Graphics.width = 1920; g.Graphics.height = 1080;
    g.PluginManager.registerCommand ||= () => {};
    g.window = g;
    g.combatActive = false;
    g.ProjectRCombatPresence = { isCombatActive: () => g.combatActive, isCombatEventActive: () => g.combatActive };
    const actor = g.$gameParty.leader();
    const hudActor = Object.assign({}, actor, { name: () => "YUKI", hp: 850, mhp: 1000, actorId: () => 1,
        faceName: () => "", faceIndex: () => 0, equips: () => [], states: () => [], _buffs: [] });
    g.$gameParty.leader = () => hudActor;
    g.Scene_Map.prototype.createDisplayObjects ||= function() {};
    g.Scene_Map.prototype.terminate ||= function() {};
    g.SceneManager._scene.addChild = function(child) { (this.children ||= []).push(child); };
}
// 本番と同じ順(Manager → Gauge → Activation → Hermes Ultimate → Apollo Ultimate)に、末尾でHUDを追加する。
function load({ activation = {}, withHud = true } = {}) {
    const g = loadGame();
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === "ProjectR_UltimateActivation" ? activation
        : ["ProjectR_UltimateGauge", "ProjectR_ApolloUltimate", "ProjectR_HermesUltimate", "ProjectR_BattleHUD"].includes(name) ? {}
        : name === "Hendrix_Keyboard_Gamepad" ? keyboardParameters : params(name);
    vm.runInContext(read(GAUGE_FILE), g);
    for (let code = 65; code <= 90; code++) if (!g.Input.keyMapper[code]) g.Input.keyMapper[code] = String.fromCharCode(code).toLowerCase();
    vm.runInContext(read(ACT_FILE), g);
    vm.runInContext(read(HERMES_FILE), g);
    vm.runInContext(read(APOLLO_FILE), g);
    g.scene = g.SceneManager._scene;
    if (withHud) {
        installUi(g);
        g.keysBeforeHud = Object.keys(g.$gameSystem).sort();
        vm.runInContext(read(HUD_FILE), g);
        g.scene.createProjectRBattleHUD();
        g.hud = g.scene._projectRBattleHudLayer;
    }
    return g;
}
function ready(god = "apollo", options) {
    const g = load(options);
    assert.equal(deck(g).setUltimateRing(god).ok, true);
    g.startWith(SWORD);
    assert.equal(mgr(g).getPersistentUltimateGodId(), god);
    g.combatActive = true; // HUDは実際の戦闘イベント(CombatPresence)中だけ表示される
    return g;
}
// HUDの更新周期(4frame)に合わせて進める。ゲームの時間は進めない。
const step = (g, count = 1) => {
    for (let i = 0; i < count; i++) { g.Graphics.frameCount = (Math.floor(g.Graphics.frameCount / 4) + 1) * 4; g.hud.update(); }
};
const frames = (g, count = 1) => { for (let i = 0; i < count; i++) { g.Graphics.frameCount++; g.scene.update(); } };
const text = sprite => sprite.bitmap.lastText;
const slot = (g, index) => {
    const s = g.hud._skillHUD._slots[index];
    return { key: text(s._keyText), label: text(s._slotText), name: text(s._nameText), icon: s._icon._iconIndex, iconVisible: s._icon.visible };
};
const slots = g => [0, 1, 2, 3, 4].map(i => slot(g, i));
const ult = g => { const u = g.hud._ultimateHUD; return { visible: u.visible, title: text(u._titleText), value: text(u._valueText),
    key: text(u._keyText), keyAlpha: u._keyText.alpha }; };
const divine = g => { const d = g.hud._divineHUD; return { visible: d.visible, name: text(d._nameText), hp: text(d._hpText), status: text(d._statusText) }; };
const counts = g => ({ visible: g.hud._countsHUD.visible, text: text(g.hud._countsHUD._text) });
const state = g => deck(g).getBattleState();
const handIds = g => state(g).hand.map(c => c.cardId);
const vm5 = g => g.ProjectRBattleHUD.getViewModel();
const fill = g => assert.equal(gauge(g).addUltimateGauge(1000, "test").full, true);
const collapse = g => assert.equal(mgr(g).damagePersistentUltimate(100000).collapsed, true);
const gameplay = g => plain({ battle: deck(g).getBattleState(), gauge: gauge(g).getUltimateGaugeState?.() ?? null,
    god: mgr(g).getPersistentUltimateBattleState(), persistent: deck(g).getPersistentData(), last: act(g).getLastUltimateActivationResult() });
const keyEvent = (g, letter) => ({ code: `Key${letter}`, keyCode: letter.charCodeAt(0), key: letter.toLowerCase(), repeat: false,
    target: g.document.activeElement, preventDefault() {} });

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

// ================= 再利用・登録・保存 =================
test("既存ProjectR_BattleHUDを再利用: 登録は1つのまま、新しいHUD pluginは追加しない", () => {
    const entries = productionConfig.$plugins.filter(p => p.name === "ProjectR_BattleHUD" && p.status);
    assert.equal(entries.length, 1);
    assert.equal(productionConfig.$plugins.filter(p => /hud/i.test(p.name) && p.name !== "ProjectR_MenuHUD" && p.name !== "ProjectR_CombatExtrasHUD" && p.name !== "ProjectR_SoulBattleHUD").length, 1);   // SoulBattleHUD は SOUL戦闘(専用ステージ)だけの別HUD(通常のBattleHUDは変えない)
    // 全仕様パスで追加した ProjectR_CombatExtrasHUD は別HUDではなく、このBattleHUD(Manager)の子として
    // ボス/仲間の表示を足すだけの付属プラグイン(BattleHUDの表示条件・登録は変えない)。
    assert.match(fs.readFileSync(path.join(__dirname, "..", "js/plugins/ProjectR_CombatExtrasHUD.js"), "utf8"), /@base ProjectR_BattleHUD/);
    assert.equal(fs.existsSync(path.join(__dirname, "..", HUD_FILE)), true);
    // js/plugins.js上のBattleHUD行は変更しない（Phase 5Aは新規登録を行わない）。
    const head = cp.execFileSync("git", ["show", "0060015:js/plugins.js"], { encoding: "utf8", cwd: path.join(__dirname, "..") })
        .split("\n").find(l => l.includes('"ProjectR_BattleHUD"'));
    assert.equal(read("js/plugins.js").split("\n").find(l => l.includes('"ProjectR_BattleHUD"')), head);
});
test("HUDはCardDeckCoreより先に読まれても動く: APIは毎回windowから遅延参照する", () => {
    const g = load({ withHud: false });
    const bare = { console, Graphics: { frameCount: 1, width: 1920, height: 1080 } };
    const sandbox = vm.createContext(bare);
    installUi(Object.assign(sandbox, { PluginManager: { parameters: () => ({}), registerCommand() {} }, $gameParty: { leader: () => ({}) },
        SceneManager: { _scene: { addChild() {} } }, Game_System: function() {}, Scene_Map: function() {} }));
    sandbox.Game_System.prototype.initialize = function() {};
    sandbox.Scene_Map.prototype.createDisplayObjects = function() {};
    vm.runInContext(read(HUD_FILE), sandbox);
    assert.equal(sandbox.ProjectRBattleHUD.getViewModel().cardBattleActive, false);
    assert.equal(sandbox.ProjectRBattleHUD.getViewModel().divine, null);
    // 後から読み込まれたAPIをそのまま使う。
    sandbox.ProjectRCardDeck = g.ProjectRCardDeck;
    assert.equal(sandbox.ProjectRBattleHUD.getViewModel().cardBattleActive, false);
    g.ProjectRCardDeck.startCardBattle();
    assert.equal(sandbox.ProjectRBattleHUD.getViewModel().cardBattleActive, true);
    assert.deepEqual(plain(sandbox.ProjectRBattleHUD.getViewModel().slots.map(s => s.key)), ["Q", "E", "X", "C", "V"]);
});
test("セーブ項目を追加しない: $gameSystemの新規プロパティなし、既存HUD stateの形も不変", () => {
    const source = read(HUD_FILE);
    assert.deepEqual([...new Set(source.match(/\$gameSystem\._\w+\s*=[^=]/g).map(s => s.replace(/\s*=.*/, "")))], ["$gameSystem._projectRBattleHUDState"]);
    const g = ready("apollo"); g.ProjectRBattleHUD.isShown();
    fill(g); step(g, 5);
    assert.deepEqual(Object.keys(g.$gameSystem).sort(), [...new Set([...g.keysBeforeHud, "_projectRBattleHUDState"])].sort());
    assert.deepEqual(Object.keys(g.$gameSystem._projectRBattleHUDState).sort(),
        ["godIconName", "godLabel", "selectedSkillIndex", "ultimateAvailable", "ultimateMax", "ultimateValue", "visible"]);
    const json = JSON.stringify(g.$gameSystem);
    assert.equal(/hand|drawPile|divine|recovery|APOLLO|DIVINE/i.test(json.replace(/_projectRCardDeckData[\s\S]*?(?="_projectR|$)/, "")), false);
});
test("HUDが依存する本体plugin(Core/Input/Manager/Gauge/Activation/Ultimate/カード/Hendrix/DotMove)は変更しない", () => {
    const names = fs.readdirSync(path.join(__dirname, "..", "js/plugins")).filter(f =>
        (/^ProjectR_/.test(f) && !/^ProjectR_(BattleHUD|MenuHUD|Casino|TexasHoldem|CombatPresence|PlayerFacing|CombatTestArena|CardBattleInput|UltimateActivation|HermesReedFluteSleep|HermesSwordsmanship|GodSummonVisual)/.test(f)) || /^Hendrix_|^DotMoveSystem/.test(f))
        // 基準(0060015)に存在したファイルだけ比べる。後から追加したplugin(視界/メニュー/ボス枠組み等)は別のテストが担当。
        .filter(f => cp.spawnSync("git", ["cat-file", "-e", `0060015:js/plugins/${f}`], { cwd: path.join(__dirname, "..") }).status === 0);
    assert.ok(names.length >= 18);
    // CombatPresence/PlayerFacing は Phase 5A-RT2(戦闘イベントの登録口・戦闘中の調べる)で意図して変更した。
    // それらの変更は tests/ProjectR_CombatTestArena.rt2.test.cjs が検証する。
    // Phase 5A-RT3 で CardBattleInput(Q/E/X/C/V)・UltimateActivation(診断)・HermesReedFluteSleep(診断)・
    // HermesSwordsmanship(表示連携)も意図して変更した。検証は tests/ProjectR_CombatRuntimeCompliance.test.cjs。
    // 全仕様パス: MenuHUD(MenuHUD.commandScenes)・BattleHUD(getCardPresentation/getGodPresentation)に小さな接続口を追加。
    // git diffは改行コード(autocrlf)の差を正規化するので、内容の変更だけを検出できる。
    for (const name of names) {
        const result = cp.spawnSync("git", ["diff", "--quiet", "0060015", "--", `js/plugins/${name}`], { cwd: path.join(__dirname, "..") });
        assert.equal(result.status, 0, name);
    }
});

// ================= 表示の出し入れ（lifecycle） =================
test("探索中（戦闘外）はHUD非表示。カード区画は無く、従来のHotbar表示(Q/R/X/C/V)のまま", () => {
    const g = load(); step(g);
    assert.equal(g.hud.visible, false);
    assert.equal(counts(g).visible, false); assert.equal(divine(g).visible, false);
    assert.deepEqual(plain(slots(g).map(s => s.key)), ["Q", "R", "X", "C", "V"]);
    assert.deepEqual(plain(slots(g).map(s => s.label)), ["SKILL 1", "SKILL 2", "SKILL 3", "SKILL 4", "SKILL 5"]);
    assert.equal(vm5(g).cardBattleActive, false); assert.equal(vm5(g).counts, null); assert.equal(vm5(g).divine, null);
    assert.equal(vm5(g).ultimate.mode, "legacy");
    // 従来動作: 敵が居る(CombatPresence)だけの戦闘では、これまで通り表示される。
    g.combatActive = true; step(g); assert.equal(g.hud.visible, true);
    g.combatActive = false; step(g); assert.equal(g.hud.visible, false);
});
test("カード戦闘の開始でHUDが現れ、終了で消える。区画は破棄されHotbar表示へ戻る", () => {
    const g = ready("apollo"); step(g);
    assert.equal(g.hud.visible, true); assert.equal(vm5(g).cardBattleActive, true); // 戦闘イベント(CombatPresence)中なので表示
    assert.equal(counts(g).visible, true); assert.equal(divine(g).visible, true); assert.equal(ult(g).visible, true);
    deck(g).endCardBattle(); step(g);
    g.combatActive = false; step(g);
    assert.equal(g.hud.visible, false); assert.equal(counts(g).visible, false); assert.equal(divine(g).visible, false);
    assert.equal(vm5(g).slots[0].key, "Q"); assert.equal(vm5(g).counts, null); assert.equal(vm5(g).divine, null);
    g.combatActive = true; step(g);
    assert.deepEqual(plain(slots(g).map(s => s.key)), ["Q", "R", "X", "C", "V"]); // 手札の描画を引きずらない
    assert.equal(counts(g).visible, false);
});
test("ロード(extractSaveContents)でカード戦闘は終わり、古いHUDを復元しない", () => {
    const g = ready("apollo"); fill(g); step(g);
    assert.equal(g.hud.visible, true);
    const saved = JSON.stringify(g.DataManager.makeSaveContents());
    assert.equal(/hand|drawPile|APOLLO|DIVINE HP/.test(saved.replace(/_projectRCardDeckData[\s\S]*?(?="_projectR|\})/, "")), false);
    g.DataManager.extractSaveContents(g.DataManager.makeSaveContents());
    g.combatActive = false; // ロード後のマップ開始でCombatPresenceは非戦闘へ戻る
    step(g);
    assert.equal(deck(g).isCardBattleActive(), false);
    assert.equal(g.hud.visible, false); assert.equal(divine(g).visible, false); assert.equal(counts(g).visible, false);
    assert.equal(vm5(g).divine, null); assert.equal(vm5(g).counts, null);
});
test("マップ移動でUltimate神の情報(Divine HP/Gauge)が消え、古い神の表示を残さない。次の戦闘では新規に描く", () => {
    const g = ready("apollo"); fill(g); step(g);
    assert.equal(divine(g).visible, true); assert.equal(ult(g).visible, true);
    g.$gameMap.setup(2); g.Scene_Map.prototype.onMapLoaded.call(g.scene); step(g);
    assert.equal(mgr(g).hasPersistentUltimateBattleState(), false);
    assert.equal(divine(g).visible, false); assert.equal(ult(g).visible, false); // 偽の0/100を出さない
    assert.equal(vm5(g).divine, null);
    deck(g).endCardBattle(); g.combatActive = false; step(g); assert.equal(g.hud.visible, false);
    g.combatActive = true; deck(g).startCardBattle(); step(g);
    assert.equal(divine(g).hp, "DIVINE HP 100 / 100"); assert.equal(ult(g).value, "0/100");
});
test("手動のhide()は尊重し、会話/メッセージ中は隠れ、解除で戻る", () => {
    const g = ready("apollo"); step(g); assert.equal(g.hud.visible, true);
    g.ProjectRBattleHUD.hide(); step(g); assert.equal(g.hud.visible, false);
    g.ProjectRBattleHUD.show(); step(g); assert.equal(g.hud.visible, true);
    g.$gameMessage.isBusy = () => true; step(g); assert.equal(g.hud.visible, false);
    g.$gameMessage.isBusy = () => false; step(g); assert.equal(g.hud.visible, true);
    g.ProjectR.FullscreenDialogue = { isActive: () => true }; step(g); assert.equal(g.hud.visible, false);
    g.ProjectR.FullscreenDialogue = { isActive: () => false }; step(g); assert.equal(g.hud.visible, true);
});
test("HUDを破棄(Scene terminate)してもゲームは続行でき、状態は変わらない（HUDは使い捨て）", () => {
    const g = ready("apollo"); step(g);
    g.Scene_Map.prototype.terminate.call(g.scene);
    assert.equal(g.ProjectRBattleHUD._manager, null);
    g.aim(0); const used = state(g).cooldownPile.length;
    assert.equal(g.fire().reason, "success"); assert.equal(state(g).cooldownPile.length, used + 1);
    assert.equal(mgr(g).getPersistentUltimateStatus(), "active");
});

// ================= カード手札 =================
test("5枠はhand[0]～hand[4]に対応し、ラベルは1～5。名前は現在の手札の順", () => {
    const g = ready("apollo"); step(g);
    assert.equal(g.hud._skillHUD._slots.filter(slotSprite => slotSprite.visible).length, 5); // 通常は5枠だけ表示(フィールド戦闘だけ、C アイテム用の6つ目を使う)
    assert.deepEqual(plain(slots(g).map(s => s.key)), ["Q", "E", "X", "C", "V"]);
    assert.deepEqual(plain(slots(g).map(s => s.label)), ["CARD Q", "CARD E", "CARD X", "CARD C", "CARD V"]);
    const model = vm5(g);
    assert.deepEqual(model.slots.map(s => s.cardId), handIds(g));
    assert.deepEqual(model.slots.map(s => s.instanceId), state(g).hand.map(c => c.instanceId));
    for (const [index, s] of model.slots.entries()) assert.equal(slot(g, index).name, s.name);
});
test("実入力(1～5キー)の既存ロジックは不変。HUDはキー表示だけを変える", () => {
    const g = ready("apollo"); g.aim(90); step(g);
    const first = state(g);
    g.Input._onKeyDown({ code: "KeyQ", keyCode: 81, preventDefault() {}, target: g.document.activeElement });
    frames(g);
    assert.equal(g.ProjectRCardBattleInput.getLastResult().reason, "success");
    assert.equal(state(g).cooldownPile.length, first.cooldownPile.length + 1);
    step(g); // 入力経路で使ったカードもHUDに反映される
    assert.deepEqual(vm5(g).slots.map(s => s.instanceId), state(g).hand.map(c => c.instanceId));
    assert.deepEqual(plain(slots(g).map(s => s.key)), ["Q", "E", "X", "C", "V"]);
});
test("カード使用成功で手札が更新され、即時補充された札が末尾に表示される", () => {
    const g = ready("apollo"); g.aim(90); step(g);
    const before = state(g);
    assert.equal(g.fire().reason, "success"); step(g);
    const after = state(g);
    assert.equal(after.hand.length, 5);
    assert.deepEqual(after.hand.slice(0, 4).map(c => c.instanceId), before.hand.slice(1).map(c => c.instanceId));
    assert.deepEqual(vm5(g).slots.map(s => s.instanceId), after.hand.map(c => c.instanceId));
    assert.equal(slot(g, 4).name, vm5(g).slots[4].name);
    assert.notEqual(vm5(g).slots[4].instanceId, before.hand[4].instanceId);
    assert.equal(counts(g).text, `DRAW ${after.drawPile.length}   DISCARD ${after.discardPile.length}   COOLDOWN ${after.cooldownPile.length}`);
    assert.equal(after.cooldownPile.length, before.cooldownPile.length + 1);
});
test("使用失敗(指輪未所持)では手札・山札・表示順が変わらず、使用不可として暗く示す", () => {
    const g = ready("apollo"); step(g);
    const before = plain(state(g)), beforeIds = vm5(g).slots.map(s => s.instanceId), beforeText = plain(slots(g));
    g.$gameSystem._projectRCardDeckData.ringOwnershipState.hermes = "unowned";
    assert.equal(g.fire().reason, "cardUnavailable");
    step(g, 5); // 使用可否は15frameに1回再評価する
    assert.deepEqual(plain(state(g)), before);
    assert.deepEqual(vm5(g).slots.map(s => s.instanceId), beforeIds);
    assert.deepEqual(plain(slots(g)), beforeText); // 表示文字は不変
    for (const s of vm5(g).slots) assert.equal(s.disabled, /^(hermes_|test_only_)/.test(s.cardId), s.cardId); // fixtureのtest_only_*札もhermes指輪
    assert.equal(vm5(g).slots.every(s => s.available), true);
});
test("名前/アイコンは定義から導出: Skill note → 既定名 → 上書き → cardId生成の順", () => {
    const g = ready("apollo");
    g.startWith(ARROW); step(g);
    const arrowSkill = skillsData.find(s => s?.note?.includes("<ProjectRCard: apollo_golden_arrow>"));
    assert.deepEqual(plain(vm5(g).slots[0]).cardId, ARROW);
    assert.equal(slot(g, 0).name, arrowSkill.name); assert.equal(slot(g, 0).icon, arrowSkill.iconIndex);
    for (const [cardId, name] of Object.entries({ hermes_swift_movement: "高速移動", hermes_reed_flute_sleep: "葦笛睡眠",
        hermes_perception_obscure: "認識阻害", apollo_lyre_calm: "リラの支援" })) {
        g.startWith(cardId); step(g); assert.equal(slot(g, 0).name, name, cardId);
    }
    g.ProjectRBattleHUD.setCardPresentation("apollo_lyre_calm", { name: "TEST", iconIndex: 12 });
    g.startWith("apollo_lyre_calm"); step(g);
    assert.deepEqual(plain([slot(g, 0).name, slot(g, 0).icon]), ["TEST", 12]);
    g.ProjectRBattleHUD.clearCardPresentation("apollo_lyre_calm"); g.ProjectRBattleHUD.setCardPresentation("", {});
    step(g, 1); g.Graphics.frameCount += 4; step(g);
    assert.equal(g.ProjectRBattleHUD.setCardPresentation("x_unknown_card", { name: "N", imageName: "pic" }), true);
    assert.equal(g.hud._adapter.cardHand().length, 5);
    for (const s of vm5(g).slots) assert.ok(s.name.length > 0);
});
test("手札が5枚未満でも例外なく、空き枠は「—」の使用不可として表示する", () => {
    const g = ready("apollo"); step(g);
    const real = deck(g).getBattleState;
    deck(g).getBattleState = () => { const s = real(); s.hand = s.hand.slice(0, 2); return s; };
    step(g);
    assert.deepEqual(plain(slots(g).map(s => s.name)).slice(2), ["—", "—", "—"]);
    const model = vm5(g);
    assert.deepEqual(plain(model.slots.map(s => s.available)), [true, true, false, false, false]);
    assert.deepEqual(plain(model.slots.slice(2).map(s => s.cardId)), ["", "", ""]);
    assert.equal(slot(g, 2).key, "X");
    deck(g).getBattleState = real; step(g);
    assert.equal(vm5(g).slots.every(s => s.available), true);
});
test("山札/捨て札/Cooldown山の枚数はCardDeckの実値と一致。Cooldown完了後も手札を壊さない", () => {
    const g = ready("apollo"); g.aim(90); step(g);
    const check = () => { const s = state(g); assert.equal(counts(g).text,
        `DRAW ${s.drawPile.length}   DISCARD ${s.discardPile.length}   COOLDOWN ${s.cooldownPile.length}`); };
    check(); assert.equal(g.fire().reason, "success"); step(g); check();
    const handNow = handIds(g);
    deck(g).updateCooldown(100); step(g);
    assert.equal(state(g).cooldownPile.length, 0); assert.equal(state(g).discardPile.length >= 2, true);
    check();
    assert.deepEqual(handIds(g), handNow); assert.deepEqual(vm5(g).slots.map(s => s.cardId), handNow);
});
test("山札が尽きて捨て札が再利用されても枚数表示が実値に追従する", () => {
    const g = ready("apollo"); step(g);
    for (let i = 0; i < 40; i++) { const s = state(g); deck(g).useBattleCard(s.hand[0].instanceId); deck(g).updateCooldown(100); }
    step(g);
    const s = state(g);
    assert.equal(s.hand.length, 5);
    assert.equal(counts(g).text, `DRAW ${s.drawPile.length}   DISCARD ${s.discardPile.length}   COOLDOWN ${s.cooldownPile.length}`);
    assert.equal(s.drawPile.length + s.discardPile.length + s.cooldownPile.length + s.hand.length, 30);
});

// ================= 軽量性 =================
test("状態が変わらない間は再描画しない(drawText 0回)。getBattleStateは1更新で1回だけ", () => {
    const g = ready("apollo"); fill(g); step(g);
    const draws = g.textDraws;
    step(g, 30);
    assert.equal(g.textDraws, draws);
    const real = deck(g).getBattleState; let calls = 0;
    deck(g).getBattleState = () => { calls++; return real(); };
    step(g); assert.equal(calls, 1);
    deck(g).getBattleState = real;
    assert.equal(g.hud._skillHUD._slots.filter(slotSprite => slotSprite.visible).length, 5); // 通常は5枠だけ表示(フィールド戦闘だけ、C アイテム用の6つ目を使う) // UI部品は作り直さない
    const slotObjects = [...g.hud._skillHUD._slots]; step(g, 5);
    assert.equal(g.hud._skillHUD._slots.every((slotSprite, i) => slotSprite === slotObjects[i]), true);
});
test("HUDはゲーム状態を一切変更しない(手札/Gauge/Divine HP/保存データ/診断結果)", () => {
    const g = ready("apollo"); step(g);
    g.ProjectRBattleHUD.isShown();
    // 通常 / READY / 崩壊 / 復帰の各状態で、HUD更新の前後にゲーム状態と保存データが完全に一致する。
    const phases = [() => {}, () => fill(g), () => collapse(g), () => deck(g).updateCooldown(16)];
    for (const advance of phases) {
        advance(); // ゲーム側の変更（HUDの更新ではない）
        const before = gameplay(g), saveBefore = JSON.stringify(g.$gameSystem), contents = JSON.stringify(g.DataManager.makeSaveContents());
        step(g, 20); g.ProjectRBattleHUD.getViewModel();
        assert.deepEqual(gameplay(g), before);
        assert.equal(JSON.stringify(g.$gameSystem), saveBefore);
        assert.equal(JSON.stringify(g.DataManager.makeSaveContents()), contents);
    }
    assert.equal(mgr(g).getPersistentUltimateStatus(), "active"); assert.equal(gauge(g).isUltimateReady(), true);
});

// ================= Ultimate神 / Divine HP / 崩壊 =================
test("選択中のUltimate神・Divine HP・最大値・割合がManagerの実値と一致", () => {
    for (const [god, name] of [["apollo", "APOLLO"], ["hermes", "HERMES"]]) {
        const g = ready(god); step(g);
        assert.deepEqual(plain(divine(g)), { visible: true, name, hp: "DIVINE HP 100 / 100", status: "ACTIVE" });
        assert.equal(text(g.hud._playerHUD._godLabel), name);
        assert.equal(vm5(g).divine.godId, god);
    }
    const g = ready("apollo");
    assert.equal(mgr(g).damagePersistentUltimate(25).divineHp, 75); step(g);
    const model = vm5(g).divine;
    assert.deepEqual(plain([model.hp, model.maxHp, model.rate, model.status]),
        [mgr(g).getPersistentUltimateDivineHp(), mgr(g).getPersistentUltimateMaxDivineHp(), mgr(g).getPersistentUltimateDivineHpRate(), "active"]);
    assert.equal(divine(g).hp, "DIVINE HP 75 / 100");
    assert.equal(mgr(g).damagePersistentUltimate(0.5).ok, true); step(g);
    assert.equal(divine(g).hp, "DIVINE HP 74.5 / 100"); // 小数は丸めず実値を見せる
});
test("崩壊: HP 0・崩壊/復帰中の表示・残り秒をManagerのタイマーから読む（HUD独自タイマーなし）", () => {
    const g = ready("apollo"); collapse(g); step(g);
    assert.deepEqual(plain(divine(g)), { visible: true, name: "APOLLO", hp: "DIVINE HP 0 / 100", status: "COLLAPSED  RECOVERING 15.0s" });
    assert.equal(vm5(g).divine.collapsed, true);
    deck(g).updateCooldown(2.55); step(g);
    assert.equal(mgr(g).getPersistentUltimateRecoveryRemainingSeconds().toFixed(2), "12.45");
    assert.equal(text(g.hud._divineHUD._statusText), "COLLAPSED  RECOVERING 12.5s");
    // ゲーム時間が進まなければ、HUDのframeが何百進んでも残り秒は変わらない。
    step(g, 200);
    assert.equal(text(g.hud._divineHUD._statusText), "COLLAPSED  RECOVERING 12.5s");
    assert.equal(mgr(g).getPersistentUltimateRecoveryRemainingSeconds().toFixed(2), "12.45");
});
test("復帰: 残り秒が尽きると50%のHPで自動復帰し、復帰表示が消える", () => {
    const g = ready("apollo"); collapse(g); step(g);
    deck(g).updateCooldown(14.9); step(g);
    assert.equal(text(g.hud._divineHUD._statusText), "COLLAPSED  RECOVERING 0.1s");
    deck(g).updateCooldown(0.2); step(g);
    assert.equal(mgr(g).getPersistentUltimateStatus(), "active");
    assert.deepEqual(plain(divine(g)), { visible: true, name: "APOLLO", hp: "DIVINE HP 50 / 100", status: "ACTIVE" });
    assert.equal(/RECOVER/.test(divine(g).status), false);
    collapse(g); step(g); assert.equal(divine(g).hp, "DIVINE HP 0 / 100"); // 何度でも繰り返せる
});

// ================= Ultimate Gauge / ready / key =================
test("Gaugeの現在値/最大値をUltimateGaugeの実値で表示（満タン前は通常）", () => {
    const g = ready("apollo"); step(g);
    assert.equal(ult(g).value, "0/100"); assert.equal(ult(g).title, "ULTIMATE");
    gauge(g).addUltimateGauge(40, "test"); step(g);
    assert.equal(ult(g).value, `${gauge(g).getUltimateGauge()}/${gauge(g).getUltimateGaugeMax()}`);
    assert.equal(ult(g).value, "40/100");
    const model = vm5(g).ultimate;
    assert.deepEqual(plain([model.state, model.full, model.ready, model.progress]), ["charging", false, false, 0.4]);
    assert.equal(ult(g).keyAlpha < 1, true); // 準備前はキーを押せるようには見せない
    gauge(g).addUltimateGauge(60, "test"); step(g); assert.equal(ult(g).value, "100/100");
});
test("満タン+神が顕現中=READY(U - ULTIMATE)。満タンだが神が崩壊中は別状態で、キーが押せるようには見せない", () => {
    const g = ready("apollo"); fill(g); step(g);
    assert.equal(gauge(g).isUltimateGaugeFull(), true); assert.equal(gauge(g).isUltimateReady(), true);
    assert.deepEqual(plain(ult(g)), { visible: true, title: "U - ULTIMATE", value: "100/100", key: "U", keyAlpha: 1 });
    assert.equal(vm5(g).ultimate.state, "ready");
    collapse(g); step(g);
    assert.equal(gauge(g).isUltimateGaugeFull(), true); assert.equal(gauge(g).isUltimateReady(), false);
    const model = vm5(g).ultimate;
    assert.deepEqual(plain([model.state, model.full, model.ready]), ["fullUnavailable", true, false]);
    assert.equal(ult(g).title, "GAUGE FULL / UNAVAILABLE"); assert.equal(/U - ULTIMATE/.test(ult(g).title), false);
    assert.equal(ult(g).value, "100/100"); assert.equal(ult(g).keyAlpha < 1, true);
    deck(g).updateCooldown(16); step(g); // 復帰でreadyに戻る
    assert.equal(vm5(g).ultimate.state, "ready"); assert.equal(ult(g).title, "U - ULTIMATE"); assert.equal(ult(g).keyAlpha, 1);
});
test("Ultimateキー表示はActivationの設定値を使い、Uを決め打ちしない。キー競合時は有効に見せない", () => {
    const g = ready("apollo", { activation: { UltimateKey: "I" } }); fill(g); step(g);
    assert.equal(act(g).getInputBinding().key, "I");
    assert.deepEqual(plain([ult(g).title, ult(g).key]), ["I - ULTIMATE", "I"]);
    const conflict = ready("apollo", { activation: { UltimateKey: "J" } }); fill(conflict); step(conflict);
    assert.equal(act(conflict).getInputBinding().active, false);
    assert.equal(ult(conflict).key, "—"); assert.equal(ult(conflict).keyAlpha < 1, true);
    assert.equal(/J - ULTIMATE|U - ULTIMATE/.test(ult(conflict).title), false);
    assert.equal(vm5(conflict).ultimate.ready, true); // 準備自体は別問題
});
test("Ultimate神が無いカード戦闘: 手札HUDは出すが、Ultimate/Divine区画は隠し偽の0/100を出さない", () => {
    const g = load(); g.startWith(SWORD); // setUltimateRingしない
    g.combatActive = true; // 戦闘イベント中
    assert.equal(mgr(g).hasPersistentUltimateBattleState(), false);
    assert.equal(gauge(g).hasUltimateGaugeState(), false);
    step(g, 3);
    assert.equal(g.hud.visible, true); assert.equal(counts(g).visible, true);
    assert.equal(divine(g).visible, false); assert.equal(ult(g).visible, false);
    assert.equal(vm5(g).divine, null); assert.equal(vm5(g).ultimate.available, false);
    assert.deepEqual(plain(slots(g).map(s => s.key)), ["Q", "E", "X", "C", "V"]);
    assert.equal(text(g.hud._playerHUD._godLabel) === "" || text(g.hud._playerHUD._godLabel) === "GOD", true);
});
test("戦闘を再開始すると表示値が新しい実行状態に切り替わる（古い値を引きずらない）", () => {
    const g = ready("apollo"); fill(g); collapse(g); step(g);
    assert.equal(divine(g).hp, "DIVINE HP 0 / 100"); assert.equal(ult(g).value, "100/100");
    deck(g).endCardBattle(); step(g);
    deck(g).startCardBattle(); step(g);
    assert.deepEqual(plain(divine(g)), { visible: true, name: "APOLLO", hp: "DIVINE HP 100 / 100", status: "ACTIVE" });
    assert.deepEqual(plain(ult(g)), { visible: true, title: "ULTIMATE", value: "0/100", key: "U", keyAlpha: 0.6 });
    assert.deepEqual(vm5(g).slots.map(s => s.instanceId), state(g).hand.map(c => c.instanceId));
    const hermes = ready("hermes"); step(hermes); assert.equal(divine(hermes).name, "HERMES");
});

// ================= Hermes / Apollo Ultimate が引き続き動く =================
test("Hermes Ultimateは従来どおり開始・Gauge消費。実行中は小さな「ULTIMATE ACTIVE」を表示し、終了で戻る", () => {
    const g = ready("hermes"); g.aim(0); fill(g); step(g);
    const result = act(g).requestUltimateActivation("api");
    assert.deepEqual(plain([result.ok, result.started, result.consumed]), [true, true, 100]);
    assert.equal(gauge(g).getUltimateGauge(), 0);
    assert.equal(g.ProjectRHermesUltimate.isHermesUltimateActive(), true);
    step(g); assert.equal(ult(g).title, "ULTIMATE ACTIVE"); assert.equal(ult(g).value, "0/100");
    for (let i = 0; i < 600 && g.ProjectRHermesUltimate.isHermesUltimateActive(); i++) { frames(g); if (i % 4 === 0) step(g); }
    assert.equal(g.ProjectRHermesUltimate.isHermesUltimateActive(), false);
    step(g); assert.equal(ult(g).title, "ULTIMATE");
    assert.equal(act(g).getLastUltimateActivationResult().reason, "started");
});
test("Apollo Ultimateは従来どおり開始・Gauge消費(7本)。実行中表示を出し、終了後に戻る", () => {
    const g = ready("apollo"); g.aim(0); fill(g); step(g);
    const result = act(g).requestUltimateActivation("api");
    assert.deepEqual(plain([result.ok, result.started, result.consumed]), [true, true, 100]);
    assert.equal(gauge(g).getUltimateGauge(), 0);
    assert.equal(g.ProjectRApolloUltimate.isApolloUltimateActive(), true);
    assert.equal(g.ProjectRApolloUltimate.getActiveProjectileCount(), 1);
    step(g); assert.equal(ult(g).title, "ULTIMATE ACTIVE");
    for (let i = 0; i < 400 && g.ProjectRApolloUltimate.isApolloUltimateActive(); i++) { frames(g); if (i % 4 === 0) step(g); }
    assert.equal(g.ProjectRApolloUltimate.isApolloUltimateActive(), false);
    step(g); assert.equal(ult(g).title, "ULTIMATE");
    assert.equal(deck(g).isCardBattleActive(), true); assert.equal(state(g).hand.length, 5); // 通常カードも継続
});
test("Ultimate中も通常カードが使え、HUDは実行中表示と手札を両方正しく示す", () => {
    const g = ready("apollo"); g.aim(0); fill(g);
    assert.equal(act(g).requestUltimateActivation("api").ok, true); step(g);
    assert.equal(g.fire().reason !== "battleInactive", true); step(g);
    assert.deepEqual(vm5(g).slots.map(s => s.instanceId), state(g).hand.map(c => c.instanceId));
    assert.equal(ult(g).title, "ULTIMATE ACTIVE");
});
test("本番の7枚のカード定義は不変で、7枚すべてが日本語の表示名を持つ（cardIdの自動生成名に落ちない）", () => {
    const production = JSON.parse(productionConfig.$plugins.find(p => p.name === "ProjectR_CardDeckCore").parameters.CardDefinitions).map(JSON.parse);
    const ids = production.map(c => c.cardId).sort();
    assert.deepEqual(ids, ["apollo_golden_arrow", "apollo_lyre_calm", "apollo_plague_attack", "hermes_perception_obscure",
        "hermes_reed_flute_sleep", "hermes_swift_movement", "hermes_sword_attack"]);
    const g = ready("apollo");
    for (const id of ids) {
        g.startWith(id); step(g);
        assert.equal(vm5(g).slots[0].cardId, id);
        assert.match(slot(g, 0).name, /[぀-ヿ一-鿿]/, id);
    }
    // 保存形式(CardDeck永続データ)はHUDの有無で変わらない。
    const withoutHud = load({ withHud: false });
    assert.equal(plain(deck(g).getPersistentData()).version, plain(deck(withoutHud).getPersistentData()).version);
});

// ================= フィールド戦闘(Stage 6A)の枠 =================
test("フィールド戦闘の枠(Stage 6A): アイコンは暗くしても見せ、Cooldownは残り割合の暗幕と残り秒(小数1桁)、使える/使えないは文字と色、LMBはコンボの丸。カード戦闘の描画は変えない", () => {
    const g = ready("apollo"); step(g);
    const cardSlots = slots(g);                                                             // カード戦闘の枠(元の描画)
    const base = { mode: "field", skillId: 0, imageName: "", accent: "", tone: "ok", selected: false, cooldown: { active: false, remaining: 0, total: 0 }, available: true, disabled: false, ratio: 0, alert: false, count: null, combo: null };
    const field = [
        { ...base, key: "LMB", slot: "attack", name: "薙ぎ払い", detail: "READY", iconIndex: 76, state: "ready", combo: { step: 0, max: 3, timeLeft: 0, finisher: false } },
        { ...base, key: "Shift", slot: "mobility", name: "絶", detail: "COOL", iconIndex: 82, state: "cooldown", ratio: 0.5, cooldown: { active: true, remaining: 1.46, total: 3 }, disabled: true },
        { ...base, key: "E", slot: "special", name: "一閃", detail: "COOL", iconIndex: 78, state: "cooldown", ratio: 0.9, cooldown: { active: true, remaining: 12.2, total: 14 }, disabled: true },
        { ...base, key: "X", slot: "card1", name: "黄金の矢", detail: "N/A", tone: "ng", iconIndex: 102, state: "unavailable", available: false, disabled: true },
        { ...base, key: "C", slot: "card2", name: "ギガース殺し", detail: "READY", iconIndex: 70, state: "ready" },
        { ...base, key: "V", slot: "consumable", name: "ポーション", detail: "効果なし", tone: "ng", accent: "item", iconIndex: 176, state: "ready", alert: true, count: 3 }
    ];
    g.hud._adapter.skills = () => field; step(g);
    const view = i => { const sp = g.hud._skillHUD._slots[i]; return { key: text(sp._keyText), state: text(sp._fStateText), name: text(sp._fNameText), cool: text(sp._fCoolText), coolVisible: sp._fCoolText.visible, count: text(sp._fCountText), countVisible: sp._fCountText.visible,
        icon: sp._icon._iconIndex, iconVisible: sp._icon.visible, iconAlpha: sp._icon.alpha, legacyHidden: !sp._slotText.visible && !sp._nameText.visible && !sp._cooldownText.visible }; };
    assert.deepEqual(plain([0, 1, 2, 3, 4, 5].map(i => view(i).icon)), [76, 82, 78, 102, 70, 176], "5スキル + V のアイコンが、枠のアイコンに渡る");
    assert.ok([0, 1, 2, 3, 4, 5].every(i => view(i).iconVisible && view(i).legacyHidden), "待ち中・使えない状態でもアイコンは見せる。カード戦闘用の文字は隠す");
    assert.equal(view(0).iconAlpha, 1, "使える: 明るい"); assert.ok(view(1).iconAlpha < 1 && view(1).iconAlpha > 0.4, "待ち中: 少し暗い(アイコンは見える)"); assert.ok(view(3).iconAlpha < view(1).iconAlpha, "使えない: さらに暗い");
    assert.deepEqual(plain([view(1).coolVisible, view(1).cool, view(2).cool, view(0).coolVisible, view(3).coolVisible]), [true, "1.5", "13", false, false], "残り秒: 10秒未満は小数1桁(切り上げ)、10秒以上は整数。待ち中だけ出る");
    assert.deepEqual(plain([view(0).state, view(1).state, view(3).state, view(4).state, view(5).state]), ["READY", "COOL", "N/A", "READY", "効果なし"], "状態の文字(使える・待ち中・使えない・使えなかった理由)");
    assert.deepEqual(plain([view(5).countVisible, view(5).count, view(4).countVisible]), [true, "×3", false], "V は、使えなかった直後は数量をアイコンの右下に出す(それ以外は状態の文字が数量)");
    assert.deepEqual(plain([0, 1, 2, 3, 4, 5].map(i => view(i).key)), ["LMB", "Shift", "E", "X", "C", "V"]);
    // 残り割合が変われば描き直す(1/40刻み)。同じなら描き直さない。
    const spr = g.hud._skillHUD._slots[1], before = g.textDraws; step(g, 2); assert.equal(g.textDraws, before, "変わらない間は文字を描き直さない");
    field[1] = { ...field[1], ratio: 0.3, cooldown: { active: true, remaining: 0.43, total: 3 } }; step(g);
    assert.equal(text(spr._fCoolText), "0.5", "残り 0.43 秒 → 0.5(切り上げ。0.0 は出さない)");
    // 待ち中 → 使える で、短く光る(光っている間は描き直され、終われば元に戻る)
    field[1] = { ...field[1], state: "ready", ratio: 0, cooldown: { active: false, remaining: 0, total: 3 }, detail: "READY", disabled: false }; step(g);
    assert.equal(spr._readyFlashUntil > g.Graphics.frameCount, true, "待ち中 → 使える の瞬間に光る"); assert.equal(spr._fCoolText.visible, false);
    step(g, 6); assert.equal(spr._readyFlashUntil <= g.Graphics.frameCount, true, "光は約0.3秒で終わる");
    // LMB: コンボの段
    field[0] = { ...field[0], detail: "2/3", selected: true, combo: { step: 2, max: 3, timeLeft: 0.5, finisher: false } }; step(g); assert.equal(text(g.hud._skillHUD._slots[0]._fStateText), "2/3");
    field[0] = { ...field[0], detail: "強撃!", combo: { step: 0, max: 3, timeLeft: 0, finisher: true } }; step(g); assert.equal(text(g.hud._skillHUD._slots[0]._fStateText), "強撃!");
    // 戦闘が終わって(元の枠データに戻って)、カード戦闘の描画が元どおりになる
    delete g.hud._adapter.skills; g.hud._skillHUD.reset(); step(g);
    assert.deepEqual(plain(slots(g)), plain(cardSlots), "フィールド戦闘のあと、カード戦闘の枠の文字・アイコンは元どおり");
    const back = g.hud._skillHUD._slots[0]; assert.equal(back._slotText.visible && back._nameText.visible, true); assert.equal(back._fStateText.visible, false); assert.equal(back._icon.alpha, 1);
});

console.log(`\n${passed} tests passed`);
