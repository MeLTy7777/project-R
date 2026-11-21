"use strict";
// Stage 1D-2D: 指輪ロードアウト(RingLoadout)モードのフィールド戦闘を、通しで確かめる(旧い固定スロットではなく、RingLoadout の5枠 LMB/Shift/E/X/C)。
// 実エンジン(実Map004 + 全plugin + 実ハンドラ)。入力は本物のキー・左クリックの経路(Input / TouchInput)。実機(MZ)の見た目・描画は Node では扱わない。
//   【1】承認済み10スキルを、5つの枠すべてで(ヘルメース5 + アポロン5 を5通りに回す = 50通り)、実際の押下で発動し、効果の状態まで確かめる
//   【2】ストレングス: 薙ぎ払い(銃を持っていても近接の武器)・銃の実ダメージが上がり、蓄えを1回で消費する(Lv1 / Lv3 防御無視)
//   【3】葦笛の睡眠: 約4秒(240フレーム)・攻撃の溜め(予兆)の中断・起床後の再開
//   【4】黄金の矢 Lv3: 実キーの長押し(ビーム・移動 50%・6秒の専用Cooldown)と、短押し(通常の11本)
//   【5】装備・編成 → 保存 → ロード → 戦闘のHUD・発動 / 空の枠 / 戦闘中の編集ロック / スキルID単位の Cooldown
//   【6】一閃の分割ダメージは補正後の時計(1/60秒 × 1回)で 1・2・3秒
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, lost, resetHp, sleeping, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const HERMES = ["hermes_sweep", "hermes_zetsu", "hermes_issen", "hermes_reed_flute", "hermes_strength"];
const APOLLO = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_plague_rain"];
const ALL = [...HERMES, ...APOLLO];
const CARDS = ALL.filter(id => id !== "hermes_sweep");
const SLOTS = ["lmb", "shift", "e", "x", "c"];
const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const player = w => w.ctx.$gamePlayer;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);

// slots: { lmb, shift, e, x, c } = スキルID。levels: { スキルID: Lv }。gun: 銃を持たせる。
function ringWorld({ slots = {}, levels = {}, gun = false, begin = true } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");                                                       // RingLoadout モード(旧い固定スロットではない)
    const d = D(w);
    for (const ring of ["hermes", "apollo"]) assert.equal(d.assignRingToPlayer(ring).ok, true, ring);
    for (const id of CARDS) { assert.equal(d.setCardOwned(id, true).ok, true, id); assert.equal(d.setCardLevel(id, levels[id] || 1).ok, true, id); }
    for (const ring of ["hermes", "apollo"]) assert.equal(RL(w).equipRing(ring).ok, true, "equip " + ring);
    for (const [slot, id] of Object.entries(slots)) assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id);
    attachHpBars(w, ENEMIES, HP);
    w.run("Math.random = () => 0.999;");
    if (gun) {
        const ctx = w.ctx;
        ctx.$gameParty.leader().forceChangeEquip(0, ctx.$dataWeapons[51]);
        ctx.$gameParty.loseItem(ctx.$dataItems[31], ctx.$gameParty.numItems(ctx.$dataItems[31])); ctx.$gameParty.gainItem(ctx.$dataItems[31], 60); ctx.$gameSystem.setGunAmmo(51, 7);
    }
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); }
    return w;
}
// 本物の押下: LMB = 左ボタン + 攻撃の共通イベント(Hendrix)/ それ以外 = キー(Shift は shiftKey つき)
const KEY = { shift: ["ShiftLeft", 16, { shiftKey: true }], e: ["KeyE", 69], x: ["KeyX", 88], c: ["KeyC", 67] };
function press(w, slot, hold = 3) {
    if (slot === "lmb") { w.ctx.TouchInput._mousePressed = true; w.attackClick(); frames(w, hold); w.ctx.TouchInput._mousePressed = false; frames(w, 1); return; }
    w.keyDown(...KEY[slot]); frames(w, hold); w.keyUp(KEY[slot][0], KEY[slot][1]); frames(w, 1);
}

