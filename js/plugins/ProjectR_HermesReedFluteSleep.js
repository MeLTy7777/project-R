/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 2C-2 Hermes「葦笛睡眠」の範囲State handler。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_GodSummonManager
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_HermesRecognitionObscure
 *
 * @param RangeTiles
 * @text 葦笛の半径（tile）
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 4
 *
 * @param DurationSeconds
 * @text 睡眠の持続時間（秒）
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 4.0
 *
 * @help
 * hermes_reed_flute_sleep専用。既存ground登録を維持し、キーだけで即時発動。
 * Phase 3B: 検索・付与の前にProjectRGodSummonManagerでHermes一時召喚を作り、成功した
 * 場合だけ従来の範囲Sleep処理を行います（Managerが無い/生成失敗ならState未付与・非消費）。
 * 範囲はプレイヤー中心のまま（召喚位置=プレイヤー位置）で、判定ロジックは変更なし。
 * findTargets('<enemy>')で列挙し、checkRange(敵ID, 半径, 'player')で円判定。
 * 導入版1.6.6bはcheckRangeのtargetにイベントIDを扱わないため逆向きで使用。
 * 検索による敵の検知情報は復元します。独自距離計算・Collision・HPはありません。
 * AddState後hasStateで確認し、1体以上成功時のみ既存transactionへ成功を返します。
 * 耐性は公式AddStateのDatabase State有効度/無効化へ委譲します。
 *
 * ProjectRHermesReedFluteSleep.getLastDiagnostic(): 直近の発動の内訳(診断用・保存しない)。
 *   { ok, reason, detail, enemies(<enemy>として見つかった数), alive(生存), inRange(範囲内), applied(付与成功),
 *     stateId, error }。Arenaの状態端末が表示します。
 *
 * <ProjectRCard: hermes_reed_flute_sleep>の唯一のStateを使用。
 * 再使用で時間更新・非stack。Damageでは解除しません（Stateの設定で変更可能）。
 * 時間は認識阻害と同じInputのupdateCooldownで進み、操作不能中は停止。
 * 戦闘終了・マップ切替・ロードで解除。残り時間と睡眠Stateは保存しません。
 *
 * 新しい移動・攻撃・索敵を始める前に将来の共通Enemy/Boss AIで使用:
 *   ProjectRHermesReedFluteSleep.isEventSleeping(eventId)
 *   ProjectRHermesReedFluteSleep.canEnemyAct(eventId)
 * 現時点で共通Enemy AIがないため、AI停止の完全接続は後続Phaseです。
 * 既存Projectile/Hitbox・Damage処理には介入しません。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "hermes_reed_flute_sleep";
    const params = PluginManager.parameters("ProjectR_HermesReedFluteSleep");
    const positive = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
    const range = positive(params.RangeTiles, 4);
    const duration = positive(params.DurationSeconds, 4);
    const effects = new Map(); // runtime only: event -> { map, battler, stateId, remaining }
    let lastDiagnostic = null; // 診断のみ。保存しない。
    const record = diagnostic => { lastDiagnostic = Object.freeze({ ...diagnostic }); return lastDiagnostic; };
    const currentMap = () => typeof $gameMap !== "undefined" ? $gameMap : null;
    const stateId = () => {
        const matches = (typeof $dataStates !== "undefined" ? $dataStates : [])
            .filter(s => s?.note?.includes(`<ProjectRCard: ${CARD}>`));
        return matches.length === 1 ? matches[0].id : 0;
    };
    // 導入版AddState/RemoveState/hasStateが共用するBattler resolverへの最小adapter。
    const battlerFor = event => typeof SgetBattlerForH === "function" ? SgetBattlerForH(event) : null;
    const command = (name, eventId, id) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, { target: String(eventId), stateId: String(id) });
    };
    const clear = (event, record) => {
        effects.delete(event);
        try {
            if (record.map === currentMap() && record.map.event(event.eventId()) === event) {
                command("RemoveState", event.eventId(), record.stateId);
            }
        } finally {
            // マップ/イベント差替え・公式コマンド欠落時も元Battlerだけを片付ける。
            record.battler.removeState(record.stateId);
        }
    };
    const clearAll = () => {
        for (const [event, record] of [...effects]) clear(event, record);
    };
    const inRange = event => {
        // MZ同梱のNW.js(Chromium 85)にはObject.hasOwnが無いので、prototype経由で判定する。
        const has = key => Object.prototype.hasOwnProperty.call(event, key);
        const hadRange = has("_lastCheckRange");
        const previousRange = event._lastCheckRange;
        const hadTarget = has("_detectedEvent");
        const previousTarget = event._detectedEvent;
        // checkRangeはデバッグ用rangeと検知対象を更新するので、AIの検知状態を保存する。
        event._lastCheckRange = { ...previousRange };
        try {
            return root.checkRange(event.eventId(), range, "player");
        } finally {
            if (hadRange) event._lastCheckRange = previousRange;
            else delete event._lastCheckRange;
            if (hadTarget) event._detectedEvent = previousTarget;
            else delete event._detectedEvent;
        }
    };
    const applySleep = (event, id, map, battler) => {
        const already = root.hasState(event.eventId(), id);
        try {
            command("AddState", event.eventId(), id);
            if (!root.hasState(event.eventId(), id)) return false;
            effects.set(event, { map, battler, stateId: id, remaining: duration });
            return true;
        } catch (error) {
            // 付与後例外は非消費の新規効果を残さず、既存の睡眠/時間は維持する。
            if (!already) battler.removeState(id);
            return false;
        }
    };
    const missingPrerequisites = (map, id) => {
        const missing = [];
        if (!deck.isCardBattleActive()) missing.push("cardBattle");
        if (!map) missing.push("map");
        if (!id) missing.push("stateId(note <ProjectRCard: " + CARD + ">が1つだけ必要)");
        for (const name of ["findTargets", "checkRange", "hasState"]) if (typeof root[name] !== "function") missing.push(name);
        if (typeof map?.getCurrentEventHp !== "function") missing.push("getCurrentEventHp");
        if (typeof SgetBattlerForH !== "function") missing.push("SgetBattlerForH");
        for (const name of ["AddState", "RemoveState"]) {
            if (typeof PluginManager._commands?.[`${ENGINE}:${name}`] !== "function") missing.push(name + "Command");
        }
        return missing;
    };
    const activate = context => {
        const map = currentMap(), id = stateId();
        lastDiagnostic = null;
        const missing = missingPrerequisites(map, id);
        if (missing.length) {
            record({ ok: false, reason: "sleepStateUnavailable", detail: "missing", enemies: 0, alive: 0, inRange: 0,
                applied: 0, stateId: id, error: missing.join(",") });
            return { ok: false, reason: "sleepStateUnavailable" };
        }
        const summons = root.ProjectRGodSummonManager;
        if (!summons) {
            record({ ok: false, reason: "godSummonUnavailable", detail: "noManager", enemies: 0, alive: 0, inRange: 0, applied: 0, stateId: id });
            return { ok: false, reason: "godSummonUnavailable" };
        }
        // Hermes一時召喚 → Hermesが葦笛を吹く。召喚失敗時は検索もStateも触れない。
        const result = summons.perform({ definition: context?.definition, aim: false }, () => sleepTargets(map, id));
        if (!lastDiagnostic) {
            record({ ok: !!result?.ok, reason: result?.reason || "summonRejected", detail: "godSummonPerform", enemies: 0,
                alive: 0, inRange: 0, applied: 0, stateId: id });
        }
        return result;
    };
    const sleepTargets = (map, id) => {
        // 先に検索を完了。検索失敗で部分適用を残さない。
        const found = [...new Set(root.findTargets("<enemy>"))];
        const alive = found.filter(event => {
            if (!event || event._erased || map.event(event.eventId()) !== event) return false;
            const hp = map.getCurrentEventHp(event.eventId());
            return hp != null && hp > 0;
        });
        const near = alive.filter(event => inRange(event));
        const targets = near.map(event => ({ event, battler: battlerFor(event) })).filter(t => t.battler?.isAlive());
        let applied = 0;
        for (const { event, battler } of targets) if (applySleep(event, id, map, battler)) applied++;
        const detail = applied ? "applied" : !found.length ? "noEnemyFound" : !alive.length ? "noAliveEnemy"
            : !near.length ? "noEnemyInRange" : !targets.length ? "noAliveBattler" : "stateNotApplied";
        record({ ok: applied > 0, reason: applied ? "applied" : "noSleepTargetApplied", detail, enemies: found.length,
            alive: alive.length, inRange: near.length, applied, stateId: id });
        return applied ? { ok: true } : { ok: false, reason: "noSleepTargetApplied" };
    };
    deck.registerActivationHandler("ground", context => context.definition.cardId === CARD ? activate(context) : { ok: true });

    const _update = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _update.apply(this, arguments);
        for (const [event, record] of [...effects]) {
            if (!deck.isCardBattleActive() || record.map !== currentMap() || event._erased ||
                    record.map.event(event.eventId()) !== event || !record.battler.isAlive() ||
                    !root.hasState(event.eventId(), record.stateId)) {
                clear(event, record);
            } else if (Number.isFinite(seconds) && seconds > 0) {
                record.remaining = Math.max(0, record.remaining - seconds);
                if (record.remaining < 1e-8) clear(event, record);
            }
        }
        return result;
    };
    const _end = deck.endBattle;
    deck.endBattle = function() { clearAll(); return _end.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clearAll(); return _setup.apply(this, arguments); };

    // 検知対象/親子Event/Actorリンクなど共有参照も保った保存用コピーを作る。
    // 個別Eventの浅いコピーでは、別Eventの参照先に元Battlerの睡眠が残る。
    const withoutSleep = (value, id, seen = new Map()) => {
        if (!value || typeof value !== "object") return value;
        if (seen.has(value)) return seen.get(value);
        const saved = value instanceof Map ? new Map() : value instanceof Set ? new Set() :
            Array.isArray(value) ? new Array(value.length) : Object.create(Object.getPrototypeOf(value));
        seen.set(value, saved);
        if (value instanceof Map) {
            for (const [key, entry] of value) saved.set(withoutSleep(key, id, seen), withoutSleep(entry, id, seen));
        } else if (value instanceof Set) {
            for (const entry of value) saved.add(withoutSleep(entry, id, seen));
        } else {
            for (const key of Object.keys(value)) saved[key] = withoutSleep(value[key], id, seen);
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
        return id ? withoutSleep(contents, id) : contents;
    };
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() {
        clearAll();
        const result = _extract.apply(this, arguments);
        const id = stateId();
        if (id) {
            for (const event of currentMap()?.events() || []) battlerFor(event)?.removeState(id);
        }
        return result;
    };
    const isEventSleeping = eventId => {
        const event = currentMap()?.event(eventId);
        return !!event && !event._erased && !!stateId() &&
            typeof root.hasState === "function" && root.hasState(eventId, stateId());
    };
    root.ProjectRHermesReedFluteSleep = {
        getLastDiagnostic: () => lastDiagnostic ? { ...lastDiagnostic } : null,
        isEventSleeping,
        canEnemyAct: eventId => !isEventSleeping(eventId)
    };
})();
