/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 2C-4 Hermes剣術の短寿命Dynamic Hitbox。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_ApolloGoldenArrow
 * @base ProjectR_GodSummonManager
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @orderAfter ProjectR_HermesSwiftMovement
 * @param ForwardTiles
 * @text 前方中心距離（tile）
 * @type number
 * @decimals 2
 * @min 0
 * @default 0.75
 * @param HitboxWidth
 * @text Hitbox幅（tile）
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 1.5
 * @param HitboxHeight
 * @text Hitbox奥行（tile）
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 1.5
 * @param LifetimeFrames
 * @text 寿命（map更新frame）
 * @type number
 * @min 1
 * @default 3
 * @help
 * hermes_sword_attackだけを実装。他directionは登録済みhandlerへ委譲。
 * 発動時のPlayer→Mouse角を固定。前方0.75tile中心、1.5四方で
 * 前方端は約1.5tile。値は仮設定でParameterから変更できます。
 * Skill note <ProjectRCard: hermes_sword_attack>を一意に解決し、
 * <dmg: Skill名><attacker: player>で公式Skill Damageを使います。
 * 装備武器Damage、通常Sword/CE、召喚Sprite/VFXは使用しません。
 *
 * spawnEventHitboxは返り値をPluginManager.callCommandが返さないため、
 * 前後差分で生成を検証します。生成/数値rotateTo成功だけが発動成功。
 * 専用タグを斬撃ごとに付け、既存<enemy>をcheckCollideの受け手にし、
 * UpdateEventHp(-damage)で各敵1Hit。1体へ命中しても寿命まで残ります。
 * 寿命は操作可能なmap更新3回。公式waitによる並列Interpreter開始の
 * ずれを避け、公式Dynamic寿命スクリプトと同じclearCollisions/
 * removeEventFromTagIndex/イベント解除で同期除去します。
 * DestroyEventは導入版unspawnEventがTemplate専用、DestroyDynamicEventは
 * 50ms遅延かつ後からmap/IDを参照するので、このadapterでは使いません。
 * 終了/マップ変更/ロードで専用Hitboxだけ除去。保存APIは変更しません。
 * Phase 3A: 発動時にProjectRGodSummonManagerでHermes一時召喚を作り、召喚context
 * （プレイヤー中心と固定済みマウス角）からHitboxを生成します。位置・形状・寿命・
 * Damage・攻撃者(player)は従来どおり。失敗時は召喚も破棄され非消費です。
 * Console: ProjectRHermesSwordsmanship.getActiveHitboxes()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "hermes_sword_attack";
    const TAG = "<projectRHermesSword>";
    const parameters = PluginManager.parameters("ProjectR_HermesSwordsmanship");
    const setting = (name, fallback, min) => {
        const value = Number(parameters[name] ?? fallback);
        return Number.isFinite(value) && value >= min ? value : fallback;
    };
    const forward = setting("ForwardTiles", 0.75, 0);
    const width = setting("HitboxWidth", 1.5, 0.01);
    const height = setting("HitboxHeight", 1.5, 0.01);
    const lifetime = Math.floor(setting("LifetimeFrames", 3, 1));
    const hitboxes = new Map();
    let serial = 0;
    const previousDirection = deck.getActivationHandler("direction");
    // 与ダメージ報酬: ゲージplugin（任意）が前後のHP差から実ダメージを記録する。無い場合・失敗しても攻撃は同じ。
    const trackDamage = (enemyId, attackId, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        return typeof gauge?.trackDamage === "function"
            ? gauge.trackDamage(enemyId, { attackId, source: "damage:hermes_sword" }, apply) : apply();
    };
    const isSword = event => !!event?.event?.()?.note?.includes(TAG);
    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const destroy = (id, record) => {
        hitboxes.delete(id);
        const map = record.map, event = record.event;
        if (map.event(id) !== event) return;
        // 導入版Game_MaithlDynamicEvent.event()の寿命スクリプトと同じ同期解除。
        root.CollisionManager.clearCollisions(id);
        map.removeEventFromTagIndex(event);
        // checkCollideの一度限り履歴も、この斬撃の一意タグ分だけ片付ける。
        const tags = event.event().note.match(/<projectRHermesSwordHit\d+>/g) || [];
        if (typeof $gameSystem !== "undefined") {
            for (const cache of [$gameSystem.collisionTimestamps, $gameSystem.collidedOnceEvents]) {
                for (const key of Object.keys(cache || {})) {
                    if (tags.some(tag => key.includes(tag))) delete cache[key];
                }
            }
        }
        if (typeof $gameTemp !== "undefined") {
            const temp = $gameTemp?._characterTempDatas?.get(event);
            temp?.mapCharacterCacheUpdater?.removeMapCharactersCache();
            $gameTemp?._characterTempDatas?.delete(event);
            $gameTemp?._lastAllCharacters?.delete(event);
        }
        if (map === $gameMap && SceneManager._scene instanceof Scene_Map) {
            SceneManager._scene._spriteset?.unspawnEvent(id);
        }
        map._events[id] = null;
    };
    const clear = () => {
        for (const [id, record] of [...hitboxes]) destroy(id, record);
    };
    const activate = cardContext => {
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!deck.isCardBattleActive() || !map || !player ||
                !(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) {
            return { ok: false, reason: "mapUnavailable" };
        }
        if (typeof DotMoveSystem === "undefined" || typeof root.checkCollide !== "function" ||
                typeof root.CollisionManager?.clearCollisions !== "function" ||
                !["events", "event", "getCurrentEventHp", "removeEventFromTagIndex"].every(
                    name => typeof map[name] === "function") ||
                !["spawnEventHitbox", "UpdateEventHp"].every(
                    name => typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) {
            return { ok: false, reason: "actionCombatUnavailable" };
        }
        const skills = (typeof $dataSkills !== "undefined" ? $dataSkills : [])
            .filter(skill => skill?.note?.includes(`<ProjectRCard: ${CARD}>`));
        const skill = skills[0];
        if (skills.length !== 1 || skill.damage?.type !== 1 || !skill.name || /[<>]/.test(skill.name) ||
                $dataSkills.filter(s => s?.name?.toLowerCase() === skill.name.toLowerCase()).length !== 1) {
            return { ok: false, reason: "damageSkillUnavailable" };
        }
        if (typeof player.centerPositionPoint !== "function") return { ok: false, reason: "invalidMousePosition" };
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return { ok: false, reason: "godSummonUnavailable" };
        // Hermes一時召喚 → 召喚アンカーを起点に剣術Hitboxを生成。失敗時は召喚も即破棄。
        return summons.perform({ definition: cardContext?.definition },
            summon => slash(map, skill, summon));
    };
    const slash = (map, skill, summon) => {
        const { center, radians, degree } = summon;
        if (!center || summon.distance < 1e-8) return { ok: false, reason: "invalidMousePosition" };
        const x = center.x - 0.5 + Math.cos(radians) * forward;
        const y = center.y - 0.5 + Math.sin(radians) * forward;
        // 導入版Collisionの0度だけ非回転扱いになる分岐を避け、真上は同値の360度。
        const rotation = degree === 0 ? 360 : degree;
        const tag = `<projectRHermesSwordHit${++serial}>`;
        const before = new Set(map.events());
        try {
            command("spawnEventHitbox", {
                name: "DynamicHitbox", notetag: `${TAG}${tag}<dmg: ${skill.name}><attacker: player><hitbox: ${width}, ${height}>`,
                comment: "", position: `${x}, ${y}`, rotationDegree: String(rotation),
                turnToward: "", attachTo: "", wait: ""
            });
            const created = map.events().filter(e => !before.has(e) && isSword(e));
            if (created.length !== 1) throw Error("hitboxCreationFailed");
            const event = created[0];
            if (!event.isDynamicEvent || !event.event().note.includes(tag) ||
                    typeof event.rotateTo !== "function") throw Error("hitboxCreationFailed");
            event.rotateTo(rotation);
            if (!Number.isFinite(event._rotation) || Math.abs(event._rotation - rotation) > 1e-6 ||
                    ![event._realX, event._realY].every(Number.isFinite)) throw Error("hitboxRotationFailed");
            hitboxes.set(event.eventId(), { map, event, tag, degree, framesLeft: lifetime, hitEnemies: new Set() });
            // 見た目(公式Swing Weapon)はダメージ判定と別。失敗してもHitbox/ダメージ/カード消費は変えない。
            try { root.ProjectRGodSummonVisual?.swingWeapon?.("hermes", degree); } catch (error) { /* 表示のみ */ }
            return { ok: true };
        } catch (error) {
            for (const event of map.events()) {
                if (!before.has(event) && isSword(event)) destroy(event.eventId(), { map, event });
            }
            return { ok: false, reason: String(error?.message || error) };
        }
    };
    deck.registerActivationHandler("direction", context => context.definition.cardId === CARD
        ? activate(context) : previousDirection ? previousDirection(context) : { ok: true });

    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive || this.eventsPaused) return;
        for (const [id, record] of [...hitboxes]) {
            if (record.map !== this || this.event(id) !== record.event || record.event._erased) {
                hitboxes.delete(id);
                continue;
            }
            for (const enemy of this.events()) {
                if (!enemy || enemy._erased || record.hitEnemies.has(enemy) ||
                        !enemy.event()?.note?.includes("<enemy>")) continue;
                const enemyId = enemy.eventId(), hp = this.getCurrentEventHp(enemyId);
                if (hp == null || hp <= 0 || !root.checkCollide(enemyId, record.tag) ||
                        root.CollisionManager.lastSourceEventId !== id) continue;
                record.hitEnemies.add(enemy);
                trackDamage(enemyId, record.tag, () =>
                    command("UpdateEventHp", { eventId: String(enemyId), value: "-damage", exceedMaxHealth: "false" }, id));
            }
            if (--record.framesLeft <= 0) destroy(id, record);
        }
    };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { clear(); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clear(); return _setup.apply(this, arguments); };
    const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _onMapLoaded.apply(this, arguments);
        for (const event of $gameMap.events()) {
            if (isSword(event) && hitboxes.get(event.eventId())?.event !== event) {
                destroy(event.eventId(), { map: $gameMap, event });
            }
        }
    };
    root.ProjectRHermesSwordsmanship = {
        getActiveHitboxes: () => [...hitboxes].map(([eventId, record]) => ({
            eventId, degree: record.degree, rotation: record.event._rotation,
            x: record.event._realX, y: record.event._realY, framesLeft: record.framesLeft
        }))
    };
})();
