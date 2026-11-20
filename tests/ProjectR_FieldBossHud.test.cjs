"use strict";
// Stage 7D-A: フィールド戦闘のボスHUD(ProjectR_FieldBossHud)の、データ側(何を出すか)の Node テスト。実エンジン(実Map004 + 全plugin。FieldCombat・強敵も本物)。
//   描画(Sprite・バー・テキスト・重なり)は Node では扱わない(実機の確認は tools/mz_cdp/field_boss_hud_verify.cjs)。
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesZetsuFixture.cjs");
const { zetsuWorld, attachHpBars, player, read } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const ID = 4;
const FCs = w => w.ctx.ProjectRFieldCombat, HUD = w => w.ctx.ProjectRFieldBossHud, SE = w => w.ctx.ProjectRFieldStrongEnemy;
const ev = (w, id) => w.ctx.$gameMap.event(id);
const hpNow = (w, id = ID) => w.ctx.$gameMap.getCurrentEventHp(id);
const setEnemyHp = (w, v, id = ID) => { const e = ev(w, id); w.ctx.$gameVariables._data[e.hpStorageId] = v; const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === e); bar.currentHp = v; bar.targetHp = v; };
const plain = v => JSON.parse(JSON.stringify(v));
const TAG = "<fieldBoss: テストボス | phases=2>";

// ボス戦の世界: 敵(ID 4)に、ボスのタグと強敵(プロフィール)を付ける。プレイヤーは遠い(攻撃は始まらない)
function bossWorld({ strong = "dev_miniboss", tag = TAG, begin = true } = {}) {
    const w = zetsuWorld({ level: 1, x: 12, y: 25 });
    assert.equal(w.ctx.ProjectRCombatTestArena.endTest().ok, true); w.frames(2);
    FCs(w).setDevAllowOutsideEncounter(true);
    if (begin) assert.equal(FCs(w).begin().ok, true);
    attachHpBars(w, [ID, 5], 500);
    if (tag) ev(w, ID).event().note += "\n" + tag;
    if (begin) { assert.equal(FCs(w).attachEnemy(ID, { strong, reach: 2, sightTiles: 12, cooldownFrames: 80, chase: false }).ok, true); FCs(w).setPerception({ enabled: false }); }
    w.frames(2);
    return w;
}

test("登録・タグ: plugins.js に1回だけ・有効・依存の後ろ。<fieldBoss: 名前 | phases= | color= | label=> を読む。HUD は既存の層(BattleHUD の Manager)へ追加する", () => {
    const cfg = {}; require("node:vm").runInNewContext(read("js/plugins.js"), cfg);
    const names = cfg.$plugins.map(p => p.name), i = names.indexOf("ProjectR_FieldBossHud");
    assert.ok(i > names.indexOf("ProjectR_BattleHUD") && i > names.indexOf("ProjectR_FieldCombat") && i > names.indexOf("ProjectR_FieldStrongEnemy") && i > names.indexOf("ProjectR_CombatExtrasHUD"), "依存の後ろ");
    assert.equal(names.filter(n => n === "ProjectR_FieldBossHud").length, 1); assert.equal(cfg.$plugins[i].status, true);
    const w = bossWorld({ tag: "" }); const p = HUD(w).parseTag;
    assert.deepEqual(plain(p("<fieldBoss: 名前A | phases=3 | color=#00ff80 | label=STAGE>")), { name: "名前A", phases: 3, color: 0x00ff80, label: "STAGE" });
    assert.deepEqual(plain(p("<fieldBoss>")), { name: "", phases: 0, color: null, label: null });
    assert.deepEqual(plain(p("<fieldBoss: X | phases=0 | color=zzz>")), { name: "X", phases: 0, color: null, label: null }, "不正な値は無視する");
    assert.equal(p("<hp: ゴブリン>"), null); assert.equal(typeof w.ctx.Sprite_ProjectRFieldBossHUD, "function");
});

