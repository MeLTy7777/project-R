/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘 I3 専用バトルHUD。SOUL戦闘の間だけ、通常のアクションHUDを隠して専用の戦闘画面表示に切り替えます(表示のみ)。
 * @author ProjectR
 * @base ProjectR_SoulBattle
 * @orderAfter ProjectR_SoulBattle
 * @orderAfter ProjectR_BattleHUD
 * @orderAfter ProjectR_CombatExtrasHUD
 * @orderAfter ProjectR_SoulBattleSandbox
 *
 * @help
 * ProjectR_SoulBattleHUD.js
 *
 * ProjectRSoulBattle(P1コントローラ)が動いている間(attack / defense)だけ、次の表示に切り替えます。
 * 通常のマップ戦闘・ボス戦(SOULでないもの)には一切影響しません。
 *
 * 表示(すべて既存の実行中APIを読むだけ。HP・時間・デッキ・フェーズの状態はこのプラグインに持ちません):
 *   ・暗転: マップの地面だけを暗くします(キャラ・ハート・弾・当たり判定は暗くしません。タイルマップの中に挿入)。
 *   ・上: ATTACK / DEFENSE とフェーズの残り時間(ProjectRSoulBattle.getState)、ボス名・フェーズ(ProjectRBossFramework.getHudState)。
 *         敵のHPバーとHPの数値は表示しません(仕様 BT-065。承認済み)。HPの値そのもの(getViewModel)は読めます。
 *   ・下: プレイヤーHP(先頭アクター)、手札5枚(Q/W/E/R/T)= カード名(日本語)・Level・Cooldown(ProjectRCardDeck)、山札/捨て札/Cooldown枚数。
 *   ・攻撃ターン: プレイヤーと敵ハートを囲む戦闘エリアの枠(本物のハート・照準・当たり判定はマップ上のまま)。
 *   ・防御ターン: 画面中央に「バトルボックス」の予約レイアウトだけを表示します(プレイヤーのハート操作・弾幕は未実装)。
 *   ・パネルが本物のハート/プレイヤーと重なると、そのパネルは自動で薄くなります。
 *
 * 隠す通常HUD(開始時の renderable を記録し、終了・中断・外部終了・マップ移動で元の値へ戻します。visible・セーブ項目は触りません):
 *   ProjectR_BattleHUD(プレイヤー/武器/カード/Ultimate/ボス/仲間の表示一式)、Hendrix Hotbar、Hendrix HUD、
 *   敵のHPバー(Hendrix)、メニューボタン、P1コントローラの開発用ラベル。無いプラグインは自動で無視します。
 *
 * 公開API(Console / F8):
 *   ProjectRSoulBattleHUD.isActive()      今 専用HUDが有効か(= SOUL戦闘中か)
 *   ProjectRSoulBattleHUD.getViewModel()  HUDが今描いている値のコピー(読み取り専用)
 *   ProjectRSoulBattleHUD.getState()      有効/無効・隠している対象の数・暗転/レイヤーの状態(診断用)
 *   ProjectRSoulBattleHUD.setEnabled(b)   専用HUDの有効/無効(その実行中だけ。既定は有効。DEV用)
 *
 * 範囲外(別フェーズ): プレイヤーのハート操作・敵の弾幕・防御ターンの当たり判定。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const VERSION = "0.1.0";
    const BASE_W = 1920, BASE_H = 1080;
    // SOUL戦闘のカード枠1〜5のキー(ProjectR_SoulBattleInput が定義: Q/W/E/R/T)。無ければ同じ既定値
    const CARD_KEYS = (() => { try { const l = root.ProjectRSoulInput?.getKeyLabels?.(); if (Array.isArray(l) && l.length === 5) return l.map(String); } catch (error) { /* 既定へ */ } return ["Q", "W", "E", "R", "T"]; })();
    const MOVEMENT_CATEGORIES = ["movement"];            // ProjectR_SoulBattle と同じ(SOUL中は発動を受け付けない分類)
    const SPRITE_Z = 2;                                  // タイルマップ内の並び: 下の地面(0)・下優先のキャラ(1)の上、通常優先のキャラ(3)の下
    const COLORS = Object.freeze({
        panel: "rgba(6,10,20,0.86)", panelEdge: "#59d7ff", edgeDim: "#2a5b73", text: "#e6eef9", muted: "#8493a8", gold: "#f4c650",
        attack: "#2fb36f", attackDark: "#0e3a26", prepare: "#4a8bd6", mana: "#8f9bff", defense: "#e0475a", defenseDark: "#401018", hpBoss: "#e8505b", hpBossBack: "#2a0e14",
        hpPlayer: "#59d7ff", hpPlayerLow: "#e0475a", hpBack: "#0e1b2a", dim: "rgba(3,5,14,0.6)", lock: "rgba(0,0,0,0.55)"
    });

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const num = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
    const api = name => { try { const t = root[name]; return t && typeof t === "object" ? t : null; } catch (error) { return null; } };
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (error) { return fallback; } };
    const humanize = id => String(id || "").replace(/^[a-z0-9]+_/i, "").replace(/_/g, " ").toUpperCase();
    // カード名: カード管理ワークブックの「カード名」(data/ProjectR_CardBalance.json が同じ名前を持つ)。通常のHUD(BattleHUD)が日本語の名前を持たないカードは、英字のIDから作った名前ではなくこの名前を出す
    let workbookNames = null;
    const workbookName = id => {
        if (!workbookNames) {
            const data = safe(() => api("ProjectRCardBalance")?.defaultsSnapshot?.(), null);
            if (!data?.cards) return "";
            workbookNames = {};
            for (const [key, card] of Object.entries(data.cards)) if (card && typeof card.name === "string") workbookNames[key] = card.name;
        }
        return workbookNames[id] || "";
    };
    const cardName = (id, presentation) => {
        const shown = presentation?.name;
        if (shown && /[^\u0000-\u007f]/.test(shown)) return shown;                 // 日本語の名前(スキル名・上書き)があればそれ
        return workbookName(id) || shown || humanize(id);
    };

    let enabled = true;
    let heartPeak = 0;                                   // 表示専用のメモ: ボス(BossFramework)が無いときのハートHPの最大値(ゲームの状態ではない)
    let activeScene = null;                              // 隠している対象を持つシーン
    const hidden = [];                                   // { obj, prev }  隠した対象と元の renderable
    const runtime = { active: false, frame: 0, model: null, modelFrame: -999, activations: 0, restores: 0, lastReason: "", lastError: "", failed: false };   // failed: この戦闘中に表示で例外が出た(以後その戦闘では専用HUDを止める)

    // ---------------------------------------------------------------- 山札の動き(引く・使う・Cooldownが終わる・シャッフル)を見えるようにする ----------------------------------------------------------------
    // 山札の規則そのものは変えない(CardDeckCore のまま)。ここでは、前回との差から「何が起きたか」を読み取って、しばらく強調して見せるだけ。
    //   使う   : 手札のカードが減る → Cooldown の山へ         引く : 手札に新しいカードが入る(山札から)
    //   戻る   : Cooldown が終わる → 捨て札へ                  シャッフル : 山札が空のとき、捨て札を混ぜて山札に戻す(引いた数より山札が増えたことで分かる)
    const WATCH_FRAMES = 100;
    const watch = { prev: null, events: [], flash: { draw: 0, cooldown: 0, discard: 0 }, shuffle: 0, shuffleCount: 0, fresh: new Map() };
    const resetWatch = () => { watch.prev = null; watch.events = []; watch.flash = { draw: 0, cooldown: 0, discard: 0 }; watch.shuffle = 0; watch.shuffleCount = 0; watch.fresh.clear(); };
    const pushEvent = (frame, type, text) => { watch.events.push({ type, text, until: frame + WATCH_FRAMES }); if (watch.events.length > 4) watch.events.shift(); };
    const observeDeck = (battle, frame) => {
        if (!battle) { watch.prev = null; return; }
        if (battle.soulFixed) { watch.prev = null; watch.events = []; watch.fresh.clear(); return; }      // 固定手札(準備ループ): 引く・混ぜる動きは無い。確定で入れ替わった手札を「NEW」「回復」と見せない
        const nameOf = id => cardName(id, safe(() => api("ProjectRBattleHUD")?.getCardPresentation?.(id), null));
        const cur = { hand: (battle.hand || []).map(c => ({ id: c.instanceId, cardId: c.cardId })), draw: battle.drawPile?.length || 0, discard: battle.discardPile?.length || 0, cooldown: battle.cooldownPile?.length || 0 };
        const prev = watch.prev;
        watch.prev = cur;
        if (!prev) return;
        const prevIds = new Set(prev.hand.map(c => c.id)), curIds = new Set(cur.hand.map(c => c.id));
        const drawn = cur.hand.filter(c => !prevIds.has(c.id)), used = prev.hand.filter(c => !curIds.has(c.id));
        for (const c of used) { pushEvent(frame, "use", "使用: " + nameOf(c.cardId) + " → クールダウンへ"); watch.flash.cooldown = frame + WATCH_FRAMES; }
        for (const c of drawn) { pushEvent(frame, "draw", "引いた: " + nameOf(c.cardId)); watch.flash.draw = frame + WATCH_FRAMES; watch.fresh.set(c.id, frame + WATCH_FRAMES); }
        const shuffled = cur.draw - (prev.draw - drawn.length);                       // 引いた分だけ減るはずの山札が、増えていたらシャッフルした
        if (shuffled > 0) { watch.shuffle = frame + WATCH_FRAMES; watch.shuffleCount = shuffled; watch.flash.draw = frame + WATCH_FRAMES; watch.flash.discard = frame + WATCH_FRAMES; pushEvent(frame, "shuffle", "シャッフル: 捨て札" + shuffled + "枚 → 山札"); }
        const back = prev.cooldown + used.length - cur.cooldown;                      // Cooldown から出た枚数(捨て札へ)
        if (back > 0) { watch.flash.discard = frame + WATCH_FRAMES; pushEvent(frame, "return", "回復: " + back + "枚 → 捨て札"); }
        for (const [id, until] of [...watch.fresh]) if (until <= frame) watch.fresh.delete(id);
    };
    const watchView = frame => {
        const f = watch.flash;
        const events = watch.events.filter(e => e.until > frame);
        return { flash: { draw: f.draw > frame, cooldown: f.cooldown > frame, discard: f.discard > frame }, shuffle: watch.shuffle > frame, shuffleCount: watch.shuffleCount, last: events.length ? events[events.length - 1].text : "" };
    };

    // ---------------------------------------------------------------- ビューモデル(既存APIの読み取りだけ) ----------------------------------------------------------------
    const buildHand = (phase, cacheFrame) => {
        const deck = api("ProjectRCardDeck");
        const battle = safe(() => deck?.getBattleState?.(), null);
        const hudApi = api("ProjectRBattleHUD");
        const persistent = safe(() => deck?.getPersistentData?.(), null);
        const cooling = new Map();
        for (const entry of (battle?.cooldownPile || [])) {
            const id = entry?.instance?.cardId;
            const remaining = num(entry?.remainingSeconds, 0);
            if (id && (!cooling.has(id) || remaining < cooling.get(id))) cooling.set(id, remaining);
        }
        const hand = battle?.hand || [];
        const manaApi = api("ProjectRSoulMana");
        const manaState = battle?.soulFixed ? safe(() => manaApi?.getState?.(), null) : null;      // 固定手札(準備ループ): カードの消費はマナ(承認済みのD8コスト)
        const fixed = battle?.soulFixed || null;                                // 準備ループで確定した5枠(ProjectR_SoulLoopHand)。カードは手札に残り、使った枠だけ待ち時間が付く
        const slots = CARD_KEYS.map((key, index) => {
            const card = hand[index];
            if (!card) return { key, empty: true, cardId: "", name: "", level: 0, cooldownSeconds: 0, cooling: 0, state: "empty", category: "", fresh: false };
            const id = card.cardId;
            const def = safe(() => deck?.definitions?.card?.(id), null);
            const presentation = safe(() => hudApi?.getCardPresentation?.(id), null);
            const owned = persistent?.cardOwnership?.[id];
            const usable = safe(() => deck?.canUseCard?.(id), true) !== false;
            const category = def?.category || "";
            let state = "ready";
            if (phase === "defense") state = "locked";
            else if (phase === "prepare") state = "prepare";                    // 準備中: カードは使えない(「準備中」と表示)
            else if (MOVEMENT_CATEGORIES.includes(category)) state = "moveLock";
            else if (!usable) state = "unavailable";
            // マナ制: 各枠に実際の消費マナ(割引後)を出し、足りない枠は「マナ不足」にする(クールダウンは使わない)
            let cost = null, baseCost = null;
            if (fixed && manaState && manaState.active) {
                baseCost = safe(() => manaApi.costOf(id), null);
                cost = safe(() => manaApi.effectiveCost(id), null);
                if (state === "ready") { if (cost === null) state = "noCost"; else if (num(manaState.available) + 1e-9 < cost) state = "lowMana"; }
            }
            return {
                key, empty: false, cardId: id, name: cardName(id, presentation), level: num(owned?.level, 0),
                cooldownSeconds: num(def?.cooldownSeconds, 0), cooling: fixed ? 0 : (cooling.has(id) ? cooling.get(id) : 0), state, category, cost, baseCost,
                fresh: watch.fresh.has(card.instanceId) && watch.fresh.get(card.instanceId) > runtime.frame        // 引いたばかりのカード(しばらく NEW)
            };
        });
        const counts = battle ? { draw: battle.drawPile?.length || 0, discard: battle.discardPile?.length || 0, cooldown: fixed ? (fixed.slotCooldowns || []).filter(v => v > 0).length : (battle.cooldownPile?.length || 0) } : null;
        return { slots, counts, cardBattle: !!battle, battle };
    };

    const buildBoss = soulState => {
        const hud = safe(() => api("ProjectRBossFramework")?.getHudState?.(), null);
        if (hud) {
            return { source: "bossFramework", name: String(hud.name || "BOSS"), hp: num(hud.hp), maxHp: Math.max(1, num(hud.maxHp, 1)), ratio: clamp(num(hud.ratio), 0, 1),
                phaseLabel: String(hud.phaseLabel || ""), phaseIndex: num(hud.phaseIndex), phaseCount: num(hud.phaseCount) };
        }
        const poc = safe(() => api("ProjectRSoulBattlePoC")?.getState?.(), null);
        if (soulState?.heart?.expected && poc?.active && Number.isFinite(Number(poc.hp))) {
            heartPeak = Math.max(heartPeak, num(poc.hp));
            const max = Math.max(1, heartPeak);
            return { source: "heart", name: "SOUL", hp: num(poc.hp), maxHp: max, ratio: clamp(num(poc.hp) / max, 0, 1), phaseLabel: "", phaseIndex: 0, phaseCount: 0 };
        }
        return null;
    };

    const buildViewModel = () => {
        const soul = api("ProjectRSoulBattle");
        const st = safe(() => soul?.getState?.(), null);
        if (!st || !st.active) return null;
        const phase = st.phase === "defense" ? "defense" : st.phase === "prepare" ? "prepare" : "attack";      // 3つを明示(準備を防御や攻撃として扱わない)
        const total = Math.max(1, num(st.totalFrames, 1));
        const left = clamp(num(st.framesLeft, 0), 0, total);
        const leader = safe(() => (typeof $gameParty !== "undefined" ? $gameParty.leader() : null), null);
        observeDeck(safe(() => api("ProjectRCardDeck")?.getBattleState?.(), null), runtime.frame);
        const hand = buildHand(phase);
        return {
            phase, round: num(st.round, 1), secondsLeft: left / 60, phaseRatio: left / total,
            boss: buildBoss(st),
            mana: safe(() => { const m = api("ProjectRSoulMana")?.getState?.(); return m && m.active ? { current: num(m.current), whole: num(m.whole), max: num(m.max, 10), ratio: clamp(num(m.ratio), 0, 1), regenerating: !!m.regenerating, reason: String(m.reason || ""), attack: m.phase === "attack" } : null; }, null),
            player: { name: leader ? String(leader.name()) : "PLAYER", hp: leader ? num(leader.hp) : 0, maxHp: leader ? Math.max(1, num(leader.mhp, 1)) : 1 },
            hand: hand.slots, counts: hand.counts, cardBattle: hand.cardBattle, deck: hand.counts ? watchView(runtime.frame) : null
        };
    };

    // ---------------------------------------------------------------- 通常HUDを隠す / 元へ戻す ----------------------------------------------------------------
    const hide = obj => {
        if (!obj || typeof obj !== "object" || !("renderable" in obj)) return false;
        if (hidden.some(entry => entry.obj === obj)) { obj.renderable = false; return true; }   // 二重に記録しない(元の値を上書きしない)
        hidden.push({ obj, prev: obj.renderable });
        obj.renderable = false;
        return true;
    };
    const conflictingTargets = scene => {
        const list = [];
        const spriteset = scene?._spriteset;
        list.push(scene?._projectRBattleHudLayer, scene?._skillUI, scene?._menuButton);
        for (const hud of (Array.isArray(scene?.hendrixHuds) ? scene.hendrixHuds : [])) list.push(hud?.container || hud);
        for (const bar of (Array.isArray(spriteset?._eventHpBars) ? spriteset._eventHpBars : [])) list.push(bar);
        for (const child of (Array.isArray(spriteset?.children) ? spriteset.children : [])) if (child?._projectRSoulBattleLabel) list.push(child);
        return list;
    };
    const restoreHidden = reason => {
        let count = 0;
        while (hidden.length) {
            const entry = hidden.pop();
            try { entry.obj.renderable = entry.prev; count++; } catch (error) { /* 破棄済みの表示物は無視 */ }
        }
        if (count) { runtime.restores++; runtime.lastReason = reason || ""; }
        return count;
    };

    // ---------------------------------------------------------------- 描画部品(Bitmapだけ) ----------------------------------------------------------------
    const newBitmap = (w, h) => new Bitmap(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
    const chamfer = (bitmap, w, h, c) => {              // 角を斜めに削る(左上と右下)
        for (let i = 0; i < c; i++) { bitmap.clearRect(0, i, c - i, 1); bitmap.clearRect(w - (c - i), h - 1 - i, c - i, 1); }
    };
    const drawPanel = (bitmap, w, h, edge, fill) => {
        bitmap.clear();
        bitmap.fillRect(0, 0, w, h, edge || COLORS.panelEdge);
        bitmap.clearRect(2, 2, w - 4, h - 4);
        bitmap.fillRect(2, 2, w - 4, h - 4, fill || COLORS.panel);
        chamfer(bitmap, w, h, 14);
    };
    const text = (bitmap, value, x, y, w, h, size, color, align, outline) => {
        bitmap.fontSize = size;
        bitmap.textColor = color || COLORS.text;
        bitmap.outlineColor = "rgba(0,0,0,0.85)";
        bitmap.outlineWidth = outline === undefined ? 4 : outline;
        bitmap.drawText(String(value), x, y, w, h, align || "left");
    };
    const bar = (bitmap, x, y, w, h, ratio, color, back) => {
        bitmap.fillRect(x, y, w, h, "#d8e4f2");
        bitmap.fillRect(x + 2, y + 2, w - 4, h - 4, back || COLORS.hpBack);
        const fill = Math.round((w - 4) * clamp(ratio, 0, 1));
        if (fill > 0) bitmap.fillRect(x + 2, y + 2, fill, h - 4, color);
    };
    // 署名が変わったときだけ描き直すSprite
    class Panel extends Sprite {
        constructor(w, h) { super(newBitmap(w, h)); this._w = w; this._h = h; this._sig = ""; this._fade = 1; }
        redraw(signature, draw) {
            if (signature === this._sig) return;
            this._sig = signature;
            draw(this.bitmap, this._w, this._h);
        }
        fadeTo(target) { this._fade += (target - this._fade) * 0.25; if (Math.abs(this._fade - target) < 0.01) this._fade = target; this.alpha = this._fade; }
    }

    const PANELS = Object.freeze({
        state: { x: 24, y: 14, w: 312, h: 84 },
        mana: { x: 348, y: 66, w: 300, h: 44 },                  // マナ(準備ループの SOUL だけ。ProjectRSoulMana の読み取り表示。フェーズのチップの下)
        phase: { x: 348, y: 14, w: 300, h: 46 },                 // ボスのフェーズ(形態)の小さなチップ。ボス名のパネルは無い(ボスの絵を大きく出すため)
        player: { x: 24, y: 900, w: 300, h: 156 },
        cards: { x: 344, y: 884, w: 1230, h: 176 },
        counts: { x: 1596, y: 900, w: 300, h: 156 }
    });
    const CARD_W = 238, CARD_H = 176, CARD_GAP = 10;
    const BOX = Object.freeze({ x: 560, y: 250, w: 800, h: 420 });

    class Layer extends Sprite {
        constructor() {
            super();
            this._projectRSoulHudLayer = true;
            this._lastScaleX = 0; this._lastScaleY = 0;
            this.panels = {};
            for (const [key, r] of Object.entries(PANELS)) { const p = new Panel(r.w, r.h); p.x = r.x; p.y = r.y; this.panels[key] = p; this.addChild(p); }
            this.cardPanels = CARD_KEYS.map((key, i) => { const p = new Panel(CARD_W, CARD_H); p.x = PANELS.cards.x + 0 + i * (CARD_W + CARD_GAP); p.y = PANELS.cards.y; this.addChild(p); return p; });
            this.box = new Panel(BOX.w, BOX.h); this.box.x = BOX.x; this.box.y = BOX.y; this.addChild(this.box);
            this.corners = [0, 1, 2, 3].map(i => { const s = new Sprite(newBitmap(64, 64)); s._corner = i; this.hudDrawCorner(s.bitmap, i); this.addChild(s); return s; });
            this.frameRect = null;
            this.visible = false;
        }
        hudDrawCorner(bitmap, i) {                          // 角の L 字(0:左上 1:右上 2:左下 3:右下)
            const t = 5, l = 56, c = COLORS.panelEdge;
            const horizontalX = (i === 0 || i === 2) ? 0 : 64 - l, verticalX = (i === 0 || i === 2) ? 0 : 64 - t;
            const horizontalY = (i === 0 || i === 1) ? 0 : 64 - t, verticalY = (i === 0 || i === 1) ? 0 : 64 - l;
            bitmap.fillRect(horizontalX, horizontalY, l, t, c);
            bitmap.fillRect(verticalX, verticalY, t, l, c);
        }
        hudUpdateScale() {
            const sx = (typeof Graphics !== "undefined" && Graphics.width ? Graphics.width : BASE_W) / BASE_W;
            const sy = (typeof Graphics !== "undefined" && Graphics.height ? Graphics.height : BASE_H) / BASE_H;
            if (sx === this._lastScaleX && sy === this._lastScaleY) return false;
            this._lastScaleX = sx; this._lastScaleY = sy;
            this.scale.set(sx, sy);
            return true;
        }
        // 注意: PIXI/MZ の Sprite・Container が持つ名前(render, updateFrame, updateTransform ...)を上書きしない。独自メソッドは hud~ で始める。
        update() { /* 描画は refresh() がシーンの update の後で行う(通常HUDを隠す順序を保つため) */ }

        // 本物のプレイヤー/ハートの画面位置(基準1920x1080座標)
        // stage = ProjectRSoulStage の映し方の最中。プレイヤーは描かれないので点に含めず、マップ座標は画面座標(戦闘エリアの拡大縮小後)へ直す。
        hudEntityPoints(stage) {
            const points = [];
            const sx = this._lastScaleX || 1, sy = this._lastScaleY || 1;
            const toScreen = (x, y) => (stage ? stage.toScreen(x, y) : { x, y });
            if (!stage) {
                const player = safe(() => (typeof $gamePlayer !== "undefined" && $gamePlayer ? { x: $gamePlayer.screenX(), y: $gamePlayer.screenY() - 24 } : null), null);
                if (player) points.push({ x: player.x / sx, y: player.y / sy, kind: "player" });
            }
            const heartId = safe(() => api("ProjectRSoulBattle")?.getState?.()?.heart?.eventId, null);
            const heart = heartId ? safe(() => { const e = $gameMap.event(heartId); return e && !e._erased ? toScreen(e.screenX(), e.screenY() - 24) : null; }, null) : null;
            if (heart) points.push({ x: heart.x / sx, y: heart.y / sy, kind: "heart" });
            return points;
        }

        hudDrawModel(model) {
            const attack = model.phase === "attack", prepare = model.phase === "prepare";
            const stateColor = prepare ? COLORS.prepare : attack ? COLORS.attack : COLORS.defense;
            const panels = this.panels;
            // 状態チップ(PREPARE / ATTACK / DEFENSE・残り時間)。準備は時間で進まないので、秒数もバーも出さない(「選択待ち」)。
            const seconds = Math.ceil(model.secondsLeft * 10) / 10;
            panels.state.redraw(JSON.stringify(["s", model.phase, prepare ? "-" : seconds.toFixed(1), model.round, prepare ? 0 : Math.round(model.phaseRatio * 100)]), (b, w, h) => {
                drawPanel(b, w, h, stateColor, prepare ? "rgba(10,22,44,0.9)" : attack ? "rgba(8,34,24,0.9)" : "rgba(40,10,16,0.9)");
                text(b, prepare ? "PREPARE" : attack ? "ATTACK" : "DEFENSE", 16, 4, 150, 40, 28, "#ffffff", "left");
                text(b, `R${model.round}`, 168, 12, 36, 28, 18, COLORS.muted, "left");
                if (prepare) { text(b, "選択待ち", 200, 10, 98, 34, 22, COLORS.gold, "right"); b.fillRect(16, 52, w - 32, 14, "#101820"); return; }
                text(b, `${seconds.toFixed(1)}s`, 200, 8, 98, 36, 26, COLORS.gold, "right");
                bar(b, 16, 52, w - 32, 14, model.phaseRatio, stateColor, "#101820");
            });
            // ボスのフェーズ(形態)だけ。ボス名のパネル・敵のHPバー・HPの数値は描かない(仕様 BT-065。ボスの絵は専用ステージが戦闘エリアの上に大きく出す)
            const boss = model.boss;
            panels.phase.visible = !!boss && boss.phaseCount > 1;
            if (panels.phase.visible) {
                panels.phase.redraw(JSON.stringify(["f", boss.phaseLabel, boss.phaseIndex, boss.phaseCount]), (b, w, h) => {
                    drawPanel(b, w, h, COLORS.edgeDim);
                    text(b, `${boss.phaseLabel}  (${boss.phaseIndex + 1}/${boss.phaseCount})`, 10, 4, w - 20, 36, 26, COLORS.gold, "center");
                });
            }
            // マナ(準備ループの SOUL のときだけ。現在値 / 上限と、端数まで見える細いバー。ATTACK 以外は 0 で薄く表示。表示のみ)
            const mana = model.mana;
            panels.mana.visible = !!mana;
            if (mana) {
                panels.mana.redraw(JSON.stringify(["m", Math.floor(mana.current * 20), mana.attack, mana.reason]), (b, w, h) => {
                    drawPanel(b, w, h, mana.attack ? COLORS.mana : COLORS.edgeDim, "rgba(10,12,34,0.9)");
                    text(b, "MANA", 14, 2, 92, 30, 22, mana.attack ? COLORS.mana : COLORS.muted, "left", 2);
                    text(b, `${mana.whole} / ${mana.max}`, 100, 0, w - 116, 34, 28, mana.attack ? "#ffffff" : COLORS.muted, "right");
                    bar(b, 14, h - 12, w - 28, 8, mana.ratio, mana.attack ? COLORS.mana : COLORS.edgeDim, "#101820");
                });
            }
            // プレイヤー
            const p = model.player;
            panels.player.redraw(JSON.stringify(["p", p.name, Math.ceil(p.hp), p.maxHp]), (b, w, h) => {
                drawPanel(b, w, h, COLORS.panelEdge);
                text(b, p.name, 18, 6, 260, 36, 26, "#ffffff", "left");
                text(b, "HP", 18, 56, 50, 34, 24, COLORS.gold, "left");
                bar(b, 70, 62, w - 90, 26, p.hp / p.maxHp, p.hp / p.maxHp <= 0.25 ? COLORS.hpPlayerLow : COLORS.hpPlayer);
                text(b, `${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`, 18, 96, w - 36, 40, 28, "#ffffff", "right");
            });
            // 手札5枚
            model.hand.forEach((slot, i) => {
                const panel = this.cardPanels[i];
                panel.redraw(JSON.stringify(["c", slot.key, slot.cardId, slot.level, slot.state, Math.round(slot.cooling * 10), slot.cost, slot.baseCost, !!slot.fresh]), (b, w, h) => {
                    const locked = slot.state !== "ready" && !slot.empty;
                    drawPanel(b, w, h, slot.empty ? COLORS.edgeDim : (locked ? COLORS.edgeDim : COLORS.panelEdge), slot.empty ? "rgba(6,10,20,0.6)" : COLORS.panel);
                    b.fillRect(14, 12, 46, 40, slot.empty || locked ? "#2b3a4c" : COLORS.panelEdge);
                    text(b, slot.key, 14, 12, 46, 40, 28, "#04101a", "center", 0);
                    if (slot.empty) { text(b, "—", 0, 60, w, 60, 40, COLORS.muted, "center"); return; }
                    if (slot.level > 0) text(b, `Lv${slot.level}`, w - 96, 12, 82, 36, 26, COLORS.gold, "right");
                    if (slot.fresh && !locked) { b.fillRect(70, 16, 70, 30, COLORS.attack); text(b, "NEW", 70, 14, 70, 32, 22, "#04101a", "center", 0); }   // 山札から引いたばかり
                    text(b, slot.name, 10, 62, w - 20, 40, 28, locked ? COLORS.muted : "#ffffff", "center");
                    if (locked) {
                        b.fillRect(2, 2, w - 4, h - 4, COLORS.lock);
                        const label = slot.state === "locked" ? "LOCK" : slot.state === "prepare" ? "準備中" : slot.state === "lowMana" ? "マナ不足" : slot.state === "noCost" ? "コスト未定義" : slot.state === "moveLock" ? "移動不可" : "使用不可";
                        text(b, label, 0, 100, w, 40, 28, slot.state === "locked" ? COLORS.defense : slot.state === "prepare" ? COLORS.prepare : (slot.state === "lowMana" || slot.state === "noCost") ? COLORS.defense : COLORS.gold, "center");
                    } else if (slot.cost === null || slot.cost === undefined) {
                        const cd = slot.cooldownSeconds > 0 ? `CD ${slot.cooldownSeconds}s` : "CD —";                       // 従来の SOUL(マナ制でない): クールダウン表示のまま
                        text(b, cd, 14, h - 36, 100, 28, 20, COLORS.muted, "left", 2);
                        if (slot.cooling > 0) text(b, `回復 ${slot.cooling.toFixed(1)}s`, 100, h - 36, w - 114, 28, 20, COLORS.panelEdge, "right", 2);
                    }
                    if (slot.cost !== null && slot.cost !== undefined) {                                                  // マナ制: 実際の消費マナ(割引があれば 元→割引後)
                        const off = slot.baseCost !== null && slot.baseCost !== slot.cost;
                        text(b, off ? `消費 ${slot.baseCost}→${slot.cost}` : `消費 ${slot.cost}`, 12, h - 38, w - 24, 30, 24, off ? COLORS.gold : (slot.state === "lowMana" ? COLORS.defense : COLORS.mana), "center", 2);
                    }
                });
            });
            // 山札など
            const counts = model.counts;
            const dk = model.deck;
            panels.counts.redraw(JSON.stringify(["n", counts, model.cardBattle, dk]), (b, w, h) => {
                drawPanel(b, w, h, dk && dk.shuffle ? COLORS.gold : COLORS.edgeDim);
                text(b, "DECK", 18, 4, 120, 30, 22, COLORS.gold, "left");
                if (!counts) { text(b, "カード戦闘なし", 18, 60, w - 36, 36, 22, COLORS.muted, "left"); return; }
                if (dk && dk.shuffle) { b.fillRect(150, 8, 134, 26, COLORS.gold); text(b, "SHUFFLE", 150, 6, 134, 28, 20, "#04101a", "center", 0); }
                // 山札 → 手札 → クールダウン → 捨て札 の順に、増減があった山をしばらく光らせる
                const rows = [["draw", "山札", "DRAW", counts.draw, COLORS.text], ["cooldown", "クールダウン", "COOLING", counts.cooldown, COLORS.panelEdge], ["discard", "捨て札", "DISCARD", counts.discard, COLORS.text]];
                rows.forEach(([key, jp, en, value, color], i) => {
                    const y = 36 + i * 28, lit = !!(dk && dk.flash[key]);
                    if (lit) b.fillRect(8, y, w - 16, 26, "rgba(244,198,80,0.28)");
                    text(b, jp, 18, y - 2, 150, 28, 21, lit ? COLORS.gold : color, "left", 3);
                    text(b, en, 150, y + 1, 80, 24, 15, COLORS.muted, "left", 2);
                    text(b, String(value), w - 66, y - 2, 52, 28, 24, lit ? COLORS.gold : color, "right", 3);
                });
                if (dk && dk.last) text(b, dk.last, 14, 124, w - 28, 26, 17, dk.shuffle ? COLORS.gold : COLORS.text, "left", 3);
                else text(b, "使う → クールダウン → 捨て札 → 山札", 14, 124, w - 28, 26, 15, COLORS.muted, "left", 2);
            });
            // 防御ターン: バトルボックスの予約レイアウトだけ
            this.box.visible = !attack && !this._stageOn;       // ステージ(ProjectRSoulStage)ではバトルボックスはステージ側が描く
            if (!attack && !this._stageOn) {
                this.box.redraw("box", (b, w, h) => {
                    b.clear();
                    b.fillRect(0, 0, w, h, COLORS.defense);
                    b.clearRect(5, 5, w - 10, h - 10);
                    b.fillRect(5, 5, w - 10, h - 10, "rgba(2,4,10,0.7)");
                    chamfer(b, w, h, 22);
                    for (let x = 24; x < w - 24; x += 28) { b.fillRect(x, 20, 14, 2, "rgba(224,71,90,0.5)"); b.fillRect(x, h - 22, 14, 2, "rgba(224,71,90,0.5)"); }
                    text(b, "DEFENSE", 0, 150, w, 70, 56, "#ffffff", "center");
                    text(b, "BATTLE BOX  (予約レイアウト)", 0, 226, w, 36, 24, COLORS.gold, "center");
                    text(b, "プレイヤーのハート操作と敵の弾幕は後続フェーズで実装されます", 0, 266, w, 30, 18, COLORS.muted, "center", 2);
                });
            }
        }

        // 攻撃ターンの戦闘エリア枠: プレイヤーと敵ハートを囲む(本物のハートはマップ上のまま。枠は飾りで当たり判定を持たない)
        hudUpdateFrame(points, attack) {
            const show = attack && points.length >= 1;
            for (const corner of this.corners) corner.visible = show;
            if (!show) { this.frameRect = null; return; }
            const pad = 96;
            let x0 = Math.min(...points.map(p => p.x)) - pad, x1 = Math.max(...points.map(p => p.x)) + pad;
            let y0 = Math.min(...points.map(p => p.y)) - pad, y1 = Math.max(...points.map(p => p.y)) + pad;
            x0 = clamp(x0, 16, BASE_W - 16); x1 = clamp(x1, 16, BASE_W - 16); y0 = clamp(y0, 110, BASE_H - 220); y1 = clamp(y1, 110, BASE_H - 220);
            if (x1 - x0 < 220) { const c = (x0 + x1) / 2; x0 = c - 110; x1 = c + 110; }
            if (y1 - y0 < 220) { const c = (y0 + y1) / 2; y0 = c - 110; y1 = c + 110; }
            const target = { x0, x1, y0, y1 };
            const f = this.frameRect = this.frameRect || target;
            for (const key of ["x0", "x1", "y0", "y1"]) f[key] += (target[key] - f[key]) * 0.2;
            const [tl, tr, bl, br] = this.corners;
            tl.x = f.x0; tl.y = f.y0; tr.x = f.x1 - 64; tr.y = f.y0; bl.x = f.x0; bl.y = f.y1 - 64; br.x = f.x1 - 64; br.y = f.y1 - 64;
        }
        hudUpdateFades(points) {                            // 本物のプレイヤー/ハートに重なるパネルは薄くする
            const pad = 14;                              // パネルの縁からこの距離以内にプレイヤー/ハートが来たら薄くする(ボス/状態の情報を読み続けられるよう、最低 0.45)
            const targets = [[this.panels.state, PANELS.state], [this.panels.phase, PANELS.phase], [this.panels.mana, PANELS.mana], [this.panels.player, PANELS.player], [this.panels.counts, PANELS.counts],
                ...this.cardPanels.map(panel => [panel, { x: panel.x, y: panel.y, w: CARD_W, h: CARD_H }])];
            for (const [panel, r] of targets) {
                const overlap = points.some(p => p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad);
                panel.fadeTo(overlap ? 0.45 : 1);
            }
            this.box.fadeTo(1);
        }
    }

    // 暗転: タイルマップの中に挿入する(地面だけを暗くし、キャラ・ハート・弾は暗くしない)
    const createDim = () => {
        const w = (typeof Graphics !== "undefined" && Graphics.width) || BASE_W, h = (typeof Graphics !== "undefined" && Graphics.height) || BASE_H;
        const sprite = new Sprite(newBitmap(w, h));
        sprite.z = SPRITE_Z; sprite.spriteId = 0; sprite.x = 0; sprite.y = 0;
        sprite._projectRSoulDim = true; sprite._dimW = w; sprite._dimH = h;
        sprite.bitmap.fillRect(0, 0, w, h, COLORS.dim);
        const edge = Math.round(Math.min(w, h) * 0.18);   // 画面の端をさらに暗く
        sprite.bitmap.gradientFillRect(0, 0, w, edge, "rgba(0,0,8,0.4)", "rgba(0,0,8,0)", true);
        sprite.bitmap.gradientFillRect(0, h - edge, w, edge, "rgba(0,0,8,0)", "rgba(0,0,8,0.4)", true);
        sprite.bitmap.gradientFillRect(0, 0, edge, h, "rgba(0,0,8,0.4)", "rgba(0,0,8,0)", false);
        sprite.bitmap.gradientFillRect(w - edge, 0, edge, h, "rgba(0,0,8,0)", "rgba(0,0,8,0.4)", false);
        return sprite;
    };
    const dimHost = scene => scene?._spriteset?._tilemap || scene?._spriteset || null;
    const detachDim = scene => {
        const dim = scene?._projectRSoulDim;
        if (!dim) return;
        try { dim.parent?.removeChild?.(dim); dim.bitmap?.destroy?.(); dim.destroy?.(); } catch (error) { /* 既に破棄済み */ }
        scene._projectRSoulDim = null;
    };
    const syncDim = (scene, on) => {
        let dim = scene._projectRSoulDim;
        if (!on) { detachDim(scene); return; }
        const w = (typeof Graphics !== "undefined" && Graphics.width) || BASE_W, h = (typeof Graphics !== "undefined" && Graphics.height) || BASE_H;
        if (dim && (dim._dimW !== w || dim._dimH !== h)) { detachDim(scene); dim = null; }   // 解像度が変わったら作り直す
        if (!dim) dim = scene._projectRSoulDim = createDim();
        const host = dimHost(scene);
        if (host && dim.parent !== host) host.addChild(dim);                                  // Spritesetが作り直されても付け直す
    };

    // ---------------------------------------------------------------- シーン連携 ----------------------------------------------------------------
    const ensureLayer = scene => {
        if (scene._projectRSoulHud) return scene._projectRSoulHud;
        const layer = new Layer();
        scene._projectRSoulHud = layer;
        const hudIndex = scene._projectRBattleHudLayer ? scene.children.indexOf(scene._projectRBattleHudLayer) : -1;
        const dialogueIndex = scene._projectRFullscreenDialogueBackground ? scene.children.indexOf(scene._projectRFullscreenDialogueBackground) : -1;
        if (hudIndex >= 0) scene.addChildAt(layer, hudIndex + 1);
        else if (dialogueIndex >= 0) scene.addChildAt(layer, dialogueIndex);
        else scene.addChild(layer);
        return layer;
    };
    const messageBusy = () => safe(() => {
        if (typeof $gameMessage !== "undefined" && $gameMessage && $gameMessage.isBusy()) return true;
        return !!root.ProjectR?.FullscreenDialogue?.isActive?.();
    }, false);

    const deactivate = (scene, reason) => {
        restoreHidden(reason);
        if (scene) {
            syncDim(scene, false);
            if (scene._projectRSoulHud) scene._projectRSoulHud.visible = false;
        }
        if (runtime.active) runtime.active = false;
        runtime.model = null;
        heartPeak = 0;
        resetWatch();
        activeScene = null;
    };

    // 1フレーム: シーンの更新が終わった後に呼ぶ(通常HUDが自分で visible を決めた後に隠す)
    const refresh = scene => {
        runtime.frame++;
        const soulActive = enabled && safe(() => !!api("ProjectRSoulBattle")?.isActive?.(), false);
        if (!soulActive) {
            runtime.failed = false;                      // 次のSOUL戦闘では、また試す
            if (runtime.active || hidden.length || scene._projectRSoulDim) deactivate(scene, enabled ? "soulEnded" : "disabled");
            return;
        }
        if (runtime.failed) return;                      // 表示で失敗した戦闘では、通常HUDのまま戦闘だけ続ける
        if (activeScene && activeScene !== scene) { restoreHidden("sceneChanged"); syncDim(activeScene, false); }   // 前のシーンの分は先に戻す
        if (!runtime.active) { runtime.active = true; runtime.activations++; heartPeak = 0; runtime.modelFrame = -999; resetWatch(); }
        activeScene = scene;
        const layer = ensureLayer(scene);
        layer.hudUpdateScale();
        for (const target of conflictingTargets(scene)) hide(target);
        const stage = api("ProjectRSoulStage");
        const stageOn = !!safe(() => stage?.isPresenting?.(), false);
        layer._stageOn = stageOn;
        syncDim(scene, !stageOn);                         // ステージでは地面を暗くしない(専用マップで戦う)
        if (runtime.frame - runtime.modelFrame >= 4 || !runtime.model) { runtime.model = buildViewModel(); runtime.modelFrame = runtime.frame; }
        const model = runtime.model;
        if (!model) { layer.visible = false; return; }
        layer.visible = !messageBusy();
        layer.hudDrawModel(model);
        const points = layer.hudEntityPoints(stageOn ? stage : null);
        layer.hudUpdateFrame(points, model.phase === "attack" && !stageOn);
        layer.hudUpdateFades(points);
    };

    const _update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _update.apply(this, arguments);
        try { refresh(this); } catch (error) {
            runtime.lastError = String(error?.message || error);
            runtime.failed = true;
            try { deactivate(this, "error"); } catch (inner) { /* 何もしない */ }
            if (typeof console !== "undefined") console.warn("[ProjectR_SoulBattleHUD]", error);
        }
    };
    const _terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        if (activeScene === this || this._projectRSoulDim || hidden.length) deactivate(this, "terminate");
        _terminate.apply(this, arguments);
    };

    root.ProjectRSoulBattleHUD = Object.freeze({
        VERSION, PANELS, BOX,
        isActive: () => runtime.active,
        cardName: id => cardName(id, safe(() => api("ProjectRBattleHUD")?.getCardPresentation?.(id), null)),      // カードの日本語名(準備画面が同じ名前を使う)
        getViewModel: () => { const m = runtime.model || buildViewModel(); return m ? JSON.parse(JSON.stringify(m)) : null; },
        getState: () => ({
            enabled, active: runtime.active, failed: runtime.failed, hiddenCount: hidden.length, activations: runtime.activations, restores: runtime.restores, lastReason: runtime.lastReason, lastError: runtime.lastError,
            layer: !!activeScene?._projectRSoulHud, layerVisible: !!activeScene?._projectRSoulHud?.visible, dim: !!activeScene?._projectRSoulDim, frame: runtime.frame
        }),
        setEnabled: value => { enabled = value !== false; return enabled; }
    });
})();
