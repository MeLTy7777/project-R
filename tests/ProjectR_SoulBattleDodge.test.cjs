"use strict";
// SOUL戦闘 P3-A: 基本の回避AI(ProjectR_SoulBattleDodge)と、手動テスト用サンドボックス(ProjectR_SoulBattleSandbox)の検証。
//   AI: 飛んでくる矢を「見てから」避ける(反応の遅れ・速さ・距離・クールダウン・硬直・範囲・ホームへ戻る)。入力は読まない。
//   衝突: 避ける間もGame_Eventの判定と見た目が同期。ダメージ・命中回数は回避の有無で変わらない(避けなければ従来と同じ)。
//   フェーズ: 観測は攻撃ターンだけ。動いている回避は防御に入っても最後まで。終了・マップ移動・ニューゲームで破棄。P0の往復は従来どおり。
// 実エンジン(Map004 + 全plugin)。MZは起動しない。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const vm = require("node:vm");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { buildWorld, cardWorld, player, plain, aimDegree, fireCard, center, parkOthers, attachHpBars, barHp, HP, deckApi, equip, SWORD_ID } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
const ARROW = "apollo_golden_arrow";
const HOME = { x: 30, y: 40 };
const PIXEL = 1 / 48 + 1e-9;
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
// 反応4frame・速さ12・距離1.8・クールダウン/硬直/ホーム復帰は個別のテストで指定する
const FAST = { reactionFrames: 4, moveSpeed: 12, dodgeDistance: 1.8, cooldownFrames: 0, recoveryFrames: 0, returnSpeed: 0, boundsHalfX: 4, boundsHalfY: 2.5 };

function world() {
    const w = cardWorld(ARROW, { x: HOME.x, y: HOME.y, bigMap: { width: 60, height: 60 } });
    parkOthers(w, []);
    frames(w, 150);
    w.soul = w.ctx.ProjectRSoulBattle; w.dodge = w.ctx.ProjectRSoulBattleDodge; w.poc = w.ctx.ProjectRSoulBattlePoC;
    return w;
}
const noErrors = w => {
    const bad = [...w.soul.getLog(), ...w.poc.getLog(), ...w.dodge.getLog()].filter(e => /error|Error/.test(e.type));
    assert.deepEqual(bad, [], JSON.stringify(bad));
};
const heartAt = w => w.poc.getState().hitCenter;
function startSoul(w, { dist = 10, cfg = null, attackSeconds = 600, defenseSeconds = 600, heart = {}, armFirst = true } = {}) {
    w.placePlayer(HOME.x, HOME.y); frames(w, 3);
    const c = center(w);
    if (cfg && armFirst) assert.equal(w.dodge.arm(cfg).ok, true);
    const result = w.soul.start({ attackSeconds, defenseSeconds, heart: { centerX: c.x, centerY: c.y - dist, pattern: "static", ...heart } });
    assert.equal(result.ok, true, JSON.stringify(result));
    if (cfg && !armFirst) assert.equal(w.dodge.arm(cfg).ok, true);
    const id = w.soul.getState().heart.eventId;
    attachHpBars(w, [id], HP);
    frames(w, 2);
    return id;
}
// ハートが「いま居る位置」へ矢を撃つ(狙いは撃つ時点のハートの位置。未来の入力ではなく、プレイヤー側の普通の狙い)
function shoot(w) {
    const c = center(w), h = heartAt(w);
    aimDegree(w, Math.atan2(h.x - c.x, c.y - h.y) * 180 / Math.PI, Math.hypot(h.x - c.x, c.y - h.y));
    const result = fireCard(w, ARROW);
    assert.equal(result.ok, true, JSON.stringify(result));
}
const hits = (w, id) => w.calls.filter(c => c.name === "UpdateEventHp" && String(c.args.eventId) === String(id)).length;
const lost = (w, id) => HP - barHp(w, id);
const lateral = w => Math.abs(heartAt(w).x - center(w).x);
const logOf = (w, type) => w.dodge.getLog().filter(e => e.type === type);

