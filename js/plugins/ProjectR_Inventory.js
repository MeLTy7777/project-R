/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 所持品・装備の確認画面（メニュー「ITEM」から開く）。
 * @author ProjectR
 * @base ProjectR_MenuUI
 * @orderAfter ProjectR_MenuUI
 *
 * @help
 * ProjectR_Inventory.js
 *
 * いま持っているものを確認する画面 Scene_ProjectRInventory です。所持品の正は
 * RPGツクールの$gamePartyで、別の所持DBは作りません。見るだけでは何も消費しません。
 *
 * カテゴリ: アイテム / 武器 / 防具 / 大事なもの / 弾薬 / 指輪
 *   弾薬   … 武器のメモ <ammo item: 名前> で指定されたアイテム（Hendrix Action Engineの弾薬）。
 *   指輪   … ProjectR_CardDeckCoreの指輪の所持状況（誰が持っているか）。
 * 表示: アイコン・名前・個数・説明・装備のステータス・「E」=装備中（誰が装備しているか）。
 *
 * 回復アイテムなど「使える」アイテムは、決定を押すと「使う / やめる」の確認が出ます。
 * 確認で「使う」を選んだときだけ、主人公に使って1個消費します。他のカテゴリは確認だけです。
 * 装備の付け外しは標準の装備画面の担当で、この画面では行いません。
 * 操作: 左右でカテゴリ、決定で一覧へ、上下で選択、キャンセルで戻る。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const core = () => root.ProjectRMenuCore;

    class Scene_ProjectRInventory extends Scene_ProjectRPage {
        create() {
            super.create();
            this._notice = "";
            const area = this.area();
            const tabsH = this.calcWindowHeight(1, false);
            const hint = this.calcWindowHeight(1, false);
            const detailH = Math.max(this.calcWindowHeight(6, false), Math.floor(area.height * 0.32));
            const bodyH = area.height - tabsH - detailH - hint;
            this._categories = core().inventory.categories;
            this._tabs = new Window_ProjectRTabs(new Rectangle(0, area.y, Graphics.boxWidth, tabsH));
            this._tabs.setHandler("ok", this.onTabOk.bind(this));
            this._tabs.setHandler("cancel", this.popScene.bind(this));
            this._tabs.setHandler("highlight", this.refreshList.bind(this));
            this.addWindow(this._tabs);
            this._list = new Window_ProjectRList(new Rectangle(0, area.y + tabsH, Graphics.boxWidth, bodyH));
            this._list.setDrawer(this.drawEntry.bind(this));
            this._list.setHandler("ok", this.onListOk.bind(this));
            this._list.setHandler("cancel", this.onListCancel.bind(this));
            this._list.setHandler("highlight", this.refreshDetail.bind(this));
            this.addWindow(this._list);
            this._detail = new Window_ProjectRPanel(new Rectangle(0, area.y + tabsH + bodyH, Graphics.boxWidth, detailH));
            this.addWindow(this._detail);
            this._confirm = new Window_ProjectRList(new Rectangle(Math.floor(Graphics.boxWidth / 2) - 120, area.y + tabsH + 40, 240, this.calcWindowHeight(2, true)));
            this._confirm.setDrawer((w, item, rect) => w.drawText(item.label, rect.x, rect.y, rect.width, "center"));
            this._confirm.setHandler("ok", this.onConfirmOk.bind(this));
            this._confirm.setHandler("cancel", this.closeConfirm.bind(this));
            this._confirm.hide();
            this.addWindow(this._confirm);
            this.createHintWindow("左右:カテゴリ　決定:一覧へ　Esc:戻る　（見るだけでは消費しません）");
            this._tabs.setLabels(this._categories.map(c => c.label));
            this.refreshList();
            this._tabs.activate();
        }

        category() {
            return this._categories[this._tabs.index()]?.key || "item";
        }

        refreshList() {
            if (!this._list) return;
            this._list.setItems(core().inventory.entries(this.category()));
            this._list.deselect();
            this.refreshDetail();
        }

        drawEntry(w, entry, rect) {
            if (entry.kind === "ring") {
                w.drawText(entry.name, rect.x + 40, rect.y, rect.width - 300);
                w.drawText(entry.equippedBy.length ? `仲間：${entry.equippedBy[0]}` : "主人公", rect.x + rect.width - 240, rect.y, 240, "right");
                return;
            }
            w.drawIcon(entry.iconIndex, rect.x, rect.y + 2);
            const stats = entry.stats.map(s => `${s.label}${s.value > 0 ? "+" : ""}${s.value}`).join(" ");
            w.drawText((entry.equipped ? "E " : "") + entry.name, rect.x + 40, rect.y, Math.floor(rect.width * 0.42));
            if (stats) w.drawText(stats, rect.x + 40 + Math.floor(rect.width * 0.42), rect.y, Math.floor(rect.width * 0.4), "left");
            w.drawText(`×${entry.number}`, rect.x + rect.width - 80, rect.y, 80, "right");
        }

        refreshDetail() {
            if (!this._detail) return;
            const entry = this._list.index() >= 0 ? this._list.item() : null;
            const total = this._list.maxItems();
            this._detail.setRenderer(w => {
                const width = w.innerWidth;
                if (!entry) {
                    w.drawText(total ? "決定で一覧に入り、各項目の詳細を確認できます。" : "持っていません。", 0, 0, width);
                    if (this._notice) w.drawText(this._notice, 0, w.lineHeight(), width);
                    return;
                }
                w.drawIcon(entry.iconIndex, 0, 2);
                w.contents.fontSize = 26;
                w.drawText(entry.name, 40, 0, width - 40);
                w.resetFontSettings();
                let y = w.lineHeight();
                if (entry.kind !== "ring") w.drawText(`所持数：${entry.number}`, 0, y, 200);
                if (entry.equipped) {
                    w.changeTextColor(ColorManager.powerUpColor());
                    w.drawText(entry.kind === "ring" ? "仲間が所持" : `装備中：${entry.equippedBy.join("、")}`, 200, y, width - 200);
                    w.resetTextColor();
                }
                y += w.lineHeight();
                if (entry.stats.length) {
                    w.drawText(entry.stats.map(s => `${s.label} ${s.value > 0 ? "+" : ""}${s.value}`).join("　"), 0, y, width);
                    y += w.lineHeight();
                }
                y = w.drawWrapped(entry.description, 0, y, width);
                if (this._notice) w.drawText(this._notice, 0, y, width);
            });
        }

        onTabOk() {
            if (this._list.maxItems() === 0) {
                SoundManager.playBuzzer();
                this._tabs.activate();
                return;
            }
            this._list.activate();
            this._list.select(0);
        }

        onListOk() {
            const entry = this._list.item();
            if (entry && entry.usable) {
                this._confirm.setItems([{ label: "使う", use: true }, { label: "やめる", use: false }]);
                this._confirm.show();
                this._confirm.activate();
                this._confirm.select(1);
                return;
            }
            // 見るだけ。何も消費しない。
            this._list.activate();
        }

        onListCancel() {
            this._list.deselect();
            this._list.deactivate();
            this._tabs.activate();
            this.refreshDetail();
        }

        onConfirmOk() {
            const choice = this._confirm.item();
            const entry = this._list.item();
            if (choice && choice.use && entry) {
                const result = core().inventory.useOnLeader(entry.item);
                this._notice = result.ok ? `${entry.name}を使った。` : result.message || "使えません。";
                if (result.ok) SoundManager.playUseItem(); else SoundManager.playBuzzer();
                const index = this._list.index();
                this.refreshList();
                this._list.select(Math.min(index, this._list.maxItems() - 1));
            }
            this.closeConfirm();
        }

        closeConfirm() {
            this._confirm.hide();
            this._confirm.deactivate();
            this._list.activate();
            this.refreshDetail();
        }
    }

    root.Scene_ProjectRInventory = Scene_ProjectRInventory;
    root.ProjectRInventory = Object.freeze({ Scene: Scene_ProjectRInventory });
})();
