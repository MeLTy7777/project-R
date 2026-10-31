// Phase 属性・バランス: 実機(Playtest)の確認 — 属性有効度(固定ダメージ/武器/スキル弾/多段)・計算順・弱点修飾・バランス設定のJSON・開発用の上書き(保存/読み込み)・エディタ画面(F6)・セーブ互換
// 使い方: MZ_OUT=<出力> MZ_TMP_DEV=<一時フォルダ> node tools/mz_cdp/balance_verify.cjs
//   新しいゲームはメモリ上に作り、セーブしない。属性の特徴は $dataEnemies/$dataWeapons/$dataSkills のメモリ上のコピーだけに足し、最後に戻す(ファイルは書かない)。
//   開発用の保存先は MZ_TMP_DEV(一時フォルダ)だけ。本物のsave/ と data/ には書かない。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const path = require("path");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const TMP_DEV = process.env.MZ_TMP_DEV;
const near = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  if (!TMP_DEV) throw new Error("MZ_TMP_DEV(一時フォルダ)を指定してください");
  fs.mkdirSync(TMP_DEV, { recursive: true });
  const s = await session(); const { ev, c, rec, sleep } = s;
  const only = process.env.MZ_ONLY ? new RegExp(process.env.MZ_ONLY) : null; // 例: MZ_ONLY="^R13" で1項目だけ再実行
  const check = async (id, fn) => { if (only && !only.test(id)) return; try { await fn(); } catch (e) {
    const where = await ev("'scene ' + SceneManager._scene.constructor.name + ' map ' + $gameMap.mapId() + ' player ' + $gamePlayer._realX + ',' + $gamePlayer._realY + ' sx ' + $gamePlayer.screenX() + ' editorOpen ' + ProjectRCardBalanceEditor.isOpen()").catch(x => String(x));
    rec(id + " (script error)", false, String(e.message).slice(0, 200) + " @ " + where); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const start = async (card, lv) => { const r = await ev(`JSON.stringify(ProjectRHermesTest.start(${JSON.stringify(card)}, ${lv}))`); await sleep(400); await s.slow(1); return JSON.parse(r); };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const settle = n => s.sceneFrames(n || 10);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const HOME = { 2: [44, 6], 3: [37, 15], 4: [10, 15], 5: [12, 15], 6: [11, 17] };
  const goHome = async () => { for (const [id, [x, y]] of Object.entries(HOME)) await locate(Number(id), x, y); await settle(); };
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(v === null ? "Math.random = window.__r0 || Math.random; 'off'" : `window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const equip = id => ev(`$gameParty.leader().forceChangeEquip(0, $dataWeapons[${id}]); 'eq'`);
  const lost = async id => 1000 - await barHp(id);
  const B = "ProjectRCardBalance";
  const FIRE = 2, ICE = 3, LIGHT = 8;

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000); // isDatabaseLoaded()がtrueを返すとHendrixが敵名キャッシュを作る。作る前にイベントを作ると敵の初期化が失敗する // 起動直後はセーブ一覧(_globalInfo)の読み込みが終わっていないことがある。メモリ上だけ空の一覧にする(ファイルは書かない)
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  // 敵(魔獣=敵キャラ5)に弱点/耐性/無効の特徴をメモリ上で足す。終了時に元へ戻す。
  const originalTraits = await json("$dataEnemies[5].traits");
  await ev(`$dataEnemies[5].traits = $dataEnemies[5].traits.concat([{code:11,dataId:${FIRE},value:2},{code:11,dataId:${ICE},value:0.5},{code:11,dataId:${LIGHT},value:0}]); 'traits'`);

  await check("R0 boot: 3つのPluginが読み込まれ、JSONがfsから読めている(source=file)", async () => {
    const st = await json(`${B}.status()`);
    rec("R0 balance ready from file", st.ready && st.source === "file" && st.cards === 7, JSON.stringify(st));
    rec("R0b Elements / Editor が存在する(Playtest)", await ev("!!(ProjectRElements && ProjectRCardBalanceEditor && ProjectRCardBalance.isPlaytest())"), "");
    const ids = await json(`${B}.cardIds()`);
    rec("R0c 7枚のランタイムID", ids.length === 7 && ids.every(i => /^hermes_/.test(i)), ids.join(","));
  });

  await check("R1 既定値がJSON化の前の値と同じ(Lv別効果・クールダウン・定数)", async () => {
    const v = await json(`({ sweep: [1,2,3].map(function(l) { return ${B}.effects('hermes_sweep', l); }), issen3: ${B}.effects('hermes_issen', 3), veil3: ${B}.effects('hermes_veil', 3),
      psy3: ${B}.effects('hermes_psychopomp', 3), cd: ['hermes_issen','hermes_sweep','hermes_zetsu','hermes_reed_flute'].map(function(i) { return ProjectRCardDeck.definitions.card(i).cooldownSeconds; }),
      sweepC: ['arcDegrees','radiusTiles','tipTiles'].map(function(k) { return ${B}.constant('hermes_sweep', k); }) })`);
    const ok = JSON.stringify(v.sweep) === JSON.stringify([{ damage: 50 }, { damage: 50, tipBonus: 50 }, { damage: 50, tipBonus: 50, criticalChanceBonus: 0.5 }])
      && v.issen3.directDamage === 200 && v.issen3.splitTotal === 100 && v.issen3.slowFactor === 0.5 && v.veil3.radiusTiles === 5 && v.veil3.criticalChanceBonus === 0.5
      && v.psy3.healAmount === 150 && v.psy3.attackBonus === 0.03 && JSON.stringify(v.cd) === JSON.stringify([7, 0.5, 0.5, 8]) && JSON.stringify(v.sweepC) === JSON.stringify([190, 4, 1]);
    rec("R1 defaults", ok, JSON.stringify(v));
  });

  await check("R2 属性表はMZ標準のDatabase。敵の弱点/耐性/無効はMZの属性有効度(code 11)", async () => {
    const table = await json("ProjectRElements.table().map(function(r) { return r.name; })");
    const sys = await json("$dataSystem.elements");
    rec("R2 table = Database", JSON.stringify(table.slice(1)) === JSON.stringify(sys.slice(1)) && table[0] === "無属性", JSON.stringify(sys));
    const kinds = await json("(function() { var o = {}; ProjectRElements.profile(4).forEach(function(r) { o[r.name] = r.kind; }); return o; })()");
    rec("R2b 炎=弱点 氷=耐性 光=無効 雷=等倍", kinds["炎"] === "weak" && kinds["氷"] === "resist" && kinds["光"] === "immune" && kinds["雷"] === "neutral", JSON.stringify(kinds));
  });

  // 薙ぎ払い(固定ダメージ)で1回撃って敵4の減りを返す
  const sweepOnce = async (lv, enemyX = 12, pre = null) => {
    await start("sweep", lv); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(9, 15); await sleep(500); await locate(4, enemyX, 15); await resetHp(); await sleep(200);
    if (pre) await pre(); // 戦闘開始(start)でリセットされる実行時の状態は、開始の後に整える
    await s.aim(3, 0); await c.tap("Q", 60); await settle(30);
    return lost(4);
  };
  await check("R3 固定ダメージの属性(薙ぎ払い): 無属性50 / 炎(弱点)100 / 氷(耐性)25 / 光(無効)0 / 雷(等倍)50。1ヒットに1回だけ", async () => {
    const got = {};
    for (const [name, element] of [["neutral", 0], ["fire", FIRE], ["ice", ICE], ["light", LIGHT], ["thunder", 4]]) {
      await ev(`${B}.resetAll(); ${B}.setOverride('hermes_sweep', 'constant', 'element', ${element}); 'set'`);
      await ev("ProjectRElements.setLogging(true); ProjectRElements.clearLog(); 'log'");
      got[name] = await sweepOnce(1);
      got[name + "Calls"] = await ev("ProjectRElements.getLog().filter(function(e) { return e.type === 'fixed'; }).length");
    }
    rec("R3 sweep elements", got.neutral === 50 && got.fire === 100 && got.ice === 25 && got.light === 0 && got.thunder === 50 && got.fireCalls === 1 && got.neutralCalls === 0, JSON.stringify(got));
    await ev(`${B}.resetAll(); 'reset'`);
  });

  await check("R4 計算順: 基礎×属性→クリティカル(×3)→加算。Lv2先端+50は属性もクリティカルも受けない(弱点クリティカル 100×3+50=350)", async () => {
    await ev(`${B}.resetAll(); ${B}.setOverride('hermes_sweep', 'constant', 'element', ${FIRE}); 'set'`);
    await start("sweep", 2); await random(0); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(9, 15); await sleep(500); await locate(4, 12.5, 15); await resetHp(); await sleep(200);
    await s.aim(3, 0); await c.tap("Q", 60); await settle(30);
    const dealt = await lost(4);
    rec("R4 weak+crit+tip", dealt === 350, `dealt=${dealt}`);
    await ev(`${B}.resetAll(); 'reset'`);
  });

  await check("R5 通常の武器攻撃(実際の剣): 炎の剣 × 炎に弱い敵 = 物理の約2倍(属性は1回だけ)", async () => {
    await start("sweep", 1); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(9, 15); await sleep(500); await locate(4, 10, 15); await equip(2); await resetHp(); await sleep(300);
    const attack = async () => { const f = await s.foot(); await c.pointer(f.x + 48, f.y - 24); await sleep(120); await c.tap("J", 120); await settle(8); };
    await attack(); const physical = await lost(4); await settle(30); await resetHp();
    const swordTraits = await json("$dataWeapons[2].traits");
    await ev(`$dataWeapons[2].traits = $dataWeapons[2].traits.filter(function(t) { return t.code !== 31; }).concat([{code:31,dataId:${FIRE},value:0}]); 'fire sword'`);
    await attack(); const fire = await lost(4); await settle(30); await resetHp();
    await ev(`$dataWeapons[2].traits = ${JSON.stringify(swordTraits)}; 'restore'`);
    rec("R5 weapon element", physical > 0 && near(fire, physical * 2, 1), `physical=${physical} fire=${fire}`);
  });

  await check("R6 多段(一閃): 直接200と分割3回の各ヒットに属性が1回ずつ → 弱点で500 / 耐性で126 / 無属性250", async () => {
    const run = async element => {
      await ev(`${B}.resetAll(); ${element ? `${B}.setOverride('hermes_issen', 'constant', 'element', ${element});` : ""} 'set'`);
      await start("issen", 1); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
      await s.place(9, 15); await sleep(500); await locate(4, 13, 15); await resetHp(); await sleep(200);
      await ev("ProjectRElements.setLogging(true); ProjectRElements.clearLog(); 'log'");
      await s.aim(4, 0); await c.tap("Q", 60); await settle(60 * 4 + 20);
      return { lost: await lost(4), calls: await ev("ProjectRElements.getLog().filter(function(e) { return e.type === 'fixed'; }).length") };
    };
    const neutral = await run(0), fire = await run(FIRE), ice = await run(ICE);
    rec("R6 issen multi-hit", neutral.lost === 250 && fire.lost === 500 && fire.calls === 4 && ice.lost === 126, JSON.stringify({ neutral, fire, ice }));
    await ev(`${B}.resetAll(); 'reset'`);
  });

  await check("R7 弱点ダメージ修飾(将来のカード用): 弱点(炎)のときだけ ×1.5。耐性(氷)・無属性は変わらず、戦闘終了で外れる", async () => {
    const addMod = () => ev("ProjectRElements.addWeaknessModifier('test.weak', 1.5); 'mod'");
    await ev(`${B}.resetAll(); ${B}.setOverride('hermes_sweep', 'constant', 'element', ${FIRE}); 'set'`);
    const fire = await sweepOnce(1, 12, addMod);
    await ev(`${B}.setOverride('hermes_sweep', 'constant', 'element', ${ICE}); 'ice'`);
    const ice = await sweepOnce(1, 12, addMod);
    await ev(`ProjectRCombatTestArena.endTest && ProjectRCombatTestArena.endTest(); ProjectRHermesTest.end(); 'end'`).catch(() => {});
    const left = await json("ProjectRElements.weaknessModifiers()");
    rec("R7 weakness modifier", fire === 150 && ice === 25 && left.length === 0, JSON.stringify({ fire, ice, left }));
    await ev(`${B}.resetAll(); 'reset'`);
  });

  await check("R8 バランス設定の上書き: 薙ぎ払いLv1のダメージを80に → 実機で80。Lv2/3へ引き継ぎ、リセットで50に戻る。発動中の効果は変わらない(ヴェイルの半径)", async () => {
    await ev(`${B}.resetAll(); ${B}.setOverride('hermes_sweep', 1, 'damage', 80); 'set'`);
    const tuned = await sweepOnce(1);
    await ev(`${B}.resetAll(); 'reset'`);
    const back = await sweepOnce(1);
    rec("R8 damage override then reset", tuned === 80 && back === 50, `tuned=${tuned} back=${back}`);
    await start("veil", 1); await random(0.9); await s.aim(2, 0); await c.tap("Q", 60); await settle(20);
    const before = await json("ProjectRHermesVeil.getActive().map(function(r) { return r.effects.radiusTiles; })");
    await ev(`${B}.setOverride('hermes_veil', 1, 'radiusTiles', 9); 'set'`);
    await settle(20);
    const during = await json("ProjectRHermesVeil.getActive().map(function(r) { return r.effects.radiusTiles; })");
    rec("R8b 発動中の値は変わらない", before.length === 1 && before[0] === 5 && during[0] === 5, JSON.stringify({ before, during }));
    await ev(`${B}.resetAll(); 'reset'`);
  });

  await check("R9 開発用の保存/読み込み(実ファイル): 製品のJSONとは別。保存→全リセット→読み込みで復元。製品のJSONはバイト不変", async () => {
    const prodFile = path.join(process.cwd(), "data", "ProjectR_CardBalance.json");
    const before = fs.readFileSync(prodFile);
    const file = path.join(TMP_DEV, "ProjectR_CardBalance.dev.json").replace(/\\/g, "/");
    await ev(`${B}.setDevFile(${JSON.stringify(file)}); ${B}.resetAll(); ${B}.setOverride('hermes_sweep', 1, 'damage', 90); ${B}.setOverride('hermes_issen', 2, 'splitTotal', 120); ${B}.setOverride('hermes_zetsu', 'cooldown', 'cooldownSeconds', 0.8); 'set'`);
    const saved = await json(`${B}.saveDev()`);
    const onDisk = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
    await ev(`${B}.resetAll(); 'reset'`);
    const cleared = await json(`({ d: ${B}.effects('hermes_sweep', 1).damage, cd: ProjectRCardDeck.definitions.card('hermes_zetsu').cooldownSeconds })`);
    const loaded = await json(`${B}.loadDev()`);
    const after = await json(`({ d: ${B}.effects('hermes_sweep', 1).damage, s: ${B}.effects('hermes_issen', 2).splitTotal, cd: ProjectRCardDeck.definitions.card('hermes_zetsu').cooldownSeconds })`);
    rec("R9 save/load roundtrip", saved.ok && saved.count === 3 && onDisk && onDisk.kind === "ProjectR_CardBalance.dev" && cleared.d === 50 && cleared.cd === 0.5 && loaded.ok && after.d === 90 && after.s === 120 && after.cd === 0.8, JSON.stringify({ saved, cleared, loaded, after }));
    const unsafe = await json(`(function() { ${B}.setDevFile(${JSON.stringify(path.join(TMP_DEV, "evil.xlsx").replace(/\\/g, "/"))}); return ${B}.saveDev(); })()`);
    rec("R9b ワークブック形式(.xlsx)や製品JSONへの保存は拒否", unsafe.reason === "unsafeDevPath" && !fs.existsSync(path.join(TMP_DEV, "evil.xlsx")), JSON.stringify(unsafe));
    rec("R9c 製品のdata/ProjectR_CardBalance.jsonは変わっていない", before.equals(fs.readFileSync(prodFile)), "");
    await ev(`${B}.resetAll(); 'reset'`);
  });

  await check("R10 セーブ互換: 上書きがあってもセーブ内容は同一で、バランス設定のキーがセーブに入らない", async () => {
    // 1回の同期評価で前後を取る(間にゲームが進むとフレームカウンタだけが変わるため)
    const pair = await json(`(function() { var a = JSON.stringify(DataManager.makeSaveContents());
      ${B}.setOverride('hermes_sweep', 1, 'damage', 66); ${B}.setOverride('hermes_issen', 'constant', 'element', 2);
      var b = JSON.stringify(DataManager.makeSaveContents()); return [a, b]; })()`);
    const clean = pair[0], dirty = pair[1];
    const diffs = [];
    const walk = (a, b, p) => { if (diffs.length > 8) return; if (a && b && typeof a === "object" && typeof b === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], p + "/" + k); } else if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(p + ": " + JSON.stringify(a) + " -> " + JSON.stringify(b)); };
    walk(JSON.parse(clean), JSON.parse(dirty), "");
    rec("R10 save identical", clean === dirty && !clean.includes("ProjectRCardBalance") && !clean.includes("overrides"), `len=${clean.length} diffs=${diffs.join(" | ")}`);
    await ev(`${B}.resetAll(); 'reset'`);
  });

  await check("R11 エディタ画面(F6): 開くとゲームが止まり、7枚が選べ、値を変えて適用/拒否/個別リセットでき、F6で閉じると再開する", async () => {
    await start("sweep", 1); await sleep(300);
    await ev("(function() { if (!window.__muHook) { window.__muHook = true; window.__mu = 0; var u = Scene_Map.prototype.update; Scene_Map.prototype.update = function() { window.__mu++; return u.apply(this, arguments); }; } return 'hook'; })()");
    await sleep(500);
    const frames0 = await ev("window.__mu"); // 開く前にゲームが動いている(更新が進んでいる)ことの確認用
    await c.tap("F6", 80); await sleep(500);
    const open = await ev("!!document.querySelector('[data-projectr-balance-editor]') && ProjectRCardBalanceEditor.isOpen() && ProjectRCardBalanceEditor.isPaused()");
    const sceneFrames0 = await ev("window.__mu"); await sleep(600); const sceneFrames1 = await ev("window.__mu");
    rec("R11 open + paused", open && sceneFrames1 === sceneFrames0 && frames0 > 10, `open=${open} Scene_Map.update ${sceneFrames0}->${sceneFrames1}`);
    const options = await ev("document.querySelector('[data-role=card]').options.length");
    rec("R11b 7枚が選べる", options === 7, "options=" + options);
    await ev("(function() { var sel = document.querySelector('[data-role=card]'); sel.value = 'hermes_sweep'; sel.dispatchEvent(new Event('change')); return 'ok'; })()");
    await sleep(200);
    await ev("(function() { var b = Array.prototype.find.call(document.querySelectorAll('[data-scope]'), function(x) { return x.getAttribute('data-scope') === '1' && x.tagName === 'BUTTON'; }); b.click(); return 'lv1'; })()");
    await sleep(200);
    await s.shot("balance_editor_lv1");
    // 値を書き換えて Enter(実キー)
    const typeInto = async (scope, key, text) => {
      await ev(`(function() { var i = document.querySelector('input[data-scope="${scope}"][data-key="${key}"]'); i.focus(); i.select(); return 'focused'; })()`);
      await c.send("Input.insertText", { text }); await c.tap("Enter", 60); await sleep(250);
    };
    await typeInto("1", "damage", "75");
    const applied = await json(`({ v: ${B}.effects('hermes_sweep', 1).damage, msg: document.querySelector('[data-role=message]').textContent, count: document.querySelector('[data-role=count]').textContent })`);
    rec("R11c 適用: 値が変わり、件数とメッセージが出る", applied.v === 75 && /75/.test(applied.msg) && /1 件/.test(applied.count), JSON.stringify(applied));
    await s.shot("balance_editor_applied");
    await typeInto("1", "damage", "7.5");
    const rejected = await json(`({ v: ${B}.effects('hermes_sweep', 1).damage, msg: document.querySelector('[data-role=message]').textContent, shown: document.querySelector('input[data-scope="1"][data-key="damage"]').value })`);
    rec("R11d 小数は拒否され、画面の値も元(75)に戻る", rejected.v === 75 && /整数/.test(rejected.msg) && rejected.shown === "75", JSON.stringify(rejected));
    await typeInto("1", "damage", "abc");
    const bad2 = await json(`({ v: ${B}.effects('hermes_sweep', 1).damage, msg: document.querySelector('[data-role=message]').textContent })`);
    rec("R11e 数値でない入力は拒否", bad2.v === 75 && /数値/.test(bad2.msg), JSON.stringify(bad2));
    const orig = await json(`(function() { var rows = ProjectRCardBalanceEditor.viewModel('hermes_sweep', 1).rows.filter(function(r) { return r.key === 'damage'; }); return { original: rows[0].original, current: rows[0].current, modified: rows[0].modified }; })()`);
    rec("R11f 元の値と現在の値が両方見える", orig.original === 50 && orig.current === 75 && orig.modified === true, JSON.stringify(orig));
    await ev("(function() { var b = Array.prototype.find.call(document.querySelectorAll('button'), function(x) { return x.textContent === '戻す'; }); b.click(); return 'reset one'; })()"); await sleep(250);
    rec("R11g 項目ごとの「戻す」で元の50", await ev(`${B}.effects('hermes_sweep', 1).damage === 50 && ${B}.overrideCount() === 0`), "");
    await typeInto("1", "damage", "60");
    await ev("(function() { var b = Array.prototype.find.call(document.querySelectorAll('button'), function(x) { return x.textContent === 'このカードをリセット'; }); b.click(); return 'reset card'; })()"); await sleep(250);
    rec("R11h 「このカードをリセット」", await ev(`${B}.overrideCount() === 0 && ${B}.effects('hermes_sweep', 1).damage === 50`), "");
    await ev("document.querySelector('[data-projectr-balance-editor]').dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true })); 'w'");
    await c.tap("F6", 80); await sleep(500);
    const closed = await ev("!document.querySelector('[data-projectr-balance-editor]') && !ProjectRCardBalanceEditor.isOpen() && !ProjectRCardBalanceEditor.isPaused()");
    const f1 = await ev("window.__mu"); await sleep(500); const f2 = await ev("window.__mu");
    rec("R11i F6で閉じるとゲームが再開する", closed && f2 > f1, `closed=${closed} frames ${f1}->${f2}`);
  });

  await check("R12 エディタで変えた値が実際の発動に効く(次の発動から): 画面で薙ぎ払いLv1=80 → 実機のカードで80ダメージ", async () => {
    await start("sweep", 1); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(9, 15); await sleep(500); await locate(4, 12, 15); await resetHp(); await sleep(200);
    await c.tap("F6", 80); await sleep(400);
    await ev("(function() { var sel = document.querySelector('[data-role=card]'); sel.value = 'hermes_sweep'; sel.dispatchEvent(new Event('change')); return 'ok'; })()"); await sleep(150);
    await ev("(function() { var b = Array.prototype.find.call(document.querySelectorAll('button[data-scope]'), function(x) { return x.getAttribute('data-scope') === '1'; }); b.click(); return 'lv1'; })()"); await sleep(150);
    await ev("(function() { var i = document.querySelector('input[data-scope=\"1\"][data-key=\"damage\"]'); i.focus(); i.select(); return 'f'; })()");
    await c.send("Input.insertText", { text: "80" }); await c.tap("Enter", 60); await sleep(250);
    await c.tap("F6", 80); await sleep(400);
    await s.aim(3, 0); await c.tap("Q", 60); await settle(30);
    const dealt = await lost(4);
    rec("R12 UI→実戦", dealt === 80, `dealt=${dealt}`);
    await ev(`${B}.resetAll(); 'reset'`);
  });

  await check("R13 Apollo黄金の弓矢(スキル弾の経路): Databaseスキルの属性が弾のダメージに1回だけ効く(炎のスキル × 炎に弱い敵 ≈ 2倍)", async () => {
    await ev("ProjectRHermesTest.end(); 'end'").catch(() => {});
    await sleep(300);
    const started = await json("ProjectRCombatTestArena.startApollo()");
    await s.slow(1); await sleep(400);
    if (!started.ok) { rec("R13 apollo start", false, JSON.stringify(started)); return; }
    await random(0.9);
    const KEYS = ["Q", "E", "X", "C", "V"];
    // 手札の黄金の弓矢の位置(Q/E/X/C/V)を探して、そのキーで撃つ。他のカードは使わない(継続ダメージなどが計測に混ざらないように)。
    const shoot = async key => {
      await goHome(); await staging([2, 3, 4, 5, 6]);
      await s.place(9, 15); await sleep(500); await locate(4, 13, 15); await resetHp(); await sleep(200);
      await s.aim(4, 0); await c.tap(key, 60); await settle(90);
      return lost(4);
    };
    const handOf = () => json("ProjectRCardDeck.getBattleState().hand.map(function(x) { return x.cardId; })");
    const hand = await handOf();
    const neutral = await shoot(KEYS[hand.indexOf("apollo_golden_arrow")]); await settle(40);
    await ev(`$dataSkills[236].damage.elementId = ${FIRE}; 'fire skill'`);
    let weak = 0; const trace = [];
    for (let i = 0; i < 40 && !weak; i++) {
      const h = await handOf(); trace.push(h.map(x => x.replace(/^(apollo|hermes)_/, "")).join("/"));
      const index = h.indexOf("apollo_golden_arrow");
      if (index >= 0) { weak = await shoot(KEYS[index]); continue; }
      // 山札から黄金の弓矢が手札に戻るまで、他のカードを敵のいない所で使って手札を回す(敵は遠くへ退避・左へ狙う。葦笛は対象がいないと消費されないので避ける)
      await goHome(); await staging([2, 3, 4, 5, 6]);
      const spare = h.findIndex(x => x !== "hermes_reed_flute_sleep");
      await s.aim(-4, 0); await c.tap(KEYS[spare], 60); await settle(60);
    }
    await ev("$dataSkills[236].damage.elementId = 0; 'restore'");
    rec("R13 skill-projectile element", neutral > 0 && weak > 0 && near(weak, neutral * 2, 2), `hand=${hand.join(",")} neutral=${neutral} fire=${weak} ratio=${(weak / neutral).toFixed(2)} trace=${trace.slice(-2).join(" ; ")}`);
  });

  // 後片付け
  await ev(`$dataEnemies[5].traits = ${JSON.stringify(originalTraits)}; ${B}.resetAll(); ProjectRElements.clearWeaknessModifiers(); 'cleanup'`);
  const errs = await s.errors();
  rec("Z コンソールエラーなし", errs.length === 0, errs.slice(0, 3).join(" | ").slice(0, 400));
  const failed = s.results.filter(r => !r.ok);
  fs.writeFileSync(path.join(OUT, "balance_verify.json"), JSON.stringify({ total: s.results.length, failed: failed.length, results: s.results }, null, 1));
  console.log(`DONE total=${s.results.length} failed=${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(2); });
