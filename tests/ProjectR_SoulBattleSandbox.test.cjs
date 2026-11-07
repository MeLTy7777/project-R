"use strict";
// SOUL戦闘 手動テスト用サンドボックス(P3-B拡張)の検証: シナリオごとの準備(性格・ボス・近接5マス・複数弾・フェイント)、切り替え、診断、デコイ矢、後始末。
// 実エンジン(Map004のアリーナ + 全plugin)。MZは起動しない。
const assert = require("node:assert/strict");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { buildWorld, plain, aimDegree, attachHpBars, barHp, HP, deckApi } = fx;

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const quiet = () => { const original = console.log; console.log = () => {}; return () => { console.log = original; }; };

function arenaWorld() {
    const w = buildWorld();
    assert.equal(w.failures.length, 0);
    w.enterMap(4, 25, 26); frames(w, 5);
    w.run("Math.random = () => 0.999;");                         // ダメージのばらつき・クリティカルを固定
    w.sb = w.ctx.ProjectRSoulSandbox; w.dodge = w.ctx.ProjectRSoulBattleDodge; w.soul = w.ctx.ProjectRSoulBattle; w.poc = w.ctx.ProjectRSoulBattlePoC;
    return w;
}
const noErrors = w => {
    const bad = [...w.soul.getLog(), ...w.poc.getLog(), ...w.dodge.getLog()].filter(e => /error|Error/.test(e.type));
    assert.deepEqual(bad, [], JSON.stringify(bad));
};
// コンソール出力を捨てて実行する(テストの出力を汚さない)
const quietly = fn => { const restore = quiet(); try { return fn(); } finally { restore(); } };
const heartId = w => w.soul.getState().heart.eventId;
const arrows = w => w.ctx.$gameMap.events().filter(e => e && !e._erased && e.event()?.note?.includes("<projectRGoldenArrow>"));

test("シナリオ一覧: P3-Aの5つに続けて、近接5マス・性格4種・複数弾・フェイント・ボス・A16統合(a16)が揃う。helpは一覧を返す", () => {
    const w = arenaWorld();
    assert.deepEqual([...w.sb.SCENARIOS], ["dodge", "dodgeFast", "dodgeSlow", "patrol", "static", "melee5", "beginner", "balanced", "evasive", "aggressive", "multi", "feint", "boss", "a16"]);
    assert.deepEqual(quietly(() => plain(w.sb.help())), [...w.sb.SCENARIOS]);
    assert.equal(typeof w.sb.profile, "function");
    assert.equal(typeof w.sb.volley, "function");
    assert.equal(typeof w.sb.feint, "function");
});

test("各シナリオを1コマンドで準備できる: 性格・ボスが回避AIに適用され、ハートの距離・武器・回避なし(patrol/static)も正しい。切り替えで前の状態は残らない", () => {
    const w = arenaWorld();
    const expectations = {
        beginner: { profile: "beginner", distance: 9 }, balanced: { profile: "balanced", distance: 9 }, evasive: { profile: "evasive", distance: 9 }, aggressive: { profile: "aggressive", distance: 9 },
        multi: { profile: "evasive", distance: 9 }, feint: { profile: "balanced", distance: 9 }, boss: { boss: "dev_boss", profile: "boss", distance: 9 }, melee5: { profile: "balanced", distance: 5, weapon: 2 },
        dodge: { distance: 9 }, patrol: { off: true, distance: 6 }, static: { off: true, distance: 6 }
    };
    for (const [name, expected] of Object.entries(expectations)) {
        const result = quietly(() => plain(w.sb.start(name)));
        assert.equal(result.ok, true, name + " " + JSON.stringify(result));
        frames(w, 4);
        assert.equal(w.soul.isActive(), true, name);
        assert.equal(w.sb.scenario(), name);
        const player = w.ctx.$gamePlayer.centerPositionPoint(), heart = w.poc.getState().hitCenter;
        assert.ok(Math.abs(player.y - heart.y - expected.distance) < 0.05, `${name}: ハートは${expected.distance}マス北 ${player.y - heart.y}`);
        if (expected.off) assert.equal(w.dodge.isActive(), false, name + ": 回避AIなし");
        else {
            assert.equal(w.dodge.isActive(), true, name);
            if (expected.profile) assert.equal(w.dodge.getState().profile, expected.profile, name);
            if (expected.boss) assert.equal(w.dodge.getState().boss, expected.boss, name);
        }
        if (expected.weapon) assert.equal(w.ctx.$gameParty.leader().equips()[0].id, expected.weapon, name + ": 武器");
        assert.equal(w.run("playerMovementDisabled"), true);
        assert.equal(w.ctx.$gameSystem.isSaveEnabled(), false, "SOUL中はセーブ不可");
    }
    assert.equal(w.poc.getState().pattern, "static");
    quietly(() => w.sb.start("patrol")); frames(w, 5);
    assert.equal(w.poc.getState().pattern, "patrol", "P0の往復");
    assert.equal(w.dodge.isActive(), false);
    assert.equal(w.sb.start("bogus").ok === false || true, true);
    assert.equal(quietly(() => plain(w.sb.start("bogus"))).ok, false);
    assert.equal(w.sb.scenario(), "patrol", "失敗した切り替えは何も変えない");
    quietly(() => w.sb.stop());
    noErrors(w);
});

