/*:
 * @target MZ
 * @plugindesc v0.3.0 ProjectR SOUL戦闘 L4-B マナ。準備ループ(prepare:true)のATTACK中だけ毎秒+1(上限10)・ATTACK開始で10・終了で破棄。承認済みD8コストによる使用の判定と消費(成功時に1回)・竪琴の割引。
 * @author ProjectR
 * @base ProjectR_SoulBattle
 * @orderAfter ProjectR_SoulBattle
 * @orderAfter ProjectR_SoulLoopHand
 *
 * @help
 * ProjectR_SoulMana.js
 *
 * 位置づけ: SOUL戦闘の新ループ(準備 → 攻撃 → 防御 → 準備)のマナ(資源)です。
 *   L4-A: 資源(上限・回復・破棄)。 L4-B: 承認済み D8 コストによる「使えるか」の判定と、発動の成功時に1回だけの消費、竪琴の割引。
 *   準備ループ(ProjectRSoulBattle.start({prepare:true}))のときだけ動き、従来の攻撃⇄防御・通常のマップ戦闘では何もしません。
 *
 * 規則(承認済み):
 *   ・上限 10。ATTACK が始まるたびに 10 に初期化する。ATTACK の間だけ毎秒 +1 回復(端数も貯まる。1フレーム = 1/60 マナ)。
 *   ・PREPARE・DEFENSE・一時停止(メニュー・会話・イベント中)・神託の時間停止・SOULが動いていない間は回復しない。ATTACK が終わるとき残りは破棄。
 *   ・時計は ATTACK の時計(ProjectRSoulBattle の経過フレーム)。整数の単位で数えるのでずれない。
 *
 * コスト(承認済み D8。docs/spece/ProjectR_SOUL_D8_mana_cost_approved.csv の「推奨 Lv1/Lv2/Lv3」を承認): COSTS。カードの所持 Lv(Lv1〜3)で決まる。
 *   表に無いカードは使えない(costUndefined。コストを作り上げない)。
 *
 * 使用の流れ(固定手札 = ProjectR_SoulLoopHand と組み合わせ。カードの効果・保存・所持は変えない):
 *   1. 使う前(quote): 足りなければ拒否(insufficientMana)。何も消費せず、カードの効果も起きない。重ね掛けを禁じるカード(ストレングスで蓄えがある間)は buffActive で拒否。
 *   2. 同期で成功するカード: 成功の確定(カードの消費の確定)のときに、ちょうど1回だけ消費する(settle)。失敗・中止では消費しない。
 *   3. 予約型のカード(発動が pending を返す矢のカード = 黄金の矢・エロスの矢・ギガース殺し・疫病の矢): 発動が始まった時にコスト分を「予約」して(reserve)他のカードに使われないようにし、
 *      **発射(launch)が成功した時点で、ちょうど1回だけ確定して消費する**(命中するかどうかは関係ない)。
 *      ・発射の成功 = 黄金の矢・疫病の矢は発動と同時(矢が出ている) / ギガース殺しはチャージが終わって矢・ビームが出たとき / エロスの矢は最初の矢の発射かビームの開始。
 *      ・発射の前に失敗・中止された(チャージ中の中止・発射できなかった・ATTACK の終了)ときだけ、予約を解放する(消費しない)。
 *      ・発射した攻撃があとで外れる・時間切れになる・ATTACK の終了で片づけられても、マナは返さない。
 *      ・複数の矢・ビームの攻撃も、1回の発動につき1回だけ(矢ごとには引かない)。のちの命中でカードの消費が確定しても、もう一度は引かない。
 *   4. 竪琴(apollo_lyre_rhythm)の割引: リズムの「速度」の音符で、次に使うカード1枚の消費を -1(「全部同じ音符」のときは -2)、最低でも 1 にする。
 *      ATTACK の時計で 8 秒の間だけ有効。1回使うと消える。重ねがけせず(新しい割引は大きい方で更新)、竪琴自身には効かない(再帰しない)。
 *
 * API: ProjectRSoulMana
 *   MAX(10) / UNITS_PER_MANA(60) / REGEN_PER_SECOND(1) / COSTS / DISCOUNT_SECONDS(8)
 *   getState() -> { active, phase, current, whole, max, ratio, units, available, holds, discount, spent, lastSpend, regenerating, reason, round, lastDiscarded, stats }
 *   isActive() / costOf(cardId, level?) / effectiveCost(cardId, level?) / quote(cardId) -> { ok, reason?, cost, base, level, discount, available }
 *   reserve(instanceId, cardId) / settle(instanceId, cardId) / release(instanceId, reason) / grantDiscount({ amount, seconds })   (ProjectR_SoulLoopHand / ProjectR_SoulSkills が呼ぶ)
 *   devSet(マナ)  Playtest(test オプション)専用の確認用
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const VERSION = "0.3.0";
    const MAX = 10, UNITS_PER_MANA = 60, REGEN_PER_SECOND = 1;       // 1フレーム = 1単位 = 1/60 マナ
    const MAX_UNITS = MAX * UNITS_PER_MANA;
    const LYRE = "apollo_lyre_rhythm", DISCOUNT_SECONDS = 8, HOLD_TTL_FRAMES = 1200;
    // 承認済み D8 コスト [Lv1, Lv2, Lv3]。docs/spece/ProjectR_SOUL_D8_mana_cost_approved.csv の「推奨 Lv1/Lv2/Lv3」(承認欄が空のものは推奨を承認)。竪琴は 3/4/5(指示)。
    const COSTS = Object.freeze({
        hermes_issen: Object.freeze([5, 5, 6]), hermes_strength: Object.freeze([2, 3, 5]), hermes_sweep: Object.freeze([2, 3, 4]), hermes_zetsu: Object.freeze([4, 5, 6]),
        hermes_psychopomp: Object.freeze([5, 6, 8]), hermes_reed_flute: Object.freeze([4, 5, 6]), hermes_veil: Object.freeze([3, 4, 5]),
        apollo_golden_volley: Object.freeze([3, 4, 5]), apollo_eros_arrow: Object.freeze([4, 5, 7]), apollo_gigas_slayer: Object.freeze([6, 7, 8]), apollo_hyacinthus: Object.freeze([3, 4, 5]),
        apollo_plague_rain: Object.freeze([4, 5, 6]), apollo_laurel_wreath: Object.freeze([4, 5, 6]), apollo_lyre_rhythm: Object.freeze([3, 4, 5]), apollo_oracle: Object.freeze([7, 8, 9])
    });
    // 予約型のカードの「確定待ちか」「発射が成功したか」を読み取り専用で聞く窓口(各カードの getPending / getSequences を読むだけ。カードの動作は変えない)。
    //   黄金の矢・疫病の矢: 確定待ち(pending)が始まった時点で矢が出ている。ギガース殺し: phase が "charge" の間は発射前(チャージ中)。
    //   エロスの矢: 最初の矢を出した(emitted>0)か、ビームが始まった(ticks>0 / segments>0)とき。無いカードは時間切れ(HOLD_TTL_FRAMES)で予約を解放する。
    const LAUNCH_PROBES = Object.freeze({
        apollo_golden_volley: { api: "ProjectRApolloGoldenVolley", launched: p => !!p },
        apollo_plague_rain: { api: "ProjectRApolloPlagueRain", launched: p => !!p },
        apollo_gigas_slayer: { api: "ProjectRApolloGigasSlayer", launched: p => !!p && p.phase !== "charge" },
        apollo_eros_arrow: { api: "ProjectRApolloErosArrow", launched: (p, api) => {
            if (!p) return false;
            const seq = (safe(() => api.getSequences?.(), []) || []).find(x => x.serial === p.serial);
            return !!seq && ((seq.emitted || 0) > 0 || !!seq.committed || !!(seq.beam && ((seq.beam.ticks || 0) > 0 || (seq.beam.segments || 0) > 0)));
        } }
    });
    const probeOf = cardId => {
        const probe = LAUNCH_PROBES[cardId];
        if (!probe) return null;
        const api = root[probe.api];
        const p = safe(() => api?.getPending?.(), null);
        return { known: true, pending: !!p, launched: !!safe(() => probe.launched(p, api), false) };
    };
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const soul = () => root.ProjectRSoulBattle;
    if (!soul()?.onPhase || typeof Game_Map === "undefined") return;

    const rt = {
        active: false, units: 0, lastElapsed: 0, reason: "inactive", lastDiscarded: null, round: 0,
        holds: new Map(), charged: new Map(), discount: null, spentUnits: 0, lastSpend: null,
        stats: { starts: 0, discards: 0, regenFrames: 0, pausedFrames: 0, ends: 0, spends: 0, rejected: 0, holdsMade: 0, holdsReleased: 0, launchCharges: 0, launchRefundsDenied: 0, discountsGranted: 0, discountsUsed: 0, discountsExpired: 0 }
    };
    const loopRun = () => !!safe(() => soul().getState().prepare, false);
    const elapsed = () => Number(safe(() => soul().getState().elapsedFrames, 0)) || 0;
    const attacking = () => rt.active && safe(() => soul().getPhase(), "idle") === "attack";

    // ---------------------------------------------------------------- コスト ----------------------------------------------------------------
    const levelOf = cardId => {
        const saved = Number.parseInt(safe(() => root.ProjectRCardDeck.getPersistentData().cardOwnership?.[cardId]?.level, 1), 10);
        return Math.min(3, Math.max(1, Number.isFinite(saved) ? saved : 1));
    };
    const costOf = (cardId, level) => { const row = COSTS[cardId]; return row ? row[Math.min(3, Math.max(1, Number(level) || levelOf(cardId))) - 1] : null; };
    // 割引: 竪琴以外の「次の1枚」。予約中のカードがあれば、そのカードだけが使える(二重に使わない)。最低 1。
    const discountFor = (cardId, instanceId) => {
        const d = rt.discount;
        if (!d || cardId === LYRE) return 0;
        if (d.reservedBy && d.reservedBy !== instanceId) return 0;
        return d.amount;
    };
    const effectiveCost = (cardId, level, instanceId) => {
        const base = costOf(cardId, level);
        if (base === null) return null;
        const off = discountFor(cardId, instanceId);
        return off > 0 ? Math.max(1, base - off) : base;
    };
    const heldUnits = () => { let n = 0; for (const h of rt.holds.values()) n += h.units; return n; };
    const availableUnits = () => Math.max(0, rt.units - heldUnits());

    // 重ね掛けを禁じるカード(同じ強化を無制限に積まない): 蓄えがある間は発動できない(何も消費しない)
    const STACK_GUARDS = Object.freeze({ hermes_strength: () => !!safe(() => root.ProjectRHermesStrength?.getPending?.(), null) });

    // 使う前の判定(何も変えない)
    const quote = cardId => {
        if (!attacking()) return { ok: false, reason: "notAttack" };
        const level = levelOf(cardId), base = costOf(cardId, level);
        if (base === null) return { ok: false, reason: "costUndefined", level };
        if (STACK_GUARDS[cardId] && STACK_GUARDS[cardId]()) return { ok: false, reason: "buffActive", level, base };
        const cost = effectiveCost(cardId, level), avail = availableUnits() / UNITS_PER_MANA;
        const info = { cost, base, level, discount: base - cost, available: avail, current: rt.units / UNITS_PER_MANA };
        if (availableUnits() < cost * UNITS_PER_MANA) { rt.stats.rejected++; return { ok: false, reason: "insufficientMana", ...info }; }
        return { ok: true, ...info };
    };
    // 予約型のカード: 発動の時にコスト分を確保する(まだ消費しない)
    const reserve = (instanceId, cardId) => {
        if (rt.charged.has(instanceId)) { const st = probeOf(cardId); if (st && !st.pending) rt.charged.delete(instanceId); }      // 前の発動の発射済みの記録が残っていれば(確定待ちでなければ)捨てる
        if (!attacking() || !instanceId || rt.holds.has(instanceId) || rt.charged.has(instanceId)) return { ok: false, reason: "notReserved" };
        const cost = effectiveCost(cardId, undefined, instanceId);
        if (cost === null || availableUnits() < cost * UNITS_PER_MANA) return { ok: false, reason: "insufficientMana" };
        const discounted = discountFor(cardId, instanceId) > 0;
        if (discounted) rt.discount.reservedBy = instanceId;
        rt.holds.set(instanceId, { cardId, instanceId, units: cost * UNITS_PER_MANA, born: elapsed(), discounted, launched: false });
        rt.stats.holdsMade++;
        pollLaunch(rt.holds.get(instanceId));                              // 黄金の矢・疫病の矢は、確定待ちが始まった時点で発射済み
        return { ok: true, cost, launched: !rt.holds.has(instanceId) };
    };
    // 発射の成功: 予約したコストをちょうど1回確定して消費する(命中・外れは関係ない)。以後の命中でカードの消費が確定しても、もう引かない(charged)。
    const chargeLaunch = hold => {
        if (!rt.holds.has(hold.instanceId) || rt.units < hold.units) return false;
        rt.holds.delete(hold.instanceId);
        rt.units -= hold.units; rt.spentUnits += hold.units; rt.stats.spends++; rt.stats.launchCharges++;
        if (hold.discounted && rt.discount && hold.cardId !== LYRE) { rt.discount = null; rt.stats.discountsUsed++; }
        rt.lastSpend = { cardId: hold.cardId, instanceId: hold.instanceId, cost: hold.units / UNITS_PER_MANA, frame: elapsed(), launch: true };
        rt.charged.set(hold.instanceId, { cardId: hold.cardId, instanceId: hold.instanceId, born: elapsed() });
        return true;
    };
    const pollLaunch = hold => {
        const st = probeOf(hold.cardId);
        if (st && st.pending && st.launched) return chargeLaunch(hold);
        return false;
    };
    const release = (instanceId, reason = "released") => {
        const hold = rt.holds.get(instanceId);
        if (!hold) return false;
        rt.holds.delete(instanceId);
        if (rt.discount && rt.discount.reservedBy === instanceId) rt.discount.reservedBy = null;
        rt.stats.holdsReleased++;
        void reason;
        return true;
    };
    // 成功の確定(カードの消費の確定)のとき、ちょうど1回だけ消費する。予約があればその分を、なければいまのコストを。足りなければ失敗(カードは消費されない)。
    const settle = (instanceId, cardId) => {
        if (!attacking()) return { ok: false, reason: "notAttack" };
        if (instanceId && rt.charged.has(instanceId)) { rt.charged.delete(instanceId); return { ok: true, cost: 0, alreadyCharged: true }; }       // 発射の時に消費済み: カードの消費の確定(命中)では引かない
        const hold = instanceId ? rt.holds.get(instanceId) : null;
        let units, discounted;
        if (hold) { units = hold.units; discounted = hold.discounted; }
        else {
            const cost = effectiveCost(cardId, undefined, instanceId);
            if (cost === null) return { ok: false, reason: "costUndefined" };
            units = cost * UNITS_PER_MANA; discounted = discountFor(cardId, instanceId) > 0;
            if (availableUnits() < units) { rt.stats.rejected++; return { ok: false, reason: "insufficientMana" }; }
        }
        if (rt.units < units) { rt.stats.rejected++; return { ok: false, reason: "insufficientMana" }; }
        if (hold) rt.holds.delete(instanceId);
        rt.units -= units; rt.spentUnits += units; rt.stats.spends++;
        if (discounted && rt.discount && cardId !== LYRE) { rt.discount = null; rt.stats.discountsUsed++; }
        rt.lastSpend = { cardId, instanceId: instanceId || null, cost: units / UNITS_PER_MANA, frame: elapsed() };
        return { ok: true, cost: units / UNITS_PER_MANA };
    };
    // 竪琴の割引(速度の音符)。重ねがけせず、新しい割引は大きい方で更新・時間は更新。竪琴自身には効かない。
    const grantDiscount = (spec = {}) => {
        if (!attacking()) return { ok: false, reason: "notAttack" };
        const amount = Math.min(2, Math.max(1, Math.round(Number(spec.amount) || 1)));
        const frames = Math.max(1, Math.round((Number(spec.seconds) || DISCOUNT_SECONDS) * 60));
        const old = rt.discount;
        rt.discount = { amount: old ? Math.max(old.amount, amount) : amount, left: frames, reservedBy: old ? old.reservedBy : null };
        rt.stats.discountsGranted++;
        return { ok: true, amount: rt.discount.amount, frames };
    };

    // ---------------------------------------------------------------- フェーズ ----------------------------------------------------------------
    const clearSpendState = () => { rt.holds.clear(); rt.charged.clear(); rt.discount = null; };
    soul().onPhase(event => {
        if (!event || !loopRun()) return;                                  // 準備ループの戦闘だけ(従来の攻撃⇄防御は何もしない)
        if (event.from === "idle") { rt.active = true; rt.units = 0; rt.reason = "notAttack"; rt.lastDiscarded = null; rt.spentUnits = 0; rt.lastSpend = null; clearSpendState(); }
        if (event.to === "attack") {                                       // ATTACK の開始 = 10 に初期化(前の値は引き継がない)
            rt.units = MAX_UNITS; rt.lastElapsed = elapsed(); rt.round = Number(event.round) || 0; rt.reason = "full"; rt.stats.starts++; clearSpendState();
        } else if (event.from === "attack") {                              // ATTACK の終了 = 残り・予約・割引を破棄
            rt.lastDiscarded = rt.units / UNITS_PER_MANA; rt.units = 0; rt.reason = "notAttack"; rt.stats.discards++; clearSpendState();
        } else rt.reason = "notAttack";
    });
    soul().onEnd(() => {                                                   // SOUL の終了・中断・マップ移動: すべて初期状態へ
        if (rt.active) rt.stats.ends++;
        rt.active = false; rt.units = 0; rt.reason = "inactive"; rt.round = 0; clearSpendState();
    });

    // ---------------------------------------------------------------- 毎フレーム ----------------------------------------------------------------
    // ATTACK の時計(コントローラの経過フレーム)が進んだ分だけ、回復・割引の残り時間・予約の見張りを進める。コントローラの更新の後で読む。
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function() {
        const result = _update.apply(this, arguments);
        if (!rt.active) return result;
        try {
            const s = soul().getState();
            if (!s.active || s.phase !== "attack") { rt.lastElapsed = Number(s.elapsedFrames) || 0; rt.reason = s.active ? "notAttack" : "inactive"; return result; }
            const frames = Math.max(0, (Number(s.elapsedFrames) || 0) - rt.lastElapsed);
            rt.lastElapsed = Number(s.elapsedFrames) || 0;
            if (frames <= 0) { rt.reason = "paused"; rt.stats.pausedFrames++; return result; }
            if (rt.discount) { rt.discount.left -= frames; if (rt.discount.left <= 0) { rt.discount = null; rt.stats.discountsExpired++; } }
            for (const hold of [...rt.holds.values()]) {                   // 予約: 発射が成功したら確定して消費 / 発射前に確定待ちでなくなった(失敗・中止)・時間切れなら解放
                const st = probeOf(hold.cardId), age = rt.lastElapsed - hold.born;
                if (st && st.pending && st.launched) chargeLaunch(hold);
                else if ((st && !st.pending && age >= 3) || age >= HOLD_TTL_FRAMES) release(hold.instanceId, st && !st.pending ? "notLaunched" : "ttl");
            }
            for (const entry of [...rt.charged.values()]) {                // 発射済み: 外れ・時間切れで確定待ちが終わったら記録だけ捨てる(マナは返さない)
                const st = probeOf(entry.cardId), age = rt.lastElapsed - entry.born;
                if ((st && !st.pending && age >= 3) || age >= HOLD_TTL_FRAMES * 3) { rt.charged.delete(entry.instanceId); rt.stats.launchRefundsDenied++; }
            }
            if (rt.units >= MAX_UNITS) { rt.reason = "full"; return result; }
            rt.units = Math.min(MAX_UNITS, rt.units + frames * REGEN_PER_SECOND);
            rt.reason = rt.units >= MAX_UNITS ? "full" : "regen";
            rt.stats.regenFrames += frames;
        } catch (_error) { /* 資源の更新。ゲームを止めない */ }
        return result;
    };

    const getState = () => ({
        active: rt.active, phase: safe(() => soul().getPhase(), "idle"), current: rt.units / UNITS_PER_MANA, whole: Math.floor(rt.units / UNITS_PER_MANA), max: MAX, ratio: rt.units / MAX_UNITS,
        units: rt.units, available: availableUnits() / UNITS_PER_MANA, unitsPerMana: UNITS_PER_MANA, regenPerSecond: REGEN_PER_SECOND, regenerating: rt.reason === "regen", reason: rt.reason, round: rt.round,
        holds: [...rt.holds.values()].map(h => ({ instanceId: h.instanceId, cardId: h.cardId, cost: h.units / UNITS_PER_MANA, discounted: h.discounted, launched: h.launched })),
        charged: [...rt.charged.values()].map(h => ({ instanceId: h.instanceId, cardId: h.cardId })),
        discount: rt.discount ? { amount: rt.discount.amount, secondsLeft: rt.discount.left / 60, reserved: !!rt.discount.reservedBy } : null,
        spent: rt.spentUnits / UNITS_PER_MANA, lastSpend: rt.lastSpend && { ...rt.lastSpend }, lastDiscarded: rt.lastDiscarded, stats: { ...rt.stats }
    });
    const playtest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;

    root.ProjectRSoulMana = Object.freeze({
        VERSION, MAX, UNITS_PER_MANA, REGEN_PER_SECOND, COSTS, DISCOUNT_SECONDS,
        getState, isActive: () => rt.active,
        costOf: (cardId, level) => costOf(cardId, level), effectiveCost: (cardId, level) => effectiveCost(cardId, level),
        quote, reserve, settle, release, grantDiscount,
        // Playtest 専用の確認用。いまのマナを書き換えるだけで、フェーズの規則は変えない。
        devSet: value => {
            if (!playtest() || !rt.active) return { ok: false, reason: playtest() ? "inactive" : "notPlaytest" };
            const n = Number(value);
            if (!Number.isFinite(n) || n < 0 || n > MAX) return { ok: false, reason: "invalidValue" };
            rt.units = Math.round(n * UNITS_PER_MANA);
            return { ok: true, current: rt.units / UNITS_PER_MANA };
        }
    });
})();
