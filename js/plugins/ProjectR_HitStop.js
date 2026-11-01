/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 共通ヒットストップ: 当たった「そのイベントだけ」を数frame止める(対象ローカル)。時計・入力・弾・Cooldown・他の敵は止めない。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @orderAfter Hendrix_Action_Engine
 *
 * @help
 * ProjectR_HitStop.js (Phase Apollo-A5B)
 *
 * 【方針】ヒットストップは「当たった敵だけ」を短く止める見た目と手応えの機能です。次を止めません:
 *   戦闘の時計(Cooldown・DoT・カードの寿命)、プレイヤー、プレイヤーの入力、弾(矢・ビーム・銃弾)、他のEvent、他の敵。
 *   ダメージの計算・タイミング・命中の判定も変えません(止まった敵も、当たり判定のまま。ダメージは普通に入る)。
 *
 * 【仕組み】止める対象の Game_Event.update を、残りframeの間だけ飛ばします(そのEventのページ・移動・AI・パターンアニメが進まない)。
 *   1回の updateにつき残りを1減らす(マップが止まっている間は進まない)。HendrixのEventの進行が Game_Event.update の外にある場合は、
 *   そのEventの移動だけは止まらないことがあります(その場合は見た目(アニメ)だけが止まる。docs/ProjectR_ApolloGoldenVolley.md に記載)。
 *
 * 【無限に止めない】apply() は「重ねがけ」ではなく「残りを max(残り, frames) に更新」します。さらに owner(発動の識別子)ごとに、
 *   同じ対象を止める合計frameの上限(maxFrames)があり、上限に達したら、その発動ではもう止めません。倒れた・消えた・マップ移動・戦闘終了・ロードで解除します。
 *   プレイヤー(Game_Player)は止められません。
 *
 * API: ProjectRHitStop
 *   apply(character, frames, { owner?, maxFrames? }) → { ok, remaining, total, capped? } / { ok:false, reason }
 *   isFrozen(character) / remaining(character) / release(owner) / clear(character?) / clearAll(reason?) / getActive() / getStats()
 *   release(owner): その発動が終わったとき。owner別の「合計の上限」の記録を捨てる。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const MAX_FRAMES_HARD = 600; // 設定の誤りでも、1回の止めはこれを超えない
    const frozen = new Map(); // character -> { remaining, totals: Map(owner -> frames) , map }
    const stats = { applied: 0, skippedUpdates: 0, capped: 0, cleared: 0 };

    const finite = value => Number.isFinite(Number(value));
    const supported = character => typeof Game_Event !== "undefined" && character instanceof Game_Event && !(typeof Game_Player !== "undefined" && character instanceof Game_Player);

    const apply = (character, frames, options = {}) => {
        if (!supported(character)) return { ok: false, reason: "unsupportedTarget" };
        const want = Math.floor(Number(frames));
        if (!finite(frames) || want <= 0) return { ok: false, reason: "invalidFrames" };
        if (character._erased) return { ok: false, reason: "erased" };
        const owner = String(options.owner ?? "default");
        const cap = finite(options.maxFrames) && Number(options.maxFrames) > 0 ? Math.min(MAX_FRAMES_HARD, Math.floor(Number(options.maxFrames))) : MAX_FRAMES_HARD;
        let record = frozen.get(character);
        if (!record) { record = { remaining: 0, totals: new Map(), map: typeof $gameMap !== "undefined" ? $gameMap : null }; frozen.set(character, record); }
        const used = record.totals.get(owner) || 0;
        const room = cap - used;
        if (room <= 0) { stats.capped++; return { ok: true, capped: true, remaining: record.remaining, total: used }; }
        // 残りを max(残り, want) に更新(重ねがけで伸ばさない)。新しく増えた分だけを、この発動(owner)の合計に数える。合計は上限(cap)まで。
        const target = Math.min(Math.max(record.remaining, want), record.remaining + room);
        const added = Math.max(0, target - record.remaining);
        record.remaining = target;
        record.totals.set(owner, used + added);
        stats.applied++;
        return { ok: true, capped: used + added >= cap, remaining: record.remaining, total: used + added };
    };
    const isFrozen = character => (frozen.get(character)?.remaining || 0) > 0;
    const remaining = character => frozen.get(character)?.remaining || 0;
    // owner(発動)が終わったら、その合計の記録を捨てる(止めの残りは自然に切れる)。
    const release = owner => {
        const key = String(owner ?? "default");
        for (const [character, record] of [...frozen]) { record.totals.delete(key); if (!record.remaining && !record.totals.size) frozen.delete(character); }
    };
    const clear = character => {
        if (character === undefined) return clearAll("clear");
        const had = frozen.delete(character);
        if (had) stats.cleared++;
        return had;
    };
    const clearAll = _reason => { stats.cleared += frozen.size; frozen.clear(); };

    if (typeof Game_Event !== "undefined") {
        const _update = Game_Event.prototype.update;
        Game_Event.prototype.update = function() {
            const record = frozen.get(this);
            if (record) {
                if (this._erased || record.map !== (typeof $gameMap !== "undefined" ? $gameMap : null)) { frozen.delete(this); }
                else if (record.remaining > 0) {
                    record.remaining--;
                    stats.skippedUpdates++;
                    return; // 止めの間はこのEventのupdateを飛ばす。owner別の合計は release(owner) まで残す(上限を守る)
                }
            }
            return _update.apply(this, arguments);
        };
    }
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clearAll("mapSetup"); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined") {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { clearAll("load"); return _extract.apply(this, arguments); };
    }
    const deck = root.ProjectRCardDeck;
    if (deck && typeof deck.endBattle === "function") {
        const _endBattle = deck.endBattle;
        deck.endBattle = function() { clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    }

    root.ProjectRHitStop = Object.freeze({
        VERSION: "1.0.0", MAX_FRAMES_HARD,
        apply, isFrozen, remaining, release, clear, clearAll,
        getActive: () => [...frozen].map(([character, record]) => ({ eventId: character.eventId?.() ?? null, remaining: record.remaining, owners: Object.fromEntries(record.totals) })),
        getStats: () => ({ ...stats, active: frozen.size })
    });
})();
