"use strict";
// 全仕様パス: Combat Test Arena 追加シナリオ(DEVボス/仲間/メニュー/指輪)・WeaponPresentation・Map004の端末・Playtest限定。
const assert = require("node:assert/strict");
const { createGame, plain, read, plugins } = require("./ProjectR_FullSpecFixture.cjs");

const deepEqual = (a, b, m) => assert.deepEqual(plain(a), plain(b), m);
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const FILE = "ProjectR_CombatTestArenaFullSpec";

function arenaGame({ playtest = true, mapId = 4 } = {}) {
    const g = createGame({ deckFixture: false });
    g.Utils = { isOptionValid: name => playtest && name === "test" };
    g.mapIdValue = mapId;
    g.$gameMap = { mapId: () => g.mapIdValue };
    g.$gamePlayer = { x: 25, y: 26 };
    g.$gameMessage = { lines: [], add(line) { this.lines.push(line); }, setBackground() {}, setPositionType() {} };
    g.arenaEnded = 0;
    g.ProjectRCombatTestArena = { endTest: () => { g.arenaEnded++; return { ok: true }; } };
    g.fixture.load(FILE);
    return g;
}

test("Playtest限定: Playtest以外では何も登録・作成しない", () => {
    const g = arenaGame({ playtest: false });
    assert.equal(g.ProjectRCombatTestArenaFullSpec, undefined);
    assert.ok(!Object.keys(g.PluginManager._commands).some(k => k.startsWith(FILE)));
});

test("Playtest: コマンド一式が登録される。製品プラグイン登録は本番の順(Arena・追加HUDの後)", () => {
    const g = arenaGame();
    for (const name of ["startBossTest", "bossHit", "bossDivine", "allyHit", "bossEntryCheck", "menuTest", "fullStatus", "restoreReal"]) {
        assert.equal(typeof g.PluginManager._commands[`${FILE}:${name}`], "function", name);
    }
    const names = plugins.map(p => p.name);
    assert.ok(names.indexOf(FILE) > names.indexOf("ProjectR_CombatTestArena"));
    assert.ok(names.indexOf(FILE) > names.indexOf("ProjectR_BossFramework"));
    assert.ok(names.indexOf(FILE) > names.indexOf("ProjectR_CombatExtrasHUD"));
});

test("Map004: DEV端末が追加され、全てPlaytest専用プラグインコマンドを呼ぶ。既存のArena端末と本番マップは変えない", () => {
    const map = JSON.parse(read("data/Map004.json"));
    const events = map.events.filter(Boolean);
    const added = events.filter(e => e.pages[0].list[0].parameters[0] === FILE);
    assert.equal(added.length, 8);
    assert.equal(new Set(events.map(e => e.id)).size, events.length, "event IDが重複しない");
    const commands = added.map(e => e.pages[0].list[0].parameters[1]).sort();
    deepEqual(commands, ["allyHit", "bossDivine", "bossEntryCheck", "bossHit", "fullStatus", "menuTest", "restoreReal", "startBossTest"]);
    for (const e of added) {
        assert.equal(e.pages[0].trigger, 0, "決定ボタン");
        assert.ok(e.x >= 0 && e.x < map.width && e.y >= 0 && e.y < map.height);
        assert.ok(e.x >= 29 && e.x <= 35 && [22, 26].includes(e.y), "中央ハブの床の上");
    }
    // 既存の23個の端末は同じ
    assert.equal(events.filter(e => e.id <= 23).length, 23);
    // 本番マップ(Map001-003)からアリーナ関連の呼び出しがない
    for (const f of ["Map001", "Map002", "Map003"]) assert.ok(!read(`data/${f}.json`).includes(FILE));
});