// ---------------------------------------------------------------- 登録・静的な安全 ----------------------------------------------------------------
test("登録と安全: 1回だけ・有効・依存の後ろ。観測する弾のタグは各スキルの定義と一致。プレイヤーの入力・手札・ダメージ・HPを読まない/扱わない。既存ファイルは変更なし", () => {
    const config = {};
    vm.runInNewContext(read("js/plugins.js"), config);
    const names = config.$plugins.map(p => p.name);
    for (const name of ["ProjectR_SoulBattleDodge", "ProjectR_SoulBattleSandbox"]) {
        const index = names.indexOf(name);
        assert.ok(index >= 0 && names.lastIndexOf(name) === index, name + " は1回だけ");
        assert.equal(config.$plugins[index].status, true);
        assert.ok(fs.existsSync(path.join(project, `js/plugins/${name}.js`)));
        const header = read(`js/plugins/${name}.js`).split("*/")[0];
        for (const dependency of [...header.matchAll(/@(?:base|orderAfter)\s+(\S+)/g)].map(m => m[1])) assert.ok(names.indexOf(dependency) >= 0 && names.indexOf(dependency) < index, `${name}: ${dependency} より後`);
    }
    assert.ok(names.indexOf("ProjectR_SoulBattleSandbox") > names.indexOf("ProjectR_SoulBattleDodge"));
    const tagOf = (file, name) => new RegExp(`const ${name} = "([^"]+)"`).exec(read(`js/plugins/${file}.js`))[1];
    const expected = [["ProjectR_ApolloGoldenArrow", "TAG"], ["ProjectR_ApolloDiseaseAttack", "TAG"], ["ProjectR_ApolloUltimate", "TAG"], ["ProjectR_GunSystem", "BULLET_TAG"],
        ["ProjectR_ApolloGoldenVolley", "TAG"], ["ProjectR_ApolloErosArrow", "TAG"], ["ProjectR_ApolloGigasSlayer", "TAG"]].map(([file, name]) => tagOf(file, name));
    expected.push(/const ARROW_TAG = "([^"]+)"/.exec(read("js/plugins/ProjectR_ApolloPlagueRain.js"))[1]);
    const w = world();
    assert.deepEqual([...w.dodge.THREAT_TAGS].sort(), expected.sort());
    for (const melee of ["<projectRNormalSword>", "<projectRHermesSword>", "<projectRHermesUltimate>"]) assert.ok(!w.dodge.THREAT_TAGS.includes(melee), "近接の斬撃は脅威として観測しない");
    const code = read("js/plugins/ProjectR_SoulBattleDodge.js").split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /TouchInput|Input\.|keyMapper|isTriggered|isPressed|screenX|screenY|requestUseCard|getBattleState|\.hand\b|reserveCommonEvent/, "プレイヤーの入力・手札・カードの選択は読まない");
    assert.doesNotMatch(code, /UpdateEventHp|setHp|\.gainHp|saveGame|StorageManager|_saveEnabled|\$gameSystem/, "ダメージ・HP・セーブ・セーブ対象は扱わない");
    const status = cp.execFileSync("git", ["status", "--porcelain"], { cwd: project, encoding: "utf8" }).split(/\r?\n/);
    for (const file of ["js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_CombatTestArena.js", "js/plugins/ProjectR_ApolloGoldenArrow.js",
        "js/plugins/ProjectR_CardDeckCore.js", "data/Skills.json", "data/Enemies.json"]) {
        assert.ok(!status.some(line => line.slice(3) === file), file + " は変更されていない");
    }
    assert.equal(w.failures.length, 0);
    assert.deepEqual([w.dodge.isArmed(), w.dodge.isActive()], [false, false], "読み込んだだけでは何も起きない(オプトイン)");
    assert.equal(w.dodge.getLog().length, 0);
});

test("arm: 範囲外・不正な値は断り何も起こさない。boundsの不正も断る。解除でき、1回のSOULだけ有効。SOULの動作中に呼べば即座に適用", () => {
    const w = world();
    for (const bad of [{ reactionFrames: -1 }, { moveSpeed: 0 }, { moveSpeed: "x" }, { dodgeDistance: 100 }, { cooldownFrames: 601 }, { margin: 3 }, { horizonFrames: 0 },
        { bounds: { minX: 5, maxX: 1, minY: 0, maxY: 1 } }, { bounds: { minX: "a" } }, { bounds: 5 }]) {
        const result = w.dodge.arm(bad);
        assert.deepEqual([result.ok, w.dodge.isArmed(), w.dodge.isActive()], [false, false, false], JSON.stringify(bad));
        assert.match(result.reason, /^invalidOption:/);
    }
    assert.equal(w.dodge.arm({}).ok, true);
    assert.equal(w.dodge.isArmed(), true);
    assert.equal(w.dodge.disarm(), true);
    assert.deepEqual([w.dodge.isArmed(), w.dodge.disarm()], [false, false]);
    // SOULの前にarm → 開始後に適用 → 終了で破棄(次のSOULには持ち越さない)
    startSoul(w, { cfg: FAST });
    assert.equal(w.dodge.isActive(), true, "armは開始の直後に適用されている");
    w.soul.end("t"); frames(w, 5);
    assert.deepEqual([w.dodge.isArmed(), w.dodge.isActive()], [false, false]);
    startSoul(w, { dist: 6 });
    frames(w, 10);
    assert.equal(w.dodge.isActive(), false, "armしていない次のSOULにAIは無い");
    // SOULの動作中にarm → すぐ適用
    const applied = w.dodge.arm(FAST);
    assert.equal(applied.applied, true);
    assert.equal(w.dodge.isActive(), true);
    assert.equal(w.dodge.getState().config.reactionFrames, 4);
    w.soul.end("t");
    noErrors(w);
});

