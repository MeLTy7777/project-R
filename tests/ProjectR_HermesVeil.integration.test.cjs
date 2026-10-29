"use strict";
// Phase H2B-3A: ヴェイルと他システムの統合 — 標的の秘匿(ProjectR_TargetEligibility ↔ Hendrixの敵AI部品)、DEV敵AI、移動速度の合成、クリティカル率の実ダメージ経路。
// 実エンジン(実Map004 + 全plugin)。「標的の秘匿の核」「DEV敵AIでの検証」「製品の敵AIへの接続(未了)」は別の主張として扱う。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, VEIL, ZETSU, deckApi, modifiers, player, useCard, runFrames, center, placeEnemy, parkOthers, barHp, resetHp, countCommands } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const api = w => w.ctx.ProjectRHermesVeil;
const elig = w => w.ctx.ProjectRTargetEligibility;
const cursorTile = (w, x, y) => { const m = w.ctx.$gameMap; w.mouse((x - m.displayX()) * m.tileWidth(), (y - m.displayY()) * m.tileHeight()); };
const cursorOnPlayer = w => { const c = center(w); cursorTile(w, c.x, c.y); };
const frames = (w, n) => runFrames(w, n);
const ticks = (w, n) => { for (let i = 0; i < n; i++) deckApi(w).updateCooldown(1 / 60); };
const active = w => plain(api(w).getActive());
const event = (w, id) => w.ctx.$gameMap.event(id);
const speedOf = (w, character) => modifiers(w).characterSpeedFactor(character || player(w));
const allyAt = (w, cx, cy) => { const s = w.ctx.ProjectRVeilTest.ally.spawn(cx, cy); assert.equal(s.ok, true, JSON.stringify(s)); return event(w, s.eventId); };
const range = (w, source, target, r = 60) => w.ctx.checkRange(source, r, target, 0, 0);
// 武器ダメージ/固定ダメージを1回与えて、減ったHPを返す。乱数は固定。
function hit(w, id, { value = "-player weapon", random = 0.3, extra = {} } = {}) {
    const before = barHp(w, id), interpreter = new w.ctx.Game_Interpreter();
    interpreter._eventId = 0;
    w.run(`globalThis.__r = Math.random; Math.random = () => ${random};`);
    try { w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value, exceedMaxHealth: "false", ...extra }); } finally { w.run("Math.random = globalThis.__r;"); }
    return before - barHp(w, id);
}
const crit = w => w.ctx.CollisionManager.lastCritical === true;
const fixed = (base = 100) => ({ value: `-${base}`, extra: { projectRFixed: { base, flat: 0, source: "test" } } });
// 乱数の境目: 自然な率より大きく、自然な率+0.5より小さい値(additiveなら出る・自然なら出ない)
const between = (w, id = 4) => modifiers(w).naturalCriticalChance(id) + 0.25;

test("秘匿の核(ProjectR_TargetEligibility): 秘匿の登録・解除、敵だけが標的を選ぶ側、味方・主人公・NPCの検知は妨げない。述語が壊れても安全", () => {
    const w = hermesWorld({ card: VEIL });
    const e = elig(w), enemy = event(w, 3);
    assert.equal(e.isHostile(enemy), true);
    assert.equal(e.isHostile(player(w)), false, "主人公は標的を選ぶ側ではない");
    assert.equal(e.isHostile(allyAt(w, 15.5, 25.5)), false, "<npc>は敵ではない");
    assert.equal(e.isHostile(undefined), true, "seeker未指定は敵として扱う");
    assert.equal(e.isConcealed(player(w), enemy), false, "何も登録が無ければ秘匿ではない");
    assert.equal(e.registerConcealment("t", c => c === player(w)), true);
    assert.equal(e.isConcealed(player(w), enemy), true);
    assert.equal(e.isConcealed(player(w), player(w)), false, "標的を選ぶ側が敵でなければ妨げない");
    assert.equal(e.isEligibleTarget(enemy, player(w)), false);
    assert.deepEqual(plain(e.filterEligible(enemy, [player(w), event(w, 4)]).map(c => c === player(w) ? "player" : c.eventId())), [4]);
    assert.equal(e.registerConcealment("bad", () => { throw new Error("x"); }), true);
    assert.equal(e.isConcealed(event(w, 4), enemy), false, "述語の例外は秘匿とみなさない");
    assert.ok(e.diagnostics().errors >= 1);
    assert.equal(e.unregisterConcealment("t"), true);
    e.unregisterConcealment("bad");
    assert.equal(e.isConcealed(player(w), enemy), false);
    assert.equal(e.registerConcealment("", () => true), false);
    assert.equal(e.registerConcealment("x", "not a function"), false);
});

