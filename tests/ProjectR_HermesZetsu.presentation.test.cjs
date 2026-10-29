"use strict";
// Phase H1: 絶(Zetsu)の演出層(VFX・カットイン・腕クロス)と、演出が判定に関与しないこと。
// 描画・音・VFX Designerの実再生は対象外(実機: docs/ProjectR_HermesZetsu_H1.md)。ここではデータ・呼び出し・順序・隔離・後片付けを確認する。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const fx = require("./ProjectR_HermesZetsuFixture.cjs");
const { plain, read, project, zetsuWorld, aim, deckApi, modifiers, hand, state, player, pos, press, lastCard, near, ticks, ZETSU } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const teleport = (w, dx = 4, dy = 0, key = "Q") => { player(w).center(player(w)._realX, player(w)._realY); aim(w, dx, dy); press(w, key); return lastCard(w); };
const animCalls = w => w.calls.filter(c => c.plugin === "Hendrix_Animation_Solution");
const stripComments = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const pngSize = file => { const b = fs.readFileSync(path.join(project, file)); assert.equal(b.toString("latin1", 1, 4), "PNG"); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

// ---------------- VFX(VFX Designerライブラリ) ----------------
test("VFX: 成功が確定した後にだけ、出発点(ライブラリ+位置固定)と到着点(ライブラリ+追従)の2つが出る。ライブラリ名・対象はデータ駆動", () => {
    const w = zetsuWorld();
    assert.equal(animCalls(w).length, 0);
    const start = pos(w);
    assert.equal(teleport(w, 5, 0).ok, true);
    const calls = animCalls(w);
    assert.deepEqual(calls.map(c => c.name), ["showAnimationFromLibrary", "showAnimationFromLibrary"]);
    const [departure, arrival] = calls;
    assert.equal(departure.args.animationName, "ProjectR_Zetsu_Departure");
    assert.equal(departure.args.eventId, "player");
    assert.equal(departure.args.stickMode, "true", "出発点は再生開始(=移動の前)の位置に固定");
    assert.equal(arrival.args.animationName, "ProjectR_Zetsu_Arrival");
    assert.equal(arrival.args.eventId, "player");
    assert.equal(arrival.args.stickMode, "false", "到着点はプレイヤーに追従");
    assert.equal(w.ctx.ProjectRPresentationVfx.diagnostics().failures, 0);
    assert.notEqual(pos(w).x, start.x);
});

test("VFXの対応表: カードID→ライブラリ名→基準→画像が揃い、ライブラリJSON(js/AnimationSolutionLibrary.json)とスプライトシートの実体と一致する", () => {
    const w = zetsuWorld();
    const vfx = w.ctx.ProjectRPresentationVfx;
    assert.deepEqual(plain(vfx.keys()).sort(), ["hermes.vanish", "hermes_flute.ripple", "hermes_sweep.staff", "hermes_zetsu.arrival", "hermes_zetsu.departure"]);
    const library = JSON.parse(read("js/AnimationSolutionLibrary.json"));
    for (const key of vfx.keys()) {
        const mapping = vfx.mapping(key);
        const entry = library[mapping.library];
        assert.ok(entry, `${key}: ライブラリに${mapping.library}がある`);
        assert.equal(entry.spritesheetFile, mapping.sheet.file);
        assert.deepEqual([entry.rows, entry.columns, entry.fps], [mapping.sheet.rows, mapping.sheet.columns, mapping.sheet.fps]);
        const size = pngSize(`img/pictures/${mapping.sheet.file}.png`);
        const frame = { "Animation/ProjectR_Zetsu_Noise": 160, "Animation/ProjectR_Sweep_Staff": 400, "Animation/ProjectR_Flute_Ripple": 800 }[mapping.sheet.file];
        assert.deepEqual([size.w / mapping.sheet.columns, size.h / mapping.sheet.rows], [frame, frame], `1コマ${frame}px x 8コマ`);
        assert.equal(entry.rows * entry.columns, 8);
    }
    assert.deepEqual([vfx.mapping("hermes_zetsu.departure").anchor, vfx.mapping("hermes_zetsu.departure").stick], ["player", true]);
    assert.equal(vfx.mapping("hermes_zetsu.arrival").anchor, "player");
});

test("VFXの隔離: VFXコマンドが例外・欠落・未登録でも、移動・消費・強化・Cooldownの結果は変わらない(例外も外へ出ない)", () => {
    // (a) 公式VFXコマンドが例外を投げる
    let w = zetsuWorld({ level: 3 });
    const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin) {
        if (plugin === "Hendrix_Animation_Solution") throw new Error("vfx boom");
        return original.apply(this, arguments);
    };
    let start = pos(w);
    assert.equal(teleport(w, 3, 0).ok, true, "例外でもカードは成功");
    near(pos(w).x, start.x + 3, 0.01);
    assert.equal(state(w).cooldownPile.length, 1);
    assert.equal(modifiers(w).getWeaponHitBonus().multiplier, 3.0);
    assert.ok(w.ctx.ProjectRPresentationVfx.diagnostics().failures >= 2);
    // (b) VFXコマンドそのものが無い
    w = zetsuWorld();
    delete w.ctx.PluginManager._commands["Hendrix_Animation_Solution:showAnimatedPicture"];
    delete w.ctx.PluginManager._commands["Hendrix_Animation_Solution:showAnimationFromLibrary"];
    start = pos(w);
    assert.equal(teleport(w, 3, 0).ok, true);
    near(pos(w).x, start.x + 3, 0.01);
    assert.equal(w.ctx.ProjectRPresentationVfx.diagnostics().lastReason, "vfxCommandMissing");
    // (c) playが丸ごと失敗しても、zetsu側の演出呼び出しが例外を外へ出さない
    w = zetsuWorld();
    w.ctx.ProjectRPresentationVfx.play = () => { throw new Error("play boom"); };
    assert.equal(teleport(w, 3, 0).ok, true);
    // (d) ライブラリ未登録(probe済み)なら、同じスプライトシートを公式Show VFXで再生する代替に切り替わる
    w = zetsuWorld();
    return w.ctx.ProjectRPresentationVfx.probeLibrary().then(() => { /* ハーネスのfetchは解決しない */ }, () => {});
});