test("出る条件: フィールド戦闘中で、<fieldBoss> を持つ敵が戦闘に付いているときだけ。指定のない敵・戦闘外・Map008/009/010 では出ない", () => {
    let w = bossWorld({ begin: false }); assert.equal(HUD(w).getHudState(), null, "戦闘外では出ない");
    FCs(w).begin(); FCs(w).attachEnemy(ID, { strong: "dev_miniboss", chase: false }); FCs(w).setPerception({ enabled: false }); w.frames(2);
    const s = plain(HUD(w).getHudState()); assert.equal(s.name, "テストボス"); assert.equal(s.eventId, ID);
    // 指定のない敵だけが付いている戦闘
    w = bossWorld({ tag: "" }); assert.equal(HUD(w).getHudState(), null, "タグのない強敵は、ボスではない");
    // タグがあっても、戦闘に付けていない敵は出さない(戦闘の準備前)
    w = bossWorld({ begin: true }); FCs(w).detachEnemy(ID); w.frames(2); assert.equal(HUD(w).getHudState(), null);
    // 既存の DEV 戦闘マップ(Map008 / 009 / 010)にはボスの指定がなく、Map011 だけにある
    for (const n of ["Map008", "Map009", "Map010"]) assert.ok(!JSON.parse(read(`data/${n}.json`)).events.some(e => e && /fieldBoss/i.test(e.note || "")), n + " に <fieldBoss> はない");
    const m10 = JSON.parse(read("data/Map010.json")), m11 = JSON.parse(read("data/Map011.json"));
    const b10 = m10.events.find(e => e && /<fieldEnemy/.test(e.note)), b11 = m11.events.find(e => e && /<fieldEnemy/.test(e.note));
    assert.ok(/<fieldBoss: DEV 中ボス\(2段階\) \| phases=2>/.test(b11.note) && b11.note.startsWith(b10.note), "Map011 は Map010 と同じ中ボス + <fieldBoss> のタグだけ");
    assert.ok(/<fieldBattleMap>/.test(m11.note)); const infos = JSON.parse(read("data/MapInfos.json")); assert.ok(infos.some(x => x && x.id === 11 && x.name === "DEV_FieldBoss"));
});

test("実際のHP: HUD の値は、いまゲームに適用されている HP(getCurrentEventHp / getMaxEventHp)そのもの。ダメージ・回復・過回復のあとも一致する(読むだけ)", () => {
    const w = bossWorld(); let s = HUD(w).getHudState(); assert.equal(s.hp, 500); assert.equal(s.maxHp, 500); assert.equal(s.ratio, 1);
    // Hendrix の公式のダメージ(HP は次のフレームで適用される)。HUD は、適用された値に合わせる(先取りも遅れたままにもしない)
    const hit = (value) => { const it = new w.ctx.Game_Interpreter(); it._eventId = 0; w.ctx.PluginManager.callCommand(it, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(ID), value, exceedMaxHealth: "true" }); };
    for (const step of [-100, -60, 150]) {
        const before = hpNow(w); hit(String(step)); w.frames(3); const applied = hpNow(w); s = HUD(w).getHudState();
        assert.equal(applied, before + step, "実際に適用された HP"); assert.equal(s.hp, applied, "HUD の HP = 適用された HP"); assert.equal(s.ratio, Math.min(1, applied / 500));
    }
    setEnemyHp(w, 600); s = HUD(w).getHudState(); assert.equal(s.hp, 600, "過回復の HP もそのまま"); assert.equal(s.ratio, 1, "バーは 100% まで");
    setEnemyHp(w, 123); assert.equal(HUD(w).getHudState().hp, 123); assert.equal(Math.round(HUD(w).getHudState().ratio * 1000), 246);
});

