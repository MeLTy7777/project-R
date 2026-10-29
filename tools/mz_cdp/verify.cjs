// 絶(Zetsu)の実機検証(23項目: 移動・壁・失敗・Lv別ダメージ・失効・速度・複数コピー・描画順)
// 【状態: 保守対象(H2C-B3で現行仕様に更新)】 H1(絶の初期実装)の検証をそのまま保つ単独スクリプト。
//   H2C-B3で直した古い前提: (1)「カード定義がちょうど8件」→ 現行は新Hermes 7枚が加わっているため、必須カードの存在と絶の定義(最大5枚)を検証、
//   (2) 絶はH2B-1で「予備動作 → 着地」の取引になり、押下の約0.25秒後はまだ結果が pending なので、結果が確定するまで待ってから ok / 位置を検証。
//   壁・地形・Region 255・CombatWall/VisionWall の手前で止まる位置の検証値は変えていない。
//   H2A以降の絶の確認(失敗時の取引・Lv別・複数コピー)は h2a_verify.cjs / h2b1_verify.cjs が担う。スクリプトの一覧は tools/mz_cdp/scripts.json。
// 使い方: node tools/mz_cdp/verify.cjs
//   すでに起動している Playtest(nw.exe <project> test --remote-debugging-port=9222)へ接続するだけです。MZを起動・終了しません。
//   スクリーンショットと結果JSONは環境変数 MZ_OUT(既定: ./mz_out)へ出ます。ゲームのファイルは変更しません。
const fs = require("fs");
const OUT = process.env.MZ_OUT || "mz_out";
require("fs").mkdirSync(OUT, { recursive: true });

