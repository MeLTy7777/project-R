"use strict";
// 通常メニューの新画面(アイテム / スキル=デッキ構築 / アルティメット / 指輪)を、本物の Window_Selectable / Window_Base /
// Scene_MenuBase / Bitmap(文字幅だけstub) で動かす。従来のFullSpec.menuテストは最小のWindow stubだったため、
// MZの実Window APIの誤用を見逃し得た。ここでは実Window(select / processOk / processCancel / callHandler)を通す。
// 対象外: 実際の描画ピクセル・音・マウス座標のヒットテスト。見た目はdocs/ProjectR_FullSpec_ManualVerification.mdで手動確認。
const assert = require("node:assert/strict");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

function world() {
    const w = buildWorld();
    assert.deepEqual(w.failures, []);
    w.enterMap(1, 5, 5);
    w.frames(2);
    return w;
}
const deckApi = w => w.ctx.ProjectRCardDeck;
const core = w => w.ctx.ProjectRMenuCore;
function open(w, className) {
    const scene = new w.ctx[className]();
    scene.create();
    scene.start();
    scene.update();
    scene.popped = 0;
    w.ctx.SceneManager.pop = () => { scene.popped++; }; // popScene は SceneManager.pop を呼ぶ(ハンドラはbind済みなのでここを数える)
    return scene;
}
const frame = (w, scene, n = 1) => { for (let i = 0; i < n; i++) { w.ctx.Input.update(); scene.update(); } };
// 実データから「HPを回復する・主人公に使える・メニューで使える」アイテムを探す(予備スロットは除く)。
function healingItem(w) {
    const item = w.ctx.$dataItems.find(i => i && i.name && !/^-+/.test(i.name) && i.itypeId === 1 && i.scope === 7 && i.occasion <= 1 &&
        i.effects.some(e => e.code === 11));
    assert.ok(item, "回復アイテムがデータにある");
    return item;
}
function grantReal(w) {
    const d = deckApi(w);
    d.assignRingToPlayer("hermes"); d.assignRingToPlayer("apollo");
    for (const id of ["hermes_swift_movement", "hermes_reed_flute_sleep", "hermes_perception_obscure", "hermes_sword_attack",
        "apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"]) {
        d.setCardOwned(id, true);
        // H2C-B2: 所持は実際のコピー数。デッキ構築画面の上限(maxCopies)の確認のため、各カードの上限枚数を所持させる。
        if (w.ctx.ProjectRCardInventory) w.ctx.ProjectRCardInventory.grantCopies(id, d.definitions.card(id).maxCopies, { source: "test" });
    }
}

test("通常メニューの SKILL / ULTIMATE / ITEM が、それぞれの実Sceneへ接続されている(MenuHUD.commandScenes)", () => {
    const w = world();
    const table = w.ctx.ProjectR.MenuHUD.commandScenes;
    assert.ok(table, "MenuHUD.commandScenes がある");
    const integration = w.ctx.ProjectRMenuIntegration;
    assert.ok(integration, "MenuIntegrationが読み込まれている");
    for (const name of ["Scene_ProjectRMenu", "Scene_ProjectRDeckBuilder", "Scene_ProjectRUltimateSelect", "Scene_ProjectRInventory", "Scene_ProjectRRings"]) {
        assert.equal(typeof w.ctx[name], "function", name);
    }
    assert.equal(table.skill, w.ctx.Scene_ProjectRDeckBuilder);
    assert.equal(table.ultimate, w.ctx.Scene_ProjectRUltimateSelect);
    assert.equal(table.item, w.ctx.Scene_ProjectRInventory);
});

