// Phase H2B-1 の実機検証(絶の取引・薙ぎ払い・葦笛)
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/h2b1_verify.cjs
//   すでに起動している Playtest(nw.exe <project> test --remote-debugging-port=9222)へ接続するだけです。MZを起動・終了しません。
//   ゲームのファイルは変更しません(メモリ上のEvent位置・装備・Regionを一時的に変えるだけ。セーブしない)。
//   HPの表示は「次のフレーム」で更新されるため、ダメージは公式HPバーの値を、シーンのフレームを数えて待ってから読みます。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const near = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.message).slice(0, 300)); } };
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const start = async (card, lv) => { const r = await ev(`JSON.stringify(ProjectRHermesTest.start(${JSON.stringify(card)}, ${lv}))`); await sleep(400); await s.slow(1); return JSON.parse(r); };
  const st = () => ev("JSON.stringify(ProjectRHermesTest.status())").then(JSON.parse);
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const settle = n => s.sceneFrames(n || 10);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const HOME = { 2: [44, 6], 3: [37, 15], 4: [10, 15], 5: [12, 15], 6: [11, 17] };
  const goHome = async () => { for (const [id, [x, y]] of Object.entries(HOME)) await locate(Number(id), x, y); await settle(); };
  const random = v => ev(v === null ? "Math.random = window.__r0 || Math.random; 'off'" : `window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const equip = id => ev(`$gameParty.leader().forceChangeEquip(0, $dataWeapons[${id}]); 'eq'`);
  const cool = async () => (await st()).counts;
  const pointerBody = async (dx, dy) => { const f = await s.foot(); return c.pointer(f.x + dx * 48, f.y + dy * 48 - 24); };
  const hasState = id => ev(`hasState(${id}, 32)`);
  const region = (x, y, id) => ev(`(function() { var m = $dataMap, size = m.width * m.height; var old = m.data[5 * size + ${y} * m.width + ${x}]; m.data[5 * size + ${y} * m.width + ${x}] = ${id}; return old; })()`);
  // 作られたVFXを記録する(短い再生でも取りこぼさない)
  const vfxHook = () => ev("(function() { window.__vfxLog = []; if (!window.__vfxHooked) { var add = AnimatedPictureManager.addAnimatedPicture; AnimatedPictureManager.addAnimatedPicture = function(p) { window.__vfxLog.push(String(p.note) + ':' + Math.round(p.rotation * 180 / Math.PI)); return add.apply(this, arguments); }; window.__vfxHooked = true; } return 'hooked'; })()");
  const vfxLog = () => ev("JSON.stringify(window.__vfxLog || [])").then(JSON.parse);
  const staging = async (ids) => { for (const id of ids) await locate(id, 40 - id, 3); }; // 使わない敵を遠くへ

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  rec("0 boot: 新Plugin(薙ぎ払い・葦笛・DEVアリーナ)の読み込み・Library probe", await ev("[ProjectRHermesSweep, ProjectRHermesReedFlute, ProjectRHermesTest, ProjectRHermesZetsu].every(Boolean)"), "Chromium 85 / NW 0.48.4");
  await ev("ProjectRPresentationVfx.probeLibrary()"); await sleep(500);
  rec("0b VFX Designerライブラリにはカードの3エントリがある", await ev("Promise.all(['ProjectR_Sweep_Staff','ProjectR_Flute_Ripple','ProjectR_Hermes_Vanish'].map(function(n) { return getAnimationFromLibrary(n).then(function(d) { return !!d; }); })).then(function(a) { return a.every(Boolean); })"), "getAnimationFromLibrary");

  // ---------------- Z. 絶の取引 ----------------
  await check("Z1 transaction", async () => {
    await start("zetsu", 2); await random(0.9); await goHome(); await s.place(12, 25); await sleep(500); await s.aim(5, 0);
    const before = await st();
    await c.tap("Q", 60);
    const mid = await st();
    const pending = await ev("ProjectRHermesZetsu.isTeleportPending()");
    const midLast = mid.last.zetsu;
    await wait("!ProjectRHermesZetsu.isTeleportPending()", 3000); await settle(4);
    const after = await st(); const where = await s.pos();
    rec("Z1 実機: 予約の間は未消費(手札・山札・Cooldown不変)、予備動作の後に1回だけ消費して移動",
      pending && midLast.consumed === false && JSON.stringify(mid.hand) === JSON.stringify(before.hand) && mid.counts.cooldown === 0 && mid.counts.draw === before.counts.draw
      && after.counts.cooldown === 1 && after.counts.draw === before.counts.draw - 1 && near(where.x, 17, 0.1) && after.last.zetsu.consumed === true,
      { pending, midConsumed: midLast.consumed, cooldown: [mid.counts.cooldown, after.counts.cooldown], draw: [before.counts.draw, mid.counts.draw, after.counts.draw], x: where.x });
  });
  await check("Z2 abort", async () => {
    await start("zetsu", 3); await random(0.9); await s.place(12, 25); await sleep(500); await s.aim(5, 0);
    const before = await st();
    // 予約と同じ処理の中で、目的地のすぐ手前まで歩いた状態を作る(8frameの予備動作の間に着地できなくなる)
    await ev("(function() { ProjectRCardDeck.requestUseCard(0); $gamePlayer.setPosition(16.95, 25); return 'ok'; })()");
    await wait("!ProjectRHermesZetsu.isTeleportPending()", 3000); await settle(4);
    const after = await st(); const last = after.last.zetsu;
    rec("Z2 実機: 目的地に着けない場合は中止され、カード・Cooldown・補充・強化・速度係数は何も起きない",
      last.aborted === true && last.consumed === false && JSON.stringify(after.hand) === JSON.stringify(before.hand) && after.counts.cooldown === 0
      && after.counts.draw === before.counts.draw && (await ev("ProjectRCardModifiers.getWeaponHitBonus()")) === null && (await ev("ProjectRCardModifiers.moveSpeedFactor()")) === 1,
      { reason: last.reason, cooldown: after.counts.cooldown });
    await s.shot("z2_abort");
    // 中止の後に、神の表示・VFX・カットイン・予約が残らない
    await settle(120);
    const left = await ev("JSON.stringify({ hermes: ProjectRGodSummonVisual.getVisuals().filter(function(v) { return v.kind === 'transient'; }).length, summons: ProjectRGodSummonManager.getActiveSummons().length, vfx: (AnimatedPictureManager._animatedPictures || []).length, cut: ProjectRCutIn.getActive().length, pending: ProjectRHermesZetsu.isTeleportPending(), act: ProjectRCharacterPresentation.activeNames() })").then(JSON.parse);
    rec("Z2b 実機: 中止された絶の後に、神の表示・召喚・VFX・カットイン・予約・腕クロスが残らない", left.hermes === 0 && left.summons === 0 && left.vfx === 0 && left.cut === 0 && !left.pending && !left.act.includes("CrossArms"), left);
  });
  await check("Z3 multi", async () => {
    await start("zetsu", 1); await random(0.9); await s.place(12, 25); await sleep(500); await s.aim(5, 0);
    const before = await st();
    // 同じ入力を続けて(Q→E→Q)。予約は1つ、確定で1枚だけ消費
    await c.keyDown("Q"); await sleep(30); await c.keyUp("Q"); await c.keyDown("E"); await sleep(30); await c.keyUp("E"); await c.keyDown("Q"); await sleep(30); await c.keyUp("Q");
    await wait("!ProjectRHermesZetsu.isTeleportPending()", 3000); await settle(4);
    const after = await st();
    rec("Z3 実機: 連続入力でも消費は1枚・予約は1つ(二重発動なし)", after.counts.cooldown === 1 && after.counts.draw === before.counts.draw - 1, { cooldown: after.counts.cooldown, draw: [before.counts.draw, after.counts.draw] });
  });

  // ---------------- S. 薙ぎ払い ----------------
  const sweepScene = async (lv, placements) => {
    await start("sweep", lv); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(12, 25); await sleep(500);
    for (const [id, x, y] of placements) await locate(id, x, y);
    await resetHp(); await sleep(300);
  };
  const lostOf = async (ids) => { const o = {}; for (const id of ids) o[id] = 1000 - await barHp(id); return o; };
  await check("S1 lv1", async () => {
    // 3体(Event 3・5・6: IDは固定ではない)が扇の中。Event 4は真後ろ、Event 2は遠い
    await sweepScene(1, [[3, 12, 22], [5, 15, 25], [6, 9, 25], [4, 12, 28]]);
    await s.aim(0, -3); const before = await st();
    await c.tap("Q"); await settle(8);
    const lost = await lostOf([2, 3, 4, 5, 6]); const after = await st();
    rec("S1 実機: Lv1 扇の中の敵(Event 3・5・6)に50ダメージを1回ずつ、真後ろ(4)・遠方(2)には当たらない",
      lost[3] === 50 && lost[5] === 50 && lost[6] === 50 && lost[4] === 0 && lost[2] === 0 && after.counts.cooldown === before.counts.cooldown + 1, { lost, cooldown: after.counts.cooldown });
  });
  await check("S2 angles", async () => {
    await sweepScene(1, [[4, 15, 22], [5, 9, 28]]); // 右上45度・左下225度(どちらも半径約4.2→当たるのは3マス強まで)
    await locate(4, 14, 23); await locate(5, 10, 27); await resetHp();
    await s.aim(3, -3); await c.tap("Q"); await settle(8);
    const l1 = await lostOf([4, 5]);
    await resetHp(); await s.aim(-3, 3); await c.tap("Q"); await settle(8);
    const l2 = await lostOf([4, 5]);
    // 扇の境界: 真上を向いて、右80度(内側)・右115度(外側)・左80度(内側)・左115度(外側)の敵(半径約3)
    await sweepScene(1, [[4, 15, 24], [5, 15, 27], [6, 9, 24], [3, 9, 27]]); // 4: 約80度 5: 約115度 6: -80度 3: -115度
    await s.aim(0, -3); await c.tap("Q"); await settle(8);
    const edge = await lostOf([3, 4, 5, 6]);
    rec("S2b 実機: 扇の境界(190度): 80度の内側は当たり、115度の外側は当たらない(左右とも)", edge[4] === 50 && edge[6] === 50 && edge[5] === 0 && edge[3] === 0, edge);
    rec("S2 実機: 斜めのマウス方向(右上・左下)へ扇が向く(4方向の近似ではない)", l1[4] === 50 && l1[5] === 0 && l2[4] === 0 && l2[5] === 50, { upRight: l1, downLeft: l2 });
  });
  await check("S3 tip crit", async () => {
    await sweepScene(2, [[4, 12, 22], [5, 12, 24]]); // 4: 先端(約3マス)、5: 約1.5マス
    await s.aim(0, -3); await c.tap("Q"); await settle(8);
    const lv2 = await lostOf([4, 5]);
    await start("sweep", 3); await random(0.0); await goHome(); await staging([2, 3, 4, 5, 6]); await s.place(12, 25); await sleep(500); await locate(4, 12, 22); await locate(5, 12, 24); await resetHp();
    await s.aim(0, -3); await c.tap("Q"); await settle(8);
    const lv3crit = await lostOf([4, 5]);
    const mult = await ev("new SHendrix_Action($gameParty.leader()).applyCritical(1)");
    await random(0.9);
    await start("sweep", 3); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]); await s.place(12, 25); await sleep(500); await locate(4, 12, 22); await locate(5, 12, 24); await resetHp();
    await s.aim(0, -3); await c.tap("Q"); await settle(8);
    const lv3plain = await lostOf([4, 5]);
    rec("S3 実機: Lv2 先端+50(100/50)。Lv3 乱数が低いとクリティカル確定 (50x倍率)+先端50、高いと通常",
      lv2[4] === 100 && lv2[5] === 50 && lv3crit[5] === Math.round(50 * mult) && lv3crit[4] === Math.round(50 * mult) + 50 && lv3plain[4] === 100 && lv3plain[5] === 50, { lv2, lv3crit, lv3plain, mult });
  });
  await check("S4 wall+miss", async () => {
    await sweepScene(1, [[4, 12, 20], [5, 12, 23]]);
    const olds = []; for (let x = 9; x <= 15; x++) olds.push([x, await region(x, 22, 255)]);
    await s.aim(0, -3); await c.tap("Q"); await settle(8);
    const walled = await lostOf([4, 5]);
    for (const [x, old] of olds) await region(x, 22, old);
    await s.shot("s4_wall");
    // 空振り: 誰もいない方向を向く。カードは消費される
    await resetHp(); await s.aim(0, 3); const before = await st(); await c.tap("Q"); await settle(8);
    const miss = await lostOf([4, 5]); const after = await st();
    rec("S4 実機: 壁(Region 255)の向こうの敵(4)には当たらず手前(5)は当たる。外れてもカードは消費される", walled[4] === 0 && walled[5] === 50 && miss[4] === 0 && miss[5] === 0 && after.counts.cooldown === before.counts.cooldown + 1, { walled, miss, cooldown: [before.counts.cooldown, after.counts.cooldown] });
  });
  await check("S5 visual", async () => {
    await sweepScene(1, [[4, 14, 24], [5, 15, 25]]);
    await s.aim(3, 0); await s.slow(5); await vfxHook();
    await c.tap("Q");
    await s.sceneFrames(3);
    const degreeS5 = await ev("ProjectRHermesSweep.getLastResult().degree");
    const info = await ev("JSON.stringify({ vfx: (AnimatedPictureManager._animatedPictures || []).map(function(p) { return String(p.note) + ':' + Math.round(p.rotation * 180 / Math.PI); }), cut: ProjectRCutIn.getActive().map(function(e) { return e.kind; }), act: ProjectRCharacterPresentation.activeNames(), hermes: ProjectRGodSummonVisual.getVisuals().filter(function(v) { return v.kind === 'transient'; }).length })").then(JSON.parse);
    for (const n of [4, 8, 12, 20, 30]) { await s.sceneFrames(2); await s.shot("s5_f" + String(n).padStart(2, "0")); }
    await s.slow(1); await settle(120);
    const gone = await ev("JSON.stringify({ vfx: (AnimatedPictureManager._animatedPictures || []).length, hermes: ProjectRGodSummonVisual.getVisuals().filter(function(v) { return v.kind === 'transient'; }).length, cut: ProjectRCutIn.getActive().length })").then(JSON.parse);
    rec("S5 実機: 杖の残像VFX(発動時に固定した扇の向きへ回転)・ArmSweep・カットイン・Hermesが出て、最後は全部片付く",
      (await vfxLog()).some(v => v === `ProjectR:hermes_sweep.staff:${Math.round(degreeS5)}`) && info.cut.includes("card") && info.act.includes("ArmSweep") && info.hermes >= 1 && gone.vfx === 0 && gone.hermes === 0 && gone.cut === 0, { info, gone, degree: degreeS5, log: await vfxLog() });
  });

  // ---------------- F. 葦笛 ----------------
  const fluteScene = async (lv, placements, rnd = 0.9) => {
    await start("flute", lv); await random(rnd); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(12, 25); await sleep(500);
    for (const [id, x, y] of placements) await locate(id, x, y);
    await resetHp(); await sleep(300);
  };
  await check("F1 range", async () => {
    // 半径8: 4=真上7マス(範囲内) / 5=右8マス(体が触れる) / 6=左10マス(範囲外) / 3=真下2マス
    await fluteScene(1, [[4, 12, 18], [5, 20, 25], [6, 2, 25], [3, 12, 27]]);
    const before = await st(); await s.slow(4); await c.tap("Q"); await s.sceneFrames(3); await s.shot("f1_ripple_a"); await s.sceneFrames(10); await s.shot("f1_ripple_b"); await s.sceneFrames(14); await s.shot("f1_ripple_c"); await s.slow(1); await settle(10);
    const flags = {}; for (const id of [3, 4, 5, 6]) flags[id] = await hasState(id);
    const after = await st();
    rec("F1 実機: 半径8マスの敵(Event 3・4・5)が眠り、範囲外(6)は眠らない。睡眠時間は旧葦笛から引き継いだ4秒", flags[3] && flags[4] && flags[5] && !flags[6] && after.counts.cooldown === before.counts.cooldown + 1 && after.sleepers.length === 3 && after.sleepers[0].remaining > 2.5 && after.sleepers[0].remaining <= 4, { flags, sleepers: after.sleepers });
  });
  await check("F2 wall+none", async () => {
    await fluteScene(1, [[4, 12, 20], [5, 12, 29]]);
    const olds = []; for (let x = 6; x <= 18; x++) olds.push([x, await region(x, 23, 255)]);
    await c.tap("Q"); await settle(8);
    const f = { 4: await hasState(4), 5: await hasState(5) };
    for (const [x, old] of olds) await region(x, 23, old);
    // 対象なし: 範囲内に誰もいなくても消費される
    await start("flute", 1); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]); await s.place(12, 25); await sleep(500);
    const before = await st(); await c.tap("Q"); await settle(8); const after = await st();
    rec("F2 実機: 壁の向こう(4)は眠らず手前(5)は眠る。対象が誰もいなくてもカードは消費され、エラーもない",
      !f[4] && f[5] && after.counts.cooldown === before.counts.cooldown + 1 && after.sleepers.length === 0 && after.last.flute.noTarget === true && s.errors().length === 0, { f, cooldown: [before.counts.cooldown, after.counts.cooldown], errors: s.errors().length });
  });
  const swing = async (dir) => { await pointerBody(dir, 0); await sleep(120); await c.tap("J", 120); await settle(8); };
  await check("F3 wake bonus", async () => {
    const res = {};
    for (const lv of [1, 2, 3]) {
      // 敵4を西隣から斬る。基準(起きている)→ 葦笛 → 最初の斬撃 → 起きる → 2回目
      await fluteScene(lv, [[4, 10, 15], [5, 12, 18]], 0.9); await equip(2);
      await s.place(9, 15); await sleep(500);
      await resetHp(); await swing(1); const base = 1000 - await barHp(4);
      await settle(30);
      await resetHp();
      await c.tap("Q"); await settle(6);
      const asleep = await hasState(4);
      await swing(1); const first = 1000 - await barHp(4); const awoke = !(await hasState(4));
      await settle(30); await swing(1); const second = 1000 - await barHp(4) - first;
      res[lv] = { base, asleep, first, awoke, second };
    }
    // Lv3: クリティカル確定を基準にする(同じ武器でitemCriを1に固定した場合のダメージ)
    await fluteScene(3, [[4, 10, 15]], 0.9); await equip(2); await s.place(9, 15); await sleep(500); await resetHp();
    await ev("window.__oc = SHendrix_Action.prototype.itemCri; SHendrix_Action.prototype.itemCri = function() { return 1; }; 'p'");
    await swing(1); const critBase = 1000 - await barHp(4);
    await ev("SHendrix_Action.prototype.itemCri = window.__oc; delete SHendrix_Action.prototype.itemCri; 'r'");
    rec("F3 実機: Lv1 加算なしで起きる / Lv2 最初の命中だけ +50 / Lv3 クリティカル確定 + 50。起きた後は通常ダメージ",
      res[1].asleep && res[1].first === res[1].base && res[1].awoke && res[1].second === res[1].base
      && res[2].asleep && res[2].first === res[2].base + 50 && res[2].awoke && res[2].second === res[2].base
      && res[3].asleep && res[3].first === critBase + 50 && res[3].awoke && critBase > res[3].base, { res, critBase });
  });
  await check("F4 visual", async () => {
    await fluteScene(1, [[4, 12, 21]]);
    await s.slow(5); await vfxHook(); await c.tap("Q");
    await s.sceneFrames(3);
    const info = await ev("JSON.stringify({ vfx: (AnimatedPictureManager._animatedPictures || []).map(function(p) { return String(p.note); }), cut: ProjectRCutIn.getActive().map(function(e) { return e.kind; }), act: ProjectRCharacterPresentation.activeNames(), hermes: ProjectRGodSummonVisual.getVisuals().filter(function(v) { return v.kind === 'transient'; }).length })").then(JSON.parse);
    for (const n of [4, 8, 12, 20, 30]) { await s.sceneFrames(2); await s.shot("f4_f" + String(n).padStart(2, "0")); }
    await s.slow(1); await settle(120);
    const gone = await ev("JSON.stringify({ vfx: (AnimatedPictureManager._animatedPictures || []).length, hermes: ProjectRGodSummonVisual.getVisuals().filter(function(v) { return v.kind === 'transient'; }).length, cut: ProjectRCutIn.getActive().length })").then(JSON.parse);
    rec("F4 実機: 水面の波VFX(ライブラリ)・カットイン・Hermesが出る。主人公の動作はなし。最後は全部片付く",
      ((await vfxLog()).some(v => /Flute_Ripple/.test(v)) || info.vfx.some(v => /Flute_Ripple/.test(v))) && info.cut.includes("card") && info.hermes >= 1 && !info.act.some(n => /SkillCast|CrossArms|ArmSweep/.test(n)) && gone.vfx === 0 && gone.hermes === 0 && gone.cut === 0, { info, gone, log: await vfxLog() });
  });

  // ---------------- 後始末と全体 ----------------
  await random(null); await goHome(); await ev("ProjectRHermesTest.end(); 'ok'"); await sleep(500);
  rec("Z 全体: Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  fs.writeFileSync(`${OUT}/h2b1_real_mz_results.json`, JSON.stringify({ chromium: await ev("process.versions.chromium + ' / nw ' + process.versions.nw"), results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
