/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 通常の剣(近接)攻撃。マウス方向のDynamic Hitbox + 当たった敵本人へDatabase武器ダメージ。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @base ProjectR_CombatPresence
 * @orderAfter ProjectR_GunSystem
 * @orderAfter ProjectR_WeaponPresentation
 *
 * @param ForwardTiles
 * @text 前方中心距離(tile)
 * @type number
 * @decimals 2
 * @min 0
 * @default 1.0
 *
 * @param HitboxWidth
 * @text Hitbox幅(tile。狙う向きに対して横)
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 1.5
 *
 * @param HitboxDepth
 * @text Hitbox奥行(tile。狙う向き)
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 1.2
 *
 * @param LifetimeFrames
 * @text Hitboxの寿命(map更新frame)
 * @type number
 * @min 1
 * @default 3
 *
 * @param CooldownFrames
 * @text 次の斬撃までの間隔(frame)
 * @type number
 * @min 1
 * @default 18
 *
 * @help
 * ProjectR_SwordSystem.js
 *
 * 【なぜ必要か】従来の通常の剣は共通イベント1(とCE4)の中で、衝突判定とダメージの対象を
 *   「Event 1」に直接書いていました(checkCollide(1, '<playerAttack>') / UpdateEventHp eventId=1)。
 *   Event 1が敵でない地図では、剣は敵に一切ダメージを与えられませんでした。向きも4方向固定でした。
 *   共通イベント自体(data/CommonEvents.json)は変更せず、攻撃入力が受理されたとき(GunSystemと同じ入口)に、
 *   剣のときだけ旧CEの予約を取り下げて、このPluginが攻撃を行います。
 *
 * 【構成(公式Action Combatの機能だけ)】
 *   見た目     : 公式Swing Weapon + SE(旧CEと同じ引数)。マウス方向の斬撃線はProjectR_WeaponPresentationが従来どおり描く。
 *   当たり判定 : 公式 spawnEventHitbox(Dynamic Event)。マウス方向(360°)へ回転。寿命は短い(既定3frame)。
 *   命中       : <enemy>の各Eventに対し 公式 checkCollide(その敵のID, 専用タグ)。IDはハードコードしない。
 *   ダメージ   : 公式 UpdateEventHp(eventId=当たった敵, value="-player weapon") = Databaseの武器ダメージ(銃と同じ窓口)。
 *   1振り1ヒット: 同じ斬撃では各敵に1回だけ。複数の敵が重なれば、当たった全員に1回ずつ。
 *   対象無し   : 何も起きない(例外なし・Event 1へのダメージなし)。
 *
 * 【対象】銃(武器メモ<capacity:>)ではない武器を装備しているとき。何も装備していない素手は従来のCE1のまま。
 *
 * API: ProjectRSwordSystem
 *   swing(source)  斬撃を1回行う → { ok, reason?, degree, eventId }
 *   getActiveHitboxes() / status() / config
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const ENGINE = "Hendrix_Action_Engine";
    const TAG = "<projectRNormalSword>";
    const params = PluginManager.parameters("ProjectR_SwordSystem");
    const num = (value, fallback, min) => { const n = Number(value); return Number.isFinite(n) && n >= min ? n : fallback; };
    const config = Object.freeze({
        forward: num(params.ForwardTiles, 1.0, 0), width: num(params.HitboxWidth, 1.5, 0.01), depth: num(params.HitboxDepth, 1.2, 0.01),
        lifetime: Math.floor(num(params.LifetimeFrames, 3, 1)), cooldown: Math.floor(num(params.CooldownFrames, 18, 1))
    });
    const normalize = degree => ((degree % 360) + 360) % 360;
    const hitboxes = new Map(); // eventId -> { map, event, tag, degree, framesLeft, hitEnemies:Set }
    const state = { cooldown: 0, swings: 0, hits: 0, last: null };
    let serial = 0;

    const map = () => typeof $gameMap !== "undefined" ? $gameMap : null;
    const player = () => typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const isHitbox = event => !!event?.event?.()?.note?.includes(TAG);
    const equippedWeapon = () => {
        const leader = typeof $gameParty !== "undefined" ? $gameParty.leader?.() : null;
        return leader ? leader.weapons?.()[0] || null : null;
    };
    const isGun = weapon => !!weapon && /<capacity:/i.test(weapon.note || "");
    const isMelee = weapon => !!weapon && !isGun(weapon);
    const mouseDegree = () => {
        const p = player();
        if (!p || typeof TouchInput === "undefined") return null;
        const dx = TouchInput.x - p.screenX(), dy = TouchInput.y - p.screenY();
        if (![dx, dy].every(Number.isFinite) || Math.hypot(dx, dy) < 1e-8) return null;
        return normalize(Math.atan2(dy, dx) * 180 / Math.PI + 450); // 0=上・時計回り
    };
    const facingDegree = () => ({ 8: 0, 6: 90, 2: 180, 4: 270 })[player()?.direction?.()] ?? 180;
    const trackDamage = (enemyId, attackId, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        return typeof gauge?.trackDamage === "function"
            ? gauge.trackDamage(enemyId, { attackId, source: "damage:sword" }, apply) : apply();
    };

    // 導入版Game_MaithlDynamicEvent.event()の寿命スクリプトと同じ同期解除(Hermes剣術と同じ)。
    const destroy = (id, record) => {
        hitboxes.delete(id);
        const m = record.map, event = record.event;
        if (m.event(id) !== event) return;
        root.CollisionManager.clearCollisions(id);
        m.removeEventFromTagIndex(event);
        const tags = event.event().note.match(/<projectRNormalSwordHit\d+>/g) || [];
        if (typeof $gameSystem !== "undefined") {
            for (const cache of [$gameSystem.collisionTimestamps, $gameSystem.collidedOnceEvents]) {
                for (const key of Object.keys(cache || {})) if (tags.some(tag => key.includes(tag))) delete cache[key];
            }
        }
        if (typeof $gameTemp !== "undefined") {
            const temp = $gameTemp?._characterTempDatas?.get(event);
            temp?.mapCharacterCacheUpdater?.removeMapCharactersCache();
            $gameTemp?._characterTempDatas?.delete(event);
            $gameTemp?._lastAllCharacters?.delete(event);
        }
        if (m === map() && SceneManager._scene instanceof Scene_Map) SceneManager._scene._spriteset?.unspawnEvent(id);
        m._events[id] = null;
    };
    const clear = () => { for (const [id, record] of [...hitboxes]) destroy(id, record); };

    const available = () => {
        const m = map();
        if (!m || !player() || !(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return "mapUnavailable";
        if (typeof root.checkCollide !== "function" || typeof root.CollisionManager?.clearCollisions !== "function" ||
                !["events", "event", "getCurrentEventHp", "removeEventFromTagIndex"].every(name => typeof m[name] === "function") ||
                !["spawnEventHitbox", "UpdateEventHp"].every(name => typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function") ||
                typeof player().centerPositionPoint !== "function") return "actionCombatUnavailable";
        return null;
    };

    // 見た目(公式Swing Weapon + SE)。旧CEと同じ引数。失敗してもHitbox・ダメージは変えない。
    const playVisual = () => {
        try { player().turnToward?.("mouse or gamepad", false); } catch (_error) { /* 表示のみ */ }
        try { if (typeof AudioManager !== "undefined") AudioManager.playSe({ name: "Slash1", volume: 80, pitch: 140, pan: 0 }); } catch (_error) { /* 表示のみ */ }
        try {
            command("SwingWeapon", { weaponSprite: "Pan", eventId: "player", offset: "0, -15", zIndex: "same", style: "clockwise", speed: "10",
                visualSettings: JSON.stringify({ traitEffect: "true", traitColor: "", traitBlend: "screen", traitOrder: "above" }) });
        } catch (_error) { /* 表示のみ */ }
    };

    const swing = (source = "api") => {
        const weapon = equippedWeapon();
        if (!isMelee(weapon)) return { ok: false, reason: "noMeleeWeapon" };
        if (state.cooldown > 0) return { ok: false, reason: "cooldown" };
        const missing = available();
        if (missing) return { ok: false, reason: missing };
        const m = map(), p = player();
        const point = p.centerPositionPoint();
        if (![point?.x, point?.y].every(Number.isFinite)) return { ok: false, reason: "invalidPlayerPosition" };
        const degree = mouseDegree() ?? facingDegree();
        const radians = (degree - 90) * Math.PI / 180;
        const x = point.x - 0.5 + Math.cos(radians) * config.forward;
        const y = point.y - 0.5 + Math.sin(radians) * config.forward;
        const rotation = degree === 0 ? 360 : degree; // 導入版Collisionは0度だけ非回転扱いなので、真上は同値の360度
        const tag = `<projectRNormalSwordHit${++serial}>`;
        const before = new Set(m.events());
        try {
            command("spawnEventHitbox", { name: "DynamicHitbox", notetag: `${TAG}${tag}<hitbox: ${config.width}, ${config.depth}>`, comment: "",
                position: `${x}, ${y}`, rotationDegree: String(rotation), turnToward: "", attachTo: "", wait: "" });
            const created = m.events().filter(e => !before.has(e) && isHitbox(e));
            if (created.length !== 1) throw Error("hitboxCreationFailed");
            const event = created[0];
            if (!event.isDynamicEvent || typeof event.rotateTo !== "function") throw Error("hitboxCreationFailed");
            event.rotateTo(rotation);
            if (!Number.isFinite(event._rotation) || Math.abs(event._rotation - rotation) > 1e-6) throw Error("hitboxRotationFailed");
            hitboxes.set(event.eventId(), { map: m, event, tag, degree, framesLeft: config.lifetime, hitEnemies: new Set(), serial });
        } catch (error) {
            for (const event of m.events()) if (!before.has(event) && isHitbox(event)) destroy(event.eventId(), { map: m, event });
            return { ok: false, reason: String(error?.message || error) };
        }
        state.cooldown = config.cooldown;
        state.swings++;
        state.last = { source, degree, serial };
        playVisual();
        return { ok: true, degree, serial };
    };

    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive || this.eventsPaused) return;
        if (state.cooldown > 0) state.cooldown--;
        for (const [id, record] of [...hitboxes]) {
            if (record.map !== this || this.event(id) !== record.event || record.event._erased) { hitboxes.delete(id); continue; }
            for (const enemy of this.events()) {
                if (!enemy || enemy._erased || record.hitEnemies.has(enemy) || !enemy.event()?.note?.includes("<enemy>")) continue;
                const enemyId = enemy.eventId(), hp = this.getCurrentEventHp(enemyId);
                // 斬撃ごとに固有のタグなので、checkCollideの結果だけで「この斬撃に当たった」と言える(lastSourceEventIdは<dmg:>付きでしか記録されない)。
                if (hp == null || hp <= 0 || !root.checkCollide(enemyId, record.tag)) continue;
                record.hitEnemies.add(enemy); // 同じ斬撃では1回だけ
                state.hits++;
                trackDamage(enemyId, `sword:${record.serial}`, () =>
                    command("UpdateEventHp", { eventId: String(enemyId), value: "-player weapon", exceedMaxHealth: "false" }, id));
            }
            if (--record.framesLeft <= 0) destroy(id, record);
        }
    };

    // ---- 攻撃入力の受け口: CE1が受理されたとき、剣ならここへ回す(銃はProjectR_GunSystem) ----
    const attackCommonEventId = () => root.ProjectRCombatPresence?.settings?.attackCommonEventId ?? 1;
    if (typeof Game_Temp !== "undefined") {
        const _reserve = Game_Temp.prototype.reserveCommonEvent;
        Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
            const isAttack = Number(commonEventId) === attackCommonEventId();
            const queue = this._commonEventQueue;
            const before = queue ? queue.length : 0;
            const result = _reserve.apply(this, arguments);
            // 他のpluginが拒否した(戦闘外・死亡中)ときはキューが増えない。受理されたキューだけを取り除く。
            if (isAttack && queue && queue.length > before && isMelee(equippedWeapon())) {
                queue.splice(before); // 旧CE(Event 1固定の判定・ダメージ)は予約しない
                try { swing("attack"); } catch (_error) { /* 入力を止めない */ }
            }
            return result;
        };
    }

    const deck = root.ProjectRCardDeck;
    if (deck?.endBattle) {
        const _endBattle = deck.endBattle;
        deck.endBattle = function() { clear(); return _endBattle.apply(this, arguments); };
    }
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clear(); state.cooldown = 0; return _setup.apply(this, arguments); };
    const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _onMapLoaded.apply(this, arguments);
        for (const event of $gameMap.events()) {
            if (isHitbox(event) && hitboxes.get(event.eventId())?.event !== event) destroy(event.eventId(), { map: $gameMap, event });
        }
    };
    if (typeof DataManager !== "undefined") {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { state.cooldown = 0; return _extract.apply(this, arguments); };
    }

    root.ProjectRSwordSystem = {
        config, swing,
        getActiveHitboxes: () => [...hitboxes].map(([eventId, r]) => ({ eventId, degree: r.degree, rotation: r.event._rotation, framesLeft: r.framesLeft, hits: r.hitEnemies.size })),
        status: () => ({ ...state, last: state.last && { ...state.last }, active: hitboxes.size, weapon: equippedWeapon()?.name || null })
    };
})();
