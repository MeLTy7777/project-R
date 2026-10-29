"use strict";
// Phase H2B-3B: Hermes「サイコポンポス」(設計ID 2 / hermes_psychopomp)。実エンジン(実Map004 + 全plugin)。
// ここはカード本体(登録・発動・10秒の窓・撃破の帰属・魂の生成/回収・回復・Lv3の攻撃力上昇・暫定ポリシー・後片付け・表示の失敗・セーブ互換)。
// ストレングス/絶/ヴェイル/通常の武器ダメージとの統合は ProjectR_HermesPsychopomp.integration.test.cjs。MZ実機は tools/mz_cdp/h3b_verify.cjs。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, PSYCHO, deckApi, placePolar, placeEnemy, parkOthers, useCard, runFrames, player, center, setRegion, ticks, resetHp, HP, ENEMIES } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const api = w => w.ctx.ProjectRHermesPsychopomp;
const souls = w => w.ctx.ProjectRSoulCollection;
const attr = w => w.ctx.ProjectRKillAttribution;
const actor = w => w.ctx.$gameParty.leader();
const barOf = (w, id) => w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id));
const setHp = (w, id, hp) => { const b = barOf(w, id); b.currentHp = b.targetHp = hp; b.refresh(); };
const params = w => w.ctx.PluginManager.parameters("ProjectR_HermesPsychopomp");
const stateOf = w => plain(deckApi(w).getBattleState());
const soulList = w => plain(souls(w).list());
// 公式 UpdateEventHp(攻撃Pluginが呼ぶのと同じコマンド)。sourceId = 呼び出し元のEvent(Hitbox等)。乱数は固定しない(致死ダメージなので結果は同じ)。
function hit(w, id, { value = "-player weapon", args = {}, sourceId = 0 } = {}) {
    const interpreter = new w.ctx.Game_Interpreter(); interpreter._eventId = sourceId;
    w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value, exceedMaxHealth: "false", ...args });
}
// 敵を1HPにして、主人公のダメージで倒す(帰属を指定しなければ通常の武器攻撃 = 主人公)。
function kill(w, id, options = {}) { setHp(w, id, 1); hit(w, id, options); assert.equal(barOf(w, id).currentHp, 0, `敵${id}は倒れた`); }
const tick = (w, n = 1) => ticks(w, n);
const heals = w => plain(api(w).getHealLog());
const withWindow = (level = 1, extra = {}) => { const w = hermesWorld({ card: PSYCHO, level, ...extra }); assert.equal(useCard(w).ok, true); return w; };
// 敵を主人公のまわりへ置く(死亡位置が魂の位置になる)。
const near = (w, id, r = 3, degree = 90) => placePolar(w, id, r, degree);

test("登録: 通常 / 最大3枚 / 最大Lv3 / Cooldown 10秒 / 実行時はinstant(ワークブックのHealは設計メタデータ)。設計ID2 ↔ hermes_psychopomp。7枚すべて実装済みだが30枚デッキは有効にしない", () => {
    const w = hermesWorld({ card: PSYCHO });
    assert.deepEqual(plain(deckApi(w).definitions.card(PSYCHO)), { cardId: PSYCHO, ringId: "hermes", maxCopies: 3, cooldownSeconds: 10, maxLevel: 3, rarity: "normal", category: "support", targetType: "instant" });
    const catalog = w.ctx.ProjectRCardCatalog;
    const design = plain(catalog.hermesDesign()).find(c => c.designId === 2);
    assert.deepEqual([design.name, design.runtimeCardId, design.implemented, design.workbookTargetType, design.targetType, design.classification, design.maxCopies, design.cooldownSeconds],
        ["サイコポンポス", PSYCHO, true, "Heal", "instant", "normal", 3, 10], "ワークブックの表記 Heal は残し、実行時の対象は instant");
    assert.equal(design.migration.legacyCardId, null);
    assert.deepEqual(plain(catalog.finalDeckBlockers()), []);
    assert.equal(catalog.isFinalDeckReady(), true);
    assert.equal(catalog.isFinalDeckActivated(), false, "本番の30枚デッキは有効にしない");
    assert.ok(plain(catalog.registeredRuntimeCards()).includes(PSYCHO));
    // 既存の ally(最寄りの味方を選ぶ Heal 系)の登録は変わらない
    assert.equal(deckApi(w).definitions.card("apollo_lyre_calm").targetType, "ally");
    assert.notEqual(deckApi(w).definitions.card(PSYCHO).targetType, "ally");
    const fresh = require("./RealEngineHarness.cjs").buildWorld(); fresh.enterMap(4, 12, 25);
    assert.equal(deckApi(fresh).isCardOwned(PSYCHO), false, "既定は未所持");
    assert.deepEqual(plain(deckApi(fresh).getDeck()), [], "新しいゲームのデッキは空(30枚デッキを付与しない)");
});

