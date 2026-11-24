// 実機検証の共通部品(配置・狙い・状態の取得・スロー再生・結果記録)
// 使い方: 他のスクリプトから require される
//   すでに起動している Playtest(nw.exe <project> test --remote-debugging-port=9222)へ接続するだけです。MZを起動・終了しません。
//   スクリーンショットと結果JSONは環境変数 MZ_OUT(既定: ./mz_out)へ出ます。ゲームのファイルは変更しません。
const { connect, sleep } = require("./cdp.cjs");
const fs = require("fs");
const OUT = process.env.MZ_OUT || "mz_out";
require("fs").mkdirSync(OUT, { recursive: true });

async function session(opts = {}) {
  const c = await connect(); const ev = c.evalJs;
  // フィールド戦闘(ProjectR_FieldCombat)への移行後も、従来のSOUL・カード戦闘の検証が動くように、起動したら SOUL を許可し、探索マップでも戦闘・武器を使えるようにする(DEV)(ページ側のタイマー。
  //   FieldCombat が読み込まれたら1回だけ実行して止まる)。フィールド戦闘そのものを確かめるスクリプトは session({ field: true }) でこの準備を省く。
  // Stage 1D-1: 通常スキル5枠は、本番では指輪ロードアウト(空の枠は何もしない)。従来の field_* 検証は旧い固定スロットが前提なので、既定では旧い固定スロット(DEV互換)にする。指輪ロードアウトを確かめるスクリプトは session({ field: true, ring: true })。
  if (!opts.ring) await ev("(function() { if (window.__fcLegacySrc) return 1; window.__fcLegacySrc = setInterval(function() { if (window.ProjectRFieldCombat && ProjectRFieldCombat.setLoadoutSource) { ProjectRFieldCombat.setLoadoutSource('legacy'); clearInterval(window.__fcLegacySrc); } }, 20); return 1; })()");
  if (!opts.field) await ev("(function() { if (window.__fcLegacy) return 1; window.__fcLegacy = setInterval(function() { if (window.ProjectRFieldCombat) { ProjectRFieldCombat.setSoulMode('on'); ProjectRFieldCombat.setDevAllowOutsideEncounter(true); clearInterval(window.__fcLegacy); } }, 20); return 1; })()");
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
  // 追跡されているデータ(HEAD の Map001)では、テスト敵(イベント 1・2)が開始位置の画面内(x=42)にいて、戦闘中扱いになり、指輪の付与(戦闘中は移せない)が失敗する。
  //   未コミットの DEV の Map データ(x=52 へ移した版)に頼らず、スクリプトの側で画面の外へ置く(以降の検証は敵を都度置くので、検証の内容は変わらない。データ・ファイルは書かない)。
  //   マップを読み込んだあと(waitMap のあと)と、マップを読み直したあとに呼ぶ。
  const parkFar = async () => { await ev("(function(){ [[1, 52, 15], [2, 52, 18]].forEach(function(p){ var e = $gameMap.event(p[0]); if (!e) return; e.locate(p[1], p[2]); e._realX = p[1]; e._realY = p[2]; }); return 'ok'; })()"); await sleep(300); };
  // Stage 4: 5つの指輪(hermes / apollo / janus / themis / athena)がすべて実装済み。「定義はあるが実装されていない指輪」を確かめる検証は、このページの実行時のレジストリにだけ、一時の指輪(実在しない神 zeus)を足して使う(ファイル・データ・セーブは書かない。ページを閉じれば消える)。
  const tempRing = async (id = "zeus") => { await ev(`(function(){ var d = ProjectRCardDeck; if (!d.definitions.ring('${id}')) d.definitions.rings.set('${id}', Object.freeze({ ringId: '${id}', godId: '${id}', equipActorIds: Object.freeze([]), initialOwner: 'unowned' })); return 'ok'; })()`); return id; };
  const results = []; const rec = (id, ok, detail) => { results.push({ id, ok: !!ok, detail }); console.log((ok ? "PASS " : "FAIL ") + id + "  " + (typeof detail === "string" ? detail : JSON.stringify(detail))); };
  return { tempRing, parkFar, sceneFrames, c, ev, place, foot, aim, pos, last, status, state, errors, slow, rec, results, sleep, shot: (n) => c.shot(`${OUT}/${n}.png`) };
}
module.exports = { session };
