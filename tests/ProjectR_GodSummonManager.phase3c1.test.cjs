"use strict";
// Phase 3C-1: 常駐Ultimate神（論理アンカー）。Golden Arrow/Swordsmanshipの実Action Engine fixtureを再利用する。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
function fixtureLoader(file) {
    const text = read(file), f = { require, __dirname, console };
    vm.runInNewContext(text.slice(0, text.indexOf("\nlet passed = 0;")) + "\nthis.createGame = loadGame;", f);
    return f.createGame;
}
const loadGame = fixtureLoader("tests/ProjectR_HermesSwordsmanship.test.cjs");
const ARROW = "apollo_golden_arrow", SWORD = "hermes_sword_attack";
const mgr = g => g.ProjectRGodSummonManager;
const deck = g => g.ProjectRCardDeck;
const persistent = g => mgr(g).getPersistentUltimateSummon();
const transients = g => mgr(g).getActiveSummons();
const tickMap = (g, n = 1) => { for (let i = 0; i < n; i++) { g.Graphics.frameCount++; g.$gameMap.update(true); } };
const start = g => { const r = deck(g).startCardBattle(); assert.equal(r.ok, true); return r; };
function ownJanus(g) {
    assert.equal(deck(g).assignRingToPlayer("janus").ok, true);
    assert.equal(deck(g).setUltimateRing("janus").ok, true);
}
// 配置済みManagerを別offsetで再読込（Plugin Parameterを模擬）。
function reloadWithOffsets(g, x, y) {
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === "ProjectR_GodSummonManager"
        ? { PersistentOffsetX: String(x), PersistentOffsetY: String(y) } : params(name);
    vm.runInContext(read("js/plugins/ProjectR_GodSummonManager.js"), g);
}
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

