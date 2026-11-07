// I5: SOUL戦闘の入力の実機(Playtest)確認 + スクリーンショット。実キー・実マウス(CDP)。
//   K1 ATTACKのカード枠1〜5 = Q/W/E/R/T(HUDの表示も同じ)。旧キー X/C/V は何もしない
//   K2 通常攻撃 = 左クリック: 戦闘エリアの中で攻撃、外(敵の置き場・キャラの置き場・手札)と J は攻撃にならない
//   K3 DEFENSE: カードキー・クリック・J はすべて何も起きない。自ハートはマウスで動く
//   K4 銃: 弾が尽きると自動でリロード。R はリロードにならない
//   K5 HUD: 敵のHPバー・HPの数値は表示しない(スクリーンショット)。カード名は日本語
//   K6 後片づけ: 元のマップ・座標へ戻り、入力は通常へ戻る
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_input_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", IN = "ProjectRSoulInput";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const heartHp = () => ev(`ProjectRCardModifiers.eventHp(${SO}.getState().heart.eventId)`);
  const hand = () => json("ProjectRCardDeck.getBattleState().hand.map(function(h) { return h.cardId; })");
  const swings = () => ev("ProjectRSwordSystem.status().swings");
  const diag = () => json("ProjectRCardBattleInput.getDiagnostics()");
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1200), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 20000); await sleep(600); return ok; };
  const start = async opts => { await ev(`${SB}.start("a16", ${JSON.stringify({ attackSeconds: 600, ...opts })})`); const ok = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'"); return ok; };
  const KEYS = ["Q", "W", "E", "R", "T"];
  const vp = () => json(`${ST}.getViewport()`);
  const heartScreen = () => json(`(function() { var e = $gameMap.event(${SO}.getState().heart.eventId), p = ${ST}.toScreen(e.screenX(), e.screenY() - 24); return { x: p.x, y: p.y }; })()`);
  const tapKey = async k => { await c.keyDown(k); await sleep(70); await c.keyUp(k); await sleep(120); };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);

  await check("K1 カード枠のキー: Q/W/E/R/T が左から1〜5枠。HUDも同じ表示。旧キー X/C/V は何もしない", async () => {
    const ok = await start({ weapon: "sword", openingHand: ["hermes_strength", "hermes_issen", "hermes_sweep", "hermes_psychopomp", "hermes_veil"] });
    const labels = await json(`${IN}.getKeyLabels()`), shown = await json(`ProjectRSoulBattleHUD.getViewModel().hand.map(function(h) { return h.key; })`);
    const h = await heartScreen(); await c.pointer(h.x, h.y); await sleep(150);
    const seen = [];
    for (let slot = 4; slot >= 0; slot--) {                                   // 使うと左へ詰まるので、右の枠から
      const before = await hand(), d0 = await diag();
      await tapKey(KEYS[slot]);
      const d1 = await diag(), last = await json("ProjectRCardBattleInput.getLastResult()");
      seen.push({ key: KEYS[slot], expected: before[slot], index: d1.lastIndex, decision: d1.lastDecision, used: last && last.cardId, ok: last && last.ok, keyDowns: d1.keyDowns - d0.keyDowns });
      await sleep(250);
    }
    await s.shot("k1_hud_keys");
    const d2 = await diag(), handBefore = await hand();
    for (const k of ["X", "C", "V"]) await tapKey(k);
    const d3 = await diag(), handAfter = await hand();
    rec("K1 keys", ok && JSON.stringify(labels) === '["Q","W","E","R","T"]' && JSON.stringify(shown) === '["Q","W","E","R","T"]'
      && seen.every((x, i) => x.index === 4 - i && x.decision === "accepted" && x.keyDowns === 1 && x.used === x.expected) && seen.filter(x => x.ok).length >= 4
      && d3.keyDowns === d2.keyDowns && JSON.stringify(handBefore) === JSON.stringify(handAfter),
      JSON.stringify({ labels, shown, seen, oldKeys: { keyDowns: [d2.keyDowns, d3.keyDowns] } }));
  });

  await check("K2 通常攻撃 = 左クリック: 戦闘エリアの中だけ。外のクリック・J は攻撃にならない", async () => {
    await sleep(1200);
    const v = await vp(), h = await heartScreen(), s0 = await swings();
    await c.pointer(h.x, h.y); await sleep(150);
    const hp0 = await heartHp();
    await c.click(); await sleep(500);
    const s1 = await swings(), hp1 = await heartHp();
    await s.shot("k2_click_attack");
    await sleep(1200);
    const outside = [["敵の置き場", v.x + v.w / 2, v.y - 50], ["キャラの置き場", v.x + v.w / 2, v.y + v.h + 70], ["左の外", v.x - 80, v.y + v.h / 2], ["手札", v.x + v.w / 2, 980]];
    const outsideSwings = [];
    for (const [label, x, y] of outside) { await c.click(x, y); await sleep(300); outsideSwings.push([label, await swings()]); await sleep(800); }
    await c.pointer(h.x, h.y); await sleep(150);
    const s2 = await swings();
    await tapKey("J"); await sleep(400);
    const s3 = await swings();
    const stats = await json(`${IN}.getStats()`);
    rec("K2 click", s1 === s0 + 1 && hp1 < hp0 && outsideSwings.every(([, n]) => n === s1) && s3 === s2 && stats.attacksDenied.outsideArea >= 4 && stats.attacksDenied.notClick >= 1,
      JSON.stringify({ swings: [s0, s1, s2, s3], hp: [hp0, hp1], outsideSwings, stats }));
  });

  await check("K3 DEFENSE: カードキー・クリック・J・旧キーはすべて何も起きない。自ハートはマウスで動く", async () => {
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(600);
    const phase = await ev(`${SO}.getPhase()`), v = await vp();
    const h0 = await hand(), d0 = await diag(), sw0 = await swings(), hp0 = await heartHp(), p0 = await json("[$gamePlayer._realX, $gamePlayer._realY]");
    await c.pointer(v.x + v.w / 2, v.y + v.h / 2); await sleep(150);
    for (const k of [...KEYS, "X", "C", "V", "J"]) await tapKey(k);
    await c.click(); await sleep(400);
    const h1 = await hand(), d1 = await diag(), sw1 = await swings(), hp1 = await heartHp(), p1 = await json("[$gamePlayer._realX, $gamePlayer._realY]");
    const at = async (fx, fy) => { await c.pointer(v.x + v.w * fx, v.y + v.h * fy); await sleep(250); return json(`${ST}.getPlayerHeart()`); };
    const a = await at(0.3, 0.7), b = await at(0.7, 0.4);
    await s.shot("k3_defense");
    const stats = await json(`${IN}.getStats()`);
    rec("K3 defense", phase === "defense" && JSON.stringify(h0) === JSON.stringify(h1) && d1.keyDowns === d0.keyDowns && sw1 === sw0 && hp1 === hp0 && JSON.stringify(p0) === JSON.stringify(p1)
      && stats.swallowedDefense >= 5 && a.active && b.active && b.x > a.x + 100 && b.y < a.y - 50,
      JSON.stringify({ phase, hand: [h0, h1], keyDowns: [d0.keyDowns, d1.keyDowns], swings: [sw0, sw1], hp: [hp0, hp1], player: [p0, p1], heart: [[Math.round(a.x), Math.round(a.y)], [Math.round(b.x), Math.round(b.y)]], swallowed: stats.swallowedDefense }));
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(500);
  });

  await check("K4 銃: 弾が尽きると自動でリロード。R はリロードにならない(枠4のカード)", async () => {
    await ev(`${SB}.stop(); 'ok'`); await toOrigin(origin);
    const ok = await start({ weapon: "gun", openingHand: ["hermes_strength", "hermes_issen", "hermes_sweep", "hermes_psychopomp", "hermes_veil"] });
    const g0 = await json("ProjectRGunSystem.status()");
    const d0 = await diag();
    await tapKey("R");
    const d1 = await diag(), g1 = await json("ProjectRGunSystem.status()");
    await ev(`(function() { var i = new Game_Interpreter(); i._eventId = 0; PluginManager.callCommand(i, 'Hendrix_Action_Engine', 'GunAmmoControl', { slot: '0', target: 'ammo', value: String(-ProjectRGunSystem.status().ammo) }); return 'ok'; })()`);
    await sleep(250);
    const g2 = await json("ProjectRGunSystem.status()");
    await sleep(1500);
    const g3 = await json("ProjectRGunSystem.status()"), stats = await json(`${IN}.getStats()`);
    rec("K4 gun", ok && g0.equipped && !g1.reloading && d1.lastIndex === 3 && d1.keyDowns === d0.keyDowns + 1 && g2.reloading && g2.dryFires === g0.dryFires && stats.autoReloads >= 1 && !g3.reloading && g3.ammo === g0.capacity,
      JSON.stringify({ afterR: { reloading: g1.reloading, lastIndex: d1.lastIndex }, empty: { ammo: g2.ammo, reloading: g2.reloading, dry: g2.dryFires }, done: { ammo: g3.ammo, cap: g0.capacity, reloading: g3.reloading, reloads: g3.reloads }, autoReloads: stats.autoReloads }));
  });

  await check("K5 HUD: 敵のHPバー・HPの数値・ボス名のパネルは表示しない(フェーズのチップだけ)。プレイヤーHP・フェーズ・残り時間・日本語のカード名は表示する", async () => {
    await ev(`${SB}.stop(); 'ok'`); await toOrigin(origin);
    const ok = await start({ weapon: "sword" });
    const panels = await json(`(function() { var h = SceneManager._scene._projectRSoulHud; return { phase: h.panels.phase._sig, bossPanel: !!h.panels.boss, player: h.panels.player._sig, state: h.panels.state._sig }; })()`);
    const m0 = await json("ProjectRSoulBattleHUD.getViewModel()");
    const h = await heartScreen(); await c.pointer(h.x, h.y); await sleep(150);
    await c.click(); await sleep(900);
    const panels2 = await json(`(function() { var h = SceneManager._scene._projectRSoulHud; return { phase: h.panels.phase._sig }; })()`), m1 = await json("ProjectRSoulBattleHUD.getViewModel()");
    await s.shot("k5_hud_no_enemy_hp");
    const names = m1.hand.map(x => x.name);
    rec("K5 hud", ok && !panels.bossPanel && panels.phase === panels2.phase && /第.形態/.test(panels.phase) && !/\d{3,}/.test(panels.phase) && m1.boss.hp < m0.boss.hp && /\d/.test(panels.player) && m1.phase && m1.secondsLeft > 0 && names.every(n => /[^\x00-\x7F]/.test(n)),
      JSON.stringify({ phaseSig: panels.phase, bossPanel: panels.bossPanel, sameAfterHit: panels.phase === panels2.phase, bossHp: [m0.boss.hp, m1.boss.hp], playerSig: panels.player, names, phase: m1.phase }));
  });

  await check("K6 後片づけ: stop() で元のマップ・座標へ戻り、入力は通常へ戻る", async () => {
    const stop = await json(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const w = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
    const st = await json(`${ST}.getState()`), inp = await json(`${IN}.getStats()`), active = await ev(`${IN}.isActive()`);
    const labelsNormal = await json("ProjectRCardBattleInput.getKeyLabels()");
    rec("K6 cleanup", stop.ok && back && w.map === origin.map && w.x === origin.x && w.y === origin.y && st.state === "idle" && !active && inp.held === 0 && JSON.stringify(labelsNormal) === '["Q","E","X","C","V"]'
      && (await ev("$gameSystem.isSaveEnabled()")) === true, JSON.stringify({ back, now: [w.map, w.x, w.y], stage: st.state, active, held: inp.held, labelsNormal }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("KZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_input_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ・CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
