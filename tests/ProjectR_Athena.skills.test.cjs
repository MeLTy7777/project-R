"use strict";
// Stage 4: Athena の通常スキル(ProjectR_AthenaSkills)。実エンジン(実Map004 + 全plugin + 実 Hendrix のダメージ)。
//   【0】登録: 5スキルが設計・実行時定義・バランス・RingLoadout に載る。Lv1〜3 の数値が仕様どおり。一時の指輪(未実装の例)の後始末
//   【1】アイギスの加護: 被ダメージ 25 / 35 / 45 % 軽減・4 秒・Cooldown 14 秒・効果中の再発動は拒否(何も消費しない)
//   【2】護槍旋陣: 全周 半径 2 マスを 0.3 秒間隔で2回・1回ごとに 70 / 80 / 90 %・各回で同じ敵に1ヒット・壁越しは当たらない・Cooldown 8 秒
//   【3】破陣の盾衝: 衝突の安全な前進(最大 2 マス・約 0.3 秒)・1回 140 / 170 / 200 %・通常の敵は 0.4 / 0.6 / 0.8 秒の怯み・ボスは怯まない・押し出さない・危険な開始は失敗(Cooldown なし)・Cooldown 10 秒
//   【4】女神の迎撃: 前方 140° からの敵の直接攻撃1回を 60 / 75 / 90 % 軽減 → 3 マス以内の攻撃者へ 100 / 120 / 140 % の反撃・受付 0.6 / 0.7 / 0.8 秒・環境ダメージ・背後は対象外・再帰しない・Cooldown 11 秒
//   【5】5つの枠から同じ・失敗は Cooldown を使わない・保存データ(実行時の状態はセーブに入らない・Hermes の正規データは弾かない)
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { addTempRing } = require("./ProjectR_TempRing.cjs");
const { IDS: ATHENA } = require("./ProjectR_AthenaImplemented.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, lost, resetHp, setRegion, center, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, AS = w => w.ctx.ProjectRAthenaSkills;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);
const SLOT_OF = { lmb: "attack", shift: "mobility", e: "special", x: "card1", c: "card2" };
const W = 100;                                                                 // 基礎物理ダメージ(倍率 1.0 = 100)

function athenaWorld({ slots = {}, level = 1, begin = true, hermes = false } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    if (hermes) { const r = plain(w.ctx.ProjectRHermesProductionDeck.acquireRing("hermes", { source: "athena-test" })); assert.equal(r.ok, true, JSON.stringify(r)); }
    assert.equal(D(w).assignRingToPlayer("athena").ok, true); assert.equal(RL(w).equipRing("athena").ok, true);
    for (const id of ATHENA) { assert.equal(D(w).setCardOwned(id, true).ok, true, id); assert.equal(D(w).setCardLevel(id, level).ok, true, id); }
    for (const [slot, id] of Object.entries(slots)) assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id);
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); }
    return w;
}
const use = (w, slot) => plain(FC(w).useAbility(SLOT_OF[slot]));
const ev = (w, id) => w.ctx.$gameMap.event(id);
const cd = (w, id) => plain(FC(w).getCooldowns())[id];
const speed = (w, id) => w.ctx.ProjectRCardModifiers.characterSpeedFactor(ev(w, id));
const leader = w => w.ctx.$gameParty.leader();
const markBoss = (w, id) => { const e = ev(w, id); e.event().note = (e.event().note || "") + "<fieldBoss: テストボス>"; };
const enemyHit = (w, eventId, value = "-50") => { const i = new w.ctx.Game_Interpreter(); i._eventId = eventId; w.ctx.PluginManager.callCommand(i, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "player", value, exceedMaxHealth: "false" }); frames(w, 2); };
const heal = w => { leader(w).setHp(leader(w).mhp); frames(w, 2); };
const hitLoss = (w, from, value = "-50") => { heal(w); const h0 = leader(w).hp; enemyHit(w, from, value); return h0 - leader(w).hp; };
const playerPos = w => ({ x: w.ctx.$gamePlayer._realX, y: w.ctx.$gamePlayer._realY });

