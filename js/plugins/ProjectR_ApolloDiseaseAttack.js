/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 2C-5 Apollo「病の矢」の弾・Disease State・実時間DoT。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_GodSummonManager
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @orderAfter ProjectR_HermesSwordsmanship
 *
 * @param DurationSeconds
 * @text Diseaseの持続時間（秒）
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 6.0
 *
 * @param TickIntervalSeconds
 * @text DoTの間隔（秒）
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 1.0
 *
 * @param MaxTicks
 * @text DoTの最大回数
 * @type number
 * @min 1
 * @default 6
 *
 * @help
 * apollo_plague_attack（Disease Attack）専用のdirection handler。
 * 既存handlerを取得して連鎖するため、Golden Arrow/Hermes剣術等は変更しません。
 *
 * 弾: Map002の専用Prefab「ProjectR Apollo Disease Attack」をspawnEventで
 * 非恒久生成し、発射時のマウス角を一度だけrotateTo(degree)で固定します。
 * 移動はPrefabのmoveToPosition('forward')。追尾・貫通・複数Hitなし。
 * Phase 3B: 発射前にProjectRGodSummonManagerでApollo一時召喚を作り、召喚context
 * （プレイヤー位置と固定済みマウス角）から同じ弾を発射します（Golden Arrowと同方式）。
 * Managerが無い/生成失敗なら弾なし・非消費です。
 * 弾の生成/回転の成功時だけ{ok:true}を返し、消費/12秒Cooldown/即時ドローは
 * 既存Routerが行います。空振りも消費です。
 *
 * 初撃: checkCollide(敵ID, '<projectRDiseaseAttack>')の後、
 * <dmg: アポロン病攻撃><attacker: player>のDatabase Skillを公式UpdateEventHpの
 * -damageで適用します。式・属性はSkill「アポロン病攻撃」で調整できます。
 *
 * Disease: <ProjectRCard: apollo_plague_attack>の唯一のState（ID 33「病」）。
 * 初撃後に公式AddState→hasStateで確認します。耐性/無効はDatabase側が処理し、
 * 無効の敵は初撃だけでDiseaseもDoTも発生しません（カードは成功）。
 * 再命中は非stackで、残り時間と1秒タイマーを初期化します。
 * Damageでは解除しません。
 *
 * DoT: <ProjectRCard: apollo_plague_attack_dot>のSkill「病ダメージ」を
 * 公式calculateDamageAgainstEventで計算し、公式UpdateEventHpで適用します。
 * 独自HP/直接減算はありません。
 *
 * 時間: 認識阻害/睡眠と同じdeck.updateCooldown（Inputの1/60秒）で進みます。
 * メニュー・会話・フォーカス喪失・カード戦闘非稼働中は進みません。
 * 戦闘終了・マップ切替・ロードでStateとタイマーを解除し、保存しません。
 *
 * Console確認:
 *   ProjectRApolloDiseaseAttack.isEventDiseased(eventId)
 *   ProjectRApolloDiseaseAttack.getRemainingSeconds(eventId)
 *   ProjectRApolloDiseaseAttack.getActiveProjectiles()
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const PLUGIN = "ProjectR_ApolloDiseaseAttack";
    const CARD = "apollo_plague_attack";
    const MARKER = `<ProjectRCard: ${CARD}>`;
    const DOT_MARKER = `<ProjectRCard: ${CARD}_dot>`;
    const TAG = "<projectRDiseaseAttack>";
    const TEMPLATE_NAME = "ProjectR Apollo Disease Attack";
    const EPSILON = 1e-8;
    const params = PluginManager.parameters(PLUGIN);
    const positive = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
    const duration = positive(params.DurationSeconds, 6);
    const interval = positive(params.TickIntervalSeconds, 1);
    const maxTicks = Math.floor(positive(params.MaxTicks, 6));
    const projectiles = new Map(); // runtime only: eventId -> { map, event }
    const effects = new Map(); // runtime only: event -> { map, battler, stateId, remaining, tickTimer, ticks }
    const previousDirection = deck.getActivationHandler("direction");
    const currentMap = () => typeof $gameMap !== "undefined" ? $gameMap : null;
    const uniqueByNote = (list, marker) => {
        const matches = list.filter(item => item?.note?.includes(marker));
        return matches.length === 1 ? matches[0] : null;
    };
    const stateId = () => uniqueByNote(typeof $dataStates !== "undefined" ? $dataStates : [], MARKER)?.id || 0;
    const skillFor = marker => {
        const skills = typeof $dataSkills !== "undefined" ? $dataSkills : [];
        const skill = uniqueByNote(skills, marker);
        return skill && skill.damage?.type === 1 && skill.name && !/[<>]/.test(skill.name) &&
            skills.filter(s => s?.name?.toLowerCase() === skill.name.toLowerCase()).length === 1 ? skill : null;
    };
    const battlerFor = event => typeof SgetBattlerForH === "function" ? SgetBattlerForH(event) : null;
    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const isProjectile = event => !!event?.event?.()?.note?.includes(TAG);

    // ---- 弾 ----
    const destroy = (id, record) => {
        projectiles.delete(id);
        const map = currentMap();
        if (record.map !== map || map.event(id) !== record.event) return;
        command("DestroyEvent", { target: String(id), destroyNearby: "", permanent: "false" }, id);
    };
    const clearProjectiles = () => {
        for (const [id, record] of [...projectiles]) destroy(id, record);
    };
    const activate = cardContext => {
        const map = currentMap();
        if (!deck.isCardBattleActive() || !map || !(SceneManager._scene instanceof Scene_Map) ||
                !$gamePlayer || !SceneManager._scene._spriteset) return { ok: false, reason: "mapUnavailable" };
        if (typeof DotMoveSystem === "undefined" || typeof map.spawnEvent !== "function" ||
                typeof root.checkCollide !== "function" || typeof map.getCurrentEventHp !== "function" ||
                typeof root.hasState !== "function" || typeof SgetBattlerForH !== "function" ||
                typeof Game_Interpreter.prototype.calculateDamageAgainstEvent !== "function" ||
                !["UpdateEventHp", "DestroyEvent", "AddState", "RemoveState"].every(name =>
                    typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) {
            return { ok: false, reason: "actionCombatUnavailable" };
        }
        const skill = skillFor(MARKER);
        if (!skill || !skillFor(DOT_MARKER) || !stateId()) return { ok: false, reason: "diseaseDataUnavailable" };
        const templates = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null;
        const template = templates?.find(event => event?.name === TEMPLATE_NAME);
        if (!template || !template.note.includes(TAG) ||
                !template.note.includes(`<dmg: ${skill.name}>`) || !template.note.includes("<attacker: player>")) {
            return { ok: false, reason: "projectileTemplateUnavailable" };
        }
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return { ok: false, reason: "godSummonUnavailable" };
        // Apollo一時召喚 → 召喚アンカーから病の矢を発射。失敗時は召喚も即破棄。
        return summons.perform({ definition: cardContext?.definition }, summon => fire(map, template, summon));
    };
    // Golden Arrowと同じ画面座標系の角度を、召喚contextが発射時に一度だけ固定して渡す。
    const fire = (map, template, summon) => {
        const { x, y, degree } = summon;
        const before = new Set(map.events());
        try {
            const id = map.spawnEvent(template.id, x, y, false, degree);
            const event = id && map.event(id);
            if (!event || before.has(event) || !isProjectile(event) || typeof event.rotateTo !== "function") {
                throw Error("projectileCreationFailed");
            }
            event.rotateTo(degree);
            if (!Number.isFinite(event._rotation) || Math.abs(event._rotation - degree) > 0.000001) {
                throw Error("projectileRotationFailed");
            }
            projectiles.set(id, { map, event });
            return { ok: true };
        } catch (error) {
            for (const event of map.events()) {
                if (!before.has(event) && isProjectile(event)) destroy(event.eventId(), { map, event });
            }
            return { ok: false, reason: String(error?.message || error) };
        }
    };
    deck.registerActivationHandler("direction", context => context.definition.cardId === CARD
        ? activate(context) : previousDirection ? previousDirection(context) : { ok: true });

    // ---- Disease / DoT ----
    const clear = (event, record) => {
        effects.delete(event);
        try {
            if (record.map === currentMap() && record.map.event(event.eventId()) === event) {
                command("RemoveState", { target: String(event.eventId()), stateId: String(record.stateId) }, event.eventId());
            }
        } finally {
            record.battler.removeState(record.stateId);
        }
    };
    const clearAll = () => {
        for (const [event, record] of [...effects]) clear(event, record);
    };
    const applyDisease = (event, map) => {
        const id = stateId(), battler = battlerFor(event);
        if (!id || !battler?.isAlive()) return false;
        const already = root.hasState(event.eventId(), id);
        try {
            command("AddState", { target: String(event.eventId()), stateId: String(id) }, event.eventId());
            if (!root.hasState(event.eventId(), id)) return false;
            // 非stack。再付与は残り時間とタイマーを初期化する。
            effects.set(event, { map, battler, stateId: id, remaining: duration, tickTimer: 0, ticks: 0 });
            return true;
        } catch (error) {
            if (!already) battler.removeState(id);
            return false;
        }
    };
    const aliveHp = (map, event) => {
        const hp = map.getCurrentEventHp(event.eventId());
        return hp != null && hp > 0;
    };
    const tickDamage = (event, record) => {
        const skill = skillFor(DOT_MARKER);
        if (!skill) return;
        const interpreter = new Game_Interpreter();
        interpreter._eventId = 0;
        const damage = interpreter.calculateDamageAgainstEvent(event, "skill", skill.id);
        if (!(damage > 0)) return;
        command("UpdateEventHp", { eventId: String(event.eventId()), value: String(-damage), exceedMaxHealth: "false" });
    };
    const advance = (event, record, seconds) => {
        const elapsed = Math.min(seconds, record.remaining);
        record.remaining = Math.max(0, record.remaining - seconds);
        record.tickTimer += elapsed;
        while (record.ticks < maxTicks && record.tickTimer >= interval - EPSILON) {
            record.tickTimer -= interval;
            record.ticks++;
            tickDamage(event, record);
            if (!aliveHp(record.map, event)) { clear(event, record); return; }
        }
        if (record.remaining < EPSILON || record.ticks >= maxTicks) clear(event, record);
    };
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _updateCooldown.apply(this, arguments);
        for (const [event, record] of [...effects]) {
            if (!deck.isCardBattleActive() || record.map !== currentMap() || event._erased ||
                    record.map.event(event.eventId()) !== event || !record.battler.isAlive() ||
                    !root.hasState(event.eventId(), record.stateId)) {
                clear(event, record);
            } else if (Number.isFinite(seconds) && seconds > 0) {
                advance(event, record, seconds);
            }
        }
        return result;
    };

    // ---- 弾の衝突（Golden Arrowと同じ公式checkCollide経路、1発1Hit） ----
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive || this.eventsPaused || !projectiles.size) return;
        for (const [id, record] of [...projectiles]) {
            if (record.map !== this || this.event(id) !== record.event || record.event._erased) {
                projectiles.delete(id);
                continue;
            }
            if (root.checkCollide(id, "<destroyProjectile>") || root.checkCollide(id, "map boundary")) {
                destroy(id, record);
            }
        }
        if (!projectiles.size) return;
        for (const enemy of this.events()) {
            if (!enemy || enemy._erased || !enemy.event()?.note?.includes("<enemy>")) continue;
            const enemyId = enemy.eventId();
            if (!aliveHp(this, enemy) || !root.checkCollide(enemyId, TAG)) continue;
            const sourceId = root.CollisionManager.lastSourceEventId;
            const record = projectiles.get(sourceId);
            if (!record || record.map !== this || this.event(sourceId) !== record.event) continue;
            try {
                command("UpdateEventHp", { eventId: String(enemyId), value: "-damage", exceedMaxHealth: "false" }, sourceId);
                // 初撃で倒れた敵にはDiseaseを付けない。耐性で失敗しても初撃は有効。
                if (aliveHp(this, enemy)) applyDisease(enemy, this);
            } finally {
                destroy(sourceId, record);
            }
            if (!projectiles.size) break;
        }
    };

    // ---- 終了・マップ切替・ロード ----
    const _endBattle = deck.endBattle;
    deck.endBattle = function() {
        clearProjectiles();
        clearAll();
        return _endBattle.apply(this, arguments);
    };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() {
        clearProjectiles();
        clearAll();
        return _setup.apply(this, arguments);
    };
    const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _onMapLoaded.apply(this, arguments);
        const map = currentMap();
        for (const event of map.events()) {
            if (isProjectile(event) && projectiles.get(event.eventId())?.event !== event) {
                destroy(event.eventId(), { map, event });
            }
        }
    };

    // 共有参照も保った保存用コピーからDiseaseだけを除外する（Phase 2C-2睡眠と同方式）。
    const withoutDisease = (value, id, seen = new Map()) => {
        if (!value || typeof value !== "object") return value;
        if (seen.has(value)) return seen.get(value);
        const saved = value instanceof Map ? new Map() : value instanceof Set ? new Set() :
            Array.isArray(value) ? new Array(value.length) : Object.create(Object.getPrototypeOf(value));
        seen.set(value, saved);
        if (value instanceof Map) {
            for (const [key, entry] of value) saved.set(withoutDisease(key, id, seen), withoutDisease(entry, id, seen));
        } else if (value instanceof Set) {
            for (const entry of value) saved.add(withoutDisease(entry, id, seen));
        } else {
            for (const key of Object.keys(value)) saved[key] = withoutDisease(value[key], id, seen);
        }
        if (value.isStateAffected?.(id) && Array.isArray(value._states)) {
            saved._states = saved._states.filter(s => s !== id);
            delete saved._stateTurns[id];
        }
        return saved;
    };
    const _save = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _save.apply(this, arguments), id = stateId();
        return id && effects.size ? withoutDisease(contents, id) : contents;
    };
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() {
        clearProjectiles();
        clearAll();
        const result = _extract.apply(this, arguments);
        const id = stateId();
        if (id) {
            for (const event of currentMap()?.events() || []) battlerFor(event)?.removeState(id);
        }
        return result;
    };

    const isEventDiseased = eventId => {
        const event = currentMap()?.event(eventId);
        return !!event && !event._erased && !!stateId() && effects.has(event) &&
            typeof root.hasState === "function" && root.hasState(eventId, stateId());
    };
    root.ProjectRApolloDiseaseAttack = {
        isEventDiseased,
        getRemainingSeconds: eventId => isEventDiseased(eventId) ? effects.get(currentMap().event(eventId)).remaining : 0,
        getActiveProjectiles: () => [...projectiles].map(([eventId, record]) => ({
            eventId, rotation: record.event._rotation
        }))
    };
})();
