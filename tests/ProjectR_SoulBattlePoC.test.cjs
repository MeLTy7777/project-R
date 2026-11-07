"use strict";
// SOUL戦闘 P0 PoC(ProjectR_SoulBattlePoC)の検証。実エンジン(Map004 + 全plugin + 実Hendrix/DotMove)で、
//   1. 敵ハートが見える(Sprite)ことと、動く Game_Event の判定が毎フレーム同期すること
//   2. 既存の黄金の矢(apollo_golden_arrow)がハートに当たること(外れる位置・動いている最中も)
//   3. ダメージが既存パイプライン(UpdateEventHp / DamageModifiers)を1回だけ通ること(通常の敵と同じ量)
//   4. 終了後に通常のマップ戦闘と操作が元に戻ること
// を確かめる。PoCは js/plugins.js に登録済みだが、プラグインコマンド/APIを呼ぶまで何もしない(オプトイン)。MZは起動しない。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { cardWorld, player, plain, aimDegree, fireCard, center, placeEnemy, parkOthers, attachHpBars, barHp, resetHp, HP, weaponHit, deckApi } = fx;

const project = path.join(__dirname, "..");
const PLUGIN_FILE = "js/plugins/ProjectR_SoulBattlePoC.js";
const ARROW = "apollo_golden_arrow";
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const PIXEL = 1 / 48 + 1e-9; // 1ピクセル(タイル48px)。DotMoveの判定は座標をピクセルに丸める
const near = (a, b, tolerance, message) => assert.ok(Math.abs(a - b) <= tolerance, `${message || ""} ${a} vs ${b}`);

// 黄金の矢のカード戦闘(アリーナ)の世界。PoCは js/plugins.js の登録どおりハーネスが読み込む。使わない敵は遠くへ退避する。
function soulWorld() {
    const w = cardWorld(ARROW, { x: 12, y: 25 });
    parkOthers(w, []);
    w.poc = w.ctx.ProjectRSoulBattlePoC;
    return w;
}
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const calls = (w, name) => w.calls.filter(c => c.name === name);
const isGone = (w, id) => { const e = w.ctx.$gameMap.event(id); return !e || e._erased === true; };
const heartHp = (w, id) => w.ctx.$gameMap.getCurrentEventHp(id);
// ハートを出して、ハーネスの描画なしSpritesetに(公式と同じ形の)HPバーを付ける。
function startHeart(w, options = {}) {
    const result = w.poc.start(options);
    assert.equal(result.ok, true, JSON.stringify(result));
    attachHpBars(w, [result.eventId], HP);
    return result.eventId;
}
const aboveCenter = (w, tiles) => { const c = center(w); return { centerX: c.x, centerY: c.y - tiles }; };
// 敵(ハートまたは通常のダミー)に向けて1発撃つ。degree: 0=上・時計回り、tiles: 照準までの距離。
function shoot(w, degree, tiles) {
    aimDegree(w, degree, tiles);
    const result = fireCard(w, ARROW);
    assert.equal(result.ok, true, JSON.stringify(result));
}
// 撃ってから frameCount 分進め、HPが変わった最初のframe数を返す(変わらなければ -1)。
function runUntilHit(w, id, readHp, count = 90) {
    const before = readHp();
    for (let i = 1; i <= count; i++) { w.frames(1); if (readHp() !== before) return i; }
    return -1;
}
const keyHold = (w, code, keyCode, count) => {
    const before = { x: player(w)._realX, y: player(w)._realY };
    w.keyDown(code, keyCode); frames(w, count); w.keyUp(code, keyCode); frames(w, 2);
    return { dx: player(w)._realX - before.x, dy: player(w)._realY - before.y };
};
const snapshot = w => ({
    templates: w.ctx.$dataTemplateMap.events.length,
    spawned: w.ctx.$gameMap.events().filter(e => e && e.isSpawnEvent && !e._erased).map(e => e.eventId()).sort((a, b) => a - b),
    hpVars: Object.keys(w.ctx.$gameVariables._data).filter(k => /_HP$/.test(k)).sort(),
    movementDisabled: w.run("playerMovementDisabled"),
    sources: plain(w.ctx.ProjectRCombatSession.sources()),
    cardBattle: deckApi(w).isCardBattleActive()
});

