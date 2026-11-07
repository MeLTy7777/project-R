/*:
 * @target MZ
 * @plugindesc v0.2.0 ProjectR SOUL戦闘 L2 準備(PREPARE)画面。「攻撃」→ キャラ選択 → 10枚から5枚を選ぶ → Q/W/E/R/T へ割り当て → ATTACK。「アイテム」は未実装。
 * @author ProjectR
 * @base ProjectR_SoulBattle
 * @base ProjectR_SoulLoopData
 * @base ProjectR_SoulLoopHand
 * @orderAfter ProjectR_SoulBattle
 * @orderAfter ProjectR_SoulBattleInput
 * @orderAfter ProjectR_SoulBattleStage
 * @orderAfter ProjectR_SoulBattleHUD
 * @orderAfter ProjectR_SoulLoopData
 * @orderAfter ProjectR_SoulLoopHand
 *
 * @help
 * ProjectR_SoulBattlePrepare.js
 *
 * 位置づけ: SOUL戦闘の新しいループ(PREPARE → ATTACK → DEFENSE → PREPARE)の「準備」画面です。
 *   フェーズの状態・遮断・時計の停止は ProjectR_SoulBattle(唯一の状態)、キャラとデッキのデータは ProjectR_SoulLoopData、
 *   10枚のドロー・選択・5枠の固定は ProjectR_SoulLoopHand が持ちます。この画面は、それらを呼んで結果を見せるだけです。
 *   準備ループは start({ prepare:true }) / プラグインパラメータ PrepareLoop のときだけ動きます(既定は従来の攻撃⇄防御で、このプラグインは何もしません)。
 *
 * 画面の流れ(承認済み D3〜D6):
 *   1. 準備メニュー   「攻撃」「アイテム(未実装)」。アイテムは何も消費せず、「未実装」と出るだけ。
 *   2. キャラ選択     出撃できる実在のキャラだけ(今は主人公のみ)。仮のキャラ・デッキは作りません。デッキが無いキャラは選べません(理由を表示)。
 *   3. 10枚の選択     選んだキャラの実際のデッキ(今は保存済みの30枚)を、準備に入るたびにシャッフルし直し、重複なしに10枚引きます。ちょうど5枚を選びます(選択 n/5。
 *                     選んだ順に Q/W/E/R/T の番号が付く)。選ばれなかったカードも所持のまま。次の準備でまた30枚を混ぜ直します。
 *   4. 5枠の割り当て  Q/W/E/R/T のスロットを2つ選ぶと入れ替わります。「決定」で ATTACK が始まります。割り当てたカードは ATTACK の間 5枠に固定され、使っても消費されません。
 *   操作: マウスで選んでクリック / 右クリックで戻る / キーボードは A・D(左右)・S(下)で移動、決定キー(OK)で決定。
 *         (準備中はATTACK用のカードキー Q/W/E/R/T が使えないため、上へ戻るキーは使えません。右下の「戻る」を選んでください。)
 *   準備に入った直後の短い間(15フレーム)は、直前の操作が誤って決定にならないよう入力を受け付けません。
 *
 * 範囲外(別段階): マナ・マナコスト・アイテムの使用・キャラ切り替え時の見た目/武器/HP。
 *
 * 公開API(Console / F8):
 *   ProjectRSoulPrepare.isOpen() / getScreen() / getState() / getLayout()
 *   chooseAttack() / chooseCharacter(key) / toggleCard(instanceId) / next() / swapSlots(a, b) / back() / confirm()   画面と同じ操作(準備中だけ。テスト/DEV用)
 *   choose("attack"|"item")   メニューの決定(attack = キャラ選択へ進む。アイテムは未実装の通知だけ)
 *   quickAttack({ characterKey })   DEV/テスト用: キャラ選択 → 引く → 先頭の5枚を選ぶ → 確定 → ATTACK を一度に行う
 *   consumedClick()           今のフレームで準備画面が左クリックを使ったか(通常攻撃として扱わないための印)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const VERSION = "0.2.0";
    const OPEN_GUARD_FRAMES = 15;                       // 準備に入ってから入力を受け付けるまで
    const NOTICE_FRAMES = 240;                          // 通知を出し続けるフレーム数
    const ITEM_NOTICE = "アイテムは未実装です。何も消費していません。";
    const SLOT_KEYS = ["Q", "W", "E", "R", "T"];
    const OPTIONS = Object.freeze([
        Object.freeze({ id: "attack", label: "攻撃", sub: "キャラを選んで ATTACK へ", implemented: true }),
        Object.freeze({ id: "item", label: "アイテム", sub: "未実装", implemented: false })
    ]);
    const DW = 1100, DH = 640;                          // 画面の設計寸法(これを戦闘エリアに合わせて拡縮する)
    const COLORS = Object.freeze({
        panel: "rgba(6,10,20,0.92)", edge: "#4a8bd6", edgeDim: "#2a5b73", text: "#e6eef9", muted: "#8493a8", gold: "#f4c650",
        button: "rgba(16,34,62,0.95)", buttonSel: "rgba(40,92,170,0.95)", buttonOff: "rgba(24,28,36,0.95)", warn: "#ffb25b", good: "#7be0a0", card: "rgba(12,26,48,0.96)"
    });

    const api = name => { try { const t = root[name]; return t && typeof t === "object" ? t : null; } catch (_error) { return null; } };
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const soul = () => api("ProjectRSoulBattle");
    const hand = () => api("ProjectRSoulHand");
    const loopData = () => api("ProjectRSoulLoopData");
    const preparing = () => safe(() => soul()?.getPhase?.() === "prepare", false);

    let enabled = true;
    let activeScene = null;
    const runtime = {
        open: false, frame: 0, openedFrame: 0, screen: "menu", focus: 0, held: null, notice: "", noticeUntil: 0, noticeTone: "warn", consumedFrame: -1, lastPointer: null, sig: "", layout: null, hits: [],
        stats: { opened: 0, closed: 0, attackChosen: 0, itemAttempts: 0, clicks: 0, keys: 0, rejected: 0, characterChosen: 0, cardToggles: 0, swaps: 0, confirms: 0, backs: 0 }, lastChoice: null, lastError: ""
    };
    const say = (text, tone = "warn") => { runtime.notice = text; runtime.noticeTone = tone; runtime.noticeUntil = runtime.frame + NOTICE_FRAMES; runtime.sig = ""; };

    // ---------------------------------------------------------------- 配置(画面座標) ----------------------------------------------------------------
    // ステージ(専用マップ)の最中は戦闘エリア、それ以外は画面全体。その中に設計寸法(1100x640)を収めて拡縮する。
    const areaOf = () => {
        const stage = api("ProjectRSoulStage");
        const vp = safe(() => (stage?.isPresenting?.() ? stage.getViewport?.() : null), null);
        if (vp && Number.isFinite(vp.x) && Number.isFinite(vp.w) && vp.w > 0 && vp.h > 0) return { x: vp.x, y: vp.y, w: vp.w, h: vp.h, stage: true };
        const w = (typeof Graphics !== "undefined" && Graphics.width) || 1920, h = (typeof Graphics !== "undefined" && Graphics.height) || 1080;
        return { x: 0, y: 0, w, h, stage: false };
    };
    const computeLayout = area => {
        const s = Math.min(area.w * 0.96 / DW, area.h * 0.96 / DH);
        const w = Math.round(DW * s), h = Math.round(DH * s);
        return { s, panel: { x: Math.round(area.x + (area.w - w) / 2), y: Math.round(area.y + (area.h - h) / 2), w, h } };
    };
    const toScreen = (layout, item) => ({ id: item.id, kind: item.kind, enabled: item.enabled, x: layout.panel.x + item.x * layout.s, y: layout.panel.y + item.y * layout.s, w: item.w * layout.s, h: item.h * layout.s });
    const hitIndex = (layout, items, point) => {
        if (!point) return -1;
        for (let i = items.length - 1; i >= 0; i--) {
            const r = toScreen(layout, items[i]);
            if (point.x >= r.x && point.x < r.x + r.w && point.y >= r.y && point.y < r.y + r.h) return i;
        }
        return -1;
    };
    const insidePanel = (layout, point) => !!point && point.x >= layout.panel.x && point.x < layout.panel.x + layout.panel.w && point.y >= layout.panel.y && point.y < layout.panel.y + layout.panel.h;
    // TouchInput の座標 → 画面座標(ステージ中は TouchInput が「ステージ座標」なので戻す。ProjectR_SoulBattleInput と同じ考え方)
    const pointerScreen = () => {
        if (typeof TouchInput === "undefined") return null;
        const x = TouchInput.x, y = TouchInput.y;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        const stage = api("ProjectRSoulStage");
        if (safe(() => stage?.isActive?.(), false)) return safe(() => stage.toScreen(x, y), { x, y });
        return { x, y };
    };

    // ---------------------------------------------------------------- 画面の内容(状態から作る。純粋な関数) ----------------------------------------------------------------
    const cardName = id => safe(() => api("ProjectRSoulBattleHUD")?.cardName?.(id), null) || String(id);
    const levelOf = id => Number(safe(() => api("ProjectRCardDeck")?.getPersistentData?.()?.cardOwnership?.[id]?.level, 0)) || 0;
    const characters = () => safe(() => loopData()?.listCharacters?.(), []) || [];
    const GRID = { cols: 5, w: 192, h: 168, gap: 12, x: 46, y: 118 };
    const buildScreen = () => {
        const hs = safe(() => hand().getState(), null) || { drawn: [], selected: [], slots: [], slotCards: [] };
        const items = [];
        const round = safe(() => soul()?.getState?.().round, 1) || 1;
        const model = { title: "準備", subtitle: `ROUND ${round}  ・  選んでください`, right: "", items, lines: [] };
        const button = (id, label, x, y, w, h, enabled = true, sub = "") => items.push({ id, kind: "button", label, sub, x, y, w, h, enabled });
        if (runtime.screen === "menu") {
            OPTIONS.forEach((option, i) => items.push({ id: option.id, kind: "button", label: `「${option.label}」`, sub: option.sub, x: 250, y: 150 + i * 160, w: 600, h: 128, enabled: true, implemented: option.implemented, big: true }));
        } else if (runtime.screen === "character") {
            model.title = "キャラクターを選ぶ"; model.subtitle = "出撃できる実在のキャラだけが並びます(仮のキャラ・デッキは作りません)";
            const list = characters();
            list.forEach((c, i) => {
                const deck = safe(() => loopData().getDeck(c.key), null);
                const ok = !!(deck && deck.ok && deck.valid);
                const sub = deck && deck.ok ? (deck.valid ? `デッキ ${deck.cardIds.length}枚(保存済みのデッキ)` : "デッキが有効ではありません(30枚・所持を確認)") : "カードのデッキがありません";
                items.push({ id: "char:" + c.key, kind: "char", label: c.name || c.key, sub, x: 250, y: 140 + i * 130, w: 600, h: 110, enabled: ok, big: true, data: c.key });
            });
            if (!list.length) model.lines.push("出撃できるキャラがいません");
            button("back", "戻る", 40, 560, 190, 60);
        } else if (runtime.screen === "select") {
            model.title = "10枚から5枚を選ぶ";
            model.subtitle = `${hs.characterKey === "player" ? "主人公" : hs.characterKey}の山札${hs.deckSize}枚をシャッフル → ${hs.drawn.length}枚を引きました(山札 残り${hs.remaining}枚・シャッフル #${hs.serial})`;
            model.right = `選択 ${hs.selected.length}/5`;
            const counts = {};
            for (const c of hs.drawn) counts[c.cardId] = (counts[c.cardId] || 0) + 1;
            hs.drawn.forEach((c, i) => {
                const col = i % GRID.cols, row = Math.floor(i / GRID.cols);
                const pick = hs.selected.indexOf(c.instanceId);
                items.push({ id: "card:" + c.instanceId, kind: "card", x: GRID.x + col * (GRID.w + GRID.gap), y: GRID.y + row * (GRID.h + GRID.gap), w: GRID.w, h: GRID.h, enabled: true,
                    name: cardName(c.cardId), level: levelOf(c.cardId), order: c.order, picked: pick >= 0, slot: pick >= 0 ? SLOT_KEYS[pick] : "", dup: counts[c.cardId], data: c.instanceId });
            });
            button("back", "戻る", 40, 530, 190, 64);
            button("clear", "選び直す", 255, 530, 220, 64, hs.selected.length > 0);
            button("next", "次へ(割り当て)", 760, 530, 300, 64, hs.selected.length === 5);
        } else if (runtime.screen === "assign") {
            model.title = "Q/W/E/R/T に割り当てる";
            model.subtitle = runtime.held === null ? "スロットを2つ続けて選ぶと、カードが入れ替わります" : `${SLOT_KEYS[runtime.held]} を選択中 ― 入れ替える相手のスロットを選んでください`;
            model.right = "5枚 選択済み";
            hs.slotCards.forEach((c, i) => items.push({ id: "slot:" + i, kind: "slot", x: GRID.x + i * (GRID.w + GRID.gap), y: 130, w: GRID.w, h: 260, enabled: !!c, key: SLOT_KEYS[i], name: c ? cardName(c.cardId) : "—", level: c ? levelOf(c.cardId) : 0, held: runtime.held === i, data: i }));
            model.lines.push("ATTACK の間、このカードは5枠に固定され、使っても消費されません。");
            button("back", "戻る(選び直す)", 40, 530, 270, 64);
            button("confirm", "決定 ― ATTACK開始", 700, 530, 360, 64, hs.slots.length === 5);
        }
        return model;
    };

    // ---------------------------------------------------------------- 描画 ----------------------------------------------------------------
    const text = (bitmap, value, x, y, w, h, size, color, align, k) => {
        bitmap.fontSize = Math.max(8, Math.round(size * k));
        bitmap.textColor = color || COLORS.text;
        bitmap.outlineColor = "rgba(0,0,0,0.85)";
        bitmap.outlineWidth = Math.max(2, Math.round(4 * k));
        bitmap.drawText(String(value), Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k), align || "left");
    };
    const box = (bitmap, x, y, w, h, edge, fill, k) => {
        bitmap.fillRect(Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k), edge);
        const b = Math.max(2, Math.round(2 * k));
        bitmap.fillRect(Math.round(x * k) + b, Math.round(y * k) + b, Math.round(w * k) - b * 2, Math.round(h * k) - b * 2, fill);
    };
    const fitSize = (value, width, max, min) => Math.max(min, Math.min(max, Math.floor(width / Math.max(1, String(value).length))));
    const drawScreen = (bitmap, layout, model) => {
        const k = layout.s;
        bitmap.clear();
        box(bitmap, 0, 0, DW, DH, COLORS.edge, COLORS.panel, k);
        text(bitmap, model.title, 0, 14, DW, 54, 40, "#ffffff", "center", k);
        text(bitmap, model.subtitle, 30, 70, model.right ? DW - 260 : DW - 60, 36, 20, COLORS.muted, model.right ? "left" : "center", k);
        if (model.right) text(bitmap, model.right, DW - 250, 66, 220, 44, 32, runtime.screen === "select" ? COLORS.gold : COLORS.good, "right", k);
        model.items.forEach((item, i) => {
            const focused = runtime.focus === i;
            if (item.kind === "card") {
                box(bitmap, item.x, item.y, item.w, item.h, item.picked ? COLORS.gold : (focused ? "#ffffff" : COLORS.edge), item.picked ? "rgba(52,64,28,0.96)" : COLORS.card, k);
                text(bitmap, `#${item.order}`, item.x + 10, item.y + 6, 70, 28, 20, COLORS.muted, "left", k);
                if (item.picked) { bitmap.fillRect(Math.round((item.x + item.w - 52) * k), Math.round((item.y + 8) * k), Math.round(42 * k), Math.round(38 * k), COLORS.gold); text(bitmap, item.slot, item.x + item.w - 52, item.y + 6, 42, 42, 30, "#101820", "center", k); }
                text(bitmap, item.name, item.x + 6, item.y + 52, item.w - 12, 52, fitSize(item.name, item.w - 24, 30, 16), "#ffffff", "center", k);
                text(bitmap, item.level > 0 ? `Lv${item.level}` : "", item.x + 10, item.y + item.h - 44, 70, 32, 22, COLORS.gold, "left", k);
                if (item.dup > 1) text(bitmap, `同じカード ×${item.dup}`, item.x + 6, item.y + item.h - 44, item.w - 14, 32, 18, COLORS.warn, "right", k);
            } else if (item.kind === "slot") {
                box(bitmap, item.x, item.y, item.w, item.h, item.held ? COLORS.gold : (focused ? "#ffffff" : COLORS.edge), item.held ? "rgba(52,64,28,0.96)" : COLORS.card, k);
                bitmap.fillRect(Math.round((item.x + item.w / 2 - 36) * k), Math.round((item.y + 14) * k), Math.round(72 * k), Math.round(64 * k), COLORS.edge);
                text(bitmap, item.key, item.x + item.w / 2 - 36, item.y + 10, 72, 70, 52, "#04101a", "center", k);
                text(bitmap, item.name, item.x + 6, item.y + 110, item.w - 12, 56, fitSize(item.name, item.w - 24, 32, 16), "#ffffff", "center", k);
                text(bitmap, item.level > 0 ? `Lv${item.level}` : "", item.x, item.y + 190, item.w, 36, 26, COLORS.gold, "center", k);
            } else {
                const off = !item.enabled, big = !!item.big;
                const impl = item.implemented !== false;
                box(bitmap, item.x, item.y, item.w, item.h, focused && !off ? COLORS.gold : (off || !impl ? COLORS.edgeDim : COLORS.edge), off || !impl ? COLORS.buttonOff : (focused ? COLORS.buttonSel : COLORS.button), k);
                if (big) {
                    text(bitmap, item.label, item.x, item.y + 8, item.w, 64, 48, off || !impl ? COLORS.muted : "#ffffff", "center", k);
                    text(bitmap, item.sub, item.x, item.y + item.h - 46, item.w, 36, 24, off ? COLORS.warn : (impl ? COLORS.gold : COLORS.warn), "center", k);
                } else text(bitmap, item.label, item.x, item.y + 8, item.w, item.h - 16, 30, off ? COLORS.muted : "#ffffff", "center", k);
            }
        });
        model.lines.forEach((line, i) => text(bitmap, line, 30, 470 + i * 30, DW - 60, 30, 22, COLORS.muted, "center", k));
        const noticeOn = runtime.notice && runtime.noticeUntil > runtime.frame;
        const hint = runtime.screen === "menu" ? "クリックで選びます" : runtime.screen === "select" ? "カードをクリックで選択/解除(右クリックで戻る)" : "クリックで選びます(右クリックで戻る)";
        text(bitmap, noticeOn ? runtime.notice : hint, 30, 598, DW - 60, 36, 22, noticeOn ? (runtime.noticeTone === "good" ? COLORS.good : COLORS.warn) : COLORS.muted, "center", k);
    };

    const ensureLayer = scene => {
        if (scene._projectRSoulPrepare) return scene._projectRSoulPrepare;
        const layer = new Sprite();
        layer._projectRSoulPrepareLayer = true;
        layer.visible = false;
        const windowIndex = scene._windowLayer ? scene.children.indexOf(scene._windowLayer) : -1;
        if (windowIndex >= 0) scene.addChildAt(layer, windowIndex);       // 会話・メッセージの窓の下、HUDの上
        else scene.addChild(layer);
        scene._projectRSoulPrepare = layer;
        return layer;
    };
    const detachLayer = scene => {
        const layer = scene?._projectRSoulPrepare;
        if (!layer) return;
        try { layer.parent?.removeChild?.(layer); layer.bitmap?.destroy?.(); layer.destroy?.(); } catch (_error) { /* 既に破棄済み */ }
        scene._projectRSoulPrepare = null;
        runtime.sig = "";
    };
    const messageBusy = () => safe(() => !!(typeof $gameMessage !== "undefined" && $gameMessage?.isBusy?.()) || !!root.ProjectR?.FullscreenDialogue?.isActive?.(), false);

    // ---------------------------------------------------------------- 操作(画面とAPIで共通) ----------------------------------------------------------------
    const reject = reason => { runtime.stats.rejected++; return { ok: false, reason }; };
    const go = screen => { runtime.screen = screen; runtime.focus = 0; runtime.held = null; runtime.sig = ""; };
    const chooseAttack = () => {
        if (!preparing()) return reject("notPreparing");
        if (runtime.screen !== "menu") return reject("notMenu");
        runtime.stats.attackChosen++; runtime.lastChoice = { id: "attack", frame: runtime.frame };
        go("character");
        return { ok: true, screen: runtime.screen };
    };
    const chooseCharacter = key => {
        if (!preparing()) return reject("notPreparing");
        if (runtime.screen !== "character") return reject("notCharacterScreen");
        const drawn = safe(() => hand().draw(key), null);
        if (!drawn || !drawn.ok) {
            const reason = drawn?.reason || "drawFailed";
            say(reason === "NO_CHARACTER_DECK" ? "このキャラにはカードのデッキがありません" : reason === "INVALID_DECK" ? "デッキが有効ではありません(30枚・所持を確認してください)" : "キャラを選べませんでした(" + reason + ")");
            return reject(reason);
        }
        runtime.stats.characterChosen++;
        go("select");
        say(drawn.reused ? "この準備ではすでに引いています(引き直しません)" : `山札${drawn.deckSize}枚をシャッフルして${drawn.drawn.length}枚引きました`, "good");
        return { ok: true, screen: runtime.screen, reused: !!drawn.reused, serial: drawn.serial, drawn: drawn.drawn };
    };
    const toggleCard = instanceId => {
        if (!preparing()) return reject("notPreparing");
        if (runtime.screen !== "select") return reject("notSelectScreen");
        const r = safe(() => hand().toggle(instanceId), null);
        if (!r || !r.ok) { if (r?.reason === "selectionFull") say("5枚までです。選び直すか、選択済みのカードをもう一度クリックして外してください"); return reject(r?.reason || "toggleFailed"); }
        runtime.stats.cardToggles++; runtime.sig = "";
        return { ok: true, selected: r.selected, count: r.count, removed: r.removed };
    };
    const next = () => {
        if (!preparing()) return reject("notPreparing");
        if (runtime.screen !== "select") return reject("notSelectScreen");
        const r = safe(() => hand().assignDefault(), null);
        if (!r || !r.ok) { say("ちょうど5枚を選んでください(いま" + (r?.count ?? 0) + "枚)"); return reject(r?.reason || "needFive"); }
        go("assign");
        return { ok: true, screen: runtime.screen, slots: r.slots };
    };
    const swapSlots = (a, b) => {
        if (!preparing()) return reject("notPreparing");
        if (runtime.screen !== "assign") return reject("notAssignScreen");
        const r = safe(() => hand().swapSlots(a, b), null);
        if (!r || !r.ok) return reject(r?.reason || "swapFailed");
        runtime.stats.swaps++; runtime.sig = "";
        return { ok: true, slots: r.slots };
    };
    const clickSlot = i => {
        if (runtime.held === null) { runtime.held = i; runtime.sig = ""; return { ok: true, held: i }; }
        const from = runtime.held;
        runtime.held = null; runtime.sig = "";
        return from === i ? { ok: true, held: null } : swapSlots(from, i);
    };
    const back = () => {
        if (!preparing()) return reject("notPreparing");
        const from = runtime.screen;
        if (from === "menu") return reject("alreadyMenu");
        runtime.stats.backs++;
        go(from === "assign" ? "select" : from === "select" ? "character" : "menu");
        return { ok: true, screen: runtime.screen };
    };
    const confirm = () => {
        if (!preparing()) return reject("notPreparing");
        if (runtime.screen !== "assign") return reject("notAssignScreen");
        runtime.stats.confirms++;
        const committed = safe(() => hand().commit(), null);
        if (!committed || !committed.ok) { say("手札を確定できませんでした(" + (committed?.reason || "error") + ")"); return reject(committed?.reason || "commitFailed"); }
        const started = safe(() => !!soul().beginAttack("prepare:confirm"), false);
        if (!started) return reject("beginAttackFailed");
        runtime.lastChoice = { id: "confirm", frame: runtime.frame, slots: committed.slots };
        return { ok: true, phase: safe(() => soul().getPhase(), null), slots: committed.slots };
    };
    // DEV/テスト用: 画面を通らず、同じ操作を順に行う(先頭の5枚を選ぶ)
    const quickAttack = (options = {}) => {
        if (!preparing()) return reject("notPreparing");
        if (runtime.screen === "menu") { const r = chooseAttack(); if (!r.ok) return r; }
        const key = options.characterKey || safe(() => characters()[0]?.key, null);
        if (runtime.screen === "character") { const r = chooseCharacter(key); if (!r.ok) return r; }
        const drawn = safe(() => hand().getState().drawn, []);
        const picks = Array.isArray(options.instanceIds) && options.instanceIds.length ? options.instanceIds : drawn.slice(0, 5).map(c => c.instanceId);
        if (runtime.screen === "select") {
            for (const id of safe(() => hand().getState().selected, []).slice()) hand().toggle(id);
            for (const id of picks) { const r = toggleCard(id); if (!r.ok) return r; }
            const n = next(); if (!n.ok) return n;
        }
        return confirm();
    };
    const choose = (id, source = "api") => {
        if (!preparing()) return reject("notPreparing");
        if (id === "attack") { const r = chooseAttack(); if (r.ok) r.source = source; return r; }
        if (id === "item") {
            if (runtime.screen !== "menu") return reject("notMenu");
            runtime.stats.itemAttempts++;
            say(ITEM_NOTICE);
            runtime.lastChoice = { id, source, frame: runtime.frame };
            return { ok: false, reason: "notImplemented", consumed: false, notice: ITEM_NOTICE };      // フェーズ・アイテム・カードは何も変わらない
        }
        return reject("unknownChoice");
    };
    const activate = (item, source) => {
        if (!item || !item.enabled) return null;
        if (item.kind === "card") return toggleCard(item.data);
        if (item.kind === "slot") return clickSlot(item.data);
        if (item.kind === "char") return chooseCharacter(item.data);
        switch (item.id) {
            case "attack": case "item": return choose(item.id, source);
            case "back": return back();
            case "clear": safe(() => hand().clearSelection()); runtime.sig = ""; return { ok: true };
            case "next": return next();
            case "confirm": return confirm();
            default: return null;
        }
    };

    // ---------------------------------------------------------------- 開く / 閉じる ----------------------------------------------------------------
    const openMenu = () => {
        runtime.open = true; runtime.openedFrame = runtime.frame; runtime.screen = "menu"; runtime.focus = 0; runtime.held = null; runtime.notice = ""; runtime.noticeUntil = 0; runtime.lastPointer = null; runtime.sig = "";
        runtime.stats.opened++;
    };
    const closeMenu = (scene, reason) => {
        if (runtime.open) { runtime.open = false; runtime.stats.closed++; runtime.lastClose = reason; }
        if (scene?._projectRSoulPrepare) scene._projectRSoulPrepare.visible = false;
        runtime.screen = "menu"; runtime.sig = "";
    };

    // ---------------------------------------------------------------- 入力 ----------------------------------------------------------------
    const handleInput = (layout, items) => {
        if (runtime.frame - runtime.openedFrame < OPEN_GUARD_FRAMES) return;          // 開いた直後は受け付けない(直前の操作が誤って決定にならない)
        if (messageBusy()) return;
        const point = pointerScreen();
        const moved = point && (!runtime.lastPointer || runtime.lastPointer.x !== point.x || runtime.lastPointer.y !== point.y);
        runtime.lastPointer = point;
        const hit = hitIndex(layout, items, point);
        if (moved && hit >= 0 && hit !== runtime.focus) { runtime.focus = hit; runtime.sig = ""; }
        if (typeof TouchInput !== "undefined" && TouchInput.isTriggered() && insidePanel(layout, point)) {
            runtime.consumedFrame = runtime.frame;                                    // パネルの上の左クリックは通常攻撃にしない(印)
            if (hit >= 0) { runtime.stats.clicks++; activate(items[hit], "click"); }
            return;
        }
        if (typeof TouchInput !== "undefined" && typeof TouchInput.isCancelled === "function" && TouchInput.isCancelled()) { if (runtime.screen !== "menu") { runtime.stats.keys++; back(); } return; }
        if (typeof Input === "undefined" || !items.length) return;
        const cols = runtime.screen === "select" || runtime.screen === "assign" ? 5 : 1;
        const move = delta => { runtime.focus = (runtime.focus + delta + items.length * 4) % items.length; runtime.sig = ""; };
        if (Input.isTriggered("ok")) { runtime.stats.keys++; activate(items[Math.min(runtime.focus, items.length - 1)], "key"); return; }
        if (Input.isTriggered("right")) move(1);
        else if (Input.isTriggered("left")) move(-1);
        else if (Input.isTriggered("down")) move(cols);
        else if (Input.isTriggered("up")) move(-cols);
    };

    const refresh = scene => {
        const open = enabled && preparing();
        if (!open) {
            if (runtime.open || scene._projectRSoulPrepare?.visible) closeMenu(scene, enabled ? "phaseChanged" : "disabled");
            return;
        }
        if (activeScene && activeScene !== scene) detachLayer(activeScene);
        activeScene = scene;
        if (!runtime.open) openMenu();
        const layer = ensureLayer(scene);
        const area = areaOf(), layout = computeLayout(area);
        let model = buildScreen();
        runtime.focus = Math.min(runtime.focus, Math.max(0, model.items.length - 1));
        runtime.layout = layout;
        handleInput(layout, model.items);
        model = buildScreen();                                                          // 入力で状態が変わった後の内容
        runtime.focus = Math.min(runtime.focus, Math.max(0, model.items.length - 1));
        runtime.hits = model.items.map(item => toScreen(layout, item));
        runtime.model = model;
        const noticeOn = runtime.notice && runtime.noticeUntil > runtime.frame;
        const sig = JSON.stringify([layout.panel, runtime.screen, runtime.focus, runtime.held, noticeOn ? runtime.notice : "", model.subtitle, model.right, model.items.map(i => [i.id, i.enabled, i.picked || false, i.slot || "", i.name || "", i.held || false])]);
        if (sig !== runtime.sig || !layer.bitmap || layer.bitmap.width !== layout.panel.w || layer.bitmap.height !== layout.panel.h) {
            if (!layer.bitmap || layer.bitmap.width !== layout.panel.w || layer.bitmap.height !== layout.panel.h) { try { layer.bitmap?.destroy?.(); } catch (_error) { /* 破棄済み */ } layer.bitmap = new Bitmap(layout.panel.w, layout.panel.h); }
            runtime.sig = sig;
            drawScreen(layer.bitmap, layout, model);
        }
        layer.x = layout.panel.x; layer.y = layout.panel.y;
        layer.visible = !messageBusy();
    };

    if (typeof Scene_Map !== "undefined") {
        const _update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            const result = _update.apply(this, arguments);
            try { refresh(this); } catch (error) {
                runtime.lastError = String(error?.message || error);
                try { closeMenu(this, "error"); } catch (_inner) { /* 何もしない */ }
                if (typeof console !== "undefined") console.warn("[ProjectR_SoulBattlePrepare]", error);
            }
            runtime.frame++;                                                           // フレームの終わりで進める(consumedClick の判定が同じ更新の中だけで成り立つ)
            return result;
        };
        const _terminate = Scene_Map.prototype.terminate;
        Scene_Map.prototype.terminate = function() {
            closeMenu(this, "terminate");
            detachLayer(this);
            if (activeScene === this) activeScene = null;
            return _terminate.apply(this, arguments);
        };
    }
    // SOUL戦闘が終わったら、画面を必ず閉じる(表示の後始末のみ。ゲームの状態は持たない)
    root.ProjectRSoulBattle?.onEnd?.(() => { closeMenu(activeScene, "soulEnd"); });
    // 準備画面の上のクリックは、戦闘エリアの通常攻撃として扱わない(準備中は SoulBattle が通常攻撃自体を遮断している。二重の安全)
    root.ProjectRSoulInput?.registerUiRegion?.(point => runtime.open && !!runtime.layout && insidePanel(runtime.layout, point));

    root.ProjectRSoulPrepare = Object.freeze({
        VERSION, OPTIONS, OPEN_GUARD_FRAMES, SLOT_KEYS,
        isOpen: () => runtime.open,
        getScreen: () => runtime.screen,
        choose, chooseAttack, chooseCharacter, toggleCard, next, swapSlots, back, confirm, quickAttack,
        consumedClick: () => runtime.consumedFrame === runtime.frame,
        getLayout: () => (runtime.layout ? { s: runtime.layout.s, panel: { ...runtime.layout.panel }, buttons: runtime.hits.map(h => ({ ...h })) } : null),
        getState: () => ({
            enabled, open: runtime.open, screen: runtime.screen, selected: runtime.focus, focus: runtime.focus, held: runtime.held, notice: runtime.notice && runtime.noticeUntil > runtime.frame ? runtime.notice : "", frame: runtime.frame, openedFrame: runtime.openedFrame,
            layer: !!activeScene?._projectRSoulPrepare, layerVisible: !!activeScene?._projectRSoulPrepare?.visible, stats: { ...runtime.stats }, lastChoice: runtime.lastChoice && { ...runtime.lastChoice }, lastError: runtime.lastError,
            items: runtime.model ? runtime.model.items.map(i => ({ id: i.id, kind: i.kind, enabled: i.enabled, label: i.label || i.name || "", sub: i.sub || "", picked: !!i.picked, slot: i.slot || "", key: i.key || "", order: i.order || 0, dup: i.dup || 0, held: !!i.held })) : [],
            subtitle: runtime.model ? runtime.model.subtitle : "", right: runtime.model ? runtime.model.right : ""
        }),
        setEnabled: value => { enabled = value !== false; return enabled; }
    });
})();
