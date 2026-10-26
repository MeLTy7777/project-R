"use strict";
// 全仕様パス: メニュー(アイテム/スキル=デッキ構築/アルティメット/指輪)・デッキ検証・Ultimate選択・指輪譲渡・戦闘中ロック・保存。
// 実Plugin(CardDeckCore / MenuCore / MenuUI / DeckBuilder / UltimateSelect / RingParty / Inventory / MenuIntegration)を読み込む。
// MZのWindow/Sceneは最小stub。見た目・操作感はMZ実機の手動確認(docs/ProjectR_FullSpec_ManualVerification.md)。
const assert = require("node:assert/strict");
const { createGame, giveEverything, plain, read, plugins, productionCards } = require("./ProjectR_FullSpecFixture.cjs");

const deepEqual = (a, b, m) => assert.deepEqual(plain(a), plain(b), m);
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const ids = productionCards.map(c => c.cardId);

test("製品の定義: 7種のカードと5つの指輪。Janus/Themis/Athenaのカードは作られていない", () => {
    assert.equal(productionCards.length, 7);
    const g = createGame();
    const rings = g.ProjectRCardDeck.definitions.ringDefinitions().map(r => r.ringId);
    deepEqual(rings.sort(), ["apollo", "athena", "hermes", "janus", "themis"]);
    for (const god of ["janus", "themis", "athena"]) {
        assert.equal(productionCards.filter(c => c.ringId === god).length, 0, `${god}のカードは未定義(作らない)`);
    }
});

test("プラグイン登録: 新規11個が本番の順で登録され、ファイルと一致し、依存の順序が正しい", () => {
    const names = plugins.map(p => p.name);
    const order = ["ProjectR_CardDeckCore", "ProjectR_PartyCombat", "ProjectR_MenuCore", "ProjectR_MenuUI", "ProjectR_DeckBuilder",
        "ProjectR_UltimateSelect", "ProjectR_RingParty", "ProjectR_Inventory", "ProjectR_MenuIntegration", "ProjectR_CombatSession",
        "ProjectR_BossFramework", "ProjectR_CombatExtrasHUD"];
    const at = order.map(n => names.indexOf(n));
    assert.ok(at.every(i => i >= 0), "全て登録済み");
    deepEqual([...at].sort((a, b) => a - b), at, "依存の順");
    assert.ok(names.indexOf("ProjectR_MenuHUD") < names.indexOf("ProjectR_MenuIntegration"));
    assert.ok(names.indexOf("ProjectR_BattleHUD") < names.indexOf("ProjectR_CombatExtrasHUD"));
    assert.ok(names.indexOf("ProjectR_UltimateGodDamageBridge") < names.indexOf("ProjectR_BossFramework"));
    for (const name of order.slice(1)) {
        const entry = plugins.find(p => p.name === name);
        assert.equal(entry.status, true);
        assert.ok(read(`js/plugins/${name}.js`).includes("@plugindesc"), name);
    }
});

// ---------------- メニュー接続 ----------------
test("メニュー: SKILL=デッキ構築 / ULTIMATE=神の選択 / ITEM=所持品 が MenuHUD.commandScenes に接続される", () => {
    const g = createGame();
    const scenes = g.ProjectR.MenuHUD.commandScenes;
    assert.equal(scenes.skill, g.Scene_ProjectRDeckBuilder);
    assert.equal(scenes.ultimate, g.Scene_ProjectRUltimateSelect);
    assert.equal(scenes.item, g.Scene_ProjectRInventory);
    // SKILLは標準Scene_Skillではない
    assert.notEqual(scenes.skill.name, "Scene_Skill");
});

test("MenuHUD本体: 3コマンドを commandScenes から開く・既存のSAVE/LOAD/SYSTEM/TITLEは従来どおり", () => {
    const hud = read("js/plugins/ProjectR_MenuHUD.js");
    assert.match(hud, /MenuHUD\.commandScenes\[command\]/);
    for (const scene of ["Scene_Save", "Scene_Load", "Scene_Options", "Scene_GameEnd"]) assert.match(hud, new RegExp(`nextScene = ${scene}`));
    assert.match(hud, /menuReturnState = \{ index: this\._index, command \}/);
});

