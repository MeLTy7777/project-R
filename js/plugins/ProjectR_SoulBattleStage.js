/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘 I4-A 専用ステージ。SOUL戦闘の舞台(専用マップ6)へ移動し、厳密な16:9の戦闘エリア・プレイヤー非表示・防御ターンのマウス操作ハートを提供します。
 * @author ProjectR
 * @base ProjectR_SoulBattle
 * @orderAfter ProjectR_SoulBattle
 * @orderAfter ProjectR_SoulBattleSandbox
 *
 * @help
 * ProjectR_SoulBattleStage.js
 *
 * 探索マップを暗くする代わりに、SOUL戦闘専用のステージ(data/Map006.json = 何も置かれていない空のマップ)へ移動して戦います。
 * 戦闘そのもの(カード・当たり判定・回避AI・BossFramework・デッキ)は一切変えません。このプラグインは「どこで戦うか」と「どう映すか」だけを持ちます。
 *
 * 状態(実行時だけ。セーブしません): idle → entering(移動待ち) → active(戦闘中) → leaving(戻り待ち) → idle
 *   ・enter(): 今のマップ・座標・向きを記録してステージへ移動します。leave(): 記録した場所へ戻ります(何度呼んでも1回だけ)。
 *   ・戻る前にマップが変わった・移動が終わらない・表示で例外が出た、のどれでも、1回だけ片づけて元へ戻ります。
 *   ・ステージにいる間(entering/active/leaving)は、セーブを禁止します(Game_System.isSaveEnabled)。
 *
 * 映し方(active と leaving の間だけ):
 *   ・戦闘エリア = 画面の中の「厳密な16:9」の長方形。縦横比を保って拡大縮小し、引き伸ばしません(computeViewport)。
 *     上のボス/状態パネルと下の手札/HPパネル(ProjectR_SoulBattleHUD)の間に置き、HUDは戦闘エリアの外に出ます。
 *   ・マウス座標: Graphics.pageToCanvasX/Y を包み、画面座標を「ステージ(マップ)座標」へ変換します。照準・カード・剣・銃は何も変えずに正しく狙えます。
 *     解像度が変わっても、変換は毎回その時の画面サイズから計算します。
 *   ・戦闘エリアは画面の左右中央・やや小さめ(上のHUDとの間隔を広めに)。入れ子の小さな「バトルボックス」は無く、遊べる範囲 = 戦闘エリアそのもの
 *     (防御ターンのハートの範囲・マウスの範囲・当たり判定の座標は、攻撃/防御の両フェーズで同一)。
 *   ・戦闘エリアの上(上のHUDパネルとの間)に「敵」の絵を中央に出します(攻撃・防御の両ターン。SOULボスは専用の絵を持たないので、既存の素材 img/enemies/Highking.png を仮に当てています。
 *     ProjectRSoulStage.setEnemyLook({ folder, name }) / start("a16", { enemyImage }) で差し替え可)。敵のぶん戦闘エリアは小さくなりました(1920x1080で784x441)。
 *   ・戦闘エリアのすぐ下に「キャラ」(先頭アクターの待機グラフィック)、その下に「神」(選ばれている神の表示Eventの画像)を縦に並べます(攻撃ターンだけ。
 *     防御ターンは絵だけ隠して置き場は空けたまま。戦闘エリア・手札・HUDの位置は両フェーズで同じ)。戦闘エリアの外は隠さないので、下から出る攻撃も見えます。
 *   ・見えないプレイヤーはキャラの置き場の中心に立ちます(マップの内側・戦闘エリアの外)。銃などプレイヤー起点の攻撃は、そのままキャラの置き場から出ます。
 *   ・プレイヤーの見た目(キャラ・影・名前表示・持っている武器・ProjectR_CutIn が重ねる複製)と、マップ上の神の表示Eventの絵は描きません。プレイヤーの座標・向きは本物のままです。
 *
 * 攻撃の起点(専用ステージの間だけ。ダメージ・Cooldown・カードの規則は変えません):
 *   ・近接(通常の剣・剣カード・奥義・薙ぎ払い・一閃): 起点 = マウスカーソル(遊べる範囲へ収めた点)。ホーミングで敵ハートの方向へ向く。必中ではない
 *     (ProjectR_SoulBattleMelee)。プレイヤーは動かない。
 *   ・遠距離の神のカード(黄金の連矢・エロスの矢・ギガース殺し・疫病の雨): 選ばれている神のカードだけ、神の置き場から出る(GOD_PROJECTILE_CARDS)。
 *     選ばれていない神のカードや銃は、キャラの置き場から出る。
 *   ・カメラは固定します(Game_Map.setDisplayPos)。
 *
 * ボスの絵・ハート・カットイン(見せ方の仕上げ。判定・ダメージ・カードの規則は変えない):
 *   ・ボス名のパネルは無い(HUD)。ボスの絵は戦闘エリアの上に大きく出す(置き場 ENEMY = 600x190、画面の上端から戦闘エリアの手前まで)。戦闘エリアの位置・大きさは変えない。
 *   ・ハートは1人1つ。攻撃ターン: プレイヤーのハート = キャラの絵の胸(飾り) / 敵ハート = 戦闘エリアの中の本物(Event。狙われる的)。
 *     防御ターン: 敵ハート = 敵の絵の胸(飾り。本物の絵はこの間だけ隠す。Event・HP・当たり判定は消さない) / プレイヤーのハート = マウスで動く。胸の位置は CHEST_N(絵の中の割合)。
 *   ・カットイン(ProjectR_CutIn): 味方 = 左上 / 敵 = 右上。戦闘エリアの外(getCutInRects)。ステージを映している間だけ(ステージ以外は従来の位置)。
 *   ・API: getHearts() / getCutInRects() / getSpritesetFrame()
 *
 * 防御ターンのプレイヤーのハート(ProjectRSoulBattle のフェーズ = defense):
 *   ・マウスで戦闘エリアの中を動かします。カーソルが戦闘エリアの外に出ても、ハートは縁に張り付きます(はみ出しません)。
 *   ・見た目と位置だけです。敵の弾幕・ダメージ・当たり判定は未実装(後続フェーズ)です。
 *
 * 公開API(Console / F8):
 *   ProjectRSoulStage.enter() / leave(reason) / getState()    移動と状態(診断)
 *   ProjectRSoulStage.isActive() / isPresenting()              ステージで戦闘中か / 映し方を適用中か
 *   ProjectRSoulStage.layout()                                  プレイヤーと敵ハートの置き場所(タイル座標)
 *   ProjectRSoulStage.getViewport() / getBattleBox()           戦闘エリア・バトルボックスの画面座標
 *   ProjectRSoulStage.toStage(x, y) / toScreen(x, y)           マウス座標の変換
 *   ProjectRSoulStage.getPlayerHeart()                          防御ターンのハートの位置(読み取り専用)
 *
 * 注意: data/Map006.json は「実行時専用のステージ」です。イベントや出入口を置かないでください(MapInfosには DEV_SoulBattleStage として登録済み)。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const VERSION = "0.1.0";
    const STAGE_MAP_ID = 6;
    const REF_W = 1920, REF_H = 1080;                    // HUD(ProjectR_SoulBattleHUD)と同じ基準座標
    // 基準座標。上のパネル(〜98)の下に「敵」の置き場(ENEMY)、その下から BAND_BOTTOM までが戦闘エリアの帯。戦闘エリアの下に「キャラ」「神」の置き場(REP)を縦に並べ、手札(884〜)の上に収める。
    // 戦闘エリアの位置と大きさは、攻撃ターンでも防御ターンでも同じ(置き場も、防御ターンは空けておくだけ。敵は両フェーズとも出す)。
    const ENEMY = Object.freeze({ w: 600, y: 8, h: 190 });           // 敵の置き場(戦闘エリアの上。画面の左右中央)。ボス名のパネルを無くしたので、画面の上端から戦闘エリアの手前まで大きく使う(戦闘エリアの位置・大きさは変えない)
    // 胸の位置(絵の中の割合。ハートを重ねる所)。キャラ = 歩行グラフィックの1コマ(頭〜足)の胸、敵 = 敵の絵の胸。敵の絵ごとに changeLook({ chest }) で上書きできる。
    const CHEST_N = Object.freeze({ char: Object.freeze({ x: 0.5, y: 0.55 }), enemy: Object.freeze({ x: 0.5, y: 0.5 }) });
    // カットイン(ProjectR_CutIn)の置き場: 味方 = 左上 / 敵 = 右上。戦闘エリアの外。基準座標(1920x1080)。上の状態チップ(〜98)の下から。
    const CUTIN = Object.freeze({ w: 380, y: 112, margin: 24, ratio: 0.27 });
    const BAND_TOP = 204, BAND_BOTTOM = 650;                       // 敵の置き場(〜196)の下から。戦闘エリアは(敵のぶん)小さくなる
    const REP = Object.freeze({ w: 220, char: Object.freeze({ y: 656, h: 106 }), god: Object.freeze({ y: 768, h: 106 }) });
    // 敵の絵(SOULボスは専用の絵を持たないので、既存の素材を仮に当てる。setEnemyLook で差し替え可)。img/<folder>/<name>.png
    const DEFAULT_ENEMY_LOOK = Object.freeze({ folder: "enemies", name: "Highking" });
    const TILE = 48;
    const BOX_N = Object.freeze({ x: 0, y: 0, w: 1, h: 1 });         // 防御ターンのハートが動ける範囲(戦闘エリアに対する割合)。入れ子の小さな箱は無く、戦闘エリアの全体
    const HEART_N = Object.freeze({ x: 0.5, y: 0.36 });                 // 敵ハートの初期位置(ステージ領域に対する割合)
    const ENTER_TIMEOUT = 900, LEAVE_TIMEOUT = 900;      // 移動が終わらないときに諦めるフレーム数
    const COLORS = Object.freeze({ backdrop: "#08101f", backdrop2: "#13224a", grid: "rgba(89,215,255,0.11)", edge: "#59d7ff", boxEdge: "#e0475a", heart: "#59d7ff", heartCore: "#d8f6ff", bossHeart: "#ff3355", bossHeartCore: "#ffd0d8" });

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const num = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
    const api = name => { try { const t = root[name]; return t && typeof t === "object" ? t : null; } catch (error) { return null; } };
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (error) { return fallback; } };

    // ---------------------------------------------------------------- 純粋な計算(画面サイズだけから決まる) ----------------------------------------------------------------
    // 戦闘エリア(画面上の厳密な16:9)と、それに映すステージ領域(マップ座標の厳密な16:9)。拡大縮小は縦横同じ倍率(引き伸ばさない)。
    const computeViewport = (gw, gh) => {
        gw = Math.max(16, Math.floor(num(gw, REF_W))); gh = Math.max(9, Math.floor(num(gh, REF_H)));
        const sy = gh / REF_H;
        const top = BAND_TOP * sy, bottom = BAND_BOTTOM * sy, availH = Math.max(9, bottom - top);
        const k = Math.max(1, Math.floor(Math.min(gw / 16, availH / 9)));
        const w = 16 * k, h = 9 * k;
        const x = Math.floor((gw - w) / 2), y = Math.floor(top + (availH - h) / 2);
        const m = Math.max(1, Math.floor(Math.min(gw / 16, gh / 9)));      // 映すステージ領域(マップ座標)。画面の中の最大の16:9
        const srcW = 16 * m, srcH = 9 * m;
        const srcX = Math.floor((gw - srcW) / 2), srcY = Math.floor((gh - srcH) / 2);
        return { x, y, w, h, srcX, srcY, srcW, srcH, scale: w / srcW, gw, gh };
    };
    // 敵(戦闘エリアの上)・キャラ・神(戦闘エリアの下)の置き場(画面座標)。画面の左右中央。縦横の拡大率は HUD と同じ(基準座標 x 画面の拡大率)。
    const repZones = vp => {
        const sx = vp.gw / REF_W, sy = vp.gh / REF_H, w = REP.w * sx, x = vp.gw / 2 - w / 2;
        const ew = Math.min(ENEMY.w * sx, vp.w), ex = vp.gw / 2 - ew / 2;                       // 極端な横長でも、敵の置き場は戦闘エリアの幅の中
        return { enemy: { x: ex, y: ENEMY.y * sy, w: ew, h: ENEMY.h * sy },
            char: { x, y: REP.char.y * sy, w, h: REP.char.h * sy }, god: { x, y: REP.god.y * sy, w, h: REP.god.h * sy } };
    };
    // カットインの置き場(画面座標)。味方は左上・敵は右上。戦闘エリアの左右の外に収める(幅は戦闘エリアの左右の余白まで)。
    const cutInRects = vp => {
        const sx = vp.gw / REF_W, sy = vp.gh / REF_H, margin = CUTIN.margin * sx;
        const w = Math.max(40, Math.min(CUTIN.w * sx, vp.x - margin * 2)), h = Math.round(w * CUTIN.ratio), y = CUTIN.y * sy;
        return { ally: { x: margin, y, w, h }, enemy: { x: vp.gw - margin - w, y, w, h } };
    };
    const screenToStage = (vp, x, y) => ({ x: (x - vp.x) / vp.scale + vp.srcX, y: (y - vp.y) / vp.scale + vp.srcY });
    const stageToScreen = (vp, x, y) => ({ x: (x - vp.srcX) * vp.scale + vp.x, y: (y - vp.srcY) * vp.scale + vp.y });
    const battleBoxOf = vp => ({ x: vp.x + BOX_N.x * vp.w, y: vp.y + BOX_N.y * vp.h, w: BOX_N.w * vp.w, h: BOX_N.h * vp.h });
    const heartRadiusOf = vp => Math.max(6, Math.round(vp.w * 0.014));
    // マウス(画面座標)を、バトルボックスの内側へ。ハートの半径ぶん内側に収める。
    const clampToBox = (box, radius, x, y) => ({
        x: clamp(x, box.x + radius, box.x + box.w - radius), y: clamp(y, box.y + radius, box.y + box.h - radius),
        inside: x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h
    });

    // ---------------------------------------------------------------- 実行時の状態(セーブしない) ----------------------------------------------------------------
    const runtime = {
        state: "idle", systemRef: null, returnPoint: null, cause: "", waited: 0, activations: 0, completions: 0, lastReason: "", lastError: "", failed: false,
        mapped: false, vpSig: "", anchorSig: "", hiddenSprites: [], enemyLook: null, heart: { u: 0.5, v: 0.5, phase: "", inBox: false }, scene: null, reps: null
    };
    const gameSize = () => ({ w: (typeof Graphics !== "undefined" && Graphics.width) || REF_W, h: (typeof Graphics !== "undefined" && Graphics.height) || REF_H });
    const currentViewport = () => { const g = gameSize(); return computeViewport(g.w, g.h); };
    const mapId = () => (typeof $gameMap !== "undefined" && $gameMap ? $gameMap.mapId() : 0);
    const presenting = () => runtime.state === "active" || runtime.state === "leaving";
    const stageMode = () => runtime.state !== "idle";
    const sceneReady = scene => !!scene && scene instanceof Scene_Map && !!scene._spriteset && typeof $gamePlayer !== "undefined" && !!$gamePlayer && !$gamePlayer.isTransferring();

    // ---------------------------------------------------------------- 置き場所(タイル座標) ----------------------------------------------------------------
    // 実際のプレイヤー(見えない)は、画面に描くキャラの置き場の中心に立つ。プレイヤー起点の攻撃(銃など)は、そのまま「キャラ」から出る。
    // 神の起点(godCenter)は神の置き場の中心。敵ハートは戦闘エリアの上寄り(HEART_N)。座標はすべてステージ(マップ)のタイル座標。
    const layout = () => {
        const vp = currentViewport(), zones = repZones(vp);
        const toTile = (x, y) => { const p = screenToStage(vp, x, y); return { x: p.x / TILE, y: p.y / TILE }; };
        const playerCenter = toTile(zones.char.x + zones.char.w / 2, zones.char.y + zones.char.h / 2);
        const godCenter = toTile(zones.god.x + zones.god.w / 2, zones.god.y + zones.god.h / 2);
        const heartHome = { x: (vp.srcX + HEART_N.x * vp.srcW) / TILE, y: (vp.srcY + HEART_N.y * vp.srcH) / TILE };
        return { player: { x: playerCenter.x - 0.5, y: playerCenter.y - 0.5 }, playerCenter, godCenter, heartHome, viewport: vp, tile: TILE };
    };

    // ---------------------------------------------------------------- マウス座標の変換 ----------------------------------------------------------------
    // TouchInput._x/_y は、ステージにいる間は「ステージ(マップ)座標」で持つ(照準を計算する本体側のコードを変えないため)。
    const convertTouch = (fromVp, toVp) => {                                // fromVp が null = 画面座標、toVp が null = 画面座標
        if (typeof TouchInput === "undefined") return;
        const x = TouchInput._x, y = TouchInput._y;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        let screen = fromVp ? stageToScreen(fromVp, x, y) : { x, y };
        // 画面サイズが変わるとき: 物理的なカーソルは動かないので、キャンバスの中での相対位置を保つ(次のマウス移動までの間の値)
        if (fromVp && toVp && (fromVp.gw !== toVp.gw || fromVp.gh !== toVp.gh)) screen = { x: screen.x * toVp.gw / fromVp.gw, y: screen.y * toVp.gh / fromVp.gh };
        const next = toVp ? screenToStage(toVp, screen.x, screen.y) : screen;
        TouchInput._x = Math.round(next.x); TouchInput._y = Math.round(next.y);
    };
    const applyMapping = on => {
        if (on === runtime.mapped) return;
        const vp = currentViewport();
        if (on) { convertTouch(null, vp); runtime.vpSig = JSON.stringify(vp); } else { convertTouch(runtime.mappedVp || vp, null); }
        runtime.mappedVp = on ? vp : null;
        runtime.mapped = on;
    };
    const syncMappingToResize = () => {                                     // 解像度が変わったら、保持している座標を新しい変換へ
        if (!runtime.mapped) return;
        const vp = currentViewport(), sig = JSON.stringify(vp);
        if (sig === runtime.vpSig) return;
        convertTouch(runtime.mappedVp, vp);
        runtime.mappedVp = vp; runtime.vpSig = sig;
    };
    if (typeof Graphics !== "undefined") {
        for (const [name, axis] of [["pageToCanvasX", "x"], ["pageToCanvasY", "y"]]) {
            const original = Graphics[name];
            if (typeof original !== "function") continue;
            Graphics[name] = function(value) {
                const rawValue = original.apply(this, arguments);
                if (!runtime.mapped) return rawValue;
                const vp = currentViewport();
                return Math.round(axis === "x" ? (rawValue - vp.x) / vp.scale + vp.srcX : (rawValue - vp.y) / vp.scale + vp.srcY);
            };
        }
    }
    // TouchInput は「Graphics.isInsideCanvas(変換後の座標)」でカーソルが画面の中かを調べる。変換後の座標は戦闘エリアの外側(例: 戦闘エリアの左右)で
    // ステージ領域の外へ出るので、そのままだと画面の中にあるカーソルが無視されてしまう(ハートがカーソルを追えない)。判定は変換前(画面)の座標で行う。
    if (typeof Graphics !== "undefined" && typeof Graphics.isInsideCanvas === "function") {
        const originalInside = Graphics.isInsideCanvas;
        Graphics.isInsideCanvas = function(x, y) {
            if (!runtime.mapped) return originalInside.apply(this, arguments);
            const screen = stageToScreen(currentViewport(), x, y);
            return originalInside.call(this, screen.x, screen.y);
        };
    }
    // マウスの画面座標(変換前)。ステージにいなければ TouchInput そのまま。
    const rawMouse = () => {
        if (typeof TouchInput === "undefined" || !Number.isFinite(TouchInput._x) || !Number.isFinite(TouchInput._y)) return null;
        if (!runtime.mapped) return { x: TouchInput._x, y: TouchInput._y };
        return stageToScreen(runtime.mappedVp || currentViewport(), TouchInput._x, TouchInput._y);
    };

    // ---------------------------------------------------------------- 移動 ----------------------------------------------------------------
    const syncSystem = () => {
        const system = typeof $gameSystem !== "undefined" ? $gameSystem : null;
        if (runtime.systemRef !== system) {                                  // New Game / ロードで別のセーブになった: 古い記録は使わない
            if (runtime.systemRef !== null && runtime.state !== "idle") cleanup("systemChanged");
            runtime.systemRef = system;
        }
    };
    const transferTo = (point) => {
        $gamePlayer.reserveTransfer(point.mapId, point.x, point.y, point.direction || 2, 0);
        return true;
    };
    const fallbackPoint = () => (typeof $dataSystem !== "undefined" && $dataSystem && $dataSystem.startMapId ? { mapId: $dataSystem.startMapId, x: $dataSystem.startX, y: $dataSystem.startY, direction: 2 } : null);

    // 見えないプレイヤーを、キャラの置き場の中心へ置く(到着時と、画面サイズが変わったとき。見えないので移動ではなく置き直し)。
    const anchorPlayer = () => {
        if (typeof $gamePlayer === "undefined" || !$gamePlayer || mapId() !== STAGE_MAP_ID || $gamePlayer.isTransferring()) return;
        const p = layout().player;
        if (Math.abs($gamePlayer._realX - p.x) > 1e-6 || Math.abs($gamePlayer._realY - p.y) > 1e-6) safe(() => $gamePlayer.locate(p.x, p.y));
        safe(() => $gamePlayer.setDirection?.(8));
        runtime.anchorSig = JSON.stringify([p.x, p.y]);
    };
    const enter = () => {
        if (typeof $gamePlayer === "undefined" || !$gamePlayer || typeof $gameMap === "undefined" || !$gameMap) return { ok: false, reason: "playerUnavailable" };
        syncSystem();
        if (runtime.state !== "idle") return { ok: false, reason: "stageBusy", state: runtime.state };
        if (api("ProjectRSoulBattle")?.isActive?.()) return { ok: false, reason: "soulActive" };
        const onStage = mapId() === STAGE_MAP_ID;
        runtime.returnPoint = onStage ? fallbackPoint()                      // 既にステージにいる(記録が無い): 戻り先はゲームの開始位置
            : { mapId: mapId(), x: $gamePlayer.x, y: $gamePlayer.y, direction: $gamePlayer.direction(), realX: $gamePlayer._realX, realY: $gamePlayer._realY };
        const place = layout().player;
        runtime.failed = false; runtime.cause = ""; runtime.waited = 0;
        if (onStage) { runtime.state = "active"; runtime.activations++; anchorPlayer(); return { ok: true, pending: false, alreadyThere: true }; }
        transferTo({ mapId: STAGE_MAP_ID, x: Math.round(place.x), y: Math.round(place.y), direction: 8 });
        runtime.state = "entering";
        return { ok: true, pending: true, mapId: STAGE_MAP_ID, from: runtime.returnPoint && { ...runtime.returnPoint } };
    };
    const leave = (reason = "leave") => {
        syncSystem();
        if (runtime.state === "idle") return { ok: true, already: true, state: "idle" };
        if (runtime.state === "leaving") return { ok: true, already: true, state: "leaving" };
        const point = runtime.returnPoint || fallbackPoint();
        runtime.cause = String(reason);
        if (!point || typeof $gamePlayer === "undefined" || !$gamePlayer) { cleanup("noReturnPoint"); return { ok: false, reason: "noReturnPoint" }; }
        if (mapId() === point.mapId && runtime.state !== "entering") { $gamePlayer.requestMapReload?.(); }
        transferTo(point);
        runtime.state = "leaving"; runtime.waited = 0;
        return { ok: true, leaving: true, to: { ...point }, reason: runtime.cause };
    };
    // 片づけ(1回だけ): マウス変換・プレイヤー表示・描画層を戻し、idleへ。
    const cleanup = reason => {
        const was = runtime.state;
        endSwap();
        applyMapping(false);
        restorePlayerSprites();
        const scene = runtime.scene;
        if (scene) removeLayers(scene);
        runtime.scene = null; runtime.reps = null; runtime.hearts = null; runtime.enemyLook = null; runtime.heart = { u: 0.5, v: 0.5, phase: "", inBox: false }; runtime.vpSig = "";
        if (was !== "idle") { runtime.completions++; runtime.lastReason = String(reason || ""); }
        runtime.state = "idle"; runtime.waited = 0;
        // 戻った先で、記録した正確な位置(DotMoveの小数座標)へ置き直す
        const point = runtime.returnPoint; runtime.returnPoint = null;
        if (point && was === "leaving" && typeof $gamePlayer !== "undefined" && $gamePlayer && mapId() === point.mapId && !$gamePlayer.isTransferring()) {
            if (Number.isFinite(point.realX) && Number.isFinite(point.realY) && (Math.abs(point.realX - $gamePlayer._realX) > 1e-6 || Math.abs(point.realY - $gamePlayer._realY) > 1e-6)) {
                safe(() => $gamePlayer.locate(point.realX, point.realY));
            }
            safe(() => $gamePlayer.setDirection?.(point.direction));
        }
    };

    // ---------------------------------------------------------------- キャラ・神の見た目(既存のデータだけ。新しい選択規則は作らない) ----------------------------------------------------------------
    const GOD_TAG = "<projectRGodVisual>";
    const isGodVisualCharacter = ch => !!ch && typeof ch.event === "function" && String(safe(() => ch.event()?.note, "")).includes(GOD_TAG);
    // 今のキャラ: 先頭アクターの歩行グラフィック(= ProjectR_CharacterPresentation の待機グラフィック)。Game_Player は構え・射撃などの一時的なポーズ用の絵に
    // 切り替わることがあるので、基本の見た目(アクター)を読む。アクターが読めないときだけ Game_Player の見た目。
    const characterLook = () => {
        const actor = safe(() => $gameParty.leader(), null);
        const name = safe(() => actor?.characterName?.(), "") || safe(() => $gamePlayer.characterName(), "");
        const index = safe(() => (actor?.characterName?.() ? actor.characterIndex() : $gamePlayer.characterIndex()), 0);
        return name ? { name: String(name), index: num(index, 0) } : null;
    };
    // 今の神: 既存の選択データ = GodSummonManager の永続Ultimateの神(無ければ CardDeck のUltimateの指輪)。複数の指輪があっても、選ばれている1柱だけ。
    const selectedGodId = () => {
        const manager = api("ProjectRGodSummonManager");
        const fromManager = safe(() => (manager?.hasPersistentUltimateBattleState?.() ? manager.getPersistentUltimateGodId?.() : null), null);
        const id = fromManager || safe(() => api("ProjectRCardDeck")?.getUltimateRingId?.(), null);
        return id ? String(id) : null;
    };
    // 神の見た目: マップに出ている神の表示Event(GodSummonVisual)の画像。無ければ GodSummonVisual と同じプラグインパラメータ(既定 Hermes=!Crystal / Apollo=!Flame)。
    const godLook = godId => {
        if (!godId) return null;
        const visuals = safe(() => api("ProjectRGodSummonVisual")?.getVisuals?.(), []) || [];
        const entry = visuals.find(v => v && v.godId === godId && v.kind === "persistent") || visuals.find(v => v && v.godId === godId);
        const event = entry ? safe(() => $gameMap.event(entry.eventId), null) : null;
        if (event && event._characterName) return { name: String(event._characterName), index: num(event._characterIndex, 0) };
        const params = safe(() => PluginManager.parameters("ProjectR_GodSummonVisual"), {}) || {};
        const cap = godId.charAt(0).toUpperCase() + godId.slice(1);
        const defaults = { hermes: "!Crystal", apollo: "!Flame" };
        const name = params[cap + "CharacterName"] !== undefined ? String(params[cap + "CharacterName"]) : defaults[godId];
        return name ? { name, index: Math.max(0, Math.floor(num(params[cap + "CharacterIndex"], 0))) } : null;
    };
    const godLabel = godId => safe(() => api("ProjectRBattleHUD")?.getGodPresentation?.(godId)?.name, null) || String(godId || "").toUpperCase();

    // ---------------------------------------------------------------- プレイヤーを描かない ----------------------------------------------------------------
    const playerCharacters = () => {
        const list = [$gamePlayer];
        const followers = safe(() => $gamePlayer.followers?.()?._data, null);
        if (Array.isArray(followers)) for (const f of followers) if (f) list.push(f);
        return list;
    };
    // 手に持っている武器の絵(Hendrix の DisplayWeapon が作る Sprite: マップ座標系の絵・anchor(0,0.5)・プレイヤーの直上の z・振りの Sprite_WeaponSwing ではない)
    const heldWeaponSprites = scene => {
        const children = scene?._spriteset?._tilemap?.children;
        if (!Array.isArray(children)) return [];
        const z = safe(() => $gamePlayer.screenZ() + 1, null);
        return children.filter(c => c && !c._source && c.anchor && c.anchor.x === 0 && c.anchor.y === 0.5 && c.z === z && "renderable" in c && /(^|[\/])pictures[\/]/.test(String(c.bitmap?._url || "")));
    };
    const hidePlayerSprites = scene => {
        let count = 0;
        for (const sprite of heldWeaponSprites(scene)) {
            if (!runtime.hiddenSprites.some(entry => entry.sprite === sprite)) runtime.hiddenSprites.push({ sprite, prev: sprite.renderable });
            sprite.renderable = false; count++;
        }
        // ProjectR_CutIn の CutInLayer.overlay: カード発動のカットイン中に「操作キャラクター本体の複製」を重ねる Sprite(元のSpriteの visible だけを見て、renderable は見ない)。
        // 戦闘エリアの中に小さなプレイヤーが出る原因なので描かない。カットインの本体(神の目・パネル)は変えない。
        const overlayCopy = scene?._spriteset?._projectRCutInLayer?.overlay;
        if (overlayCopy && "renderable" in overlayCopy) {
            if (!runtime.hiddenSprites.some(entry => entry.sprite === overlayCopy)) runtime.hiddenSprites.push({ sprite: overlayCopy, prev: overlayCopy.renderable });
            overlayCopy.renderable = false; count++;
        }
        const sprites = scene?._spriteset?._characterSprites;
        if (!Array.isArray(sprites)) return count;
        const characters = playerCharacters();
        for (const sprite of sprites) {
            if (!sprite || !(characters.includes(sprite._character) || isGodVisualCharacter(sprite._character)) || !("renderable" in sprite)) continue;   // 神の表示Eventの絵は、戦闘エリアの外(下)に描く
            if (!runtime.hiddenSprites.some(entry => entry.sprite === sprite)) runtime.hiddenSprites.push({ sprite, prev: sprite.renderable });
            sprite.renderable = false;
            count++;
        }
        return count;
    };
    const restorePlayerSprites = () => {
        while (runtime.hiddenSprites.length) {
            const entry = runtime.hiddenSprites.pop();
            try { entry.sprite.renderable = entry.prev; } catch (error) { /* 破棄済み */ }
        }
    };

    // ---------------------------------------------------------------- 描画層 ----------------------------------------------------------------
    const newBitmap = (w, h) => new Bitmap(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
    // Sprite は代入時の大きさを表示範囲(frame)として覚えるので、大きさが変わるときは Bitmap ごと作り直して差し替える(resize() は使わない)。
    const swapBitmap = (sprite, w, h) => { const old = sprite.bitmap; sprite.bitmap = newBitmap(w, h); try { old?.destroy?.(); } catch (error) { /* 破棄済み */ } return sprite.bitmap; };
    const bitmapText = (bitmap, value, x, y, w, h, size, color, align) => {
        bitmap.fontSize = size; bitmap.textColor = color; bitmap.outlineColor = "rgba(0,0,0,0.85)"; bitmap.outlineWidth = 4;
        bitmap.drawText(String(value), x, y, w, h, align || "left");
    };
    // キャラ・神の絵(歩行グラフィックの1コマ)。MZ の Sprite_Character と同じ切り出し(大きい絵は3x4・普通は12x8、真ん中の歩行パターン)。
    // 名前が _fN で終わる行動アニメ用の絵(ProjectR_CharacterPresentation)は N列 x 4行(向き)で、最初のコマを使う。
    const makeRep = () => { const sprite = new Sprite(); sprite.anchor.set(0.5, 0.5); sprite.visible = false; sprite._repKey = ""; sprite._repFrame = null; return sprite; };
    const setRepLook = (sprite, look, direction) => {
        if (!look) { sprite._repKey = ""; sprite._repFrame = null; return false; }
        const key = look.name + ":" + look.index + ":" + direction;
        if (sprite._repKey !== key) {
            sprite._repKey = key; sprite._repFrame = null;
            const bitmap = ImageManager.loadCharacter(look.name);
            sprite.bitmap = bitmap;
            bitmap.smooth = false;                                              // ドット絵を拡大してもにじませない
            bitmap.addLoadListener(loaded => {
                if (sprite._repKey !== key) return;
                const big = ImageManager.isBigCharacter(look.name);
                const strip = /_f(\d+)$/.exec(look.name);
                const cols = strip ? Math.max(1, Number(strip[1])) : (big ? 3 : 12), rows = strip || big ? 4 : 8;
                const pw = loaded.width / cols, ph = loaded.height / rows;
                const cx = strip || big ? 0 : (look.index % 4) * 3, cy = strip || big ? 0 : Math.floor(look.index / 4) * 4;
                sprite.setFrame((cx + (strip ? 0 : 1)) * pw, (cy + (direction - 2) / 2) * ph, pw, ph);
                sprite._repFrame = { pw, ph };
            });
        }
        return true;
    };
    // 敵の絵(1枚絵。img/enemies など)。大きさが違っても、置き場へ縦横同じ倍率で収める。
    const setEnemyImage = (sprite, look) => {
        if (!look || !look.name) { sprite._repKey = ""; sprite._repFrame = null; return false; }
        const key = "enemy:" + (look.folder || "enemies") + "/" + look.name;
        if (sprite._repKey !== key) {
            sprite._repKey = key; sprite._repFrame = null;
            const bitmap = ImageManager.loadBitmap("img/" + (look.folder || "enemies") + "/", look.name);
            sprite.bitmap = bitmap;
            bitmap.addLoadListener(loaded => {
                if (sprite._repKey !== key) return;
                sprite.setFrame(0, 0, loaded.width, loaded.height);
                sprite._repFrame = { pw: loaded.width, ph: loaded.height };
            });
        }
        return true;
    };
    const fitRep = (sprite, zone) => {                                          // 置き場の中央へ。縦横同じ倍率で収める(引き伸ばさない)
        const frame = sprite._repFrame;
        if (!frame) { sprite.visible = false; return; }
        const k = Math.min(zone.w / frame.pw, zone.h / frame.ph);
        sprite.scale.set(k, k);
        sprite.x = Math.round(zone.x + zone.w / 2); sprite.y = Math.round(zone.y + zone.h / 2);
        sprite.visible = true;
    };
    const makeLayers = scene => {
        const backdrop = new Sprite(newBitmap(1, 1));
        const frame = new Sprite(newBitmap(1, 1));
        const overlay = new Sprite();
        overlay._stageBox = new Sprite(newBitmap(1, 1));
        overlay._stageHeart = new Sprite(newBitmap(1, 1));
        overlay._stageBossHeart = new Sprite(newBitmap(1, 1));                   // 防御ターンの敵ハート(敵の絵の胸)。表示だけ(当たり判定・Eventは無い)
        overlay._stageHeart.visible = false; overlay._stageBox.visible = false; overlay._stageBossHeart.visible = false;
        overlay._stageChar = makeRep(); overlay._stageGod = makeRep(); overlay._stageEnemy = makeRep();
        overlay.addChild(overlay._stageEnemy); overlay.addChild(overlay._stageChar); overlay.addChild(overlay._stageGod);
        overlay.addChild(overlay._stageBox); overlay.addChild(overlay._stageHeart); overlay.addChild(overlay._stageBossHeart);
        backdrop._projectRSoulStageBackdrop = true; frame._projectRSoulStageFrame = true; overlay._projectRSoulStageOverlay = true;
        const layers = { backdrop, frame, overlay, sig: { backdrop: "", frame: "", box: "", heart: "", bossHeart: "" } };
        scene._projectRSoulStageLayers = layers;
        return layers;
    };
    const removeLayers = scene => {
        const layers = scene?._projectRSoulStageLayers;
        if (!layers) return;
        for (const key of ["backdrop", "frame", "overlay"]) {
            const sprite = layers[key];
            try { sprite.parent?.removeChild?.(sprite); sprite.bitmap?.destroy?.(); if (key === "overlay") for (const c of [sprite._stageBox, sprite._stageHeart, sprite._stageBossHeart]) c?.bitmap?.destroy?.(); sprite.destroy?.(); } catch (error) { /* 破棄済み */ }
        }
        scene._projectRSoulStageLayers = null;
    };
    const placeLayers = (scene, layers) => {                                // 背景は最背面、枠はマップの上、オーバーレイ(ボックス・ハート)はHUDの上
        const children = scene.children;
        const spriteset = scene._spriteset;
        // 背景は Spriteset の _baseSprite の中(MZ は最背面に不透明な黒い画面 _blackScreen を置くので、その1つ上)。無ければシーンの最背面。
        const base = spriteset?._baseSprite;
        if (base && typeof base.addChildAt === "function" && Array.isArray(base.children)) {
            if (layers.backdrop.parent !== base) base.addChildAt(layers.backdrop, Math.min(1, base.children.length));
        } else if (layers.backdrop.parent !== scene) scene.addChildAt(layers.backdrop, 0);
        const afterSprite = children.indexOf(spriteset) + 1;
        if (layers.frame.parent !== scene) scene.addChildAt(layers.frame, afterSprite);
        else if (children.indexOf(layers.frame) !== afterSprite && afterSprite > 0) { scene.removeChild(layers.frame); scene.addChildAt(layers.frame, children.indexOf(spriteset) + 1); }
        const hud = scene._projectRSoulHud, dialogue = scene._projectRFullscreenDialogueBackground;
        let target = hud ? children.indexOf(hud) + 1 : (dialogue ? children.indexOf(dialogue) : children.length);
        if (target < 0) target = children.length;
        if (layers.overlay.parent !== scene) scene.addChildAt(layers.overlay, Math.min(target, children.length));
        else if (hud && children.indexOf(layers.overlay) < children.indexOf(hud)) { scene.removeChild(layers.overlay); scene.addChildAt(layers.overlay, children.indexOf(hud) + 1); }
    };
    const drawBackdrop = (bitmap, vp) => {                                  // ステージ座標(0,0)〜(srcW,srcH)。Spritesetごと戦闘エリアへ拡大縮小される
        bitmap.clear();
        bitmap.fillRect(0, 0, vp.srcW, vp.srcH, COLORS.backdrop);
        bitmap.gradientFillRect(0, 0, vp.srcW, Math.round(vp.srcH * 0.6), COLORS.backdrop2, COLORS.backdrop, true);
        const step = TILE * 2;
        for (let gx = step; gx < vp.srcW; gx += step) bitmap.fillRect(gx, 0, 2, vp.srcH, COLORS.grid);
        for (let gy = step; gy < vp.srcH; gy += step) bitmap.fillRect(0, gy, vp.srcW, 2, COLORS.grid);
    };
    const drawFrame = (bitmap, vp) => {                                     // 縁だけ描く。外側は隠さない(下のキャラ/神の置き場から出る攻撃も、戦闘エリアの外で見える)
        bitmap.clear();
        const t = 3;
        bitmap.fillRect(vp.x - t, vp.y - t, vp.w + t * 2, t, COLORS.edge); bitmap.fillRect(vp.x - t, vp.y + vp.h, vp.w + t * 2, t, COLORS.edge);
        bitmap.fillRect(vp.x - t, vp.y, t, vp.h, COLORS.edge); bitmap.fillRect(vp.x + vp.w, vp.y, t, vp.h, COLORS.edge);
    };
    const drawBox = (bitmap, w, h) => {
        bitmap.clear();
        bitmap.fillRect(0, 0, w, h, COLORS.boxEdge);
        bitmap.clearRect(4, 4, w - 8, h - 8);
        bitmap.fillRect(4, 4, w - 8, h - 8, "rgba(2,4,10,0.55)");
        bitmapText(bitmap, "DEFENSE", 0, 8, w, Math.round(h * 0.16), Math.max(14, Math.round(h * 0.1)), "#ffffff", "center");
        bitmapText(bitmap, "BATTLE BOX  (予約レイアウト)", 0, Math.round(h * 0.2), w, Math.round(h * 0.1), Math.max(10, Math.round(h * 0.055)), "#f4c650", "center");
        bitmapText(bitmap, "マウスでハートを動かせます / 弾幕とダメージは後続フェーズ", 0, Math.round(h * 0.3), w, Math.round(h * 0.08), Math.max(9, Math.round(h * 0.04)), "#8493a8", "center");
    };
    const drawHeart = (bitmap, size, outer = COLORS.heart, core = COLORS.heartCore) => {   // 独自のハート形(キャンバスのパス)。外枠と芯の2色
        bitmap.clear();
        const ctx = bitmap.context;
        const path = (scale, color) => {
            const s = size * scale, ox = (size - s) / 2, oy = (size - s) / 2 + size * 0.04;
            ctx.beginPath();
            ctx.moveTo(ox + s * 0.5, oy + s * 0.92);
            ctx.bezierCurveTo(ox - s * 0.15, oy + s * 0.45, ox + s * 0.12, oy - s * 0.05, ox + s * 0.5, oy + s * 0.28);
            ctx.bezierCurveTo(ox + s * 0.88, oy - s * 0.05, ox + s * 1.15, oy + s * 0.45, ox + s * 0.5, oy + s * 0.92);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        };
        path(1, outer); path(0.5, core);
        bitmap._baseTexture?.update?.();
    };

    // ---------------------------------------------------------------- 防御ターンのハート ----------------------------------------------------------------
    const phaseNow = () => safe(() => api("ProjectRSoulBattle")?.getPhase?.() || "", "");
    const defensePhase = () => phaseNow() === "defense";
    const attackPhase = () => phaseNow() === "attack";
    const preparePhase = () => phaseNow() === "prepare";   // 準備: キャラと神は出す / プレイヤーのハートは出さない(マウス操作は防御だけ)
    const updateHeart = (vp) => {
        const heart = runtime.heart;
        const on = runtime.state === "active" && defensePhase();
        if (!on) { heart.phase = ""; heart.inBox = false; return null; }
        const box = battleBoxOf(vp), r = heartRadiusOf(vp);
        if (heart.phase !== "defense") { heart.phase = "defense"; heart.u = 0.5; heart.v = 0.5; }      // 防御ターンの最初はボックスの中央
        const mouse = rawMouse();
        if (mouse) {
            const c = clampToBox(box, r, mouse.x, mouse.y);
            heart.u = (c.x - box.x) / box.w; heart.v = (c.y - box.y) / box.h; heart.inBox = c.inside;
        }
        const x = clamp(box.x + heart.u * box.w, box.x + r, box.x + box.w - r), y = clamp(box.y + heart.v * box.h, box.y + r, box.y + box.h - r);   // 解像度が変わっても常にボックスの内側
        return { x, y, r, box };
    };

    // ---------------------------------------------------------------- 1フレーム ----------------------------------------------------------------
    const applyViewport = (scene, vp) => {
        const sp = scene._spriteset;
        if (!sp?.scale?.set) return;
        sp.scale.set(vp.scale, vp.scale);
        sp.x = Math.round(vp.x - vp.srcX * vp.scale); sp.y = Math.round(vp.y - vp.srcY * vp.scale);
        if (typeof $gameMap !== "undefined" && $gameMap && mapId() === STAGE_MAP_ID) $gameMap.setDisplayPos(0, 0);   // カメラ固定
    };
    const updateReps = (overlay, vp) => {
        const zones = repZones(vp);
        const show = runtime.state === "active" && (attackPhase() || preparePhase());      // 攻撃・準備のターン = キャラと神を出す(防御ターンは隠す)
        const charLook = characterLook(), godId = selectedGodId(), god = godLook(godId);
        const enemyLook = runtime.enemyLook || DEFAULT_ENEMY_LOOK, hasEnemy = setEnemyImage(overlay._stageEnemy, enemyLook);
        const hasChar = setRepLook(overlay._stageChar, charLook, 8), hasGod = setRepLook(overlay._stageGod, god, 8);
        if (runtime.state === "active" && hasEnemy) fitRep(overlay._stageEnemy, zones.enemy); else overlay._stageEnemy.visible = false;      // 敵は攻撃・防御の両ターンに出す
        if (show && hasChar) fitRep(overlay._stageChar, zones.char); else overlay._stageChar.visible = false;
        if (show && hasGod) fitRep(overlay._stageGod, zones.god); else overlay._stageGod.visible = false;
        const chestOf = (sprite, n) => { const f = sprite._repFrame; return f && sprite.visible ? { x: sprite.x + (n.x - 0.5) * f.pw * sprite.scale.x, y: sprite.y + (n.y - 0.5) * f.ph * sprite.scale.y } : null; };
        const chest = { char: chestOf(overlay._stageChar, CHEST_N.char), enemy: chestOf(overlay._stageEnemy, enemyLook.chest || CHEST_N.enemy) };
        return { show, zones, char: charLook, godId, god, godName: godId ? godLabel(godId) : null, enemy: enemyLook, enemyVisible: overlay._stageEnemy.visible, charVisible: overlay._stageChar.visible, godVisible: overlay._stageGod.visible, chest };
    };
    // 敵ハートの本物の絵(ProjectR_SoulBattlePoC が戦闘エリアの中に出す Sprite)。renderable だけを切り替える(PoC は visible を毎フレーム自分で決める)。
    const targetHeartSprite = scene => { const list = scene?._spriteset?._tilemap?.children; return Array.isArray(list) ? list.find(c => c && c._projectRSoulHeartPoC) || null : null; };
    const setTargetHeartHidden = (scene, hide) => {
        const index = runtime.hiddenSprites.findIndex(entry => entry.targetHeart);
        if (hide) {
            const sprite = targetHeartSprite(scene);
            if (!sprite) return false;
            if (index < 0) runtime.hiddenSprites.push({ sprite, prev: sprite.renderable, targetHeart: true });
            sprite.renderable = false;
            return true;
        }
        if (index >= 0) { const entry = runtime.hiddenSprites.splice(index, 1)[0]; try { entry.sprite.renderable = entry.prev; } catch (error) { /* 破棄済み */ } }
        return false;
    };
    const refreshPresentation = scene => {
        const vp = currentViewport();
        syncMappingToResize();
        applyViewport(scene, vp);
        hidePlayerSprites(scene);
        const layers = scene._projectRSoulStageLayers || makeLayers(scene);
        placeLayers(scene, layers);
        layers.backdrop.x = vp.srcX; layers.backdrop.y = vp.srcY;
        const sig = JSON.stringify([vp.gw, vp.gh, vp.x, vp.y, vp.w, vp.h]);
        if (runtime.state === "active" && runtime.vpAnchored !== sig) { runtime.vpAnchored = sig; anchorPlayer(); }        // 画面サイズが変わったら、見えないプレイヤーを置き直す
        if (layers.sig.backdrop !== sig) {
            layers.sig.backdrop = sig;
            drawBackdrop(swapBitmap(layers.backdrop, vp.srcW, vp.srcH), vp);
            drawFrame(swapBitmap(layers.frame, vp.gw, vp.gh), vp);
        }
        // 攻撃ターン: 戦闘エリアの下にキャラと神。防御ターン: 絵は隠し、置き場(位置)は空けたまま
        const overlay = layers.overlay;
        runtime.reps = updateReps(overlay, vp);
        // ハート(表示は1人1つ)。プレイヤーのハート: 防御ターン = マウスで動く(戦闘エリアの中) / 攻撃ターン = キャラの絵の胸(飾り。当たり判定は無い)。
        // 敵のハート: 攻撃ターン = 戦闘エリアの中の本物(Event。狙われる的) / 防御ターン = 敵の絵の胸(飾り)。防御ターンは戦闘エリアの中の本物の絵だけ隠す(的が2つ見えない)。
        const h = updateHeart(vp), r = heartRadiusOf(vp), size = r * 2;
        const active = runtime.state === "active", attackNow = active && attackPhase();      // プレイヤーの胸のハートは攻撃ターンだけ(準備ターンは出さない)
        overlay._stageBox.visible = false;                                   // 入れ子の小さな箱は無い(遊べる範囲 = 戦闘エリア)
        let player = null, boss = null;
        if (h) player = { x: h.x, y: h.y, mode: "mouse" };
        else if (attackNow && runtime.reps.chest.char) player = { ...runtime.reps.chest.char, mode: "portrait" };
        if (active && defensePhase() && runtime.reps.chest.enemy) boss = { ...runtime.reps.chest.enemy, mode: "portrait" };
        setTargetHeartHidden(scene, !!boss);                                 // 敵ハートの本物の絵: 防御ターンだけ隠す(胸の飾りに置き換える)
        overlay._stageHeart.visible = !!player;
        if (player) {
            if (layers.sig.heart !== String(size)) { layers.sig.heart = String(size); drawHeart(swapBitmap(overlay._stageHeart, size, size), size); }
            overlay._stageHeart.x = Math.round(player.x - r); overlay._stageHeart.y = Math.round(player.y - r);
        } else { layers.sig.box = ""; }
        overlay._stageBossHeart.visible = !!boss;
        if (boss) {
            if (layers.sig.bossHeart !== String(size)) { layers.sig.bossHeart = String(size); drawHeart(swapBitmap(overlay._stageBossHeart, size, size), size, COLORS.bossHeart, COLORS.bossHeartCore); }
            overlay._stageBossHeart.x = Math.round(boss.x - r); overlay._stageBossHeart.y = Math.round(boss.y - r);
        }
        runtime.hearts = { player, boss, radius: r };
    };
    const refresh = scene => {
        syncSystem();
        if (runtime.state === "idle") return;
        runtime.waited++;
        const onStage = mapId() === STAGE_MAP_ID, ready = sceneReady(scene);
        if (runtime.state === "entering") {
            if (onStage && ready) { runtime.state = "active"; runtime.activations++; runtime.waited = 0; applyMapping(true); anchorPlayer(); }
            else if (runtime.waited > ENTER_TIMEOUT) { cleanup("enterTimeout"); return; }
            else if (!onStage && ready && runtime.waited > 30 && !$gamePlayer.isTransferring()) { cleanup("enterCancelled"); return; }
        } else if (runtime.state === "active") {
            if (!onStage && ready) { cleanup("mapChanged"); return; }                // 外から別のマップへ移された: 元の記録は使えない(戻さない)
            applyMapping(true);
        } else if (runtime.state === "leaving") {
            if (!onStage && ready) { cleanup(runtime.cause || "left"); return; }
            if (runtime.waited > LEAVE_TIMEOUT) { cleanup("leaveTimeout"); return; }
        }
        if (presenting() || runtime.state === "active") {
            runtime.scene = scene;
            refreshPresentation(scene);
        }
    };

    if (typeof Scene_Map !== "undefined") {
        const _update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            let result;
            let swapped = false;
            try { if (godWindowOpen()) { swapped = beginSwap(godOrigin()); if (swapped) swap.frames++; } } catch (_error) { swapped = false; }
            try { result = _update.apply(this, arguments); } finally { if (swapped) endSwap(); }
            try { refresh(this); } catch (error) {
                runtime.lastError = String(error?.message || error);
                runtime.failed = true;
                if (typeof console !== "undefined") console.warn("[ProjectR_SoulBattleStage]", error);
                try {
                    const wasStage = runtime.state !== "idle";
                    const point = runtime.returnPoint || fallbackPoint();
                    cleanup("error");
                    if (wasStage && point && mapId() === STAGE_MAP_ID && typeof $gamePlayer !== "undefined" && $gamePlayer) transferTo(point);   // 表示の失敗でも、元のマップへ戻す
                } catch (inner) { /* 何もしない */ }
            }
            return result;
        };
        const _terminate = Scene_Map.prototype.terminate;
        Scene_Map.prototype.terminate = function() {
            // マップ移動でシーンが作り直される間も、状態(entering/leaving)は保つ。描画層だけ手放す。
            const layers = this._projectRSoulStageLayers;
            if (layers) removeLayers(this);
            restorePlayerSprites();
            return _terminate.apply(this, arguments);
        };
    }
    // カメラ固定(ステージでは常に左上)
    if (typeof Game_Map !== "undefined") {
        const _setDisplayPos = Game_Map.prototype.setDisplayPos;
        Game_Map.prototype.setDisplayPos = function(x, y) {
            if (stageMode() && this.mapId() === STAGE_MAP_ID) return _setDisplayPos.call(this, 0, 0);
            return _setDisplayPos.apply(this, arguments);
        };
    }
    // ステージにいる間は、セーブを禁止する(実行時のフラグ。セーブデータは変えない)
    if (typeof Game_System !== "undefined") {
        const _isSaveEnabled = Game_System.prototype.isSaveEnabled;
        Game_System.prototype.isSaveEnabled = function() { return stageMode() ? false : _isSaveEnabled.apply(this, arguments); };
    }

    // ---------------------------------------------------------------- 攻撃の起点(SOUL専用ステージの間だけ) ----------------------------------------------------------------
    // 遊べる範囲(タイル座標)= 戦闘エリアに映るステージ領域。近接攻撃のカーソル起点は、この範囲へ収める(範囲の外へ置けない)。
    const playArea = () => { const vp = currentViewport(); return { x0: vp.srcX / TILE, y0: vp.srcY / TILE, x1: (vp.srcX + vp.srcW) / TILE, y1: (vp.srcY + vp.srcH) / TILE }; };
    // マウスカーソルの位置(タイル座標)を、遊べる範囲へ収めたもの。ステージの間は TouchInput.x/y がステージ座標なので、そのままタイルへ直せる。
    const attackCursor = () => {
        if (runtime.state !== "active" || typeof TouchInput === "undefined" || !Number.isFinite(TouchInput.x) || !Number.isFinite(TouchInput.y) || typeof $gameMap === "undefined") return null;
        const area = playArea(), x = TouchInput.x / TILE + $gameMap.displayX(), y = TouchInput.y / TILE + $gameMap.displayY();
        const cx = clamp(x, area.x0, area.x1), cy = clamp(y, area.y0, area.y1);
        return { x: cx, y: cy, clamped: cx !== x || cy !== y, raw: { x, y } };
    };
    // 神の攻撃の起点: 遠距離の「神のカード」(選ばれている神のもの)だけ、神の置き場から出す。銃・剣などプレイヤー起点の攻撃は、キャラの置き場(= 見えないプレイヤー)から出る。
    // 神の選択は既存のデータ(selectedGodId)だけ。カードの神は GodSummonManager の召喚の godId(= 定義の ringId から resolveGodId)。選ばれていない神のカードはキャラの置き場から出る。
    // 方式: 見えないプレイヤーの実座標(_realX/_realY)を、神のカードの発動の間だけ神の置き場へ置き換える(必ず元へ戻す)。
    //   ・発動の同期処理(GodSummonManager.perform)の間 … 発動の瞬間に弾を出すカード(黄金の連矢・疫病の雨 など)
    //   ・そのカードの召喚が生きている間の、毎フレームの更新(Scene_Map.update)の間 … 後からフレームをまたいで弾を出すカード(エロスの矢・ギガース殺し など)
    //   ・その間に銃・剣・他のカードを使う入力(Game_Temp.reserveCommonEvent / CardDeck.requestUseCard)は、置き換えを外して受け付ける(キャラ起点のまま)
    // プレイヤーの座標・向き・当たり判定は変わりません(フレームの終わりには必ず元の座標)。
    const GOD_PROJECTILE_CARDS = Object.freeze(["apollo_golden_arrow", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer", "apollo_plague_rain", "apollo_plague_attack"]);
    const godOrigin = () => { const g = layout().godCenter; return { x: g.x - 0.5, y: g.y - 0.5 }; };
    const godOriginFor = definition => {
        if (runtime.state !== "active" || !api("ProjectRSoulBattle")?.isActive?.()) return null;
        const cardId = definition?.cardId;
        if (!GOD_PROJECTILE_CARDS.includes(cardId)) return null;
        const cardGod = safe(() => api("ProjectRGodSummonManager")?.resolveGodId?.(definition.ringId), null);
        if (!cardGod || cardGod !== selectedGodId()) return null;
        return { ...godOrigin(), cardId, godId: cardGod };
    };
    const godWindowOpen = () => {
        if (runtime.state !== "active" || !api("ProjectRSoulBattle")?.isActive?.()) return false;
        const god = selectedGodId();
        const list = safe(() => api("ProjectRGodSummonManager")?.getActiveSummons?.(), []) || [];
        return !!god && list.some(x => x && GOD_PROJECTILE_CARDS.includes(x.cardId) && x.godId === god);
    };
    const swap = { on: false, saved: null, frames: 0 };
    const beginSwap = origin => {
        if (swap.on || typeof $gamePlayer === "undefined" || !$gamePlayer) return false;
        swap.saved = { x: $gamePlayer._realX, y: $gamePlayer._realY };
        $gamePlayer._realX = origin.x; $gamePlayer._realY = origin.y; swap.on = true;
        return true;
    };
    const endSwap = () => {
        if (!swap.on) return;
        swap.on = false;
        if (typeof $gamePlayer !== "undefined" && $gamePlayer && swap.saved) { $gamePlayer._realX = swap.saved.x; $gamePlayer._realY = swap.saved.y; }
        swap.saved = null;
    };
    const asCharacter = fn => {                                           // 置き換え中でも、キャラ起点の入力(銃・剣・他のカード)はキャラの置き場で受け付ける
        if (!swap.on) return fn();
        const origin = { x: $gamePlayer._realX, y: $gamePlayer._realY }, saved = swap.saved;
        $gamePlayer._realX = saved.x; $gamePlayer._realY = saved.y; swap.on = false;
        try { return fn(); } finally { if (typeof $gamePlayer !== "undefined" && $gamePlayer) { swap.saved = { x: $gamePlayer._realX, y: $gamePlayer._realY }; $gamePlayer._realX = origin.x; $gamePlayer._realY = origin.y; swap.on = true; } }
    };
    const originLog = [];
    if (root.ProjectRGodSummonManager && typeof root.ProjectRGodSummonManager.perform === "function" && !root.ProjectRGodSummonManager.__soulStageOrigin) {
        const manager = root.ProjectRGodSummonManager, original = manager.perform;
        manager.perform = function(request) {
            let origin = null;
            try { origin = typeof $gamePlayer !== "undefined" && $gamePlayer && !swap.on ? godOriginFor(request?.definition) : null; } catch (error) { origin = null; }
            if (!origin) return original.apply(this, arguments);
            originLog.push({ cardId: origin.cardId, godId: origin.godId, x: origin.x, y: origin.y }); if (originLog.length > 40) originLog.shift();
            beginSwap(origin);
            try { return original.apply(this, arguments); } finally { endSwap(); }
        };
        manager.__soulStageOrigin = true;
    }
    if (typeof Game_Temp !== "undefined" && !Game_Temp.prototype.__soulStageOrigin) {
        const reserve = Game_Temp.prototype.reserveCommonEvent;
        Game_Temp.prototype.reserveCommonEvent = function() { return swap.on ? asCharacter(() => reserve.apply(this, arguments)) : reserve.apply(this, arguments); };
        Game_Temp.prototype.__soulStageOrigin = true;
    }
    if (root.ProjectRCardDeck && typeof root.ProjectRCardDeck.requestUseCard === "function" && !root.ProjectRCardDeck.__soulStageOrigin) {
        const deck = root.ProjectRCardDeck, request = deck.requestUseCard;
        deck.requestUseCard = function(handIndex) {
            if (!swap.on) return request.apply(this, arguments);
            const cardId = safe(() => deck.getBattleState?.()?.hand?.[handIndex]?.cardId, null);
            return GOD_PROJECTILE_CARDS.includes(cardId) ? request.apply(this, arguments) : asCharacter(() => request.apply(this, arguments));   // 神のカード自身は perform の置き換えに任せる
        };
        deck.__soulStageOrigin = true;
    }

    root.ProjectRSoulStage = Object.freeze({
        VERSION, STAGE_MAP_ID, BOX_N, BAND_TOP, BAND_BOTTOM, REP, ENEMY, DEFAULT_ENEMY_LOOK,
        // 敵の絵(戦闘エリアの上)。look = { folder:"enemies"|"sv_enemies", name } / null で既定へ戻す。ステージを出ると既定へ戻る。
        setEnemyLook: look => { runtime.enemyLook = look && typeof look.name === "string" && look.name ? { folder: look.folder === "sv_enemies" ? "sv_enemies" : "enemies", name: look.name, ...(look.chest && Number.isFinite(look.chest.x) && Number.isFinite(look.chest.y) ? { chest: { x: look.chest.x, y: look.chest.y } } : {}) } : null; return runtime.enemyLook || DEFAULT_ENEMY_LOOK; },
        getEnemyLook: () => runtime.enemyLook || DEFAULT_ENEMY_LOOK,
        getRepZones: () => repZones(currentViewport()),
        // カットイン(ProjectR_CutIn)の置き場(画面座標): 味方 = 左上 / 敵 = 右上。戦闘エリアの外。ステージを映している間だけ使われる。
        getCutInRects: () => cutInRects(currentViewport()), computeCutInRects: cutInRects, CUTIN, CHEST_N,
        // 映したステージ(Spriteset)の画面上の位置と倍率: 画面座標 = ステージ座標 x k + (ox, oy)(applyViewport と同じ式)
        getSpritesetFrame: () => { const vp = currentViewport(); return { ox: Math.round(vp.x - vp.srcX * vp.scale), oy: Math.round(vp.y - vp.srcY * vp.scale), k: vp.scale }; },
        // 表示中のハート(画面座標)。player = { x, y, mode:"mouse"(防御) | "portrait"(攻撃: キャラの胸) } / boss = 防御ターンだけ { x, y, mode:"portrait" }(攻撃ターンの的は戦闘エリアの中の本物)
        getHearts: () => { const h = runtime.hearts; return h ? { player: h.player && { ...h.player }, boss: h.boss && { ...h.boss }, radius: h.radius } : { player: null, boss: null, radius: 0 }; },
        getPlayArea: playArea, getAttackCursor: attackCursor, godOriginFor, GOD_PROJECTILE_CARDS, getOriginLog: () => originLog.map(e => ({ ...e })), isOriginSwapped: () => swap.on, getOriginStats: () => ({ swappedFrames: swap.frames }),
        getReps: () => { const r = runtime.reps; return r ? { show: r.show, char: r.char && { ...r.char }, godId: r.godId, god: r.god && { ...r.god }, godName: r.godName, enemy: r.enemy && { ...r.enemy }, enemyVisible: r.enemyVisible, charVisible: r.charVisible, godVisible: r.godVisible, chest: JSON.parse(JSON.stringify(r.chest || {})), zones: JSON.parse(JSON.stringify(r.zones)) } : null; },
        enter, leave, layout,
        isActive: () => runtime.state === "active", isPresenting: presenting,
        getState: () => ({
            state: runtime.state, mapped: runtime.mapped, cause: runtime.cause, activations: runtime.activations, completions: runtime.completions, lastReason: runtime.lastReason,
            lastError: runtime.lastError, failed: runtime.failed, returnPoint: runtime.returnPoint ? { ...runtime.returnPoint } : null, hiddenPlayerSprites: runtime.hiddenSprites.length,
            layers: !!runtime.scene?._projectRSoulStageLayers
        }),
        computeViewport, getViewport: currentViewport,
        getBattleBox: () => battleBoxOf(currentViewport()),
        toStage: (x, y) => screenToStage(currentViewport(), x, y), toScreen: (x, y) => stageToScreen(currentViewport(), x, y),
        clampToBox,
        getPlayerHeart: () => {
            const vp = currentViewport(), box = battleBoxOf(vp), r = heartRadiusOf(vp), heart = runtime.heart, active = runtime.state === "active" && heart.phase === "defense";
            const x = clamp(box.x + heart.u * box.w, box.x + r, box.x + box.w - r), y = clamp(box.y + heart.v * box.h, box.y + r, box.y + box.h - r);
            return { active, x, y, radius: r, u: heart.u, v: heart.v, inBox: heart.inBox, box };
        }
    });
})();