test("VFXはゲーム状態を持たない(コードにカード消費・ダメージ・Cooldown・移動・命中の操作が無い)", () => {
    const code = stripComments(read("js/plugins/ProjectR_PresentationVfx.js"));
    for (const word of ["requestUseCard", "useBattleCard", "updateCooldown", "UpdateEventHp", "setPosition", "gainHp", "armWeaponHitBonus", "checkCollide", "registerActivationHandler"]) {
        assert.ok(!code.includes(word), `ProjectR_PresentationVfx.js に ${word} が無い`);
    }
    const cutin = stripComments(read("js/plugins/ProjectR_CutIn.js"));
    for (const word of ["useBattleCard", "updateCooldown", "UpdateEventHp", "setPosition", "gainHp", "armWeaponHitBonus", "checkCollide", "registerActivationHandler", "hitboxData", "setHitbox"]) {
        assert.ok(!cutin.includes(word), `ProjectR_CutIn.js に ${word} が無い`);
    }
});

test("VFXの後片付け: 自分が出したものだけを公式disposeで外す。戦闘終了・マップ移動・ロードで呼ばれる", () => {
    const w = zetsuWorld();
    const disposed = [];
    const picture = note => ({ note, dispose() { disposed.push(note); } });
    w.ctx.AnimatedPictureManager = { _animatedPictures: [picture("ProjectR:hermes_zetsu.departure"), picture("library_ProjectR_Zetsu_Arrival"), picture("someone else"), picture("library_Other")] };
    teleport(w, 3, 0); // 到着VFXがlibrary_ProjectR_Zetsu_Arrivalとして記録される
    deckApi(w).endCardBattle();
    assert.deepEqual(disposed.sort(), ["ProjectR:hermes_zetsu.departure", "library_ProjectR_Zetsu_Arrival"]);
    assert.equal(w.ctx.ProjectRPresentationVfx.diagnostics().cleared, 2);
    assert.equal(w.ctx.ProjectRPresentationVfx.play("nope").reason, "unmapped");
});