test("戦闘中ロック: 明示的な戦闘イベント中はメニューを開けない。戦闘外は開ける", () => {
    const g = createGame();
    const map = new g.Scene_Map();
    assert.equal(map.isMenuEnabled(), true);
    g.ProjectRCombatPresence.beginCombatEvent("test");
    assert.equal(map.isMenuEnabled(), false);
    assert.equal(g.ProjectRMenuIntegration.openDeckBuilder(), false);
    assert.equal(g.SceneManager._pushed.length, 0);
    g.ProjectRCombatPresence.endCombatEvent("test");
    assert.equal(map.isMenuEnabled(), true);
    assert.equal(g.ProjectRMenuIntegration.openDeckBuilder(), true);
    assert.equal(g.SceneManager._pushed[0], g.Scene_ProjectRDeckBuilder);
});

test("戦闘中ロック: カード戦闘中もロック。モデルがデッキ/Ultimate/指輪の変更を拒否する", () => {
    const g = createGame({ equipActorIds: { hermes: [4] } });
    giveEverything(g);
    g.ProjectRCardDeck.startCardBattle = g.ProjectRCardDeck.startCardBattle; // 実関数
    g.ProjectRCombatPresence.beginCombatEvent("fight");
    const core = g.ProjectRMenuCore;
    assert.equal(core.combatLock().reason, "combatEvent");
    for (const result of [core.deck.add(ids[0]), core.deck.remove(ids[0]), core.deck.clear(), core.ultimate.select("hermes"),
        core.rings.transferToActor("hermes", 4), core.rings.returnToPlayer("hermes")]) {
        assert.equal(result.ok, false); assert.equal(result.reason, "inCombat");
    }
    deepEqual(g.ProjectRCardDeck.getDeck(), [], "デッキは変わらない");
    assert.equal(g.ProjectRCardDeck.getRingOwner("hermes"), "player");
    assert.equal(g.ProjectRCardDeck.getUltimateRingId(), null);
});

// ---------------- デッキ構築 ----------------
test("デッキモデル: 所持カードだけが一覧に出る。製品の7枚は自動で並ぶ(UIにカード名の直書きなし)", () => {
    const g = createGame();
    const core = g.ProjectRMenuCore;
    assert.equal(core.deck.collection().length, 0, "未所持は表示しない");
    giveEverything(g, { rings: ["hermes", "apollo"] });
    assert.equal(core.deck.collection().length, 7);
    g.ProjectRCardDeck.setCardOwned("apollo_lyre_calm", false);
    assert.equal(core.deck.collection().length, 6);
    const src = read("js/plugins/ProjectR_DeckBuilder.js") + read("js/plugins/ProjectR_MenuUI.js");
    for (const id of ids) assert.ok(!src.includes(id), `${id}をUIに直書きしない`);
});

test("デッキ検証はCoreのまま: 30枚必要・所持・コピー上限・指輪を日本語で表示。自動修復しない", () => {
    const g = createGame();
    const core = g.ProjectRMenuCore, deck = g.ProjectRCardDeck;
    giveEverything(g);
    assert.equal(core.deck.status().header, "DECK 0 / 30");
    assert.match(core.deck.status().messages[0], /30枚必要/);
    assert.equal(core.deck.add("hermes_swift_movement").ok, true);
    assert.equal(core.deck.status().header, "DECK 1 / 30");
    // コピー上限(3): 4枚目は追加できない(Coreの検証結果: MAX_COPIES_EXCEEDED)
    core.deck.add("hermes_swift_movement"); core.deck.add("hermes_swift_movement");
    const fourth = core.deck.add("hermes_swift_movement");
    assert.equal(fourth.ok, false); assert.equal(fourth.reason, "MAX_COPIES_EXCEEDED");
    assert.match(fourth.message, /コピー上限超過/);
    // 強力(2): 葦笛は3枚目を拒否
    core.deck.add("hermes_reed_flute_sleep"); core.deck.add("hermes_reed_flute_sleep");
    assert.equal(core.deck.add("hermes_reed_flute_sleep").reason, "MAX_COPIES_EXCEEDED");
    // 未所持カード
    deck.setCardOwned("apollo_golden_arrow", false);
    const notOwned = core.deck.add("apollo_golden_arrow");
    assert.equal(notOwned.ok, false); assert.equal(notOwned.reason, "CARD_NOT_OWNED");
    assert.match(notOwned.message, /所持していないカード/);
    // 不明なカード
    assert.equal(core.deck.add("no_such_card").reason, "INVALID_CARD_ID");
    // 自動修復しない: 保存済みデッキは触られていない
    assert.equal(deck.getDeck().length, 5);
});