// ---------------------------------------------------------------- 回避の基本 ----------------------------------------------------------------
test("回避: 見てから避けて矢が外れる(被弾0)。遅い反応では当たり、ダメージ・命中回数は回避AIが無いときと同じ。回避した向きは矢の進行方向に直角で、動いた距離は回避距離", () => {
    const w = world();
    // 基準: AIなし
    let id = startSoul(w, {});
    w.calls.length = 0; shoot(w); frames(w, 90);
    const baseline = { loss: lost(w, id), calls: hits(w, id) };
    assert.deepEqual([baseline.loss > 0, baseline.calls], [true, 1], "AIなしは当たる");
    w.soul.end("t"); frames(w, 30);
    // 速い反応: 避ける
    id = startSoul(w, { cfg: FAST });
    const home = { ...heartAt(w) };
    w.calls.length = 0; shoot(w);
    const states = [];
    let extreme = 0;
    for (let i = 0; i < 90; i++) { w.frames(1); const s = w.dodge.getState(); if (states[states.length - 1] !== s.state) states.push(s.state); extreme = Math.max(extreme, Math.abs(heartAt(w).x - home.x)); }
    assert.equal(lost(w, id), 0, "避けた");
    assert.equal(hits(w, id), 0);
    assert.deepEqual(states, ["idle", "dodging", "idle"], "idle → dodging → idle(硬直0)");
    assert.ok(Math.abs(extreme - 1.8) < 0.03, "動いた距離は回避距離 " + extreme);
    assert.ok(Math.abs(heartAt(w).y - home.y) < 0.03, "矢の進行方向(縦)には動かない=直角へ避けた");
    const stats = w.dodge.getStats();
    assert.deepEqual([stats.dodges, stats.noticed, stats.hitsTaken], [1, 1, 0]);
    w.soul.end("t"); frames(w, 30);
    // 遅い反応: 間に合わず当たる。ダメージ・回数は基準と同じ
    id = startSoul(w, { cfg: { ...FAST, reactionFrames: 60 } });
    w.calls.length = 0; shoot(w); frames(w, 90);
    assert.deepEqual([lost(w, id), hits(w, id)], [baseline.loss, baseline.calls], "避けられなければ従来どおりのダメージ・1回");
    assert.equal(w.dodge.getStats().dodges, 0);
    assert.equal(w.dodge.getStats().hitsTaken, 1, "被弾を記録(診断のみ)");
    w.soul.end("t");
    noErrors(w);
});

test("設定が効く: 反応の遅れ(frame差=設定差)・回避の速さ(所要frame)・回避距離(動いた距離)。同じ矢で比べる", () => {
    const w = world();
    const run = overrides => {
        const id = startSoul(w, { cfg: { ...FAST, ...overrides } });
        const home = { ...heartAt(w) };
        shoot(w); frames(w, 80);
        const start = logOf(w, "dodgeStart").at(-1), end = logOf(w, "dodgeEnd").at(-1);
        const result = { startFrame: start?.frame, duration: end && start ? end.frame - start.frame : null, moved: Math.abs(heartAt(w).x - home.x), loss: lost(w, id) };
        w.soul.end("t"); frames(w, 30);
        w.dodge.disarm();
        return result;
    };
    const r4 = run({ reactionFrames: 4 }), r10 = run({ reactionFrames: 10 });
    assert.equal(r10.startFrame - r4.startFrame, 6, "反応の遅れの差 = 設定の差 " + JSON.stringify([r4, r10]));
    const slow = run({ moveSpeed: 6 }), fast = run({ moveSpeed: 12 });
    assert.equal(fast.duration, Math.ceil(1.8 / (12 / 60)), "速さ12: " + fast.duration);
    assert.equal(slow.duration, Math.ceil(1.8 / (6 / 60)), "速さ6: " + slow.duration);
    const near = run({ dodgeDistance: 1.0 }), far = run({ dodgeDistance: 2.6 });
    assert.ok(Math.abs(near.moved - 1.0) < 0.03 && Math.abs(far.moved - 2.6) < 0.03, JSON.stringify([near.moved, far.moved]));
    assert.equal(near.loss + far.loss, 0, "1.0でも十分に避けられる");
    noErrors(w);
});

