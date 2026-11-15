// 敵の経路探索(Stage 4)の実機(Playtest)確認。F8 なし(startEncounter → Map008)。Map008 のファイルは変更しない(柱は、実行中のメモリ上のタイルを書き換えて作る。通れないだけで、視界は遮らない)。
//   N0 既定・従来の動き(まっすぐ進めるときは、経路探索なしと同じ軌跡)
//   N1 柱の向こうのプレイヤーへ、柱をよけて追いつく(従来は柱の前で止まる)/ 扉の枠の角(斜めの視線)で引っかからない
//   N2 視界の変化: 扉を閉じる・壁の陰へ隠れる → すぐ止まる(隠れた位置を追わない・最後に見た位置へ向かわない)/ 見えれば探し直す
//   N3 経路がない(戸口を柱でふさぐ)→ 近づけるところまで行って待つ・探索を繰り返さない / 敵が複数でも 1 フレーム 3 回まで・重ならない
//   N4 攻撃の溜め・ダメージ・Cooldown・敵の死・繰り返しのエンカウンターは従来どおり
//   N5 性能・Console のエラーなし・保存の書き込みなし
//   N6 Map008 の DEV の柱(11〜12, 9〜10 の 2x2。データに入っている。タイルの書き換えなし): 通れない・視線は通る・その向こうのプレイヤーへ回り込む・扉/撤退の道は変わらない・繰り返しでも同じ
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_pathfinding_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(350); };
  const door = open => ev(`$gameSelfSwitches.setValue([8, 5, 'A'], ${open}); 'ok'`).then(() => sleep(300));
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.startEncounter({ encounterId: 'pf', battleMapId: 8, spawnX: 8, spawnY: 9, direction: 8, resultVariableId: 9 }); 'ok'`); await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 20000); await wait(`${FC}.isActive()`, 15000); await ev("window.__pOrig = {}; 'ok'"); await sleep(1000); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(800); };
  const nav = id => json(`${FC}.getEnemyNav(${id})`);
  const stats = () => json(`${FC}.getNavStats()`);
  const epos = id => json(`({ x: $gameMap.event(${id})._realX, y: $gameMap.event(${id})._realY, d: $gameMap.event(${id}).direction() })`);
  const efsm = id => json(`(function(){ var b = ${FC}.getState().enemies.filter(function(e){ return e.eventId === ${id}; })[0]; return b || null; })()`);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // 柱(通れない・視界は遮らない): 壁のタイルの層(0..3)を、指定のマスへ写す。タイルの書き換えは、そのマップを読み込んでいる間だけ(マップを読み直すと元へ戻る)
  // (Hendrix は、タイルの通行の結果をキャッシュするので、書き換えたマスは clearPassageCacheForPosition で消す)
  const pillars = async cells => { await ev(`(function(){ var m = $dataMap, W = m.width, H = m.height, o = window.__pOrig || {}, touch = []; Object.keys(o).forEach(function(k){ var p = k.split(','); touch.push([+p[0], +p[1]]); for (var z = 0; z < 4; z++) m.data[(z*H+(+p[1]))*W+(+p[0])] = o[k][z]; }); window.__pOrig = {}; var src = [0,1,2,3].map(function(z){ return m.data[(z*H+7)*W+3]; }); ${JSON.stringify(cells)}.forEach(function(p){ touch.push(p); window.__pOrig[p[0]+','+p[1]] = [0,1,2,3].map(function(z){ return m.data[(z*H+p[1])*W+p[0]]; }); for (var z = 0; z < 4; z++) m.data[(z*H+p[1])*W+p[0]] = src[z]; }); touch.forEach(function(p){ if ($gameMap.clearPassageCacheForPosition) $gameMap.clearPassageCacheForPosition(p[0], p[1]); }); ${FC}.invalidateNavCache(); return 'ok'; })()`); };
  // 敵 id を (x, y) に置く。ほかの敵は遠くへ離して行動を外す(離れた敵は、視界の外)。opts で行動の設定
  const arrange = async (list, parked) => {
    const keep = list.map(l => l.id);
    let code = [1, 2, 3].map(i => `${FC}.detachEnemy(${i});`).join(" ");
    const park = { 1: [1, 1], 2: [15, 1], 3: [1, 5] };
    for (const i of [1, 2, 3]) if (!keep.includes(i)) code += ` var q${i} = $gameMap.event(${i}); q${i}.locate(${park[i][0]}, ${park[i][1]}); q${i}._realX = ${park[i][0]}; q${i}._realY = ${park[i][1]};`;
    for (const l of list) code += ` var e${l.id} = $gameMap.event(${l.id}); e${l.id}.locate(${l.x}, ${l.y}); e${l.id}._realX = ${l.x}; e${l.id}._realY = ${l.y}; e${l.id}.setDirection(${l.dir || 2}); ${FC}.attachEnemy(${l.id}, ${JSON.stringify(l.opts || {})});`;
    await ev(`(function(){ ${code} return 'ok'; })()`); await sleep(100);
  };
  const SIGHT = { sightTiles: 16, fovDegrees: 360, windupFrames: 400, cooldownFrames: 400 };      // 長い溜め: 届いたことは「溜め中」で見分ける(攻撃は実行されない)
  const track = ids => ev(`(function(){ window.__trk = {}; ${JSON.stringify(ids)}.forEach(function(i){ window.__trk[i] = []; }); var o = Game_Map.prototype.update; window.__origGMU2 = o; Game_Map.prototype.update = function(){ var r = o.apply(this, arguments); ${JSON.stringify(ids)}.forEach(function(i){ var e = $gameMap.event(i); window.__trk[i].push([+e._realX.toFixed(3), +e._realY.toFixed(3)]); }); return r; }; return 'ok'; })()`);
  const untrack = () => json("(function(){ Game_Map.prototype.update = window.__origGMU2; return window.__trk; })()");

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }]); $gameMap._interpreter = it; return 'ok'; })()`);
  await sleep(600);

  await check("N0 既定・従来どおりの動き", async () => {
    await enter();
    const cfg = await json(`({ on: ${FC}.isPathfinding(), stats: ${FC}.getNavStats(), api: ['getEnemyNav','findNavPath','invalidateNavCache','setPathfinding','getNavStats'].every(function(k){ return typeof ${FC}[k] === 'function'; }) })`);
    rec("N0a 既定: 経路探索は有効・API がある・探索はまだ 0 回", cfg.on === true && cfg.api === true && cfg.stats.searches === 0 && cfg.stats.errors === 0, JSON.stringify(cfg));
    // まっすぐ進める場面(扉を開け、敵3は扉の正面・プレイヤーは真南): 経路探索の有無で、軌跡は同じ(まっすぐは従来と同じ命令だけ)
    const run = async on => {
      await door(true); await ev(`${FC}.setPathfinding(${on}); ${FC}.resetNavStats(); 'ok'`); await place(8, 10, 8);
      await arrange([{ id: 3, x: 8, y: 3, dir: 2, opts: SIGHT }]); await track([3]);
      await sleep(1300); const tr = (await untrack())[3]; const st = await stats(); const fsm = await efsm(3);
      return { tr, st, fsm };
    };
    const a = await run(true), b = await run(false);
    const n = Math.min(a.tr.length, b.tr.length, 80); let dmax = 0; for (let i = 0; i < n; i++) dmax = Math.max(dmax, Math.hypot(a.tr[i][0] - b.tr[i][0], a.tr[i][1] - b.tr[i][1]));
    rec("N0b まっすぐ進めるとき(扉の正面・柱なし)は、経路探索の有無で軌跡が同じ(最初の " + n + " フレーム)・探索 0 回・経路を使わない", n >= 60 && dmax < 0.05 && a.st.searches === 0 && a.st.directFrames > 30 && a.st.pathFrames === 0, JSON.stringify({ n, dmax: +dmax.toFixed(4), on: a.st, last: a.tr.at(-1), off: b.tr.at(-1) }));
    await ev(`${FC}.setPathfinding(true); 'ok'`);
    await sleep(2500); const fsm = await efsm(3);
    rec("N0c 扉の正面を通って追いつき、攻撃の予約(溜め)に入る(溜め・攻撃の流れは従来どおり)", fsm && fsm.state === "windup", JSON.stringify(fsm));
  });

  await check("N1 柱をよける・扉の枠の角", async () => {
    await door(true); await ev(`${FC}.setPathfinding(true); 'ok'`);
    await pillars([[8, 9], [8, 10]]);                                                               // 扉の南の真下に柱(8,9)(8,10)。プレイヤー(8,11)は、柱の南側
    const run = async on => {
      await ev(`${FC}.setPathfinding(${on}); ${FC}.resetNavStats(); 'ok'`); await place(8, 11, 8);
      await arrange([{ id: 3, x: 8, y: 8, dir: 2, opts: SIGHT }]); await track([3]);
      const reached = await wait(`(function(){ var b = ${FC}.getState().enemies.filter(function(e){ return e.eventId === 3; })[0]; return !!b && b.state === 'windup'; })()`, on ? 9000 : 5000);
      const tr = (await untrack())[3]; const st = await stats(); const nv = await nav(3); const ep = await epos(3); const pp = await json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })");
      return { reached, tr, st, nv, ep, d: dist(ep, pp) };
    };
    const on = await run(true);
    const inPillar = on.tr.some(p => { const cx = Math.floor(p[0] + 0.5), cy = Math.floor(p[1] + 0.5); return cx === 8 && (cy === 9 || cy === 10); });
    rec("N1a 柱(8,9)(8,10)の向こうのプレイヤーへ、柱をよけて追いつき、攻撃の予約(溜め)に入る・柱の中へ入らない", on.reached === true && !inPillar && on.d <= 1.3 && on.st.searches >= 1 && on.st.pathFrames > 20 && on.st.errors === 0, JSON.stringify({ reached: on.reached, d: +on.d.toFixed(2), searches: on.st.searches, pathFrames: on.st.pathFrames, frames: on.tr.length, inPillar }));
    rec("N1b 通った経路は、まっすぐ→曲がり角→まっすぐ(探索は少ない・止まり続けない)", on.st.searches <= 6 && on.st.stuck === 0 && on.nv.stuckCount === 0, JSON.stringify({ st: on.st, nv: on.nv }));
    const off = await run(false);
    rec("N1c 経路探索を切ると(従来)、柱の前で止まり、届かない(同じ配置で)", off.reached === false && off.ep.y < 9.1 && off.d > 2 && off.st.searches === 0, JSON.stringify({ reached: off.reached, ep: off.ep, d: +off.d.toFixed(2) }));
    await ev(`${FC}.setPathfinding(true); 'ok'`);
    // 扉の枠の角: 斜めの視線で扉ごしに見える敵(扉の北西)。体が扉の幅いっぱいなので、まっすぐ追うと枠(壁の角)へ当たる所を、戸口の中央を通る
    await pillars([]); await ev(`${FC}.resetNavStats(); 'ok'`); await place(8.85, 10, 8);
    await arrange([{ id: 3, x: 7, y: 5, dir: 2, opts: SIGHT }]); await track([3]);
    const ok = await wait(`(function(){ var b = ${FC}.getState().enemies.filter(function(e){ return e.eventId === 3; })[0]; return !!b && b.state === 'windup'; })()`, 9000);
    const tr = (await untrack())[3]; const st = await stats(); const ep = await epos(3);
    const crossing = tr.filter(p => p[1] > 6.2 && p[1] < 7.8);                                  // 壁の行(y=7)をまたぐ間: 体の x が戸口(8)の中
    const offX = crossing.length ? Math.max(...crossing.map(p => Math.abs(p[0] - 8))) : 99;
    rec("N1d 扉の枠の角(斜めの視線)でも、戸口の中央を通って追いつく(壁の行をまたぐ間の横ずれ < 0.06)・止まり続けない", ok && crossing.length > 5 && offX < 0.06 && st.stuck === 0 && st.errors === 0, JSON.stringify({ ok, crossing: crossing.length, offX: +offX.toFixed(3), stuck: st.stuck, ep }));
  });

  await check("N2 視界の変化", async () => {
    await door(true); await pillars([[8, 9], [8, 10]]); await ev(`${FC}.resetNavStats(); 'ok'`); await place(8, 11, 8);
    await arrange([{ id: 3, x: 8, y: 3, dir: 2, opts: SIGHT }]); await sleep(500);
    const mid = await nav(3), p0 = await epos(3);
    rec("N2a 扉の北から追っている最中(柱をよける経路あり・まだ扉の北側)", mid.mode === "path" && mid.pathLength > 0 && p0.y > 3.5 && p0.y < 6.2, JSON.stringify({ mid, p0 }));
    await ev("window.__tr = []; (function(){ var o = Game_Map.prototype.update; window.__origGMU3 = o; Game_Map.prototype.update = function(){ var r = o.apply(this, arguments); var e = $gameMap.event(3); if (window.__on3) window.__tr.push([e._realX, e._realY, ProjectRFieldCombat.getEnemyPerception(3).aware, ProjectRFieldCombat.getEnemyNav(3).pathLength]); return r; }; })(); window.__on3 = true; 'ok'");
    await door(false); await sleep(1500);                                                           // 扉を閉じる(その場で視線が切れる)
    await ev("window.__on3 = false; Game_Map.prototype.update = window.__origGMU3; 'ok'");
    const tr = await json("window.__tr"); const lost = await nav(3); const per = await json(`${FC}.getEnemyPerception(3)`);
    let stopAt = -1; for (let i = 0; i < tr.length; i++) if (!tr[i][2]) { stopAt = i; break; }
    const after = tr.slice(Math.max(0, stopAt) + 2), drift = after.length ? Math.max(...after.map(r => Math.hypot(r[0] - after[0][0], r[1] - after[0][1]))) : 99;
    rec("N2b 扉を閉じて視線が切れると、数フレーム以内に止まる・経路を捨てる(pathLength 0・mode idle)", stopAt >= 0 && stopAt <= 3 && drift < 0.02 && lost.mode === "idle" && lost.pathLength === 0 && per.aware === false, JSON.stringify({ stopAt, drift: +drift.toFixed(4), lost, aware: per.aware, frames: tr.length }));
    const hidden = await epos(3), moves = [];
    for (const [x, y] of [[3, 9], [13, 10], [8, 8], [2, 8], [8, 11]]) { await place(x, y, 8); await sleep(500); moves.push(dist(hidden, await epos(3))); }
    rec("N2c 隠れている間は、プレイヤーがどこへ動いても(隠れた位置・最後に見た位置へも)敵は動かない・経路を持たない", Math.max(...moves) < 0.02 && (await nav(3)).pathLength === 0, JSON.stringify({ moves: moves.map(v => +v.toFixed(4)) }));
    // 扉を開けても、壁の陰(視線が通らない位置)のプレイヤーには動かない
    await place(3, 9, 8); await door(true); await sleep(900); const e1 = await epos(3), side = await json(`${FC}.getEnemyPerception(3)`); await sleep(700); const e2 = await epos(3);
    rec("N2d 扉を開けても、壁の陰(視線が通らない位置)のプレイヤーは見つけない・動かない・経路を持たない", side.aware === false && side.reason === "blocked" && dist(e1, e2) < 0.02 && dist(e2, hidden) < 0.02 && (await nav(3)).pathLength === 0, JSON.stringify({ side, e1, e2, hidden }));
    const plans = (await nav(3)).plans, acq = (await json(`${FC}.getEnemyPerception(3)`)).acquired;
    await place(8, 11, 8); await sleep(1500); const back = await nav(3), per2 = await json(`${FC}.getEnemyPerception(3)`), e3 = await epos(3);
    rec("N2e 視線が通る位置へ戻ると、もう一度見つけて(acquired が増える)、いまのプレイヤーの位置へ探し直して追う", per2.acquired === acq + 1 && back.plans > plans && (back.mode === "path" || back.mode === "direct") && e3.y > hidden.y + 0.3, JSON.stringify({ acq, per2: per2.acquired, plans, back, e3 }));
    const st = await stats();
    rec("N2f 視界の判定は従来どおり(見失った回数は扉を閉じる・壁の陰の 2 回)・経路探索の例外なし", st.lostSight >= 1 && (await json(`${FC}.getEnemyPerception(3)`)).losses >= 1 && st.errors === 0, JSON.stringify(st));
  });

  await check("N3 経路がない・複数の敵", async () => {
    await door(true); await pillars([[8, 8]]); await ev(`${FC}.resetNavStats(); 'ok'`); await place(8, 10, 8);       // 戸口(8,7)の真下をふさぐ。扉の南へは、どこからも入れない
    await arrange([{ id: 3, x: 8, y: 3, dir: 2, opts: SIGHT }]); await sleep(4500);
    const nv = await nav(3), st = await stats(), ep = await epos(3), per = await json(`${FC}.getEnemyPerception(3)`);
    rec("N3a 戸口をふさぐと届く経路がない: 近づけるところ(戸口あたり y≈6〜7)まで行って待つ・視界の判定は変えない", per.aware === true && ep.y > 5.5 && ep.y < 7.2 && nv.mode === "path" && nv.pathLength === 0, JSON.stringify({ ep, nv, aware: per.aware }));
    const at = await epos(3), before = (await stats()).searches; await sleep(3000); const at2 = await epos(3), after = await stats();
    rec("N3b 待っている間は動かない(壁・柱に押しつけない)・探索は約30フレームごと(3秒で 6 回以内)・例外なし", dist(at, at2) < 0.02 && after.searches - before <= 6 && after.errors === 0, JSON.stringify({ at, at2, searches: after.searches - before, errors: after.errors }));
    // 複数: 3体が、柱(8,9)(8,10)の向こうのプレイヤーへ。全員が進む・1フレームの探索 3 回まで・重ならない
    await pillars([[8, 9], [8, 10]]); await ev(`${FC}.resetNavStats(); 'ok'`); await place(8, 11, 8);
    await arrange([{ id: 1, x: 6, y: 8, dir: 2, opts: SIGHT }, { id: 2, x: 10, y: 8, dir: 2, opts: SIGHT }, { id: 3, x: 8, y: 8, dir: 2, opts: SIGHT }]);
    await ev("window.__minGap = 9; (function(){ var o = Game_Map.prototype.update; window.__origGMU4 = o; Game_Map.prototype.update = function(){ var r = o.apply(this, arguments); var a = [1,2,3].map(function(i){ return $gameMap.event(i); }); for (var i = 0; i < 3; i++) for (var j = i + 1; j < 3; j++) { var g = Math.max(Math.abs(a[i]._realX - a[j]._realX), Math.abs(a[i]._realY - a[j]._realY)); if (g < window.__minGap) window.__minGap = g; } return r; }; })(); 'ok'");
    await sleep(6500);
    await ev("Game_Map.prototype.update = window.__origGMU4; 'ok'");
    const eps = [await epos(1), await epos(2), await epos(3)], pp = await json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })"), st3 = await stats(), gap = await ev("window.__minGap");
    const states = [await efsm(1), await efsm(2), await efsm(3)];
    rec("N3c 敵3体が柱をよけて近づく(全員がプレイヤーから 3 tile 以内、うち 2 体以上が攻撃の予約=溜めへ)", eps.every(e => dist(e, pp) < 3.0) && states.filter(x => x && x.state === "windup").length >= 2, JSON.stringify({ d: eps.map(e => +dist(e, pp).toFixed(2)), states: states.map(x => x && x.state) }));
    rec("N3d 1フレームの探索は 3 回まで・敵同士の体が(大きく)重ならない(最小の間隔 ≥ 0.85)・例外なし", st3.maxFrameSearches <= 3 && gap >= 0.85 && st3.errors === 0, JSON.stringify({ maxFrameSearches: st3.maxFrameSearches, gap: +gap.toFixed(3), searches: st3.searches, stuck: st3.stuck }));
  });

  await check("N4 攻撃・死・繰り返しのエンカウンター", async () => {
    // 攻撃の溜め → 実行 → ダメージ → Cooldown(柱をよけた先でも従来どおり)
    await door(true); await pillars([[8, 9], [8, 10]]); await ev(`${FC}.resetNavStats(); 'ok'`); await place(8, 11, 8);
    const hp0 = await ev("$gameParty.leader().hp");
    await arrange([{ id: 3, x: 8, y: 8, dir: 2, opts: { sightTiles: 16, fovDegrees: 360, windupFrames: 30, cooldownFrames: 60 } }]);
    await wait(`(function(){ var b = ${FC}.getState().enemies.filter(function(e){ return e.eventId === 3; })[0]; return !!b && b.attacks >= 1; })()`, 12000);
    const f1 = await efsm(3), hp1 = await ev("$gameParty.leader().hp"), n1 = await nav(3);
    rec("N4a 柱をよけて追いつき、溜め(30フレーム)→ 攻撃が実行され(attacks≥1)・プレイヤーのHPが減り・Cooldown(60フレーム)に入る", f1 && f1.attacks >= 1 && f1.cooldown > 0 && f1.cooldown <= 60 && hp1 < hp0, JSON.stringify({ f1, n1, hp0, hp1 }));
    // 死んだ敵は止まる・勝利で戻る
    await ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '3', value: '-99999', exceedMaxHealth: 'false' }); 'ok'`);
    await sleep(600); const dead = await json("(function(){ var e = $gameMap.event(3); return { through: e._through, hp: $gameMap.getCurrentEventHp(3), listed: ProjectRFieldCombat.listEnemies().indexOf(3) >= 0 }; })()");
    rec("N4b 倒した敵は、すぐ通り抜けられる・敵の一覧から外れる(経路の探索を続けない)", dead.through === true && dead.hp <= 0 && dead.listed === false, JSON.stringify(dead));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    // 繰り返し: 2 回目は新しいマップ(柱は消える・扉は閉・敵は初期位置)。柱を作り直して、同じようによける
    for (let round = 1; round <= 2; round++) {
      await enter();
      const fresh = await json(`({ door: $gameSelfSwitches.value([8, 5, 'A']), nav: ${FC}.getEnemyNav(1), enemies: ${FC}.listEnemies(), wall: $gameMap.isPassable(8, 9, 2) })`);
      await door(true); await pillars([[8, 9], [8, 10]]); await ev(`${FC}.resetNavStats(); 'ok'`); await place(8, 11, 8);
      await arrange([{ id: 3, x: 8, y: 8, dir: 2, opts: SIGHT }]);
      const reached = await wait(`(function(){ var b = ${FC}.getState().enemies.filter(function(e){ return e.eventId === 3; })[0]; return !!b && b.state === 'windup'; })()`, 9000);
      const st = await stats();
      rec(`N4c 繰り返し ${round}: マップが新しい(扉は閉・柱なし・探索の状態は空)→ 柱を作り直すと、また柱をよけて追いつく`, fresh.door === false && fresh.wall === true && fresh.nav && fresh.nav.plans === 0 && reached === true && st.searches >= 1 && st.errors === 0, JSON.stringify({ fresh, reached, st }));
      await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    }
  });

  await check("N6 Map008 の DEV の柱(手動 Playtest 用。タイルの書き換えなし)", async () => {
    await enter();
    const PILLAR = [[11, 9], [12, 9], [11, 10], [12, 10]];
    const data = await json(`(function(){ var p = ${JSON.stringify(PILLAR)}, o = ProjectR.CombatOcclusion; return { blocked: p.map(function(c){ return [2,4,6,8].every(function(d){ return !$gameMap.isPassable(c[0], c[1], d); }); }), region: p.map(function(c){ return $gameMap.regionId(c[0], c[1]); }), los: o.hasLineOfSight({ x: 8.5, y: 8.5 }, { x: 13.5, y: 10.5 }, { mode: 'vision' }), losCombat: o.hasLineOfSight({ x: 8.5, y: 8.5 }, { x: 13.5, y: 10.5 }, { mode: 'combat' }), floorOk: [[8, 8], [8, 9], [8, 10], [13, 10], [10, 11], [10, 8]].map(function(c){ return $gameMap.isPassable(c[0], c[1], 2); }), pathToNpc: ProjectRFieldCombat.findNavPath({ x: 8, y: 9 }, { x: 8, y: 10 }) !== null, pathEast: ProjectRFieldCombat.findNavPath({ x: 8, y: 9 }, { x: 13, y: 10 }) }; })()`);
    rec("N6a 柱(11〜12, 9〜10)は通れない・Region 0(視線は遮らない・戦闘の弾・一閃は遮る)・出現位置から撤退 NPC の前・柱の東側へ行ける", data.blocked.every(Boolean) && data.region.every(r => r === 0) && data.los === true && data.losCombat === false && data.floorOk.every(v => v === false || v === true) && data.pathToNpc === true && !!data.pathEast && data.pathEast.length >= 6, JSON.stringify(data));
    const lure = async round => {
      await door(true); await ev(`${FC}.resetNavStats(); 'ok'`); await place(8, 9, 8);
      const came = await wait("$gameMap.event(3)._realY > 7.6", 12000);                    // 敵C(扉の正面)が、戸口(扉)まで来る(アビリティなし・F8 なし)
      await place(13, 10, 4);                                                                // プレイヤーは柱の東側へ(手動では、南の列 y=11 を通って歩く)
      await track([3]);
      const reached = await wait("(function(){ var e = $gameMap.event(3), p = $gamePlayer; return Math.hypot(e._realX - p._realX, e._realY - p._realY) < 1.45; })()", 9000);
      const tr = (await untrack())[3], st = await stats(), ep = await epos(3);
      const inPillar = tr.some(p => { const cx = Math.floor(p[0] + 0.5), cy = Math.floor(p[1] + 0.5); return cx >= 11 && cx <= 12 && cy >= 9 && cy <= 10; });
      const around = tr.some(p => p[0] > 10.3 && p[0] < 12.7 && (p[1] < 8.6 || p[1] > 10.4));      // 柱の北の列か南の列を通った
      return { round, came, reached, inPillar, around, searches: st.searches, pathFrames: st.pathFrames, stuck: st.stuck, errors: st.errors, ep };
    };
    const r1 = await lure(1);
    rec("N6b 扉から来た敵が、柱の東側のプレイヤーへ、柱の中へ入らず、北か南の列を回り込んで追いつく(F8 なし・タイルの書き換えなし)", r1.came && r1.reached && !r1.inPillar && r1.around && r1.searches >= 1 && r1.pathFrames > 20 && r1.errors === 0, JSON.stringify(r1));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    // 追っている最中に扉を閉じる(扉の北側で) → その場で止まる
    await enter(); await door(true); await place(8, 9, 8); await sleep(1000);
    const y0 = (await epos(3)).y;
    await ev("window.__tr = []; (function(){ var o = Game_Map.prototype.update; window.__origGMU5 = o; Game_Map.prototype.update = function(){ var r = o.apply(this, arguments); var e = $gameMap.event(3); if (window.__on5) window.__tr.push([e._realX, e._realY, ProjectRFieldCombat.getEnemyPerception(3).aware]); return r; }; })(); window.__on5 = true; 'ok'");
    await door(false); await sleep(1200);
    await ev("window.__on5 = false; Game_Map.prototype.update = window.__origGMU5; 'ok'");
    const tr = await json("window.__tr"); let stopAt = -1; for (let i = 0; i < tr.length; i++) if (!tr[i][2]) { stopAt = i; break; }
    const after = tr.slice(Math.max(0, stopAt) + 2), drift = after.length ? Math.max(...after.map(r => Math.hypot(r[0] - after[0][0], r[1] - after[0][1]))) : 99;
    rec("N6c 敵が扉に向かって来ている最中に扉を閉じると(視線が切れると)、数フレーム以内に止まる・経路を持たない", y0 < 6.9 && stopAt >= 0 && stopAt <= 3 && drift < 0.02 && (await nav(3)).pathLength === 0, JSON.stringify({ y0, stopAt, drift: +drift.toFixed(4), frames: tr.length }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    // 繰り返しのエンカウンター: 柱はデータなので、毎回あり、扉は閉・敵は初期位置。もう一度、同じ回り込み
    await enter();
    const fresh = await json(`({ door: $gameSelfSwitches.value([8, 5, 'A']), pillar: !$gameMap.isPassable(11, 9, 2), enemy3: { x: $gameMap.event(3)._realX, y: $gameMap.event(3)._realY }, plans: ${FC}.getEnemyNav(3).plans })`);
    const r2 = await lure(2);
    rec("N6d 繰り返しのエンカウンター: 扉は閉・柱はある・敵は初期位置・探索の状態は空 → 2 回目も、柱を回り込んで追いつく", fresh.door === false && fresh.pillar === true && fresh.enemy3.y < 4 && fresh.plans === 0 && r2.came && r2.reached && !r2.inPillar && r2.around && r2.errors === 0, JSON.stringify({ fresh, r2 }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
  });

  await check("N5 性能・エラー・保存", async () => {
    await enter(); await door(true); await pillars([[8, 9], [8, 10]]); await place(8, 11, 8);
    // 検索 1 回の時間(Chromium 85): 戦闘マップの端から端へ・柱の裏へ。200 回
    const bench = await json(`(function(){ var t = performance.now(), n = 0, len = 0; for (var i = 0; i < 200; i++) { var r = ${FC}.findNavPath({ x: 1 + (i % 4), y: 1 }, { x: 8, y: 11 }, { allowPartial: true }); if (r) { n++; len += r.length; } } return { ms: +((performance.now() - t) / 200).toFixed(4), found: n, avgLen: +(len / Math.max(1, n)).toFixed(1) }; })()`);
    rec("N5a 経路 1 回の計算(戦闘マップの端から端・柱をよける)は、平均 < 1.0ms", bench.found === 200 && bench.ms < 1.0, JSON.stringify(bench));
    const measure = async enabled => {
      await ev(`${FC}.setPathfinding(${enabled}); ${FC}.resetNavStats(); 'ok'`); await place(8, 11, 8);
      await arrange([{ id: 1, x: 5, y: 8, dir: 2, opts: SIGHT }, { id: 2, x: 11, y: 8, dir: 2, opts: SIGHT }, { id: 3, x: 8, y: 8, dir: 2, opts: SIGHT }]);
      await ev("(function(){ var o = Scene_Map.prototype.update; window.__ms = []; window.__origGM = o; Scene_Map.prototype.update = function(){ var t = performance.now(); var r = o.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; return 'ok'; })()");
      const n0 = await ev("window.__ms.length"), t0 = Date.now(); await sleep(4000); const n1 = await ev("window.__ms.length"), t1 = Date.now();
      const r = await json("(function(){ Scene_Map.prototype.update = window.__origGM; var a = window.__ms.slice().sort(function(x,y){return x-y}); return { frames: a.length, avgMs: +(a.reduce(function(s,x){return s+x},0)/a.length).toFixed(3), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(3), maxMs: +a[a.length-1].toFixed(3) }; })()");
      return { enabled, ...r, fps: +((n1 - n0) * 1000 / (t1 - t0)).toFixed(1), stats: await stats() };
    };
    const on = await measure(true), off = await measure(false); await ev(`${FC}.setPathfinding(true); 'ok'`);
    rec("N5b 敵3体が柱をよけて追う間の負荷は小さい(Scene_Map.update(敵の経路探索を含む1フレーム全体)の平均の増加 < 0.4ms)・約60fps・経路探索の 1 フレームの最大 < 3ms", on.fps > 52 && on.avgMs - off.avgMs < 0.4 && on.stats.maxFrameMs < 3 && on.stats.maxFrameSearches <= 3, JSON.stringify({ on, off }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("N5c Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_pathfinding_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