test("登録: js/plugins.js に1回だけ・有効・依存の後ろで登録され、登録名とファイル名が一致する。読み込んだだけでは何も起きない(オプトイン)", () => {
    const config = {};
    require("node:vm").runInNewContext(fs.readFileSync(path.join(project, "js/plugins.js"), "utf8"), config);
    const names = config.$plugins.map(p => p.name), index = names.indexOf("ProjectR_SoulBattlePoC");
    assert.ok(index >= 0 && names.lastIndexOf("ProjectR_SoulBattlePoC") === index, "1回だけ登録");
    assert.equal(config.$plugins[index].status, true);
    assert.deepEqual(plain(config.$plugins[index].parameters), { HeartEnemyName: "魔獣", HitboxSize: "0.8" });
    assert.ok(fs.existsSync(path.join(project, PLUGIN_FILE)), "登録名とファイル名が一致");
    for (const dependency of ["DotMoveSystem", "Hendrix_Action_Engine", "ProjectR_CombatOcclusion", "ProjectR_CardDeckCore", "ProjectR_ApolloGoldenArrow", "ProjectR_CombatSession"]) {
        assert.ok(names.indexOf(dependency) >= 0 && names.indexOf(dependency) < index, dependency + " より後");
    }
    const w = cardWorld(ARROW, { x: 12, y: 25 });
    assert.equal(w.failures.length, 0);
    assert.ok(w.loaded.includes("ProjectR_SoulBattlePoC"), "ハーネスが本番どおりに読み込む");
    const idle = w.ctx.ProjectRSoulBattlePoC;
    assert.equal(idle.isActive(), false);
    assert.deepEqual(plain(idle.getState()), { active: false });
    assert.equal(w.run("playerMovementDisabled"), false);
    assert.equal(w.ctx.$gameMap.events().filter(e => e && e.isSpawnEvent && e.event().note.includes("<projectRSoulHeartPoC>")).length, 0);
    assert.ok(!w.ctx.$dataTemplateMap.events.some(e => e && e.name === "ProjectR SOUL Heart PoC"), "雛形も追加されていない");
    assert.equal(idle.getLog().length, 0);
});

