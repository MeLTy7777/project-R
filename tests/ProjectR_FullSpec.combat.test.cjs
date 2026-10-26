"use strict";
// 全仕様パス: 戦闘ライフサイクル(CombatSession)・Party(仲間)フレームワーク・ボス枠組み・ボス開始のデッキ検証・
// Divine HP攻撃窓口・追加HUD・保存しない状態。実Pluginを本番と同じ順でVMに読み込む(MZ描画は対象外)。
const assert = require("node:assert/strict");
const { createGame, giveEverything, validDeck, plain, read, productionCards } = require("./ProjectR_FullSpecFixture.cjs");

const deepEqual = (a, b, m) => assert.deepEqual(plain(a), plain(b), m);
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

function battleReady(options = {}) {
    const g = createGame({ deckFixture: true, ...options });
    giveEverything(g);
    g.ProjectRCardDeck.setDeck(validDeck());
    return g;
}
const fighter = (actorId, extra = {}) => ({
    actorId, name: `Ally${actorId}`, maxHp: 100, style: "melee", preferredRange: 1.5, engageRange: 8,
    normalAttack: { id: `attack${actorId}`, range: 2, cooldownSeconds: 1.5 },
    ringSkills: { hermes: [{ id: "hermes_strike", range: 3, cooldownSeconds: 5 }, { id: "hermes_mend", cooldownSeconds: 8, target: "allyLowestHp" }] },
    ...extra
});

// ---------------- Party(仲間)フレームワーク ----------------
test("Party: 定義はデータ駆動(許可指輪・距離・通常攻撃・指輪AIスキル・Cooldown・ターゲット傾向)。製品の仲間は0人", () => {
    const g = createGame();
    const party = g.ProjectRPartyCombat;
    assert.equal(party.allyDefinitions().length, 0, "製品に仲間の最終キャラ・最終AIは未定義");
    assert.equal(party.registerAlly({ actorId: 4 }).reason, "normalAttackRequired");
    assert.equal(party.registerAlly({ actorId: 0, normalAttack: { id: "a" } }).reason, "invalidActorId");
    assert.equal(party.registerAlly(fighter(4, { style: "ranged", targetPreference: "lowestHp", preferredRange: 5 })).ok, true);
    const def = party.allyDefinition(4);
    assert.equal(def.style, "ranged"); assert.equal(def.targetPreference, "lowestHp"); assert.equal(def.preferredRange, 5);
    assert.equal(def.normalAttack.cooldownSeconds, 1.5);
    assert.equal(def.ringSkills.hermes.length, 2);
    assert.equal(party.usesPlayerDeck, false);
    assert.throws(() => { def.maxHp = 1; "use strict"; }, TypeError, "定義は凍結");
});

test("Party: 主人公+最大2人。重複は1人。未定義の仲間は拒否。3人目は拒否。HP0のダウンは戦闘中は復帰しない", () => {
    const g = createGame();
    const party = g.ProjectRPartyCombat;
    [4, 6, 7].forEach(id => party.registerAlly(fighter(id)));
    assert.equal(party.startSession([4, 6, 7]).reason, "tooManyAllies");
    assert.equal(party.startSession([4, 99]).reason, "allyNotDefined");
    assert.equal(party.isActive(), false, "失敗では何も始まらない");
    const started = party.startSession([4, 4, 6]);
    assert.equal(started.ok, true); assert.equal(party.members().length, 2, "重複は1人にまとめる");
    assert.equal(party.damageAlly(4, 40).hp, 60);
    assert.equal(party.damageAlly(4, 100).down, true);
    assert.equal(party.members()[0].down, true);
    assert.equal(party.healAlly(4, 50).reason, "down", "ダウンは回復で復帰しない");
    assert.equal(party.damageAlly(4, 5).reason, "alreadyDown");
    assert.equal(party.allDown(), false);
    party.damageAlly(6, 999);
    assert.equal(party.allDown(), true); assert.equal(party.downCount(), 2);
});

