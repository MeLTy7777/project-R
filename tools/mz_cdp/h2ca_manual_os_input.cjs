// Phase H2C-A: CDPの入力を使わない(OSレベルのキー/マウス入力)Playtest。「動作が意図せず繰り返されないか」と「実機に近い入力でデッキ構築・戦闘が動くか」の確認。
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/h2ca_manual_os_input.cjs   (Playtestを --remote-debugging-port=9222 で起動済みであること)
//   CDPは「最初の準備(新しいゲーム・入手イベント・アリーナ・手札の並び)」と「状態の読み取り(観測)」にだけ使い、キー/マウスの入力は一切送りません。
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
const near = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const s = await session(); const { ev, rec, sleep } = s;
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const ready = () => wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000);
  // ---- 準備(CDP): 新しいゲーム → 入手イベント → アリーナ → 戦闘開始(手札の並びを指定) ----
  await ev("ProjectRProductionTest.freshGame(); 'ok'"); await ready(); await sleep(1200); await s.slow(1);
  await ev("$gameMap._interpreter.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', '', {}] }, { code: 0, indent: 0, parameters: [] }], 0); 'ev'");
  await wait("!$gameMap.isEventRunning()", 6000);
  const granted = await json("({ owner: ProjectRCardDeck.getRingOwner('hermes'), deck: ProjectRCardDeck.getDeck().length, valid: ProjectRCardDeck.isDeckValid() })");
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  await ev("[2,3,4,5,6].forEach(function(id) { $gameMap.event(id).locate(40 - id, 3); }); $gamePlayer.locate(12, 25); $gamePlayer._realX = 12; $gamePlayer._realY = 25; $gamePlayer.center(12, 25); $gameParty.leader().forceChangeEquip(0, $dataWeapons[2]); 'ok'"); await sleep(600);
  const order = ["hermes_strength", "hermes_strength", "hermes_sweep", "hermes_issen", "hermes_veil"];
  const started = await json(`(function(order) { var d = ProjectRCardDeck; var ids = d.getDeck().slice(), seq = [];
      order.forEach(function(id) { var i = ids.indexOf(id); if (i >= 0) seq.push(ids.splice(i, 1)[0]); }); seq = seq.concat(ids);
      d.endCardBattle(); var r = Math.random; Math.random = function() { return 1 - Number.EPSILON; }; var res = d.startCardBattle(seq.slice().reverse()); Math.random = r;
      return { ok: res.ok }; })(${JSON.stringify(order)})`);
  await ev("ProjectRCombatSession.begin('h2ca_os', { requireValidDeck: false }); 'ok'"); await sleep(600);
  // 観測(読み取りだけ)
  await ev(`(function() {
    window.__obs = { uses: [] };
    var deck = ProjectRCardDeck, orig = deck.requestUseCard;
    deck.requestUseCard = function(i) { var r = orig.apply(this, arguments); window.__obs.uses.push({ t: Date.now(), index: i, ok: !!(r && r.ok), cardId: r && r.cardId, reason: r && r.reason }); return r; };
    return 'obs';
  })()`);
  const canvas = await json("(function() { var r = Graphics._canvas.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height, gw: Graphics.width, gh: Graphics.height, dpr: window.devicePixelRatio }; })()");
  await send("focus"); await sleep(500);
  const origin = JSON.parse(await send("origin"));
  const toScreen = (cx, cy) => ({ x: Math.round(origin.x + (canvas.left + cx * canvas.w / canvas.gw) * canvas.dpr), y: Math.round(origin.y + (canvas.top + cy * canvas.h / canvas.gh) * canvas.dpr) });
  const cal = { x: 0, y: 0 };
  { const want = toScreen(960, 540); await send("move " + want.x + " " + want.y); await sleep(150); const got = await json("({ x: TouchInput.x, y: TouchInput.y })"); cal.x = 960 - got.x; cal.y = 540 - got.y; }
  const mouseTile = async (x, y) => { const d = await json("({ x: $gameMap.displayX(), y: $gameMap.displayY(), tw: $gameMap.tileWidth(), th: $gameMap.tileHeight() })"); const p = toScreen((x - d.x) * d.tw, (y - d.y) * d.th); await send("move " + (p.x + cal.x) + " " + (p.y + cal.y)); await sleep(60); };
  const obs = () => json("window.__obs");
  const battle = () => json("ProjectRCardDeck.getBattleState()");
  rec("OS0 準備: 新しいゲーム → 入手イベントで30枚 → 戦闘開始(CDPは準備と観測だけ)", granted.owner === "player" && granted.deck === 30 && granted.valid && started.ok, { granted, started });

  await mouseTile(16.5, 25.5);
  // 1) Q を1回だけ押す
  const s0 = await battle();
  await send("tap Q 80"); await sleep(700);
  const o1 = await obs(), s1 = await battle();
  rec("OS1 Qを1回押す → ストレングスが1回だけ発動(山札-1・Cooldown中か捨て札に1枚。0.1秒のCooldownは0.7秒後には切れて捨て札)", o1.uses.length === 1 && o1.uses[0].ok && o1.uses[0].cardId === "hermes_strength" && s1.drawPile.length === s0.drawPile.length - 1 && (s1.cooldownPile.length + s1.discardPile.length) === 1, { uses: o1.uses.length, s0: s0.drawPile.length, s1: s1.drawPile.length, cooldown: s1.cooldownPile.length, discard: s1.discardPile.length });
  // 2) Q を約1.5秒押し続ける(0.1秒Cooldownでも1回だけ)
  await send("keydown Q"); await sleep(1500); await send("keyup Q"); await sleep(700);
  const o2 = await obs();
  rec("OS2 Qを1.5秒押し続ける(ストレングスのCooldown 0.1秒の十数倍) → 使用はちょうど+1(合計2回)", o2.uses.length === 2 && o2.uses[1].ok && o2.uses[1].cardId === "hermes_strength", { uses: o2.uses.map(u => [u.cardId, u.ok]) });
  // 3) 別の枠(E / X)を1回ずつ
  await send("tap E 80"); await sleep(900);
  await send("tap X 80"); await sleep(900);
  const o3 = await obs();
  rec("OS3 E・X を1回ずつ → 使用は合計4回で、どれも1回ずつ・成功", o3.uses.length === 4 && o3.uses.slice(2).every(u => u.ok), { uses: o3.uses.map(u => [u.index, u.cardId, u.ok]) });
  // 4) D を押し続けて離す
  const x0 = (await s.pos()).x; await send("keydown D"); await sleep(700); await send("keyup D"); await sleep(800);
  const x1 = (await s.pos()).x; await sleep(800); const x2 = (await s.pos()).x;
  rec("OS4 Dを押している間だけ動き、離すと止まる", x1 - x0 > 0.3 && near(x2, x1, 0.01), { x0, x1, x2 });
  // 5) 放っておいても勝手にカードは使われず、30枚が保たれる
  const before5 = (await obs()).uses.length; await sleep(4000);
  const o5 = await obs(), b5 = await battle();
  rec("OS5 4秒放置: 勝手にカードが使われない・カードは常に30枚", o5.uses.length === before5 && b5.hand.length + b5.drawPile.length + b5.discardPile.length + b5.cooldownPile.length === 30, { uses: o5.uses.length, hand: b5.hand.length });
  await ev("ProjectRCombatSession.end('h2ca_os'); ProjectRCardDeck.endCardBattle(); 'ok'"); await sleep(500);

  // ---- デッキ構築画面: OSキーで開いて編集(F=決定 / S=下 / Shift=1枚戻す / X=キャンセル) ----
  await ev("ProjectRMenuIntegration.openDeckBuilder(); 'ok'");
  await wait("SceneManager._scene.constructor.name === 'Scene_ProjectRDeckBuilder' && !SceneManager.isSceneChanging()", 8000); await sleep(900);
  const deck0 = await json("ProjectRCardDeck.getDeck().length");
  await send("tap F 80"); await sleep(300);               // 絞り込み「全て」→ カード一覧へ
  await send("tap S 80"); await sleep(250);               // 2枚目
  const target = await json("SceneManager._scene._collection.item().cardId");
  await send("tap Shift 80"); await sleep(350);           // 1枚戻す
  const deck1 = await json("ProjectRCardDeck.getDeck().length"), msg = await json("ProjectRMenuCore.deck.status().groupedMessages[0]");
  await send("tap F 80"); await sleep(350);               // 追加で戻す
  const deck2 = await json("ProjectRCardDeck.getDeck().length"), valid = await json("ProjectRMenuCore.deck.status().valid");
  await s.shot("os_deckbuilder_edit");
  await send("tap X 80"); await sleep(250); await send("tap X 80"); await sleep(700);
  const scene = await ev("SceneManager._scene.constructor.name");
  rec("OS6 デッキ構築をOSキーで操作: F=一覧へ・S=移動・Shift=1枚戻す(30→29・理由表示)・F=追加(→30・使用可)・X×2=閉じる(マップへ)", deck0 === 30 && deck1 === 29 && /30枚必要/.test(msg || "") && deck2 === 30 && valid === true && scene === "Scene_Map", { target, deck0, deck1, deck2, msg, scene });

  // ---- 押しっぱなしが無い ----
  const stuckOs = JSON.parse(await send("keys"));
  await sleep(300);
  const stuckPage = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("OS7 押されたままのキーがない(OS側・ゲーム側とも)", stuckOs.length === 0 && stuckPage.length === 0, { stuckOs, stuckPage });
  rec("OSZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  worker.stdin.write("quit" + String.fromCharCode(10)); worker.stdin.end();
  fs.writeFileSync(`${OUT}/h2ca_os_input_results.json`, JSON.stringify({ note: "CDPの入力を使わないOSレベルの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