test("累積レベル: 回復 50 → 100(置換)→ 150(置換)+ Lv3で攻撃力+3%を3秒。半径5・効果時間10秒はLv1から。同じ効果の数値は足さない", () => {
    const w = hermesWorld({ card: PSYCHO });
    assert.deepEqual(plain(api(w).effectsForLevel(1)), { healAmount: 50, collectRadiusTiles: 5, durationSeconds: 10 });
    assert.deepEqual(plain(api(w).effectsForLevel(2)), { healAmount: 100, collectRadiusTiles: 5, durationSeconds: 10 }, "Lv2は50を100へ置換(150にならない)");
    assert.deepEqual(plain(api(w).effectsForLevel(3)), { healAmount: 150, collectRadiusTiles: 5, durationSeconds: 10, attackBonus: 0.03, attackBuffSeconds: 3 });
    assert.deepEqual([api(w).COLLECT_RADIUS_TILES, api(w).DURATION_SECONDS, api(w).ATTACK_BONUS, api(w).BUFF_SECONDS], [5, 10, 0.03, 3]);
});

test("発動: カードは1回だけ消費(山札-1・Cooldown+1)。10秒の窓が始まる。敵も魂も無くても成功し、発動しただけでは回復しない。最大HPも変わらない", () => {
    const w = hermesWorld({ card: PSYCHO, level: 3 });
    actor(w).setHp(100);
    const mhp = actor(w).mhp;
    const before = stateOf(w);
    const result = useCard(w);
    const after = stateOf(w);
    assert.equal(result.ok, true);
    assert.equal(result.cardId, PSYCHO);
    assert.equal(after.drawPile.length, before.drawPile.length - 1, "補充の1枚");
    assert.equal(after.cooldownPile.length, before.cooldownPile.length + 1, "Cooldownへ1枚");
    assert.equal(after.cooldownPile[after.cooldownPile.length - 1].instance.cardId, PSYCHO);
    const windows = plain(api(w).getWindows());
    assert.equal(windows.length, 1);
    assert.deepEqual([windows[0].level, windows[0].remaining], [3, 10]);
    assert.equal(actor(w).hp, 100, "発動しただけでは回復しない");
    assert.equal(actor(w).mhp, mhp);
    assert.equal(heals(w).length, 0);
    assert.equal(souls(w).count(), 0);
    assert.equal(plain(api(w).getLastResult()).consumed, true);
    // 窓の間も、何も起きなければ回復しない
    tick(w, 120);
    assert.equal(actor(w).hp, 100);
});

test("発動できない: 戦闘中でない・主人公が死亡しているときは失敗し、消費しない(窓も始まらない)", () => {
    const w = hermesWorld({ card: PSYCHO });
    const before = stateOf(w);
    w.ctx.ProjectR.PlayerDeath.isDead = () => true;
    const dead = useCard(w);
    w.ctx.ProjectR.PlayerDeath.isDead = () => false;
    assert.equal(dead.ok, false);
    assert.deepEqual(stateOf(w), before, "失敗では手札・山札・Cooldownが変わらない");
    assert.equal(api(w).getWindows().length, 0);
    assert.ok(!plain(api(w).getLastResult())?.consumed, "消費された記録は無い");
    deckApi(w).endCardBattle();
    const inactive = deckApi(w).requestUseCard(0);
    assert.equal(inactive.ok, false);
    assert.equal(api(w).getWindows().length, 0);
});

test("10秒の窓: 590 tickではまだ有効、満了(10秒)で終わり、その後に倒した敵は魂を落とさない。窓の間に何度発動しても消費は1回ずつ", () => {
    const w = hermesWorld({ card: PSYCHO });
    assert.equal(useCard(w).ok, true);
    tick(w, 590);
    assert.equal(api(w).getWindows().length, 1);
    assert.ok(api(w).getWindows()[0].remaining > 0.1 && api(w).getWindows()[0].remaining < 0.2);
    parkOthers(w, [4]); near(w, 4);
    tick(w, 11);
    assert.equal(api(w).getWindows().length, 0, "10秒で満了");
    assert.equal(plain(api(w).getLastResult()).lastEnd.reason, "expired");
    kill(w, 4);
    assert.equal(souls(w).count(), 0, "窓の外で倒した敵は魂を落とさない");
    assert.deepEqual(plain(api(w).getIgnored()).map(e => e.reason), []);
});