test("コード: ファイル・セーブへ書かず、HPを自分で書かない", () => {
    const source = fs.readFileSync(path.join(project, PLUGIN_FILE), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""); // コメントを除いたコード
    assert.doesNotMatch(source, /require\(|writeFile|localStorage|saveObject|makeSaveContents|saveGame|StorageManager/);
    assert.doesNotMatch(source, /gainHp|setHp\(|\$gameActors/); // HPを自分で書かない
});

test("保護対象(Hendrix・DotMove・既存カード・ダメージ式)は変更していない", () => {
    const targets = fs.readdirSync(path.join(project, "js/plugins")).filter(f => /^(Hendrix_|DotMoveSystem|ProjectR_(Apollo|Card|Hermes|DamageModifiers|GunSystem|SwordSystem|KillAttribution|UltimateGauge|GodSummon|CombatSession|EnemyAttack))/.test(f)).map(f => "js/plugins/" + f);
    const out = cp.spawnSync("git", ["status", "--porcelain", "--", ...targets, "js/rmmz_objects.js", "js/rmmz_scenes.js", "data/Skills.json", "data/Map002.json"], { cwd: project, encoding: "utf8" });
    if (out.status !== 0) { console.log("  (git が使えないため保護対象の差分確認を省略)"); return; }
    // SOUL戦闘のスキル(ProjectR_SoulSkills)のための、SOUL以外では何もしない小さな受け口だけは許す(各ファイルの変更はその受け口だけ)
    const SEAMS = { "js/plugins/ProjectR_GunSystem.js": /cooldownScale/, "js/plugins/ProjectR_SwordSystem.js": /cooldownScale/, "js/plugins/ProjectR_ApolloLyreRhythm.js": /soulAdapter/, "js/plugins/ProjectR_ApolloErosArrow.js": /projectRAttackId/,
        // ATTACK の終了で飛行中の攻撃・蓄えを打ち切る追加専用の窓口 clear(reason)(SOUL の準備ループだけが呼ぶ。通常戦闘では呼ばれない)
        "js/plugins/ProjectR_ApolloPlagueRain.js": /clear: reason/, "js/plugins/ProjectR_HermesStrength.js": /clear: reason/ };
    const changed = out.stdout.split(/\r?\n/).filter(Boolean).map(line => line.slice(3).trim());
    for (const file of changed) {
        assert.ok(SEAMS[file], file + " は変更されていない(許すのはSOULスキルの受け口だけ)");
        assert.match(fs.readFileSync(path.join(project, file), "utf8"), SEAMS[file], file + " の変更はSOULスキルの受け口");
        const stat = cp.spawnSync("git", ["diff", "--numstat", "--", file], { cwd: project, encoding: "utf8" }).stdout.trim().split(/\s+/);
        assert.ok(Number(stat[0]) + Number(stat[1]) <= 60, file + " の変更は小さい(" + stat.slice(0, 2).join("+") + ")");
    }
});

test("開始: 敵ハートは Hendrix の spawn による Game_Event で、見えるSpriteを持ち、HPバーは非表示。雛形は実行時のメモリだけ", () => {
    const w = soulWorld(), before = snapshot(w);
    const tilemap = w.ctx.SceneManager._scene._spriteset._tilemap, added = [];
    tilemap.addChild = child => { added.push(child); };
    const id = startHeart(w, { ...aboveCenter(w, 5), pattern: "static" });
    const event = w.ctx.$gameMap.event(id), state = w.poc.getState();
    assert.equal(w.run(`$gameMap.event(${id}) instanceof Hendrix_TemplateEvent`), true);
    const note = event.event().note;
    for (const tag of ["<projectRSoulHeartPoC>", "<enemy>", "<hideHP>", "<hitbox: 0.8, 0.8>"]) assert.ok(note.includes(tag), tag);
    assert.equal(event._hideHpBar, true);
    assert.ok(heartHp(w, id) > 0);
    // 見た目: ハートのSpriteがtilemapに付き、大きさは判定(0.8タイル)と同じ
    assert.equal(added.filter(s => s._projectRSoulHeartPoC).length, 1);
    const sprite = added.find(s => s._projectRSoulHeartPoC);
    near(sprite.bitmap.width, 0.8 * w.ctx.$gameMap.tileWidth(), 1, "見た目の幅=判定の幅");
    assert.equal(state.sprite.visible, true);
    // 雛形は Map002 のファイルを触らず、メモリ上に1つだけ増える
    assert.equal(w.ctx.$dataTemplateMap.events.length, before.templates + 1);
    assert.ok(w.ctx.$dataTemplateMap.events[state.templateId].name === "ProjectR SOUL Heart PoC");
    assert.ok(w.ctx.ProjectRCombatSession.sources().includes("soul_poc"), "戦闘セッションに登録される");
    assert.equal(w.poc.end("test"), true);
});

test("静止している間: 判定の中心 = 公式の攻撃判定(CombatOcclusion)の重心 = 見た目の中心", () => {
    const w = soulWorld();
    const target = aboveCenter(w, 5);
    startHeart(w, { ...target, pattern: "static" });
    frames(w, 3);
    const s = w.poc.getState(), tile = w.ctx.$gameMap.tileWidth();
    near(s.polygonCenter.x, target.centerX, PIXEL, "判定のx"); near(s.polygonCenter.y, target.centerY, PIXEL, "判定のy");
    near(s.sprite.x, Math.round(w.ctx.$gameMap.adjustX(s.polygonCenter.x) * tile), 1, "見た目x");
    near(s.sprite.y, Math.round(w.ctx.$gameMap.adjustY(s.polygonCenter.y) * tile), 1, "見た目y");
    w.poc.end("test");
});

test("動く: 左右往復で範囲を超えず両端まで動き、毎フレーム 判定(Game_Event)と見た目が同期する", () => {
    const w = soulWorld(), tile = w.ctx.$gameMap.tileWidth(), R = 2;
    const target = aboveCenter(w, 5);
    startHeart(w, { ...target, pattern: "patrol", rangeX: R, speed: 3 });
    let min = Infinity, max = -Infinity, worst = 0, spriteWorst = 0;
    for (let f = 1; f <= 240; f++) {
        w.frames(1);
        const s = w.poc.getState();
        min = Math.min(min, s.hitCenter.x); max = Math.max(max, s.hitCenter.x);
        worst = Math.max(worst, Math.abs(s.polygonCenter.x - s.hitCenter.x), Math.abs(s.polygonCenter.y - s.hitCenter.y));
        spriteWorst = Math.max(spriteWorst, Math.abs(s.sprite.x - Math.round(w.ctx.$gameMap.adjustX(s.polygonCenter.x) * tile)), Math.abs(s.sprite.y - Math.round(w.ctx.$gameMap.adjustY(s.polygonCenter.y) * tile)));
        near(s.hitCenter.y, target.centerY, 1e-9, "往復はyを変えない");
        assert.equal(s.frame, f);
    }
    assert.ok(worst <= PIXEL, "判定の多角形の重心と位置のずれは1ピクセル以内(DotMoveの座標丸め) " + worst);
    assert.ok(spriteWorst <= 1, "見た目が判定の中心にある " + spriteWorst);
    assert.ok(max <= target.centerX + R + 1e-9 && min >= target.centerX - R - 1e-9, `範囲内 ${min}..${max}`);
    assert.ok(max >= target.centerX + R - 0.06 && min <= target.centerX - R + 0.06, `両端まで動く ${min}..${max}`);
    w.poc.end("test");
});

test("動く: 楕円も毎フレーム楕円上にあり、判定と同期する。止める・一時停止で動きが止まる", () => {
    const w = soulWorld();
    const target = aboveCenter(w, 6);
    startHeart(w, { ...target, pattern: "circle", rangeX: 2, rangeY: 1.5, speed: 2 });
    for (let f = 0; f < 90; f++) {
        w.frames(1);
        const s = w.poc.getState();
        near(((s.hitCenter.x - target.centerX) / 2) ** 2 + ((s.hitCenter.y - target.centerY) / 1.5) ** 2, 1, 1e-9, "楕円上");
        near(s.polygonCenter.x, s.hitCenter.x, PIXEL, "同期x"); near(s.polygonCenter.y, s.hitCenter.y, PIXEL, "同期y");
    }
    const moved = w.poc.getState();
    assert.ok(Math.hypot(moved.hitCenter.x - (target.centerX + 2), moved.hitCenter.y - target.centerY) > 0.5, "動いている");
    w.poc.pauseMotion(true); frames(w, 20);
    assert.deepEqual(plain(w.poc.getState().hitCenter), plain(moved.hitCenter), "一時停止中は動かない");
    w.poc.pauseMotion(false);
    w.ctx.$gameMap.eventsPaused = true; frames(w, 20); w.ctx.$gameMap.eventsPaused = false; // 公式の時間停止中も動かない
    assert.deepEqual(plain(w.poc.getState().hitCenter), plain(moved.hitCenter), "時間停止中は動かない");
    w.poc.end("test");
});

test("既存の黄金の矢が静止ハートに1回だけ当たる。通常の敵(ダミー)と同じダメージで、UpdateEventHp は1回だけ", () => {
    const w = soulWorld();
    const id = startHeart(w, { ...aboveCenter(w, 5), pattern: "static" });
    const hp0 = heartHp(w, id), dummyBefore = [3, 4, 5, 6].map(d => barHp(w, d));
    w.calls.length = 0;
    shoot(w, 0, 5);
    assert.ok(runUntilHit(w, id, () => heartHp(w, id)) > 0, "矢が当たる");
    frames(w, 60); // 当たった後に残っていても、同じ弾が重ねて当たらない
    const loss = hp0 - heartHp(w, id);
    assert.ok(loss > 0, "ダメージが入る");
    const damageCalls = calls(w, "UpdateEventHp");
    assert.equal(damageCalls.length, 1);
    assert.deepEqual(plain(damageCalls[0].args), { eventId: String(id), value: "-damage", exceedMaxHealth: "false" });
    assert.equal(calls(w, "DestroyEvent").filter(c => c.args.target === String(id)).length, 0, "ハートは矢が当たっても壊れない(消えるのは矢と神の演出だけ)");
    assert.deepEqual([3, 4, 5, 6].map(d => barHp(w, d)), dummyBefore, "他の敵に影響しない");
    // 通常の敵(同じ <hp: 魔獣> のダミー)に同じ矢を撃った場合と、ダメージが一致する = 同じ計算式を通っている
    w.poc.end("test");
    const c = center(w);
    placeEnemy(w, 4, c.x, c.y - 5);
    resetHp(w, [4]);
    shoot(w, 0, 5);
    assert.ok(runUntilHit(w, 4, () => barHp(w, 4)) > 0);
    assert.equal(HP - barHp(w, 4), loss, "ハートへのダメージ = 通常の敵へのダメージ");
});

test("DamageModifiers の係数がハートにも1回だけ掛かる(= 既存のダメージ経路に乗っている)。他の敵には掛からない", () => {
    const w = soulWorld();
    const id = startHeart(w, { ...aboveCenter(w, 5), pattern: "static" });
    const mods = w.ctx.ProjectRDamageModifiers;
    shoot(w, 0, 5);
    assert.ok(runUntilHit(w, id, () => heartHp(w, id)) > 0);
    const base = HP - heartHp(w, id);
    frames(w, 30);
    // 2発目の前にHPを戻し、係数0.5を登録して追跡を有効にする
    const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id));
    bar.currentHp = bar.targetHp = HP; bar.refresh();
    assert.equal(mods.add({ id: "poc_half", kind: "damageTaken", target: "event:" + id, value: 0.5 }).ok, true);
    mods.setTracing(true); mods.clearTrace();
    shoot(w, 0, 5);
    assert.ok(runUntilHit(w, id, () => heartHp(w, id)) > 0);
    frames(w, 30);
    assert.equal(HP - heartHp(w, id), Math.round(base * 0.5), "係数が1回だけ掛かる");
    const trace = plain(mods.getTrace()).filter(t => t.type === "damage" && t.key === "event:" + id);
    assert.equal(trace.length, 1, JSON.stringify(trace));
    mods.clear(); w.poc.end("test");
});