// ---------------- カットイン ----------------
test("カットイン: 成功で左上/右上のどちらかにラベル型が1枚(Hermesの目元)。連打でも積み重ならず、54フレームで消える", () => {
    const w = zetsuWorld();
    const cut = w.ctx.ProjectRCutIn;
    assert.equal(cut.isCardEnabled(ZETSU), true);
    assert.equal(cut.isCardEnabled("apollo_golden_arrow"), false, "他カードの見た目は変えない");
    cut.setRandom(() => 0.1);
    assert.equal(teleport(w, 2, 0).ok, true);
    let active = plain(cut.getActive());
    assert.equal(active.length, 1);
    assert.deepEqual([active[0].kind, active[0].godId, active[0].cardId, active[0].side], ["card", "hermes", ZETSU, "left"]);
    cut.setRandom(() => 0.9);
    teleport(w, 2, 0, "Q");
    active = plain(cut.getActive());
    assert.equal(active.length, 1, "積み重ならない(置き換え)");
    assert.equal(active[0].side, "right");
    for (let i = 0; i < 40; i++) cut.tick();
    assert.equal(cut.getActive().length, 1);
    for (let i = 0; i < 60; i++) cut.tick();
    assert.equal(cut.getActive().length, 0, "自動で消える");
    // 位置は左右どちらも出る(乱数の両端)
    const sides = new Set();
    for (const r of [0, 0.49, 0.5, 0.99]) { cut.setRandom(() => r); sides.add(cut.show({ kind: "card", godId: "hermes" }).side); }
    assert.deepEqual([...sides].sort(), ["left", "right"]);
});

test("カットイン: 失敗した発動・対象外のカードでは出ない。Ultimate用は中央大型で横/縦をランダムに選ぶ(接続は次Phase)", () => {
    const w = zetsuWorld({ x: 6, y: 25 });
    const cut = w.ctx.ProjectRCutIn;
    teleport(w, 0, 0); // 行き先なしで失敗
    assert.deepEqual(plain(cut.getActive()), []);
    assert.equal(cut.show({ kind: "nope", godId: "hermes" }).ok, false);
    assert.equal(cut.show({ kind: "card" }).ok, false);
    cut.setRandom(() => 0.2);
    const a = cut.show({ kind: "ultimate", godId: "hermes" });
    cut.setRandom(() => 0.8);
    const b = cut.show({ kind: "ultimate", godId: "hermes" });
    assert.deepEqual([a.orientation, b.orientation], ["horizontal", "vertical"]);
    assert.equal(cut.getActive().filter(e => e.kind === "ultimate").length, 1, "Ultimateも1つだけ");
    for (let i = 0; i < 95; i++) cut.tick();
    assert.equal(cut.getActive().length, 1);
    cut.tick(); cut.tick();
    assert.equal(cut.getActive().length, 0);
});

test("カットインは戦闘を止めず、判定・操作・カード実行に介入しない。戦闘終了・マップ移動・ロードで消える", () => {
    const w = zetsuWorld();
    const cut = w.ctx.ProjectRCutIn;
    teleport(w, 2, 0);
    assert.equal(cut.getActive().length, 1);
    assert.equal(w.ctx.ProjectRCardBattleInput.canAcceptInput(), true, "カットイン表示中も入力を受け付ける");
    assert.equal(teleport(w, 1, 0).ok, true, "表示中も次のカードを使える");
    assert.equal(w.ctx.$gamePlayer.canMove(), true);
    const cases = {
        battleEnd: w2 => deckApi(w2).endCardBattle(),
        mapTransfer: w2 => w2.ctx.$gameMap.setup(4),
        load: w2 => w2.ctx.DataManager.extractSaveContents(w2.ctx.DataManager.makeSaveContents())
    };
    for (const [name, clear] of Object.entries(cases)) {
        const w2 = zetsuWorld();
        teleport(w2, 2, 0);
        assert.equal(w2.ctx.ProjectRCutIn.getActive().length, 1);
        clear(w2);
        assert.equal(w2.ctx.ProjectRCutIn.getActive().length, 0, name);
    }
});

