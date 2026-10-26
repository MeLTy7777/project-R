/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR ボス戦の枠組み（HP・フェーズ・開始時デッキ検証・敗北/リトライ・Divine HP攻撃窓口）。
 * @author ProjectR
 * @base ProjectR_CombatSession
 * @base ProjectR_UltimateGodDamageBridge
 * @orderAfter ProjectR_CombatSession
 * @orderAfter ProjectR_UltimateGodDamageBridge
 *
 * @command StartBossBattle
 * @text ボス戦を開始する
 * @desc 登録済みのボスで戦闘を始めます。デッキが条件を満たさないと開始せず、理由を表示します（デッキは書き換えません）。
 * @arg bossId
 * @text Boss ID
 * @type string
 * @arg resultSwitchId
 * @text 結果を入れるスイッチ（0=使わない）
 * @type switch
 * @default 0
 *
 * @command EndBossBattle
 * @text ボス戦を終了する
 * @arg bossId
 * @text Boss ID
 * @type string
 *
 * @help
 * ProjectR_BossFramework.js
 *
 * 再利用できるボス戦の枠組みです。具体的なストーリーボス・最終攻撃パターンは未設計のため
 * 含みません（Combat Test Arenaの DEV ボスだけで動作確認します）。
 *
 * 定義: ProjectRBossFramework.registerBoss({
 *   bossId, name, maxHp,
 *   phases: [ { id: "phase2", label: "第二形態", hpRatio: 0.66 }, { id: "phase3", hpRatio: 0.33 } ],
 *   eventId: 0   // 任意。Hendrix Action Engineの敵Eventに結び付けるとEventのHPを毎フレーム読む
 * })
 *   phasesは「HPの割合がこの値以下になったら入る」。フェーズ1は最初から有効（目標は約3フェーズ）。
 *
 * 開始: start(bossId, options)
 *   ・ProjectR_CardDeckCore の デッキ検証（30枚・所持・コピー上限・指輪）を通らないと開始を拒否します。
 *     拒否したときはプレイヤーに理由を見せ、デッキを自動で直しません。
 *     メニュー →「スキル」で直してから再挑戦します。
 *   ・開始が通ると ProjectR_CombatSession.begin("boss:<id>") を呼び、HUD・カード戦闘・神・Gaugeが有効になります。
 * ダメージ/フェーズ: damage(amount, source?) … HPを減らし、フェーズ境界をまたぐたびに onPhase フックを呼びます。
 *   HP0で勝利（onVictory）して戦闘を終えます。
 * 敗北: 主人公のHP0（ProjectR.PlayerDeath）を検知すると onDefeat を呼んで戦闘を終えます。
 *   retry() で同じボスをもう一度（onRetryフック → 開始）。リトライの内容（HP回復・位置）はゲーム側のフックで行います。
 * 仲間ダウン: onAllyDown（ProjectRPartyCombat）を転送します。
 * Divine HP攻撃窓口（ボスの攻撃がUltimateの神を傷つける）:
 *   bossAttack({ attackId?, kind:"area"|"global", x, y, radius, divineDamage }) → ProjectRUltimateGodDamageBridge。
 *   attackIdが同じ攻撃は1回だけ当たります（Bridgeの保護）。神は通常の標的になりません。
 *
 * API: ProjectRBossFramework
 *   registerBoss / unregisterBoss / bossDefinition
 *   validateEntry() -> { ok, reasons, messages }   start(bossId, opts) / end(reason) / retry()
 *   damage(amount, source?) / setHp(hp) / syncFromEvent()   getState() / getHudState()
 *   onPhase(fn) onVictory(fn) onDefeat(fn) onRetry(fn) onAllyDown(fn)   各 -> 登録解除関数
 *   bossAttack(options)
 * ボス戦の状態はセーブされません。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_BossFramework";
    const session = () => root.ProjectRCombatSession;
    const deck = () => root.ProjectRCardDeck;
    const menu = () => root.ProjectRMenuCore;
    const bridge = () => root.ProjectRUltimateGodDamageBridge;

    const definitions = new Map();
    let state = null; // { bossId, sourceId, name, maxHp, hp, phaseIndex, phases, ended }
    let lastBossId = null;
    const hooks = { phase: new Set(), victory: new Set(), defeat: new Set(), retry: new Set(), allyDown: new Set() };
    let unsubscribeAlly = null;

    const fire = (kind, payload) => {
        for (const hook of [...hooks[kind]]) {
            try { hook(payload); } catch (error) {
                if (typeof console !== "undefined") console.warn(`[${PLUGIN}] ${kind} hook error:`, error);
            }
        }
    };
    const subscribe = kind => fn => { if (typeof fn !== "function") return () => {}; hooks[kind].add(fn); return () => hooks[kind].delete(fn); };

    const registerBoss = source => {
        const bossId = typeof source?.bossId === "string" ? source.bossId : "";
        const maxHp = Number(source?.maxHp);
        if (!bossId || !(maxHp >= 1)) return { ok: false, reason: "invalidBoss" };
        const phases = (Array.isArray(source.phases) ? source.phases : [])
            .filter(p => p && typeof p.id === "string" && Number(p.hpRatio) > 0 && Number(p.hpRatio) < 1)
            .map(p => Object.freeze({ id: p.id, label: typeof p.label === "string" ? p.label : p.id, hpRatio: Number(p.hpRatio) }))
            .sort((a, b) => b.hpRatio - a.hpRatio);
        definitions.set(bossId, Object.freeze({
            bossId, name: typeof source.name === "string" && source.name ? source.name : bossId,
            maxHp: Math.floor(maxHp), phases: Object.freeze(phases), eventId: Number.parseInt(source.eventId, 10) || 0
        }));
        return { ok: true, bossId };
    };

    const validateEntry = () => {
        const reasons = deck()?.getBossBattleStartInvalidReasons?.() || [{ code: "NO_CORE" }];
        return { ok: reasons.length === 0, reasons, messages: menu()?.describeReasons?.(reasons) || [] };
    };

    const phaseCount = () => state ? state.phases.length + 1 : 0;
    const phaseFor = ratio => {
        let index = 0;
        state.phases.forEach((p, i) => { if (ratio <= p.hpRatio) index = i + 1; });
        return index;
    };
    const phaseInfo = index => index === 0
        ? { id: "phase1", label: "第一形態", index: 0 }
        : { ...state.phases[index - 1], index };

    const start = (bossId, options = {}) => {
        const def = definitions.get(bossId);
        if (!def) return { ok: false, reason: "bossNotDefined", reasons: [], messages: [] };
        if (state) return { ok: false, reason: "bossAlreadyActive", reasons: [], messages: [] };
        const sourceId = `boss:${bossId}`;
        // デッキ検証はCoreの結果。不正なら開始せず、デッキを書き換えない。
        const result = session().begin(sourceId, { allies: options.allies, requireValidDeck: true, bossId, partyOptions: options.partyOptions });
        if (!result.ok) return result;
        state = { bossId, sourceId, name: def.name, maxHp: def.maxHp, hp: def.maxHp, phaseIndex: 0, phases: def.phases, eventId: def.eventId };
        lastBossId = bossId;
        const party = root.ProjectRPartyCombat;
        unsubscribeAlly = party?.onAllyDown?.(payload => fire("allyDown", { bossId, ...payload })) || null;
        return { ok: true, reason: null, bossId, sourceId };
    };

    const finish = (reason, fireKind) => {
        if (!state) return false;
        const done = state;
        state = null;
        unsubscribeAlly?.();
        unsubscribeAlly = null;
        session()?.end(done.sourceId, reason);
        if (fireKind) fire(fireKind, { bossId: done.bossId, reason });
        return true;
    };
    const end = (reason = "end") => finish(reason, null);

    const applyHp = (hp, source) => {
        if (!state) return { ok: false, reason: "noBoss" };
        const before = state.hp;
        state.hp = Math.max(0, Math.min(state.maxHp, hp));
        const phases = [];
        if (state.hp > 0) {
            const target = phaseFor(state.hp / state.maxHp);
            while (state.phaseIndex < target) {
                const from = state.phaseIndex++;
                phases.push({ bossId: state.bossId, from, to: state.phaseIndex, phase: phaseInfo(state.phaseIndex), source: source || null });
            }
        }
        for (const payload of phases) fire("phase", payload);
        if (state && state.hp <= 0) finish("victory", "victory");
        return { ok: true, before, hp: before === undefined ? 0 : (state ? state.hp : 0), phaseChanges: phases.length };
    };
    const damage = (amount, source) => {
        if (!state) return { ok: false, reason: "noBoss" };
        if (!(Number(amount) > 0)) return { ok: false, reason: "invalidDamage" };
        return applyHp(state.hp - Number(amount), source);
    };
    const setHp = hp => Number.isFinite(Number(hp)) ? applyHp(Number(hp), "setHp") : { ok: false, reason: "invalidHp" };

    // Hendrixの敵Eventに結び付けた場合: EventのHPを読む（Eventの方が正）。
    const syncFromEvent = () => {
        if (!state || !state.eventId || typeof $gameMap === "undefined") return false;
        const hp = $gameMap.getCurrentEventHp?.(state.eventId);
        const event = $gameMap.event?.(state.eventId);
        if (hp == null || !event) return false;
        const max = Number(event.PRmhp) > 0 ? Number(event.PRmhp) : state.maxHp;
        if (max !== state.maxHp) state.maxHp = max;
        if (hp !== state.hp) applyHp(hp, "event");
        return true;
    };

    const playerIsDead = () => !!root.ProjectR?.PlayerDeath?.isDead?.();
    const update = () => {
        if (!state) return;
        syncFromEvent();
        if (state && playerIsDead()) finish("defeat", "defeat");
    };
    if (typeof Game_Map !== "undefined") {
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            _update.apply(this, arguments);
            if (sceneActive !== false) update();
        };
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { if (state) finish("mapSetup", null); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined" && DataManager.extractSaveContents) {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { state = null; unsubscribeAlly = null; return _extract.apply(this, arguments); };
    }
    // CombatSession側が先に終わった（他の経路）なら、ボス状態も残さない。
    session()?.onEnd?.(payload => { if (state && payload.sourceId === state.sourceId) { state = null; unsubscribeAlly?.(); unsubscribeAlly = null; } });

    const retry = () => {
        const bossId = state?.bossId || lastBossId;
        if (!bossId) return { ok: false, reason: "noBossToRetry" };
        if (state) finish("retry", null);
        fire("retry", { bossId });
        return start(bossId, {});
    };

    // ボスの攻撃がUltimateの神のDivine HPを傷つける窓口。通常の標的にはしない。
    const bossAttack = options => {
        const b = bridge();
        if (!b) return { ok: false, reason: "bridgeUnavailable" };
        const o = options || {};
        const attackId = typeof o.attackId === "string" && o.attackId ? o.attackId
            : b.createAttackId(`boss-${state?.bossId || "attack"}`);
        const source = `boss:${state?.bossId || "unknown"}`;
        const result = o.kind === "global"
            ? b.damagePersistentUltimateFromGlobalAttack({ attackId, amount: o.divineDamage, source })
            : b.damagePersistentUltimateInArea({ attackId, x: o.x, y: o.y, radius: o.radius, amount: o.divineDamage, source });
        return { ...result, attackId };
    };

    const getState = () => state ? { bossId: state.bossId, name: state.name, hp: state.hp, maxHp: state.maxHp,
        phaseIndex: state.phaseIndex, phase: phaseInfo(state.phaseIndex), phaseCount: phaseCount() } : null;
    const getHudState = () => {
        const s = getState();
        return s ? { name: s.name, hp: s.hp, maxHp: s.maxHp, ratio: s.maxHp > 0 ? s.hp / s.maxHp : 0,
            phaseLabel: s.phase.label, phaseIndex: s.phaseIndex, phaseCount: s.phaseCount } : null;
    };

    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        PluginManager.registerCommand(PLUGIN, "StartBossBattle", function(args) {
            const result = start(String(args.bossId || ""));
            const switchId = Number.parseInt(args.resultSwitchId, 10);
            if (switchId > 0 && typeof $gameSwitches !== "undefined") $gameSwitches.setValue(switchId, result.ok);
            if (!result.ok && result.reason === "invalidDeck") session().announceInvalidDeck(this, result.messages);
        });
        PluginManager.registerCommand(PLUGIN, "EndBossBattle", () => { end("event"); });
    }

    root.ProjectRBossFramework = {
        registerBoss, unregisterBoss: bossId => definitions.delete(bossId),
        bossDefinition: bossId => definitions.get(bossId) || null,
        validateEntry, start, end, retry, damage, setHp, syncFromEvent, bossAttack,
        getState, getHudState, isActive: () => !!state,
        onPhase: subscribe("phase"), onVictory: subscribe("victory"), onDefeat: subscribe("defeat"),
        onRetry: subscribe("retry"), onAllyDown: subscribe("allyDown"),
        update
    };
})();
