// Phase H2B-3B の実機検証(サイコポンポス / 撃破の帰属 / 魂)
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/h3b_verify.cjs
//   すでに起動している Playtest(nw.exe <project> test --remote-debugging-port=9222)へ接続するだけです。MZを起動・終了しません。
//   キー(Q・J・D)とマウスは実入力(Input.dispatchKeyEvent / dispatchMouseEvent)です。終了時に押しっぱなしのキーを全部離します。
//   ゲームのファイルは変更しません(メモリ上のEvent位置・HP・Region・装備・乱数だけを一時的に変える。セーブしない)。
//   敵を倒す入力は、剣(実際のJキー)と、公式UpdateEventHpコマンド(ProjectRSoulTest.hit: 製品の攻撃Pluginが呼ぶのと同じコマンド)の2通り。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const near = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.message).slice(0, 400)); } };
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const settle = n => s.sceneFrames(n || 10);
  const start = async (lv) => { const r = await json(`ProjectRHermesTest.start('psychopomp', ${lv})`); await sleep(400); await s.slow(1); return r; };
  const random = v => ev(v === null ? "Math.random = window.__r0 || Math.random; 'off'" : `window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const HOME = { 2: [44, 6], 3: [37, 15], 4: [10, 15], 5: [12, 15], 6: [11, 17] };
  const goHome = async () => { for (const [id, [x, y]] of Object.entries(HOME)) await locate(Number(id), x, y); await settle(); };
  const staging = async (ids) => { for (const id of ids) await locate(id, 40 - id, 3); };
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 100000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : -1; })()`);
  const setBar = (id, hp) => ev(`ProjectRSoulTest.hp(${id}, ${hp})`);
  const equip = id => ev(`$gameParty.leader().forceChangeEquip(0, $dataWeapons[${id}]); 'eq'`);
  const playerHp = () => ev("$gameParty.leader().hp");
  const setPlayerHp = v => ev(`$gameParty.leader().setHp(${v}); 'ok'`);
  const state = () => json("ProjectRCardDeck.getBattleState()");
  const psy = () => json("({ windows: ProjectRHermesPsychopomp.getWindows(), buff: ProjectRHermesPsychopomp.getBuff(), heals: ProjectRHermesPsychopomp.getHealLog(), kills: ProjectRHermesPsychopomp.getKillLog(), ignored: ProjectRHermesPsychopomp.getIgnored(), souls: ProjectRSoulCollection.list(), diag: ProjectRHermesPsychopomp.diagnostics(), soulDiag: ProjectRSoulCollection.diagnostics(), attr: ProjectRKillAttribution.diagnostics() })");
  const notes = () => json("(AnimatedPictureManager._animatedPictures || []).map(function(p) { return String(p.note); })");
  const notesLike = async word => (await notes()).filter(n => n.indexOf(word) >= 0);
  const followers = () => json("ProjectRGodSummonVisual.getFollowers()");
  const press = async key => { await c.tap(key, 60); await settle(3); };
  const releaseAll = async () => { for (const k of ["Q", "E", "X", "C", "V", "F", "U", "R", "J", "Esc", "W", "A", "S", "D"]) { try { await c.keyUp(k); } catch (_e) { /* 未定義のキー */ } } await ev("Input.clear(); TouchInput.clear(); 'cleared'"); };
  const region = (x, y, id) => ev(`ProjectRSoulTest.wall(${x}, ${y}, ${id})`);
  const arena = async () => {
    await ev("DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
    await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
    await ev("ProjectRCombatTestArena.enter(); 'ok'");
    await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  };
  const scene = async lv => {
    await start(lv); await random(0.999); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(12, 25); await sleep(500); await resetHp(); await setPlayerHp(100); await sleep(200);
  };
  // 手札を「サイコポンポス x2 + 別のカード x3」にして戦闘を開始し直す(テスト用の並べ替え。本番のデッキ検証は変えない)。
  const mixed = async (otherId, otherLevel) => {
    await ev(`ProjectRCardDeck.setCardOwned('${otherId}', true); ProjectRCardDeck.setCardLevel('${otherId}', ${otherLevel}); 'ok'`);
    const r = await json(`(function(order) { var d = ProjectRCardDeck; d.endCardBattle(); var reg = d.definitions.cards, originals = new Map();
      order.forEach(function(id) { if (!originals.has(id)) { originals.set(id, reg.get(id)); reg.set(id, Object.freeze(Object.assign({}, reg.get(id), { maxCopies: 30 }))); } });
      var r = Math.random; Math.random = function() { return 1 - Number.EPSILON; }; var res = d.startCardBattle(order.slice().reverse()); Math.random = r;
      originals.forEach(function(card, id) { reg.set(id, card); }); return { ok: res.ok, hand: d.getBattleState().hand.map(function(x) { return x.cardId; }) }; })(
      ['hermes_psychopomp', 'hermes_psychopomp', '${otherId}', '${otherId}', '${otherId}'].concat(Array.apply(null, Array(25)).map(function(_, i) { return ['apollo_golden_arrow', 'apollo_plague_attack', 'hermes_sword_attack', 'hermes_swift_movement', 'hermes_reed_flute_sleep', 'apollo_lyre_calm', 'hermes_perception_obscure'][i % 7]; })))`);
    await random(0.999); await settle(3);
    return r;
  };
  const useCardId = id => json(`(function() { $gamePlayer.center($gamePlayer._realX, $gamePlayer._realY); var i = ProjectRCardDeck.getBattleState().hand.findIndex(function(c) { return c.cardId === '${id}'; }); var r = ProjectRCardDeck.requestUseCard(i); return { ok: r.ok, cardId: r.cardId, i: i }; })()`);
  const expected = (mult, bypass) => ev(`(function() { var b = SgetBattlerForH($gameMap.event(4)); var atk = $gameParty.leader().atk * ${mult}, def = ${bypass ? "0" : "b.def"}; var raw = atk * 4 - def * 2; return Math.round(raw + Math.floor(Math.abs(raw) * 20 / 100)); })()`);
  // 通常の武器攻撃(剣/銃が呼ぶのと同じ公式コマンド)。乱数0.999固定。敵4のHPを100000へ戻してから撃ち、減ったHPを返す。
  const weaponDamage = async (attackId, target = 4) => {
    await setBar(target, 100000);
    await ev(`(function() { var i = new Game_Interpreter(); i._eventId = 0; PluginManager.callCommand(i, 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${target}', value: '-player weapon', exceedMaxHealth: 'false', projectRAttackId: '${attackId}' }); return 'hit'; })()`);
    return 100000 - await barHp(target);
  };
  const sceneNote = () => ev("SceneManager._scene.constructor.name");

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await arena();
  rec("0 boot: 新Plugin(帰属・魂・サイコポンポス・DEV)の読み込み", await ev("[ProjectRKillAttribution, ProjectRSoulCollection, ProjectRHermesPsychopomp, ProjectRSoulTest, ProjectRHermesTest].every(Boolean)"), "Chromium 85 / NW 0.48.4");
  await ev("ProjectRPresentationVfx.probeLibrary()"); await sleep(600);
  rec("0b VFX Designerライブラリに魂・Hermesの4エントリがある", await ev("Promise.all(['ProjectR_Soul_Manifest','ProjectR_Soul_Hover','ProjectR_Soul_Collect','ProjectR_Psychopomp_Strike'].map(function(n) { return getAnimationFromLibrary(n).then(function(d) { return !!d; }); })).then(function(a) { return a.every(Boolean); })"), "getAnimationFromLibrary");
  rec("0c 登録: instant・通常・最大3枚・Cooldown 10秒・設計ID2 = Heal(メタデータ)", await ev("(function() { var d = ProjectRCardDeck.definitions.card('hermes_psychopomp'); var g = ProjectRCardCatalog.hermesDesign().find(function(x) { return x.designId === 2; }); return d.targetType === 'instant' && d.maxCopies === 3 && d.cooldownSeconds === 10 && d.rarity === 'normal' && g.workbookTargetType === 'Heal' && g.implemented === true && ProjectRCardCatalog.isFinalDeckActivated() === false; })()"), "");
  rec("0d 3Dアセット: 指をはじく動作(FingerSnap)のスプライトが実機で読み込める", await ev("ProjectRCharacterPresentation.profileForPlayer().actions.FingerSnap.sprite === '$DEV3H_FingerSnap_f4'"), "$DEV3H_FingerSnap_f4");

  // ---------------- R1: 発動(実キーQ) ----------------
  await check("R1 activation", async () => {
    await scene(1);
    const before = await state();
    await press("Q"); await settle(4);
    const after = await state(), p = await psy();
    rec("R1 実キーQを1回: カードは1回だけ消費(山札-1・Cooldown+1)・10秒の窓が1つ・回復なし・魂なし・最大HPは変わらない",
      after.drawPile.length === before.drawPile.length - 1 && after.cooldownPile.length === before.cooldownPile.length + 1 && p.windows.length === 1 && p.windows[0].remaining > 9.5 && p.windows[0].remaining <= 10
      && p.heals.length === 0 && p.souls.length === 0 && (await playerHp()) === 100, { before: before.drawPile.length, after: after.drawPile.length, windows: p.windows, hp: await playerHp() });
    await settle(120);
    const later = await psy();
    rec("R2 窓の間、敵を倒さなければ回復しない(魂を拾うまで回復しない)", (await playerHp()) === 100 && later.heals.length === 0 && later.windows.length === 1 && later.windows[0].remaining < 8.1, { hp: await playerHp(), remaining: later.windows[0] && later.windows[0].remaining });
    await settle(500);
    rec("R2b 10秒(約600フレーム)で窓は終わる", (await psy()).windows.length === 0, "");
  });

  // ---------------- R3: 実際の剣で倒す → 魂 → 近いので回収して回復 ----------------
  await check("R3 sword kill", async () => {
    await scene(2); await equip(2); await random(0.999);
    await press("Q"); await settle(4);
    await locate(4, 13, 25); await settle(3);
    await setBar(4, 1);
    await setPlayerHp(100);
    await s.aim(3, 0); await settle(3);
    await press("J"); await settle(14);
    const p = await psy(), enemy = await json("(function() { var e = $gameMap.event(4), c = e.centerPositionPoint(); return { x: c.x, y: c.y }; })()");
    const death = p.kills[0];
    const snaps = await ev("ProjectRCharacterPresentation.history().filter(function(h) { return h.ok && h.name === 'FingerSnap'; }).length");
    const hermes = await followers(); // スクリーンショットは時間がかかるので、状態を先に読む
    await s.shot("r3_sword_kill");
    rec("R3 実際の剣(Jキー)で倒す → 主人公の撃破として魂1つ(倒れた場所)・指をはじく・Hermesが現れる", (await barHp(4)) === 0 && p.kills.length === 1 && death.attacker === "player" && death.source === "weapon" && p.diag.soulsSpawned === 1 && snaps === 1 && hermes.length === 1,
      { hp: await barHp(4), kills: p.kills, snaps, hermes: hermes.length, enemy });
    await settle(10);
    const q = await psy();
    rec("R3b 近い魂は自動回収: Lv2で+100回復(HP 100 → 200)・魂は消える・二重回復なし", (await playerHp()) === 200 && q.heals.length === 1 && q.heals[0].applied === 100 && q.souls.length === 0 && q.soulDiag.collected === 1, { hp: await playerHp(), heals: q.heals });
    await settle(120);
    const r = await psy();
    rec("R4 重複なし: 倒れた敵を何度殴っても、魂・通知は増えない", await (async () => { for (let i = 0; i < 3; i++) await weaponDamage("sword:dup" + i); const t = await psy(); return t.diag.soulsSpawned === 1 && t.attr.notified === 1 && t.heals.length === 1 && (await playerHp()) === 200; })(), { notified: r.attr.notified });
    await settle(60);
    rec("R4b Hermesの表示Eventは演出の後に黒いノイズで消え、残らない", (await followers()).length === 0 && (await notesLike("hermes.vanish")).length === 0, { followers: (await followers()).length });
  });

  // ---------------- R5: 範囲(実際に歩く) ----------------
  await check("R5 range", async () => {
    await scene(1);
    await press("Q"); await settle(4);
    await ev("ProjectRSoulTest.layout(12.5, 25.5); 'ok'"); await settle(3);
    await ev("$gameMap.event(4).locate(19, 25); 'ok'"); await settle(3); // id4 を約6.5マス東へ(範囲外)
    await ev("ProjectRSoulTest.hit(4)"); await settle(3);
    const spawned = await psy();
    const soul = spawned.souls[0];
    const d0 = await ev(`ProjectRSoulCollection.distance($gamePlayer.centerPositionPoint(), { x: ${soul.position.x}, y: ${soul.position.y} })`);
    rec("R5 範囲外(約6.5マス)の魂は回収されず残る・回復なし", spawned.souls.length === 1 && spawned.heals.length === 0 && d0 > 5, { d0, soul: soul.position });
    await s.shot("r5_soul_hover");
    // 魂のVFXが、魂の位置(画面上の位置)に出ている: 錨Eventの画面位置 = 魂の位置、描画された絵(AnimatedPicture)も同じ場所
    const where = await json(`(function() { var p = (AnimatedPictureManager._animatedPictures || []).find(function(q) { return String(q.note).indexOf('hermes_psychopomp.soul') >= 0; }); if (!p) return null; var t = p.target; return { tx: t.screenX(), ty: t.screenY(), px: p.x, py: p.y, wantX: (${soul.position.x} - $gameMap.displayX()) * $gameMap.tileWidth(), wantY: (${soul.position.y} - $gameMap.displayY()) * $gameMap.tileHeight() }; })()`);
    rec("R5a 魂のVFXは魂の位置に出る: 結び付けた錨Eventの画面位置が、魂の位置(画面座標)と一致する(Yは公式の足元基準 +18px)", !!where && near(where.tx, where.wantX, 1.5) && near(where.ty, where.wantY + 18, 1.5), where);
    // Dキーを押して歩き、回収された瞬間の距離を記録する(毎フレーム観測)
    await c.keyDown("D");
    let last = d0, collectedAt = null, prev = d0;
    const t0 = Date.now();
    while (Date.now() - t0 < 6000) {
      const dist = await ev(`ProjectRSoulCollection.distance($gamePlayer.centerPositionPoint(), { x: ${soul.position.x}, y: ${soul.position.y} })`);
      const n = await ev("ProjectRHermesPsychopomp.getHealLog().length");
      if (n >= 1) { collectedAt = { distanceWhenSeen: dist, previous: prev }; break; }
      prev = dist; last = dist;
      await sleep(8);
    }
    await c.keyUp("D"); await settle(4);
    rec("R5b 歩いて中心距離が5マス以内に入った瞬間に回収される(直前は5マス超、回収は5マス付近)", !!collectedAt && collectedAt.previous > 4.9 && collectedAt.distanceWhenSeen <= 5.2, { collectedAt, last });
    const after = await psy();
    rec("R5c 回収で回復は1回(Lv1 +50)・魂は消え、窓の間に二重回復しない", after.heals.length === 1 && after.heals[0].applied === 50 && after.souls.length === 0 && (await playerHp()) === 150, { hp: await playerHp() });
  });

  // ---------------- R6: 壁 ----------------
  await check("R6 wall", async () => {
    await scene(1);
    await press("Q"); await settle(4);
    await ev("ProjectRSoulTest.layout(12.5, 25.5); 'ok'"); await settle(3);
    const olds = []; for (const y of [24, 25, 26]) olds.push([y, await region(14, y, 255)]);
    await ev("ProjectRSoulTest.hit(3)"); await settle(3); // id3 は東3マス(壁の向こう・範囲内)
    await settle(90);
    const behind = await psy();
    rec("R6 壁(Region 255)の向こうの魂(範囲内3マス)は回収できず、魂は残る・回復なし", behind.souls.length === 1 && behind.heals.length === 0 && behind.soulDiag.blockedByWall >= 1 && (await playerHp()) === 100, { blocked: behind.soulDiag.blockedByWall });
    for (const [y, old] of olds) await region(14, y, old);
    await settle(10);
    const open = await psy();
    rec("R6b 壁を外すと回収され、回復する(Lv1 +50)", open.heals.length === 1 && open.souls.length === 0 && (await playerHp()) === 150, { hp: await playerHp() });
  });

  // ---------------- R7: レベル別の回復量 ----------------
  await check("R7 heal levels", async () => {
    const values = {};
    for (const [lv, amount] of [[1, 50], [2, 100], [3, 150]]) {
      await scene(lv);
      await press("Q"); await settle(4);
      await ev("ProjectRSoulTest.layout(12.5, 25.5); 'ok'"); await settle(3);
      await ev("ProjectRSoulTest.hit(3)"); await settle(8);
      values[lv] = { hp: await playerHp(), expected: 100 + amount, mhp: await ev("$gameParty.leader().mhp") };
    }
    rec("R7 Lv1 +50 / Lv2 +100 / Lv3 +150(最大HPは変わらない)", Object.entries(values).every(([lv, v]) => v.hp === v.expected), values);
    // 最大HPの上限
    await scene(3); await press("Q"); await settle(4);
    const mhp = await ev("$gameParty.leader().mhp"); await setPlayerHp(mhp - 20);
    await ev("ProjectRSoulTest.layout(12.5, 25.5); ProjectRSoulTest.hit(3); 'ok'"); await settle(8);
    const log = (await psy()).heals;
    rec("R7b 最大HPを超えない: 不足20だけ回復(要求150・適用20)・最大HP不変", (await playerHp()) === mhp && log[0].applied === 20 && log[0].requested === 150 && (await ev("$gameParty.leader().mhp")) === mhp, { log });
  });

  // ---------------- R8/R9: Lv3 の重ね掛け・時間のリセット・失効・攻撃力の復元 ----------------
  await check("R8 stack", async () => {
    await scene(3); await equip(2);
    await press("Q"); await settle(4);
    await ev("ProjectRSoulTest.layout(12.5, 25.5); 'ok'"); await settle(3);
    const atk0 = await ev("$gameParty.leader().atk");
    const base = await weaponDamage("sword:b0");
    await ev("ProjectRSoulTest.hit(3)"); await settle(3);
    const one = await psy();
    await settle(90); // 1.5秒
    const mid = await psy();
    await ev("ProjectRSoulTest.hit(2)"); await settle(3);
    const two = await psy();
    rec("R8 Lv3: 魂1つ目で+3%(x1.03)・3秒。1.5秒後の2つ目で2重(x1.06)・共有の残り時間が3秒へ戻る", one.buff && one.buff.stacks === 1 && near(one.buff.multiplier, 1.03, 1e-9) && mid.buff.remaining < 1.6 && mid.buff.remaining > 1.3
      && two.buff.stacks === 2 && near(two.buff.multiplier, 1.06, 1e-9) && two.buff.remaining > 2.8, { one: one.buff, mid: mid.buff, two: two.buff });
    const buffed = await weaponDamage("sword:b1"), buffed2 = await weaponDamage("sword:b2");
    const exp1 = await expected(1.06, false);
    rec("R9 攻撃力x1.06が通常の武器ダメージに効く(公式式で独立に計算した値と一致)。攻撃しても消費されない・基礎ATKは変わらない", buffed === exp1 && buffed2 === exp1 && base === await expected(1, false) && (await ev("$gameParty.leader().atk")) === atk0 && (await psy()).buff.stacks === 2, { base, buffed, buffed2, exp1, atk0 });
    await s.shot("r9_buffed");
    await settle(200); // 3.3秒
    const gone = await psy();
    const restored = await weaponDamage("sword:b3");
    rec("R9b 3秒で全スタックが消え、攻撃力の影響は元に戻る(ダメージ = 基準と同じ)", gone.buff === null && restored === base && (await ev("$gameParty.leader().atk")) === atk0, { restored, base });
  });

  // ---------------- R10: ストレングス・絶との併用 ----------------
  await check("R10 strength zetsu", async () => {
    await scene(3); await equip(2);
    const hand = await mixed("hermes_strength", 1);
    rec("R10 準備: 手札にサイコポンポス2枚・ストレングス3枚", hand.ok && hand.hand.filter(x => x === "hermes_psychopomp").length === 2 && hand.hand.filter(x => x === "hermes_strength").length === 3, hand);
    await s.place(12, 25); await sleep(300); await ev("ProjectRSoulTest.layout(12.5, 25.5); 'ok'"); await settle(3);
    const used = await useCardId("hermes_psychopomp"); await settle(4);
    await ev("ProjectRSoulTest.hit(3); ProjectRSoulTest.hit(2); 'ok'"); await settle(6); // 2スタック x1.06
    const s1 = await useCardId("hermes_strength"), s2 = await useCardId("hermes_strength"); await settle(3);
    const pending = await json("ProjectRHermesStrength.getPending()");
    const d1 = await weaponDamage("sword:s1");
    const after = await psy(), pend2 = await json("ProjectRHermesStrength.getPending()");
    const e1 = await expected(1.2 * 1.06, false);
    rec("R10 ストレングス(+10%x2)とサイコポンポス(+3%x2)は掛け合わさる: 攻撃力 x1.2 x 1.06。ストレングスは消費・サイコポンポスは残る", used.ok && s1.ok && s2.ok && pending.stacks === 2 && d1 === e1 && pend2 === null && after.buff.stacks === 2, { used, d1, e1, pending, after: after.buff });
    const d2 = await weaponDamage("sword:s2");
    rec("R10b 次の攻撃はサイコポンポスだけ(x1.06)", d2 === await expected(1.06, false), { d2 });
    await ev("ProjectRCardModifiers.armWeaponHitBonus({ id: 'hermes_zetsu', multiplier: 2, seconds: 5, source: 'hermes_zetsu' }); 'armed'");
    const d3 = await weaponDamage("sword:z1");
    const e3 = Math.round(await expected(1.06, false) * 2);
    rec("R10c 絶の強化(x2)との併用: (攻撃力x1.06の武器ダメージ) x 2。絶は1回で消費・サイコポンポスは残る・ダメージは二重に入らない", d3 === e3 && (await json("ProjectRCardModifiers.getWeaponHitBonus()")) === null && (await psy()).buff.stacks === 2, { d3, e3 });
  });

  // ---------------- R11: 帰属の否定側(実機) ----------------
  await check("R11 attribution negative", async () => {
    await scene(1);
    await press("Q"); await settle(4);
    await ev("ProjectRSoulTest.layout(12.5, 25.5); 'ok'"); await settle(5);
    await ev("ProjectRSoulTest.hit(3, { attacker: 'environment' }); ProjectRSoulTest.hit(2, { attacker: 'event:ally' }); 'ok'"); await settle(3);
    await ev("ProjectRSoulTest.hp(6, 0)"); await settle(4); // コマンドを通らずHP0
    const p = await psy();
    rec("R11 環境・味方・直接HP0の撃破では魂が出ない(主人公の撃破だけが魂を落とす)", p.souls.length === 0 && p.diag.soulsSpawned === 0 && p.ignored.length >= 2 && p.attr.notified >= 3 && p.attr.uncredited >= 3, { ignored: p.ignored, attr: p.attr });
    await ev("ProjectRSoulTest.hit(4)"); await settle(3);
    rec("R11b 同じ窓の中でも、主人公が倒した敵だけが魂を落とす", (await psy()).diag.soulsSpawned === 1, "");
  });

  // ---------------- R12: 多数同時・VFX・後片付け ----------------
  await check("R12 many", async () => {
    await scene(1);
    await press("Q"); await settle(4);
    await ev("ProjectRSoulTest.layout(12.5, 25.5); $gameMap.event(4).locate(19, 25); $gameMap.event(5).locate(12, 20); 'ok'"); await settle(3);
    await s.slow(5);
    for (const id of [2, 3, 4, 5, 6]) await ev(`ProjectRSoulTest.hit(${id})`);
    await settle(6);
    const p = await psy(), hermes = await followers();
    await s.shot("r12_many_slow");
    const hover = await notesLike("hermes_psychopomp.soul");
    rec("R12 5体が同じフレームに倒れても、魂は5つ(重複なし)・独立した回復・Hermesは3体まで・魂のVFXは魂の数", p.diag.soulsSpawned === 5 && hermes.length <= 3 && p.diag.hermesShown === 3 && p.diag.hermesSkipped === 2 && hover.length === p.souls.length, { spawned: p.diag.soulsSpawned, hermes: hermes.length, hover: hover.length, diag: p.diag });
    await s.slow(1); await settle(20);
    const q = await psy();
    const hoverAfter = await notesLike("hermes_psychopomp.soul");
    rec("R12b 範囲内の魂は回収され、回収した魂のVFXは止まる(残る魂の数 = 魂のVFX)", q.heals.length >= 3 && hoverAfter.length === q.souls.length, { heals: q.heals.length, souls: q.souls.length, hover: hoverAfter.length });
    await settle(80);
    rec("R12c Hermesの表示Eventは全員消えた・追加のダメージなし", (await followers()).length === 0, "");
    // 窓の終了で未回収の魂が消える(暫定ポリシー remove)・VFXも止まる
    await settle(520);
    const ended = await psy();
    rec("R12d 10秒の窓の終了で、未回収の魂とそのVFXが消える(暫定ポリシー AfterWindow=remove)", ended.windows.length === 0 && ended.souls.length === 0 && (await notesLike("hermes_psychopomp.soul")).length === 0, { souls: ended.souls.length });
  });

  // ---------------- R14: 見た目の証拠(スクリーンショット) ----------------
  await check("R14 evidence", async () => {
    await scene(1);
    await press("Q"); await settle(4);
    await ev("ProjectRSoulTest.layout(12.5, 25.5); $gameMap.event(4).locate(19, 25); $gameMap.event(5).locate(12, 20); $gameMap.event(2).locate(20, 28); 'ok'"); await settle(3);
    await s.slow(6);
    for (const id of [2, 3, 4, 5, 6]) await ev(`ProjectRSoulTest.hit(${id})`);
    await settle(3); const e1 = await psy(); const f1 = await followers(); await s.shot("e1_kills_manifest_hermes");
    await settle(4); await s.shot("e2_strike_snap");
    await s.slow(1); await settle(70);
    const e2 = await psy(), hover = await notesLike("hermes_psychopomp.soul");
    await s.shot("e3_souls_hovering");
    rec("R14 見た目の証拠: 魂の出現・Hermesの攻撃・指をはじく・漂う魂のスクリーンショットを撮った(漂う魂 = 範囲外の魂)", e1.diag.soulsSpawned === 5 && f1.length > 0 && hover.length === e2.souls.length && e2.souls.length >= 1, { souls: e2.souls.length, hover: hover.length, hermes: f1.length, spawned: e1.diag.soulsSpawned, kills: e1.kills.length, ignored: e1.ignored, attr: e1.attr });
    // 回収の光: 範囲外の魂へ近づく(ワープ)と回収され、その瞬間のVFXを撮る
    await s.slow(6);
    await ev("$gamePlayer.locate(17, 25); $gamePlayer._realX = 17; $gamePlayer._realY = 25; $gamePlayer.center(17, 25); 'ok'"); await settle(3);
    await s.shot("e4_collect_burst");
    await s.slow(1); await settle(10);
    rec("R14b 回収の光: 近づくと魂を回収し、回復イベントが増える", (await psy()).heals.length > e2.heals.length, { before: e2.heals.length, after: (await psy()).heals.length });
  });

  // ---------------- R13: 後片付け(戦闘終了・マップ移動) ----------------
  await check("R13 cleanup", async () => {
    await scene(3);
    await press("Q"); await settle(4);
    await ev("ProjectRSoulTest.layout(12.5, 25.5); $gameMap.event(4).locate(20, 25); 'ok'"); await settle(3);
    await ev("ProjectRSoulTest.hit(3); ProjectRSoulTest.hit(4); 'ok'"); await settle(6);
    const before = await psy();
    rec("R13 準備: 窓・魂・攻撃力上昇がある(魂のVFXの錨Eventが1つ)", before.windows.length === 1 && before.souls.length === 1 && before.buff && (await notesLike("hermes_psychopomp.soul")).length === 1 && (await json("ProjectRGodSummonVisual.getAnchors()")).length >= 1, { souls: before.souls.length, buff: before.buff, anchors: (await json("ProjectRGodSummonVisual.getAnchors()")).length, hover: (await notesLike("hermes_psychopomp.soul")).length });
    await ev("ProjectRCardDeck.endCardBattle(); 'end'"); await settle(6);
    const ended = await psy();
    rec("R13b 戦闘終了で窓・魂・攻撃力上昇・Hermes・魂VFXがすべて消える", ended.windows.length === 0 && ended.souls.length === 0 && ended.buff === null && (await followers()).length === 0 && (await json("ProjectRGodSummonVisual.getAnchors()")).length === 0 && (await notesLike("hermes_psychopomp")).length === 0 && (await ev("ProjectRKillAttribution.diagnostics().listeners")) === 0, { ended: { w: ended.windows.length, s: ended.souls.length } });
    await scene(3);
    await press("Q"); await settle(4);
    await ev("ProjectRSoulTest.layout(12.5, 25.5); $gameMap.event(4).locate(20, 25); ProjectRSoulTest.hit(4); ProjectRSoulTest.hit(3); 'ok'"); await settle(6);
    await ev("$gamePlayer.reserveTransfer(1, 5, 5, 2, 0); 'xfer'");
    await wait("$gameMap.mapId() === 1 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(800);
    const moved = await psy();
    rec("R13c マップ移動で窓・魂・攻撃力上昇・Hermes・魂VFXがすべて消える", moved.windows.length === 0 && moved.souls.length === 0 && moved.buff === null && (await followers()).length === 0 && (await json("ProjectRGodSummonVisual.getAnchors()")).length === 0 && (await notesLike("hermes_psychopomp")).length === 0, { mapId: await ev("$gameMap.mapId()") });
  });

  await releaseAll();
  rec("Z 押しっぱなしのキーが無い", (await json("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })")).length === 0, "");
  rec("ZZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  fs.writeFileSync(`${OUT}/h3b_results.json`, JSON.stringify({ chromium: await ev("process.versions.chromium + ' / nw ' + process.versions.nw"), results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
