// SOUL戦闘 I4-B1/B2 敵の弾(土台・当たり判定・HPダメージ)の実機(Playtest)確認 + スクリーンショット。CDP。
//   B1 DEFENSE だけ: PREPARE / ATTACK の間は弾も警告も無い。DEFENSE で警告の線7本(出す前)→ 弾 7発 x 2回。弾の持ち主は enemy で、マップの Event は増えない
//   B2 描画: 弾の絵(Spriteset の子)の画面位置 = 戦闘エリアの割合から計算した位置(誤差1px以内)で、すべて戦闘エリアの中。見える(renderable / alpha)
//   B3 解像度: 1280x720 と 1920x1080 で、弾の割合は同じ・絵は戦闘エリアの中・16:9のまま
//   B4 一時停止: eventsPaused の間は弾も警告の時計も止まり、再開すると続きから
//   B5 片づけ: DEFENSE の終わり(skip)・SOUL の終了で、弾・警告・絵が残らない。繰り返しのラウンドでも残らない
//   B7 被弾(I4-B2): 弾が本物のハートに当たると、その弾が消えて主人公のHPが DEV のダメージぶん減り、SOUL の HUD も同じHPになる。赤い輪の反応が出る
//   B8 避ける(I4-B2): 扇の隙間へハートを動かせば当たらずHPは変わらない
//   B9 有界(I4-B2): ダメージが大きくてもHPは下限(1)で止まり、戦闘不能・ゲームオーバーにならず SOUL は続く
//   B6 後片づけ: SOULを終えると元のマップへ戻り、保存データが変わらない
// 敵の弾は DEV の弾幕(dev_fan)。ダメージ・当たり円・下限HPは DEV 設定(仕様に本番値は無い)。敗北の経路は無い(D13 未承認)。B1〜B5 は当たり判定を切って I4-B1 の挙動を確かめる。入力はCDP(人間の手動プレイの代わりではない)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_enemy_bullets_verify.cjs   (新しいNW.jsセッションで実行する)
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", EB = "ProjectRSoulEnemyBullets";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1500), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 25000); await sleep(800); return ok; };
  const saved = () => ev("JSON.stringify([$gameSystem._projectRCardDeckData, $gameSystem._projectRCardInventory, $gameParty._items, $gameParty._gold])");
  const state = () => json(`${EB}.getState()`);
  const phase = () => ev(`${SO}.getPhase()`);
  const layerCount = () => ev(`(function() { var l = SceneManager._scene._spriteset._tilemap.children.filter(function(c) { return c && c._projectRSoulEnemyBullets; })[0]; return l ? l.children.length : 0; })()`);
  const toPhase = async p => { for (let i = 0; i < 6 && (await phase()) !== p; i++) { await ev(`${SO}.skipPhase(); 'ok'`); await sleep(350); } return (await phase()) === p; };
  // 新しい DEFENSE に入り直す(PREPARE → ATTACK → DEFENSE。防御に入るたびに弾幕が始まる)
  const freshDefense = async (u = 0.5, v = 0.8) => { await toPhase("prepare"); await toPhase("attack"); await mouseTo(u, v); await toPhase("defense"); };
  const mouseTo = async (u, v) => { const b = await json(`${ST}.getBattleBox()`); await c.pointer(Math.round(b.x + u * b.w), Math.round(b.y + v * b.h)); await sleep(250); };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  const before = await saved();
  await ev(`${SB}.start("a16", ${JSON.stringify({ openingHand: ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"], attackSeconds: 600, defenseSeconds: 40, level: 3, weapon: "sword", prepare: true })})`);
  const active = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'");
  await wait("ProjectRSoulPrepare.isOpen()", 5000); await sleep(600);

  await check("B1 DEFENSE だけ: 警告 → 弾7発 x 2回。PREPARE / ATTACK には無い。持ち主は enemy・マップの Event は増えない", async () => {
    const events0 = await ev("$gameMap.events().length");
    const en = await json(`${EB}.enable({ pattern: 'dev_fan' })`);
    await ev(`${EB}.setConfig({ collision: false }); 'ok'`);                       // B1〜B5 は I4-B1 の挙動(当たり判定は B7 以降)
    await sleep(600);
    const inPrepare = await state();
    await toPhase("attack"); await sleep(900);
    const inAttack = await state();
    await mouseTo(0.5, 0.85);
    await toPhase("defense"); await sleep(250);
    const warn = await state(), tele = await json(`${EB}.getTelegraphs()`);
    const cutIn = await json("ProjectRCutIn.getActive().filter(function(e) { return e.owner === 'enemy'; }).length");
    await s.shot("e1_warning");
    await sleep(1400);                                                     // 警告(約1秒)のあと
    const wave1 = await state(), bl = await json(`${EB}.getBullets()`);
    await s.shot("e1_bullets");
    await sleep(1200);
    const wave2 = await state();
    const events1 = await ev("$gameMap.events().length");
    rec("B1 DEFENSE だけ", active && en.ok && inPrepare.stats.spawned === 0 && inPrepare.telegraphs === 0 && inAttack.stats.spawned === 0 && inAttack.live === 0 && warn.telegraphs === 7 && warn.live === 0 && tele.every(t => t.hasSprite) &&
      cutIn >= 1 && wave1.stats.spawned >= 7 && wave2.stats.spawned === 14 && wave2.telegraphs === 0 && bl.every(b => b.owner === "enemy" && b.hasSprite) && events1 === events0,
      JSON.stringify({ cutIn, prepare: inPrepare.stats.spawned, attack: [inAttack.live, inAttack.stats.spawned], warn: [warn.telegraphs, warn.live], spawned: [wave1.stats.spawned, wave2.stats.spawned], events: [events0, events1] }));
  });

  await check("B2 描画: 弾の絵の画面位置 = 戦闘エリアの割合から計算した位置(誤差1px以内)で、戦闘エリアの中(弾の半径ぶんの縁を除く)・見える", async () => {
    await freshDefense(); await sleep(2600);
    const res = await json(`(function() {
      var r = ${EB}.rect(), bs = ${EB}.getBullets(), sp = SceneManager._scene._spriteset, layer = sp._tilemap.children.filter(function(c) { return c && c._projectRSoulEnemyBullets; })[0];
      var vp = ${ST}.getViewport(), out = [];
      for (var i = 0; i < bs.length; i++) {
        var b = bs[i], sc = ${EB}.toScreen(b);
        var spr = layer.children.filter(function(c) { return Math.abs(c.x - Math.round(r.x + b.x * r.w)) <= 1 && Math.abs(c.y - Math.round(r.y + b.y * r.w)) <= 1 && c.anchor.x === 0.5; })[0];
        // 画面座標: Spriteset の変換(ステージ表示)を通した位置
        var gx = spr ? spr.worldTransform.tx : null, gy = spr ? spr.worldTransform.ty : null;
        out.push({ id: b.id, hasSprite: !!spr, visible: !!spr && spr.visible !== false && spr.renderable !== false && spr.alpha > 0, dx: spr ? Math.abs(gx - sc.x) : 99, dy: spr ? Math.abs(gy - sc.y) : 99,
          inside: sc.x >= vp.x - 0.012 * vp.w && sc.x <= vp.x + vp.w + 0.012 * vp.w && sc.y >= vp.y - 0.012 * vp.w && sc.y <= vp.y + vp.h + 0.012 * vp.w });
      }
      return out;
    })()`);
    rec("B2 描画", res.length > 0 && res.every(o => o.hasSprite && o.visible && o.dx <= 1.5 && o.dy <= 1.5 && o.inside), JSON.stringify({ n: res.length, worst: res.reduce((m, o) => Math.max(m, o.dx, o.dy), 0), allInside: res.every(o => o.inside) }));
  });

  await check("B3 解像度: 1280x720 と 1920x1080 で、弾の割合は同じ・絵は戦闘エリアの中・16:9のまま", async () => {
    await freshDefense();
    const run = async (w, h, shot) => {
      await ev(`Graphics.resize(${w}, ${h}); 'ok'`); await sleep(900);
      await ev(`${EB}.clear('b3'); ${EB}.fire('dev_fan', { warnFrames: 2, waves: 1, waveGap: 2, cutIn: false }); 'ok'`); await sleep(500);          // 弾がある状態で
      const out = await json(`(function() {
        var r = ${EB}.rect(), vp = ${ST}.getViewport(), bs = ${EB}.getBullets(), layer = SceneManager._scene._spriteset._tilemap.children.filter(function(c) { return c && c._projectRSoulEnemyBullets; })[0], ok = bs.length > 0, worst = 0;
        for (var i = 0; i < bs.length; i++) {
          var b = bs[i], sc = ${EB}.toScreen(b);
          var spr = layer.children.filter(function(c) { return Math.abs(c.x - Math.round(r.x + b.x * r.w)) <= 1 && Math.abs(c.y - Math.round(r.y + b.y * r.w)) <= 1 && c.anchor.x === 0.5; })[0];
          if (!spr) { ok = false; continue; }
          worst = Math.max(worst, Math.abs(spr.worldTransform.tx - sc.x), Math.abs(spr.worldTransform.ty - sc.y));
          if (sc.x < vp.x - 0.012 * vp.w || sc.x > vp.x + vp.w + 0.012 * vp.w || sc.y < vp.y - 0.012 * vp.w || sc.y > vp.y + vp.h + 0.012 * vp.w) ok = false;
          if (Math.abs((sc.x - vp.x) / vp.w - b.x) > 1e-6) ok = false;
        }
        return { ok: ok && worst <= 1.5, n: bs.length, worst: worst, vp: [vp.w, vp.h], ratio: vp.w * 9 === vp.h * 16 };
      })()`);
      if (shot) await s.shot(shot);
      return out;
    };
    const a = await run(1280, 720, "e3_1280"), b = await run(1920, 1080, null);
    rec("B3 解像度", a.ok && b.ok && a.ratio && b.ratio, JSON.stringify({ a, b }));
  });

  await check("B4 一時停止: eventsPaused の間は弾も警告の時計も止まり、再開すると続きから", async () => {
    await freshDefense(); await sleep(1700);
    await ev("$gameMap.eventsPaused = true; 'ok'"); await sleep(120);                      // 止めてから(1フレームぶんの揺れを避けて)基準を取る
    const snap = await json(`${EB}.getBullets().map(function(b) { return [b.id, b.x, b.y, b.age]; })`), st0 = await state();
    await sleep(1500);
    const held = await json(`${EB}.getBullets().map(function(b) { return [b.id, b.x, b.y, b.age]; })`), st1 = await state();
    await ev("$gameMap.eventsPaused = false; 'ok'"); await sleep(500);
    const st2 = await state();
    rec("B4 一時停止", JSON.stringify(snap) === JSON.stringify(held) && snap.length > 0 && st1.stats.spawned === st0.stats.spawned && (st0.runner ? st1.runner.age === st0.runner.age : true) && st1.stats.pausedTicks > st0.stats.pausedTicks && st2.stats.ticks > st1.stats.ticks,
      JSON.stringify({ bullets: snap.length, frozen: JSON.stringify(snap) === JSON.stringify(held), paused: [st0.stats.pausedTicks, st1.stats.pausedTicks], resumed: st2.stats.ticks - st1.stats.ticks }));
  });

  const leaderHp = () => ev("$gameParty.leader().hp");
  await check("B7 被弾: 弾が本物のハートに当たると、その弾が消えて主人公のHPが DEV のダメージぶん減り、HUD も同じHP。赤い輪が出る", async () => {
    await ev(`${EB}.setConfig({ collision: true, damage: 25, floorHp: 1, feedback: true }); ${EB}.clear('b7'); 'ok'`);
    await ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
    await toPhase("prepare"); await toPhase("attack"); await mouseTo(0.5, 0.85);
    const hp0 = await leaderHp();
    await toPhase("defense");
    let shot = false, fb = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 9000 && (await state()).stats.hits < 1) { if (!shot && (fb = await json(`${EB}.getFeedback().length`)) > 0) { await s.shot("e7_hit"); shot = true; } await sleep(25); }
    if (!shot) { fb = await json(`${EB}.getFeedback().length`); if (fb > 0) { await s.shot("e7_hit"); shot = true; } }
    await sleep(300);
    const st = await state(), hits = await json(`${EB}.getHits()`), hp1 = await leaderHp();
    const hud = await json("ProjectRSoulBattleHUD.getViewModel().player.hp");
    const bl = await json(`${EB}.getBullets().length`);
    rec("B7 被弾", st.stats.hits >= 1 && hp1 === hp0 - 25 * st.stats.hits && hud === hp1 && hits.every(h => h.dealt === 25 && h.reason === "ok") && shot && bl >= 0,
      JSON.stringify({ hp: [hp0, hp1], hits: st.stats.hits, hud, feedbackSeen: shot, lastHit: hits[hits.length - 1] }));
  });

  await check("B8 避ける: 扇の隙間へハートを動かせば当たらず、HPは変わらない", async () => {
    await ev(`${EB}.clear('b8'); ${EB}.setConfig({ collision: true, damage: 25 }); $gameParty.leader().setHp($gameParty.leader().mhp); 'ok'`);
    await toPhase("prepare"); await toPhase("attack"); await mouseTo(0.5, 0.85);
    await toPhase("defense"); await sleep(300);
    await mouseTo(0.563, 0.85);                                                   // 警告のあと、中心の弾と隣の弾の真ん中へ
    const hp0 = await leaderHp(), h0 = (await state()).stats.hits;
    await wait(`${EB}.getState().running === false`, 9000); await sleep(400);
    const st = await state(), hp1 = await leaderHp();
    rec("B8 避ける", st.stats.hits === h0 && hp1 === hp0 && st.stats.spawned >= 14, JSON.stringify({ hp: [hp0, hp1], hits: [h0, st.stats.hits], spawned: st.stats.spawned }));
  });

  await check("B9 有界: ダメージが大きくてもHPは下限1で止まり、戦闘不能・ゲームオーバーにならず SOUL は続く", async () => {
    await ev(`${EB}.clear('b9'); ${EB}.setConfig({ collision: true, damage: 1000000, floorHp: 1 }); 'ok'`);
    await toPhase("prepare"); await toPhase("attack"); await mouseTo(0.5, 0.85);
    const h0 = (await state()).stats.hits;
    await toPhase("defense");
    await wait(`${EB}.getState().stats.hits >= ${h0 + 2}`, 9000); await sleep(300);
    const hp = await leaderHp(), dead = await ev("$gameParty.leader().isDead()"), pd = await ev("ProjectR.PlayerDeath.isDead()"), scene = await ev("SceneManager._scene.constructor.name"), act = await ev(`${SO}.isActive()`);
    const st = await state();
    await ev(`${EB}.setConfig({ damage: 25 }); $gameParty.leader().setHp($gameParty.leader().mhp); 'ok'`);
    rec("B9 有界", hp === 1 && dead === false && pd === false && scene === "Scene_Map" && act === true && st.stats.hits >= h0 + 2 && st.stats.hitsAtFloor >= 1, JSON.stringify({ hp, dead, playerDeath: pd, scene, soulActive: act, hits: st.stats.hits, atFloor: st.stats.hitsAtFloor }));
  });

  await check("B5 片づけ: DEFENSE の終わり(skip)・SOUL の終了で残らない・繰り返しのラウンドでも残らない", async () => {
    await ev(`${EB}.setConfig({ collision: false }); 0`);
    const rounds = [];
    for (let i = 0; i < 2; i++) {
      await freshDefense(); await sleep(2300);
      const live = (await state()).live, lc = await layerCount();
      await ev(`${SO}.skipPhase(); 'ok'`); await sleep(500);                       // DEFENSE → PREPARE
      const after = await state(), lc2 = await layerCount();
      rounds.push({ live, layerBefore: lc, afterLive: after.live, afterTele: after.telegraphs, layerAfter: lc2, phase: await phase() });
      await toPhase("attack"); await sleep(400);
      const inAttack = await state(); rounds[i].attackLive = inAttack.live;
    }
    await freshDefense(); await sleep(2300);
    const liveBeforeEnd = (await state()).live;
    await ev(`${SO}.end('abort'); 'ok'`); await sleep(600);
    const ended = await state(), lcEnd = await layerCount();
    rec("B5 片づけ", rounds.every(r => r.live > 0 && r.afterLive === 0 && r.afterTele === 0 && r.layerAfter === 0 && r.attackLive === 0) && liveBeforeEnd > 0 && ended.live === 0 && ended.telegraphs === 0 && ended.running === false && lcEnd === 0,
      JSON.stringify({ rounds, endLive: [liveBeforeEnd, ended.live], layerEnd: lcEnd }));
  });

  await check("B6 後片づけ: SOULを終えると元のマップへ戻り、保存データが変わらない", async () => {
    await ev(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const st = await state(), w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })"), after = await saved();
    await ev(`${EB}.disable(); 'ok'`);
    rec("B6 cleanup", back && st.live === 0 && after === before && w.map === origin.map && w.x === origin.x && w.y === origin.y, JSON.stringify({ back, live: st.live, unchanged: after === before, now: [w.map, w.x, w.y] }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("BZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_enemy_bullets_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ(prepare:true)・DEV弾幕 dev_fan・CDPの入力(人間の手動プレイの代わりではない)。ダメージ・当たり判定は未実装", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