test("Party: 指輪を持つ仲間だけが、その指輪のAIスキルを使える(持っていなければ通常攻撃だけ)", () => {
    const g = createGame({ equipActorIds: { hermes: [4] } });
    giveEverything(g);
    const party = g.ProjectRPartyCombat;
    party.registerAlly(fighter(4));
    assert.equal(party.availableRingSkills(4).length, 0, "指輪なし");
    g.ProjectRMenuCore.rings.transferToActor("hermes", 4);
    assert.deepEqual(plain(party.availableRingSkills(4).map(s => s.id)), ["hermes_strike", "hermes_mend"]);
    g.ProjectRMenuCore.rings.returnToPlayer("hermes");
    assert.equal(party.availableRingSkills(4).length, 0, "主人公へ戻せばAIスキルも失う");
});

test("Party AI: 範囲内なら通常攻撃、範囲外なら接近、敵がいなければ主人公へ追従。Cooldownは成功した実行だけで開始", () => {
    const g = createGame();
    const party = g.ProjectRPartyCombat;
    party.registerAlly(fighter(4));
    party.startSession([4]);
    const world = (ex, ey) => ({ player: { x: 0, y: 0 }, enemies: [{ id: 1, x: ex, y: ey, hp: 50, alive: true }] });
    let intents = party.tick(0.016, world(1, 0));
    assert.equal(intents[0].type, "attack"); assert.equal(intents[0].targetId, 1);
    // executor未設定でも成功扱いでCooldownが入る: 直後は通常攻撃できず、距離調整(move)になる
    assert.notEqual(party.tick(0.016, world(1, 0))[0]?.type, "attack");
    assert.equal(party.tick(2, world(1, 0))[0].type, "attack", "Cooldown経過後");
    // 範囲外 → 接近
    party.endSession(); party.registerAlly(fighter(4)); party.startSession([4]);
    intents = party.tick(0.016, world(6, 0));
    assert.equal(intents[0].type, "move"); assert.equal(intents[0].approach, true);
    // 敵がいない → 主人公へ追従
    party.endSession(); party.startSession([4]);
    assert.equal(party.tick(0.016, { player: { x: 8, y: 0 }, enemies: [], positions: { 4: { x: 0, y: 0 } } })[0].follow, true);
    party.setPosition(4, 7.5, 0);
    assert.equal(party.tick(0.016, { player: { x: 8, y: 0 }, enemies: [] }).length, 0, "近くにいれば追従しない");
    // 失敗するexecutorではCooldownが始まらない
    party.endSession(); party.startSession([4]);
    let calls = 0;
    party.setExecutor(() => (++calls, { ok: false }));
    party.tick(0.016, world(1, 0)); party.tick(0.016, world(1, 0));
    assert.equal(calls, 2, "失敗は次フレームも再試行");
    party.setExecutor(null);
});

test("Party AI: 指輪スキル優先・味方支援は最も傷ついた味方へ・ダウンした仲間は何もしない・ターゲット傾向", () => {
    const g = createGame({ equipActorIds: { hermes: [4] } });
    giveEverything(g);
    const party = g.ProjectRPartyCombat;
    party.registerAlly(fighter(4, { targetPreference: "lowestHp" }));
    party.registerAlly(fighter(6));
    g.ProjectRMenuCore.rings.transferToActor("hermes", 4);
    party.startSession([4, 6]);
    party.damageAlly(6, 60);
    const world = { player: { x: 0, y: 0 }, enemies: [{ id: 1, x: 1, y: 0, hp: 90 }, { id: 2, x: 2, y: 0, hp: 10 }] };
    const first = party.tick(0.016, world);
    const a4 = first.find(i => i.actorId === 4);
    assert.equal(a4.type, "ringSkill"); assert.equal(a4.skillId, "hermes_mend", "支援スキルが先");
    assert.equal(a4.targetActorId, 6, "最も傷ついた味方");
    const second = party.tick(0.016, world);
    const strike = second.find(i => i.actorId === 4);
    assert.equal(strike.skillId, "hermes_strike"); assert.equal(strike.targetId, 2, "lowestHpの傾向");
    party.damageAlly(6, 999);
    assert.ok(!party.tick(0.016, world).some(i => i.actorId === 6), "ダウンは行動しない");
});