test("撃破の帰属: 主人公の撃破(player weapon / 固定ダメージ / <attacker: player>のHitbox / 明示 player)だけが魂を落とす。味方・環境・スクリプト・不明・敵同士・直接HP0は落とさない", () => {
    const w = withWindow(1, { bars: [2, 3, 4, 5, 6] });
    const hub = w.ctx.$gameMap.event(7);
    const base = hub.event();
    hub.event = () => ({ ...base, note: "<attacker: player>" });
    const npc = w.ctx.$gameMap.event(8);
    const base2 = npc.event();
    npc.event = () => ({ ...base2, note: "<attacker: apollo_ally>" });
    parkOthers(w, []);
    const cases = [
        ["weapon", id => kill(w, id), true, "player"],
        ["fixed", id => { setHp(w, id, 1); hit(w, id, { value: "-1", args: { projectRFixed: { base: 99999, source: "hermes_issen" } } }); }, true, "player"],
        ["hitboxNote", id => { setHp(w, id, 1); hit(w, id, { value: "-99999", sourceId: 7 }); }, true, "player"],
        ["explicitPlayer", id => { setHp(w, id, 1); hit(w, id, { value: "-99999", args: { projectRAttacker: "player" } }); }, true, "player"],
        ["allyNote", id => { setHp(w, id, 1); hit(w, id, { value: "-99999", sourceId: 8 }); }, false, "event:apollo_ally"],
        ["environment", id => { setHp(w, id, 1); hit(w, id, { value: "-99999", args: { projectRAttacker: "environment" } }); }, false, "environment"],
        ["scope", id => { setHp(w, id, 1); attr(w).withAttacker("script", "dev-script", () => hit(w, id, { value: "-99999" })); }, false, "script"],
        ["unknown", id => { setHp(w, id, 1); hit(w, id, { value: "-99999" }); }, false, "unknown"],
        ["enemyKillsEnemy", id => { setHp(w, id, 1); hit(w, id, { value: "-99999", sourceId: 5 }); }, false, "enemy"]
    ];
    const ids = [2, 3, 4, 6];
    const results = [];
    runFrames(w, 1);
    for (const [name, run, credited, attacker] of cases) {
        // 同じEventが生き返っても、死亡ごとに別の識別(deathKey)になるので、4体を順に使い回してよい
        const target = ids[results.length % ids.length];
        const beforeSouls = souls(w).diagnostics().spawned;
        setHp(w, target, HP);
        run(target);
        const death = attr(w).lastDeath();
        assert.equal(death.attacker, attacker, name);
        assert.equal(death.credited, credited, name);
        assert.equal(souls(w).diagnostics().spawned - beforeSouls, credited ? 1 : 0, `${name}: 魂の数`);
        results.push([name, death.basis]);
        // 次のケースのため、生き返らせる
        setHp(w, target, HP);
        runFrames(w, 1);
    }
    assert.deepEqual(results.map(r => r[0]), cases.map(c => c[0]));
    const ignored = plain(api(w).getIgnored());
    assert.equal(ignored.filter(e => e.reason === "notCredited").length, 5, "帰属が主人公でない撃破は無視され、記録される");
});

test("直接HP0(コマンドを通らない)は「不明」: 毎フレームの確認が見つけて通知するが、主人公の撃破にはならず、魂は出ない", () => {
    const w = hermesWorld({ card: PSYCHO });
    setHp(w, 5, 0); // 窓が始まる前から0のEvent(生きていたことが観測されていない)
    assert.equal(useCard(w).ok, true);
    parkOthers(w, [4]); near(w, 4);
    runFrames(w, 1); // 生きていることを観測
    setHp(w, 4, 0);
    runFrames(w, 1);
    const death = attr(w).lastDeath();
    assert.deepEqual([death.attacker, death.credited, death.sweep], ["unknown", false, true]);
    assert.equal(souls(w).count(), 0);
    assert.equal(attr(w).diagnostics().sweepDeaths, 1);
    // 最初から0のEvent(生きていたことが観測されていない)は、死亡として通知しない
    setHp(w, 5, 0);
    runFrames(w, 2);
    assert.equal(attr(w).deaths().filter(d => d.eventId === 5).length, 0);
});

test("DoTの持ち主: 持ち主が確かなDoT(projectRAttacker: player)の撃破は主人公のもの。持ち主の情報が無いDoTの撃破は主人公のものにしない(既存のApollo病のDoTは持ち主を渡さない = 未対応の経路)", () => {
    const w = withWindow(1);
    parkOthers(w, [4, 5]); near(w, 4); near(w, 5, 3, 270);
    setHp(w, 4, 1); hit(w, 4, { value: "-30", args: { projectRAttacker: "player", projectRAttackId: "disease:1" } });
    setHp(w, 5, 1); hit(w, 5, { value: "-30" }); // 持ち主なし
    const log = plain(attr(w).deaths());
    assert.deepEqual(log.map(d => [d.eventId, d.attacker, d.credited]), [[4, "player", true], [5, "unknown", false]]);
    assert.equal(souls(w).count(), 1);
    assert.equal(soulList(w)[0].enemyKey.startsWith("m4:e4#"), true);
    // 既存のApolloの病のDoT(ProjectR_ApolloDiseaseAttack。保護対象で変更しない)は、tickのUpdateEventHpに持ち主を渡さない。
    // 上の「持ち主なし」と同じ形の呼び出し(値だけ・呼び出し元Eventなし)なので「不明」= 主人公の撃破にならない。= 未対応の経路として docs に記録する。
    const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "js", "plugins", "ProjectR_ApolloDiseaseAttack.js"), "utf8");
    assert.ok(!/projectRAttacker/.test(source), "Apollo病のDoTは持ち主を渡さない(未対応の経路)");
});

