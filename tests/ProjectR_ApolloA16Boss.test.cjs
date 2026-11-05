"use strict";
// Phase Apollo-A16: DEVボス戦の縦断スライス(Playtest専用)。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
//   ボスの攻撃は ProjectREnemyAttack の本物の予約(溜め → 実行)・Hendrixの弾/判定Event・公式の UpdateEventHp(プレイヤー)。偽のダメージは入れない。
//   実機(描画・実キー・実Playtest・計測)は tools/mz_cdp/apollo_a16_boss_verify.cjs。
const base = require("./ProjectR_HermesB1Fixture.cjs");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const zetsu = require("./ProjectR_HermesZetsuFixture.cjs");
const { assert, plain, center, placeEnemy, deckApi, handIds, frames } = fx;
const { buildWorld, attachHpBars } = base;
let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const B = w => w.ctx.ProjectRBossTest, EA = w => w.ctx.ProjectREnemyAttack, BF = w => w.ctx.ProjectRBossFramework, AT = w => w.ctx.ProjectRApolloTest;
const leader = w => w.ctx.$gameParty.leader();
const secs = (w, s) => frames(w, Math.round(s * 60));
const put = (w, x, y) => { const p = fx.player(w); p.locate(x, y); p._realX = x; p._realY = y; p.center(x, y); };
const bossEv = w => w.ctx.$gameMap.event(3);
const shots = w => w.ctx.$gameMap.events().filter(e => e && !e._erased && e.event && /projectRTestEnemy(Bolt|Melee)|projectRBossMelee/.test(e.event().note || ""));
const hurt = (w, id, amount) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: `-${amount}`, exceedMaxHealth: "false" });
const hpOf = (w, id) => w.ctx.ProjectRCardModifiers.eventHp(id);

const world = (opts = {}, boot = {}) => {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    attachHpBars(w, [3, 4, 5, 6], 100000);
    w.run("Math.random = () => 0.9;");
    const calls = []; const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { calls.push({ name, args }); return original.apply(this, arguments); };
    w.calls = calls;
    if (boot.snapshot !== false) w.snapshot = { deck: JSON.stringify(w.ctx.$gameSystem._projectRCardDeckData ?? null), inv: JSON.stringify(w.ctx.$gameSystem._projectRCardInventory ?? null) };
    const r = plain(B(w).start({ deck: "mixed", level: 2, maxHp: 4000, ...opts }));
    assert.equal(r.ok, true, JSON.stringify(r));
    return w;
};
const report = w => plain(B(w).getReport());

test("登録とPlaytest専用: ProjectRBossTest が読み込まれ、既定の設定(HP・3フェーズの表)が決まっている。plugins.js に登録されている", () => {
    const w = buildWorld();
    assert.deepEqual(w.failures, []);
    for (const k of ["start", "end", "attackNow", "setAuto", "setConfig", "getConfig", "getReport", "getState", "defaults"]) assert.equal(typeof B(w)[k], "function", k);
    const d = plain(B(w).defaults());
    assert.equal(d.phases.length, 3);
    assert.ok(d.phases[0].rangedWindup > d.phases[1].rangedWindup && d.phases[1].rangedWindup > d.phases[2].rangedWindup, "フェーズが進むほど溜めが短い");
    assert.ok(d.phases[0].cooldown > d.phases[2].cooldown && d.phases[0].burst < d.phases[2].burst);
    const fs = require("node:fs"), path = require("node:path");
    const list = fs.readFileSync(path.join(__dirname, "..", "js", "plugins.js"), "utf8");
    assert.ok(list.indexOf("ProjectR_CombatTestArenaBoss") > list.indexOf("ProjectR_CombatTestArenaEnemies") && list.indexOf("ProjectR_CombatTestArenaBoss") > list.indexOf("ProjectR_BossFramework"), "依存の後ろ");
});

