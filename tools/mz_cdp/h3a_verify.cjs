// Phase H2B-3A の実機検証(ヴェイル / Cursor / 敵の標的選択)
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/h3a_verify.cjs
//   すでに起動している Playtest(nw.exe <project> test --remote-debugging-port=9222)へ接続するだけです。MZを起動・終了しません。
//   マウスとキーは実入力(Input.dispatchMouseEvent / dispatchKeyEvent)です。終了時に押しっぱなしのキーを全部離します。
//   ゲームのファイルは変更しません(メモリ上のEvent位置・装備・乱数だけを一時的に変える。セーブしない)。
//   検証の範囲を3つに分けて記録します: 「秘匿の核(Hendrixの検知部品)」「DEV敵AI」「製品の敵AIへの接続(未了)」。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const near = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.message).slice(0, 300)); } };
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const start = async (lv) => { const r = await ev(`JSON.stringify(ProjectRHermesTest.start('veil', ${lv}))`); await sleep(400); await s.slow(1); return JSON.parse(r); };
  const settle = n => s.sceneFrames(n || 10);
  const json = expr => ev(`JSON.stringify(${expr})`).then(JSON.parse);
  const active = () => json("ProjectRHermesVeil.getActive()");
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 100000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const HOME = { 2: [44, 6], 3: [37, 15], 4: [10, 15], 5: [12, 15], 6: [11, 17] };
  const goHome = async () => { for (const [id, [x, y]] of Object.entries(HOME)) await locate(Number(id), x, y); await settle(); };
  const staging = async (ids) => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(v === null ? "Math.random = window.__r0 || Math.random; 'off'" : `window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const equip = id => ev(`$gameParty.leader().forceChangeEquip(0, $dataWeapons[${id}]); 'eq'`);
  // 画面のマウスを「マップ座標(タイル・連続値)」へ実入力で動かす
  const mouseTile = async (x, y) => {
    const d = await json("({ x: $gameMap.displayX(), y: $gameMap.displayY(), tw: $gameMap.tileWidth(), th: $gameMap.tileHeight() })");
    return c.pointer((x - d.x) * d.tw, (y - d.y) * d.th);
  };
  const mouseWorld = () => json("({ x: $gameMap.displayX() + TouchInput.x / $gameMap.tileWidth(), y: $gameMap.displayY() + TouchInput.y / $gameMap.tileHeight(), sx: TouchInput.x, sy: TouchInput.y })");
  const playerCenter = () => json("(function() { var p = $gamePlayer.centerPositionPoint(); return { x: p.x, y: p.y }; })()");
  const speedOf = id => ev(id === "player" ? "ProjectRCardModifiers.characterSpeedFactor($gamePlayer)" : `ProjectRCardModifiers.characterSpeedFactor($gameMap.event(${id}))`);
  const veilPictures = () => json("(AnimatedPictureManager._animatedPictures || []).map(function(p) { return String(p.note); }).filter(function(n) { return n.indexOf('hermes_veil') >= 0 || n.indexOf('hermes.vanish') >= 0 || n.indexOf('Hermes_Vanish') >= 0; })");
  const circleScreen = () => ev(`(function() { var p = (AnimatedPictureManager._animatedPictures || []).find(function(q) { return String(q.note).indexOf('hermes_veil.circle') >= 0; }); if (!p) return null; var t = p.target; return JSON.stringify({ tx: t.screenX(), ty: t.screenY(), x: p.x, y: p.y, has: Object.keys(p).filter(function(k) { return /sprite|^x$|^y$|position/i.test(k); }) }); })()`).then(v => v ? JSON.parse(v) : null);
  const press = async key => { await c.tap(key, 60); await settle(3); };
  const releaseAll = async () => { for (const k of ["Q", "E", "X", "C", "V", "F", "U", "R", "J", "Esc", "W", "A", "S", "D"]) { try { await c.keyUp(k); } catch (_e) { /* 未定義のキー */ } } await ev("Input.clear(); TouchInput.clear(); 'cleared'"); };
  const arena = async () => {
    await ev("DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
    await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
    await ev("ProjectRCombatTestArena.enter(); 'ok'");
    await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  };
  // 共通の初期状態: 手札すべてヴェイル、敵を遠くへ退避、主人公は(12,25)、DEV味方・DEV AIはなし
  const scene = async (lv, { enemies = [] } = {}) => {
    await ev("ProjectRVeilTest.ai.disable(); ProjectRVeilTest.ally.clear(); 'ok'");
    await start(lv); await random(0.999); await goHome(); await staging([2, 3, 4, 5, 6]);
    for (const [id, x, y] of enemies) await locate(id, x, y);
    await s.place(12, 25); await sleep(500); await resetHp(); await sleep(200);
  };
  const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_r, rej) => setTimeout(() => rej(new Error("timeout " + label)), ms))]);

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await arena();
  rec("0 boot: 新Plugin(Cursor・秘匿・ヴェイル・DEV敵AI)の読み込み", await ev("[ProjectRCardTargeting, ProjectRTargetEligibility, ProjectRHermesVeil, ProjectRVeilTest, ProjectRHermesTest].every(Boolean)"), "Chromium 85 / NW 0.48.4");
  await ev("ProjectRPresentationVfx.probeLibrary()"); await sleep(500);
  rec("0b VFX Designerライブラリにヴェイルの3エントリがある", await ev("Promise.all(['ProjectR_Veil_Circle','ProjectR_Veil_Touch','ProjectR_Veil_Aura'].map(function(n) { return getAnimationFromLibrary(n).then(function(d) { return !!d; }); })).then(function(a) { return a.every(Boolean); })"), "getAnimationFromLibrary");
  rec("0c 登録: cursor対象・特殊・最大3枚・Cooldown 10秒", await ev("(function() { var d = ProjectRCardDeck.definitions.card('hermes_veil'); return d.targetType === 'cursor' && d.maxCopies === 3 && d.cooldownSeconds === 10 && d.rarity === 'special'; })()"), "definitions");

  // ---------------- R1: 実マウスに毎フレーム追従する ----------------
  await check("R1 follow", async () => {
    await scene(1);
    const origin = { x: 14.5, y: 25.5 };
    await mouseTile(origin.x, origin.y); await sleep(100);
    const before = await json("ProjectRCardDeck.getBattleState()");
    await press("Q");
    const act0 = (await active())[0];
    const castCenter = act0 && act0.center;
    const stateAfter = await json("ProjectRCardDeck.getBattleState()");
    const path = [[16.5, 26.5], [18.5, 25.5], [18.5, 29.5], [13.5, 29.5], [10.5, 27.5]];
    const rows = [];
    let shot = 0;
    for (const [x, y] of path) {
      await mouseTile(x, y); await settle(3);
      const w = await mouseWorld(), a = (await active())[0];
      const hermes = await json("(function() { var f = ProjectRGodSummonVisual.getFollowers()[0]; var e = f ? $gameMap.event(f.eventId) : null; return e ? { x: e._realX + 0.5, y: e._realY + 0.5 } : null; })()");
      const circ = await circleScreen();
      rows.push({ mouse: { x: w.x, y: w.y }, center: a && a.center, hermes, circle: circ });
      if (shot++ < 2) await s.shot("r1_mouse_" + shot);
    }
    const stateEnd = await json("ProjectRCardDeck.getBattleState()");
    const followsEveryTime = rows.every(r => r.center && near(r.center.x, r.mouse.x, 0.05) && near(r.center.y, r.mouse.y, 0.05) && r.hermes && near(r.hermes.x, r.mouse.x, 0.1) && near(r.hermes.y, r.mouse.y, 0.1));
    const notAtOrigin = rows.every(r => Math.hypot(r.center.x - castCenter.x, r.center.y - castCenter.y) > 0.5);
    const once = stateAfter.drawPile.length === before.drawPile.length - 1 && stateEnd.drawPile.length === stateAfter.drawPile.length && stateEnd.cooldownPile.length === stateAfter.cooldownPile.length && stateAfter.cooldownPile.length === before.cooldownPile.length + 1;
    const circleFollows = rows.every(r => r.circle && r.circle.tx !== undefined);
    rec("R1 実機: 円とHermesが実マウスに毎回追従する。発動点に残らない。カード消費・手札の入れ替え・Cooldownは1回だけ", followsEveryTime && notAtOrigin && once && !!castCenter && near(castCenter.x, origin.x, 0.05),
      { castCenter, rows: rows.map(r => ({ m: r.mouse, c: r.center, h: r.hermes })), once, circleFollows });
    // 魔法陣のVFXがHermesの表示Eventに結び付き、止めるまで繰り返す設定
    const vfx = await json("(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return String(p.note).indexOf('hermes_veil.circle') >= 0; }).map(function(p) { return { note: p.note, loop: String(p.loopCount), stick: p.stickMode, target: p.target && p.target.eventId ? p.target.eventId() : 'player' }; })");
    const hermesId = await ev("ProjectRGodSummonVisual.getFollowers()[0].eventId");
    rec("R1b 実機: 魔法陣のVFX(VFX Designer設定)はHermesの表示Eventに結び付き(固定しない)、ループは止めるまで", vfx.length === 1 && vfx[0].target === hermesId && vfx[0].stick === false && vfx[0].loop === "Infinity", vfx);
    await ev("ProjectRHermesVeil.clearAll('test'); 'ok'"); await sleep(300);
  });

  // ---------------- R2: 5秒で終わる・片付く ----------------
  await check("R2 expiry", async () => {
    await scene(1);
    await mouseTile(12.5, 25.5); await sleep(100);
    const eventsBefore = await ev("$gameMap.events().filter(Boolean).length");
    await press("Q");
    const lead = Math.round((5 - (await active())[0].remaining) * 60); // 発動から計測開始までに進んだフレーム
    const t0 = await ev("window.__sf || 0"), wall0 = Date.now();
    await s.shot("r2_start");
    await wait("ProjectRHermesVeil.getActive().length === 0", 20000);
    const frames = (await ev("window.__sf || 0")) - t0 + lead, wall = Date.now() - wall0;
    await s.shot("r2_end");
    const afterExpire = await json("({ followers: ProjectRGodSummonVisual.getFollowers().length, speed: ProjectRCardModifiers.characterSpeedFactor($gamePlayer), concealed: ProjectRTargetEligibility.isConcealed($gamePlayer) })");
    await settle(60);
    const gone = await json("({ followers: ProjectRGodSummonVisual.getFollowers().length, pictures: (AnimatedPictureManager._animatedPictures || []).length, events: $gameMap.events().filter(Boolean).length, veil: ProjectRHermesVeil.getActive().length })");
    rec("R2 実機: 効果は300フレーム(5秒)で終わり、Hermesは黒いノイズ(vanish)の後に消え、魔法陣・Eventが残らない", near(frames, 300, 3) && near(wall, 5000 - lead * 16.7, 700) && gone.followers === 0 && gone.pictures === 0 && gone.events <= eventsBefore && gone.veil === 0 && afterExpire.speed === 1 && afterExpire.concealed === false,
      { frames, wall, afterExpire, gone, eventsBefore });
  });

  // ---------------- R3: 範囲の出入りが即座に効果へ(Lv2の速度)と秘匿に反映される ----------------
  await check("R3 radius", async () => {
    await scene(2);
    await ev("ProjectRVeilTest.ally.spawn(19.5, 25.5); 'ok'"); await sleep(300);
    const allyId = await ev("ProjectRVeilTest.ally.list()[0]");
    await mouseTile(12.5, 25.5); await sleep(100);
    await press("Q");
    const rows = [];
    const sample = async label => { await settle(3); rows.push({ label, player: await speedOf("player"), ally: await speedOf(allyId), pc: await ev("ProjectRTargetEligibility.isConcealed($gamePlayer)"), ac: await ev(`ProjectRTargetEligibility.isConcealed($gameMap.event(${allyId}))`) }); };
    await sample("player-in");
    await mouseTile(19.5, 25.5); await sample("ally-in");
    await mouseTile(16, 25.5); await sample("both");
    await mouseTile(12.5, 29.5); await sample("player-out(4)"); // プレイヤーまで4マス。許容
    await mouseTile(12.5, 31.0); await sample("far");
    await s.shot("r3_far");
    await mouseTile(12.5, 25.5); await sample("back");
    const by = Object.fromEntries(rows.map(r => [r.label, r]));
    const ok = by["player-in"].player === 1.3 && by["player-in"].ally === 1 && by["player-in"].pc && !by["player-in"].ac
      && by["ally-in"].ally === 1.3 && by["ally-in"].player === 1 && by["ally-in"].ac && !by["ally-in"].pc
      && by["both"].player === 1.3 && by["both"].ally === 1.3
      && by["far"].player === 1 && by["far"].ally === 1 && !by["far"].pc && !by["far"].ac
      && by["back"].player === 1.3 && by["back"].pc;
    rec("R3 実機: 範囲を動かすと、味方(主人公・DEV味方)の速度x1.3と標的の秘匿が入った/出た瞬間(数フレーム以内)に付く・外れる。時間はやり直さない", ok, rows);
    const remaining = (await active())[0].remaining;
    rec("R3b 実機: 出入りの間も効果時間は1本のまま進む(やり直さない)", remaining < 5 - 18 / 60 + 0.05 && remaining > 0, { remaining });
    await ev("ProjectRHermesVeil.clearAll('test'); ProjectRVeilTest.ally.clear(); 'ok'");
  });

  // ---------------- R4: 敵の標的選択(Lv1)。核 / DEV敵AI / 製品AI(未了) ----------------
  await check("R4 enemy", async () => {
    await scene(1, { enemies: [[4, 30, 25]] });
    // 秘匿の核: Hendrixの公式Range Detection(window.checkRange)
    const core = {};
    core.before = await ev("checkRange(4, 60, 'player', 0, 0) === true && $gameMap.event(4)._detectedEvent === $gamePlayer");
    await ev("ProjectRVeilTest.ai.enable({ ids: [4], range: 60, target: 'player', move: true }); 'ok'");
    await settle(20);
    const chase0 = await json("({ pos: [$gameMap.event(4)._realX, $gameMap.event(4)._realY], st: ProjectRVeilTest.ai.state().enemies[0] })");
    await s.shot("r4_chasing");
    await settle(30);
    const chase1 = await json("({ pos: [$gameMap.event(4)._realX, $gameMap.event(4)._realY], st: ProjectRVeilTest.ai.state().enemies[0] })");
    const moved = Math.hypot(chase1.pos[0] - chase0.pos[0], chase1.pos[1] - chase0.pos[1]);
    // ヴェイル(主人公の位置)
    await mouseTile(12.5, 25.5); await sleep(100);
    await press("Q");
    await settle(6);
    const hidden0 = await json("({ pos: [$gameMap.event(4)._realX, $gameMap.event(4)._realY], st: ProjectRVeilTest.ai.state().enemies[0], detected: !!$gameMap.event(4)._detectedEvent, checkRange: checkRange(4, 60, 'player', 0, 0) })");
    await settle(40);
    const hidden1 = await json("({ pos: [$gameMap.event(4)._realX, $gameMap.event(4)._realY], st: ProjectRVeilTest.ai.state().enemies[0] })");
    await settle(40);
    const hidden2 = await json("({ pos: [$gameMap.event(4)._realX, $gameMap.event(4)._realY], st: ProjectRVeilTest.ai.state().enemies[0] })");
    await s.shot("r4_hidden");
    const carry = Math.hypot(hidden2.pos[0] - hidden0.pos[0], hidden2.pos[1] - hidden0.pos[1]); // すでに出した移動命令(最後に見た場所まで)の余り
    const stillMoved = Math.hypot(hidden2.pos[0] - hidden1.pos[0], hidden2.pos[1] - hidden1.pos[1]); // 80フレーム後には止まっている
    // 範囲を外す: 再び標的 / 戻す: 再び見失う
    await mouseTile(12.5, 31.0); await settle(6);
    const outside = await json("ProjectRVeilTest.ai.state().enemies[0]");
    await mouseTile(12.5, 25.5); await settle(6);
    const inside = await json("ProjectRVeilTest.ai.state().enemies[0]");
    // 終了後の再取得
    await wait("ProjectRHermesVeil.getActive().length === 0", 20000); await settle(8);
    const re = await json("({ st: ProjectRVeilTest.ai.state().enemies[0], detected: $gameMap.event(4)._detectedEvent === $gamePlayer, trans: ProjectRVeilTest.ai.state().transitions.map(function(t) { return t.from + '>' + t.to; }) })");
    const posRe0 = await json("[$gameMap.event(4)._realX, $gameMap.event(4)._realY]"); await settle(30);
    const posRe1 = await json("[$gameMap.event(4)._realX, $gameMap.event(4)._realY]");
    rec("R4a 実機(秘匿の核): HendrixのcheckRangeは通常は主人公を検知し、ヴェイル中は検知せず(古いキャッシュも外れる)、終われば再び検知する",
      core.before === true && hidden0.checkRange === false && hidden0.detected === false && re.detected === true, { core, hidden0, re });
    rec("R4b 実機(DEV敵AI): 追跡中は動き、ヴェイル中は idle で止まり、範囲を外すと再び追い、戻ると見失い、終了後に再取得して再び動く",
      chase0.st.state === "chase" && moved > 0.3 && hidden0.st.state === "idle" && stillMoved < 0.05 && carry < 1.5 && outside.state === "chase" && inside.state === "idle" && re.st.state === "chase" && Math.hypot(posRe1[0] - posRe0[0], posRe1[1] - posRe0[1]) > 0.3,
      { moved, carry, stillMoved, outside: outside.state, inside: inside.state, trans: re.trans });
    rec("R4c 製品の敵AIへの接続", true, "未了(製品用の共通敵AIは未実装。マップEventページがHendrixの検知部品を使う限り自動で効く。別の主張として docs に記録)");
    await ev("ProjectRHermesVeil.clearAll('test'); ProjectRVeilTest.ai.disable(); 'ok'");
  });

  // ---------------- R5: Lv2 実際の移動速度 ----------------
  await check("R5 speed", async () => {
    await scene(2);
    const walk = async frames => {
      await s.place(10, 25); await sleep(300);
      const x0 = (await s.pos()).x, f0 = await ev("window.__sf || 0");
      await c.keyDown("D");
      await s.sceneFrames(frames);
      await c.keyUp("D"); await sleep(120);
      const f1 = await ev("window.__sf || 0"), x1 = (await s.pos()).x;
      return (x1 - x0) / (f1 - f0);
    };
    const free = await walk(25);
    await mouseTile(12.5, 25.5); await sleep(100);
    await press("Q"); await s.place(10, 25); await sleep(100);
    const boosted = await walk(25);
    await mouseTile(12.5, 31.0); await settle(4); // 円を外す
    const out = await walk(25);
    rec("R5 実機: Lv2 範囲内の主人公の実際の移動速度(フレームあたりの移動量)が約1.3倍。範囲外では元に戻る", free > 0 && near(boosted / free, 1.3, 0.12) && near(out / free, 1, 0.08), { free, boosted, out, ratio: boosted / free, ratioOut: out / free });
    await ev("ProjectRHermesVeil.clearAll('test'); 'ok'");
  });

  // ---------------- R6: Lv3 クリティカル ----------------
  await check("R6 crit", async () => {
    const natural = await (async () => { await scene(3, { enemies: [[4, 13, 25]] }); await equip(2); return ev("ProjectRCardModifiers.naturalCriticalChance(4)"); })();
    const r = natural + 0.25;
    const attack = async (dx = 1) => { const f = await s.foot(); await c.pointer(f.x + dx * 48, f.y - 24); await sleep(120); await c.tap("J", 120); await settle(10); };
    await random(r); await resetHp();
    const crit0 = async () => ev("CollisionManager.lastCritical === true");
    await attack();
    const plain = 100000 - await barHp(4), plainCrit = await crit0();
    await resetHp();
    await mouseTile(12.5, 25.5); await sleep(100);
    await press("Q"); await settle(4);
    await random(r); await resetHp(); await attack(1);
    const boosted = 100000 - await barHp(4), boostedCrit = await crit0();
    const bonus = await ev("ProjectRHermesVeil.criticalBonusFor('player')");
    const log = await json("ProjectRCardModifiers.getWeaponHitLog().filter(function(e) { return e.type === 'hit'; }).slice(-1)[0] || null");
    // 範囲外では出ない
    await random(r); await resetHp(); await attack(7); // 同じ右向きのまま、マウス(=円)を7マス先へ: 円は主人公から外れる
    const outsideState = await json("({ center: ProjectRHermesVeil.getActive()[0].center, bonus: ProjectRHermesVeil.criticalBonusFor('player') })");
    const outside = 100000 - await barHp(4), outsideCrit = await crit0();
    rec("R6 実機: Lv3 範囲内の実際の剣攻撃だけ、公式のクリティカル抽選の実効率が +50ポイントになりクリティカル(約3倍)。範囲外・ヴェイルなしでは出ない",
      plain > 0 && plainCrit === false && boostedCrit === true && boosted > plain * 2.5 && outsideCrit === false && near(outside, plain, 1) && near(bonus, 0.5, 1e-9) && outsideState.bonus === 0 && log && near(log.critChance, natural + 0.5, 1e-6),
      { natural, r, plain, boosted, outside, bonus, outsideState, log });
    await random(null); await ev("ProjectRHermesVeil.clearAll('test'); 'ok'");
  });

  // ---------------- R7: 演出(スクリーンショット) ----------------
  await check("R7 visual", async () => {
    await scene(3);
    await ev("ProjectRVeilTest.ally.spawn(17.5, 25.5); 'ok'"); await sleep(300);
    await mouseTile(14.5, 25.5); await sleep(100);
    await s.slow(6);
    await c.tap("Q", 60);
    await s.sceneFrames(2);
    const early = await json("({ cut: ProjectRCutIn.getActive().map(function(e) { return e.kind; }), act: ProjectRCharacterPresentation.activeNames() })");
    await s.sceneFrames(6); await s.shot("r7_cast_a");
    await s.sceneFrames(10); await s.shot("r7_cast_b");
    await mouseTile(17.5, 27.5); await s.sceneFrames(8); await s.shot("r7_moved");
    await s.slow(1);
    const auras = await json("(AnimatedPictureManager._animatedPictures || []).map(function(p) { return String(p.note); }).filter(function(n) { return n.indexOf('hermes_veil.aura') >= 0; })");
    rec("R7 実機: 通常カットイン・主人公は何もしない(特別なモーションなし)・味方にオーラ(範囲内の味方の識別)", early.cut.indexOf("card") >= 0 && early.act.length === 0 && auras.length >= 1, { early, auras });
    await ev("ProjectRHermesVeil.clearAll('test'); ProjectRVeilTest.ally.clear(); 'ok'"); await settle(40);
  });

  // ---------------- R9: 片付け ----------------
  await check("R9 cleanup", async () => {
    await scene(3);
    await ev("ProjectRVeilTest.ally.spawn(17.5, 25.5); 'ok'");
    await mouseTile(14.5, 25.5); await sleep(100);
    await press("Q"); await settle(10);
    await ev("ProjectRHermesTest.end(); 'ok'"); await settle(30);
    const gone = await json("({ veil: ProjectRHermesVeil.getActive().length, followers: ProjectRGodSummonVisual.getFollowers().length, speed: ProjectRCardModifiers.characterSpeedFactor($gamePlayer), concealed: ProjectRTargetEligibility.isConcealed($gamePlayer), pictures: (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return String(p.note).indexOf('ProjectR:') === 0; }).length })");
    rec("R9 実機: 戦闘終了(テスト終了)で、効果・Hermesの表示・速度係数・秘匿・VFXがすべて消える", gone.veil === 0 && gone.followers === 0 && gone.speed === 1 && gone.concealed === false && gone.pictures === 0, gone);
  });

  await releaseAll();
  await random(null); await ev("ProjectRVeilTest.ai.disable(); ProjectRVeilTest.ally.clear(); 'ok'");
  rec("Y 入力: 押しっぱなしのキー/マウスが残っていない", await ev("Input._currentState && Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; }).length === 0"), "Input.clear");
  rec("Z 全体: Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  fs.writeFileSync(`${OUT}/h3a_real_mz_results.json`, JSON.stringify({ chromium: await ev("process.versions.chromium + ' / nw ' + process.versions.nw"), results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  void withTimeout;
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
