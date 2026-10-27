/*:
 * @target MZ
 * @plugindesc v1.2.0 ProjectR 武器・斬撃・状態の見た目（360°斬撃、銃口の発光、睡眠/精神安定のふきだし）。表示専用。銃本体はProjectR_GunSystem。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @base ProjectR_CombatPresence
 * @orderAfter ProjectR_CombatPresence
 * @orderAfter ProjectR_CharacterPresentation
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
 * @help
 * ProjectR_WeaponPresentation.js
 *
 * ダメージ・命中・弾薬・Hitboxは一切変えない「見た目だけ」の層です。公式Action Combatの構成はそのままです。
 *   通常の剣  : Swing Weapon(4方向) + 短寿命Dynamic Event Hitbox + Database武器ダメージ(CE1)は従来どおり。
 *               これに加えて、マウス方向(360°)へ刃の斬撃を重ねて描きます。
 *   Hermes剣術: 既存のHitbox(マウス方向・360°)が出た瞬間、そのHitboxと同じ角度で斬撃を描きます。
 *   Hermes奥義: 6連斬撃の1回ごとに、Hitboxと同じ角度で斬撃を描きます（Hitbox側は変更しません）。
 *   銃(G17)   : 銃の構え/弾/弾薬/リロード/反動は ProjectR_GunSystem が持ちます。ここは銃口の発光だけを、
 *               GunSystemが渡す銃口の点に描きます(旧: 体の中心の発光・弾道線・リロード音は撤去)。
 * 見た目は戦闘HUDより下、キャラクターより上に描き、Hendrix Hotbar等には介入しません。
 *
 * 【状態の見た目(v1.1.0)】敵にもプレイヤーにも状態アイコンが出ないため、効いたかどうかが見えませんでした。
 *   葦笛睡眠(State 32)が効いている敵: 頭上にZzzのふきだし(約1.5秒ごと)。
 *   リラの精神安定(State 34)が付いた瞬間: プレイヤー頭上に音符のふきだし。
 *   アポロンの病(State 33)が効いている敵: 頭上に汗のふきだし(1秒ごと=DoTの間隔と同じ)。MZ実機でDiseaseに何の表示も無かったため追加。
 *   状態は読むだけで、付与・解除・時間・AIには一切触れません(ProjectRHermesReedFluteSleep.isEventSleeping /
 *   ProjectRApolloLyreCalm.isPlayerCalm / ProjectRApolloDiseaseAttack.isEventDiseased の公開APIを見ます)。ふきだし画像は標準のimg/system/Balloon.pngです。
 *
 * 【素材の状況（未解決）】
 *   剣の専用画像はありません。img/pictures/Pan.png は公式Swing Weaponの暫定画像(フライパン)で、
 *   img/system/Weapons1-3.png は横スクロール戦闘用の武器シートのため360°回転には向きません。
 *   BladeImage に画像名を指定すれば、その画像を回転して使います（空なら図形）。
 *
 * API: ProjectRWeaponPresentation
 *   playSlash({ degree, color?, frames?, sweep?, radius?, god? }) / playMuzzle({ degree, point:{x,y}, color? })
 *   activeCount() / clear()
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
        radius: num(params.SlashRadiusPixels, 78, 8), muzzleColor: color(params.MuzzleColor, 0xffe9a8)
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
    // 銃口の発光は、GunSystemが渡した画面上の銃口点(point)にだけ描く。足元からの相対位置で持つので、
    // 発光中にプレイヤーが動いても銃口についていく。pointが無ければ描かない(体の中心には出さない)。
    const playMuzzle = (options = {}) => {
        if (!Number.isFinite(options.degree) || !options.point) return false;
        const feet = feetOf();
        if (!feet || ![options.point.x, options.point.y].every(Number.isFinite)) return false;
        const rel = { x: options.point.x - feet.x, y: options.point.y - feet.y };
        // 発光は4フレームの短い閃光。そのあと銃口から立ちのぼる薄い煙(14フレーム)。
        effects.push({ kind: "muzzle", degree: normalize(options.degree), age: 0, frames: 4,
            color: options.color ?? config.muzzleColor, rel });
        effects.push({ kind: "smoke", degree: normalize(options.degree), age: 0, frames: 14, rel });
        return true;
    };

    // ---- 描画: 1フレーム分。中心はプレイヤーの画面座標 ----
    const feetOf = () => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!player || typeof player.screenX !== "function") return null;
        return { x: player.screenX(), y: player.screenY() };
    };
    // 斬撃の中心は CharacterPresentation の melee アンカー(体の高さに追従)。無ければ従来の足元-24px。
    const centerOf = () => {
        const anchored = root.ProjectRCharacterPresentation?.anchorScreen?.("melee");
        if (anchored) return anchored;
        const feet = feetOf();
        return feet ? { x: feet.x, y: feet.y - 24 } : null;
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
            // 銃口の点(足元+相対)だけの小さく短い閃光。体の中心の大きな発光はしない。
            // 橙の小さな円錐(明るい床でも見える)→淡い黄の円錐→白い芯、の3層。長さは約9〜14px。
            const feet = feetOf();
            if (!feet || !effect.rel) return;
            const a = rad(effect.degree);
            const mx = feet.x + effect.rel.x, my = feet.y + effect.rel.y;
            const size = 4 * fade + 2;
            g.lineStyle(0);
            g.beginFill(0xff8a1f, 0.75 * fade + 0.1);
            g.drawPolygon([mx + Math.cos(a) * size * 2.6, my + Math.sin(a) * size * 2.6,
                mx + Math.cos(a + 1.7) * size * 0.8, my + Math.sin(a + 1.7) * size * 0.8,
                mx + Math.cos(a - 1.7) * size * 0.8, my + Math.sin(a - 1.7) * size * 0.8]);
            g.endFill();
            g.beginFill(effect.color, 0.9 * fade + 0.1);
            g.drawPolygon([mx + Math.cos(a) * size * 1.7, my + Math.sin(a) * size * 1.7,
                mx + Math.cos(a + 1.7) * size * 0.5, my + Math.sin(a + 1.7) * size * 0.5,
                mx + Math.cos(a - 1.7) * size * 0.5, my + Math.sin(a - 1.7) * size * 0.5]);
            g.endFill();
            g.beginFill(0xffffff, 0.85 * fade + 0.1);
            g.drawCircle(mx, my, 1.4 * fade + 0.8);
            g.endFill();
        } else if (effect.kind === "smoke") {
            // 控えめな煙: 小さな灰色の円が銃口から少し進み、上へ流れながら薄くなる(大きな玉にはしない)。
            const feet = feetOf();
            if (!feet || !effect.rel) return;
            const a = rad(effect.degree);
            const mx = feet.x + effect.rel.x, my = feet.y + effect.rel.y;
            g.lineStyle(0);
            for (let k = 0; k < 2; k++) {
                const drift = (4 + k * 3) * t + 2 + k * 2;
                const px = mx + Math.cos(a) * drift + (k ? 2 : -1) * t;
                const py = my + Math.sin(a) * drift - 5 * t - k * 2 * t;
                g.beginFill(0xb9bec8, 0.3 * fade);
                g.drawCircle(px, py, 1.6 + 2.2 * t + k * 0.6);
                g.endFill();
            }
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

    // ---- 状態の見た目: 公開APIで読むだけ。標準のふきだしを出す(Zzz=10, 音符=3) ----
    const BALLOON_SLEEP = 10, BALLOON_CALM = 3, BALLOON_DISEASE = 6, SLEEP_REPEAT_FRAMES = 90, DISEASE_REPEAT_FRAMES = 60;
    const sleepFrames = new Map(); // eventId -> 経過frame(睡眠中のみ)
    const diseaseFrames = new Map(); // eventId -> 経過frame(病の間のみ)
    let wasCalm = false;
    const pollStates = () => {
        const temp = typeof $gameTemp !== "undefined" ? $gameTemp : null;
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        if (!temp || typeof temp.requestBalloon !== "function" || !map) return;
        const flute = root.ProjectRHermesReedFluteSleep;
        if (flute && typeof flute.isEventSleeping === "function") {
            for (const event of map.events()) {
                if (!event || !event.databaseEnemy) continue;
                const id = event.eventId();
                if (!flute.isEventSleeping(id)) { sleepFrames.delete(id); continue; }
                const frame = sleepFrames.get(id) || 0;
                if (frame % SLEEP_REPEAT_FRAMES === 0) temp.requestBalloon(event, BALLOON_SLEEP);
                sleepFrames.set(id, frame + 1);
            }
        }
        const plague = root.ProjectRApolloDiseaseAttack;
        if (plague && typeof plague.isEventDiseased === "function") {
            for (const event of map.events()) {
                if (!event || !event.databaseEnemy) continue;
                const id = event.eventId();
                if (!plague.isEventDiseased(id)) { diseaseFrames.delete(id); continue; }
                const frame = diseaseFrames.get(id) || 0;
                if (frame % DISEASE_REPEAT_FRAMES === 0) temp.requestBalloon(event, BALLOON_DISEASE);
                diseaseFrames.set(id, frame + 1);
            }
        }
        const calm = !!root.ProjectRApolloLyreCalm?.isPlayerCalm?.();
        if (calm && !wasCalm && typeof $gamePlayer !== "undefined" && $gamePlayer) temp.requestBalloon($gamePlayer, BALLOON_CALM);
        wasCalm = calm;
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
        if (isGun(weapon)) return; // 銃はProjectR_GunSystemが受ける
        playSlash({ degree });
        root.ProjectRCharacterPresentation?.request?.("SwordAttack", { degree, source: "sword" });
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
            try { pollStates(); } catch (_error) { /* 表示のみ */ }
            layer.clear();
            const center = centerOf();
            if (center) for (const effect of effects) drawEffect(layer, effect, center);
            advance();
        };
    }
    // マップ移動・ロードで残さない。
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { for (const e of effects) e.sprite?.parent?.removeChild(e.sprite); effects.length = 0; seenSwordHitboxes.clear(); sleepFrames.clear(); diseaseFrames.clear(); wasCalm = false; return _setup.apply(this, arguments); };
    }

    root.ProjectRWeaponPresentation = {
        config, playSlash, playMuzzle,
        activeCount: () => effects.length, effects: () => effects.map(e => ({ ...e })),
        clear: () => { for (const e of effects) e.sprite?.parent?.removeChild(e.sprite); effects.length = 0; },
        // テスト/診断用の入口
        _poll: pollGodAttacks, _pollStates: pollStates, _draw: (g, center) => { for (const e of effects) drawEffect(g, e, center); advance(); }
    };
})();
