/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘 入力: ATTACKのカード枠1〜5=Q/W/E/R/T、通常攻撃=左クリック(戦闘エリアの中だけ)、銃は自動リロード。SOUL戦闘の間だけ働きます。
 * @author ProjectR
 * @base ProjectR_SoulBattle
 * @base ProjectR_CardBattleInput
 * @orderAfter ProjectR_CardBattleInput
 * @orderAfter ProjectR_GunSystem
 * @orderAfter ProjectR_ApolloLyreRhythm
 * @orderAfter ProjectR_SwordSystem
 * @orderAfter ProjectR_SoulBattle
 * @orderAfter ProjectR_SoulBattleStage
 *
 * @help
 * ProjectR_SoulBattleInput.js
 *
 * SOUL戦闘(ProjectRSoulBattle が動いている間)だけ、操作を次のとおりにします。通常のマップ・通常のカード戦闘の操作(Q/E/X/C/V・J・R=リロード・WASD)は一切変えません。
 * 承認元: docs/spece/ProjectR_SOUL戦闘_スキル再設計テンプレート_20261106.xlsx「入力・HUD確認事項」項目1(QWERT・リロードは自動)・項目2(左クリック)。
 *
 * 【操作表】
 *   ATTACK   カード枠1〜5 = Q / W / E / R / T(左から)  通常攻撃(剣・銃) = マウス左クリック  照準 = マウスカーソル
 *   DEFENSE  カード・スキル・通常攻撃はすべて使えません。自ハートはマウスで動かします(ProjectR_SoulBattleStage)。Q/W/E/R/Tを押しても何も起きません。
 *   旧キー   X / C / V は SOUL中は何もしません(スロットを二重に呼ばないため)。J・ゲームパッドの攻撃ボタンは SOUL中は通常攻撃になりません。
 *
 * 【カードのキー】 物理キー Q/W/E/R/T を、既存の ProjectR_CardBattleInput が受け取る「スロット1〜5のキー」へ読み替えて渡します(CardBattleInput 自体は変えません)。
 *   押下時間つきのカード(長押し)・押しっぱなしの扱い・キーを離した時の取消は、これまでと同じです。ATTACK中に押して、DEFENSE中に離しても、取り残しません。
 *   W は移動(上)、R は銃のリロードにも使われますが、SOUL中は読み替えたキーだけがゲームへ渡るので、移動・手動リロードは起きません。
 *
 * 【通常攻撃 = 左クリック】 Hendrixの攻撃ボタン(共通イベント1)が受理されたときの予約を、次の条件のときだけ通します。
 *   ・左クリックが押された(J・ゲームパッド・他の予約は通さない)
 *   ・クリックが戦闘エリアの中(専用ステージの16:9の長方形)。外のクリックは無視。アリーナ(stage:false)は画面全体
 *   ・メニューボタン・開いているウィンドウ・登録したUI領域の上ではない(UIのクリックは攻撃にしない)
 *   ・入力を受け付けられる状態(会話・イベント・メニュー中ではない)
 *   竪琴の音符を選んでいる間は、本来のとおり左クリックが音符の選択になり、剣・銃は同時に動きません(既存の ProjectR_ApolloLyreRhythm の規則のまま)。
 *
 * 【銃】 SOUL中は、弾が尽きたら(空撃ちを待たずに)自動でリロードします。リロードのキー(R)はカード枠4に使います。弾薬・リロード時間・ダメージは変えません。
 *
 * 公開API: ProjectRSoulInput
 *   getKeyLabels() ["Q","W","E","R","T"] / isActive() / getStats() / mapKey(code) / attackVerdict() / registerUiRegion(fn) / unregisterUiRegion(fn)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const VERSION = "0.1.0";
    const LABELS = Object.freeze(["Q", "W", "E", "R", "T"]);
    // 物理キー → CardBattleInput が受け取るスロットのキー(Q/E/X/C/V の順)。keyCode は文字コード。
    const SLOT_KEYS = Object.freeze(["Q", "E", "X", "C", "V"]);
    const PHYSICAL = Object.freeze(LABELS.map((label, i) => ({ label, code: "Key" + label, keyCode: label.charCodeAt(0), slot: i, to: Object.freeze({ code: "Key" + SLOT_KEYS[i], keyCode: SLOT_KEYS[i].charCodeAt(0), key: SLOT_KEYS[i].toLowerCase() }) })));
    const OLD_ONLY = Object.freeze(["KeyX", "KeyC", "KeyV"]);                // 旧キー(新しい割当に無いもの)。SOUL中は何もしない
    const stats = { translated: 0, swallowedOld: 0, swallowedDefense: 0, swallowedPrepare: 0, attacksAllowed: 0, attacksDenied: {}, autoReloads: 0 };
    const uiRegions = [];
    const forwarded = new Set();                                              // ATTACK中に押されてCardBattleInputへ渡したキー(離した時に必ず同じ読み替えで渡す)

    const soul = () => root.ProjectRSoulBattle;
    const active = () => { try { return !!soul()?.isActive?.(); } catch (_error) { return false; } };
    const phase = () => { try { return soul()?.getPhase?.() || null; } catch (_error) { return null; } };
    const codeOf = event => {
        if (!event) return "";
        if (typeof event.code === "string" && event.code) return event.code;
        const k = Number(event.keyCode);
        return k >= 65 && k <= 90 ? "Key" + String.fromCharCode(k) : "";
    };
    const mapKey = code => PHYSICAL.find(p => p.code === code) || null;
    const hasModifier = event => !!(event && (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey));
    const translated = (event, to) => ({
        type: event.type, code: to.code, key: to.key, keyCode: to.keyCode, which: to.keyCode, repeat: !!event.repeat,
        ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, isComposing: !!event.isComposing, target: event.target,
        get defaultPrevented() { return !!event.defaultPrevented; },
        preventDefault() { try { event.preventDefault?.(); } catch (_error) { /* 表示のみ */ } },
        stopPropagation() { try { event.stopPropagation?.(); } catch (_error) { /* 表示のみ */ } }
    });

    // ---------------------------------------------------------------- キー ----------------------------------------------------------------
    if (typeof Input !== "undefined") {
        const _down = Input._onKeyDown;
        Input._onKeyDown = function(event) {
            if (!active() || hasModifier(event)) return _down.call(this, event);
            const code = codeOf(event), p = mapKey(code);
            if (p) {
                if (phase() !== "attack") {                                                                                                      // DEFENSE / PREPARE: 何も渡さない(移動・リロード・カードも起きない)
                    if (phase() === "prepare") stats.swallowedPrepare++; else stats.swallowedDefense++;
                    try { event.preventDefault?.(); } catch (_error) { /* 表示のみ */ }
                    return undefined;
                }
                if (!event.repeat) stats.translated++;
                forwarded.add(code);
                return _down.call(this, translated(event, p.to));
            }
            if (OLD_ONLY.includes(code)) { stats.swallowedOld++; return undefined; }
            return _down.call(this, event);
        };
        const _up = Input._onKeyUp;
        Input._onKeyUp = function(event) {
            const code = codeOf(event), p = mapKey(code);
            if (p && forwarded.delete(code)) return _up.call(this, translated(event, p.to));          // ATTACK中に押したキーは、いつ離しても同じ読み替えで渡す
            if (active() && (p || OLD_ONLY.includes(code))) return undefined;
            return _up.call(this, event);
        };
    }

    // ---------------------------------------------------------------- 通常攻撃 = 左クリック ----------------------------------------------------------------
    const attackCommonEventId = () => root.ProjectRCombatPresence?.settings?.attackCommonEventId ?? 1;
    const boundsContain = (object, point) => {
        try { const b = object.getBounds(); return point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height; } catch (_error) { return false; }
    };
    const uiHit = screen => {
        const scene = typeof SceneManager !== "undefined" ? SceneManager._scene : null;
        try {
            const button = scene?._menuButton;
            if (button && button.visible !== false && button.renderable !== false && boundsContain(button, screen)) return "menuButton";
            for (const child of scene?._windowLayer?.children || []) {
                if (child && child.visible !== false && (child.openness === undefined || child.openness > 0) && boundsContain(child, screen)) return "window";
            }
        } catch (_error) { /* 判定できなければUIではない扱い */ }
        for (const region of uiRegions) { try { if (region(screen)) return "region"; } catch (_error) { /* 登録側のエラーは無視 */ } }
        return null;
    };
    const attackVerdict = () => {
        const deny = reason => ({ ok: false, reason });
        if (typeof TouchInput === "undefined" || !TouchInput.isTriggered()) return deny("notClick");     // J・ゲームパッド・他のpluginの予約
        const x = TouchInput.x, y = TouchInput.y;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return deny("noPosition");
        let screen = { x, y };
        const stage = root.ProjectRSoulStage;
        if (stage?.isActive?.()) {                                                                         // 専用ステージ: TouchInput は「ステージ座標」。画面座標へ戻して、戦闘エリアの中か見る
            screen = stage.toScreen(x, y);
            const vp = stage.getViewport();
            if (!vp || !(screen.x >= vp.x && screen.x < vp.x + vp.w && screen.y >= vp.y && screen.y < vp.y + vp.h)) return deny("outsideArea");
        }
        let menuClick = false;
        try { menuClick = !!root.ProjectRSoulPrepare?.consumedClick?.(); } catch (_error) { menuClick = false; }
        if (menuClick) return deny("menuClick");                                                          // 準備メニューが今のフレームで使ったクリックは、通常攻撃にしない
        const ui = uiHit(screen);
        if (ui) return deny("ui:" + ui);
        const blocked = root.ProjectRCardBattleInput?.getBlockedReason?.();
        if (blocked) return deny("blocked:" + blocked);
        return { ok: true, reason: null, screen };
    };
    if (typeof Game_Temp !== "undefined") {
        const _reserve = Game_Temp.prototype.reserveCommonEvent;
        Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
            // DEFENSE と PREPARE(ATTACK 以外)は ProjectR_SoulBattle が、通常攻撃・カード・スキルをすべて遮断する(その遮断の数・規則はそちらのまま)。ここでは ATTACK の左クリックだけを選ぶ
            // (準備メニューのクリックも、ここでは通常攻撃として扱わない: phase() が "attack" のときだけ判定する)
            if (active() && phase() === "attack" && Number(commonEventId) === Number(attackCommonEventId())) {
                const verdict = attackVerdict();
                if (!verdict.ok) { stats.attacksDenied[verdict.reason.split(":")[0]] = (stats.attacksDenied[verdict.reason.split(":")[0]] || 0) + 1; return undefined; }
                stats.attacksAllowed++;
            }
            return _reserve.apply(this, arguments);
        };
    }

    // ---------------------------------------------------------------- 銃: 自動リロード ----------------------------------------------------------------
    if (typeof Game_Map !== "undefined") {
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            const result = _update.apply(this, arguments);
            if (sceneActive && !this.eventsPaused && active()) {
                try {
                    const gun = root.ProjectRGunSystem, st = gun?.status?.();
                    if (st && st.equipped && st.capacity > 0 && st.ammo <= 0 && !st.reloading && st.reserve > 0) {
                        const r = gun.requestReload("auto");
                        if (r?.ok) stats.autoReloads++;
                    }
                } catch (_error) { /* 入力を止めない */ }
            }
            return result;
        };
    }

    // SOULが終わったら、押しっぱなしの記録とキー状態を捨てる(通常の操作へ持ち越さない)
    root.ProjectRSoulBattle?.onEnd?.(() => { forwarded.clear(); try { Input.clear(); } catch (_error) { /* 表示のみ */ } });

    root.ProjectRSoulInput = Object.freeze({
        VERSION, LABELS,
        getKeyLabels: () => [...LABELS],
        isActive: active,
        getStats: () => ({ ...stats, attacksDenied: { ...stats.attacksDenied }, held: forwarded.size }),
        mapKey: code => { const p = mapKey(code); return p ? { label: p.label, slot: p.slot } : null; },
        attackVerdict,
        registerUiRegion: fn => { if (typeof fn === "function" && !uiRegions.includes(fn)) uiRegions.push(fn); },
        unregisterUiRegion: fn => { const i = uiRegions.indexOf(fn); if (i >= 0) uiRegions.splice(i, 1); }
    });
})();
