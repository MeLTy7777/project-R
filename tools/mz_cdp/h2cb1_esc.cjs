// Phase H2C-B1: ProjectRのメニュー系画面で Esc が「戻る」として動くかを、実機(Playtest)のOSレベルのキー入力で確認する。
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/h2cb1_esc.cjs   (Playtestを --remote-debugging-port=9222 で起動済みであること)
//   CDPは「準備(新しいゲーム)」と「状態の観測」にだけ使い、キー入力は os_input.ps1(keybd_event)で送る。これは人間の手動プレイの代わりではない。
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
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const scene = () => ev("SceneManager._scene.constructor.name");
  const settle = async () => { await wait("!SceneManager.isSceneChanging()", 8000); await sleep(500); };
  const ready = async () => { await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(800); };
  // 前のテストが失敗して画面が残っても、次のテストがその影響を受けないよう、マップへ強制的に戻す(キー入力は使わない)
  const toMap = async () => { if ((await scene()) !== "Scene_Map" || (await ev("SceneManager._stack.length")) > 0) { await ev("SceneManager.clearStack(); SceneManager.goto(Scene_Map); 'ok'"); await ready(); } };
  const open = async method => { await toMap(); await openRaw(method); };
  const openRaw = async method => { await ev(`ProjectRMenuIntegration.${method}(); 'ok'`); await settle(); await sleep(500); };
  await ev("ProjectRProductionTest.freshGame(); 'ok'"); await ready(); await s.slow(1);
  await ev("$gameMap._interpreter.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', '', {}] }, { code: 0, indent: 0, parameters: [] }], 0); 'ev'");
  await wait("!$gameMap.isEventRunning()", 6000);
  await send("focus"); await sleep(500);
  const map0 = await scene();
  const mapping = await ev("JSON.stringify({ esc: Input.keyMapper[27], x: Input.keyMapper[88], b: Input.keyMapper[66], f: Input.keyMapper[70] })").then(JSON.parse);
  rec("E0 前提: Escは'menu'、X/Bは'escape'、FはOk(Hendrix Button Config)", map0 === "Scene_Map" && mapping.esc === "menu" && mapping.x === "escape" && mapping.b === "escape" && mapping.f === "ok", mapping);

  // ---- 経路A: イベントのスクリプト等から直接開く(スタックにメニューが無い) ----
  const pages = [["openDeckBuilder", "Scene_ProjectRDeckBuilder"], ["openUltimateSelect", "Scene_ProjectRUltimateSelect"], ["openInventory", "Scene_ProjectRInventory"], ["openRings", "Scene_ProjectRRings"]];
  for (const [method, name] of pages) {
    await open(method);
    const opened = await scene();
    const stack = await ev("SceneManager._stack.map(function(c) { return c.name; }).join(',')");
    await send("tap Esc 80"); await sleep(700);
    const after = await scene();
    rec(`EA-${name} 直接開いた画面でEsc → マップへ戻る(スタック:[${stack}])`, opened === name && after === "Scene_Map", { opened, after });
  }
  // 直接開いた画面で X は従来どおり閉じる
  await open("openDeckBuilder"); await send("tap X 80"); await sleep(700);
  rec("EA-X 直接開いたデッキ構築でXは従来どおり戻る(Scene_Map)", (await scene()) === "Scene_Map", await scene());
  // 右クリック(Cancel)相当
  await open("openDeckBuilder"); await ev("TouchInput._onCancel(10, 10); 'ok'"); await sleep(700);
  rec("EA-RC 直接開いたデッキ構築で右クリック(Cancel)は従来どおり戻る", (await scene()) === "Scene_Map", await scene());

  // ---- 入れ子: 一覧に入ってからEscは「一覧→絞り込み」の順に戻り、勝手に2段階閉じない ----
  await open("openDeckBuilder");
  await send("tap F 80"); await sleep(400);
  const inList = await ev("SceneManager._scene._collection.active");
  await send("tap Esc 80"); await sleep(500);
  const afterOne = await ev("JSON.stringify({ scene: SceneManager._scene.constructor.name, list: !!(SceneManager._scene._collection && SceneManager._scene._collection.active), tabs: !!(SceneManager._scene._tabs && SceneManager._scene._tabs.active) })").then(JSON.parse);
  await send("tap Esc 80"); await sleep(700);
  const afterTwo = await scene();
  rec("EN 入れ子: 一覧でEsc → 絞り込みへ(画面は閉じない) → もう一度Esc → マップ", inList === true && afterOne.scene === "Scene_ProjectRDeckBuilder" && afterOne.tabs === true && afterTwo === "Scene_Map", { inList, afterOne, afterTwo });

  // ---- 経路B: マップ → Esc(メニュー) → SKILL → Esc → Esc ----
  await toMap();
  await send("tap Esc 80"); await sleep(1000);
  const menu = await scene();
  await send("tap F 80"); await sleep(1000);
  const sub = await scene();
  const stackB = await ev("SceneManager._stack.map(function(c) { return c.name; }).join(',')");
  await send("tap Esc 80"); await sleep(800);
  const back = await scene();
  await send("tap Esc 80"); await sleep(900);
  const map1 = await scene();
  rec("EB メニュー経由(マップ→Esc→SKILL→Esc→Esc): 画面ごとに1段ずつ戻る(2段飛ばしや閉じ損ねが無い)", menu === "Scene_ProjectRMenu" && sub === "Scene_ProjectRDeckBuilder" && back === "Scene_ProjectRMenu" && map1 === "Scene_Map", { menu, sub, stackB, back, map1 });

  // ---- Escを押したら、その後マップでメニューが勝手に開き直さない ----
  await open("openDeckBuilder"); await send("tap Esc 80"); await sleep(1200);
  rec("EC 直接開いた画面をEscで閉じた後、マップのままでメニューが続けて開かない", (await scene()) === "Scene_Map", await scene());

  // ---- 戦闘中: Q/E/X/C/V が従来どおり動き、Escは何も起こさない ----
  await toMap();
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  await ev("ProjectRCardDeck.endCardBattle(); 'ok'");
  await ev("ProjectRCombatSession.begin('h2cb1', { requireValidDeck: false }); 'ok'"); await sleep(500);
  const st = await ev("JSON.stringify(ProjectRCardDeck.startCardBattle ? (function(){ var r = ProjectRCardDeck.startCardBattle(); return { ok: r.ok }; })() : { ok: false })").then(JSON.parse);
  await ev("window.__uses = []; (function() { var d = ProjectRCardDeck, o = d.requestUseCard; d.requestUseCard = function(i) { var r = o.apply(this, arguments); window.__uses.push({ index: i, ok: !!(r && r.ok) }); return r; }; })(); 'obs'");
  await send("tap Esc 80"); await sleep(900);
  const inCombatEsc = await scene();
  const usesAfterEsc = await ev("window.__uses.length");
  const usedKeys = [];
  for (const k of ["Q", "E", "X", "C", "V"]) { const before = await ev("window.__uses.length"); await send(`tap ${k} 80`); await sleep(700); usedKeys.push([k, (await ev("window.__uses.length")) - before]); }
  rec("ED 戦闘中: EscはScene_Mapのまま何も使わない・Q/E/X/C/Vは各1回だけカードを使う(修正前後で同じ)", st.ok && inCombatEsc === "Scene_Map" && usesAfterEsc === 0 && usedKeys.every(u => u[1] === 1), { st, inCombatEsc, usesAfterEsc, usedKeys });
  await ev("ProjectRCombatSession.end('h2cb1'); ProjectRCardDeck.endCardBattle(); 'ok'"); await sleep(400);

  const stuckOs = JSON.parse(await send("keys")); await sleep(300);
  const stuckPage = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("EE 押されたままのキーがない(OS側・ゲーム側とも)", stuckOs.length === 0 && stuckPage.length === 0, { stuckOs, stuckPage });
  rec("EZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  worker.stdin.write("quit" + String.fromCharCode(10)); worker.stdin.end();
  fs.writeFileSync(`${OUT}/h2cb1_esc_results.json`, JSON.stringify({ note: "OSレベルのキー入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); try { worker.stdin.write("quit\n"); } catch (x) { } process.exit(1); });
