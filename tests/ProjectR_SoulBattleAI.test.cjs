"use strict";
// SOUL戦闘 P3-B: 回避AI(ProjectR_SoulBattleDodge v0.2 + ProjectR_SoulBattleAIData)の検証。
//   複数弾(同時・追尾)の危険度評価と回避先の選択 / 近接(出ている判定・手がかりの無い攻撃) / 性格 / フェイント / ボス(データ駆動・弱点) /
//   フェーズ境界 / 実行時間の安全装置 / ダメージの一貫性 / 後始末。実エンジン(全plugin)。MZは起動しない。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const vm = require("node:vm");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { cardWorld, player, plain, aimDegree, fireCard, center, parkOthers, attachHpBars, barHp, HP, equip, SWORD_ID } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
const ARROW = "apollo_golden_arrow";
const HOME = { x: 30, y: 40 };
const PIXEL = 1 / 48 + 1e-9;
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
// 他の要素を排して挙動を見るための設定(硬直・クールダウン・戻りは0)
const BASE = { reactionFrames: 4, moveSpeed: 12, dodgeDistance: 1.8, cooldownFrames: 0, recoveryFrames: 0, returnSpeed: 0, boundsHalfX: 4, boundsHalfY: 2.5 };

function world(card = ARROW, extra = {}) {
    const w = cardWorld(card, { x: HOME.x, y: HOME.y, bigMap: { width: 60, height: 60 }, ...extra });
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
function startSoul(w, { dist = 10, cfg = null, attackSeconds = 600, defenseSeconds = 600, heart = {} } = {}) {
    w.placePlayer(HOME.x, HOME.y); frames(w, 3);
    const c = center(w);
    if (cfg) { const armed = w.dodge.arm(cfg); assert.equal(armed.ok, true, JSON.stringify(armed)); }
    const result = w.soul.start({ attackSeconds, defenseSeconds, heart: { centerX: c.x, centerY: c.y - dist, pattern: "static", ...heart } });
    assert.equal(result.ok, true, JSON.stringify(result));
    const id = w.soul.getState().heart.eventId;
    attachHpBars(w, [id], HP);
    frames(w, 2);
    return id;
}
function aimAtHeart(w) {
    const c = center(w), h = heartAt(w);
    aimDegree(w, Math.atan2(h.x - c.x, c.y - h.y) * 180 / Math.PI, Math.hypot(h.x - c.x, c.y - h.y));
}
function shoot(w, card = ARROW) { aimAtHeart(w); const r = fireCard(w, card); assert.equal(r.ok === true || r.reason === "pending", true, JSON.stringify(r)); return r; }
const hits = (w, id) => w.calls.filter(c => c.name === "UpdateEventHp" && String(c.args.eventId) === String(id)).length;
const lost = (w, id) => HP - barHp(w, id);
const logOf = (w, type) => w.dodge.getLog().filter(e => e.type === type);
const settle = (w, n = 200) => { w.soul.end("t"); w.dodge.disarm(); frames(w, n); };
const arrowEvents = w => w.ctx.$gameMap.events().filter(e => e && !e._erased && e.event()?.note?.includes("<projectRGoldenArrow>"));
const damageCommand = (w, id, amount) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp",
    { eventId: String(id), value: `-${amount}`, exceedMaxHealth: "false" });

// ---------------------------------------------------------------- 登録・データ・静的な安全 ----------------------------------------------------------------
test("登録とデータ: AIData は Dodge の後ろに1回だけ。性格5種とdev_bossが登録され、全て検証を通る。CUESは未対応(薙ぎ払い・一閃・予備動作)を明示している", () => {
    const config = {};
    vm.runInNewContext(read("js/plugins.js"), config);
    const names = config.$plugins.map(p => p.name);
    const index = names.indexOf("ProjectR_SoulBattleAIData");
    assert.ok(index > names.indexOf("ProjectR_SoulBattleDodge") && names.lastIndexOf("ProjectR_SoulBattleAIData") === index);
    assert.equal(config.$plugins[index].status, true);
    assert.ok(names.indexOf("ProjectR_SoulBattleSandbox") > index);
    const w = world();
    assert.equal(w.failures.length, 0);
    assert.deepEqual(plain(w.dodge.listProfiles()).sort(), ["aggressive", "balanced", "beginner", "boss", "evasive"]);
    assert.deepEqual(plain(w.dodge.listBosses()), ["dev_boss"]);
    for (const id of w.dodge.listProfiles()) assert.equal(w.dodge.arm({ profile: id }).ok, true, id);
    w.dodge.disarm();
    assert.equal(w.dodge.arm({ boss: "dev_boss" }).ok, true);
    w.dodge.disarm();
    const cues = plain(w.dodge.CUES);
    for (const key of ["issen", "windup", "beamLv3", "erosBeamFragment", "plagueRat"]) assert.equal(cues[key].supported, false, key + " は未対応と明示");
    assert.equal(cues.sweep.supported, "partial", "薙ぎ払いは専用ステージの見えている扇だけ観測できる(partial)");
    assert.match(cues.sweep.note, /専用ステージ/, "対応範囲(専用ステージだけ)を明示");
    assert.equal(plain(w.dodge.getBoss("dev_boss")).frameworkBossId, "dev_boss_soul", "dev_boss はSOULのハートに結び付けるボスを指す");
    for (const key of ["projectile", "volley", "homing", "directionChange"]) assert.equal(cues[key].supported, true, key);
    for (const key of ["swordArea", "swordCardArea", "hermesUltimateArea", "canceledAttack", "bossFramework"]) assert.equal(cues[key].supported, "partial", key);
    assert.deepEqual([...w.dodge.MELEE_TAGS], ["<projectRNormalSword>", "<projectRHermesSword>", "<projectRHermesUltimate>"]);
    // 近接のタグは各スキルの定義と一致
    const tagOf = file => /const TAG = "([^"]+)"/.exec(read(`js/plugins/${file}.js`))[1];
    assert.deepEqual([...w.dodge.MELEE_TAGS].sort(), ["ProjectR_SwordSystem", "ProjectR_HermesSwordsmanship", "ProjectR_HermesUltimate"].map(tagOf).sort());
});

