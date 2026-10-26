/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 2B Apollo「黄金の弓矢」だけをAction Combatへ接続。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_GodSummonManager
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @orderAfter ProjectR_CardBattleInput
 * @help
 * apollo_golden_arrowのdirection handler。CardDeckCore/Inputは変更しません。
 * Map002の専用PrefabをspawnEventで非恒久生成し、発射時のマウス角を
 * rotateTo(degree)で一度だけ設定します。移動はPrefabのmoveToPosition('forward')。
 * Gamepad接続中もマウスを使用し、発射後は追尾しません。
 *
 * checkCollide(敵ID, '<projectRGoldenArrow>')で敵をDamage受け手にし、
 * <dmg: 黄金の弓矢><attacker: player>からDatabase Skillを解決します。
 * UpdateEventHpの-damageで適用し、DestroyEventで当該1発を消します。
 * 独自Collision/HP計算は実装しません。Prefab寿命は90フレーム。
 *
 * 生成・回転の成功時だけ{ok:true}を返し、消費/Cooldown/ドローは既存Routerに任せます。
 * Phase 3A: 発射前にProjectRGodSummonManagerでApollo一時召喚を作り、召喚context
 * （プレイヤー位置と固定済みマウス角）から同じ弾を発射します。弾の位置・角度・
 * Damage・攻撃者(player)は従来どおり。生成失敗時は召喚も破棄され非消費です。
 * 他のdirectionカードはPhase 2Aの仮成功のままです。
 * 終了・マップ切替で弾を破棄。セーブ形式と保存処理は変更しません。
 * Engine標準のMap保存に含まれた非恒久弾はロード後onMapLoadedで破棄します。
 *
 * Console確認: ProjectRApolloGoldenArrow.getActiveProjectiles()
 * Damage式・命中・属性等はSkill「黄金の弓矢」で調整してください。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD_ID = "apollo_golden_arrow";
    const TAG = "<projectRGoldenArrow>";
    const SKILL_MARKER = "<ProjectRCard: apollo_golden_arrow>";
    const TEMPLATE_NAME = "ProjectR Apollo Golden Arrow";
    const projectiles = new Map();
    let shotSerial = 0; // Ultimateゲージの与ダメージgainId用（1発1Hit・IDの再利用に依存しない）。

    // 与ダメージ報酬: ゲージplugin（任意）が前後のHP差から実ダメージを記録する。無い場合・失敗しても攻撃は同じ。
    const trackDamage = (enemyId, attackId, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        return typeof gauge?.trackDamage === "function"
            ? gauge.trackDamage(enemyId, { attackId, source: "damage:golden_arrow" }, apply) : apply();
    };
    const command =(name, args, eventId) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const isArrow = event => !!event?.event?.()?.note?.includes(TAG);
    const currentMap = () => typeof $gameMap !== "undefined" ? $gameMap : null;
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
                !["UpdateEventHp", "DestroyEvent"].every(name =>
                    typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) {
            return { ok: false, reason: "actionCombatUnavailable" };
        }
        const skills = (typeof $dataSkills !== "undefined" ? $dataSkills : [])
            .filter(skill => skill?.note?.includes(SKILL_MARKER));
        const skill = skills[0];
        if (skills.length !== 1 || skill.damage?.type !== 1 ||
                $dataSkills.filter(s => s?.name === skill.name).length !== 1) {
            return { ok: false, reason: "damageSkillUnavailable" };
        }
        const templates = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null;
        const template = templates?.find(event => event?.name === TEMPLATE_NAME);
        if (!template || !template.note.includes(TAG) ||
                !template.note.includes(`<dmg: ${skill.name}>`) || !template.note.includes("<attacker: player>")) {
            return { ok: false, reason: "projectileTemplateUnavailable" };
        }
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return { ok: false, reason: "godSummonUnavailable" };
        // Apollo一時召喚 → 召喚アンカーから黄金の弓矢を発射。失敗時は召喚も即破棄。
        return summons.perform({ definition: cardContext?.definition }, summon => fire(map, template, summon));
    };
    // 導入済みrotateTo('mouse or gamepad')のマウス分岐と同じ画面座標系の角度を、
    // 召喚contextが発射時に一度だけ固定して渡す。Gamepadの有無にかかわらずマウス角。
    const fire = (map, template, summon) => {
        const { x, y, degree } = summon;
        const before = new Set(map.events());
        try {
            const id = map.spawnEvent(template.id, x, y, false, degree);
            const event = id && map.event(id);
            if (!event || before.has(event) || !isArrow(event) || typeof event.rotateTo !== "function") {
                throw Error("projectileCreationFailed");
            }
            event.rotateTo(degree); // 0度も明示適用。Prefab側ではrotateToを繰り返さない。
            if (!Number.isFinite(event._rotation) || Math.abs(event._rotation - degree) > 0.000001) {
                throw Error("projectileRotationFailed");
            }
            projectiles.set(id, { map, event, serial: ++shotSerial });
            return { ok: true };
        } catch (error) {
            // spawnEventが登録後に例外を出した場合も、新しく生成された専用弾だけを片付ける。
            for (const event of map.events()) {
                if (!before.has(event) && isArrow(event)) destroy(event.eventId(), { map, event });
            }
            return { ok: false, reason: String(error?.message || error) };
        }
    };

    deck.registerActivationHandler("direction", context =>
        context.definition.cardId === CARD_ID ? activate(context) : { ok: true }
    );

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
        // 既存の敵タグで絞り、Collision/Skill計算は必ず公式checkCollideへ委譲する。
        for (const enemy of this.events()) {
            if (!enemy || enemy._erased || !enemy.event()?.note?.includes("<enemy>")) continue;
            const enemyId = enemy.eventId();
            const hp = this.getCurrentEventHp(enemyId);
            if (hp == null || hp <= 0 || !root.checkCollide(enemyId, TAG)) continue;
            const sourceId = root.CollisionManager.lastSourceEventId;
            const record = projectiles.get(sourceId);
            if (!record || record.map !== this || this.event(sourceId) !== record.event) continue;
            try {
                trackDamage(enemyId, `arrow:${record.serial}`, () =>
                    command("UpdateEventHp", { eventId: String(enemyId), value: "-damage", exceedMaxHealth: "false" }, sourceId));
            } finally {
                // 同じ弾は他の敵の判定へ残さない。貫通なし。
                destroy(sourceId, record);
            }
            if (!projectiles.size) break;
        }
    };

    const _endBattle = deck.endBattle;
    deck.endBattle = function() {
        clearProjectiles();
        return _endBattle.apply(this, arguments);
    };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() {
        clearProjectiles();
        return _setup.apply(this, arguments);
    };
    const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _onMapLoaded.apply(this, arguments);
        // Save処理に手を加えず、ロードされた未追跡のカード専用弾だけを除去する。
        const map = currentMap();
        for (const event of map.events()) {
            if (isArrow(event) && projectiles.get(event.eventId())?.event !== event) {
                destroy(event.eventId(), { map, event });
            }
        }
    };

    root.ProjectRApolloGoldenArrow = {
        getActiveProjectiles: () => [...projectiles].map(([eventId, record]) => ({
            eventId, rotation: record.event._rotation
        }))
    };
})();