test("デッキは30枚まで。30枚で有効判定になるのはCoreの検証を満たすときだけ(製品7種は最大19枚)", () => {
    const g = createGame();
    const core = g.ProjectRMenuCore;
    giveEverything(g);
    // 製品カードの上限合計は19枚: 全上限まで入れても30枚には届かず「30枚必要」のまま
    for (const card of productionCards) for (let i = 0; i < Number(card.maxCopies); i++) core.deck.add(card.cardId);
    assert.equal(g.ProjectRCardDeck.getDeck().length, productionCards.reduce((n, c) => n + Number(c.maxCopies), 0));
    assert.equal(core.deck.status().count, 19);
    assert.equal(core.deck.status().valid, false);
    assert.match(core.deck.status().messages.join(" "), /30枚必要（現在19枚）/);
    // 31枚目は拒否(DECK_FULL)。Coreのdeck配列を30枚にして確認
    g.ProjectRCardDeck.setDeck(Array(30).fill("hermes_swift_movement"));
    assert.equal(core.deck.add("hermes_sword_attack").reason, "DECK_FULL");
    assert.equal(core.deck.status().header, "DECK 30 / 30");
});

test("指輪がない: カードは『必要な指輪を所持していない』で無効表示。保存済みデッキは消えない・追加もできない", () => {
    const g = createGame();
    const core = g.ProjectRMenuCore, deck = g.ProjectRCardDeck;
    giveEverything(g);
    for (let i = 0; i < 3; i++) core.deck.add("hermes_swift_movement");
    core.deck.add("apollo_golden_arrow");
    deck.setRingUnowned("hermes");
    const entry = core.deck.collection().find(e => e.cardId === "hermes_swift_movement");
    assert.equal(entry.usable, false); assert.equal(entry.ringOwned, false);
    assert.match(core.describeReasons(entry.invalidReasons).join(), /必要な指輪を所持していない/);
    assert.equal(core.deck.add("hermes_swift_movement").reason, "REQUIRED_RING_NOT_OWNED");
    deepEqual(deck.getDeck().sort(), ["apollo_golden_arrow", "hermes_swift_movement", "hermes_swift_movement", "hermes_swift_movement"], "デッキ定義は残る");
    assert.equal(core.deck.status().valid, false);
    assert.ok(core.deck.status().messages.some(m => /必要な指輪を所持していない/.test(m)));
    // フィルタ: 指輪なし / 使用可
    deepEqual(core.deck.collection({ status: "invalid" }).map(e => e.godId), Array(4).fill("hermes"));
    assert.ok(core.deck.collection({ status: "available" }).every(e => e.godId === "apollo"));
    // 指輪を戻せば再び有効
    deck.assignRingToPlayer("hermes");
    assert.equal(core.deck.collection().find(e => e.cardId === "hermes_swift_movement").usable, true);
});

test("フィルタ/並び替え: 神別・使用可・名前・Level・Cooldown。Janus/Themis/Athenaは空の一覧(カードを作らない)", () => {
    const g = createGame();
    const core = g.ProjectRMenuCore;
    giveEverything(g);
    g.ProjectRCardDeck.setCardLevel("apollo_golden_arrow", 3);
    assert.equal(core.deck.collection({ god: "hermes" }).length, 4);
    assert.equal(core.deck.collection({ god: "apollo" }).length, 3);
    for (const god of ["janus", "themis", "athena"]) assert.equal(core.deck.collection({ god }).length, 0);
    assert.equal(core.deck.collection({ sort: "level" })[0].cardId, "apollo_golden_arrow");
    const cds = core.deck.collection({ sort: "cooldown" }).map(e => e.info.cooldownSeconds);
    deepEqual(cds, [...cds].sort((a, b) => a - b));
});

test("カード詳細: 名前・アイコン・神/指輪・分類・Level/最大Level・Cooldown・対象・コピー数/上限・説明(実データ)", () => {
    const g = createGame();
    const core = g.ProjectRMenuCore;
    giveEverything(g);
    g.ProjectRCardDeck.setCardLevel("hermes_reed_flute_sleep", 2);
    const entry = core.deck.collection().find(e => e.cardId === "hermes_reed_flute_sleep");
    assert.equal(entry.level, 2); assert.equal(entry.maxLevel, 3);
    assert.equal(entry.info.cooldownSeconds, 12); assert.equal(entry.info.maxCopies, 2);
    assert.equal(entry.info.godName, "ヘルメース"); assert.equal(entry.info.ringName, "ヘルメースの指輪");
    assert.equal(entry.info.targetType, "ground"); assert.equal(entry.info.categoryLabel, "睡眠");
    assert.match(entry.info.description, /眠らせる/);
    assert.equal(core.cardInfo("apollo_lyre_calm").targetLabel, "味方");
    // 未知のカードでも例外なし(将来のCardDefinitionはデータ追加だけで一覧に出る)
    assert.equal(core.cardInfo("future_card").defined, false);
});

