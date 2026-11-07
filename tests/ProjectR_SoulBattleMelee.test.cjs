"use strict";
// SOUL戦闘 P2-C: 近接アダプタ(ProjectR_SoulBattleMelee)。通常の剣・剣カード・Hermes奥義は判定(DynamicHitbox)の奥行を延ばし、
// 薙ぎ払いは発動の同期呼び出しの間だけ扇形の起点をずらして、遠い敵ハートに届かせる。一閃は触らない。
// 向き・幅・ダメージ・命中回数は変えず、外せば外れる。SOUL外では何もしない。実エンジン(Map004 + 全plugin)。MZは起動しない。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const vm = require("node:vm");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { handIds, cardWorld, player, plain, aimDegree, fireCard, center, parkOthers, attachHpBars, barHp, HP, deckApi, equip, SWORD_ID, setRegion } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
const PLUGIN_FILE = "js/plugins/ProjectR_SoulBattleMelee.js";
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const HOME = { x: 30, y: 40 };
const SWORD_CARD = "hermes_sword_attack", SWEEP = "hermes_sweep", ISSEN = "hermes_issen";

function world(card, god = null) {
    const w = cardWorld(card, { x: HOME.x, y: HOME.y, bigMap: { width: 60, height: 60 }, balance: god ? (x => deckApi(x).setUltimateRing(god)) : null });
    parkOthers(w, []);
    for (let i = 0; i < 150; i++) w.frames(1);
    w.soul = w.ctx.ProjectRSoulBattle; w.melee = w.ctx.ProjectRSoulBattleMelee; w.poc = w.ctx.ProjectRSoulBattlePoC;
    return w;
}
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const noErrors = w => {
    const bad = [...w.soul.getLog(), ...w.poc.getLog(), ...w.melee.getLog()].filter(e => /error|Error/.test(e.type));
    assert.deepEqual(bad, [], JSON.stringify(bad));
};
const dist = (a, b) => +Math.hypot(a.x - b.x, a.y - b.y).toFixed(3);
const pos = w => ({ x: player(w)._realX, y: player(w)._realY });

// SOULを始める(ハートは player 中心から 前方dist・横dx)。patrolなど動くハートは heart で指定。
function startSoul(w, { dist: d = 5, dx = 0, heart = null, attackSeconds = 600, defenseSeconds = 600 } = {}) {
    w.placePlayer(HOME.x, HOME.y); frames(w, 3);
    const c = center(w);
    const result = w.soul.start({ attackSeconds, defenseSeconds, heart: { centerX: c.x + dx, centerY: c.y - d, pattern: "static", ...(heart || {}) } });
    assert.equal(result.ok, true, JSON.stringify(result));
    const id = w.soul.getState().heart.eventId;
    attachHpBars(w, [id], HP);
    return id;
}
// 撃つ → 一定フレーム進める → 結果。fire(id) が攻撃を行う。
function strike(w, id, fire, count = 90) {
    w.calls.length = 0;
    const p0 = pos(w), ext0 = w.melee.getStats().extended;
    fire(id);
    frames(w, count);
    return {
        loss: HP - barHp(w, id), calls: w.calls.filter(c => c.name === "UpdateEventHp" && String(c.args.eventId) === String(id)).length,
        moved: dist(pos(w), p0), extended: w.melee.getStats().extended - ext0
    };
}
// 1回分の試行(停止ハート)。fire(): 攻撃。
function trial(w, options, fire, count) {
    const id = startSoul(w, options);
    const r = strike(w, id, fire, count);
    w.soul.end("trial"); frames(w, 25);
    return r;
}
const swordFire = (w, degree = 0, tiles = 5) => () => { aimDegree(w, degree, tiles); w.attackClick(); };
const cardFire = (w, card, degree = 0, tiles = 5) => () => { assert.ok(handIds(w).includes(card), card + " が手札にある(同じカードは5枚まで。足りなければ世界を作り直す)"); aimDegree(w, degree, tiles); const r = fireCard(w, card); assert.equal(r.ok, true, JSON.stringify(r)); };
const ultFire = (w, degree = 0, tiles = 5) => () => {
    w.ctx.ProjectRUltimateGauge.addUltimateGauge(1000, "melee"); aimDegree(w, degree, tiles);
    const r = w.ctx.ProjectRUltimateActivation.requestUltimateActivation("api"); assert.equal(r.ok, true, JSON.stringify(r));
};
const bearing = (dx, d) => Math.atan2(dx, d) * 180 / Math.PI;

