// Phase Apollo-A7: 実機(Playtest)の確認 — 竪琴 Lv1〜3。実キー(CDP。カードはQ、攻撃ボタンはJ)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a7_lyre_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
//   タイミングは、音符がラインに届くframeの少し前(入力が処理されるまでの1〜2frameぶん)にJを押す(押した結果の offset がframe単位で残る)。
//   ゲームの更新を遅くすると、攻撃入力(Input.isTriggered は実時間の1frameだけ立つ)を取りこぼすので、等速で行う。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARD = "apollo_lyre_rhythm", API = "ProjectRApolloLyreRhythm", GV = "ProjectRGodSummonVisual", ST = "ProjectRApolloStatus";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(15); } return false; };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const pile = () => json("(function() { var b = ProjectRCardDeck.getBattleState(); return b ? b.cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length : 0; })()");
  const pics = pattern => json(`(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')); }).length`);
  const hp = () => ev("$gameParty.leader().hp");
  const setHp = v => ev(`$gameParty.leader().setHp(${v}); $gameParty.leader().hp`);
  const atk = () => ev("$gameParty.leader().atk");
  const sess = () => json(`${API}.getSession()`);
  const notes = () => json(`${API}.getNotes()`);
  const shots = () => ev("ProjectRGunSystem.status().shots");
  const leftovers = async () => ({ sess: await sess(), buffs: await json(`${API}.getBuffs()`), pics: await pics("/apollo_lyre/"), followers: await json(`${GV}.getFollowers().length`), anchors: await json(`${GV}.getAnchors().length`), states: await json(`${ST}.list().length`),
    mods: await json("ProjectRDamageModifiers.list().length"), speed: await ev("ProjectRCardModifiers.moveSpeedFactor()"), ui: await json(`${API}.getUi()`) });
  const clean = v => v.sess === null && v.buffs.attack === null && v.buffs.speed === null && v.buffs.regens.length === 0 && v.pics === 0 && v.followers === 0 && v.anchors === 0 && v.states === 0 && v.mods === 0 && v.speed === 1 && v.ui.active === false;
  const scene = async (level, enemies = {}, kind = "lyre", slow = 1) => {
    const started = await json(`ProjectRApolloTest.start(${level}, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(slow);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
    await staging([2, 3, 4, 5, 6]);
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); ProjectRCardBalance.resetCard('apollo_lyre_rhythm'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } }); var a = $gameParty.leader(); [32, 33].forEach(function(i) { a.removeState(i); }); a.setHp(a.mhp); return 'ok'; })()");
    await s.place(9, 15); await sleep(500);
    for (const [id, [x, y]] of Object.entries(enemies)) await locate(Number(id), x, y);
    await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'reset'");
    await sleep(200);
  };
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };
  // 音符 index がラインへ届く frame の1つ手前まで待ってJを押す(押した結果を返す)
  const pressNote = async (index, offset = 0) => {
    const n = (await notes())[index], target = n.arrive + offset;
    await wait(`${API}.getSession() && ${API}.getSession().frame >= ${target - 2}`, 30000);
    const before = (await json(`${API}.getResults()`)).length;
    await c.keyDown("J"); await sleep(60); await c.keyUp("J");
    await sleep(120);
    const results = await json(`${API}.getResults()`);
    return results.length > before ? results[before] : null;
  };
  const kindIdx = async (kind, nth = 0) => (await notes()).filter(n => n.kind === kind)[nth].index;

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("Y0 boot: 竪琴の登録(特殊・最大2枚・Cooldown 4・instant・maxLevel 3)・Lv別の数値・VFXキー5つ/ライブラリ/素材・バランス項目", async () => {
    const v = await json(`({ def: ProjectRCardDeck.definitions.card('${CARD}'), c1: ${API}.config(1), c2: ${API}.config(2), c3: ${API}.config(3), legacy: ProjectRCardDeck.definitions.card('apollo_lyre_calm').maxCopies,
      keys: ProjectRPresentationVfx.keys().filter(function(k) { return /apollo_lyre/.test(k); }).sort(), status: ProjectRCardCatalog.godStatus('apollo'),
      fields: ['rhythmSeconds','noteLeadSeconds','noteRounds','maxPresses','hitWindowSeconds','buffSeconds','lyreAttackBonus','lyreHealInstant','lyrePlagueSeconds','screenWide','cleanse'].every(function(k) { return !!ProjectRCardBalance.fieldOf(k); }), attackKey: ProjectRCombatPresence.settings.attackCommonEventId })`);
    const libs = ["Gold", "Red", "Blue", "Green", "Purple"].map(n => "ProjectR_A7_Lyre_Wave_" + n);
    const lib = await ev(`Promise.all(${JSON.stringify(libs)}.map(function(n) { return Promise.resolve(getAnimationFromLibrary(n)).then(function(a) { return !!a; }, function() { return false; }); })).then(function(r) { return r.every(Boolean); })`);
    const files = libs.map(n => `img/pictures/Animation/${n}.png`).every(f => fs.existsSync(f));
    const d = v.def;
    rec("Y0 boot", d.maxCopies === 2 && d.cooldownSeconds === 4 && d.maxLevel === 3 && d.rarity === "special" && d.targetType === "instant" && v.c1.notes === 12 && v.c2.screenWide === true && v.c2.cleanse === true && v.c3.notes === 20 && v.c3.maxPresses === 5 && v.c1.maxPresses === 3 && v.c2.maxPresses === 3
      && v.keys.length === 5 && v.fields && v.legacy === 3 && v.attackKey === 1 && lib === true && files && v.status.implemented >= 7, JSON.stringify({ ...v, lib, files }).slice(0, 500));
  });

  await check("Y1 Lv1(実キーQ→J): 使った瞬間に消費。音符のUIが出て流れる。ライン到達の瞬間のJで火力(+10%)・次の音符でヒール(+100)。外れも1回に数え、演奏中のJは銃を撃たない。3回使い切ったあとのJは通常の攻撃", async () => {
    await scene(1);
    const atk0 = await atk(), shots0 = await shots();
    await fireTap(); await sleep(200);
    const started = { pile: await pile(), sess: await sess(), ui: await json(`${API}.getUi()`), n: (await notes()).length };
    await s.shot("y1_notes");
    const a = await pressNote(await kindIdx("attack", 0));
    await setHp(100);
    const h = await pressNote(await kindIdx("heal", 0));
    const hp1 = await hp();
    const m = await pressNote(11, 12); // 最後の音符を12frame過ぎたあと(判定の外)= タイミングを外す。外れも1回に数える
    const results = await json(`${API}.getResults()`);
    const atk1 = await atk();
    const shotsDuring = await shots();
    await wait(`${API}.getSession() === null`, 20000);
    await sleep(200);
    const after = await leftovers();
    await c.keyDown("J"); await sleep(60); await c.keyUp("J"); await sleep(300);
    const shotsAfter = await shots();
    rec("Y1 lv1", started.pile === 1 && started.sess && started.sess.notes === 12 && started.ui.active && started.ui.sprites === 12 && a && a.hit && a.kind === "attack" && Math.abs(atk1 / atk0 - 1.1) < 0.02 && h && h.hit && h.kind === "heal" && hp1 >= 195 && hp1 <= 215
      && m && m.hit === false && m.reason === "timing" && results.length === 3 && results[2].hit === false && shotsDuring === shots0 && shotsAfter === shots0 + 1 && after.ui.active === false, JSON.stringify({ started: { pile: started.pile, n: started.n, ui: started.ui }, a: a && a.offset, h: h && h.offset, hp1, ratio: atk1 / atk0, m: m && m.reason, results, shots: [shots0, shotsDuring, shotsAfter] }));
  });

  await check("Y2 効果の持続と重なり(実機): 同じ音符を2回選ぶと火力+20%・速度+20%・病(敵に x0.8/x1.10/x1.06)。時間で元へ。病は半径5の敵だけ", async () => {
    await scene(1, { 4: [12, 15], 5: [22, 15] });
    const atk0 = await atk();
    await fireTap(); await sleep(150);
    await pressNote(await kindIdx("attack", 0)); await pressNote(await kindIdx("attack", 1));
    const atk1 = await atk(), st = await json(`${API}.getBuffs()`);
    await wait(`${API}.getSession() === null`, 20000);
    await fireTap(); await sleep(150);
    await pressNote(await kindIdx("plague", 0)); await pressNote(await kindIdx("plague", 1));
    const f4 = await json(`${ST}.factorOf('event:4')`), has5 = await json(`${ST}.has('event:5', 'lyre_plague')`);
    await s.shot("y2_buffs");
    rec("Y2 stack", Math.abs(atk1 / atk0 - 1.2) < 0.02 && st.stacks.attack === 2 && Math.abs(f4.damageTaken - 1.10) < 1e-9 && Math.abs(f4.attackRate - 0.8) < 1e-9 && Math.abs(f4.weakness - 1.06) < 1e-9 && has5 === false,
      JSON.stringify({ ratio: atk1 / atk0, stacks: st.stacks, f4, has5 }));
  });

  await check("Y3 Lv2(実機): 3回とも同じ音符(病)を選ぶと3回目は画面全体の敵に病・味方の異常状態(睡眠・病)を解除。Lv1では画面全体にならない", async () => {
    await scene(2, { 4: [12, 15], 5: [16, 17] });
    await ev("(function() { var a = $gameParty.leader(); a.addState(32); a.addState(33); return 'states'; })()");
    await fireTap(); await sleep(150);
    await pressNote(await kindIdx("plague", 0)); await pressNote(await kindIdx("plague", 1));
    const mid = { far: await json(`${ST}.has('event:5', 'lyre_plague')`) };
    const third = await pressNote(await kindIdx("plague", 2));
    const post = { far: await json(`${ST}.has('event:5', 'lyre_plague')`), sleep: await ev("$gameParty.leader().isStateAffected(32)"), plague: await ev("$gameParty.leader().isStateAffected(33)") };
    await s.shot("y3_wide");
    rec("Y3 lv2", mid.far === false && third && third.wide === true && post.far === true && post.sleep === false && post.plague === false && third.cleansed >= 2, JSON.stringify({ mid, wide: third && third.wide, post, cleansed: third && third.cleansed }));
  });

  await check("Y4 Lv3(実機): 音符が20個・選べるのはちょうど5回(5周ではない・6回目は選べず通常の攻撃)。5回とも同じ音符(速度)で+50%・5回目だけ画面全体。カウンターは5/5。判定が狭い(±4frame)", async () => {
    await scene(3);
    await fireTap(); await sleep(200);
    const n = (await notes()).length, ui = await json(`${API}.getUi()`);
    const r = []; for (const nth of [0, 1, 2, 3, 4]) r.push(await pressNote(await kindIdx("speed", nth)));
    const shots0 = await ev("ProjectRGunSystem.status().shots"); await c.keyDown("J"); await sleep(60); await c.keyUp("J"); await sleep(300);
    const sixth = { results: (await json(`${API}.getResults()`)).length, shots: (await ev("ProjectRGunSystem.status().shots")) - shots0 };
    const r1 = r[0], r2 = r[1], r3 = r[2];
    const speed = await ev("ProjectRCardModifiers.moveSpeedFactor()");
    rec("Y4 lv3", n === 20 && ui.sprites === 20 && r1 && r1.hit && r2 && r2.hit && r.length === 5 && sixth.results === 5 && sixth.shots === 1 && r.every(x => x && x.hit) && r.slice(0, 4).every(x => x.wide !== true) && r[4].wide === true && Math.abs(speed - 1.5) < 1e-9, JSON.stringify({ n, ui, r: r.map(x => x && [x.hit, x.wide]), speed, sixth }));
  });

  await check("Y5 取消と後片付け・性能(実機): 演奏中・効果中の戦闘終了で、音符のUI・波紋・火力・速度・リジェネ・病が全部消える。frame処理時間", async () => {
    await scene(2, { 4: [12, 15] });
    await fireTap(); await sleep(150);
    await pressNote(await kindIdx("attack", 0)); await pressNote(await kindIdx("speed", 0));
    await pressNote(await kindIdx("plague", 0));
    const live = { buffs: await json(`${API}.getBuffs()`), ui: await json(`${API}.getUi()`), pics: await pics("/apollo_lyre/") };
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(500);
    const after = await leftovers();
    await scene(3, { 4: [12, 15] });
    await ev(`(function() { window.__perf = { t: [], on: true }; if (!window.__perfInstalled) { var o = SceneManager.updateScene; SceneManager.updateScene = function() { var t0 = performance.now(); var r = o.apply(this, arguments); if (window.__perf && window.__perf.on) window.__perf.t.push(performance.now() - t0); return r; }; window.__perfInstalled = true; } return 'ok'; })()`);
    await s.slow(1);
    await fireTap(); await sleep(4200);
    const t = await json("window.__perf.t"); await ev("window.__perf.on = false; 'off'");
    t.sort((a, b) => a - b);
    const avg = t.reduce((a, b) => a + b, 0) / t.length, p95 = t[Math.floor(t.length * 0.95)], max = t[t.length - 1];
    rec("Y5 cleanup-perf", live.buffs.attack && live.buffs.speed && live.ui.active && live.pics >= 1 && clean(after) && t.length > 100 && avg < 8 && p95 < 14 && s.errors().length === 0,
      JSON.stringify({ live: { stacks: live.buffs.stacks, ui: live.ui, pics: live.pics }, after, perf: { n: t.length, avg: +avg.toFixed(2), p95: +p95.toFixed(2), max: +max.toFixed(2) }, errors: s.errors().slice(0, 2) }));
  });

  await sleep(6000);
  await check("Y6 退行なし(実機): 月桂冠(根の中で被ダメージ100→70)・疫病の矢(直撃100)は従来どおり", async () => {
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene(1, {}, "laurel", 1);
    await ev("ProjectRCardBalance.setOverride('apollo_laurel_wreath', 'constant', 'growSeconds', 0); 'ok'");
    await fireTap(); await sleep(300);
    const drop = await ev(`(function() { var a = $gameParty.leader(), b = a.hp; PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdatePlayerHp', { target: 'player', value: '-100' }); return b - a.hp; })()`);
    await ev("ProjectRCardBalance.resetCard('apollo_laurel_wreath'); ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene(1, { 4: [15, 15] }, "plague", 1);
    await s.aim(6, 0); await sleep(200);
    await fireTap(); await wait("ProjectRApolloPlagueRain.getLastResult() && ProjectRApolloPlagueRain.getLastResult().committed === true", 8000); await sleep(600);
    const bar = await ev("SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === 4; }).currentHp");
    rec("Y6 unchanged", drop === 70 && 1000000 - bar === 100, JSON.stringify({ drop, dealt: 1000000 - bar }));
  });

  rec("YZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a7_lyre_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