test("開始: 指輪2つを一時付与 → 全カード所持 → 本物の30枚の混成デッキ(Core/CardInventoryの検証つき)→ アリーナの戦闘 → ボス(HP4000・3フェーズ)。二重開始は拒否。終了で一時データが元に戻る", () => {
    const w = world();
    const info = plain(AT(w).deckInfo());
    assert.equal(info.size, 30); assert.equal(info.valid, true, JSON.stringify(info.reasons)); assert.deepEqual(info.inventoryReasons, []);
    assert.ok(info.rings.apollo && info.rings.hermes, "指輪は一時付与");
    assert.ok(handIds(w).some(id => id.startsWith("hermes_")) || Object.keys(info.counts).some(id => id.startsWith("hermes_")));
    assert.ok(Object.keys(info.counts).some(id => id.startsWith("apollo_")) && Object.keys(info.counts).some(id => id.startsWith("hermes_")), "Apollo と Hermes の混成");
    const s = plain(BF(w).getState());
    assert.deepEqual([s.bossId, s.maxHp, s.hp, s.phaseIndex, s.phaseCount], ["dev_boss_a16", 4000, 4000, 0, 3]);
    assert.equal(hpOf(w, 3), 4000); assert.equal(plain(B(w).start({})).reason, "alreadyRunning");
    const c0 = center(w);
    const near = w.ctx.$gameMap.events().filter(ev => ev && !ev._erased && ev.eventId() !== 3 && ev.event?.()?.note?.includes("<enemy>") && Math.hypot(ev._realX - c0.x, ev._realY - c0.y) < 20);
    assert.equal(near.length, 0, "ボス以外のダミー敵は片付けられる(カードの当たり・計測を汚さない)");
    assert.equal(plain(w.ctx.ProjectRCardDeck.isCardBattleActive()), true);
    const e = plain(B(w).end());
    assert.equal(e.ok, true); assert.equal(e.reset.restored, true);
    assert.equal(AT(w).isDirty(), false);
    assert.equal(JSON.stringify(w.ctx.$gameSystem._projectRCardDeckData ?? null), w.snapshot.deck, "デッキ・指輪・所持のデータが開始前に戻る");
    assert.equal(JSON.stringify(w.ctx.$gameSystem._projectRCardInventory ?? null), w.snapshot.inv);
    assert.equal(BF(w).isActive(), false); assert.equal(w.ctx.ProjectRCardDeck.isCardBattleActive(), false);
});

test("本物の遠距離攻撃: 予約(予兆) → 溜め → 実行(Hendrixの弾Event) → 止まっているプレイヤーに届いて UpdateEventHp(player)が1回。弾は消える", () => {
    const w = world({ autoAttack: false });
    put(w, 12, 25); const c = center(w);
    bossEv(w).setPosition(c.x + 8 - 0.5, c.y - 0.5);
    const hp0 = leader(w).hp, announced = [], fired = [];
    EA(w).onAnnounce(r => announced.push(plain(r))); EA(w).onFire(r => fired.push(plain(r)));
    const a = plain(B(w).attackNow("ranged")); assert.equal(a.ok, true, JSON.stringify(a));
    assert.equal(announced.length, 1); assert.equal(announced[0].kind, "ranged"); assert.ok(Math.abs(announced[0].degree - 270) < 2);
    frames(w, 30); assert.equal(shots(w).length, 0, "溜め中は弾が無い");
    secs(w, 6);
    assert.equal(fired.length, 1); const out = plain(EA(w).getOutcome(a.id));
    assert.deepEqual([out.state, out.damaged], ["fired", true]);
    assert.ok(leader(w).hp < hp0, "ダメージ " + (hp0 - leader(w).hp));
    assert.equal(w.calls.filter(x => x.name === "UpdateEventHp" && x.args.eventId === "player").length, 1, "公式のダメージ呼び出しが1回");
    assert.equal(shots(w).length, 0, "弾は消える");
});

