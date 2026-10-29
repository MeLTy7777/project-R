// Phase H2A の実機検証(通常の剣の修復・絶の予備動作・CrossArms中の銃・Ultimateカットイン・回帰)
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/h2a_verify.cjs
//   すでに起動している Playtest(nw.exe <project> test --remote-debugging-port=9222)へ接続するだけです。MZを起動・終了しません。
//   ゲームのファイルは変更しません(メモリ上のEvent位置・装備を一時的に変えるだけ。セーブしない)。
//   HPの表示は「次のフレーム」で更新されるため、ダメージは公式HPバーの値を、シーンのフレームを数えて待ってから読みます。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const near = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.message).slice(0, 300)); } };
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; }; // 0.8秒の窓に収めるため、短い間隔で待つ
  const start = async lv => { const r = await ev(`JSON.stringify(ProjectRZetsuTest.start(${lv}))`); await sleep(400); return JSON.parse(r); };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const settle = () => s.sceneFrames(10);
  const hps = async () => { const o = {}; for (const id of [2, 3, 4, 5, 6]) o[id] = await barHp(id); return o; };
  const fixedRandom = on => ev(on ? "window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.5; }; 'on'" : "Math.random = window.__r0 || Math.random; 'off'");
  const equip = id => ev(`$gameParty.leader().forceChangeEquip(0, $dataWeapons[${id}]); 'eq'`);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const HOME = { 2: [44, 6], 3: [37, 15], 4: [10, 15], 5: [12, 15], 6: [11, 17] };
  const goHome = async () => { for (const [id, [x, y]] of Object.entries(HOME)) await locate(Number(id), x, y); };
  const pointerWorld = async (dx, dy, bodyOffset = -24) => { const f = await s.foot(); return c.pointer(f.x + dx * 48, f.y + dy * 48 + bodyOffset); };
  const attackJ = async () => { await c.tap("J", 120); await settle(); };
  const drops = (a, b) => Object.keys(b).filter(k => b[k] < a[k]).map(Number);
  const swordSwings = () => ev("ProjectRSwordSystem.status().swings");

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  rec("0 boot: 新プラグイン読み込み(SwordSystem含む)・予備動作の既定8frame", await ev("[ProjectRSwordSystem, ProjectRHermesZetsu, ProjectRCutIn, ProjectRCardCatalog].every(Boolean) && ProjectRHermesZetsu.getWindupFrames() === 8"), "Chromium 85 / NW 0.48.4");
  await start(1); await s.slow(1); await fixedRandom(true);

  // ---- A. 絶 × 剣(敵は元の位置のまま。キー入力はスロー再生中に取りこぼすので、剣は等速で振る) ----
  await check("A sword+zetsu", async () => {
    for (const [lv, mult] of [[1, 1.5], [2, 2.0], [3, 3.0]]) {
      await start(lv); await s.slow(1); await fixedRandom(true); await equip(2); await resetHp(); await sleep(300);
      // 基準の1振り: Event 4(10,15)の西隣から東を斬る
      await sleep(700); await s.place(9, 15); await sleep(500); await pointerWorld(1, 0); await sleep(300);
      const h00 = await barHp(4); await attackJ(); const base = h00 - await barHp(4);
      await s.sceneFrames(30);
      // 絶: (4,15)から東へ5タイル。着地は(9,15)=敵の西隣。マウスは東のままなので、移動後すぐ斬れば東を向いている(0.8秒以内)
      await s.place(4, 15); await sleep(500); await s.aim(5, 0);
      const mark = await ev("(function() { var l = ProjectRCardModifiers.getWeaponHitLog(); return l.length ? l[l.length - 1].seq : 0; })()");
      const hBefore = await barHp(4);
      await c.tap("Q");
      for (let i = 0; i < 400; i++) { if (!(await ev("ProjectRHermesZetsu.isTeleportPending()")) && (await ev("$gamePlayer._realX")) > 8) break; await sleep(10); }
      const where = await s.pos();
      await c.tap("J", 80); await s.sceneFrames(12);
      const log = await ev(`JSON.stringify(ProjectRCardModifiers.getWeaponHitLog().filter(function(e) { return e.seq > ${mark}; }))`).then(JSON.parse);
      const consumed = log.filter(e => e.type === "consumed");
      const boosted = hBefore - await barHp(4);
      const after = (await s.status()).bonus;
      rec(`A 実機: 絶Lv${lv} × 通常の剣: 命中の最終ダメージ x${mult}、1回で消費`, base > 0 && near(where.x, 9, 0.2) && boosted === Math.round(base * mult) && consumed.length === 1 && consumed[0].eventId === 4 && after === null, { base, boosted, consumed: consumed.map(e => [e.eventId, e.dealt]), x: where.x, after });
      await s.sceneFrames(60);
    }
  });
  await check("B miss+expiry", async () => {
    await start(1); await s.slow(1); await fixedRandom(true); await equip(2); await resetHp(); await sleep(300);
    // 何もいない広間(12,25)から東へ。着地後の斬撃は東=敵なし(外れ)。ポインタは動かさない。
    await s.place(12, 25); await sleep(500); await s.aim(5, 0); await c.tap("Q"); await wait("ProjectRHermesZetsu.isTeleportPending()", 3000); await wait("!ProjectRHermesZetsu.isTeleportPending()", 8000);
    const sw = await swordSwings(); await c.tap("J", 100); await sleep(150);
    const kept = (await s.status()).bonus; const swung = (await swordSwings()) === sw + 1;
    await sleep(1000);
    const gone = (await s.status()).bonus;
    rec("B 実機: 外れの斬撃では強化は消費されず、0.8秒で失効する", swung && !!kept && gone === null, { swung, kept: kept && kept.multiplier, gone });
  });

  // ---- C. G17 × 絶(予備動作つき) ----
  const gun = async lv => {
    await start(lv); await s.slow(3); await fixedRandom(true); await equip(51); await resetHp();
    await ev("ProjectRGunSystem.requestReload('h2a'); 'ok'"); await sleep(300); await wait("!ProjectRGunSystem.isReloading()", 20000); await s.sceneFrames(10);
    await s.place(31, 15); await sleep(300);
    const aimAt = async () => { const t = await ev("JSON.stringify({ x: $gameMap.event(3).screenX(), y: $gameMap.event(3).screenY() - 24 })").then(JSON.parse); await c.pointer(t.x, t.y); await sleep(150); };
    const fire = async () => { const r = JSON.parse(await ev("JSON.stringify(ProjectRGunSystem.fire('h2a'))")); await s.sceneFrames(30); return r; };
    await aimAt(); const h0 = await barHp(3); await fire(); const h1 = await barHp(3); await s.sceneFrames(15);
    await s.aim(1, 0); await c.tap("Q"); await wait("ProjectRHermesZetsu.isTeleportPending()", 3000); await wait("!ProjectRHermesZetsu.isTeleportPending()", 10000);
    await aimAt(); await fire(); const h2 = await barHp(3); await s.sceneFrames(15); await fire(); const h3 = await barHp(3);
    await fixedRandom(false); await s.slow(1);
    return { base: h0 - h1, boosted: h1 - h2, third: h2 - h3 };
  };
  for (const [lv, mult] of [[1, 1.5], [2, 2.0], [3, 3.0]]) {
    await check("C gun " + lv, async () => { const r = await gun(lv); rec(`C 実機: G17 × 絶Lv${lv}(予備動作つき): x${mult}、次弾は通常`, r.base > 0 && r.boosted === Math.round(r.base * mult) && r.third === r.base, r); });
  }

  // ---- D. 絶の演出の通し ----
  await check("D presentation", async () => {
    await start(1); await s.slow(1); await equip(51); await sleep(600); await s.place(12, 25); await sleep(500);
    await ev("window.__trace = []; window.__tp = setInterval(function() { var spr = typeof ShxWeaponSpriteH !== 'undefined' ? ShxWeaponSpriteH : null; window.__trace.push({ x: $gamePlayer._realX, pending: ProjectRHermesZetsu.isTeleportPending(), motion: ProjectRCharacterPresentation.current().name, hermes: ProjectRGodSummonVisual.getTransientEventId('hermes'), gunVisible: spr ? spr.visible : null, gunHidden: ProjectRGunSystem.status().weaponHidden, pics: (AnimatedPictureManager._animatedPictures || []).map(function(p) { return p.note; }).join('|'), cut: ProjectRCutIn.getActive().length }); }, 16); 'tracing'");
    const ammo0 = await ev("ProjectRGunSystem.status().ammo");
    await s.slow(5); // 予備動作(8 map frame)を約0.7秒に伸ばして撮影できるようにする(VFXは実時間で進む)
    await s.aim(5, 0); await c.tap("Q");
    for (let i = 0; i < 7; i++) { await s.shot(`41_presentation_${i}`); await sleep(90); }
    await wait("!ProjectRHermesZetsu.isTeleportPending()", 8000); await s.slow(1); await sleep(1500);
    const trace = await ev("(function() { clearInterval(window.__tp); return JSON.stringify(window.__trace); })()").then(JSON.parse);
    const first = trace.findIndex(r => r.pending), landed = trace.findIndex(r => r.x > 15);
    const during = first >= 0 && landed > first ? trace.slice(first, landed) : [];
    const seen = k => during.some(k);
    rec("D1 実機: 予備動作の間(移動前)に、腕クロス・Hermes・出発点のノイズ・カットインが同時に出ている", seen(r => r.motion === "CrossArms") && seen(r => r.hermes > 0) && seen(r => /Zetsu_Departure/.test(r.pics)) && seen(r => r.cut > 0), { frames: during.length, sample: during[Math.floor(during.length / 2)] });
    rec("D2 実機: 銃のスプライトは腕クロスの間だけ隠れ(見えない)、終わると戻る。弾薬・装備は不変", seen(r => r.gunHidden === true && r.gunVisible === false) && trace[trace.length - 1].gunHidden === false && trace[trace.length - 1].gunVisible === true && (await ev("ProjectRGunSystem.status().ammo")) === ammo0 && (await ev("$gameParty.leader().equips()[0].id")) === 51, { ammo0, last: trace[trace.length - 1] });
    rec("D3 実機: 移動の後に到着点のノイズ。Hermesは最後に消える", landed > 0 && trace.slice(landed).some(r => /Zetsu_Arrival/.test(r.pics)) && trace[trace.length - 1].hermes === 0, trace[landed]);
  });

  // ---- E. Ultimateカットイン ----
  await check("E ultimate", async () => {
    await start(1); await s.slow(1); await sleep(500); await s.place(12, 25); await sleep(400);
    const g0 = await ev("JSON.stringify(ProjectRUltimateGauge.getUltimateGaugeState())"), d0 = await ev("JSON.stringify(ProjectRGodSummonManager.getPersistentUltimateBattleState())");
    await c.tap("U", 100); await sleep(600);
    const invalid = await ev("JSON.stringify({ r: ProjectRUltimateActivation.getLastUltimateActivationResult(), cut: ProjectRCutIn.getActive() })").then(JSON.parse);
    rec("E1 実機: 無効なUltimate(Gauge不足)ではカットインが出ず、Gauge・Divine HPも変わらない", invalid.r && invalid.r.ok === false && invalid.cut.length === 0 && (await ev("JSON.stringify(ProjectRUltimateGauge.getUltimateGaugeState())")) === g0 && (await ev("JSON.stringify(ProjectRGodSummonManager.getPersistentUltimateBattleState())")) === d0, invalid.r);
    const seen = [];
    for (const roll of [0.2, 0.8]) {
      await ev(`ProjectRCutIn.clear(); ProjectRCutIn.setRandom(function() { return ${roll}; }); 'set'`);
      await ev("ProjectRCombatTestArena.fillGauge(); 'full'"); await sleep(1500);
      await c.tap("U", 100); await sleep(500);
      const r = await ev("JSON.stringify({ r: ProjectRUltimateActivation.getLastUltimateActivationResult(), cut: ProjectRCutIn.getActive() })").then(JSON.parse);
      seen.push({ ok: r.r && r.r.started, cut: r.cut.map(x => [x.kind, x.godId, x.orientation]) });
      await s.shot(`42_ultimate_cutin_${roll < 0.5 ? "horizontal" : "vertical"}`);
      await sleep(2500);
    }
    await ev("ProjectRCutIn.setRandom(Math.random); 'restore'");
    rec("E2 実機: 発動に成功したときだけ、中央大型のカットイン(横・縦)が出る", seen.length === 2 && seen.every(x => x.ok && x.cut.length === 1 && x.cut[0][0] === "ultimate") && seen[0].cut[0][2] === "horizontal" && seen[1].cut[0][2] === "vertical", seen);
    rec("E3 実機: 描画順 Tilemap < Vision < CutIn(最前)、CutIn層の最上段=操作キャラ複製", await ev("(function() { var sp = SceneManager._scene._spriteset, ch = sp._baseSprite.children; return ch.indexOf(sp._tilemap) < ch.indexOf(sp._projectRVisionLayer) && ch.indexOf(sp._projectRVisionLayer) < ch.indexOf(sp._projectRCutInLayer) && ch.indexOf(sp._projectRCutInLayer) === ch.length - 1 && sp._projectRCutInLayer.children[sp._projectRCutInLayer.children.length - 1] === sp._projectRCutInLayer.overlay; })()"), "HUDはWindow層でさらに上");
  });

  // ---- F. 通常の剣の修復: 旧CE1の再現と、各Event ID・各方向・複数・繰り返し・対象なし(Eventを動かすので最後) ----
  await check("F1 legacy", async () => {
    await start(1); await s.slow(1); await fixedRandom(true); await equip(2); await resetHp(); await goHome(); await sleep(300);
    await locate(4, 12, 25); await s.place(11, 25); await pointerWorld(1, 0); await sleep(300);
    const before = await hps();
    await ev("(function() { $gameTemp._commonEventQueue.push(1); return $gameTemp._commonEventQueue.length; })()"); // 旧CE1を入口を通さず直接実行
    await s.sceneFrames(90); await settle();
    const after = await hps();
    rec("F1 再現(実機): 旧CE1は剣を振っても隣の敵(Event 4)に当たらない(Event 1固定)", drops(before, after).length === 0, { before: before[4], after: after[4] });
    await s.shot("40_legacy_ce1_no_damage");
    await locate(4, 10, 15);
  });
  await check("F2 ids", async () => {
    await resetHp(); await goHome(); const results = {};
    for (const id of [2, 3, 4, 5, 6]) {
      await locate(id, 12, 25); await s.place(11, 25); await pointerWorld(1, 0); await sleep(500);
      const before = await hps(); await attackJ(); await s.sceneFrames(20);
      results[id] = drops(before, await hps());
      await locate(id, ...HOME[id]); await s.sceneFrames(30);
    }
    rec("F2 実機: 任意のEvent ID(2,3,4,5,6)の敵に、斬った相手だけダメージ(IDに依らない)", [2, 3, 4, 5, 6].every(id => JSON.stringify(results[id]) === JSON.stringify([id])), results);
  });
  await check("F3 dirs", async () => {
    await resetHp(); await goHome();
    const U = { 東: [1, 0], 西: [-1, 0], 北: [0, -1], 南: [0, 1], 北東: [1, -1], 南西: [-1, 1] };
    const ids = { 東: 2, 西: 3, 北: 4, 南: 5, 北東: 6, 南西: 2 };
    const out = {};
    for (const [label, u] of Object.entries(U)) {
      for (const id of [2, 3, 4, 5, 6]) await locate(id, 25 + id, 22); // 他の敵は離れた場所(画面内)
      await locate(ids[label], 12 + u[0], 25 + u[1]);
      await s.place(12, 25); await sleep(600); await pointerWorld(u[0] * 3, u[1] * 3); await sleep(500);
      const before = await hps(); await attackJ(); await s.sceneFrames(20);
      out[label] = drops(before, await hps());
    }
    rec("F3 実機: マウス方向(東西南北・斜め)へHitboxが回り、狙った側の敵だけに当たる", Object.entries(out).every(([l, d]) => JSON.stringify(d) === JSON.stringify([ids[l]])), out);
    await goHome();
  });
  await check("F4 multi", async () => {
    await resetHp(); await goHome(); await sleep(300);
    for (const id of [2, 3, 6]) await locate(id, 25 + id, 22);
    await s.place(11, 14); await sleep(600); await pointerWorld(0, 1.4); await sleep(500);
    const b0 = await hps(); await attackJ(); await s.sceneFrames(10); const a1 = await hps();
    await s.sceneFrames(60); const a2 = await hps();
    rec("F4a 実機: 重なった2体(Event 4,5)に1回ずつ。Hitboxが残る間も繰り返し当たらない", JSON.stringify(drops(b0, a1)) === JSON.stringify([4, 5]) && a1[4] === a2[4] && a1[5] === a2[5], { before: [b0[4], b0[5]], after: [a1[4], a1[5]], later: [a2[4], a2[5]] });
    await goHome(); await s.place(25, 25); await sleep(600); await pointerWorld(3, 0); await sleep(300);
    const e1 = await ev("$gameMap.getCurrentEventHp(1)"), n0 = await hps(); const errs = s.errors().length; const sw = await swordSwings();
    await attackJ(); await s.sceneFrames(20);
    rec("F4b 実機: 対象が居なくても例外なし・どこにもダメージなし・Event 1も無傷(斬撃は実行された)", s.errors().length === errs && drops(n0, await hps()).length === 0 && (await ev("$gameMap.getCurrentEventHp(1)")) === e1 && (await swordSwings()) === sw + 1, { errors: s.errors().length, swings: [sw, await swordSwings()] });
  });

  // ---- G. 回帰: 戦闘の開始/終了・メニュー・F・G17 ----
  await check("G regress", async () => {
    await start(1); await s.slow(1); await sleep(400); await equip(51); await sleep(400);
    const shotOk = JSON.parse(await ev("JSON.stringify(ProjectRGunSystem.fire('h2a-regress'))")).ok;
    await s.place(25, 25); await ev("$gamePlayer.setDirection(8); 'up'"); await sleep(300); await c.tap("F", 120); await sleep(700);
    const busy = await ev("$gameMessage.isBusy() || $gameMap.isEventRunning()");
    for (let i = 0; i < 8 && await ev("$gameMessage.isBusy() || $gameMap.isEventRunning() || SceneManager._scene.constructor.name !== 'Scene_Map'"); i++) { await c.tap("F", 100); await sleep(350); }
    rec("G1 実機: G17の発射・F(調べる)が従来どおり", shotOk && busy === true, { shotOk, busy });
    await start(1); await s.slow(1); // Fで開いたハブのメニューが戦闘を作り直すことがあるので、開始し直す
    await s.place(12, 25); await sleep(400); await s.slow(8); await s.aim(5, 0); await c.tap("Q"); await wait("ProjectRHermesZetsu.isTeleportPending()", 4000);
    const pending = await ev("ProjectRHermesZetsu.isTeleportPending()");
    await ev("ProjectRCombatTestArena.endTest(); 'ended'"); await s.slow(1); await sleep(1500);
    const moved = (await s.pos()).x; const pend2 = await ev("ProjectRHermesZetsu.isTeleportPending()");
    rec("G2 実機: 予備動作中に戦闘を終えると破棄され、後から移動しない・強化も残らない", pending === true && pend2 === false && near(moved, 12, 0.05) && (await ev("ProjectRCardModifiers.getWeaponHitBonus()")) === null, { pending, pend2, x: moved });
    const scene0 = await ev("SceneManager._scene.constructor.name"); await c.tap("Esc", 120); await sleep(1200);
    const scene1 = await ev("SceneManager._scene.constructor.name"); await c.tap("Esc", 120); await sleep(1200);
    rec("G3 実機: 戦闘外でメニューを開閉できる", scene0 === "Scene_Map" && scene1 === "Scene_ProjectRMenu" && (await ev("SceneManager._scene.constructor.name")) === "Scene_Map", { scene0, scene1 });
  });
  await fixedRandom(false);
  console.log("final errors", JSON.stringify(s.errors()));
  rec("H Console(F8)に赤いエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  fs.writeFileSync(OUT + "/results_h2a.json", JSON.stringify(s.results, null, 1));
  console.log("TOTAL", s.results.filter(r => r.ok).length + "/" + s.results.length);
  process.exit(0);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
