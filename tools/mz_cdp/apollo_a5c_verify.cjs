// Phase Apollo-A5C: 実機(Playtest)の確認 — 黄金の矢 Lv3 のビームの遮蔽(幅全体)と、長押し中のチャージ演出。実マウス移動 + 実キー(CDP)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a5c_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持・壁(Region 255)はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
//   視覚の証拠(チャージ・発射・横の壁の遮蔽)は MZ_OUT の c1_*.png / c3_*.png / c4_*.png に残る。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARD = "apollo_golden_volley", API = "ProjectRApolloGoldenVolley", IN = "ProjectRCardBattleInput", HS = "ProjectRHitStop", CP = "ProjectRCharacterPresentation", GV = "ProjectRGodSummonVisual";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const start = async lv => { const r = await json(`ProjectRApolloTest.start(${lv})`); await sleep(400); await s.slow(1); return r; };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const settle = n => s.sceneFrames(n || 10);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const HOME = { 2: [44, 6], 3: [37, 15], 4: [10, 15], 5: [12, 15], 6: [11, 17] };
  const goHome = async () => { for (const [id, [x, y]] of Object.entries(HOME)) await locate(Number(id), x, y); await settle(); };
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(`window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const lost = async id => 1000000 - await barHp(id);
  const pile = () => json("ProjectRCardDeck.getBattleState().cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length");
  const events = () => json("$gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length");
  const pics = pattern => json(`(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')); }).length`);
  const scene = async (lv, enemies = { 4: [13, 15] }) => {
    await start(lv); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(9, 15); await sleep(500);
    for (const [id, [x, y]] of Object.entries(enemies)) await locate(Number(id), x, y);
    await resetHp(); await sleep(200);
  };
  const aimAt = (x, y) => s.aim(x - 9, y - 15);
  const wall = (x, ys) => ev(`(function() { var m = $dataMap, size = m.width * m.height, saved = []; ${JSON.stringify(ys)}.forEach(function(y) { var i = 5 * size + y * m.width + ${x}; saved.push([i, m.data[i]]); m.data[i] = 255; }); window.__wallSaved = (window.__wallSaved || []).concat(saved); return saved.length; })()`);
  const unwall = () => ev("(function() { (window.__wallSaved || []).forEach(function(p) { $dataMap.data[p[0]] = p[1]; }); var n = (window.__wallSaved || []).length; window.__wallSaved = []; return n; })()");
  const leftovers = async () => json(`({ followers: ${GV}.getFollowers().length, anchors: ${GV}.getAnchors().length, charge: ${API}.getCharge().active, draw: ${CP}.isActive('ArmDraw'), hs: ${HS}.getActive().length,
    jobs: ${API}.getActiveVfxJobs().length, chargePics: 0, events: $gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length })`).then(async v => ({ ...v, chargePics: await pics("/apollo_charge/"), beamPics: await pics("/apollo_volley\\.beam/") }));

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("C0 boot: チャージ・レーンのVFXと構え(ArmDraw)・ライブラリ・素材・ビームの数値(幅3・11ヒット・550)は変わらない", async () => {
    const v = await json(`({ keys: ProjectRPresentationVfx.keys().filter(function(k) { return /apollo_charge|apollo_volley\.beamlane/.test(k); }), cfg: ${API}.beamConfig(), hold: ${API}.holdFrames, draw: ${CP}.getProfile('protagonist').actions.ArmDraw.sprite, prio: ${CP}.PRIORITY.ArmDraw,
      lanes: ${API}.geometry.laneLayout(3).length })`);
    const libs = ["ProjectR_Volley_BeamLane", "ProjectR_Charge_Bow", "ProjectR_Charge_BowHold", "ProjectR_Charge_Glow", "ProjectR_Charge_Ready"];
    const lib = await ev(`Promise.all(${JSON.stringify(libs)}.map(function(n) { return Promise.resolve(getAnimationFromLibrary(n)).then(function(a) { return !!a; }, function() { return false; }); })).then(function(r) { return r.every(Boolean); })`);
    const files = ["img/pictures/Animation/ProjectR_Volley_BeamLane.png", "img/pictures/Animation/ProjectR_Charge_Bow.png", "img/pictures/Animation/ProjectR_Charge_BowHold.png", "img/pictures/Animation/ProjectR_Charge_Glow.png", "img/pictures/Animation/ProjectR_Charge_Ready.png", "img/characters/$DEV3H_ArmDraw_f4.png"].every(f => fs.existsSync(f));
    rec("C0 boot", v.keys.length === 7 && JSON.stringify(v.cfg) === JSON.stringify({ width: 3, speed: 40, range: 0, perTile: 3, damage: 50, maxHits: 11, stopFrames: 3, stopMax: 30 }) && v.hold === 30 && v.draw === "$DEV3H_ArmDraw_f4" && v.prio === 80 && v.lanes === 3 && lib === true && files, JSON.stringify({ ...v, lib, files }));
  });

  await check("C1 チャージ → 発射(実マウス+実キー): 押して0.25秒でApolloが弓を引き主人公が構える。0.55秒で満タンの合図。チャージ中は矢・ビーム・ダメージ・消費なし。離すとビーム。カットイン1回・効果音は合図1回と発射1回", async () => {
    await scene(3);
    await aimAt(13, 15);
    await ev("window.__se = []; window.__cut = 0; (function() { var p = AudioManager.playSe; AudioManager.playSe = function(se) { window.__se.push(se.name); return p.apply(this, arguments); }; var sh = ProjectRCutIn.show; ProjectRCutIn.show = function(o) { window.__cut++; return sh.apply(this, arguments); }; })(); 'spy'");
    const before = await json("ProjectRCardDeck.getBattleState()");
    await c.keyDown("Q"); await sleep(260);
    const mid = await json(`({ charge: ${API}.getCharge(), followers: ${GV}.getFollowers().map(function(f) { return f.godId; }), draw: ${CP}.isActive('ArmDraw'), arrows: $gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length,
      beam: ${API}.getBeam(), pending: ${API}.isPending(), cut: window.__cut })`);
    await s.shot("c1_charge_mid");
    await sleep(380);
    const ready = await json(`({ charge: ${API}.getCharge(), se: window.__se.filter(function(n) { return n === 'Bell1'; }).length, held: ${IN}.getPressSessions()[0].heldFrames })`);
    await s.shot("c1_charge_ready");
    const during = { pile: await pile(), lost: await lost(4), state: await json("ProjectRCardDeck.getBattleState()") };
    await s.slow(6);
    await c.keyUp("Q"); await s.sceneFrames(4);
    const fire = await json(`({ charge: ${API}.getCharge(), followers: ${GV}.getFollowers().length, draw: ${CP}.isActive('ArmDraw'), beam: ${API}.getBeam() !== null, cut: window.__cut, se: window.__se.slice() })`);
    await s.shot("c1_fire");
    await s.sceneFrames(5); await s.shot("c1_fire_hit");
    await s.slow(1);
    await wait(`!${API}.getBeam()`, 10000); await settle(40);
    const end = { pile: await pile(), lost: await lost(4), left: await leftovers(), log: (await json(`${API}.getChargeLog()`)).map(e => e.type), se: await json("window.__se"), cut: await json("window.__cut") };
    rec("C1 charge-fire", mid.charge.active && mid.charge.stage >= 1 && mid.followers.indexOf("apollo") >= 0 && mid.draw === true && mid.arrows === 0 && mid.beam === null && !mid.pending && mid.cut === 0
      && ready.charge.ready === true && ready.se === 1 && ready.held >= 30 && during.pile === 0 && during.lost === 0 && JSON.stringify(during.state.hand) === JSON.stringify(before.hand) && during.state.cooldownPile.length === 0
      && fire.charge.active === false && fire.followers === 0 && fire.draw === false && fire.beam === true && fire.cut === 1
      && end.pile === 1 && end.lost >= 550 && end.left.followers === 0 && end.left.anchors === 0 && end.left.charge === false && end.left.draw === false && end.left.hs === 0 && end.left.jobs === 0 && end.left.chargePics === 0 && end.left.beamPics === 0 && end.left.events === 0
      && JSON.stringify(end.log) === '["start","ready","end"]' && end.se.filter(n => n === "Bell1").length === 1 && end.se.filter(n => n === "Chime2").length === 1 && end.cut === 1,
      JSON.stringify({ mid: { stage: mid.charge.stage, followers: mid.followers, draw: mid.draw }, ready: { held: ready.held, se: ready.se }, during: { pile: during.pile, lost: during.lost }, fire: { cut: fire.cut }, end: { pile: end.pile, lost: end.lost, left: end.left, log: end.log, se: end.se, cut: end.cut } }).slice(0, 900));
  });

  await check("C2 取消(実機): 押している間のフォーカス喪失(blurイベント)・会話・戦闘終了で、チャージは即座に消え、離しても何も出ない・消費しない。Apollo・VFX・構えが残らない", async () => {
    const out = {};
    const logBase = await json(`${API}.getBeamLog().length`);
    for (const [name, cancel] of [["blur", "window.dispatchEvent(new Event('blur'))"], ["message", "$gameMessage.add('取消'); 'msg'"], ["end", "ProjectRCombatTestArena.endTest(); 'end'"]]) {
      await scene(3); await aimAt(13, 15);
      await c.keyDown("Q"); await sleep(420);
      const active = await json(`${API}.getCharge().active`);
      await ev(cancel); await settle(4);
      const gone = await leftovers();
      if (name === "message") await ev("$gameMessage.clear(); 'clear'");
      if (name === "blur") await ev("window.dispatchEvent(new Event('focus')); 'focus'");
      await c.keyUp("Q"); await settle(8);
      out[name] = { active, gone: gone.followers === 0 && gone.charge === false && gone.draw === false && gone.chargePics === 0 && gone.anchors === 0, fired: (await events()) + (await json(`${API}.getBeamLog().length`)) - logBase, pile: name === "end" ? 0 : await pile(), dmg: name === "end" ? 0 : await lost(4) };
    }
    rec("C2 cancel", Object.values(out).every(o => o.active === true && o.gone && o.fired === 0 && o.pile === 0 && o.dmg === 0), JSON.stringify(out));
  });

  await check("C3 横の壁(柱)の遮蔽(実機・水平): 幅3の下側のレーンだけが柱で短くなり、柱の裏の敵は無傷、ほかのレーンの敵には11ヒット。見た目のレーンの長さ = ダメージの届く長さ", async () => {
    await scene(3, { 4: [15, 15], 5: [15, 16], 6: [15, 14] });
    await ev("$gameMap.event(5).setPosition(15, 16.125); 'shift'"); // 敵の体(hitbox)の中心が下側のレーンの中心(横+1.0)に来る位置へ。体がレーンの中に収まる
    await wall(12, [16, 17]); // 下側のレーン(横+0.5〜+1.5)にかかる柱。中央と上側のレーンは開いている
    await aimAt(15, 15);
    await s.slow(1);
    await c.keyDown("Q"); await sleep(700);
    await s.slow(6);
    await c.keyUp("Q"); await s.sceneFrames(3);
    const lanes = await json(`${API}.getBeam().lanes`);
    const picsNow = await pics("/apollo_golden\\.beam/");
    await s.shot("c3_sidewall_early"); await s.sceneFrames(6); await s.shot("c3_sidewall_hit");
    await s.slow(1);
    await wait(`!${API}.getBeam()`, 10000); await settle(10);
    const r = await json(`${API}.getLastResult()`);
    const by = Object.fromEntries((r.targets || []).map(t => [t.eventId, t]));
    const d = { e4: await lost(4), e5: await lost(5), e6: await lost(6) };
    await unwall();
    rec("C3 sidewall", lanes.length === 3 && lanes[2].limit < 3.2 && lanes[2].limit > 1.8 && lanes[0].limit > 5 && lanes[1].limit > 5 && picsNow >= 3 && by[4] && by[4].hits === 11 && by[6] && by[6].hits === 11 && !by[5] && d.e5 === 0 && d.e4 >= 550 && d.e6 >= 550 && (await pile()) === 1,
      JSON.stringify({ lanes: lanes.map(l => +l.limit.toFixed(2)), picsNow, hits: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.hits])), d }));
  });

  await check("C4 斜めの発射(実機): 開けている斜めの向きで、斜めの柱がかかるレーンだけが短くなり、柱の向こうの敵は無傷、反対側のレーンの敵には当たる", async () => {
    await scene(3, {});
    let pick = null;
    for (const deg of [45, 135, 225, 315]) {
      const lanes = await json(`${API}.geometry.buildLanes($gamePlayer.centerPositionPoint(), ${deg}, 3, 40).map(function(l) { return l.limit; })`);
      if (Math.min(...lanes) >= 3.2 && (!pick || Math.min(...lanes) > pick.min)) pick = { deg, min: Math.min(...lanes), lanes };
    }
    if (!pick) { rec("C4 diagonal", false, "no open diagonal"); return; }
    const info = await json(`(function() { var deg = ${pick.deg}, c = $gamePlayer.centerPositionPoint(), r = deg * Math.PI / 180, ux = Math.sin(r), uy = -Math.cos(r), nx = -uy, ny = ux;
      var pt = function(a, l) { return { x: c.x + ux * a + nx * l, y: c.y + uy * a + ny * l }; };
      var tile = function(p) { return { x: Math.floor(p.x), y: Math.floor(p.y) }; };
      var pillar = tile(pt(2.0, 1.6)); var pc = { x: pillar.x + 0.5 - c.x, y: pillar.y + 0.5 - c.y }; var pa = pc.x * ux + pc.y * uy, pl = pc.x * nx + pc.y * ny;
      return { pillar: pillar, pa: pa, pl: pl, behind: tile(pt(pa + 1.4, pl)), open: tile(pt(2.6, -1.0)), c: c }; })()`);
    await ev(`(function() { var m = $dataMap, size = m.width * m.height, i = 5 * size + ${info.pillar.y} * m.width + ${info.pillar.x}; window.__wallSaved = [[i, m.data[i]]]; m.data[i] = 255; return 1; })()`);
    const lanesAfter = await json(`${API}.geometry.buildLanes($gamePlayer.centerPositionPoint(), ${pick.deg}, 3, 40).map(function(l) { return l.limit; })`);
    await locate(4, info.open.x, info.open.y); await locate(5, info.behind.x, info.behind.y); await resetHp();
    const dx = Math.sin(pick.deg * Math.PI / 180) * 4, dy = -Math.cos(pick.deg * Math.PI / 180) * 4;
    await s.aim(dx, dy);
    await s.slow(1); await c.keyDown("Q"); await sleep(700); await s.slow(6); await c.keyUp("Q"); await s.sceneFrames(5);
    await s.shot("c4_diagonal");
    await s.slow(1); await wait(`!${API}.getBeam()`, 10000); await settle(10);
    const d = { open: await lost(4), behind: await lost(5) };
    await unwall();
    const shorter = lanesAfter.map((v, i) => v < pick.lanes[i] - 0.2);
    rec("C4 diagonal", shorter.some(Boolean) && !shorter.every(Boolean) && d.open > 0 && d.behind === 0, JSON.stringify({ deg: pick.deg, free: pick.lanes.map(v => +v.toFixed(2)), after: lanesAfter.map(v => +v.toFixed(2)), info: { pa: +info.pa.toFixed(2), pl: +info.pl.toFixed(2) }, d }));
  });

  await check("C5 後払い・互換: 全レーンを塞ぐと非消費、tapは扇(チャージなし)、Lv1〜2は即時(チャージなし)、J(剣)に影響なし、旧Apolloの定義は不変", async () => {
    await scene(3, { 4: [14, 15] });
    await wall(11, [11, 12, 13, 14, 15, 16, 17, 18, 19]);
    await aimAt(14, 15);
    const handBefore = await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })");
    await s.slow(1); await c.keyDown("Q"); await sleep(700); await c.keyUp("Q"); await wait(`${API}.getBeamLog().length >= 1`, 5000);
    await wait(`!${API}.getBeam() && !${API}.isPending()`, 10000); await settle(6);
    const blocked = { reason: (await json(`${API}.getLastResult()`)).reason, pile: await pile(), hand: await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })"), dmg: await lost(4) };
    await unwall(); await settle(6);
    await s.slow(4); await c.tap("Q", 60); await s.sceneFrames(3);
    const tap = { arrows: await events(), beam: await json(`${API}.getBeam()`), charge: await json(`${API}.getChargeLog().length`) };
    await s.slow(1); await wait(`!${API}.isPending()`, 10000);
    await scene(2); await aimAt(13, 15);
    await s.slow(3); await c.keyDown("Q"); await s.sceneFrames(4);
    const lv2 = { arrows: await events(), charge: await json(`${API}.getCharge().active`), sessions: await json(`${IN}.getPressSessions().length`) };
    await c.keyUp("Q"); await s.slow(1); await wait(`!${API}.isPending()`, 10000);
    await ev("$gameParty.leader().forceChangeEquip(0, $dataWeapons[2]); 'sword'");
    await c.tap("J", 80); await settle(10);
    const sword = await json(`${IN}.getPressSessions().length`);
    const legacy = await json("['apollo_golden_arrow','apollo_plague_attack','apollo_lyre_calm'].map(function(id) { var d = ProjectRCardDeck.definitions.card(id); return [d.maxCopies, d.cooldownSeconds, d.targetType]; })");
    rec("C5 settle+compat", blocked.reason === "missed" && blocked.pile === 0 && JSON.stringify(blocked.hand) === JSON.stringify(handBefore) && blocked.dmg === 0 && tap.arrows >= 8 && tap.beam === null
      && lv2.arrows >= 3 && lv2.charge === false && lv2.sessions === 0 && sword === 0 && JSON.stringify(legacy) === JSON.stringify([[3, 4, "direction"], [2, 12, "direction"], [3, 10, "ally"]]), JSON.stringify({ blocked, tap, lv2, sword }));
  });

  await check("C6 最後に何も残らない: 一時Event・VFXの絵・構え・ヒットストップ・確定待ち / セーブ内容にチャージ・ビームの状態が入らない", async () => {
    await scene(3); await aimAt(13, 15);
    await s.slow(1); await c.keyDown("Q"); await sleep(700); await c.keyUp("Q"); await wait(`!${API}.getBeam()`, 10000); await settle(60);
    const left = await leftovers();
    const save = await ev("JSON.stringify(DataManager.makeSaveContents())");
    const bad = ["getCharge", "chargeLog", "ProjectRHitStop", "vfxJobs", "ArmDraw"].filter(k => save.indexOf(k) >= 0);
    rec("C6 clean", left.followers === 0 && left.anchors === 0 && left.charge === false && left.draw === false && left.hs === 0 && left.jobs === 0 && left.chargePics === 0 && left.beamPics === 0 && left.events === 0 && bad.length === 0, JSON.stringify({ left, bad }));
  });

  const errs = await s.errors();
  rec("Z コンソールエラーなし", errs.length === 0, errs.slice(0, 3).join(" | ").slice(0, 400));
  const failed = s.results.filter(r => !r.ok);
  fs.writeFileSync(`${OUT}/apollo_a5c_verify.json`, JSON.stringify({ total: s.results.length, failed: failed.length, results: s.results }, null, 1));
  console.log(`DONE total=${s.results.length} failed=${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(2); });