test("重複通知なし: 倒れた敵への追撃は通知も魂も増やさない。同じ敵が生き返って再び倒れたときだけ、新しい死亡(別のdeathKey)として魂が1つ増える", () => {
    const w = withWindow(1);
    parkOthers(w, [4]); near(w, 4);
    kill(w, 4);
    hit(w, 4); hit(w, 4); hit(w, 4, { value: "-9999" });
    assert.equal(attr(w).diagnostics().notified, 1);
    assert.equal(souls(w).count(), 1);
    assert.equal(plain(api(w).getKillLog()).length, 1);
    const first = attr(w).lastDeath();
    // 生き返る → 再び倒す
    setHp(w, 4, 50); runFrames(w, 1);
    kill(w, 4);
    const second = attr(w).lastDeath();
    assert.equal(second.key, first.key, "同じ敵の識別子");
    assert.notEqual(second.deathKey, first.deathKey);
    assert.equal(souls(w).diagnostics().spawned, 2, "2回目の死亡で新しい魂(1つ目は frames の間に回収済み)");
    assert.equal(attr(w).diagnostics().revived >= 1, true);
});

test("任意のEvent ID: ID 2〜6のどの敵でも、倒した場所に魂が1つ。IDごとに別の識別子・別の魂ID", () => {
    const w = withWindow(1, { bars: [2, 3, 4, 5, 6] });
    const spots = { 2: [4, 200], 3: [3, 90], 4: [2, 0], 5: [4, 270], 6: [3, 135] };
    for (const [id, [r, degree]] of Object.entries(spots)) near(w, Number(id), r, degree);
    for (const id of [2, 3, 4, 5, 6]) kill(w, id);
    const list = soulList(w);
    assert.equal(list.length, 5);
    assert.equal(new Set(list.map(s => s.id)).size, 5);
    assert.equal(new Set(list.map(s => s.enemyKey)).size, 5);
    for (const id of [2, 3, 4, 5, 6]) {
        const death = plain(attr(w).deaths()).find(d => d.eventId === id);
        const soul = list.find(s => s.enemyKey === death.deathKey);
        assert.ok(soul, `敵${id}`);
        assert.deepEqual(soul.position, death.position, `敵${id}: 倒した場所`);
        const event = w.ctx.$gameMap.event(id), c = event.centerPositionPoint();
        assert.ok(Math.abs(c.x - soul.position.x) < 1e-9 && Math.abs(c.y - soul.position.y) < 1e-9, `敵${id}: 当たり判定の中心`);
    }
});

test("同時に多数: 4体が同じフレームで倒れても魂は4つ・回復は4回の独立した出来事。Hermesの演出は3体まで(残りは出さない)で、数フレーム後にEventが残らない", () => {
    const w = withWindow(1);
    for (const [i, id] of ENEMIES.entries()) near(w, id, 2 + i * 0.5, 45 + i * 80);
    actor(w).setHp(10);
    for (const id of ENEMIES) kill(w, id);
    assert.equal(souls(w).count(), 4);
    assert.equal(plain(api(w).diagnostics()).hermesShown, 3);
    assert.equal(plain(api(w).diagnostics()).hermesSkipped, 1);
    assert.ok(plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length <= 3);
    tick(w, 1);
    const log = heals(w);
    assert.equal(log.length, 4, "魂1つにつき独立した回復");
    assert.deepEqual(log.map(e => e.applied), [50, 50, 50, 50]);
    assert.equal(new Set(log.map(e => e.soulId)).size, 4);
    assert.equal(actor(w).hp, 210);
    runFrames(w, 60);
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length, 0, "Hermesの表示Eventは演出の後に消える");
    assert.equal(plain(w.ctx.ProjectRPresentationVfx.diagnostics()).activeKeys.filter(k => k === "hermes_psychopomp.soul").length, 0, "回収された魂のVFXは止まる");
});

test("回収の範囲: 主人公の中心から魂の中心まで5マス以内(境界を含む)。5.0001は範囲外。基準点は「魂と主人公の距離」", () => {
    const w = withWindow(1);
    const c = center(w);
    const at = (dx, dy, key) => souls(w).spawn({ position: { x: c.x + dx, y: c.y + dy }, enemyKey: key, level: 1 });
    at(5, 0, "east5"); at(5.0001, 0, "east5.0001"); at(0, -5, "north5"); at(4, -3, "tri"); at(-4.99, 0, "west4.99"); at(0, 5.01, "south5.01");
    tick(w, 1);
    const collected = heals(w).map(e => e.enemyKey).sort();
    assert.deepEqual(collected, ["east5", "north5", "tri", "west4.99"]);
    assert.deepEqual(soulList(w).map(s => s.enemyKey).sort(), ["east5.0001", "south5.01"]);
    // 距離は連続値: 主人公が動くと範囲に入る
    player(w).setPosition(player(w)._realX + 0.5, player(w)._realY);
    tick(w, 1);
    assert.ok(heals(w).map(e => e.enemyKey).includes("east5.0001"));
});