test("矢は命中位置へ動かしたハートに当たり、外れる位置には当たらない", () => {
    const w = soulWorld();
    const c = center(w);
    const id = startHeart(w, { ...aboveCenter(w, 5), pattern: "static" });
    const lossAt = (x, y, degree, tiles) => {
        w.poc.moveHeartTo(x, y); frames(w, 2);
        const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id));
        bar.currentHp = bar.targetHp = HP; bar.refresh();
        shoot(w, degree, tiles);
        frames(w, 70);
        return HP - heartHp(w, id);
    };
    const polar = (r, degree) => [c.x + Math.sin(degree * Math.PI / 180) * r, c.y - Math.cos(degree * Math.PI / 180) * r];
    const base = lossAt(...polar(5, 0), 0, 5);
    assert.ok(base > 0);
    assert.equal(lossAt(...polar(5, 45), 45, 5), base, "斜め45度");
    assert.equal(lossAt(...polar(4, 270), 270, 4), base, "左");
    assert.equal(lossAt(...polar(5, 0), 30, 5), 0, "照準が30度ずれる(横に約2.5マス)と外れる");
    assert.equal(lossAt(...polar(5, 180), 0, 5), 0, "反対側にいるハートには当たらない");
    w.poc.end("test");
});

test("動いている最中のハートにも、位置が合う時だけ当たる(同じ発射でも、ハートの位置次第で当たる/外れる)", () => {
    const w = soulWorld();
    const c = center(w), R = 2;
    const id = startHeart(w, { ...aboveCenter(w, 5), pattern: "static" });
    const reset = () => { const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id)); bar.currentHp = bar.targetHp = HP; bar.refresh(); };
    // 矢が届くまでのframe数 F を、静止ハートで測る
    reset(); shoot(w, 0, 5);
    const F = runUntilHit(w, id, () => heartHp(w, id));
    assert.ok(F > 0 && F < 38, "矢の到達frame " + F);
    frames(w, 30);
    // 往復(中心から右向きに出発。0.05タイル/frame)。n frame後のずれ dx は n<40 で 0.05n、その後 2R-0.05n(n=80で中心)。
    const trial = arrival => {
        reset();
        w.poc.setMotion({ pattern: "patrol", rangeX: R, rangeY: 0, speed: 3, centerX: c.x, centerY: c.y - 5 });
        frames(w, arrival - F);
        const dxAtFire = w.poc.getState().hitCenter.x - c.x;
        shoot(w, 0, 5);
        frames(w, F + 20);
        return { loss: HP - heartHp(w, id), dxAtFire };
    };
    const hit = trial(80);   // 矢が届く頃にハートが中心(真上)を通る
    assert.ok(hit.loss > 0, "通る瞬間を狙うと当たる " + JSON.stringify(hit));
    assert.ok(Math.abs(hit.dxAtFire) > 0.5, "発射した時点では、ハートは真上にいない " + hit.dxAtFire);
    const miss = trial(40);  // 矢が届く頃にハートは右端(+2マス)にいる
    assert.equal(miss.loss, 0, "同じ発射でも、ハートが右端にいる間は外れる " + JSON.stringify(miss));
    w.poc.end("test");
});