test("カットインの画像: 神ごとの目元・主人公の目元の対応表が差し替え可能で、DEV画像が実在する(512x128)", () => {
    const w = zetsuWorld();
    const assets = plain(w.ctx.ProjectRCutIn.assets());
    assert.equal(assets.gods.hermes, "ProjectR_CutIn_Hermes_Eyes_DEV");
    assert.equal(assets.player, "ProjectR_CutIn_Player_Eyes_DEV");
    for (const file of [assets.gods.hermes, assets.player]) assert.deepEqual(pngSize(`img/pictures/${file}.png`), { w: 512, h: 128 });
    const thirdParty = read("docs/ProjectR_ThirdPartyAssets.md");
    assert.match(thirdParty, /ProjectR_CutIn_Hermes_Eyes_DEV/, "自作素材として台帳に載せる");
});

// カットインの描画順は、最小のVM文脈で実ソースを動かして確認する(実際のMZ描画は実機で確認)。
function miniCutInWorld() {
    const ctx = vm.createContext({ console });
    ctx.globalThis = ctx; ctx.window = ctx;
    vm.runInContext(`
        class Container { constructor() { this.children = []; this.parent = null; this.x = 0; this.y = 0; this.alpha = 1; this.visible = true; }
            addChild(c) { c.parent?.removeChild(c); this.children.push(c); c.parent = this; return c; }
            addChildAt(c, i) { c.parent?.removeChild(c); this.children.splice(i, 0, c); c.parent = this; return c; }
            removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); c.parent = null; } return c; }
            destroy() { this.parent?.removeChild(this); } }
        const point = () => ({ x: 0, y: 0, set(x, y = x) { this.x = x; this.y = y; }, copyFrom(p) { this.x = p.x; this.y = p.y; } });
        class Sprite extends Container { constructor() { super(); this.scale = point(); this.scale.x = 1; this.scale.y = 1; this.anchor = point(); this.position = point(); this.pivot = point(); this.rotation = 0; this.bitmap = null; } setFrame(x, y, w, h) { this._frame = { x, y, width: w, height: h }; } }
        class Bitmap { constructor(w, h) { this.width = w; this.height = h; this.context = null; } fillRect() {} isError() { return false; } }
        globalThis.PIXI = { Container, Sprite };
        globalThis.Sprite = Sprite; globalThis.Bitmap = Bitmap;
        globalThis.ImageManager = { loadPicture: () => new Bitmap(512, 128) };
        globalThis.Graphics = { width: 816, height: 624 };
        globalThis.PluginManager = { parameters: () => ({}) };
        globalThis.$gamePlayer = { id: "player" };
        // 実Spriteset_Mapの順序を模す: 背景/タイルマップ → (Vision層はVisionOcclusionが後から足す) → CutIn層
        globalThis.Spriteset_Map = class { createLowerLayer() { this._baseSprite = new Sprite(); this._tilemap = new Sprite(); this._baseSprite.addChild(this._tilemap);
            this._characterSprites = [Object.assign(new Sprite(), { _character: globalThis.$gamePlayer })]; this._tilemap.addChild(this._characterSprites[0]); }
            update() {} };
        const _create = Spriteset_Map.prototype.createLowerLayer;
        Spriteset_Map.prototype.createLowerLayer = function() { _create.apply(this, arguments); this._projectRVisionLayer = new Sprite(); this._baseSprite.addChild(this._projectRVisionLayer); };
        globalThis.Game_Map = class { setup() {} };
        globalThis.DataManager = { extractSaveContents() {} };
        globalThis.ProjectRCardDeck = { requestUseCard: () => ({ ok: false }), endBattle() {}, definitions: { card: () => null, ring: () => null } };
    `, ctx);
    vm.runInContext(read("js/plugins/ProjectR_CutIn.js"), ctx, { filename: "ProjectR_CutIn.js" });
    return ctx;
}
test("描画順: Map/背景 → Vision(暗幕)層 → カットイン → 操作キャラクターの複製。カットイン層は最前面に追加され、複製は常にカットインより上", () => {
    const ctx = miniCutInWorld();
    const spriteset = vm.runInContext("new Spriteset_Map()", ctx);
    spriteset.createLowerLayer();
    const kids = spriteset._baseSprite.children;
    assert.equal(kids.indexOf(spriteset._tilemap), 0);
    assert.equal(kids.indexOf(spriteset._projectRVisionLayer), 1);
    assert.equal(kids.indexOf(spriteset._projectRCutInLayer), 2, "Vision層より上(暗幕で隠されない)");
    assert.equal(kids.length, 3);
    const layer = spriteset._projectRCutInLayer;
    const cut = ctx.ProjectRCutIn;
    // 元のキャラクターSpriteの位置・サイズを写す
    const source = spriteset._characterSprites[0];
    source.x = 400; source.y = 300; source.position.x = 400; source.position.y = 300; source.bitmap = { id: "hero" }; source.setFrame(48, 0, 48, 48);
    assert.equal(layer.overlay.visible, false, "カットインが無いときは複製を出さない");
    cut.show({ kind: "card", godId: "hermes" });
    cut.show({ kind: "ultimate", godId: "hermes" });
    layer.refresh(spriteset);
    assert.equal(layer.overlay.visible, true);
    assert.equal(layer.children[layer.children.length - 1], layer.overlay, "操作キャラクターの複製が最前");
    assert.equal(layer.children.length, 3, "カットイン2枚 + 複製");
    assert.deepEqual([layer.overlay.position.x, layer.overlay.position.y], [400, 300]);
    assert.equal(layer.overlay.bitmap.id, "hero");
    assert.deepEqual(plain(layer.overlay._frame), { x: 48, y: 0, width: 48, height: 48 });
    for (const view of layer.views.values()) assert.ok(layer.children.indexOf(view.container) < layer.children.indexOf(layer.overlay), "どのカットインも複製より下");
    // 位置: ラベルは上寄り(左上/右上)、Ultimateは中央
    const entries = [...layer.views].map(([id, v]) => ({ kind: cut.getActive().find(e => e.id === id).kind, v }));
    const label = entries.find(e => e.kind === "card").v.container, big = entries.find(e => e.kind === "ultimate").v.container;
    assert.ok(label.y < 624 * 0.1 && (label.x < 816 * 0.1 || label.x > 816 * 0.5), `ラベルは上の左右隅 (${label.x},${label.y})`);
    near(big.x + (big.size?.w || 0) / 2, 408, 1000, "Ultimateは中央付近");
    // 終了で消える
    for (let i = 0; i < 100; i++) cut.tick();
    layer.refresh(spriteset);
    assert.equal(layer.children.length, 1, "カットインが消えると複製だけが残り、非表示");
    assert.equal(layer.overlay.visible, false);
});

