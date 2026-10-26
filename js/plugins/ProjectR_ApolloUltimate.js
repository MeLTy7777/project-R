/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 4D-2 Apollo Ultimate（暫定名「アポロン奥義」）: 7本の扇状・黄金の矢の連射。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_GodSummonManager
 * @base ProjectR_UltimateActivation
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @orderAfter ProjectR_UltimateActivation
 * @orderAfter ProjectR_ApolloGoldenArrow
 * @orderAfter ProjectR_HermesUltimate
 *
 * @param ArrowCount
 * @text 矢の本数（暫定）
 * @type number
 * @min 1
 * @max 15
 * @default 7
 *
 * @param ArrowIntervalSeconds
 * @text 発射間隔（秒・暫定）
 * @type number
 * @decimals 3
 * @min 0.001
 * @default 0.10
 *
 * @param SpreadStepDegrees
 * @text 扇の1段の角度（度・暫定）
 * @type number
 * @decimals 2
 * @min 0
 * @max 90
 * @default 10
 * @desc 基準 → +段 → -段 → +2段 → -2段 … の順に広げます。
 *
 * @param ProjectileLifetimeFrames
 * @text 矢1本の寿命（有効frame）
 * @type number
 * @min 1
 * @default 90
 * @desc 専用Prefabの寿命（90フレーム）と同じ値。超えた矢はこのpluginが消します。
 *
 * @param UltimateDamageGeneratesGauge
 * @text Ultimateの与ダメージでゲージを得る
 * @type boolean
 * @default false
 * @desc falseでは、この奥義のダメージはUltimate Gaugeを増やしません（バランス確認前の暫定）。
 *
 * @help
 * Phase 4D-2: Apolloの本番Ultimate handlerを実装します。名称・数値・演出はすべて仮です。
 *
 * 【流れ】 Uキー → Phase 4Cの検証 → このplugin → 成功 → Phase 4Cがゲージを消費(100→0)
 *   → 7本の矢を扇状に連射 → 各矢が敵へDatabase Skillのダメージ → 終了。
 *   ゲージの消費・加算・リセットはこのpluginでは行いません（handlerが {ok:true,started:true} を返した後、Phase 4Cが行う）。
 *
 * 【登録】 起動時に ProjectRUltimateActivation.registerUltimateHandler(Apolloのgod ID, handler) を呼びます。
 *   god IDは ProjectRGodSummonManager.resolveGodId("apollo") の結果をそのまま使います（別の対応表は作りません）。
 *   Hermesのhandler(ProjectR_HermesUltimate)とは別のplugin・別の実行時状態です。
 *
 * 【矢】 発動時のマウス角(上=0度・時計回り)を基準角として1回だけ固定します。以後のマウス移動は影響しません。
 *   ArrowCount=7 の順序: 基準 → +10 → -10 → +20 → -20 → +30 → -30。各矢は発射時の角度のまま直進します（追尾・貫通・爆発なし）。
 *   1本目は発動の瞬間に生成します（失敗なら発動全体が失敗: ゲージは100のまま、状態は残りません）。
 *   以降は ArrowIntervalSeconds ごと（1有効frame=1/60秒）。既定は0.10秒間隔で、最後の矢まで約0.6秒です。
 *
 * 【Prefab】 Map002 の専用Prefab「ProjectR Apollo Ultimate Arrow」(Event ID 5)を spawnEvent で生成します。
 *   Golden Arrow用Prefab(ID 3)は <dmg: 黄金の弓矢> が固定なので流用せず、<dmg: アポロン奥義> の専用Prefabにしました。
 *   移動・寿命・見た目はGolden Arrowと同じ（moveToPosition('forward')・90フレーム・VFX/$Bullet）。
 *
 * 【発射位置】 各矢を生成する瞬間のプレイヤー位置（Golden Arrowと同じ原点）です。常駐Apolloの論理アンカーは
 *   プレイヤーから(-0.75, -0.75)tileずれた派生位置で、壁の中や壁の向こうになり得るため矢の原点には使いません。
 *   Apolloは概念上の発射元です（神のスプライトはまだありません）。プレイヤーは動かしません。
 *
 * 【ダメージ】 Skill note <ProjectRUltimate: apollo_ultimate> のDatabase Skill（ID234 アポロン奥義）。
 *   式: a.atk * 0.9 - b.def * 0.4（1本あたり。仮バランス）。状態異常（病）は付与しません。
 *   Golden Arrowと同じ checkCollide → UpdateEventHp(-damage) → DestroyEvent。1本の矢は最大1回だけ当たり、
 *   命中した矢はその場で消えます。別の矢は同じ敵に当たれます。HPが0の敵には追加ダメージを与えません。
 *
 * 【ゲージ】 UltimateDamageGeneratesGauge=false（既定）ではダメージでゲージを得ません。
 *   trueにすると、既存の ProjectRUltimateGauge.trackDamage（Phase 4B）を通して加算します。
 *   attackIdは apolloUltimate:<発動instance>:arrow:<矢番号>（Phase 4Bが :<敵ID> を付けて gainId にします）。
 *
 * 【同時実行・後始末】
 *   発動中にもう一度要求すると handler が ultimateEffectActive を返し、Phase 4Cでは ultimateStartFailed
 *   (handlerReason: ultimateEffectActive) になってゲージは変わりません。通常カードは使えます。
 *   発動後は、戦闘終了・マップ移動・ロードで即中断し、この奥義の矢だけを除去します（ゲージは返しません）。
 *   メニュー・会話・フォーカス喪失中は次の矢を撃ちません（カードの戦闘時間と同じ条件）。
 *   始まった奥義は、発動中にApolloが崩壊しても最後まで続きます。何も保存しません。
 *
 * Console: ProjectRApolloUltimate.isApolloUltimateActive() / getApolloUltimateState() /
 *          getApolloUltimateLastResult() / getActiveProjectileCount() / getActiveProjectiles() / getRegistration()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const SKILL_KEY = "apollo_ultimate";
    const TAG = "<projectRApolloUltimate>";
    const TEMPLATE_NAME = "ProjectR Apollo Ultimate Arrow";
    const FRAME_SECONDS = 1 / 60;
    const EPSILON = 1e-9;
    const parameters = PluginManager.parameters("ProjectR_ApolloUltimate");
    const setting = (name, fallback, min, max = Infinity) => {
        const raw = parameters[name];
        const value = raw === undefined || String(raw).trim() === "" ? NaN : Number(raw);
        return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
    };
    const config = Object.freeze({
        arrowCount: Math.floor(setting("ArrowCount", 7, 1, 15)),
        intervalSeconds: setting("ArrowIntervalSeconds", 0.10, 0.001),
        spreadStepDegrees: setting("SpreadStepDegrees", 10, 0, 90),
        lifetimeFrames: Math.floor(setting("ProjectileLifetimeFrames", 90, 1)),
        damageGeneratesGauge: String(parameters.UltimateDamageGeneratesGauge ?? "false").trim().toLowerCase() === "true"
    });

    let sequence = null; // 発動中の奥義 {instanceId, map, ...}。最大1。保存しない。
    let instanceSerial = 0;
    let lastResult = null;

    // ---- 矢の角度（上=0度・時計回り）: 基準 → +step → -step → +2step → -2step … ----
    const normalizeDegree = degree => {
        const wrapped = Math.round((((degree % 360) + 360) % 360) * 1e9) / 1e9;
        return wrapped >= 360 ? 0 : wrapped;
    };
    const arrowDegrees = (base, count, step) => Array.from({ length: count }, (_, i) => {
        const magnitude = Math.ceil(i / 2) * step;
        return normalizeDegree(base + (i === 0 ? 0 : i % 2 === 1 ? magnitude : -magnitude));
    });

    const isUltimateArrow = event => !!event?.event?.()?.note?.includes(TAG);
    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    // checkCollideがこの矢のために$gameSystemへ作る履歴（キー: mapId-矢のID-敵ID-タグ）を片付け、セーブに残さない。
    const purgeCollisionHistory = id => {
        if (typeof $gameSystem === "undefined") return;
        for (const cache of [$gameSystem.collisionTimestamps, $gameSystem.collidedOnceEvents]) {
            for (const key of Object.keys(cache || {})) {
                if (key.includes(TAG) && key.split("-")[1] === String(id)) delete cache[key];
            }
        }
    };
    // Golden Arrowと同じ破棄手順（DestroyEvent）。別のMap・別のEventには触れない。
    const destroyArrow = (id, arrow) => {
        sequence?.arrows.delete(id);
        purgeCollisionHistory(id);
        const map = arrow.map;
        if (map.event(id) !== arrow.event) return;
        if (map !== (typeof $gameMap !== "undefined" ? $gameMap : null)) {
            // ロード等で入れ替わった古いMap上の矢: 現在のMapには触れず、古いMapの記録だけ外す。
            try { map.removeEventFromTagIndex?.(arrow.event); } catch (error) { /* 破棄済みのMapなので無視 */ }
            map._events[id] = null;
            return;
        }
        command("DestroyEvent", { target: String(id), destroyNearby: "", permanent: "false" }, id);
    };

    // ---- 1本の生成。失敗時は生成途中の専用Eventも除去して例外を投げる ----
    const spawnArrow = index => {
        const map = sequence.map;
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (![player?._realX, player?._realY].every(Number.isFinite)) throw Error("invalidPlayerPosition");
        const degree = sequence.degrees[index];
        const before = new Set(map.events());
        try {
            const id = map.spawnEvent(sequence.templateId, player._realX, player._realY, false, degree);
            const event = id && map.event(id);
            if (!event || before.has(event) || !isUltimateArrow(event) || typeof event.rotateTo !== "function") {
                throw Error("projectileCreationFailed");
            }
            event.rotateTo(degree); // 0度も明示適用（Golden Arrowと同じ）。
            if (!Number.isFinite(event._rotation) || Math.abs(event._rotation - degree) > 1e-6) {
                throw Error("projectileRotationFailed");
            }
            sequence.arrows.set(id, { map, event, index, degree, framesLeft: config.lifetimeFrames });
        } catch (error) {
            for (const event of map.events()) {
                if (!before.has(event) && isUltimateArrow(event)) destroyArrow(event.eventId(), { map, event });
            }
            throw error;
        }
    };

    // ---- 終了。この奥義の矢と状態を全て片付ける（ゲージは返さない） ----
    const finish = outcome => {
        const ended = sequence;
        if (!ended) return;
        for (const [id, arrow] of [...ended.arrows]) destroyArrow(id, arrow);
        sequence = null;
        lastResult = Object.freeze({ instanceId: ended.instanceId, outcome, arrowCount: ended.count,
            launchedArrows: ended.next - ended.failed, failedArrows: ended.failed, hitCount: ended.hits,
            elapsedSeconds: ended.elapsed });
    };

    const trackedDamage = (enemyId, arrow, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        if (!config.damageGeneratesGauge || typeof gauge?.trackDamage !== "function") return apply();
        // 実ダメージの換算・上限・重複判定は既存のPhase 4Bの共通処理に任せる（式は複製しない）。
        return gauge.trackDamage(enemyId, {
            attackId: `apolloUltimate:${sequence.instanceId}:arrow:${arrow.index}`, source: "damage:apollo_ultimate"
        }, apply);
    };
    // 飛行中の矢の寿命・壁・命中。矢の移動自体はPrefab（engine）が行う。
    const checkArrows = map => {
        for (const [id, arrow] of [...sequence.arrows]) {
            if (arrow.map !== map || map.event(id) !== arrow.event || arrow.event._erased) {
                sequence.arrows.delete(id);
                continue;
            }
            if (root.checkCollide(id, "<destroyProjectile>") || root.checkCollide(id, "map boundary") ||
                    --arrow.framesLeft < 0) destroyArrow(id, arrow);
        }
        if (!sequence.arrows.size) return;
        for (const enemy of map.events()) {
            if (!enemy || enemy._erased || !enemy.event()?.note?.includes("<enemy>")) continue;
            const enemyId = enemy.eventId();
            // 同じ敵に複数の矢が同時に重なっても、矢ごとに1回ずつ処理する（命中した矢はその場で消える）。
            for (let tries = sequence.arrows.size; tries > 0; tries--) {
                const hp = map.getCurrentEventHp(enemyId);
                if (hp == null || hp <= 0 || !root.checkCollide(enemyId, TAG)) break;
                const sourceId = root.CollisionManager.lastSourceEventId;
                const arrow = sequence.arrows.get(sourceId);
                if (!arrow || arrow.map !== map || map.event(sourceId) !== arrow.event) break;
                sequence.hits++;
                try {
                    trackedDamage(enemyId, arrow, () => command("UpdateEventHp",
                        { eventId: String(enemyId), value: "-damage", exceedMaxHealth: "false" }, sourceId));
                } finally {
                    destroyArrow(sourceId, arrow); // 貫通なし。1本1回。
                }
            }
            if (!sequence.arrows.size) break;
        }
    };
    // 1有効frame: 既存の矢の判定 → 時間経過 → 次の矢の生成 → 終了判定。
    const step = (map, canAdvance) => {
        checkArrows(map);
        if (canAdvance) {
            sequence.elapsed += FRAME_SECONDS;
            while (sequence.next < sequence.count && sequence.next * config.intervalSeconds <= sequence.elapsed + EPSILON) {
                const index = sequence.next++;
                try {
                    spawnArrow(index);
                } catch (error) {
                    sequence.failed++; // 途中の矢だけ欠ける。奥義全体は止めない。
                }
            }
        }
        if (sequence.next >= sequence.count && !sequence.arrows.size) finish("completed");
    };
    const canAdvanceNow = (map, sceneActive) => {
        if (!sceneActive || map.eventsPaused) return false;
        const accept = root.ProjectRCardBattleInput?.canAcceptInput;
        return typeof accept === "function" ? accept() === true : true;
    };

    // ---- handler（Phase 4Cのtransaction用）: 開始に必要な準備がすべて整った後にだけ成功を返す ----
    const godId = root.ProjectRGodSummonManager?.resolveGodId?.("apollo") ?? null;
    const start = context => {
        if (sequence) return { ok: false, reason: "ultimateEffectActive" };
        if (!godId || context?.godId !== godId || context?.summon?.persistent !== true) return { ok: false, reason: "wrongGod" };
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!deck?.isCardBattleActive?.() || !map || !player ||
                !(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) {
            return { ok: false, reason: "mapUnavailable" };
        }
        if (typeof DotMoveSystem === "undefined" || typeof root.checkCollide !== "function" ||
                !root.CollisionManager ||
                !["events", "event", "spawnEvent", "getCurrentEventHp"].every(name => typeof map[name] === "function") ||
                !["UpdateEventHp", "DestroyEvent"].every(
                    name => typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) {
            return { ok: false, reason: "actionCombatUnavailable" };
        }
        const skills = (typeof $dataSkills !== "undefined" ? $dataSkills : [])
            .filter(skill => skill?.note?.includes(`<ProjectRUltimate: ${SKILL_KEY}>`));
        const skill = skills[0];
        if (skills.length !== 1 || skill.damage?.type !== 1 || !skill.name || /[<>]/.test(skill.name) ||
                $dataSkills.filter(s => s?.name?.toLowerCase() === skill.name.toLowerCase()).length !== 1) {
            return { ok: false, reason: "damageSkillUnavailable" };
        }
        const templates = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null;
        const template = templates?.find(event => event?.name === TEMPLATE_NAME);
        if (!template || !template.note.includes(TAG) || !template.note.includes(`<dmg: ${skill.name}>`) ||
                !template.note.includes("<attacker: player>")) {
            return { ok: false, reason: "projectileTemplateUnavailable" };
        }
        if (typeof TouchInput === "undefined" || typeof player.screenX !== "function" || typeof player.screenY !== "function") {
            return { ok: false, reason: "invalidMousePosition" };
        }
        // 基準角は発動の瞬間のマウス方向を1回だけ（Manager・Golden Arrowと同じ画面座標系・角度式）。
        const dx = TouchInput.x - player.screenX(), dy = TouchInput.y - player.screenY();
        if (![dx, dy].every(Number.isFinite) || Math.hypot(dx, dy) < 1e-8) return { ok: false, reason: "invalidMousePosition" };
        const base = normalizeDegree(Math.atan2(dy, dx) * 180 / Math.PI + 450);
        sequence = { instanceId: ++instanceSerial, map, templateId: template.id, skillName: skill.name, baseDegree: base,
            count: config.arrowCount, degrees: arrowDegrees(base, config.arrowCount, config.spreadStepDegrees),
            arrows: new Map(), next: 0, failed: 0, hits: 0, elapsed: 0 };
        try {
            sequence.next = 1;
            spawnArrow(0); // 1本目を生成できて初めて「開始成功」。
        } catch (error) {
            const reason = String(error?.message || error);
            sequence = null; // 生成途中の矢は spawnArrow 側で除去済み。部分的な状態を残さない。
            return { ok: false, reason };
        }
        return { ok: true, started: true, instanceId: sequence.instanceId, arrowCount: sequence.count, baseDegree: base };
    };

    const registerHandler = () => {
        const activation = root.ProjectRUltimateActivation;
        if (!activation || !godId) return { ok: false, reason: !activation ? "activationUnavailable" : "godUnresolved", godId };
        return activation.registerUltimateHandler(godId, start);
    };
    const registration = registerHandler();

    // ---- ライフサイクル ----
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sequence) return;
        try {
            if (sequence.map !== this) return finish("mapChanged");
            if (!deck.isCardBattleActive()) return finish("battleEnded");
            if (sceneActive && !this.eventsPaused) step(this, canAdvanceNow(this, sceneActive));
        } catch (error) {
            finish("error"); // Game_Map.updateを壊さない。矢は必ず片付ける。
        }
    };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { finish("battleEnded"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { finish("mapChanged"); return _setup.apply(this, arguments); };
    const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _onMapLoaded.apply(this, arguments);
        if (sequence && sequence.map !== $gameMap) finish("mapChanged"); // ロード等でMapが入れ替わった
        // Engine標準のMap保存に含まれた、追跡していないこの奥義の矢だけを除去する。
        for (const event of $gameMap.events()) {
            if (isUltimateArrow(event) && sequence?.arrows.get(event.eventId())?.event !== event) {
                destroyArrow(event.eventId(), { map: $gameMap, event });
            }
        }
    };

    root.ProjectRApolloUltimate = {
        isApolloUltimateActive: () => !!sequence,
        getApolloUltimateState: () => sequence && {
            instanceId: sequence.instanceId, baseDegree: sequence.baseDegree, arrowCount: sequence.count,
            arrowDegrees: [...sequence.degrees], launchedArrows: sequence.next - sequence.failed,
            failedArrows: sequence.failed, currentArrowIndex: sequence.next - 1, hitCount: sequence.hits,
            launching: sequence.next < sequence.count, elapsedSeconds: sequence.elapsed,
            activeProjectiles: sequence.arrows.size
        },
        getApolloUltimateLastResult: () => lastResult && { ...lastResult },
        getActiveProjectileCount: () => sequence ? sequence.arrows.size : 0,
        getActiveProjectiles: () => sequence ? [...sequence.arrows].map(([eventId, arrow]) => ({
            eventId, arrowIndex: arrow.index, degree: arrow.degree, rotation: arrow.event._rotation,
            x: arrow.event._realX, y: arrow.event._realY, framesLeft: arrow.framesLeft
        })) : [],
        getConfig: () => ({ ...config }),
        getRegistration: () => ({ ...registration })
    };
})();
