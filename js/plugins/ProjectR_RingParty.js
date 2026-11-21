/*:
 * @target MZ
 * @plugindesc v1.1.0 ProjectR 指輪 / Party Rings 画面（指輪装備: 主人公の装備と仲間への受け渡し / スキル編成: 通常5枠とQ奥義）。
 * @author ProjectR
 * @base ProjectR_MenuUI
 * @orderAfter ProjectR_MenuUI
 * @orderAfter ProjectR_PartyCombat
 *
 * @help
 * ProjectR_RingParty.js
 *
 * 既存の「指輪」画面 Scene_ProjectRRings です。上部の2項目から、2つの操作に入ります（ProjectR_RingLoadout が読み込まれているとき）。
 *   「指輪装備」   指輪の持ち主（主人公・仲間）と、主人公の装備を管理する。
 *   「スキル編成」 装備中の指輪のスキルと奥義を、枠（LMB / Shift / E / X / C / Q）へ登録する。
 *
 * ルールの判定はすべて ProjectR_CardDeckCore（assignRingToPlayer / assignRingToActor）と
 * ProjectR_RingLoadout（装備・編成）が行い、この画面は ProjectR_MenuCore のモデル経由で結果と理由を表示するだけです。
 * セーブデータを直接書き換えることはありません。
 *
 * 【指輪装備】
 *   ・「所持」と「主人公の装備」は別の状態です。一覧の右に「所持：誰が持っているか」「装備：装備中/未装備/―」を並べて表示します。
 *   ・主人公は指輪をいくつでも所持・装備できます。入手しても、装備しても、スキルは自動では登録されません。
 *   ・指輪を選んで決定すると、操作の一覧が開きます。「主人公が装備する／装備を外す」「仲間に渡す」「主人公へ戻す」。
 *   ・装備を外す・仲間に渡すと、その指輪のスキル・奥義の登録は解除されます。主人公へ戻しても、装備も登録も自動では戻りません。
 *   ・仲間は1人1つまで、定義された対象の指輪だけ（従来どおり。判定は CardDeckCore）。
 *   ・仲間から別の仲間へは、いったん主人公へ戻してから渡します（安全な移し替え）。
 *   ・仲間に渡すと、主人公はその指輪を持たない扱いになり、対応カードは使えなくなります（保存済みデッキは消えません）。
 * 【スキル編成】
 *   ・枠を選び、続けて候補を選びます。候補は、装備中の指輪の承認済みスキル（ProjectR_RingLoadout の SKILL_SETS）だけです。
 *   ・先頭の「（空欄にする）」で枠を空にできます。同じスキルを複数の枠に登録することはできません（他の枠で使用中のものは灰色）。
 *   ・Q枠は、装備中で奥義が実装済みの指輪から1つ選びます（指輪ごとに奥義は1種類）。
 *   ・装備していない指輪のスキル・奥義は出ません。実装されていないスキル・奥義も出ません。
 *   ・この編成は、フィールド戦闘（FieldCombat・指輪モード）にそのまま使われます。通常5枠はそれぞれのキー、Q枠の奥義はQキーで発動します。
 *   ・Q枠は、メニュー「ULTIMATE」画面の選択（CardDeckCore の保存）とは別の選択です。フィールド戦闘はQ枠だけを使い（Uキーは使えません）、
 *     ULTIMATE画面の選択は、それ以外の戦闘（SOUL戦闘・通常のカード戦闘）で使われます。どちらかを変えても、もう一方は変わりません。
 * 【共通】
 *   ・戦闘中は装備・編成・受け渡しを変更できません（戦闘中はメニュー自体が開けず、モデル・APIも拒否）。
 *   ・ProjectR_RingLoadout が無い環境では、従来の「指輪を移す」画面だけが開きます。
 *
 * 製品の「仲間にできる指輪」は未定義です。CardDefinitions/RingDefinitionsの equipActorIds に
 * アクターIDを設定したときだけ、その指輪が仲間に渡せるようになります。
 *
 * 操作: 上部の項目を左右で選び、決定でその操作に入る。指輪/枠を上下で選び、決定で操作/候補の一覧を開く。キャンセルで1つ戻る（最上段で画面を閉じる）。
 * メニューの「ULTIMATE」画面で Tab を押してもこの画面に来られます。
 * メインメニューの「SKILL」は、この画面を「スキル編成」が開いた状態で開きます（Scene_ProjectRSkillLoadout。ProjectR_MenuIntegration が接続）。
 *   Escで 枠の一覧 → 上の項目（ここで「指輪装備」へ切り替え）→ メインメニュー と1つずつ戻ります。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const core = () => root.ProjectRMenuCore;
    const TAB_LABELS = Object.freeze(["指輪装備", "スキル編成"]);
    const LEGACY_HINT = "決定:移し先を選ぶ　Esc:戻る　（指輪は仲間1人につき1つまで）";
    const HINTS = Object.freeze({
        tabs: "←→:切り替え　決定:開く　Esc:戻る",
        rings: "決定:操作を選ぶ　Esc:戻る　（所持と装備は別。仲間は1人につき1つまで）",
        targets: "決定:実行　Esc:戻る",
        slots: "決定:枠を選ぶ　Esc:戻る",
        choices: "決定:登録　Esc:戻る　（灰色は他の枠で使用中）"
    });

    // 解除されたスキル・奥義の説明（無ければ空文字）。
    const clearedText = cleared => {
        const parts = [];
        if (cleared && cleared.skills && cleared.skills.length) parts.push(`スキル（${cleared.skills.map(s => `${s.name}/${s.key}`).join("・")}）`);
        if (cleared && cleared.ultimate) parts.push("奥義");
        return parts.length ? `登録していた${parts.join("と")}を解除しました（再び装備しても自動では戻りません）。` : "";
    };

    class Scene_ProjectRRings extends Scene_ProjectRPage {
        // RingLoadout が使えるときだけ、装備・スキル編成を持つ。
        loadout() {
            const model = core().loadout;
            return model && model.available() ? model : null;
        }

        create() {
            super.create();
            this._notice = "";
            this._info = "";
            this._hub = !!this.loadout();
            this._mode = 0;
            const area = this.area();
            const headerH = this.calcWindowHeight(2, false);
            const hint = this.calcWindowHeight(1, false);
            const tabsH = this._hub ? this.calcWindowHeight(1, false) : 0;
            const detailH = this._hub ? this.calcWindowHeight(3, false) : 0;
            const bodyY = area.y + headerH + tabsH;
            const bodyH = area.height - headerH - tabsH - detailH - hint;
            const listW = Math.floor(Graphics.boxWidth * 0.5);
            this._header = new Window_ProjectRPanel(new Rectangle(0, area.y, Graphics.boxWidth, headerH));
            this.addWindow(this._header);
            if (this._hub) {
                this._tabs = new Window_ProjectRTabs(new Rectangle(0, area.y + headerH, Graphics.boxWidth, tabsH));
                this._tabs.setHandler("ok", this.onTabOk.bind(this));
                this._tabs.setHandler("cancel", this.popScene.bind(this));
                this._tabs.setHandler("highlight", this.onTabHighlight.bind(this));
                this.addWindow(this._tabs);
            }
            this._rings = new Window_ProjectRList(new Rectangle(0, bodyY, listW, bodyH));
            this._rings.setDrawer(this.drawRing.bind(this));
            this._rings.setHandler("ok", this.onRingOk.bind(this));
            this._rings.setHandler("cancel", this.onRingCancel.bind(this));
            this._rings.setHandler("highlight", this.onRingHighlight.bind(this));
            this.addWindow(this._rings);
            this._targets = new Window_ProjectRList(new Rectangle(listW, bodyY, Graphics.boxWidth - listW, bodyH));
            this._targets.setDrawer(this.drawTarget.bind(this));
            this._targets.setHandler("ok", this.onTargetOk.bind(this));
            this._targets.setHandler("cancel", this.onTargetCancel.bind(this));
            this._targets.setHandler("highlight", this.refreshDetail.bind(this));
            this.addWindow(this._targets);
            if (this._hub) {
                this._slots = new Window_ProjectRList(new Rectangle(0, bodyY, listW, bodyH));
                this._slots.setDrawer(this.drawSlot.bind(this));
                this._slots.setHandler("ok", this.onSlotOk.bind(this));
                this._slots.setHandler("cancel", this.onSlotCancel.bind(this));
                this._slots.setHandler("highlight", this.onSlotHighlight.bind(this));
                this.addWindow(this._slots);
                this._choices = new Window_ProjectRList(new Rectangle(listW, bodyY, Graphics.boxWidth - listW, bodyH));
                this._choices.setDrawer(this.drawChoice.bind(this));
                this._choices.setHandler("ok", this.onChoiceOk.bind(this));
                this._choices.setHandler("cancel", this.onChoiceCancel.bind(this));
                this._choices.setHandler("highlight", this.refreshDetail.bind(this));
                this.addWindow(this._choices);
                this._detail = new Window_ProjectRPanel(new Rectangle(0, bodyY + bodyH, Graphics.boxWidth, detailH));
                this.addWindow(this._detail);
            }
            this.createHintWindow(this._hub ? HINTS.tabs : LEGACY_HINT);
            this.refreshAll();
            if (this._hub) {
                this.applyMode();
                this._tabs.setLabels(TAB_LABELS.slice());
                this._tabs.activate();
            } else {
                this._rings.activate();
            }
        }

        // ------------------------------------------------------------ 描画 ------------------------------------------------------------
        drawRing(w, entry, rect) {
            const equipW = this._hub ? 170 : 0;
            const ownerW = 190;
            w.drawText(`${entry.ringName}`, rect.x, rect.y, rect.width - ownerW - equipW);
            w.changeTextColor(entry.ownedByPlayer ? ColorManager.powerUpColor() : entry.owner === "unowned" ? ColorManager.deathColor() : ColorManager.systemColor());
            w.drawText(`所持：${entry.ownerLabel}`, rect.x + rect.width - ownerW - equipW, rect.y, ownerW, "right");
            if (this._hub) {
                // 「所持」とは別に、主人公が装備しているかを出す。主人公が持っていない指輪は装備できないので「―」。
                const label = entry.ownedByPlayer ? (entry.equipped ? "装備中" : "未装備") : "―";
                w.changeTextColor(entry.equipped ? ColorManager.powerUpColor() : ColorManager.systemColor());
                w.drawText(`装備：${label}`, rect.x + rect.width - equipW, rect.y, equipW, "right");
            }
            w.resetTextColor();
        }

        // 移し先: 先頭=主人公の装備の切り替え（RingLoadoutがあるとき）、主人公へ戻す、続いて対象の仲間。
        targetsFor(ring) {
            if (!ring) return [];
            const list = [];
            if (this._hub && ring.ownedByPlayer) {
                list.push({
                    kind: "equip", equip: !ring.equipped, label: ring.equipped ? "主人公の装備を外す" : "主人公が装備する",
                    enabled: true, reason: ""
                });
            }
            if (!ring.ownedByPlayer && ring.owner !== "unowned") {
                list.push({ kind: "player", label: this._hub ? "主人公へ戻す（未装備で戻ります）" : "主人公へ戻す", enabled: true, reason: "" });
            }
            for (const actor of ring.eligibleActors) {
                const holding = ring.allyId === actor.actorId;
                list.push({
                    kind: "actor", actorId: actor.actorId, actorName: actor.name, label: `${actor.name} に渡す${holding ? "（所持中）" : ""}`,
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

        drawSlot(w, entry, rect) {
            w.changeTextColor(ColorManager.systemColor());
            w.drawText(entry.label, rect.x, rect.y, 230);
            w.resetTextColor();
            if (entry.assigned) {
                w.drawText(entry.name, rect.x + 240, rect.y, rect.width - 240 - 250);
                w.changeTextColor(ColorManager.systemColor());
                w.drawText(entry.ringName, rect.x + rect.width - 250, rect.y, 250, "right");
                w.resetTextColor();
            } else {
                w.changePaintOpacity(false);
                w.drawText("（空欄）", rect.x + 240, rect.y, rect.width - 240);
            }
        }

        drawChoice(w, choice, rect) {
            w.changePaintOpacity(choice.enabled);
            if (choice.kind === "clear") {
                w.drawText(choice.label, rect.x, rect.y, rect.width);
                return;
            }
            const tail = 240;
            w.drawText(choice.name, rect.x, rect.y, rect.width - tail);
            if (choice.selected) w.changeTextColor(ColorManager.powerUpColor());
            else if (choice.usedByKey) w.changeTextColor(ColorManager.crisisColor());
            else w.changeTextColor(ColorManager.systemColor());
            w.drawText(choice.selected ? "登録中" : choice.usedByKey ? `${choice.usedByKey}枠で使用中` : choice.ringName, rect.x + rect.width - tail, rect.y, tail, "right");
            w.resetTextColor();
        }

        refreshHeader() {
            const locked = this._hub && core().isLocked();
            const fallback = !this._hub ? "主人公は指輪をいくつでも持てます。仲間は1人1つまで。"
                : this._mode === 0 ? "「所持」は誰が持っているか、「装備」は主人公が身につけているか（別の状態です）。"
                    : "装備中の指輪のスキルを、LMB / Shift / E / X / C と Q（奥義）へ登録します。";
            const line = locked ? "戦闘中は装備・編成を変更できません。" : this._notice || this._info || fallback;
            const alert = locked || !!this._notice;
            this._header.setRenderer(w => {
                w.contents.fontSize = 26;
                w.drawText("指輪 / Party Rings", 0, 0, w.innerWidth);
                w.resetFontSettings();
                w.changeTextColor(alert ? ColorManager.deathColor() : this._info && !this._notice ? ColorManager.powerUpColor() : ColorManager.systemColor());
                w.drawText(line, 0, w.lineHeight(), w.innerWidth);
                w.resetTextColor();
            });
        }

        // 下の説明帯: 指輪装備では選んでいる指輪の「所持・装備・登録中」、スキル編成では選んでいる枠/候補の内容。
        refreshDetail() {
            if (!this._hub || !this._detail) return;
            const lines = this._mode === 0 ? this.equipDetailLines() : this.skillDetailLines();
            this._detail.setRenderer(w => {
                let y = 0;
                for (const [index, line] of lines.entries()) {
                    y = w.drawWrapped(line, 0, y, w.innerWidth, index === 0 ? ColorManager.systemColor() : undefined);
                }
            });
        }

        equipDetailLines() {
            const ring = this._rings.item();
            if (!ring) return ["指輪がありません。"];
            const equipLabel = ring.ownedByPlayer ? (ring.equipped ? "装備中" : "未装備") : "装備できません（主人公が持っていません）";
            const assigned = ring.assignedSkills.map(s => `${s.name}（${s.key}）`);
            if (ring.ultimateAssigned) assigned.push("奥義（Q）");
            return [
                `${ring.ringName}　所持：${ring.ownerLabel}　装備：${equipLabel}`,
                `登録中：${assigned.length ? assigned.join("　") : "なし"}`,
                "所持＝指輪を持っていること。装備＝主人公が身につけていること。スキル編成に使えるのは、装備中の指輪だけです。"
            ];
        }

        skillDetailLines() {
            const slot = this._slots.item();
            if (!slot) return ["枠がありません。"];
            const choice = this._choices.active ? this._choices.item() : null;
            const head = `${slot.label}　登録中：${slot.assigned ? slot.name : "なし"}`;
            if (choice && choice.kind === "skill") {
                const info = core().cardInfo(choice.skillId);
                const cooldown = Number.isFinite(info.cooldownSeconds) ? `　クールダウン ${info.cooldownSeconds}秒` : "";
                return [head, `${choice.name}（${choice.ringName}）${cooldown}`, info.description || ""];
            }
            if (choice && choice.kind === "ultimate") {
                return [head, `${choice.name}（${choice.ringName}）`, "装備中の指輪の奥義を1つだけ登録できます。奥義ゲージは共通です。フィールド戦闘のQキーで発動します（「ULTIMATE」画面の選択とは別です）。"];
            }
            return [head,
                slot.ultimate ? "Q枠には、装備中で奥義が使える指輪の奥義を1つ登録できます。フィールド戦闘のQキーで発動します（「ULTIMATE」画面の選択とは別です）。" : "装備中の指輪のスキルを選んで登録します。同じスキルは複数の枠に登録できません。",
                "「指輪装備」で指輪を装備すると、候補に出ます（装備しただけでは自動登録されません）。"];
        }

        setHint(message) {
            if (this._hub && this._hintWindow) this._hintWindow.setRenderer(w => w.drawText(message, 0, 0, w.innerWidth, "center"));
        }

        // ------------------------------------------------------------ 更新 ------------------------------------------------------------
        refreshTargets() {
            if (!this._targets) return;
            const ring = this._rings.item();
            const items = this.targetsFor(ring);
            this._targets.setItems(items);
            // 移し先を選んでいない間は、カーソルを出さない。
            if (!this._targets.active) this._targets.deselect();
        }

        refreshChoices() {
            if (!this._choices) return;
            const slot = this._slots.item();
            this._choices.setItems(slot ? core().loadout.choices(slot.slot) : []);
            if (!this._choices.active) this._choices.deselect();
        }

        refreshAll() {
            this._rings.setItems(this._hub ? core().loadout.rings() : core().rings.entries());
            this.refreshTargets();
            if (this._hub) {
                this._slots.setItems(core().loadout.slots());
                this.refreshChoices();
                this.refreshDetail();
            }
            this.refreshHeader();
        }

        // 表示する側（指輪装備 / スキル編成）を切り替える。隠した側は操作できない。
        applyMode() {
            if (!this._hub) return;
            const equip = this._mode === 0;
            this._rings.visible = equip;
            this._targets.visible = equip;
            this._slots.visible = !equip;
            this._choices.visible = !equip;
        }

        onTabHighlight() {
            if (!this._hub || !this._tabs || !this._slots || !this._choices) return;
            const mode = Math.max(0, this._tabs.index());
            if (mode === this._mode) return;
            this._mode = mode;
            this._notice = "";
            this._info = "";
            this.applyMode();
            this.refreshAll();
        }

        onTabOk() {
            this._notice = "";
            this._info = "";
            if (this._mode === 0) {
                this._rings.activate();
                if (this._rings.index() < 0 && this._rings.maxItems()) this._rings.select(0);
                this.setHint(HINTS.rings);
            } else {
                this._slots.activate();
                if (this._slots.index() < 0 && this._slots.maxItems()) this._slots.select(0);
                this.setHint(HINTS.slots);
            }
            this.refreshHeader();
            this.refreshDetail();
        }

        onRingHighlight() {
            this.refreshTargets();
            this.refreshDetail();
        }

        onRingCancel() {
            if (!this._hub) {
                this.popScene();
                return;
            }
            this._rings.deactivate();
            this._tabs.activate();
            this.setHint(HINTS.tabs);
        }

        onRingOk() {
            if (!this._targets.maxItems()) {
                this._notice = "移せる相手がいません（仲間にできる指輪が未設定、または未所持です）。";
                SoundManager.playBuzzer();
                this.refreshHeader();
                this._rings.activate();
                return;
            }
            this._notice = "";
            this._info = "";
            this._targets.activate();
            this._targets.select(0);
            this.setHint(HINTS.targets);
            this.refreshHeader();
        }

        onTargetOk() {
            const ring = this._rings.item();
            const target = this._targets.item();
            const model = this._hub ? core().loadout : null;
            const before = model ? model.state() : null;
            let result = { ok: false, message: "移せません" };
            let info = "";
            if (ring && target) {
                if (target.kind === "equip") {
                    if (target.equip) {
                        result = model.equip(ring.ringId);
                        info = `${ring.ringName}を主人公が装備しました。スキルは自動では登録されません。「スキル編成」で選んでください。`;
                    } else {
                        result = model.unequip(ring.ringId);
                        info = `${ring.ringName}の装備を外しました。${clearedText(result.cleared)}`;
                    }
                } else if (target.kind === "player") {
                    result = core().rings.returnToPlayer(ring.ringId);
                    info = `${ring.ringName}を主人公へ戻しました。装備はされていません。必要なら「主人公が装備する」を選んでください。`;
                } else if (target.enabled) {
                    result = core().rings.transferToActor(ring.ringId, target.actorId);
                    info = `${ring.ringName}を${target.actorName || "仲間"}に渡しました。${model ? clearedText(model.cleared(before)) : ""}`;
                } else {
                    result = { ok: false, message: target.reason || "この仲間には渡せません。" };
                }
            }
            this._notice = result.ok ? "" : result.message || "移せません";
            this._info = result.ok && this._hub ? info : "";
            if (result.ok) SoundManager.playOk(); else SoundManager.playBuzzer();
            const index = this._rings.index();
            this.refreshAll();
            this._rings.select(index);
            this._targets.deactivate();
            this._rings.activate();
            this.setHint(HINTS.rings);
        }

        onTargetCancel() {
            this._targets.deactivate();
            this._rings.activate();
            this.setHint(HINTS.rings);
        }

        onSlotHighlight() {
            this.refreshChoices();
            this.refreshDetail();
        }

        onSlotCancel() {
            this._slots.deactivate();
            this._tabs.activate();
            this.setHint(HINTS.tabs);
        }

        onSlotOk() {
            const slot = this._slots.item();
            this.refreshChoices();
            const items = this._choices.items();
            const real = items.filter(choice => choice.kind !== "clear").length;
            if (!slot || !real) {
                this._notice = slot && slot.ultimate
                    ? "登録できる奥義がありません。奥義が使える指輪を「指輪装備」で装備してください。"
                    : "登録できるスキルがありません。スキルのある指輪を「指輪装備」で装備してください。";
                this._info = "";
                SoundManager.playBuzzer();
                this.refreshHeader();
                this._slots.activate();
                return;
            }
            this._notice = "";
            this._info = "";
            this._choices.activate();
            const current = items.findIndex(choice => choice.selected);
            // 誤って空欄にしないよう、登録中の項目、なければ最初の候補にカーソルを置く。
            this._choices.select(current >= 0 ? current : 1);
            this.setHint(HINTS.choices);
            this.refreshHeader();
            this.refreshDetail();
        }

        onChoiceOk() {
            const slot = this._slots.item();
            const choice = this._choices.item();
            let result = { ok: false, message: "選べません。" };
            if (slot && choice) result = core().loadout.assign(slot.slot, choice);
            if (result.ok) {
                this._notice = "";
                this._info = !result.changed ? "変更はありません。"
                    : choice.kind === "clear" ? `${slot.key}枠を空欄にしました。` : `${slot.key}枠に「${choice.name}」を登録しました。`;
                SoundManager.playOk();
            } else {
                this._notice = result.message || "登録できません。";
                this._info = "";
                SoundManager.playBuzzer();
            }
            const index = this._slots.index();
            this.refreshAll();
            this._slots.select(index);
            this._choices.deactivate();
            this._choices.deselect();
            this._slots.activate();
            this.setHint(HINTS.slots);
            this.refreshDetail();
        }

        onChoiceCancel() {
            this._choices.deactivate();
            this._choices.deselect();
            this._slots.activate();
            this.setHint(HINTS.slots);
            this.refreshDetail();
        }
    }

    // メインメニューの「SKILL」から開く入口: 同じ指輪画面を、「スキル編成」の枠の一覧が開いた状態で始める(LMB / Shift / E / X / C / Q の登録)。
    //   新しい画面・編成の仕組みは作らない(判定・保存はすべて RingLoadout / MenuCore のモデル)。Esc は従来どおり1つずつ戻る:
    //   枠の一覧 → 上の項目(ここで「指輪装備」へ切り替えられる)→ メインメニュー。RingLoadout が無い環境では、従来の指輪の画面のまま。
    class Scene_ProjectRSkillLoadout extends Scene_ProjectRRings {
        create() {
            super.create();
            if (!this._hub) return;
            this._tabs.select(1);
            this.onTabHighlight();
            this._tabs.deactivate();                                                          // 決定で入ったときと同じ状態(上の項目は止まり、枠の一覧が動く)
            this.onTabOk();
            const message = this.emptyMessage();
            if (message) { this._notice = message; this.refreshHeader(); }
        }

        // 登録できるスキル・奥義が1つも無い(装備中の指輪が無い・装備中の指輪に登録できるものが無い)ときの案内。
        emptyMessage() {
            const model = core().loadout;
            const usable = model.slots().some(slot => model.choices(slot.slot).some(choice => choice.kind !== "clear"));
            return usable ? "" : "登録できるスキル・奥義がありません。Esc で上の項目へ戻り、「指輪装備」でスキルのある指輪を装備してください。";
        }
    }

    root.Scene_ProjectRRings = Scene_ProjectRRings;
    root.Scene_ProjectRSkillLoadout = Scene_ProjectRSkillLoadout;
    root.ProjectRRingParty = Object.freeze({ Scene: Scene_ProjectRRings, SkillScene: Scene_ProjectRSkillLoadout });

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
