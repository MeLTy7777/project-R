/*:
 * @target MZ
 * @plugindesc v1.0.0 DEV専用 Combat Test Arena 追加: サイコポンポス(魂)の検証用フィクスチャ(Playtest限定)。製品の敵・報酬ではない。
 * @author ProjectR
 * @base ProjectR_CombatTestArena
 * @base ProjectR_HermesPsychopomp
 * @base ProjectR_KillAttribution
 * @base ProjectR_SoulCollection
 * @orderAfter ProjectR_CombatTestArenaVeil
 *
 * @help
 * ProjectR_CombatTestArenaPsychopomp.js
 *
 * Playtest専用。F8のConsoleから使います。ゲームのファイルは変更しません(メモリ上のEvent位置・HP・Regionを一時的に変えるだけ。セーブしない)。
 *   ProjectRSoulTest.layout(playerX, playerY)   アリーナのDEV敵(Event ID 2〜6。ID はそれぞれ違う)を、主人公の周りの距離の違う場所へ置く:
 *                                               id3 = 3マス東 / id4 = 8マス東(範囲外) / id5 = 4マス北 / id6 = 4マス南 / id2 = 4マス西
 *   ProjectRSoulTest.hp(eventId, hp)            敵HPバーのHPを直接設定する(公式のバーの値。攻撃を通さないので撃破の通知は出ない = sweep経路の検証用)
 *   ProjectRSoulTest.hit(eventId, { attacker })  公式 UpdateEventHp(コマンド)で致死ダメージを与える。attacker 省略 = 主人公("player")、"environment" など = 主人公以外
 *   ProjectRSoulTest.wall(x, y, regionId)       メモリ上のマップの Region を書き換え、元の値を返す(255 = 壁。0 = 解除)
 *   ProjectRSoulTest.state()                    窓・バフ・魂・撃破ログ・回復ログの読み取り
 * 本番のゲームには影響しません(Playtest以外では何も登録しません)。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;
    const ENGINE = "Hendrix_Action_Engine";

    const barOf = eventId => {
        const bars = SceneManager._scene?._spriteset?._eventHpBars;
        const event = $gameMap.event(eventId);
        return Array.isArray(bars) && event ? bars.find(b => b._event === event) || null : null;
    };
    const place = (id, cx, cy) => {
        const event = $gameMap.event(id);
        if (!event) return false;
        event.setPosition(cx - 0.5, cy - 0.5);
        return true;
    };
    const layout = (px, py) => {
        const cx = Number.isFinite(px) ? px : $gamePlayer.centerPositionPoint().x;
        const cy = Number.isFinite(py) ? py : $gamePlayer.centerPositionPoint().y;
        const placed = {};
        placed[3] = place(3, cx + 3, cy);
        placed[4] = place(4, cx + 8, cy);
        placed[5] = place(5, cx, cy - 4);
        placed[6] = place(6, cx, cy + 4);
        placed[2] = place(2, cx - 4, cy);
        return placed;
    };
    const hp = (eventId, value) => {
        const bar = barOf(eventId);
        if (!bar) return false;
        bar.currentHp = bar.targetHp = Math.max(0, Number(value));
        bar.refresh?.();
        return true;
    };
    const hit = (eventId, options = {}) => {
        const bar = barOf(eventId);
        if (!bar) return { ok: false, reason: "noBar" };
        const args = { eventId: String(eventId), value: String(-Math.max(1, Math.ceil(bar.currentHp))), exceedMaxHealth: "false" };
        if (options.attacker !== undefined) args.projectRAttacker = String(options.attacker);
        else args.projectRAttacker = "player";
        const interpreter = new Game_Interpreter();
        PluginManager.callCommand(interpreter, ENGINE, "UpdateEventHp", args);
        return { ok: true, hp: bar.currentHp };
    };
    const wall = (x, y, regionId) => {
        const m = $dataMap, size = m.width * m.height, index = 5 * size + y * m.width + x;
        const old = m.data[index];
        m.data[index] = regionId;
        return old;
    };
    root.ProjectRSoulTest = Object.freeze({
        layout, hp, hit, wall,
        state: () => ({
            windows: root.ProjectRHermesPsychopomp.getWindows(), buff: root.ProjectRHermesPsychopomp.getBuff(), souls: root.ProjectRSoulCollection.list(),
            kills: root.ProjectRHermesPsychopomp.getKillLog(), ignored: root.ProjectRHermesPsychopomp.getIgnored(), heals: root.ProjectRHermesPsychopomp.getHealLog(),
            attribution: root.ProjectRKillAttribution.diagnostics(), soulStats: root.ProjectRSoulCollection.diagnostics(), psycho: root.ProjectRHermesPsychopomp.diagnostics()
        })
    });
})();