// ---------------------------------------------------------------- 【0】登録・バランス ----------------------------------------------------------------
test("【0】登録: 5スキルが設計(実装済み)・実行時定義・バランス・RingLoadout に載る。未所持では出ない・所持して装備すれば5枠のどれにも入る・Cooldown は仕様どおり", () => {
    const w = buildWorld(); assert.deepEqual(w.failures, []); w.enterMap(4, 12, 25); w.frames(3);
    const cat = w.ctx.ProjectRCardCatalog, deck = D(w), bal = w.ctx.ProjectRCardBalance;
    assert.deepEqual(plain(cat.godDesign("athena")).map(r => r.runtimeCardId), ATHENA);
    assert.ok(cat.godDesign("athena").every(r => r.implemented && r.implementedLevels === 3 && r.ringId === "athena" && r.god === "athena"));
    assert.deepEqual(plain(cat.runtimeIdAudit().problems), [], "予約IDの監査に問題なし");
    assert.deepEqual(ATHENA.map(id => deck.definitions.card(id)?.ringId), Array(5).fill("athena"));
    assert.deepEqual(ATHENA.map(id => deck.definitions.card(id).cooldownSeconds), [14, 8, 0.05, 10, 11], "カード定義の Cooldown(CardBalance の値。断陣の投槍のタップは CardBalance の最小値 0.05)");
    assert.equal(bal.isReady(), true); assert.deepEqual(ATHENA.map(id => bal.hasCard(id)), Array(5).fill(true));
    assert.deepEqual(plain(RL(w).getRingSkills("athena")), ATHENA, "承認済みの表");
    assert.deepEqual(plain(RL(w).getUnlockedSkills("athena")), [], "未所持では解放されない");
    assert.equal(deck.assignRingToPlayer("athena").ok, true); assert.deepEqual(plain(RL(w).getUnlockedSkills("athena")), ATHENA);
    assert.equal(RL(w).setSkill("lmb", "athena_spear_throw").ok, false, "未装備の指輪のスキルは入らない");
    assert.equal(RL(w).equipRing("athena").ok, true);
    for (const slot of ["lmb", "shift", "e", "x", "c"]) for (const id of ATHENA) { assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id); RL(w).clearSkill(slot); }
    assert.equal(RL(w).getSkillRing("athena_counter"), "athena");
    assert.deepEqual(plain(w.ctx.ProjectRUltimateActivation.getRegisteredUltimateGods()).includes("athena"), true, "奥義の処理が登録されている");
    assert.equal(plain(w.ctx.ProjectRMenuCore.ultimate.entries()).find(e => e.ringId === "athena").implemented, true, "ULTIMATE 画面: 実装済み");
});
test("【0b】バランス(Lv1〜3 の数値): 加護 25/35/45 % と 4 秒・旋陣 70/80/90 % 半径 2・投槍 85/95/105 と 105/115/130 と 160/190/220・盾衝 140/170/200 と怯み 0.4/0.6/0.8・迎撃 60/75/90 と 100/120/140 と 0.6/0.7/0.8", () => {
    const w = buildWorld(); w.enterMap(4, 12, 25); w.frames(3); const b = w.ctx.ProjectRCardBalance, e = (id, lv) => plain(b.effects(id, lv)), c = (id, k) => b.constant(id, k);
    assert.deepEqual([1, 2, 3].map(l => e("athena_aegis", l).incomingReduction), [0.25, 0.35, 0.45]); assert.equal(c("athena_aegis", "durationSeconds"), 4);
    assert.deepEqual([1, 2, 3].map(l => e("athena_spear_circle", l).damageScale), [0.7, 0.8, 0.9]); assert.deepEqual([c("athena_spear_circle", "radiusTiles"), c("athena_spear_circle", "hitCount"), c("athena_spear_circle", "hitIntervalSeconds")], [2, 2, 0.3]);
    assert.deepEqual([1, 2, 3].map(l => e("athena_spear_throw", l).damageScale), [0.85, 0.95, 1.05]); assert.deepEqual([1, 2, 3].map(l => e("athena_spear_throw", l).secondDamageScale), [1.05, 1.15, 1.3]); assert.deepEqual([1, 2, 3].map(l => e("athena_spear_throw", l).holdDamageScale), [1.6, 1.9, 2.2]);
    assert.deepEqual(["arcDegrees", "radiusTiles", "rangeTiles", "comboWindowSeconds", "holdSeconds", "throwRangeTiles", "lockSeconds"].map(k => c("athena_spear_throw", k)), [90, 1.8, 2.4, 0.5, 0.25, 4.5, 10]);
    assert.deepEqual([1, 2, 3].map(l => e("athena_shield_charge", l).damageScale), [1.4, 1.7, 2]); assert.deepEqual([1, 2, 3].map(l => e("athena_shield_charge", l).staggerSeconds), [0.4, 0.6, 0.8]); assert.deepEqual([c("athena_shield_charge", "chargeDistanceTiles"), c("athena_shield_charge", "chargeSeconds")], [2, 0.3]);
    assert.deepEqual([1, 2, 3].map(l => e("athena_counter", l).incomingReduction), [0.6, 0.75, 0.9]); assert.deepEqual([1, 2, 3].map(l => e("athena_counter", l).damageScale), [1, 1.2, 1.4]); assert.deepEqual([1, 2, 3].map(l => e("athena_counter", l).counterWindowSeconds), [0.6, 0.7, 0.8]); assert.deepEqual([c("athena_counter", "frontArcDegrees"), c("athena_counter", "rangeTiles")], [140, 3]);
});
test("【0c】一時の指輪(未実装の例): この世界の中だけに足せて、後始末で定義・所有・装備・Q が元に戻る。実在の指輪の ID は使えない。ほかの世界・データには何も残らない", () => {
    const w = buildWorld(); w.enterMap(4, 12, 25); w.frames(3); const before = JSON.stringify(plain(D(w).getPersistentData().ringOwnershipState));
    assert.throws(() => addTempRing(w, "athena"), /既にある指輪/);
    const t = addTempRing(w); assert.equal(D(w).definitions.ring(t.ringId).godId, t.ringId); t.own(); t.equip(); assert.equal(RL(w).setUltimate(t.ringId).ok, true);
    assert.equal(w.ctx.ProjectRUltimateActivation.hasUltimateHandler(t.ringId), false, "一時の指輪に奥義の処理は無い(未実装)");
    const done = t.cleanup(); assert.deepEqual(done, { removed: true, ownershipCleared: true }); assert.equal(D(w).definitions.ring(t.ringId), null);
    assert.equal(RL(w).getUltimate(), null); assert.equal(RL(w).isRingEquipped(t.ringId), false); assert.equal(JSON.stringify(plain(D(w).getPersistentData().ringOwnershipState)), before, "所有の状態は元どおり");
    const other = buildWorld(); other.enterMap(4, 12, 25); other.frames(3); assert.equal(D(other).definitions.ring(t.ringId), null, "ほかの世界には何も残らない");
});