test("本物の近接攻撃: 予約 → 溜め → 実行(Hendrixの判定Event)→ 隣のプレイヤーに当たる。ボスの近接は遠距離より重い(40)。避ければ当たらない", () => {
    const w = world({ autoAttack: false });
    put(w, 12, 25); const c = center(w);
    bossEv(w).setPosition(c.x + 1 - 0.5, c.y - 0.5);
    const hp0 = leader(w).hp;
    const a = plain(B(w).attackNow("melee")); assert.equal(a.ok, true);
    assert.equal(EA(w).get(a.id).kind, "melee");
    secs(w, 1.5);
    const out = plain(EA(w).getOutcome(a.id)); assert.equal(out.damaged, true, JSON.stringify(out));
    const lost = hp0 - leader(w).hp; assert.ok(lost > 20, "近接のダメージ " + lost);
    // 避ける: 溜めの間に離れる
    const hp1 = leader(w).hp;
    bossEv(w).setPosition(leader(w) && c.x + 1 - 0.5, c.y - 0.5);
    const b = plain(B(w).attackNow("melee")); frames(w, 5); put(w, 6, 25); secs(w, 1.5);
    assert.equal(plain(EA(w).getOutcome(b.id)).damaged === true, false, "離れれば当たらない"); assert.equal(leader(w).hp, hp1);
    assert.equal(shots(w).length, 0, "判定のEventが残らない");
});

test("フェーズ: HP 66% / 33% 以下で第二・第三形態。攻撃表が切り替わる(溜めが短く・間隔が短く・連射が増える)。ボスのHPは公式のUpdateEventHpで減る", () => {
    const w = world({ autoAttack: false });
    put(w, 12, 25); const c = center(w); bossEv(w).setPosition(c.x + 8 - 0.5, c.y - 0.5);
    const windups = [];
    EA(w).onAnnounce(r => { if (r.eventId === 3 && r.kind === "ranged") windups.push(r.windup); });
    B(w).attackNow("ranged"); secs(w, 7);
    hurt(w, 3, 1300); frames(w, 3);
    assert.equal(plain(BF(w).getState()).phaseIndex, 0, "66%超はまだ第一形態(HP " + hpOf(w, 3) + ")");
    hurt(w, 3, 100); frames(w, 3);
    assert.equal(plain(BF(w).getState()).phaseIndex, 1, "HP " + hpOf(w, 3));
    leader(w).setHp(leader(w).mhp); B(w).attackNow("ranged"); frames(w, 1);
    hurt(w, 3, 1400); frames(w, 3);
    assert.equal(plain(BF(w).getState()).phaseIndex, 2);
    secs(w, 7); leader(w).setHp(leader(w).mhp); B(w).attackNow("ranged");
    assert.deepEqual(windups, [60, 50, 44], "フェーズごとの溜め");
});

test("自動の攻撃: 主人公が近ければ近接、遠ければ遠距離。第三形態は遠距離が3連射(1本目より短い溜め)。ボスは歩いて近づく", () => {
    const w = world({ autoAttack: true, maxHp: 90000 });
    put(w, 12, 25); const c = center(w); bossEv(w).setPosition(c.x + 9 - 0.5, c.y - 0.5);
    B(w).setConfig({ phases: [{ cooldown: 30 }, { cooldown: 30 }, { cooldown: 30 }] });
    const d0 = 9;
    secs(w, 12);
    const r = report(w);
    assert.ok(r.attacks.byKind.ranged.announced >= 1 && r.attacks.fired >= 1, JSON.stringify(r.attacks.byKind));
    const x0 = bossEv(w)._realX; assert.ok(x0 < c.x + 9 - 0.5, "ボスは近づいた " + x0);
    assert.ok(plain(B(w).getState()).distance < d0);
    assert.ok(r.attacks.byKind.melee.announced >= 1, "近づいたら近接を使う " + JSON.stringify(r.attacks.byKind));
    // 第三形態の連射
    const w3 = world({ autoAttack: true, maxHp: 90000 });
    put(w3, 12, 25); const c3 = center(w3); bossEv(w3).setPosition(c3.x + 10 - 0.5, c3.y - 0.5);
    B(w3).setConfig({ holdDistance: 99, phases: [{ cooldown: 40 }, { cooldown: 40 }, { cooldown: 40 }] });
    hurt(w3, 3, 70000); frames(w3, 3); assert.equal(plain(BF(w3).getState()).phaseIndex, 2);
    const ann = []; EA(w3).onAnnounce(x => { if (x.eventId === 3) ann.push(plain(x)); });
    secs(w3, 4);
    const rangedWindups = ann.filter(a => a.kind === "ranged").map(a => a.windup);
    assert.ok(rangedWindups.length >= 3 && rangedWindups[0] === 44 && rangedWindups[1] < rangedWindups[0] && rangedWindups[2] < rangedWindups[0], "3連射 " + rangedWindups.join());
});

