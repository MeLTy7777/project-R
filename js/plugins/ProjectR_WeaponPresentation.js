/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 武器・斬撃の見た目（360°斬撃、銃口の発光/弾道、リロード音）。表示専用。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @base ProjectR_CombatPresence
 * @orderAfter ProjectR_CombatPresence
 * @orderAfter ProjectR_HermesUltimate
 * @orderAfter ProjectR_HermesSwordsmanship
 *
 * @param BladeImage
 * @text 剣の画像（img/pictures/、拡張子なし）
 * @desc 空なら図形で刃を描きます。画像は「真上(0度)を向いた状態」で、刃の根元が画像の下端中央になる向きで作ってください。
 * @type file
 * @dir img/pictures/
 * @default
 *
 * @param SlashColor
 * @text 通常剣の斬撃の色
 * @type string
 * @default #dfe8ff
 *
 * @param GodSlashColor
 * @text 神の斬撃(Hermes剣術/奥義)の色
 * @type string
 * @default #ffd479
 *
 * @param SlashFrames
 * @text 斬撃の表示frame数
 * @type number
 * @min 2
 * @default 12
 *
 * @param SlashSweepDegrees
 * @text 斬撃が掃く角度
 * @type number
 * @min 10
 * @max 360
 * @default 110
 *
 * @param SlashRadiusPixels
 * @text 斬撃の半径(px)
 * @type number
 * @min 8
 * @default 78
 *
 * @param MuzzleColor
 * @text 銃口の発光色
 * @type string
 * @default #ffe9a8
 *
 * @param MuzzleOffsetPixels
 * @text 銃口の位置（プレイヤー中心から・px）
 * @type number
 * @default 30
 *
 * @param TracerFrames
 * @text 弾道線の表示frame数（0で無し）
 * @type number
 * @min 0
 * @default 6
 *
 * @param ReloadSeName
 * @text リロード音（audio/se）
 * @desc 専用のリロード音素材はまだ無いため、仮に既存SEを使います。差し替えはここだけ。
 * @type file
 * @dir audio/se/
 * @default Gun2
 *
 * @param ReloadSeVolume
 * @type number
 * @min 0
 * @max 100
 * @default 50
 *
 * @help
 * ProjectR_WeaponPresentation.js
 *
 * ダメージ・命中・弾薬・Hitboxは一切変えない「見た目だけ」の層です。公式Action Combatの構成はそのままです。
 *   通常の剣  : Swing Weapon(4方向) + 短寿命Dynamic Event Hitbox + Database武器ダメージ(CE1)は従来どおり。
 *               これに加えて、マウス方向(360°)へ刃の斬撃を重ねて描きます。
 *   Hermes剣術: 既存のHitbox(マウス方向・360°)が出た瞬間、そのHitboxと同じ角度で斬撃を描きます。
 *   Hermes奥義: 6連斬撃の1回ごとに、Hitboxと同じ角度で斬撃を描きます（Hitbox側は変更しません）。
 *   銃(G17)   : 弾が出る攻撃のとき、マウス方向の銃口に発光と短い弾道線。リロードで音。
 *               弾そのもの(Bullet)・弾数・リロードは公式のGun APIのままです（二重の弾薬システムはありません）。
 * 見た目は戦闘HUDより下、キャラクターより上に描き、Hendrix Hotbar等には介入しません。
 *
 * 【素材の状況（未解決）】
 *   剣の専用画像はありません。img/pictures/Pan.png は公式Swing Weaponの暫定画像(フライパン)で、
 *   img/system/Weapons1-3.png は横スクロール戦闘用の武器シートのため360°回転には向きません。
 *   BladeImage に画像名を指定すれば、その画像を回転して使います（空なら図形）。
 *   リロード専用の音素材もまだ無く、既存のGun2を仮に使っています。
 *
 * API: ProjectRWeaponPresentation
 *   playSlash({ degree, color?, frames?, sweep?, radius?, god? }) / playMuzzle({ degree, color? })
 *   playReload() / activeCount() / clear()
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const params = PluginManager.parameters("ProjectR_WeaponPresentation");
    const num = (value, fallback, min = -Infinity) => {
        const n = Number(value);
        return Number.isFinite(n) && n >= min ? n : fallback;
    };
    const color = (value, fallback) => {
        const match = String(value || "").trim().match(/^#?([0-9a-f]{6})$/i);
        return match ? parseInt(match[1], 16) : fallback;
    };
    const config = Object.freeze({
        bladeImage: String(params.BladeImage || "").trim(),
        slashColor: color(params.SlashColor, 0xdfe8ff), godSlashColor: color(params.GodSlashColor, 0xffd479),
        slashFrames: Math.floor(num(params.SlashFrames, 12, 2)), sweep: num(params.SlashSweepDegrees, 110, 10),
        radius: num(params.SlashRadiusPixels, 78, 8), muzzleColor: color(params.MuzzleColor, 0xffe9a8),
        muzzleOffset: num(params.MuzzleOffsetPixels, 30, 0), tracerFrames: Math.floor(num(params.TracerFrames, 6, 0)),
        reloadSe: params.ReloadSeName === undefined ? "Gun2" : String(params.ReloadSeName).trim(), reloadVolume: num(params.ReloadSeVolume, 50, 0)
    });

    // ---- エフェクト(論理)。描画先が無くても追加・経過・破棄できる ----
    const effects = [];
    const rad = degree => (degree - 90) * Math.PI / 180; // 上=0度・時計回り → 画面の角度
    const normalize = degree => ((degree % 360) + 360) % 360;

    const playSlash = (options = {}) => {
        if (!Number.isFinite(options.degree)) return false;
        const frames = Math.floor(num(options.frames, config.slashFrames, 2));
        effects.push({ kind: "slash", degree: normalize(options.degree), age: 0, frames,
            color: options.color ?? (options.god ? config.godSlashColor : config.slashColor),
            sweep: num(options.sweep, config.sweep, 10), radius: num(options.radius, config.radius, 8) });
        return true;
    };
    const playMuzzle = (options = {}) => {
        if (!Number.isFinite(options.degree)) return false;
        const degree = normalize(options.degree);
        effects.push({ kind: "muzzle", degree, age: 0, frames: 6, color: options.color ?? config.muzzleColor });
        if (config.tracerFrames > 0) {
            effects.push({ kind: "tracer", degree, age: 0, frames: config.tracerFrames, color: options.color ?? config.muzzleColor });
        }
        return true;
    };
    const playReload = () => {
        if (!config.reloadSe || typeof AudioManager === "undefined") return false;
        AudioManager.playSe({ name: config.reloadSe, volume: config.reloadVolume, pitch: 90, pan: 0 });
        return true;
    };

    // ---- 描画: 1フレーム分。中心はプレイヤーの画面座標 ----
    const centerOf = () => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!player || typeof player.screenX !== "function") return null;
        return { x: player.screenX(), y: player.screenY() - 24 };
    };
    // BladeImage指定時: その画像を刃として、掃く角度に合わせて回転する(画像は真上向き・根元が下端中央)。
    const drawBladeImage = (g, effect, center, degree, fade) => {
        if (!config.bladeImage || typeof Sprite === "undefined" || typeof ImageManager === "undefined") return;
        if (!effect.sprite) {
            effect.sprite = new Sprite(ImageManager.loadPicture(config.bladeImage));
            effect.sprite.anchor.set(0.5, 1);
            g.addChild(effect.sprite);
        }
        effect.sprite.x = center.x;
        effect.sprite.y = center.y;
        effect.sprite.rotation = degree * Math.PI / 180;
        effect.sprite.alpha = 0.3 + 0.7 * fade;
    };
    const drawEffect = (g, effect, center) => {
        const t = Math.min(1, effect.age / effect.frames);
        const fade = 1 - t;
        if (effect.kind === "slash") {
            const start = effect.degree - effect.sweep / 2;
            const now = start + effect.sweep * (1 - (1 - t) * (1 - t)); // 終わりに向けて減速
            const a0 = rad(start), a1 = rad(now);
            g.lineStyle(10 * fade + 2, effect.color, 0.55 * fade + 0.1);
            g.arc(center.x, center.y, effect.radius, a0, a1);
            g.lineStyle(4, 0xffffff, 0.9 * fade + 0.1);
            g.moveTo(center.x + Math.cos(a1) * effect.radius * 0.25, center.y + Math.sin(a1) * effect.radius * 0.25);
            g.lineTo(center.x + Math.cos(a1) * effect.radius, center.y + Math.sin(a1) * effect.radius);
            drawBladeImage(g, effect, center, now, fade);
        } else if (effect.kind === "muzzle") {
            const a = rad(effect.degree);
            const mx = center.x + Math.cos(a) * config.muzzleOffset, my = center.y + Math.sin(a) * config.muzzleOffset;
            const size = 16 * fade + 4;
            g.lineStyle(0);
            g.beginFill(effect.color, 0.9 * fade + 0.1);
            g.drawPolygon([mx + Math.cos(a) * size * 1.8, my + Math.sin(a) * size * 1.8,
                mx + Math.cos(a + 1.9) * size * 0.7, my + Math.sin(a + 1.9) * size * 0.7,
                mx + Math.cos(a - 1.9) * size * 0.7, my + Math.sin(a - 1.9) * size * 0.7]);
            g.endFill();
        } else if (effect.kind === "tracer") {
            const a = rad(effect.degree);
            const sx = center.x + Math.cos(a) * config.muzzleOffset, sy = center.y + Math.sin(a) * config.muzzleOffset;
            g.lineStyle(2, effect.color, 0.7 * fade);
            g.moveTo(sx, sy);
            g.lineTo(sx + Math.cos(a) * 220, sy + Math.sin(a) * 220);
        }
    };
    const advance = () => {
        for (let i = effects.length - 1; i >= 0; i--) {
            if (++effects[i].age > effects[i].frames) {
                effects[i].sprite?.parent?.removeChild(effects[i].sprite);
                effects.splice(i, 1);
            }
        }
    };

    // ---- 神の攻撃を観察する(Hitbox側は変更しない) ----
    let lastUltimate = { id: 0, index: -1 };
    const seenSwordHitboxes = new Set();
    const pollGodAttacks = () => {
        const ultimate = root.ProjectRHermesUltimate?.getHermesUltimateState?.();
        if (ultimate) {
            if (ultimate.instanceId !== lastUltimate.id) lastUltimate = { id: ultimate.instanceId, index: -1 };
            while (lastUltimate.index < ultimate.currentSlashIndex) {
                lastUltimate.index++;
                playSlash({ degree: ultimate.slashDegrees[lastUltimate.index], god: true, frames: 10 });
            }
        } else {
            lastUltimate = { id: 0, index: -1 };
        }
        const sword = root.ProjectRHermesSwordsmanship?.getActiveHitboxes?.() || [];
        const current = new Set(sword.map(h => h.eventId));
        for (const hitbox of sword) {
            if (!seenSwordHitboxes.has(hitbox.eventId)) {
                seenSwordHitboxes.add(hitbox.eventId);
                playSlash({ degree: hitbox.degree, god: true });
            }
        }
        for (const id of [...seenSwordHitboxes]) if (!current.has(id)) seenSwordHitboxes.delete(id);
    };

    // ---- 通常武器: 攻撃入力が受理されたとき(CE1が予約された)にだけ描く ----
    const mouseDegree = () => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!player || typeof TouchInput === "undefined") return null;
        const dx = TouchInput.x - player.screenX(), dy = TouchInput.y - player.screenY();
        if (![dx, dy].every(Number.isFinite) || Math.hypot(dx, dy) < 1e-8) return null;
        return normalize(Math.atan2(dy, dx) * 180 / Math.PI + 450);
    };
    const equippedWeapon = () => {
        const leader = typeof $gameParty !== "undefined" ? $gameParty.leader?.() : null;
        return leader ? leader.weapons?.()[0] || null : null;
    };
    const isGun = weapon => !!weapon && /<capacity:/i.test(weapon.note || "");
    const attackCommonEventId = () => root.ProjectRCombatPresence?.settings?.attackCommonEventId ?? 1;
    const onAttackAccepted = () => {
        const weapon = equippedWeapon();
        const degree = mouseDegree();
        if (!weapon || degree === null) return;
        if (isGun(weapon)) {
            // 弾が出るとき(弾数>0)だけ銃口を光らせる。空撃ちでは光らない。
            const ammo = typeof root.gunAmmo === "function" ? root.gunAmmo() : 0;
            if (ammo > 0) playMuzzle({ degree });
        } else {
            playSlash({ degree });
        }
    };
    if (typeof Game_Temp !== "undefined") {
        const _reserve = Game_Temp.prototype.reserveCommonEvent;
        Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
            const isAttack = Number(commonEventId) === attackCommonEventId();
            const queue = this._commonEventQueue;
            const before = queue ? queue.length : 0;
            const result = _reserve.apply(this, arguments);
            // 他のpluginが拒否した(戦闘外・死亡中)ときはキューが増えない = 見た目も出さない。
            if (isAttack && queue && queue.length > before) {
                try { onAttackAccepted(); } catch (_error) { /* 表示のみ */ }
            }
            return result;
        };
    }

    // ---- リロード: 公式GunReloadコマンドをラップ(弾数が増えたときだけ音) ----
    const engineCommand = "Hendrix_Action_Engine:GunReload";
    if (typeof PluginManager !== "undefined" && PluginManager._commands && typeof PluginManager._commands[engineCommand] === "function") {
        const original = PluginManager._commands[engineCommand];
        PluginManager._commands[engineCommand] = function() {
            const before = typeof root.gunAmmo === "function" ? root.gunAmmo() : 0;
            const result = original.apply(this, arguments);
            try {
                if ((typeof root.gunAmmo === "function" ? root.gunAmmo() : 0) > before) playReload();
            } catch (_error) { /* 表示のみ */ }
            return result;
        };
    }

    // ---- Spriteset: 描画層(キャラクターの上・HUDの下) ----
    if (typeof Spriteset_Map !== "undefined") {
        const _createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
        Spriteset_Map.prototype.createLowerLayer = function() {
            _createLowerLayer.apply(this, arguments);
            const layer = new PIXI.Graphics();
            layer.name = "ProjectRWeaponPresentation";
            this._projectRWeaponLayer = layer;
            (this._baseSprite || this).addChild(layer);
        };
        const _update = Spriteset_Map.prototype.update;
        Spriteset_Map.prototype.update = function() {
            _update.apply(this, arguments);
            const layer = this._projectRWeaponLayer;
            if (!layer) return;
            pollGodAttacks();
            layer.clear();
            const center = centerOf();
            if (center) for (const effect of effects) drawEffect(layer, effect, center);
            advance();
        };
    }
    // マップ移動・ロードで残さない。
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { for (const e of effects) e.sprite?.parent?.removeChild(e.sprite); effects.length = 0; seenSwordHitboxes.clear(); return _setup.apply(this, arguments); };
    }

    root.ProjectRWeaponPresentation = {
        config, playSlash, playMuzzle, playReload,
        activeCount: () => effects.length, effects: () => effects.map(e => ({ ...e })),
        clear: () => { for (const e of effects) e.sprite?.parent?.removeChild(e.sprite); effects.length = 0; },
        // テスト/診断用の入口
        _poll: pollGodAttacks, _draw: (g, center) => { for (const e of effects) drawEffect(g, e, center); advance(); }
    };
})();
