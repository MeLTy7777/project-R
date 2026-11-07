/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 共通カットイン(通常=ラベル型の神の目元 / Ultimate=中央大型の神+主人公の目元)。表示専用。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_VisionOcclusion
 * @orderAfter ProjectR_CombatPresence
 *
 * @param CutInCardIds
 * @text カットインを出すカードID(JSON配列)
 * @desc 発動成功時に通常カットインを出すカード。他カードの既存の見た目を勝手に変えないため、明示したものだけ。
 * @type note
 * @default ["hermes_zetsu","hermes_sweep","hermes_reed_flute","hermes_issen","hermes_strength","hermes_veil","hermes_psychopomp","apollo_golden_volley","apollo_eros_arrow","apollo_gigas_slayer","apollo_hyacinthus","apollo_plague_rain","apollo_laurel_wreath","apollo_lyre_rhythm","apollo_oracle"]
 *
 * @param GodEyesJson
 * @text 神ごとの目元画像(JSON: {"hermes":"ファイル名"})
 * @desc img/pictures/ のファイル名(拡張子なし)。最終の肖像画ができたらここだけ差し替えます。DEV画像は自作の仮絵です。
 * @type note
 * @default {"hermes":"ProjectR_CutIn_Hermes_Eyes_DEV","apollo":"ProjectR_CutIn_Hermes_Eyes_DEV"}
 *
 * @param PlayerEyesFile
 * @text 主人公の目元画像
 * @type file
 * @dir img/pictures/
 * @default ProjectR_CutIn_Player_Eyes_DEV
 *
 * @help
 * ProjectR_CutIn.js
 *
 * 【役割】カード発動の「見た目だけ」のカットインです。状態を持たず、戦闘を止めず、判定・操作・
 *   カード実行に一切介入しません。表示に失敗(画像なし・例外)してもカードの結果は変わりません。
 *
 * 【通常カード】発動に成功し消費されたときだけ(requestUseCardがok)、画面の左上または右上(ランダム)に
 *   短いラベル型で神の目元を出します。出すカードは CutInCardIds で明示したものだけです(既存カードの見た目は変えません)。
 * 【Ultimate】ProjectR_UltimateActivationが「発動した(ok かつ started)」と記録したときだけ、画面中央に大きく
 *   神と主人公の目元を出します(向きは横/縦をランダム)。結果を読むだけで、Gauge・Divine HP・神・ダメージ・クールダウンには触れません。
 *   無効な試行(Gauge不足など)では出ません。show({kind:"ultimate", godId}) の直接呼び出しも可能です。
 *
 * 【持ち主(owner)】show の owner = "ally"(既定)/ "enemy"。通常のマップでは見た目は変わりません(左右はランダムのまま)。SOULの専用ステージ
 *   (ProjectR_SoulBattleStage)を映している間だけ、味方 = 左上・敵 = 右上の、戦闘エリアの外の置き場へ画面の大きさのまま置きます(味方・敵はそれぞれ同時に1枚)。
 *
 * 【描画順】Map/背景 → カットイン → 操作キャラクター。カットインはVision(暗幕)層より上に出し、
 *   その上に操作キャラクター本体の複製を重ねます(カットインが主人公を隠さないため)。戦闘HUDはさらに上のWindow層です。
 *   ※複製するのは本体Spriteのみ(銃のDisplay Weaponなど別Spriteは複製しません)。
 *
 * 【画像】DEVの目元は tools/gen_dev_cutin_vfx.cjs で作った自作の仮絵です。画像が読めないときは
 *   同じ位置に簡易の目元を描いて表示を続けます(ゲームに影響しません)。
 *
 * API: ProjectRCutIn
 *   show({kind:"card"|"ultimate", godId, cardId?}) → { ok, id, kind, side? | orientation? }
 *   tick()   1フレーム進める(Spriteset更新が自動で呼びます)    clear()   すべて消す
 *   getActive()   表示中の一覧(読み取り用)      setRandom(fn)   乱数の差し替え(テスト用)
 *   assets()   神ごとの画像対応表      isCardEnabled(cardId)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_CutIn") : {};
    const parseJson = (text, fallback) => { try { return JSON.parse(String(text || "").trim() || "null") ?? fallback; } catch (_e) { return fallback; } };

    const CARD_IDS = new Set((() => { const list = parseJson(params.CutInCardIds, ["hermes_zetsu", "hermes_sweep", "hermes_reed_flute", "hermes_issen", "hermes_strength", "hermes_veil", "hermes_psychopomp", "apollo_golden_volley", "apollo_eros_arrow","apollo_gigas_slayer","apollo_hyacinthus","apollo_plague_rain","apollo_laurel_wreath","apollo_lyre_rhythm","apollo_oracle"]); return Array.isArray(list) ? list.map(String) : []; })());
    const GOD_EYES = Object.freeze(Object.assign({ hermes: "ProjectR_CutIn_Hermes_Eyes_DEV" }, parseJson(params.GodEyesJson, {})));
    const PLAYER_EYES = String(params.PlayerEyesFile || "ProjectR_CutIn_Player_Eyes_DEV");
    const ACCENT = Object.freeze({ hermes: 0x3fd0c9, apollo: 0xf2c14e, default: 0xffffff });
    const FRAMES = Object.freeze({ card: 54, ultimate: 96 });

    let random = Math.random;
    let serial = 0;
    let active = []; // { id, kind, godId, cardId, side?, orientation?, frame, total }

    // ---------- 状態(描画から独立) ----------
    const show = request => {
        try {
            const kind = request?.kind === "ultimate" ? "ultimate" : request?.kind === "card" ? "card" : null;
            const godId = String(request?.godId || "");
            if (!kind || !godId) return { ok: false, reason: "invalidRequest" };
            const entry = { id: ++serial, kind, godId, cardId: request.cardId ? String(request.cardId) : null, owner: request.owner === "enemy" ? "enemy" : "ally", frame: 0, total: FRAMES[kind] };
            if (kind === "card") {
                entry.side = random() < 0.5 ? "left" : "right";
                active = active.filter(e => e.kind !== "card" || e.owner !== entry.owner); // 連打でも(味方・敵それぞれ)1枚だけ(積み重ねない)
            } else {
                entry.orientation = random() < 0.5 ? "horizontal" : "vertical";
                active = active.filter(e => e.kind !== "ultimate");
            }
            active.push(entry);
            return { ok: true, id: entry.id, kind, side: entry.side, orientation: entry.orientation };
        } catch (error) {
            return { ok: false, reason: String(error?.message || error) };
        }
    };
    const tick = () => { for (const e of active) e.frame++; active = active.filter(e => e.frame < e.total); };
    const clear = kind => { active = kind ? active.filter(e => e.kind !== kind) : []; };

    // ---------- 描画 ----------
    const progress = entry => entry.frame / entry.total;
    // 0→1(入り) → 1(維持) → 0(抜け)
    const envelope = (entry, inFrames, outFrames) =>
        Math.min(1, entry.frame / inFrames, (entry.total - entry.frame) / outFrames);

    const makePanel = (width, height, accent) => {
        const bitmap = new Bitmap(width, height);
        const css = "#" + accent.toString(16).padStart(6, "0");
        bitmap.fillRect(0, 0, width, height, "rgba(8,10,16,0.82)");
        bitmap.fillRect(0, 0, width, 4, css);
        bitmap.fillRect(0, height - 4, width, 4, css);
        return bitmap;
    };
    // 画像が読めないときの簡易の目元(DEV)。細い目 + 虹彩。
    const drawFallbackEyes = (bitmap, color) => {
        const ctx = bitmap.context, w = bitmap.width, h = bitmap.height;
        if (!ctx) return;
        const css = "#" + color.toString(16).padStart(6, "0");
        for (const cx of [w * 0.27, w * 0.73]) {
            ctx.fillStyle = "#f4f4f4"; ctx.beginPath(); ctx.ellipse(cx, h / 2, w * 0.17, h * 0.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = css; ctx.beginPath(); ctx.arc(cx, h / 2, h * 0.17, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#0a0a0a"; ctx.beginPath(); ctx.arc(cx, h / 2, h * 0.08, 0, Math.PI * 2); ctx.fill();
        }
        bitmap._baseTexture?.update?.();
    };
    const eyesSprite = (file, color) => {
        const sprite = new Sprite();
        sprite.bitmap = ImageManager.loadPicture(file);
        sprite._projectRFallback = { color, done: false };
        return sprite;
    };
    const updateEyesFallback = sprite => {
        const info = sprite._projectRFallback;
        if (!info || info.done || !sprite.bitmap?.isError?.()) return;
        info.done = true;
        const fallback = new Bitmap(512, 128);
        drawFallbackEyes(fallback, info.color);
        sprite.bitmap = fallback;
    };

    class CutInLayer extends PIXI.Container {
        constructor() {
            super();
            this.views = new Map(); // entry.id -> { container, panel, god, player }
            this.overlay = new Sprite(); // 操作キャラクター本体の複製(カットインより上)
            this.overlay.visible = false;
            this.addChild(this.overlay);
        }
        viewFor(entry) {
            let view = this.views.get(entry.id);
            if (view) return view;
            const accent = ACCENT[entry.godId] || ACCENT.default;
            view = { container: new Sprite(), panel: new Sprite(), god: eyesSprite(GOD_EYES[entry.godId] || GOD_EYES.hermes, accent), player: null };
            view.container.addChild(view.panel);
            view.container.addChild(view.god);
            if (entry.kind === "ultimate") {
                view.player = eyesSprite(PLAYER_EYES, 0xffffff);
                view.container.addChild(view.player);
            }
            this.addChildAt(view.container, this.children.indexOf(this.overlay)); // 常にoverlayより下
            this.views.set(entry.id, view);
            return view;
        }
        // SOUL戦闘の専用ステージ(ProjectR_SoulBattleStage)を映している間だけ: 画面は拡大縮小したステージ(Spriteset)の中にあるので、カットインを戦闘エリアの外
        // (味方 = 左上 / 敵 = 右上。置き場はステージが決める)へ、画面の大きさのまま置く。通常のマップ(ステージ以外)は従来どおり。
        stageRect(entry) {
            const stage = root.ProjectRSoulStage;
            if (!stage || !stage.isPresenting?.()) return null;
            const rects = stage.getCutInRects?.();
            const rect = rects && (entry.owner === "enemy" ? rects.enemy : rects.ally);
            // 画面 = この層の座標 x k + (ox, oy)。MZ の Spriteset は毎フレームの更新の最初に自分の拡大縮小・位置を元に戻し、ステージが更新の後で掛け直すので、
            // この時点の Spriteset の値は読まない。ステージが決めた値(getSpritesetFrame)を使う。
            const sf = stage.getSpritesetFrame?.();
            const frame = sf && Number.isFinite(sf.k) && sf.k > 1e-6 ? { ox: sf.ox, oy: sf.oy, kx: sf.k, ky: sf.k } : null;
            return rect && frame ? { rect, frame } : null;
        }
        placeOnStage(entry, view, hit) {
            const accent = ACCENT[entry.godId] || ACCENT.default, rect = hit.rect, frame = hit.frame;
            const fit = (sprite, w, h) => { const b = sprite.bitmap; const s = b && b.width > 0 ? Math.min(w / b.width, h / b.height) : 1; sprite.scale.set(s, s); sprite.anchor.set(0.5, 0.5); };
            const ultimate = entry.kind === "ultimate";
            const w = Math.round(rect.w), h = Math.round(ultimate ? rect.w * 0.5 : rect.h);
            if (!view.size || view.size.w !== w || view.size.h !== h) { view.panel.bitmap = makePanel(w, h, accent); view.size = { w, h }; }
            if (ultimate) {
                const cw = w - 30, ch = (h - 20) / 2;
                fit(view.god, cw, ch); fit(view.player, cw, ch);
                view.god.x = w / 2; view.god.y = h * 0.27; view.player.x = w / 2; view.player.y = h * 0.73;
            } else { fit(view.god, w - 20, h - 14); view.god.x = w / 2; view.god.y = h / 2; }
            const t = envelope(entry, ultimate ? 10 : 8, ultimate ? 16 : 12), slide = (1 - t) * 40 * (entry.owner === "enemy" ? 1 : -1);
            view.container.scale.set(1 / frame.kx, 1 / frame.ky);                                 // 画面座標 → この層の座標(ステージの拡大縮小・位置を打ち消す)
            view.container.x = (rect.x + slide - frame.ox) / frame.kx; view.container.y = (rect.y - frame.oy) / frame.ky;
            view.container.alpha = t;
            view.placed = "stage";
            updateEyesFallback(view.god);
            if (view.player) updateEyesFallback(view.player);
        }
        layout(entry, view) {
            const placement = this.stageRect(entry);
            if (placement) { this.placeOnStage(entry, view, placement); return; }
            if (view.placed === "stage") { view.container.scale.set(1, 1); view.placed = ""; view.size = null; }
            const W = Graphics.width, H = Graphics.height, accent = ACCENT[entry.godId] || ACCENT.default;
            const fit = (sprite, w, h) => {
                const b = sprite.bitmap;
                const s = b && b.width > 0 ? Math.min(w / b.width, h / b.height) : 1;
                sprite.scale.set(s, s); sprite.anchor.set(0.5, 0.5);
            };
            if (entry.kind === "card") {
                const w = Math.round(Math.min(380, W * 0.34)), h = Math.round(w * 0.27), margin = Math.round(W * 0.02);
                if (!view.size || view.size.w !== w) { view.panel.bitmap = makePanel(w, h, accent); view.size = { w, h }; }
                fit(view.god, w - 20, h - 14); view.god.x = w / 2; view.god.y = h / 2; // 画像の読み込み完了後も合わせ直す
                const t = envelope(entry, 8, 12), slide = (1 - t) * 40;
                view.container.x = entry.side === "left" ? margin - slide : W - w - margin + slide;
                view.container.y = margin;
                view.container.alpha = t;
            } else {
                const horizontal = entry.orientation === "horizontal";
                const w = Math.round(horizontal ? W * 0.74 : W * 0.30), h = Math.round(horizontal ? H * 0.34 : H * 0.72);
                if (!view.size || view.size.w !== w || view.size.h !== h) { view.panel.bitmap = makePanel(w, h, accent); view.size = { w, h }; }
                const cw = w - (horizontal ? 40 : 30), ch = (h - 30) / 2;
                fit(view.god, cw, ch); fit(view.player, cw, ch);
                view.god.x = w / 2; view.god.y = h * 0.27;
                view.player.x = w / 2; view.player.y = h * 0.73;
                const t = envelope(entry, 10, 16), grow = 0.92 + 0.08 * t;
                view.container.scale.set(grow, grow);
                view.container.x = (W - w * grow) / 2;
                view.container.y = (H - h * grow) / 2;
                view.container.alpha = t;
            }
            updateEyesFallback(view.god);
            if (view.player) updateEyesFallback(view.player);
        }
        findPlayerSprite(spriteset) {
            const list = spriteset?._characterSprites || spriteset?._tilemap?.children || [];
            return list.find(s => s && s._character && s._character === (typeof $gamePlayer !== "undefined" ? $gamePlayer : null)) || null;
        }
        syncOverlay(spriteset, visible) {
            const source = visible ? this.findPlayerSprite(spriteset) : null;
            this.overlay.visible = !!source && source.visible !== false;
            if (!source) return;
            this.overlay.bitmap = source.bitmap;
            for (const key of ["position", "scale", "anchor", "pivot"]) if (source[key] && this.overlay[key]) this.overlay[key].copyFrom(source[key]);
            for (const key of ["rotation", "alpha", "blendMode"]) if (source[key] !== undefined) this.overlay[key] = source[key];
            // Sprite_Characterは自分でフレームを切り出す。同じ切り出し範囲を写す。
            if (typeof source._frame === "object" && source._frame && this.overlay.setFrame) {
                this.overlay.setFrame(source._frame.x, source._frame.y, source._frame.width, source._frame.height);
            }
        }
        refresh(spriteset) {
            for (const [id, view] of [...this.views]) {
                if (!active.some(e => e.id === id)) {
                    this.removeChild(view.container);
                    view.container.destroy({ children: true, texture: false, baseTexture: false });
                    this.views.delete(id);
                }
            }
            for (const entry of active) this.layout(entry, this.viewFor(entry));
            this.syncOverlay(spriteset, active.length > 0);
        }
    }

    if (typeof Spriteset_Map !== "undefined") {
        const _create = Spriteset_Map.prototype.createLowerLayer;
        Spriteset_Map.prototype.createLowerLayer = function() {
            _create.apply(this, arguments);
            try {
                // Vision(暗幕)層の追加より後 = その上。さらに戦闘HUD(Window層)より下。
                this._projectRCutInLayer = new CutInLayer();
                this._baseSprite.addChild(this._projectRCutInLayer);
            } catch (_error) { this._projectRCutInLayer = null; }
        };
        const _update = Spriteset_Map.prototype.update;
        Spriteset_Map.prototype.update = function() {
            const value = _update.apply(this, arguments);
            try {
                tick();
                this._projectRCutInLayer?.refresh(this);
            } catch (_error) { /* 表示のみ */ }
            return value;
        };
    }

    // Ultimate: 既存の発動経路(ProjectR_UltimateActivation)が「発動した(started)」と記録した結果だけを、読み取って出す。
    // Gauge・Divine HP・神の状態・ダメージ・Ultimateのクールダウンには一切触れない(読むだけ)。無効な試行(ok=false)では出さない。
    let lastUltimateSerial; // 最初の確認では現在値を覚えるだけ(ロード直後の古い結果で出さない)
    const pollUltimate = () => {
        const result = root.ProjectRUltimateActivation?.getLastUltimateActivationResult?.();
        const serial = Number.isFinite(result?.serial) ? result.serial : null;
        if (lastUltimateSerial === undefined || serial === lastUltimateSerial) { lastUltimateSerial = serial; return null; }
        lastUltimateSerial = serial;
        if (result.ok === true && result.started === true && result.godId) return show({ kind: "ultimate", godId: String(result.godId) });
        return null;
    };
    if (typeof Game_Map !== "undefined") {
        const _mapUpdate = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            _mapUpdate.apply(this, arguments);
            if (sceneActive) { try { pollUltimate(); } catch (_error) { /* 表示のみ */ } }
        };
    }

    // 発動に成功し消費されたときだけ(失敗・拒否では出さない)。
    if (deck?.requestUseCard) {
        const _requestUseCard = deck.requestUseCard;
        deck.requestUseCard = function() {
            const result = _requestUseCard.apply(this, arguments);
            try {
                if (result?.ok === true && CARD_IDS.has(result.cardId) &&
                        !root.ProjectRCardModifiers?.takePresentationSkip?.(result.cardId, "cutIn")) {
                    const ringId = deck.definitions?.card?.(result.cardId)?.ringId;
                    const godId = deck.definitions?.ring?.(ringId)?.godId || root.ProjectRGodSummonManager?.resolveGodId?.(ringId);
                    if (godId) show({ kind: "card", godId, cardId: result.cardId });
                }
            } catch (_error) { /* 表示のみ。カード結果は変えない */ }
            return result;
        };
    }
    if (deck?.endBattle) {
        const _endBattle = deck.endBattle;
        deck.endBattle = function() { clear(); return _endBattle.apply(this, arguments); };
    }
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clear(); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined") {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { clear(); return _extract.apply(this, arguments); };
    }

    root.ProjectRCutIn = {
        show, tick, clear, pollUltimate,
        getActive: () => active.map(e => ({ ...e })),
        setRandom: fn => { random = typeof fn === "function" ? fn : Math.random; },
        assets: () => ({ gods: { ...GOD_EYES }, player: PLAYER_EYES }),
        isCardEnabled: cardId => CARD_IDS.has(String(cardId)),
        _CutInLayer: CutInLayer
    };
})();