test("PoC自体はHPもダメージも触らない: 開始・動き・終了の間 UpdateEventHp は呼ばれず、ハートのHPは変わらない", () => {
    const w = soulWorld();
    w.calls.length = 0;
    const id = startHeart(w, { ...aboveCenter(w, 5), pattern: "circle", rangeX: 2, rangeY: 1, speed: 4 });
    const hp0 = heartHp(w, id);
    frames(w, 120);
    assert.equal(heartHp(w, id), hp0);
    w.poc.end("test");
    assert.equal(calls(w, "UpdateEventHp").length, 0);
    assert.deepEqual(calls(w, "ControlPlayerMovement").map(c => c.args.allowMovement), ["false", "true"]);
});

test("終了後: ハート・見た目・雛形・HP保持・移動停止・戦闘登録が元に戻り、アリーナのカード戦闘は残る", () => {
    const w = soulWorld(), before = snapshot(w);
    const tilemap = w.ctx.SceneManager._scene._spriteset._tilemap, removed = [];
    tilemap.addChild = child => { child.parent = tilemap; };
    tilemap.removeChild = child => { removed.push(child); child.parent = null; };
    assert.equal(before.movementDisabled, false);
    const id = startHeart(w, { ...aboveCenter(w, 5), pattern: "patrol", rangeX: 2 });
    frames(w, 10);
    assert.equal(w.run("playerMovementDisabled"), true);
    const mid = snapshot(w);
    assert.deepEqual(mid.sources.filter(s => !before.sources.includes(s)), ["soul_poc"]);
    assert.equal(w.poc.end("test"), true);
    assert.equal(w.poc.end("again"), false, "二重終了は何もしない");
    const after = snapshot(w);
    assert.deepEqual(after, before);
    assert.equal(w.poc.isActive(), false);
    assert.ok(isGone(w, id), "ハートのEventは取り除かれた");
    assert.equal(w.ctx.$gameVariables._data["Map4_Event" + id + "_HP"], undefined);
    assert.equal(removed.filter(s => s._projectRSoulHeartPoC).length, 1, "見た目を外した");
    assert.equal(calls(w, "DestroyEvent").length, 1);
    frames(w, 60);
    assert.deepEqual(snapshot(w), before, "終了後に何も復活・増殖しない");
});