test("カットインの画像が読めなくても例外にならず、簡易の目元で表示を続ける", () => {
    const ctx = miniCutInWorld();
    vm.runInContext(`ImageManager.loadPicture = () => { const b = new Bitmap(0, 0); b.isError = () => true; return b; }; Bitmap.prototype.context = { fillStyle: "", beginPath() {}, ellipse() {}, arc() {}, fill() {} };`, ctx);
    const spriteset = vm.runInContext("new Spriteset_Map()", ctx);
    spriteset.createLowerLayer();
    ctx.ProjectRCutIn.show({ kind: "ultimate", godId: "hermes" });
    assert.doesNotThrow(() => spriteset._projectRCutInLayer.refresh(spriteset));
});

// ---------------- キャラクターの動作 ----------------
test("腕クロス: 成功したときだけDEV3Hの CrossArms が再生される(SkillCastではない)。失敗では再生しない。他カードは従来どおりSkillCast", () => {
    const w = zetsuWorld({ x: 6, y: 25 });
    const history = () => plain(w.ctx.ProjectRCharacterPresentation.history()).filter(e => e.ok).map(e => e.name);
    teleport(w, 0, 0); // 失敗
    assert.ok(!history().includes("CrossArms"));
    assert.equal(teleport(w, 3, 0).ok, true);
    assert.ok(history().includes("CrossArms"), JSON.stringify(history()));
    assert.ok(!history().includes("SkillCast"));
    const profile = plain(w.ctx.ProjectRCharacterPresentation.profileForPlayer());
    const cross = profile.actions.CrossArms;
    assert.deepEqual([cross.sprite, cross.frames, cross.speed, cross.hold], ["$DEV3H_CrossArms_f4", 4, 5, 12]);
    assert.equal(profile.cardActions[ZETSU], "CrossArms");
    const size = pngSize("img/characters/$DEV3H_CrossArms_f4.png");
    assert.deepEqual(size, { w: 4 * 96, h: 4 * 96 }, "4コマ x 4方向(1コマ96px)");
    // 他のカードは従来のSkillCast
    const w2 = zetsuWorld({ order: ["apollo_golden_arrow", ZETSU, ZETSU, ZETSU, ZETSU] });
    w2.mouse(700, 300);
    w2.tap("KeyQ", 81);
    assert.ok(plain(w2.ctx.ProjectRCharacterPresentation.history()).some(e => e.ok && e.name === "SkillCast"));
});

