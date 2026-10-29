// Phase H2B-2 の実機検証(ストレングス・一閃)
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/h2b2_verify.cjs
//   すでに起動している Playtest(nw.exe <project> test --remote-debugging-port=9222)へ接続するだけです。MZを起動・終了しません。
//   ゲームのファイルは変更しません(メモリ上のEvent位置・装備・Regionを一時的に変えるだけ。セーブしない)。
//   HPは公式HPバーを読み、シーンのフレーム数で待ちます(表示の次のフレームで変数が更新される仕様のため)。
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
  const staging = async (ids) => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(v === null ? "Math.random = window.__r0 || Math.random; 'off'" : `window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const equip = id => ev(`$gameParty.leader().forceChangeEquip(0, $dataWeapons[${id}]); 'eq'`);
  const lostOf = async ids => { const o = {}; for (const id of ids) o[id] = 1000 - await barHp(id); return o; };
  const region = (x, y, id) => ev(`(function() { var m = $dataMap, size = m.width * m.height; var old = m.data[5 * size + ${y} * m.width + ${x}]; m.data[5 * size + ${y} * m.width + ${x}] = ${id}; return old; })()`);
  const vfxHook = () => ev("(function() { window.__vfxLog = []; if (!window.__vfxHooked) { var add = AnimatedPictureManager.addAnimatedPicture; AnimatedPictureManager.addAnimatedPicture = function(p) { window.__vfxLog.push(String(p.note) + ':' + Math.round(p.rotation * 180 / Math.PI)); return add.apply(this, arguments); }; window.__vfxHooked = true; } return 'hooked'; })()");
  const vfxLog = () => ev("JSON.stringify(window.__vfxLog || [])").then(JSON.parse);
  // 導入版Hendrixの武器ダメージ式(攻撃: a.atk * 4 - b.def * 2、分散20%)を、乱数0.9(randomInt(n)=floor(0.9n))で独立に計算する
  const expected = async (id, mult, bypass) => ev(`(function() { var a = $gameParty.leader().atk * ${mult}; var d = ${bypass} ? 0 : SgetBattlerForH($gameMap.event(${id})).def; var raw = a * 4 - d * 2; var amp = Math.floor(Math.abs(raw) * 20 / 100); var v = Math.floor(0.9 * (amp + 1)) * 2 - amp; return Math.round(raw + v); })()`);
  const attack = async (dx, dy = 0) => { const f = await s.foot(); await c.pointer(f.x + dx * 48, f.y + dy * 48 - 24); await sleep(120); await c.tap("J", 120); await settle(8); };
  const sleepState = id => ev(`hasState(${id}, 32)`);

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  rec("0 boot: 新Plugin(ストレングス・一閃)の読み込み", await ev("[ProjectRHermesStrength, ProjectRHermesIssen, ProjectRHermesTest].every(Boolean)"), "Chromium 85 / NW 0.48.4");
  await ev("ProjectRPresentationVfx.probeLibrary()"); await sleep(500);
  rec("0b VFX Designerライブラリに新カードの4エントリがある", await ev("Promise.all(['ProjectR_Issen_Trail','ProjectR_Issen_Lightning','ProjectR_Strength_Circle','ProjectR_Strength_Light'].map(function(n) { return getAnimationFromLibrary(n).then(function(d) { return !!d; }); })).then(function(a) { return a.every(Boolean); })"), "getAnimationFromLibrary");

  // ---------------- ストレングス ----------------
  const strengthScene = async lv => {
    await start("strength", lv); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(9, 15); await sleep(500); await locate(4, 10, 15); await locate(5, 12, 15); await equip(2); await resetHp(); await sleep(300);
  };
  await check("T1 levels", async () => {
    const res = {};
    for (const lv of [1, 2, 3]) {
      await strengthScene(lv);
      await attack(1); const base = 1000 - await barHp(4); await settle(30); await resetHp();
      const before = await st();
      for (let i = 0; i < 3; i++) { await c.tap("Q", 60); await settle(3); }
      const mid = await st();
      await attack(1); const boosted = 1000 - await barHp(4);
      const after = await st();
      const mult = lv === 1 ? 1.3 : 1.45;
      res[lv] = { base, boosted, expectBase: await expected(4, 1, false), expectBoost: await expected(4, mult, lv === 3), stacks: mid.strength && mid.strength.stacks, drawn: before.counts.draw - mid.counts.draw, after: after.strength };
    }
    const ok = [1, 2, 3].every(lv => res[lv].base === res[lv].expectBase && res[lv].boosted === res[lv].expectBoost && res[lv].stacks === 3 && res[lv].drawn === 3 && res[lv].after === null);
    rec("T1 実機: ストレングスLv1(x1.3)/Lv2(x1.45)/Lv3(x1.45+防御無視)の剣ダメージが、攻撃力を式に通した独立計算と一致。3回蓄え→1回で全消費", ok, res);
  });
  await check("T2 gun", async () => {
    await start("strength", 3); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(31, 15); await sleep(500); await ev("$gameMap.event(3).locate(37, 15); 'ok'"); await equip(51);
    await ev("ProjectRGunSystem.requestReload('t'); 'ok'"); await sleep(300); await wait("!ProjectRGunSystem.isReloading()", 15000);
    await resetHp();
    const shoot = async () => { const t = await ev("JSON.stringify({ x: $gameMap.event(3).screenX(), y: $gameMap.event(3).screenY() - 24 })").then(JSON.parse); await c.pointer(t.x, t.y); await sleep(120); const r = JSON.parse(await ev("JSON.stringify(ProjectRGunSystem.fire('t'))")); await settle(25); return r; };
    const s0 = await shoot(); const base = 1000 - await barHp(3); await resetHp();
    for (let i = 0; i < 2; i++) { await c.tap("Q", 60); await settle(3); }
    const s1 = await shoot(); const boosted = 1000 - await barHp(3); const after = (await st()).strength;
    await resetHp(); const s2 = await shoot(); const third = 1000 - await barHp(3);
    rec("T2 実機: G17の弾にもストレングスが乗り(Lv3 x1.3・防御無視)、次の弾は通常。弾数が撃った分だけ減る",
      s0.ok && s1.ok && s2.ok && base === await expected(3, 1, false) && boosted === await expected(3, 1.3, true) && after === null && third === base, { base, boosted, third });
    await equip(2);
  });
  await check("T3 zetsu", async () => {
    await strengthScene(3);
    await attack(1); const base = 1000 - await barHp(4); await settle(30); await resetHp();
    for (let i = 0; i < 2; i++) { await c.tap("Q", 60); await settle(3); }
    await ev("ProjectRCardModifiers.armWeaponHitBonus({ id: 'hermes_zetsu', multiplier: 2, seconds: 5, source: 'hermes_zetsu' }); 'armed'");
    await attack(1); const both = 1000 - await barHp(4);
    const left = { zetsu: await ev("ProjectRCardModifiers.getWeaponHitBonus()"), strength: (await st()).strength };
    rec("T3 実機: 絶 x2.0 とストレングス(x1.3・防御無視)が同じ命中で両方働き(ストレングスで上げた武器ダメージに絶の倍率)、どちらも1回だけ消費される",
      both === Math.round(await expected(4, 1.3, true) * 2) && left.zetsu === null && left.strength === null && base === await expected(4, 1, false), { base, both, left });
  });
  await check("T4 multi", async () => {
    await strengthScene(1);
    await locate(5, 10, 16); // 剣の1振りに2体(Event 4・5)が重なって入る
    await resetHp();
    for (let i = 0; i < 3; i++) { await c.tap("Q", 60); await settle(3); }
    await resetHp();
    await attack(1); const l = await lostOf([4, 5]);
    const after = (await st()).strength; const lastAttack = await ev("JSON.stringify(ProjectRHermesStrength.getLastAttack())").then(JSON.parse);
    await settle(30); await resetHp(); await attack(1); const next = await lostOf([4, 5]);
    rec("T4 実機: 1回の剣の斬撃が2体に当たり、2体とも同じ強化(x1.3)で、蓄えは1度だけ消費。次の斬撃は通常",
      l[4] > 0 && l[5] > 0 && l[4] === await expected(4, 1.3, false) && l[5] === await expected(5, 1.3, false) && after === null && lastAttack && lastAttack.stacks === 3 && next[4] === await expected(4, 1, false), { l, next, lastAttack });
  });
  await check("T5 visual", async () => {
    await strengthScene(1);
    await s.slow(5); await vfxHook();
    await c.tap("Q", 60);
    await s.sceneFrames(4);
    const info = await ev("JSON.stringify({ cut: ProjectRCutIn.getActive().map(function(e) { return e.kind; }), act: ProjectRCharacterPresentation.activeNames(), hermes: ProjectRGodSummonVisual.getVisuals().filter(function(v) { return v.kind === 'transient'; }).length })").then(JSON.parse);
    for (const n of [4, 8, 12, 20, 30]) { await s.sceneFrames(2); await s.shot("t5_f" + String(n).padStart(2, "0")); }
    const log = await vfxLog();
    await s.slow(1); await settle(130);
    const gone = await ev("JSON.stringify({ vfx: (AnimatedPictureManager._animatedPictures || []).length, hermes: ProjectRGodSummonVisual.getVisuals().filter(function(v) { return v.kind === 'transient'; }).length, cut: ProjectRCutIn.getActive().length, act: ProjectRCharacterPresentation.activeNames() })").then(JSON.parse);
    rec("T5 実機: 魔法陣・黄金の光(ライブラリ)・カットイン・ガッツポーズ・Hermesが出て、最後は全部片付く(蓄えは使われるまで残る)",
      log.some(v => /library_ProjectR_Strength_Circle|Strength_Circle/.test(v)) && log.some(v => /Strength_Light/.test(v)) && info.cut.includes("card") && info.act.includes("FistPump") && info.hermes >= 1
      && gone.vfx === 0 && gone.hermes === 0 && gone.cut === 0 && (await st()).strength.stacks === 1, { log, info, gone });
  });

  // ---------------- 一閃 ----------------
  const issenScene = async (lv, placements, rnd = 0.9) => {
    await start("issen", lv); await random(rnd); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(12, 25); await sleep(500);
    for (const [id, x, y] of placements) await locate(id, x, y);
    await resetHp(); await sleep(300);
  };
  await check("I1 direct", async () => {
    // 真上へ。4=3.5マス先 / 5=8マス先 / 6=右3マス(経路の外) / 2=11.8マス先(届かない)
    await issenScene(1, [[4, 12, 21], [5, 12, 17], [6, 15, 25], [3, 12, 13]], 0.0);
    const startPos = await s.pos();
    await s.aim(0, -3); const before = await st(); await c.tap("Q"); await settle(8);
    const lost = await lostOf([3, 4, 5, 6]); const after = await st(); const pos = await s.pos();
    rec("I1 実機: Lv1 経路上の敵(Event 4・5)に防御無視・クリティカルなしの200ダメージを1回ずつ(乱数0でも200)。経路外(6)・射程外(3)は0。主人公は動かない",
      lost[4] === 200 && lost[5] === 200 && lost[6] === 0 && lost[3] === 0 && after.counts.cooldown === before.counts.cooldown + 1 && near(pos.x, startPos.x, 1e-6) && near(pos.y, startPos.y, 1e-6), { lost, cooldown: after.counts.cooldown });
  });
  await check("I2 reach+wall", async () => {
    await issenScene(1, [[4, 12, 15], [5, 12, 13], [3, 12, 28]]); // 4: 約10マス / 5: 約12マス先(届かない)
    await s.aim(0, -3); await c.tap("Q"); await settle(8);
    const reach = await lostOf([4, 5]);
    await issenScene(1, [[4, 12, 22], [5, 12, 17]]);
    const olds = []; for (let x = 11; x <= 13; x++) olds.push([x, await region(x, 20, 255)]);
    await s.aim(0, -3); await c.tap("Q"); await settle(8);
    const walled = await lostOf([4, 5]); for (const [x, old] of olds) await region(x, 20, old);
    await s.shot("i2_wall");
    rec("I2 実機: 射程11マス(10マス先は当たり12マス先は届かない)。壁(Region 255)の向こうの敵(5)には当たらず、手前(4)は当たる", reach[4] === 200 && reach[5] === 0 && walled[4] === 200 && walled[5] === 0, { reach, walled });
  });
  await check("I3 angle+miss", async () => {
    await issenScene(1, [[4, 15, 22], [5, 9, 28]]); // 右上45度・左下
    await s.aim(3, -3); await c.tap("Q"); await settle(8);
    const l1 = await lostOf([4, 5]);
    await resetHp(); await s.aim(0, 3); const before = await st(); await c.tap("Q"); await settle(8);
    const miss = await lostOf([4, 5]); const after = await st();
    rec("I3 実機: 斜め(右上)のマウス方向へ一直線。外れてもカードは消費される", l1[4] === 200 && l1[5] === 0 && miss[4] === 0 && miss[5] === 0 && after.counts.cooldown === before.counts.cooldown + 1, { l1, miss });
  });
  await check("I4 split levels", async () => {
    const res = {};
    for (const lv of [1, 2, 3]) {
      await issenScene(lv, [[4, 12, 21]]);
      await s.aim(0, -3); await c.tap("Q"); await settle(6);
      const t0 = Date.now();
      const marks = [];
      const hit0 = 1000 - await barHp(4);
      // 戦闘時間(操作可能なフレーム)で3秒 = 180フレーム。1秒ごとの累積を読む
      for (let sec = 1; sec <= 4; sec++) { await settle(60); marks.push(1000 - await barHp(4) - hit0); }
      const splits = (await st()).splits;
      res[lv] = { direct: hit0, marks, splits: splits.length, speedAfter: await ev("ProjectRCardModifiers.characterSpeedFactor($gameMap.event(4))"), took: Date.now() - t0 };
    }
    const tol = (v, e) => Math.abs(v - e) <= 34; // 1秒の境界のフレーム誤差(1tick分)を許す。最終の合計は厳密
    const ok = res[1].direct === 200 && res[1].marks[3] === 50 && res[2].marks[3] === 100 && res[3].marks[3] === 100 && tol(res[1].marks[0], 17) && tol(res[2].marks[1], 67)
      && [1, 2, 3].every(lv => res[lv].splits === 0 && res[lv].speedAfter === 1);
    rec("I4 実機: 分割ダメージの合計は Lv1 50 / Lv2 100 / Lv3 100(3秒で厳密に保存され、その後は増えない)。期限後に状態・速度係数が残らない", ok, res);
  });
  await check("I5 slow", async () => {
    await issenScene(3, [[4, 12, 21]]);
    const base = await ev("$gameMap.event(4).distancePerFrame()");
    await s.aim(0, -3); await c.tap("Q"); await settle(6);
    const slowed = await ev("$gameMap.event(4).distancePerFrame()");
    // 実際に動かして移動距離を比べる(通り抜け・同じ速度設定で20frame)
    const walk = () => ev("(function() { var e = $gameMap.event(4); e.setThrough(true); var x0 = e._realX; for (var i = 0; i < 20; i++) { e.moveStraight(6); e.update(); } var d = e._realX - x0; e.locate(12, 21); return d; })()");
    const dSlow = await walk();
    await settle(200);
    const restored = await ev("$gameMap.event(4).distancePerFrame()");
    const dFree = await walk();
    rec("I5 実機: Lv3の移動速度-50%: distancePerFrameが半分になり、実際の移動距離も約半分。3秒後に元へ戻る",
      near(slowed / base, 0.5, 1e-9) && near(restored / base, 1, 1e-9) && dFree > 0 && near(dSlow / dFree, 0.5, 0.12), { base, slowed, restored, dSlow, dFree });
  });
  await check("I6 visual", async () => {
    await issenScene(3, [[4, 12, 21], [5, 12, 16]]);
    const eventsBefore = await ev("$gameMap.events().filter(Boolean).length");
    await s.aim(0, -3); await s.slow(5); await vfxHook();
    await c.tap("Q");
    await s.sceneFrames(2);
    const early = await ev("JSON.stringify({ act: ProjectRCharacterPresentation.activeNames(), cut: ProjectRCutIn.getActive().map(function(e) { return e.kind; }) })").then(JSON.parse);
    const shots = [];
    for (const n of [2, 4, 6, 8, 12, 20]) { await s.sceneFrames(n === 2 ? 1 : 2); shots.push(await ev("JSON.stringify({ hermesY: (function() { var id = ProjectRGodSummonVisual.getTransientEventId('hermes'); var e = id ? $gameMap.event(id) : null; return e ? e._realY : null; })() })").then(JSON.parse)); await s.shot("i6_f" + String(n).padStart(2, "0")); }
    const info = await ev("JSON.stringify({ cut: ProjectRCutIn.getActive().map(function(e) { return e.kind; }), act: ProjectRCharacterPresentation.activeNames() })").then(JSON.parse);
    const log = await vfxLog();
    await s.slow(1); await settle(300);
    const gone = await ev("JSON.stringify({ vfx: (AnimatedPictureManager._animatedPictures || []).length, hermes: ProjectRGodSummonVisual.getVisuals().filter(function(v) { return v.kind === 'transient'; }).length, cut: ProjectRCutIn.getActive().length, events: $gameMap.events().filter(Boolean).length, splits: ProjectRHermesIssen.getActiveSplits().length })").then(JSON.parse);
    const ys = shots.map(x => x.hermesY).filter(y => y !== null);
    rec("I6 実機: 白い斬撃の軌跡・白黒の雷(ライブラリ)がUp向きに経路へ・カットイン・ArmSweep・Hermesが前方(上)へ駆ける。最後は全部片付き、Eventが増えたまま残らない",
      log.some(v => /issen\.trail:0/.test(v)) && log.some(v => /issen\.lightning:0/.test(v)) && info.cut.includes("card") && early.act.includes("ArmSweep") && early.cut.includes("card") && ys.length >= 3 && ys[0] - ys[ys.length - 1] > 3
      && gone.vfx === 0 && gone.hermes === 0 && gone.cut === 0 && gone.events === eventsBefore && gone.splits === 0, { log, info, ys, gone, eventsBefore });
  });

  await random(null); await goHome(); await ev("ProjectRHermesTest.end(); 'ok'"); await sleep(500);
  rec("Z 全体: Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  fs.writeFileSync(`${OUT}/h2b2_real_mz_results.json`, JSON.stringify({ chromium: await ev("process.versions.chromium + ' / nw ' + process.versions.nw"), results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
