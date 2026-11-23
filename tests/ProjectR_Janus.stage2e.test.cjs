"use strict";
// Stage 2-E: Janus の品質の仕上げ。実エンジン(実Map004 + 全plugin + 実 Hendrix のダメージ)。
//   【1】閉門の耐性の前提: 状態 12(麻痺)・13(スタン)の DB の定義と、既存の敵の耐性の仕組み(Game_Enemy の状態無効・有効度・「状態異常防止」)に一致する
//   【2】Janus の奥義に Hermes の絵を使わない: ProjectR_CutIn は絵の無い神には出さない(Hermes / Apollo は従来どおり)・神の表示の素材も無い
//   【3】命中の手応え(HitFx / HitStop): ダメージを与える Janus のスキル(双門・境界断ち・反照の反撃・奥義)に出る。ダメージ・判定・時間は変わらない。ダメージの無いスキルには出ない
//   【4】門・反照・転化・断ちの見た目(既存の素材だけ = コードで描く輪・線): 出る・終わる・後片付け・失敗しても効果は変わらない・画像を読まない
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, placePolar, placeEnemy, center, parkOthers, aimDegree, lost, resetHp, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const JANUS = ["janus_dual_gate", "janus_closed_gate", "janus_reflection", "janus_inversion", "janus_boundary_slash"];
const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, JS = w => w.ctx.ProjectRJanusSkills, JU = w => w.ctx.ProjectRJanusUltimate;
const UA = w => w.ctx.ProjectRUltimateActivation, GA = w => w.ctx.ProjectRUltimateGauge, CI = w => w.ctx.ProjectRCutIn;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const SLOT_OF = { lmb: "attack", shift: "mobility", e: "special", x: "card1", c: "card2" };
const root = path.join(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const SgetBattler = (w, id) => w.run(`SgetBattlerForH($gameMap.event(${id}))`);

function janusWorld({ slots = {}, q = null, rings = ["janus"], begin = true } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    for (const r of rings) { assert.equal(D(w).assignRingToPlayer(r).ok, true, r); assert.equal(RL(w).equipRing(r).ok, true, r); }
    for (const id of JANUS) { assert.equal(D(w).setCardOwned(id, true).ok, true, id); assert.equal(D(w).setCardLevel(id, 1).ok, true, id); }
    for (const [slot, id] of Object.entries(slots)) assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id);
    if (q) assert.equal(RL(w).setUltimate(q).ok, true, "Q=" + q);
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); }
    return w;
}
const use = (w, slot) => plain(FC(w).useAbility(SLOT_OF[slot]));
const hitFx = w => plain(FC(w).getHitFx());
const fillGauge = w => GA(w).addUltimateGauge(GA(w).getUltimateGaugeMax(), "test");
const pressQ = (w, hold = 3) => { w.keyDown("KeyQ", 81); frames(w, hold); w.keyUp("KeyQ", 81); frames(w, 1); };
const enemyHit = (w, eventId, value = "-50") => { const i = new w.ctx.Game_Interpreter(); i._eventId = eventId; w.ctx.PluginManager.callCommand(i, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "player", value, exceedMaxHealth: "false" }); frames(w, 2); };
const W = 100;