test("終了後: プレイヤーの移動(WASD)が戻り、通常の攻撃(矢・武器)のダメージもPoC前と同じ", () => {
    const w = soulWorld();
    // PoC前の基準: 移動できる / 矢のダメージ / 通常武器のダメージ
    const moveBefore = keyHold(w, "KeyD", 68, 20);
    assert.ok(moveBefore.dx > 0.3, "PoC前は右へ動ける " + moveBefore.dx);
    w.placePlayer(12, 25); frames(w, 2);
    const cc = center(w);
    placeEnemy(w, 4, cc.x, cc.y - 5); resetHp(w, [4]);
    shoot(w, 0, 5); assert.ok(runUntilHit(w, 4, () => barHp(w, 4)) > 0);
    const arrowBefore = HP - barHp(w, 4);
    frames(w, 40);
    const weaponBefore = weaponHit(w, 4);
    assert.ok(arrowBefore > 0 && weaponBefore > 0);
    // PoC中: 動けない(照準・攻撃は使える)
    const id = startHeart(w, { ...aboveCenter(w, 5), pattern: "patrol", rangeX: 2 });
    const locked = keyHold(w, "KeyD", 68, 20);
    assert.equal(locked.dx, 0, "PoC中はプレイヤーが動かない"); assert.equal(locked.dy, 0);
    w.poc.end("test");
    // PoC後
    const moveAfter = keyHold(w, "KeyD", 68, 20);
    assert.ok(moveAfter.dx > 0.3, "PoC後は再び動ける " + moveAfter.dx);
    w.placePlayer(12, 25); frames(w, 2);
    const c2 = center(w);
    placeEnemy(w, 4, c2.x, c2.y - 5); resetHp(w, [4]);
    shoot(w, 0, 5); assert.ok(runUntilHit(w, 4, () => barHp(w, 4)) > 0);
    assert.equal(HP - barHp(w, 4), arrowBefore, "矢のダメージはPoC前と同じ");
    frames(w, 40);
    assert.equal(weaponHit(w, 4), weaponBefore, "通常武器のダメージはPoC前と同じ");
    assert.ok(isGone(w, id), "ハートのEventは取り除かれた");
});