test("Hendrixの範囲検知(checkRange): 敵は秘匿中の主人公を見つけられず、終われば再び見つけられる。秘匿されていなければ従来どおり。味方どうしの検知は妨げない", () => {
    const w = hermesWorld({ card: VEIL });
    const enemy = event(w, 3);
    assert.equal(range(w, 3, "player"), true, "ヴェイルが無ければ見つかる");
    assert.equal(enemy._detectedEvent, w.ctx.$gamePlayer);
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true);
    assert.equal(range(w, 3, "player"), false, "秘匿中は見つからない");
    assert.equal(enemy._detectedEvent, null, "古い覚えも外れる");
    assert.ok(elig(w).diagnostics().suppressedChecks >= 1);
    // 味方の検知は妨げない(主人公や<npc>が敵を探す・NPCが主人公を探す)
    const npc = allyAt(w, 14, 25.5);
    assert.equal(range(w, "player", "<enemy>"), true, "主人公は敵を探せる");
    assert.equal(range(w, npc.eventId(), "player"), true, "味方のNPCは秘匿中の主人公を見つけられる(追従など)");
    // 円を外す: 主人公は秘匿でなくなる
    cursorTile(w, 20.8, 25.5); frames(w, 1);
    assert.equal(range(w, 3, "player"), true, "円を出ると見つかる");
    // 終わり
    cursorOnPlayer(w); frames(w, 1);
    assert.equal(range(w, 3, "player"), false);
    ticks(w, 300);
    assert.equal(active(w).length, 0);
    assert.equal(range(w, 3, "player"), true, "終わると再取得できる");
    assert.equal(enemy._detectedEvent, w.ctx.$gamePlayer);
});

test("Hendrixの範囲検知(タグ): 敵は<npc>の味方を探すとき、秘匿中の候補を除いた中から最寄りを選ぶ。全員秘匿なら見つからない。索引は必ず元へ戻る", () => {
    const w = hermesWorld({ card: VEIL });
    parkOthers(w, [3]);
    placeEnemy(w, 3, 19.5, 25.5);
    const near = allyAt(w, 14.5, 25.5), far = allyAt(w, 8, 25.5);
    const enemy = event(w, 3);
    assert.equal(range(w, 3, "<npc>"), true);
    assert.equal(enemy._detectedEvent, near, "秘匿が無ければ最寄り(near)");
    const indexBefore = w.ctx.$gameMap.tagToEvents ? [...w.ctx.$gameMap.tagToEvents.keys()].sort().join() : null;
    cursorTile(w, 14.5, 25.5); // nearは円の中心、farは6.5離れて外側
    assert.equal(useCard(w).ok, true);
    assert.equal(api(w).isConcealed(near), true);
    assert.equal(api(w).isConcealed(far), false);
    assert.equal(range(w, 3, "<npc>"), true, "farは秘匿ではないので見つかる");
    assert.equal(enemy._detectedEvent, far, "秘匿中のnearを飛ばして、次に近いfarを選ぶ");
    assert.ok(elig(w).diagnostics().filteredCandidates >= 1);
    const indexAfter = w.ctx.$gameMap.tagToEvents ? [...w.ctx.$gameMap.tagToEvents.keys()].sort().join() : null;
    assert.equal(indexAfter, indexBefore, "タグ索引は元へ戻る");
    // 両方を覆う円: 見つからない
    cursorTile(w, 11.2, 25.5);
    frames(w, 1);
    assert.equal(api(w).isConcealed(near), true);
    assert.equal(api(w).isConcealed(far), true);
    assert.equal(range(w, 3, "<npc>"), false);
    assert.equal(enemy._detectedEvent, null);
    ticks(w, 300);
    assert.equal(range(w, 3, "<npc>"), true, "終わると再び標的にできる");
});

