// VFX Designer(Hendrix Animation Solution)互換の実機確認 — 既存のProjectR VFX 16件が、ライブラリ再生・Designer(エディタ)での読込/編集/保存・再生に使えるか。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/vfx_verify.cjs
//   js/AnimationSolutionLibrary.json は実行前にバイト単位で退避し、実行後に必ず元へ戻して同一であることを確認する(編集/保存の試験で一時的に書き換わるため)。
//   入力はCDP(人間の手動確認ではない)。ゲームの他のファイル・本物のsave/ には書かない。
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const LIB = path.join(process.cwd(), "js", "AnimationSolutionLibrary.json");
const sha = buf => crypto.createHash("sha256").update(buf).digest("hex");
const targets = () => new Promise((res, rej) => http.get("http://127.0.0.1:9222/json", r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function attach(t, dialogs) {
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = m => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.rej(new Error(JSON.stringify(msg.error))) : p.res(msg.result); }
    else if (msg.method === "Page.javascriptDialogOpening") { dialogs.push(msg.params.message); send("Page.handleJavaScriptDialog", { accept: true }).catch(() => {}); }
  };
  await send("Runtime.enable"); await send("Page.enable");
  const evalJs = async expr => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || "eval error"); return r.result.value; };
  return { send, evalJs, ws };
}