// ---------------------------------------------------------------- 【1】10スキル × 5枠 ----------------------------------------------------------------
// 各スキルの「効果の状態」(発動の成功だけでなく、実際に起きたこと)。w: 世界(敵4が前方にいる)。起動したあとの検証。
const EFFECT = {
    hermes_sweep:         { frames: 20,  ok: w => lost(w, 4) > 0 },
    hermes_zetsu:         { frames: 20,  ok: (w, p0) => Math.hypot(player(w)._realX - p0.x, player(w)._realY - p0.y) > 1 },
    hermes_issen:         { frames: 60,  ok: w => lost(w, 4) > 0 },
    hermes_reed_flute:    { frames: 3,   ok: w => sleeping(w, 4) === true },
    hermes_strength:      { frames: 3,   ok: w => w.ctx.ProjectRHermesStrength.getPending()?.stacks === 1 },
    apollo_golden_volley: { frames: 120, ok: w => lost(w, 4) > 0 },
    apollo_eros_arrow:    { frames: 150, ok: w => lost(w, 4) > 0 },
    apollo_lyre_rhythm:   { frames: 30,  ok: w => !!w.ctx.ProjectRApolloLyreRhythm.getSession() },
    apollo_laurel_wreath: { frames: 30,  ok: w => { const r = plain(w.ctx.ProjectRApolloLaurelWreath.getLastResult()); return r.ok === true && r.consumed === true && r.patches === 1; } },
    apollo_plague_rain:   { frames: 200, ok: w => { const r = plain(w.ctx.ProjectRApolloPlagueRain.getLastResult()); return r.ok === true && r.consumed === true && JSON.stringify(r.infected) === "[4]" && lost(w, 4) > 0; } }
};
test("【1】承認済み10スキルが、5つの枠すべてから実際の押下で発動し、効果が起きる(ヘルメース5・アポロン5 を枠で5通りに回す = 50通り)", () => {
    let count = 0;
    for (const set of [HERMES, APOLLO]) {
        for (let rot = 0; rot < 5; rot++) {
            for (let i = 0; i < 5; i++) {
                const skill = set[(i + rot) % 5], slot = SLOTS[i];                           // この枠に、このスキル
                const w = ringWorld({ slots: { [slot]: skill } });
                parkOthers(w, [4]); placePolar(w, 4, skill === "hermes_reed_flute" ? 1.5 : 2.2, 0); aimDegree(w, 0, 3);
                w.ctx.ProjectRHermesZetsu.setWindupFrames(0);
                const p0 = { x: player(w)._realX, y: player(w)._realY };
                press(w, slot);
                frames(w, EFFECT[skill].frames);
                assert.ok(EFFECT[skill].ok(w, p0), `${skill} を ${slot} 枠(実押下)で発動: 効果が起きない`);
                // 他の枠は何も発動していない(押した枠のスキルだけが働く)
                assert.deepEqual(Object.keys(plain(FC(w).getCooldowns())).filter(k => ALL.includes(k) && k !== skill && plain(FC(w).getCooldowns())[k] > 0), [], `${skill}@${slot}: 別のスキルが発動していない`);
                FC(w).end("test"); count++;
            }
        }
    }
    assert.equal(count, 50);
});

