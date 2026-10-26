/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR Ultimateの神の選択画面（メニュー「ULTIMATE」から開く）。
 * @author ProjectR
 * @base ProjectR_MenuUI
 * @orderAfter ProjectR_MenuUI
 *
 * @help
 * ProjectR_UltimateSelect.js
 *
 * 戦闘中ずっと隣にいる「常駐のUltimate神」を選ぶ画面です。選択の保存先は
 * ProjectR_CardDeckCore の UltimateSelection（ultimateSelection.ringId）1つだけで、
 * 別の変数は作りません。選べるのは次の条件をすべて満たす神だけです。
 *   ・主人公がその指輪を所持している（仲間が持っている指輪は選べない）
 *   ・その神のUltimate handlerが実装済み（ProjectRUltimateActivation）
 * 未実装の神（現状はヤヌス・テミス・アテナ）は「未実装」と表示され、選択できません。
 * 選択は次の戦闘から有効です。戦闘中はメニューが開けず、モデルも変更を拒否します。
 * 操作: 上下で選び、決定で選択。Tabキーで指輪の管理画面（ProjectR_RingParty）へ。キャンセルでメニューへ戻る。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const core = () => root.ProjectRMenuCore;

    class Scene_ProjectRUltimateSelect extends Scene_ProjectRPage {
        create() {
            super.create();
            this._notice = "";
            const area = this.area();
            const headerH = this.calcWindowHeight(2, false);
            const hint = this.calcWindowHeight(1, false);
            const bodyH = area.height - headerH - hint;
            const listW = Math.floor(Graphics.boxWidth * 0.46);
            this._header = new Window_ProjectRPanel(new Rectangle(0, area.y, Graphics.boxWidth, headerH));
            this.addWindow(this._header);
            this._list = new Window_ProjectRList(new Rectangle(0, area.y + headerH, listW, bodyH));
            this._list.setDrawer(this.drawEntry.bind(this));
            this._list.setHandler("ok", this.onOk.bind(this));
            this._list.setHandler("cancel", this.popScene.bind(this));
            this._list.setHandler("highlight", this.refreshDetail.bind(this));
            this.addWindow(this._list);
            this._detail = new Window_ProjectRPanel(new Rectangle(listW, area.y + headerH, Graphics.boxWidth - listW, bodyH));
            this.addWindow(this._detail);
            this.createHintWindow("決定:この神を選ぶ　Tab:指輪の管理　Esc:戻る");
            this.refreshAll();
            this._list.activate();
        }

        statusLabel(entry) {
            if (entry.selected) return "選択中";
            if (!entry.implemented) return "未実装";
            if (entry.assignedToAllyId) return `仲間(${entry.assignedToAllyName})`;
            if (!entry.ownedByPlayer) return "未所持";
            return "選択可";
        }

        drawEntry(w, entry, rect) {
            const color = entry.selected ? ColorManager.powerUpColor()
                : entry.selectable ? ColorManager.normalColor() : ColorManager.deathColor();
            w.changeTextColor(color);
            w.drawText((entry.selected ? "◆ " : "　") + entry.godName, rect.x, rect.y, rect.width - 150);
            w.drawText(this.statusLabel(entry), rect.x + rect.width - 150, rect.y, 150, "right");
            w.resetTextColor();
        }

        refreshHeader() {
            const selected = core().ultimate.selected();
            this._header.setRenderer(w => {
                w.contents.fontSize = 26;
                w.drawText("アルティメット：常駐する神", 0, 0, w.innerWidth);
                w.resetFontSettings();
                w.changeTextColor(this._notice ? ColorManager.deathColor() : ColorManager.systemColor());
                w.drawText(this._notice || (selected ? `現在の選択：${selected.godName}` : "現在の選択：なし"), 0, w.lineHeight(), w.innerWidth);
                w.resetTextColor();
            });
        }

        refreshDetail() {
            if (!this._detail) return;
            const entry = this._list.item();
            this._detail.setRenderer(w => {
                const width = w.innerWidth;
                if (!entry) {
                    w.drawText("神の定義がありません。", 0, 0, width);
                    return;
                }
                const line = w.lineHeight();
                w.contents.fontSize = 26;
                w.drawText(entry.godName, 0, 0, width);
                w.resetFontSettings();
                w.drawText(`指輪：${entry.ringName}`, 0, line, width);
                const owner = entry.ownedByPlayer ? "主人公が所持" : entry.assignedToAllyId ? `仲間 ${entry.assignedToAllyName} が所持` : "未所持";
                w.drawText(`所持：${owner}`, 0, line * 2, width);
                w.drawText(`Ultimate：${entry.implemented ? "実装済み" : "未実装（選択できません）"}`, 0, line * 3, width);
                w.drawText(`状態：${this.statusLabel(entry)}`, 0, line * 4, width);
                if (entry.messages.length && !entry.selectable) {
                    w.drawWrapped(entry.messages.join("\n"), 0, line * 6, width, ColorManager.deathColor());
                }
                w.drawWrapped("選んだ神は次の戦闘から常にそばにいて、Ultimateゲージが満タンのときにUキーで発動します。", 0, line * 8, width);
            });
        }

        refreshAll() {
            this._list.setItems(core().ultimate.entries());
            this.refreshHeader();
            this.refreshDetail();
        }

        onOk() {
            const entry = this._list.item();
            const result = entry ? core().ultimate.select(entry.ringId) : { ok: false, message: "選択できません" };
            this._notice = result.ok ? "" : result.message || "選択できません";
            if (result.ok) SoundManager.playOk(); else SoundManager.playBuzzer();
            const index = this._list.index();
            this.refreshAll();
            this._list.select(index);
            this._list.activate();
        }
    }

    root.Scene_ProjectRUltimateSelect = Scene_ProjectRUltimateSelect;
    root.ProjectRUltimateSelect = Object.freeze({ Scene: Scene_ProjectRUltimateSelect });
})();
