/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR 8方向の向きデータ: 戦闘中のマウス照準から、正確な8方向(N/NE/E/SE/S/SW/W/NW)を出す。MZ本体の4方向の向きは変えない。
 * @author ProjectR
 * @base ProjectR_PlayerFacing
 * @orderAfter ProjectR_PlayerFacing
 *
 * @param Enabled
 * @text 有効
 * @type boolean
 * @default true
 *
 * @help
 * ProjectR_FieldFacing.js (読み取り専用。プレイヤーの向き・移動・攻撃・スキルは変えない)
 *
 * 戦闘中(ProjectRCombatPresence.isCombatEventActive())のマウスの照準から、プレイヤーの「8方向の向き」を計算して公開します。
 *   - 向きは移動入力(WASD)と無関係です(マウスの位置だけで決まる)。
 *   - プレイヤーのキャラクター画像は4方向(斜めの画像がない)なので、MZ本体の向き($gamePlayer.direction() = 2/4/6/8)は、
 *     既存の ProjectR_PlayerFacing / Hendrix の照準のまま変えません。斜めの向き(1/3/7/9)を、MZ本体の4方向のAPIへ渡しません。
 *     斜めの画像(ファイル名に 8dir を含む)を使うキャラクターは、Hendrix が元から斜めの向きを持ちます(ここは何もしない)。
 *   - 戦闘外は、通常の4方向の向きをそのまま返します。
 *   - ゲームパッドは対象外(マウスだけ)。
 *
 * API: ProjectRFieldFacing
 *   getAim()      { active, degree(上=0・時計回り、マウスの正確な角度), degree8(45度に丸めた値), dir8(テンキーの向き 8/9/6/3/2/1/4/7), name("N"〜"NW"),
 *                   vx, vy(向きの単位ベクトル。画面は下が+y), dir4($gamePlayer.direction()) }
 *   getDir8() / getDegree8() / getFacingVector()    8方向に丸めた向き(戦闘外は4方向の向き)
 *   toDir8(degree) / toName(dir8) / isActive()
 *   getConfig() / setConfig({ enabled })   (DEV。保存しない。無効にすると、戦闘中も4方向の向きを返す)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const params = PluginManager.parameters("ProjectR_FieldFacing");
    const cfg = { enabled: String(params.Enabled ?? "true") !== "false" };
    const DEG_TO_DIR8 = [8, 9, 6, 3, 2, 1, 4, 7];                // 0°(上)から45°ずつ時計回り
    const NAMES = { 8: "N", 9: "NE", 6: "E", 3: "SE", 2: "S", 1: "SW", 4: "W", 7: "NW" };
    const DIR4_DEGREE = { 8: 0, 6: 90, 2: 180, 4: 270 };
    const safe = (fn, fallback) => { try { return fn(); } catch (_error) { return fallback; } };
    const toDir8 = degree => { const d = ((Number(degree) % 360) + 360) % 360; return DEG_TO_DIR8[Math.round(d / 45) % 8]; };
    const toDegree8 = dir8 => { const i = DEG_TO_DIR8.indexOf(dir8); return i < 0 ? null : i * 45; };
    const isActive = () => cfg.enabled && safe(() => root.ProjectRCombatPresence.isCombatEventActive() === true, false);
    const playerCenter = () => {
        const p = safe(() => $gamePlayer.centerPositionPoint(), null);
        return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : { x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 };
    };
    // マウスの位置(マップ座標)→ プレイヤーの中心からの角度(上=0・時計回り)
    const mouseDegree = () => {
        if (typeof TouchInput === "undefined" || typeof $gameMap === "undefined" || typeof $gamePlayer === "undefined" || !$gamePlayer) return null;
        // マップ座標(小数)。$gameMap.canvasToMapX は整数のマスへ丸める(切り捨て)ので、8方向の境の近くで角度が最大 1 マスぶんずれる。ここは丸めない
        const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight(), mx = $gameMap.displayX() + TouchInput.x / tw, my = $gameMap.displayY() + TouchInput.y / th;
        const c = playerCenter(), dx = mx - c.x, dy = my - c.y;
        if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < 0.05) return null;       // 中心にほぼ重なっているときは決められない
        return ((Math.atan2(dx, -dy) * 180 / Math.PI) % 360 + 360) % 360;
    };
    let lastDegree = null;                                                                          // マウスが中心に重なったときは、直前の角度を保つ
    const getAim = () => {
        const dir4 = safe(() => $gamePlayer.direction(), 2);
        if (!isActive()) { lastDegree = null; const d8 = DIR4_DEGREE[dir4] !== undefined ? dir4 : 2; return { active: false, degree: DIR4_DEGREE[d8], degree8: DIR4_DEGREE[d8], dir8: d8, name: NAMES[d8], vx: Math.sin(DIR4_DEGREE[d8] * Math.PI / 180), vy: -Math.cos(DIR4_DEGREE[d8] * Math.PI / 180), dir4 }; }
        let degree = mouseDegree();
        if (degree === null) degree = lastDegree !== null ? lastDegree : (DIR4_DEGREE[dir4] ?? 180);
        lastDegree = degree;
        const dir8 = toDir8(degree), degree8 = toDegree8(dir8), r = degree8 * Math.PI / 180;
        return { active: true, degree, degree8, dir8, name: NAMES[dir8], vx: +Math.sin(r).toFixed(6), vy: +(-Math.cos(r)).toFixed(6), dir4 };
    };
    root.ProjectRFieldFacing = {
        getAim, isActive, toDir8, toName: dir8 => NAMES[dir8] || null,
        getDir8: () => getAim().dir8, getDegree8: () => getAim().degree8, getFacingVector: () => { const a = getAim(); return { x: a.vx, y: a.vy }; },
        getConfig: () => ({ ...cfg }),
        setConfig: o => { const c = o && typeof o === "object" ? o : {}; if (typeof c.enabled === "boolean") cfg.enabled = c.enabled; return { ...cfg }; }
    };
})();
