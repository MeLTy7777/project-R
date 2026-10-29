// Phase H2B-3A: CDPの入力を使わない(OSレベルのキー/マウス入力)Playtest。「動作が意図せず繰り返されないか」の確認。
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/h3a_manual_os_input.cjs   (Playtestを --remote-debugging-port=9222 で起動済みであること)
//   CDPは「最初の準備(アリーナへ入る・カードの用意)」と「状態の読み取り(観測)」にだけ使い、キー/マウスの入力は一切送りません。
//   入力は os_input.ps1(keybd_event / SetCursorPos)でNW.jsのウィンドウへ送る、実機に近い入力です。これは人間が手で遊ぶ代わりではありません。
const fs = require("fs");
const cp = require("child_process");
const path = require("path");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const PS1 = path.join(__dirname, "os_input.ps1");
// 長く生きるPowerShellの作業プロセス(1コマンド=1行)。起動のたびのAdd-Type(約0.5秒)を避け、入力のタイミングを実際の操作に近づける。
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
  await ev("DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  await ev("ProjectRHermesTest.start('veil', 3); 'ok'"); await sleep(400);
  await ev("[2,3,4,5,6].forEach(function(id) { $gameMap.event(id).locate(40 - id, 3); }); $gameMap.event(4).locate(13, 25); 'ok'");
  await ev("$gamePlayer.locate(12, 25); $gamePlayer._realX = 12; $gamePlayer._realY = 25; $gamePlayer.center(12, 25); $gameParty.leader().forceChangeEquip(0, $dataWeapons[2]); 'ok'"); await sleep(600);
  await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 100000; b.refresh(); }); 'ok'");
  // 観測(読み取りだけ): カード使用の呼び出し回数・動作の変化・剣の回数。入力は送らない。
  await ev(`(function() {
    window.__obs = { uses: [], actions: [], last: '' };
    var deck = ProjectRCardDeck, orig = deck.requestUseCard;
    deck.requestUseCard = function(i) { var r = orig.apply(this, arguments); window.__obs.uses.push({ t: Date.now(), index: i, ok: !!(r && r.ok), cardId: r && r.cardId }); return r; };
    setInterval(function() { var n = ProjectRCharacterPresentation.activeNames().join(','); if (n !== window.__obs.last) { window.__obs.actions.push({ t: Date.now(), names: n }); window.__obs.last = n; } }, 25);
    return 'obs';
  })()`);
  const canvas = await json("(function() { var r = Graphics._canvas.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height, gw: Graphics.width, gh: Graphics.height, dpr: window.devicePixelRatio }; })()");
  await send("focus"); await sleep(500);
  const origin = JSON.parse(await send("origin"));
  const toScreen = (cx, cy) => ({ x: Math.round(origin.x + (canvas.left + cx * canvas.w / canvas.gw) * canvas.dpr), y: Math.round(origin.y + (canvas.top + cy * canvas.h / canvas.gh) * canvas.dpr) });
  const cal = { x: 0, y: 0 }; // 較正: 希望の画面ピクセルと、ゲームが読んだ TouchInput のずれ(ウィンドウ枠・DPI)
  const mouseTile = async (x, y) => { const d = await json("({ x: $gameMap.displayX(), y: $gameMap.displayY(), tw: $gameMap.tileWidth(), th: $gameMap.tileHeight() })"); const p = toScreen((x - d.x) * d.tw, (y - d.y) * d.th); await send("move " + (p.x + cal.x) + " " + (p.y + cal.y)); await sleep(60); return p; };
  const state = () => json("(function() { var s = ProjectRCardDeck.getBattleState(); return { draw: s.drawPile.length, discard: s.discardPile.length, cooldown: s.cooldownPile.length, hand: s.hand.map(function(c) { return c.cardId; }) }; })()");
  const obs = () => json("window.__obs");
  console.log("window origin", origin, "canvas", canvas);
  { const want = toScreen(960, 540); await send("move " + want.x + " " + want.y); await sleep(150); const got = await json("({ x: TouchInput.x, y: TouchInput.y })"); cal.x = 960 - got.x; cal.y = 540 - got.y; console.log("calibration", cal); }
  await mouseTile(14.5, 25.5);
  const pointerOk = await json("({ x: TouchInput.x, y: TouchInput.y, dx: $gameMap.displayX(), dy: $gameMap.displayY() })");
  rec("OS0 OSレベルのマウス移動がゲームのTouchInputに届く(CDPの入力ではない)", near(pointerOk.x, (14.5 - pointerOk.dx) * 48, 3) && near(pointerOk.y, (25.5 - pointerOk.dy) * 48, 3), pointerOk);

  // 1) Q を1回だけ押す(80ms)
  const s0 = await state();
  await send("tap Q 80");
  await sleep(700);
  const s1 = await state(), o1 = await obs(), act1 = await json("ProjectRHermesVeil.getActive()");
  rec("OS1 Qを1回押す → カード使用は1回だけ(繰り返さない)。山札-1・Cooldown+1・ヴェイル1つ", o1.uses.length === 1 && o1.uses[0].ok && s1.draw === s0.draw - 1 && s1.cooldown === s0.cooldown + 1 && act1.length === 1, { uses: o1.uses.length, s0, s1, veil: act1.length });
  // 2) OSマウスを動かす: 円が毎回付いてくる。カード・Cooldownは変わらない
  const path = [[16.5, 26.5], [18.5, 25.5], [18.5, 28.5], [14.5, 28.5], [11.5, 27.5]]; const follow = [];
  for (const [x, y] of path) { await mouseTile(x, y); await sleep(100); const w = await json("({ x: $gameMap.displayX() + TouchInput.x / 48, y: $gameMap.displayY() + TouchInput.y / 48 })"); const a = await json("ProjectRHermesVeil.getActive()[0]"); follow.push({ m: w, c: a && a.center }); }
  const s2 = await state(), o2 = await obs();
  rec("OS2 OSマウスで円が追従し、その間カードは再使用されない(使用1回のまま・手札/山札/Cooldown不変)", follow.every(f => f.c && near(f.c.x, f.m.x, 0.08) && near(f.c.y, f.m.y, 0.08)) && o2.uses.length === 1 && s2.draw === s1.draw && s2.cooldown === s1.cooldown, { follow, uses: o2.uses.length });
  await s.shot("os2_follow");
  // 3) 5秒で終わる
  const ended = await wait("ProjectRHermesVeil.getActive().length === 0", 12000);
  await sleep(800);
  const gone = await json("({ followers: ProjectRGodSummonVisual.getFollowers().length, speed: ProjectRCardModifiers.characterSpeedFactor($gamePlayer) })");
  rec("OS3 効果は終わり、Hermesの表示・速度係数が残らず、もう一度勝手に発動しない", ended && gone.followers === 0 && gone.speed === 1 && (await obs()).uses.length === 1, gone);
  // 4) J(剣)を1回だけ押す
  await mouseTile(15.5, 25.5);
  const swings0 = await ev("ProjectRSwordSystem.status().swings");
  const act0 = (await obs()).actions.length;
  await send("tap J 80");
  await sleep(3200);
  const swings1 = await ev("ProjectRSwordSystem.status().swings"), o4 = await obs();
  const acts = o4.actions.slice(act0).map(a => a.names);
  const startsOfSwing = acts.filter(n => /Sword|Swing|Attack/i.test(n)).length;
  const hp = 100000 - await ev("(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === 4; }); return b.currentHp; })()");
  rec("OS4 Jを1回押す → 剣は1回だけ振られ、動作(モーション)が繰り返されない。ダメージも1回分", swings1 === swings0 + 1 && startsOfSwing <= 1 && hp > 0, { swings0, swings1, acts, hp });
  // 5) D を押し続けて離す: 動いて、離したら止まる
  const x0 = (await s.pos()).x;
  await ev("$gameMap.event(4).locate(30, 3); 'ok'"); await sleep(200); await send("keydown D"); await sleep(700); await send("keyup D"); await sleep(800);
  const x1 = (await s.pos()).x; await sleep(800); const x2 = (await s.pos()).x;
  rec("OS5 Dを押している間だけ動き、離すと止まる(勝手に走り続けない)", x1 - x0 > 0.3 && near(x2, x1, 0.01), { x0, x1, x2 });
  // 6) Qをもう1回: 2回目のカード使用はちょうど1回増える
  await mouseTile(12.5, 25.5);
  await send("tap Q 80"); await sleep(1800);
  const o6 = await obs(), s6 = await state();
  rec("OS6 Qをもう1回押す → カード使用はちょうど+1(合計2回)。ヴェイルは1つ", o6.uses.length === 2 && o6.uses.every(u => u.ok) && (await json("ProjectRHermesVeil.getActive()")).length === 1, { uses: o6.uses.length, state: s6 });
  await s.shot("os6_second_cast");
  // 7) 押しっぱなしが無い
  const stuckOs = JSON.parse(await send("keys"));
  await sleep(300);
  const stuckPage = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("OS7 押されたままのキーがない(OS側・ゲーム側とも)", stuckOs.length === 0 && stuckPage.length === 0, { stuckOs, stuckPage });
  rec("OSZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRHermesVeil.clearAll('test'); ProjectRHermesTest.end(); 'ok'");
  worker.stdin.write("quit" + String.fromCharCode(10)); worker.stdin.end();
  fs.writeFileSync(`${OUT}/h3a_os_input_results.json`, JSON.stringify({ note: "CDPの入力を使わないOSレベルの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
