/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 4D-1 Hermes Ultimate（暫定名「ヘルメース奥義」）: 全方位の6連斬撃。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_GodSummonManager
 * @base ProjectR_UltimateActivation
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @orderAfter ProjectR_UltimateActivation
 * @orderAfter ProjectR_HermesSwordsmanship
 *
 * @param SlashCount
 * @text 斬撃回数（暫定）
 * @type number
 * @min 1
 * @max 12
 * @default 6
 *
 * @param SlashIntervalSeconds
 * @text 斬撃間隔（秒・暫定）
 * @type number
 * @decimals 3
 * @min 0.001
 * @default 0.12
 *
 * @param SequenceSeconds
 * @text 全体の最短時間（秒・暫定）
 * @type number
 * @decimals 3
 * @min 0
 * @default 0.75
 * @desc 最後の斬撃が消えてもこの時間までは「発動中」として扱います（二重発動の防止用）。
 *
 * @param RangeTiles
 * @text 射程（tile・暫定）
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 2.0
 * @desc プレイヤー中心から各斬撃の先端までの距離。
 *
 * @param HitboxWidth
 * @text Hitbox幅（tile・暫定）
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 1.5
 *
 * @param LifetimeFrames
 * @text 斬撃1回の寿命（有効frame）
 * @type number
 * @min 1
 * @default 3
 *
 * @param UltimateDamageGeneratesGauge
 * @text Ultimateの与ダメージでゲージを得る
 * @type boolean
 * @default false
 * @desc falseでは、この奥義のダメージはUltimate Gaugeを増やしません（バランス確認前の暫定）。
 *
 * @help
 * Phase 4D-1: Hermesの本番Ultimate handlerを1つだけ実装します（Apolloは未実装）。
 * 名称・数値・演出はすべて仮です。
 *
 * 【流れ】 Uキー → Phase 4Cの検証 → このplugin → 成功 → Phase 4Cがゲージを消費(100→0)
 *   → 6連斬撃 → 各Hitboxが敵へDatabase Skillのダメージ → 終了。
 *   ゲージの消費・リセットはこのpluginでは行いません（handlerが {ok:true,started:true} を返した後、Phase 4Cが行う）。
 *
 * 【登録】 起動時に ProjectRUltimateActivation.registerUltimateHandler(Hermesのgod ID, handler) を呼びます。
 *   god IDは ProjectRGodSummonManager.resolveGodId("hermes") の結果をそのまま使います（別の対応表は作りません）。
 *   Apolloのhandlerは登録しません（noUltimateHandler のまま）。
 *
 * 【斬撃】 発動時のマウス角(上=0度・時計回り)を基準角として1回だけ固定します。以後のマウス移動は影響しません。
 *   SlashCount=6 の順序: 基準 → +60 → -60 → +120 → -120 → 反対(180)。他の回数でも 360/回数 刻みで交互に広げます。
 *   各斬撃はDynamic Hitbox（射程RangeTiles×幅HitboxWidth、寿命LifetimeFramesの有効frame）。
 *   原点は斬撃を生成する瞬間のプレイヤー中心です（プレイヤーは動かしません。常駐Hermesの論理アンカーは
 *   プレイヤーの近傍にある派生位置なので、位置のずれを避けてプレイヤー中心を使います）。
 *   1回目の斬撃は発動の瞬間に生成します（失敗なら発動全体が失敗: ゲージは100のまま、状態は残りません）。
 *   以降は SlashIntervalSeconds ごと（1有効frame=1/60秒）。SequenceSeconds を過ぎると終了します。
 *   各斬撃が各敵に当たるのは最大1回。別の斬撃なら同じ敵に再び当たります。
 *
 * 【ダメージ】 Skill note <ProjectRUltimate: hermes_ultimate> のDatabase Skill（ID235 ヘルメース奥義）。
 *   式: a.atk * 1.2 - b.def * 0.5（1斬撃あたり。6回で合計 約7.2 atk）。仮バランス。
 *   既存の Swordsmanship と同じ <dmg: Skill名><attacker: player> のHitbox → checkCollide → UpdateEventHp(-damage)。
 *
 * 【ゲージ】 UltimateDamageGeneratesGauge=false（既定）ではダメージでゲージを得ません。
 *   trueにすると、既存の ProjectRUltimateGauge.trackDamage（Phase 4B）を通して加算します。式は複製しません。
 *
 * 【同時実行・後始末】
 *   発動中にもう一度要求すると handler が ultimateEffectActive を返し、Phase 4Cでは ultimateStartFailed
 *   (handlerReason: ultimateEffectActive) になってゲージは変わりません。通常カードは使えます。
 *   発動後は、戦闘終了・マップ移動・ロードで即中断し、Hitboxを除去します（ゲージは返しません）。
 *   メニュー・会話・フォーカス喪失中は進みません（カードの戦闘時間と同じ条件）。
 *   常駐Hermesが発動中に崩壊しても、始まった奥義は最後まで続きます。何も保存しません。
 *
 * Console: ProjectRHermesUltimate.isHermesUltimateActive() / getHermesUltimateState() /
 *          getHermesUltimateLastResult() / getActiveHitboxes() / getRegistration()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const SKILL_KEY = "hermes_ultimate";
    const TAG = "<projectRHermesUltimate>";
    const FRAME_SECONDS = 1 / 60;
    const EPSILON = 1e-9;
    const parameters = PluginManager.parameters("ProjectR_HermesUltimate");
    const setting = (name, fallback, min) => {
        const raw = parameters[name];
        const value = raw === undefined || String(raw).trim() === "" ? NaN : Number(raw);
        return Number.isFinite(value) && value >= min ? value : fallback;
    };
    const config = Object.freeze({
        slashCount: Math.min(12, Math.floor(setting("SlashCount", 6, 1))),
        intervalSeconds: setting("SlashIntervalSeconds", 0.12, 0.001),
        sequenceSeconds: setting("SequenceSeconds", 0.75, 0),
        rangeTiles: setting("RangeTiles", 2.0, 0.01),
        hitboxWidth: setting("HitboxWidth", 1.5, 0.01),
        lifetimeFrames: Math.floor(setting("LifetimeFrames", 3, 1)),
        damageGeneratesGauge: String(parameters.UltimateDamageGeneratesGauge ?? "false").trim().toLowerCase() === "true"
    });

    let sequence = null; // 発動中の奥義 {instanceId, map, ...}。最大1。保存しない。
    let instanceSerial = 0;
    let lastResult = null;

    // ---- 斬撃角度（上=0度・時計回り）: 基準 → +step → -step → +2step → -2step … ----
    const normalizeDegree = degree => {
        const wrapped = Math.round((((degree % 360) + 360) % 360) * 1e9) / 1e9;
        return wrapped >= 360 ? 0 : wrapped;
    };
    const slashDegrees = (base, count) => {
        const step = 360 / count;
        return Array.from({ length: count }, (_, i) => {
            const magnitude = Math.ceil(i / 2) * step;
            return normalizeDegree(base + (i === 0 ? 0 : i % 2 === 1 ? magnitude : -magnitude));
        });
    };

    // ---- Dynamic Hitbox（Swordsmanshipと同じ手順。同pluginの内部は公開されていないため同じ形で持つ） ----
    const isUltimateHitbox = event => !!event?.event?.()?.note?.includes(TAG);
    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const destroyHitbox = (id, slash) => {
        const map = slash.map, event = slash.event;
        if (sequence) sequence.slashes.delete(id);
        if (map.event(id) !== event) return;
        // 導入版Game_MaithlDynamicEvent.event()の寿命スクリプトと同じ同期解除。
        root.CollisionManager.clearCollisions(id);
        map.removeEventFromTagIndex(event);
        // checkCollideの一度限り履歴も、この斬撃の一意タグ分だけ片付ける。
        const tags = event.event().note.match(/<projectRHermesUltimateHit\d+_\d+>/g) || [];
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

    // ---- 1斬撃の生成。失敗時は生成途中のHitboxも除去して例外を投げる ----
    const spawnSlash = index => {
        const map = sequence.map;
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        const point = typeof player?.centerPositionPoint === "function" ? player.centerPositionPoint() : null;
        if (![point?.x, point?.y].every(Number.isFinite)) throw Error("invalidPlayerPosition");
        const degree = sequence.degrees[index];
        const radians = (degree - 90) * Math.PI / 180;
        const forward = config.rangeTiles / 2;
        const x = point.x - 0.5 + Math.cos(radians) * forward;
        const y = point.y - 0.5 + Math.sin(radians) * forward;
        // 導入版Collisionの0度だけ非回転扱いになる分岐を避け、真上は同値の360度。
        const rotation = degree === 0 ? 360 : degree;
        const tag = `<projectRHermesUltimateHit${sequence.instanceId}_${index}>`;
        const before = new Set(map.events());
        try {
            command("spawnEventHitbox", {
                name: "DynamicHitbox",
                notetag: `${TAG}${tag}<dmg: ${sequence.skillName}><attacker: player><hitbox: ${config.hitboxWidth}, ${config.rangeTiles}>`,
                comment: "", position: `${x}, ${y}`, rotationDegree: String(rotation),
                turnToward: "", attachTo: "", wait: ""
            });
            const created = map.events().filter(e => !before.has(e) && isUltimateHitbox(e));
            if (created.length !== 1) throw Error("hitboxCreationFailed");
            const event = created[0];
            if (!event.isDynamicEvent || !event.event().note.includes(tag) ||
                    typeof event.rotateTo !== "function") throw Error("hitboxCreationFailed");
            event.rotateTo(rotation);
            if (!Number.isFinite(event._rotation) || Math.abs(event._rotation - rotation) > 1e-6 ||
                    ![event._realX, event._realY].every(Number.isFinite)) throw Error("hitboxRotationFailed");
            // 斬撃ごとに独立した命中記録（敵Event単位で1回）。
            sequence.slashes.set(event.eventId(), { map, event, tag, index, degree, framesLeft: config.lifetimeFrames,
                hitEnemies: new Set() });
        } catch (error) {
            for (const event of map.events()) {
                if (!before.has(event) && isUltimateHitbox(event)) destroyHitbox(event.eventId(), { map, event });
            }
            throw error;
        }
    };

    // ---- 終了。Hitboxと命中記録を全て片付ける（ゲージは返さない） ----
    const finish = outcome => {
        const ended = sequence;
        if (!ended) return;
        for (const [id, slash] of [...ended.slashes]) destroyHitbox(id, slash);
        sequence = null;
        lastResult = Object.freeze({ instanceId: ended.instanceId, outcome, slashCount: ended.count,
            spawnedSlashes: ended.next - ended.failed, failedSlashes: ended.failed, hitCount: ended.hits,
            elapsedSeconds: ended.elapsed });
    };

    // ---- 1有効frameの進行: 既存Hitboxの命中判定と寿命 → 時間経過 → 次の斬撃生成 → 終了判定 ----
    const trackedDamage = (enemyId, slash, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        if (!config.damageGeneratesGauge || typeof gauge?.trackDamage !== "function") return apply();
        // 実ダメージの換算・上限・重複判定は既存のPhase 4Bの共通処理に任せる（式は複製しない）。
        return gauge.trackDamage(enemyId, {
            attackId: `hermesUltimate:${sequence.instanceId}:${slash.index}`, source: "damage:hermes_ultimate"
        }, apply);
    };
    const step = map => {
        for (const [id, slash] of [...sequence.slashes]) {
            if (slash.map !== map || map.event(id) !== slash.event || slash.event._erased) {
                destroyHitbox(id, slash);
                continue;
            }
            for (const enemy of map.events()) {
                if (!enemy || enemy._erased || slash.hitEnemies.has(enemy) ||
                        !enemy.event()?.note?.includes("<enemy>")) continue;
                const enemyId = enemy.eventId(), hp = map.getCurrentEventHp(enemyId);
                if (hp == null || hp <= 0 || !root.checkCollide(enemyId, slash.tag) ||
                        root.CollisionManager.lastSourceEventId !== id) continue;
                slash.hitEnemies.add(enemy);
                sequence.hits++;
                trackedDamage(enemyId, slash, () =>
                    command("UpdateEventHp", { eventId: String(enemyId), value: "-damage", exceedMaxHealth: "false" }, id));
            }
            if (--slash.framesLeft <= 0) destroyHitbox(id, slash);
        }
        sequence.elapsed += FRAME_SECONDS;
        // この有効frameで生成した斬撃は、次の有効frameから命中判定する（Collision更新の後に判定するため）。
        while (sequence.next < sequence.count && sequence.next * config.intervalSeconds <= sequence.elapsed + EPSILON) {
            const index = sequence.next++;
            try {
                spawnSlash(index);
            } catch (error) {
                sequence.failed++; // 途中の斬撃だけ欠ける。奥義全体は止めない。
            }
        }
        if (sequence.next >= sequence.count && !sequence.slashes.size &&
                sequence.elapsed + EPSILON >= config.sequenceSeconds) finish("completed");
    };
    const canAdvance = (map, sceneActive) => {
        if (!sceneActive || map.eventsPaused) return false;
        const accept = root.ProjectRCardBattleInput?.canAcceptInput;
        return typeof accept === "function" ? accept() === true : true;
    };

    // ---- handler（Phase 4Cのtransaction用）: 開始に必要な準備がすべて整った後にだけ成功を返す ----
    const godId = root.ProjectRGodSummonManager?.resolveGodId?.("hermes") ?? null;
    const start = context => {
        if (sequence) return { ok: false, reason: "ultimateEffectActive" };
        if (!godId || context?.godId !== godId) return { ok: false, reason: "wrongGod" };
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!deck?.isCardBattleActive?.() || !map || !player ||
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
            .filter(skill => skill?.note?.includes(`<ProjectRUltimate: ${SKILL_KEY}>`));
        const skill = skills[0];
        if (skills.length !== 1 || skill.damage?.type !== 1 || !skill.name || /[<>]/.test(skill.name) ||
                $dataSkills.filter(s => s?.name?.toLowerCase() === skill.name.toLowerCase()).length !== 1) {
            return { ok: false, reason: "damageSkillUnavailable" };
        }
        if (typeof TouchInput === "undefined" || typeof player.screenX !== "function" || typeof player.screenY !== "function") {
            return { ok: false, reason: "invalidMousePosition" };
        }
        // 基準角は発動の瞬間のマウス方向を1回だけ（Manager・Swordsmanshipと同じ画面座標系・角度式）。
        const dx = TouchInput.x - player.screenX(), dy = TouchInput.y - player.screenY();
        if (![dx, dy].every(Number.isFinite) || Math.hypot(dx, dy) < 1e-8) return { ok: false, reason: "invalidMousePosition" };
        const base = normalizeDegree(Math.atan2(dy, dx) * 180 / Math.PI + 450);
        sequence = { instanceId: ++instanceSerial, map, skillName: skill.name, baseDegree: base,
            count: config.slashCount, degrees: slashDegrees(base, config.slashCount), slashes: new Map(),
            next: 0, failed: 0, hits: 0, elapsed: 0 };
        try {
            sequence.next = 1;
            spawnSlash(0); // 1回目を生成できて初めて「開始成功」。
        } catch (error) {
            const reason = String(error?.message || error);
            sequence = null; // 生成途中のHitboxは spawnSlash 側で除去済み。部分的な状態を残さない。
            return { ok: false, reason };
        }
        return { ok: true, started: true, instanceId: sequence.instanceId, slashCount: sequence.count, baseDegree: base };
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
            if (canAdvance(this, sceneActive)) step(this);
        } catch (error) {
            finish("error"); // Game_Map.updateを壊さない。Hitboxは必ず片付ける。
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
        for (const event of $gameMap.events()) {
            if (isUltimateHitbox(event) && sequence?.slashes.get(event.eventId())?.event !== event) {
                destroyHitbox(event.eventId(), { map: $gameMap, event });
            }
        }
    };

    root.ProjectRHermesUltimate = {
        isHermesUltimateActive: () => !!sequence,
        getHermesUltimateState: () => sequence && {
            instanceId: sequence.instanceId, baseDegree: sequence.baseDegree, slashCount: sequence.count,
            slashDegrees: [...sequence.degrees], spawnedSlashes: sequence.next - sequence.failed,
            failedSlashes: sequence.failed, currentSlashIndex: sequence.next - 1, hitCount: sequence.hits,
            elapsedSeconds: sequence.elapsed, remainingSeconds: Math.max(0, config.sequenceSeconds - sequence.elapsed),
            activeHitboxes: sequence.slashes.size
        },
        getHermesUltimateLastResult: () => lastResult && { ...lastResult },
        getActiveHitboxes: () => sequence ? [...sequence.slashes].map(([eventId, slash]) => ({
            eventId, slashIndex: slash.index, degree: slash.degree, rotation: slash.event._rotation,
            x: slash.event._realX, y: slash.event._realY, framesLeft: slash.framesLeft
        })) : [],
        getConfig: () => ({ ...config }),
        getRegistration: () => ({ ...registration })
    };
})();