test("壁を越えない: 主人公と魂のあいだに壁(Region 255)があると回収できない。壁を外す/回り込める位置なら回収できる。壁が脇にあるだけなら遮らない", () => {
    const w = withWindow(1);
    const c = center(w), tx = Math.floor(c.x), ty = Math.floor(c.y);
    const wallTiles = [[tx + 2, ty - 1], [tx + 2, ty], [tx + 2, ty + 1]];
    for (const [x, y] of wallTiles) setRegion(w, x, y, 255);
    souls(w).spawn({ position: { x: c.x + 4, y: c.y }, enemyKey: "behindWall", level: 1 });
    tick(w, 2);
    assert.equal(heals(w).length, 0, "壁の向こうの魂は回収できない");
    assert.equal(souls(w).count(), 1, "魂は消えない");
    assert.ok(souls(w).diagnostics().blockedByWall >= 1);
    for (const [x, y] of wallTiles) setRegion(w, x, y, 0);
    tick(w, 1);
    assert.equal(heals(w).length, 1, "壁を外すと回収できる");
    // 壁が経路の脇にあるだけなら遮らない
    setRegion(w, tx + 2, ty + 3, 255);
    souls(w).spawn({ position: { x: c.x + 4, y: c.y }, enemyKey: "besideWall", level: 1 });
    tick(w, 1);
    assert.equal(heals(w).length, 2);
});

test("<CombatWall>のEvent壁も遮る。壁の判定ができないとき(Occlusionが無い)は安全側(回収しない・魂は残る)", () => {
    const w = withWindow(1);
    const c = center(w);
    fx.addWallEvent(w, "CombatWall", Math.floor(c.x) + 2, Math.floor(c.y));
    souls(w).spawn({ position: { x: c.x + 4, y: c.y }, enemyKey: "evWall", level: 1 });
    tick(w, 2);
    assert.equal(heals(w).length, 0, "CombatWall Eventの向こう");
    const w2 = withWindow(1);
    const original = w2.ctx.ProjectR.CombatOcclusion;
    w2.ctx.ProjectR.CombatOcclusion = {};
    souls(w2).spawn({ position: { x: center(w2).x + 2, y: center(w2).y }, enemyKey: "noOcc", level: 1 });
    tick(w2, 2);
    assert.equal(heals(w2).length, 0);
    assert.equal(souls(w2).count(), 1);
    assert.ok(souls(w2).diagnostics().occlusionUnavailable >= 1);
    w2.ctx.ProjectR.CombatOcclusion = original;
    tick(w2, 1);
    assert.equal(heals(w2).length, 1, "判定が戻れば回収できる");
});

test("1回だけ回収: 回収した魂は台帳から消え、再回収・二重回復が起きない。回収後は何度tickしても回復は1回", () => {
    const w = withWindow(1);
    const c = center(w);
    actor(w).setHp(10);
    souls(w).spawn({ position: { x: c.x + 2, y: c.y }, enemyKey: "once", level: 1 });
    tick(w, 1);
    tick(w, 30);
    assert.equal(heals(w).length, 1);
    assert.equal(actor(w).hp, 60);
    assert.equal(souls(w).count(), 0);
    assert.deepEqual(plain(souls(w).collectAround({ center: c, radius: 5, lineOfSight: false })), []);
    assert.equal(souls(w).diagnostics().collected, 1);
    // 同じ敵(同じdeathKey)から、もう一度魂は作れない
    assert.equal(plain(souls(w).spawn({ position: { x: c.x + 2, y: c.y }, enemyKey: "once", level: 1 })).reason, "duplicate");
});

test("回復量: Lv1 50 / Lv2 100 / Lv3 150。対象は操作中の主人公。最大HPは変わらない。魂が生まれた時点のレベルで決まる", () => {
    for (const [level, amount] of [[1, 50], [2, 100], [3, 150]]) {
        const w = withWindow(level);
        parkOthers(w, [4]); near(w, 4);
        actor(w).setHp(40);
        const mhp = actor(w).mhp;
        kill(w, 4);
        assert.equal(actor(w).hp, 40, "倒しただけでは回復しない(魂を拾うまで)");
        tick(w, 1);
        assert.equal(actor(w).hp, 40 + amount, `Lv${level}`);
        assert.equal(actor(w).mhp, mhp);
        assert.deepEqual([heals(w)[0].level, heals(w)[0].requested, heals(w)[0].applied], [level, amount, amount]);
    }
    // 魂の生まれた時点のレベル: 魂が出た後にカードのレベルが変わっても、その魂の回復量は変わらない
    const w = withWindow(1);
    parkOthers(w, [4]); near(w, 4);
    actor(w).setHp(40);
    placeEnemy(w, 4, center(w).x + 8, center(w).y); // 範囲外に倒す
    kill(w, 4);
    assert.equal(deckApi(w).setCardLevel(PSYCHO, 3).ok, true);
    player(w).setPosition(player(w)._realX + 4, player(w)._realY);
    tick(w, 1);
    assert.equal(heals(w)[0].requested, 50, "Lv1のときの魂はLv1の回復量");
});

