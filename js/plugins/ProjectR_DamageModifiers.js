/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 被ダメージ修飾・弱点修飾・状態の共有基盤(Phase Apollo-A3)。既定はすべて中立(ダメージの数値を変えない)。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_KillAttribution
 * @orderAfter ProjectR_Elements
 *
 * @help
 * ProjectR_DamageModifiers.js
 *
 * 【位置づけ】将来のカード効果(病・弱点状態・傷・月桂冠・ヒュアキントスなど)が「対象が受けるダメージ」を増減するための共有の窓口です。
 *   このPhaseではどのカードも使いません。修飾が1つも登録されていない間(= 現行のすべて)は、Hendrixの呼び出しを1文字も書き換えず、
 *   ダメージの数値は従来と完全に同じです。ダメージの式・クリティカル・属性・DoT・多段の計算は変えません。
 *
 * 【どこで1回だけ掛かるか(二重適用の防止)】
 *   ・被ダメージ倍率(damageTaken): Hendrixの UpdateEventHp(敵・仲間イベント・主人公)/UpdatePlayerHp の「HPを減らす呼び出し」1回につき1回。
 *     ProjectR_KillAttribution の外側・ProjectR_CardModifiers の内側にあるこの1か所だけで掛けるので、通常の武器攻撃・弾・固定ダメージ・DoTの1tick・
 *     多段の1ヒットは、それぞれ呼び出しごとに1回だけ。ダメージの「計算」(calculateDamageAgainstEvent / makeDamageValue)では掛けません。
 *   ・弱点修飾(weakness): 属性有効度(1より大きい=弱点)を変える。MZの属性有効度の計算(Game_Action.calcElementRate)と、固定ダメージの属性係数
 *     (ProjectR_Elements.fixedFactor)が、1ヒットにつき1回ずつ ProjectR_Elements 経由でここに問い合わせる。計算は純粋(同じ入力なら同じ結果)。
 *   ・対象キー: "player"(主人公) / "ally:<actorId>"(PartyCombatの仲間) / "event:<eventId>"(敵などのEvent)。NPCは含みません。
 *
 * 【重ねがけの規則は未確定(中立が既定)】
 *   同じ対象・同じ種類の修飾が2つ以上有効なときの合成規則(乗算か加算か)は、ユーザーの確認待ちです。
 *   policy = "uncommitted"(既定): 1つだけなら適用、2つ以上は合成せず中立(1)にして、衝突として記録する(getConflicts)。
 *   policy = "multiplicative": 積 / "additive": 1 + Σ(各値 - 1)。テストと確認用の選択で、設定は保存しません。
 *   弱点修飾の mode: "rateMultiplier"(弱点の有効度 × 値) / "excessScale"(1 + (有効度 - 1) × 値)。どちらを使うかはカードの設計(未確定)が決める。値1は中立。
 *   異なるmodeが同時に有効なときは合成せず中立にして衝突として記録します。
 *
 * 【状態(status)】期間つきの修飾の束。戦闘時計(ProjectRCardDeck.updateCooldown)で進み、戦闘終了・マップ移動・ロードで消え、セーブしません。
 *   同じ状態の再付与の規則も未確定(reapply = "uncommitted" 既定: 既存を変えず衝突として記録 / "refresh" / "replace" / "stack")。
 *
 * API: ProjectRDamageModifiers
 *   add({ id, kind:"damageTaken"|"weakness", target, value, mode?, source? }) / remove(id) / clear() / list()
 *     target: キー("player" | "ally:2" | "event:5") または "party"(主人公+仲間) / "enemies"(敵Event) / "any"
 *   setPolicy(p) / getPolicy() / setReapplyPolicy(p) / getReapplyPolicy()
 *   factorFor(targetKey, kind?) -> { factor, count, ids, conflict }       中立=1
 *   weaknessAdjust(rate, targetKeyOrBattler) -> number                    弱点(>1)のときだけ変える。ProjectR_Elements から呼ばれる
 *   keyOfBattler(battler) / keyOfEvent(eventId)
 *   status.apply({ id, target, seconds, source?, modifiers:[{kind,value,mode?}], tags? }) / status.remove(id,target?) / status.has(id,target?) / status.list()
 *   getConflicts() / clearConflicts() / setTracing(on) / getTrace() / clearTrace()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const ENGINE = "Hendrix_Action_Engine";
    const KINDS = Object.freeze(["damageTaken", "weakness"]);
    const WEAKNESS_MODES = Object.freeze(["rateMultiplier", "excessScale"]);
    const POLICIES = Object.freeze(["uncommitted", "multiplicative", "additive"]);
    const REAPPLY = Object.freeze(["uncommitted", "refresh", "replace", "stack"]);
    const modifiers = new Map(); // id -> { id, kind, target, value, mode, source, order }
    const statuses = []; // { id, target, remaining, modifierIds, source, tags, serial }
    const conflicts = [];
    const trace = [];
    const LIMIT = 200;
    let policy = "uncommitted", reapply = "uncommitted", tracing = false, order = 0, statusSerial = 0;
    const note = (list, entry) => { list.push(entry); if (list.length > LIMIT) list.shift(); };
    const finite = value => typeof value === "number" && Number.isFinite(value);
    const currentMap = () => (typeof $gameMap !== "undefined" ? $gameMap : null);

    // ---- 対象キー ----
    const leader = () => (typeof $gameParty !== "undefined" ? $gameParty?.leader?.() : null);
    const keyOfActor = actor => {
        if (!actor) return null;
        const head = leader();
        if (actor === head) return "player";
        const id = typeof actor.actorId === "function" ? actor.actorId() : null;
        return Number.isInteger(id) && id > 0 ? "ally:" + id : null;
    };
    const keyOfEvent = eventId => {
        const map = currentMap();
        const event = map ? map.event(Number(eventId)) : null;
        if (!event) return null;
        if (event.linkedActorId) return "ally:" + event.linkedActorId;
        return "event:" + Number(eventId);
    };
    const keyOfBattler = battler => {
        if (!battler) return null;
        if (typeof battler.isActor === "function" && battler.isActor()) return keyOfActor(battler);
        const map = currentMap();
        if (!map || typeof SgetBattlerForH !== "function") return null;
        for (const event of map.events()) {
            if (!event || event._erased) continue;
            let candidate = null;
            try { candidate = SgetBattlerForH(event); } catch (_error) { candidate = null; }
            if (candidate === battler) return "event:" + event.eventId();
        }
        return null;
    };
    const isPartyKey = key => key === "player" || /^ally:\d+$/.test(key || "");
    const matches = (spec, key) => {
        if (!key) return false;
        if (spec === "any") return true;
        if (spec === "party") return isPartyKey(key);
        if (spec === "enemies") return key.indexOf("event:") === 0;
        return spec === key;
    };

    // ---- 登録 ----
    const add = (source = {}) => {
        const id = String(source.id ?? "").trim();
        if (!id) return { ok: false, reason: "invalidId" };
        if (KINDS.indexOf(source.kind) < 0) return { ok: false, reason: "invalidKind" };
        if (!finite(source.value) || source.value < 0 || source.value > 100) return { ok: false, reason: "invalidValue" };
        const target = String(source.target ?? "").trim();
        if (!target || !(["any", "party", "enemies"].indexOf(target) >= 0 || /^(player|ally:\d+|event:\d+)$/.test(target))) return { ok: false, reason: "invalidTarget" };
        let mode = null;
        if (source.kind === "weakness") {
            mode = source.mode;
            if (WEAKNESS_MODES.indexOf(mode) < 0) return { ok: false, reason: "invalidMode" };
        }
        modifiers.set(id, { id, kind: source.kind, target, value: source.value, mode, source: String(source.source ?? ""), order: modifiers.has(id) ? modifiers.get(id).order : ++order });
        return { ok: true };
    };
    const remove = id => modifiers.delete(String(id));
    const clear = () => { const had = modifiers.size > 0 || statuses.length > 0; modifiers.clear(); statuses.length = 0; return had; };
    const list = () => [...modifiers.values()].sort((a, b) => a.order - b.order).map(m => ({ id: m.id, kind: m.kind, target: m.target, value: m.value, mode: m.mode, source: m.source }));
    const hasAny = () => modifiers.size > 0;
    const hasWeakness = () => { for (const m of modifiers.values()) if (m.kind === "weakness") return true; return false; };

    // ---- 合成 ----
    const applicable = (key, kind) => [...modifiers.values()].filter(m => m.kind === kind && matches(m.target, key)).sort((a, b) => a.order - b.order);
    const combineValues = (values, p) => {
        if (p === "additive") return 1 + values.reduce((sum, v) => sum + (v - 1), 0);
        return values.reduce((product, v) => product * v, 1);
    };
    const conflict = (key, kind, ids, reason) => { note(conflicts, { key, kind, ids: ids.slice(), reason, policy }); };
    const factorFor = (targetKey, kind = "damageTaken") => {
        const found = applicable(targetKey, kind);
        if (!found.length) return { factor: 1, count: 0, ids: [], conflict: false };
        const ids = found.map(m => m.id);
        if (found.length === 1) return { factor: found[0].value, count: 1, ids, conflict: false };
        if (policy === "uncommitted") { conflict(targetKey, kind, ids, "stackingPolicyUncommitted"); return { factor: 1, count: found.length, ids, conflict: true }; }
        return { factor: combineValues(found.map(m => m.value), policy), count: found.length, ids, conflict: false };
    };
    // 弱点(有効度 > 1)のときだけ変える。等倍・耐性・無効・吸収は変えない。
    const weaknessAdjust = (rate, target) => {
        if (!hasWeakness() || !(rate > 1)) return rate;
        const key = typeof target === "string" ? target : keyOfBattler(target);
        const found = applicable(key, "weakness");
        if (!found.length) return rate;
        const ids = found.map(m => m.id);
        const modes = [...new Set(found.map(m => m.mode))];
        let result = rate;
        if (modes.length > 1) { conflict(key, "weakness", ids, "mixedModes"); return rate; }
        let value;
        if (found.length === 1) value = found[0].value;
        else if (policy === "uncommitted") { conflict(key, "weakness", ids, "stackingPolicyUncommitted"); return rate; }
        else value = combineValues(found.map(m => m.value), policy);
        result = modes[0] === "excessScale" ? 1 + (rate - 1) * value : rate * value;
        if (tracing) note(trace, { type: "weakness", key, ids, mode: modes[0], rate, adjusted: result });
        return result;
    };

    // ---- 状態(期間つきの修飾の束) ----
    const statusMatch = (s, id, target) => s.id === id && (target === undefined || s.target === target);
    const dropStatus = s => { for (const mid of s.modifierIds) modifiers.delete(mid); statuses.splice(statuses.indexOf(s), 1); };
    const statusApply = (source = {}) => {
        const id = String(source.id ?? "").trim(), target = String(source.target ?? "").trim();
        const seconds = Number(source.seconds);
        if (!id || !target || !(seconds > 0) || !Array.isArray(source.modifiers) || !source.modifiers.length) return { ok: false, reason: "invalidStatus" };
        const existing = statuses.filter(s => statusMatch(s, id, target));
        if (existing.length && reapply !== "stack") {
            if (reapply === "uncommitted") { note(conflicts, { key: target, kind: "status", ids: [id], reason: "reapplyPolicyUncommitted", policy: reapply }); return { ok: true, applied: false, reason: "reapplyUncommitted" }; }
            if (reapply === "refresh") { for (const s of existing) s.remaining = seconds; return { ok: true, applied: true, refreshed: true }; }
            if (reapply === "replace") for (const s of existing) dropStatus(s);
        }
        const serial = ++statusSerial, modifierIds = [];
        for (let i = 0; i < source.modifiers.length; i++) {
            const m = source.modifiers[i], mid = `status:${id}:${target}:${serial}:${i}`;
            const result = add({ id: mid, kind: m.kind, target, value: m.value, mode: m.mode, source: "status:" + id });
            if (!result.ok) { for (const done of modifierIds) modifiers.delete(done); return { ok: false, reason: result.reason, detail: i }; }
            modifierIds.push(mid);
        }
        statuses.push({ id, target, remaining: seconds, modifierIds, source: String(source.source ?? ""), tags: Array.isArray(source.tags) ? source.tags.slice() : [], serial });
        return { ok: true, applied: true };
    };
    const statusRemove = (id, target) => { let n = 0; for (const s of statuses.filter(x => statusMatch(x, String(id), target))) { dropStatus(s); n++; } return n; };
    const statusTick = seconds => {
        if (!statuses.length || !(seconds > 0)) return;
        const map = currentMap();
        for (const s of statuses.slice()) {
            s.remaining -= seconds;
            const eventGone = s.target.indexOf("event:") === 0 && map && (() => { const e = map.event(Number(s.target.slice(6))); return !e || e._erased; })();
            if (s.remaining <= 1e-8 || eventGone) dropStatus(s);
        }
    };

    // ---- Hendrixの「HPを減らす」呼び出しへ、1回だけ掛ける ----
    const isDamageValue = value => typeof value === "string" && /^\s*-/.test(value);
    const scaled = (value, factor) => "-Math.round(-(" + value.trim() + ")*" + factor + ")"; // 負(ダメージ)の式を、四捨五入して負のまま返す
    const resolveEventKey = (args, interpreter) => {
        const raw = args?.eventId;
        if (raw === "player") return "player";
        const id = raw === "this" ? interpreter?._eventId : Number(raw);
        return Number.isInteger(id) && id > 0 ? keyOfEvent(id) : null;
    };
    const resolveActorForPlayerHp = (args, interpreter) => {
        const target = args?.target;
        if (!target || target === "player") return leader();
        if (target === "self") {
            const event = currentMap()?.event(interpreter?._eventId);
            const match = event?.event?.()?.note?.match?.(/<hp:\s*actor,\s*(\d+)>/i);
            return match ? $gameActors.actor(Number(match[1])) : null;
        }
        const actorId = parseInt(target, 10);
        if (!isNaN(actorId)) return $gameActors.actor(actorId);
        return $gameActors._data.find(actor => actor && actor._name === target) || null;
    };
    // 対象のHP変更(gainHp)を、この呼び出しの間だけ包み、最初のダメージ(負)に1回だけ係数を掛ける。
    const scaleOnce = (actor, factor, record) => {
        if (!actor || typeof actor.gainHp !== "function") return () => {};
        const own = Object.prototype.hasOwnProperty.call(actor, "gainHp");
        const previous = actor.gainHp;
        let done = false;
        actor.gainHp = function(value) {
            if (!done && finite(value) && value < 0) { done = true; record.after = -Math.round(-value * factor); return previous.call(this, record.after); }
            return previous.call(this, value);
        };
        return () => { if (own) actor.gainHp = previous; else delete actor.gainHp; };
    };
    const wrap = () => {
        if (typeof PluginManager === "undefined" || !PluginManager._commands) return false;
        let installed = false;
        const eventKey = `${ENGINE}:UpdateEventHp`;
        const eventOriginal = PluginManager._commands[eventKey];
        if (typeof eventOriginal === "function" && !eventOriginal.__projectRDamageModifiers) {
            const wrapped = function(args) {
                if (!hasAny() || !isDamageValue(String(args?.value ?? ""))) return eventOriginal.apply(this, arguments);
                const key = resolveEventKey(args, this);
                const info = key ? factorFor(key, "damageTaken") : { factor: 1 };
                if (!key || info.factor === 1) return eventOriginal.apply(this, arguments);
                const record = { type: "damage", key, factor: info.factor, ids: info.ids, source: String(args.projectRSource ?? args.projectRAttackId ?? ""), value: String(args.value) };
                if (tracing) note(trace, record);
                if (key.indexOf("event:") === 0) { // 敵などのEvent: 値の式に1回だけ掛ける(HPバー経由の計算の前)
                    return eventOriginal.call(this, Object.assign({}, args, { value: scaled(String(args.value), info.factor) }));
                }
                // 主人公・仲間(Actor): gainHp に1回だけ
                const actor = key === "player" ? leader() : $gameActors.actor(Number(key.slice(5)));
                const restore = scaleOnce(actor, info.factor, record);
                try { return eventOriginal.apply(this, arguments); } finally { restore(); }
            };
            wrapped.__projectRDamageModifiers = true;
            PluginManager._commands[eventKey] = wrapped;
            installed = true;
        }
        const playerKey = `${ENGINE}:UpdatePlayerHp`;
        const playerOriginal = PluginManager._commands[playerKey];
        if (typeof playerOriginal === "function" && !playerOriginal.__projectRDamageModifiers) {
            const wrapped = function(args) {
                if (!hasAny()) return playerOriginal.apply(this, arguments);
                const actor = resolveActorForPlayerHp(args, this), key = keyOfActor(actor);
                const info = key ? factorFor(key, "damageTaken") : { factor: 1 };
                if (!key || info.factor === 1) return playerOriginal.apply(this, arguments);
                const record = { type: "damage", key, factor: info.factor, ids: info.ids, source: "UpdatePlayerHp", value: String(args?.value ?? "") };
                if (tracing) note(trace, record);
                const restore = scaleOnce(actor, info.factor, record);
                try { return playerOriginal.apply(this, arguments); } finally { restore(); }
            };
            wrapped.__projectRDamageModifiers = true;
            PluginManager._commands[playerKey] = wrapped;
            installed = true;
        }
        return installed;
    };
    const installed = wrap();

    // ---- 戦闘時計・後片付け(実行時のみ・セーブしない) ----
    const deck = root.ProjectRCardDeck;
    if (deck && typeof deck.updateCooldown === "function") {
        const _tick = deck.updateCooldown;
        deck.updateCooldown = function(seconds) { const result = _tick.apply(this, arguments); statusTick(Number(seconds)); return result; };
    }
    if (deck && typeof deck.endBattle === "function") {
        const _end = deck.endBattle;
        deck.endBattle = function() { clear(); return _end.apply(this, arguments); };
    }
    if (typeof Game_Map !== "undefined" && Game_Map.prototype.setup) {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clear(); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined" && DataManager.extractSaveContents) {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { clear(); return _extract.apply(this, arguments); };
    }

    root.ProjectRDamageModifiers = Object.freeze({
        KINDS, WEAKNESS_MODES, POLICIES, REAPPLY_POLICIES: REAPPLY,
        add, remove, clear, list, hasAny, hasWeakness,
        setPolicy: p => { if (POLICIES.indexOf(p) < 0) return false; policy = p; return true; }, getPolicy: () => policy,
        setReapplyPolicy: p => { if (REAPPLY.indexOf(p) < 0) return false; reapply = p; return true; }, getReapplyPolicy: () => reapply,
        factorFor, weaknessAdjust, keyOfBattler, keyOfEvent, keyOfActor, matches,
        status: Object.freeze({
            apply: statusApply, remove: statusRemove, has: (id, target) => statuses.some(s => statusMatch(s, String(id), target)),
            list: () => statuses.map(s => ({ id: s.id, target: s.target, remaining: s.remaining, source: s.source, tags: s.tags.slice(), modifierIds: s.modifierIds.slice() })),
            tick: statusTick
        }),
        getConflicts: () => conflicts.map(c => ({ ...c })), clearConflicts: () => { conflicts.length = 0; },
        setTracing: on => { tracing = !!on; }, getTrace: () => trace.map(t => ({ ...t })), clearTrace: () => { trace.length = 0; },
        isInstalled: () => installed || !!PluginManager?._commands?.[`${ENGINE}:UpdateEventHp`]?.__projectRDamageModifiers
    });
})();