test("フェーズ: 段階数はタグ(phases=)か強敵のプロフィールから・現在のフェーズは強敵の実際の段階・遷移の間は transition・目盛りは遷移の閾値。1段階の強敵は出さない", () => {
    let w = bossWorld({ tag: "<fieldBoss: 中ボス>" }); let s = HUD(w).getHudState();
    assert.equal(s.phaseCount, 2, "タグになければ、プロフィールの段階数"); assert.equal(s.phaseIndex, 1); assert.equal(s.phaseLabel, "PHASE 1/2"); assert.deepEqual(plain(s.marks), [0.5], "遷移の閾値(50%)の目盛り"); assert.equal(s.transition, false);
    setEnemyHp(w, 251); w.frames(5); assert.equal(HUD(w).getHudState().phaseIndex, 1, "251 はまだフェーズ1");
    setEnemyHp(w, 250); w.frames(1); s = HUD(w).getHudState(); assert.equal(s.phaseIndex, 2, "250 以下 = 遷移を始めたフレームから 2/2"); assert.equal(s.phaseLabel, "PHASE 2/2"); assert.equal(s.transition, true, "遷移の間");
    w.frames(95); s = HUD(w).getHudState(); assert.equal(s.transition, false, "遷移が終わる"); assert.equal(s.phaseIndex, 2);
    setEnemyHp(w, 400); w.frames(3); s = HUD(w).getHudState(); assert.equal(s.phaseIndex, 2, "回復してもフェーズは戻らない(強敵の仕様)"); assert.equal(s.hp, 400);
    // タグが段階数を決める(プロフィールより優先)・ラベル・色
    w = bossWorld({ tag: "<fieldBoss: B | phases=3 | label=STAGE | color=00aa55>" }); s = HUD(w).getHudState(); assert.equal(s.phaseCount, 3); assert.equal(s.phaseLabel, "STAGE 1/3"); assert.equal(s.color, 0x00aa55);
    // 1段階の強敵(dev_strong)・タグなしの段階数: フェーズの文字を出さない・目盛りなし
    w = bossWorld({ strong: "dev_strong", tag: "<fieldBoss: 強敵>" }); s = HUD(w).getHudState(); assert.equal(s.phaseCount, 1); assert.equal(s.phaseLabel, ""); assert.deepEqual(plain(s.marks), []);
    setEnemyHp(w, 100); w.frames(5); assert.equal(HUD(w).getHudState().phaseIndex, 1, "1段階の強敵は、HPが減ってもフェーズが変わらない");
});