test("クールダウンと硬直: 回避の直後に別の矢が来ても、クールダウン中・硬直中は避けられず当たる(見送りとして記録)。0にすれば連続で避ける", () => {
    const w = world();
    const second = overrides => {
        const id = startSoul(w, { cfg: { ...FAST, ...overrides } });
        shoot(w); frames(w, 22);                         // 1本目は避け終わっている(反応4+移動9frame)
        assert.ok(w.dodge.getStats().dodges >= 1);
        w.calls.length = 0;
        shoot(w); frames(w, 90);                         // 避けた先のハートへ2本目
        const result = { loss: lost(w, id), stats: w.dodge.getStats() };
        w.soul.end("t"); frames(w, 40);
        return result;
    };
    const free = second({});
    assert.deepEqual([free.loss, free.stats.dodges], [0, 2], "クールダウン0・硬直0なら2本とも避ける " + JSON.stringify(free));
    const recovering = second({ recoveryFrames: 90 });
    assert.ok(recovering.loss > 0 && recovering.stats.skippedRecovery >= 1 && recovering.stats.dodges === 1, "硬直中は避けられない " + JSON.stringify(recovering));
    const cooling = second({ cooldownFrames: 200 });
    assert.ok(cooling.loss > 0 && cooling.stats.skippedCooldown >= 1 && cooling.stats.dodges === 1, "クールダウン中は避けられない " + JSON.stringify(cooling));
    noErrors(w);
});

test("ホームへ戻る: 脅威が無く静かなら、ゆっくり開始位置へ戻る(ReturnSpeed)。0なら戻らない", () => {
    const w = world();
    const run = returnSpeed => {
        startSoul(w, { cfg: { ...FAST, returnSpeed } });
        const home = { ...heartAt(w) };
        shoot(w); frames(w, 120);
        const away = Math.hypot(heartAt(w).x - home.x, heartAt(w).y - home.y);
        w.soul.end("t"); frames(w, 30);
        return away;
    };
    assert.ok(run(3) < 0.05, "戻る");
    assert.ok(Math.abs(run(0) - 1.8) < 0.05, "戻らない");
});

// ---------------------------------------------------------------- 範囲・同期 ----------------------------------------------------------------
test("動ける範囲: 範囲が狭く余白を作れないときは避けず(noRoom)当たる。続けて何本撃っても範囲の外へ出ない。マップの外へも出ない", () => {
    const w = world();
    const id = startSoul(w, { cfg: { ...FAST, boundsHalfX: 0.4, boundsHalfY: 0.4 } });
    shoot(w); frames(w, 90);
    assert.ok(lost(w, id) > 0 && w.dodge.getStats().noRoom >= 1 && w.dodge.getStats().dodges === 0, "余白を作れないので避けない " + JSON.stringify(w.dodge.getStats()));
    w.soul.end("t"); frames(w, 30);
    // 範囲内で何本も避ける
    const wide = world();
    const sid = startSoul(wide, { cfg: { ...FAST, boundsHalfX: 2.2, boundsHalfY: 1 } });
    const home = { ...heartAt(wide) };
    let worst = 0, y = 0;
    for (let i = 0; i < 5; i++) {
        shoot(wide);
        for (let f = 0; f < 50; f++) { wide.frames(1); worst = Math.max(worst, Math.abs(heartAt(wide).x - home.x)); y = Math.max(y, Math.abs(heartAt(wide).y - home.y)); }
    }
    assert.ok(worst <= 2.2 + 0.03 && y <= 1 + 0.03, `範囲内 ${worst} ${y}`);
    assert.ok(wide.dodge.getStats().dodges >= 2, "範囲内で複数回避けた " + JSON.stringify(wide.dodge.getStats()));
    void sid;
    // マップの端: ホームがマップ端でも外へ出ない
    wide.soul.end("t"); frames(wide, 30);
    wide.placePlayer(2, 2); frames(wide, 3);
    wide.soul.start({ heart: { centerX: 1, centerY: 1, pattern: "static" } });
    wide.dodge.arm({ ...FAST, boundsHalfX: 6, boundsHalfY: 6 });
    frames(wide, 5);
    const b = wide.dodge.getState().bounds;
    assert.ok(b.minX >= 0.5 && b.minY >= 0.5, "動ける範囲はマップの内側 " + JSON.stringify(b));
    wide.soul.end("t");
    noErrors(w); noErrors(wide);
});

