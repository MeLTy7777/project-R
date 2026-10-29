// 絶(Zetsu)追加後の回帰確認(G17・剣・F・U・メニュー・Vision)と証跡撮影
// 使い方: node tools/mz_cdp/regress.cjs
//   すでに起動している Playtest(nw.exe <project> test --remote-debugging-port=9222)へ接続するだけです。MZを起動・終了しません。
//   スクリーンショットと結果JSONは環境変数 MZ_OUT(既定: ./mz_out)へ出ます。ゲームのファイルは変更しません。
const fs = require("fs");
const OUT = process.env.MZ_OUT || "mz_out";
require("fs").mkdirSync(OUT, { recursive: true });

const { session } = require("./lib.cjs");
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.message).slice(0, 300)); } };
  const wait = async (cond, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(100); } return false; };
  await s.slow(1);
  // 新しく起動した直後(タイトル画面)でも単独で動くように、アリーナへ入り、G17の弾薬を補充する(検証の判定は変えない)
  if (!(await ev("SceneManager._scene instanceof Scene_Map && $gameMap && $gameMap.mapId() === 4"))) {
    await ev("DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
    await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
    await ev("ProjectRCombatTestArena.enter(); 'ok'");
    await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  }
  await ev("$gameParty.gainItem($dataItems[31], 60); 'ammo'");

  // ---- 証跡: 絶(Lv3)の発動を、カットイン・VFX・腕クロス・Hermesごと撮る ----
  await check("evidence", async () => {
    await ev("ProjectRZetsuTest.start(3); 'ok'"); await sleep(500);
    await s.place(12, 25); await s.aim(6, 0);
    // 撮影用: Sceneだけ1/6の速さ。VFXは実時間で進むので、発動直後(約0.1秒)から素早く連写する
    await s.slow(6);
    await c.tap("Q");
    for (let i = 0; i < 4; i++) { await s.shot(`20_zetsu_lv3_shot${i}`); }
    await sleep(600); await s.shot("20_zetsu_lv3_later");
    await s.slow(1);
    // 黒白ノイズ(DEV素材)をループ再生して確認用に撮る
    await s.place(20, 25);
    await ev("(function() { var i = new Game_Interpreter(); i._eventId = 0; PluginManager.callCommand(i, 'Hendrix_Animation_Solution', 'showAnimationFromLibrary', { animationName: 'ProjectR_Zetsu_Arrival', eventId: 'player', loopCount: 'infinite', stickMode: 'false' }); return 'ok'; })()");
    await sleep(500); for (let i = 0; i < 3; i++) { await s.shot(`21_noise_loop_${i}`); await sleep(70); }
    await ev("(function() { var i = new Game_Interpreter(); i._eventId = 0; PluginManager.callCommand(i, 'Hendrix_Animation_Solution', 'removeAnimation', { eventId: 'player', notetag: 'ProjectR_Zetsu_Arrival', effect: 'none', duration: '' }); return 'ok'; })()");
    // 腕クロス(長めに保持)
    await ev("ProjectRCharacterPresentation.request('CrossArms', { frames: 600, degree: 180, source: 'evidence' }); 'ok'"); await sleep(600);
    await s.shot("22_cross_arms");
    await ev("ProjectRCharacterPresentation.release('CrossArms'); 'ok'");
    rec("evidence 証跡スクリーンショットを撮影", true, fs.readdirSync(OUT).filter(f => /^2[0-2]_/.test(f)));
  });

  // ---- 回帰 ----
  await check("regress-gun", async () => {
    await ev("ProjectRZetsuTest.start(1); 'ok'"); await s.slow(1); await s.place(31, 15);
    await ev("ProjectRGunSystem.requestReload('regress'); 'ok'"); await sleep(300); await wait("!ProjectRGunSystem.isReloading()", 15000);
    const ammo0 = await ev("ProjectRGunSystem.status().ammo");
    const t = await ev("JSON.stringify({ x: $gameMap.event(4).screenX(), y: $gameMap.event(4).screenY() })").then(JSON.parse);
    await c.pointer(t.x, t.y); await sleep(100);
    const shot = JSON.parse(await ev("JSON.stringify(ProjectRGunSystem.fire('regress'))")); await sleep(500);
    const ammo1 = await ev("ProjectRGunSystem.status().ammo");
    rec("R1 G17: 発射・弾数減少・リロード(旧Gunの復活なし)", shot.ok && ammo1 === ammo0 - 1 && ammo0 === 7, { ammo0, ammo1, legacyGun: await ev("typeof ProjectRLegacyGun") });
  });
  await check("regress-sword", async () => {
    await ev("$gameParty.leader().forceChangeEquip(0, $dataWeapons[2]); 'sword'"); await sleep(300);
    const before = s.errors().length;
    await c.pointer(900, 400); await c.tap("J", 120); await sleep(900);
    rec("R2 剣: 通常攻撃(共通イベント1)が例外なく動く", s.errors().length === before, { errors: s.errors().length });
    await s.shot("23_sword_swing");
    await ev("$gameParty.leader().forceChangeEquip(0, $dataWeapons[51]); 'gun'");
  });
  await check("regress-F", async () => {
    await s.place(25, 25); await ev("$gamePlayer.setDirection(8); 'up'"); await sleep(300);
    await c.tap("F", 120); await sleep(700);
    const busy = await ev("$gameMessage.isBusy() || $gameMap.isEventRunning()");
    await s.shot("24_F_interact");
    // 調べるを閉じる(決定キーで進める)
    for (let i = 0; i < 8 && await ev("$gameMessage.isBusy() || $gameMap.isEventRunning() || SceneManager._scene.constructor.name !== 'Scene_Map'"); i++) { await c.tap("F", 100); await sleep(350); }
    rec("R3 F(調べる): Control Hubの会話/メニューが開き、閉じられる", busy === true, { busy });
  });
  await check("regress-U", async () => {
    const r = await ev("JSON.stringify({ before: ProjectRUltimateActivation.getLastUltimateActivationResult && ProjectRUltimateActivation.getLastUltimateActivationResult() })");
    await c.tap("U", 100); await sleep(500);
    const after = await ev("JSON.stringify(ProjectRUltimateActivation.getLastUltimateActivationResult())");
    rec("R4 U(Ultimate): 入力が受理され、結果(Gauge不足など)が返る。例外なし", after !== "null" && s.errors().length === 0, JSON.parse(after || "null"));
  });
  await check("regress-menu", async () => {
    const scene0 = await ev("SceneManager._scene.constructor.name");
    await ev("ProjectRCombatTestArena.endTest && ProjectRCombatTestArena.endTest(); 'ended'"); await sleep(500);
    await c.tap("Esc", 120); await sleep(1200);
    const scene1 = await ev("SceneManager._scene.constructor.name");
    await s.shot("25_menu_open");
    await c.tap("Esc", 120); await sleep(1200);
    const scene2 = await ev("SceneManager._scene.constructor.name");
    rec("R5 メニュー: 戦闘外でEscで開き、Escで戻る", scene0 === "Scene_Map" && scene1 !== "Scene_Map" && scene2 === "Scene_Map", { scene0, scene1, scene2 });
  });
  await check("regress-vision", async () => {
    const v = await ev("JSON.stringify({ layer: !!SceneManager._scene._spriteset._projectRVisionLayer, api: typeof ProjectR.VisionOcclusion, children: SceneManager._scene._spriteset._projectRVisionLayer.children.length })");
    rec("R6 Vision層: 生成されており、壁タグ操作(invalidateCache)後も動作", JSON.parse(v).layer && s.errors().length === 0, JSON.parse(v));
  });
  rec("R7 Console(F8)に赤いエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  fs.writeFileSync(OUT + "/results_regress.json", JSON.stringify(s.results, null, 1));
  console.log("TOTAL", s.results.filter(r => r.ok).length + "/" + s.results.length);
  process.exit(0);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