test("近接5マス(melee5): 最初の一撃は避けられず当たり(ダメージ100)、被弾後にハートが横へ退いて同じ向きの二撃目は外れる。回避AIは作動している", () => {
    const w = arenaWorld();
    quietly(() => w.sb.start("melee5")); frames(w, 5);
    const id = heartId(w);
    attachHpBars(w, [id], HP);
    const swing = () => { aimDegree(w, 0, 5); w.attackClick(); frames(w, 24); };
    swing();
    const first = HP - barHp(w, id);
    assert.equal(first, 100, "最初の一撃は当たる");
    swing();
    assert.equal(HP - barHp(w, id), first, "二撃目(同じ向き)は外れる");
    const state = w.dodge.getState();
    assert.ok(state.stats.meleeCues >= 1 && state.stats.hitsTaken === 1 && state.dodgeReason === "hitReaction", JSON.stringify(state.stats));
    quietly(() => w.sb.stop());
    noErrors(w);
});

test("デコイ矢の複数弾: volley(5) はダメージなしで扇状に飛ぶ。回避型は反応して避け、ハートのHPは変わらない。デコイは寿命(150frame)で消え、残らない", () => {
    const w = arenaWorld();
    quietly(() => w.sb.start("multi")); frames(w, 5);
    const id = heartId(w);
    attachHpBars(w, [id], HP);
    const result = quietly(() => plain(w.sb.volley(5, 40)));
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.count, 5);
    assert.equal(w.sb.decoyCount(), 5);
    frames(w, 60);
    const state = w.dodge.getState();
    assert.ok(state.stats.dodges >= 1 && state.stats.noticed >= 1, "AIが反応した " + JSON.stringify(state.stats));
    assert.equal(HP - barHp(w, id), 0, "デコイはダメージを与えない");
    frames(w, 120);
    assert.equal(w.sb.decoyCount(), 0, "寿命で消える");
    assert.equal(arrows(w).length, 0, "矢のEventも残らない");
    // 回避なしのハートに当たってもダメージなし
    quietly(() => w.sb.start("static")); frames(w, 5);
    const sid = heartId(w);
    attachHpBars(w, [sid], HP);
    quietly(() => w.sb.volley(3, 0)); frames(w, 100);
    assert.equal(HP - barHp(w, sid), 0, "デコイが直撃してもダメージ0");
    assert.equal(quietly(() => plain(w.sb.volley(0))).ok, true, "本数は1〜12に丸める");
    quietly(() => w.sb.stop());
    noErrors(w);
});

test("フェイント: feint(\"cancel\") は途中で消え、feint(\"redirect\") は向きを変える。AIはどちらも認識する。不正な種類・SOUL外は断る", () => {
    const w = arenaWorld();
    assert.equal(quietly(() => plain(w.sb.feint("cancel"))).ok, false, "SOULが動いていない");
    assert.equal(quietly(() => plain(w.sb.volley(3))).ok, false);
    quietly(() => w.sb.start("feint")); frames(w, 5);
    assert.equal(quietly(() => plain(w.sb.feint("nonsense"))).ok, false);
    assert.equal(quietly(() => plain(w.sb.feint("cancel"))).ok, true);
    frames(w, 40);
    assert.equal(w.dodge.getStats().cancels, 1, "取り消しを認識");
    assert.equal(w.sb.decoyCount(), 0);
    assert.equal(quietly(() => plain(w.sb.feint("redirect"))).ok, true);
    frames(w, 40);
    assert.ok(w.dodge.getStats().redirects >= 1, "向きの変更を認識");
    assert.ok(w.dodge.getState().cues.some(c => c.type === "cancel") && w.dodge.getState().cues.some(c => c.type === "redirect"));
    quietly(() => w.sb.stop());
    noErrors(w);
});

test("性格の切り替え: profile(\"boss\") は動作中に性格だけを替える。不正な名前・回避AIなしのシナリオでは断り、何も変えない", () => {
    const w = arenaWorld();
    quietly(() => w.sb.start("static")); frames(w, 3);
    assert.equal(quietly(() => plain(w.sb.profile("boss"))).ok, false, "回避AIなし");
    quietly(() => w.sb.start("beginner")); frames(w, 3);
    assert.equal(w.dodge.getState().profile, "beginner");
    assert.equal(quietly(() => plain(w.sb.profile("evasive"))).ok, true);
    assert.equal(w.dodge.getState().profile, "evasive");
    assert.equal(quietly(() => plain(w.sb.profile("nope"))).ok, false);
    assert.equal(w.dodge.getState().profile, "evasive", "失敗しても変わらない");
    quietly(() => w.sb.stop());
});

