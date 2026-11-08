/*:
 * @target MZ
 * @plugindesc v0.5.0 ProjectR SOUL戦闘 I4-B1〜B4/D13 敵の弾。DEFENSE の間だけ、戦闘エリア(厳密な16:9)の中で敵の弾を出す・動かす・描く・片づける。B2: ハートとの当たり判定と主人公HPへのダメージ(DEV設定値)。B3: 狙い撃ち・扇・放射波の3種(DEV試作)と、ボスのフェーズに合わせた選択。B4: ボスの弾幕を DEFENSE の長さに合わせて配分(波・発の間隔だけを広げる)。
 * @author ProjectR
 * @base ProjectR_SoulBattle
 * @base ProjectR_SoulBattleStage
 * @base ProjectR_SoulPhaseCleanup
 * @orderAfter ProjectR_SoulBattleStage
 * @orderAfter ProjectR_SoulPhaseCleanup
 * @orderAfter ProjectR_CutIn
 *
 * @help
 * ProjectR_SoulEnemyBullets.js
 *
 * 【役割】SOUL戦闘の DEFENSE で飛ぶ「敵の弾」です。弾が出る・動く・見える・消える、出す前の警告(テレグラフ)、(I4-B2)プレイヤーのハートへの当たり判定と主人公HPへのダメージ。
 *   ボス固有の弾幕・敗北の扱い(D13)・無敵時間はありません。BT-049「被弾後の無敵時間なし」に従い、無敵フレームは作りません(同じ弾の重複ダメージは、当たった弾をその場で消して防ぎます。別の弾は別々に当たります)。
 *
 * 【当たり判定(I4-B2)】DEFENSE の間、毎フレーム、弾の進んだ線分(前のフレーム → いま)と、プレイヤーのハート(マウスで動く本物の位置 = ProjectRSoulStage.getPlayerHeart)の小さな円との距離を測ります。
 *   ハートの当たり円 = 見た目の半径(幅の 0.014)× hitRadiusScale(DEV既定 0.5)。弾の当たり円 = 弾の半径 × bulletHitScale(DEV既定 1)。装飾の絵の大きさではなく、この円だけが判定です。
 *   当たった弾は即座に消え(その弾は二度と当たらない)、ダメージは既存のプレイヤーHPの窓口(Hendrix の UpdatePlayerHp。ProjectR_DamageModifiers の被ダメージ倍率が掛かる)で主人公(先頭アクター)に1回入ります。
 *   同じフレームに複数の弾が当たれば、弾ごとに別々のダメージです。ダメージの値(damage)・当たり円・HPの下限(floorHp = 1)は **DEV 設定**で、仕様に承認された本番値はありません(setConfig で変えられます)。
 *   HP の下限 floorHp: **本番の既定は 0**(HP は 0 まで減り、主人公の HP0 = 敗北。勝敗は ProjectR_SoulBattle / ProjectR_SoulEncounter が決める)。
 *   DEV の Sandbox(ProjectRSoulSandbox の a16)だけは floorHp = 1 を指定して従来どおり敗北しない(終われば元に戻す)。floorHp が正のとき、HP はその値より下がらず、
 *   被ダメージ倍率が大きくて削れない端数が残ることがある(従来どおり)。下限 0 では HP0 になった弾より後の弾(同じフレームの複数弾)は「死亡済み」(dealt 0・reason "dead")として数え、
 *   弾ごとにダメージを与える規則(上限なし・無敵なし・1つの弾は1回だけ)は変わりません。
 *   見た目: 当たった位置に赤い輪が広がって消え、効果音(標準のアクターのダメージ音)が鳴ります。HP は SOUL のHUDが毎フレーム読むので、そのまま減って見えます。
 *   既定では何も出しません(enable() を呼ぶまで無効)。通常のマップ戦闘・従来のSOUL・PREPARE・ATTACK・カード・マナには触れません。
 *
 * 【出すとき】SOUL戦闘が DEFENSE で、専用ステージ(ProjectRSoulStage)が戦闘エリアを映している間だけ。それ以外(ATTACK・PREPARE・ステージなし)では fire() は
 *   { ok:false, reason } を返し、何も出ません。DEFENSE に入るたびに DEV の弾幕を自動で始めるには enable({ pattern:"dev_fan" })。
 *
 * 【座標】戦闘エリアに対する割合で持ちます(単位 = 「幅」: x は 0〜1、y は 0〜9/16 = 0.5625。縦横とも同じ長さの単位)。
 *   描く位置は毎フレーム、いまのステージの表示(ProjectRSoulStage.getViewport の srcX/srcY/srcW)から計算するので、解像度やウィンドウの大きさが変わっても
 *   弾は戦闘エリアの同じ場所にあり、はみ出しません(弾は戦闘エリアの外へ完全に出たら消えます)。弾の見た目は Spriteset(ステージ座標)の上にあるので、
 *   ステージの拡大縮小にそのまま従います。
 *
 * 【持ち主】弾はすべて owner = "enemy"。マップの Event ではありません(プレイヤーの攻撃の Event とも、ProjectR_SoulBattleDodge の観測とも混ざりません)。
 *   片づけは ProjectR_SoulPhaseCleanup の registerCleaner(…, "enemy") に登録します。持ち主 "enemy" の片づけは DEFENSE が終わるとき(と SOUL の終了)だけです。
 *   ATTACK の終了では何も消しません(そもそも ATTACK / PREPARE の間は弾がありません)。念のため、DEFENSE 以外で弾が残っていたら毎フレーム片づけます。
 *
 * 【時間】1フレームに1回、Game_Map.update で進めます。$gameMap.eventsPaused の間は、弾の動きも警告の時計も進めません(再開すると続きから)。
 *
 * 【DEV の弾幕 dev_fan(扇 = spread)】敵の絵の胸(防御ターンの敵ハート)から扇状に弾を出します。出す前に、約1秒(60フレーム)、弾の進む線と出る位置を点滅で警告します。
 *   警告の向きはその瞬間のプレイヤーのハートへ(下向き30°〜150°に収めて)固定し(警告と実際の弾道は一致)、2回に分けて撃ちます(1回目で警告を残したまま2回目も警告)。
 *   弾と弾の間は避けられる隙間を空けています(扇の外側も空き)。敵のカットイン(右上。戦闘エリアの外)は警告の開始に出します(ProjectR_CutIn。失敗しても弾幕は続く)。
 *
 * 【B3: DEV の弾幕 dev_aimed(狙い撃ち)】1発ずつ、その瞬間のプレイヤーのハートへ向けて撃ちます(下向き30°〜150°に収める)。1発ごとに、警告の線(40フレーム)→弾、の順で、
 *   次の弾の警告は前の弾が出る前から始まります(shots 発・shotGap フレーム間隔)。警告の線は弾道そのもの(狙いは警告の開始で固定)なので、警告の間に線から外れれば当たりません。
 * 【B3: DEV の弾幕 dev_radial(放射波)】敵の胸の真下から、下向きの半円(arcDeg = 168°)へ放射状に弾を出します。波(waves = 3)ごとに弾の向きを半分ずらし(1波目の弾と弾の間を、2波目の弾が通る)、
 *   波ごとの警告(waveWarn = 34フレーム)を出してから撃ちます。隣り合う弾の向きは 14° 以上開いていて、出る位置から 0.28 幅以上離れた所では、ハートが余裕をもって通れる隙間があります。
 * 【B3: フェーズに合わせた選択】enableBoss() にすると、DEFENSE に入るたびに、そのときの ProjectRBossFramework のボスのフェーズ(getState().phaseIndex。読み取りだけ)に合う弾幕を1つ選びます。
 *   フェーズごとの「弾幕の表」は DEV の仮表(DEFAULT_PLAN。本番のボスの弾幕は仕様が決まってから registerPlan でボスごとに登録)。同じフェーズの中は DEFENSE ごとに表の順で巡回し、
 *   フェーズが変わると先頭へ戻ります。弾幕の途中でフェーズが変わっても、いまの弾幕はそのまま終え、次の DEFENSE から新しいフェーズの表になります(BossFramework のフェーズ移行ルールには触れません)。
 *   ボスが動いていないとき(BossFramework が無いとき)は第一形態の表を使います。1回の DEFENSE で自動で始める弾幕は1つだけです(二重に予約しません)。
 *   警告は、表から選ぶときは最低 MIN_WARN_FRAMES(24フレーム)出します。1回の DEFENSE で始める弾幕は1つなので、弾幕どうしは重なりません。
 *
 * 【B4: DEFENSE の長さに合わせた配分(pace)】ボスの弾幕(enableBoss)は、始めるとき DEFENSE の残りのフレーム数を見て、波・発の間隔(waveGap / shotGap)だけを元の値より広げ、
 *   最後の弾が戦闘エリアを出るまでが「残り − 余白(PACE.tailFrames = 24f = 0.4秒)」に収まる範囲でできるだけ広く(上限 PACE.maxFrames = 336f)配分します。
 *   弾の数・速さ・ダメージ・当たり判定・警告の長さ・向きは変えません。間隔を狭めることもしません(DEFENSE が短ければ元の間隔のまま = 従来どおり)。
 *   最後の弾が出てから出るまでの時間は最悪の向き(狙い撃ちは 30°〜150° のどれでも)で見積もるので、どんな狙いでも DEFENSE の終わる前に弾幕が終わります。
 *   準備ループ(DEFENSE 6秒 = 360f)では、弾幕が終わってから DEFENSE の終わりまでの空きは 1.7〜2.7秒 → 約 0.4〜1秒 になります。
 *   fire() / enable({pattern}) の単体の弾幕(既定)は従来の間隔のまま。enableBoss({ pace:false }) か、表の項目の options.pace:false で配分を切れます。
 *
 * API: ProjectRSoulEnemyBullets
 *   enable({ pattern, count, spreadDeg, speed, warnFrames, waves, waveGap, cutIn }) / disable() / isEnabled()   DEFENSE に入るたびの自動開始(既定は無効)
 *   enableBoss({ cutIn, pace }) / registerPlan(bossId, plan) / unregisterPlan(bossId) / getPlan(bossId) / pickPattern()   ボスのフェーズに合わせた自動開始(B3)    plan = { phases:[{ id, label, rotation:[{ pattern, options }] }] }
 *   setConfig({ collision, damage, hitRadiusScale, bulletHitScale, floorHp, feedback }) / getConfig()   当たり判定・ダメージの DEV 設定      getHits() 直近の被弾の記録
 *   fire(pattern?, options?) -> { ok, reason? }        いま DEFENSE なら弾幕を1つ始める(DEV / テスト用)
 *   clear(reason) -> 消した弾の数                       getBullets() / getTelegraphs() / getState() / getLog()
 *   rect() -> 戦闘エリア(ステージ座標・画面座標)      toScreen(bullet) -> 弾の画面座標    PATTERNS / UNIT
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const VERSION = "0.5.0";
    const ASPECT = 9 / 16;                                              // 戦闘エリアの高さ(幅 = 1)
    const BULLET_R = 0.011;                                             // 弾の半径(幅に対する割合。画面で 約 8.6px @ 784px 幅)
    // B4(DEV の暫定値・未承認): ボスの弾幕を DEFENSE の長さに合わせて配分する。最後の弾が戦闘エリアを出たあとの『安全な余白』と、配分に使う長さの上限(フレーム)
    const PACE = Object.freeze({ tailFrames: 24, maxFrames: 336 });
    const MIN_WARN_FRAMES = 24;                                         // 表(プラン)から選ぶ弾幕の警告の最短(0.4秒)。人が見て動ける長さ
    // DEV の弾幕。kind = fan(扇)/ aimed(狙い撃ち)/ radial(放射波)。speed = 幅/秒。本番のボスの弾幕は仕様が決まってから registerPlan で登録する(これは試作)。
    const PATTERNS = Object.freeze({
        dev_fan: Object.freeze({ kind: "fan", count: 7, spreadDeg: 90, speed: 0.3, warnFrames: 60, waves: 2, waveGap: 40, cutIn: true }),
        dev_aimed: Object.freeze({ kind: "aimed", shots: 3, shotGap: 36, speed: 0.42, warnFrames: 40, cutIn: true }),
        dev_radial: Object.freeze({ kind: "radial", count: 13, arcDeg: 168, speed: 0.34, warnFrames: 50, waves: 3, waveGap: 38, waveWarn: 34, cutIn: true })
    });
    // フェーズごとの DEV の仮表(フェーズ番号 0 = 第一形態)。同じフェーズの中は DEFENSE ごとに rotation を順に巡回し、フェーズが変わると先頭へ戻る。
    const deepFreeze = o => { if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); } return o; };
    const DEFAULT_PLAN = deepFreeze({
        phases: [
            { id: "phase1", label: "第一形態", rotation: [{ pattern: "dev_aimed" }] },
            { id: "phase2", label: "第二形態", rotation: [{ pattern: "dev_fan" }, { pattern: "dev_aimed", options: { shots: 4, shotGap: 30, speed: 0.46 } }] },
            { id: "phase3", label: "第三形態", rotation: [{ pattern: "dev_radial" }, { pattern: "dev_fan", options: { count: 9, spreadDeg: 110 } }, { pattern: "dev_aimed", options: { shots: 5, shotGap: 26, warnFrames: 34, speed: 0.5 } }] }
        ]
    });
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const num = (v, fallback) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const api = name => { try { const t = root[name]; return t && typeof t === "object" ? t : null; } catch (_error) { return null; } };
    const soul = () => api("ProjectRSoulBattle");
    const stage = () => api("ProjectRSoulStage");
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);

    const rt = {
        enabled: null,                                       // { pattern, ...options } / null = 無効
        cfg: { collision: true, damage: 25, hitRadiusScale: 0.5, bulletHitScale: 1, floorHp: 0, feedback: true },      // floorHp 0 = 本番(HP は 0 まで減る。D13 の敗北)。DEV の Sandbox だけが 1 を指定する
        hits: [], fx: [],
        bullets: [], telegraphs: [], runner: null, serial: 0, startPending: false, startWait: 0,
        defenseSerial: 0, autoStartedFor: -1,                // DEFENSE ごとの通し番号 / 自動で弾幕を始めた DEFENSE(1回の DEFENSE で自動に始めるのは1つだけ)
        plans: new Map([["default", DEFAULT_PLAN]]), rotation: { key: "", n: 0 }, lastPick: null, bossHook: null, bossPhaseEvents: [],
        layer: null, parentTilemap: null, bulletBitmap: null, lineBitmap: null, ringBitmap: null,
        stats: { hits: 0, hpLost: 0, hitsAtFloor: 0, hitsAfterDeath: 0, bossPhaseChanges: 0, duplicateSkipped: 0, picks: 0, patterns: 0, spawned: 0, removedBounds: 0, cleared: 0, clearReasons: {}, ticks: 0, pausedTicks: 0, rejected: 0, cutIns: 0, spriteErrors: 0, maxLive: 0 }
    };
    const log = [];
    const note = entry => { log.push(entry); if (log.length > 80) log.shift(); };

    // ---------------------------------------------------------------- 座標 ----------------------------------------------------------------
    // 戦闘エリア(ステージ座標 = Spriteset の座標・画面座標)。ステージが戦闘エリアを映していなければ null。
    const rect = () => {
        const s = stage();
        if (!s || !s.isActive || !s.isActive()) return null;
        const vp = safe(() => s.getViewport(), null);
        if (!vp || !(vp.srcW > 0) || !(vp.w > 0)) return null;
        // srcX / srcY / srcW は Spriteset(の Tilemap の子)の座標 = 拡大前の画面の座標。マップの表示位置(displayX)を足してはいけない(画面が広いとマップは中央に寄る)。
        return { x: vp.srcX, y: vp.srcY, w: vp.srcW, h: vp.srcH, screen: { x: vp.x, y: vp.y, w: vp.w, h: vp.h }, scale: vp.scale };
    };
    // 割合(幅単位)→ ステージ座標 / 画面座標
    const toStagePx = (r, nx, ny) => ({ x: r.x + nx * r.w, y: r.y + ny * r.w });
    const toScreenPx = (r, nx, ny) => ({ x: r.screen.x + nx * r.screen.w, y: r.screen.y + ny * r.screen.w });
    const fromScreen = (r, sx, sy) => ({ x: (sx - r.screen.x) / r.screen.w, y: (sy - r.screen.y) / r.screen.w });

    // ---------------------------------------------------------------- 見た目 ----------------------------------------------------------------
    const makeBitmap = (w, h, draw) => {
        const bitmap = new Bitmap(w, h);
        draw(bitmap.context, w, h);
        if (bitmap._baseTexture && typeof bitmap._baseTexture.update === "function") bitmap._baseTexture.update();
        return bitmap;
    };
    const ensureBitmaps = () => {
        if (!rt.bulletBitmap) rt.bulletBitmap = makeBitmap(32, 32, (c, w) => {            // 赤い弾(白い芯・暗い外周)
            const g = typeof c.createRadialGradient === "function" ? c.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2) : null;
            if (g && typeof g.addColorStop === "function") { g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, "#ff8a3d"); g.addColorStop(0.8, "#e0192e"); g.addColorStop(1, "rgba(120,0,20,0.0)"); c.fillStyle = g; } else c.fillStyle = "#e0192e";
            c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 1, 0, Math.PI * 2); c.fill();
        });
        if (!rt.lineBitmap) rt.lineBitmap = makeBitmap(64, 8, (c, w, h) => {                // 警告の線(根元が濃く、先が薄い)
            const g = typeof c.createLinearGradient === "function" ? c.createLinearGradient(0, 0, w, 0) : null;
            if (g && typeof g.addColorStop === "function") { g.addColorStop(0, "rgba(255,70,70,0.95)"); g.addColorStop(1, "rgba(255,70,70,0.25)"); c.fillStyle = g; } else c.fillStyle = "rgba(255,70,70,0.8)";
            c.fillRect(0, h / 2 - 2, w, 4);
        });
        if (!rt.ringBitmap) rt.ringBitmap = makeBitmap(64, 64, (c, w) => {                  // 出る位置の輪
            c.strokeStyle = "rgba(255,90,90,0.95)"; c.lineWidth = 4; c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 4, 0, Math.PI * 2); c.stroke();
        });
    };
    const layerFor = tilemap => {
        if (!tilemap) return null;
        if (!rt.layer) { rt.layer = new Sprite(); rt.layer._projectRSoulEnemyBullets = true; rt.layer.z = 6; }
        if (rt.layer.parent !== tilemap) tilemap.addChild(rt.layer);        // メニューから戻って Spriteset が作り直されても付け直す
        return rt.layer;
    };
    const newSprite = (bitmap, anchorX, anchorY) => { const s = new Sprite(bitmap); s.anchor.set(anchorX, anchorY); return s; };
    const destroySprite = s => { try { if (s.parent) s.parent.removeChild(s); } catch (_error) { /* 表示のみ */ } };

    // ---------------------------------------------------------------- 弾・警告 ----------------------------------------------------------------
    const spawn = (pattern, x, y, angle, speedPerFrame) => {
        const b = { id: ++rt.serial, owner: "enemy", pattern, x, y, px: x, py: y, vx: Math.cos(angle) * speedPerFrame, vy: Math.sin(angle) * speedPerFrame, r: BULLET_R, age: 0, sprite: null };
        rt.bullets.push(b); rt.stats.spawned++; rt.stats.maxLive = Math.max(rt.stats.maxLive, rt.bullets.length);
        return b;
    };
    const inside = b => b.x + b.r > 0 && b.x - b.r < 1 && b.y + b.r > 0 && b.y - b.r < ASPECT;      // 戦闘エリアに少しでも残っていれば true
    const removeBullet = (b, reason) => {
        const i = rt.bullets.indexOf(b); if (i >= 0) rt.bullets.splice(i, 1);
        if (b.sprite) { destroySprite(b.sprite); b.sprite = null; }
        if (reason === "bounds") rt.stats.removedBounds++;
    };
    const clear = reason => {
        let n = rt.bullets.length;
        for (const b of rt.bullets.slice()) removeBullet(b, "clear");
        for (const t of rt.telegraphs) { if (t.line) destroySprite(t.line); if (t.ring) destroySprite(t.ring); }
        const hadTele = rt.telegraphs.length;
        rt.telegraphs = [];
        for (const fx of rt.fx) destroySprite(fx.sprite);
        rt.fx = [];
        const hadRunner = !!rt.runner;
        rt.runner = null; rt.startPending = false;
        if (n || hadTele || hadRunner) { rt.stats.cleared += n; rt.stats.clearReasons[reason] = (rt.stats.clearReasons[reason] || 0) + 1; note({ type: "clear", reason, bullets: n, telegraphs: hadTele }); }
        return n;
    };

    // ---------------------------------------------------------------- 弾幕 dev_fan ----------------------------------------------------------------
    const playerNorm = r => {
        const s = stage(), h = s && safe(() => s.getPlayerHeart(), null);
        if (!h || !h.active) return null;
        return fromScreen(r, h.x, h.y);
    };
    const bossOrigin = r => {
        const s = stage(), h = s && safe(() => s.getHearts(), null);
        const bx = h && h.boss && Number.isFinite(h.boss.x) ? fromScreen(r, h.boss.x, h.boss.y).x : 0.5;
        return { x: clamp(bx, 0.1, 0.9), y: BULLET_R };                      // 出る位置 = 敵の絵の胸の真下の、戦闘エリアの上の縁
    };
    // 警告のグループ = 同時に出して同時に消す警告の線の組。from〜to フレームの間だけ出す。angles が null なら、開く瞬間のプレイヤーのハートへ狙う(狙い撃ち)。
    const aimAngle = origin => {
        const r = rect(), target = (r && playerNorm(r)) || { x: 0.5, y: ASPECT * 0.85 };
        const a = Math.atan2(target.y - origin.y, target.x - origin.x);
        return a > 0 ? clamp(a, Math.PI / 6, Math.PI * 5 / 6) : Math.PI / 2;   // 上の縁から出るので、扇の中心は必ず下向き(30°〜150°)
    };
    const openGroup = (run, g) => {
        if (g.made) return;
        g.made = true;
        if (!g.angles) g.angles = [aimAngle(run.origin)];                                   // 狙いは警告の開始で固定(警告と実際の弾道は一致)
        g.items = g.angles.map((a, i) => ({ id: ++rt.serial, index: i, angle: a, origin: { ...run.origin }, group: g, line: null, ring: null }));
        for (const t of g.items) rt.telegraphs.push(t);
    };
    const closeGroup = g => {
        if (!g.made || g.closed) return;
        g.closed = true;
        for (const t of g.items) { if (t.line) destroySprite(t.line); if (t.ring) destroySprite(t.ring); const i = rt.telegraphs.indexOf(t); if (i >= 0) rt.telegraphs.splice(i, 1); }
    };
    // ---- B4: DEFENSE の長さに合わせた配分 ----
    // 向き angle・速さ per(幅/フレーム)の弾が、出る位置から戦闘エリアを完全に出るまでのフレーム数(inside と同じ判定)
    const exitFrames = (origin, angle, per) => {
        let x = origin.x, y = origin.y; const vx = Math.cos(angle) * per, vy = Math.sin(angle) * per;
        for (let f = 1; f <= 4000; f++) { x += vx; y += vy; if (!(x + BULLET_R > 0 && x - BULLET_R < 1 && y + BULLET_R > 0 && y - BULLET_R < ASPECT)) return f; }
        return 4000;
    };
    // 配分に使えるフレーム数 = DEFENSE の残り − 余白(上限あり)。SOUL の DEFENSE でなければ null
    const paceBudget = () => { const left = safe(() => soul().getState().framesLeft, null); return Number.isFinite(left) ? Math.min(left - PACE.tailFrames, PACE.maxFrames) : null; };
    // 最後の弾が戦闘エリアを出るまでが予算に収まる範囲で、波・発の間隔(cfg.waveGap)を元の値より広げる(狭めない)。angles = 最悪の向きを含む、出しうる向きの一覧。
    const paceGap = (cfg, angles, origin) => {
        const per = cfg.speed / 60, budget = paceBudget(), info = { budget, maxExit: null, gapBefore: cfg.waveGap, gapAfter: cfg.waveGap };
        if (budget === null || cfg.waves < 2) return info;
        info.maxExit = Math.max(...angles.map(a => exitFrames(origin, a, per)));
        const fit = Math.floor((budget - info.maxExit - cfg.warnFrames) / (cfg.waves - 1));
        if (fit > cfg.waveGap) cfg.waveGap = clamp(fit, 1, 600);
        info.gapAfter = cfg.waveGap;
        return info;
    };
    const startPattern = (name, options = {}) => {
        const base = PATTERNS[name];
        if (!base) return { ok: false, reason: "unknownPattern" };
        const r = rect();
        if (!r) return { ok: false, reason: "stageInactive" };
        if (!soul() || !soul().isActive() || soul().getPhase() !== "defense") return { ok: false, reason: "notDefense" };
        if (rt.runner) return { ok: false, reason: "patternRunning" };
        const kind = base.kind, aimed = kind === "aimed";
        const cfg = {
            kind, count: Math.round(clamp(num(options.count, base.count === undefined ? 1 : base.count), 1, 31)),
            spreadDeg: clamp(num(options.spreadDeg, base.spreadDeg === undefined ? 0 : base.spreadDeg), 0, 180), arcDeg: clamp(num(options.arcDeg, base.arcDeg === undefined ? 0 : base.arcDeg), 0, 180),
            speed: clamp(num(options.speed, base.speed), 0.02, 3), warnFrames: Math.round(clamp(num(options.warnFrames, base.warnFrames), 1, 600)),
            waves: Math.round(aimed ? clamp(num(options.shots, base.shots), 1, 12) : clamp(num(options.waves, base.waves), 1, 8)),      // 狙い撃ちは「発数」が波の数
            waveGap: Math.round(clamp(num(aimed ? options.shotGap : options.waveGap, aimed ? base.shotGap : base.waveGap), 1, 600)),
            waveWarn: Math.round(clamp(num(options.waveWarn, base.waveWarn === undefined ? base.warnFrames : base.waveWarn), 1, 600)),
            cutIn: options.cutIn === undefined ? base.cutIn : options.cutIn === true, cutInGod: typeof options.cutInGod === "string" && options.cutInGod ? options.cutInGod : "apollo"
        };
        const origin = bossOrigin(r);
        const run = { name, kind, cfg, origin, age: 0, wavesFired: 0, volleys: [], groups: [] };
        const mkGroup = (from, to, angles) => { const g = { id: ++rt.serial, from, to, angles, made: false, closed: false, items: [] }; run.groups.push(g); return g; };
        if (kind === "fan") {
            const aim = aimAngle(origin), spread = cfg.spreadDeg * Math.PI / 180, angles = [];         // その瞬間のプレイヤーのハートへ。警告と弾道はこの角度で固定
            for (let i = 0; i < cfg.count; i++) angles.push(cfg.count === 1 ? aim : aim - spread / 2 + spread * i / (cfg.count - 1));
            if (options.pace === true) run.pace = paceGap(cfg, angles, origin);
            const last = cfg.warnFrames + (cfg.waves - 1) * cfg.waveGap, g = mkGroup(0, last, angles);   // 警告は最後の弾を撃つまで残す
            for (let w = 0; w < cfg.waves; w++) run.volleys.push({ at: cfg.warnFrames + w * cfg.waveGap, group: g, fired: false });
        } else if (aimed) {
            if (options.pace === true) { const sweep = []; for (let d = 30; d <= 150; d += 5) sweep.push(d * Math.PI / 180); run.pace = paceGap(cfg, sweep, origin); }      // 狙いは警告の開始で決まる(30°〜150°)ので、どの向きでも収まるよう最悪で見積もる
            for (let i = 0; i < cfg.waves; i++) { const from = i * cfg.waveGap, at = from + cfg.warnFrames, g = mkGroup(from, at, null); g.thick = 0.006; run.volleys.push({ at, group: g, fired: false }); }   // 単発の線は太く(幅の 0.6%。画面の1px前後では見えにくい)。1発ごとに警告 → 弾。狙いは警告の開始のハートの位置
        } else {                                                                                      // radial: 下向きの半円へ放射。波ごとに半分ずらし、波ごとの警告を出す
            const arc = cfg.arcDeg * Math.PI / 180, start = Math.PI / 2 - arc / 2, steps = Math.max(1, cfg.count - 1), step = arc / steps;
            if (options.pace === true) { const all = cfg.count === 1 ? [Math.PI / 2] : []; if (cfg.count > 1) { for (let i = 0; i < cfg.count; i++) all.push(start + step * i); for (let i = 0; i < cfg.count - 1; i++) all.push(start + step * (i + 0.5)); } run.pace = paceGap(cfg, all, origin); }
            for (let w = 0; w < cfg.waves; w++) {
                const at = cfg.warnFrames + w * cfg.waveGap, from = w === 0 ? 0 : Math.max(0, at - cfg.waveWarn), angles = [];
                if (cfg.count === 1) angles.push(Math.PI / 2);
                else if (w % 2 === 0) for (let i = 0; i < cfg.count; i++) angles.push(start + step * i);
                else for (let i = 0; i < cfg.count - 1; i++) angles.push(start + step * (i + 0.5));
                run.volleys.push({ at, group: mkGroup(from, at, angles), fired: false });
            }
        }
        rt.runner = run;
        for (const g of run.groups) if (g.from <= 0) openGroup(run, g);                                // 最初の警告はすぐ出す
        rt.stats.patterns++;
        if (cfg.cutIn) { const res = safe(() => api("ProjectRCutIn")?.show?.({ kind: "card", godId: cfg.cutInGod, owner: "enemy" }), null); if (res && res.ok) rt.stats.cutIns++; }
        const firstAngles = run.groups[0].angles || [];
        note({ type: "pattern", name, kind, count: kind === "radial" ? cfg.count : firstAngles.length, aim: firstAngles.length ? firstAngles[Math.floor(firstAngles.length / 2)] : null, frame: 0 });
        return { ok: true, name, kind, angles: firstAngles.slice(), origin: { ...origin }, config: { ...cfg } };
    };
    const stepPattern = () => {
        const run = rt.runner; if (!run) return;
        run.age++;
        for (const g of run.groups) if (!g.made && run.age >= g.from) openGroup(run, g);                // 警告を出し始める(狙い撃ちは、この瞬間のハートへ)
        const per = run.cfg.speed / 60;
        for (const v of run.volleys) {
            if (v.fired || run.age < v.at) continue;
            v.fired = true;
            openGroup(run, v.group);
            for (const a of v.group.angles) spawn(run.name, run.origin.x, run.origin.y, a, per);
            run.wavesFired++;
            note({ type: "wave", wave: run.wavesFired, frame: run.age, bullets: v.group.angles.length });
        }
        for (const g of run.groups) if (g.made && !g.closed && run.age >= g.to) closeGroup(g);          // 撃ったら、その警告は消す
        if (run.wavesFired >= run.volleys.length && !rt.bullets.length) { rt.runner = null; note({ type: "patternDone", frame: run.age }); }
    };

    // ---------------------------------------------------------------- ボスのフェーズに合わせた選択(B3) ----------------------------------------------------------------
    // ProjectRBossFramework は読み取りだけ(getState / onPhase)。フェーズの移行・HP・勝敗には一切触れない。
    const bossFramework = () => api("ProjectRBossFramework");
    const bossInfo = () => {
        const st = safe(() => bossFramework()?.getState?.(), null);
        if (!st || typeof st !== "object") return null;
        return { bossId: String(st.bossId || ""), phaseIndex: Math.max(0, Math.floor(num(st.phaseIndex, 0))), phaseId: String(st.phase && st.phase.id || "") };
    };
    const ensureBossHook = () => {
        if (rt.bossHook) return;
        const bf = bossFramework();
        if (!bf || typeof bf.onPhase !== "function") return;
        const off = bf.onPhase(p => {
            rt.stats.bossPhaseChanges++;
            rt.bossPhaseEvents.push({ bossId: p && p.bossId, from: p && p.from, to: p && p.to, phaseId: p && p.phase && p.phase.id, runnerActive: !!rt.runner, defenseSerial: rt.defenseSerial });
            if (rt.bossPhaseEvents.length > 20) rt.bossPhaseEvents.shift();
            note({ type: "bossPhase", from: p && p.from, to: p && p.to });                      // 記録だけ。いまの弾幕は変えない(次の DEFENSE から新しいフェーズの表)
        });
        rt.bossHook = typeof off === "function" ? off : () => {};
    };
    const normalizePlan = plan => {
        if (!plan || !Array.isArray(plan.phases) || !plan.phases.length) return null;
        const phases = [];
        for (const p of plan.phases) {
            if (!p || !Array.isArray(p.rotation) || !p.rotation.length) return null;
            const rotation = [];
            for (const e of p.rotation) { if (!e || !PATTERNS[e.pattern]) return null; rotation.push({ pattern: String(e.pattern), options: e.options && typeof e.options === "object" ? { ...e.options } : {} }); }
            phases.push({ id: String(p.id || ""), label: String(p.label || p.id || ""), rotation });
        }
        return deepFreeze({ phases });
    };
    // いまのボスのフェーズに合う弾幕を表から1つ選ぶ(advance=false なら巡回を進めない)。ボスが動いていなければ第一形態の表。
    const pickPattern = (advance = true) => {
        const info = bossInfo(), bossId = info ? info.bossId : "";
        const plan = rt.plans.get(bossId) || rt.plans.get("default");
        const idx = clamp(info ? info.phaseIndex : 0, 0, plan.phases.length - 1), phase = plan.phases[idx];
        const key = bossId + ":" + idx, n = rt.rotation.key === key ? rt.rotation.n : 0, entryIndex = n % phase.rotation.length, entry = phase.rotation[entryIndex];
        if (advance) rt.rotation = { key, n: n + 1 };
        const base = PATTERNS[entry.pattern], options = Object.assign({}, entry.options);
        options.warnFrames = Math.max(MIN_WARN_FRAMES, num(options.warnFrames, base.warnFrames));      // 警告は最低 0.4 秒(人が見て動ける長さ)
        if (base.waveWarn !== undefined || options.waveWarn !== undefined) options.waveWarn = Math.max(MIN_WARN_FRAMES, num(options.waveWarn, base.waveWarn));
        return { pattern: entry.pattern, options, bossId, bossActive: !!info, bossPhaseIndex: info ? info.phaseIndex : null, phaseIndex: idx, phaseId: phase.id, entryIndex, rotationKey: key };
    };
    // DEFENSE の最初に1回だけ(同じ DEFENSE で2つ目を予約しない)。
    const autoStart = () => {
        const en = rt.enabled; if (!en) return null;
        if (rt.defenseSerial > 0 && rt.autoStartedFor === rt.defenseSerial) { rt.stats.duplicateSkipped++; return null; }
        let res;
        if (en.mode === "boss") {
            ensureBossHook();
            const pick = pickPattern(false), options = Object.assign({}, pick.options);
            if (en.cutIn !== undefined) options.cutIn = en.cutIn === true;
            options.pace = en.pace === false ? false : options.pace !== false;              // DEFENSE の長さに合わせた配分(B4)。切るには enableBoss({ pace:false }) か項目の options.pace:false
            res = startPattern(pick.pattern, options);
            if (res.ok) { rt.rotation = { key: pick.rotationKey, n: pick.entryIndex + 1 }; rt.lastPick = { ...pick, options: { ...pick.options }, defenseSerial: rt.defenseSerial }; rt.stats.picks++; }
        } else res = startPattern(en.pattern, en);
        if (res && res.ok) rt.autoStartedFor = rt.defenseSerial;
        return res;
    };

    // ---------------------------------------------------------------- 当たり判定・ダメージ(I4-B2) ----------------------------------------------------------------
    const HEART_VISUAL_R = 0.014;                                        // ステージのハートの見た目の半径(幅に対する割合。ProjectR_SoulBattleStage の heartRadiusOf と同じ)
    // プレイヤーのハート(マウスで動く本物)の位置と当たり円(幅単位)。防御ターンでなければ null。
    const heartCircle = r => {
        const s = stage(), h = s && safe(() => s.getPlayerHeart(), null);
        if (!h || !h.active) return null;
        const p = fromScreen(r, h.x, h.y), visual = Number.isFinite(h.radius) && h.radius > 0 ? h.radius / r.screen.w : HEART_VISUAL_R;
        return { x: p.x, y: p.y, visualR: visual, r: visual * rt.cfg.hitRadiusScale };
    };
    // 線分(ax,ay)-(bx,by)と点(px,py)の最短距離
    const segDist = (ax, ay, bx, by, px, py) => {
        const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
        const t = len2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
        return Math.hypot(ax + dx * t - px, ay + dy * t - py);
    };
    const leader = () => safe(() => $gameParty.leader(), null);
    // 既存のプレイヤーHPの窓口(Hendrix UpdatePlayerHp。DamageModifiers の被ダメージ倍率が掛かる)で1回だけ減らす。HP は floorHp 未満にならない(敗北の経路は作らない)。
    const applyDamage = () => {
        const actor = leader();
        if (!actor) return { dealt: 0, reason: "noActor", before: 0, after: 0 };
        const before = actor.hp, floor = Math.max(0, Math.floor(num(rt.cfg.floorHp, 0))), requested = Math.max(0, num(rt.cfg.damage, 0));
        if (floor === 0 && (before <= 0 || safe(() => actor.isDead(), false))) return { dealt: 0, requested, before, after: actor.hp, reason: "dead" };      // すでに倒れている(同じフレームの後続の弾): 弾は数えるが、減らすHPは無い
        let amount = requested;
        const room = Math.max(0, before - floor);
        if (floor > 0) {                                                       // DEV の下限: 倍率が掛かっても下限を割らないよう、先に抑える
            const factor = Math.max(1e-6, num(safe(() => api("ProjectRDamageModifiers")?.factorFor?.("player", "damageTaken")?.factor, 1), 1));
            amount = Math.min(amount, Math.floor(room / factor));
        }
        if (amount >= 1) {
            const interpreter = new Game_Interpreter(); interpreter._eventId = 0;
            PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdatePlayerHp", { target: "player", value: "-" + amount });
        }
        if (floor > 0 && actor.hp < floor) actor.setHp(floor);             // DEV の下限: 被ダメージ倍率などで下回ったときの最後の安全弁(戦闘不能にしない)
        return { dealt: before - actor.hp, requested, before, after: actor.hp, reason: amount >= 1 ? "ok" : (requested > 0 && room <= 0 ? "atFloor" : "zeroDamage") };
    };
    const addFeedback = (r, nx, ny) => {
        if (!rt.cfg.feedback) return;
        try {
            const tilemap = SceneManager._scene && SceneManager._scene._spriteset ? SceneManager._scene._spriteset._tilemap : null;
            ensureBitmaps(); const layer = layerFor(tilemap); if (!layer) return;
            const sprite = newSprite(rt.ringBitmap, 0.5, 0.5); layer.addChild(sprite);
            rt.fx.push({ sprite, x: nx, y: ny, age: 0, life: 24 });
            safe(() => SoundManager.playActorDamage());
        } catch (error) { rt.stats.spriteErrors++; }
    };
    const stepFeedback = r => {
        for (const fx of rt.fx.slice()) {
            fx.age++;
            if (fx.age > fx.life) { destroySprite(fx.sprite); rt.fx.splice(rt.fx.indexOf(fx), 1); continue; }
            const t = fx.age / fx.life, p = toStagePx(r, fx.x, fx.y);
            fx.sprite.x = Math.round(p.x); fx.sprite.y = Math.round(p.y);
            const k = (0.03 + 0.07 * t) * r.w / 64; fx.sprite.scale.set(k, k); fx.sprite.alpha = 1 - t;
        }
    };
    const checkCollisions = r => {
        if (!rt.cfg.collision || !rt.bullets.length) return;
        const heart = heartCircle(r);
        if (!heart) return;
        for (const b of rt.bullets.slice()) {
            const reach = b.r * rt.cfg.bulletHitScale + heart.r;
            if (segDist(b.px, b.py, b.x, b.y, heart.x, heart.y) > reach) continue;
            removeBullet(b, "hit");                                            // この弾は二度と当たらない(重複ダメージなし。別の弾は別々に当たる)
            const res = applyDamage();
            rt.stats.hits++; rt.stats.hpLost += res.dealt; if (res.reason === "atFloor") rt.stats.hitsAtFloor++; if (res.reason === "dead") rt.stats.hitsAfterDeath++;
            const frame = rt.runner ? rt.runner.age : rt.stats.ticks;
            rt.hits.push({ bulletId: b.id, frame, x: b.x, y: b.y, dealt: res.dealt, before: res.before, after: res.after, reason: res.reason }); if (rt.hits.length > 60) rt.hits.shift();
            addFeedback(r, heart.x, heart.y);
            note({ type: "hit", bullet: b.id, dealt: res.dealt, hp: res.after });
        }
    };

    // ---------------------------------------------------------------- 毎フレーム ----------------------------------------------------------------
    const syncSprites = () => {
        const r = rect(); if (!r) return;
        const scene = typeof SceneManager !== "undefined" ? SceneManager._scene : null;
        const tilemap = scene && scene._spriteset ? scene._spriteset._tilemap : null;
        if (!tilemap) return;
        try {
            ensureBitmaps();
            const layer = layerFor(tilemap); if (!layer) return;
            const pulse = 0.55 + 0.45 * Math.sin((rt.runner ? rt.runner.age : 0) * 0.5);
            for (const b of rt.bullets) {
                if (!b.sprite) { b.sprite = newSprite(rt.bulletBitmap, 0.5, 0.5); layer.addChild(b.sprite); }
                const p = toStagePx(r, b.x, b.y);
                b.sprite.x = Math.round(p.x); b.sprite.y = Math.round(p.y);
                const k = (b.r * 2 * r.w) / 32; b.sprite.scale.set(k, k);
            }
            for (const t of rt.telegraphs) {
                if (!t.line) { t.line = newSprite(rt.lineBitmap, 0, 0.5); t.ring = newSprite(rt.ringBitmap, 0.5, 0.5); layer.addChild(t.line); layer.addChild(t.ring); }
                const p = toStagePx(r, t.origin.x, t.origin.y);
                // 線の長さ = 出る位置から戦闘エリアの端まで(弾道と同じ向き)
                const dx = Math.cos(t.angle), dy = Math.sin(t.angle);
                let len = Infinity;
                if (dx > 1e-6) len = Math.min(len, (1 - t.origin.x) / dx); else if (dx < -1e-6) len = Math.min(len, (0 - t.origin.x) / dx);
                if (dy > 1e-6) len = Math.min(len, (ASPECT - t.origin.y) / dy); else if (dy < -1e-6) len = Math.min(len, (0 - t.origin.y) / dy);
                len = Number.isFinite(len) ? Math.max(0, len) : 0;
                t.line.x = Math.round(p.x); t.line.y = Math.round(p.y); t.line.rotation = t.angle; t.line.scale.set((len * r.w) / 64, t.group && t.group.thick ? (t.group.thick * r.w) / 4 : 1); t.line.alpha = 0.35 + 0.65 * pulse;
                t.ring.x = Math.round(p.x); t.ring.y = Math.round(p.y); const rk = (0.05 * r.w) / 64; t.ring.scale.set(rk, rk); t.ring.alpha = pulse;
            }
        } catch (error) { rt.stats.spriteErrors++; note({ type: "spriteError", message: String(error && error.message || error) }); }
    };
    const tick = () => {
        const s = soul(), defending = !!s && s.isActive() && s.getPhase() === "defense";
        if (!defending) { if (rt.bullets.length || rt.telegraphs.length || rt.runner) clear("outsideDefense"); rt.startPending = false; return; }
        if (!rect()) { if (rt.bullets.length || rt.runner) clear("stageGone"); return; }
        const m = map();
        if (m && m.eventsPaused) { rt.stats.pausedTicks++; syncSprites(); return; }          // 一時停止中は何も進めない(再開すると続きから)
        rt.stats.ticks++;
        if (rt.startPending && rt.enabled) {                                           // ステージのハートが防御の位置になってから(2〜5フレーム待つ)
            rt.startWait++;
            const ready = rt.startWait >= (playerNorm(rect()) ? 2 : 5);                  // ハートが防御の位置にあれば2フレーム後(ハートがマウスに追いつくのを待つ)、無ければ5フレーム後
            if (ready) { rt.startPending = false; rt.startWait = 0; autoStart(); }
        }
        stepPattern();
        for (const b of rt.bullets.slice()) {
            b.px = b.x; b.py = b.y; b.x += b.vx; b.y += b.vy; b.age++;
            if (!inside(b)) removeBullet(b, "bounds");
        }
        { const r = rect(); if (r) { checkCollisions(r); stepFeedback(r); } }
        if (rt.runner && rt.runner.wavesFired >= rt.runner.volleys.length && !rt.bullets.length) { rt.runner = null; note({ type: "patternDone" }); }
        syncSprites();
    };
    if (typeof Game_Map !== "undefined") {
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            _update.apply(this, arguments);
            if (sceneActive) { try { tick(); } catch (error) { note({ type: "tickError", message: String(error && error.message || error) }); clear("error"); } }
        };
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clear("mapSetup"); return _setup.apply(this, arguments); };
    }

    // ---------------------------------------------------------------- フェーズ・片づけ ----------------------------------------------------------------
    if (soul() && soul().onPhase) {
        soul().onPhase(event => {
            if (!event) return;
            if (event.from === "defense") clear(`phase:${event.from}>${event.to}`);
            if (event.to === "defense") { rt.defenseSerial++; if (rt.enabled) rt.startPending = true; }      // ステージのハートの位置が整う次のフレームで始める(DEFENSE ごとに通し番号)
        });
        soul().onEnd(() => { clear("soulEnd"); rt.startPending = false; rt.defenseSerial = 0; rt.autoStartedFor = -1; rt.rotation = { key: "", n: 0 }; rt.lastPick = null; });
    }
    const cleanup = api("ProjectRSoulPhaseCleanup");
    if (cleanup && typeof cleanup.registerCleaner === "function") cleanup.registerCleaner("soulEnemyBullets", reason => clear("cleanup:" + reason), "enemy");

    root.ProjectRSoulEnemyBullets = Object.freeze({
        VERSION, UNIT: Object.freeze({ width: 1, height: ASPECT, bulletRadius: BULLET_R }), PATTERNS, DEFAULT_PLAN, MIN_WARN_FRAMES, PACE,
        enable: options => {
            const o = options && typeof options === "object" ? options : {};
            const pattern = o.pattern === undefined ? "dev_fan" : String(o.pattern);
            if (!PATTERNS[pattern]) return { ok: false, reason: "unknownPattern" };
            rt.enabled = Object.assign({}, o, { pattern, mode: "fixed" });
            if (soul() && soul().isActive() && soul().getPhase() === "defense" && !rt.runner) { if (rt.defenseSerial === 0) rt.defenseSerial = 1; if (rt.autoStartedFor !== rt.defenseSerial) rt.startPending = true; }
            return { ok: true, pattern };
        },
        // B3: ボスのフェーズ(ProjectRBossFramework の phaseIndex)に合う弾幕を、DEFENSE ごとに表から1つ選んで始める。cutIn: false で右上のカットインを出さない。
        enableBoss: options => {
            const o = options && typeof options === "object" ? options : {};
            rt.enabled = Object.assign({}, o, { mode: "boss" });
            ensureBossHook();
            if (soul() && soul().isActive() && soul().getPhase() === "defense" && !rt.runner) { if (rt.defenseSerial === 0) rt.defenseSerial = 1; if (rt.autoStartedFor !== rt.defenseSerial) rt.startPending = true; }
            return { ok: true, mode: "boss" };
        },
        registerPlan: (bossId, plan) => {
            const id = typeof bossId === "string" ? bossId : "";
            if (!id) return { ok: false, reason: "invalidBossId" };
            const normalized = normalizePlan(plan);
            if (!normalized) return { ok: false, reason: "invalidPlan" };
            rt.plans.set(id, normalized); rt.rotation = { key: "", n: 0 };
            return { ok: true, bossId: id, phases: normalized.phases.length };
        },
        unregisterPlan: bossId => { if (bossId === "default") { rt.plans.set("default", DEFAULT_PLAN); rt.rotation = { key: "", n: 0 }; return true; } rt.rotation = { key: "", n: 0 }; return rt.plans.delete(bossId); },
        getPlan: bossId => { const p = rt.plans.get(typeof bossId === "string" && bossId ? bossId : "default"); return p ? JSON.parse(JSON.stringify(p)) : null; },
        pickPattern: () => pickPattern(false),
        disable: () => { rt.enabled = null; rt.startPending = false; return true; },
        isEnabled: () => !!rt.enabled,
        fire: (pattern, options) => { const res = startPattern(pattern === undefined ? "dev_fan" : String(pattern), options || {}); if (!res.ok) rt.stats.rejected++; return res; },
        clear,
        setConfig: o => {
            const c = o && typeof o === "object" ? o : {};
            if (c.collision !== undefined) rt.cfg.collision = c.collision === true;
            if (c.feedback !== undefined) rt.cfg.feedback = c.feedback === true;
            if (c.damage !== undefined) rt.cfg.damage = clamp(num(c.damage, rt.cfg.damage), 0, 100000);
            if (c.hitRadiusScale !== undefined) rt.cfg.hitRadiusScale = clamp(num(c.hitRadiusScale, rt.cfg.hitRadiusScale), 0.05, 4);
            if (c.bulletHitScale !== undefined) rt.cfg.bulletHitScale = clamp(num(c.bulletHitScale, rt.cfg.bulletHitScale), 0.05, 4);
            if (c.floorHp !== undefined) rt.cfg.floorHp = clamp(Math.floor(num(c.floorHp, rt.cfg.floorHp)), 0, 100000);
            return { ...rt.cfg };
        },
        // DEV / テスト用: 1発だけ指定の位置・速度(幅単位 / フレーム)で出す。DEFENSE でステージが映っているときだけ。弾幕(runner)は動かさない。
        devSpawn: o => {
            const c = o && typeof o === "object" ? o : {};
            if (!rect()) return { ok: false, reason: "stageInactive" };
            if (!soul() || !soul().isActive() || soul().getPhase() !== "defense") return { ok: false, reason: "notDefense" };
            const b = spawn("dev", num(c.x, 0.5), num(c.y, 0.1), 0, 0);
            b.px = b.x; b.py = b.y; b.vx = num(c.vx, 0); b.vy = num(c.vy, 0); if (c.r !== undefined) b.r = clamp(num(c.r, b.r), 0.002, 0.1);
            return { ok: true, id: b.id };
        },
        getConfig: () => ({ ...rt.cfg }),
        getHits: () => rt.hits.map(h => ({ ...h })),
        getHeartCircle: () => { const r = rect(); return r ? heartCircle(r) : null; },
        getFeedback: () => rt.fx.map(f => ({ x: f.x, y: f.y, age: f.age, life: f.life })),
        rect,
        toScreen: b => { const r = rect(); return r ? toScreenPx(r, b.x, b.y) : null; },
        getBullets: () => rt.bullets.map(b => ({ id: b.id, owner: b.owner, pattern: b.pattern, x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, age: b.age, hasSprite: !!b.sprite })),
        getTelegraphs: () => rt.telegraphs.map(t => ({ id: t.id, index: t.index, angle: t.angle, origin: { ...t.origin }, hasSprite: !!t.line, pattern: rt.runner ? rt.runner.name : null, fireIn: rt.runner ? Math.max(0, t.group.to - rt.runner.age) : null, speed: rt.runner ? rt.runner.cfg.speed / 60 : null })),
        getState: () => ({ enabled: !!rt.enabled, mode: rt.enabled ? (rt.enabled.mode || "fixed") : null, defenseSerial: rt.defenseSerial, autoStartedFor: rt.autoStartedFor, lastPick: rt.lastPick ? JSON.parse(JSON.stringify(rt.lastPick)) : null, bossPhaseEvents: rt.bossPhaseEvents.map(e => ({ ...e })), live: rt.bullets.length, telegraphs: rt.telegraphs.length, running: !!rt.runner, runner: rt.runner ? { name: rt.runner.name, kind: rt.runner.kind, age: rt.runner.age, wavesFired: rt.runner.wavesFired, waves: rt.runner.cfg.waves, waveGap: rt.runner.cfg.waveGap, pace: rt.runner.pace ? { ...rt.runner.pace } : null } : null, stats: { ...rt.stats, clearReasons: { ...rt.stats.clearReasons } } }),
        getLog: () => log.map(e => ({ ...e }))
    });
})();