test("元から移動が止められていた場合は、PoCは止めも戻しもしない(他の機能の状態を壊さない)", () => {
    const w = soulWorld();
    const command = (allow) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "ControlPlayerMovement", { allowMovement: allow });
    command("false");
    w.calls.length = 0;
    startHeart(w, { ...aboveCenter(w, 5), pattern: "static" });
    assert.equal(w.poc.getState().lockedPlayer, false);
    w.poc.end("test");
    assert.equal(calls(w, "ControlPlayerMovement").length, 0);
    assert.equal(w.run("playerMovementDisabled"), true, "元の状態(停止)のまま");
    command("true");
});

test("外からの終了でも元に戻る: 戦闘の一括終了・ハートが消えた・マップの読み直し", () => {
    for (const how of ["endAll", "heartGone", "mapSetup"]) {
        const w = soulWorld(), before = snapshot(w);
        const id = startHeart(w, { ...aboveCenter(w, 5), pattern: "patrol", rangeX: 2 });
        frames(w, 5);
        if (how === "endAll") w.ctx.ProjectRCombatSession.end("soul_poc", "external");
        if (how === "heartGone") { w.ctx.$gameMap.event(id).erase(); frames(w, 2); }
        if (how === "mapSetup") w.ctx.$gameMap.setup(4);
        assert.equal(w.poc.isActive(), false, how);
        assert.equal(w.run("playerMovementDisabled"), false, how);
        assert.equal(w.ctx.$dataTemplateMap.events.length, before.templates, how);
        assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()), before.sources, how);
        assert.equal(w.ctx.$gameVariables._data["Map4_Event" + id + "_HP"], undefined, how);
        const log = w.poc.getLog();
        assert.equal(log.filter(e => e.type === "releaseError" || e.type === "error").length, 0, how + JSON.stringify(log));
    }
});

test("メニューなどでSpritesetが作り直されても、次のフレームで見た目を付け直す", () => {
    const w = soulWorld();
    startHeart(w, { ...aboveCenter(w, 5), pattern: "static" });
    const fresh = { children: [], added: [], addChild(child) { this.added.push(child); child.parent = this; }, removeChild() {} };
    w.ctx.SceneManager._scene._spriteset._tilemap = fresh;
    frames(w, 1);
    assert.equal(fresh.added.filter(s => s._projectRSoulHeartPoC).length, 1);
    frames(w, 5);
    assert.equal(fresh.added.length, 1, "付いていれば何度も付け直さない");
    w.poc.end("test");
});

test("開始できない条件では何も残さない: 二重開始・不正な動き・マップ以外のScene", () => {
    const w = soulWorld(), before = snapshot(w);
    assert.equal(w.poc.start({ pattern: "bogus" }).reason, "invalidPattern");
    assert.deepEqual(snapshot(w), before);
    const id = startHeart(w, { ...aboveCenter(w, 5), pattern: "static" });
    assert.equal(w.poc.start({}).reason, "alreadyActive");
    assert.equal(w.poc.end("test"), true);
    const scene = w.ctx.SceneManager._scene;
    w.ctx.SceneManager._scene = { _spriteset: {} };
    assert.equal(w.poc.start({}).reason, "mapUnavailable");
    w.ctx.SceneManager._scene = scene;
    assert.deepEqual(snapshot(w), before);
    assert.ok(id > 0);
});

console.log(`SoulBattlePoC: ${passed} tests passed`);
