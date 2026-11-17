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
 *   swing(source, options?)  斬撃を1回行う → { ok, reason?, degree, serial, step, scale }
 *       options(省略可。省略すれば従来と同じ): anyWeapon(銃装備でも出す) / visual(false なら Swing Weapon と SE を出さない) / width / depth / forward / lifetime / cooldown /
 *       damageScale(ダメージ倍率。1なら従来の式) / style(clockwise・counterclockwise・fullcircle・thrust) / pitch / speed / step /
 *       sector({ radius(tile), arc(度), frames(振り切るまでの更新数), passes:[{ offset(度), delay(更新数) }] })。
 *       sector を渡すと、長方形のHitboxの代わりに「扇形が時計回りに振られていく」判定になる(見た目の薙ぎ払いと同じ形・同じ時間。ProjectR_HermesSweep と同じ
 *       CombatOcclusion の扇の判定。壁の向こうには当たらない)。各敵には1回の斬撃につき1回だけ(passes が複数でも)。ProjectR_FieldCombat の左クリック3段コンボが使う。
 *   getActiveSweeps()  扇形の判定の状態(DEV・テスト用)
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
    let cooldownScale = 1;                                          // 攻撃間隔の倍率の逆数(既定1)。ProjectR_SoulSkills だけが一時的に変える(SOUL戦闘の絶・神託)
    let serial = 0;
    const sweeps = new Map(); // 扇形の判定(sector)。id -> { map, center, degree, serial, scale, step, sector, frame, hitEnemies:Set, hits }
    let sweepId = 0;

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
    // 命中の通知口(Stage 6B。追加のみ・リスナーが無ければ何もしない)。ダメージを出した直後に呼ぶ。HPは「次のフレーム」で減るので、実際に減ったかは受け取った側が確かめる。
    // ダメージ計算に使う武器の差し替え(Stage 6C。damageWeapon オプションがあるときだけ)。Hendrix の "player weapon" は、スロット1の武器の攻撃スキルとアクターの ATK(装備の合計)で計算するので、
    //   銃を持っている間の近接は、銃の攻撃力で計算されていた。命中のダメージ計算(UpdateEventHp の呼び出し)の間だけ、スロット1の武器を weaponId(0 = 素手)に差し替え、すぐ元に戻す。
    //   ダメージの式・倍率・判定は変わらない。装備は実際には変えない(同期の1回の呼び出しの間だけ。例外でも必ず戻す)ので、セーブ・装備画面・銃(GunSystem)には影響しない。
    const withDamageWeapon = (weaponId, apply) => {
        if (weaponId === null || weaponId === undefined) return apply();
        const slot = typeof $gameParty !== "undefined" ? $gameParty.leader?.()?._equips?.[0] : null;
        if (!slot || typeof slot.setObject !== "function" || typeof slot.object !== "function") return apply();
        if (weaponId > 0 && !(typeof $dataWeapons !== "undefined" && $dataWeapons[weaponId])) return apply();          // 存在しない武器は差し替えない(従来どおり)
        const original = slot.object(), replacement = weaponId > 0 ? $dataWeapons[weaponId] : null;
        slot.setObject(replacement);
        try { return apply(); } finally { slot.setObject(original); }
    };
    const hitListeners = [];
    const notifyHit = payload => { for (const fn of hitListeners.slice()) { try { fn(payload); } catch (_error) { /* 通知の失敗で攻撃を止めない */ } } };

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
    const clear = () => { sweeps.clear(); for (const [id, record] of [...hitboxes]) destroy(id, record); };

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
    // options(省略可。省略すれば、従来とまったく同じ1振り): ProjectR_FieldCombat の3段コンボが、段ごとに範囲・ダメージ倍率・スイングの種類を変えるために使う。
    const SWING_STYLES = ["clockwise", "counterclockwise", "fullcircle", "thrust"];
    const playVisual = (style = "clockwise", pitch = 140, speed = 10) => {
        try { player().turnToward?.("mouse or gamepad", false); } catch (_error) { /* 表示のみ */ }
        try { if (typeof AudioManager !== "undefined") AudioManager.playSe({ name: "Slash1", volume: 80, pitch, pan: 0 }); } catch (_error) { /* 表示のみ */ }
        try {
            command("SwingWeapon", { weaponSprite: "Pan", eventId: "player", offset: "0, -15", zIndex: "same", style, speed: String(speed),
                visualSettings: JSON.stringify({ traitEffect: "true", traitColor: "", traitBlend: "screen", traitOrder: "above" }) });
        } catch (_error) { /* 表示のみ */ }
    };
    const sectorOptions = raw => {
        if (!raw || typeof raw !== "object") return null;
        const pos = (value, fallback, min, max) => { const n = Number(value); return Number.isFinite(n) && n >= min && n <= max ? n : fallback; };
        const passes = (Array.isArray(raw.passes) && raw.passes.length ? raw.passes : [{ offset: 0, delay: 0 }]).slice(0, 4)
            .map(p => ({ offset: pos(p && p.offset, 0, -360, 360), delay: Math.floor(pos(p && p.delay, 0, 0, 120)) }));
        return { radius: pos(raw.radius, 3.9, 0.5, 12), arc: pos(raw.arc, 190, 10, 360), frames: Math.floor(pos(raw.frames, 15, 1, 120)), passes };
    };
    const swingOptions = raw => {
        const o = raw && typeof raw === "object" ? raw : {};
        const pos = (value, fallback, min, max) => { const n = Number(value); return Number.isFinite(n) && n >= min && n <= max ? n : fallback; };
        return {
            anyWeapon: o.anyWeapon === true, visual: o.visual !== false,
            width: pos(o.width, config.width, 0.01, 8), depth: pos(o.depth, config.depth, 0.01, 8), forward: pos(o.forward, config.forward, 0, 8),
            lifetime: Math.floor(pos(o.lifetime, config.lifetime, 1, 60)), cooldown: Math.floor(pos(o.cooldown, config.cooldown, 1, 600)),
            scale: pos(o.damageScale, 1, 0.1, 10), style: SWING_STYLES.includes(o.style) ? o.style : "clockwise",
            pitch: pos(o.pitch, 140, 50, 150), speed: pos(o.speed, 10, 1, 60), step: Number.isFinite(Number(o.step)) ? Math.floor(Number(o.step)) : 0,
            sector: sectorOptions(o.sector),
            weapon: o.damageWeapon === undefined || o.damageWeapon === null || !Number.isFinite(Number(o.damageWeapon)) ? null : Math.max(0, Math.floor(Number(o.damageWeapon)))
        };
    };

    // ---- 扇形の判定(sector): 見た目の薙ぎ払い(白い杖の残像: 狙う向きの -arc/2 → +arc/2 へ時計回りに振る)と同じ扇を、同じ時間で振る ----
    //   毎更新、「前の更新の角度 → いまの角度」の細い扇(スライス)に触れた敵へ、1回だけダメージ。中心は振った瞬間のプレイヤー中心(見た目の残像も、振った位置に残る)。
    const SLICE_STEP_DEGREES = 6;
    const occlusion = () => root.ProjectR?.CombatOcclusion || null;
    const polarPoint = (center, radius, degree) => ({ x: center.x + Math.sin(degree * Math.PI / 180) * radius, y: center.y - Math.cos(degree * Math.PI / 180) * radius });
    // 弧は「外接」する折れ線にして、hasLineToPolygon の radius で正確な円弧へ切り詰める(ProjectR_HermesSweep と同じ)。
    const sliceClip = (center, radius, from, to) => {
        const count = Math.max(1, Math.ceil((to - from) / SLICE_STEP_DEGREES)), outer = radius / Math.cos((to - from) / count / 2 * Math.PI / 180);
        const polygon = [{ x: center.x, y: center.y }];
        for (let i = 0; i <= count; i++) polygon.push(polarPoint(center, outer, from + (to - from) * i / count));
        return polygon;
    };
    const sectorAvailable = () => {
        const m = map();
        if (!m || !player() || !(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return "mapUnavailable";
        if (typeof occlusion()?.hasLineToPolygon !== "function" || typeof occlusion()?.eventPolygon !== "function" ||
                !["events", "event", "getCurrentEventHp"].every(name => typeof m[name] === "function") ||
                typeof PluginManager._commands?.[`${ENGINE}:UpdateEventHp`] !== "function" || typeof player().centerPositionPoint !== "function") return "actionCombatUnavailable";
        return null;
    };
    const damageValueOf = scale => scale === 1 ? "-player weapon" : `-Math.round(player weapon * ${scale})`;
    const sectorSwing = (opt, m, point, degree, source) => {
        const missing = sectorAvailable();
        if (missing) return { ok: false, reason: missing };
        const id = ++sweepId;
        sweeps.set(id, { id, map: m, center: { x: point.x, y: point.y }, degree, serial: ++serial, scale: opt.scale, step: opt.step, sector: opt.sector, weapon: opt.weapon, frame: 0, hitEnemies: new Set(), hits: 0 });
        state.cooldown = opt.cooldown;
        state.swings++;
        state.last = { source, degree, serial, step: opt.step, scale: opt.scale, sector: true };
        if (opt.visual) playVisual(opt.style, opt.pitch, opt.speed);
        else { try { player().turnToward?.("mouse or gamepad", false); } catch (_error) { /* 表示のみ */ } }
        return { ok: true, degree, serial, step: opt.step, scale: opt.scale, sector: true };
    };
    // 1更新ぶんの扇形の判定を進める(Game_Map.update から)
    const stepSweeps = gameMap => {
        const occ = occlusion();
        for (const [id, rec] of [...sweeps]) {
            if (rec.map !== gameMap) { sweeps.delete(id); continue; }
            const frame = ++rec.frame, { radius, arc, frames, passes } = rec.sector;
            let alive = false;
            for (const pass of passes) {
                const pf = frame - pass.delay;
                if (pf <= frames) alive = true;
                if (pf < 1 || pf > frames) continue;
                const start = rec.degree + pass.offset - arc / 2, clip = sliceClip(rec.center, radius, start + arc * (pf - 1) / frames, start + arc * pf / frames);
                for (const enemy of gameMap.events()) {
                    if (!enemy || enemy._erased || rec.hitEnemies.has(enemy) || !enemy.event()?.note?.includes("<enemy>")) continue;
                    const enemyId = enemy.eventId(), hp = gameMap.getCurrentEventHp(enemyId);
                    if (hp == null || hp <= 0) continue;
                    const polygon = occ.eventPolygon(enemy);
                    if (!Array.isArray(polygon) || polygon.length < 3 || !occ.hasLineToPolygon(rec.center, polygon, { radius, clipPolygon: clip })) continue;
                    rec.hitEnemies.add(enemy); rec.hits++; state.hits++;
                    trackDamage(enemyId, `sword:${rec.serial}`, () => withDamageWeapon(rec.weapon, () =>
                        command("UpdateEventHp", { eventId: String(enemyId), value: damageValueOf(rec.scale), exceedMaxHealth: "false", projectRAttackId: `sword:${rec.serial}` }, 0)));
                    notifyHit({ kind: "sword", enemyId, serial: rec.serial, step: rec.step, scale: rec.scale, degree: rec.degree, sector: true });
                }
            }
            if (!alive) sweeps.delete(id);
        }
    };

    const swing = (source = "api", rawOptions) => {
        const opt = swingOptions(rawOptions);
        const weapon = equippedWeapon();
        if (!opt.anyWeapon && !isMelee(weapon)) return { ok: false, reason: "noMeleeWeapon" };      // anyWeapon: 銃を持っていても、近接の斬撃を出せる(ダメージは装備中の武器の攻撃力。FieldCombat の左クリック)
        if (state.cooldown > 0) return { ok: false, reason: "cooldown" };
        const missing = opt.sector ? null : available();
        if (missing) return { ok: false, reason: missing };
        const m = map(), p = player();
        const point = p.centerPositionPoint();
        if (![point?.x, point?.y].every(Number.isFinite)) return { ok: false, reason: "invalidPlayerPosition" };
        const degree = mouseDegree() ?? facingDegree();
        if (opt.sector) return sectorSwing(opt, m, point, degree, source);
        const radians = (degree - 90) * Math.PI / 180;
        const x = point.x - 0.5 + Math.cos(radians) * opt.forward;
        const y = point.y - 0.5 + Math.sin(radians) * opt.forward;
        const rotation = degree === 0 ? 360 : degree; // 導入版Collisionは0度だけ非回転扱いなので、真上は同値の360度
        const tag = `<projectRNormalSwordHit${++serial}>`;
        const before = new Set(m.events());
        try {
            command("spawnEventHitbox", { name: "DynamicHitbox", notetag: `${TAG}${tag}<hitbox: ${opt.width}, ${opt.depth}>`, comment: "",
                position: `${x}, ${y}`, rotationDegree: String(rotation), turnToward: "", attachTo: "", wait: "" });
            const created = m.events().filter(e => !before.has(e) && isHitbox(e));
            if (created.length !== 1) throw Error("hitboxCreationFailed");
            const event = created[0];
            if (!event.isDynamicEvent || typeof event.rotateTo !== "function") throw Error("hitboxCreationFailed");
            event.rotateTo(rotation);
            if (!Number.isFinite(event._rotation) || Math.abs(event._rotation - rotation) > 1e-6) throw Error("hitboxRotationFailed");
            hitboxes.set(event.eventId(), { map: m, event, tag, degree, framesLeft: opt.lifetime, hitEnemies: new Set(), serial, scale: opt.scale, step: opt.step, weapon: opt.weapon });
        } catch (error) {
            for (const event of m.events()) if (!before.has(event) && isHitbox(event)) destroy(event.eventId(), { map: m, event });
            return { ok: false, reason: String(error?.message || error) };
        }
        state.cooldown = opt.cooldown;
        state.swings++;
        state.last = { source, degree, serial, step: opt.step, scale: opt.scale };
        if (opt.visual) playVisual(opt.style, opt.pitch, opt.speed);
        else { try { player().turnToward?.("mouse or gamepad", false); } catch (_error) { /* 表示のみ */ } }          // visual=false: 見た目(Swing Weapon・SE)は呼び出し側が出す(FieldCombat の薙ぎ払いのVFX)。Hitbox・ダメージは同じ
        return { ok: true, degree, serial, step: opt.step, scale: opt.scale };
    };

    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive || this.eventsPaused) return;
        if (state.cooldown > 0) state.cooldown = cooldownScale === 1 ? state.cooldown - 1 : Math.max(0, state.cooldown - cooldownScale);   // cooldownScale=2 なら攻撃間隔が半分(SOULの絶Lv3)
        if (sweeps.size) stepSweeps(this);
        for (const [id, record] of [...hitboxes]) {
            if (record.map !== this || this.event(id) !== record.event || record.event._erased) { hitboxes.delete(id); continue; }
            for (const enemy of this.events()) {
                if (!enemy || enemy._erased || record.hitEnemies.has(enemy) || !enemy.event()?.note?.includes("<enemy>")) continue;
                const enemyId = enemy.eventId(), hp = this.getCurrentEventHp(enemyId);
                // 斬撃ごとに固有のタグなので、checkCollideの結果だけで「この斬撃に当たった」と言える(lastSourceEventIdは<dmg:>付きでしか記録されない)。
                if (hp == null || hp <= 0 || !root.checkCollide(enemyId, record.tag)) continue;
                record.hitEnemies.add(enemy); // 同じ斬撃では1回だけ
                state.hits++;
                // 倍率が1なら従来と同じ式("-player weapon")。3段コンボの強撃だけ倍率(例 2)を掛ける(式の中の "player weapon" は Hendrix が武器ダメージの数値に置き換える)。
                const damageValue = damageValueOf(record.scale);
                trackDamage(enemyId, `sword:${record.serial}`, () => withDamageWeapon(record.weapon, () =>
                    command("UpdateEventHp", { eventId: String(enemyId), value: damageValue, exceedMaxHealth: "false", projectRAttackId: `sword:${record.serial}` }, id)));
                notifyHit({ kind: "sword", enemyId, serial: record.serial, step: record.step, scale: record.scale, degree: record.degree, sector: false });
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
        addHitListener: fn => { if (typeof fn !== "function") return () => false; hitListeners.push(fn); return () => { const i = hitListeners.indexOf(fn); if (i >= 0) hitListeners.splice(i, 1); return i >= 0; }; },
        setCooldownScale: value => { const n = Number(value); cooldownScale = Number.isFinite(n) && n >= 1 && n <= 10 ? n : 1; return cooldownScale; },
        getCooldownScale: () => cooldownScale,
        getActiveSweeps: () => [...sweeps.values()].map(r => ({ id: r.id, degree: r.degree, serial: r.serial, frame: r.frame, hits: r.hits, center: { ...r.center }, radius: r.sector.radius, arc: r.sector.arc, frames: r.sector.frames, passes: r.sector.passes.map(p => ({ ...p })) })),
        getActiveHitboxes: () => [...hitboxes].map(([eventId, r]) => ({ eventId, degree: r.degree, rotation: r.event._rotation, framesLeft: r.framesLeft, hits: r.hitEnemies.size })),
        status: () => ({ ...state, last: state.last && { ...state.last }, active: hitboxes.size, weapon: equippedWeapon()?.name || null })
    };
})();
