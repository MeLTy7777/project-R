// Phase Apollo-A7: CDPの入力を使わない(OSレベルのキー/マウス入力)Playtest。新Apollo 6枚のうち代表の3枚の「本物の入力」確認:
//   ギガース殺し(実カーソルで狙い、実キーQ → チャージ → 太い矢で100ダメージ)・竪琴(実キーQで演奏、音符がラインに届く瞬間に実キーJ)・月桂冠(実キーQの根の中で被ダメージ軽減)。
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/apollo_a7_os_input.cjs   (Playtestを --remote-debugging-port=9222 で起動し、前面で実行すること。run_mz.ps1 相当)
//   CDPは「最初の準備(アリーナへ入る・カードの用意)」と「状態の読み取り(観測)」にだけ使い、キー/マウスの入力は一切送りません。
//   入力は os_input.ps1(keybd_event / SetCursorPos)でNW.jsのウィンドウへ送る、実機に近い入力です。これは人間が手で遊ぶ代わりではありません。
const fs = require("fs");
const cp = require("child_process");
const path = require("path");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const PS1 = path.join(__dirname, "os_input.ps1");
const worker = cp.spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS1, "-Action", "server"], { stdio: ["pipe", "pipe", "inherit"] });
let buffer = ""; const waiting = [];
worker.stdout.setEncoding("utf8");
worker.stdout.on("data", chunk => { buffer += chunk; let i; while ((i = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, i).trim(); buffer = buffer.slice(i + 1); const w = waiting.shift(); if (w) w(line); } });
const send = line => new Promise(resolve => { waiting.push(resolve); worker.stdin.write(line + "\n"); });
(async () => {
  const s = await session(); const { ev, rec, sleep } = s;
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  const canvas = await json("(function() { var r = Graphics._canvas.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height, gw: Graphics.width, gh: Graphics.height, dpr: window.devicePixelRatio }; })()");
  await send("focus"); await sleep(500);
  const origin = JSON.parse(await send("origin"));
  const toScreen = (cx, cy) => ({ x: Math.round(origin.x + (canvas.left + cx * canvas.w / canvas.gw) * canvas.dpr), y: Math.round(origin.y + (canvas.top + cy * canvas.h / canvas.gh) * canvas.dpr) });
  const cal = { x: 0, y: 0 };
  const mouseTile = async (x, y) => { const d = await json("({ x: $gameMap.displayX(), y: $gameMap.displayY(), tw: $gameMap.tileWidth(), th: $gameMap.tileHeight() })"); const p = toScreen((x - d.x) * d.tw, (y - d.y) * d.th); await send("move " + (p.x + cal.x) + " " + (p.y + cal.y)); await sleep(80); };
  { const want = toScreen(960, 540); await send("move " + want.x + " " + want.y); await sleep(150); const got = await json("({ x: TouchInput.x, y: TouchInput.y })"); cal.x = 960 - got.x; cal.y = 540 - got.y; console.log("calibration", cal); }
  const start = async (level, kind) => {
    await ev(`ProjectRApolloTest.start(${level}, '${kind}'); 'ok'`); await sleep(500);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; ProjectRApolloStatus.clear('os'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; e.locate(40 - id, 3); }); var a = $gameParty.leader(); [32, 33].forEach(function(i) { a.removeState(i); }); a.setHp(a.mhp); 'ok'");
    await ev("$gamePlayer.locate(9, 15); $gamePlayer._realX = 9; $gamePlayer._realY = 15; $gamePlayer.center(9, 15); 'ok'"); await sleep(600);
    await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'ok'");
  };
  const lost = async id => 1000000 - await barHp(id);
  const cooldown = async () => { await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500); };

  // OS1 ギガース殺し Lv1: 実カーソルで右6マスの敵を狙い、実キーQ → 未消費のチャージ → 太い矢 → 100ダメージ(命中で1回だけ消費)
  await start(1, "gigas");
  await ev("$gameMap.event(4).locate(15, 15); 'ok'"); await sleep(300);
  await mouseTile(15.5, 15.5); await sleep(120);
  await send("tap Q 80"); await sleep(200);
  const early = { pile: await json("ProjectRCardDeck.getBattleState().cooldownPile.length"), phase: (await json("ProjectRApolloGigasSlayer.getShots()"))[0]?.phase, arrows: await json("$gameMap.events().filter(function(e) { return e && /projectRGigasArrow/.test(e.event().note || ''); }).length") };
  await s.shot("os1_charge");
  await wait("ProjectRApolloGigasSlayer.getLastResult() && ProjectRApolloGigasSlayer.getLastResult().committed === true", 8000); await sleep(500);
  rec("OS1 実カーソル+実キーQ(ギガース殺し Lv1): チャージ中は未消費・矢なし → 太い矢が敵に当たって100ダメージ・消費は1回・弱点状態", early.pile === 0 && early.phase === "charge" && early.arrows === 0 && (await lost(4)) === 100
    && (await json("ProjectRCardDeck.getBattleState().cooldownPile.length")) === 1 && (await json("ProjectRApolloStatus.has('event:4', 'gigas_weak')")) === true, JSON.stringify({ early, lost: await lost(4) }));
  await cooldown();

  // OS2 竪琴 Lv1: 実キーQで演奏 → 最初の火力の音符がラインに届く直前に実キーJ → 攻撃力+10%。外れ(演奏中のJ)は銃を撃たない
  await start(1, "lyre");
  const atk0 = await ev("$gameParty.leader().atk"), shots0 = await ev("ProjectRGunSystem.status().shots");
  await send("tap Q 80"); await sleep(150);
  await wait("ProjectRApolloLyreRhythm.getSession() && ProjectRApolloLyreRhythm.getSession().frame >= 33", 8000);
  await send("tap J 60"); await sleep(250);
  const results = await json("ProjectRApolloLyreRhythm.getResults()");
  const atk1 = await ev("$gameParty.leader().atk"), shotsMid = await ev("ProjectRGunSystem.status().shots");
  await s.shot("os2_notes");
  rec("OS2 実キーQ→J(竪琴 Lv1): 音符がラインに届く瞬間のJで火力の音符(攻撃力+10%)。演奏中のJは銃を撃たない", results.length === 1 && results[0].hit && results[0].kind === "attack" && Math.abs(atk1 / atk0 - 1.1) < 0.02 && shotsMid === shots0, JSON.stringify({ results: results.map(r => [r.hit, r.kind, r.offset]), ratio: atk1 / atk0, shots: [shots0, shotsMid] }));
  await wait("ProjectRApolloLyreRhythm.getSession() === null", 8000);
  await send("tap J 60"); await sleep(400);
  const shotsAfter = await ev("ProjectRGunSystem.status().shots");
  rec("OS3 演奏が終わると実キーJは通常の攻撃(銃)へ戻る", shotsAfter === shots0 + 1, JSON.stringify({ shots: [shots0, shotsAfter] }));
  await cooldown();

  // OS4 月桂冠 Lv1: 実キーQの根の中で被ダメージ100→70(根の外=等倍)。実キーDで歩くと根が残って増える
  await start(1, "laurel");
  await send("tap Q 80"); await sleep(300);
  const inDrop = await ev("(function() { var a = $gameParty.leader(), b = a.hp; PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdatePlayerHp', { target: 'player', value: '-100' }); return b - a.hp; })()");
  await send("keydown D"); await sleep(1500); await send("keyup D"); await sleep(300);
  const patches = await json("ProjectRApolloLaurelWreath.getPatches().length");
  await s.shot("os4_roots");
  rec("OS4 実キーQ/D(月桂冠 Lv1): 根の中で被ダメージ100→70。歩くと根のパッチが増える", inDrop === 70 && patches >= 2, JSON.stringify({ inDrop, patches }));
  await cooldown();

  const leftover = await json("({ arrows: $gameMap.events().filter(function(e) { return e && /projectRGigasArrow|projectRLaurelRoot|projectRHyacinth/.test(e.event().note || ''); }).length, pics: (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /apollo_(laurel|lyre|plague|hyacinth|oracle|charge|volley)/.test(String(p.note || '')); }).length, anchors: ProjectRGodSummonVisual.getAnchors().length, followers: ProjectRGodSummonVisual.getFollowers().length, summons: ProjectRGodSummonManager.getActiveSummons().length, lyre: ProjectRApolloLyreRhythm.getUi().active })");
  rec("OS5 終わると、矢・根のEvent・VFX・Apollo・錨・音符のUIが全部消える", leftover.arrows === 0 && leftover.pics === 0 && leftover.anchors === 0 && leftover.followers === 0 && leftover.summons === 0 && leftover.lyre === false, JSON.stringify(leftover));
  const stuckOs = JSON.parse(await send("keys")); await sleep(300);
  const stuckPage = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("OS6 押されたままのキーがない(OS側・ゲーム側とも)", stuckOs.length === 0 && stuckPage.length === 0, { stuckOs, stuckPage });
  rec("OSZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  worker.stdin.write("quit" + String.fromCharCode(10)); worker.stdin.end();
  fs.writeFileSync(`${OUT}/apollo_a7_os_input_results.json`, JSON.stringify({ note: "CDPの入力を使わないOSレベルの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
