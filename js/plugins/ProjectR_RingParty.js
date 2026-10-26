/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 指輪 / Party Rings 画面（主人公と仲間の間で指輪を移す）。
 * @author ProjectR
 * @base ProjectR_MenuUI
 * @orderAfter ProjectR_MenuUI
 * @orderAfter ProjectR_PartyCombat
 *
 * @help
 * ProjectR_RingParty.js
 *
 * 指輪の持ち主を変える画面 Scene_ProjectRRings です。ルールの判定はすべて
 * ProjectR_CardDeckCore（assignRingToPlayer / assignRingToActor）が行い、
 * この画面は結果と理由を表示するだけです。
 *   ・主人公は指輪をいくつでも持てる。仲間は1人1つまで、定義された対象の指輪だけ。
 *   ・移せるのは戦闘外だけ（戦闘中はメニュー自体が開けず、モデルも拒否）。
 *   ・仲間に渡すと、主人公はその指輪を持たない扱いになり、対応カードは使えなくなります
 *     （保存済みデッキは消えません）。主人公に戻せば、またそのまま使えます。
 *   ・仲間から別の仲間へは、いったん主人公へ戻してから渡します（安全な移し替え）。
 * 製品の「仲間にできる指輪」は未定義です。CardDefinitions/RingDefinitionsの equipActorIds に
 * アクターIDを設定したときだけ、その指輪が仲間に渡せるようになります。
 *
 * 操作: 指輪を上下で選び、決定で移し先の一覧を開く。移し先で決定すると移動。キャンセルで戻る。
 * メニューの「ULTIMATE」画面で Tab を押してもこの画面に来られます。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const core = () => root.ProjectRMenuCore;

    class Scene_ProjectRRings extends Scene_ProjectRPage {
        create() {
            super.create();
            this._notice = "";
            const area = this.area();
            const headerH = this.calcWindowHeight(2, false);
            const hint = this.calcWindowHeight(1, false);
            const bodyH = area.height - headerH - hint;
            const listW = Math.floor(Graphics.boxWidth * 0.5);
            this._header = new Window_ProjectRPanel(new Rectangle(0, area.y, Graphics.boxWidth, headerH));
            this.addWindow(this._header);
            this._rings = new Window_ProjectRList(new Rectangle(0, area.y + headerH, listW, bodyH));
            this._rings.setDrawer(this.drawRing.bind(this));
            this._rings.setHandler("ok", this.onRingOk.bind(this));
            this._rings.setHandler("cancel", this.popScene.bind(this));
            this._rings.setHandler("highlight", this.refreshTargets.bind(this));
            this.addWindow(this._rings);
            this._targets = new Window_ProjectRList(new Rectangle(listW, area.y + headerH, Graphics.boxWidth - listW, bodyH));
            this._targets.setDrawer(this.drawTarget.bind(this));
            this._targets.setHandler("ok", this.onTargetOk.bind(this));
            this._targets.setHandler("cancel", this.onTargetCancel.bind(this));
            this.addWindow(this._targets);
            this.createHintWindow("決定:移し先を選ぶ　Esc:戻る　（指輪は仲間1人につき1つまで）");
            this.refreshAll();
            this._rings.activate();
        }

        drawRing(w, entry, rect) {
            w.drawText(`${entry.ringName}`, rect.x, rect.y, rect.width - 190);
            w.changeTextColor(entry.ownedByPlayer ? ColorManager.powerUpColor() : entry.owner === "unowned" ? ColorManager.deathColor() : ColorManager.systemColor());
            w.drawText(`所持：${entry.ownerLabel}`, rect.x + rect.width - 190, rect.y, 190, "right");
            w.resetTextColor();
        }

        // 移し先: 先頭=主人公へ戻す、続いて対象の仲間。
        targetsFor(ring) {
            if (!ring) return [];
            const list = [];
            if (!ring.ownedByPlayer && ring.owner !== "unowned") {
                list.push({ kind: "player", label: "主人公へ戻す", enabled: true, reason: "" });
            }
            for (const actor of ring.eligibleActors) {
                const holding = ring.allyId === actor.actorId;
                list.push({
                    kind: "actor", actorId: actor.actorId, label: `${actor.name} に渡す${holding ? "（所持中）" : ""}`,
                    enabled: ring.ownedByPlayer && actor.canReceive,
                    reason: holding ? "" : core().describeReasons(actor.reasons).join(" ")
                });
            }
            return list;
        }

        drawTarget(w, target, rect) {
            if (!target.enabled) w.changeTextColor(ColorManager.deathColor());
            w.drawText(target.label, rect.x, rect.y, rect.width);
            w.resetTextColor();
        }

        refreshHeader() {
            this._header.setRenderer(w => {
                w.contents.fontSize = 26;
                w.drawText("指輪 / Party Rings", 0, 0, w.innerWidth);
                w.resetFontSettings();
                w.changeTextColor(this._notice ? ColorManager.deathColor() : ColorManager.systemColor());
                w.drawText(this._notice || "主人公は指輪をいくつでも持てます。仲間は1人1つまで。", 0, w.lineHeight(), w.innerWidth);
                w.resetTextColor();
            });
        }

        refreshTargets() {
            if (!this._targets) return;
            const ring = this._rings.item();
            const items = this.targetsFor(ring);
            this._targets.setItems(items);
            // 移し先を選んでいない間は、カーソルを出さない。
            if (!this._targets.active) this._targets.deselect();
        }

        refreshAll() {
            this._rings.setItems(core().rings.entries());
            this.refreshTargets();
            this.refreshHeader();
        }

        onRingOk() {
            if (!this._targets.maxItems()) {
                this._notice = "移せる相手がいません（仲間にできる指輪が未設定、または未所持です）。";
                SoundManager.playBuzzer();
                this.refreshHeader();
                this._rings.activate();
                return;
            }
            this._targets.activate();
            this._targets.select(0);
        }

        onTargetOk() {
            const ring = this._rings.item();
            const target = this._targets.item();
            let result = { ok: false, message: "移せません" };
            if (ring && target) {
                if (target.kind === "player") result = core().rings.returnToPlayer(ring.ringId);
                else if (target.enabled) result = core().rings.transferToActor(ring.ringId, target.actorId);
                else result = { ok: false, message: target.reason || "この仲間には渡せません。" };
            }
            this._notice = result.ok ? "" : result.message || "移せません";
            if (result.ok) SoundManager.playOk(); else SoundManager.playBuzzer();
            const index = this._rings.index();
            this.refreshAll();
            this._rings.select(index);
            this._targets.deactivate();
            this._rings.activate();
        }

        onTargetCancel() {
            this._targets.deactivate();
            this._rings.activate();
        }
    }

    root.Scene_ProjectRRings = Scene_ProjectRRings;
    root.ProjectRRingParty = Object.freeze({ Scene: Scene_ProjectRRings });

    // ULTIMATE画面からの近道（Tab）。選択画面がまだ読み込まれていなければ何もしない。
    if (typeof Scene_ProjectRUltimateSelect !== "undefined") {
        const _update = Scene_ProjectRUltimateSelect.prototype.update;
        Scene_ProjectRUltimateSelect.prototype.update = function() {
            _update.apply(this, arguments);
            if (this._list.active && Input.isTriggered("tab")) {
                SoundManager.playOk();
                SceneManager.push(Scene_ProjectRRings);
            }
        };
    }
})();
