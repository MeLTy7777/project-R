// Phase Apollo-A5C: CDPの入力を使わない(OSレベルのキー/マウス入力)Playtest。黄金の矢 Lv3 の長押し中のチャージ演出の「本物の入力」確認: 実カーソルで狙い、実キーのQの長押し(チャージ→ビーム)と短押し(扇)・取消。
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/apollo_a5c_os_input.cjs   (Playtestを --remote-debugging-port=9222 で起動し、前面で実行すること。run_mz.ps1 相当)
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

  const leftover = () => json("({ followers: ProjectRGodSummonVisual.getFollowers().length, anchors: ProjectRGodSummonVisual.getAnchors().length, charge: " + API + ".getCharge().active, draw: ProjectRCharacterPresentation.isActive('ArmDraw'), jobs: " + API + ".getActiveVfxJobs().length })");
  const arrowsNow = () => json("$gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length");
  const pileNow = () => json("ProjectRCardDeck.getBattleState().cooldownPile.length");
  await ev("window.__se = []; (function() { var p = AudioManager.playSe; AudioManager.playSe = function(se) { window.__se.push(se.name); return p.apply(this, arguments); }; })(); 'spy'");
  // OS1: 実キーQを0.9秒押し続ける: チャージが出て(Apollo・構え・光)、満タンの合図が1回。押している間は矢もビームも出ず、消費もしない。離すとビーム
  await mouseTile(14.5, 15.5);
  await send('keydown Q'); await sleep(300);
  const mid = await json("({ charge: " + API + ".getCharge(), followers: ProjectRGodSummonVisual.getFollowers().map(function(f) { return f.godId; }), draw: ProjectRCharacterPresentation.isActive('ArmDraw') })");
  await s.shot('os1_charge_mid');
  await sleep(500);
  const ready = await json("({ charge: " + API + ".getCharge(), bell: window.__se.filter(function(n) { return n === 'Bell1'; }).length })");
  await s.shot('os1_charge_ready');
  const during = { arrows: await arrowsNow(), beam: await json(API + ".getBeam()"), pile: await pileNow(), dmg: 1000 - await barHp(4) };
  await send('keyup Q'); await sleep(150);
  const fired = { beam: await json(API + ".getBeam() !== null || " + API + ".getBeamLog().length === 1"), left: await leftover() };
  await sleep(1800);
  const hits = await json(API + ".getLastResult().targets");
  rec('OS1 実キーQの長押し(0.8秒): チャージ(Apollo・構え・光)→満タンの合図1回→離すとビーム。押している間は矢・ビーム・ダメージ・消費なし。離すとチャージは外れる', mid.charge.active && mid.followers.indexOf('apollo') >= 0 && mid.draw === true && ready.charge.ready === true && ready.bell === 1
    && during.arrows === 0 && during.beam === null && during.pile === 0 && during.dmg === 0 && fired.beam === true && fired.left.charge === false && fired.left.draw === false && fired.left.followers === 0 && hits && hits[0].hits === 11 && (await pileNow()) === 1,
    JSON.stringify({ mid: { stage: mid.charge.stage, followers: mid.followers }, ready: ready.bell, during, hits: hits && hits[0] }));
  await sleep(5600);
  // OS2: 取消(ウィンドウのフォーカス喪失): 長押しの途中でフォーカスを失うとチャージは消え、離しても何も出ない
  await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); 'ok'"); await sleep(3500);
  await send('keydown Q'); await sleep(450);
  const activeBefore = await json(API + ".getCharge().active");
  await ev("window.dispatchEvent(new Event('blur')); 'blur'"); await sleep(200);
  const cancelled = await leftover();
  await ev("window.dispatchEvent(new Event('focus')); 'focus'");
  await send('keyup Q'); await sleep(400);
  rec('OS2 長押しの途中のフォーカス喪失: チャージは即座に外れ(Apollo・構え・光・錨なし)、離してもビームも扇も出ず、消費しない', activeBefore === true && cancelled.charge === false && cancelled.draw === false && cancelled.followers === 0 && cancelled.anchors === 0 && (await arrowsNow()) === 0 && (await json(API + ".getBeam()")) === null && (await pileNow()) === 0, // OS1の消費はCooldown(3秒)が明けて、手札へ戻っている。取消では増えない
    JSON.stringify({ activeBefore, cancelled, pile: await pileNow() }));
  // OS3: 短押し(0.1秒)はチャージを出さず、扇(11本)。Qの1回の入力で扇とビームの両方は出ない
  const logBefore = await json(API + ".getChargeLog().length");
  await send('tap Q 100'); await sleep(200);
  const n = await arrowsNow();
  rec('OS3 短押し(0.1秒): チャージの演出は出ず、扇(矢)が出る。ビームは出ない', (await json(API + ".getChargeLog().length")) === logBefore && n >= 1 && n <= 11 && (await json(API + ".getBeam()")) === null && (await leftover()).followers === 0, JSON.stringify({ n }));
  await sleep(3000);
  const stuckOs = JSON.parse(await send("keys")); await sleep(300);
  const stuckPage = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("OS5 押されたままのキーがない(OS側・ゲーム側とも)", stuckOs.length === 0 && stuckPage.length === 0, { stuckOs, stuckPage });
  rec("OSZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  worker.stdin.write("quit" + String.fromCharCode(10)); worker.stdin.end();
  fs.writeFileSync(`${OUT}/apollo_a5c_os_input_results.json`, JSON.stringify({ note: "CDPの入力を使わないOSレベルの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