test("Party: 戦闘用の仲間状態は保存しない・カード戦闘の終了/マップ移動/ロードで破棄・ダウン通知", () => {
    const g = battleReady();
    const party = g.ProjectRPartyCombat;
    party.registerAlly(fighter(4));
    let downed = [];
    const off = party.onAllyDown(e => downed.push(e.actorId));
    party.startSession([4]);
    party.damageAlly(4, 1000);
    assert.deepEqual(plain(downed), [4]);
    off();
    g.ProjectRCardDeck.startCardBattle();
    g.ProjectRCardDeck.endCardBattle();
    assert.equal(party.isActive(), false, "endCardBattleで破棄");
    party.startSession([4]);
    new g.Game_Map().setup();
    assert.equal(party.isActive(), false, "マップ移動で破棄");
    party.startSession([4]);
    g.DataManager.extractSaveContents({ system: g.$gameSystem });
    assert.equal(party.isActive(), false, "ロードで破棄");
    assert.ok(!JSON.stringify(g.$gameSystem).includes("cooldowns"), "$gameSystemに仲間の戦闘状態が入らない");
});

// ---------------- 戦闘ライフサイクル ----------------
test("戦闘ライフサイクル: begin で カード戦闘・戦闘イベント・仲間が始まり、end で全て片付く", () => {
    const g = battleReady();
    g.ProjectRPartyCombat.registerAlly(fighter(4));
    const session = g.ProjectRCombatSession;
    assert.equal(session.isActive(), false);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), false);
    const result = session.begin("arena", { allies: [4] });
    assert.equal(result.ok, true); assert.equal(result.cardBattle, true);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), true);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), true, "HUDは戦闘イベントだけで決まる");
    assert.equal(g.ProjectRPartyCombat.isActive(), true);
    assert.equal(g.ProjectRCardDeck.getBattleState().hand.length, 5, "初期手札5枚");
    assert.equal(session.begin("arena").reason, "alreadyActive");
    assert.equal(session.end("arena"), true);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), false);
    assert.equal(g.ProjectRPartyCombat.isActive(), false);
    assert.equal(session.end("arena"), false, "二重終了は何もしない");
    assert.equal(g.ProjectRCardDeck.getBattleState(), null, "戦闘用の山札は残らない");
});

test("戦闘ライフサイクル: 敵が近い・カード戦闘だけ では HUD用の戦闘イベントは始まらない", () => {
    const g = battleReady();
    g.ProjectRCardDeck.startCardBattle();
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), false);
    assert.equal(g.ProjectRCombatSession.isActive(), false);
    // ロック(メニュー)はカード戦闘も見る
    assert.equal(g.ProjectRMenuCore.combatLock().reason, "cardBattle");
});

test("戦闘ライフサイクル: 複数の戦闘ID。最後が終わるまでカード戦闘を保つ。他経路のカード戦闘は終えない", () => {
    const g = battleReady();
    const session = g.ProjectRCombatSession;
    session.begin("a"); session.begin("b");
    assert.equal(session.end("a"), true);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), true, "bが残っている");
    session.end("b");
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    // 外部がカード戦闘を持っているとき、sessionは終えない
    g.ProjectRCardDeck.startCardBattle();
    session.begin("c");
    session.end("c");
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), true);
});

test("戦闘ライフサイクル: デッキ不正のとき、requireValidDeckは拒否(デッキ不変)。通常戦闘はカード無しで開始できる", () => {
    const g = createGame();
    giveEverything(g);
    g.ProjectRCardDeck.setDeck(["hermes_swift_movement"]);
    const session = g.ProjectRCombatSession;
    const refused = session.begin("boss", { requireValidDeck: true });
    assert.equal(refused.ok, false); assert.equal(refused.reason, "invalidDeck");
    assert.ok(refused.messages.some(m => /30枚必要/.test(m)));
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), false);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    deepEqual(g.ProjectRCardDeck.getDeck(), ["hermes_swift_movement"]);
    const normal = session.begin("normal");
    assert.equal(normal.ok, true); assert.equal(normal.cardBattle, false);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), true);
});

