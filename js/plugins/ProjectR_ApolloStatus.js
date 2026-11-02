/*:
 * @target MZ
 * @plugindesc v1.0.0 Apollo共通の状態台帳(Phase Apollo-A7): 弱点状態・傷・病などを、対象ごとに1つの被ダメージ倍率/弱点修飾/攻撃力倍率/継続ダメージへまとめて持つ。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_DamageModifiers
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_DamageModifiers
 * @orderAfter ProjectR_KillAttribution
 *
 * @help
 * ProjectR_ApolloStatus.js
 *
 * ギガース殺し(弱点・傷)・疫病の矢(病)・竪琴(病)・月桂冠・ヒュアキントスが共有する「期間つきの状態」の台帳です。
 * 実行時のみ(セーブしない)。戦闘終了・マップ移動・ロードですべて消えます。時間は ProjectRCardDeck.updateCooldown と同じ戦闘時計で進みます。
 *
 * 【なぜ台帳が必要か】ProjectR_DamageModifiers の「重ねがけの規則」は未確定(2つ以上重なると中立)です。弱点(x2)と傷(+10%)と病(+5%)が
 *   同じ敵に重なっても中立にならないよう、この台帳が「対象ごと・種類ごとに、有効な状態の積を1つだけ」DamageModifiers に登録します
 *   (DamageModifiers 側の規則・既定は変えません)。積(乗算)は仮の規則です(監査文書 §10 A5 は未確定のまま)。
 *
 * 【状態の仕様】apply(target, id, spec)
 *   spec = { seconds, damageTaken?, weakness?, weaknessMode?("rateMultiplier"=既定 / "excessScale"), attackRate?, dot?: { perSecond, tickSeconds?, source?, element?, weaknessMultiplier? }, source?, tags? }
 *   ・damageTaken: 被ダメージ倍率(1=中立)。ダメージ(HPを減らす呼び出し)1回につき1回だけ掛かる(DamageModifiers 経由)。
 *   ・weakness: 弱点(属性有効度>1)のときの修飾。weaknessMode が rateMultiplier(既定)なら「有効度 x 値」(病の+3% = 1.03)、excessScale なら「1 + (有効度 - 1) x 値」(月桂冠の増分-90% = 0.1)。1=中立。
 *   ・attackRate: 攻撃力・魔力(param 2・4)の倍率(敵Eventのバトラーと、主人公("player")。竪琴の火力の音符・病用)。基礎ステータスは書き換えず、paramRateの外側で掛ける。
 *   ・dot: 継続ダメージ(敵Eventだけ)。tickSeconds(既定1秒)ごとに perSecond x tickSeconds を固定ダメージで与える。
 *   同じ対象・同じidの再付与は「持続時間の更新(上書き)」で、重ねません。別idの状態は並立して、倍率は積。
 *
 * API: ProjectRApolloStatus
 *   apply(target, id, spec) -> { ok, refreshed? } / remove(target, id) / has(target, id) / list(target?) / clear(reason)
 *   factorOf(target) -> { damageTaken, weakness, weaknessMode, attackRate }   target は "event:<id>" | "player" | "ally:<id>"
 *   targetKeyOfEvent(eventId)  tick(seconds)  getLog()  setReapplyRefresh は無い(常に更新)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    if (!deck) return;
    const ENGINE = "Hendrix_Action_Engine";
    const EPSILON = 1e-8;
    const states = new Map(); // targetKey -> Map(id -> entry)
    const log = [];
    const LOG_LIMIT = 80;
    const note = entry => { log.push(entry); if (log.length > LOG_LIMIT) log.shift(); };
    const modifiers = () => root.ProjectRDamageModifiers;
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const finite = v => typeof v === "number" && Number.isFinite(v);
    const eventOf = key => { const m = map(); return m && key.indexOf("event:") === 0 ? m.event(Number(key.slice(6))) : null; };
    const battlerOf = key => { if (key === "player") return typeof $gameParty !== "undefined" ? $gameParty.leader() : null; const e = eventOf(key); try { return e && typeof SgetBattlerForH === "function" ? SgetBattlerForH(e) : null; } catch (_error) { return null; } };
    const attackRates = typeof WeakMap !== "undefined" ? new WeakMap() : null; // battler -> rate

    const valid = target => /^(player|ally:\d+|event:\d+)$/.test(String(target || ""));
    const factorOf = target => {
        const m = states.get(target);
        const out = { damageTaken: 1, weakness: 1, weaknessMode: "rateMultiplier", attackRate: 1 };
        if (!m) return out;
        const byMode = new Map(); // 弱点修飾のmode別の積(同じ対象に別modeが重なったときは、先に付いた状態のmodeだけを使う)
        for (const e of m.values()) {
            if (finite(e.spec.damageTaken)) out.damageTaken *= e.spec.damageTaken;
            if (finite(e.spec.weakness)) { const mode = e.spec.weaknessMode === "excessScale" ? "excessScale" : "rateMultiplier"; byMode.set(mode, (byMode.get(mode) ?? 1) * e.spec.weakness); }
            if (finite(e.spec.attackRate)) out.attackRate *= e.spec.attackRate;
        }
        if (byMode.size) { const first = [...byMode.keys()][0]; out.weaknessMode = first; out.weakness = byMode.get(first); if (byMode.size > 1) note({ type: "conflict", target, reason: "mixedWeaknessModes" }); }
        return out;
    };
    // DamageModifiers へ、対象ごとの積を1つだけ登録する(1に戻れば外す)。
    const sync = target => {
        const dm = modifiers();
        const f = factorOf(target);
        if (dm) {
            const dtId = `apollostatus:${target}:damageTaken`, wkId = `apollostatus:${target}:weakness`;
            if (Math.abs(f.damageTaken - 1) > EPSILON) dm.add({ id: dtId, kind: "damageTaken", target, value: Math.min(100, Math.max(0, f.damageTaken)), source: "apollostatus" }); else dm.remove(dtId);
            if (Math.abs(f.weakness - 1) > EPSILON) dm.add({ id: wkId, kind: "weakness", target, mode: f.weaknessMode, value: Math.min(100, Math.max(0, f.weakness)), source: "apollostatus" }); else dm.remove(wkId);
        }
        const battler = battlerOf(target);
        if (battler && attackRates) { if (Math.abs(f.attackRate - 1) > EPSILON) attackRates.set(battler, f.attackRate); else attackRates.delete(battler); }
    };
    const validateSpec = spec => {
        if (spec && spec.weaknessMode !== undefined && spec.weaknessMode !== "rateMultiplier" && spec.weaknessMode !== "excessScale") return "invalid:weaknessMode";
        if (!spec || !(Number(spec.seconds) > 0)) return "invalidSeconds";
        for (const key of ["damageTaken", "weakness", "attackRate"]) if (spec[key] !== undefined && !(finite(spec[key]) && spec[key] >= 0 && spec[key] <= 100)) return "invalid:" + key;
        if (spec.dot !== undefined) {
            if (!spec.dot || !finite(spec.dot.perSecond) || spec.dot.perSecond < 0) return "invalid:dot";
            if (spec.dot.tickSeconds !== undefined && !(Number(spec.dot.tickSeconds) > 0)) return "invalid:dotTick";
        }
        return null;
    };
    const apply = (target, id, spec) => {
        target = String(target || ""); id = String(id || "");
        if (!valid(target) || !id) return { ok: false, reason: "invalidTarget" };
        const bad = validateSpec(spec);
        if (bad) return { ok: false, reason: bad };
        if (target.indexOf("event:") === 0) { const e = eventOf(target); if (!e || e._erased) return { ok: false, reason: "targetGone" }; }
        let m = states.get(target);
        if (!m) { m = new Map(); states.set(target, m); }
        const old = m.get(id);
        const tickSeconds = spec.dot ? Number(spec.dot.tickSeconds) || 1 : 0;
        const entry = { id, target, spec: { ...spec, dot: spec.dot ? { ...spec.dot, tickSeconds } : undefined }, remaining: Number(spec.seconds), elapsed: 0, ticks: 0,
            // 再付与(更新)では継続ダメージの位相(次のtickまでの経過)を保つ。新規は0から。
            dotAcc: old ? old.dotAcc : 0, dealt: old ? old.dealt : 0, serial: old ? old.serial : (apply.serial = (apply.serial || 0) + 1) };
        m.set(id, entry);
        sync(target);
        note({ type: old ? "refresh" : "apply", target, id, seconds: Number(spec.seconds) });
        return { ok: true, refreshed: !!old };
    };
    const remove = (target, id, reason = "removed") => {
        const m = states.get(target);
        if (!m || !m.delete(id)) return false;
        if (!m.size) states.delete(target);
        sync(target);
        note({ type: "remove", target, id, reason });
        return true;
    };
    const has = (target, id) => !!states.get(target)?.has(id);
    const list = target => {
        const out = [];
        for (const [key, m] of states) if (!target || key === target) for (const e of m.values()) out.push({ target: key, id: e.id, remaining: e.remaining, ticks: e.ticks, dealt: e.dealt, spec: JSON.parse(JSON.stringify(e.spec)) });
        return out;
    };
    const clear = (reason = "clear") => {
        const keys = [...states.keys()];
        states.clear();
        for (const key of keys) sync(key);
        if (keys.length) note({ type: "clear", reason, targets: keys.length });
    };

    // ---- 継続ダメージ(敵Eventへの固定ダメージ。UpdateEventHp 1回=1tick) ----
    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const hpOf = id => { const v = root.ProjectRCardModifiers?.eventHp?.(id); return Number.isFinite(v) ? v : (map()?.getCurrentEventHp?.(id) ?? 0); };
    const dealDot = (entry, amount, tickNo) => {
        const eventId = Number(entry.target.slice(6)), dot = entry.spec.dot;
        const attackId = `status:${entry.id}:${entry.serial}:${tickNo}`;
        const apply = () => command("UpdateEventHp", { eventId: String(eventId), value: `-${amount}`, exceedMaxHealth: "false",
            projectRFixed: { base: amount, flat: 0, source: dot.source || entry.spec.source || entry.id, element: dot.element ?? 0, weaknessMultiplier: dot.weaknessMultiplier ?? 1, critical: false } });
        const gauge = root.ProjectRUltimateGauge;
        return typeof gauge?.trackDamage === "function" ? gauge.trackDamage(eventId, { attackId, source: `damage:${dot.source || entry.spec.source || entry.id}` }, apply) : apply();
    };
    const targetAlive = key => {
        if (key.indexOf("event:") !== 0) return true;
        const e = eventOf(key);
        return !!e && !e._erased && hpOf(e.eventId()) > 0;
    };
    const tick = seconds => {
        if (!states.size || !finite(seconds) || seconds <= 0) return;
        for (const [key, m] of [...states]) {
            if (!targetAlive(key)) { for (const id of [...m.keys()]) remove(key, id, "targetGone"); continue; }
            // 1) 全状態の継続ダメージを先に処理し、2) そのあと期限切れを外す(同じframeに切れる状態同士で、tickの倍率が処理順で変わらないように)
            const entries = [...m.values()];
            for (const entry of entries) {
                const use = Math.min(seconds, Math.max(0, entry.remaining));
                entry.remaining -= seconds; entry.elapsed += use;
                const dot = entry.spec.dot;
                if (dot && dot.perSecond > 0) {
                    entry.dotAcc += use;
                    while (entry.dotAcc + EPSILON >= dot.tickSeconds) {
                        entry.dotAcc -= dot.tickSeconds;
                        const amount = Math.max(0, Math.round(dot.perSecond * dot.tickSeconds));
                        entry.ticks++;
                        try { if (amount > 0) { dealDot(entry, amount, entry.ticks); entry.dealt += amount; } } catch (_error) { /* 次のtickへ */ }
                        if (!targetAlive(key)) break;
                    }
                }
                if (!targetAlive(key)) break;
            }
            if (!targetAlive(key)) { for (const id of [...m.keys()]) remove(key, id, "targetDied"); continue; }
            for (const entry of entries) if (entry.remaining <= EPSILON) remove(key, entry.id, "expired");
        }
    };
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _updateCooldown.apply(this, arguments);
        if (!deck.isCardBattleActive()) clear("battleInactive"); else tick(Number(seconds));
        return result;
    };

    // ---- 敵の攻撃力・魔力の倍率(paramRateの外側。基礎ステータス・装備・Databaseは変えない) ----
    if (typeof Game_BattlerBase !== "undefined" && Game_BattlerBase.prototype.paramRate && attackRates) {
        const _paramRate = Game_BattlerBase.prototype.paramRate;
        Game_BattlerBase.prototype.paramRate = function(paramId) {
            const rate = _paramRate.apply(this, arguments);
            if (paramId === 2 || paramId === 4) { const f = attackRates.get(this); if (f !== undefined) return rate * f; }
            return rate;
        };
    }

    // ---- 仲間(PartyCombat)の被ダメージ: ダウンの判定より前に倍率を掛ける(Phase A9) ----
    //   PartyCombat.damageAlly は「HPを減らして0ならその場でダウン」までを1回で行う窓口で、DamageModifiers には繋がっていない。
    //   軽減を「受けた後の差し戻し」にすると、一撃で倒れる攻撃は軽減されてもダウンしてしまう。そこでこの窓口を包み、
    //   "ally:<actorId>" の状態の被ダメージ倍率を、ダメージを渡す前に掛ける(PartyCombat 本体は変えない)。倍率が 1 の仲間・状態が無い仲間は素通り。
    const partyCombat = root.ProjectRPartyCombat;
    if (partyCombat && typeof partyCombat.damageAlly === "function") {
        const _damageAlly = partyCombat.damageAlly;
        partyCombat.damageAlly = function(actorId, amount) {
            const id = Number.parseInt(actorId, 10);
            const factor = states.has("ally:" + id) ? factorOf("ally:" + id).damageTaken : 1;
            if (!(Number(amount) > 0) || Math.abs(factor - 1) <= EPSILON) return _damageAlly.apply(this, arguments);
            const reduced = Math.round(Number(amount) * factor);
            note({ type: "allyDamage", target: "ally:" + id, amount: Number(amount), reduced, factor });
            if (reduced > 0) return _damageAlly.call(this, actorId, reduced);
            const member = partyCombat.members().find(x => x.actorId === id);
            if (!member) return { ok: false, reason: "notInParty" };
            return member.down ? { ok: false, reason: "alreadyDown" } : { ok: true, hp: member.hp, down: false, reduced: 0 }; // 軽減で0になった被弾はHPを減らさない
        };
    }

    const _endBattle = deck.endBattle;
    deck.endBattle = function() { clear("battleEnd"); return _endBattle.apply(this, arguments); };
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clear("mapSetup"); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined" && DataManager.extractSaveContents) {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { clear("load"); return _extract.apply(this, arguments); };
    }

    root.ProjectRApolloStatus = Object.freeze({
        apply, remove, has, list, clear, factorOf, tick,
        targetKeyOfEvent: eventId => "event:" + Number(eventId),
        getLog: () => log.map(entry => ({ ...entry }))
    });
})();