// ---------------------------------------------------------------- 登録・安全 ----------------------------------------------------------------
test("登録と安全: 1回だけ・有効・依存の後ろ。許可リストのタグが各スキルの定義と一致。ダメージ/HP/保存を扱わず、一閃と既存ファイルは変更なし。読み込んだだけでは何も起きない", () => {
    const config = {};
    vm.runInNewContext(read("js/plugins.js"), config);
    const names = config.$plugins.map(p => p.name), index = names.indexOf("ProjectR_SoulBattleMelee");
    assert.ok(index >= 0 && names.lastIndexOf("ProjectR_SoulBattleMelee") === index);
    assert.equal(config.$plugins[index].status, true);
    assert.deepEqual(plain(config.$plugins[index].parameters), { Enabled: "true", MaxTipTiles: "8", Margin: "0.25" });
    const header = read(PLUGIN_FILE).split("*/")[0];
    for (const dependency of [...header.matchAll(/@(?:base|orderAfter)\s+(\S+)/g)].map(m => m[1])) {
        assert.ok(names.indexOf(dependency) >= 0 && names.indexOf(dependency) < index, dependency + " より後");
    }
    const w = world(SWORD_CARD);
    assert.equal(w.failures.length, 0);
    assert.deepEqual(plain(w.melee.gates()), { spawn: true, sweep: true, origin: true, sweepDelay: true });
    assert.equal(w.melee.isActive(), false);
    assert.deepEqual(plain(w.melee.getStats()), { extended: 0, sweepShifted: 0, passed: {}, scoped: false });
    // 許可リストのタグは、実際のスキルのTAG定数と同じ
    const tagOf = file => /const TAG = "([^"]+)"/.exec(read(file))[1];
    assert.deepEqual([...w.melee.TAGS].sort(), ["ProjectR_SwordSystem", "ProjectR_HermesSwordsmanship", "ProjectR_HermesUltimate"].map(n => tagOf(`js/plugins/${n}.js`)).sort());
    const code = read(PLUGIN_FILE).split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /getCurrentEventHp|setHp|\.gainHp|saveGame|StorageManager|_saveEnabled|HermesIssen/, "HP・保存を扱わない(一閃は専用ステージの間だけカーソル起点にする。元の一閃の処理 HermesIssen は触らない)");
    // ダメージの命令(UpdateEventHp)は、薙ぎ払いの発動の間だけ預けて遅らせる配管としてだけ触る。自分でダメージの式・数値を作らない(ProjectR_HermesSweep が作った引数をそのまま使う)
    assert.ok((code.match(/UpdateEventHp/g) || []).length <= 2, "UpdateEventHp は遅延の配管(キー1か所)だけ");
    assert.doesNotMatch(code, /value:\s*[`"']-|projectRFixed:\s*\{\s*base|criticalChanceBonus\s*:/, "ダメージの数値・式を自分で作らない");
    const status = cp.execFileSync("git", ["status", "--porcelain"], { cwd: project, encoding: "utf8" }).split(/\r?\n/);
    for (const file of ["js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_HermesSwordsmanship.js",
        "js/plugins/ProjectR_HermesUltimate.js", "js/plugins/ProjectR_HermesSweep.js", "js/plugins/ProjectR_HermesIssen.js", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/ProjectR_GodSummonManager.js", "js/plugins/ProjectR_CardBattleInput.js", "js/plugins/ProjectR_UltimateActivation.js", "js/plugins/ProjectR_UltimateGauge.js"]) {
        assert.ok(!status.some(line => line.slice(3) === file), file + " は変更されていない");
    }
});

// ---------------------------------------------------------------- 延長計画(状態を変えない純粋な計算) ----------------------------------------------------------------
test("延長計画: 先端が届かないときだけ奥行を延ばす(向き・幅は不変)。後ろ・幅の外・上限超・壁・既に届く・書式不正・許可外・SOUL外は何も変えない。入力を書き換えない", () => {
    const w = world(SWORD_CARD);
    const id = startSoul(w, { dist: 5 });
    const c = center(w);
    // 通常の剣と同じ作り: 前方1.0に幅1.5×奥行1.2。位置はEventの左上(中心-0.5)。
    const make = (degree, overrides = {}) => {
        const rad = (degree - 90) * Math.PI / 180;
        return Object.freeze({ name: "DynamicHitbox", notetag: "<projectRNormalSword><projectRNormalSwordHit1><hitbox: 1.5, 1.2>", comment: "",
            position: `${c.x - 0.5 + Math.cos(rad)}, ${c.y - 0.5 + Math.sin(rad)}`, rotationDegree: String(degree === 0 ? 360 : degree), turnToward: "", attachTo: "", wait: "", ...overrides });
    };
    const ok = w.melee.plan(make(0));
    assert.equal(ok.extend, true);
    const m = /<hitbox: ([\d.]+), ([\d.]+)>/.exec(ok.args.notetag);
    assert.equal(+m[1], 1.5, "幅は不変");
    assert.ok(+m[2] > 1.2 && +m[2] <= 8 + 0.01, "奥行だけ延びる " + m[2]);
    assert.equal(ok.args.rotationDegree, "360", "向きは不変");
    assert.equal(ok.args.notetag.replace(/<hitbox:[^>]*>/, ""), make(0).notetag.replace(/<hitbox:[^>]*>/, ""), "注釈のほかの部分は不変");
    const [px, py] = ok.args.position.split(",").map(Number);
    assert.ok(Math.abs(px - (c.x - 0.5)) < 1e-4 && py < c.y - 1.5, "真上へだけ動く(延長の半分)");
    const tipFromPlayer = (c.y - (py + 0.5)) + +m[2] / 2;          // 先端(プレイヤー中心から)
    const heartNear = 5 - 0.4;                                      // ハートの手前の縁
    assert.ok(tipFromPlayer >= heartNear && tipFromPlayer <= heartNear + 0.25 + 0.01, "先端はハートの縁の少し奥 " + tipFromPlayer);
    assert.equal(ok.extension > 0, true);
    const cases = {
        behind: make(180),                                          // ハートは後ろ
        offAxis: make(60),                                          // 幅の外(狙いを外した)
        notTarget: make(0, { notetag: "<projectRApolloUltimate><hitbox: 1.5, 1.2>" }),
        noHitbox: make(0, { notetag: "<projectRNormalSword>" }),
        invalidHitbox: [make(0, { notetag: "<projectRNormalSword><hitbox: abc, 1.2>" }), make(0, { notetag: "<projectRNormalSword><hitbox: 1.5, 0>" }),
            make(0, { notetag: "<projectRNormalSword><hitbox: -1, 1.2>" }), make(0, { position: "a, b" }), make(0, { position: "1" }), make(0, { position: undefined }),
            make(0, { rotationDegree: "x" }), make(0, { rotationDegree: undefined })]
    };
    for (const [reason, value] of Object.entries(cases)) for (const args of [].concat(value)) {
        const result = w.melee.plan(args);
        assert.deepEqual([result.extend, result.reason, result.args], [false, reason, undefined], reason + " " + JSON.stringify(args));
    }
    assert.equal(w.melee.getLog().filter(e => e.type === "invalidHitbox").length, 8, "書式不正は記録される(8件)");
    assert.deepEqual([w.melee.plan(null).extend, w.melee.plan({}).extend, w.melee.plan("x").extend], [false, false, false], "不正な引数でも例外にならない");
    // 既に届く(ハートが近い)
    w.soul.end("t"); frames(w, 20);
    startSoul(w, { dist: 1.5 });
    assert.equal(w.melee.plan(make(0)).reason, "alreadyReaches");
    w.soul.end("t"); frames(w, 20);
    // 上限(MaxTip 8)より遠い
    startSoul(w, { dist: 10 });
    assert.equal(w.melee.plan(make(0)).reason, "beyondCap");
    w.soul.end("t"); frames(w, 20);
    // 壁(Region 255)
    startSoul(w, { dist: 6 });
    for (let x = HOME.x - 3; x <= HOME.x + 3; x++) setRegion(w, x, HOME.y - 3, 255);
    assert.equal(w.melee.plan(make(0)).reason, "wall");
    for (let x = HOME.x - 3; x <= HOME.x + 3; x++) setRegion(w, x, HOME.y - 3, 0);
    assert.equal(w.melee.plan(make(0)).extend, true, "壁が無ければ延ばす");
    w.soul.end("t"); frames(w, 20);
    // SOUL外
    assert.equal(w.melee.plan(make(0)).reason, "inactive");
    const standalone = w.poc.start({ centerX: c.x, centerY: c.y - 5, pattern: "static" });
    assert.equal(standalone.ok, true);
    assert.equal(w.melee.plan(make(0)).reason, "inactive", "PoC単独(コントローラ無し)では働かない");
    w.poc.end("t");
    startSoul(w, { dist: 5 }); w.soul.end("t"); frames(w, 20);
    assert.equal(w.melee.plan(make(0)).reason, "inactive", "終了後");
    const noHeart = w.soul.start({ heart: false }); assert.equal(noHeart.ok, true);
    assert.equal(w.melee.plan(make(0)).reason, "inactive", "ハートが無いSOUL");
    w.soul.end("t");
    noErrors(w); void id;
});

// ---------------------------------------------------------------- 停止ハート ----------------------------------------------------------------
test("停止ハート(通常の剣): 5〜7マス先に届き、ダメージ・命中回数は近距離と同じ。プレイヤーは動かない。上限(8)を超える10マス先は届かない", () => {
    const w = world(SWORD_CARD);
    equip(w, SWORD_ID); frames(w, 3);
    const base = trial(w, { dist: 1.5 }, swordFire(w, 0, 1.5), 40);
    assert.ok(base.loss > 0 && base.calls === 1 && base.extended === 0, "近距離は延ばさず当たる " + JSON.stringify(base));
    for (const d of [3, 5, 7]) {
        const r = trial(w, { dist: d }, swordFire(w, 0, d), 40);
        assert.deepEqual([r.loss, r.calls, r.moved, r.extended], [base.loss, 1, 0, 1], `${d}マス ` + JSON.stringify(r));
    }
    const far = trial(w, { dist: 10 }, swordFire(w, 0, 10), 40);
    assert.deepEqual([far.loss, far.extended], [0, 0], "上限より遠い");
    noErrors(w);
});
test("停止ハート(剣カード): 5〜7マス先に届き、ダメージ・命中回数は近距離と同じ。カードは1枚だけ消費", () => {
    const w = world(SWORD_CARD);
    const base = trial(w, { dist: 1 }, cardFire(w, SWORD_CARD, 0, 1), 40);
    assert.ok(base.loss > 0 && base.calls === 1);
    for (const d of [3, 5, 7]) {
        const id = startSoul(w, { dist: d });
        const before = plain(deckApi(w).getBattleState().hand.map(h => h.instanceId));
        const r = strike(w, id, cardFire(w, SWORD_CARD, 0, d), 40);
        const after = plain(deckApi(w).getBattleState().hand.map(h => h.instanceId));
        assert.deepEqual([r.loss, r.calls, r.moved, r.extended], [base.loss, 1, 0, 1], `${d}マス ` + JSON.stringify(r));
        assert.equal(before.filter(x => !after.includes(x)).length, 1, "消費は1枚");
        w.soul.end("t"); frames(w, 25);
    }
    assert.equal(trial(w, { dist: 10 }, cardFire(w, SWORD_CARD, 0, 10), 40).loss, 0);
    noErrors(w);
});
test("停止ハート(Hermes奥義): 5〜7マス先に届き、命中は1回・近距離の「1回命中」と同じダメージ。奥義の他の方向の斬撃は延ばしても当たらない(高火力にならない)", () => {
    const w = world("apollo_golden_arrow", "hermes");
    const base = trial(w, { dist: 2 }, ultFire(w, 0, 2), 90);
    assert.ok(base.loss > 0 && base.calls === 1, JSON.stringify(base));
    for (const d of [3, 5, 7]) {
        const r = trial(w, { dist: d }, ultFire(w, 0, d), 90);
        assert.deepEqual([r.loss, r.calls, r.moved], [base.loss, 1, 0], `${d}マス ` + JSON.stringify(r));
        assert.equal(r.extended, 1, "ハートの向きの斬撃だけが延びる");
    }
    assert.equal(trial(w, { dist: 10 }, ultFire(w, 0, 10), 90).loss, 0);
    noErrors(w);
});

// ---------------------------------------------------------------- 外れ ----------------------------------------------------------------
test("外れは外れ: 狙いが約10°を超えてずれると、通常の剣・剣カード・奥義とも外れる(ダメージ0・命中0)。ほぼ合っていれば当たる。後ろへ振っても外れる", () => {
    const w = world(SWORD_CARD);
    equip(w, SWORD_ID); frames(w, 3);
    const table = {};
    for (const off of [0, 10, 20, 40, 180]) table["sword" + off] = trial(w, { dist: 5 }, swordFire(w, off, 5), 40).loss > 0;
    for (const off of [0, 40]) table["card" + off] = trial(w, { dist: 5 }, cardFire(w, SWORD_CARD, off, 5), 40).loss > 0;
    // 横にずれたハートへ、ハートの方向へ狙う → 当たる / まっすぐ上へ振る → 外れる
    table.lateralAimed = trial(w, { dist: 5, dx: 2.5 }, swordFire(w, bearing(2.5, 5), Math.hypot(2.5, 5)), 40).loss > 0;
    table.lateralStraight = trial(w, { dist: 5, dx: 2.5 }, swordFire(w, 0, 5), 40).loss > 0;
    const ult = world("apollo_golden_arrow", "hermes");
    for (const off of [0, 40]) table["ult" + off] = trial(ult, { dist: 5 }, ultFire(ult, off, 5), 90).loss > 0;
    table.ultLateralStraight = trial(ult, { dist: 5, dx: 2.5 }, ultFire(ult, 0, 5), 90).loss > 0;
    console.log("info 外れの表", JSON.stringify(table));
    assert.deepEqual(table, { sword0: true, sword10: true, sword20: false, sword40: false, sword180: false, card0: true, card40: false,
        lateralAimed: true, lateralStraight: false, ult0: true, ult40: false, ultLateralStraight: false });
    noErrors(w); noErrors(ult);
});

// ---------------------------------------------------------------- 動くハート ----------------------------------------------------------------
test("動くハート: 往復するハートが狙いの線上にいる瞬間に振れば当たり、横に離れている瞬間は外れる(通常の剣・剣カード・奥義)", () => {
    const patrol = { heart: { pattern: "patrol", rangeX: 3, speed: 2 } };
    const lateral = w => Math.abs(w.poc.getState().hitCenter.x - center(w).x);
    const swords = world(SWORD_CARD);
    equip(swords, SWORD_ID); frames(swords, 3);
    const run = (w, fire, wait) => {
        const id = startSoul(w, { dist: 5, ...patrol });
        if (wait) while (lateral(w) < 2.4) w.frames(1);
        const at = lateral(w);
        const r = strike(w, id, fire, 40);
        w.soul.end("t"); frames(w, 25);
        return { ...r, at: +at.toFixed(2) };
    };
    const hit = run(swords, swordFire(swords, 0, 5), false), miss = run(swords, swordFire(swords, 0, 5), true);
    console.log("info 動くハート 剣", JSON.stringify({ hit, miss }));
    assert.ok(hit.loss > 0 && hit.calls === 1 && hit.at < 0.3, "線上で当たる");
    assert.equal(miss.loss, 0, "横に離れている瞬間は外れる " + JSON.stringify(miss));
    const card = world(SWORD_CARD);
    assert.ok(run(card, cardFire(card, SWORD_CARD, 0, 5), false).loss > 0);
    assert.equal(run(card, cardFire(card, SWORD_CARD, 0, 5), true).loss, 0);
    const ult = world("apollo_golden_arrow", "hermes");
    const uhit = run(ult, ultFire(ult, 0, 5), false);
    assert.ok(uhit.loss > 0 && uhit.calls === 1, "奥義: 動いていても1回だけ " + JSON.stringify(uhit));
    assert.equal(run(ult, ultFire(ult, 0, 5), true).loss, 0);
    noErrors(swords); noErrors(card); noErrors(ult);
});

// ---------------------------------------------------------------- 薙ぎ払い ----------------------------------------------------------------
test("薙ぎ払い: 扇形の起点を狙った向きへ一時的にずらして6〜7マス先に届く(ダメージ・命中回数は近距離と同じ)。狙いが逸れる/後ろ/上限超は外れる。プレイヤーは動かない", () => {
    const w = world(SWEEP);
    const base = trial(w, { dist: 3 }, cardFire(w, SWEEP, 0, 3), 40);
    assert.ok(base.loss > 0 && base.calls === 1 && w.melee.getStats().sweepShifted === 0, "近距離はずらさない " + JSON.stringify(base));
    for (const d of [5, 6, 7]) {
        const r = trial(w, { dist: d }, cardFire(w, SWEEP, 0, d), 40);
        assert.deepEqual([r.loss, r.calls, r.moved], [base.loss, 1, 0], `${d}マス ` + JSON.stringify(r));
    }
    assert.ok(w.melee.getStats().sweepShifted >= 3);
    assert.equal(trial(w, { dist: 6 }, cardFire(w, SWEEP, 100, 6), 40).loss, 0, "狙いが逸れたら外れる");
    const w2 = world(SWEEP);
    assert.equal(trial(w2, { dist: 6 }, cardFire(w2, SWEEP, 180, 6), 40).loss, 0, "後ろへ振れば外れる");
    assert.equal(trial(w2, { dist: 10 }, cardFire(w2, SWEEP, 0, 10), 40).loss, 0, "上限より遠い");
    assert.equal(trial(w2, { dist: 6, dx: 3.5 }, cardFire(w2, SWEEP, 0, 6), 40).loss, 0, "扇の外へ横に離れたハートは外れる");
    noErrors(w); noErrors(w2);
});
test("薙ぎ払いの起点のずれは発動の間だけ: 終了後もすぐ元に戻り、例外が出ても残らない(try/finally)。壁の向こうはずらさない", () => {
    const w = world(SWEEP);
    const base = () => { const p = w.ctx.$gamePlayer.centerPositionPoint(); return { x: p.x, y: p.y }; };
    const home = base();
    const id = startSoul(w, { dist: 6 });
    // 発動中に例外が出ても、ずれが残らない
    const perform = w.ctx.ProjectRGodSummonManager.perform;
    w.ctx.ProjectRGodSummonManager.perform = () => { throw new Error("boom"); };
    aimDegree(w, 0, 6);
    let thrown = null;
    try { deckApi(w).requestUseCard(0); } catch (error) { thrown = error; } finally { w.ctx.ProjectRGodSummonManager.perform = perform; }
    assert.deepEqual(base(), home, "例外のあとも中心は元の位置 (例外=" + (thrown && thrown.message) + ")");
    assert.equal(w.melee.getStats().scoped, false);
    assert.equal(w.melee.getStats().sweepShifted, 1, "ずらして呼んだ");
    // 通常の発動のあとも元の位置
    frames(w, 200);
    aimDegree(w, 0, 6); deckApi(w).requestUseCard(0);
    assert.deepEqual(base(), home);
    assert.equal(w.melee.getStats().scoped, false);
    w.soul.end("t"); frames(w, 25);
    // 壁
    startSoul(w, { dist: 6 });
    for (let x = HOME.x - 3; x <= HOME.x + 3; x++) setRegion(w, x, HOME.y - 2, 255);
    const shiftedBefore = w.melee.getStats().sweepShifted;
    frames(w, 200);
    aimDegree(w, 0, 6); deckApi(w).requestUseCard(0); frames(w, 30);
    assert.equal(w.melee.getStats().sweepShifted, shiftedBefore, "壁があれば起点をずらさない");
    w.soul.end("t");
    noErrors(w);
});
test("薙ぎ払い(動くハート): 往復するハートに、線上のときは当たり、扇の外へ離れた瞬間は外れる", () => {
    const w = world(SWEEP);
    const patrol = { heart: { pattern: "patrol", rangeX: 3.5, speed: 2 } };
    const lateral = () => Math.abs(w.poc.getState().hitCenter.x - center(w).x);
    const run = wait => {
        const id = startSoul(w, { dist: 6, ...patrol });
        if (wait) while (lateral() < 3.3) w.frames(1);
        const r = strike(w, id, cardFire(w, SWEEP, 0, 6), 40);
        w.soul.end("t"); frames(w, 25);
        return r;
    };
    const hit = run(false), miss = run(true);
    assert.ok(hit.loss > 0 && hit.calls === 1, JSON.stringify(hit));
    assert.equal(miss.loss, 0, JSON.stringify(miss));
    noErrors(w);
});

// ---------------------------------------------------------------- 一閃・P2-B ----------------------------------------------------------------
test("一閃は元のまま(アダプタは触らない)。移動カードの遮断(P2-B)もアダプタの有無に関係なく有効で、プレイヤーは動かない", () => {
    const issen = world(ISSEN);
    const before = issen.melee.getStats();
    const r = trial(issen, { dist: 5 }, cardFire(issen, ISSEN, 0, 5), 120);
    assert.ok(r.loss > 0 && r.calls >= 1 && r.moved === 0);
    assert.equal(r.extended, 0, "一閃は延ばさない");
    assert.deepEqual(plain(issen.melee.getStats()).sweepShifted, before.sweepShifted);
    const zetsu = world("hermes_swift_movement");               // 絶は SOUL専用の構え。遮断が残るのは高速移動
    startSoul(zetsu, { dist: 5 });
    aimDegree(zetsu, 0, 5);
    assert.equal(plain(deckApi(zetsu).requestUseCard(0)).reason, "soulMovementBlocked");
    frames(zetsu, 60);
    assert.equal(dist(pos(zetsu), HOME), 0);
    zetsu.soul.end("t");
    noErrors(issen);
});

// ---------------------------------------------------------------- フェーズ境界 ----------------------------------------------------------------
test("フェーズ境界(奥義): 攻撃ターンの最後に発動した奥義の後続の斬撃は、防御に入ってからも延びてハートに当たる(1回・同じダメージ)。防御中の新しい近接は遮断され延長もされない", () => {
    const w = world("apollo_golden_arrow", "hermes");
    const baseline = trial(w, { dist: 2 }, ultFire(w, 0, 2), 90);
    const id = startSoul(w, { dist: 5, attackSeconds: 1 });
    while (w.soul.getState().framesLeft > 2) w.frames(1);
    w.calls.length = 0;
    const ext0 = w.melee.getStats().extended;
    ultFire(w, 120, 5)();                     // ハートへ向く斬撃は発動の約0.5秒後(防御に入ってから)に出る向きへ狙う
    frames(w, 2);
    assert.equal(w.soul.getPhase(), "defense");
    const atFlip = { loss: HP - barHp(w, id), extended: w.melee.getStats().extended - ext0 };
    frames(w, 120);
    const calls = w.calls.filter(c => c.name === "UpdateEventHp" && String(c.args.eventId) === String(id)).length;
    console.log("info 奥義のフェーズ境界", JSON.stringify({ atFlip, loss: HP - barHp(w, id), calls, extended: w.melee.getStats().extended - ext0 }));
    assert.equal(atFlip.loss, 0, "防御に入った時点ではまだ当たっていない");
    assert.equal(calls, 1);
    assert.equal(HP - barHp(w, id), baseline.loss);
    assert.equal(w.melee.getStats().extended - ext0, 1, "防御に入ってから出た斬撃が延びた");
    // 防御中の新しい近接は遮断される(延長の計画にも入らない)
    const passed0 = JSON.stringify(w.melee.getStats().passed), extended = w.melee.getStats().extended;
    ultFire.call(null, w, 0, 5);
    const attempt = plain(w.ctx.ProjectRUltimateActivation.requestUltimateActivation("api"));
    assert.equal(attempt.ok, false, "防御中の奥義は受け付けない " + JSON.stringify(attempt));
    assert.equal(w.melee.getStats().extended, extended);
    void passed0;
    w.soul.end("t");
    noErrors(w);
});
test("フェーズ境界(剣): 攻撃ターンの最後に振った剣は、防御に入った後も寿命の間は当たる(1回)。防御中に振ろうとしても振れない", () => {
    const w = world(SWORD_CARD);
    equip(w, SWORD_ID); frames(w, 3);
    const base = trial(w, { dist: 1.5 }, swordFire(w, 0, 1.5), 40);
    const id = startSoul(w, { dist: 5, attackSeconds: 1 });
    while (w.soul.getState().framesLeft > 2) w.frames(1);
    w.calls.length = 0;
    swordFire(w, 0, 5)();
    frames(w, 2);
    assert.equal(w.soul.getPhase(), "defense");
    frames(w, 40);
    const hits = w.calls.filter(c => c.name === "UpdateEventHp" && String(c.args.eventId) === String(id)).length;
    assert.equal(hits, 1);
    assert.equal(HP - barHp(w, id), base.loss);
    const swings = w.ctx.ProjectRSwordSystem.status().swings, extended = w.melee.getStats().extended;
    w.attackClick(); frames(w, 10);
    assert.equal(w.ctx.ProjectRSwordSystem.status().swings, swings, "防御中は振れない");
    assert.equal(w.melee.getStats().extended, extended);
    w.soul.end("t");
    noErrors(w);
});

// ---------------------------------------------------------------- 通常戦闘の復元 ----------------------------------------------------------------
test("通常戦闘の復元: SOULを始めない/終えた後は、近接は従来の射程のまま(遠いハート・敵には届かない)。近距離の判定・ダメージは同じで、延長もずらしも起きない", () => {
    const w = world(SWORD_CARD);
    equip(w, SWORD_ID); frames(w, 3);
    const stats0 = plain(w.melee.getStats());
    // SOUL外(PoC単独のハート=通常の敵と同じ扱い): 遠いと届かない
    const c = center(w);
    assert.equal(w.poc.start({ centerX: c.x, centerY: c.y - 5, pattern: "static" }).ok, true);
    const far = (() => { const id = w.poc.getState().eventId; attachHpBars(w, [id], HP); return strike(w, id, swordFire(w, 0, 5), 40); })();
    w.poc.end("t"); frames(w, 25);
    assert.deepEqual([far.loss, far.extended], [0, 0], "SOUL外は届かない");
    // SOULの前後で近距離の結果が同じ
    const during = trial(w, { dist: 1.5 }, swordFire(w, 0, 1.5), 40);
    const after = trial(w, { dist: 1.5 }, swordFire(w, 0, 1.5), 40);
    assert.equal(during.loss, after.loss);
    // SOUL終了後、遠くへ振っても届かない(SOUL中は届く)
    const inSoul = trial(w, { dist: 5 }, swordFire(w, 0, 5), 40);
    assert.ok(inSoul.loss > 0);
    w.placePlayer(HOME.x, HOME.y); frames(w, 3);
    const c2 = center(w);
    assert.equal(w.poc.start({ centerX: c2.x, centerY: c2.y - 5, pattern: "static" }).ok, true);
    const id = w.poc.getState().eventId; attachHpBars(w, [id], HP);
    const outSoul = strike(w, id, swordFire(w, 0, 5), 40);
    w.poc.end("t");
    assert.equal(outSoul.loss, 0, "終了後は従来の射程");
    const stats1 = plain(w.melee.getStats());
    assert.equal(stats1.scoped, false);
    assert.equal(stats1.sweepShifted, stats0.sweepShifted);
    // 薙ぎ払いも、SOUL外では従来の射程(4マス)
    const sweep = world(SWEEP);
    const sc = center(sweep);
    sweep.poc.start({ centerX: sc.x, centerY: sc.y - 6, pattern: "static" });
    const sid = sweep.poc.getState().eventId; attachHpBars(sweep, [sid], HP);
    assert.equal(strike(sweep, sid, cardFire(sweep, SWEEP, 0, 6), 40).loss, 0);
    assert.equal(sweep.melee.getStats().sweepShifted, 0);
    sweep.poc.end("t");
    noErrors(w); noErrors(sweep);
});

console.log(`\n${passed} tests passed`);