test("避けられる攻撃か(ボットで確認): 予兆の瞬間に逃げるボットは、全フェーズで1回も当たらない。動かないボットは当たる。避けるのに要るframeは溜めの範囲内", () => {
    for (const phase of [0, 1, 2]) {
        const dodge = world({ autoAttack: true, maxHp: 90000 });
        put(dodge, 12, 25); const c = center(dodge); bossEv(dodge).setPosition(c.x + 4 - 0.5, c.y - 0.5);
        if (phase) { hurt(dodge, 3, phase === 1 ? 31000 : 62000); frames(dodge, 3); }
        assert.equal(plain(BF(dodge).getState()).phaseIndex, phase);
        B(dodge).setConfig({ holdDistance: 3, phases: [{ cooldown: 20 }, { cooldown: 20 }, { cooldown: 20 }] });
        const dpf = fx.player(dodge).distancePerFrame ? fx.player(dodge).distancePerFrame() : 0.1;
        let seen = 0; const lines = [];
        EA(dodge).onAnnounce(rec => {
            if (rec.eventId !== 3) return;
            seen++;
            // 予兆の線・範囲から離れる: 遠距離は線に直角へ3マス、近接は後ろへ4マス(溜めの間に動ける距離 = 溜めframe x 1フレームの移動量)
            const can = rec.windup * Math.max(dpf, 0.05);
            const p = fx.player(dodge); const px = p._realX, py = p._realY;
            const bx = bossEv(dodge)._realX; // ボットの動き: 遠距離 = 余裕のある側へ縦に3マス / 近接 = ボスから離れる向きへ4マス(端に詰まらない)
            if (rec.kind === "ranged") {
                // 飛んでいる弾と新しい弾の「筋」(出発点から向きへの半直線)から1.6マス以上離れた、いちばん近い場所へ動く
                lines.push({ ox: rec.origin.x, oy: rec.origin.y, deg: rec.degree, t: dodge.frameCount ?? 0 }); if (lines.length > 4) lines.shift();
                const away = (x, y) => lines.every(l => { const dx = Math.sin(l.deg * Math.PI / 180), dy = -Math.cos(l.deg * Math.PI / 180), vx = x - l.ox, vy = y - l.oy, t = vx * dx + vy * dy; return t < 0 ? Math.hypot(vx, vy) > 1.6 : Math.abs(vx * dy - vy * dx) > 1.6; });
                let pick = null;
                for (const r of [2.5, 3.5, 5]) { for (let k = 0; k < 16 && !pick; k++) { const ang = k * Math.PI / 8, x = px + Math.cos(ang) * r, y = py + Math.sin(ang) * r; if (x > 3 && x < 44 && y > 5 && y < 31 && away(x, y)) pick = { x, y }; } if (pick) break; }
                if (pick) put(dodge, pick.x, pick.y);
            } else put(dodge, Math.max(3, Math.min(44, px + (px >= bx ? 4 : -4))), py);
            assert.ok(can >= 0.5);
        });
        const hp0 = leader(dodge).hp;
        secs(dodge, 20);
        assert.ok(seen >= 4, "フェーズ" + (phase + 1) + " 攻撃数 " + seen);
        assert.equal(leader(dodge).hp, hp0, "逃げれば当たらない(フェーズ" + (phase + 1) + ")");
        const r = report(dodge); assert.equal(r.attacks.damaged, 0);
    }
    const still = world({ autoAttack: true, maxHp: 90000 });
    put(still, 12, 25); const c2 = center(still); bossEv(still).setPosition(c2.x + 5 - 0.5, c2.y - 0.5);
    B(still).setConfig({ phases: [{ cooldown: 20 }] });
    const hp0 = leader(still).hp; secs(still, 10);
    assert.ok(leader(still).hp < hp0, "動かなければ当たる");
});