test("戦闘ライフサイクル: 仲間の開始失敗では何も始まらない。マップ移動・ロード・ニューゲームで全て終わる", () => {
    const g = battleReady();
    const session = g.ProjectRCombatSession;
    const bad = session.begin("x", { allies: [99] });
    assert.equal(bad.ok, false); assert.equal(bad.reason, "allyNotDefined");
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), false);
    session.begin("y");
    new g.Game_Map().setup();
    assert.equal(session.isActive(), false); assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    session.begin("z");
    g.DataManager.extractSaveContents({ system: g.$gameSystem });
    assert.equal(session.isActive(), false, "ロードでsessionを持ち越さない");
    session.begin("w");
    g.DataManager.setupNewGame();
    assert.equal(session.isActive(), false);
});

test("戦闘ライフサイクル: 開始/終了フックと、イベント用プラグインコマンド(BeginCombat/EndCombat/結果スイッチ/理由メッセージ)", () => {
    const g = battleReady();
    const session = g.ProjectRCombatSession;
    const log = [];
    const off = session.onBegin(e => log.push("begin:" + e.sourceId));
    session.onEnd(e => log.push(`end:${e.sourceId}:${e.last}`));
    const run = (name, args, interp) => g.PluginManager._commands[`ProjectR_CombatSession:${name}`].call(interp, args);
    run("BeginCombat", { sourceId: "evt", requireValidDeck: "true", resultSwitchId: "5" });
    assert.equal(g.$gameSwitches.values[5], true);
    run("EndCombat", { sourceId: "evt" });
    deepEqual(log, ["begin:evt", "end:evt:true"]);
    off();
    // デッキが不正 → 開始せずプレイヤーへ理由を表示(メッセージ待ち)
    g.ProjectRCardDeck.setDeck(["hermes_swift_movement"]);
    const interp = { mode: null, setWaitMode(m) { this.mode = m; } };
    run("BeginCombat", { sourceId: "evt2", requireValidDeck: "true", resultSwitchId: "5" }, interp);
    assert.equal(g.$gameSwitches.values[5], false);
    assert.equal(interp.mode, "message");
    assert.match(g.$gameMessage.lines.join("\n"), /戦闘を始められません/);
    assert.match(g.$gameMessage.lines.join("\n"), /30枚必要/);
    assert.match(g.$gameMessage.lines.join("\n"), /メニューの「スキル」/);
    deepEqual(g.ProjectRCardDeck.getDeck(), ["hermes_swift_movement"], "デッキを自動で書き換えない");
});

// ---------------- ボス枠組み ----------------
const boss = (extra = {}) => ({
    bossId: "dev_boss", name: "DEVボス", maxHp: 1000,
    phases: [{ id: "p2", label: "第二形態", hpRatio: 0.66 }, { id: "p3", label: "第三形態", hpRatio: 0.33 }], ...extra
});

test("ボス: 定義の検証。フェーズはHP割合の降順で、フェーズ1は最初から有効(約3フェーズ)", () => {
    const g = createGame();
    const bf = g.ProjectRBossFramework;
    assert.equal(bf.registerBoss({ bossId: "", maxHp: 10 }).reason, "invalidBoss");
    assert.equal(bf.registerBoss({ bossId: "b", maxHp: 0 }).reason, "invalidBoss");
    assert.equal(bf.registerBoss(boss({ phases: [{ id: "p3", hpRatio: 0.33 }, { id: "bad", hpRatio: 1.5 }, { id: "p2", hpRatio: 0.66 }] })).ok, true);
    deepEqual(bf.bossDefinition("dev_boss").phases.map(p => p.id), ["p2", "p3"]);
    assert.equal(bf.start("nobody").reason, "bossNotDefined");
    assert.equal(bf.getHudState(), null, "戦闘外にはボスHUDなし");
});