test("最大HPを超えて回復しない: 不足分だけ回復。満タンなら回復0(魂は回収される)。CollectAtFullHp=falseなら満タンの間は回収せず、HPが減ったら回収する", () => {
    const w = withWindow(3);
    const c = center(w);
    actor(w).setHp(actor(w).mhp - 20);
    souls(w).spawn({ position: { x: c.x + 2, y: c.y }, enemyKey: "a", level: 3 });
    tick(w, 1);
    assert.equal(actor(w).hp, actor(w).mhp);
    assert.deepEqual([heals(w)[0].requested, heals(w)[0].applied], [150, 20]);
    souls(w).spawn({ position: { x: c.x + 2, y: c.y }, enemyKey: "b", level: 3 });
    tick(w, 1);
    assert.deepEqual([heals(w)[1].requested, heals(w)[1].applied], [150, 0], "満タンでも回収(暫定: 回復量0)");
    assert.equal(actor(w).hp, actor(w).mhp, "過回復しない");
    params(w).CollectAtFullHp = "false";
    souls(w).spawn({ position: { x: c.x + 2, y: c.y }, enemyKey: "c", level: 3 });
    tick(w, 5);
    assert.equal(heals(w).length, 2);
    assert.equal(souls(w).count(), 1, "満タンの間は魂が残る");
    actor(w).setHp(actor(w).mhp - 70);
    tick(w, 1);
    assert.equal(heals(w).length, 3);
    assert.equal(heals(w)[2].applied, 70);
});

test("Lv3の攻撃力上昇: 魂1つにつき+3%・3秒。重ね掛け(additive 1.03 / 1.06 / 1.09)。新しい魂を拾うたびに共有の残り時間が3秒へ戻る。3秒で全部消える", () => {
    const w = withWindow(3);
    const c = center(w);
    const grab = key => { souls(w).spawn({ position: { x: c.x + 2, y: c.y }, enemyKey: key, level: 3 }); tick(w, 1); };
    assert.equal(api(w).getBuff(), null);
    grab("s1");
    assert.deepEqual([api(w).getBuff().stacks, api(w).getBuff().multiplier], [1, 1.03]);
    tick(w, 120);
    assert.ok(Math.abs(api(w).getBuff().remaining - (3 - 121 / 60)) < 1e-6);
    grab("s2");
    assert.equal(api(w).getBuff().stacks, 2);
    assert.ok(Math.abs(api(w).getBuff().multiplier - 1.06) < 1e-12);
    assert.ok(api(w).getBuff().remaining > 2.9 && api(w).getBuff().remaining <= 3, "共有の残り時間は3秒へ戻る(1つ目の残りではない)");
    tick(w, 100);
    grab("s3");
    assert.ok(Math.abs(api(w).getBuff().multiplier - 1.09) < 1e-12);
    assert.ok(api(w).getBuff().remaining > 2.9);
    tick(w, 178);
    assert.notEqual(api(w).getBuff(), null, "3秒に届く前はまだ有効");
    tick(w, 3);
    assert.equal(api(w).getBuff(), null, "3秒で全スタックが消える");
    assert.equal(api(w).attackMultiplier(), 1);
    // 乗算の暫定: 1.03^n
    params(w).StackingMode = "multiplicative";
    grab("m1"); grab("m2");
    assert.ok(Math.abs(api(w).getBuff().multiplier - 1.03 * 1.03) < 1e-12);
    params(w).StackingMode = "additive";
    assert.ok(Math.abs(api(w).combine([0.03, 0.03, 0.03]) - 1.09) < 1e-12);
});

test("Lv1/Lv2では攻撃力上昇は無い。回復だけ", () => {
    for (const level of [1, 2]) {
        const w = withWindow(level);
        const c = center(w);
        souls(w).spawn({ position: { x: c.x + 2, y: c.y }, enemyKey: "x", level });
        tick(w, 1);
        assert.equal(api(w).getBuff(), null, `Lv${level}`);
        assert.equal(heals(w).length, 1);
    }
});

test("暫定ポリシー(1) 効果時間後の未回収の魂: remove(既定)は窓の終了で消え、keepは戦闘終了まで残って窓の後も拾える", () => {
    for (const policy of ["remove", "keep"]) {
        const w = withWindow(2);
        params(w).AfterWindow = policy;
        const c = center(w);
        souls(w).spawn({ position: { x: c.x + 9, y: c.y }, enemyKey: "far", level: 2, windowSerial: api(w).getWindows()[0].serial }); // 範囲外
        tick(w, 601);
        assert.equal(api(w).getWindows().length, 0);
        if (policy === "remove") {
            assert.equal(souls(w).count(), 0, "窓の終了で未回収の魂は消える");
            assert.equal(plain(souls(w).history()).filter(h => h.type === "remove").pop().reason, "windowEnded");
        } else {
            assert.equal(souls(w).count(), 1, "keep: 戦闘終了まで残る");
            player(w).setPosition(player(w)._realX + 6, player(w)._realY);
            tick(w, 1);
            assert.equal(heals(w).length, 1, "窓が終わった後も回収できる");
            assert.equal(heals(w)[0].requested, 100);
        }
    }
});

test("暫定ポリシー(2) 効果中の再発動: refreshは残り時間を10秒へ戻す・extendは10秒を足す。どちらも魂の数は増えない(窓は1つ)", () => {
    for (const policy of ["refresh", "extend"]) {
        const w = hermesWorld({ card: PSYCHO });
        params(w).RecastPolicy = policy;
        assert.equal(useCard(w).ok, true);
        tick(w, 240);
        assert.equal(useCard(w).ok, true);
        const windows = plain(api(w).getWindows());
        assert.equal(windows.length, 1, policy);
        assert.ok(Math.abs(windows[0].remaining - (policy === "refresh" ? 10 : 16)) < 1e-6, `${policy}: ${windows[0].remaining}`);
        parkOthers(w, [4]); near(w, 4);
        kill(w, 4);
        assert.equal(souls(w).count(), 1, `${policy}: 1体の撃破で魂は1つ`);
    }
});