test("名前・複数のボス: 名前はタグ(なければ敵データベースの名前)。複数のボスがいれば、イベントIDの小さい方。特定のボス名・プロフィール名を plugin に書かない", () => {
    let w = bossWorld({ tag: "<fieldBoss>" }); assert.equal(HUD(w).getHudState().name, ev(w, ID).databaseEnemy.name, "名前の省略 = データベースの名前");
    w = bossWorld({ tag: "<fieldBoss: 四番>" }); ev(w, 5).event().note += "\n<fieldBoss: 五番 | phases=4>"; FCs(w).attachEnemy(5, { chase: false });
    let s = HUD(w).getHudState(); assert.equal(s.name, "四番", "IDの小さい方"); FCs(w).detachEnemy(ID); w.frames(2); s = HUD(w).getHudState(); assert.equal(s.name, "五番"); assert.equal(s.phaseCount, 4);
    const src = read("js/plugins/ProjectR_FieldBossHud.js"); assert.ok(!/dev_miniboss|dev_strong|トレント|DEV 中ボス/.test(src.replace(/\/\*[\s\S]*?\*\//, "")), "ボス名・プロフィール名を直接書かない");
    // 表示の設定: 既定は CombatExtrasHUD と同じ位置。configure で変えられる(ボスごとの色・ラベルはタグ)
    const cfg = HUD(w).getConfig(); assert.equal(cfg.x, 580); assert.equal(cfg.y, 196); assert.equal(cfg.width, 760);
    const lay = HUD(w).layout(); assert.ok(lay.y >= 150, "ULTIMATE のHUD(y 20〜150)の下"); assert.ok(lay.y + lay.height <= 270, "画面の上部(上 25%)に収まる(スキル枠・プレイヤーの表示は下側)"); assert.ok(lay.x + lay.width <= 1920);
    assert.equal(HUD(w).configure({ y: 300 }).y, 300, "位置は設定で変えられる"); HUD(w).configure({ y: 196 });
});

test("死亡・勝利・撤退・マップ移動・再入場: 倒れたら dead(0 のまま少し残る)・戦闘の終了で消える・マップ移動で消える・再入場はフェーズ1・満タンから", () => {
    let w = bossWorld(); setEnemyHp(w, 0); w.frames(3); let s = HUD(w).getHudState(); assert.ok(s && s.dead && s.hp === 0 && s.ratio === 0, "倒れたあとも、戦闘中は 0 の状態で残る(HUD 側が数フレームで隠す)");
    FCs(w).end("test"); assert.equal(HUD(w).getHudState(), null, "戦闘の終了(勝利・撤退)で消える");
    w = bossWorld(); setEnemyHp(w, 200); w.frames(2); assert.equal(HUD(w).getHudState().phaseIndex, 2); FCs(w).end("retreat"); assert.equal(HUD(w).getHudState(), null);
    w = bossWorld(); w.enterMap(4, 12, 25); w.frames(3); assert.equal(HUD(w).getHudState(), null, "マップ移動で消える");
    // 再入場(同じ世界で、戦闘をやり直す。HPを戻して付け直す)
    w = bossWorld(); setEnemyHp(w, 200); w.frames(100); FCs(w).end("x"); setEnemyHp(w, 500); assert.equal(FCs(w).begin().ok, true);
    assert.equal(FCs(w).attachEnemy(ID, { strong: "dev_miniboss", chase: false }).ok, true); w.frames(2); s = HUD(w).getHudState(); assert.equal(s.phaseIndex, 1); assert.equal(s.hp, 500); assert.equal(s.transition, false);
});

test("読むだけ: HUD の plugin は、ゲームの状態(HP・フェーズ・攻撃・ダメージ・セーブ)を変えない。既存の plugin(FieldCombat・強敵・CombatExtrasHUD・BattleHUD)は変えていない", () => {
    const src = read("js/plugins/ProjectR_FieldBossHud.js").replace(/\/\*[\s\S]*?\*\//, "");
    assert.ok(!/UpdateEventHp|setHp\(|gainHp\(|setValue\(|callCommand|reserveCommonEvent|StorageManager|saveObject|\.update\(\{|detachEnemy|attachEnemy|\.interrupt\(|(api|FieldStrongEnemy|fc)\.clear\(/.test(src), "状態を変える呼び出しがない(描画の clear は除く)");
    assert.ok(!/[?]{2}=|\|\|=|\.at\(|replaceAll|#[a-z]\w*\s*[=;(]/.test(src), "NW.js 0.48 で使えない構文を含まない");
    const w = bossWorld(); const before = JSON.stringify([hpNow(w), SE(w).getPhase(ID), SE(w).diagnostics().serial, w.ctx.$gameParty.leader().hp]);
    for (let i = 0; i < 30; i++) { HUD(w).getHudState(); } assert.equal(JSON.stringify([hpNow(w), SE(w).getPhase(ID), SE(w).diagnostics().serial, w.ctx.$gameParty.leader().hp]), before, "getHudState は何も変えない");
    for (const f of ["js/plugins/ProjectR_CombatExtrasHUD.js", "js/plugins/ProjectR_BattleHUD.js", "js/plugins/ProjectR_FieldStrongEnemy.js", "js/plugins/ProjectR_FieldCombat.js"]) assert.ok(!/FieldBossHud/.test(read(f)), f + " は HUD を知らない(読み出し専用の plugin)");
});