test("説明文の上書き: 将来のカードはsetCardTextだけで説明を足せる。カードLevel上限はCoreが丸める", () => {
    const g = createGame();
    const core = g.ProjectRMenuCore;
    assert.equal(core.setCardText("hermes_sword_attack", { description: "上書き" }), true);
    assert.equal(core.cardInfo("hermes_sword_attack").description, "上書き");
    g.ProjectRCardDeck.setCardOwned("hermes_sword_attack");
    g.ProjectRCardDeck.setCardLevel("hermes_sword_attack", 9);
    giveEverything(g, { rings: ["hermes"], cards: ["hermes_sword_attack"] });
    assert.equal(core.deck.collection()[0].level, 3, "Lv3が上限(CardDefinition.maxLevel)");
});

test("デッキ構築Scene: 画面を作り、DECK表示・一覧・デッキ・詳細を描画し、決定で追加/戻すが動く", () => {
    const g = createGame();
    giveEverything(g);
    const scene = new g.Scene_ProjectRDeckBuilder();
    scene.create();
    assert.match(scene._header.text(), /DECK 0 \/ 30/);
    assert.equal(scene._collection.maxItems(), 7);
    scene._tabs.select(0);
    // 一覧で決定 → 追加
    scene._collection.activate(); scene._collection.select(0);
    scene._collection.ok();
    assert.equal(g.ProjectRCardDeck.getDeck().length, 1);
    assert.match(scene._header.text(), /DECK 1 \/ 30/);
    assert.equal(scene._deckList.maxItems(), 1);
    // デッキ側で決定 → 戻す
    scene._collection.deactivate(); scene._deckList.activate(); scene._deckList.select(0);
    scene._deckList.ok();
    assert.equal(g.ProjectRCardDeck.getDeck().length, 0);
    // Shiftで戻す(一覧から)。デッキに無いときは拒否理由を表示
    scene._deckList.deactivate(); scene._collection.activate();
    g.press("shift"); scene.update(); g.releaseKeys();
    assert.match(scene._header.text(), /デッキに入っていません/);
    // 拒否の理由が見える(コピー上限)
    for (let i = 0; i < 4; i++) scene._collection.ok();
    assert.match(scene._header.text(), /コピー上限超過/);
    assert.ok(g.sounds.includes("playBuzzer"));
    // 詳細パネル
    assert.match(scene._detail.text(), /Level 1 \/ 最大3/);
    // 並び替えタブで循環
    scene._tabs.select(scene._tabs.maxItems() - 1);
    scene._tabs.activate();
    scene._tabs.ok();
    assert.match(scene._tabs.text ? scene._tabs.text() : "", /並び:名前/);
});

test("デッキ構築Scene: 所持ゼロでも例外なし(『カードがありません』)。戦闘中は変更できない", () => {
    const g = createGame();
    const scene = new g.Scene_ProjectRDeckBuilder();
    scene.create();
    assert.match(scene._detail.text(), /カードがありません/);
    giveEverything(g);
    const s2 = new g.Scene_ProjectRDeckBuilder();
    s2.create();
    g.ProjectRCombatPresence.beginCombatEvent("x");
    s2._collection.activate(); s2._collection.select(0); s2._collection.ok();
    assert.equal(g.ProjectRCardDeck.getDeck().length, 0);
    assert.match(s2._header.text(), /戦闘中は変更できません/);
});

test("デッキは保存される: セーブ=デッキ定義/所持/Level。戦闘用の手札・山札・捨て札・Cooldownは保存しない", () => {
    const g = createGame();
    giveEverything(g);
    g.ProjectRMenuCore.deck.add("hermes_sword_attack");
    const saved = plain(g.ProjectRCardDeck.getPersistentData());
    deepEqual(Object.keys(saved).sort(), ["cardOwnership", "deckDefinition", "ringOwnershipState", "ultimateSelection", "version"]);
    const text = JSON.stringify(saved);
    for (const runtime of ["hand", "drawPile", "discardPile", "cooldownPile", "gauge", "divine"]) assert.ok(!text.includes(runtime), runtime);
    deepEqual(saved.deckDefinition.cardIds, ["hermes_sword_attack"]);
    // 旧セーブ(deckが無い/未知フィールド)を読んでも壊れない
    const migrated = g.ProjectRCardDeck.normalizePersistentData({ deck: ["hermes_sword_attack"], extra: 1 }, g.ProjectRCardDeck.definitions);
    deepEqual(migrated.deckDefinition.cardIds, ["hermes_sword_attack"]);
});