test("安全: AI・データのコードは入力・手札・ダメージ・HP・セーブを扱わない。性格とボスのデータは数値の表だけで、スキルのデータや既存プラグインは変更されていない", () => {
    for (const file of ["ProjectR_SoulBattleDodge", "ProjectR_SoulBattleAIData"]) {
        const code = read(`js/plugins/${file}.js`).split("*/").slice(1).join("*/");
        assert.doesNotMatch(code, /TouchInput|Input\.|keyMapper|isTriggered|isPressed|screenX|screenY|requestUseCard|getBattleState|\.hand\b|reserveCommonEvent/, file + ": 入力・手札を読まない");
        assert.doesNotMatch(code, /UpdateEventHp|setHp|\.gainHp|saveGame|StorageManager|_saveEnabled|\$gameSystem|\$gameParty|\$dataSkills|\$dataWeapons/, file + ": ダメージ・保存・スキルのデータは扱わない");
    }
    const data = read("js/plugins/ProjectR_SoulBattleAIData.js").split("*/").slice(1).join("*/");
    assert.doesNotMatch(data, /function\s*\(|\.damage|\.cooldown\b|\.formula|\bswitch\b|\bwhile\b/, "データのファイルにロジックを持たない(登録の呼び出しと数値の表だけ)");
    assert.deepEqual([...new Set([...data.matchAll(/dodge\.(\w+)\(/g)].map(m => m[1]))].sort(), ["registerBoss", "registerProfile"]);
    const status = cp.execFileSync("git", ["status", "--porcelain"], { cwd: project, encoding: "utf8" }).split(/\r?\n/);
    for (const file of ["js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_BossFramework.js", "js/plugins/ProjectR_CombatTestArena.js", "js/plugins/ProjectR_EnemyAttack.js",
        "js/plugins/ProjectR_HermesSweep.js", "js/plugins/ProjectR_HermesIssen.js", "js/plugins/ProjectR_HermesUltimate.js", "js/plugins/ProjectR_HermesSwordsmanship.js",
        "js/plugins/ProjectR_ApolloGoldenArrow.js", "js/plugins/ProjectR_ApolloGoldenVolley.js", "js/plugins/ProjectR_CardDeckCore.js", "data/Skills.json", "data/Enemies.json", "data/Weapons.json"]) {
        assert.ok(!status.some(line => line.slice(3) === file), file + " は変更されていない");
    }
});

test("registerProfile / registerBoss: 不正なID・範囲外の値・列挙外・不正なフェーズや弱点は断る。正しいものは登録でき、AIは名前で適用する(データ駆動)", () => {
    const w = world();
    const d = w.dodge;
    for (const [id, data] of [["bad id!", {}], ["", {}], [5, {}], ["x", { reactionFrames: -1 }], ["x", { moveSpeed: 0 }], ["x", { preferredSide: "up" }], ["x", { hitReaction: "yes" }], ["x", { dodgeFrequency: 2 }]]) {
        assert.equal(d.registerProfile(id, data).ok, false, JSON.stringify([id, data]));
    }
    assert.equal(d.registerProfile("test_prof", { reactionFrames: 3, preferredSide: "left", hitReaction: true, dodgeFrequency: 0.25, junkKey: 99 }).ok, true, "未知のキーは無視");
    assert.equal(d.getProfile("test_prof").data.junkKey, undefined);
    assert.equal(d.arm({ profile: "test_prof" }).config.reactionFrames, 3);
    assert.equal(d.arm({ profile: "test_prof", reactionFrames: 9 }).config.reactionFrames, 9, "個別の指定が最優先");
    d.disarm();
    assert.equal(d.arm({ profile: "nope" }).reason, "invalidOption:profile");
    assert.equal(d.arm({ boss: "nope" }).reason, "invalidOption:boss");
    assert.equal(d.isArmed(), false, "失敗したarmは何も残さない");
    const goodBoss = { id: "test_boss", profile: "boss", phases: [{ id: "p2", hpRatio: 0.5, overrides: { moveSpeed: 20 } }], weakness: { exhaustAfterDodges: 2, exhaustFrames: 30 } };
    assert.equal(d.registerBoss(goodBoss).ok, true);
    for (const bad of [{ ...goodBoss, id: "b ad" }, { ...goodBoss, profile: "nope" }, { ...goodBoss, phases: [{ hpRatio: 2 }] }, { ...goodBoss, phases: [{ hpRatio: 0.5, overrides: { moveSpeed: -1 } }] },
        { ...goodBoss, weakness: { exhaustAfterDodges: -1 } }, { ...goodBoss, weakness: { staggerFrames: "x" } }, { ...goodBoss, overrides: { reactionFrames: 999 } }]) {
        assert.equal(d.registerBoss({ ...bad, id: bad.id === "b ad" ? bad.id : "test_boss_bad" }).ok, false, JSON.stringify(bad).slice(0, 80));
    }
    assert.equal(d.arm({ boss: "test_boss" }).config.boss, "test_boss");
    d.disarm();
});

// ---------------------------------------------------------------- 複数の脅威: 純粋な評価(simulate) ----------------------------------------------------------------
const arrow = (x, y, extra = {}) => ({ pos: { x, y }, vel: { x: 0, y: -0.3 }, w: 0.3, h: 0.3, ...extra });
const SIM = { config: { moveSpeed: 12, dodgeDistance: 1.8, boundsHalfX: 4, boundsHalfY: 2.5 }, heart: { center: { x: 0, y: 0 } }, pos: { x: 0, y: 0 } };

test("複数弾の回避先: 危険が最も低い所を選ぶ。片側が別の弾で塞がれていれば、好む向きより安全な側を優先する(同条件なら結果は決定的)", () => {
    const d = world().dodge;
    // 弾が (0) と (+1.6) の2本: 右へ避けると +1.6 の弾に当たる。左(-)だけが安全。
    const base = { ...SIM, threats: [arrow(0, 8), arrow(1.6, 8)] };
    for (const side of ["none", "right", "left", "toward", "away"]) {
        const r = d.simulate({ ...base, config: { ...SIM.config, preferredSide: side } });
        assert.equal(r.action, "dodge", side);
        assert.ok(r.dest.x < -0.8 && r.danger === 0 && r.dangerNow >= 1, `${side}: 安全な左へ ${JSON.stringify(r)}`);
    }
    // 鏡像
    const mirror = d.simulate({ ...SIM, threats: [arrow(0, 8), arrow(-1.6, 8)], config: { ...SIM.config, preferredSide: "left" } });
    assert.ok(mirror.dest.x > 0.8 && mirror.danger === 0);
    assert.deepEqual(plain(d.simulate(base)), plain(d.simulate(base)), "同じ入力は同じ結果");
    // 危険が同じなら好む向きで決まる
    const lone = { ...SIM, threats: [arrow(0, 8)] };
    assert.ok(d.simulate({ ...lone, config: { ...SIM.config, preferredSide: "left" } }).dest.x < -1.5);
    assert.ok(d.simulate({ ...lone, config: { ...SIM.config, preferredSide: "right" } }).dest.x > 1.5);
    // 3本の扇: 左右どちらにも安全な所が無い(塞がれている)なら、無理に動かず留まる
    const wall = d.simulate({ ...SIM, threats: [arrow(-1.2, 8), arrow(0, 8), arrow(1.2, 8)], config: { ...SIM.config, dodgeDistance: 1.0 } });
    assert.equal(wall.action, "stay", "改善できないなら動かない " + JSON.stringify(wall));
    assert.ok(wall.dangerNow >= 1);
});

test("到達できる所だけ: 回避の速さが遅く当たるまでに動けないなら動かない。範囲の端では内側へ、両側が塞がれていれば動かない", () => {
    const d = world().dodge;
    const close = { ...SIM, threats: [arrow(0, 3)] };                                 // あと約8frameで当たる
    assert.equal(d.simulate({ ...close, config: { ...SIM.config, moveSpeed: 3 } }).action, "stay", "遅くて間に合わない");
    assert.equal(d.simulate({ ...close, config: { ...SIM.config, moveSpeed: 40 } }).action, "dodge", "速ければ間に合う");
    const edge = d.simulate({ ...SIM, threats: [arrow(3.9, 8)], pos: { x: 3.9, y: 0 }, heart: { center: { x: 3.9, y: 0 } }, bounds: { minX: -4, maxX: 4, minY: -2.5, maxY: 2.5 } });
    assert.equal(edge.action, "dodge");
    assert.ok(edge.dest.x < 3.9 - 1.5, "範囲の端では内側へ " + edge.dest.x);
    assert.ok(edge.dest.x <= 4 + 1e-9 && edge.dest.x >= -4 - 1e-9 && edge.dest.y >= -2.5 && edge.dest.y <= 2.5, "範囲の内側");
    const tight = d.simulate({ ...SIM, threats: [arrow(0, 8)], bounds: { minX: -0.3, maxX: 0.3, minY: -0.3, maxY: 0.3 } });
    assert.equal(tight.action, "stay", "両側が塞がれている");
});

test("追尾弾: 遠くからは避けられない(曲がって追うため)ので動かず、直前なら避ける。同じ配置の追尾でない弾は遠くからでも避ける。観測した旋回が大きいほど避けにくい", () => {
    const d = world().dodge;
    const homing = (y, turn) => ({ ...SIM, config: { ...SIM.config, moveSpeed: 20 }, threats: [arrow(0, y, { homing: true, turnRate: turn })] });
    assert.equal(d.simulate(homing(14, 0.08)).action, "stay", "遠い追尾弾は避けても追われる");
    assert.equal(d.simulate(homing(2.1, 0.08)).action, "dodge", "直前なら避けられる");
    assert.equal(d.simulate({ ...SIM, config: { ...SIM.config, moveSpeed: 20 }, threats: [arrow(0, 14)] }).action, "dodge", "追尾でない弾は遠くからでも避ける");
    assert.equal(d.simulate(homing(2.1, 0.5)).action, "stay", "旋回が大きい追尾弾は直前でも避けにくい");
});

test("リスク許容: ぎりぎりかすめる弾は、許容が大きいと避けず(余白が小さくなる)、許容0なら避ける", () => {
    const d = world().dodge;
    const graze = (risk) => d.simulate({ ...SIM, threats: [arrow(0.6, 8)], config: { ...SIM.config, riskTolerance: risk } });
    assert.equal(graze(0).action, "dodge", "許容0はかすめる弾も避ける");
    assert.equal(graze(1).dangerNow, 0, "許容1は余白0=かすめるだけなら危険ではない");
    assert.notEqual(graze(1).action, "dodge");
});

test("好む向き(toward/away)と攻撃性: 同じ危険なら、プレイヤー側へ詰める/離れる側を選ぶ。危険の低さが常に優先", () => {
    const d = world().dodge;
    // 弾は東から西へ(x方向に飛ぶ)ので、避けるのは南北。プレイヤーは南(y=+10)。
    const west = { pos: { x: 8, y: 0 }, vel: { x: -0.3, y: 0 }, w: 0.3, h: 0.3 };
    const base = { ...SIM, player: { x: 0, y: 10 }, threats: [west] };
    assert.ok(d.simulate({ ...base, config: { ...SIM.config, preferredSide: "toward" } }).dest.y > 1.5, "towardは南(プレイヤー側)へ");
    assert.ok(d.simulate({ ...base, config: { ...SIM.config, preferredSide: "away" } }).dest.y < -1.5, "awayは北へ");
    assert.ok(d.simulate({ ...base, config: { ...SIM.config, aggression: 1 } }).dest.y > 1.5, "攻撃性が高いとプレイヤー側へ詰める");
    // 南側が別の弾で塞がれていれば、towardでも安全な北を選ぶ
    const blocked = { ...base, threats: [west, { pos: { x: 8, y: 1.6 }, vel: { x: -0.3, y: 0 }, w: 0.3, h: 0.3 }], config: { ...SIM.config, preferredSide: "toward" } };
    const r = d.simulate(blocked);
    assert.ok(r.dest.y < -1.5 && r.danger === 0, "安全が優先 " + JSON.stringify(r));
});

test("実行時間の安全装置: 脅威が多くても評価するのは近い順に maxThreats 個だけ(残りは数える)。評価の回数は 脅威数×候補数(約37)に収まる。不正な設定は断る", () => {
    const d = world().dodge;
    const many = Array.from({ length: 100 }, (_, i) => arrow((i % 20) - 10, 6 + (i % 7), { id: i + 1 }));
    const r = d.simulate({ ...SIM, threats: many });
    assert.equal(r.evaluated, 12, "既定の上限 " + JSON.stringify(r));
    assert.equal(r.dropped, 88);
    assert.ok(r.cost <= 12 * 37 && r.candidates <= 37, "評価の回数に上限 " + r.cost);
    const small = d.simulate({ ...SIM, config: { ...SIM.config, maxThreats: 3 }, threats: many });
    assert.deepEqual([small.evaluated, small.dropped], [3, 97]);
    const t0 = Date.now();
    for (let i = 0; i < 300; i++) d.simulate({ ...SIM, config: { ...SIM.config, maxThreats: 64 }, threats: many });
    assert.ok(Date.now() - t0 < 8000, "300回の評価が現実的な時間 " + (Date.now() - t0) + "ms");
    assert.equal(d.simulate({ ...SIM, config: { maxThreats: 0 }, threats: many }).ok, false);
    assert.equal(d.simulate({ ...SIM, config: { preferredSide: "up" }, threats: many }).ok, false);
    assert.equal(d.simulate({ ...SIM, threats: [] }).action, "none");
});

// ---------------------------------------------------------------- 複数弾・追尾: 実エンジン ----------------------------------------------------------------
test("矢の同時発射(実際): 回避型・バランスは安全側へ避けて全部外す。初心者(頻度50%で見送る)は当たり、ダメージ・回数は回避AIなしと同じ", () => {
    const w = world("apollo_golden_volley");
    const run = cfg => {
        const id = startSoul(w, { cfg });
        w.calls.length = 0; shoot(w, "apollo_golden_volley"); frames(w, 120);
        const result = { loss: lost(w, id), calls: hits(w, id), stats: w.dodge.getStats() && { ...w.dodge.getStats() }, eval: w.dodge.getState().lastEval };
        settle(w);
        return result;
    };
    const none = run(null), evasive = run({ profile: "evasive" }), balanced = run({ profile: "balanced" }), beginner = run({ profile: "beginner" });
    assert.ok(none.loss > 0 && none.calls === 1, "AIなしは当たる " + JSON.stringify(none));
    assert.equal(evasive.loss + balanced.loss, 0, "全部外す");
    assert.ok(evasive.stats.dodges >= 1 && evasive.eval.threats >= 2 && evasive.eval.candidates >= 30, "複数の弾を評価した " + JSON.stringify(evasive.eval));
    assert.deepEqual([beginner.loss, beginner.calls], [none.loss, none.calls], "避けられなければ従来と同じダメージ・回数");
    assert.ok(beginner.stats.skippedFrequency >= 1);
    noErrors(w);
});

test("追尾する連射(エロス): 完全には避けられない(曲がって追うため)。バランス以下は全弾当たり、回避型でも被弾が残る。1発のダメージは常に同じ(20)", () => {
    const w = world("apollo_eros_arrow");
    const run = cfg => {
        const id = startSoul(w, { cfg });
        w.calls.length = 0; shoot(w, "apollo_eros_arrow"); frames(w, 130);
        const result = { loss: lost(w, id), calls: hits(w, id), dodges: w.dodge.getStats()?.dodges ?? 0 };
        settle(w);
        return result;
    };
    const none = run(null), evasive = run({ profile: "evasive" }), balanced = run({ profile: "balanced" });
    assert.deepEqual([none.calls, none.loss], [10, 200]);
    for (const r of [evasive, balanced]) assert.equal(r.loss, r.calls * 20, "1発あたりのダメージは同じ " + JSON.stringify(r));
    assert.ok(balanced.calls > 0 && evasive.calls > 0, "完全な回避は無い " + JSON.stringify({ evasive, balanced }));
    assert.ok(evasive.calls <= none.calls, "回避型でも悪化はしない");
    assert.ok(evasive.dodges >= 1 && evasive.dodges <= Math.ceil(130 / 20) + 1, "クールダウンを守る");
    noErrors(w);
});

test("クールダウンと硬直は複数弾でも守る: 連続して来る矢に対し、回避の回数は クールダウンで決まる上限を超えない。動いている途中は新しい回避を始めない", () => {
    const w = world();
    const id = startSoul(w, { cfg: { ...BASE, cooldownFrames: 45, recoveryFrames: 10 } });
    let dodgeStarts = 0, last = "idle";
    for (let i = 0; i < 4; i++) {
        shoot(w);
        for (let f = 0; f < 18; f++) { w.frames(1); const s = w.dodge.getState().state; if (s === "dodging" && last !== "dodging") dodgeStarts++; last = s; }
    }
    frames(w, 80);
    const stats = w.dodge.getStats();
    assert.ok(stats.dodges >= 1 && stats.dodges <= Math.ceil((4 * 18 + 80) / 45), `回数は上限内 ${stats.dodges}`);
    assert.equal(stats.dodges, dodgeStarts, "動き出しの回数と一致");
    assert.ok(stats.skippedCooldown + stats.skippedRecovery + stats.hitsTaken >= 1, "見送り/被弾が記録される");
    void id;
    settle(w);
    noErrors(w);
});

// ---------------------------------------------------------------- 近接 ----------------------------------------------------------------
test("近接: 最初の斬撃は反応が0でも避けられず必ず当たる(予兆が無い)。被弾後に退く性格は二撃目(同じ向き)を外させ、退かない性格は二撃目も当たる。ダメージは常に同じ", () => {
    const w = world("hermes_sword_attack");
    equip(w, SWORD_ID); frames(w, 3);
    const duel = cfg => {
        const id = startSoul(w, { dist: 5, cfg });
        const swing = () => { aimDegree(w, 0, 5); w.attackClick(); frames(w, 24); };
        w.calls.length = 0;
        swing(); const first = { loss: lost(w, id), calls: hits(w, id) };
        const stateAfterFirst = w.dodge.getState();
        const reason = stateAfterFirst.active ? stateAfterFirst.dodgeReason : null;
        swing(); const second = { loss: lost(w, id) - first.loss, calls: hits(w, id) - first.calls };
        const stats = w.dodge.getStats() && { ...w.dodge.getStats() };
        settle(w, 60);
        return { first, second, reason, stats };
    };
    const none = duel(null);
    assert.ok(none.first.loss > 0 && none.first.calls === 1 && none.second.calls === 1, "AIなしは二撃とも当たる " + JSON.stringify(none));
    const instant = duel({ ...BASE, reactionFrames: 0, moveSpeed: 60, hitReaction: false, meleeWary: false });
    assert.deepEqual(instant.first, none.first, "反応0・最速でも最初の一撃は避けられない");
    assert.deepEqual(instant.second, none.second, "退かない設定は二撃目も当たる");
    for (const profile of ["balanced", "evasive", "boss"]) {
        const r = duel({ profile });
        assert.deepEqual(r.first, none.first, profile + ": 最初の一撃は同じダメージで当たる");
        assert.equal(r.second.calls, 0, profile + ": 被弾後に退いて二撃目は外れる " + JSON.stringify(r));
        assert.equal(r.reason, profile === "balanced" ? "hitReaction" : "meleeSidestep", "近接に備える性格(回避型・ボス)は判定の向きに直角へ、バランスは被弾の退避");
        assert.ok(r.stats.meleeCues >= 1 && (profile === "balanced" ? r.stats.hitReactions >= 1 : r.stats.sidesteps >= 1));
    }
    for (const profile of ["beginner", "aggressive"]) {
        const r = duel({ profile });
        assert.deepEqual(r.second, none.second, profile + ": 退かないので二撃目も当たる");
    }
    noErrors(w);
});

test("近接の判定の向きに備える(meleeWary): 被弾の退避が無くても、出ている判定の向きに直角へ動いて、同じ向きの二撃目を外させる(理由=meleeSidestep)", () => {
    const w = world("hermes_sword_attack");
    equip(w, SWORD_ID); frames(w, 3);
    const id = startSoul(w, { dist: 5, cfg: { ...BASE, reactionFrames: 4, hitReaction: false, meleeWary: true, meleeSidestepDistance: 1.8 } });
    const swing = () => { aimDegree(w, 0, 5); w.attackClick(); frames(w, 24); };
    w.calls.length = 0;
    swing();
    const first = lost(w, id);
    assert.ok(first > 0, "最初は当たる");
    swing();
    assert.equal(lost(w, id), first, "二撃目は外れる");
    assert.equal(w.dodge.getState().dodgeReason, "meleeSidestep");
    assert.ok(w.dodge.getStats().sidesteps >= 1 && w.dodge.getStats().hitReactions === 0);
    settle(w, 60);
    noErrors(w);
});

test("手がかりの無い攻撃(薙ぎ払い・一閃)にAIは予知しない: 反応0・最速でも最初の一撃は当たり、ダメージ・回数はAIなしと同じ。被弾の事後にだけ反応する", () => {
    for (const [card, dist, expectedCalls] of [["hermes_sweep", 6, 1], ["hermes_issen", 5, null]]) {
        const w = world(card);
        const strike = cfg => {
            const id = startSoul(w, { dist, cfg });
            w.calls.length = 0;
            aimDegree(w, 0, dist); const r = fireCard(w, card); assert.equal(r.ok, true, JSON.stringify(r));
            frames(w, 4);
            const early = { loss: lost(w, id), calls: hits(w, id) };         // 反応0でも、出た瞬間に当たる
            frames(w, 100);
            const stats = w.dodge.getStats() && { ...w.dodge.getStats() };
            const result = { early, total: lost(w, id), calls: hits(w, id), stats };
            settle(w, 60);
            return result;
        };
        const none = strike(null);
        const ai = strike({ ...BASE, reactionFrames: 0, moveSpeed: 60, hitReaction: true });
        assert.ok(none.early.loss > 0, card + " AIなしは当たる");
        assert.deepEqual(ai.early, none.early, `${card}: 出た瞬間の被害は同じ(予知なし)`);
        if (expectedCalls !== null) assert.equal(ai.calls, expectedCalls);
        assert.equal(ai.stats.meleeCues, 0, card + " は観測できる判定が無い");
        assert.ok(ai.stats.hitsTaken >= 1 && ai.stats.hitReactions >= 1, "事後にだけ反応 " + JSON.stringify(ai.stats));
        noErrors(w);
    }
});

test("Hermes奥義: 斬撃は順に出るが、出てから見えるだけ。最初に当たる斬撃のダメージはAIなしと同じ(1回)。近接の手がかりを記録する", () => {
    const w = world(ARROW, { balance: x => assert.equal(fx.deckApi(x).setUltimateRing("hermes").ok, true) });
    const ult = cfg => {
        const id = startSoul(w, { dist: 5, cfg });
        w.calls.length = 0;
        w.ctx.ProjectRUltimateGauge.addUltimateGauge(1000, "ai"); aimDegree(w, 0, 5);
        assert.equal(w.ctx.ProjectRUltimateActivation.requestUltimateActivation("api").ok, true);
        frames(w, 90);
        const result = { loss: lost(w, id), calls: hits(w, id), stats: w.dodge.getStats() && { ...w.dodge.getStats() } };
        settle(w, 60);
        return result;
    };
    const none = ult(null), ai = ult({ profile: "evasive" });
    assert.ok(none.loss > 0 && none.calls === 1, JSON.stringify(none));
    assert.deepEqual([ai.loss, ai.calls], [none.loss, none.calls], "最初の斬撃のダメージ・回数は同じ");
    assert.ok(ai.stats.meleeCues >= 1);
    noErrors(w);
});

// ---------------------------------------------------------------- 性格 ----------------------------------------------------------------
test("性格の違い: 同じ矢に対する反応の遅れの順(回避型 < バランス < 初心者)。頻度50%の初心者は1本目を見送り、2本目で避ける(決定的)", () => {
    const w = world();
    const delay = overrides => {
        startSoul(w, { cfg: { ...BASE, ...overrides } });
        shoot(w); frames(w, 70);
        const start = logOf(w, "dodgeStart").at(-1);
        const stats = { ...w.dodge.getStats() };
        settle(w, 100);
        return { frame: start?.frame ?? null, stats };
    };
    // 同条件(硬直・クールダウン0)で、性格の「反応の遅れ」と「頻度」だけを比べる
    const fast = delay({ ...w.dodge.getProfile("evasive").data, cooldownFrames: 0, recoveryFrames: 0, returnSpeed: 0, reactionJitter: 0 });
    const mid = delay({ ...w.dodge.getProfile("balanced").data, cooldownFrames: 0, recoveryFrames: 0, returnSpeed: 0, reactionJitter: 0 });
    const slow = delay({ ...w.dodge.getProfile("beginner").data, cooldownFrames: 0, recoveryFrames: 0, returnSpeed: 0, reactionJitter: 0, dodgeFrequency: 1 });
    assert.ok(fast.frame < mid.frame && mid.frame < slow.frame, `反応の順 ${fast.frame} < ${mid.frame} < ${slow.frame}`);
    // 頻度0.5: 1本目は見送り(当たる)、2本目は避ける
    const id = startSoul(w, { cfg: { ...BASE, dodgeFrequency: 0.5 } });
    w.calls.length = 0;
    shoot(w); frames(w, 70);
    const firstLoss = lost(w, id);
    assert.ok(firstLoss > 0 && w.dodge.getStats().skippedFrequency === 1 && w.dodge.getStats().dodges === 0, "1本目は見送る");
    shoot(w); frames(w, 70);
    assert.equal(lost(w, id), firstLoss, "2本目は避ける");
    assert.equal(w.dodge.getStats().dodges, 1);
    settle(w);
    noErrors(w);
});

test("性格はダメージを変えない: どの性格でも、避けられなかった矢のダメージ・回数は同じ(46・1回)。性格の値はハートの動きだけ", () => {
    const w = world();
    for (const profile of [null, "beginner", "balanced", "evasive", "aggressive", "boss"]) {
        const id = startSoul(w, { cfg: profile ? { profile, dodgeFrequency: 0 } : null });     // 避けない設定にして、命中したときのダメージだけを見る
        w.calls.length = 0; shoot(w); frames(w, 90);
        assert.deepEqual([lost(w, id), hits(w, id)], [46, 1], String(profile));
        settle(w, 60);
    }
    noErrors(w);
});

test("性格の切り替え: setProfile は動作中に性格だけを替える(位置・戦績は保つ)。不正な名前は断り何も変えない", () => {
    const w = world();
    startSoul(w, { cfg: { profile: "beginner" } });
    shoot(w); frames(w, 70);
    const before = w.dodge.getState();
    const r = w.dodge.setProfile("evasive");
    assert.equal(r.ok, true);
    const after = w.dodge.getState();
    assert.equal(after.profile, "evasive");
    assert.deepEqual([after.position, after.stats.hitsTaken, after.frame >= before.frame], [before.position, before.stats.hitsTaken, true]);
    assert.equal(after.config.reactionFrames, w.dodge.getProfile("evasive").data.reactionFrames);
    assert.equal(w.dodge.setProfile("nope").ok, false);
    assert.equal(w.dodge.getState().profile, "evasive");
    settle(w);
    assert.equal(w.dodge.setProfile("balanced").reason, "inactive");
});

// ---------------------------------------------------------------- フェイント ----------------------------------------------------------------
test("フェイント(取り消し): 遠くで消えた弾を取り消しと認識し、それに釣られて回避していたAIは硬直が延びる(付け入る隙)。当たって消えた弾は取り消しではない", () => {
    const w = world();
    const bait = { ...BASE, recoveryFrames: 10, baitRecoveryFrames: 100, feintSusceptibility: 1 };
    const scenario = cfg => {
        const id = startSoul(w, { cfg });
        shoot(w);
        let guard = 0;
        while (w.dodge.getState().state !== "dodging" && guard++ < 30) w.frames(1);          // 避け始めた(釣られた)
        arrowEvents(w).forEach(e => e.erase());                                              // 矢が取り消された
        frames(w, 3);
        const mid = w.dodge.getState();
        const result = { stats: { ...w.dodge.getStats() }, recoveryLeft: mid.recoveryLeft, state: mid.state, id };
        // 取り消しの直後に本物の矢: 硬直が延びている間は避けられず当たる
        w.calls.length = 0;
        let hit = null;
        frames(w, 8);
        shoot(w); frames(w, 70);
        result.secondLoss = lost(w, id); result.skippedRecovery = w.dodge.getStats().skippedRecovery;
        settle(w, 60);
        return result;
    };
    const baited = scenario(bait);
    assert.equal(baited.stats.cancels, 1);
    assert.equal(baited.stats.baited, 1, "釣られた回避として記録");
    assert.ok(baited.secondLoss > 0 && baited.skippedRecovery >= 1, "硬直が延びて次の矢を避けられない " + JSON.stringify(baited));
    const immune = scenario({ ...bait, feintSusceptibility: 0 });
    assert.equal(immune.stats.cancels, 1);
    assert.equal(immune.secondLoss, 0, "影響を受けない設定は付け入られない");
    // 当たって消えた弾は取り消しではない
    const id = startSoul(w, { cfg: { ...BASE, dodgeFrequency: 0 } });
    shoot(w); frames(w, 80);
    assert.ok(lost(w, id) > 0);
    assert.equal(w.dodge.getStats().cancels, 0, "被弾して消えた弾は取り消しではない");
    settle(w);
    noErrors(w);
});

test("フェイントの後は用心する(反応が遅れる): 取り消しを見た後の矢は、影響を受ける性格ほど反応が遅くなる。影響0なら変わらない", () => {
    const w = world();
    const measure = (susceptibility) => {
        startSoul(w, { cfg: { ...BASE, feintHesitationFrames: 20, feintSusceptibility: susceptibility, feintMemoryFrames: 300 } });
        shoot(w); frames(w, 9);
        arrowEvents(w).forEach(e => e.erase());                                              // 取り消し(1本目は避ける前に消える)
        frames(w, 4);
        const before = logOf(w, "dodgeStart").length;
        shoot(w);
        const t0 = w.dodge.getState().frame;
        let guard = 0;
        while (logOf(w, "dodgeStart").length === before && guard++ < 80) w.frames(1);
        const delay = w.dodge.getState().frame - t0;
        settle(w, 100);
        return delay;
    };
    const calm = measure(0), wary = measure(1);
    assert.ok(wary - calm >= 19, `用心して ${wary - calm}frame遅れる (${calm} → ${wary})`);
});

test("フェイント(向きの変更): 追尾でない弾の向きの急変を認識し、反応の遅れをやり直す。回避中に変えられると釣られた回避になる", () => {
    const w = world();
    const id = startSoul(w, { cfg: { ...BASE, baitRecoveryFrames: 50, feintSusceptibility: 1, recoveryFrames: 10 } });
    shoot(w);
    let guard = 0;
    while (w.dodge.getState().state !== "dodging" && guard++ < 30) w.frames(1);
    const a = arrowEvents(w)[0];
    assert.ok(a, "矢がある");
    a.rotateTo(((a._rotation || 0) + 70) % 360);
    frames(w, 6);
    const stats = w.dodge.getStats();
    assert.ok(stats.redirects >= 1, "向きの変更を認識 " + JSON.stringify(stats));
    assert.ok(stats.baited >= 1, "回避中に変えられた=釣られた");
    assert.ok(w.dodge.getState().cues.some(c => c.type === "redirect"));
    settle(w);
    // 追尾弾の自然な旋回は向きの変更ではない
    const eros = world("apollo_eros_arrow");
    startSoul(eros, { cfg: { ...BASE } });
    shoot(eros, "apollo_eros_arrow"); frames(eros, 60);
    assert.equal(eros.dodge.getStats().redirects, 0, "追尾の旋回はフェイントではない");
    noErrors(w); noErrors(eros);
});

// ---------------------------------------------------------------- ボス ----------------------------------------------------------------
test("ボス(データ駆動): 連続回避で息切れ(exhausted)し、その間は避けられず当たる。弱点の値を変えた別のボスでは、同じコードのまま挙動が変わる", () => {
    const w = world();
    w.dodge.registerBoss({ id: "quick_tire", profile: "boss", overrides: { dodgeFrequency: 1, cooldownFrames: 0, recoveryFrames: 0, returnSpeed: 0, reactionFrames: 4, reactionJitter: 0 },
        weakness: { exhaustAfterDodges: 2, exhaustWindowFrames: 600, exhaustFrames: 120 } });
    const run = bossId => {
        const id = startSoul(w, { cfg: { boss: bossId } });
        let state = [];
        for (let i = 0; i < 4; i++) { shoot(w); for (let f = 0; f < 28; f++) { w.frames(1); const s = w.dodge.getState().state; if (state[state.length - 1] !== s) state.push(s); } }
        const result = { stats: { ...w.dodge.getStats() }, states: state, loss: lost(w, id) };
        settle(w, 100);
        return result;
    };
    const tired = run("quick_tire");
    assert.equal(tired.stats.exhaustions, 1, "2回の連続回避で息切れ " + JSON.stringify(tired));
    assert.ok(tired.states.includes("exhausted"));
    assert.ok(tired.loss > 0, "息切れの間の矢は当たる");
    // 弱点なしの別データ: 息切れしない
    w.dodge.registerBoss({ id: "no_tire", profile: "boss", overrides: { dodgeFrequency: 1, cooldownFrames: 0, recoveryFrames: 0, returnSpeed: 0, reactionFrames: 4, reactionJitter: 0 }, weakness: {} });
    const steady = run("no_tire");
    assert.equal(steady.stats.exhaustions, 0);
    assert.ok(steady.stats.dodges >= 3, "弱点が無ければ続けて避ける " + JSON.stringify(steady.stats));
    noErrors(w);
});

test("ボス(怯み): 大ダメージ(しきい値以上)を受けると怯み(staggered)、その間は避けられない。しきい値未満では怯まない。怯みの間の矢は当たる", () => {
    const w = world();
    w.dodge.registerBoss({ id: "stagger_boss", profile: "boss", overrides: { dodgeFrequency: 1, cooldownFrames: 0, recoveryFrames: 0, returnSpeed: 0, reactionFrames: 4, reactionJitter: 0, hitReaction: false },
        weakness: { staggerDamage: 90, staggerFrames: 80 } });
    const id = startSoul(w, { cfg: { boss: "stagger_boss" } });
    damageCommand(w, id, 40); frames(w, 3);
    assert.equal(w.dodge.getState().state, "idle", "しきい値未満は怯まない");
    damageCommand(w, id, 95); frames(w, 3);
    assert.equal(w.dodge.getState().state, "staggered");
    assert.equal(w.dodge.getStats().staggers, 1);
    const before = lost(w, id);
    shoot(w); frames(w, 70);
    assert.ok(lost(w, id) > before, "怯みの間の矢は当たる");
    frames(w, 60);
    assert.notEqual(w.dodge.getState().state, "staggered", "怯みは終わる(永続しない)");
    const after = lost(w, id);
    shoot(w); frames(w, 70);
    assert.equal(lost(w, id), after, "怯みが解ければまた避ける");
    settle(w);
    noErrors(w);
});

test("ボスのHPフェーズ: HPの割合が下がると設定が切り替わる(66%以下・33%以下)。ProjectRBossFramework が動作中なら、その状態を読み取り専用で参照し、start/end/damage は呼ばない", () => {
    const w = world();
    const id = startSoul(w, { cfg: { boss: "dev_boss" } });
    assert.equal(w.dodge.getState().phase, "base");
    const base = w.dodge.getState().config;
    damageCommand(w, id, Math.round(HP * 0.4)); frames(w, 3);
    assert.equal(w.dodge.getState().phase, "phase2");
    assert.equal(w.dodge.getState().config.moveSpeed, 13, "フェーズ2の値");
    assert.ok(w.dodge.getState().config.moveSpeed > base.moveSpeed);
    damageCommand(w, id, Math.round(HP * 0.3)); frames(w, 3);
    assert.equal(w.dodge.getState().phase, "enrage");
    assert.equal(w.dodge.getState().config.dodgeDistance, 2.6);
    assert.equal(w.dodge.getState().config.boss, "dev_boss");
    assert.ok(logOf(w, "phase").length >= 2);
    settle(w);
    // BossFrameworkの読み取り
    const fw = w.ctx.ProjectRBossFramework, calls = [];
    const saved = { getState: fw.getState, start: fw.start, end: fw.end, damage: fw.damage, setHp: fw.setHp, bossAttack: fw.bossAttack };
    for (const name of ["start", "end", "damage", "setHp", "bossAttack"]) fw[name] = (...args) => { calls.push(name); return saved[name].apply(fw, args); };
    fw.getState = () => ({ bossId: "dev_boss_soul", hp: 100, maxHp: 400, phaseIndex: 2, phase: {}, phaseCount: 3, name: "x" });
    try {
        startSoul(w, { cfg: { boss: "dev_boss" } });
        frames(w, 5);
        assert.equal(w.dodge.getState().phase, "enrage", "フレームワークのHP割合(25%)でフェーズを決める");
        assert.deepEqual(calls, [], "書き込み系は一切呼ばない");
        fw.getState = () => ({ bossId: "other_boss", hp: 10, maxHp: 400 });
        frames(w, 3);
        assert.equal(w.dodge.getState().phase, "base", "別のボスの状態は無視してHP割合に戻る");
    } finally { Object.assign(fw, saved); }
    settle(w);
    noErrors(w);
});

// ---------------------------------------------------------------- フェーズ境界・同期・安全装置・後始末 ----------------------------------------------------------------
test("フェーズ境界: 攻撃ターンの最後に撃った矢は、防御に入っても当たる(1回・同じダメージ)。防御中に観測・退避の予約・フェイントの記憶は新しい回避を起こさない。攻撃に戻るとやり直す", () => {
    const w = world();
    const id = startSoul(w, { cfg: { ...BASE, reactionFrames: 20 }, attackSeconds: 1, defenseSeconds: 1 });
    while (w.soul.getState().framesLeft > 6) w.frames(1);
    w.calls.length = 0; shoot(w);
    frames(w, 6);
    assert.equal(w.soul.getPhase(), "defense");
    frames(w, 70);
    assert.deepEqual([lost(w, id), hits(w, id), w.dodge.getStats().dodges], [46, 1, 0], "防御中に当たる・新しい回避は無い");
    assert.equal(w.dodge.getState().threats.length, 0);
    while (!(w.soul.getPhase() === "attack" && w.soul.getState().framesLeft >= 50)) w.frames(1);
    const after = lost(w, id);
    shoot(w); frames(w, 45);
    assert.equal(lost(w, id), after, "次の攻撃ターンでは観測をやり直して避ける");
    assert.equal(w.dodge.getStats().dodges, 1);
    settle(w);
    noErrors(w);
});

test("判定と見た目の同期: 複数弾を避け続けても、毎フレーム判定の多角形の重心・中心・見た目のSpriteが1ピクセル以内で一致。範囲の外へ出ない", () => {
    const w = world("apollo_golden_volley");
    const id = startSoul(w, { cfg: { profile: "evasive" } });
    const home = { ...heartAt(w) };
    const occ = w.ctx.ProjectR.CombatOcclusion;
    shoot(w, "apollo_golden_volley");
    let moved = 0, worstX = 0, worstY = 0, prev = { ...home };
    for (let i = 0; i < 110; i++) {
        w.frames(1);
        const state = w.poc.getState(), polygon = occ.eventPolygon(w.ctx.$gameMap.event(id));
        const px = polygon.reduce((s, p) => s + p.x, 0) / polygon.length, py = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
        assert.ok(Math.abs(px - state.hitCenter.x) <= PIXEL && Math.abs(py - state.hitCenter.y) <= PIXEL, "判定の同期 " + i);
        const sx = Math.round(w.ctx.$gameMap.adjustX(state.hitCenter.x) * 48), sy = Math.round(w.ctx.$gameMap.adjustY(state.hitCenter.y) * 48);
        assert.ok(Math.abs(state.sprite.x - sx) <= 1 && Math.abs(state.sprite.y - sy) <= 1, "見た目の同期 " + i);
        if (Math.hypot(state.hitCenter.x - prev.x, state.hitCenter.y - prev.y) > 0.01) moved++;
        prev = { ...state.hitCenter };
        worstX = Math.max(worstX, Math.abs(state.hitCenter.x - home.x)); worstY = Math.max(worstY, Math.abs(state.hitCenter.y - home.y));
    }
    assert.ok(moved >= 5);
    assert.ok(worstX <= 4 + 0.03 && worstY <= 2.5 + 0.03, `範囲内 ${worstX} ${worstY}`);
    settle(w);
    noErrors(w);
});

test("実行時間の安全装置(実際): 大量の飛び道具(60本)があっても、追跡は上限(48)で止まり、評価は maxThreats×候補数に収まる。AIは例外を出さずに動き続ける", () => {
    const w = world();
    startSoul(w, { cfg: { profile: "evasive" } });
    const template = w.ctx.$dataTemplateMap.events.find(e => e && e.name === "ProjectR Apollo Golden Arrow");
    assert.ok(template);
    for (let i = 0; i < 60; i++) {
        const id = w.ctx.$gameMap.spawnEvent(template.id, w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY, false, (i * 6) % 360);
        const e = id && w.ctx.$gameMap.event(id);
        if (e) e.rotateTo((i * 6) % 360);
    }
    const t0 = Date.now();
    frames(w, 40);
    const stats = w.dodge.getStats(), state = w.dodge.getState();
    assert.ok(state.threats.length <= 48, "追跡の上限 " + state.threats.length);
    assert.ok(stats.trackDropped > 0, "上限を超えた分は数えて捨てた " + JSON.stringify(stats));
    assert.ok(stats.maxEvalCost <= 16 * 37, "評価回数の上限 " + stats.maxEvalCost);
    assert.ok(Date.now() - t0 < 20000, "40フレームが現実的な時間");
    settle(w, 100);
    noErrors(w);
});

test("復元: 終了・マップ読み直し・ニューゲーム・場面移動・ハートの消滅・プレイヤー死亡のどれでも、AIの状態(予約した退避・フェイントの記憶・ボスのフェーズを含む)は残らない", () => {
    const exits = {
        end: w => w.soul.end("t"),
        mapSetup: w => w.ctx.$gameMap.setup(4),
        newGame: w => { w.ctx.DataManager._globalInfo = []; w.ctx.DataManager.setupNewGame(); },
        sceneChange: w => { w.ctx.SceneManager.goto(class FakeScene {}); w.ctx.SceneManager._nextScene = null; },
        heartGone: w => { w.ctx.$gameMap.event(w.soul.getState().heart.eventId).erase(); frames(w, 2); },
        playerDeath: w => { const leader = w.ctx.$gameParty.leader(); leader._hp = 0; try { frames(w, 2); } finally { leader._hp = 1; } }
    };
    for (const [name, exit] of Object.entries(exits)) {
        const w = world();
        const id = startSoul(w, { cfg: { boss: "dev_boss", hitReaction: true } });
        damageCommand(w, id, 50); frames(w, 2);                 // 被弾 → 退避を予約
        shoot(w); frames(w, 4);
        arrowEvents(w).forEach(e => e.erase()); frames(w, 2);   // フェイントの記憶
        exit(w); frames(w, 3);
        assert.deepEqual([w.dodge.isActive(), w.dodge.isArmed(), w.dodge.getState().active, w.soul.getPhase(), w.poc.isActive()], [false, false, false, "idle", false], name);
        assert.deepEqual(plain(w.dodge.getState()), { armed: false, active: false }, name + " 状態が空");
        frames(w, 30);
        assert.equal(w.dodge.getState().active, false, name + " 再開しない");
        noErrors(w);
    }
});

test("通常のAction Combatへの復元: AI(性格・ボス)を使った後でも、armしない戦闘は従来どおり(P0の往復・止まるハート)。矢のダメージと移動・セーブ許可は元どおり", () => {
    const w = world();
    const walk = () => { w.placePlayer(HOME.x, HOME.y); frames(w, 2); w.keyDown("KeyD", 68); frames(w, 20); w.keyUp("KeyD", 68); frames(w, 2); return w.ctx.$gamePlayer._realX - HOME.x; };
    assert.ok(walk() > 0.3, "SOULの前は動ける");
    for (const cfg of [{ profile: "boss" }, { boss: "dev_boss" }, { profile: "evasive", hitReaction: true }]) {
        startSoul(w, { cfg }); shoot(w); frames(w, 30); settle(w, 60);
    }
    assert.ok(walk() > 0.3, "AIを使った後も動ける");
    assert.equal(w.run("playerMovementDisabled"), false);
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), true);
    const id = startSoul(w, { dist: 8, heart: { pattern: "patrol", rangeX: 3, speed: 2 } });
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 360; i++) { w.frames(1); const x = heartAt(w).x; lo = Math.min(lo, x); hi = Math.max(hi, x); }
    assert.ok(Math.abs(hi - lo - 6) < 0.2, "P0の往復のまま " + (hi - lo));
    assert.equal(w.dodge.isActive(), false);
    w.calls.length = 0; shoot(w); frames(w, 90);
    assert.equal(hits(w, id) <= 1, true);
    settle(w);
});

console.log(`\n${passed} tests passed`);