test("衝突の同期: 避けている間も毎フレーム、Game_Eventの判定の中心・多角形の重心・見た目のSpriteが一致する(1ピクセル以内)", () => {
    const w = world();
    const id = startSoul(w, { cfg: FAST });
    shoot(w);
    const occ = w.ctx.ProjectR.CombatOcclusion;
    let moved = 0, checked = 0, prev = { ...heartAt(w) };
    for (let i = 0; i < 80; i++) {
        w.frames(1);
        const state = w.poc.getState(), polygon = occ.eventPolygon(w.ctx.$gameMap.event(id));
        const px = polygon.reduce((s, p) => s + p.x, 0) / polygon.length, py = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
        assert.ok(Math.abs(px - state.hitCenter.x) <= PIXEL && Math.abs(py - state.hitCenter.y) <= PIXEL, `判定の多角形と中心 ${i}`);
        if (state.sprite) {
            const sx = Math.round(w.ctx.$gameMap.adjustX(state.hitCenter.x) * w.ctx.$gameMap.tileWidth()), sy = Math.round(w.ctx.$gameMap.adjustY(state.hitCenter.y) * w.ctx.$gameMap.tileHeight());
            assert.ok(Math.abs(state.sprite.x - sx) <= 1 && Math.abs(state.sprite.y - sy) <= 1, `見た目の位置 ${i}`);
            checked++;
        }
        if (Math.hypot(state.hitCenter.x - prev.x, state.hitCenter.y - prev.y) > 0.01) moved++;
        prev = { ...state.hitCenter };
    }
    assert.ok(moved >= 5, "実際に動いた " + moved);
    assert.ok(checked >= 70, "見た目も毎フレーム確認 " + checked);
    w.soul.end("t");
    noErrors(w);
});

// ---------------------------------------------------------------- ダメージ・命中・入力を読まない ----------------------------------------------------------------
test("近接の斬撃は避けられず(出た瞬間に当たる)、ダメージ・命中回数は回避AIが無いときと同じ。P2-Cの延長もそのまま働く", () => {
    const w = world();
    equip(w, SWORD_ID); frames(w, 3);
    const swing = id => { aimDegree(w, 0, 5); w.calls.length = 0; w.attackClick(); frames(w, 40); return { loss: lost(w, id), calls: hits(w, id) }; };
    let id = startSoul(w, { dist: 5 });
    const without = swing(id);
    w.soul.end("t"); frames(w, 30);
    id = startSoul(w, { dist: 5, cfg: { ...FAST, reactionFrames: 0 } });
    const withAi = swing(id);
    assert.deepEqual(withAi, without, "AIありでも同じ");
    assert.ok(without.loss > 0 && without.calls === 1);
    assert.equal(w.dodge.getStats().dodges, 0, "斬撃は観測できる脅威ではない");
    w.soul.end("t");
    noErrors(w);
});

test("入力を読まない: マウスをどう動かしても、ハートを狙っても、矢が出るまで回避AIは何もしない。矢が出てから、反応の遅れの後に動く", () => {
    const w = world();
    startSoul(w, { cfg: FAST });
    const start = { ...heartAt(w) };
    for (let i = 0; i < 150; i++) { aimDegree(w, i < 60 ? 0 : (i * 37) % 360, i < 60 ? 10 : 3 + (i % 8)); w.frames(1); }   // 最初はハートの真上を狙い続け、その後は大きく動かす
    assert.deepEqual([w.dodge.getStats().noticed, w.dodge.getStats().dodges, w.dodge.getState().threats.length], [0, 0, 0], "矢が無ければ何も起きない");
    assert.ok(Math.hypot(heartAt(w).x - start.x, heartAt(w).y - start.y) < 0.02, "狙っただけでは動かない");
    shoot(w);                                             // 矢が出る
    const frameOfShot = w.dodge.getState().frame;
    frames(w, 40);
    assert.equal(w.dodge.getStats().dodges, 1, "矢が出てから避ける");
    assert.ok(logOf(w, "dodgeStart")[0].frame - frameOfShot >= FAST.reactionFrames, "反応の遅れを守る");
    w.soul.end("t");
    noErrors(w);
});