test("後片付け: 戦闘終了・主人公の死亡・マップ移動・ロード・ニューゲームで、窓・魂・攻撃力上昇・Hermesの表示・VFXがすべて消える。HP・ステータスは変えない", () => {
    const cases = {
        battleEnd: w => deckApi(w).endCardBattle(),
        death: w => { w.ctx.ProjectR.PlayerDeath.isDead = () => true; runFrames(w, 2); },
        mapSetup: w => w.ctx.$gameMap.setup(4),
        load: w => w.ctx.DataManager.extractSaveContents({ system: w.ctx.$gameSystem, screen: w.ctx.$gameScreen, timer: w.ctx.$gameTimer, switches: w.ctx.$gameSwitches, variables: w.ctx.$gameVariables,
            selfSwitches: w.ctx.$gameSelfSwitches, actors: w.ctx.$gameActors, party: w.ctx.$gameParty, map: w.ctx.$gameMap, player: w.ctx.$gamePlayer }),
        newGame: w => w.ctx.DataManager.setupNewGame()
    };
    for (const [name, run] of Object.entries(cases)) {
        const w = withWindow(3);
        parkOthers(w, [4, 5]); near(w, 4, 8); near(w, 5, 8, 200); // 範囲外で倒す(魂が残る)
        kill(w, 4); kill(w, 5);
        const c = center(w);
        souls(w).spawn({ position: { x: c.x + 2, y: c.y }, enemyKey: "grab", level: 3 });
        tick(w, 1);
        assert.ok(api(w).getBuff(), name);
        assert.equal(souls(w).count(), 2, name);
        assert.ok(plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length >= 1, name);
        const atk = actor(w).atk, mhp = actor(w).mhp;
        try { run(w); } catch (error) { if (name !== "load" && name !== "newGame") throw error; }
        assert.equal(api(w).getWindows().length, 0, name);
        assert.equal(api(w).getBuff(), null, name);
        assert.equal(souls(w).count(), 0, `${name}: 魂`);
        assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getAnchors()).length, 0, `${name}: 魂のVFXの錨Event`);
        assert.equal(souls(w).diagnostics().anchors, 0, `${name}: 錨の台帳`);
        assert.equal(api(w).attackMultiplier(), 1, name);
        if (name !== "mapSetup" && name !== "load" && name !== "newGame") {
            assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length, 0, `${name}: Hermesの表示Event`);
            const keys = plain(w.ctx.ProjectRPresentationVfx.diagnostics()).activeKeys;
            assert.ok(!keys.includes("hermes_psychopomp.soul"), `${name}: 魂のVFX ${keys}`);
        }
        if (name === "death" || name === "battleEnd") { assert.equal(actor(w).atk, atk); assert.equal(actor(w).mhp, mhp); }
        // 片付けた後は購読も外れている(撃破を聞かない)
        assert.equal(attr(w).diagnostics().listeners, 0, `${name}: 購読`);
    }
});

test("VFX・表示の失敗は判定に影響しない: VFXが例外/失敗/欠落、Hermesの表示が例外/失敗でも、カードは消費され、魂は出て、回収・回復・攻撃力上昇が正しく動く", () => {
    for (const mode of ["playThrows", "playFails", "spawnThrows", "spawnFails", "noVisualApi", "noVfxApi", "noPresentationApi", "snapThrows", "anchorThrows", "anchorFails"]) {
        const w = hermesWorld({ card: PSYCHO, level: 3 });
        const vfx = w.ctx.ProjectRPresentationVfx, visual = w.ctx.ProjectRGodSummonVisual, pres = w.ctx.ProjectRCharacterPresentation;
        ({
            playThrows: () => { w.ctx.ProjectRPresentationVfx = Object.freeze({ ...vfx, play: () => { throw new Error("vfx"); } }); },
            playFails: () => { w.ctx.ProjectRPresentationVfx = Object.freeze({ ...vfx, play: () => ({ ok: false, reason: "x" }) }); },
            spawnThrows: () => { w.ctx.ProjectRGodSummonVisual = { ...visual, spawnFollower: () => { throw new Error("spawn"); } }; },
            spawnFails: () => { w.ctx.ProjectRGodSummonVisual = { ...visual, spawnFollower: () => ({ ok: false, reason: "templateMissing" }) }; },
            noVisualApi: () => { w.ctx.ProjectRGodSummonVisual = {}; },
            noVfxApi: () => { w.ctx.ProjectRPresentationVfx = {}; },
            noPresentationApi: () => { w.ctx.ProjectRCharacterPresentation = {}; },
            snapThrows: () => { w.ctx.ProjectRCharacterPresentation = { ...pres, request: () => { throw new Error("snap"); } }; },
            anchorThrows: () => { w.ctx.ProjectRGodSummonVisual = { ...visual, spawnAnchor: () => { throw new Error("anchor"); } }; },
            anchorFails: () => { w.ctx.ProjectRGodSummonVisual = { ...visual, spawnAnchor: () => ({ ok: false, reason: "templateMissing" }) }; }
        })[mode]();
        assert.equal(useCard(w).ok, true, mode);
        parkOthers(w, [4]); near(w, 4);
        actor(w).setHp(10);
        kill(w, 4);
        assert.equal(souls(w).count(), 1, mode);
        tick(w, 1);
        assert.equal(actor(w).hp, 160, mode);
        assert.ok(api(w).getBuff(), mode);
        runFrames(w, 50);
        assert.equal(souls(w).count(), 0, mode);
    }
});