test("ボス開始のデッキ検証: 不正なデッキなら開始を拒否し理由を返す。デッキは書き換えない。メニューのスキルで直せる", () => {
    const g = createGame();
    giveEverything(g);
    g.ProjectRBossFramework.registerBoss(boss());
    g.ProjectRCardDeck.setDeck(Array(30).fill("hermes_swift_movement")); // コピー上限超過
    const result = g.ProjectRBossFramework.start("dev_boss");
    assert.equal(result.ok, false); assert.equal(result.reason, "invalidDeck");
    assert.ok(result.messages.some(m => /コピー上限超過/.test(m)));
    assert.equal(g.ProjectRBossFramework.isActive(), false);
    assert.equal(g.ProjectRCombatSession.isActive(), false);
    assert.equal(g.ProjectRCardDeck.getDeck().length, 30);
    // 指輪を失った場合
    const g2 = battleReady();
    g2.ProjectRBossFramework.registerBoss(boss());
    g2.ProjectRCardDeck.setRingUnowned("hermes");
    const r2 = g2.ProjectRBossFramework.start("dev_boss");
    assert.equal(r2.reason, "invalidDeck");
    assert.ok(r2.messages.some(m => /必要な指輪を所持していない/.test(m)));
    // 製品の7種(最大19枚)では30枚を満たせない: 現状の製品データではボス開始は常に拒否(内容の不足であり不具合ではない)
    const g3 = createGame();
    giveEverything(g3);
    for (const card of productionCards) for (let i = 0; i < Number(card.maxCopies); i++) g3.ProjectRMenuCore.deck.add(card.cardId);
    assert.equal(g3.ProjectRBossFramework.validateEntry().ok, false);
    assert.ok(g3.ProjectRBossFramework.validateEntry().messages.some(m => /30枚必要（現在19枚）/.test(m)));
});

test("ボス: 有効なデッキなら開始。戦闘ライフサイクル・HUD用の状態・Gauge/神のカード戦闘が有効になる", () => {
    const g = battleReady();
    const bf = g.ProjectRBossFramework;
    bf.registerBoss(boss());
    const started = bf.start("dev_boss");
    assert.equal(started.ok, true);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), true);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), true);
    deepEqual(g.ProjectRCombatSession.sources(), ["boss:dev_boss"]);
    deepEqual(bf.getHudState(), { name: "DEVボス", hp: 1000, maxHp: 1000, ratio: 1, phaseLabel: "第一形態", phaseIndex: 0, phaseCount: 3 });
    assert.equal(bf.start("dev_boss").reason, "bossAlreadyActive");
});

test("ボス: フェーズ境界で onPhase が順に1回ずつ呼ばれる。大ダメージで複数の境界をまたいでも各フェーズを通知", () => {
    const g = battleReady();
    const bf = g.ProjectRBossFramework;
    bf.registerBoss(boss());
    bf.start("dev_boss");
    const phases = [];
    bf.onPhase(e => phases.push([e.from, e.to, e.phase.id]));
    bf.damage(100); bf.damage(100);
    deepEqual(phases, [], "66%超のうちは変化なし");
    bf.damage(250); // 550 = 55%
    deepEqual(phases, [[0, 1, "p2"]]);
    assert.equal(bf.getHudState().phaseLabel, "第二形態");
    bf.damage(1); assert.equal(phases.length, 1, "同じフェーズでは再通知しない");
    bf.damage(450); // 99 = 9.9%: p3
    deepEqual(phases, [[0, 1, "p2"], [1, 2, "p3"]]);
    assert.equal(bf.getHudState().phaseLabel, "第三形態");
    assert.equal(bf.damage(0).reason, "invalidDamage");
    // 一撃で2つの境界を越える場合
    const g2 = battleReady();
    g2.ProjectRBossFramework.registerBoss(boss());
    g2.ProjectRBossFramework.start("dev_boss");
    const seen = [];
    g2.ProjectRBossFramework.onPhase(e => seen.push(e.to));
    g2.ProjectRBossFramework.damage(800);
    deepEqual(seen, [1, 2]);
});

test("ボス: HP0で勝利。onVictory後に戦闘が片付く(HUD・カード戦闘・神・仲間・ボス状態)", () => {
    const g = battleReady();
    g.ProjectRPartyCombat.registerAlly(fighter(4));
    const bf = g.ProjectRBossFramework;
    bf.registerBoss(boss({ maxHp: 100 }));
    const events = [];
    bf.onVictory(e => events.push(e.bossId));
    bf.start("dev_boss", { allies: [4] });
    assert.equal(g.ProjectRPartyCombat.isActive(), true);
    bf.damage(9999);
    deepEqual(events, ["dev_boss"]);
    assert.equal(bf.isActive(), false); assert.equal(bf.getHudState(), null);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), false);
    assert.equal(g.ProjectRPartyCombat.isActive(), false);
});