// ---------------------------------------------------------------- フェーズ ----------------------------------------------------------------
test("フェーズ境界: 避け始めた回避は防御に入っても最後まで動く。防御に入るまでに気づけなかった矢は避けられず、防御中に当たる(ダメージ1回)。観測は攻撃ターンだけ", () => {
    const w = world();
    // 気づく前に防御へ: 反応の遅れ4frameより短い間に防御へ移る
    let id = startSoul(w, { cfg: FAST, attackSeconds: 1, defenseSeconds: 600 });
    while (w.soul.getState().framesLeft > 3) w.frames(1);
    w.calls.length = 0; shoot(w);
    frames(w, 3);
    assert.equal(w.soul.getPhase(), "defense");
    frames(w, 90);
    assert.equal(w.dodge.getStats().dodges, 0, "防御中は新しく避け始めない");
    assert.equal(w.dodge.getState().threats.length, 0, "防御中は脅威を観測しない");
    assert.ok(lost(w, id) > 0 && hits(w, id) === 1, "発動済みの矢は防御中に当たる(1回)");
    assert.ok(logOf(w, "defenseEnter").length >= 1);
    w.soul.end("t"); frames(w, 40);
    // 避け始めた後に防御へ: 動きは最後まで続く
    id = startSoul(w, { cfg: FAST, attackSeconds: 1, defenseSeconds: 600 });
    const home = { ...heartAt(w) };
    while (w.soul.getState().framesLeft > 8) w.frames(1);
    w.calls.length = 0; shoot(w);
    let dodgeStarted = -1;
    for (let i = 0; i < 12 && dodgeStarted < 0; i++) { w.frames(1); if (w.dodge.getState().state === "dodging") dodgeStarted = i; }
    assert.ok(dodgeStarted >= 0 && w.soul.getPhase() === "attack", "攻撃ターンのうちに避け始めた");
    frames(w, 5);
    assert.equal(w.soul.getPhase(), "defense", "避けている途中で防御へ");
    frames(w, 60);
    assert.ok(Math.abs(Math.abs(heartAt(w).x - home.x) - 1.8) < 0.03, "防御に入っても最後まで動いた");
    assert.equal(lost(w, id), 0);
    assert.equal(w.dodge.getState().state, "idle");
    w.soul.end("t");
    noErrors(w);
});
test("フェーズ境界: 防御から攻撃へ戻ると、新しい矢をまた観測して避ける(観測はやり直し)", () => {
    const w = world();
    const id = startSoul(w, { cfg: FAST, attackSeconds: 1, defenseSeconds: 1 });
    frames(w, 70);                                       // 攻撃1秒を過ぎて防御ターンに入る
    assert.equal(w.soul.getPhase(), "defense");
    while (!(w.soul.getPhase() === "attack" && w.soul.getState().framesLeft >= 50)) w.frames(1);   // 2ラウンド目の攻撃ターンに入ったばかり
    assert.equal(w.soul.getState().round, 2);
    w.calls.length = 0; shoot(w); frames(w, 45);
    assert.equal(lost(w, id), 0, "2ラウンド目でも避ける");
    assert.equal(w.dodge.getStats().dodges, 1);
    w.soul.end("t");
    noErrors(w);
});

// ---------------------------------------------------------------- 後始末・P0の維持 ----------------------------------------------------------------
test("復元: 避けている最中に終了・マップ読み直し・ニューゲームしても、AIの状態は残らない。arm しただけで始めなかった設定も破棄される。終了後にハートも残らない", () => {
    const exits = {
        end: w => w.soul.end("t"),
        mapSetup: w => w.ctx.$gameMap.setup(4),
        sceneChange: w => { w.ctx.SceneManager.goto(class FakeScene {}); w.ctx.SceneManager._nextScene = null; },
        heartGone: w => { w.ctx.$gameMap.event(w.soul.getState().heart.eventId).erase(); frames(w, 2); }
    };
    for (const [name, exit] of Object.entries(exits)) {
        const w = world();
        const id = startSoul(w, { cfg: FAST });
        shoot(w); frames(w, 8);
        assert.equal(w.dodge.getState().state, "dodging", name);
        exit(w); frames(w, 3);
        assert.deepEqual([w.dodge.isActive(), w.dodge.isArmed(), w.soul.getPhase(), w.poc.isActive()], [false, false, "idle", false], name);
        const gone = !w.ctx.$gameMap.event(id) || w.ctx.$gameMap.event(id)._erased;
        assert.ok(gone || name === "mapSetup", name + " ハートのEventが残らない");
        frames(w, 30);
        assert.equal(w.dodge.getState().active, false, name + " 再開しない");
        noErrors(w);
    }
    const w = world();
    w.dodge.arm(FAST);                                   // SOULを始めないまま
    assert.equal(w.dodge.isArmed(), true);
    w.ctx.$gameMap.setup(4);
    assert.equal(w.dodge.isArmed(), false, "マップの読み直しで破棄");
    w.dodge.arm(FAST);
    w.ctx.DataManager._globalInfo = [];
    w.ctx.DataManager.setupNewGame();
    assert.equal(w.dodge.isArmed(), false, "ニューゲームで破棄");
    assert.equal(w.dodge.disarm(), false);
});