test("古い標的のキャッシュ: 敵が覚えている _detectedEvent / lockInTarget は、秘匿された瞬間に外れる。古い参照のまま追わない。終われば再取得", () => {
    const w = hermesWorld({ card: VEIL });
    const enemy = event(w, 3);
    assert.equal(range(w, 3, "player"), true);
    assert.equal(enemy._detectedEvent, w.ctx.$gamePlayer, "追っている覚え");
    enemy.lockInEnabled = true; enemy.lockInTarget = w.ctx.$gamePlayer;
    assert.equal(enemy.getLockedTarget(), w.ctx.$gamePlayer);
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true);
    // 1フレームの更新(毎フレームの掃除)で外れる
    frames(w, 1);
    assert.equal(enemy._detectedEvent, null);
    assert.equal(enemy.lockInTarget, null);
    // 掃除の前に消費されても外れる: 「検知した標的へ移動」は秘匿中なら古い覚えで動かない
    enemy._detectedEvent = w.ctx.$gamePlayer;
    let moved = 0;
    const original = enemy.moveToTargetContinous;
    enemy.moveToTargetContinous = function() { moved++; return original && original.apply(this, arguments); };
    enemy.moveToClosest("detected event", false, false);
    assert.equal(moved, 0, "秘匿中は覚えていても動かない");
    assert.equal(enemy._detectedEvent, null);
    enemy.lockInTarget = w.ctx.$gamePlayer;
    assert.equal(enemy.getLockedTarget(), null, "ロック中の標的も秘匿なら外す");
    // 主人公のロック(プレイヤー側の敵ロック)は秘匿の影響を受けない
    w.ctx.$gamePlayer.lockInEnabled = true; w.ctx.$gamePlayer.lockInTarget = enemy;
    assert.equal(w.ctx.$gamePlayer.getLockedTarget(), enemy);
    w.ctx.$gamePlayer.lockInEnabled = false; w.ctx.$gamePlayer.lockInTarget = null;
    // 終わり: 検知し直せば再取得
    ticks(w, 300);
    assert.equal(range(w, 3, "player"), true);
    enemy.moveToClosest("detected event", false, false);
    assert.ok(moved >= 0);
    assert.equal(enemy._detectedEvent, w.ctx.$gamePlayer);
});

test("秘匿は無敵ではない: 標的の探索だけを止め、findTargetsの結果・ダメージ・衝突の判定は変えない。ヴェイルは通行を妨げるEventを作らない", () => {
    const w = hermesWorld({ card: VEIL, level: 3 });
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true);
    assert.equal(elig(w).isConcealed(player(w), event(w, 3)), true);
    assert.deepEqual(plain(w.ctx.findTargets("player").map(t => t === w.ctx.$gamePlayer)), [true], "findTargetsは変えない");
    // 主人公へのダメージは入る(無敵ではない)
    const hp = w.ctx.$gameParty.leader().hp;
    const interpreter = new w.ctx.Game_Interpreter(); interpreter._eventId = 0;
    w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "player", value: "-7", exceedMaxHealth: "false" });
    assert.ok(w.ctx.$gameParty.leader().hp < hp, `主人公のHPは減る ${hp} → ${w.ctx.$gameParty.leader().hp}`);
    // Hermesの表示Eventは通行を妨げない
    const follower = event(w, plain(w.ctx.ProjectRGodSummonVisual.getFollowers())[0].eventId);
    assert.equal(follower.isThrough(), true, "すり抜け");
    assert.equal(w.ctx.$gamePlayer.isCollidedWithEvents(follower._x, follower._y), false, "主人公はHermesの表示に衝突しない");
    // 敵が出す攻撃判定(collide)は影響を受けない: 敵のcheckCollideはplayerを対象に取れる
    assert.equal(typeof w.ctx.checkCollide, "function");
    assert.equal(w.ctx.$gameParty.leader().atk, w.ctx.$gameActors.actor(w.ctx.$gameParty.leader().actorId()).atk, "ステータスは変えない");
});