test("ボス開始のデッキ検証はCore。メニュー側に検証ロジックの複製がない", () => {
    for (const file of ["ProjectR_MenuCore", "ProjectR_DeckBuilder", "ProjectR_UltimateSelect", "ProjectR_RingParty", "ProjectR_Inventory", "ProjectR_BossFramework", "ProjectR_CombatSession"]) {
        const src = read(`js/plugins/${file}.js`);
        assert.ok(!/maxCopies\s*[<>]=?\s*\d/.test(src), `${file}: コピー上限の数値比較を持たない`);
        assert.ok(!/=== ?30\b/.test(src) && !/>= ?30\b/.test(src) || file === "ProjectR_MenuCore", `${file}: 30枚判定を持たない`);
    }
    const core = read("js/plugins/ProjectR_MenuCore.js");
    assert.match(core, /getDeckInvalidReasons/); assert.match(core, /getCardInvalidReasons/);
});

// ---------------- Ultimate選択 ----------------
test("Ultimate選択: 主人公が所持かつ実装済みの神だけ選べる。Janus/Themis/Athenaは『未実装』で選択不可", () => {
    const g = createGame();
    const core = g.ProjectRMenuCore;
    giveEverything(g, { rings: ["hermes", "janus"] });
    const entries = core.ultimate.entries();
    const by = id => entries.find(e => e.ringId === id);
    assert.equal(by("hermes").selectable, true);
    assert.equal(by("apollo").selectable, false); assert.match(by("apollo").messages.join(), /所持していない/);
    assert.equal(by("janus").implemented, false); assert.equal(by("janus").selectable, false);
    assert.match(by("janus").messages.join(), /未実装/);
    assert.equal(core.ultimate.select("janus").reason, "ULTIMATE_NOT_IMPLEMENTED");
    assert.equal(core.ultimate.select("apollo").reason, "ULTIMATE_RING_NOT_OWNED");
    assert.equal(g.ProjectRCardDeck.getUltimateRingId(), null);
    const ok = core.ultimate.select("hermes");
    assert.equal(ok.ok, true);
    assert.equal(g.ProjectRCardDeck.getUltimateRingId(), "hermes", "既存のUltimateSelection(Core)に保存");
    assert.equal(core.ultimate.entries().find(e => e.ringId === "hermes").selected, true);
    assert.equal(core.ultimate.selected().godName, "ヘルメース");
});

test("Ultimate選択: 保存先は1つだけ(新しい変数を作らない)。指輪が仲間に渡ると選択は外れる", () => {
    const g = createGame({ equipActorIds: { hermes: [4] } });
    giveEverything(g);
    g.ProjectRMenuCore.ultimate.select("hermes");
    const keys = Object.keys(g.$gameSystem).filter(k => /ultimate/i.test(k));
    deepEqual(keys, [], "Game_Systemに別のUltimate変数がない");
    assert.equal(g.ProjectRMenuCore.rings.transferToActor("hermes", 4).ok, true);
    assert.equal(g.ProjectRCardDeck.getUltimateRingId(), null, "ally所持の神は選択から外れる");
    const entry = g.ProjectRMenuCore.ultimate.entries().find(e => e.ringId === "hermes");
    assert.equal(entry.assignedToAllyId, 4); assert.equal(entry.selectable, false);
    assert.match(entry.messages.join(), /所持していない/);
});

test("Ultimate選択Scene: 一覧→決定で保存・未実装はブザー・現在の選択がヘッダーに出る", () => {
    const g = createGame();
    giveEverything(g, { rings: ["hermes", "apollo", "janus"] });
    const scene = new g.Scene_ProjectRUltimateSelect();
    scene.create();
    const items = scene._list.items();
    const index = id => items.findIndex(e => e.ringId === id);
    scene._list.select(index("janus")); scene._list.ok();
    assert.ok(g.sounds.includes("playBuzzer"));
    assert.match(scene._header.text(), /未実装/);
    scene._list.select(index("apollo")); scene._list.ok();
    assert.equal(g.ProjectRCardDeck.getUltimateRingId(), "apollo");
    assert.match(scene._header.text(), /現在の選択：アポロン/);
    assert.match(scene._detail.text(), /アポロン/);
});