test("DEVボス戦: 本番と同じBossFramework.start(デッキ検証つき)で始まり、ボスHUD・フェーズ・仲間が動く。保存デッキは終了後に戻る", () => {
    const g = arenaGame();
    const arena = g.ProjectRCombatTestArenaFullSpec;
    const before = plain(g.ProjectRCardDeck.getPersistentData());
    const started = arena.startBossTest();
    assert.equal(started.ok, true);
    assert.equal(g.arenaEnded >= 1, true, "既存のArenaテストを先に終える");
    assert.equal(g.ProjectRBossFramework.isActive(), true);
    assert.equal(g.ProjectRPartyCombat.isActive(), true);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), true);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), true);
    assert.equal(g.ProjectRCardDeck.getUltimateRingId(), "hermes");
    assert.equal(g.ProjectRBossFramework.getHudState().phaseCount, 3);
    // フェーズ: 25%ずつ(66%→33%の境界)
    const phases = [];
    g.ProjectRBossFramework.onPhase(e => phases.push(e.phase.id));
    arena.bossHit(); arena.bossHit();
    deepEqual(phases, ["phase2"]);
    arena.bossHit();
    deepEqual(phases, ["phase2", "phase3"]);
    // Divine AoE: Bridgeへ一意の攻撃ID
    assert.equal(arena.bossDivine().ok, true);
    assert.equal(g.ProjectRUltimateGodDamageBridge.calls.length, 1);
    // 仲間ダウン
    assert.equal(arena.allyHit().ok, true);
    assert.equal(g.ProjectRPartyCombat.members()[0].hp, 60);
    arena.allyHit();
    assert.equal(g.ProjectRPartyCombat.members()[0].down, true);
    // 仲間AI: マップ更新で判断し、ボスHPを減らす
    const hpBefore = g.ProjectRBossFramework.getState().hp;
    for (let i = 0; i < 60; i++) new g.Game_Map().update(true);
    assert.ok(arena.getLog().length > 0, "AIの判断ログ");
    assert.ok(g.ProjectRBossFramework.getState()?.hp < hpBefore || !g.ProjectRBossFramework.isActive(), "仲間の攻撃でHPが減る");
    // 勝利まで: 戦闘が片付く
    for (let i = 0; i < 10 && g.ProjectRBossFramework.isActive(); i++) arena.bossHit();
    assert.equal(g.ProjectRBossFramework.isActive(), false);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    // DEVデータを戻す
    assert.equal(arena.restoreReal().ok, true);
    deepEqual(g.ProjectRCardDeck.getPersistentData(), before);
    assert.equal(g.ProjectRCardDeck.definitions.card("hermes_swift_movement").maxCopies, 3, "定義も元へ");
    deepEqual(g.ProjectRCardDeck.definitions.ring("hermes").equipActorIds, []);
});

test("ボス開始のデッキ検証(保存デッキ): 製品の7種では30枚に届かず拒否され、理由が出る。デッキは書き換わらない", () => {
    const g = arenaGame();
    const arena = g.ProjectRCombatTestArenaFullSpec;
    g.ProjectRCardDeck.assignRingToPlayer("hermes");
    g.ProjectRCardDeck.setCardOwned("hermes_swift_movement", true);
    g.ProjectRCardDeck.setDeck(["hermes_swift_movement"]);
    g.ProjectRBossFramework.registerBoss({ bossId: arena.BOSS_ID, name: "b", maxHp: 10 });
    const result = arena.bossEntryCheck();
    assert.equal(result.ok, false); assert.equal(result.reason, "invalidDeck");
    deepEqual(g.ProjectRCardDeck.getDeck(), ["hermes_swift_movement"]);
    assert.equal(g.ProjectRBossFramework.isActive(), false);
    // コマンド経由で理由メッセージが出る
    g.$gameMessage.lines.length = 0;
    const interp = { setWaitMode(m) { this.m = m; } };
    g.PluginManager._commands[`${FILE}:bossEntryCheck`].call(interp, {});
    assert.match(g.$gameMessage.lines.join("\n"), /30枚必要/);
    assert.equal(interp.m, "message");
});