test("VFXを止める予約: 公式のShow VFXの絵の登録が遅れても(止める時点でまだ無い)、登録されたら止まる。別のnoteの絵には触れない。期限を過ぎた予約は捨てる", () => {
    const w = hermesWorld({ card: PSYCHO });
    const disposed = [];
    const picture = note => ({ note, dispose() { disposed.push(note); } });
    w.run("globalThis.AnimatedPictureManager = { _animatedPictures: [] };");
    const manager = w.ctx.AnimatedPictureManager;
    assert.equal(w.ctx.ProjectRPresentationVfx.stop("ProjectR:hermes_psychopomp.soul#h1"), 0, "まだ無い");
    manager._animatedPictures.push(picture("ProjectR:hermes_psychopomp.soul#h2"), picture("other"));
    runFrames(w, 1);
    assert.deepEqual(disposed, [], "別のnoteは止めない");
    manager._animatedPictures.push(picture("ProjectR:hermes_psychopomp.soul#h1"));
    runFrames(w, 1);
    assert.deepEqual(disposed, ["ProjectR:hermes_psychopomp.soul#h1"], "遅れて登録された絵が止まる");
    runFrames(w, 3);
    assert.equal(disposed.length, 1, "二重に止めない");
    // note の接頭辞が違うものは予約しない
    assert.equal(w.ctx.ProjectRPresentationVfx.stop("not-projectr"), 0);
});

test("セーブ互換: 魂・窓・攻撃力上昇・帰属はセーブしない(保存内容に何も増えない)。旧セーブ(サイコポンポス無し)は変わらず読める。ロードで実行時の状態は消える", () => {
    const w = withWindow(3);
    parkOthers(w, [4]); near(w, 4);
    kill(w, 4);
    tick(w, 1);
    const contents = w.ctx.DataManager.makeSaveContents();
    const text = JSON.stringify(contents);
    for (const word of ["soul", "Soul", "psychopomp_window", "killAttribution", "attackBuff"]) assert.ok(!text.includes(word), `保存内容に ${word} が無い`);
    // 旧セーブ: サイコポンポスの所持が無い保存データを正規化しても、既存の所持・保存デッキは変わらない
    const d = deckApi(w);
    const legacy = ["hermes_swift_movement", "hermes_reed_flute_sleep", "apollo_lyre_calm"];
    const raw = { version: 1, cardOwnership: Object.fromEntries(legacy.map(id => [id, { owned: true, level: 2 }])), ringOwnershipState: { hermes: "player", apollo: "player" },
        ultimateSelection: { ringId: "hermes" }, deckDefinition: { cardIds: [...legacy] } };
    const normalized = plain(d.normalizePersistentData(JSON.parse(JSON.stringify(raw)), d.definitions));
    for (const id of legacy) assert.deepEqual(normalized.cardOwnership[id], { owned: true, level: 2 }, id);
    assert.equal(normalized.cardOwnership[PSYCHO], undefined, "サイコポンポスを勝手に所持にしない");
    assert.deepEqual(normalized.deckDefinition.cardIds, legacy);
});

test("Chromium 85 互換: 新しいplugin(帰属・魂・サイコポンポス・DEV)に新しい構文・APIを使わない", () => {
    const fs = require("node:fs"), path = require("node:path");
    const files = ["ProjectR_KillAttribution.js", "ProjectR_SoulCollection.js", "ProjectR_HermesPsychopomp.js", "ProjectR_CombatTestArenaPsychopomp.js"];
    const banned = [[/\?\?=|\|\|=|&&=/, "論理代入"], [/\.at\(/, "Array.at"], [/\breplaceAll\(/, "replaceAll"], [/Object\.hasOwn\(/, "Object.hasOwn"], [/structuredClone\(/, "structuredClone"],
        [/\bstatic\s*\{/, "static block"], [/#[A-Za-z_]\w*\s*[=;(]/, "private field"], [/\.findLast\(/, "findLast"], [/\.toSorted\(|\.toReversed\(/, "toSorted"], [/Array\.fromAsync/, "fromAsync"], [/\bawait\s/, "await"]];
    for (const file of files) {
        const source = fs.readFileSync(path.join(__dirname, "..", "js", "plugins", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
        for (const [re, label] of banned) assert.ok(!re.test(source), `${file}: ${label}`);
    }
});

console.log(`${passed} Hermes Psychopomp tests passed`);