test("ボス: 主人公HP0で敗北(onDefeat)→戦闘終了。retryで同じボスを再開し、onRetryフックでゲーム側の復帰処理を行える", () => {
    const g = battleReady();
    g.ProjectR = { ...g.ProjectR, PlayerDeath: { dead: false, isDead() { return this.dead; } } };
    const bf = g.ProjectRBossFramework;
    bf.registerBoss(boss());
    const log = [];
    bf.onDefeat(e => log.push("defeat:" + e.bossId));
    bf.onRetry(e => { log.push("retry:" + e.bossId); g.ProjectR.PlayerDeath.dead = false; });
    bf.start("dev_boss");
    bf.update();
    assert.equal(bf.isActive(), true);
    g.ProjectR.PlayerDeath.dead = true;
    new g.Game_Map().update(true);
    deepEqual(log, ["defeat:dev_boss"]);
    assert.equal(bf.isActive(), false);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    const again = bf.retry();
    assert.equal(again.ok, true);
    deepEqual(log, ["defeat:dev_boss", "retry:dev_boss"]);
    assert.equal(bf.getHudState().hp, 1000, "HPは満タンから再開");
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), true);
});

test("ボス: 仲間のダウンを onAllyDown に転送する。ダウンしても戦闘は続く", () => {
    const g = battleReady();
    g.ProjectRPartyCombat.registerAlly(fighter(4));
    const bf = g.ProjectRBossFramework;
    bf.registerBoss(boss());
    const downs = [];
    bf.onAllyDown(e => downs.push([e.bossId, e.actorId]));
    bf.start("dev_boss", { allies: [4] });
    g.ProjectRPartyCombat.damageAlly(4, 999);
    deepEqual(downs, [["dev_boss", 4]]);
    assert.equal(bf.isActive(), true);
});

test("ボス: マップ移動・ロードでボス状態を残さない。ボス戦の状態はセーブに入らない", () => {
    const g = battleReady();
    g.ProjectRBossFramework.registerBoss(boss());
    g.ProjectRBossFramework.start("dev_boss");
    assert.ok(!JSON.stringify(g.$gameSystem).includes("dev_boss"));
    new g.Game_Map().setup();
    assert.equal(g.ProjectRBossFramework.isActive(), false);
    assert.equal(g.ProjectRCombatSession.isActive(), false);
    g.ProjectRBossFramework.start("dev_boss");
    g.DataManager.extractSaveContents({ system: g.$gameSystem });
    assert.equal(g.ProjectRBossFramework.isActive(), false);
});

test("ボス: EventのHP(Hendrix)に結び付けるとEventの値で更新され、フェーズも動く", () => {
    const g = battleReady();
    const bf = g.ProjectRBossFramework;
    bf.registerBoss(boss({ eventId: 9 }));
    g.$gameMap = { hp: 1000, getCurrentEventHp() { return this.hp; }, event: () => ({ PRmhp: 1000 }) };
    bf.start("dev_boss");
    const phases = [];
    bf.onPhase(e => phases.push(e.to));
    g.$gameMap.hp = 600;
    new g.Game_Map().update(true);
    assert.equal(bf.getState().hp, 600); deepEqual(phases, [1]);
    g.$gameMap.hp = 0;
    new g.Game_Map().update(true);
    assert.equal(bf.isActive(), false, "EventのHP0で勝利");
});

test("ボスのプラグインコマンド: StartBossBattle(結果スイッチ・不正デッキの理由表示)/EndBossBattle", () => {
    const g = battleReady();
    const bf = g.ProjectRBossFramework;
    bf.registerBoss(boss());
    const run = (name, args, interp) => g.PluginManager._commands[`ProjectR_BossFramework:${name}`].call(interp, args);
    run("StartBossBattle", { bossId: "dev_boss", resultSwitchId: "7" });
    assert.equal(g.$gameSwitches.values[7], true); assert.equal(bf.isActive(), true);
    run("EndBossBattle", { bossId: "dev_boss" });
    assert.equal(bf.isActive(), false); assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    g.ProjectRCardDeck.setDeck([]);
    const interp = { setWaitMode(m) { this.m = m; } };
    run("StartBossBattle", { bossId: "dev_boss", resultSwitchId: "7" }, interp);
    assert.equal(g.$gameSwitches.values[7], false); assert.equal(interp.m, "message");
});