test("メニュー確認の準備: 戦闘を終え、指輪(仲間に渡せる)・カード・30枚デッキを用意し、ITEM/SKILL/ULTIMATE/指輪画面で使える", () => {
    const g = arenaGame();
    const arena = g.ProjectRCombatTestArenaFullSpec;
    arena.startBossTest();
    assert.equal(g.ProjectRMenuCore.isLocked(), true, "戦闘中はメニューロック");
    arena.menuTest();
    assert.equal(g.ProjectRMenuCore.isLocked(), false);
    assert.equal(new g.Scene_Map().isMenuEnabled(), true);
    assert.equal(g.ProjectRMenuCore.deck.status().valid, true, "DEV fixtureの30枚デッキ");
    // 指輪を仲間に渡し、戻す
    assert.equal(g.ProjectRMenuCore.rings.transferToActor("hermes", 4).ok, true);
    assert.equal(g.ProjectRMenuCore.deck.status().valid, false, "指輪が仲間にあると対応カードが無効になる");
    assert.equal(g.ProjectRMenuCore.rings.returnToPlayer("hermes").ok, true);
    assert.equal(g.ProjectRMenuCore.deck.status().valid, true, "戻すとデッキはそのまま有効");
    // Ultimate選択
    assert.equal(g.ProjectRMenuCore.ultimate.select("apollo").ok, true);
    arena.restoreReal();
    assert.equal(g.ProjectRCardDeck.getUltimateRingId(), null, "元のデータに戻る");
});

test("アリーナを出る(別マップへ移動)・ロード・New Gameで、DEVの変更が自動で元に戻る", () => {
    const g = arenaGame();
    const arena = g.ProjectRCombatTestArenaFullSpec;
    arena.menuTest();
    assert.equal(g.ProjectRCardDeck.definitions.card("hermes_swift_movement").maxCopies, 5);
    new g.Game_Map().setup(1);
    assert.equal(g.ProjectRCardDeck.definitions.card("hermes_swift_movement").maxCopies, 3);
    assert.equal(g.ProjectRCardDeck.hasPlayerRing("hermes"), false);
    arena.menuTest();
    g.DataManager.setupNewGame();
    assert.equal(g.ProjectRCardDeck.definitions.card("hermes_swift_movement").maxCopies, 3);
});

test("アリーナ外では開始できない。DEV fixtureは保存対象に残らない", () => {
    const g = arenaGame({ mapId: 1 });
    assert.equal(g.ProjectRCombatTestArenaFullSpec.startBossTest().reason, "notInArena");
    g.mapIdValue = 4;
    g.ProjectRCombatTestArenaFullSpec.startBossTest();
    const text = JSON.stringify(g.$gameSystem);
    for (const word of ["dev_arena_boss", "DEV Ally", "runtime"]) assert.ok(!text.includes(word), word);
});

// ---------------- 武器・斬撃の見た目 ----------------
function weaponGame(extra = {}) {
    const g = createGame();
    class Graphics { constructor() { this.calls = []; } clear() { this.calls = []; } lineStyle(...a) { this.calls.push(["lineStyle", ...a]); } arc(...a) { this.calls.push(["arc", ...a]); }
        moveTo(...a) { this.calls.push(["moveTo", ...a]); } lineTo(...a) { this.calls.push(["lineTo", ...a]); } beginFill() {} endFill() {} drawPolygon(...a) { this.calls.push(["polygon", ...a]); } addChild() {} }
    g.PIXI = { Graphics };
    g.Graphics.frameCount = 0;
    g.Game_Temp = function() { this._commonEventQueue = []; };
    g.Game_Temp.prototype.reserveCommonEvent = function(id) { if (g.reject && id === 1) return; this._commonEventQueue.push(id); };
    g.Spriteset_Map = function() { this._baseSprite = { children: [], addChild(c) { this.children.push(c); } }; };
    g.Spriteset_Map.prototype.createLowerLayer = function() {};
    g.Spriteset_Map.prototype.update = function() {};
    g.ProjectRCombatPresence = { settings: { attackCommonEventId: 1 } };
    g.$gamePlayer = { screenX: () => 400, screenY: () => 300 };
    g.TouchInput = { x: 500, y: 300 }; // 真右 = 90度
    g.weapon = { id: 1, note: "", iconIndex: 97 };
    g.$gameParty.leader = () => ({ weapons: () => [g.weapon] });
    g.ammo = 7;
    g.gunAmmo = () => g.ammo;
    g.played = [];
    g.AudioManager = { playSe: se => g.played.push(se) };
    g.PluginManager._commands["Hendrix_Action_Engine:GunReload"] = function() { g.ammo = 7; };
    Object.assign(g, extra);
    g.fixture.load("ProjectR_WeaponPresentation");
    return g;
}