test("【0d】参照する素材が実在する: Athena のプラグインが鳴らす SE は、すべて audio/se に実在する(無い名前を鳴らすと、実機では読み込みエラーでゲームが止まる)。画像・絵の素材は参照しない", () => {
    const fs = require("node:fs"), path = require("node:path"), root = path.join(__dirname, "..");
    const names = new Set(), sources = ["js/plugins/ProjectR_AthenaSkills.js", "js/plugins/ProjectR_AthenaUltimate.js"].map(f => fs.readFileSync(path.join(root, f), "utf8"));
    for (const src of sources) for (const m of src.matchAll(/\bse\("([A-Za-z0-9_]+)"/g)) names.add(m[1]);
    assert.ok(names.size >= 5, "SE を鳴らしている: " + [...names].join(","));
    for (const n of names) assert.ok(fs.existsSync(path.join(root, "audio/se", n + ".ogg")), "audio/se/" + n + ".ogg が実在する");
    for (const src of sources) assert.equal(/ImageManager|img\/|\.png|CutIn\.show|swingWeapon/.test(src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")), false, "画像・カットイン・神の表示の素材を参照しない");
});

// ---------------------------------------------------------------- 【1】アイギスの加護 ----------------------------------------------------------------
test("【1】アイギスの加護: 4 秒の間、被ダメージを 25 / 35 / 45 %(Lv1〜3)軽減する。終われば元に戻る・Cooldown 14 秒・仲間への付与なし", () => {
    for (const [lv, reduction] of [[1, 0.25], [2, 0.35], [3, 0.45]]) {
        const w = athenaWorld({ slots: { x: "athena_aegis" }, level: lv }); placePolar(w, 3, 2.0, 0);
        const base = hitLoss(w, 3); assert.ok(base > 0, "軽減なしのダメージ " + base);
        heal(w); const r = use(w, "x"); assert.equal(r.ok, true, JSON.stringify(r)); near(cd(w, "athena_aegis"), 14, 0.1, "Cooldown 14 秒"); assert.ok(AS(w).getState().aegis, "効果中");
        const h1 = leader(w).hp; enemyHit(w, 3); near(h1 - leader(w).hp, base * (1 - reduction), 1.01, `Lv${lv} ${reduction * 100}% 軽減`);
        frames(w, 230); assert.ok(AS(w).getState().aegis, "4 秒(240 フレーム)の手前ではまだ効果中"); frames(w, 20); assert.equal(AS(w).getState().aegis, null, "4 秒で終わる"); assert.equal(w.ctx.ProjectRApolloStatus.has("player", "athena_aegis"), false);
        near(hitLoss(w, 3), base, 1.01, "効果の後は元のダメージ");
        assert.equal(w.ctx.ProjectRApolloStatus.list("ally:2").length, 0, "仲間には付与しない");
        FC(w).end("test");
    }
});
test("【1b】加護: 効果中の再発動は拒否(何も消費しない)・戦闘の終了・マップ移動・ロードで解除・ほかの軽減とは積(DamageModifiers の規則は変えない)", () => {
    const w = athenaWorld({ slots: { x: "athena_aegis" } }); placePolar(w, 3, 2.0, 0);
    assert.equal(use(w, "x").ok, true); const again = use(w, "x"); assert.equal(again.ok, false); assert.equal(again.reason, "cooldown");
    const dup = plain(D(w).getActivationHandler("instant")({ definition: D(w).definitions.card("athena_aegis") })); assert.equal(dup.ok, false); assert.equal(dup.reason, "alreadyActive", "効果中の再発動は失敗");
    const base = (() => { const v = athenaWorld({ slots: {} }); placePolar(v, 3, 2.0, 0); const l = hitLoss(v, 3); FC(v).end("test"); return l; })();
    assert.equal(w.ctx.ProjectRApolloStatus.apply("player", "other_guard", { seconds: 5, damageTaken: 0.5 }).ok, true);
    const h1 = leader(w).hp; enemyHit(w, 3); near(h1 - leader(w).hp, base * 0.75 * 0.5, 1.51, "25% 軽減 × 別の 50% 軽減 = 積");
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.getConflicts()).length, 0, "DamageModifiers の衝突は記録されない");
    FC(w).end("test"); assert.equal(AS(w).getState().aegis, null, "戦闘の終了で解除"); assert.equal(w.ctx.ProjectRApolloStatus.has("player", "athena_aegis"), false);
    const m = athenaWorld({ slots: { x: "athena_aegis" } }); assert.equal(use(m, "x").ok, true); m.enterMap(4, 14, 25); m.frames(3); assert.equal(AS(m).getState().aegis, null, "マップ移動で解除"); FC(m).end("test");
    const l = athenaWorld({ slots: { x: "athena_aegis" } }); assert.equal(use(l, "x").ok, true); l.ctx.DataManager.extractSaveContents(l.ctx.DataManager.makeSaveContents()); assert.equal(AS(l).getState().aegis, null, "ロードで解除"); FC(l).end("test");
});

// ---------------------------------------------------------------- 【2】護槍旋陣 ----------------------------------------------------------------
test("【2】護槍旋陣: 全周(360°)半径 2 マスを 0.3 秒間隔で2回・1回ごとに基礎物理ダメージの 70 / 80 / 90 %(Lv1〜3)・真後ろにも当たる・範囲外は当たらない・Cooldown 8 秒", () => {
    for (const [lv, scale] of [[1, 0.7], [2, 0.8], [3, 0.9]]) {
        const w = athenaWorld({ slots: { e: "athena_spear_circle" }, level: lv }); aimDegree(w, 0, 3);
        placePolar(w, 3, 1.2, 0); placePolar(w, 4, 1.2, 180); placePolar(w, 5, 1.5, 90); placePolar(w, 6, 2.8, 270);          // 前 / 真後ろ / 右 / 範囲外
        resetHp(w); const r = use(w, "e"); assert.equal(r.ok, true, JSON.stringify(r)); near(cd(w, "athena_spear_circle"), 8, 0.1, "Cooldown 8 秒"); frames(w, 3);
        for (const id of [3, 4, 5]) near(lost(w, id), Math.round(W * scale), 1, `Lv${lv} 1回目 id${id}`);
        assert.equal(lost(w, 6), 0, "半径 2 マスの外は当たらない"); assert.equal(AS(w).getState().circle.phase, 1, "1回目のあと");
        frames(w, 10); for (const id of [3, 4, 5]) near(lost(w, id), Math.round(W * scale), 1, "0.3 秒の前はまだ1回だけ"); frames(w, 12);
        for (const id of [3, 4, 5]) near(lost(w, id), 2 * Math.round(W * scale), 2, `Lv${lv} 2回目(0.3 秒後)で合計2回 id${id}`);
        assert.equal(lost(w, 6), 0); frames(w, 40); for (const id of [3, 4, 5]) near(lost(w, id), 2 * Math.round(W * scale), 2, "3回目はない(各回、同じ敵に1ヒット)"); assert.equal(AS(w).getState().circle, null, "終わったら片づく");
        FC(w).end("test");
    }
});
test("【2b】旋陣: 壁を挟んだ敵には当たらない・再発動は Cooldown で拒否・敵がいなくても成功(Cooldown 開始)・戦闘の終了で中断", () => {
    const w = athenaWorld({ slots: { e: "athena_spear_circle" } }); aimDegree(w, 0, 3); placePolar(w, 3, 1.5, 0); placePolar(w, 4, 1.5, 90);
    const cc = center(w); for (let x = Math.floor(cc.x) - 1; x <= Math.floor(cc.x) + 1; x++) setRegion(w, x, Math.floor(cc.y - 1.0), 255);          // 前(3)との間に壁
    resetHp(w); assert.equal(use(w, "e").ok, true); frames(w, 40); assert.equal(lost(w, 3), 0, "壁の向こうの敵には当たらない"); assert.ok(lost(w, 4) > 0, "壁のない側には当たる");
    for (let x = Math.floor(cc.x) - 1; x <= Math.floor(cc.x) + 1; x++) setRegion(w, x, Math.floor(cc.y - 1.0), 0);
    const again = use(w, "e"); assert.equal(again.ok, false); assert.equal(again.reason, "cooldown"); FC(w).end("test");
    const empty = athenaWorld({ slots: { e: "athena_spear_circle" } }); parkOthers(empty, []); assert.equal(use(empty, "e").ok, true, "敵がいなくても発動する"); near(cd(empty, "athena_spear_circle"), 8, 0.1);
    FC(empty).end("test"); assert.equal(AS(empty).getState().circle, null, "戦闘の終了で中断");
});

// ---------------------------------------------------------------- 【3】破陣の盾衝 ----------------------------------------------------------------
test("【3】破陣の盾衝: 前方へ最大 2 マスを約 0.3 秒で前進し、前方の敵に1回 140 / 170 / 200 %(Lv1〜3)。通常の敵は怯む(移動停止)・Cooldown 10 秒・押し出さない", () => {
    for (const [lv, scale, stagger] of [[1, 1.4, 0.4], [2, 1.7, 0.6], [3, 2.0, 0.8]]) {
        const w = athenaWorld({ slots: { shift: "athena_shield_charge" }, level: lv }); aimDegree(w, 0, 3); const p0 = playerPos(w);
        placePolar(w, 3, 2.4, 0); const e0 = { x: ev(w, 3)._realX, y: ev(w, 3)._realY };                                  // 2 マス進むと体が触れる距離
        resetHp(w); const r = use(w, "shift"); assert.equal(r.ok, true, JSON.stringify(r)); near(cd(w, "athena_shield_charge"), 10, 0.1, "Cooldown 10 秒");
        assert.ok(AS(w).getState().charge, "前進中"); frames(w, 8); const mid = playerPos(w); assert.ok(p0.y - mid.y > 0.3 && p0.y - mid.y < 2.01, "前進の途中 " + (p0.y - mid.y)); assert.equal(lost(w, 3), 0, "ダメージは前進が終わってから(1回)");
        frames(w, 14); assert.equal(AS(w).getState().charge, null, "約 0.3 秒(18 フレーム)で終わる"); const end = playerPos(w); assert.ok(p0.y - end.y > 0.5 && p0.y - end.y <= 2.0 + 1e-6, `最大 2 マス前進 ${p0.y - end.y}`); near(end.x, p0.x, 0.05, "向きの真上へ");
        near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} ${scale * 100}%(1回)`);
        assert.deepEqual([ev(w, 3)._realX, ev(w, 3)._realY], [e0.x, e0.y], "敵は押し出さない(ノックバックなし)");
        const st = AS(w).getState().staggers.find(s => s.eventId === 3); assert.ok(st, "通常の敵は怯む"); assert.ok(speed(w, 3) < 0.01, "怯みの間は移動できない"); near(st.remaining, stagger, 0.1, "怯みの時間(前進が終わった直後)");
        frames(w, 20); near(lost(w, 3), Math.round(W * scale), 1, "1回だけ");
        frames(w, Math.round(stagger * 60) + 20); assert.equal(AS(w).getState().staggers.length, 0, "怯みが終わる"); assert.equal(speed(w, 3), 1, "移動できるように戻る");
        FC(w).end("test");
    }
});
test("【3b】盾衝: ボスは怯まない(ダメージだけ)・戦闘に付いた敵は溜め中の攻撃が中断され次の攻撃が遅れる・敵の手前・壁の手前で止まる(衝突の安全)", () => {
    const w = athenaWorld({ slots: { shift: "athena_shield_charge" } }); aimDegree(w, 0, 3); placePolar(w, 3, 2.2, 0); placePolar(w, 4, 2.2, 90); markBoss(w, 3);
    resetHp(w); assert.equal(use(w, "shift").ok, true); frames(w, 26); assert.ok(lost(w, 3) > 0, "ボスにもダメージ"); assert.equal(AS(w).getState().staggers.some(s => s.eventId === 3), false, "ボスは怯まない"); assert.equal(speed(w, 3), 1);
    assert.equal(plain(AS(w).getLastResult("chargeEnd")).bosses.includes(3), true); FC(w).end("test");
    // 戦闘に付いた敵(FieldCombat の敵の行動)へ: 次の攻撃が遅れる
    const a = athenaWorld({ slots: { shift: "athena_shield_charge" } }); aimDegree(a, 0, 3); placePolar(a, 3, 2.2, 0);
    const att = plain(FC(a).attachEnemy(3, { windupFrames: 40, cooldownFrames: 30 })); assert.equal(att.ok, true, JSON.stringify(att));
    const direct = plain(FC(a).staggerEnemy(3, 0.6)); assert.deepEqual([direct.ok, direct.frames], [true, 36], "敵の怯み API: 36 フレーム先まで次の攻撃を始めない");
    assert.equal(plain(FC(a).staggerEnemy(999, 0.6)).ok, false, "戦闘に付いていない敵には何もしない"); FC(a).end("test");
    // 壁・敵の手前で止まる
    const f = athenaWorld({ slots: { shift: "athena_shield_charge" } }); aimDegree(f, 0, 3); const q0 = playerPos(f); const cc = center(f);
    for (let x = Math.floor(cc.x) - 1; x <= Math.floor(cc.x) + 1; x++) setRegion(f, x, Math.floor(cc.y - 1.6), 255);        // 約 1.1 マス先に壁
    const rf = use(f, "shift"); assert.equal(rf.ok, true, JSON.stringify(rf)); frames(f, 30); const q1 = playerPos(f); assert.ok(q0.y - q1.y > 0.1 && q0.y - q1.y < 1.5, "壁の手前で止まる " + (q0.y - q1.y));
    assert.ok(q1.y >= Math.floor(cc.y - 1.6) + 1 - 1e-6, "壁の行(" + (Math.floor(cc.y - 1.6)) + ")の中へは入らない " + q1.y); FC(f).end("test");
});
test("【3c】盾衝: 危険な開始(目の前が壁・マップの端)は失敗して Cooldown を使わない。敵に接していれば動かずにダメージ・怯みは入る。操作できないとき・戦闘外は失敗", () => {
    const w = athenaWorld({ slots: { shift: "athena_shield_charge" } }); aimDegree(w, 0, 3); const cc = center(w);
    for (let x = Math.floor(cc.x) - 1; x <= Math.floor(cc.x) + 1; x++) setRegion(w, x, Math.floor(cc.y - 0.9), 255);          // すぐ目の前が壁
    const p0 = playerPos(w); const r = use(w, "shift"); assert.equal(r.ok, false, JSON.stringify(r)); assert.equal(cd(w, "athena_shield_charge"), 0, "Cooldown を使わない"); frames(w, 25); assert.deepEqual(playerPos(w), p0, "動かない"); assert.equal(AS(w).getState().charge, null);
    for (let x = Math.floor(cc.x) - 1; x <= Math.floor(cc.x) + 1; x++) setRegion(w, x, Math.floor(cc.y - 0.9), 0);
    const ok = use(w, "shift"); assert.equal(ok.ok, true, "壁を外せば成功"); frames(w, 25); FC(w).end("test");
    const edge = athenaWorld({ slots: { shift: "athena_shield_charge" } }); aimDegree(edge, 0, 3); edge.ctx.$gamePlayer.locate(12, 0); edge.ctx.$gamePlayer._realX = 12; edge.ctx.$gamePlayer._realY = 0; frames(edge, 2);
    const re = use(edge, "shift"); assert.equal(re.ok, false, "マップの端は危険な開始"); assert.equal(cd(edge, "athena_shield_charge"), 0); FC(edge).end("test");
    const touch = athenaWorld({ slots: { shift: "athena_shield_charge" } }); aimDegree(touch, 0, 3); placePolar(touch, 3, 1.05, 0); resetHp(touch); const rt = use(touch, "shift");
    assert.equal(rt.ok, true, "敵に接していれば、動かなくても盾で打つ: " + JSON.stringify(rt)); frames(touch, 26); assert.ok(lost(touch, 3) > 0, "ダメージが入る"); FC(touch).end("test");
    FC(touch).end("test"); assert.equal(use(touch, "shift").reason, "inactive", "戦闘の外では使えない");
    const lock = athenaWorld({ slots: { shift: "athena_shield_charge" } }); aimDegree(lock, 0, 3); lock.ctx.$gameMessage.add("会話中");
    const hr = plain(D(lock).getActivationHandler("direction")({ definition: D(lock).definitions.card("athena_shield_charge") })); assert.deepEqual([hr.ok, hr.reason], [false, "playerMovementLocked"], "操作できないときは失敗(何も消費しない)"); lock.ctx.$gameMessage.clear(); FC(lock).end("test");
});

// ---------------------------------------------------------------- 【4】女神の迎撃 ----------------------------------------------------------------
test("【4】女神の迎撃: 前方 140° からの敵の直接攻撃1回を 60 / 75 / 90 %(Lv1〜3)軽減して受け、3 マス以内の攻撃者へ 100 / 120 / 140 % で反撃。Cooldown 11 秒", () => {
    for (const [lv, reduction, scale] of [[1, 0.6, 1], [2, 0.75, 1.2], [3, 0.9, 1.4]]) {
        const w = athenaWorld({ slots: { c: "athena_counter" }, level: lv }); aimDegree(w, 0, 3); placePolar(w, 3, 2.0, 0);
        const base = hitLoss(w, 3); assert.ok(base > 0); heal(w); resetHp(w);
        const r = use(w, "c"); assert.equal(r.ok, true, JSON.stringify(r)); near(cd(w, "athena_counter"), 11, 0.1, "Cooldown 11 秒"); assert.ok(AS(w).getState().counter, "待機中");
        const h1 = leader(w).hp; enemyHit(w, 3); near(h1 - leader(w).hp, base * (1 - reduction), 1.51, `Lv${lv} ${reduction * 100}% 軽減`);
        near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} 反撃 ${scale * 100}%`); assert.equal(AS(w).getState().counter, null, "1回で終わる");
        const h2 = leader(w).hp; resetHp(w); enemyHit(w, 3); near(h2 - leader(w).hp, base, 1.01, "2回目は軽減なし"); assert.equal(lost(w, 3), 0, "2回目は反撃なし");
        assert.equal(plain(AS(w).getLastResult("counterHit")).countered, true); FC(w).end("test");
    }
});
test("【4b】迎撃の条件: 前方 ±70° の外(背後・真横)は受け流さず待機を続ける・3 マスより遠い攻撃者は軽減だけで反撃なし・受付 0.6 / 0.7 / 0.8 秒で終わる", () => {
    const w = athenaWorld({ slots: { c: "athena_counter" } }); aimDegree(w, 0, 3); placePolar(w, 3, 2.0, 180); placePolar(w, 4, 2.0, 80); placePolar(w, 5, 2.0, 60);
    const base = hitLoss(w, 3); assert.equal(use(w, "c").ok, true); resetHp(w);
    const h0 = leader(w).hp; enemyHit(w, 3); near(h0 - leader(w).hp, base, 1.01, "背後の攻撃は軽減しない"); assert.ok(AS(w).getState().counter, "待機は続く"); assert.equal(lost(w, 3), 0, "背後には反撃しない");
    const h1 = leader(w).hp; enemyHit(w, 4); near(h1 - leader(w).hp, base, 1.01, "80°(±70° の外)は対象外"); assert.ok(AS(w).getState().counter);
    const h2 = leader(w).hp; enemyHit(w, 5); near(h2 - leader(w).hp, base * 0.4, 1.51, "60°(内側)は軽減"); assert.ok(lost(w, 5) > 0, "反撃"); FC(w).end("test");
    const far = athenaWorld({ slots: { c: "athena_counter" } }); aimDegree(far, 0, 3); placePolar(far, 3, 3.6, 0); const fb = hitLoss(far, 3); assert.equal(use(far, "c").ok, true); resetHp(far);
    const f1 = leader(far).hp; enemyHit(far, 3); near(f1 - leader(far).hp, fb * 0.4, 1.51, "遠い攻撃者でも軽減する(飛び道具)"); assert.equal(lost(far, 3), 0, "3 マスより遠いので反撃しない"); FC(far).end("test");
    for (const [lv, sec] of [[1, 0.6], [2, 0.7], [3, 0.8]]) {
        const t = athenaWorld({ slots: { c: "athena_counter" }, level: lv }); placePolar(t, 3, 2.0, 0); aimDegree(t, 0, 3); const tb = hitLoss(t, 3); assert.equal(use(t, "c").ok, true);
        frames(t, Math.round(sec * 60) - 8); assert.ok(AS(t).getState().counter, `Lv${lv} ${sec} 秒の手前ではまだ待機`); frames(t, 14); assert.equal(AS(t).getState().counter, null, `Lv${lv} ${sec} 秒で待機が終わる`);
        const t1 = leader(t).hp; enemyHit(t, 3); near(t1 - leader(t).hp, tb, 1.01, "終わった後は軽減なし"); FC(t).end("test");
    }
});
test("【4c】迎撃: 環境ダメージ(敵でないイベント・呼び出し元なし)は対象外で待機を消費しない・反撃のダメージは再び迎撃を呼ばない・ボスにも反撃・効果中の再発動は拒否", () => {
    const w = athenaWorld({ slots: { c: "athena_counter" } }); aimDegree(w, 0, 3); placePolar(w, 3, 2.0, 0); markBoss(w, 3);
    const base = hitLoss(w, 3); assert.equal(use(w, "c").ok, true); resetHp(w);
    const nonEnemy = w.ctx.$gameMap.events().find(e => e && !String(e.event().note || "").includes("<enemy>"));
    const e0 = leader(w).hp; enemyHit(w, nonEnemy.eventId()); enemyHit(w, 0); near(e0 - leader(w).hp, base * 2, 2.01, "環境ダメージは軽減されない"); assert.ok(AS(w).getState().counter, "待機を消費しない");
    const dup = plain(D(w).getActivationHandler("instant")({ definition: D(w).definitions.card("athena_counter") })); assert.equal(dup.ok, false); assert.equal(dup.reason, "alreadyArmed");
    let calls = 0, enemyCalls = 0; const commands = w.ctx.PluginManager._commands, key = "Hendrix_Action_Engine:UpdateEventHp", wrapped = commands[key];
    commands[key] = function(args) { if (String(args && args.eventId).toLowerCase() === "player") calls++; else enemyCalls++; return wrapped.apply(this, arguments); };
    const h = leader(w).hp; enemyHit(w, 3); commands[key] = wrapped;
    assert.deepEqual([calls, enemyCalls], [1, 1], "主人公への呼び出しは敵の1回だけ・反撃は敵への1回だけ(反撃が迎撃へ戻らない)"); near(h - leader(w).hp, base * 0.4, 1.51); assert.ok(lost(w, 3) > 0, "ボスにも反撃"); assert.equal(AS(w).getState().counter, null);
    assert.equal(plain(AS(w).getLastResult("counterHit")).countered, true); FC(w).end("test");
});