test("診断の表示: status() は 状態・性格・ボス/フェーズ・クールダウン・当たり/外れ・選んだ脅威・回避の理由・手がかり・遮断 を返し、コンソールにも出す", () => {
    const w = arenaWorld();
    const capture = fn => { const lines = []; const original = console.log; console.log = (...args) => lines.push(args.join(" ")); try { return { value: plain(fn()), text: lines.join(" | ") }; } finally { console.log = original; } };
    const keys = ["state", "profile", "boss", "phase", "hits", "misses", "dodges", "noticed", "cooldownLeft", "recoveryLeft", "threats", "selectedThreat", "dodgeReason", "cancels", "redirects", "meleeCues", "exhaustions", "staggers", "feintActive"];
    // ボス: ボス名・フェーズが出る
    quietly(() => w.sb.start("boss")); frames(w, 5);
    attachHpBars(w, [heartId(w)], HP);
    const boss = capture(() => w.sb.status());
    assert.equal(boss.value.scenario, "boss");
    assert.equal(boss.value.phase, "attack");
    assert.ok(boss.value.heart && Number.isFinite(boss.value.heart.hp));
    for (const key of keys) assert.ok(key in boss.value.dodge, "診断項目 " + key);
    assert.deepEqual([boss.value.dodge.boss, boss.value.dodge.phase, boss.value.dodge.profile], ["dev_boss", "base", "boss"]);
    for (const needle of ["回避AI: 状態=", "性格=boss", "ボス=dev_boss", "戦績: 当たり", "外れ", "遮断(防御"]) assert.ok(boss.text.includes(needle), "表示に含まれる: " + needle);
    // 回避型: 複数弾に反応した後は、選んだ脅威・回避の理由・直近の回避が出る
    quietly(() => w.sb.start("evasive")); frames(w, 5);
    attachHpBars(w, [heartId(w)], HP);
    quietly(() => w.sb.volley(3, 30)); frames(w, 14);
    const evasive = capture(() => w.sb.status());
    assert.ok(evasive.value.dodge.dodges >= 1 && evasive.value.dodge.dodgeReason, "回避の理由が出る " + JSON.stringify(evasive.value.dodge.lastDodge));
    assert.ok(evasive.value.dodge.lastDodge.candidates >= 30 && evasive.value.dodge.lastEval, "評価の規模も出る");
    for (const needle of ["直近の回避: 理由=", "いま見えている脅威", "手がかり: 近接"]) assert.ok(evasive.text.includes(needle), "表示に含まれる: " + needle);
    quietly(() => w.sb.stop());
    noErrors(w);
});

test("1コマンドの後始末: デコイ・SOUL・回避AI・ダミーの位置・武器と弾薬・カード戦闘が元に戻り、永続データ(所持品・装備・カードの所持)は開始前と同じ。マップ移動後にデコイが残らない", () => {
    const w = arenaWorld();
    const permanent = () => JSON.stringify({ items: w.ctx.$gameParty._items, weapons: w.ctx.$gameParty._weapons, armors: w.ctx.$gameParty._armors, gold: w.ctx.$gameParty._gold,
        equips: w.ctx.$gameParty.leader().equips().map(e => e && e.id || 0), cards: w.ctx.$gameSystem._projectRCardDeckData || null, save: w.ctx.$gameSystem._saveEnabled });
    const dummies = () => w.ctx.$gameMap.events().filter(e => e && !e.isSpawnEvent && e.event()?.note?.includes("<enemy>")).map(e => [e.eventId(), e._realX, e._realY]);
    const before = permanent(), dummiesBefore = dummies();
    quietly(() => w.sb.start("melee5")); frames(w, 5);
    quietly(() => w.sb.weapon("gun")); frames(w, 2);
    quietly(() => w.sb.volley(4)); frames(w, 10);
    assert.ok(w.sb.decoyCount() > 0);
    const stopped = quietly(() => plain(w.sb.stop()));
    assert.equal(stopped.ok, true, JSON.stringify(stopped));
    frames(w, 6);
    assert.deepEqual([w.sb.decoyCount(), w.soul.isActive(), w.dodge.isActive(), w.dodge.isArmed(), deckApi(w).isCardBattleActive(), w.run("playerMovementDisabled")], [0, false, false, false, false, false]);
    assert.equal(arrows(w).length, 0, "デコイの矢が残らない");
    assert.deepEqual(dummies(), dummiesBefore, "ダミーが元の位置");
    assert.equal(permanent(), before, "永続データは開始前と同じ");
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), true);
    // もう一度始めて止める(繰り返し)
    quietly(() => w.sb.start("evasive")); frames(w, 5); quietly(() => w.sb.stop()); frames(w, 5);
    assert.equal(permanent(), before);
    // デコイが残った状態でマップが変わっても何も残らない
    quietly(() => w.sb.start("multi")); frames(w, 5);
    quietly(() => w.sb.volley(3)); frames(w, 3);
    w.ctx.$gameMap.setup(4); frames(w, 5);
    assert.equal(w.soul.isActive(), false);
    assert.equal(arrows(w).length, 0);
    quietly(() => w.sb.stop()); frames(w, 20);
    assert.equal(w.sb.decoyCount(), 0);
    noErrors(w);
});

console.log(`\n${passed} tests passed`);
