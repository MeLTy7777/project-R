"use strict";
// Phase H2C-B1: 再現した2件の不具合の回帰テスト + 所持モデルの現状(コピー数を持たない)の固定。
//   (1) ProjectRの画面を「直接」開いたとき(イベント等 → ProjectRMenuIntegration.openXxx)にEscで戻れない
//   (2) 元のテンプレートが無くなったHendrix生成イベントがセーブに残っていると、ロード直後にpage()が例外を投げてゲームが止まる
//   (3) 所持は「カードの種類」単位で、コピー数は持たない(デッキ枚数の上限=maxCopies)。この事実を壊さないための記録
// 対象外: 実際の画面描画・実キー入力(実機: tools/mz_cdp/h2cb1_esc.cjs / b1のロード確認で行う)。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const root = path.join(__dirname, "..");

// 実機(Hendrix_Keyboard_Gamepad の Button Config 適用後)のキー割り当て。実機で確認した値: Escは'menu'、X/Bは'escape'(h2cb1_esc.cjs の E0)。
// 実エンジンのテスト用ハーネスはHendrixのremapを実行しないため、同じ割り当てをここで再現する。
function useProjectRKeys(w) {
    const map = w.ctx.Input.keyMapper;
    for (const code of [27, 45, 96]) delete map[code];
    map[27] = "menu"; map[88] = "escape"; map[66] = "escape"; map[70] = "ok";
    delete map[13]; delete map[90];
}

function world() {
    const w = buildWorld();
    assert.deepEqual(w.failures, []);
    w.enterMap(1, 5, 5);
    useProjectRKeys(w);
    w.frames(2);
    return w;
}
function open(w, className) {
    const scene = new w.ctx[className]();
    scene.create();
    scene.start();
    scene.update();
    scene.popped = 0;
    w.ctx.SceneManager.pop = () => { scene.popped++; };
    return scene;
}
const frame = (w, scene, n = 1) => { for (let i = 0; i < n; i++) { w.ctx.Input.update(); w.ctx.TouchInput.update(); scene.update(); } };
function tap(w, scene, code, keyCode) {
    w.keyDown(code, keyCode); frame(w, scene, 2); w.keyUp(code, keyCode); frame(w, scene, 2);
}
const PAGES = ["Scene_ProjectRDeckBuilder", "Scene_ProjectRUltimateSelect", "Scene_ProjectRInventory", "Scene_ProjectRRings"];

// ---------------- (1) Esc ----------------
test("前提: Escは'menu'(キャンセルではない)。MenuHUD/MenuUIはkeyMapperを書き換えない", () => {
    const w = world();
    assert.equal(w.ctx.Input.keyMapper[27], "menu");
    w.keyDown("Escape", 27); w.ctx.Input.update();
    assert.equal(w.ctx.Input.isTriggered("cancel"), false, "Escはcancelではない");
    assert.equal(w.ctx.Input.isTriggered("menu"), true);
    w.keyUp("Escape", 27);
    for (const file of ["ProjectR_MenuHUD.js", "ProjectR_MenuUI.js", "ProjectR_SaveLoadGuard.js"]) {
        assert.doesNotMatch(fs.readFileSync(path.join(root, "js/plugins", file), "utf8"), /keyMapper\s*(\[[^\]]*\]\s*)?=[^=]/, file + " はkeyMapperを変更しない");
    }
});

test("直接開いた画面(スタックにメニューが無い)でも、Escで1回だけ戻る", () => {
    for (const name of PAGES) {
        const w = world();
        assert.equal(w.ctx.SceneManager._stack.length, 0, "直接開く = スタックにメニューが無い");
        const scene = open(w, name);
        frame(w, scene, 3);
        tap(w, scene, "Escape", 27);
        assert.equal(scene.popped, 1, name + ": Escで戻る");
    }
});

test("ProjectRメニューから開いた画面でも従来どおりEscで戻る(スタックにScene_ProjectRMenuがある場合)", () => {
    for (const name of PAGES) {
        const w = world();
        w.ctx.SceneManager._stack.push(w.ctx.Scene_ProjectRMenu);
        const scene = open(w, name);
        frame(w, scene, 3);
        tap(w, scene, "Escape", 27);
        assert.equal(scene.popped, 1, name);
    }
});