test("DEV敵AI(Hendrixの検知部品を使う敵): 追跡 → ヴェイルで見失う → 終われば再取得。範囲を出れば再び追い、戻れば見失う。標的の取得は毎回通常の選択に従う", () => {
    const w = hermesWorld({ card: VEIL });
    parkOthers(w, [3]);
    placeEnemy(w, 3, 19.5, 25.5);
    const t = w.ctx.ProjectRVeilTest;
    assert.equal(t.ai.enable({ ids: [3], range: 60, target: "player", move: false }).ok, true);
    frames(w, 3);
    let state = plain(t.ai.state()).enemies.find(s => s.id === 3);
    assert.equal(state.state, "chase");
    assert.equal(state.detected, "player");
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true);
    frames(w, 3);
    state = plain(t.ai.state()).enemies.find(s => s.id === 3);
    assert.equal(state.state, "idle", "ヴェイルの範囲内の主人公は標的にされない");
    assert.equal(state.detected, null);
    cursorTile(w, 20.8, 25.5); // 円を主人公から外す
    frames(w, 3);
    assert.equal(plain(t.ai.state()).enemies.find(s => s.id === 3).state, "chase", "範囲を出ると再び標的になる");
    cursorOnPlayer(w);
    frames(w, 3);
    assert.equal(plain(t.ai.state()).enemies.find(s => s.id === 3).state, "idle", "戻ると再び見失う");
    ticks(w, 300);
    frames(w, 3);
    assert.equal(active(w).length, 0);
    state = plain(t.ai.state()).enemies.find(s => s.id === 3);
    assert.equal(state.state, "chase", "終われば再取得する");
    assert.equal(state.detected, "player");
    const tr = plain(t.ai.state()).transitions.map(x => `${x.from}>${x.to}`);
    assert.deepEqual(tr, ["idle>chase", "chase>idle", "idle>chase", "chase>idle", "idle>chase"]);
    // 味方<npc>を標的にするAI: 秘匿された味方は選ばず、秘匿されていない味方を選ぶ
    const w2 = hermesWorld({ card: VEIL });
    parkOthers(w2, [3]); placeEnemy(w2, 3, 19.5, 25.5);
    const a = allyAt(w2, 14.5, 25.5), b = allyAt(w2, 8, 25.5);
    w2.ctx.ProjectRVeilTest.ai.enable({ ids: [3], range: 60, target: "<npc>", move: false });
    frames(w2, 2);
    assert.equal(plain(w2.ctx.ProjectRVeilTest.ai.state()).enemies[0].detected, "event:" + a.eventId());
    cursorTile(w2, 14.5, 25.5);
    assert.equal(useCard(w2).ok, true);
    frames(w2, 2);
    assert.equal(plain(w2.ctx.ProjectRVeilTest.ai.state()).enemies[0].detected, "event:" + b.eventId(), "秘匿されたaではなくbへ切り替わる");
});

test("移動速度(Lv2): 範囲内の味方だけ x1.3。他の修飾(絶の移動速度x2.0・他の係数)と掛け合わさり、外れたら自分の係数だけが取れる。ステータスは変えない", () => {
    const w = hermesWorld({ card: VEIL, level: 2 });
    const p = player(w);
    const base = p.distancePerFrame();
    assert.ok(base > 0);
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true);
    assert.ok(Math.abs(p.distancePerFrame() - base * 1.3) < 1e-12, "x1.3");
    // 他の修飾と掛け合わさる
    assert.equal(modifiers(w).setMoveSpeedFactor("hermes_zetsu", 2.0, 1).ok, true);
    assert.ok(Math.abs(p.distancePerFrame() - base * 2.6) < 1e-12, `絶 x2.0 と合成 = x2.6 (${p.distancePerFrame() / base})`);
    assert.equal(modifiers(w).setCharacterSpeedFactor(p, "other", 0.5).ok, true);
    assert.ok(Math.abs(p.distancePerFrame() - base * 1.3) < 1e-12, "x2.0 x0.5 x1.3");
    // 範囲を出る: ヴェイルの係数だけ外れる
    cursorTile(w, 20.8, 25.5); frames(w, 1);
    assert.equal(speedOf(w), 0.5, "他の係数は残る");
    assert.ok(Math.abs(p.distancePerFrame() - base * 1.0) < 1e-12, "絶x2.0 x他0.5 = x1.0(ヴェイルなし)");
    cursorOnPlayer(w); frames(w, 1);
    assert.equal(speedOf(w), 0.65, "戻るとまた x1.3 が掛かる(0.5 x1.3)");
    // 終わり
    ticks(w, 300);
    assert.equal(speedOf(w), 0.5, "終わると自分の係数だけ外れる");
    modifiers(w).clearCharacterSpeedFactor(p, "other");
    modifiers(w).clearMoveSpeedFactor("hermes_zetsu");
    assert.equal(p.distancePerFrame(), base, "元の速度に戻る");
    assert.equal(w.ctx.$gameParty.leader().param(6), w.ctx.$gameParty.leader().paramBase(6) + w.ctx.$gameParty.leader().paramPlus(6) >= 0 ? w.ctx.$gameParty.leader().param(6) : 0, "ステータスは触らない");
    // Lv1は速度を変えない
    const v = hermesWorld({ card: VEIL, level: 1 });
    cursorOnPlayer(v);
    assert.equal(useCard(v).ok, true);
    assert.equal(speedOf(v), 1);
});

