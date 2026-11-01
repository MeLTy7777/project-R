// Phase Apollo-A5A: CDPの入力を使わない(OSレベルのキー/マウス入力)Playtest。黄金の矢 Lv3 の「本物の入力」確認: 実カーソルで狙い、実キーのQの短押し(扇)と長押し(ビーム予約)。
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/apollo_a5a_os_input.cjs   (Playtestを --remote-debugging-port=9222 で起動し、前面で実行すること。run_mz.ps1 相当)
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
  await ev("ProjectRApolloTest.start(3); 'ok'"); await sleep(400);
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

  // OS1: Lv3 tap(OSカーソル + 実キーQを短く) → 11本・10度刻み。離した時のカーソル方向が中心。発射後にカーソルを動かしても追尾しない
  await mouseTile(14.5, 15.5);
  const aimed = await json('({ x: TouchInput.x, y: TouchInput.y })');
  const aimDeg = ((Math.atan2(aimed.y - player.y, aimed.x - player.x) * 180 / Math.PI + 450) % 360);
  await send('keydown Q'); await sleep(150);
  const held = await json(API + '.getActiveArrows().length');
  await send('keyup Q'); await sleep(120);
  const mid = await json('({ pending: ' + API + '.getPending(), n: ' + API + '.getActiveArrows().length })');
  await s.shot('os1_fan');
  await mouseTile(4.5, 15.5);
  await sleep(1500);
  const hit = 1000 - await barHp(4), o1 = await obs(), last = await json(API + '.getLastResult()');
  const want = Array.from({ length: 11 }, (_, i) => Math.round(((aimDeg + (i - 5) * 10 + 360) % 360) * 100) / 100);
  rec('OS1 Lv3 tap(実カーソル+実キーQ): 押している間は撃たず、離すと11本が離した時のカーソル方向±10度刻みで出て、カーソルを動かしても追尾せず命中。消費は1回', held === 0 && o1.uses.length === 1 && o1.uses[0].pending && mid.pending
    && JSON.stringify(mid.pending.degrees.map(d => Math.round(d * 100) / 100)) === JSON.stringify(want) && hit >= 50 && last.committed === true && last.arrows === 11, JSON.stringify({ aimDeg, held, mid: mid.n, hit, uses: o1.uses }).slice(0, 400));
  await sleep(5600);
  // OS2: Lv3 hold(0.7秒) → ビームの分岐 = 安全に失敗(未実装)。消費なし・扇なし
  await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); $gameMap.event(4).locate(14, 15); 'ok'"); await sleep(3500);
  await mouseTile(14.5, 15.5);
  const pile0 = await json('ProjectRCardDeck.getBattleState().cooldownPile.length'), before = (await obs()).uses.length;
  await send('keydown Q'); await sleep(750); await send('keyup Q'); await sleep(500);
  const o2 = await obs(), pile1 = await json("ProjectRCardDeck.getBattleState().cooldownPile.length"), ev2 = await json("$gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length");
  rec('OS2 Lv3 hold(0.75秒): 離しても扇は出ず、カードは消費されずCooldownも始まらない(ビーム未実装 = beamUnavailable)', o2.uses.length === before + 1 && !o2.uses[before].ok && o2.uses[before].detail === 'beamUnavailable' && pile1 === pile0 && ev2 === 0 && (await json(API + '.getBeamAttempts().length')) === 1, JSON.stringify({ use: o2.uses[before], pile0, pile1, ev2 }));
  // OS3: 直後のtapは普通に扇を撃てる(状態が汚れていない)。確定待ちの間の素早い2回目は拒否
  await send('tap Q 60'); await sleep(100); await send('tap Q 60'); await sleep(150);
  const o3 = await obs(), n3 = await json("$gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length");
  rec('OS3 holdの後すぐ別の入力のtap → 扇(11本)。確定待ちの間のもう1回は volleyPending で拒否され、矢は増えない', n3 <= 11 && n3 >= 1 && o3.uses[before + 1].pending && o3.uses[before + 2].detail === 'volleyPending', JSON.stringify({ n3, uses: o3.uses.slice(before) }));
  await sleep(3000);
  const stuckOs = JSON.parse(await send("keys")); await sleep(300);
  const stuckPage = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("OS5 押されたままのキーがない(OS側・ゲーム側とも)", stuckOs.length === 0 && stuckPage.length === 0, { stuckOs, stuckPage });
  rec("OSZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  worker.stdin.write("quit" + String.fromCharCode(10)); worker.stdin.end();
  fs.writeFileSync(`${OUT}/apollo_a5a_os_input_results.json`, JSON.stringify({ note: "CDPの入力を使わないOSレベルの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
