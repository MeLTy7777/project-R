// Chrome DevTools Protocol 補助(NW.js 0.48.4 の Playtest を操作する)
// 使い方: 他のスクリプトから require される
//   すでに起動している Playtest(nw.exe <project> test --remote-debugging-port=9222)へ接続するだけです。MZを起動・終了しません。
//   スクリーンショットと結果JSONは環境変数 MZ_OUT(既定: ./mz_out)へ出ます。ゲームのファイルは変更しません。
const fs = require("fs");
const http = require("http");
const getJson = url => new Promise((res, rej) => http.get(url, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on("error", rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function connect() {
  const targets = await getJson("http://127.0.0.1:9222/json");
  const page = targets.find(t => t.type === "page" && /index\.html/.test(t.url) && !/devtools/.test(t.url));
  if (!page) throw new Error("no game page: " + JSON.stringify(targets.map(t => t.url)));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const events = [];
  ws.onmessage = m => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result); } else if (msg.method) events.push(msg); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true }).catch(() => {});
  const evalJs = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error("JS: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const shot = async (file) => { const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(file, Buffer.from(r.data, "base64")); return file; };
  const KEY = { Q: ["KeyQ", 81, "q"], E: ["KeyE", 69, "e"], X: ["KeyX", 88, "x"], C: ["KeyC", 67, "c"], V: ["KeyV", 86, "v"], F: ["KeyF", 70, "f"], U: ["KeyU", 85, "u"], R: ["KeyR", 82, "r"], J: ["KeyJ", 74, "j"], Esc: ["Escape", 27, "Escape"], W: ["KeyW", 87, "w"], A: ["KeyA", 65, "a"], S: ["KeyS", 83, "s"], D: ["KeyD", 68, "d"],
    F6: ["F6", 117, "F6"], Enter: ["Enter", 13, "Enter"], Tab: ["Tab", 9, "Tab"], Down: ["ArrowDown", 40, "ArrowDown"], Up: ["ArrowUp", 38, "ArrowUp"], Left: ["ArrowLeft", 37, "ArrowLeft"], Right: ["ArrowRight", 39, "ArrowRight"], Shift: ["ShiftLeft", 16, "Shift"] }; // メニュー操作用のキー(H2C-A) // 移動はHendrix_Keyboard_GamepadでWASDに割り当て済み
  const keyDown = (k) => send("Input.dispatchKeyEvent", { type: "keyDown", code: KEY[k][0], windowsVirtualKeyCode: KEY[k][1], key: KEY[k][2] });
  const keyUp = (k) => send("Input.dispatchKeyEvent", { type: "keyUp", code: KEY[k][0], windowsVirtualKeyCode: KEY[k][1], key: KEY[k][2] });
  const tap = async (k, hold = 80) => { await keyDown(k); await sleep(hold); await keyUp(k); await sleep(60); };
  // ゲーム内のcanvas座標(0..Graphics.width)へ実マウスを動かす
  const pointer = async (cx, cy) => {
    const m = await evalJs(`(() => { const r = Graphics._canvas.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height, gw: Graphics.width, gh: Graphics.height }; })()`);
    const x = m.left + cx * m.w / m.gw, y = m.top + cy * m.h / m.gh;
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await sleep(40);
    return evalJs(`({ x: TouchInput.x, y: TouchInput.y })`);
  };
  return { send, evalJs, shot, tap, keyDown, keyUp, pointer, events, sleep, ws };
}
module.exports = { connect, sleep };