test("X・BのキャンセルとEscは同じ結果(従来のX/Bは壊れていない)。右クリック相当(TouchInput.cancel)も戻る", () => {
    for (const [code, keyCode] of [["KeyX", 88], ["KeyB", 66]]) {
        const w = world();
        const scene = open(w, "Scene_ProjectRDeckBuilder");
        frame(w, scene, 3);
        tap(w, scene, code, keyCode);
        assert.equal(scene.popped, 1, code);
    }
    const w = world();
    const scene = open(w, "Scene_ProjectRDeckBuilder");
    frame(w, scene, 3);
    w.ctx.TouchInput._onCancel(10, 10); frame(w, scene, 2);
    assert.equal(scene.popped, 1, "右クリック");
});

test("Escは1段ずつ: 一覧 → 絞り込み(まだ閉じない) → もう一度Escで閉じる。押しっぱなしでも1回だけ", () => {
    const w = world();
    w.ctx.ProjectRCardDeck.assignRingToPlayer("hermes");
    const scene = open(w, "Scene_ProjectRDeckBuilder");
    frame(w, scene, 3);
    scene._tabs.processOk(); frame(w, scene, 1);
    assert.equal(scene._collection.active, true, "一覧に入った");
    tap(w, scene, "Escape", 27);
    assert.equal(scene.popped, 0, "一覧でのEscは画面を閉じない");
    assert.equal(scene._tabs.active, true, "絞り込みへ戻った");
    w.keyDown("Escape", 27); frame(w, scene, 30); // 押しっぱなし(キーリピートのイベントも来る)
    for (let i = 0; i < 5; i++) { w.keyDown("Escape", 27, { repeat: true }); frame(w, scene, 4); }
    w.keyUp("Escape", 27); frame(w, scene, 2);
    assert.equal(scene.popped, 1, "押しっぱなしでも閉じるのは1回だけ");
});

test("Escの入力補助はProjectRの画面だけ: 標準のScene_MenuBase(ProjectR以外・メニュー経由でない)は従来のまま", () => {
    const w = world();
    const scene = new w.ctx.Scene_MenuBase();
    assert.equal(scene instanceof w.ctx.Scene_ProjectRPage, false);
    scene.create(); scene.start();
    assert.equal(scene._projectRSubmenuInput, undefined, "ProjectR以外の画面には入力補助を付けない");
});

test("マップ上のEsc(メニューを開く)は従来どおり。ProjectR画面の修正は Scene_Map.isMenuCalled を変えない", () => {
    const w = world();
    w.keyDown("Escape", 27); w.ctx.Input.update();
    assert.equal(w.scene.isMenuCalled(), true, "マップではEscがメニュー呼び出し");
    w.keyUp("Escape", 27);
    const src = fs.readFileSync(path.join(root, "js/plugins/ProjectR_MenuHUD.js"), "utf8");
    assert.doesNotMatch(src, /isMenuCalled\s*=/, "isMenuCalled を上書きしていない");
});

test("カード用キー(Q/E/X/C/V)の処理はCardBattleInputのまま: MenuHUDの変更はcard入力のファイルに触れていない", () => {
    const w = world();
    const input = w.ctx.ProjectRCardBattleInput;
    assert.ok(input, "CardBattleInputがある");
    const hud = fs.readFileSync(path.join(root, "js/plugins/ProjectR_MenuHUD.js"), "utf8");
    assert.doesNotMatch(hud, /CardBattleInput|requestUseCard/, "MenuHUDはカード入力を扱わない");
});

// ---------------- (2) 元のテンプレートが無い生成イベント ----------------
function spawnStale(w, templateId) {
    const ctx = w.ctx;
    const valid = Object.keys(plain(ctx.$dataTemplateMap.events.map((e, i) => (e ? i : null)).filter(Boolean)));
    assert.ok(valid.length > 0, "テンプレートマップにイベントがある");
    const id = ctx.$gameMap.spawnEvent(ctx.$dataTemplateMap.events.findIndex(e => e), 10, 10);
    const event = ctx.$gameMap.event(id);
    event._templateEventId = templateId; // 元のテンプレートが無くなった状態(テンプレートマップの番号が変わった古いセーブ)
    return { id, event };
}

