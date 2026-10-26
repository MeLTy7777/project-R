/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR メニュー画面の共通部品（汎用リストWindow・説明パネル・Scene土台）。
 * @author ProjectR
 * @base ProjectR_MenuCore
 * @orderAfter ProjectR_MenuCore
 * @orderAfter ProjectR_MenuHUD
 *
 * @help
 * ProjectR_MenuUI.js
 *
 * デッキ構築・Ultimate選択・指輪・所持品の各画面が共有する土台です。ゲームのデータは持ちません。
 *
 *   Window_ProjectRList   … 汎用の縦リスト（描画関数を渡す）。決定・カーソルはRPGツクール標準のまま。
 *   Window_ProjectRPanel  … 文章パネル（描画関数を渡す。長文は幅で折り返し）。
 *   Window_ProjectRTabs   … 横並びの選択肢（フィルタ・カテゴリ用）。
 *   Scene_ProjectRPage    … 画面の土台。解像度はGraphics.boxWidth/boxHeightから毎回計算します。
 *
 * ProjectR_MenuHUD の小メニュー対応により、これらは矢印キー・Enter・Escape・マウスで操作できます。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;

    // 日本語は空白で折り返せないため、文字幅で折り返す。
    const wrapText = (window_, value, maxWidth) => {
        const lines = [];
        for (const paragraph of String(value ?? "").split("\n")) {
            let line = "";
            for (const ch of paragraph) {
                if (line && window_.textWidth(line + ch) > maxWidth) {
                    lines.push(line);
                    line = ch;
                } else {
                    line += ch;
                }
            }
            lines.push(line);
        }
        return lines;
    };

    class Window_ProjectRPanel extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this._renderer = null;
        }

        setRenderer(renderer) {
            this._renderer = renderer;
            this.refresh();
        }

        refresh() {
            if (!this.contents) return;
            this.contents.clear();
            this._renderer?.(this);
        }

        // 折り返しながら描画し、次のy座標を返す。
        drawWrapped(value, x, y, width, color) {
            if (color !== undefined) this.changeTextColor(color);
            for (const line of wrapText(this, value, width)) {
                this.drawText(line, x, y, width);
                y += this.lineHeight();
            }
            this.resetTextColor();
            return y;
        }
    }

    class Window_ProjectRList extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this._items = [];
            this._drawer = null;
            this._enabled = null;
            this._cols = 1;
        }

        setDrawer(drawer, enabled) {
            this._drawer = drawer;
            this._enabled = enabled || null;
        }

        setItems(items) {
            const previous = this.index();
            this._items = Array.isArray(items) ? items : [];
            this.refresh();
            if (this._items.length === 0) this.select(-1);
            else this.select(Math.max(0, Math.min(previous < 0 ? 0 : previous, this._items.length - 1)));
        }

        items() { return this._items; }
        item() { return (this._items && this._items[this.index()]) || null; }
        maxItems() { return this._items ? this._items.length : 0; }
        maxCols() { return this._cols; }
        isCurrentItemEnabled() { return this.isEnabled(this.index()); }

        isEnabled(index) {
            const item = this._items[index];
            return !!item && (this._enabled ? !!this._enabled(item) : true);
        }

        drawItem(index) {
            const item = this._items[index];
            if (!item || !this._drawer) return;
            const rect = this.itemLineRect(index);
            this.changePaintOpacity(this.isEnabled(index));
            this._drawer(this, item, rect, index);
            this.changePaintOpacity(true);
        }

        select(index) {
            const previous = this.index();
            super.select(index);
            if (previous !== this.index()) this.callHandler("highlight");
        }
    }

    // 横並びの選択肢。現在項目を強調し、選ぶと"change"ハンドラを呼ぶ。
    class Window_ProjectRTabs extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this._labels = [];
        }

        setLabels(labels) {
            this._labels = labels;
            this.refresh();
            if (this.index() < 0 || this.index() >= labels.length) this.select(0);
        }

        maxItems() { return this._labels ? this._labels.length : 0; }
        maxCols() { return Math.max(1, this._labels ? this._labels.length : 1); }
        itemHeight() { return this.lineHeight() + 4; }

        drawItem(index) {
            const rect = this.itemLineRect(index);
            this.drawText(this._labels[index], rect.x, rect.y, rect.width, "center");
        }

        select(index) {
            const previous = this.index();
            super.select(index);
            if (previous !== this.index()) this.callHandler("highlight");
        }
    }

    class Scene_ProjectRPage extends Scene_MenuBase {
        create() {
            super.create();
            this._notice = "";
        }

        // 画面の使える領域（解像度に追従）。
        area() {
            return new Rectangle(0, this.mainAreaTop(), Graphics.boxWidth, this.mainAreaHeight());
        }

        lineBlock(lines) {
            return this.calcWindowHeight(lines, false);
        }

        // 画面下の操作説明帯。
        createHintWindow(text) {
            const height = this.calcWindowHeight(1, false);
            const rect = new Rectangle(0, Graphics.boxHeight - height, Graphics.boxWidth, height);
            this._hintWindow = new Window_ProjectRPanel(rect);
            this._hintWindow.setRenderer(w => w.drawText(text, 0, 0, w.innerWidth, "center"));
            this.addWindow(this._hintWindow);
            return this._hintWindow;
        }

        // 左キー/右キーで他の窓へ切り替える等の補助。Tab/PageUp/PageDownを1回だけ判定。
        isSwitchTriggered() {
            return Input.isTriggered("tab") || Input.isTriggered("pagedown") || Input.isTriggered("pageup");
        }
    }

    root.Window_ProjectRPanel = Window_ProjectRPanel;
    root.Window_ProjectRList = Window_ProjectRList;
    root.Window_ProjectRTabs = Window_ProjectRTabs;
    root.Scene_ProjectRPage = Scene_ProjectRPage;
    root.ProjectRMenuUI = Object.freeze({ wrapText });
})();