test("Ultimate選択は戦闘中に変更できない。戦闘中の既存選択は変わらない", () => {
    const g = createGame();
    giveEverything(g);
    g.ProjectRMenuCore.ultimate.select("hermes");
    g.ProjectRCombatPresence.beginCombatEvent("fight");
    assert.equal(g.ProjectRMenuCore.ultimate.select("apollo").reason, "inCombat");
    assert.equal(g.ProjectRCardDeck.getUltimateRingId(), "hermes");
});

// ---------------- 指輪 / Party ----------------
test("指輪: 仲間は1人1つ・対象限定、移せるのは戦闘外のみ。主人公は無制限", () => {
    const g = createGame({ equipActorIds: { hermes: [4, 6], apollo: [4] } });
    giveEverything(g);
    const rings = g.ProjectRMenuCore.rings, deck = g.ProjectRCardDeck;
    assert.equal(rings.transferToActor("hermes", 7).reason, "ACTOR_NOT_ALLOWED", "対象外のActor");
    assert.equal(rings.transferToActor("hermes", 4).ok, true);
    assert.equal(deck.getRingOwner("hermes"), "actor:4");
    assert.equal(deck.hasPlayerRing("hermes"), false, "主人公は所持扱いでなくなる");
    assert.equal(rings.transferToActor("apollo", 4).reason, "ACTOR_RING_LIMIT", "1人1つまで");
    assert.match(g.ProjectRMenuCore.describeReason({ code: "ACTOR_RING_LIMIT" }), /1人1つ/);
    assert.equal(rings.transferToActor("apollo", 6).reason, "ACTOR_NOT_ALLOWED");
    // 戦闘中は不可
    g.ProjectRCombatPresence.beginCombatEvent("f");
    assert.equal(rings.returnToPlayer("hermes").reason, "inCombat");
    g.ProjectRCombatPresence.endCombatEvent("f");
    // 主人公へ戻す
    assert.equal(rings.returnToPlayer("hermes").ok, true);
    assert.equal(deck.getRingOwner("hermes"), "player");
    // 主人公は複数の指輪を持てる
    assert.equal(deck.hasPlayerRing("hermes") && deck.hasPlayerRing("apollo"), true);
});

test("指輪を仲間に渡す: 対応カードが無効になり、保存済みデッキは残り、戻すと再び有効。仲間→別の仲間は主人公経由", () => {
    const g = createGame({ equipActorIds: { hermes: [4, 6] } });
    giveEverything(g);
    const core = g.ProjectRMenuCore, deck = g.ProjectRCardDeck;
    for (let i = 0; i < 3; i++) core.deck.add("hermes_sword_attack");
    core.rings.transferToActor("hermes", 4);
    const e = core.deck.entries().find(x => x.cardId === "hermes_sword_attack");
    assert.equal(e.usable, false);
    assert.equal(deck.getDeck().length, 3, "デッキ定義は壊れない");
    // 仲間(4)→別の仲間(6): Coreは直接の付け替えを許す(指輪の持ち主は常に1人)
    assert.equal(core.rings.transferToActor("hermes", 6).ok, true);
    assert.equal(deck.getRingOwner("hermes"), "actor:6");
    core.rings.returnToPlayer("hermes");
    assert.equal(core.deck.entries().find(x => x.cardId === "hermes_sword_attack").usable, true);
    assert.equal(deck.getDeck().length, 3);
});

test("指輪Scene: 製品では仲間にできる指輪がなく『移せる相手がいません』。対象が設定されると仲間への譲渡・主人公へ戻すが動く", () => {
    const g0 = createGame();
    giveEverything(g0);
    const s0 = new g0.Scene_ProjectRRings();
    s0.create();
    assert.equal(s0._targets.maxItems(), 0, "製品データは仲間に渡せる指輪が未定義");
    s0._rings.select(0); s0._rings.ok();
    assert.match(s0._header.text(), /移せる相手がいません/);

    const g = createGame({ equipActorIds: { hermes: [4] } });
    giveEverything(g);
    const scene = new g.Scene_ProjectRRings();
    scene.create();
    const hermes = scene._rings.items().findIndex(e => e.ringId === "hermes");
    scene._rings.select(hermes);
    scene.refreshTargets();
    assert.equal(scene._targets.maxItems(), 1);
    scene._rings.ok();
    scene._targets.select(0); scene._targets.ok();
    assert.equal(g.ProjectRCardDeck.getRingOwner("hermes"), "actor:4");
    scene._rings.select(hermes);
    scene.refreshTargets();
    assert.equal(scene._targets.items()[0].kind, "player");
    scene._rings.ok(); scene._targets.select(0); scene._targets.ok();
    assert.equal(g.ProjectRCardDeck.getRingOwner("hermes"), "player");
});