test("P0の往復ハートは従来どおり(回避AIなし): armしなければ往復し、矢が来ても避けない。AIありの後でも往復に戻る", () => {
    const w = world();
    const patrol = { heart: { pattern: "patrol", rangeX: 3, speed: 2 } };
    const span = () => { let lo = Infinity, hi = -Infinity; for (let i = 0; i < 360; i++) { w.frames(1); const x = heartAt(w).x; lo = Math.min(lo, x); hi = Math.max(hi, x); } return hi - lo; };
    const id = startSoul(w, { dist: 8, ...patrol });
    assert.equal(w.dodge.isActive(), false);
    const normalSpan = span();
    assert.ok(Math.abs(normalSpan - 6) < 0.2, "±3マスを往復 " + normalSpan);
    // 矢が飛んでいても、AIは何もしない(往復の動きだけ)
    w.calls.length = 0; shoot(w); frames(w, 60);
    assert.equal(w.dodge.getStats(), null);
    assert.ok(w.poc.getState().pattern === "patrol", "PoCの動きは往復のまま");
    w.soul.end("t"); frames(w, 30);
    // AIありのSOULを挟んだ後も、往復は従来どおり
    startSoul(w, { dist: 8, cfg: FAST }); frames(w, 20); w.soul.end("t"); frames(w, 30);
    startSoul(w, { dist: 8, ...patrol });
    assert.ok(Math.abs(span() - 6) < 0.2, "AIの後でも往復");
    assert.equal(w.poc.getState().pattern, "patrol");
    w.soul.end("t");
    void id;
    noErrors(w);
});

// ---------------------------------------------------------------- サンドボックス(手動テスト用) ----------------------------------------------------------------
test("サンドボックス: Playtestでなければ何も作らない(グローバルAPIも無い)", () => {
    const sandbox = {};
    vm.runInNewContext(read("js/plugins/ProjectR_SoulBattleSandbox.js"), { window: sandbox, Utils: { isOptionValid: () => false }, console: { log() {} } });
    assert.equal(sandbox.ProjectRSoulSandbox, undefined);
    const code = read("js/plugins/ProjectR_SoulBattleSandbox.js").split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /UpdateEventHp|requestUseCard|reserveCommonEvent|saveGame/, "戦闘ロジックは持たない");
});

