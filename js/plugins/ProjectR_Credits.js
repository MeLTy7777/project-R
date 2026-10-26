/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR クレジット画面(タイトルの「クレジット」)。第三者素材の表記義務を満たすための表示専用。
 * @author ProjectR
 *
 * @help
 * ProjectR_Credits.js
 *
 * タイトル画面のコマンドに「クレジット」を追加し、使用している第三者素材の表記を表示します。
 * 表示のみで、ゲームの状態・セーブには何も触れません。決定/キャンセルで閉じます。
 *
 * 【表記の追加】新しい素材を使うときは、このファイルの CREDITS に1項目追加し、
 * docs/ProjectR_ThirdPartyAssets.md の台帳にも同じ内容(素材名・作者・入手元・ライセンス)を追記してください。
 *
 * 現在の表記:
 *   TF TallSpriteMZ (Tall size characters for 'RPG Maker MZ')
 *     Material provided by: Tonbi@Tobishima-Factory (tonbi.jp)
 *     ※この素材はRPGツクールMZ公式素材のリメイクのため、公式素材の著作権表記も必要:
 *       (C) Gotcha Gotcha Games Inc./YOJI OJIMA 2020
 *
 * API: ProjectRCredits.entries() / lines()
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;

    // 利用規約(同梱README)に書かれた表記例をそのまま使う。
    const CREDITS = Object.freeze([
        Object.freeze({
            id: "tf_tallspritemz",
            title: "キャラクター素材: TF TallSpriteMZ (Tall size characters for 'RPG Maker MZ')",
            lines: Object.freeze([
                "Material provided by: Tonbi@Tobishima-Factory",
                "http://tonbi.jp/",
                "(C) Tonbi@Tobishima-Factory 2020-2023",
                "(C) Gotcha Gotcha Games Inc./YOJI OJIMA 2020"
            ])
        })
    ]);
    const lines = () => {
        const out = ["CREDITS"];
        for (const entry of CREDITS) out.push("", entry.title, ...entry.lines.map(line => "  " + line));
        return out;
    };

    // ---- 画面 ----
    class Window_ProjectRCredits extends Window_Base {
        constructor(rect) {
            super(rect);
            this.refresh();
        }
        refresh() {
            this.contents.clear();
            const lh = this.lineHeight();
            lines().forEach((text, i) => {
                if (i === 0) this.changeTextColor(ColorManager.systemColor());
                this.drawText(text, 0, i * lh, this.innerWidth, "left");
                this.resetTextColor();
            });
            this.changeTextColor(ColorManager.dimColor1?.() ?? ColorManager.systemColor());
            this.drawText("決定 / キャンセルで戻る", 0, this.innerHeight - lh, this.innerWidth, "right");
            this.resetTextColor();
        }
    }
    class Scene_ProjectRCredits extends Scene_MenuBase {
        create() {
            super.create();
            this._creditsWindow = new Window_ProjectRCredits(new Rectangle(0, 0, Graphics.boxWidth, Graphics.boxHeight));
            this.addWindow(this._creditsWindow);
        }
        update() {
            super.update();
            if (Input.isTriggered("ok") || Input.isTriggered("cancel") || TouchInput.isCancelled() || TouchInput.isTriggered()) {
                SoundManager.playCancel();
                this.popScene();
            }
        }
    }

    // ---- タイトルのコマンド(5行以内。Options等の既存コマンドは変えない) ----
    const _makeCommandList = Window_TitleCommand.prototype.makeCommandList;
    Window_TitleCommand.prototype.makeCommandList = function() {
        _makeCommandList.apply(this, arguments);
        this.addCommand("クレジット", "projectRCredits");
    };
    const _commandWindowRect = Scene_Title.prototype.commandWindowRect;
    Scene_Title.prototype.commandWindowRect = function() {
        const rect = _commandWindowRect.apply(this, arguments);
        rect.height = this.calcWindowHeight(4, true);
        return rect;
    };
    const _createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function() {
        _createCommandWindow.apply(this, arguments);
        this._commandWindow.setHandler("projectRCredits", () => {
            this._commandWindow.close();
            SceneManager.push(Scene_ProjectRCredits);
        });
    };

    root.ProjectRCredits = Object.freeze({
        entries: () => CREDITS.map(entry => ({ id: entry.id, title: entry.title, lines: [...entry.lines] })),
        lines,
        Scene_ProjectRCredits, Window_ProjectRCredits
    });
})();
