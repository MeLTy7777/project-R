/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 仲間（Ally）戦闘フレームワーク（定義レジストリ・HP/ダウン・自動AIの意思決定）。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardDeckCore
 *
 * @help
 * ProjectR_PartyCombat.js
 *
 * 決まっている戦闘ルールの枠組みです。具体的な仲間キャラ・最終AIスキルは未設計のため、
 * このプラグインは「データで定義できる器」と「自動で動く判断ロジック」だけを提供します。
 * 製品用の仲間は0人です（Combat Test Arenaのfixtureでのみ動作確認します）。
 *
 * ルール:
 *   ・戦闘は 主人公 + 最大2人の仲間。
 *   ・仲間は自動で移動・攻撃する（このプラグインが「何をするか」を決める）。
 *   ・仲間にはHPがある。HP0でその戦闘の残りの間ダウン（復活しない）。
 *   ・主人公のHP0は敗北/リトライ（ProjectR_BossFramework / ProjectR_PlayerDeathの担当）。
 *   ・仲間は主人公の30枚デッキを使わない。指輪を持つ仲間だけ、その指輪のAIスキル集を得る。
 *   ・指輪の所持・譲渡のルールは ProjectR_CardDeckCore が持ちます（1人1つ・対象限定）。
 *
 * 仲間の定義（registerAlly）:
 *   {
 *     actorId, name, maxHp,
 *     style: "melee"|"ranged"|"support",
 *     preferredRange (好む距離 tile), engageRange (これ以内に敵がいれば戦う),
 *     targetPreference: "nearest"|"lowestHp"|"highestHp",
 *     normalAttack: { id, range, cooldownSeconds },
 *     ringSkills: { <ringId>: [ { id, range, cooldownSeconds, target: "enemy"|"allyLowestHp"|"self" } ] }
 *   }
 *   ringSkills は指輪ごと。仲間がその指輪を持っているときだけ使います（持っていなければ使いません）。
 *
 * 実行の接続:
 *   setExecutor(fn)   fn(intent) が { ok:true } を返したときだけCooldownを開始する。
 *   intent: { type:"move"|"attack"|"ringSkill", actorId, skillId?, ringId?, targetId?, x?, y? }
 *   executorが未設定なら intentは「記録だけ」（ダメージ・移動は起こさない）。
 *
 * API: ProjectRPartyCombat
 *   registerAlly(def) / unregisterAlly(actorId) / allyDefinition(actorId) / allyDefinitions()
 *   startSession(actorIds, options?) -> { ok, reason, members }   最大2人。重複・未定義は拒否。
 *   endSession() / isActive() / members()                          snapshot（HP・ダウン・Cooldown）
 *   damageAlly(actorId, amount) / healAlly(actorId, amount)
 *   tick(seconds, world) -> intents     world: { player:{x,y}, enemies:[{id,x,y,hp,alive}], positions?:{ <actorId>:{x,y} } }
 *   setPosition(actorId, x, y)          仲間の現在位置（移動の実装が更新する。未指定なら主人公と同じ位置）
 *   availableRingSkills(actorId)       指輪を持つ場合だけの配列
 *   allDown() / downCount()  onAllyDown(fn) -> 登録解除関数（ダウンした瞬間に通知。ボス戦のHUD/演出用）
 * 戦闘状態はセーブされません。endCardBattle・マップ移動・ロードで破棄します。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const MAX_ALLIES = 2;
    const deck = () => root.ProjectRCardDeck || null;
    const num = (value, fallback, min = -Infinity) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(min, n) : fallback;
    };

    const definitions = new Map();
    let session = null;
    let executor = null;
    let intentLog = [];
    const downListeners = new Set();

    const normalizeSkill = source => source && typeof source.id === "string" && source.id ? Object.freeze({
        id: source.id, range: num(source.range, 1, 0), cooldownSeconds: num(source.cooldownSeconds, 1, 0),
        target: source.target === "allyLowestHp" || source.target === "self" ? source.target : "enemy"
    }) : null;

    const registerAlly = source => {
        const actorId = Number.parseInt(source?.actorId, 10);
        if (!Number.isInteger(actorId) || actorId <= 0) return { ok: false, reason: "invalidActorId" };
        const normal = normalizeSkill(source.normalAttack);
        if (!normal) return { ok: false, reason: "normalAttackRequired" };
        const ringSkills = {};
        for (const [ringId, list] of Object.entries(source.ringSkills || {})) {
            ringSkills[ringId] = Object.freeze((Array.isArray(list) ? list : []).map(normalizeSkill).filter(Boolean));
        }
        definitions.set(actorId, Object.freeze({
            actorId, name: typeof source.name === "string" ? source.name : "",
            maxHp: Math.max(1, Math.floor(num(source.maxHp, 100, 1))),
            style: ["melee", "ranged", "support"].includes(source.style) ? source.style : "melee",
            preferredRange: num(source.preferredRange, 1.5, 0), engageRange: num(source.engageRange, 8, 0),
            targetPreference: ["nearest", "lowestHp", "highestHp"].includes(source.targetPreference) ? source.targetPreference : "nearest",
            normalAttack: normal, ringSkills: Object.freeze(ringSkills)
        }));
        return { ok: true, actorId };
    };
    const unregisterAlly = actorId => definitions.delete(Number.parseInt(actorId, 10));

    // 仲間が今使えるAIスキル集 = 持っている指輪のぶんだけ。
    const availableRingSkills = actorId => {
        const def = definitions.get(Number.parseInt(actorId, 10));
        const core = deck();
        if (!def || !core) return [];
        const skills = [];
        for (const [ringId, list] of Object.entries(def.ringSkills)) {
            if (core.getRingOwner(ringId) === `actor:${def.actorId}`) skills.push(...list.map(s => ({ ...s, ringId })));
        }
        return skills;
    };

    const startSession = (actorIds, options = {}) => {
        const ids = [...new Set((actorIds || []).map(id => Number.parseInt(id, 10)))];
        if (ids.length > MAX_ALLIES) return { ok: false, reason: "tooManyAllies", max: MAX_ALLIES };
        for (const id of ids) if (!definitions.has(id)) return { ok: false, reason: "allyNotDefined", actorId: id };
        session = {
            members: new Map(ids.map(id => {
                const def = definitions.get(id);
                const hp = Math.min(def.maxHp, Math.max(1, Math.floor(num(options.hp?.[id], def.maxHp, 1))));
                return [id, { actorId: id, hp, maxHp: def.maxHp, down: false, cooldowns: {}, x: null, y: null }];
            }))
        };
        intentLog = [];
        return { ok: true, members: members() };
    };
    const endSession = () => { session = null; intentLog = []; };
    const isActive = () => !!session;
    const members = () => session ? [...session.members.values()].map(m => ({ ...m, cooldowns: { ...m.cooldowns } })) : [];
    const downCount = () => session ? [...session.members.values()].filter(m => m.down).length : 0;
    const allDown = () => !!session && session.members.size > 0 && downCount() === session.members.size;

    const damageAlly = (actorId, amount) => {
        const m = session?.members.get(Number.parseInt(actorId, 10));
        if (!m) return { ok: false, reason: "notInParty" };
        if (!(Number(amount) > 0)) return { ok: false, reason: "invalidDamage" };
        if (m.down) return { ok: false, reason: "alreadyDown" };
        m.hp = Math.max(0, m.hp - Number(amount));
        if (m.hp <= 0) {
            m.down = true; // その戦闘の残りの間ダウン。
            for (const listener of [...downListeners]) {
                try { listener({ actorId: m.actorId }); } catch (_error) { /* 通知先の例外で戦闘を止めない */ }
            }
        }
        return { ok: true, hp: m.hp, down: m.down };
    };
    const healAlly = (actorId, amount) => {
        const m = session?.members.get(Number.parseInt(actorId, 10));
        if (!m) return { ok: false, reason: "notInParty" };
        if (m.down) return { ok: false, reason: "down" }; // ダウンは回復で復帰しない。
        if (!(Number(amount) > 0)) return { ok: false, reason: "invalidHeal" };
        m.hp = Math.min(m.maxHp, m.hp + Number(amount));
        return { ok: true, hp: m.hp };
    };

    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const pickTarget = (def, from, enemies) => {
        const alive = (enemies || []).filter(e => e && e.alive !== false && (e.hp == null || e.hp > 0));
        const near = alive.filter(e => distance(from, e) <= def.engageRange);
        if (!near.length) return null;
        const sorter = {
            nearest: (a, b) => distance(from, a) - distance(from, b),
            lowestHp: (a, b) => (a.hp ?? Infinity) - (b.hp ?? Infinity),
            highestHp: (a, b) => (b.hp ?? -Infinity) - (a.hp ?? -Infinity)
        }[def.targetPreference];
        return near.sort(sorter)[0];
    };
    const ready = (m, key) => (m.cooldowns[key] || 0) <= 0;

    // 1フレーム/一定間隔ごとの意思決定。Cooldownはここで進め、実行成功時に開始する。
    const tick = (seconds, world = {}) => {
        if (!session) return [];
        const dt = num(seconds, 0, 0);
        const intents = [];
        for (const m of session.members.values()) {
            for (const key of Object.keys(m.cooldowns)) m.cooldowns[key] = Math.max(0, m.cooldowns[key] - dt);
            if (m.down) continue;
            const def = definitions.get(m.actorId);
            const player = world.player || { x: 0, y: 0 };
            // 仲間の位置は外部(移動の実装)が world.positions[actorId] か setPosition で渡す。無ければ主人公と同じ位置。
            const where = world.positions?.[m.actorId];
            const self = { x: where?.x ?? m.x ?? player.x, y: where?.y ?? m.y ?? player.y };
            const target = pickTarget(def, self, world.enemies);
            const skills = availableRingSkills(m.actorId);
            let intent = null;
            // 1) 指輪のAIスキル（使えるもの）。2) 通常攻撃。3) 距離を保つ移動。
            const supportSkill = skills.find(s => s.target !== "enemy" && ready(m, s.id));
            if (supportSkill) {
                const hurt = [...session.members.values()].filter(o => !o.down && o.hp < o.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
                if (supportSkill.target === "self" || hurt) {
                    intent = { type: "ringSkill", actorId: m.actorId, skillId: supportSkill.id, ringId: supportSkill.ringId, cooldown: supportSkill.cooldownSeconds,
                        targetActorId: supportSkill.target === "self" ? m.actorId : hurt.actorId };
                }
            }
            if (!intent && target) {
                const d = distance(self, target);
                const ringSkill = skills.find(s => s.target === "enemy" && ready(m, s.id) && d <= s.range);
                if (ringSkill) {
                    intent = { type: "ringSkill", actorId: m.actorId, skillId: ringSkill.id, ringId: ringSkill.ringId, targetId: target.id, cooldown: ringSkill.cooldownSeconds };
                } else if (ready(m, def.normalAttack.id) && d <= def.normalAttack.range) {
                    intent = { type: "attack", actorId: m.actorId, skillId: def.normalAttack.id, targetId: target.id, cooldown: def.normalAttack.cooldownSeconds };
                } else if (Math.abs(d - def.preferredRange) > 0.25) {
                    intent = { type: "move", actorId: m.actorId, targetId: target.id, x: target.x, y: target.y, approach: d > def.preferredRange };
                }
            } else if (!intent && distance(self, player) > 2.5) {
                intent = { type: "move", actorId: m.actorId, x: player.x, y: player.y, approach: true, follow: true };
            }
            if (!intent) continue;
            let ok = true;
            if (executor) {
                try { ok = executor(Object.freeze({ ...intent }))?.ok === true; } catch (_error) { ok = false; }
            }
            if (ok && intent.cooldown != null) m.cooldowns[intent.skillId] = intent.cooldown;
            intents.push(intent);
            intentLog.push(intent);
        }
        return intents;
    };

    const clear = () => endSession();
    const core = deck();
    if (core) {
        const _endBattle = core.endBattle;
        core.endBattle = function() { clear(); return _endBattle.apply(this, arguments); };
    }
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clear(); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined" && DataManager.extractSaveContents) {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { clear(); return _extract.apply(this, arguments); };
    }

    root.ProjectRPartyCombat = {
        MAX_ALLIES, registerAlly, unregisterAlly,
        allyDefinition: actorId => definitions.get(Number.parseInt(actorId, 10)) || null,
        allyDefinitions: () => [...definitions.values()],
        setExecutor: fn => { executor = typeof fn === "function" ? fn : null; return !!executor || fn == null; },
        startSession, endSession, isActive, members, damageAlly, healAlly, tick, availableRingSkills,
        onAllyDown: fn => { downListeners.add(fn); return () => downListeners.delete(fn); },
        setPosition: (actorId, x, y) => { const m = session?.members.get(Number.parseInt(actorId, 10)); if (m) { m.x = num(x, null); m.y = num(y, null); } return !!m; },
        allDown, downCount, getIntentLog: () => intentLog.map(i => ({ ...i })),
        usesPlayerDeck: false
    };
})();