// ---------------------------------------------------------------- 【2】ストレングス ----------------------------------------------------------------
test("【2】ストレングス: 薙ぎ払い(銃を持っていても近接の武器)と銃の実ダメージが上がり、蓄えは1回で消費する。Lv3 は防御を無視する", () => {
    for (const level of [1, 3]) {
        const w = ringWorld({ slots: { lmb: "hermes_sweep", c: "hermes_strength" }, levels: { hermes_strength: level }, gun: true });
        parkOthers(w, [4]); placePolar(w, 4, 1.4, 90); aimDegree(w, 90, 4);
        const HS = w.ctx.ProjectRHermesStrength, mult = level === 1 ? 1.1 : 1.15;
        assert.equal(FC(w).getMeleeDamageSource().source, "actorDefault", "銃を持っていても、薙ぎ払いは近接の武器で計算する(Stage 6C)");
        frames(w, 5);
        const swing = () => { resetHp(w, [4]); assert.equal(plain(FC(w).attackClick()).ok, true); frames(w, 25); const l = lost(w, 4); frames(w, 60); return l; };
        const base = swing(); assert.equal(base, 100, "強化なしの薙ぎ払い");
        press(w, "c"); frames(w, 6);
        assert.deepEqual([HS.getPending().stacks, HS.getPending().multiplier, HS.getPending().ignoreDefense], [1, mult, level === 3], "蓄え 1");
        const boosted = swing();
        assert.ok(boosted > base, `強化された薙ぎ払い(${boosted} > ${base})`);
        assert.equal(HS.getPending(), null, "1回の命中で、蓄えをすべて消費");
        assert.equal(plain(HS.getLastAttack()).multiplier, mult); assert.equal(plain(HS.getLastAttack()).dealt, boosted);
        assert.equal(swing(), base, "次の攻撃は通常に戻る(2回消費・持ち越しなし)");
        // 重ね掛け 2回 → 1回の攻撃でまとめて消費(攻撃力 1 + 2p)
        press(w, "c"); frames(w, 6); press(w, "c"); frames(w, 6);
        assert.equal(HS.getPending().stacks, 2);
        const twice = swing(); assert.ok(twice > boosted, "2回分の強化はさらに大きい"); assert.equal(HS.getPending(), null);
        // 銃(右クリックの経路 = fireGun)も同じ蓄えで強化される
        placePolar(w, 4, 5, 90); frames(w, 3);
        const e = w.ctx.$gameMap.event(4);
        const shoot = () => { resetHp(w, [4]); w.mouse(e.screenX(), e.screenY() - 24); assert.equal(plain(FC(w).fireGun()).ok, true); frames(w, 40); const l = lost(w, 4); frames(w, 90); return l; };
        frames(w, 60);
        const gunBase = shoot(); assert.ok(gunBase > 0, "銃が当たる");
        press(w, "c"); frames(w, 6);
        const gunBoosted = shoot(); assert.ok(gunBoosted > gunBase, `強化された銃(${gunBoosted} > ${gunBase})`); assert.equal(HS.getPending(), null, "銃でも蓄えを1回で消費");
        assert.equal(shoot(), gunBase, "次の銃弾は通常");
        FC(w).end("test");
    }
});

// ---------------------------------------------------------------- 【3】葦笛の睡眠 ----------------------------------------------------------------
test("【3】葦笛の睡眠: 約4秒 + 溜め(予兆)が中断し、ダメージを受けない。起きたあとは通常のAIに戻って攻撃してくる", () => {
    const w = ringWorld({ slots: { x: "hermes_reed_flute" } });
    parkOthers(w, [4]); placePolar(w, 4, 1.4, 90); aimDegree(w, 90, 4);
    const EA = w.ctx.ProjectREnemyAttack, hp = () => w.ctx.$gameParty.leader().hp;
    assert.equal(FC(w).attachEnemy(4, { chase: true, reach: 1.2, windupFrames: 36, cooldownFrames: 60, sightTiles: 14, aggroTiles: 14 }).ok, true);
    const hp0 = hp();
    let n = 0; while (!plain(EA.list()).some(r => r.eventId === 4 && r.state === "pending") && n++ < 60) frames(w, 1);
    assert.ok(plain(EA.list()).some(r => r.eventId === 4 && r.state === "pending"), "眠る前: 攻撃の予兆(溜め)が出ている");
    press(w, "x", 2);
    assert.equal(sleeping(w, 4), true, "眠った");
    assert.equal(plain(EA.list()).filter(r => r.eventId === 4 && r.state === "pending").length, 0, "溜め(予兆)はその場で中断・消える");
    let asleep = 0; while (sleeping(w, 4) && asleep < 600) { frames(w, 1); asleep++; if (sleeping(w, 4)) assert.equal(plain(EA.list()).filter(r => r.eventId === 4 && r.state === "pending").length, 0, "眠っている間は予兆が出ない"); }
    near(asleep + 2, 240, 6, "睡眠は約4秒(60FPSで約240フレーム)"); assert.equal(hp(), hp0, "眠っている間はダメージなし");
    // 起床後: 通常のAI(再び溜めて攻撃)
    n = 0; while (hp() === hp0 && n++ < 240) frames(w, 1);
    assert.ok(hp() < hp0, "起きたあとは、また攻撃してくる(AIが復帰)");
    assert.deepEqual(plain(FC(w).getEnemySleep(4)).asleep, false);
});