// ---------------------------------------------------------------- 【5】5つの枠・失敗は Cooldown を使わない・保存 ----------------------------------------------------------------
test("【5】5つの枠(LMB / Shift / E / X / C)のどれからでも同じスキルが使える(加護・旋陣・盾衝・迎撃)。Cooldown(14 / 8 / 10 / 11 秒)は成功したときだけ・スキルID単位・HUD に出る", () => {
    const expected = { athena_aegis: 14, athena_spear_circle: 8, athena_shield_charge: 10, athena_counter: 11 };
    for (const slot of ["lmb", "shift", "e", "x", "c"]) for (const id of Object.keys(expected)) {
        const w = athenaWorld({ slots: { [slot]: id } }); aimDegree(w, 0, 3); placePolar(w, 3, 2.4, 0);
        const r = use(w, slot); assert.equal(r.ok, true, `${id}@${slot} ` + JSON.stringify(r)); assert.equal(r.skillId, id);
        near(cd(w, id), expected[id], 0.1, `${id} の Cooldown`); const again = use(w, slot); assert.equal(again.ok, false); assert.equal(again.reason, "cooldown");
        const hud = plain(FC(w).getHudState()).slots.find(s => s.slot === SLOT_OF[slot]); assert.equal(hud.cooldown > 0, true, "HUD に Cooldown");
        FC(w).end("test");
    }
});
test("【5b】カード戦闘の手札からは、基本攻撃(断陣の投槍)は発動しない(何も消費しない)。戦闘の外では基本攻撃も発動しない", () => {
    const w = athenaWorld({ slots: { lmb: "athena_spear_throw" } });
    const handler = D(w).getActivationHandler("direction"); const r = plain(handler({ definition: D(w).definitions.card("athena_spear_throw") })); assert.equal(r.ok, false); assert.equal(r.reason, "fieldCombatOnly");
    FC(w).end("test"); assert.equal(use(w, "lmb").reason, "inactive", "戦闘の外では、基本攻撃も発動しない");
});
test("【5c】実行時のみ: 加護・旋陣・盾衝・迎撃・怯みはセーブに入らない(Athena・Hermes の正規の保存データは弾かない)。ロードで全部消える", () => {
    const THEMIS_LEGIT = new Set(["athena", ...ATHENA]);
    const leaks = json => [...new Set([...(json.match(/[A-Za-z0-9_]*athena[A-Za-z0-9_]*/gi) || []).filter(x => !THEMIS_LEGIT.has(x)), ...(json.match(/_athena[A-Za-z]*/g) || [])])];
    const w = athenaWorld({ hermes: true, slots: { x: "athena_aegis", c: "athena_counter", e: "athena_spear_circle", shift: "athena_shield_charge" }, begin: false });
    assert.equal(FC(w).begin().ok, true); frames(w, 2); parkOthers(w, []); aimDegree(w, 0, 3); placePolar(w, 3, 2.2, 0);
    const snap = () => JSON.stringify([w.ctx.$gameSystem._projectRRingLoadout, D(w).getPersistentData()]); const s0 = snap();
    assert.equal(use(w, "shift").ok, true); frames(w, 26); assert.equal(use(w, "x").ok, true); assert.equal(use(w, "c").ok, true); assert.equal(use(w, "e").ok, true); frames(w, 2);
    assert.ok(AS(w).getState().aegis && AS(w).getState().counter && AS(w).getState().circle && AS(w).getState().staggers.length >= 0, "実行時の状態が実際に有る");
    const saved = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
    assert.equal(/"granted":true/.test(saved), true, "Hermes の入手記録が入っている世界で確かめる"); assert.equal(saved.includes("athena_aegis"), true, "Athena の正規の保存(スキルID)は入っている");
    assert.deepEqual(leaks(saved), [], "Athena の実行時の状態は保存されない(指輪ID・スキルIDだけ)"); assert.equal(/"incomingReduction"|"staggers?"|0\.0001|athenaAegis|"counter"/.test(saved), false);
    assert.equal(snap(), s0, "RingLoadout・Core の保存データは変わらない");
    for (const [key, val] of [["_athenaAegis", { until: 9 }], ["_athenaCounter", { armed: true }], ["_athenaStagger", { e3: 1 }]]) { w.ctx.$gameSystem[key] = val; const j = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()); delete w.ctx.$gameSystem[key]; assert.equal(leaks(j).length > 0, true, "検出する: " + key); }
    w.ctx.DataManager.extractSaveContents(w.ctx.DataManager.makeSaveContents()); const st = AS(w).getState(); assert.deepEqual([st.aegis, st.counter, st.circle, st.charge, st.staggers.length], [null, null, null, null, 0], "ロードで全部消える");
    FC(w).end("test");
});

console.log(`\nall ${passed} passed`);