// ---------------- Divine HP ダメージ窓口 ----------------
test("ボス攻撃→Divine HP: 既存のBridgeへ一意の攻撃ID・area/globalで渡す。神を通常標的にしない", () => {
    const g = battleReady();
    const bf = g.ProjectRBossFramework;
    bf.registerBoss(boss());
    bf.start("dev_boss");
    const bridge = g.ProjectRUltimateGodDamageBridge;
    const area = bf.bossAttack({ kind: "area", x: 3, y: 4, radius: 2, divineDamage: 25 });
    assert.equal(area.ok, true); assert.match(area.attackId, /^boss-dev_boss-/);
    const global = bf.bossAttack({ kind: "global", divineDamage: 10, attackId: "my-attack" });
    assert.equal(global.attackId, "my-attack");
    deepEqual(bridge.calls.map(c => [c.kind, c.amount, c.source]), [["area", 25, "boss:dev_boss"], ["global", 10, "boss:dev_boss"]]);
    assert.notEqual(bridge.calls[0].attackId, bridge.calls[1].attackId);
    const src = read("js/plugins/ProjectR_BossFramework.js");
    assert.ok(!/spawnEvent|Game_Event|makeTarget|\.enemy/i.test(src.replace(/\/\*[\s\S]*?\*\//, "")), "神をEvent/標的にしない");
});

// ---------------- 追加HUD ----------------
test("追加HUD: ボス/仲間HUDは戦闘HUD(Manager)の子。ボスがいる間だけ表示、仲間はセッション中だけ表示、数値は読み取り専用", () => {
    const g = battleReady();
    class Sprite { constructor(...args) { this.initialize(...args); } initialize(bitmap) { this.children = []; this.bitmap = bitmap; this.visible = true; this.scale = { set() {} }; } addChild(c) { this.children.push(c); return c; } update() {} }
    class Bitmap { constructor(w, h) { this.width = w; this.height = h; this.drawn = []; } clear() {} drawText(t) { this.drawn.push(t); } }
    class Graphics { clear() {} lineStyle() {} beginFill() {} endFill() {} drawRoundedRect() {} }
    g.Sprite = Sprite; g.Bitmap = Bitmap; g.PIXI = { Graphics };
    g.Scene_Map.prototype.createProjectRBattleHUD = function() { if (!this._projectRBattleHudLayer) this._projectRBattleHudLayer = new Sprite(); };
    g.fixture.load("ProjectR_CombatExtrasHUD");
    const scene = new g.Scene_Map();
    scene.createProjectRBattleHUD();
    const layer = scene._projectRBattleHudLayer;
    assert.equal(layer.children.length, 2);
    scene.createProjectRBattleHUD();
    assert.equal(layer.children.length, 2, "二重追加しない");
    const [bossHud, partyHud] = layer.children;
    bossHud.update();
    assert.equal(bossHud.visible, false, "戦闘外/ボス無しでは非表示");
    g.ProjectRBossFramework.registerBoss(boss());
    g.ProjectRPartyCombat.registerAlly(fighter(4));
    g.ProjectRBossFramework.start("dev_boss", { allies: [4] });
    bossHud.update();
    assert.equal(bossHud.visible, true);
    assert.ok(bossHud._name.bitmap.drawn.join().includes("DEVボス"));
    g.ProjectRBossFramework.damage(500);
    bossHud.update();
    assert.ok(bossHud._phase.bitmap.drawn.join().includes("第二形態"));
    partyHud.update();
    assert.equal(partyHud._rows[0].visible, true); assert.equal(partyHud._rows[1].visible, false);
    g.ProjectRPartyCombat.damageAlly(4, 1000);
    partyHud.update();
    assert.ok(partyHud._rows[0]._text.bitmap.drawn.join().includes("DOWN"));
    g.ProjectRBossFramework.end();
    bossHud.update(); partyHud.update();
    assert.equal(bossHud.visible, false); assert.equal(partyHud._rows[0].visible, false);
});

console.log(`\n${passed} tests passed`);
