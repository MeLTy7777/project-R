// Phase Apollo-A9: CDPの入力を使わない(OSレベルのキー入力)Playtest — 竪琴 Lv3「3秒間に合計5回まで選べる」。
//   OS1: 実キーQ → 音符が20個流れる(5周ではない・選べるのは5回)・UIのカウンターが 0/5。ライン到達の瞬間の実キーJを5回(同じ速度の音符) → 移動速度x1.5・5回目だけ画面全体。カウンター 5/5。
//   OS2: 6回目の実キーJは音符を選ばず、通常の攻撃(銃)が撃たれる。
//   OS3: 外した実キーJ(タイミングが合わない)も1回に数える: 3回外したあと、残りの2回しか選べない(合計5回)。
//   OS4: 終わると、音符のUI・錨・召喚・押されたままのキーが残らない。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a9_os_input.cjs   (Playtestを --remote-debugging-port=9222 で起動し、前面で実行すること。run_mz.ps1 相当)
//   CDPは「準備(アリーナへ入る・カードの用意)」と「状態の読み取り」にだけ使い、キーの入力は一切送らない。入力は os_input.ps1(keybd_event)でNW.jsへ送る。人間の手動プレイの代わりではない。
const fs = require("fs");
const cp = require("child_process");
const path = require("path");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const PS1 = path.join(__dirname, "os_input.ps1");
const API = "ProjectRApolloLyreRhythm";
const worker = cp.spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS1, "-Action", "server"], { stdio: ["pipe", "pipe", "inherit"] });
let buffer = ""; const waiting = [];
worker.stdout.setEncoding("utf8");
worker.stdout.on("data", chunk => { buffer += chunk; let i; while ((i = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, i).trim(); buffer = buffer.slice(i + 1); const w = waiting.shift(); if (w) w(line); } });
const send = line => new Promise(resolve => { waiting.push(resolve); worker.stdin.write(line + "\n"); });
(async () => {
  const s = await session(); const { ev, rec, sleep } = s;
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(15); } return false; };
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  await send("focus"); await sleep(500);
  const start = async () => {
    await ev("ProjectRApolloTest.start(3, 'lyre'); 'ok'"); await sleep(500);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; e.locate(40 - id, 3); }); 'ok'");
    await ev("$gamePlayer.locate(9, 15); $gamePlayer._realX = 9; $gamePlayer._realY = 15; $gamePlayer.center(9, 15); 'ok'"); await sleep(600);
    await send("focus"); await sleep(400);
  };
  const noteAt = async (kind, nth) => (await json(`${API}.getNotes()`)).filter(n => n.kind === kind)[nth];
  // ライン到達の2frame前まで待って、実キーJを押す
  const pressAtArrival = async note => {
    await wait(`${API}.getSession() && ${API}.getSession().frame >= ${note.arrive - 2}`, 30000);
    await send("tap J 60"); await sleep(200);
  };
  const cooldown = async () => { await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500); };

  // OS1
  await start();
  const shots0 = await ev("ProjectRGunSystem.status().shots"), speed0 = await ev("ProjectRCardModifiers.moveSpeedFactor()");
  await send("tap Q 80"); await sleep(250);
  const notes = await json(`${API}.getNotes()`), ui0 = await json(`${API}.getUi()`);
  if (notes.length === 0) { const diag = await json(`({ session: ${API}.getSession(), hand: ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; }), last: ${API}.getLastResult(), keys: Object.keys(Input._currentState) })`); rec("OS0 実キーQで演奏が始まった", false, JSON.stringify({ diag, focus: String(await send("fg")) })); process.exit(1); }
  const perKind = { attack: 0, speed: 0, heal: 0, plague: 0 }; notes.forEach(n => { perKind[n.kind]++; });
  for (let k = 0; k < 5; k++) await pressAtArrival(await noteAt("speed", k));
  const results = await json(`${API}.getResults()`), ui5 = await json(`${API}.getUi()`);
  const speed5 = await ev("ProjectRCardModifiers.moveSpeedFactor()");
  await s.shot("os1_five");
  rec("OS1 実キーQ→J x5(竪琴 Lv3): 音符は各種類5個の計20個(5周ではない)・UI 0/5→5/5・5回とも同じ速度の音符で移動x1.5・画面全体は5回目だけ",
    notes.length === 20 && perKind.speed === 5 && perKind.attack === 5 && ui0.counter === "0/5" && ui0.sprites === 20 && results.length === 5 && results.every(r => r.hit && r.kind === "speed")
    && results.slice(0, 4).every(r => r.wide !== true) && results[4].wide === true && ui5.counter === "5/5" && Math.abs(speed5 / speed0 - 1.5) < 1e-6,
    JSON.stringify({ n: notes.length, perKind, ui0: ui0.counter, ui5: ui5.counter, results: results.map(r => [r.hit, r.kind, r.wide]), speed: speed5 / speed0 }));
  // OS2: 6回目は通常の攻撃
  const shotsBefore = await ev("ProjectRGunSystem.status().shots");
  await send("tap J 60"); await sleep(400);
  const shotsAfter = await ev("ProjectRGunSystem.status().shots"), results6 = await json(`${API}.getResults()`), ui6 = await json(`${API}.getUi()`);
  rec("OS2 6回目の実キーJ: 音符は選べず(結果は5件のまま・カウンター5/5)、通常の攻撃(銃)が撃たれる", results6.length === 5 && ui6.counter === "5/5" && shotsAfter === shotsBefore + 1, JSON.stringify({ results: results6.length, ui: ui6.counter, shots: [shotsBefore, shotsAfter] }));
  await cooldown();

  // OS3: 外した押下も1回(3回外す → 残り2回だけ選べる)
  await start();
  await send("tap Q 80"); await sleep(250);
  await wait(`${API}.getSession() && ${API}.getSession().frame >= 6`, 5000);
  for (let k = 0; k < 3; k++) { await send("tap J 60"); await sleep(120); } // まだ音符がラインに無い(外れ)
  const missed = await json(`${API}.getResults()`);
  let hits = 0;
  for (let k = 0; k < 6 && hits < 2; k++) {
    const ns = (await json(`${API}.getNotes()`)).filter(n => n.state === "flowing");
    const cur = await json(`${API}.getSession().frame`);
    const target = ns.find(n => n.arrive > cur + 6);
    if (!target) break;
    await pressAtArrival(target);
    hits = (await json(`${API}.getResults()`)).filter(r => r.hit).length;
  }
  const after = await json(`${API}.getResults()`);
  rec("OS3 外した実キーJ x3も1回に数える: 合計5回まで(外れ3 + 当たり最大2)。6回目以降は選べない", missed.length === 3 && missed.every(r => !r.hit) && after.length <= 5 && after.length >= 4 && after.filter(r => r.hit).length >= 1,
    JSON.stringify({ missed: missed.map(r => r.hit), after: after.map(r => [r.hit, r.kind]) }));
  await cooldown();

  // OS4: 後片付け
  const leftover = await json(`({ ui: ${API}.getUi().active, anchors: ProjectRGodSummonVisual.getAnchors().length, followers: ProjectRGodSummonVisual.getFollowers().length, summons: ProjectRGodSummonManager.getActiveSummons().length, speed: ProjectRCardModifiers.moveSpeedFactor(), session: ${API}.getSession() })`);
  const stuckOs = JSON.parse(await send("keys")); await sleep(300);
  const stuckPage = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("OS4 終わると、音符のUI・錨・召喚・速度の補正・押されたままのキーが残らない", leftover.ui === false && leftover.anchors === 0 && leftover.followers === 0 && leftover.summons === 0 && leftover.speed === 1 && leftover.session === null && stuckOs.length === 0 && stuckPage.length === 0, JSON.stringify({ leftover, stuckOs, stuckPage }));
  rec("OSZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  worker.stdin.write("quit" + String.fromCharCode(10)); worker.stdin.end();
  fs.writeFileSync(`${OUT}/apollo_a9_os_input_results.json`, JSON.stringify({ note: "CDPの入力を使わないOSレベルの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