test("サンドボックス: 1コマンドで アリーナ・カード戦闘・SOUL戦闘・回避AI が揃い、シナリオを切り替えられ、状態を表示でき、1コマンドで元に戻る", () => {
    const w = buildWorld();
    assert.equal(w.failures.length, 0);
    w.enterMap(4, 25, 26); frames(w, 5);
    const sb = w.ctx.ProjectRSoulSandbox, d = w.ctx.ProjectRSoulBattleDodge, soul = w.ctx.ProjectRSoulBattle;
    assert.deepEqual([...sb.SCENARIOS].slice(0, 5), ["dodge", "dodgeFast", "dodgeSlow", "patrol", "static"], "P3-Aのシナリオは先頭にそのまま残る(P3-Bで末尾に追加)");
    const dummiesBefore = w.ctx.$gameMap.events().filter(e => e && !e.isSpawnEvent && e.event()?.note?.includes("<enemy>")).map(e => [e.eventId(), e._realX, e._realY]);
    const weaponBefore = w.ctx.$gameParty.leader().equips()[0]?.id || 0;
    const sourcesBefore = plain(w.ctx.ProjectRCombatSession.sources());
    // 準備の前の失敗は何も変えない
    assert.equal(plain(sb.start("nonsense")).ok, false);
    assert.equal(soul.isActive(), false);
    const result = plain(sb.start());
    assert.equal(result.ok, true, JSON.stringify(result));
    frames(w, 30);
    assert.deepEqual([soul.isActive(), d.isActive(), deckApi(w).isCardBattleActive(), w.run("playerMovementDisabled")], [true, true, true, true]);
    assert.equal(w.ctx.ProjectRCombatTestArena.status().scenario, "apollo");
    assert.deepEqual([w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY], [12, 25], "広間の定位置");
    assert.deepEqual(plain(deckApi(w).getBattleState().hand.map(h => h.cardId)).slice(0, 3), ["apollo_golden_arrow", "apollo_plague_attack", "hermes_sword_attack"], "Q/E/X が使えるカード");
    const st = plain(sb.status());
    assert.equal(st.phase, "attack");
    assert.equal(st.dodge.state, "idle");
    assert.ok(st.heart && st.heart.hp > 0 && st.heart.damageTaken === 0);
    // 邪魔なダミーは遠くへ
    for (const e of w.ctx.$gameMap.events()) if (e && !e.isSpawnEvent && e.event()?.note?.includes("<enemy>")) assert.ok(e._realX > 40 || e._realY < 5, "ダミーは遠くへ");
    // シナリオ切替: patrolはAIなし
    assert.equal(plain(sb.start("patrol")).ok, true);
    frames(w, 10);
    assert.deepEqual([d.isActive(), soul.isActive(), w.ctx.ProjectRSoulBattlePoC.getState().pattern], [false, true, "patrol"]);
    assert.equal(plain(sb.start("dodgeFast")).ok, true);
    frames(w, 5);
    assert.equal(d.getState().config.reactionFrames, 3);
    assert.equal(sb.weapon("sword").ok, true);
    assert.equal(w.ctx.$gameParty.leader().equips()[0].id, 2);
    assert.equal(sb.weapon("bogus").ok, false);
    // 攻撃が通る(矢を撃つとHPが減る=サンドボックスの設定で実際に当てられる): 回避AIなしのstaticで確認
    const staticRun = plain(sb.start("static"));
    assert.equal(staticRun.ok, true);
    frames(w, 5);
    attachHpBars(w, [staticRun.heartEventId], HP);       // 描画なしのハーネス用(本番はEventHpBarが同じ役目)
    aimDegree(w, 0, 6);
    assert.equal(plain(deckApi(w).requestUseCard(0)).ok, true);
    frames(w, 60);
    assert.ok(barHp(w, staticRun.heartEventId) < HP, "サンドボックスの矢がハートに当たる");
    // 1コマンドの後始末
    const stopped = plain(sb.stop());
    assert.equal(stopped.ok, true, JSON.stringify(stopped));
    frames(w, 5);
    assert.deepEqual([soul.isActive(), d.isActive(), d.isArmed(), deckApi(w).isCardBattleActive(), w.run("playerMovementDisabled"), plain(w.ctx.ProjectRCombatSession.sources())],
        [false, false, false, false, false, sourcesBefore]);
    assert.equal(w.ctx.$gameParty.leader().equips()[0]?.id || 0, weaponBefore, "武器が元に戻る");
    for (const [id, x, y] of dummiesBefore) assert.deepEqual([w.ctx.$gameMap.event(id)._realX, w.ctx.$gameMap.event(id)._realY], [x, y], "ダミーが元の位置");
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), true);
});

test("サンドボックス: アリーナの外から start() すると、アリーナへ移動してから自動で準備する(到着後に続行)", () => {
    const w = buildWorld();
    w.enterMap(5, 5, 5); frames(w, 5);
    const sb = w.ctx.ProjectRSoulSandbox;
    const result = plain(sb.start("dodge"));
    assert.deepEqual([result.ok, result.pending], [true, true], "アリーナへ移動を要求");
    assert.equal(w.ctx.ProjectRSoulBattle.isActive(), false, "到着するまでは始めない");
    // 到着を模す(マップ4へ入る)。続きは到着後の数フレームで自動実行される。
    w.enterMap(4, 25, 26);
    frames(w, 10);
    assert.equal(w.ctx.ProjectRSoulBattle.isActive(), true, "到着後に自動で準備された");
    assert.equal(w.ctx.ProjectRSoulBattleDodge.isActive(), true);
    sb.stop(); frames(w, 5);
    assert.equal(w.ctx.ProjectRSoulBattle.isActive(), false);
});

console.log(`\n${passed} tests passed`);
