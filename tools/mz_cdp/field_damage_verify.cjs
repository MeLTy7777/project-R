// フィールド戦闘 Stage 6C(近接と銃の攻撃力の分離)の実機(Playtest)確認。CDP の実際のクリックで斬り・撃ち、敵のHPの減りを測る。
//   乱数(分散・会心・回避)は、この検証のページ内だけ固定する(Math.random = 0.5)。ゲームのファイル・セーブは変えない。
//   D0 現状の数値(近接1・2・3段目・銃)と、期待値(a.atk * 4 - b.def * 2)との一致
//   D1 銃の攻撃力(武器51の ATK)を変えても、近接のダメージは変わらず、銃のダメージだけ変わる
//   D2 近接の武器(DB のリードの初期武器 = ロングソード)の ATK を変えても、銃のダメージは変わらず、近接のダメージだけ変わる
//   D3 3段目の強撃は 2倍(式は変わらない)・コンボ・ヒットストップなどの手応えは変わらない
//   D4 近接武器を装備しているときは従来どおり(装備中の武器がそのまま使われる)・分離をオフにすると従来(銃の攻撃力)に戻る
//   D5 装備・所持品・セーブは変わらない(試験中に一時的に差し替えても、必ず元に戻る)
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_damage_verify.cjs   (新しいNW.jsセッションで実行する)
//   BASELINE=1 を付けると、判定せずに数値だけ出す(変更前後の比較用)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const BASELINE = process.env.BASELINE === "1";
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 900)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const setHp = (id, n) => ev(`(function(){ var hp = $gameMap.getCurrentEventHp(${id}); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: (${n} > hp ? '+' : '') + (${n} - hp), exceedMaxHealth: 'true' }); return 'ok'; })()`);
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(300); };
  const putEnemy = (id, x, y) => ev(`(function(){ var e = $gameMap.event(${id}); e.locate(${x}, ${y}); e._realX = ${x}; e._realY = ${y}; return 'ok'; })()`);
  const aimAt = async (dx, dy) => { const p = await json("({ x: Math.round($gamePlayer.screenX()), y: Math.round($gamePlayer.screenY() - 24) })"); await c.pointer(p.x + dx * 48, p.y + dy * 48); await sleep(250); };
  const aimEvent = async id => { const p = await json(`({ x: Math.round($gameMap.event(${id}).screenX()), y: Math.round($gameMap.event(${id}).screenY() - 24) })`); await c.pointer(p.x, p.y); await sleep(250); };
  const topUp = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
  const retry = async (fn, ok, n = 3) => { let r; for (let i = 0; i < n; i++) { r = await fn(i); if (ok(r)) break; } return r; };
  const enter = async () => { await ev(`${FC}.end(); 'ok'`); await sleep(300); if ((await ev("$gameMap.mapId()")) !== 1 || (await ev(`${FC}.getEncounterState().state`)) !== "idle") { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1000); } await ev(`${FC}.startEncounter({ encounterId: 'dmg', battleMapId: 8, spawnX: 8, spawnY: 10, direction: 8, resultVariableId: 9 }); 'ok'`); await waitMap(8); await wait(`${FC}.isActive()`, 15000); await sleep(1200); };
  const targets = async list => { for (const [id, x, y] of list) { await ev(`${FC}.detachEnemy(${id}); 'ok'`); await putEnemy(id, x, y); await setHp(id, 100000); } await sleep(300); };

  // HPの減りを、フレームごとに記録する(1回の命中 = 1つの減り)。乱数は固定
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); return 'ok'; })()`);
  await ev(`(function() { window.__origRandom = Math.random; window.__drops = []; var o = Scene_Map.prototype.update; window.__lastHp = {}; Scene_Map.prototype.update = function() { var r = o.apply(this, arguments); try { [1, 2, 3].forEach(function(id) { var e = $gameMap.event(id); if (!e) return; var h = $gameMap.getCurrentEventHp(id); var p = window.__lastHp[id]; if (p !== undefined && h < p) window.__drops.push({ id: id, d: p - h, f: Graphics.frameCount }); window.__lastHp[id] = h; }); } catch (x) {} return r; }; return 'ok'; })()`);
  const fixRandom = on => ev(`Math.random = ${on ? "function() { return 0.5; }" : "window.__origRandom"}; 'ok'`);
  const drops = async () => json("window.__drops");
  const clear = () => ev("window.__drops = []; 'ok'");

  await enter(); await ev("$gameSelfSwitches.setValue([8, 5, 'A'], true); 'ok'");
  await targets([[1, 10, 10], [2, 2, 2], [3, 14, 2]]); await ev("$gameMap.event(2).locate(2, 2); $gameMap.event(3).locate(14, 2); 'ok'");
  await fixRandom(true);
  // 敵の防御力(Hendrix の戦闘者)と、リードの攻撃力
  const stats = await json(`(function(){ var a = $gameParty.leader(); var e = $gameMap.event(1); var b = (typeof SgetBattlerForH === 'function') ? SgetBattlerForH(e) : null; return { atk: a.atk, def: b ? b.def : null, weapon: a.weapons()[0] && a.weapons()[0].name, gunAtk: $dataWeapons[51].params[2], swordAtk: $dataWeapons[2].params[2], base: a.paramBase(2), plus: a.paramPlus(2), actorDefaultWeapon: $dataActors[a.actorId()].equips[0], equip0: a.equips()[0] && a.equips()[0].id }; })()`);
  console.log("stats", JSON.stringify(stats));
  const expected = (atk, def) => Math.max(0, atk * 4 - def * 2);

  // 近接3回(1・2段目・強撃)と銃の、1回あたりのダメージを測る
  const measure = async () => {
    await place(8, 10, 6); await topUp();
    await putEnemy(1, 10, 10); await aimAt(5, 0);
    const melee = await retry(async () => { await setHp(1, 100000); await sleep(1800); await clear(); for (let i = 0; i < 3; i++) { await c.click(); await sleep(650); } await sleep(900); return (await drops()).filter(x => x.id === 1).map(x => x.d); }, r => r.length === 3);
    await sleep(1200);
    await place(6, 10, 6); await putEnemy(1, 10, 10); await aimEvent(1);
    const gun = await retry(async () => { await setHp(1, 100000); await sleep(1500); await clear(); await c.rightClick(); await sleep(1300); return (await drops()).filter(x => x.id === 1).map(x => x.d); }, r => r.length >= 1);
    return { melee, gun: gun[0] };
  };
  const base = await measure();
  console.log("before-numbers", JSON.stringify({ stats, base }));
  await check("D", async () => {
    const atk = stats.atk, def = stats.def;
    rec("D0 数値の確認: 近接1・2段目と銃は ATK×4 − 防御×2(乱数固定)・3段目の強撃は2倍", base.melee.length === 3 && base.gun > 0 && base.melee[0] === base.melee[1] && Math.abs(base.melee[2] - base.melee[0] * 2) <= 1, JSON.stringify({ stats, base }));
    if (BASELINE) {                                                                    // 変更前の数値: 銃の攻撃力を変えると近接も変わる / 近接の武器(ロングソード)の攻撃力は近接に効かない
      await ev("window.__gunAtk0 = $dataWeapons[51].params[2]; $dataWeapons[51].params[2] = window.__gunAtk0 + 20; 'ok'"); const g20 = await measure(); await ev("$dataWeapons[51].params[2] = window.__gunAtk0; 'ok'");
      await ev("window.__swAtk0 = $dataWeapons[2].params[2]; $dataWeapons[2].params[2] = window.__swAtk0 + 20; 'ok'"); const s20 = await measure(); await ev("$dataWeapons[2].params[2] = window.__swAtk0; 'ok'");
      console.log("baseline gun+20", JSON.stringify(g20), "sword+20", JSON.stringify(s20)); return;
    }
    // 近接の攻撃力の元 = 銃を持っているときは、DB のリードの初期武器(ロングソード)。銃の攻撃力は含まない
    const swordAtk = stats.base + stats.swordAtk, expMelee = expected(swordAtk, def), expGun = expected(atk, def);
    rec("D1 近接は銃の攻撃力を使わない: 近接のダメージ = (基礎 + ロングソード) ATK で計算 / 銃のダメージ = (基礎 + 銃) ATK で計算(従来のまま)", base.melee[0] === expMelee && base.gun === expGun, JSON.stringify({ melee: base.melee[0], expMelee, gun: base.gun, expGun, swordAtk, atk }));
    // 銃の攻撃力を +20 → 銃だけ変わる
    await ev("window.__gunAtk0 = $dataWeapons[51].params[2]; $dataWeapons[51].params[2] = window.__gunAtk0 + 20; 'ok'");
    const g20 = await measure(); await ev("$dataWeapons[51].params[2] = window.__gunAtk0; 'ok'");
    rec("D2 銃の攻撃力を +20 にすると、銃のダメージだけ +80(=20×4)になり、近接1〜3段目のダメージは変わらない", g20.gun === base.gun + 80 && g20.melee.join() === base.melee.join(), JSON.stringify({ gun: [base.gun, g20.gun], melee: [base.melee, g20.melee] }));
    // 近接の武器(ロングソード)の攻撃力を +20 → 近接だけ変わる
    await ev("window.__swAtk0 = $dataWeapons[2].params[2]; $dataWeapons[2].params[2] = window.__swAtk0 + 20; 'ok'");
    const s20 = await measure(); await ev("$dataWeapons[2].params[2] = window.__swAtk0; 'ok'");
    rec("D3 近接の武器の攻撃力を +20 にすると、近接のダメージだけ +80(強撃は +160)になり、銃のダメージは変わらない", s20.melee[0] === base.melee[0] + 80 && s20.melee[1] === base.melee[1] + 80 && Math.abs(s20.melee[2] - (base.melee[2] + 160)) <= 1 && s20.gun === base.gun, JSON.stringify({ melee: [base.melee, s20.melee], gun: [base.gun, s20.gun] }));
    rec("D4 3段目の強撃は、同じ式の2倍(ComboFinisherDamage = 2)・1段目と2段目は同じダメージ", Math.abs(base.melee[2] - Math.round(base.melee[0] * 2)) <= 1 && base.melee[0] === base.melee[1], JSON.stringify(base.melee));
    // 分離のオフ → 従来(銃の攻撃力で近接を計算)
    const src = await json(`${FC}.getMeleeDamageSource()`);
    rec("D5 近接の攻撃力の元を調べられる(銃を持っている → DB のリードの初期武器 = ロングソード id 2)", src.separate === true && src.weaponId === 2 && /actorDefault/.test(src.source), JSON.stringify(src));
    await ev(`${FC}.setMeleeDamageSource({ separate: false }); 'ok'`);
    const off = await measure();
    rec("D6 分離をオフにすると、従来どおり銃の攻撃力で近接を計算する(近接 = 銃と同じ ATK)", off.melee[0] === expGun && off.gun === base.gun, JSON.stringify({ melee: off.melee, expGun }));
    await ev(`${FC}.setMeleeDamageSource({ separate: true }); 'ok'`);
    // 近接武器を装備しているときは、装備中の武器がそのまま使われる(従来どおり)
    await ev("window.__eq0 = $gameParty.leader().equips()[0] && $gameParty.leader().equips()[0].id; $gameParty.leader().changeEquip(0, $dataWeapons[2]); 'ok'");
    const src2 = await json(`${FC}.getMeleeDamageSource()`);
    await place(8, 10, 6); await topUp(); await putEnemy(1, 10, 10); await aimAt(5, 0);
    const eq = await retry(async () => { await setHp(1, 100000); await sleep(1800); await clear(); await c.click(); await sleep(900); return (await drops()).filter(x => x.id === 1).map(x => x.d); }, r => r.length >= 1);
    await ev("$gameParty.leader().changeEquip(0, $dataWeapons[window.__eq0]); 'ok'");
    rec("D7 近接武器(ロングソード)を装備しているときは、装備中の武器の ATK がそのまま使われる(従来どおり。分離の対象外)", src2.source === "equippedMelee" && eq[0] === expMelee, JSON.stringify({ src: src2, dmg: eq[0], expMelee }));
    const after = await json(`({ equip0: $gameParty.leader().equips()[0] && $gameParty.leader().equips()[0].id, weapons: $gameParty.leader().weapons().map(function(w) { return w.id; }), atk: $gameParty.leader().atk, gunAtk: $dataWeapons[51].params[2], swordAtk: $dataWeapons[2].params[2], ammo: $gameParty.numItems($dataItems[31]), writes: window.__writes })`);
    rec("D8 装備・攻撃力・所持品・保存は変わらない(一時的な差し替えは必ず元に戻る)・保存の書き込みなし", after.equip0 === stats.equip0 && after.atk === stats.atk && after.gunAtk === 7 && after.swordAtk === 12 && after.writes === 0, JSON.stringify({ after, stats }));
  });
  await fixRandom(false);
  const errs = s.errors();
  rec("Z Console のエラーなし", errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  const bad = s.results.filter(r => !r.ok).length; console.log(`\n${s.results.length - bad}/${s.results.length} PASS`); require("fs").writeFileSync(`${process.env.MZ_OUT || "mz_out"}/field_damage_verify.json`, JSON.stringify(s.results, null, 1)); process.exit(bad ? 1 : 0);
})().catch(e => { console.log("FATAL", e.stack); process.exit(2); });
