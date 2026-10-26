/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 3C-3 ボス/範囲攻撃から常駐Ultimate神のDivine HPへダメージを渡す橋渡し。
 * @author ProjectR
 * @base ProjectR_GodSummonManager
 * @orderAfter ProjectR_GodSummonManager
 *
 * @help
 * ボス・範囲攻撃などの「攻撃側」が、明示的に呼んだときだけ常駐Ultimate神の
 * Divine HPを減らすための小さな橋渡しです。Divine HP・崩壊・復帰・顕現はすべて
 * ProjectR_GodSummonManagerが持ち、このpluginは範囲判定・全体攻撃の中継・
 * 攻撃ごとの重複防止だけを担当します（HPの実装は増やしません）。
 *
 * 常駐神は論理アンカーのままで、敵/味方/Party/標的候補/当たり判定Eventにはなりません。
 * ボスAIが神を標的に選ぶことはなく、通常の単体攻撃は従来どおりPlayer/Partyへ向かいます。
 * ダメージは「攻撃側がこのAPIを呼んだとき」だけ発生します（opt-in）。
 * 一時召喚（カード発動）はDivine HPを持たず、このAPIの対象にもなりません。
 * 現時点でProjectRには共通のボス攻撃レイヤーが無いため、既存の攻撃には接続していません。
 * 個々の攻撃からの呼び出しは、今後のボス実装フェーズで行います。
 *
 * 攻撃ID（attackId）: 1回の攻撃発動ごとに一意な文字列または数値。同じ攻撃IDでは
 *   常駐神を最大1回しかダメージしません（範囲Eventが複数frame残っても毎frame減りません）。
 *   Event IDだけを使うと、同じEventの別の攻撃を区別できないので使わないでください。
 *   ProjectRUltimateGodDamageBridge.createAttackId('meteor') で 'meteor-1' のような
 *   一意なIDを作れます。同じIDの再利用は「適用済み」として無視されます（戦闘中のみ記憶）。
 *
 * Divine HPへのダメージ量は攻撃側が明示します（Player HP・防御・神の能力値からは計算しません）。
 *
 * API（Console: ProjectRUltimateGodDamageBridge）:
 *   damagePersistentUltimateInArea({ attackId, x, y, radius, amount, source })
 *     円形範囲。中心(x,y)・radiusはtile座標（Playerの_realX/_realYと同じ座標系）。
 *     常駐神の論理アンカー（Player位置+PersistentOffset）が円内（境界を含む）のときだけ減らします。
 *     ループマップは$gameMap.deltaX/deltaYで差を求めます。
 *   damagePersistentUltimateFromEventArea(eventId, radius, amount, attackId, source)
 *     Eventの現在のreal座標を中心にして上記へ渡します。
 *   damagePersistentUltimateFromGlobalAttack({ attackId, amount, source })
 *     距離判定なしの戦闘全体攻撃。明示的に呼んだ攻撃だけが対象です。
 *   createAttackId(prefix) / getLastResult() / getRegisteredAttackCount() / hasAttackHit(attackId) / clear()
 *
 * 結果: { ok, hit, kind, reason, attackId, damage, collapsed, status, divineHp, maxDivineHp, distance }
 *   ok:trueはDivine HPが実際に減った場合のみ。常駐神が居ない/崩壊中/範囲外/適用済み/不正値は
 *   ok:falseと理由（noPersistentUltimate, collapsed, notManifested, outsideArea,
 *   alreadyApplied, invalidDamage, invalidAttackId, invalidArea, eventNotFound,
 *   managerUnavailable）を返し、例外は投げません。ボス攻撃自体は常にそのまま続行してください。
 *   崩壊中の呼び出しは復帰タイマーを再始動せず、追加の崩壊も起こしません。
 *
 * 記憶（攻撃IDの命中履歴）は実行時のみで、endCardBattle・マップ移動・ロードで消えます。
 * セーブしません。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const EPSILON = 1e-9; // 円の境界を含めるための浮動小数点許容。
    const hits = new Set(); // 命中済みの攻撃ID（この戦闘のみ）。
    let lastResult = null;
    let serial = 0;

    const manager = () => root.ProjectRGodSummonManager || null;
    const normalizeId = value => {
        if (typeof value === "string") return value.length ? value : null;
        return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
    };
    const isPositive = value => typeof value === "number" && Number.isFinite(value) && value > 0;
    const isFiniteNumber = value => typeof value === "number" && Number.isFinite(value);
    // ループマップでは$gameMapの差分helperを使う。無ければ単純な差。
    const delta = (axis, a, b) => {
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        const fn = map && (axis === "x" ? map.deltaX : map.deltaY);
        const value = typeof fn === "function" ? fn.call(map, a, b) : a - b;
        return Number.isFinite(value) ? value : a - b;
    };

    const finish = (kind, attackId, fields) => {
        const result = { ok: false, hit: false, kind, reason: null, attackId, damage: 0, collapsed: false,
            status: "none", divineHp: 0, maxDivineHp: 0, distance: null, ...fields };
        lastResult = result;
        return { ...result };
    };
    // 現在のDivine HP状態の読み取り（失敗結果にも付ける）。
    const snapshot = m => {
        try {
            return { status: m.getPersistentUltimateStatus(), divineHp: m.getPersistentUltimateDivineHp(),
                maxDivineHp: m.getPersistentUltimateMaxDivineHp() };
        } catch (error) {
            return {};
        }
    };

    // 共通処理。areaCheck(summon)はnull（範囲内）か、不適合理由・距離を返す。
    const apply = (kind, attackId, amount, source, areaCheck) => {
        try {
            const m = manager();
            if (!m) return finish(kind, attackId, { reason: "managerUnavailable" });
            const id = normalizeId(attackId);
            if (id === null) return finish(kind, null, { reason: "invalidAttackId", ...snapshot(m) });
            if (!isPositive(amount)) return finish(kind, id, { reason: "invalidDamage", ...snapshot(m) });
            if (!m.hasPersistentUltimateBattleState()) return finish(kind, id, { reason: "noPersistentUltimate", ...snapshot(m) });
            if (m.isPersistentUltimateCollapsed()) return finish(kind, id, { reason: "collapsed", ...snapshot(m) });
            if (!m.isPersistentUltimateAvailable()) return finish(kind, id, { reason: "notManifested", ...snapshot(m) });
            if (hits.has(id)) return finish(kind, id, { reason: "alreadyApplied", ...snapshot(m) });
            let distance = null;
            if (areaCheck) {
                const summon = m.getPersistentUltimateSummon();
                if (!summon) return finish(kind, id, { reason: "notManifested", ...snapshot(m) });
                const outcome = areaCheck(summon);
                distance = outcome.distance;
                if (!outcome.inside) return finish(kind, id, { reason: "outsideArea", distance, ...snapshot(m) });
            }
            const dealt = m.damagePersistentUltimate(amount, typeof source === "string" ? source : id);
            if (!dealt || dealt.ok !== true) {
                return finish(kind, id, { reason: dealt?.reason || "damageRejected", distance, ...snapshot(m) });
            }
            hits.add(id); // 実際にHPが減ったときだけ記憶する。
            return finish(kind, id, { ok: true, hit: true, reason: "hit", damage: dealt.damage, collapsed: dealt.collapsed,
                status: dealt.status, divineHp: dealt.divineHp, maxDivineHp: dealt.maxDivineHp, distance });
        } catch (error) {
            return finish(kind, normalizeId(attackId), { reason: "bridgeError" });
        }
    };

    const damagePersistentUltimateInArea = options => {
        const o = options && typeof options === "object" ? options : {};
        const valid = isFiniteNumber(o.x) && isFiniteNumber(o.y) && isFiniteNumber(o.radius) && o.radius >= 0;
        if (!valid) {
            const m = manager();
            return finish("area", normalizeId(o.attackId), { reason: m ? "invalidArea" : "managerUnavailable", ...(m ? snapshot(m) : {}) });
        }
        return apply("area", o.attackId, o.amount, o.source, summon => {
            const distance = Math.hypot(delta("x", summon.x, o.x), delta("y", summon.y, o.y));
            return { inside: distance <= o.radius + EPSILON, distance };
        });
    };

    const damagePersistentUltimateFromEventArea = (eventId, radius, amount, attackId, source) => {
        if (!manager()) return finish("area", normalizeId(attackId), { reason: "managerUnavailable" });
        let event = null;
        try { event = typeof $gameMap !== "undefined" ? $gameMap.event(eventId) : null; } catch (error) { event = null; }
        if (!event || !isFiniteNumber(event._realX) || !isFiniteNumber(event._realY)) {
            const m = manager();
            return finish("area", normalizeId(attackId), { reason: "eventNotFound", ...(m ? snapshot(m) : {}) });
        }
        return damagePersistentUltimateInArea({ attackId, x: event._realX, y: event._realY, radius, amount, source });
    };

    const damagePersistentUltimateFromGlobalAttack = options => {
        const o = options && typeof options === "object" ? options : {};
        return apply("global", o.attackId, o.amount, o.source, null);
    };

    const clear = () => { hits.clear(); lastResult = null; };
    if (deck) {
        const _endBattle = deck.endBattle;
        deck.endBattle = function() { clear(); return _endBattle.apply(this, arguments); };
    }
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clear(); return _setup.apply(this, arguments); };
    }
    if (typeof Scene_Map !== "undefined") {
        const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
        Scene_Map.prototype.onMapLoaded = function() {
            _onMapLoaded.apply(this, arguments);
            clear();
        };
    }

    root.ProjectRUltimateGodDamageBridge = {
        damagePersistentUltimateInArea,
        damagePersistentUltimateFromEventArea,
        damagePersistentUltimateFromGlobalAttack,
        createAttackId: prefix => `${typeof prefix === "string" && prefix ? prefix : "attack"}-${++serial}`,
        getLastResult: () => lastResult ? { ...lastResult } : null,
        getRegisteredAttackCount: () => hits.size,
        hasAttackHit: attackId => { const id = normalizeId(attackId); return id !== null && hits.has(id); },
        clear
    };
})();
