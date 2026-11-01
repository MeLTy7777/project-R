// Phase Apollo-A6B: CDPの入力を使わない(OSレベルのキー/マウス入力)Playtest。エロスの矢 Lv2 の「本物の入力」確認: 実カーソルで狙い、実キーのQ(3方向x7本=21本)。連射の途中で実カーソルを動かして方向転換と短押し(扇)・取消。
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/apollo_a6b_os_input.cjs   (Playtestを --remote-debugging-port=9222 で起動し、前面で実行すること。run_mz.ps1 相当)
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
  await ev("ProjectRApolloTest.start(2, 'eros'); 'ok'"); await sleep(400);
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

  const leftover = () => json("({ events: $gameMap.events().filter(function(e) { return e && /projectRErosArrow/.test(e.event().note || ''); }).length, pics: (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /apollo_eros/.test(String(p.note || '')); }).length, followers: ProjectRGodSummonVisual.getFollowers().length, anchors: ProjectRGodSummonVisual.getAnchors().length, summons: ProjectRGodSummonManager.getActiveSummons().length, temp: " + API + ".getTempObjectCount().total, seq: " + API + ".getSequences().length })");
  const pileNow = () => json("ProjectRCardDeck.getBattleState().cooldownPile.length");
  const lostOf = async id => 1000 - await json("(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === " + id + "; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(" + id + "); })()");
  const place3 = async r => { const p = [[0, 90], [1, 10], [2, 170]]; const ids = [3, 4, 5]; for (let i = 0; i < 3; i++) { const h = p[i][1] * Math.PI / 180; await ev("$gameMap.event(" + ids[i] + ").setPosition(" + (9.5 + r * Math.sin(h) - 0.5) + ", " + (15.5 - r * Math.cos(h) - 0.5) + "); 'ok'"); } };
  await ev("window.__se = []; (function() { var p = AudioManager.playSe; AudioManager.playSe = function(se) { window.__se.push(se.name); return p.apply(this, arguments); }; })(); 'spy'");
  await place3(6); await sleep(300);
  // OS1: 実カーソルで右を狙い、実キーQを短く押す: 予約→最初の命中で1回消費。3方向(狙い・左右80度)へ7本ずつ=21本が1秒で出て、3方向の敵へ各7本=140ずつ(合計420)
  await mouseTile(15.5, 15.5);
  const handBefore = await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })");
  await send('tap Q 80'); await sleep(250);
  const early = { pile: await pileNow(), seq: await json(API + ".getSequences()"), pending: await json(API + ".isPending()") };
  await s.shot('os1_firing');
  await sleep(2800);
  const last = await json(API + ".getLastResult()");
  const log = (await json(API + ".getEmissionLog()")).slice(-21);
  const first = log.filter(e => e.slot === 0).map(e => Math.round(e.degree));
  rec('OS1 実キーQ(短押し)でLv2: 3方向x7本=21本が60更新以内に出て、狙い・左右80度へ。3方向の敵へ各7本(各140・合計420)。最初の命中で1回だけ消費', early.seq.length === 1 && early.pending === true && early.pile === 0 && log.length === 21 && JSON.stringify([...new Set(log.map(e => e.tick))]) === "[0,8,17,25,34,42,51]"
    && near(first[0], 10, 5) && near(first[1], 86, 6) && near(first[2], 170, 5) && last.committed === true && last.completed === true && last.hits.length === 21 && (await lostOf(3)) === 140 && (await lostOf(4)) === 140 && (await lostOf(5)) === 140 && (await pileNow()) === 1 && handBefore.filter(x => x === CARD).length === 5,
    JSON.stringify({ early: { pile: early.pile, seq: early.seq.length }, ticks: [...new Set(log.map(e => e.tick))], first, hits: last.hits.length, lost: [await lostOf(3), await lostOf(4), await lostOf(5)], pile: await pileNow() }));
  await sleep(3500);
  // OS2: 連射の途中で実カーソルを動かす: 最初の数回は右、あとの回は真上を中心にした3方向へ
  await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); 'ok'");
  for (const id of [3, 4, 5]) await ev("$gameMap.event(" + id + ").setPosition(" + (30 + id) + ", 3); 'ok'");
  await sleep(5500);
  await mouseTile(15.5, 15.5); await sleep(150);
  await send('tap Q 80');
  for (let i = 0; i < 300; i++) { const q = await json(API + ".getSequences()"); if (q.length && q[0].tick >= 26) break; await sleep(8); }
  await mouseTile(9.5, 10.5); // 真上
  await sleep(2200);
  const log2 = (await json(API + ".getEmissionLog()")).slice(-21);
  const aims = [0, 1, 2, 3, 4, 5, 6].map(sl => Math.round(log2.filter(e => e.slot === sl)[0].aim));
  const nearDeg = (d, v, t = 6) => Math.min(Math.abs(d - v), 360 - Math.abs(d - v)) <= t;
  rec('OS2 連射の途中で実カーソルを動かす: あとの発射の時刻の3方向は新しい狙い(右→真上)を中心に計算し直される', log2.length === 21 && nearDeg(aims[0], 86) && nearDeg(aims[2], 86) && nearDeg(aims[6], 0) && new Set(aims).size >= 2, JSON.stringify({ aims }));
  await sleep(2500);
  rec('OS3 連射が終わると、矢のEvent・VFX・Apollo・錨・召喚が全部消える', JSON.stringify(await leftover()) === JSON.stringify({ events: 0, pics: 0, followers: 0, anchors: 0, summons: 0, temp: 0, seq: 0 }), JSON.stringify(await leftover()));
  const stuckOs = JSON.parse(await send("keys")); await sleep(300);
  const stuckPage = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("OS5 押されたままのキーがない(OS側・ゲーム側とも)", stuckOs.length === 0 && stuckPage.length === 0, { stuckOs, stuckPage });
  rec("OSZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  worker.stdin.write("quit" + String.fromCharCode(10)); worker.stdin.end();
  fs.writeFileSync(`${OUT}/apollo_a6b_os_input_results.json`, JSON.stringify({ note: "CDPの入力を使わないOSレベルの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