test("アイテム画面: 6カテゴリ、カテゴリ切替で一覧が変わり、見るだけでは何も消費しない。キャンセルで戻る", () => {
    const w = world();
    const { ctx } = w;
    ctx.$gameParty.gainItem(healingItem(w), 3);
    ctx.$gameParty.gainItem(ctx.$dataWeapons[1], 1);
    ctx.$gameParty.gainItem(ctx.$dataArmors[1], 1);
    const scene = open(w, "Scene_ProjectRInventory");
    assert.equal(scene._categories.length, 6);
    assert.equal(scene._tabs.active, true);
    const seen = [];
    for (let i = 0; i < 6; i++) {
        scene._tabs.select(i); // highlightハンドラで一覧が更新される
        seen.push([scene.category(), scene._list.maxItems()]);
    }
    assert.deepEqual(plain(seen.map(s => s[0])), ["item", "weapon", "armor", "key", "ammo", "ring"].slice(0, 6).map((_, i) => seen[i][0]));
    assert.ok(seen.find(s => s[0] === "item")[1] >= 1, "アイテムが出る");
    assert.ok(seen.some(s => s[0] === "weapon" && s[1] >= 1), "武器が出る");
    assert.ok(seen.some(s => s[0] === "armor" && s[1] >= 1), "防具が出る");
    // 武器を一覧へ入って確認しても所持数は変わらない
    scene._tabs.select(scene._categories.findIndex(c => c.key === "weapon"));
    scene._tabs.processOk();
    assert.equal(scene._list.active, true);
    const entry = scene._list.item();
    assert.ok(entry && entry.name);
    const before = ctx.$gameParty.numItems(entry.item);
    scene._list.processOk();
    assert.equal(ctx.$gameParty.numItems(entry.item), before, "武器は見るだけで消費しない");
    assert.equal(scene._confirm.visible, false);
    // キャンセル: 一覧 → タブ → シーン終了
    scene._list.processCancel();
    assert.equal(scene._tabs.active, true);
    scene._tabs.processCancel();
    assert.equal(scene.popped, 1);
});

test("アイテム画面: 回復アイテムは「使う/やめる」の確認(初期はやめる)。使うを選んだときだけ1個減る", () => {
    const w = world();
    const { ctx } = w;
    const potion = healingItem(w);
    ctx.$gameParty.gainItem(potion, 3);
    const leader = ctx.$gameParty.leader();
    leader.setHp(1);
    const scene = open(w, "Scene_ProjectRInventory");
    scene._tabs.select(scene._categories.findIndex(c => c.key === "item"));
    scene._tabs.processOk();
    const index = scene._list._items.findIndex(e => e.item === potion);
    assert.ok(index >= 0, "ポーションが一覧にある");
    scene._list.select(index);
    scene._list.processOk();
    assert.equal(scene._confirm.visible, true);
    assert.equal(scene._confirm.index(), 1, "初期カーソルは「やめる」");
    scene._confirm.processOk();
    assert.equal(ctx.$gameParty.numItems(potion), 3, "やめる = 消費しない");
    assert.equal(leader.hp, 1);
    scene._list.processOk();
    scene._confirm.select(0);
    scene._confirm.processOk();
    assert.equal(ctx.$gameParty.numItems(potion), 2, "使う = 1個だけ消費");
    assert.ok(leader.hp > 1);
    // 戦闘中は使えない(モデルが拒否)
    ctx.ProjectRCombatPresence.beginCombatEvent("test");
    const refused = core(w).inventory.useOnLeader(potion);
    assert.equal(refused.ok, false);
    assert.equal(ctx.$gameParty.numItems(potion), 2);
});

