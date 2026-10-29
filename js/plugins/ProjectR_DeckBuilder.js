/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR カードデッキ構築画面（メニュー「スキル」から開く）。
 * @author ProjectR
 * @base ProjectR_MenuUI
 * @orderAfter ProjectR_MenuUI
 *
 * @help
 * ProjectR_DeckBuilder.js
 *
 * 主人公のデッキ（30枚）を作る画面 Scene_ProjectRDeckBuilder です。
 * 検証（30枚・所持・コピー上限・指輪）はすべて ProjectR_CardDeckCore の結果を表示するだけで、
 * この画面は独自の検証を持ちません。無効なデッキは自動修復せず、理由をそのまま表示します。
 * カードは CardDefinitions から自動で並びます（カード名はコードに書きません）。
 *
 * 操作（キーボード/マウス）:
 *   上部の絞り込み: 左右で選び、決定でカード一覧へ。
 *   カード一覧(左)  : 決定=デッキに1枚追加 / Shift=デッキから1枚戻す / Tab=デッキ側へ / キャンセル=絞り込みへ
 *   デッキ(右)      : 決定=1枚戻す / Tab=カード一覧へ / キャンセル=カード一覧へ
 *   絞り込みでキャンセル=メニューへ戻る。マウスは各行のクリックと右クリック（キャンセル）。
 *
 * セーブされるのは30枚のデッキ定義だけです（Core管理）。戦闘中の手札・山札などは保存されません。
 * 戦闘中はメニュー自体が開けず、モデル側も変更を拒否します。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const core = () => root.ProjectRMenuCore;
    const SORTS = [
        { key: "god", label: "神別" }, { key: "name", label: "名前" },
        { key: "level", label: "Level" }, { key: "cooldown", label: "Cooldown" }
    ];

    // 絞り込みは定義済みの指輪（神）から自動生成する。
    const filterList = () => {
        const deck = root.ProjectRCardDeck;
        const gods = [];
        for (const ring of deck.definitions.ringDefinitions()) {
            if (!gods.some(g => g.godId === ring.godId)) gods.push({ godId: ring.godId, label: core().godInfo(ring.godId).name });
        }
        return [
            { key: "all", label: "全て", options: {} },
            ...gods.map(g => ({ key: "god:" + g.godId, label: g.label, options: { god: g.godId } })),
            { key: "available", label: "使用可", options: { status: "available" } },
            { key: "invalid", label: "指輪なし", options: { status: "invalid" } }
        ];
    };

    class Scene_ProjectRDeckBuilder extends Scene_ProjectRPage {
        create() {
            super.create();
            this._filters = filterList();
            this._sortIndex = 0;
            this._notice = "";
            this.createHeader();
            this.createTabs();
            this.createCollection();
            this.createDeckList();
            this.createDetail();
            this.createHintWindow("決定:追加　Shift:戻す　Tab:デッキ/一覧　Esc:戻る　（並び替えは上段の右端）");
            this.refreshAll();
            this._tabs.activate();
        }

        layout() {
            const area = this.area();
            const hint = this.calcWindowHeight(1, false);
            const headerH = this.calcWindowHeight(3, false);
            const tabsH = this.calcWindowHeight(1, false);
            const detailH = Math.max(this.calcWindowHeight(6, false), Math.floor(area.height * 0.4));
            const bodyY = area.y + headerH + tabsH;
            const bodyH = Math.max(120, area.height - headerH - tabsH - detailH - hint);
            const listW = Math.floor(Graphics.boxWidth * 0.5);
            return { area, headerH, tabsH, bodyY, bodyH, detailH, listW, hint };
        }

        createHeader() {
            const l = this.layout();
            this._header = new Window_ProjectRPanel(new Rectangle(0, l.area.y, Graphics.boxWidth, l.headerH));
            this.addWindow(this._header);
        }

        createTabs() {
            const l = this.layout();
            this._tabs = new Window_ProjectRTabs(new Rectangle(0, l.area.y + l.headerH, Graphics.boxWidth, l.tabsH));
            this._tabs.setHandler("ok", this.onTabOk.bind(this));
            this._tabs.setHandler("cancel", this.popScene.bind(this));
            this._tabs.setHandler("highlight", this.refreshCollection.bind(this));
            this.addWindow(this._tabs);
        }

        createCollection() {
            const l = this.layout();
            const rect = new Rectangle(0, l.bodyY, l.listW, l.bodyH);
            this._collection = new Window_ProjectRList(rect);
            this._collection.setDrawer(this.drawCollectionItem.bind(this));
            this._collection.setHandler("ok", this.onCollectionOk.bind(this));
            this._collection.setHandler("cancel", this.onCollectionCancel.bind(this));
            this._collection.setHandler("highlight", this.refreshDetail.bind(this));
            this.addWindow(this._collection);
        }

        createDeckList() {
            const l = this.layout();
            const rect = new Rectangle(l.listW, l.bodyY, Graphics.boxWidth - l.listW, l.bodyH);
            this._deckList = new Window_ProjectRList(rect);
            this._deckList.setDrawer(this.drawDeckItem.bind(this));
            this._deckList.setHandler("ok", this.onDeckOk.bind(this));
            this._deckList.setHandler("cancel", this.onDeckCancel.bind(this));
            this._deckList.setHandler("highlight", this.refreshDetail.bind(this));
            this.addWindow(this._deckList);
        }

        createDetail() {
            const l = this.layout();
            const y = l.bodyY + l.bodyH;
            this._detail = new Window_ProjectRPanel(new Rectangle(0, y, Graphics.boxWidth, l.detailH));
            this.addWindow(this._detail);
        }

        // ---- 描画 ----
        drawCollectionItem(w, entry, rect) {
            const info = entry.info;
            w.drawIcon(info.iconIndex, rect.x, rect.y + 2);
            const nameX = rect.x + 40;
            const tail = 190;
            if (!entry.ringOwned) w.changeTextColor(ColorManager.deathColor());
            w.drawText(info.name, nameX, rect.y, rect.width - 40 - tail);
            w.resetTextColor();
            w.drawText(`Lv${entry.level}/${entry.maxLevel}`, rect.x + rect.width - tail, rect.y, 70, "right");
            w.changeTextColor(entry.copiesInDeck >= entry.maxCopies ? ColorManager.crisisColor() : ColorManager.normalColor());
            w.drawText(`${entry.copiesInDeck}/${entry.maxCopies}枚`, rect.x + rect.width - tail + 74, rect.y, 70, "right");
            w.resetTextColor();
            if (!entry.ringOwned) {
                w.changeTextColor(ColorManager.deathColor());
                w.drawText("✕", rect.x + rect.width - 36, rect.y, 36, "right");
                w.resetTextColor();
            }
        }

        drawDeckItem(w, entry, rect) {
            const info = entry.info;
            w.drawIcon(info.iconIndex, rect.x, rect.y + 2);
            if (!entry.usable) w.changeTextColor(ColorManager.deathColor());
            w.drawText(info.name, rect.x + 40, rect.y, rect.width - 40 - 130);
            w.resetTextColor();
            w.drawText(`Lv${entry.level}`, rect.x + rect.width - 130, rect.y, 60, "right");
            w.drawText(`×${entry.count}`, rect.x + rect.width - 64, rect.y, 64, "right");
        }

        refreshHeader() {
            const status = core().deck.status();
            const sort = SORTS[this._sortIndex].label;
            this._header.setRenderer(w => {
                const width = w.innerWidth;
                w.contents.fontSize = 28;
                w.changeTextColor(status.valid ? ColorManager.powerUpColor() : ColorManager.crisisColor());
                w.drawText(status.header + (status.valid ? "　✔ 使用可能なデッキ" : "　✕ 条件を満たしていません"), 0, 0, width);
                w.resetFontSettings();
                w.resetTextColor();
                // 無効の理由は、指輪ごとにまとめた説明を優先する(デッキの内容は自動では直さない)。
                const messages = this._notice ? [this._notice] : (status.groupedMessages && status.groupedMessages.length ? status.groupedMessages : status.messages);
                const shown = messages.slice(0, 2).join("　/　") + (messages.length > 2 ? `　ほか${messages.length - 2}件` : "");
                w.changeTextColor(this._notice ? ColorManager.systemColor() : ColorManager.deathColor());
                w.drawText(shown || `並び：${sort}`, 0, w.lineHeight() * 1 + 4, width);
                w.resetTextColor();
            });
        }

        refreshTabs() {
            this._tabs.setLabels([...this._filters.map(f => f.label), `並び:${SORTS[this._sortIndex].label}`]);
        }

        currentOptions() {
            const filter = this._filters[this._tabs.index()];
            return { ...(filter ? filter.options : {}), sort: SORTS[this._sortIndex].key };
        }

        refreshCollection() {
            if (!this._collection) return;
            const filter = this._filters[this._tabs.index()];
            this._collection.setItems(filter ? core().deck.collection(this.currentOptions()) : this._collection.items());
        }

        refreshDeck() {
            this._deckList.setItems(core().deck.entries());
        }

        refreshAll() {
            this.refreshTabs();
            this.refreshCollection();
            this.refreshDeck();
            this.refreshHeader();
            this.refreshDetail();
        }

        currentCard() {
            const list = this._deckList.active ? this._deckList : this._collection;
            const item = list.item();
            if (!item) return this._collection.item() || this._deckList.item();
            return item;
        }

        refreshDetail() {
            if (!this._detail) return;
            const entry = this.currentCard();
            this._detail.setRenderer(w => {
                const width = w.innerWidth;
                if (!entry) {
                    w.drawText("カードがありません。（所持しているカードだけが表示されます）", 0, 0, width);
                    return;
                }
                const info = entry.info;
                const deckCount = core().deck.entries().find(e => e.cardId === entry.cardId)?.count ?? 0;
                const invalid = core().describeReasons(entry.invalidReasons || []);
                w.drawIcon(info.iconIndex, 0, 2);
                w.contents.fontSize = 26;
                w.drawText(info.name, 40, 0, width - 40);
                w.resetFontSettings();
                const line = w.lineHeight();
                w.drawText(`${info.godName} / ${info.ringName}　分類:${info.categoryLabel}　${info.rarityLabel}`, 0, line, width);
                w.drawText(`Level ${entry.level} / 最大${entry.maxLevel}　Cooldown ${info.cooldownSeconds}秒　対象:${info.targetLabel}`, 0, line * 2, width);
                w.drawText(`デッキ内 ${deckCount} / コピー上限 ${info.maxCopies}枚`, 0, line * 3, width);
                let y = line * 4;
                y = w.drawWrapped(info.description, 0, y, width);
                // カードごとのLevel別効果(Level N は Level N-1 までの効果に加わる。同じ効果の数値は置き換わる)。現在のLevelを強調する。
                for (let i = 0; i < info.levels.length; i++) {
                    const current = i + 1 === entry.level;
                    if (current) w.changeTextColor(ColorManager.powerUpColor());
                    y = w.drawWrapped(`${current ? "▶" : "　"}Lv${i + 1}: ${info.levels[i]}`, 0, y, width);
                    if (current) w.resetTextColor();
                }
                if (invalid.length) w.drawWrapped(invalid.join(" / "), 0, y, width, ColorManager.deathColor());
            });
        }

        // ---- 入力 ----
        onTabOk() {
            if (this._tabs.index() >= this._filters.length) {
                this._sortIndex = (this._sortIndex + 1) % SORTS.length;
                this.refreshAll();
                this._tabs.activate();
                return;
            }
            this._collection.activate();
            if (this._collection.index() < 0 && this._collection.maxItems() > 0) this._collection.select(0);
            this.refreshDetail();
        }

        onCollectionOk() {
            const entry = this._collection.item();
            if (entry) this.applyResult(core().deck.add(entry.cardId));
            this._collection.activate();
        }

        onCollectionCancel() {
            this._collection.deactivate();
            this._tabs.activate();
            this.refreshDetail();
        }

        onDeckOk() {
            const entry = this._deckList.item();
            if (entry) this.applyResult(core().deck.remove(entry.cardId));
            this._deckList.activate();
        }

        onDeckCancel() {
            this._deckList.deactivate();
            this._collection.activate();
            this.refreshDetail();
        }

        applyResult(result) {
            this._notice = result.ok ? "" : result.message || "操作できません";
            if (result.ok) SoundManager.playOk(); else SoundManager.playBuzzer();
            const keep = this._deckList.index();
            this.refreshCollection();
            this.refreshDeck();
            if (keep >= 0) this._deckList.select(Math.min(keep, this._deckList.maxItems() - 1));
            this.refreshHeader();
            this.refreshDetail();
        }

        update() {
            super.update();
            if (this._collection.active) {
                if (Input.isTriggered("shift")) {
                    const entry = this._collection.item();
                    if (entry) this.applyResult(core().deck.remove(entry.cardId));
                } else if (Input.isTriggered("tab") && this._deckList.maxItems() > 0) {
                    this._collection.deactivate();
                    this._deckList.activate();
                    if (this._deckList.index() < 0) this._deckList.select(0);
                    this.refreshDetail();
                }
            } else if (this._deckList.active && Input.isTriggered("tab")) {
                this._deckList.deactivate();
                this._collection.activate();
                this.refreshDetail();
            }
        }
    }

    root.Scene_ProjectRDeckBuilder = Scene_ProjectRDeckBuilder;
    root.ProjectRDeckBuilder = Object.freeze({ Scene: Scene_ProjectRDeckBuilder, filterList });
})();
