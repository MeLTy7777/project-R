// 実機検証の共通部品(配置・狙い・状態の取得・スロー再生・結果記録)
// 使い方: 他のスクリプトから require される
//   すでに起動している Playtest(nw.exe <project> test --remote-debugging-port=9222)へ接続するだけです。MZを起動・終了しません。
//   スクリーンショットと結果JSONは環境変数 MZ_OUT(既定: ./mz_out)へ出ます。ゲームのファイルは変更しません。
const { connect, sleep } = require("./cdp.cjs");
const fs = require("fs");
const OUT = process.env.MZ_OUT || "mz_out";
require("fs").mkdirSync(OUT, { recursive: true });

async function session() {
  const c = await connect(); const ev = c.evalJs;
  const place = async (x, y) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(350); };
  const foot = () => ev("({ x: $gamePlayer.screenX(), y: $gamePlayer.screenY() })");
  const aim = async (dx, dy) => { await ev("$gamePlayer.center($gamePlayer._realX, $gamePlayer._realY)"); await sleep(120); const f = await foot(); return c.pointer(f.x + dx * 48, f.y + dy * 48); };
  const pos = () => ev("({ x: $gamePlayer._realX, y: $gamePlayer._realY })");
  const last = () => ev("JSON.stringify(ProjectRCardBattleInput.getLastResult())").then(JSON.parse);
  const status = () => ev("JSON.stringify(ProjectRZetsuTest.status())").then(JSON.parse);
  const state = () => ev("JSON.stringify(ProjectRCardDeck.getBattleState())").then(JSON.parse);
  const errors = () => c.events.filter(e => e.method === "Runtime.exceptionThrown" || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error")).map(e => JSON.stringify(e.params).slice(0, 400));
  const slow = n => ev(`(() => { if (!window.__slowInstalled) { const orig = SceneManager.updateScene; let k = 0; SceneManager.updateScene = function() { if (window.__slow > 1 && (++k % window.__slow)) return; window.__sf = (window.__sf || 0) + 1; return orig.apply(this, arguments); }; window.__slowInstalled = true; } window.__slow = ${n}; return window.__slow; })()`);
  // シーンが実際に進んだフレーム数で待つ(スロー再生中も正しい。HP表示は「次のフレーム」で更新されるため)
  const sceneFrames = async n => { const t0 = await ev("window.__sf || 0"); const t = Date.now(); while (Date.now() - t < 30000) { if ((await ev("window.__sf || 0")) - t0 >= n) return true; await sleep(30); } return false; };
  const results = []; const rec = (id, ok, detail) => { results.push({ id, ok: !!ok, detail }); console.log((ok ? "PASS " : "FAIL ") + id + "  " + (typeof detail === "string" ? detail : JSON.stringify(detail))); };
  return { sceneFrames, c, ev, place, foot, aim, pos, last, status, state, errors, slow, rec, results, sleep, shot: (n) => c.shot(`${OUT}/${n}.png`) };
}
module.exports = { session };
