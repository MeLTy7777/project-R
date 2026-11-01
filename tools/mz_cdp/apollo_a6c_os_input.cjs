// Phase Apollo-A6C: CDPの入力を使わない(OSレベルのキー/マウス入力)Playtest。エロスの矢 Lv3 の「本物の入力」確認: 実カーソルで狙い、実キーのQ(側面の矢14本+3秒のビーム)。ビームの途中で実カーソルを動かしてビームの向きが追従することを確かめると短押し(扇)・取消。
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/apollo_a6c_os_input.cjs   (Playtestを --remote-debugging-port=9222 で起動し、前面で実行すること。run_mz.ps1 相当)
//   CDPは「最初の準備(アリーナへ入る・カードの用意)」と「状態の読み取り(観測)」にだけ使い、キー/マウスの入力は一切送りません。
//   入力は os_input.ps1(keybd_event / SetCursorPos)でNW.jsのウィンドウへ送る、実機に近い入力です。これは人間が手で遊ぶ代わりではありません。
const fs = require("fs");
const cp = require("child_process");
const path = require("path");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const PS1 = path.join(__dirname, "os_input.ps1");
const CARD = "apollo_eros_arrow", API = "ProjectRApolloErosArrow";
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
  await ev("ProjectRApolloTest.start(3, 'eros'); 'ok'"); await sleep(400);
  await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; [2,3,4,5,6].forEach(function(id) { $gameMap.event(id).locate(40 - id, 3); }); 'ok'");
  await ev("$gamePlayer.locate(9, 15); $gamePlayer._realX = 9; $gamePlayer._realY = 15; $gamePlayer.center(9, 15); $gameMap.event(4).locate(15, 13); 'ok'"); await sleep(700);
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

  const leftover = () => json("({ events: $gameMap.events().filter(function(e) { return e && /projectRErosArrow/.test(e.event().note || ''); }).length, pics: (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /apollo_eros/.test(String(p.note || '')); }).length, followers: ProjectRGodSummonVisual.getFollowers().length, anchors: ProjectRGodSummonVisual.getAnchors().length, summons: ProjectRGodSummonManager.getActiveSummons().length, segs: $gameMap.events().filter(function(e) { return e && /projectRErosBeam/.test(e.event().note || ''); }).length, temp: " + API + ".getTempObjectCount().total, seq: " + API + ".getSequences().length })");
  const pileNow = () => json("ProjectRCardDeck.getBattleState().cooldownPile.length");
  const lostOf = async id => 1000 - await json("(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === " + id + "; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(" + id + "); })()");
  await ev("window.__se = []; (function() { var p = AudioManager.playSe; AudioManager.playSe = function(se) { window.__se.push(se.name); return p.apply(this, arguments); }; })(); 'spy'");
  await ev("$gameMap.event(3).setPosition(15, 15); $gameMap.event(4).setPosition(9, 21); 'ok'"); await sleep(300); // 右6マスと下6マスの敵
  // OS1: 実カーソルで右を狙い、実キーQを短く押す: 側面の矢14本 + 3秒のビーム。右の敵はビームで30tick=240。最初の有効な効果で1回だけ消費
  await mouseTile(15.5, 15.5);
  await send('tap Q 80'); await sleep(400);
  const early = await json(API + ".getSequences()");
  await s.shot('os1_beam');
  await sleep(3800);
  const last = await json(API + ".getLastResult()");
  const log = (await json(API + ".getEmissionLog()")).slice(-14);
  const p = last.beam && last.beam.perTarget;
  rec('OS1 実キーQ(短押し)でLv3: 側面の矢14本(10度・170度付近)と3秒のビーム。右の敵へ30tick=240。消費は1回', early.length === 1 && early[0].beam && early[0].beam.active === true && early[0].committed === true && log.length === 14 && log.every(e => e.direction === 0 || e.direction === 2)
    && last.completed === true && last.beam.ticks === 30 && p.e3 && p.e3.ticks === 30 && p.e3.damage === 240 && (await pileNow()) === 1,
    JSON.stringify({ seq: early.length, beam: early[0] && early[0].beam && early[0].beam.active, n: log.length, e3: p.e3, pile: await pileNow() }));
  await sleep(3500);
  // OS2: ビームの途中で実カーソルを右→下へ動かす: ビームの向きが追従し、右の敵と下の敵の両方に当たる
  await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); 'ok'");
  await sleep(2500);
  await mouseTile(15.5, 15.5); await sleep(150);
  await send('tap Q 80');
  for (let i = 0; i < 400; i++) { const q = await json(API + ".getSequences()"); if (q.length && q[0].tick >= 70) break; await sleep(8); }
  const h1 = (await json(API + ".getBeam()")).heading;
  await mouseTile(9.5, 21.5); await sleep(250);
  const h2 = (await json(API + ".getBeam()")).heading;
  await s.shot('os2_beam_down');
  await sleep(2600);
  const last2 = await json(API + ".getLastResult()"), p2 = last2.beam.perTarget;
  const nearDeg = (d, v, t = 6) => Math.min(Math.abs(d - v), 360 - Math.abs(d - v)) <= t;
  rec('OS2 ビームの途中で実カーソルを右→下へ動かす: ビームの向きが即追従(約90度→約180度)し、右の敵と下の敵の両方へtickが入る', nearDeg(h1, 86) && nearDeg(h2, 180) && p2.e3 && p2.e4 && p2.e3.ticks >= 5 && p2.e4.ticks >= 5, JSON.stringify({ h1, h2, e3: p2.e3 && p2.e3.ticks, e4: p2.e4 && p2.e4.ticks }));
  await sleep(1500);
  rec('OS3 ビームが終わると、矢のEvent・ビーム区間・VFX・Apollo・錨・召喚が全部消える', JSON.stringify(await leftover()) === JSON.stringify({ events: 0, pics: 0, followers: 0, anchors: 0, summons: 0, segs: 0, temp: 0, seq: 0 }), JSON.stringify(await leftover()));
  const stuckOs = JSON.parse(await send("keys")); await sleep(300);
  const stuckPage = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("OS5 押されたままのキーがない(OS側・ゲーム側とも)", stuckOs.length === 0 && stuckPage.length === 0, { stuckOs, stuckPage });
  rec("OSZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  worker.stdin.write("quit" + String.fromCharCode(10)); worker.stdin.end();
  fs.writeFileSync(`${OUT}/apollo_a6c_os_input_results.json`, JSON.stringify({ note: "CDPの入力を使わないOSレベルの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