test("カード: 攻撃(黄金の矢)・防御(月桂冠・ヒュアキントス)・回復(エロスの矢)・状態(疫病・神託)・Hermes(筋力・一閃)が、ボス戦の中で本物の使用経路で使える。攻撃カードはボスのHPを減らす", () => {
    const cards = ["apollo_golden_volley", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_eros_arrow", "apollo_plague_rain", "apollo_oracle", "apollo_gigas_slayer", "apollo_lyre_rhythm", "hermes_strength", "hermes_issen"];
    const table = {};
    for (const card of cards) {
        const w = world({ autoAttack: true, maxHp: 90000 });
        put(w, 12, 25); const c = center(w); bossEv(w).setPosition(c.x + 6 - 0.5, c.y - 0.5);
        zetsu.restartWithOrder(w, [card, card, card, card, card, ...base.OTHER]); frames(w, 2);
        assert.equal(BF(w).isActive(), true, card + ": カード戦闘の作り直しでボス戦が壊れない");
        fx.aimDegree(w, 90, 3);
        fx.player(w).center(fx.player(w)._realX, fx.player(w)._realY);
        const before = hpOf(w, 3);
        const r = plain(deckApi(w).requestUseCard(Math.max(0, handIds(w).indexOf(card))));
        if (r.pending === true) { frames(w, 3); w.ctx.$gameTemp.reserveCommonEvent(1); } // 狙って撃つカードは、攻撃入力で確定する(実機ではマウス+攻撃ボタン)
        secs(w, 4);
        table[card] = { ok: r.ok === true || r.pending === true, bossLost: before - hpOf(w, 3), error: report(w).error };
        assert.equal(table[card].ok, true, card + " " + JSON.stringify(r)); assert.equal(table[card].error, null);
        assert.equal(w.failures?.length ?? 0, 0);
    }
    for (const card of ["apollo_golden_volley", "apollo_gigas_slayer", "hermes_issen"]) assert.ok(table[card].bossLost > 0, card + " はボスにダメージ " + JSON.stringify(table[card]));
});

test("勝利: ボスHP0 → BossFramework の勝利 → 予約・弾・判定が片付き、以後は攻撃しない。報告に勝利が残る", () => {
    const w = world({ autoAttack: true, maxHp: 4000 });
    put(w, 12, 25); const c = center(w); bossEv(w).setPosition(c.x + 7 - 0.5, c.y - 0.5);
    B(w).setConfig({ phases: [{ cooldown: 10 }] });
    secs(w, 3);
    let victory = 0; BF(w).onVictory(() => victory++);
    hurt(w, 3, 4000); frames(w, 4);
    assert.equal(victory, 1); assert.equal(BF(w).isActive(), false, "勝利で戦闘が終わる");
    assert.equal(report(w).over, "victory");
    assert.equal(EA(w).list().length, 0); frames(w, 2); assert.equal(shots(w).length, 0, "弾・判定が片付く");
    const announced = report(w).attacks.announced; secs(w, 5);
    assert.equal(report(w).attacks.announced, announced, "勝利後は新しい攻撃をしない");
    assert.equal(plain(B(w).end()).ended, true);
});

test("敗北: 主人公のHP0 → BossFramework の敗北 → 攻撃が止まり片付く。リトライ可能(同じボスをもう一度開始できる)", () => {
    const w = world({ autoAttack: true, maxHp: 90000 });
    put(w, 12, 25); const c = center(w); bossEv(w).setPosition(c.x + 5 - 0.5, c.y - 0.5);
    let defeat = 0; BF(w).onDefeat(() => defeat++);
    leader(w).setHp(1); hurt(w, "player", 5000); secs(w, 3);
    assert.equal(defeat, 1, "敗北が通知される");
    assert.equal(report(w).over, "defeat"); assert.equal(EA(w).list().length, 0);
    const a = report(w).attacks.announced; secs(w, 4); assert.equal(report(w).attacks.announced, a, "敗北後は攻撃しない");
    B(w).end();
    assert.equal(plain(BF(w).isActive()), false);
});

test("仲間(DEVのつなぎ。本番の仲間ではない): ボスの攻撃が仲間に当たる(PartyCombat.damageAlly)。ダウンした仲間は復帰しない。終了で仲間の状態が残らない", () => {
    const w = world({ autoAttack: false, allies: 2 });
    put(w, 12, 25); const c = center(w);
    assert.deepEqual(plain(w.ctx.ProjectRPartyRoster.members()).map(m => m.key), ["player", "ally:2", "ally:3"]);
    bossEv(w).setPosition(c.x + 8 - 0.5, c.y - 3 - 0.5);
    w.ctx.ProjectRTestEnemies.setAllyDamage(30);
    // 仲間2の体(event 5)の真正面へ撃つ: 数値の角度で指定する代わりに、仲間の位置から向きを計算
    const ally = w.ctx.$gameMap.event(5); const b = bossEv(w);
    const deg = ((Math.atan2(ally._realX - b._realX, -(ally._realY - b._realY)) * 180 / Math.PI) % 360 + 360) % 360;
    assert.equal(plain(w.ctx.ProjectRTestEnemies.registerBolt()).ok, true);
    const r = plain(EA(w).schedule({ eventId: 3, kind: "ranged", windupFrames: 20, degree: deg, template: w.ctx.ProjectRTestEnemies.BOLT, length: 14 }));
    assert.equal(r.ok, true, JSON.stringify(r));
    secs(w, 6);
    const hits = plain(w.ctx.ProjectRTestEnemies.getAllyHits()); assert.ok(hits.length >= 1 && hits[0].amount === 30, JSON.stringify(hits));
    assert.equal(w.ctx.ProjectRPartyCombat.members().find(m => m.actorId === hits[0].actorId).hp, 400 - 30);
    w.ctx.ProjectRPartyCombat.damageAlly(2, 1e6); assert.equal(plain(w.ctx.ProjectRPartyCombat.healAlly(2, 100)).ok, false);
    B(w).end();
    assert.equal(w.ctx.ProjectRPartyCombat.isActive(), false); assert.equal(w.ctx.$gameMap.event(5).linkedActorId, 0);
});

test("後片付け: 終了すると予約・弾・判定・ボス戦・カード戦闘・仲間・状態・VFXの台帳がすべて空。マップ移動でも片付く。Consoleのエラー(report.error)なし", () => {
    for (const how of ["end", "map"]) {
        const w = world({ autoAttack: true, maxHp: 90000, allies: 1 });
        put(w, 12, 25); const c = center(w); bossEv(w).setPosition(c.x + 6 - 0.5, c.y - 0.5);
        B(w).setConfig({ phases: [{ cooldown: 10 }] });
        secs(w, 4);
        assert.equal(report(w).error, null);
        if (how === "end") B(w).end(); else w.ctx.$gameMap.setup(4);
        frames(w, 3);
        assert.equal(EA(w).list().length, 0, how); assert.equal(shots(w).length, 0, how); assert.equal(BF(w).isActive(), false, how);
        assert.equal(w.ctx.ProjectRCardDeck.isCardBattleActive(), false, how); assert.equal(w.ctx.ProjectRPartyCombat.isActive(), false, how);
        assert.equal(plain(w.ctx.ProjectRApolloStatus.list()).length, 0, how); assert.equal(B(w).getReport(), null, how);
        assert.equal(AT(w).isDirty(), false, how);
    }
});

test("保護: 既存のダメージ・Cooldown・ドロー・セーブ・カードの仕様は変えていない(新規plugin + Playtest専用のつなぎ(watchAllies)だけ)", () => {
    const cp = require("node:child_process"), path = require("node:path");
    const project = path.join(__dirname, "..");
    const protectedFiles = ["js/plugins/ProjectR_CardDeckCore.js", "js/plugins/ProjectR_EnemyAttack.js", "js/plugins/ProjectR_BossFramework.js", "js/plugins/ProjectR_PartyCombat.js", "js/plugins/ProjectR_PartyRoster.js",
        "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_DamageModifiers.js", "js/plugins/ProjectR_CardModifiers.js", "js/plugins/ProjectR_GunSystem.js", "js/plugins/ProjectR_SwordSystem.js", "js/plugins/ProjectR_CombatSession.js"];
    const out = cp.spawnSync("git", ["status", "--porcelain", "--", ...protectedFiles, "data/Skills.json", "data/Map002.json", "js/rmmz_objects.js", "js/rmmz_scenes.js"], { cwd: project, encoding: "utf8" });
    assert.equal(out.stdout.trim(), "", "保護ファイルに差分なし: " + out.stdout);
});
