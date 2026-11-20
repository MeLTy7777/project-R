/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR フィールド戦闘のボスHUD(Stage 7D-A): ボスの名前・HP(現在/最大・バー)・フェーズを、画面上部に出す。実際のHPを読むだけ。
 * @author ProjectR
 * @base ProjectR_BattleHUD
 * @base ProjectR_FieldCombat
 * @orderAfter ProjectR_BattleHUD
 * @orderAfter ProjectR_FieldCombat
 * @orderAfter ProjectR_FieldStrongEnemy
 * @orderAfter ProjectR_CombatExtrasHUD
 *
 * @help
 * ProjectR_FieldBossHud.js
 *
 * 【目的】 フィールド戦闘(ProjectR_FieldCombat)の「ボス戦」だけで、ボスの名前・HP・フェーズを出す共通のHUD。特定のボスに固定しない。
 *   既存の ProjectR_CombatExtrasHUD(カード戦闘のボスHUD)と同じ層(ProjectR_BattleHUD の中)・同じ見た目の作り。位置は、ULTIMATE のHUDを避けて、その下。
 *   カード戦闘のボス(ProjectRBossFramework)とは同時に出ない(あちらは別の戦闘)。
 *
 * 【ボスの指定】 敵イベントのメモ(または有効なページの注釈)に書く。
 *   <fieldBoss: 名前 | phases=2 | color=c0392b | label=PHASE>
 *     名前       省略すると、敵データベースの名前。
 *     phases=N   段階の数。省略すると、強敵(<fieldEnemy: strong=...>)のプロフィールの段階数(なければ 1)。1 のときは、フェーズを出さない。
 *     color=RRGGBB  HPバーの色(省略 = 既定)。 label=  フェーズの前の文字(既定 PHASE)。
 *   (位置: 画面上部の中央。既存の ULTIMATE のHUDと重ならないよう、その下)
 *   <fieldBoss> を持つ敵がいない戦闘(Map008〜Map010 など)では、何も出ない。ボスが複数いるときは、イベントIDがいちばん小さいボスを出す。
 *
 * 【表示】 名前 / HP 現在 / 最大 と、HPバー(遅れて減る残像・強敵の遷移の閾値の目盛り)/ PHASE 現在/段階数(遷移の間は金色)。
 *   HP は、いまゲームに適用されている実際の値(Hendrix の getCurrentEventHp / getMaxEventHp。ダメージは次のフレームで適用される)を毎フレーム読む。
 *   フェーズは ProjectRFieldStrongEnemy.getPhase(の段階)。HUD からゲームの状態は変えない(読むだけ)。
 *   表示するのは、フィールド戦闘中(ProjectRFieldCombat.isActive())で、指定されたボスがいるときだけ。勝利・撤退・マップ移動・戦闘の終了で消える。
 *   ボスが倒れたら、HPが 0 のまま少しだけ(deadFrames)残してから消える。
 *
 * 【API】 ProjectRFieldBossHud
 *   getHudState() -> { eventId, name, hp, maxHp, ratio, phaseIndex, phaseCount, phaseLabel, transition, marks, color, dead } | null
 *   parseTag(text) / configure({ x, y, width, height, deadFrames, ghostRate, color, label }) / getConfig() / layout()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const BASE_WIDTH = 1920;
    // 表示の既定(1920×1080 基準)。画面上部の中央は、既存の ULTIMATE のHUD(y 20〜150)が使っているので、その下(名前 y≈160 / バー y=196 / HPの数 y≈220〜245)に置く。ボスごとの color / label はタグで変えられる
    const DEFAULTS = Object.freeze({ x: 580, y: 196, width: 760, height: 20, deadFrames: 30, ghostRate: 0.005, color: 0xc0392b, label: "PHASE" });
    let config = { ...DEFAULTS };
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const safe = (fn, fallback) => { try { return fn(); } catch (_e) { return fallback; } };

    // ---------- ボスの指定(メモ) ----------
    const eventText = e => ((safe(() => e.event().note, "") || "") + "\n" + (safe(() => e.page().list, []) || []).filter(c => c.code === 108 || c.code === 408).map(c => c.parameters[0]).join("\n"));
    const parseTag = text => {
        const m = /<fieldBoss(?::([^>]*))?>/i.exec(text || "");
        if (!m) return null;
        const cfg = { name: "", phases: 0, color: null, label: null };
        for (const raw of String(m[1] || "").split("|")) {
            const part = raw.trim(); if (!part) continue;
            const kv = /^(\w+)\s*=\s*(.+)$/.exec(part);
            if (!kv) { if (!cfg.name) cfg.name = part; continue; }
            const key = kv[1].toLowerCase(), v = kv[2].trim();
            if (key === "phases") { const n = Math.floor(Number(v)); if (Number.isFinite(n) && n >= 1 && n <= 9) cfg.phases = n; }
            else if (key === "color") { const c = /^#?([0-9a-f]{6})$/i.exec(v); if (c) cfg.color = parseInt(c[1], 16); }
            else if (key === "label") cfg.label = v;
        }
        return cfg;
    };
    const strongProfileOf = e => { const m = /strong=([\w]+)/i.exec(eventText(e)); const api = root.ProjectRFieldStrongEnemy; return m && api && api.PROFILES ? (api.PROFILES[m[1]] || null) : null; };

    // ---------- 状態(実際のHPを読むだけ) ----------
    const build = (e, cfg) => {
        const id = e.eventId(), m = map();
        const hp = Math.max(0, Number(safe(() => m.getCurrentEventHp(id), 0)) || 0);
        const maxHp = Math.max(1, Number(safe(() => m.getMaxEventHp(id), hp)) || hp || 1);
        const api = root.ProjectRFieldStrongEnemy;
        const ph = api && typeof api.getPhase === "function" ? safe(() => api.getPhase(id), null) : null;          // 強敵が持っている実際の段階(プロフィール名・段階数・遷移の閾値を含む。読み出しだけ)
        const prof = strongProfileOf(e);                                                                       // 強敵の情報がまだ無いときの予備(メモの strong=)
        const phaseCount = cfg.phases || (ph && Number.isFinite(ph.phaseCount) ? ph.phaseCount : (prof && Array.isArray(prof.phases) ? prof.phases.length : 1));
        const phaseIndex = Math.max(1, Math.min(phaseCount, ph && Number.isFinite(ph.phase) ? ph.phase : 1));
        const ratio0 = ph && Number.isFinite(ph.transitionRatio) ? ph.transitionRatio : (prof && prof.transition && Number.isFinite(prof.transition.ratio) ? prof.transition.ratio : null);
        const marks = ratio0 !== null && phaseCount > 1 ? [ratio0] : [];
        const name = cfg.name || safe(() => e.databaseEnemy.name, "") || `Boss${id}`, label = cfg.label || config.label;
        return { eventId: id, name, hp, maxHp, ratio: Math.max(0, Math.min(1, hp / maxHp)), phaseIndex, phaseCount, phaseLabel: phaseCount > 1 ? `${label} ${phaseIndex}/${phaseCount}` : "",
            transition: !!(ph && ph.transition), marks, color: cfg.color !== null && cfg.color !== undefined ? cfg.color : config.color, dead: hp <= 0 };
    };
    const getHudState = () => {
        const fc = root.ProjectRFieldCombat, m = map();
        if (!fc || typeof fc.isActive !== "function" || !fc.isActive() || !m) return null;
        const attached = safe(() => fc.listEnemies(), []);
        const bosses = safe(() => m.events().filter(e => e && !e._erased).sort((a, b) => a.eventId() - b.eventId()), []);
        for (const e of bosses) {
            const cfg = parseTag(eventText(e)); if (!cfg) continue;
            const hp = Number(safe(() => m.getCurrentEventHp(e.eventId()), 1));
            if (!attached.includes(e.eventId()) && !(hp <= 0)) continue;                 // 戦闘に付いていない(指定だけの)敵は出さない。倒れたボスは、少しだけ残す
            return build(e, cfg);
        }
        return null;
    };
    const configure = o => {
        const c = o && typeof o === "object" ? o : {};
        for (const k of ["x", "y", "width", "height", "deadFrames", "ghostRate"]) if (c[k] !== undefined && Number.isFinite(Number(c[k]))) config[k] = Number(c[k]);
        if (typeof c.color === "number") config.color = c.color;
        if (typeof c.label === "string" && c.label) config.label = c.label;
        return { ...config };
    };
    const layout = () => ({ x: config.x, y: config.y - 36, width: config.width, height: 36 + config.height + 28 });          // 名前(上)〜HPの数(下)を含む範囲(1920×1080 基準)

    // ---------- 表示(CombatExtrasHUD と同じ層・同じ作り) ----------
    const makeText = (width, height, options) => {
        const sprite = new Sprite(new Bitmap(width, height));
        sprite._signature = "";
        sprite.setText = function(text, overrides = {}) {
            const o = Object.assign({ fontSize: 22, color: "#f3f6fb", align: "left", outlineColor: "rgba(0,0,0,0.8)", outlineWidth: 4 }, options, overrides);
            const signature = JSON.stringify([text, o]);
            if (signature === this._signature) return;
            this._signature = signature;
            const bitmap = this.bitmap;
            bitmap.clear(); bitmap.fontSize = o.fontSize; bitmap.textColor = o.color; bitmap.outlineColor = o.outlineColor; bitmap.outlineWidth = o.outlineWidth;
            bitmap.drawText(String(text ?? ""), 0, 0, bitmap.width, bitmap.height, o.align);
        };
        return sprite;
    };

    class Sprite_ProjectRFieldBossHUD extends Sprite {
        initialize() {
            super.initialize();
            const w = config.width;
            this._bar = new PIXI.Graphics(); this.addChild(this._bar);
            this._name = makeText(w - 240, 34, { fontSize: 26, align: "left" }); this._name.y = -34; this.addChild(this._name);
            this._phase = makeText(240, 34, { fontSize: 20, align: "right", color: "#ffd479" }); this._phase.x = w - 240; this._phase.y = -30; this.addChild(this._phase);
            this._hpText = makeText(w, 28, { fontSize: 17, align: "right" }); this._hpText.y = config.height + 4; this.addChild(this._hpText);
            this._signature = ""; this._key = null; this._ghost = 1; this._deadAge = 0; this.view = null;
            this.x = config.x; this.y = config.y; this.visible = false;
        }

        update() {
            super.update();
            const s = getHudState();
            if (!s) { this.visible = false; this._signature = ""; this._key = null; this._deadAge = 0; this.view = null; return; }          // 勝利・撤退・マップ移動・戦闘の終了・指定のない戦闘: 隠す(状態も捨てる)
            if (s.dead) { if (++this._deadAge > config.deadFrames) { this.visible = false; this.view = null; return; } } else this._deadAge = 0;
            const key = s.eventId + ":" + s.maxHp;
            if (this._key !== key) { this._key = key; this._ghost = s.ratio; }
            else if (s.ratio >= this._ghost) this._ghost = s.ratio;                                                // 回復・満タンは、すぐ追いつく
            else this._ghost = Math.max(s.ratio, this._ghost - config.ghostRate);                                // ダメージは、残像が遅れて追いつく
            this.visible = true; this.view = { name: s.name, hp: s.hp, maxHp: s.maxHp, ratio: s.ratio, ghost: this._ghost, phase: s.phaseLabel, transition: s.transition, marks: s.marks, dead: s.dead };
            const signature = JSON.stringify([this.view, s.color]);
            if (signature === this._signature) return;
            this._signature = signature;
            this.drawBar(s);
            this._name.setText(s.name);
            this._phase.setText(s.phaseLabel ? (s.transition ? `${s.phaseLabel}…` : s.phaseLabel) : "", { color: s.transition ? "#ffe27a" : "#ffd479" });
            this._hpText.setText(`HP ${Math.ceil(s.hp)} / ${Math.ceil(s.maxHp)}`);
        }

        drawBar(s) {
            const w = config.width, h = config.height, g = this._bar;
            g.clear();
            g.lineStyle(s.transition ? 3 : 2, s.transition ? 0xffe27a : 0xf3f6fb, 0.92);
            g.beginFill(0x1a0d12, 0.9); g.drawRoundedRect(0, 0, w, h, 6); g.endFill();
            g.lineStyle(0);
            if (this._ghost > s.ratio) { g.beginFill(0xf1c40f, 0.7); g.drawRoundedRect(3, 3, Math.max(0, (w - 6) * this._ghost), h - 6, 4); g.endFill(); }          // 減った分(残像)
            g.beginFill(s.color, 1); g.drawRoundedRect(3, 3, Math.max(0, (w - 6) * s.ratio), h - 6, 4); g.endFill();
            for (const r of s.marks) { g.lineStyle(2, 0xffffff, 0.85); g.moveTo(3 + (w - 6) * r, 1); g.lineTo(3 + (w - 6) * r, h - 1); }          // フェーズが変わる HP の目盛り
        }
    }

    // 戦闘HUD本体(Manager)の子として追加する(CombatExtrasHUD と同じ。Manager が隠れている間は一緒に隠れる)
    const _createProjectRBattleHUD = Scene_Map.prototype.createProjectRBattleHUD;
    Scene_Map.prototype.createProjectRBattleHUD = function() {
        const hadLayer = !!this._projectRBattleHudLayer;
        _createProjectRBattleHUD.apply(this, arguments);
        const layer = this._projectRBattleHudLayer;
        if (hadLayer || !layer || layer._projectRFieldBossHud) return;
        layer._projectRFieldBossHud = true;
        layer.addChild(new Sprite_ProjectRFieldBossHUD());
    };

    root.Sprite_ProjectRFieldBossHUD = Sprite_ProjectRFieldBossHUD;
    root.ProjectRFieldBossHud = Object.freeze({ VERSION: "0.1.0", getHudState, parseTag, configure, getConfig: () => ({ ...config }), layout, defaults: DEFAULTS });
})();