(async () => {
  const original = fs.readFileSync(LIB); const originalSha = sha(original);
  const originalJson = JSON.parse(original.toString("utf8"));
  const s = await session(); const { ev, c, rec } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.message).slice(0, 300)); } };
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const dialogs = [];
  let editor = null;
  try {
    console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
    await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
    await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
    await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
    await ev("ProjectRCombatTestArena.enter(); 'ok'");
    await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
    await ev("ProjectRHermesTest.start('sweep', 1); 'start'"); await sleep(400); await s.slow(1);

    const keys = await json("ProjectRPresentationVfx.keys()");
    const maps = {};
    for (const k of keys) maps[k] = await json(`ProjectRPresentationVfx.mapping(${JSON.stringify(k)})`);

    await check("V1 ライブラリ登録と素材: 16キーすべてにライブラリ項目・スプライトシート画像があり、行/列/FPSが対応表と一致", async () => {
      const lib = await json("(async function() { return await loadAnimationLibrary(); })()").catch(() => null);
      const problems = [];
      for (const k of keys) {
        const m = maps[k];
        const entry = await ev(`getAnimationFromLibrary(${JSON.stringify(m.library)}).then(function(d) { return d ? JSON.stringify(d) : 'null'; })`).then(JSON.parse);
        if (!entry) { problems.push(`${k}: library ${m.library} 未登録`); continue; }
        const file = path.join(process.cwd(), "img", "pictures", entry.spritesheetFile + ".png");
        if (!fs.existsSync(file)) problems.push(`${k}: 画像なし ${entry.spritesheetFile}`);
        if (m.sheet && (entry.rows !== m.sheet.rows || entry.columns !== m.sheet.columns || entry.fps !== m.sheet.fps)) problems.push(`${k}: 行/列/FPS不一致 ${entry.rows}x${entry.columns}@${entry.fps} vs ${m.sheet.rows}x${m.sheet.columns}@${m.sheet.fps}`);
      }
      void lib;
      rec("V1 library entries + sheets", keys.length === 16 && problems.length === 0, problems.join(" | ") || `${keys.length}件`);
    });

    await check("V2 ライブラリ再生: 16キーを「Show VFX From Library」で再生できる(mode=library)。再生の成否はゲーム状態に影響しない", async () => {
      await ev("(function() { window.__vfxLog = []; if (!window.__vfxHooked) { window.__vfxHooked = true; var add = AnimatedPictureManager.addAnimatedPicture; AnimatedPictureManager.addAnimatedPicture = function(p) { window.__vfxLog.push(String(p.note)); return add.apply(this, arguments); }; } return 'hook'; })()");
      await ev("ProjectRPresentationVfx.probeLibrary(); 'probe'"); await sleep(800);
      const results = {};
      for (const k of keys) {
        const ctxArg = { eventId: 4, degree: 90, length: 5, radiusTiles: 5, instance: 1, origin: await json("$gamePlayer.centerPositionPoint ? { x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 } : null") };
        results[k] = await json(`ProjectRPresentationVfx.play(${JSON.stringify(k)}, ${JSON.stringify(ctxArg)})`);
        await sleep(150);
      }
      const diag = await json("ProjectRPresentationVfx.diagnostics()");
      const logged = await json("window.__vfxLog");
      const modes = {}; for (const k of keys) { const m = (results[k] && results[k].mode) || "none"; modes[m] = (modes[m] || 0) + 1; }
      const failed = keys.filter(k => !results[k] || !results[k].ok);
      await ev("ProjectRPresentationVfx.clear(); 'clear'");
      const knownAll = keys.every(k => diag.libraries[maps[k].library] === true);
      rec("V2 library playback", failed.length === 0 && knownAll, JSON.stringify({ modes, failed, knownAll, pictures: logged.length, diag: { played: diag.played, failed: diag.failed } }));
      fs.writeFileSync(path.join(OUT, "vfx_playback.json"), JSON.stringify({ results, modes, diag, logged: logged.length }, null, 1));
    });

    await check("V3 VFX Designer(エディタ)を開く: ダイヤルのボタンから別ウィンドウが開き、ライブラリ16件が一覧に出る", async () => {
      await ev("document.getElementById('hx-btn-vfx').click(); 'click'"); await sleep(4000);
      const t = (await targets()).find(x => x.type === "page" && /about:blank/.test(x.url));
      if (!t) { rec("V3 editor opens", false, "エディタのウィンドウが見つからない"); return; }
      editor = await attach(t, dialogs);
      const title = await editor.evalJs("document.title");
      await editor.evalJs("openLibrary().then(function() { return 'opened'; })"); await sleep(1500);
      const names = await editor.evalJs("JSON.stringify(Array.prototype.map.call(document.querySelectorAll('.library-item-name'), function(n) { return n.textContent; }))").then(JSON.parse);
      const expected = keys.map(k => maps[k].library).filter((v, i, a) => a.indexOf(v) === i).sort();
      const missing = expected.filter(n => names.indexOf(n) < 0);
      rec("V3 editor lists library", title === "VFX Builder Editor" && missing.length === 0 && names.length >= 16, `title=${title} 件数=${names.length} 欠け=${missing.join(",")}`);
    });

    await check("V4 エディタで読込: 全16項目をクリックで読み込むと、名前・行・列・FPS・拡大率・不透明度・ブレンドがライブラリの値と一致する", async () => {
      if (!editor) { rec("V4 editor load", false, "エディタなし"); return; }
      const problems = [];
      let loaded = 0;
      for (const name of Object.keys(originalJson)) {
        await editor.evalJs("openLibrary().then(function() { return 1; })"); await sleep(250);
        await editor.evalJs(`(function() { var item = Array.prototype.find.call(document.querySelectorAll('.library-item'), function(i) { return i.querySelector('.library-item-name').textContent === ${JSON.stringify(name)}; }); item.click(); return 'click'; })()`);
        await sleep(450);
        const got = await editor.evalJs("JSON.stringify({ name: document.getElementById('animationNameInput').value, rows: +document.getElementById('rowInput').value, columns: +document.getElementById('columnInput').value, fps: +document.getElementById('fpsInput').value, scale: +document.getElementById('scaleInput').value, opacity: +document.getElementById('opacityInput').value, blend: document.getElementById('blendModeInput').value })").then(JSON.parse);
        const want = originalJson[name];
        const ok = got.name === name && got.rows === want.rows && got.columns === want.columns && got.fps === want.fps && got.scale === want.scale && got.opacity === want.opacity && got.blend === (want.blendMode || "Normal");
        if (ok) loaded++; else problems.push(`${name}: ${JSON.stringify(got)} vs ${want.rows}x${want.columns}@${want.fps} s${want.scale} o${want.opacity} ${want.blendMode}`);
      }
      rec("V4 editor loads every entry", loaded === Object.keys(originalJson).length, problems.slice(0, 3).join(" | ") || `${loaded}件`);
    });

    await check("V5 エディタで編集→保存→再生: 不透明度を235→200にして保存し、ゲーム側のライブラリに反映され、同じキーで再生できる", async () => {
      if (!editor) { rec("V5 edit/save/replay", false, "エディタなし"); return; }
      const name = "ProjectR_Strength_Light";
      const before = originalJson[name];
      await editor.evalJs("openLibrary().then(function() { return 1; })"); await sleep(250);
      await editor.evalJs(`(function() { var item = Array.prototype.find.call(document.querySelectorAll('.library-item'), function(i) { return i.querySelector('.library-item-name').textContent === ${JSON.stringify(name)}; }); item.click(); return 'click'; })()`); await sleep(500);
      await editor.evalJs("(function() { var i = document.getElementById('opacityInput'); i.value = '200'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return i.value; })()");
      await editor.evalJs("saveToLibrary(); 'saved'"); await sleep(1500);
      const fromGame = await ev(`getAnimationFromLibrary(${JSON.stringify(name)}).then(function(d) { return JSON.stringify(d); })`).then(JSON.parse);
      const onDisk = JSON.parse(fs.readFileSync(LIB, "utf8"))[name];
      await ev("ProjectRPresentationVfx.clear(); window.__vfxLog = []; 'clear'");
      const play = await json("ProjectRPresentationVfx.play('hermes_strength.light', {})");
      await sleep(600);
      const pictures = await json("window.__vfxLog.length");
      await ev("ProjectRPresentationVfx.clear(); 'clear'");
      const same = ["rows", "columns", "fps", "scale", "spritesheetFile"].every(k => fromGame[k] === before[k]);
      rec("V5 edit→save→replay", fromGame && fromGame.opacity === 200 && onDisk && onDisk.opacity === 200 && same && play.ok === true && pictures >= 1, JSON.stringify({ opacityGame: fromGame && fromGame.opacity, opacityDisk: onDisk && onDisk.opacity, same, play, pictures, dialogs }));
    });

    await check("V6 エディタを閉じる: 閉じてもゲームは動き続け、コンソールエラーが出ない", async () => {
      if (editor) { await editor.evalJs("window.close(); 'close'").catch(() => {}); await sleep(800); }
      const before = await ev("window.__sf || 0"); await sleep(500); const after = await ev("window.__sf || 0");
      const errs = await s.errors();
      rec("V6 game continues", after > before && errs.length === 0, `frames ${before}->${after} errors=${errs.length} ${errs.slice(0, 2).join(" | ").slice(0, 300)}`);
    });
  } finally {
    // 試験で書き換えたライブラリを必ず元へ戻し、バイト単位で一致を確認する
    fs.writeFileSync(LIB, original);
    const restored = sha(fs.readFileSync(LIB)) === originalSha;
    rec("V7 js/AnimationSolutionLibrary.json は実行前と同一(復元済み)", restored, restored ? originalSha.slice(0, 16) : "復元に失敗");
  }
  const failed = s.results.filter(r => !r.ok);
  fs.writeFileSync(path.join(OUT, "vfx_verify.json"), JSON.stringify({ total: s.results.length, failed: failed.length, results: s.results }, null, 1));
  console.log(`DONE total=${s.results.length} failed=${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(2); });
