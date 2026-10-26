/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 戦闘HUDの追加表示（ボス名/HP/フェーズ、仲間のHP/ダウン）。
 * @author ProjectR
 * @base ProjectR_BattleHUD
 * @base ProjectR_BossFramework
 * @orderAfter ProjectR_BattleHUD
 * @orderAfter ProjectR_BossFramework
 * @orderAfter ProjectR_PartyCombat
 *
 * @help
 * ProjectR_CombatExtrasHUD.js
 *
 * 既存の戦闘HUD（ProjectR_BattleHUD）の上に、2つの表示を追加します。表示条件は戦闘HUDと同じ
 * （明示的な戦闘イベント中だけ）です。通常の探索中には出ません。
 *   ・ボスの名前・HPバー・フェーズ（ProjectRBossFramework が戦闘中のときだけ）
 *   ・仲間のHPバーとダウン表示（ProjectRPartyCombat のセッションがあるときだけ。最大2人）
 * 数値は読み取るだけで、HUDからゲーム状態は変えません。座標は戦闘HUDと同じ1920×1080基準です。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const BASE_WIDTH = 1920;

    const makeText = (width, height, options) => {
        const sprite = new Sprite(new Bitmap(width, height));
        sprite._signature = "";
        sprite.setText = function(text, overrides = {}) {
            const o = Object.assign({ fontSize: 22, color: "#f3f6fb", align: "left", outlineColor: "rgba(0,0,0,0.8)", outlineWidth: 4 }, options, overrides);
            const signature = JSON.stringify([text, o]);
            if (signature === this._signature) return;
            this._signature = signature;
            const bitmap = this.bitmap;
            bitmap.clear();
            bitmap.fontSize = o.fontSize;
            bitmap.textColor = o.color;
            bitmap.outlineColor = o.outlineColor;
            bitmap.outlineWidth = o.outlineWidth;
            bitmap.drawText(String(text ?? ""), 0, 0, bitmap.width, bitmap.height, o.align);
        };
        return sprite;
    };

    class Sprite_ProjectRBossHUD extends Sprite {
        initialize() {
            super.initialize();
            this._bar = new PIXI.Graphics();
            this.addChild(this._bar);
            this._name = makeText(760, 34, { fontSize: 26, align: "left" });
            this._name.y = -34;
            this.addChild(this._name);
            this._phase = makeText(300, 34, { fontSize: 20, align: "right", color: "#ffd479" });
            this._phase.x = 460;
            this._phase.y = -30;
            this.addChild(this._phase);
            this._signature = "";
            this.x = (BASE_WIDTH - 760) / 2;
            this.y = 70;
            this.visible = false;
        }

        update() {
            super.update();
            const boss = root.ProjectRBossFramework?.getHudState?.();
            this.visible = !!boss;
            if (!boss) {
                this._signature = "";
                return;
            }
            const signature = JSON.stringify(boss);
            if (signature === this._signature) return;
            this._signature = signature;
            const width = 760, height = 18;
            const ratio = Math.max(0, Math.min(1, boss.ratio));
            this._bar.clear();
            this._bar.lineStyle(2, 0xf3f6fb, 0.9);
            this._bar.beginFill(0x1a0d12, 0.9);
            this._bar.drawRoundedRect(0, 0, width, height, 6);
            this._bar.endFill();
            this._bar.lineStyle(0);
            this._bar.beginFill(0xc0392b, 1);
            this._bar.drawRoundedRect(3, 3, Math.max(0, (width - 6) * ratio), height - 6, 4);
            this._bar.endFill();
            this._name.setText(`${boss.name}　${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`);
            this._phase.setText(boss.phaseCount > 1 ? `${boss.phaseLabel}（${boss.phaseIndex + 1}/${boss.phaseCount}）` : "");
        }
    }

    class Sprite_ProjectRPartyHUD extends Sprite {
        initialize() {
            super.initialize();
            this._rows = [0, 1].map(index => {
                const row = new Sprite();
                row._bar = new PIXI.Graphics();
                row.addChild(row._bar);
                row._text = makeText(300, 28, { fontSize: 18 });
                row._text.y = -26;
                row.addChild(row._text);
                row.y = 60 + index * 52;
                row.visible = false;
                this.addChild(row);
                return row;
            });
            this._signature = "";
            this.x = 24;
            this.y = 120;
        }

        update() {
            super.update();
            const members = root.ProjectRPartyCombat?.members?.() || [];
            const signature = JSON.stringify(members.map(m => [m.actorId, m.hp, m.down]));
            if (signature === this._signature) return;
            this._signature = signature;
            this._rows.forEach((row, index) => {
                const member = members[index];
                row.visible = !!member;
                if (!member) return;
                const def = root.ProjectRPartyCombat.allyDefinition(member.actorId);
                const actor = typeof $gameActors !== "undefined" ? $gameActors.actor(member.actorId) : null;
                const name = def?.name || actor?.name?.() || `Actor${member.actorId}`;
                const ratio = member.maxHp > 0 ? member.hp / member.maxHp : 0;
                row._bar.clear();
                row._bar.lineStyle(2, 0xf3f6fb, 0.85);
                row._bar.beginFill(0x0d1622, 0.9);
                row._bar.drawRoundedRect(0, 0, 260, 12, 4);
                row._bar.endFill();
                row._bar.lineStyle(0);
                row._bar.beginFill(member.down ? 0x555b66 : 0x2ecc71, 1);
                row._bar.drawRoundedRect(2, 2, Math.max(0, 256 * ratio), 8, 3);
                row._bar.endFill();
                row._text.setText(member.down ? `${name}　DOWN` : `${name}　${Math.ceil(member.hp)} / ${member.maxHp}`,
                    { color: member.down ? "#9aa3b2" : "#f3f6fb" });
            });
        }
    }

    // 戦闘HUD本体(Manager)の子として追加する。Managerが隠れている間は一緒に隠れる。
    const _createProjectRBattleHUD = Scene_Map.prototype.createProjectRBattleHUD;
    Scene_Map.prototype.createProjectRBattleHUD = function() {
        const hadLayer = !!this._projectRBattleHudLayer;
        _createProjectRBattleHUD.apply(this, arguments);
        const layer = this._projectRBattleHudLayer;
        if (hadLayer || !layer || layer._projectRExtras) return;
        layer._projectRExtras = true;
        layer.addChild(new Sprite_ProjectRBossHUD());
        layer.addChild(new Sprite_ProjectRPartyHUD());
    };

    root.Sprite_ProjectRBossHUD = Sprite_ProjectRBossHUD;
    root.Sprite_ProjectRPartyHUD = Sprite_ProjectRPartyHUD;
})();