test("剣: 攻撃入力が受理されたとき、マウス方向(360°)に斬撃を描く。拒否されたとき(戦闘外など)は描かない", () => {
    const g = weaponGame();
    const wp = g.ProjectRWeaponPresentation;
    const temp = new g.Game_Temp();
    temp.reserveCommonEvent(2);
    assert.equal(wp.activeCount(), 0, "攻撃CE以外では描かない");
    temp.reserveCommonEvent(1);
    assert.equal(wp.activeCount(), 1);
    assert.equal(wp.effects()[0].kind, "slash");
    assert.equal(wp.effects()[0].degree, 90, "マウスが真右 = 90度(上=0度・時計回り)");
    // 他のPluginが拒否した(キューに積まれない)ときは描かない
    g.reject = true;
    wp.clear();
    temp.reserveCommonEvent(1);
    assert.equal(wp.activeCount(), 0, "拒否された攻撃は見た目も出さない");
});
test("剣の斬撃: 経過で弧が進み、寿命で消える。描画はダメージ・Hitboxに触れない", () => {
    const g = weaponGame();
    const wp = g.ProjectRWeaponPresentation;
    wp.playSlash({ degree: 0, frames: 4 });
    const graphics = new g.PIXI.Graphics();
    const calls = [];
    for (let i = 0; i < 6; i++) { graphics.clear(); wp._draw(graphics, { x: 400, y: 276 }); calls.push(graphics.calls.length); }
    assert.ok(calls[0] > 0 && calls[calls.length - 1] === 0, "最後は消える");
    assert.equal(wp.activeCount(), 0);
    const src = read("js/plugins/ProjectR_WeaponPresentation.js");
    assert.ok(!/UpdateEventHp|spawnEventHitbox|checkCollide|setHp|addUltimateGauge|startCardBattle/.test(src.replace(/\/\*[\s\S]*?\*\//, "")), "ダメージ/Hitbox/Gaugeに介入しない");
    // 360°: 任意の角度を受け付ける
    assert.equal(wp.playSlash({ degree: 217.5 }), true);
    assert.equal(wp.effects().at(-1).degree, 217.5);
    assert.equal(wp.playSlash({ degree: NaN }), false);
});

test("銃の発光: GunSystemが渡した銃口の点にだけ描く(体の中心には出さない)。弾道線は撤去。武器側は弾数を持たない", () => {
    const g = weaponGame();
    g.weapon.note = "<capacity: 7>\n<ammo item: 弾薬>";
    const wp = g.ProjectRWeaponPresentation;
    const temp = new g.Game_Temp();
    temp.reserveCommonEvent(1);
    assert.equal(wp.activeCount(), 0, "銃の攻撃入力ではWeaponPresentationは何も描かない(旧: 体中心の発光)");
    assert.equal(wp.playMuzzle({ degree: 90 }), false, "銃口の点が無ければ描かない");
    assert.equal(wp.playMuzzle({ degree: 90, point: { x: 400, y: 300 } }), true);
    deepEqual(wp.effects().map(e => e.kind), ["muzzle"], "弾道線(tracer)は撤去");
    const src = read("js/plugins/ProjectR_WeaponPresentation.js");
    assert.ok(!/ammo\s*[-+]=|ammo--|ammo\+\+|setAmmo|_ammo|tracer/.test(src), "独自の弾薬管理・弾道線を持たない");
});

test("リロード音: WeaponPresentationは公式GunReloadをラップしない(音とリロードはGunSystemの1経路)", () => {
    const g = weaponGame();
    g.ammo = 2;
    g.PluginManager._commands["Hendrix_Action_Engine:GunReload"]({});
    assert.equal(g.ammo, 7, "公式コマンドは素のまま");
    assert.equal(g.played.length, 0, "WeaponPresentation側の二重のリロード音は無い");
    const head = read("js/plugins/ProjectR_WeaponPresentation.js");
    assert.doesNotMatch(head, /@param ReloadSeName/); assert.doesNotMatch(head, /GunReload/);
    assert.match(read("js/plugins/ProjectR_GunSystem.js"), /@param ReloadSeName/);
});

test("Hermes奥義/剣術: 既存Hitboxの角度に合わせて斬撃を描く(Hitbox側は観察のみ)", () => {
    const g = weaponGame();
    const wp = g.ProjectRWeaponPresentation;
    g.ProjectRHermesUltimate = { getHermesUltimateState: () => ({ instanceId: 1, currentSlashIndex: g.slashIndex, slashDegrees: [0, 60, 300, 120, 240, 180] }) };
    g.slashIndex = 0; wp._poll();
    g.slashIndex = 2; wp._poll();
    deepEqual(wp.effects().map(e => e.degree), [0, 60, 300], "追い越した斬撃も順に描く");
    wp._poll();
    assert.equal(wp.activeCount(), 3, "同じ斬撃を二重に描かない");
    g.ProjectRHermesUltimate = { getHermesUltimateState: () => null };
    wp._poll();
    g.ProjectRHermesSwordsmanship = { getActiveHitboxes: () => [{ eventId: 9, degree: 135 }] };
    wp._poll(); wp._poll();
    assert.equal(wp.effects().filter(e => e.degree === 135).length, 1);
    assert.equal(wp.effects().find(e => e.degree === 135).color, wp.config.godSlashColor);
});

test("素材の扱い: 剣の専用画像が無いこと(Pan.pngは暫定)を明記し、BladeImageで差し替え可能。G17の弾(VFX/$ProjectR_G17Bullet)が見える", () => {
    const head = read("js/plugins/ProjectR_WeaponPresentation.js");
    assert.match(head, /@param BladeImage/); assert.match(head, /Pan\.png/); assert.match(head, /素材の状況/);
    const map = JSON.parse(read("data/Map002.json"));
    const bullet = map.events.filter(Boolean).find(e => e.name === "ProjectR G17 Bullet");
    assert.equal(bullet.pages[0].image.characterName, "VFX/$ProjectR_G17Bullet", "新銃の弾Prefabが見える画像を持つ");
    const fs = require("node:fs"), path = require("node:path");
    assert.ok(fs.existsSync(path.join(__dirname, "..", "img/characters/VFX/$ProjectR_G17Bullet.png")));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "img/characters/VFX/$Bullet.png")), "Apolloの矢が使う既存画像は残す");
    // 銃の弾薬・容量は公式API。呼び出し元はCE1ではなくGunSystem(CE1に銃処理は無い)
    const ce = JSON.parse(read("data/CommonEvents.json"))[1];
    assert.ok(!ce.list.some(c => c.code === 357 && (c.parameters[1] === "GunAmmoControl" || c.parameters[1] === "GunReload")));
});

test("文書: ギャップ監査は全項目を分類し、手動確認はA〜Lの実機手順と未確認の明記を含む", () => {
    const audit = read("docs/ProjectR_FullSpec_GapAudit.md");
    for (const label of ["COMPLETE", "PARTIAL", "BROKEN IN MZ", "NOT IMPLEMENTED", "CONTENT NOT YET DEFINED"]) assert.ok(audit.includes(label), label);
    for (let n = 1; n <= 35; n++) assert.match(audit, new RegExp(`^\| ${n} \|`, "m"), `監査表の行 #${n}`);
    assert.match(audit, /戦闘中のメニューのルール/);
    assert.match(audit, /実機では未確認/);
    const manual = read("docs/ProjectR_FullSpec_ManualVerification.md");
    for (const section of "ABCDEFGHIJKL") assert.match(manual, new RegExp(`^## ${section}\. `, "m"), `セクション${section}`);
    assert.match(manual, /未確認/);
    assert.match(manual, /Reed Flute直近/);
});

console.log(`\n${passed} tests passed`);
