// I6: SOUL戦闘のスキル(承認済み9枚)の実機(Playtest)確認 + スクリーンショット。実キー(Q/W/E/R/T)・実マウス(CDP)。竪琴の音符だけは、タイミング合わせのため画面内からクリックを注入する(実マウスの代わり)。
//   Z1 絶: 移動せず消費・Cooldown 6秒(HUD表示も)・最初の通常攻撃が×3(Lv3)・2回目は通常。使えるのは構えとして
//   Z2 5枚(サイコポンポス・葦笛・ヴェイル・月桂冠・ヒュアキントス): 発動して効果が動き、ATTACKの終了ですべて解除(DEFENSEへ持ち越さない)
//   Z3 神託: 3秒、敵ハートと自分の攻撃が止まる(ATTACKの時間も止まる)。解除後に再開。停止中にフェーズを移しても停止が残らない
//   Z4 エロスの矢: 当てた矢で プレイヤーHPが回復(Lv3のビームを含む)
//   Z5 竪琴: 速度の音符 = カードのCooldown短縮、病の音符 = 敵ハート
//   Z6 後片づけ: 元のマップへ戻り、定義・攻撃間隔・停止・修飾がすべて元へ
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_skills_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", SK = "ProjectRSoulSkills", DG = "ProjectRSoulBattleDodge";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const heartHp = () => ev(`ProjectRCardModifiers.eventHp(${SO}.getState().heart.eventId)`);
  const playerHp = () => ev("$gameParty.leader().hp");
  const setPlayerHp = hp => ev(`$gameParty.leader()._hp = ${hp}; 'ok'`);
  const hand = () => json("ProjectRCardDeck.getBattleState().hand.map(function(h) { return h.cardId; })");
  const kinds = () => json(`${SK}.getEffects().map(function(e) { return e.kind; })`);
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1200), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 20000); await sleep(600); return ok; };
  const start = async opts => { await ev(`${SB}.start("a16", ${JSON.stringify({ attackSeconds: 600, level: 3, weapon: "sword", ...opts })})`); const ok = await toActive(); await ev(`${DG}.disarm(); 'ok'`); return ok; };
  const restart = async opts => { await ev(`${SB}.stop(); 'ok'`); await sleep(1500); return start(opts); };
  const KEYS = ["Q", "W", "E", "R", "T"];
  const heartScreen = () => json(`(function() { var e = $gameMap.event(${SO}.getState().heart.eventId), p = ${ST}.toScreen(e.screenX(), e.screenY() - 24); return { x: p.x, y: p.y }; })()`);
  const tapKey = async k => { await c.keyDown(k); await sleep(70); await c.keyUp(k); await sleep(150); };
  const useBy = async cardId => { const h = await hand(), i = h.indexOf(cardId); if (i < 0) return { ok: false, hand: h }; await tapKey(KEYS[i]); return { ok: true, key: KEYS[i] }; };
  const aimHeart = async () => { const h = await heartScreen(); await c.pointer(h.x, h.y); await sleep(120); return h; };
  // 毎フレームの記録(Game_Map.update の後)
  const installRec = () => ev(`(function() { window.__rec = window.__rec || { on: false, rows: [] };
    if (!window.__recHook) { var u = Game_Map.prototype.update; Game_Map.prototype.update = function() { var r = u.apply(this, arguments); if (window.__rec.on) { try { window.__rec.rows.push({ f: Graphics.frameCount, paused: !!$gameMap.eventsPaused, left: ProjectRSoulBattle.getState().framesLeft, hx: ProjectRSoulBattlePoC.getState().hitCenter.x, hy: ProjectRSoulBattlePoC.getState().hitCenter.y, dg: (ProjectRSoulBattleDodge.getState() || {}).frame }); } catch (e) {} } return r; }; window.__recHook = true; }
    window.__rec.rows = []; window.__rec.on = false; return 'ok'; })()`);
  const record = async ms => { await ev("window.__rec.rows = []; window.__rec.on = true; 'on'"); await sleep(ms); await ev("window.__rec.on = false; 'off'"); return json("window.__rec.rows"); };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  await installRec();

  await check("Z1 絶(SOUL専用の構え): 移動せず1枚消費・Cooldown 6秒。最初の通常攻撃が×3(Lv3)、2回目は通常。HUDも使える表示", async () => {
    const ok = await start({ openingHand: ["hermes_zetsu", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"] });
    const slot = await json("ProjectRSoulBattleHUD.getViewModel().hand[0]");
    const h = await aimHeart();
    const p0 = await json("[$gamePlayer._realX, $gamePlayer._realY]");
    const hp0 = await heartHp();
    await c.click(); await sleep(600);
    const hp1 = await heartHp();
    await sleep(900);
    const used = await useBy("hermes_zetsu");
    await sleep(100);
    const bonus = await json("ProjectRCardModifiers.getWeaponHitBonus()"), p1 = await json("[$gamePlayer._realX, $gamePlayer._realY]");
    await c.click(); await sleep(600);
    const hp2 = await heartHp();
    await s.shot("z1_zetsu");
    await sleep(900);
    await c.click(); await sleep(600);
    const hp3 = await heartHp();
    const pile = await json("ProjectRCardDeck.getBattleState().cooldownPile.filter(function(e) { return e.instance.cardId === 'hermes_zetsu'; })");
    const plain = hp0 - hp1, boosted = hp1 - hp2, third = hp2 - hp3;
    rec("Z1 zetsu", ok && slot.state === "ready" && slot.cooldownSeconds === 6 && used.ok && bonus && bonus.multiplier === 3 && JSON.stringify(p0) === JSON.stringify(p1)
      && pile.length === 1 && pile[0].remainingSeconds > 0.5 && pile[0].remainingSeconds <= 6 && plain > 0 && boosted >= plain * 2.4 && third <= plain * 1.3,
      JSON.stringify({ hud: [slot.state, slot.cooldownSeconds], bonus: bonus && bonus.multiplier, damage: [plain, boosted, third], cooldown: pile[0] && Math.round(pile[0].remainingSeconds * 10) / 10 }));
  });

  await check("Z2 5枚の効果とATTACK終了時の解除(DEFENSEへ持ち越さない)", async () => {
    const ok = await restart({ openingHand: ["hermes_psychopomp", "hermes_reed_flute", "hermes_veil", "apollo_laurel_wreath", "apollo_hyacinthus"] });
    await ev(`${DG}.arm({ boss: "dev_boss" }); 'ok'`);
    const h = await aimHeart();
    await setPlayerHp(100);
    const results = [];
    const reed = await useBy("hermes_reed_flute"); results.push(["hermes_reed_flute", reed.ok]); await sleep(150);
    const frozen = await json(`${DG}.getModifiers()`).then(m => m.frozen);                  // 葦笛: 回避AIの停止(その後の月桂冠の継続ダメージで起きるのは仕様どおり)
    for (const id of ["apollo_hyacinthus", "apollo_laurel_wreath", "hermes_veil", "hermes_psychopomp"]) { const r = await useBy(id); results.push([id, r.ok]); await sleep(200); }
    await sleep(300);
    const mods = await json(`${DG}.getModifiers()`), k = await kinds(), hp = await playerHp();
    await s.shot("z2_effects");
    await c.click(); await sleep(500);                                               // 命中: 花が咲く・魂が出る・葦笛が解ける
    const afterHit = await kinds();
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(600);
    const phase = await ev(`${SO}.getPhase()`), end = await json(`({ kinds: ${SK}.getEffects().map(function(e) { return e.kind; }), mods: ${DG}.getModifiers().ids, bonus: ProjectRCardModifiers.getWeaponHitBonus() })`);
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(500);
    rec("Z2 five", ok && results.every(r => r[1]) && frozen === true && ["hyacinth", "laurel", "veil", "psychopomp"].every(x => k.includes(x)) && mods.ids.length >= 1 && hp > 100
      && phase === "defense" && end.kinds.length === 0 && end.mods.length === 0 && end.bonus === null,
      JSON.stringify({ results, reedFrozen: frozen, kinds: k, mods, playerHp: hp, afterHit, phase, end }));
  });

  await check("Z3 神託: 3秒止まる(敵ハート・ATTACKの時間・自分の攻撃)。解除で再開。停止中にフェーズを移しても停止が残らない", async () => {
    const ok = await restart({ openingHand: ["apollo_oracle", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"] });
    await ev(`${DG}.arm({ profile: "evasive" }); 'ok'`);
    await aimHeart();
    await installRec();
    await ev("window.__rec.rows = []; window.__rec.on = true; 'on'");
    await sleep(300);
    const used = await useBy("apollo_oracle");
    await sleep(100);
    await c.click(); await sleep(300);                                               // 停止中に攻撃(剣のhitboxも止まる)
    await s.shot("z3_stopped");
    await sleep(3600);
    await ev("window.__rec.on = false; 'off'");
    const rows = await json("window.__rec.rows");
    const stoppedRows = rows.filter(r => r.paused);
    const first = rows.findIndex(r => r.paused), last = rows.map(r => r.paused).lastIndexOf(true);
    const frozen = stoppedRows.length >= 150 && stoppedRows.length <= 200 && new Set(stoppedRows.map(r => r.left)).size === 1 && new Set(stoppedRows.map(r => r.dg)).size === 1 && new Set(stoppedRows.map(r => r.hx)).size === 1;
    const resumed = rows.slice(last + 1).length > 30 && rows[last + 1].left <= stoppedRows[0].left && rows[rows.length - 1].left < stoppedRows[0].left;
    const hpAfter = await heartHp();
    rec("Z3 oracle", ok && used.ok && frozen && resumed && hpAfter < 1000 && !(await ev("$gameMap.eventsPaused")),
      JSON.stringify({ stoppedFrames: stoppedRows.length, distinct: [new Set(stoppedRows.map(r => r.left)).size, new Set(stoppedRows.map(r => r.dg)).size, new Set(stoppedRows.map(r => r.hx)).size], resumed, heartHp: hpAfter, first, last }));
    // 停止中のフェーズ移行(手札を引き直して、もう一度)
    await restart({ openingHand: ["apollo_oracle", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"] });
    await aimHeart();
    const used2 = await useBy("apollo_oracle");
    await sleep(300);
    const pausedBefore = await ev("$gameMap.eventsPaused");
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(500);
    const after = await json(`({ phase: ${SO}.getPhase(), paused: !!$gameMap.eventsPaused, own: ${SK}.getState().ownPause, effects: ${SK}.getEffects().length })`);
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(500);
    const back = await json(`({ phase: ${SO}.getPhase(), paused: !!$gameMap.eventsPaused })`);
    rec("Z3b oracle phase", used2.ok !== false && pausedBefore === true && after.phase === "defense" && after.paused === false && after.own === false && after.effects === 0 && back.phase === "attack" && back.paused === false, JSON.stringify({ pausedBefore, after, back }));
  });

  await check("Z4 エロスの矢: 当てた矢で プレイヤーHPが回復する(予約→左クリックで確定。元の規則)", async () => {
    const ok = await restart({ openingHand: ["apollo_eros_arrow", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"] });
    await aimHeart();
    await setPlayerHp(1);
    const hp0 = await heartHp();
    const used = await useBy("apollo_eros_arrow");
    await c.click();
    await sleep(5200);
    const heal = (await playerHp()) - 1, dmg = hp0 - (await heartHp());
    await s.shot("z4_eros");
    rec("Z4 eros", ok && used.ok && heal > 100 && dmg > 0, JSON.stringify({ heal, damage: dmg }));
  });

  await check("Z5 竪琴: 速度の音符 = カードのCooldown短縮、病の音符 = 敵ハート(画面内からクリックを注入してタイミングを合わせる)", async () => {
    const ok = await restart({ openingHand: ["apollo_lyre_rhythm", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"] });
    await aimHeart();
    await ev(`window.__lyreAuto = function(kind) { var L = ProjectRApolloLyreRhythm; return new Promise(function(resolve) { var tries = 0; (function loop() { var s = L.getSession(); if (!s || tries++ > 900) return resolve(null);
      var n = L.getNotes().filter(function(x) { return x.kind === kind && x.state === 'flowing' && Math.abs(s.frame - x.arrive) <= 1; })[0];
      if (n) { var p = ${ST}.toStage(Graphics.width / 2, 400); TouchInput._onTrigger(Math.round(p.x), Math.round(p.y)); return setTimeout(function() { resolve(L.getResults().pop()); }, 60); }
      requestAnimationFrame(loop); })(); }); }; 'ok'`);
    const used = await useBy("apollo_lyre_rhythm");
    const speed = await ev("window.__lyreAuto('speed').then(function(r) { return JSON.stringify(r); })").then(r => JSON.parse(r));
    const cut = await json(`${SK}.getEffects().filter(function(e) { return e.kind === 'lyreCooldown'; })`);
    const plague = await ev("window.__lyreAuto('plague').then(function(r) { return JSON.stringify(r); })").then(r => JSON.parse(r));
    const key = await ev(`ProjectRApolloStatus.targetKeyOfEvent(${SO}.getState().heart.eventId)`), plagued = await ev(`ProjectRApolloStatus.has(${JSON.stringify(key)}, 'lyre_plague')`);
    await s.shot("z5_lyre");
    rec("Z5 lyre", ok && used.ok && speed && speed.hit && cut.length === 1 && Math.abs(cut[0].cut - 0.1) < 1e-6 && plague && plague.hit && plagued === true,
      JSON.stringify({ speed: speed && [speed.hit, speed.kind], cut: cut.map(e => e.cut), plague: plague && [plague.hit, plague.kind, plague.enemies], plagued }));
  });

  await check("Z6 後片づけ: stop() で元のマップへ戻り、定義・攻撃間隔・停止・修飾・命中フックがすべて元へ", async () => {
    await ev(`${SB}.stop(); 'ok'`);
    const back = await toOrigin(origin);
    const st = await json(`({ skills: ${SK}.getState(), effects: ${SK}.getEffects().length, mods: ${DG}.getModifiers().ids, paused: !!$gameMap.eventsPaused, sword: ProjectRSwordSystem.getCooldownScale(), gun: ProjectRGunSystem.getCooldownScale(), zetsu: (function() { var d = ProjectRCardDeck.definitions.card('hermes_zetsu'); return [d.category, d.cooldownSeconds]; })(), save: $gameSystem.isSaveEnabled() })`);
    const w = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
    rec("Z6 cleanup", back && w.map === origin.map && w.x === origin.x && w.y === origin.y && st.effects === 0 && st.mods.length === 0 && !st.paused && st.sword === 1 && st.gun === 1
      && st.zetsu[0] === "movement" && st.zetsu[1] === 0.5 && !st.skills.defsSwapped && !st.skills.hook && st.save === true, JSON.stringify({ back, now: [w.map, w.x, w.y], st }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("ZZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_skills_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ・CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