test("指輪画面へのUltimate画面のTab近道が登録されている", () => {
    const g = createGame();
    giveEverything(g);
    const scene = new g.Scene_ProjectRUltimateSelect();
    scene.create();
    g.press("tab"); scene.update(); g.releaseKeys();
    assert.equal(g.SceneManager._pushed.at(-1), g.Scene_ProjectRRings);
});

// ---------------- アイテム ----------------
function party(g, { equipped = [] } = {}) {
    const sword = { id: 1, name: "ショートソード", iconIndex: 97, description: "【剣】", etypeId: 1, wtypeId: 2, params: [0, 0, 8, 0, 0, 0, 0, 0], itypeId: undefined };
    const vest = { id: 3, name: "レザーベスト", iconIndex: 130, description: "革", atypeId: 1, params: [0, 0, 0, 5, 0, 0, 0, 0] };
    const potion = { id: 7, name: "ポーション", iconIndex: 176, description: "HPを回復", itypeId: 1, scope: 7, count: 3 };
    const ammo = { id: 31, name: "弾薬", iconIndex: 160, description: "銃用の弾薬。", itypeId: 1, scope: 0, count: 12 };
    const key = { id: 40, name: "古い鍵", iconIndex: 200, description: "扉の鍵", itypeId: 2, count: 1 };
    const gun = { id: 51, name: "テストハンドガン", iconIndex: 104, description: "拳銃", etypeId: 1, wtypeId: 9, params: [0, 0, 7, 0, 0, 0, 0, 0], note: "<capacity: 7>\n<ammo item: 弾薬>" };
    g.$dataWeapons = [null, sword, gun];
    const leader = { name: () => "リード", equips: () => equipped, refresh() {} };
    g.$gameParty._members = [leader];
    g.$gameParty._items = [potion, ammo, key];
    g.$gameParty._weapons = [gun];
    g.$gameParty._armors = [];
    return { sword, vest, potion, ammo, key, gun, leader };
}

test("アイテム画面: アイテム/武器/防具/大事なもの/弾薬/指輪のカテゴリを持ち、所持品の正は$gameParty", () => {
    const g = createGame();
    const labels = g.ProjectRMenuCore.inventory.categories.map(c => c.label);
    deepEqual(labels, ["アイテム", "武器", "防具", "大事なもの", "弾薬", "指輪"]);
    const { potion, ammo, key, gun, sword } = party(g, { equipped: [] });
    const inv = g.ProjectRMenuCore.inventory;
    deepEqual(inv.entries("item").map(e => e.name), ["ポーション"], "弾薬は消耗品と分ける");
    deepEqual(inv.entries("ammo").map(e => e.name), ["弾薬"], "武器のnote <ammo item:> から判定");
    deepEqual(inv.entries("keyItem").map(e => e.name), ["古い鍵"]);
    deepEqual(inv.entries("weapon").map(e => e.name), ["テストハンドガン"]);
    assert.equal(inv.entries("item")[0].number, 3);
    assert.equal(inv.entries("item")[0].usable, true);
    assert.equal(inv.entries("keyItem")[0].usable, false, "大事なものは使えない");
    assert.equal(inv.entries("ammo")[0].usable, false);
    assert.ok(potion && ammo && key && gun && sword);
});

test("アイテム画面: 装備中の武器/防具を『装備中』として出し、ステータスを表示。別の所持DBは作らない", () => {
    const g = createGame();
    const p = party(g);
    p.leader.equips = () => [p.sword, p.vest];
    const inv = g.ProjectRMenuCore.inventory;
    const weapons = inv.entries("weapon");
    const sword = weapons.find(e => e.name === "ショートソード");
    assert.equal(sword.equipped, true); deepEqual(sword.equippedBy, ["リード"]);
    deepEqual(plain(sword.stats), [{ label: "攻撃力", value: 8 }]);
    assert.equal(weapons.find(e => e.name === "テストハンドガン").equipped, false);
    assert.equal(inv.entries("armor")[0].equipped, true);
    assert.equal(Object.keys(g.$gameSystem).some(k => /inventory/i.test(k)), false);
});