// ---------------------------------------------------------------- 【4】黄金の矢 Lv3(実キー) ----------------------------------------------------------------
test("【4】黄金の矢 Lv3(実キー): 短押し = 通常の11本 / 0.9秒の長押し = ビーム(移動 50%・離すと終了・専用 Cooldown 6秒)。取り消し・Cooldown 後の再ビームは goldenBeam テストが詳しく確認", () => {
    const volleyCount = w => plain(w.ctx.ProjectRApolloGoldenVolley.getLastResult?.() ?? {}).arrows;
    { // 短押し(0.25秒未満)
        const w = ringWorld({ slots: { x: "apollo_golden_volley" }, levels: { apollo_golden_volley: 3 } });
        parkOthers(w, [4]); placePolar(w, 4, 5, 0); aimDegree(w, 0, 4);
        w.keyDown(...KEY.x); frames(w, 5); w.keyUp(KEY.x[0], KEY.x[1]); frames(w, 2);
        const log = plain(FC(w).getHoldLog?.() ?? []);
        assert.equal(plain(FC(w).getBeamState()).active, false, "短押しではビームにならない");
        assert.equal(plain(FC(w).getCooldowns()).apollo_golden_volley ?? 0, 0, "通常の連射に Cooldown は無い");
        frames(w, 150); assert.ok(lost(w, 4) > 0, "矢が当たる");
        assert.ok(log, "ログ");
    }
    { // 長押し → ビーム
        const w = ringWorld({ slots: { e: "apollo_golden_volley" }, levels: { apollo_golden_volley: 3 } });
        parkOthers(w, [4]); placePolar(w, 4, 5, 0); aimDegree(w, 0, 4);
        w.keyDown(...KEY.e); frames(w, 53); assert.equal(plain(FC(w).getBeamState()).active, false, "0.9秒の手前(53フレーム)はまだビームでない");
        frames(w, 2); const b = plain(FC(w).getBeamState());
        assert.equal(b.active, true, "0.9秒でビーム開始"); assert.equal(b.speedFactor, 0.5, "ビーム中の移動速度は 50%");
        assert.equal(plain(w.ctx.ProjectRCardModifiers.moveSpeedFactor()), 0.5);
        const r0 = lost(w, 4);
        frames(w, 40); assert.ok(lost(w, 4) > r0, "ビームが当たる");
        w.keyUp(KEY.e[0], KEY.e[1]); frames(w, 3);
        const after = plain(FC(w).getBeamState());
        assert.equal(after.active, false, "離すと終了"); assert.equal(after.speedFactor, 1, "移動速度は元に戻る");
        near(after.cooldowns.apollo_golden_volley, 6, 0.1, "ビームが終わってから 6秒の専用 Cooldown");
        frames(w, 350); assert.ok(plain(FC(w).getBeamState()).cooldowns.apollo_golden_volley > 0, "6秒より手前(ビーム終了から約359フレーム)はまだ Cooldown 中");
        frames(w, 12); assert.equal(plain(FC(w).getBeamState()).cooldowns.apollo_golden_volley ?? 0, 0, "約6秒(360フレーム)で戻る");
        // ビームが戻ったあとの再押下でビームになる(押し直しが必要)
        w.keyDown(...KEY.e); frames(w, 60); assert.equal(plain(FC(w).getBeamState()).active, true, "Cooldown 後の新しい長押しで、またビーム");
        w.keyUp(KEY.e[0], KEY.e[1]);
    }
});