test("Ultimate未選択なら常駐召喚なしで戦闘は通常開始", () => {
    const g = loadGame();
    start(g);
    assert.equal(mgr(g).hasPersistentUltimateSummon(), false);
    assert.equal(persistent(g), null); assert.equal(mgr(g).getPersistentUltimateGodId(), null);
    assert.equal(mgr(g).getPersistentUltimateRingId(), null);
    assert.equal(mgr(g).getPersistentUltimateResult().reason, "noUltimateSelected");
    assert.equal(deck(g).isCardBattleActive(), true);
});
test("Hermes/Apolloを選ぶと対応する神の常駐召喚が1体でき、player所有・論理アンカーのみ", () => {
    for (const god of ["hermes", "apollo"]) {
        const g = loadGame(); assert.equal(deck(g).setUltimateRing(god).ok, true);
        start(g);
        const info = persistent(g);
        assert.equal(mgr(g).hasPersistentUltimateSummon(), true);
        assert.deepEqual([info.godId, info.ringId, info.owner, info.kind, info.persistent], [god, god, "player", "persistentUltimate", true]);
        assert.equal(mgr(g).getPersistentUltimateGodId(), god); assert.equal(mgr(g).getPersistentUltimateRingId(), god);
        assert.equal(mgr(g).getPersistentUltimateResult().ok, true);
        assert.equal(transients(g).length, 0); // 一時召喚の一覧には混ざらない
    }
});
test("指輪定義のgodIdで解決（Janusのような未実装神も選択可能）", () => {
    const g = loadGame(); ownJanus(g); start(g);
    assert.equal(mgr(g).getPersistentUltimateGodId(), "janus");
    assert.equal(mgr(g).resolveGodId("janus"), "janus"); assert.equal(mgr(g).resolveGodId("zeus"), null);
});
test("主人公が所持していない選択（仲間所持/未所持）は常駐召喚なし、戦闘は開始、デッキ/所有データは不変", () => {
    for (const owner of ["actor:3", "unowned"]) {
        const g = loadGame(); ownJanus(g);
        g.$gameSystem._projectRCardDeckData.ringOwnershipState.janus = owner; // 保存データ側が後から変わった状態
        const persistentData = plain(deck(g).getPersistentData());
        start(g);
        // Coreは所持していない指輪のUltimate選択を読込時に無効扱いにする。
        assert.equal(mgr(g).hasPersistentUltimateSummon(), false, owner);
        assert.equal(deck(g).isCardBattleActive(), true);
        const after = plain(deck(g).getPersistentData());
        assert.deepEqual(after.deckDefinition, persistentData.deckDefinition, owner);
        assert.deepEqual(after.ringOwnershipState, persistentData.ringOwnershipState, owner);
        assert.deepEqual(after.cardOwnership, persistentData.cardOwnership, owner);
    }
    // Manager自身の所持確認（Coreが選択を返しても主人公が所持していなければ作らない）。
    for (const god of ["hermes", "apollo"]) {
        const g = loadGame(); assert.equal(deck(g).setUltimateRing(god).ok, true);
        const real = deck(g).hasPlayerRing;
        deck(g).hasPlayerRing = ringId => ringId === god ? false : real(ringId);
        const result = deck(g).startCardBattle();
        assert.equal(result.ok, true); assert.equal(mgr(g).hasPersistentUltimateSummon(), false);
        assert.equal(mgr(g).getPersistentUltimateResult().reason, "ultimateRingNotOwnedByPlayer");
        assert.equal(deck(g).getUltimateRingId(), god);
        assert.equal(deck(g).getBattleState().hand.length, 5);
        deck(g).hasPlayerRing = real;
    }
    const g = loadGame(); assert.equal(deck(g).setUltimateRing("apollo").ok, true);
    assert.equal(deck(g).setRingUnowned("apollo").ok, true); // 公式API経由では選択自体が解除される
    assert.equal(deck(g).getUltimateRingId(), null);
});
test("常駐召喚は戦闘開始時だけ作られ、通常探索/選択だけ/低水準startBattleでは作られない", () => {
    const g = loadGame();
    assert.equal(mgr(g).hasPersistentUltimateSummon(), false);
    deck(g).setUltimateRing("apollo");
    tickMap(g, 5); assert.equal(mgr(g).hasPersistentUltimateSummon(), false);
    assert.equal(mgr(g).ensurePersistentUltimateSummon().reason, "battleInactive");
    assert.equal(deck(g).startBattle().ok, true); // カード戦闘ではない低水準API
    assert.equal(mgr(g).hasPersistentUltimateSummon(), false);
    start(g); assert.equal(mgr(g).hasPersistentUltimateSummon(), true);
});
test("最大1体: 戦闘開始の連続・ensureの再実行で重複せず、有効な既存を再利用", () => {
    const g = loadGame(); deck(g).setUltimateRing("apollo");
    start(g); const first = persistent(g).summonId;
    const again = mgr(g).ensurePersistentUltimateSummon();
    assert.equal(again.ok, true); mgr(g).ensurePersistentUltimateSummon();
    assert.equal(persistent(g).summonId, first);
    start(g); // 再開始: 旧戦闘を片付けて作り直す。常に1体。
    assert.equal(mgr(g).hasPersistentUltimateSummon(), true);
    assert.notEqual(persistent(g).summonId, first);
    assert.equal(transients(g).length, 0);
});
test("戦闘開始時のsnapshotを使い、戦闘中の選択変更では切り替わらず次の戦闘から反映", () => {
    const g = loadGame(); deck(g).setUltimateRing("apollo"); start(g);
    deck(g).setUltimateRing("hermes");
    tickMap(g, 3); mgr(g).ensurePersistentUltimateSummon();
    assert.equal(mgr(g).getPersistentUltimateGodId(), "apollo");
    deck(g).setUltimateRing(null); tickMap(g); assert.equal(mgr(g).getPersistentUltimateGodId(), "apollo");
    deck(g).setUltimateRing("hermes"); start(g);
    assert.equal(mgr(g).getPersistentUltimateGodId(), "hermes");
});
test("一時召喚と別管理: カード発動で常駐は壊れず、同じ神の常駐+一時が共存", () => {
    const g = loadGame(); deck(g).setUltimateRing("apollo"); g.startWith(ARROW);
    const id = persistent(g).summonId;
    assert.equal(g.fire().reason, "success");
    const list = transients(g);
    assert.equal(list.length, 1); assert.equal(list[0].godId, "apollo"); assert.equal(list[0].kind, "transient");
    assert.notEqual(list[0].summonId, id);
    assert.equal(persistent(g).summonId, id); assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    tickMap(g, 12);
    assert.equal(transients(g).length, 0); assert.equal(persistent(g).summonId, id);
    assert.equal(mgr(g).release(id), false); // 一時召喚用releaseでは常駐を消せない
    assert.equal(mgr(g).hasPersistentUltimateSummon(), true);
});
test("カード連打中も常駐は維持され、Hermes剣術/Apollo矢の既存挙動は不変", () => {
    const g = loadGame(); deck(g).setUltimateRing("hermes"); g.startWith(SWORD);
    const id = persistent(g).summonId, enemy = g.addEnemy(101, 0, 0);
    g.aim(90);
    assert.equal(g.fire().ok, true);
    const swing = g.swing(); enemy.event.locate(swing._realX, swing._realY + 0.5); tickMap(g, 3);
    assert.equal(enemy.bar.currentHp, 120); // Skill 237
    for (let i = 0; i < 4; i++) {
        const hand = deck(g).getBattleState().hand, index = hand.findIndex(c => c.cardId === ARROW || c.cardId === SWORD);
        if (index >= 0) assert.equal(deck(g).requestUseCard(index).ok, true);
        else deck(g).useBattleCard(hand[0].instanceId);
    }
    assert.equal(persistent(g).summonId, id);
    tickMap(g, 100); assert.equal(transients(g).length, 0); assert.equal(persistent(g).summonId, id);
});
test("論理アンカーはPlayer現在位置＋offsetに追従（既定値）", () => {
    const g = loadGame(); deck(g).setUltimateRing("apollo"); start(g);
    assert.deepEqual(plain([persistent(g).x, persistent(g).y]), [10 - 0.75, 10 - 0.75]);
    g.$gamePlayer._realX = 25.5; g.$gamePlayer._realY = 3;
    tickMap(g);
    assert.deepEqual(plain([persistent(g).x, persistent(g).y]), [25.5 - 0.75, 3 - 0.75]);
    g.$gamePlayer._realX = 1; // 更新前でも照会時点のPlayer位置から導出
    assert.equal(persistent(g).x, 1 - 0.75);
});
test("設定したoffsetが適用され、位置は壁/経路に依存しない", () => {
    const g = loadGame(); reloadWithOffsets(g, 1.5, -2); deck(g).setUltimateRing("hermes"); start(g);
    const info = persistent(g);
    assert.deepEqual(plain([info.offsetX, info.offsetY, info.x, info.y]), [1.5, -2, 11.5, 8]);
    g.$gamePlayer._realX = 0; g.$gamePlayer._realY = 0; // マップ端でも位置はそのまま導出（衝突判定なし）
    tickMap(g); assert.deepEqual(plain([persistent(g).x, persistent(g).y]), [1.5, -2]);
});
test("HP/AI/標的/衝突/Eventを持たず、返却値は読み取り専用で内部を変えられない", () => {
    const g = loadGame(); deck(g).setUltimateRing("apollo");
    const events = g.$gameMap.events().length;
    start(g); tickMap(g, 30);
    const info = persistent(g);
    assert.equal(/hp|ai|target|attack|collision|hitbox|enemy|state|skill|gauge/i.test(Object.keys(info).join(",")), false);
    assert.equal(g.$gameMap.events().length, events); // Map Event/Hitboxを作らない=移動を妨げない
    assert.equal(Object.isFrozen(info), true);
    assert.throws(() => { info.godId = "hermes"; });
    assert.notEqual(persistent(g), persistent(g)); // 呼出しごとに別コピー
    assert.equal(mgr(g).getPersistentUltimateGodId(), "apollo");
    assert.equal(g.spawns.length, 0); assert.equal(g.commands.length, 0); // 自律攻撃/Command実行なし
});
test("endCardBattle/マップ移動/onMapLoaded/ロードで常駐召喚が消える。一時召喚も戦闘終了で消える", () => {
    for (const how of ["end", "setup", "mapLoaded", "load"]) {
        const g = loadGame(); deck(g).setUltimateRing("apollo"); g.startWith(ARROW); g.fire();
        assert.equal(mgr(g).hasPersistentUltimateSummon(), true); assert.equal(transients(g).length, 1);
        if (how === "end") deck(g).endCardBattle();
        else if (how === "setup") g.$gameMap.setup(2);
        else if (how === "mapLoaded") g.SceneManager._scene.onMapLoaded();
        else g.DataManager.extractSaveContents(g.DataManager.makeSaveContents());
        assert.equal(mgr(g).hasPersistentUltimateSummon(), false, how);
        assert.equal(persistent(g), null, how); assert.equal(transients(g).length, 0, how);
    }
});
test("セーブ: 常駐召喚は保存されず、Ultimate選択は保持。ロード後は新しい戦闘開始まで存在しない", () => {
    const g = loadGame(); deck(g).setUltimateRing("apollo");
    const before = JSON.stringify(deck(g).getPersistentData());
    start(g);
    assert.equal(JSON.stringify(deck(g).getPersistentData()), before);
    assert.equal(/summon|persistentUltimate/i.test(before), false);
    const contents = g.DataManager.makeSaveContents();
    assert.equal(Object.keys(contents).some(k => /summon/i.test(k)), false);
    assert.equal(Object.keys(g.$gameSystem).some(k => /summon/i.test(k)), false);
    assert.equal(g.DataManager.makeSaveContents, g.saveBeforePlugin[0]);
    g.DataManager.extractSaveContents(JSON.parse(JSON.stringify({ system: contents.system, map: contents.map })));
    assert.equal(deck(g).getUltimateRingId(), "apollo");
    assert.equal(mgr(g).hasPersistentUltimateSummon(), false);
    start(g); assert.equal(mgr(g).getPersistentUltimateGodId(), "apollo");
});
test("常駐の生成失敗でも戦闘は開始、手札/選択は不変で、一時召喚のカード効果は動く", () => {
    const base = loadGame(); const baseState = (start(base), plain(deck(base).getBattleState()).hand.length);
    const g = loadGame(); deck(g).setUltimateRing("apollo");
    g.$gamePlayer._realX = NaN;
    const result = deck(g).startCardBattle();
    assert.equal(result.ok, true); assert.equal(deck(g).isCardBattleActive(), true);
    assert.equal(mgr(g).hasPersistentUltimateSummon(), false);
    assert.equal(mgr(g).getPersistentUltimateResult().reason, "playerUnavailable");
    assert.equal(deck(g).getBattleState().hand.length, baseState);
    assert.equal(deck(g).getUltimateRingId(), "apollo");
    g.$gamePlayer._realX = 10;
    while (deck(g).getBattleState().hand[0].cardId !== ARROW) deck(g).useBattleCard(deck(g).getBattleState().hand[0].instanceId);
    assert.equal(g.fire().reason, "success"); assert.equal(transients(g).length, 1);
});
test("他の5枚もUltimate選択中に従来どおり一時召喚経由で動作", () => {
    const loaders = { obscure: fixtureLoader("tests/ProjectR_HermesRecognitionObscure.test.cjs"),
        lyre: fixtureLoader("tests/ProjectR_ApolloLyreCalm.test.cjs") };
    for (const [key, ultimate] of [["obscure", "apollo"], ["lyre", "hermes"]]) {
        const g = loaders[key](); deck(g).setUltimateRing(ultimate); g.start();
        assert.equal(mgr(g).getPersistentUltimateGodId(), ultimate, key);
        g.arrange(); assert.equal(deck(g).requestUseCard(0).ok, true, key);
        assert.equal(key === "obscure" ? g.obscured() : g.calm(), true, key);
        assert.equal(transients(g).length, 1, key); assert.equal(mgr(g).getPersistentUltimateGodId(), ultimate, key);
        assert.equal(transients(g)[0].godId, key === "obscure" ? "hermes" : "apollo", key);
    }
});
console.log(`# ${passed} Phase 3C-1 tests passed`);
