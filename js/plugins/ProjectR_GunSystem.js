/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 新銃システム(G17等)。公式Easy Gun System + Display Weapon + 専用弾Prefab。旧コピー実装は置換済み。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @base ProjectR_CombatPresence
 * @base ProjectR_CharacterPresentation
 * @orderAfter ProjectR_WeaponPresentation
 * @orderAfter ProjectR_CharacterPresentation
 *
 * @param WeaponSprite
 * @text 銃の画像(img/pictures/、拡張子なし)
 * @desc Display Weaponで表示する銃。左端が回転中心・右端が銃口になる横向きの画像。武器メモ <projectRGunSprite: 名前> で武器ごとに上書き可。
 * @type file
 * @dir img/pictures/
 * @default ProjectR_G17_Dev
 *
 * @param BulletTemplateName
 * @text 弾Prefab名(Map002テンプレート)
 * @type string
 * @default ProjectR G17 Bullet
 *
 * @param FireCooldownFrames
 * @text 発射の間隔(frame)
 * @type number
 * @min 1
 * @default 12
 *
 * @param ReloadFrames
 * @text リロード時間(frame。モーションと同じ長さ)
 * @type number
 * @min 1
 * @default 40
 *
 * @param BulletMaxFrames
 * @text 弾の最大寿命(frame)
 * @type number
 * @min 1
 * @default 45
 *
 * @param AutoReloadOnEmpty
 * @text 空のとき攻撃入力で自動リロード
 * @type boolean
 * @default true
 *
 * @param ReloadKeyCode
 * @text リロードキー(KeyboardEvent.code)
 * @type string
 * @default KeyR
 *
 * @param ShotSeName
 * @text 発射音(audio/se)
 * @type file
 * @dir audio/se/
 * @default Gun1
 *
 * @param ShotSeVolume
 * @type number
 * @min 0
 * @max 100
 * @default 45
 *
 * @param DryFireSeName
 * @text 空撃ち音(audio/se)
 * @type file
 * @dir audio/se/
 * @default Buzzer1
 *
 * @param ReloadSeName
 * @text リロード音(audio/se)
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
 * ProjectR_GunSystem.js
 *
 * 【構成(公式Action Combatの機能だけで組んでいます)】
 *   弾薬/容量/ストック : 公式 Easy Gun System (武器メモ <capacity: n> <ammo item: 名前> / gunAmmo()等 /
 *                        プラグインコマンド GunAmmoControl・GunReload)。ProjectR独自の弾数カウンタは無し。
 *   構え・360°照準     : 公式 Display Weapon (回転中心は ProjectR_CharacterPresentation の weapon アンカー)。
 *   弾                 : Map002テンプレートPrefab「ProjectR G17 Bullet」を spawnEvent し、発射時の角度を
 *                        rotateTo(度)で一度だけ設定。移動はPrefab側の moveToPosition('forward')。追尾なし。
 *   命中・ダメージ     : 公式 checkCollide(敵, '<projectRGunBullet>') + UpdateEventHp(-player weapon)
 *                        = Databaseの武器ダメージ。1発1Hit。壁(Region255/CombatWall)で消滅。
 *   銃口               : CharacterPresentationのプロファイル(weapon + muzzle)から、照準角で回転して算出。
 *                        弾も発光も同じ点から出ます(体の中心からは出ません)。
 *
 * 【入力】攻撃入力(既存: 左クリック/J = 共通イベント1の予約)をここで受け、旧共通イベントの銃処理は使いません。
 *   リロードは R(既定)。マガジンが満タン/ストック0/リロード中は何も起きません(弾薬は消費しません)。
 *   空の状態で攻撃入力すると、空撃ち音のあと自動でリロード(パラメータでOFF可)。
 * 【見た目】発射=反動(銃の後退と傾き+プレイヤーのGunFireモーション)・銃口の発光。リロード=Reloadモーション+SE。
 *   旧: 体の中心の発光/二重の弾道線/旧Gunオブジェクト/旧Bullet Prefab/CEの発射処理は撤去しました。
 *
 * API: ProjectRGunSystem
 *   fire(source) / requestReload(source) / status() / getActiveBullets() / isReloading() / diagnostics()
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const params = PluginManager.parameters("ProjectR_GunSystem");
    const ENGINE = "Hendrix_Action_Engine";
    const BULLET_TAG = "<projectRGunBullet>";
    const num = (value, fallback, min = -Infinity) => {
        const n = Number(value);
        return Number.isFinite(n) && n >= min ? n : fallback;
    };
    const text = (value, fallback) => value === undefined ? fallback : String(value).trim();
    const config = Object.freeze({
        weaponSprite: text(params.WeaponSprite, "ProjectR_G17_Dev"),
        templateName: text(params.BulletTemplateName, "ProjectR G17 Bullet"),
        cooldown: Math.floor(num(params.FireCooldownFrames, 12, 1)),
        reloadFrames: Math.floor(num(params.ReloadFrames, 40, 1)),
        bulletFrames: Math.floor(num(params.BulletMaxFrames, 45, 1)),
        autoReload: String(params.AutoReloadOnEmpty) !== "false",
        reloadKey: text(params.ReloadKeyCode, "KeyR"),
        shotSe: { name: text(params.ShotSeName, "Gun1"), volume: num(params.ShotSeVolume, 45, 0), pitch: 100, pan: 0 },
        dryFireSe: { name: text(params.DryFireSeName, "Buzzer1"), volume: 30, pitch: 150, pan: 0 },
        reloadSe: { name: text(params.ReloadSeName, "Gun2"), volume: num(params.ReloadSeVolume, 50, 0), pitch: 90, pan: 0 }
    });

    const presentation = () => root.ProjectRCharacterPresentation;
    const map = () => typeof $gameMap !== "undefined" ? $gameMap : null;
    const player = () => typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
    const normalize = degree => ((degree % 360) + 360) % 360;
    const command = (name, args, eventId) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId || 0;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const playSe = se => {
        if (se?.name && typeof AudioManager !== "undefined") AudioManager.playSe({ ...se });
    };

    // ---- 公式Gun APIの読み取り(状態の持ち主はHendrix) ----
    const leaderWeapon = () => {
        const leader = typeof $gameParty !== "undefined" ? $gameParty.leader?.() : null;
        return leader ? leader.equips?.()[0] || null : null;
    };
    const gunData = weapon => {
        if (!weapon || typeof DataManager === "undefined" || !DataManager.isWeapon(weapon)) return null;
        return $gameSystem?.getGunData?.(weapon.id) || null;
    };
    const equippedGun = () => {
        const weapon = leaderWeapon();
        return weapon && gunData(weapon) ? weapon : null;
    };
    const ammo = () => (typeof root.gunAmmo === "function" ? root.gunAmmo() : 0);
    const capacity = () => (typeof root.gunCapacity === "function" ? root.gunCapacity() : 0);
    const reserve = () => (typeof root.gunAmmoInInventory === "function" ? root.gunAmmoInInventory() : 0);
    const canUseWeapon = () => !!root.ProjectRCombatPresence?.canUseWeapon?.() &&
        !root.ProjectR?.PlayerDeath?.isDead?.() && !($gameMessage?.isBusy?.());
    const weaponSpriteFor = weapon => (/<projectRGunSprite:\s*([^>]+?)\s*>/i.exec(weapon?.note || "") || [])[1] || config.weaponSprite;

    // ---- 照準・銃口 ----
    // Display Weaponの回転中心は weapon アンカー。照準角は同じ式(回転中心→マウス)で取り、0=上・時計回りにする。
    const barrelDegree = pivot => {
        if (!pivot || typeof TouchInput === "undefined") return null;
        const dx = TouchInput.x - pivot.x, dy = TouchInput.y - pivot.y;
        if (![dx, dy].every(Number.isFinite) || Math.hypot(dx, dy) < 1e-8) return null;
        return normalize(Math.atan2(dy, dx) * 180 / Math.PI + 450);
    };
    // 弾イベントの「見た目の中心」を画面点Pに置くための実座標(48pxセルの弾スプライト前提)。
    // 画像セル中央=足元スクリーンY(下端-shiftY)から24px上。プレイヤー自身と同じ式なので体の中心から発射しても一致する。
    const eventSpawnPoint = point => {
        const m = map(), p = player();
        if (!m || !p || !point) return null;
        const tw = m.tileWidth(), th = m.tileHeight();
        const shiftY = typeof p.shiftY === "function" ? p.shiftY() : 0;
        const x = m.displayX() + point.x / tw - 0.5;
        const y = m.displayY() + (point.y + shiftY + th / 2) / th - 1;
        return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    };
    const toTileCenter = event => ({ x: event._realX + 0.5, y: event._realY + 0.5 });

    // ---- 弾 ----
    const bullets = new Map(); // eventId -> { map, event, serial, age, last }
    let serial = 0;
    const isBullet = event => !!event?.event?.()?.note?.includes(BULLET_TAG);
    const destroyBullet = (id, record) => {
        bullets.delete(id);
        const m = map();
        if (!m || record.map !== m || m.event(id) !== record.event) return;
        command("DestroyEvent", { target: String(id), destroyNearby: "", permanent: "false" }, id);
    };
    const clearBullets = () => { for (const [id, record] of [...bullets]) destroyBullet(id, record); };
    const trackDamage = (enemyId, attackId, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        return typeof gauge?.trackDamage === "function"
            ? gauge.trackDamage(enemyId, { attackId, source: "damage:gun" }, apply) : apply();
    };
    const spawnBullet = (point, degree, from) => {
        const m = map();
        const templates = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null;
        const template = templates?.find(event => event?.name === config.templateName);
        if (!m || typeof m.spawnEvent !== "function" || typeof root.checkCollide !== "function" || !template ||
                !template.note.includes(BULLET_TAG)) return { ok: false, reason: "bulletTemplateUnavailable" };
        const spawn = eventSpawnPoint(point);
        if (!spawn) return { ok: false, reason: "invalidMuzzle" };
        const before = new Set(m.events());
        try {
            const id = m.spawnEvent(template.id, spawn.x, spawn.y, false, degree);
            const event = id && m.event(id);
            if (!event || before.has(event) || !isBullet(event) || typeof event.rotateTo !== "function") {
                throw Error("bulletCreationFailed");
            }
            event.rotateTo(degree); // 発射時に一度だけ。以後マウスは見ない(追尾なし)。
            if (!Number.isFinite(event._rotation) || Math.abs(event._rotation - degree) > 0.000001) {
                throw Error("bulletRotationFailed");
            }
            bullets.set(id, { map: m, event, serial: ++serial, age: 0, last: from || toTileCenter(event), degree });
            return { ok: true, eventId: id };
        } catch (error) {
            for (const event of m.events()) {
                if (!before.has(event) && isBullet(event)) destroyBullet(event.eventId(), { map: m, event });
            }
            return { ok: false, reason: String(error?.message || error) };
        }
    };

    // ---- 状態(表示/タイマーのみ。セーブしない) ----
    const state = { cooldown: 0, reloadLeft: 0, reloading: false, reloadMode: null, shots: 0, dryFires: 0, reloads: 0,
        lastShot: null, lastReload: null, displayed: null, kick: 0, kickDegree: 0 };
    let pendingReload = [];

    const cancelReload = () => { state.reloading = false; state.reloadLeft = 0; state.reloadMode = null; };

    const fire = (source = "api") => {
        const weapon = equippedGun();
        if (!weapon) return { ok: false, reason: "noGunEquipped" };
        if (state.reloading) return { ok: false, reason: "reloading" };
        if (state.cooldown > 0) return { ok: false, reason: "cooldown" };
        if (ammo() <= 0) {
            state.dryFires++;
            playSe(config.dryFireSe);
            if (config.autoReload) requestReload("auto");
            return { ok: false, reason: "empty" };
        }
        const api = presentation();
        const pivot = api?.anchorScreen("weapon");
        const degree = barrelDegree(pivot);
        if (degree === null) return { ok: false, reason: "invalidAim" };
        const muzzle = api.muzzleScreen({ degree, weaponId: weapon.id, pivot });
        if (!muzzle) return { ok: false, reason: "invalidMuzzle" };
        const p = player();
        const body = { x: p._realX + 0.5, y: p._realY + 0.5 };
        const made = spawnBullet(muzzle, degree, body);
        if (!made.ok) return made;
        // 弾が確かに出たときだけ、公式コマンドで弾薬を1発減らす(旧CEの弾薬減算は撤去済み)。
        command("GunAmmoControl", { slot: "0", target: "ammo", value: "-1" });
        state.cooldown = config.cooldown;
        state.shots++;
        playSe(config.shotSe);
        root.ProjectRWeaponPresentation?.playMuzzle?.({ degree, point: muzzle });
        api.request("GunFire", { degree, source: "gun" });
        state.kick = 1; state.kickDegree = degree;
        state.lastShot = { source, degree, muzzle: { x: muzzle.x, y: muzzle.y }, eventId: made.eventId, serial };
        return { ok: true, eventId: made.eventId, degree, muzzle: { x: muzzle.x, y: muzzle.y } };
    };

    const requestReload = (source = "api") => {
        const weapon = equippedGun();
        if (!weapon) return { ok: false, reason: "noGunEquipped" };
        if (state.reloading) return { ok: false, reason: "alreadyReloading" };
        if (!canUseWeapon() && source !== "auto") return { ok: false, reason: "weaponUnavailable" };
        if (ammo() >= capacity()) return { ok: false, reason: "magazineFull" };
        if (reserve() <= 0) return { ok: false, reason: "noReserveAmmo" };
        state.reloading = true;
        state.reloadLeft = config.reloadFrames;
        state.reloadMode = source;
        state.reloadWeaponId = weapon.id;
        playSe(config.reloadSe);
        presentation()?.request("GunReload", { frames: config.reloadFrames, source: "gun" });
        return { ok: true, frames: config.reloadFrames };
    };
    const finishReload = () => {
        const weapon = equippedGun();
        const before = ammo();
        state.reloading = false;
        state.reloadMode = null;
        if (!weapon || weapon.id !== state.reloadWeaponId) return;
        command("GunReload", { slot: "0" }); // 公式のリロード(ストックから補充)。ここ1か所だけ。
        state.reloads++;
        state.lastReload = { before, after: ammo() };
    };

    // ---- 構え表示(公式Display Weapon)と入力・更新 ----
    const syncDisplay = () => {
        const weapon = equippedGun();
        const wanted = !!weapon && !!map() && canUseWeapon() && !!SceneManager._scene?._spriteset;
        const key = wanted ? `${weapon.id}:${weaponSpriteFor(weapon)}` : null;
        const api = presentation();
        if (key === state.displayed) return;
        if (state.displayed !== null && key === null) {
            command("DisplayWeapon", { status: "false" });
            api?.setAiming(false);
        }
        if (key !== null) {
            const a = api.anchor("weapon");
            const offset = `${a.x}, ${a.y + map().tileHeight() / 2}`; // 公式の式: 回転中心 = 足元 - タイル高/2 + offset
            command("DisplayWeapon", { status: "true", weaponSprite: weaponSpriteFor(weapon), offset, autoFlip: "true" });
            api?.setAiming(true);
        }
        state.displayed = key;
    };
    const stopAll = () => {
        cancelReload();
        clearBullets();
        state.cooldown = 0;
        pendingReload = [];
        if (state.displayed !== null) {
            try { command("DisplayWeapon", { status: "false" }); } catch (_error) { /* 表示のみ */ }
            presentation()?.setAiming(false);
            state.displayed = null;
        }
    };

    const _onKeyDown = Input._onKeyDown;
    Input._onKeyDown = function(event) {
        if (event && event.code === config.reloadKey && !event.repeat) pendingReload.push("keyboard");
        return _onKeyDown.call(this, event);
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        const requests = pendingReload;
        pendingReload = [];
        _Scene_Map_update.apply(this, arguments);
        try {
            if (requests.length) requestReload("keyboard");
        } catch (_error) { /* 入力は握りつぶさずに診断へ */ }
    };

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.apply(this, arguments);
        if (!sceneActive) return;
        try {
            syncDisplay();
            if (this.eventsPaused) return;
            if (state.cooldown > 0) state.cooldown--;
            if (state.reloading) {
                if (!equippedGun() || !canUseWeapon()) cancelReload();
                else if (--state.reloadLeft <= 0) finishReload();
            }
            updateBullets(this);
        } catch (_error) { /* 表示/弾の更新エラーでゲームを止めない */ }
    };
    const pickHitBullet = enemy => {
        const recorded = root.CollisionManager?.lastSourceEventId;
        if (bullets.has(recorded)) return recorded;
        // 弾の見た目の中心(rotateTo後はscreenX/Y)と敵の中心(screenY-タイル高/2)の距離が最小の弾。重なっている弾は1タイル以内。
        const th = map().tileHeight();
        let best = null, bestDistance = Infinity;
        for (const [id, record] of bullets) {
            const d = Math.hypot(record.event.screenX() - enemy.screenX(), record.event.screenY() - (enemy.screenY() - th / 2));
            if (d < bestDistance) { best = id; bestDistance = d; }
        }
        return bestDistance <= map().tileWidth() * 1.2 ? best : null;
    };
    const updateBullets = m => {
        if (!bullets.size) return;
        const wall = root.ProjectR?.CombatOcclusion;
        for (const [id, record] of [...bullets]) {
            if (record.map !== m || m.event(id) !== record.event || record.event._erased) { bullets.delete(id); continue; }
            record.age++;
            const now = toTileCenter(record.event);
            let blocked = record.age > config.bulletFrames;
            if (!blocked && wall?.firstBlockerBetween?.(record.last, now, { mode: "combat" })) blocked = true;
            record.last = now;
            if (!blocked && (root.checkCollide(id, "<destroyProjectile>") || root.checkCollide(id, "map boundary"))) blocked = true;
            if (blocked) destroyBullet(id, record);
        }
        if (!bullets.size) return;
        for (const enemy of m.events()) {
            if (!enemy || enemy._erased || !enemy.event()?.note?.includes("<enemy>")) continue;
            const enemyId = enemy.eventId();
            const hp = m.getCurrentEventHp(enemyId);
            if (hp == null || hp <= 0 || !root.checkCollide(enemyId, BULLET_TAG)) continue;
            // Hendrixは<dmg:>付きの弾でしかlastSourceEventIdを記録しないため、記録が無ければ衝突した敵に最も近い弾を特定する。
            const sourceId = pickHitBullet(enemy);
            const record = bullets.get(sourceId);
            if (!record || record.map !== m || m.event(sourceId) !== record.event) continue;
            try {
                trackDamage(enemyId, `gun:${record.serial}`, () =>
                    command("UpdateEventHp", { eventId: String(enemyId), value: "-player weapon", exceedMaxHealth: "false" }, sourceId));
            } finally {
                destroyBullet(sourceId, record); // 1発1Hit。貫通なし。
            }
            if (!bullets.size) break;
        }
    };

    // ---- 攻撃入力の受け口: 共通イベント1(Hendrixの攻撃ボタン)が受理されたとき、銃ならここへ回す ----
    // 戦闘外/死亡中などの拒否は既存のプラグイン連鎖が先に判定する。受理されたキューだけを取り除き、
    // 旧CEの銃処理を二重に走らせない。
    const attackCommonEventId = () => root.ProjectRCombatPresence?.settings?.attackCommonEventId ?? 1;
    if (typeof Game_Temp !== "undefined") {
        const _reserve = Game_Temp.prototype.reserveCommonEvent;
        Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
            const isAttack = Number(commonEventId) === attackCommonEventId();
            const queue = this._commonEventQueue;
            const before = queue ? queue.length : 0;
            const result = _reserve.apply(this, arguments);
            if (isAttack && queue && queue.length > before && equippedGun()) {
                queue.splice(before); // 旧CE(銃分岐)は予約しない
                try { fire("attack"); } catch (_error) { /* 表示/弾のエラーで入力を止めない */ }
            }
            return result;
        };
    }

    // ---- 反動(銃スプライト): 公式が毎フレーム置く位置へ、発射直後だけ後退と傾きを足す(公式は毎フレーム絶対位置で置き直すので蓄積しない) ----
    // リロード中は銃を腰の高さへ下げ、銃口を足元側へ倒す(体のリロード動作=両手が腹の前、と合わせるため)。
    // 公式が毎フレーム置き直すので蓄積しない。0→1→0の山型(sin)で、始まりと終わりは構えの位置と一致する。
    const applyReloadDip = sprite => {
        if (!state.reloading || !state.reloadLeft || config.reloadFrames <= 0) return false;
        const progress = Math.min(1, Math.max(0, 1 - state.reloadLeft / config.reloadFrames));
        const ease = Math.sin(Math.PI * progress);
        sprite.y += 12 * ease;
        const twoPi = Math.PI * 2;
        let delta = ((Math.PI / 2 - sprite.rotation) % twoPi + twoPi) % twoPi;
        if (delta > Math.PI) delta -= twoPi;
        sprite.rotation += Math.sign(delta) * 0.5 * ease;
        return true;
    };
    const applyKick = () => {
        const sprite = typeof ShxWeaponSpriteH !== "undefined" ? ShxWeaponSpriteH : null;
        if (sprite) applyReloadDip(sprite);
        if (state.kick <= 0) return false;
        state.kick = Math.max(0, state.kick - 1 / 9);
        if (!sprite) return false;
        const theta = (state.kickDegree - 90) * Math.PI / 180;
        sprite.x -= Math.cos(theta) * 5 * state.kick;
        sprite.y -= Math.sin(theta) * 5 * state.kick;
        sprite.rotation += (Math.cos(theta) < 0 ? 1 : -1) * 0.14 * state.kick;
        return true;
    };
    // 公式Display Weaponは Scene_Map.update の最後(Spriteset更新の後)で、毎フレーム位置と角度を置き直す
    // (Hendrix_Action_Engine。実機で確認: Spriteset_Map.updateに足しても上書きされ、反動もリロードの下げも見えなかった)。
    // ProjectR_GunSystemはそれより後に読み込まれるので、Scene_Map.updateの外側で、公式が置いた後に足す。
    if (typeof Scene_Map !== "undefined") {
        const _sceneUpdate = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            _sceneUpdate.apply(this, arguments);
            try { applyKick(); } catch (_error) { /* 表示のみ */ }
        };
    }

    // ---- 後始末 ----
    const deck = root.ProjectRCardDeck;
    if (deck && typeof deck.endBattle === "function") {
        const _endBattle = deck.endBattle;
        deck.endBattle = function() { stopAll(); return _endBattle.apply(this, arguments); };
    }
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { stopAll(); return _Game_Map_setup.apply(this, arguments); };
    const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _onMapLoaded.apply(this, arguments);
        const m = map();
        for (const event of m.events()) {
            if (isBullet(event) && bullets.get(event.eventId())?.event !== event) destroyBullet(event.eventId(), { map: m, event });
        }
    };
    if (typeof DataManager !== "undefined") {
        for (const method of ["setupNewGame", "extractSaveContents"]) {
            const original = DataManager[method];
            DataManager[method] = function() { state.displayed = null; cancelReload(); state.cooldown = 0; return original.apply(this, arguments); };
        }
    }

    root.ProjectRGunSystem = {
        config, fire, requestReload,
        isReloading: () => state.reloading,
        status: () => ({ equipped: !!equippedGun(), ammo: ammo(), capacity: capacity(), reserve: reserve(),
            reloading: state.reloading, cooldown: state.cooldown, shots: state.shots, dryFires: state.dryFires,
            reloads: state.reloads, lastShot: state.lastShot && { ...state.lastShot }, lastReload: state.lastReload && { ...state.lastReload },
            displayed: state.displayed, bullets: bullets.size }),
        getActiveBullets: () => [...bullets].map(([eventId, r]) => ({ eventId, age: r.age, degree: r.degree, rotation: r.event._rotation })),
        diagnostics: () => ({ weapon: leaderWeapon()?.name || null, gun: !!equippedGun(), canUse: canUseWeapon(), ...root.ProjectRGunSystem.status() }),
        _sync: syncDisplay, _stop: stopAll, _applyKick: applyKick
    };
})();
