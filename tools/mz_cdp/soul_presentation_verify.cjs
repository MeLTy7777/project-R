// SOUL戦闘の見せ方の仕上げの実機(Playtest)確認 + スクリーンショット。実キー(Q/W/E/R/T)・実マウス(CDP)。
//   V1 葦笛のVFX: 波紋が「カーソルの点」(葦笛の中心)に出る。キャラの置き場や左上の原点ではない
//   V2 一閃のVFX: 軌跡・稲妻が起点(カーソルの点)から出て、経路(方向 x 長さ)に沿う。キャラの置き場からは出ない
//   V3 カットイン: 味方 = 左上・敵 = 右上。戦闘エリアの外(枠線の外)・画面の内側・敵の絵・キャラ/神と重ならない
//   V4 ボスの絵: ボス名のパネルは無い。ボスの絵は戦闘エリアの上に大きく出る(旧 90 → 190)・フェーズのチップだけ
//   V5 ハート(攻撃ターン): プレイヤーのハートはキャラの絵の胸・敵ハートは戦闘エリアの中の本物の1つ(的)。飾りは増えない
//   V6 ハート(防御ターン): 敵ハートは敵の絵の胸(本物の絵は隠れる)・プレイヤーのハートはマウスで動く。重複しない
//   V7 山札の動き: 使うと クールダウンの山が光り・引いたカードに NEW・数が本物の山札と一致。少ししたら光が消える
//   V8 後片づけ: 元のマップへ戻り、飾り・錨・隠した絵が残らない。通常のマップのカットインは従来の位置(上の角)
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_presentation_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", HU = "ProjectRSoulBattleHUD";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1500), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 20000); await sleep(600); return ok; };
  const HAND = ["hermes_issen", "hermes_reed_flute", "hermes_zetsu", "hermes_veil", "apollo_oracle"];
  const start = async () => { await ev(`${SB}.start("a16", ${JSON.stringify({ openingHand: HAND, attackSeconds: 600, level: 3, weapon: "sword" })})`); const ok = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'"); return ok; };
  const KEYS = ["Q", "W", "E", "R", "T"];
  const press = async id => { const hs = await json("ProjectRCardDeck.getBattleState().hand.map(function(x) { return x.cardId; })"), i = hs.indexOf(id); if (i < 0) return false; await c.keyDown(KEYS[i]); await sleep(60); await c.keyUp(KEYS[i]); return true; };
  const heartTile = () => json("ProjectRSoulBattlePoC.getState().hitCenter");
  const pointerTile = async (tx, ty) => { const p = await json(`${ST}.toScreen(${tx} * 48, ${ty} * 48 - 24)`); await c.pointer(Math.round(p.x), Math.round(p.y)); await sleep(250); };
  // 画面に見えている(visible && renderable)Spriteのうち、画像のファイル名が re に合うものの中心(画面座標)と、拡大率
  const pics = re => json(`(function() { var res = []; (function walk(o, d) { if (!o || d > 10) return; var vis = !(o.visible === false || o.renderable === false); var u = o.bitmap && o.bitmap._url ? String(o.bitmap._url).split('/').pop() : ''; if (u && vis && /${re}/i.test(u)) { var g = o.getGlobalPosition ? o.getGlobalPosition() : { x: o.x, y: o.y }; res.push({ x: Math.round(g.x), y: Math.round(g.y), u: u.slice(0, 28), k: +o.worldTransform.a.toFixed(3) }); } (o.children || []).forEach(function(ch) { walk(ch, d + 1); }); })(SceneManager._scene, 0); return res; })()`);
  // ハート(プレイヤーの飾り・敵の飾り・本物)の可視と中心(画面座標)
  const hearts = () => json(`(function() { var r = []; var ov = SceneManager._scene._projectRSoulStageLayers.overlay; (function walk(o, d) { if (!o || d > 10) return; var vis = !(o.visible === false || o.renderable === false); if (vis && (o._projectRSoulHeartPoC || o === ov._stageHeart || o === ov._stageBossHeart)) { var g = o.getGlobalPosition(); var w = o.bitmap ? o.bitmap.width : 0; r.push({ kind: o._projectRSoulHeartPoC ? 'target' : o === ov._stageHeart ? 'player' : 'bossDeco', x: Math.round(g.x + (o.anchor && o.anchor.x === 0.5 ? 0 : w / 2)), y: Math.round(g.y + (o.anchor && o.anchor.y === 0.5 ? 0 : w / 2)) }); } (o.children || []).forEach(function(ch) { walk(ch, d + 1); }); })(SceneManager._scene, 0); return r; })()`);
  const inRect = (p, r, pad = 0) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  await ev("Math.random = function() { return 0.9; }; 'on'");
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  const baseCut = await json("(function() { ProjectRCutIn.setRandom(function() { return 0.1; }); var r = ProjectRCutIn.show({ kind: 'card', godId: 'hermes', cardId: 'hermes_veil' }); return r; })()");   // 通常のマップ(ステージの外)のカットイン: 従来の左上
  await sleep(300);
  const normalCut = await pics("CutIn_Hermes_Eyes");
  await ev("ProjectRCutIn.clear(); ProjectRCutIn.setRandom(Math.random); 'ok'");

  await check("V1/V2 葦笛・一閃のVFXが実際の起点(カーソルの点)に出る", async () => {
    const ok = await start();
    const h = await heartTile();
    await pointerTile(h.x - 3, h.y);
    const cur = await json(`${ST}.getAttackCursor()`), curScreen = await json(`${ST}.toScreen(${cur.x} * 48, ${cur.y} * 48)`);
    const vp = await json(`${ST}.getViewport()`), zones = await json(`${ST}.getRepZones()`);
    const player = { x: zones.char.x + zones.char.w / 2, y: zones.char.y + zones.char.h / 2 };
    await press("hermes_reed_flute"); await sleep(250);
    const reed = await pics("Ripple|Flute");
    await s.shot("v1_reed"); await sleep(1500);
    await press("hermes_issen"); await sleep(150);
    const issenInfo = await json("(function() { var r = ProjectRHermesIssen.getLastResult(); return { degree: r.degree, length: r.length }; })()");
    const issen = await pics("Issen_Trail|Issen_Lightning");
    await s.shot("v2_issen");
    const rad = issenInfo.degree * Math.PI / 180, k = vp.scale;
    const midScreen = { x: curScreen.x + Math.sin(rad) * issenInfo.length * 48 * k / 2, y: curScreen.y - Math.cos(rad) * issenInfo.length * 48 * k / 2 };
    const reedOk = reed.length >= 1 && reed.every(p => dist(p, curScreen) < 40) && reed.every(p => dist(p, player) > 150) && inRect(reed[0], vp, 0);
    const issenOk = issen.length >= 2 && issen.every(p => dist(p, midScreen) < 40) && issen.every(p => dist(p, player) > 100);
    rec("V1 葦笛のVFX", ok && reedOk, JSON.stringify({ cursor: curScreen, reed, player }));
    rec("V2 一閃のVFX", issenOk, JSON.stringify({ origin: curScreen, mid: midScreen, issen, info: issenInfo, k }));
    await sleep(1500);
  });

  await check("V3 カットインの置き場: 味方=左上・敵=右上・戦闘エリアの外", async () => {
    const vp = await json(`${ST}.getViewport()`), rects = await json(`${ST}.getCutInRects()`), zones = await json(`${ST}.getRepZones()`);
    await ev("ProjectRCutIn.clear(); ProjectRCutIn.setRandom(function() { return 0.9; }); ProjectRCutIn.show({ kind: 'card', godId: 'hermes', cardId: 'hermes_veil' }); ProjectRCutIn.show({ kind: 'card', godId: 'hermes', cardId: 'hermes_issen', owner: 'enemy' }); 'ok'");
    await sleep(350);
    const eyes = await pics("CutIn_Hermes_Eyes");
    await s.shot("v3_cutins");
    const left = eyes.filter(p => p.x < 960), right = eyes.filter(p => p.x >= 960);
    const outsideArea = eyes.every(p => p.x < vp.x - 3 || p.x > vp.x + vp.w + 3);
    const notOver = eyes.every(p => !inRect(p, zones.enemy) && !inRect(p, zones.char) && !inRect(p, zones.god));
    rec("V3 カットイン", left.length === 1 && right.length === 1 && inRect(left[0], rects.ally) && inRect(right[0], rects.enemy) && outsideArea && notOver && left[0].k > 0.5 && eyes.every(p => p.y < vp.y),
      JSON.stringify({ eyes, rects, vp: [vp.x, vp.y, vp.w, vp.h] }));
    await ev("ProjectRCutIn.clear(); ProjectRCutIn.setRandom(Math.random); 'ok'");
    await sleep(500);
  });

  await check("V4 ボスの絵(大きく)・ボス名のパネルなし", async () => {
    const zones = await json(`${ST}.getRepZones()`), reps = await json(`${ST}.getReps()`), vp = await json(`${ST}.getViewport()`);
    const panels = await json("(function() { var h = SceneManager._scene._projectRSoulHud; return { boss: !!h.panels.boss, phase: h.panels.phase._sig, bossPanelDefined: !!ProjectRSoulBattleHUD.PANELS.boss }; })()");
    const art = await pics("Highking");
    await s.shot("v4_boss");
    rec("V4 ボスの絵", zones.enemy.h >= 190 && reps.enemyVisible && art.length === 1 && art[0].y < vp.y && !panels.boss && !panels.bossPanelDefined && !/SOUL|dev_boss/.test(panels.phase || ""),
      JSON.stringify({ enemyZone: zones.enemy, art, panels }));
  });

  await check("V5/V6 ハート: 攻撃 = プレイヤーは胸・的は本物1つ / 防御 = 敵は胸・プレイヤーはマウス", async () => {
    await ev(`${SO}.getPhase() !== 'attack' && ${SO}.skipPhase(); 'ok'`); await sleep(600);
    const zones = await json(`${ST}.getRepZones()`), vp = await json(`${ST}.getViewport()`);
    const ha = await hearts(), api = await json(`${ST}.getHearts()`);
    const target = ha.filter(x => x.kind === "target"), pl = ha.filter(x => x.kind === "player"), deco = ha.filter(x => x.kind === "bossDeco");
    rec("V5 攻撃ターンのハート", target.length === 1 && pl.length === 1 && deco.length === 0 && inRect(target[0], vp) && inRect(pl[0], zones.char) && api.player.mode === "portrait" && Math.abs(pl[0].x - api.player.x) <= 2 && Math.abs(pl[0].y - api.player.y) <= 2,
      JSON.stringify({ ha, api, char: zones.char }));
    await s.shot("v5_attack_hearts");
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(700);
    const mid = await json(`(function() { var b = ${ST}.getBattleBox(); return { x: b.x + b.w * 0.3, y: b.y + b.h * 0.6 }; })()`);
    await c.pointer(Math.round(mid.x), Math.round(mid.y)); await sleep(400);
    const hd = await hearts(), api2 = await json(`${ST}.getHearts()`);
    const t2 = hd.filter(x => x.kind === "target"), p2 = hd.filter(x => x.kind === "player"), d2 = hd.filter(x => x.kind === "bossDeco");
    const events = await json("$gameMap.events().filter(function(e) { return e && !e._erased; }).length");
    rec("V6 防御ターンのハート", t2.length === 0 && p2.length === 1 && d2.length === 1 && inRect(d2[0], zones.enemy) && d2[0].y < vp.y && inRect(p2[0], vp) && Math.abs(p2[0].x - mid.x) <= 3 && Math.abs(p2[0].y - mid.y) <= 3 && api2.boss.mode === "portrait" && api2.player.mode === "mouse",
      JSON.stringify({ hd, api2, mouse: mid, events }));
    await s.shot("v6_defense_hearts");
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(700);
    const back = await hearts();
    rec("V6b 攻撃へ戻る", back.filter(x => x.kind === "target").length === 1 && back.filter(x => x.kind === "bossDeco").length === 0, JSON.stringify(back));
  });

  await check("V7 山札の動きが見える", async () => {
    await sleep(2500);                                                     // 前の光が消えるまで
    const m0 = await json(`${HU}.getViewModel()`);
    await press("hermes_veil"); await sleep(500);
    const m1 = await json(`${HU}.getViewModel()`), st = await json("ProjectRCardDeck.getBattleState()");
    const sig = await json("SceneManager._scene._projectRSoulHud.panels.counts._sig");
    await s.shot("v7_deck_flash");
    const flashed = m1.deck.flash.cooldown && m1.deck.flash.draw && m1.hand.some(x => x.fresh) && /^(使用|引いた)/.test(m1.deck.last) && m1.counts.draw === st.drawPile.length && m1.counts.cooldown === st.cooldownPile.length && /"cooldown":true/.test(sig);
    await sleep(2500);
    const m2 = await json(`${HU}.getViewModel()`);
    rec("V7 山札の動き", !m0.deck.flash.cooldown && flashed && !m2.deck.flash.cooldown && m2.hand.every(x => !x.fresh), JSON.stringify({ before: m0.deck, after: m1.deck, fresh: m1.hand.map(x => x.fresh), later: m2.deck, counts: m1.counts }));
  });

  await check("V8 後片づけ: 元のマップへ戻り、飾り・錨・隠した絵が残らない。通常のマップのカットインは従来の位置", async () => {
    const stop = await json(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })");
    const st = await json(`${ST}.getState()`);
    const anchors = await json("ProjectRGodSummonVisual.getAnchors().length");
    const stray = await json("(function() { var n = 0; (function walk(o, d) { if (!o || d > 10) return; if (o._projectRSoulHeartPoC || o._projectRSoulStageOverlay) n++; (o.children || []).forEach(function(ch) { walk(ch, d + 1); }); })(SceneManager._scene, 0); return n; })()");
    const renderable = await json("SceneManager._scene._spriteset._characterSprites.every(function(sp) { return sp.renderable !== false; })");
    await ev("ProjectRCutIn.clear(); ProjectRCutIn.setRandom(function() { return 0.1; }); ProjectRCutIn.show({ kind: 'card', godId: 'hermes', cardId: 'hermes_veil' }); 'ok'");
    await sleep(300);
    const cut = await pics("CutIn_Hermes_Eyes");
    await ev("ProjectRCutIn.clear(); ProjectRCutIn.setRandom(Math.random); 'ok'");
    const sameCut = normalCut.length === 1 && cut.length === 1 && Math.abs(cut[0].x - normalCut[0].x) <= 2 && Math.abs(cut[0].y - normalCut[0].y) <= 2 && cut[0].x < 960;
    rec("V8 cleanup", stop.ok && back && w.map === origin.map && w.x === origin.x && w.y === origin.y && st.state === "idle" && anchors === 0 && stray === 0 && renderable && sameCut,
      JSON.stringify({ back, now: [w.map, w.x, w.y], stage: st.state, anchors, stray, renderable, cutBefore: normalCut, cutAfter: cut }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("VZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_presentation_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ・CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