test("デッキ構築: 所持一覧/デッキ/詳細/絞り込み/追加/削除/コピー上限/30枚ルール/無効理由の表示と、セーブ往復", () => {
    const w = world();
    const { ctx } = w;
    grantReal(w);
    const scene = open(w, "Scene_ProjectRDeckBuilder");
    assert.equal(scene._collection.maxItems(), 7, "所持している7種が出る");
    assert.equal(scene._deckList.maxItems(), 0);
    assert.equal(core(w).deck.status().header, "DECK 0 / 30");
    // 絞り込みタブ: 全て/神ごと/使用可/指輪なし + 並び替え
    assert.ok(scene._filters.length >= 5);
    const hermesTab = scene._filters.findIndex(f => f.key === "god:hermes");
    scene._tabs.select(hermesTab);
    assert.equal(scene._collection.maxItems(), 4, "Hermesのカードだけ");
    const janusTab = scene._filters.findIndex(f => f.key === "god:janus");
    scene._tabs.select(janusTab);
    assert.equal(scene._collection.maxItems(), 0, "Janusは空");
    scene._tabs.select(0);
    // 追加: Reed Fluteはコピー上限2
    const reed = scene._collection._items.findIndex(e => e.cardId === "hermes_reed_flute_sleep");
    scene._tabs.processOk();
    scene._collection.select(reed);
    for (let i = 0; i < 2; i++) scene._collection.processOk();
    assert.equal(core(w).deck.status().count, 2);
    scene._collection.processOk(); // 3枚目は拒否
    assert.equal(core(w).deck.status().count, 2, "コピー上限を超えて追加できない");
    assert.match(scene._notice, /上限/);
    // 7種を上限まで入れても19枚。30枚には届かず、無効の理由が出る(自動修復しない)
    for (let i = 0; i < scene._collection.maxItems(); i++) {
        scene._collection.select(i);
        for (let c = 0; c < 4; c++) scene._collection.processOk();
    }
    assert.equal(core(w).deck.status().count, 19, "製品の7種ではコピー上限の合計19枚");
    const status = core(w).deck.status();
    assert.equal(status.valid, false);
    assert.match(status.messages.join("\n"), /30枚必要（現在19枚）/);
    assert.equal(deckApi(w).isDeckValid(deckApi(w).getDeck()), false, "30枚ルールは緩めていない");
    // 削除: デッキ側で1枚戻す
    scene._collection.deactivate(); scene._deckList.activate(); scene._deckList.select(0);
    const first = scene._deckList.item();
    const sizeBefore = core(w).deck.status().count;
    scene._deckList.processOk();
    assert.equal(core(w).deck.status().count, sizeBefore - 1);
    assert.ok(first.cardId);
    // 保存 → 読込でデッキが残る
    const expected = plain(deckApi(w).getDeck());
    const json = ctx.JsonEx.stringify(ctx.DataManager.makeSaveContents());
    ctx.DataManager.createGameObjects();
    assert.equal(deckApi(w).getDeck().length, 0);
    ctx.DataManager.extractSaveContents(ctx.JsonEx.parse(json));
    assert.deepEqual(plain(deckApi(w).getDeck()), expected);
    // 戻る
    scene._deckList.processCancel(); scene._collection.processCancel(); scene._tabs.processCancel();
    assert.equal(scene.popped, 1);
});

test("デッキ構築: 戦闘中はデッキを変更できない(モデルが拒否)。デッキは書き換わらない", () => {
    const w = world();
    grantReal(w);
    const scene = open(w, "Scene_ProjectRDeckBuilder");
    w.ctx.ProjectRCombatPresence.beginCombatEvent("test");
    const result = core(w).deck.add("hermes_sword_attack");
    assert.equal(result.ok, false);
    assert.equal(core(w).deck.status().count, 0);
    assert.ok(scene);
});

test("アルティメット選択: 主人公が指輪を持ち、handlerが実装済みの神(Hermes/Apollo)だけ選べる。Janus/Themis/Athenaは未実装で選べない", () => {
    const w = world();
    const { ctx } = w;
    const d = deckApi(w);
    d.assignRingToPlayer("hermes");
    const scene = open(w, "Scene_ProjectRUltimateSelect");
    const byRing = id => scene._list._items.findIndex(e => e.ringId === id);
    const status = id => scene.statusLabel(scene._list._items[byRing(id)]);
    assert.equal(status("hermes"), "選択可");
    assert.equal(status("apollo"), "未所持");
    for (const id of ["janus", "themis", "athena"]) assert.equal(status(id), "未実装", id);
    // Apollo(未所持)・Janus(未実装)は選べない
    for (const id of ["apollo", "janus", "themis", "athena"]) {
        scene._list.select(byRing(id));
        scene._list.processOk();
        assert.notEqual(d.getUltimateRingId(), id, id);
    }
    // Hermesは選べて保存される
    scene._list.select(byRing("hermes"));
    scene._list.processOk();
    assert.equal(d.getUltimateRingId(), "hermes");
    assert.equal(status("hermes"), "選択中");
    // Apolloの指輪を取得すると選べる
    d.assignRingToPlayer("apollo");
    scene.refreshAll();
    scene._list.select(byRing("apollo"));
    scene._list.processOk();
    assert.equal(d.getUltimateRingId(), "apollo");
    // 保存 → 読込で選択が残る
    const json = ctx.JsonEx.stringify(ctx.DataManager.makeSaveContents());
    ctx.DataManager.createGameObjects();
    ctx.DataManager.extractSaveContents(ctx.JsonEx.parse(json));
    assert.equal(d.getUltimateRingId(), "apollo");
    scene._list.processCancel();
    assert.equal(scene.popped, 1);
});