// ---------------------------------------------------------------- 【5】装備・編成・保存・ロード・HUD・空の枠・編集ロック ----------------------------------------------------------------
test("【5】装備・編成 → 保存 → ロード → 戦闘: 保存した編成がそのまま枠(HUD・発動)になる。空の枠は何もしない。戦闘中の編集は拒否。Cooldown はスキルID単位", () => {
    // 編成して保存
    const a = ringWorld({ slots: {}, begin: false });
    const slots = { shift: "hermes_sweep", x: "hermes_issen", c: "apollo_golden_volley" };
    for (const [slot, id] of Object.entries(slots)) assert.equal(RL(a).setSkill(slot, id).ok, true);
    const before = plain(RL(a).getState());
    const json = a.ctx.JsonEx.stringify(a.ctx.DataManager.makeSaveContents());
    // 新しい世界へロード(本番の extractSaveContents)
    const w = buildWorld(); assert.deepEqual(w.failures, []);
    w.ctx.DataManager.createGameObjects(); w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(json));
    assert.deepEqual(plain(RL(w).getState()), before, "保存 → ロードで、装備・5枠が同じ");
    // マップへ入る(ハーネスの enterMap は新しいゲームを作り直してしまうので、ロードしたゲームのまま入る)
    const dm = w.ctx.DataManager, createGameObjects = dm.createGameObjects; dm.createGameObjects = () => {};
    try { w.enterMap(4, 12, 25); } finally { dm.createGameObjects = createGameObjects; }
    w.frames(3); w.mouse(700, 300);
    assert.deepEqual(plain(RL(w).getState()), before, "ロードしたあとマップへ入っても、装備・5枠が同じ");
    FC(w).setLoadoutSource("auto");
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    assert.equal(FC(w).begin().ok, true); frames(w, 2); FC(w).setPerception({ enabled: false });
    parkOthers(w, [4]); placePolar(w, 4, 2.2, 0); aimDegree(w, 0, 3);
    // HUD: ロードした編成がそのまま出る(空の枠は暗い表示)
    let hud = plain(FC(w).getHudSlots()).filter(s => s.slot !== "consumable");
    assert.deepEqual(hud.map(s => [s.key, s.name]), [["LMB", "―"], ["Shift", "薙ぎ払い"], ["E", "―"], ["X", "一閃"], ["C", "黄金の矢"]]);
    assert.deepEqual(hud.filter(s => s.empty).map(s => s.key), ["LMB", "E"], "空の枠 = LMB と E");
    // 空の枠: 何もしない(旧い固定スキル「一閃」「薙ぎ払い」へ戻らない)
    const snap = () => JSON.stringify({ cd: plain(FC(w).getCooldowns()), hand: plain(D(w).getBattleState().hand.map(c => c.cardId)), lost: lost(w, 4) });
    const s0 = snap(); press(w, "e"); press(w, "lmb"); frames(w, 30);
    assert.equal(snap(), s0, "空の E / LMB は何も起こさない");
    // スキルID単位の Cooldown: 一閃(X)を使うと、一閃だけが Cooldown。ほかのスキルは独立
    press(w, "x"); frames(w, 5);
    let cd = plain(FC(w).getCooldowns()); near(cd.hermes_issen, 7, 0.2, "一閃 7秒"); assert.equal(cd.apollo_golden_volley ?? 0, 0, "別のスキルは独立");
    hud = plain(FC(w).getHudSlots()); assert.equal(hud.find(s => s.slot === "card1").state, "cooldown", "X の枠(一閃)が Cooldown 表示");
    press(w, "x"); frames(w, 2); assert.ok(plain(FC(w).getCooldowns()).hermes_issen <= cd.hermes_issen, "Cooldown 中は再発動しない");
    // 戦闘中の編集ロック: 装備・編成のAPIはすべて拒否され、状態は変わらない
    const state = JSON.stringify(plain(RL(w).getState()));
    for (const r of [RL(w).setSkill("lmb", "hermes_zetsu"), RL(w).setSkill("x", null), RL(w).unequipRing("apollo"), RL(w).equipRing("hermes")]) assert.equal(plain(r).ok, false, JSON.stringify(plain(r)));
    assert.equal(JSON.stringify(plain(RL(w).getState())), state, "戦闘中の編集は何も変えない");
    // 戦闘が終われば編集できる(編集ロックは戦闘中だけ)
    FC(w).end("test"); frames(w, 3);
    assert.equal(plain(RL(w).setSkill("lmb", "hermes_zetsu")).ok, true, "戦闘後は編集できる");
});

// ---------------------------------------------------------------- 【6】一閃(補正後の時計) ----------------------------------------------------------------
test("【6】一閃の分割ダメージ: 補正後の時計で 1・2・3秒(60・120・180フレーム目)に3回。直接ダメージ200 + 分割合計50", () => {
    const w = ringWorld({ slots: { e: "hermes_issen" } });
    parkOthers(w, [4]); placePolar(w, 4, 5, 0); aimDegree(w, 0, 4);
    press(w, "e", 2);
    const t0 = 3;                                                                          // press() が進めたフレーム数(2 + 1)
    assert.equal(lost(w, 4), 200, "直接ダメージ 200");
    const hits = []; let prev = lost(w, 4);
    for (let f = t0 + 1; f <= 240; f++) { w.frames(1); const l = lost(w, 4); if (l !== prev) { hits.push({ frame: f, delta: l - prev }); prev = l; } }
    assert.equal(hits.length, 3, JSON.stringify(hits));
    hits.forEach((h, i) => near(h.frame, 60 * (i + 1) + 2, 3, `${i + 1}回目`));
    assert.equal(hits.reduce((s, h) => s + h.delta, 0), 50);
});

console.log(`\n${passed} tests passed`);