test("アイテム画面: 指輪カテゴリは所持中の指輪と持ち主(主人公/仲間)を表示", () => {
    const g = createGame({ equipActorIds: { apollo: [4] } });
    giveEverything(g);
    g.ProjectRMenuCore.rings.transferToActor("apollo", 4);
    const rings = g.ProjectRMenuCore.inventory.entries("ring");
    deepEqual(rings.map(r => r.name), ["ヘルメースの指輪", "アポロンの指輪"]);
    assert.equal(rings[1].equipped, true); deepEqual(rings[1].equippedBy, ["Actor4"]);
});

test("アイテム画面: 見ただけでは消費しない。『使う』を確認したときだけ1個消費する。戦闘中は使えない", () => {
    const g = createGame();
    party(g);
    let used = 0;
    g.Game_Action = class {
        constructor(actor) { this.actor = actor; }
        setItemObject(item) { this.item = item; }
        testApply() { return true; } numRepeats() { return 1; } apply() { used++; }
    };
    g.$gameParty._members[0].useItem = item => { item.count--; };
    const scene = new g.Scene_ProjectRInventory();
    scene.create();
    assert.equal(scene._categories.length, 6);
    // 一覧に入って決定 → 確認ウィンドウが開くだけで、消費しない
    scene._tabs.select(0);
    scene._tabs.ok();
    scene._list.select(0);
    scene._list.ok();
    assert.equal(used, 0);
    assert.equal(g.$gameParty._items[0].count, 3);
    assert.equal(scene._confirm.visible, true);
    assert.equal(scene._confirm.index(), 1, "初期カーソルは『やめる』");
    // やめる
    scene._confirm.ok();
    assert.equal(used, 0); assert.equal(g.$gameParty._items[0].count, 3);
    // 使う
    scene._list.ok(); scene._confirm.select(0); scene._confirm.ok();
    assert.equal(used, 1); assert.equal(g.$gameParty._items[0].count, 2);
    // 戦闘中は使えない(モデルが拒否)
    g.ProjectRCombatPresence.beginCombatEvent("f");
    assert.equal(g.ProjectRMenuCore.inventory.useOnLeader(g.$gameParty._items[0]).reason, "inCombat");
});

test("アイテム画面: 武器カテゴリは決定しても何も消費・変更しない(確認だけ)", () => {
    const g = createGame();
    party(g);
    const before = JSON.stringify(g.$gameParty._items.map(i => i.count));
    const scene = new g.Scene_ProjectRInventory();
    scene.create();
    scene._tabs.select(1); scene._tabs.ok();
    scene._list.select(0); scene._list.ok();
    assert.equal(scene._confirm.visible, false);
    assert.equal(JSON.stringify(g.$gameParty._items.map(i => i.count)), before);
    assert.match(scene._detail.text(), /テストハンドガン/);
});

// ---------------- 進行用プラグインコマンド ----------------
test("進行用プラグインコマンド: カード/指輪の入手・譲渡・Ultimate選択をイベントから行える(F8不要)", () => {
    const g = createGame({ equipActorIds: { hermes: [4] } });
    const run = (name, args) => g.PluginManager._commands[`ProjectR_MenuIntegration:${name}`](args);
    run("GrantRing", { ringId: "hermes" });
    run("GrantCard", { cardId: "hermes_sword_attack", level: "2" });
    assert.equal(g.ProjectRCardDeck.hasPlayerRing("hermes"), true);
    assert.equal(g.ProjectRCardDeck.isCardOwned("hermes_sword_attack"), true);
    assert.equal(g.ProjectRMenuCore.deck.collection()[0].level, 2);
    run("SetUltimateGod", { ringId: "hermes" });
    assert.equal(g.ProjectRCardDeck.getUltimateRingId(), "hermes");
    run("TransferRingToActor", { ringId: "hermes", actorId: "4" });
    assert.equal(g.ProjectRCardDeck.getRingOwner("hermes"), "actor:4");
    run("ReturnRingToPlayer", { ringId: "hermes" });
    assert.equal(g.ProjectRCardDeck.getRingOwner("hermes"), "player");
    // 定義済みコマンドのヘッダー宣言
    const head = read("js/plugins/ProjectR_MenuIntegration.js");
    for (const c of ["GrantCard", "GrantRing", "TransferRingToActor", "ReturnRingToPlayer", "SetUltimateGod"]) assert.match(head, new RegExp(`@command ${c}`));
});

console.log(`\n${passed} tests passed`);