test("アルティメット選択: 仲間が持つ指輪は選べない(DEV fixtureで仲間に渡した場合)。主人公へ戻すと選べる", () => {
    const w = world();
    const d = deckApi(w);
    // 製品の指輪は仲間に渡せない(equipActorIdsが空)。DEV fixtureと同じ差し替えを一時的に行う。
    const ring = d.definitions.rings.get("apollo");
    d.definitions.rings.set("apollo", Object.freeze({ ...ring, equipActorIds: Object.freeze([4]) }));
    d.assignRingToPlayer("apollo");
    assert.equal(d.assignRingToActor("apollo", 4).ok, true);
    const scene = open(w, "Scene_ProjectRUltimateSelect");
    const index = scene._list._items.findIndex(e => e.ringId === "apollo");
    assert.match(scene.statusLabel(scene._list._items[index]), /^仲間/);
    scene._list.select(index);
    scene._list.processOk();
    assert.notEqual(d.getUltimateRingId(), "apollo");
    assert.equal(d.assignRingToPlayer("apollo").ok, true);
    scene.refreshAll();
    scene._list.select(index);
    scene._list.processOk();
    assert.equal(d.getUltimateRingId(), "apollo");
});

test("指輪画面: 製品(仲間にできる指輪が未設定)では「移せる相手がいません」で落ちない。DEV設定では仲間へ渡せ、主人公へ戻せる", () => {
    const w = world();
    const d = deckApi(w);
    d.assignRingToPlayer("hermes");
    let scene = open(w, "Scene_ProjectRRings");
    assert.equal(scene._rings.maxItems() >= 1, true);
    scene._rings.select(scene._rings._items.findIndex(e => e.ringId === "hermes"));
    scene._rings.processOk();
    assert.match(scene._notice, /移せる相手がいません/);
    assert.equal(d.getRingOwner("hermes") === "player" || d.hasPlayerRing("hermes"), true);
    // DEV fixture相当
    const ring = d.definitions.rings.get("hermes");
    d.definitions.rings.set("hermes", Object.freeze({ ...ring, equipActorIds: Object.freeze([4, 6]) }));
    scene = open(w, "Scene_ProjectRRings");
    const ringIndex = scene._rings._items.findIndex(e => e.ringId === "hermes");
    scene._rings.select(ringIndex);
    scene._rings.processOk();
    const toActor = scene._targets._items.findIndex(t => t.actorId === 4);
    assert.ok(toActor >= 0);
    scene._targets.select(toActor);
    scene._targets.processOk();
    assert.equal(d.hasPlayerRing("hermes"), false, "主人公の手元から仲間へ移る");
    // 戻す
    scene._rings.select(ringIndex);
    scene._rings.processOk();
    scene._targets.select(scene._targets._items.findIndex(t => t.kind === "player"));
    scene._targets.processOk();
    assert.equal(d.hasPlayerRing("hermes"), true);
});

test("メニュー画面のキャンセルは popScene。Scene_ProjectRPage は実Scene_MenuBaseを継承している", () => {
    const w = world();
    for (const name of ["Scene_ProjectRInventory", "Scene_ProjectRDeckBuilder", "Scene_ProjectRUltimateSelect", "Scene_ProjectRRings"]) {
        const scene = open(w, name);
        assert.ok(scene instanceof w.ctx.Scene_MenuBase, name);
        frame(w, scene, 3);
    }
});

console.log(`\n${passed} tests passed`);
