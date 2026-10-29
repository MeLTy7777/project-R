// Phase H2C-B3: ヴェイル R4a/R4b(敵の標的選択)の断続的な失敗の診断。h3a_verify.cjs の R4 と同じ手順を繰り返し、毎フレームの状態を記録して原因を分類する。
// 使い方: MZ_OUT=<出力> MZ_REPEAT=<回数(既定10)> node tools/mz_cdp/h3a_veil_diag.cjs   (Playtestを --remote-debugging-port=9222 で起動済みであること)
//   入力は h3a_verify と同じ実入力(CDPのマウス移動・Qキー)。待ち時間を足して失敗を隠すことはしない。記録するだけで、ゲームの状態は変えない(DEV敵AIの有効化とEvent位置はh3a_verifyと同じ)。
//   各回で記録するもの(シーンのフレームごと): シーンフレーム数・Graphics.frameCount・Qキー押下のフレーム・カード消費・ヴェイルの有無/中心/残り/内側の味方・
//     カーソル(ok/ワールド座標)・主人公の位置・秘匿の判定(isConcealed)・敵の_detectedEvent・敵AIの状態と連続フレーム・敵の移動中フラグ・秘匿の統計(キャッシュを外した回数など)。
//   分類: A=実際のゲーム内の遅れ(カード消費/ヴェイル発効/秘匿が数フレーム遅い) / B=進行中の移動命令(秘匿後も残りの経路を歩く) /
//         C=サンプリングの非同期(検査の読み取りが、秘匿が効く前のフレーム) / D=標的判定の欠陥(秘匿中なのに検知・キャッシュが残る) / OK=問題なし。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const REPEAT = Math.max(1, Number.parseInt(process.env.MZ_REPEAT || "10", 10));
const JITTER = process.env.MZ_JITTER === "1"; // 1: Qキーの保持時間を回ごとに変える(40〜129ms)。実時間のずれに対する感度を見る
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const json = expr => ev(`JSON.stringify(${expr})`).then(JSON.parse);
  const settle = n => s.sceneFrames(n || 10);
  const start = async lv => { const r = await ev(`JSON.stringify(ProjectRHermesTest.start('veil', ${lv}))`); await sleep(400); await s.slow(1); return JSON.parse(r); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const HOME = { 2: [44, 6], 3: [37, 15], 4: [10, 15], 5: [12, 15], 6: [11, 17] };
  const goHome = async () => { for (const [id, [x, y]] of Object.entries(HOME)) await locate(Number(id), x, y); await settle(); };
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(v === null ? "Math.random = window.__r0 || Math.random; 'off'" : `window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 100000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const mouseTile = async (x, y) => {
    const d = await json("({ x: $gameMap.displayX(), y: $gameMap.displayY(), tw: $gameMap.tileWidth(), th: $gameMap.tileHeight() })");
    return c.pointer((x - d.x) * d.tw, (y - d.y) * d.th);
  };
  const releaseAll = async () => { for (const k of ["Q", "E", "X", "C", "V", "F", "U", "R", "J", "Esc", "W", "A", "S", "D"]) { try { await c.keyUp(k); } catch (_e) { /* 未定義のキー */ } } await ev("Input.clear(); TouchInput.clear(); 'cleared'"); };
  const arena = async () => {
    await ev("DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
    await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
    await ev("ProjectRCombatTestArena.enter(); 'ok'");
    await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  };

  // ページ内の記録器(Scene_Map.update の最後に1フレーム1サンプル)。armed の間だけ記録し、ゲームの状態は変えない。
  const installTracer = () => ev(`(function() {
    if (window.__vt) { window.__vt.samples = []; window.__vt.keyFrame = null; window.__vt.armed = false; return 'reset'; }
    var vt = window.__vt = { armed: false, samples: [], keyFrame: null };
    // Input._onKeyDown は登録時にbind済みで差し替えが効かないため、captureフェーズのリスナーでQキーの到着フレームを記録する。
    document.addEventListener("keydown", function(event) { if (event.keyCode === 81 && vt.armed && vt.keyFrame === null) vt.keyFrame = { sf: window.__sf || 0, gf: Graphics.frameCount, t: performance.now() }; }, true);
    var oldUpdate = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
      oldUpdate.apply(this, arguments);
      if (!vt.armed || vt.samples.length >= 400) return;
      var ev4 = $gameMap.event(4), veil = ProjectRHermesVeil.getActive()[0] || null, ptr = ProjectRCardTargeting.pointer(), st = ProjectRVeilTest.ai.state().enemies[0] || {};
      var battle = ProjectRCardDeck.getBattleState(), stats = ProjectRTargetEligibility.diagnostics();
      vt.samples.push({ sf: window.__sf || 0, gf: Graphics.frameCount, veil: veil ? { c: [Math.round(veil.center.x * 100) / 100, Math.round(veil.center.y * 100) / 100], rem: Math.round(veil.remaining * 1000) / 1000, members: veil.members.length } : null,
        ptr: ptr.ok ? [Math.round(ptr.world.x * 100) / 100, Math.round(ptr.world.y * 100) / 100] : "ng",
        player: [Math.round($gamePlayer._realX * 100) / 100, Math.round($gamePlayer._realY * 100) / 100],
        concealed: ProjectRTargetEligibility.isConcealed($gamePlayer, ev4), det: !!ev4._detectedEvent, ai: st.state, chase: st.chaseFrames, idle: st.idleFrames,
        moving: ev4.isMoving(), routeForcing: !!ev4._moveRouteForcing, pos: [Math.round(ev4._realX * 100) / 100, Math.round(ev4._realY * 100) / 100],
        cd: battle ? battle.cooldownPile.length : -1, hand: battle ? battle.hand.length : -1,
        suppressed: stats.suppressedChecks, cleared: stats.clearedCaches });
    };
    return 'installed';
  })()`);

  const classify = (it) => {
    const smp = it.samples, k = it.keyFrame;
    const first = pred => { const i = smp.findIndex(pred); return i < 0 ? null : i; };
    const iCard = first(x => x.cd > 0), iVeil = first(x => x.veil), iConceal = first(x => x.concealed), iIdle = first(x => x.ai === "idle" && x.idle < 100000 && x.sf >= (k ? k.sf : 0));
    const iDetClear = first(x => !x.det && x.sf >= (k ? k.sf : 0));
    const sampleAt = it.hidden0SampleSf;
    const iSample = smp.findIndex(x => x.sf >= sampleAt);
    const out = { iCard, iVeil, iConceal, iIdle, iDetClear, iSample, framesToConceal: iConceal === null || !k ? null : smp[iConceal].sf - k.sf, framesToIdle: iIdle === null || !k ? null : smp[iIdle].sf - k.sf, sampleFramesAfterKey: k ? sampleAt - k.sf : null };
    if (it.hidden0.checkRange === false && it.hidden0.detected === false) { out.class = "OK"; return out; }
    // 失敗(検知が残っている)したときの分類
    if (iConceal === null) { out.class = "D(秘匿が一度も成立しない)"; return out; }
    const concealedAtSample = smp[iSample] && smp[iSample].concealed;
    if (concealedAtSample) { out.class = "D(秘匿中なのに検知・キャッシュが残る)"; return out; }
    if (iSample >= 0 && iConceal > iSample) { out.class = iCard !== null && iCard > iSample ? "A(カード消費がサンプルより遅い)" : "A/C(秘匿の成立がサンプルより遅い)"; return out; }
    out.class = "?"; return out;
  };

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await arena();
  rec("D0 前提: 診断に必要なAPI(Veil/TargetEligibility/CardTargeting/VeilTest)がある", await ev("[ProjectRHermesVeil, ProjectRTargetEligibility, ProjectRCardTargeting, ProjectRVeilTest, ProjectRHermesTest].every(Boolean) && typeof ProjectRTargetEligibility.diagnostics === 'function'"));
  const runs = [];
  for (let n = 1; n <= REPEAT; n++) {
    try {
      await ev("ProjectRVeilTest.ai.disable(); ProjectRVeilTest.ally.clear(); 'ok'");
      await start(1); await random(0.999); await goHome(); await staging([2, 3, 4, 5, 6]);
      await locate(4, 30, 25);
      await s.place(12, 25); await sleep(500); await resetHp(); await sleep(200);
      await installTracer();
      await ev("ProjectRVeilTest.ai.enable({ ids: [4], range: 60, target: 'player', move: true }); 'ok'");
      await settle(20); await settle(30);
      await mouseTile(12.5, 25.5); await sleep(100);
      await ev("window.__vt.armed = true; 'armed'");
      const hold = JITTER ? 40 + ((n * 37) % 90) : 60;
      await c.tap("Q", hold); await settle(3); await settle(6);
      const sampleSf = await ev("window.__sf || 0");
      const hidden0 = await json("({ state: ProjectRVeilTest.ai.state().enemies[0].state, detected: !!$gameMap.event(4)._detectedEvent, checkRange: checkRange(4, 60, 'player', 0, 0) })");
      await settle(34);
      await ev("window.__vt.armed = false; 'disarmed'");
      const vt = await json("window.__vt");
      const it = { n, keyFrame: vt.keyFrame, hidden0SampleSf: sampleSf, hidden0, samples: vt.samples };
      it.result = classify(it);
      runs.push(it);
      it.hold = hold;
      console.log(`run ${n} (hold ${hold}ms): ${it.result.class}  keyToConceal=${it.result.framesToConceal} keyToIdle=${it.result.framesToIdle} sampleAfterKey=${it.result.sampleFramesAfterKey} hidden0=${JSON.stringify(hidden0)}`);
      await ev("ProjectRHermesVeil.clearAll('diag'); ProjectRVeilTest.ai.disable(); 'ok'");
    } catch (e) { console.log("run " + n + " script error", String(e.message).slice(0, 200)); runs.push({ n, error: String(e.message).slice(0, 300) }); }
  }
  await releaseAll();
  const stuck = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  const counts = {}; for (const r of runs) { const k = r.result ? r.result.class : "error"; counts[k] = (counts[k] || 0) + 1; }
  const delays = runs.filter(r => r.result && r.result.framesToConceal !== null).map(r => r.result.framesToConceal);
  rec("D1 繰り返しの分類(OK以外が出たら詳細を確認)", !runs.some(r => r.result && r.result.class !== "OK") && !runs.some(r => r.error), { repeat: REPEAT, counts, framesFromKeyToConceal: delays });
  rec("D2 押されたままのキーがない・Consoleのエラーなし", stuck.length === 0 && s.errors().length === 0, { stuck, errors: s.errors().slice(0, 3) });
  fs.writeFileSync(`${OUT}/h3a_veil_diag.json`, JSON.stringify({ repeat: REPEAT, counts, framesFromKeyToConceal: delays, runs, results: s.results }, null, 1));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS  counts=${JSON.stringify(counts)}`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