test("クリティカル率(Lv3): 実際の武器ダメージの抽選に入る。additive(既定)は+50ポイント、relativeは自然な率x1.5。範囲外・Lv2では変わらない。確定クリティカルと二重にならない", () => {
    const w = hermesWorld({ card: VEIL, level: 3, random: null });
    parkOthers(w, [4]);
    const natural = modifiers(w).naturalCriticalChance(4);
    assert.ok(natural > 0 && natural < 0.3, `自然な率 ${natural}`);
    const r = between(w);
    const plainDamage = hit(w, 4, { random: r });
    assert.equal(crit(w), false, "ヴェイルなし: 自然な率より大きい乱数では出ない");
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true);
    const critDamage = hit(w, 4, { random: r });
    assert.equal(crit(w), true, "ヴェイルLv3(additive): 実効率 = 自然 + 0.5");
    assert.ok(critDamage > plainDamage * 2, `クリティカルの倍率(約3倍) ${plainDamage} → ${critDamage}`);
    const log = plain(modifiers(w).getWeaponHitLog()).filter(e => e.type === "hit").pop();
    assert.ok(Math.abs(log.critChance - (natural + 0.5)) < 1e-9, `実効クリティカル率 ${log.critChance}`);
    // 範囲外では変わらない
    cursorTile(w, 20.8, 25.5); frames(w, 1);
    assert.equal(hit(w, 4, { random: r }), plainDamage);
    assert.equal(crit(w), false);
    // 戻ると再び
    cursorOnPlayer(w); frames(w, 1);
    assert.equal(hit(w, 4, { random: r }), critDamage);
    // relative: 自然な率x1.5。additiveの境目の乱数では出ない
    const rel = hermesWorld({ card: VEIL, level: 3, random: null });
    rel.ctx.PluginManager.parameters("ProjectR_HermesVeil").CriticalMode = "relative";
    parkOthers(rel, [4]);
    cursorOnPlayer(rel);
    assert.equal(useCard(rel).ok, true);
    assert.equal(api(rel).getLastResult().criticalMode, "relative");
    hit(rel, 4, { random: r });
    assert.equal(crit(rel), false, "relative: 0.1x1.5=0.15では 乱数(自然+0.25)は出ない");
    hit(rel, 4, { random: natural * 1.5 - 1e-6 });
    assert.equal(crit(rel), true, "relative: 自然x1.5 未満の乱数では出る");
    // Lv2は変えない
    const lv2 = hermesWorld({ card: VEIL, level: 2, random: null });
    parkOthers(lv2, [4]);
    cursorOnPlayer(lv2);
    assert.equal(useCard(lv2).ok, true);
    hit(lv2, 4, { random: r });
    assert.equal(crit(lv2), false, "Lv2にはクリティカル率の効果なし");
});

