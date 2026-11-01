// Phase Apollo-A4: CDPの入力を使わない(OSレベルのキー/マウス入力)Playtest。黄金の矢の「本物の入力」確認: 実カーソルで狙い、実キーのQで発射。
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/apollo_a4_os_input.cjs   (Playtestを --remote-debugging-port=9222 で起動し、前面で実行すること。run_mz.ps1 相当)
//   CDPは「最初の準備(アリーナへ入る・カードの用意)」と「状態の読み取り(観測)」にだけ使い、キー/マウスの入力は一切送りません。
//   入力は os_input.ps1(keybd_event / SetCursorPos)でNW.jsのウィンドウへ送る、実機に近い入力です。これは人間が手で遊ぶ代わりではありません。
const fs = require("fs");
const cp = require("child_process");
const path = require("path");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const PS1 = path.join(__dirname, "os_input.ps1");
const CARD = "apollo_golden_volley", API = "ProjectRApolloGoldenVolley";
const worker = cp.spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS1, "-Action", "server"], { stdio: ["pipe", "pipe", "inherit"] });
let buffer = ""; const waiting = [];
worker.stdout.setEncoding("utf8");
worker.stdout.on("data", chunk => { buffer += chunk; let i; while ((i = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, i).trim(); buffer = buffer.slice(i + 1); const w = waiting.shift(); if (w) w(line); } });
const send = line => new Promise(resolve => { waiting.push(resolve); worker.stdin.write(line + "\n"); });
const near = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const s = await session(); const { ev, rec, sleep } = s;
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  await ev("ProjectRApolloTest.start(2); 'ok'"); await sleep(400);
  await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; [2,3,4,5,6].forEach(function(id) { $gameMap.event(id).locate(40 - id, 3); }); 'ok'");
  await ev("$gamePlayer.locate(9, 15); $gamePlayer._realX = 9; $gamePlayer._realY = 15; $gamePlayer.center(9, 15); $gameMap.event(4).locate(14, 15); 'ok'"); await sleep(700);
  await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); 'ok'");
  // 観測(読み取りだけ): プレイヤーの入力が requestUseCard を呼んだ回数と結果。入力は送らない。
  await ev(`(function() {
    window.__obs = { uses: [] };
    var deck = ProjectRCardDeck, orig = deck.requestUseCard;
    deck.requestUseCard = function(i) { var r = orig.apply(this, arguments); window.__obs.uses.push({ index: i, ok: !!(r && r.ok), pending: !!(r && r.pending), detail: r && r.detail }); return r; };
    return 'obs';
  })()`);
  const canvas = await json("(function() { var r = Graphics._canvas.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height, gw: Graphics.width, gh: Graphics.height, dpr: window.devicePixelRatio }; })()");
  await send("focus"); await sleep(500);
  const origin = JSON.parse(await send("origin"));
  const toScreen = (cx, cy) => ({ x: Math.round(origin.x + (canvas.left + cx * canvas.w / canvas.gw) * canvas.dpr), y: Math.round(origin.y + (canvas.top + cy * canvas.h / canvas.gh) * canvas.dpr) });
  const cal = { x: 0, y: 0 };
  const mouseTile = async (x, y) => { const d = await json("({ x: $gameMap.displayX(), y: $gameMap.displayY(), tw: $gameMap.tileWidth(), th: $gameMap.tileHeight() })"); const p = toScreen((x - d.x) * d.tw, (y - d.y) * d.th); await send("move " + (p.x + cal.x) + " " + (p.y + cal.y)); await sleep(80); };
  const obs = () => json("window.__obs");
  { const want = toScreen(960, 540); await send("move " + want.x + " " + want.y); await sleep(150); const got = await json("({ x: TouchInput.x, y: TouchInput.y })"); cal.x = 960 - got.x; cal.y = 540 - got.y; console.log("calibration", cal); }
  await ev("$gamePlayer.center($gamePlayer._realX, $gamePlayer._realY); 'ok'"); await sleep(200);
  const player = await json("({ x: $gamePlayer.screenX(), y: $gamePlayer.screenY() })");

  // OS1: OSカーソルを右の敵へ → Qを1回 → 3本(Lv2は5本)。実カーソルの方向へ飛び、命中で1回だけ消費
  await mouseTile(14.5, 15.5);
  const aimed = await json("({ x: TouchInput.x, y: TouchInput.y })");
  const aimDeg = ((Math.atan2(aimed.y - player.y, aimed.x - player.x) * 180 / Math.PI + 450) % 360);
  await send("tap Q 70");
  await sleep(120);
  const mid = await json(`({ pending: ${API}.getPending(), arrows: ${API}.getActiveArrows().map(function(a) { return a.degree; }), thick: ${API}.getActiveArrows().filter(function(a) { return a.thick; }).length })`);
  await s.shot("os1_flight");
  await mouseTile(4.5, 15.5); // 発射後にカーソルを反対側へ(追尾しない)
  await sleep(1200);
  const hit = 1000 - await barHp(4), o1 = await obs();
  const last = await json(`${API}.getLastResult()`);
  const spread = [aimDeg - 30, aimDeg - 15, aimDeg, aimDeg + 15, aimDeg + 30].map(d => Math.round(((d + 360) % 360) * 10) / 10);
  rec("OS1 実カーソル+実キーQ: 5本(Lv2)が狙った方向±15度間隔で出て、カーソルを反対へ動かしても追尾せず命中。消費は命中の1回", o1.uses.length === 1 && o1.uses[0].pending && mid.pending && mid.arrows.length >= 1
    && mid.arrows.every(d => spread.some(w => near(w, d, 0.2))) && hit >= 50 && last.committed === true && last.hits.length >= 1 && last.hits[0].eventId === 4, JSON.stringify({ aimDeg, spread, mid, hit, uses: o1.uses, hits: last.hits }).slice(0, 500));
  await sleep(5600); // スリップ(5秒)が終わる
  const slip = 1000 - await barHp(4);
  rec("OS2 太い中央の矢のスリップ: 命中50 + 5秒で100 = 150(押しっぱなし・繰り返しなし)", slip === 150 && o1.uses.length === 1, JSON.stringify({ slip }));

  // OS3: 連打(2回を素早く)→ 確定待ちの間は2発目を受け付けない
  await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); $gameMap.event(4).locate(14, 15); 'ok'"); await sleep(3500);
  await mouseTile(14.5, 15.5);
  const before = (await obs()).uses.length;
  await send("tap Q 50"); await sleep(40); await send("tap Q 50"); await sleep(40); await send("tap Q 50");
  await sleep(150);
  const midCount = await json("$gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length");
  await sleep(1500);
  const o3 = await obs(), uses = o3.uses.slice(before);
  const dealt = 1000 - await barHp(4);
  rec("OS3 Qを素早く3回押しても、矢は1回分(5本)だけ。2・3回目は確定待ちで拒否(volleyPending)、消費は1回、ダメージは1発分", midCount <= 5 && uses.length === 3 && uses[0].pending && uses.slice(1).every(u => !u.ok && !u.pending && u.detail === "volleyPending") && dealt >= 50 && dealt < 100 + 1, JSON.stringify({ midCount, uses, dealt }));

  // OS4: 外れ(敵のいない方向)→ カードは消費されない
  await ev("$gameMap.event(4).locate(37, 3); 'ok'"); await sleep(3500);
  const pile0 = await json("ProjectRCardDeck.getBattleState().cooldownPile.length");
  await mouseTile(9.5, 9.5);
  await send("tap Q 70"); await sleep(2500);
  const pile1 = await json("ProjectRCardDeck.getBattleState().cooldownPile.length"), r4 = await json(`${API}.getLastResult()`);
  rec("OS4 敵のいない方向へ撃つと外れ: カードは消費されず(Cooldownに入らない)、矢は残らない", r4.reason === "missed" && pile1 === pile0 && (await json("$gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length")) === 0, JSON.stringify({ pile0, pile1, reason: r4.reason }));

  const stuckOs = JSON.parse(await send("keys")); await sleep(300);
  const stuckPage = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("OS5 押されたままのキーがない(OS側・ゲーム側とも)", stuckOs.length === 0 && stuckPage.length === 0, { stuckOs, stuckPage });
  rec("OSZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  worker.stdin.write("quit" + String.fromCharCode(10)); worker.stdin.end();
  fs.writeFileSync(`${OUT}/apollo_a4_os_input_results.json`, JSON.stringify({ note: "CDPの入力を使わないOSレベルの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
