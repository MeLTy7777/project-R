/*:
 * @target MZ
 * @plugindesc v0.1.1 MenuHUD ITEMから標準アイテム使用・主人公武器装備。
 * @author ProjectR
 * @base ProjectR_MenuHUD
 * @orderAfter ProjectR_CardSkillDeck
 * @help
 * ProjectR_ItemEquip.js v0.1.1
 * MenuHUD → CardSkillDeck → ItemEquipの順で登録してください。
 * ITEM: MZ標準Scene_Item（使用条件・対象選択・消費処理をそのまま使用）。
 * WEAPON: Actor 1の最初の武器スロットへcanEquip/changeEquipで装備。
 * 所持武器と装備中武器を表示。装備固定・封印・所持不足も判定します。
 * 防具・攻撃処理・入力マッピング・MenuHUD本体は変更しません。
 */
(() => {
    "use strict";
    const API = (window.ProjectR = window.ProjectR || {}).ItemEquip = {};
    const cardParameters = PluginManager.parameters("ProjectR_CardSkillDeck");
    const debug = cardParameters.EnableDebugCommands === "true";
    const actor = () => $gameActors.actor(1);
    const weaponSlot = () => actor()?.equipSlots().indexOf(1) ?? -1;
    const currentWeapon = () => actor()?.equips()[weaponSlot()] || null;
    function weaponList() {
        const list = $gameParty.weapons().slice(), current = currentWeapon();
        if (current && !list.includes(current)) list.push(current);
        return list.sort((a, b) => a.id - b.id);
    }
    function rejection(weapon) {
        const a = actor(), slot = weaponSlot();
        if (!a || slot < 0) return "主人公の武器スロットがありません。";
        if (!weapon || !DataManager.isWeapon(weapon)) return "武器を選択してください。";
        if (!a.isEquipChangeOk(slot)) return "武器装備が固定、または封印されています。";
        if (!a.canEquip(weapon)) return "主人公はこの種類の武器を装備できません。";
        if (weapon !== currentWeapon() && !$gameParty.hasItem(weapon)) return "この武器を所持していません。";
        return "";
    }
    function equip(weapon) {
        const reason = rejection(weapon);
        if (reason) return { ok: false, reason };
        const previous = currentWeapon();
        if (previous !== weapon) actor().changeEquip(weaponSlot(), weapon);
        return { ok: currentWeapon() === weapon, reason: currentWeapon() === weapon ? "装備しました。" : "装備を変更できませんでした。" };
    }
    function debugGrantTestWeapons() {
        if (!debug || cardParameters.DebugAutoSetupTestDeck !== "true") return [];
        const added = [];
        for (const [id, name] of [[2, "ロングソード"]]) {
            const w = $dataWeapons[id];
            if (w?.name === name && DataManager.isWeapon(w) && !$gameParty.hasItem(w, true) && currentWeapon() !== w) {
                $gameParty.gainItem(w, 1); added.push(id);
            }
        }
        return added;
    }
    const setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        const value = setupNewGame.apply(this, arguments);
        debugGrantTestWeapons(); // Never called by load or menu entry.
        return value;
    };
    class Window_ItemEquipCategory extends Window_HorzCommand {
        maxCols() { return 2; }
        makeCommandList() { this.addCommand("ITEM", "item"); this.addCommand("WEAPON", "weapon"); }
    }
    class Window_ProjectRWeapons extends Window_Selectable {
        constructor(rect, help) { super(rect); this._helpWindow = help; this.refreshWeapons(); }
        maxItems() { return this._weapons?.length || 0; }
        itemHeight() { return 80; }
        item() { return this._weapons?.[this.index()] || null; }
        refreshWeapons() {
            this._weapons = weaponList();
            this.select(this.maxItems() ? Math.max(0, Math.min(this.index(), this.maxItems() - 1)) : -1);
            this.refresh();
        }
        drawAllItems() {
            super.drawAllItems();
            if (!this.maxItems()) this.drawText("所持武器はありません。", 0, 10, this.innerWidth, "center");
        }
        drawItem(index) {
            const w = this._weapons?.[index]; if (!w) return;
            const r = this.itemRectWithPadding(index);
            this.resetTextColor(); this.changePaintOpacity(!rejection(w));
            this.drawIcon(w.iconIndex, r.x, r.y + 2);
            this.drawText(`${w.name}${w === currentWeapon() ? "   EQUIPPED" : ""}`, r.x + 40, r.y, r.width - 40);
            this.drawText(`${$dataSystem.weaponTypes[w.wtypeId] || "Weapon"}   ATK ${w.params[2]}`, r.x + 40, r.y + 34, r.width - 40);
            this.changePaintOpacity(true);
        }
        updateHelp() {
            const w = this.item();
            const reason = rejection(w);
            this._helpWindow?.setText(reason || `${w.name}：F / Enter / クリックで装備。${w === currentWeapon() ? "現在装備中。" : ""}`);
            this._debugWindow?.setText(`Current: ${currentWeapon()?.name || "なし"}   Selected: ${w?.name || "なし"}\nCan Equip: ${reason ? "NO" : "YES"}   Weapon Slot: ${weaponSlot()}`);
        }
        processOk() {
            // MZ first checks isOkEnabled() / isHandled('ok'). The scene MUST
            // register an ok handler; calling this method directly hid the v0.1.0 bug.
            this.updateInputData();
            this.deactivate();
            this.callOkHandler();
        }
    }
    class Scene_ProjectRItemEquip extends Scene_MenuBase {
        create() {
            super.create();
            const width = Graphics.boxWidth, height = Graphics.boxHeight;
            this._categoryWindow = new Window_ItemEquipCategory(new Rectangle(0, 0, width, 72));
            this._helpWindow = new Window_Help(new Rectangle(0, 72, width, 96));
            const debugHeight = debug ? 96 : 0;
            this._weaponWindow = new Window_ProjectRWeapons(new Rectangle(0, 168, width, height - 168 - debugHeight), this._helpWindow);
            this.addWindow(this._categoryWindow); this.addWindow(this._helpWindow); this.addWindow(this._weaponWindow);
            this._categoryWindow.setHandler("item", () => SceneManager.push(Scene_Item));
            this._categoryWindow.setHandler("weapon", () => {
                this._categoryWindow.deactivate();
                this._weaponWindow.show(); this._weaponWindow.activate(); this._weaponWindow.updateHelp();
            });
            this._categoryWindow.setHandler("cancel", () => this.popScene());
            this._weaponWindow.setHandler("ok", () => this.onWeaponOk());
            this._weaponWindow.setHandler("cancel", () => { this._weaponWindow.deactivate(); this._categoryWindow.activate(); });
            if (debug) {
                this._weaponWindow._debugWindow = new Window_Help(new Rectangle(0, height - debugHeight, width, debugHeight));
                this.addWindow(this._weaponWindow._debugWindow);
            }
            this._weaponWindow.deactivate(); this._categoryWindow.activate();
            this._helpWindow.setText("ITEM：標準のアイテム使用画面　WEAPON：主人公の武器を変更");
        }
        onWeaponOk() {
            const r = equip(this._weaponWindow.item());
            if (r.ok) { SoundManager.playEquip(); this._weaponWindow.refreshWeapons(); }
            else SoundManager.playBuzzer();
            this._weaponWindow.activate(); this._weaponWindow.updateHelp();
            this._helpWindow.setText(r.reason);
        }
        start() {
            super.start();
            this._weaponWindow.refreshWeapons();
            this._weaponWindow.deactivate(); this._categoryWindow.activate();
        }
    }
    const menu = window.ProjectR?.MenuHUD?.Scene;
    if (menu?.prototype.confirm) {
        const original = menu.prototype.confirm;
        menu.prototype.confirm = function() {
            if (window.ProjectR.MenuHUD.layout.commands[this._index]?.symbol !== "item") return original.apply(this, arguments);
            if (!this.isActive() || SceneManager.isSceneChanging()) return;
            this.selectedCommand = "item"; this.consumeInput(); SoundManager.playOk();
            SceneManager.push(Scene_ProjectRItemEquip);
        };
    } else console.warn("[ProjectR_ItemEquip] MenuHUDがありません。登録順を確認してください。");
    Object.assign(API, { version: "0.1.1", Scene: Scene_ProjectRItemEquip, weaponList, weaponSlot, currentWeapon, rejection, equip, debugGrantTestWeapons });
})();