test("再現: 元のテンプレートが無い生成イベントのpage()は、標準のままなら例外(this.event().pages)。ガード後はnull", () => {
    const w = world();
    const { event } = spawnStale(w, 999);
    assert.equal(event.event(), undefined, "event()が空");
    assert.equal(event.page(), null, "例外ではなくnull");
    assert.deepEqual(plain(w.ctx.ProjectRSaveLoadGuard.staleEvents()), [event.eventId()]);
});

test("視界(Vision)・戦闘遮蔽(Combat)は、その古いイベントがあっても止まらず、タグ無しとして扱う", () => {
    const w = world();
    spawnStale(w, 999);
    const vision = w.ctx.ProjectR.VisionOcclusion, combat = w.ctx.ProjectR.CombatOcclusion;
    const stale = w.ctx.$gameMap.events().find(e => !e.event());
    assert.deepEqual(plain(vision.eventTags(stale)), { wall: false, keep: false });
    assert.doesNotThrow(() => combat.firstBlockerBetween({ x: 1.5, y: 3.5 }, { x: 8, y: 3.5 }, { mode: "vision" }));
    assert.doesNotThrow(() => combat.firstBlockerBetween({ x: 1.5, y: 3.5 }, { x: 8, y: 3.5 }, { mode: "combat" }));
});

test("通常のイベントとテンプレートが有る生成イベントは、これまでどおり(page()が返る・タグが読める)", () => {
    const w = world();
    const ctx = w.ctx;
    const normal = ctx.$gameMap.events().find(e => e.event() && !(e instanceof ctx.Hendrix_TemplateEvent));
    if (normal) assert.equal(normal.page(), normal.event().pages[normal._pageIndex]);
    const firstTemplate = ctx.$dataTemplateMap.events.findIndex(e => e);
    const id = ctx.$gameMap.spawnEvent(firstTemplate, 8, 8);
    const spawned = ctx.$gameMap.event(id);
    assert.ok(spawned.event(), "テンプレート有り");
    assert.equal(spawned.page(), spawned.event().pages[spawned._pageIndex]);
    assert.deepEqual(plain(ctx.ProjectRSaveLoadGuard.staleEvents()), []);
});

test("ロード: 古い生成イベントだけをメモリ上のマップから外し、有効な生成イベントと通常のイベントは残す。セーブ内容(入力)は書き換えない", () => {
    const w = world();
    const ctx = w.ctx;
    const firstTemplate = ctx.$dataTemplateMap.events.findIndex(e => e);
    const goodId = ctx.$gameMap.spawnEvent(firstTemplate, 9, 9);
    const stale = spawnStale(w, 999);
    const normalIds = ctx.$gameMap.events().filter(e => !(e instanceof ctx.Hendrix_TemplateEvent)).map(e => e.eventId());
    const json = ctx.JsonEx.stringify(ctx.DataManager.makeSaveContents());
    const before = json; // 保存データとしての文字列
    ctx.DataManager.extractSaveContents(ctx.JsonEx.parse(json));
    assert.equal(ctx.$gameMap.event(stale.id), null, "古い生成イベントは外れた");
    assert.ok(ctx.$gameMap.event(goodId), "有効な生成イベントは残る");
    for (const id of normalIds) assert.ok(ctx.$gameMap.event(id), "通常のイベントは残る: " + id);
    assert.deepEqual(plain(ctx.ProjectRSaveLoadGuard.lastPurged()), [{ mapId: 1, eventId: stale.id, templateEventId: 999 }]);
    assert.deepEqual(plain(ctx.ProjectRSaveLoadGuard.staleEvents()), []);
    assert.equal(json, before, "入力のセーブ内容は変更されない");
    // マップの全イベントに対し、視界・page()が例外なく動く
    for (const event of ctx.$gameMap.events()) assert.doesNotThrow(() => ctx.ProjectR.VisionOcclusion.eventTags(event));
});