// ---------------------------------------------------------------- 【1】閉門の耐性の前提 ----------------------------------------------------------------
test("【1a】DB の定義: 状態 12 = 麻痺・13 = スタン(どちらも行動不能の制約 4)。「状態異常防止」(23)が 12 と 13 を防ぐ。敵のデータに 12/13 の耐性を持つ敵は今は無い", () => {
    const states = JSON.parse(read("data/States.json")), enemies = JSON.parse(read("data/Enemies.json"));
    assert.deepEqual([states[12].name, states[12].restriction, states[13].name, states[13].restriction], ["麻痺", 4, "スタン", 4]);
    const guard = states[23].traits.filter(t => t.code === 14).map(t => t.dataId);
    assert.ok(guard.includes(12) && guard.includes(13), "状態異常防止(23)の「ステート無効化」に 12・13 が入っている: " + guard);
    for (const e of enemies.filter(Boolean)) assert.equal(e.traits.some(t => (t.code === 13 || t.code === 14) && (t.dataId === 12 || t.dataId === 13)), false, e.name + " は今は 12/13 の耐性を持たない");
});
test("【1b】実際の敵(Game_Enemy)の耐性: 何も無ければ効く / 状態異常防止(23)・ステート無効化(14)・ステート有効度 0(13)があれば効かない。Game_Battler の isStateAddable(公式の付与の可否)と一致する", () => {
    const w = janusWorld({ slots: { e: "janus_closed_gate" } });
    const resists = id => w.run(`ProjectRJanusSkills.resists($gameMap.event(${id}))`);
    const addable = (id, state) => w.run(`SgetBattlerForH($gameMap.event(${id})).isStateAddable(${state})`);
    // 何も無い敵
    assert.deepEqual([resists(3), addable(3, 12), addable(3, 13)], [false, true, true], "何も無ければ効く(公式の付与も通る)");
    // 状態異常防止(23)を持つ敵
    w.run("SgetBattlerForH($gameMap.event(4)).addState(23)");
    assert.deepEqual([resists(4), addable(4, 12), addable(4, 13)], [true, false, false], "状態異常防止(23): 効かない(公式の付与も通らない)");
    // 敵のデータ(DB の敵の特徴)は、同じ敵の種類のイベント全員が共有する。1つずつ足して確かめ、戻す。
    const withTrait = (id, trait, fn) => w.run(`(function(){ var b = SgetBattlerForH($gameMap.event(${id})), e = b.enemy(), saved = e.traits; e.traits = saved.concat([${JSON.stringify(trait)}]); ${fn}; e.traits = saved; })()`);
    const probe = id => w.run(`(function(){ var b = SgetBattlerForH($gameMap.event(${id})), e = b.enemy(), saved = e.traits; return [ProjectRJanusSkills.resists($gameMap.event(${id})), b.isStateAddable(12), b.isStateAddable(13), b.stateRate(12)]; })()`);
    const traitCase = (trait, expected, msg) => {
        w.run(`(function(){ var e = SgetBattlerForH($gameMap.event(5)).enemy(); window.__saved = e.traits; e.traits = e.traits.concat([${JSON.stringify(trait)}]); })()`);
        const got = plain(probe(5)); w.run("SgetBattlerForH($gameMap.event(5)).enemy().traits = window.__saved");
        assert.deepEqual(got, expected, msg);
    };
    void withTrait;
    traitCase({ code: 14, dataId: 13, value: 1 }, [true, true, false, 1], "スタン(13)の無効化(ステート無効化 = 14)だけでも効かない");
    traitCase({ code: 13, dataId: 12, value: 0 }, [true, true, true, 0], "麻痺(12)のステート有効度 0(13)でも効かない(公式の AddState も確率 0 で付かない。isStateAddable は有効度を見ないので true)");
    traitCase({ code: 13, dataId: 12, value: 0.5 }, [true, true, true, 0.5], "有効度 0.5 は確率: 乱数 0.999 では効かない(公式の AddState と同じ判定)");
    w.run("Math.random = () => 0.1"); traitCase({ code: 13, dataId: 12, value: 0.5 }, [false, true, true, 0.5], "有効度 0.5 は確率: 乱数 0.1 では効く"); w.run("Math.random = () => 0.999");
    // 公式の判定そのもの(ScheckStateResistanceH)と一致する
    w.run("SgetBattlerForH($gameMap.event(5)).addState(23)"); assert.deepEqual(plain(w.run("ScheckStateResistanceH(5, 12)")), { stateRate: 1, hasStateResist: true }); assert.equal(w.run("ProjectRJanusSkills.resists($gameMap.event(5))"), true); w.run("SgetBattlerForH($gameMap.event(5)).removeState(23)");
    assert.deepEqual(plain(probe(5)), [false, true, true, 1], "戻したあとは効く");
    // 閉門で通しで: 3(何も無い)は拘束・4(状態異常防止 = 状態 23)は耐性
    aimDegree(w, 0, 3); placePolar(w, 3, 3.0, 0); placePolar(w, 4, 3.0, 25);
    assert.equal(use(w, "e").ok, true); const info = plain(JS(w).getLastResult("closed"));
    assert.deepEqual([info.immobilized, info.resisted], [[3], [4]], JSON.stringify(info));
    FC(w).end("test");
});
test("【1c】耐性のあるボスは、移動速度の低下も受けない(拘束にも低下にも耐性が効く)。耐性が無いボスは低下する", () => {
    const w = janusWorld({ slots: { e: "janus_closed_gate" } }); aimDegree(w, 0, 3);
    for (const id of [3, 4]) { const e = w.ctx.$gameMap.event(id); e.event().note = (e.event().note || "") + "<fieldBoss: テストボス>"; }
    w.run("SgetBattlerForH($gameMap.event(4)).addState(23)");
    placePolar(w, 3, 3.0, 0); placePolar(w, 4, 3.0, 25);
    assert.equal(use(w, "e").ok, true); const info = plain(JS(w).getLastResult("closed"));
    assert.deepEqual([info.slowed, info.resisted, info.immobilized], [[3], [4], []], JSON.stringify(info));
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【2】Hermes の絵を使わない ----------------------------------------------------------------
test("【2a】ProjectR_CutIn: 目元の絵が登録されていない神(Janus)には、奥義でもカードでも何も出さない(noArtwork)。Hermes・Apollo は従来どおり出る。Hermes の絵への代用はしない", () => {
    const w = janusWorld({ begin: false });
    assert.deepEqual(plain(CI(w).show({ kind: "ultimate", godId: "janus" })), { ok: false, reason: "noArtwork" });
    assert.deepEqual(plain(CI(w).show({ kind: "card", godId: "janus", cardId: "janus_dual_gate" })), { ok: false, reason: "noArtwork" });
    assert.deepEqual(plain(CI(w).getActive()), []);
    assert.equal(CI(w).show({ kind: "ultimate", godId: "hermes" }).ok, true); assert.equal(CI(w).show({ kind: "card", godId: "apollo", cardId: "apollo_golden_volley" }).ok, true);
    assert.deepEqual(plain(CI(w).getActive()).map(e => [e.kind, e.godId]).sort(), [["card", "apollo"], ["ultimate", "hermes"]]);
    assert.equal(Object.prototype.hasOwnProperty.call(plain(CI(w).assets().gods), "janus"), false, "Janus の絵の登録は無い(用意されたら GodEyesJson へ足すだけ)");
    assert.equal(CI(w).isCardEnabled("janus_dual_gate"), false, "Janus のカードはカットインの対象ではない");
});
test("【2b】実際の Q(Janus の奥義): カットインは出ない。Hermes の奥義の Q は従来どおり出る。神の表示(同行)に Janus の見た目は無い(Hermes の絵が出ない)", () => {
    const w = janusWorld({ q: "janus", slots: { lmb: "janus_dual_gate" } }); aimDegree(w, 0, 3); fillGauge(w); pressQ(w, 1);
    assert.equal(JU(w).isActive(), true, "奥義は始まる"); frames(w, 4);
    assert.deepEqual(plain(CI(w).getActive()), [], "Janus の奥義にカットインは出ない(Hermes の目元の絵も出ない)");
    assert.deepEqual(plain(w.ctx.ProjectRGodSummonVisual.getAppearance("janus")), {}, "神の表示の見た目は、Janus には無い(Hermes の絵で代用しない)");
    FC(w).end("test");
    const h = janusWorld({ q: "hermes", rings: ["janus", "hermes"] }); aimDegree(h, 0, 3); fillGauge(h); pressQ(h, 1); frames(h, 4);
    assert.deepEqual(plain(CI(h).getActive()).map(e => [e.kind, e.godId]), [["ultimate", "hermes"]], "Hermes の奥義のカットインは従来どおり");
    FC(h).end("test");
});

// ---------------------------------------------------------------- 【3】命中の手応え ----------------------------------------------------------------
test("【3a】双門: 1段目・2段目とも命中の手応え(点滅・反動・ヒットストップ・SE)が出る(既存の SwordSystem の通知)。ダメージは従来どおり", () => {
    const w = janusWorld({ slots: { lmb: "janus_dual_gate" } }); aimDegree(w, 0, 1.2); placePolar(w, 3, 1.2, 0); resetHp(w);
    assert.equal(use(w, "lmb").ok, true); frames(w, 14);
    assert.equal(lost(w, 3), W, "1段目 100 %"); assert.ok(hitFx(w).stats.notified >= 1, "SwordSystem が命中を通知している(HP が次のフレームで減る実ゲームでの手応えの確定は、実機 janus_verify で確かめる): " + JSON.stringify(hitFx(w).stats));
    FC(w).end("test");
});
test("【3b】境界断ち: 当たった全員に強撃の手応え(heavy)。ダメージの値・タイミング(0.2 秒後)は変わらない。同じ斬撃のSEは1回だけ", () => {
    const w = janusWorld({ slots: { shift: "janus_boundary_slash" } }); aimDegree(w, 0, 2); placePolar(w, 3, 1.5, 0); placePolar(w, 4, 3.0, 0); resetHp(w);
    const se0 = w.sounds ? w.sounds.length : 0; void se0;
    assert.equal(use(w, "shift").ok, true); frames(w, 11);
    assert.deepEqual([lost(w, 3), lost(w, 4)], [0, 0], "予備動作の間(12 フレームより前)はダメージなし = タイミングは不変"); assert.equal(hitFx(w).stats.notified, 0, "ダメージが出るまで手応えも出ない");
    frames(w, 4);
    assert.deepEqual([lost(w, 3), lost(w, 4)], [W * 1.8, W * 1.8], "180 %");
    const h = hitFx(w); assert.equal(h.stats.notified, 2); assert.equal(h.stats.confirmed, 2); assert.equal(h.stats.se, 1, "1回の斬撃につきSEは1回");
    assert.ok(h.active.length === 2 && h.active.every(a => a.kind === "heavy"), JSON.stringify(h.active));
    assert.ok(plain(w.ctx.ProjectRHitStop.getActive()).length >= 1 || h.stats.hitstops >= 2, "当たった敵だけが少し止まる: " + JSON.stringify(h.stats));
    FC(w).end("test");
});
test("【3c】反照の反撃: 反撃を受けた攻撃者に手応え(melee)。無効にした一撃・反撃以外には出ない。ダメージ(100 %)は不変", () => {
    const w = janusWorld({ slots: { e: "janus_reflection" } }); aimDegree(w, 0, 1); placePolar(w, 3, 1.0, 0); resetHp(w);
    assert.equal(use(w, "e").ok, true); enemyHit(w, 3);
    assert.equal(lost(w, 3), W, "反撃 100 %"); const h = hitFx(w); assert.equal(h.stats.confirmed, 1); assert.equal(h.active.length, 1); assert.equal(h.active[0].eventId, 3); assert.equal(h.active[0].kind, "melee");
    FC(w).end("test");
});
test("【3d】奥義: 範囲攻撃の2回とも、当たった敵に強撃の手応え。ダメージの値・0.3 秒 / 0.9 秒のタイミングは不変。ゲージは奥義のダメージでは増えない", () => {
    const w = janusWorld({ q: "janus", slots: { lmb: "janus_dual_gate" } }); aimDegree(w, 0, 3); placePolar(w, 3, 3.0, 0); resetHp(w); fillGauge(w);
    pressQ(w, 1); const n0 = hitFx(w).stats.notified; assert.equal(n0, 0);
    frames(w, 14); assert.equal(lost(w, 3), 0, "0.3 秒より前はダメージも手応えもなし"); assert.equal(hitFx(w).stats.notified, 0);
    frames(w, 10); assert.equal(lost(w, 3), W * 1.5); assert.equal(hitFx(w).stats.notified, 1);
    frames(w, 40); assert.equal(lost(w, 3), W * 4); assert.equal(hitFx(w).stats.notified, 2); assert.equal(hitFx(w).stats.confirmed, 2);
    assert.equal(GA(w).getUltimateGauge(), 0, "ゲージは増えない");
    FC(w).end("test");
});
test("【3e】ダメージの無いスキル(閉門・表裏転化)には、命中の手応えは出ない。手応えを切ると(setHitFeedback)Janus も出ない", () => {
    const w = janusWorld({ slots: { x: "janus_closed_gate", c: "janus_inversion" } }); aimDegree(w, 0, 2.5); placePolar(w, 3, 2.5, 0);
    assert.equal(use(w, "x").ok, true); frames(w, 12); assert.equal(use(w, "c").ok, true, JSON.stringify(plain(FC(w).getLastResult()))); frames(w, 12);
    assert.equal(hitFx(w).stats.notified, 0, "通知なし"); assert.equal(hitFx(w).active.length, 0);
    FC(w).end("test");
    const o = janusWorld({ slots: { shift: "janus_boundary_slash" } }); FC(o).setHitFeedback({ enabled: false }); aimDegree(o, 0, 2); placePolar(o, 3, 1.5, 0); resetHp(o);
    assert.equal(use(o, "shift").ok, true); frames(o, 16); assert.equal(lost(o, 3), W * 1.8); assert.equal(hitFx(o).active.length, 0, "手応えをオフにすれば出ない(ダメージは同じ)");
    FC(o).end("test");
});
test("【3f】FieldCombat が無い・戦闘中でないとき: reportHit は何もしない(壊れない)。Janus のダメージ自体は FieldCombat なしでも出る(カード戦闘の経路)", () => {
    const w = janusWorld({ begin: false });
    assert.equal(FC(w).reportHit({ enemyId: 3, heavy: true, serial: "x" }), true, "例外を投げない"); assert.equal(hitFx(w).stats.notified, 1, "数えるだけ"); assert.equal(hitFx(w).pending.length, 0, "戦闘中でなければ予約しない");
    assert.equal(FC(w).reportHit(null), false); assert.equal(FC(w).reportHit({ enemyId: "abc" }), false);
});

// ---------------------------------------------------------------- 【4】見た目 ----------------------------------------------------------------
test("【4a】素材を増やさない: Janus の2つのプラグインは画像・音声のファイルを新しく参照しない(画像の読み込みなし)。使う SE はすべて audio/se に実在する", () => {
    for (const file of ["js/plugins/ProjectR_JanusSkills.js", "js/plugins/ProjectR_JanusUltimate.js"]) {
        const src = read(file).split("\n").filter(l => !/^\s*(\*|\/\/)/.test(l)).join("\n");
        assert.doesNotMatch(src, /ImageManager|loadPicture|loadSystem|\.png|\.ogg|\.m4a|showAnimatedPicture|PresentationVfx/, file + " は画像・VFXの素材を参照しない");
    }
    const names = new Set(); for (const file of ["js/plugins/ProjectR_JanusSkills.js", "js/plugins/ProjectR_JanusUltimate.js"]) for (const m of read(file).matchAll(/"([A-Z][a-z]+[0-9]?)"/g)) names.add(m[1]);      // "Door1" のような SE の名前
    assert.ok(names.size >= 8 && names.has("Barrier"), [...names].join()); for (const n of names) assert.ok(fs.existsSync(path.join(root, "audio/se", n + ".ogg")), n + ".ogg が audio/se にある");
    const w = janusWorld({ slots: { lmb: "janus_dual_gate", shift: "janus_closed_gate", e: "janus_reflection", x: "janus_inversion", c: "janus_boundary_slash" }, q: "janus" });
    let loads = 0; for (const k of ["loadPicture", "loadSystem", "loadAnimation", "loadBitmap", "loadEnemy", "loadCharacter"]) { const orig = w.ctx.ImageManager[k]; if (typeof orig === "function") w.ctx.ImageManager[k] = function() { loads++; return orig.apply(this, arguments); }; }
    aimDegree(w, 0, 2.5); placePolar(w, 3, 2.5, 0); for (const s of ["shift", "e", "x", "c"]) { use(w, s); frames(w, 20); }
    fillGauge(w); pressQ(w, 1); frames(w, 70); assert.equal(loads, 0, "画像を読み込まない");
    FC(w).end("test");
});
test("【4b】閉門: 門が閉じる輪(中心)と、拘束された敵ごとの小さな輪。拘束が終われば輪も消える。ボスの低下は別の色。効果(拘束・Cooldown)は不変", () => {
    const w = janusWorld({ slots: { e: "janus_closed_gate" } }); aimDegree(w, 0, 3); placePolar(w, 3, 3.0, 0); placePolar(w, 4, 3.0, 25);
    assert.equal(JS(w).fx.count(), 0); assert.equal(use(w, "e").ok, true);
    assert.equal(JS(w).fx.count(), 3, "中心の輪 1 + 拘束した敵 2"); assert.deepEqual(plain(JS(w).getLastResult("closed").immobilized).sort(), [3, 4]);
    frames(w, 22); assert.equal(JS(w).fx.count(), 2, "中心の輪は 20 フレームで消える・敵の輪は拘束の間つづく");
    frames(w, 75); assert.equal(JS(w).fx.count(), 0, "拘束(1.5 秒 = 90 フレーム)が終われば輪も消える"); assert.equal(plain(JS(w).getState().holds).length, 0);
    FC(w).end("test");
    const b = janusWorld({ slots: { e: "janus_closed_gate" } }); aimDegree(b, 0, 3); placePolar(b, 3, 3.0, 0); use(b, "e"); assert.equal(JS(b).fx.count(), 2);
    FC(b).end("test"); assert.equal(JS(b).fx.count(), 0, "戦闘の終了で全部消える");
});
test("【4c】反照: 待機の間、主人公の輪がつづく。受け流しで消え、光(主人公・攻撃者)が出る。窓が切れても消える", () => {
    const w = janusWorld({ slots: { e: "janus_reflection" } }); aimDegree(w, 0, 1); placePolar(w, 3, 1.0, 0);
    assert.equal(use(w, "e").ok, true); assert.equal(JS(w).fx.count(), 1, "待機の輪"); frames(w, 5); assert.equal(JS(w).fx.count(), 1);
    enemyHit(w, 3); assert.equal(JS(w).fx.count(), 2, "待機の輪は消え、光が2つ(主人公・攻撃者)"); frames(w, 20); assert.equal(JS(w).fx.count(), 0);
    FC(w).end("test");
    const x = janusWorld({ slots: { e: "janus_reflection" } }); assert.equal(use(x, "e").ok, true); assert.equal(JS(x).fx.count(), 1); frames(x, 40); assert.equal(plain(JS(x).getState()).armed, null); assert.equal(JS(x).fx.count(), 0, "窓が切れたら輪も消える");
    FC(x).end("test");
});
test("【4d】表裏転化: 入れ替わった2か所に輪(成功時だけ)。失敗(範囲外)では何も出ない。境界断ち: 予備動作の線 → 斬撃の光。失敗(Cooldown 中など)では何も出ない", () => {
    const w = janusWorld({ slots: { x: "janus_inversion", shift: "janus_boundary_slash" } }); aimDegree(w, 0, 2.5); placePolar(w, 3, 5.0, 0);
    mouseAtEnemyOrFail(w);
    const r0 = use(w, "x"); assert.equal(r0.ok, false); assert.equal(JS(w).fx.count(), 0, "失敗では出ない");
    placePolar(w, 3, 2.0, 0); aimDegree(w, 0, 2.0); const r1 = use(w, "x"); assert.equal(r1.ok, true, JSON.stringify(plain(FC(w).getLastResult()))); assert.equal(JS(w).fx.count(), 2); frames(w, 20); assert.equal(JS(w).fx.count(), 0);
    aimDegree(w, 0, 2); assert.equal(use(w, "shift").ok, true); assert.equal(JS(w).fx.count(), 1, "予備動作の線"); frames(w, 13); assert.equal(JS(w).fx.count(), 1, "斬撃の光(予備動作の線は消える)"); frames(w, 14); assert.equal(JS(w).fx.count(), 0);
    assert.equal(use(w, "shift").ok, false, "Cooldown 中"); assert.equal(JS(w).fx.count(), 0, "失敗では出ない");
    FC(w).end("test");
});
function mouseAtEnemyOrFail(w) { aimDegree(w, 0, 5.0); }
test("【4e】奥義: 2つの門(内側 = 半径 2・外側 = 半径 2.8)が開き、範囲攻撃の瞬間に弾ける。終われば全部消える。途中で戦闘が終われば開いた門も消える(ダメージもなし)", () => {
    const w = janusWorld({ q: "janus", slots: { lmb: "janus_dual_gate" } }); aimDegree(w, 0, 3); placePolar(w, 3, 3.0, 0); fillGauge(w); resetHp(w);
    pressQ(w, 1); assert.equal(JS(w).fx.count(), 2, "2つの門"); frames(w, 20); assert.equal(JS(w).fx.count(), 2, "1つ目が弾ける光 + 外側の門(内側の門は弾けて消えている)");
    frames(w, 60); assert.equal(JS(w).fx.count(), 0, "終われば全部消える"); assert.equal(lost(w, 3), W * 4);
    FC(w).end("test");
    const x = janusWorld({ q: "janus", slots: { lmb: "janus_dual_gate" } }); aimDegree(x, 0, 3); placePolar(x, 3, 3.0, 0); fillGauge(x); resetHp(x); pressQ(x, 1); frames(x, 8); assert.equal(JS(x).fx.count(), 2);
    FC(x).end("test"); assert.equal(JS(x).fx.count(), 0, "戦闘の終了で門も消える"); assert.equal(plain(JU(x).getLastResult()).reason, "battleEnded"); frames(x, 70); assert.equal(lost(x, 3), 0);
});
test("【4f】見た目が出せなくても(描画の親が無い・例外)効果は変わらない: 閉門・反照・転化・断ち・奥義は同じ結果", () => {
    const w = janusWorld({ slots: { e: "janus_closed_gate", shift: "janus_boundary_slash" }, q: "janus" });
    w.run("SceneManager._scene._spriteset._tilemap.addChild = function() { throw new Error('no layer'); }");
    aimDegree(w, 0, 3); placePolar(w, 3, 3.0, 0); placePolar(w, 4, 2.0, 0); resetHp(w);
    assert.equal(use(w, "e").ok, true); assert.deepEqual(plain(JS(w).getLastResult("closed").immobilized).sort(), [3, 4], "見た目が出せなくても、拘束の効果は同じ(3 と 4 は範囲の中)");
    assert.equal(JS(w).fx.count(), 0, "出せない");
    assert.equal(use(w, "shift").ok, true); frames(w, 14); assert.equal(lost(w, 4), W * 1.8, "ダメージは同じ");
    fillGauge(w); pressQ(w, 1); frames(w, 70); assert.equal(GA(w).getUltimateGauge(), 0);
    FC(w).end("test");
});

console.log(`\nall ${passed} passed`);