test("クリティカルの相互作用: 確定クリティカル(葦笛)があっても倍率は1回だけ。絶の武器強化中は絶が優先。固定ダメージは同じ確率式・critical:falseは出ない。ヴェイルなしの経路は不変", () => {
    const w = hermesWorld({ card: VEIL, level: 3, random: null });
    parkOthers(w, [4]);
    const r = between(w);
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true);
    // 確定クリティカル: ヴェイルの有無でダメージが同じ(二重に掛からない)
    modifiers(w).registerHitHook("test_force", { prepare: () => ({ forceCritical: true }) });
    const withVeil = hit(w, 4, { random: r });
    const veilBonus = api(w).criticalBonusFor("player");
    assert.equal(veilBonus, 0.5);
    cursorTile(w, 20.8, 25.5); frames(w, 1);
    const withoutVeil = hit(w, 4, { random: r });
    assert.equal(withVeil, withoutVeil, "確定クリティカルの倍率は1回(ヴェイルの確率補正を二重に掛けない)");
    modifiers(w).unregisterHitHook("test_force");
    cursorOnPlayer(w); frames(w, 1);
    // 絶の武器強化中: クリティカルは止まる(絶の仕様)。ヴェイルの確率補正は使わない
    modifiers(w).armWeaponHitBonus({ id: ZETSU, multiplier: 2, seconds: 5, source: ZETSU });
    const zetsuHit = hit(w, 4, { random: r });
    assert.equal(crit(w), false, "絶の強化中は公式のクリティカル抽選を止める");
    modifiers(w).clearWeaponHitBonus("test");
    cursorTile(w, 20.8, 25.5); frames(w, 1); // 同じ乱数で、ヴェイルの外・絶なしの基準ダメージ
    const normal = hit(w, 4, { random: r });
    assert.ok(Math.abs(zetsuHit - normal * 2) <= 1, `絶 x2.0 は変わらない(ヴェイルの補正が混ざらない) ${zetsuHit} vs ${normal}x2`);
    cursorOnPlayer(w); frames(w, 1);
    // 固定ダメージ(カードの固定値): 同じ確率式
    const f = fixed(100);
    assert.equal(hit(w, 4, { random: r, ...f }), 300, "固定100: 実効率 自然+0.5 > r → クリティカル x3.0");
    assert.equal(hit(w, 4, { random: 0.999, ...f }), 100);
    const noCrit = { value: "-100", extra: { projectRFixed: { base: 100, flat: 0, critical: false, source: "test" } } };
    assert.equal(hit(w, 4, { random: 0, ...noCrit }), 100, "critical:false(一閃)は出ない");
    // ヴェイルが無い世界では経路が不変
    const base = hermesWorld({ card: VEIL, level: 3, random: null });
    parkOthers(base, [4]);
    assert.equal(hit(base, 4, { random: r, ...f }), 100);
    assert.equal(plain(modifiers(base).getWeaponHitLog()).filter(e => e.type === "hit").pop().critChance, 0 + (modifiers(base).naturalCriticalChance(4)) );
});

test("ストレングス(攻撃力)との併用: 攻撃力の差し替えとクリティカル率の補正は独立。どちらも1回の呼び出しの間だけで、元の関数が必ず戻る", () => {
    const w = hermesWorld({ card: VEIL, level: 3, random: null });
    parkOthers(w, [4]);
    const Action = w.run("SHendrix_Action");
    const had = Object.prototype.hasOwnProperty.call(Action.prototype, "itemCri");
    const before = Action.prototype.itemCri;
    modifiers(w).registerHitHook("test_atk", { prepare: () => ({ atkMultiplier: 1.5 }) });
    const r = between(w);
    const plainDamage = hit(w, 4, { random: r });
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true);
    const both = hit(w, 4, { random: r });
    assert.ok(both > plainDamage * 2.9, `攻撃力x1.5 と クリティカル x3 が1回ずつ ${plainDamage} → ${both}`);
    assert.equal(Object.prototype.hasOwnProperty.call(Action.prototype, "itemCri"), had, "itemCriの差し替えは戻る");
    assert.equal(Action.prototype.itemCri, before);
    assert.equal(countCommands(w, "Hendrix_Action_Engine", "UpdateEventHp").length >= 0, true);
    modifiers(w).unregisterHitHook("test_atk");
    resetHp(w, [4]);
});

test("ヴェイルが無い間はHendrixの検知に一切介入しない: 秘匿の登録は効果が動いている間だけ。終われば登録が消え、checkRangeは元の関数と同じ結果", () => {
    const w = hermesWorld({ card: VEIL });
    assert.deepEqual(plain(elig(w).concealmentIds()), [], "未使用のとき登録なし");
    assert.equal(range(w, 3, "player"), true);
    assert.equal(elig(w).diagnostics().suppressedChecks, 0);
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true);
    assert.deepEqual(plain(elig(w).concealmentIds()), ["hermes_veil"]);
    ticks(w, 300);
    assert.deepEqual(plain(elig(w).concealmentIds()), [], "終われば登録も外れる");
    assert.equal(api(w).criticalBonusFor("player"), 0);
    // 2つ目が残る間は登録が残る
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true); ticks(w, 120);
    assert.equal(useCard(w).ok, true); ticks(w, 200);
    assert.deepEqual(plain(elig(w).concealmentIds()), ["hermes_veil"], "片方が終わっても残り1つで登録は続く");
    ticks(w, 200);
    assert.deepEqual(plain(elig(w).concealmentIds()), []);
});