test("ロード: 古い生成イベントが無ければ何も外さない(lastPurgedは空)", () => {
    const w = world();
    const ctx = w.ctx;
    ctx.$gameMap.spawnEvent(ctx.$dataTemplateMap.events.findIndex(e => e), 9, 9);
    const count = ctx.$gameMap.events().length;
    ctx.DataManager.extractSaveContents(ctx.JsonEx.parse(ctx.JsonEx.stringify(ctx.DataManager.makeSaveContents())));
    assert.equal(ctx.$gameMap.events().length, count);
    assert.deepEqual(plain(ctx.ProjectRSaveLoadGuard.lastPurged()), []);
});

test("SaveLoadGuardは保護対象(Vision/CombatOcclusion/Hendrix/DotMove/rmmz_*)を変更しない。plugins.jsには1回だけ・Hendrixの後に登録", () => {
    const git = require("node:child_process");
    const names = ["js/plugins/ProjectR_VisionOcclusion.js", "js/plugins/ProjectR_CombatOcclusion.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/rmmz_objects.js"];
    for (const file of names) {
        const out = git.execFileSync("git", ["diff", "--stat", "HEAD", "--", file], { cwd: root }).toString();
        assert.equal(out.trim(), "", file + " は変更されていない");
    }
    const config = {};
    require("node:vm").runInNewContext(fs.readFileSync(path.join(root, "js/plugins.js"), "utf8"), config);
    const list = config.$plugins.map(p => p.name);
    assert.equal(list.filter(n => n === "ProjectR_SaveLoadGuard").length, 1);
    assert.ok(list.indexOf("ProjectR_SaveLoadGuard") > list.indexOf("Hendrix_Action_Engine"));
    assert.equal(config.$plugins.find(p => p.name === "ProjectR_SaveLoadGuard").status, true);
    assert.ok(fs.existsSync(path.join(root, "js/plugins/ProjectR_SaveLoadGuard.js")));
});

// ---------------- (3) 所持モデルの現状(記録) ----------------
test("所持モデル(H2C-B1の監査 → H2C-B2で置き換え済み): Coreの所持は種類ごとのowned/levelのまま。デッキに入る枚数は別領域の実所持枚数で決まる", () => {
    const w = world();
    const d = w.ctx.ProjectRCardDeck;
    d.assignRingToPlayer("hermes");
    d.setCardOwned("hermes_strength", true);
    const state = plain(d.getPersistentData ? d.getPersistentData() : w.ctx.$gameSystem._projectRCardDeckData);
    assert.deepEqual(Object.keys(state.cardOwnership.hermes_strength).sort(), ["level", "owned"], "コピー数のフィールドが無い");
    const core = w.ctx.ProjectRMenuCore;
    core.deck.clear();
    let added = 0, last = null;
    for (let i = 0; i < 12; i++) { last = core.deck.add("hermes_strength"); if (last.ok) added++; }
    // H2C-B2: 解放だけの操作は最小1枚。ストレングス(上限10)でもデッキには1枚しか入らない(H2C-B1の監査時は10枚入った)。
    assert.equal(added, 1, "解放だけ(旧来の操作)では最小1枚");
    assert.equal(last.ok, false);
    assert.equal(last.reason, "CARD_COPIES_EXCEEDS_OWNED");
    assert.equal(d.getDeck().filter(id => id === "hermes_strength").length, 1);
    // Coreの保存形式は変わらない(コピー数は別の版つき領域)。
    assert.deepEqual(Object.keys(state.cardOwnership.hermes_strength).sort(), ["level", "owned"]);
    const reasons = plain(d.getDeckInvalidReasons(Array(11).fill("hermes_strength"))).map(r => r.code);
    assert.ok(reasons.includes("MAX_COPIES_EXCEEDED"));
    assert.ok(reasons.includes("CARD_COPIES_EXCEEDS_OWNED"));
});

console.log(`\n${passed} tests passed`);