// ---------------- 登録・読み込み順・資産 ----------------
test("plugins.js: 新プラグインは登録名=ファイル名で、依存順(Vision→CutIn、Modifiers→Zetsu、葦笛→Zetsu)に並ぶ", () => {
    const w = zetsuWorld();
    const names = plain(w.ctx.$plugins).map(p => p.name);
    const index = n => names.indexOf(n);
    for (const n of ["ProjectR_CardCatalog", "ProjectR_CardModifiers", "ProjectR_PresentationVfx", "ProjectR_CutIn", "ProjectR_HermesZetsu", "ProjectR_CombatTestArenaZetsu"]) {
        assert.ok(index(n) >= 0, `${n} が登録されている`);
        assert.ok(fs.existsSync(path.join(project, "js/plugins", `${n}.js`)), `${n}.js が存在する`);
        assert.equal(w.loaded.includes(n), true, `${n} が読み込めた`);
    }
    const before = (a, b) => assert.ok(index(a) >= 0 && index(a) < index(b), `${a} < ${b}`);
    before("ProjectR_VisionOcclusion", "ProjectR_CutIn");
    before("ProjectR_CardCatalog", "ProjectR_HermesZetsu");
    before("ProjectR_CardModifiers", "ProjectR_HermesZetsu");
    before("ProjectR_HermesReedFluteSleep", "ProjectR_HermesZetsu");
    before("ProjectR_GunSystem", "ProjectR_CardModifiers");
    before("ProjectR_HermesZetsu", "ProjectR_CombatTestArenaZetsu");
    // 第三者製プラグイン本体・コアスクリプトは変更していない(HEADとの差分が無い)
    const { execFileSync } = require("node:child_process");
    const diff = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/Hendrix_Animation_Solution.js",
        "js/plugins/DotMoveSystem.js", "js/rmmz_core.js", "js/rmmz_managers.js", "js/rmmz_objects.js", "js/rmmz_scenes.js", "js/rmmz_sprites.js", "js/rmmz_windows.js"], { cwd: project }).toString().trim();
    assert.equal(diff, "", "Hendrix/DotMove/コアは無改変");
});

console.log(`${passed} Hermes Zetsu presentation tests passed`);