const { session } = require("./lib.cjs");
const near = (a, b, t) => Math.abs(a - b) <= t;
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.message).slice(0, 300)); } };
  const wait = async (cond, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(100); } return false; };
  const start = async lv => { const r = await ev(`JSON.stringify(ProjectRZetsuTest.start(${lv}))`); await sleep(400); return JSON.parse(r); };
  const press = async k => { await c.tap(k); await sleep(250); };
  // 絶は予備動作 → 着地の取引。結果が pending でなくなる(確定する)まで待つ。待てなければ検証側が失敗する(固定の待ち時間で誤魔化さない)。
  // 絶の確定結果は ProjectRHermesZetsu.getLastResult()(予約中は pending:true、着地後に ok:true / 失敗は ok:false)。CardBattleInput側の結果は取引中 'pending' のまま。
  const settleLast = () => wait("(function() { var l = ProjectRHermesZetsu.getLastResult(); return !!l && !l.pending; })()", 5000);
  const zLast = async () => JSON.parse(await ev("JSON.stringify(ProjectRHermesZetsu.getLastResult())"));
  const info = async () => ({ pos: await s.pos(), st: await s.state(), z: await s.status() });
  const sameState = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const fixedRandom = on => ev(on ? "window.__r0 = Math.random; Math.random = function() { return 0.5; }; 'on'" : "Math.random = window.__r0 || Math.random; 'off'");
  const hp = id => ev(`$gameMap.getCurrentEventHp(${id})`);
  const inval = "if (window.ProjectR && ProjectR.VisionOcclusion && ProjectR.VisionOcclusion.invalidateCache) ProjectR.VisionOcclusion.invalidateCache();";
  const wall = {
    set: async (x, ys) => ev(`(function() { var m = $dataMap, size = m.width * m.height; window.__saved = window.__saved || {}; ${JSON.stringify(ys)}.forEach(function(y) { var i = 5 * size + y * m.width + ${x}; window.__saved[i] = m.data[i]; m.data[i] = 255; }); ${inval} return 'set'; })()`),
    restore: async () => ev(`(function() { var m = $dataMap; Object.keys(window.__saved || {}).forEach(function(i) { m.data[i] = window.__saved[i]; }); window.__saved = {}; ${inval} return 'restored'; })()`),
    events: async (kind, x, ys) => ev(`(function() { window.__walls = window.__walls || []; ${JSON.stringify(ys)}.forEach(function(y) { var base = JSON.parse(JSON.stringify($dataMap.events[1])); var id = $dataMap.events.length; base.id = id; base.name = 'WALL ${kind}'; base.note = '<${kind}>'; base.x = ${x}; base.y = y;
        base.pages.forEach(function(p) { p.through = true; p.priorityType = 0; p.image = { tileId: 0, characterName: '', direction: 2, pattern: 0, characterIndex: 0 }; });
        $dataMap.events[id] = base; $gameMap._events[id] = new Game_Event($gameMap.mapId(), id); window.__walls.push(id); }); ${inval} return window.__walls.length; })()`),
    clearEvents: async () => ev(`(function() { (window.__walls || []).forEach(function(id) { var e = $gameMap._events[id]; if (e) e.erase(); $gameMap._events[id] = null; $dataMap.events[id] = null; }); window.__walls = []; ${inval} return 'cleared'; })()`)
  };

  // ---- 起動 ----
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene", 20000); // 起動直後はセーブ一覧(_globalInfo)の読み込みが終わっていないことがある。メモリ上だけ空の一覧にして新しいゲームを始める(ファイルには触れない)
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  console.log("enter", await ev("JSON.stringify(ProjectRCombatTestArena.enter())"));
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  rec("0 boot: 全プラグインが読み込まれ、絶(最大5枚)と新Hermes 7枚のカード定義が実機で登録された", await ev("[ProjectRCardCatalog, ProjectRCardModifiers, ProjectRPresentationVfx, ProjectRCutIn, ProjectRHermesZetsu].every(Boolean) && !!ProjectRCardDeck.definitions.card('hermes_zetsu') && ProjectRCardDeck.definitions.cardDefinitions().length >= 8 && ProjectRCardDeck.definitions.card('hermes_zetsu').maxCopies === 5 && ['hermes_issen', 'hermes_psychopomp', 'hermes_veil', 'hermes_strength', 'hermes_sweep', 'hermes_reed_flute'].every(function(id) { return !!ProjectRCardDeck.definitions.card(id); })"), "Chromium 85 / NW 0.48.4");

  await check("1 ground-success", async () => {
    await start(1); await s.place(12, 25); const b = await info();
    await s.aim(5, 0); await c.tap("Q");
    const a = await info(); await settleLast(); const last = await zLast(); // 状態(a)は直後(約0.1秒後)、結果(last)は絶の確定結果を待って読む
    await s.shot("10_success_t0"); await sleep(120); await s.shot("10_success_t1");
    rec("1a 有効な地面へ成功(5タイル右)", last.ok && near(a.pos.x - b.pos.x, 5, 0.02) && near(a.pos.y, b.pos.y, 0.02), { moved: a.pos.x - b.pos.x, last: last.reason });
    rec("1b カード1枚消費・即時補充・Cooldown", a.st.hand.length === 5 && a.st.drawPile.length === b.st.drawPile.length - 1 && a.st.cooldownPile.length === 1 && a.st.cooldownPile[0].remainingSeconds <= 0.5 && a.st.cooldownPile[0].remainingSeconds > 0.3, { hand: a.st.hand.map(h => h.cardId).join(",") });
    rec("1c 強化Lv1 x1.5が1つ・カットインが1枚", !!a.z.bonus && a.z.bonus.multiplier === 1.5 && a.z.cutIn.length === 1, { bonus: a.z.bonus, cutIn: a.z.cutIn });
    rec("1d VFXはVFX Designerライブラリ経由で再生(2件・失敗0)", a.z.vfx.plays === 2 && a.z.vfx.failures === 0 && a.z.vfx.lastMode === "library", a.z.vfx);
    const hist = await ev("ProjectRCharacterPresentation.history().filter(function(e) { return e.ok; }).map(function(e) { return e.name; }).slice(-3).join()");
    rec("1e 腕クロスの動作が要求された", hist.includes("CrossArms"), hist);
  });
  await check("2 terrain", async () => {
    await start(1); await s.place(6, 25); await s.aim(0, 4); await press("Q"); await settleLast(); const p = await s.pos(); const last = await zLast();
    rec("2 通行不能な地形の手前で止まる(壁y=28)", last.ok && p.y <= 27.001 && p.y >= 26.8 && near(p.x, 6, 0.02), p);
  });
  await check("3 impassable event", async () => {
    await start(1); await s.place(15, 3); await s.aim(-6, 0); await press("Q"); await settleLast(); const p = await s.pos(); const last = await zLast();
    rec("3 通行不能Event(DEV Impassable Event x=11)の手前で止まる", last.ok && p.x >= 11.99 && p.x <= 12.2, p);
  });
  await check("4 region255", async () => {
    await start(1); await wall.set(16, [23, 24, 25, 26, 27]); await s.place(12, 25); await s.aim(6, 0); await press("Q"); await settleLast(); const p = await s.pos(); const last = await zLast();
    rec("4 Region 255(VisionWall)で止まる(地形は通行可)", last.ok && p.x + 1 <= 16.0001 && p.x >= 14.5, p);
    await wall.restore();
  });
  for (const kind of ["CombatWall", "VisionWall"]) {
    await check("5 " + kind, async () => {
      await start(1); await wall.events(kind, 16, [23, 24, 25, 26, 27]); await s.place(12, 25); await s.aim(6, 0); await press("Q"); await settleLast(); const p = await s.pos(); const last = await zLast();
      rec(`5 <${kind}> イベントの壁で止まる`, last.ok && p.x + 1 <= 16.0001 && p.x >= 14.5, p);
      await wall.clearEvents();
    });
  }
  await check("6 failure", async () => {
    for (const mode of ["その場を指す", "壁に接して壁を指す"]) {
      await start(3); await s.place(6, mode === "その場を指す" ? 25 : 27); const b = await info(); const before = b.z.vfx.plays;
      await s.aim(0, mode === "その場を指す" ? 0 : 3); await press("Q"); const a = await info(); const last = await s.last();
      rec(`6 失敗(${mode}): 消費・Cooldown・補充・強化・移動・演出なし`, !last.ok && sameState(b.st, a.st) && sameState(b.pos, a.pos) && a.z.bonus === null && a.z.speedFactor === 1 && a.z.cutIn.length === 0 && a.z.vfx.plays === before, { reason: last.reason, detail: last.detail });
    }
  });
  // ---- ダメージ(実弾) ----
  const gunLevel = async lv => {
    await start(lv); await s.slow(4); await fixedRandom(true);
    await ev("ProjectRGunSystem.requestReload('verify'); 'ok'"); await sleep(300); await wait("!ProjectRGunSystem.isReloading()", 15000); await sleep(300);
    await s.place(31, 15);
    const aimAtDummy = async () => { const t = await ev("JSON.stringify({ x: $gameMap.event(3).screenX(), y: $gameMap.event(3).screenY() - 24 })").then(JSON.parse); await c.pointer(t.x, t.y); await sleep(150); };
    const fire = async () => { const r = await ev("JSON.stringify(ProjectRGunSystem.fire('verify'))"); await sleep(1600); return JSON.parse(r); };
    await aimAtDummy();
    const hp0 = await hp(3); const f1 = await fire(); const hp1 = await hp(3);
    await sleep(600);
    await s.aim(1, 0); await c.tap("Q"); await sleep(300);
    await aimAtDummy();
    const bonusBefore = (await s.status()).bonus;
    const f2 = await fire(); const hp2 = await hp(3);
    await sleep(600);
    const f3 = await fire(); const hp3 = await hp(3);
    await fixedRandom(false); await s.slow(1);
    return { hp: [hp0, hp1, hp2, hp3], base: hp0 - hp1, boosted: hp1 - hp2, third: hp2 - hp3, fires: [f1.ok, f2.ok, f3.ok], bonusBefore };
  };
  for (const [lv, mult] of [[1, 1.5], [2, 2.0], [3, 3.0]]) {
    await check("7 Lv" + lv, async () => {
      const r = await gunLevel(lv);
      rec(`7 実弾(G17) Lv${lv}: 最終ダメージ x${mult}・次弾は通常`, r.base > 0 && r.boosted === Math.round(r.base * mult) && r.third === r.base, r);
    });
  }
  await check("8 sword channel + CE1", async () => {
    await start(2); await s.slow(2); await fixedRandom(true);
    await ev("$gameParty.leader().forceChangeEquip(0, $dataWeapons[2]); 'sword'"); await sleep(300);
    const hit = async () => { const h0 = await hp(5); await ev("(function() { var i = new Game_Interpreter(); i._eventId = 0; PluginManager.callCommand(i, 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '5', value: '-player weapon', exceedMaxHealth: 'false' }); return 'hit'; })()"); await sleep(250); return h0 - await hp(5); };
    const base = await hit();
    await s.place(12, 25); await s.aim(2, 0); await c.tap("Q"); await sleep(300);
    // 実際の剣の共通イベント1(Jキー)。対象はEvent 1(敵ではない)なので強化は消費されない
    await c.pointer(900, 400); await c.tap("J", 120); await sleep(900);
    const keep = (await s.status()).bonus;
    const boosted = await hit(); const after = await hit();
    rec("8a 剣(公式UpdateEventHp -player weapon): Lv2で x2.0、次は通常", base > 0 && boosted === Math.round(base * 2) && after === base, { base, boosted, after });
    rec("8b 実際の剣(Jキー・共通イベント1)では、敵以外が対象なので強化は消費されない", !!keep, keep);
    await ev("$gameParty.leader().forceChangeEquip(0, $dataWeapons[51]); 'gun restored'");
    await fixedRandom(false); await s.slow(1);
  });
  await check("9 expiry", async () => {
    await start(1); await fixedRandom(true); await s.place(12, 25); await s.aim(2, 0); await c.tap("Q"); await sleep(200);
    const armed = (await s.status()).bonus; await sleep(1100); const gone = (await s.status()).bonus;
    rec("9 0.8秒で自動的に消える(1.3秒後はnull)", !!armed && gone === null, { armed, gone });
    await fixedRandom(false);
  });
  await check("10 lv3 speed", async () => {
    await start(3); await s.place(12, 25);
    const base = await ev("$gamePlayer.distancePerFrame()"), ms = await ev("$gamePlayer._moveSpeed");
    await s.aim(2, 0); await c.tap("Q"); await sleep(250);
    const during = await ev("$gamePlayer.distancePerFrame()"), f = (await s.status()).speedFactor;
    await sleep(1300);
    const after = await ev("$gamePlayer.distancePerFrame()"), f2 = (await s.status()).speedFactor, ms2 = await ev("$gamePlayer._moveSpeed");
    rec("10 Lv3: 移動後1秒だけ速度x2.0、解除後は元に戻る(_moveSpeed不変)", near(during / base, 2, 1e-9) && f === 2 && after === base && f2 === 1 && ms === ms2, { base, during, after, f, f2 });
  });
  await check("11 multi copy", async () => {
    await start(2); await fixedRandom(true); await s.place(12, 25); const b = await s.pos();
    const mark = await ev("(function() { var l = ProjectRCardModifiers.getWeaponHitLog(); return l.length ? l[l.length - 1].seq : 0; })()");
    for (let i = 0; i < 5; i++) { await s.aim(1, 0); await c.tap("Q"); await sleep(260); }
    const a = await info(); const log = JSON.parse(await ev("JSON.stringify(ProjectRCardModifiers.getWeaponHitLog())"));
    rec("11 5枚の絶=5回の移動(各1タイル)・強化は1つ", near(a.pos.x - b.x, 5, 0.05) && log.filter(e => e.seq > mark && e.type === "armed").length === 5 && !!a.z.bonus, { moved: a.pos.x - b.x, cooldown: a.st.cooldownPile.length, bonus: a.z.bonus });
    await fixedRandom(false);
  });
  await check("12 draw order", async () => {
    const order = await ev("JSON.stringify(SceneManager._scene._spriteset._baseSprite.children.map(function(ch) { var sp = SceneManager._scene._spriteset; return ch === sp._tilemap ? 'Tilemap' : ch === sp._projectRVisionLayer ? 'Vision' : ch === sp._projectRCutInLayer ? 'CutIn' : ch.constructor.name; }))").then(JSON.parse);
    const i = n => order.indexOf(n);
    rec("12 描画順: Tilemap < Vision < CutIn(最前)", i("Tilemap") < i("Vision") && i("Vision") < i("CutIn") && i("CutIn") === order.length - 1, order);
  });
  console.log("final errors", JSON.stringify(s.errors()));
  rec("13 Console(F8)に赤いエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  fs.writeFileSync(OUT + "/results.json", JSON.stringify(s.results, null, 1));
  console.log("TOTAL", s.results.filter(r => r.ok).length + "/" + s.results.length);
  process.exit(0);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
