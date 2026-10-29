/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 敵の標的選択の適格性(秘匿): 敵が味方を「標的にできるか」を1か所で決め、Hendrixの検知・キャッシュに接続する。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @orderAfter Hendrix_Action_Engine
 *
 * @param HostileTag
 * @text 敵Eventのnotetag
 * @desc この文字列をnoteに含むEventを「敵(標的を選ぶ側)」として扱う。味方・NPCが味方を検知する処理は妨げない。
 * @type string
 * @default <enemy>
 *
 * @help
 * ProjectR_TargetEligibility.js
 *
 * 【役割】 「このキャラクターは今、敵の標的になれるか」を、カード等が登録した秘匿の条件から1か所で答えます(ヴェイルが使う)。
 *   無敵ではありません。ダメージ・衝突・環境ダメージ・すでに出た攻撃は変えません。標的の選択だけを止めます。
 *
 * 【Hendrix(Action Combat 1.6.6b)の敵AIの調べた結果】
 *   公式の敵は、Eventページの「Range Detection」(= Game_System.checkInRange / window.checkRange)で標的を探し、
 *   見つけた標的を event._detectedEvent に覚え、その後 moveToClosest('detected event') / moveToPosition('detected event') で追う。
 *   標的を自動で選ぶ共通のAIは無く、各Eventのページがその部品を組み合わせる。このPluginはその部品の出入口に接続する:
 *     1. checkInRange   : 敵が target="player" を探すとき、秘匿中ならfalse(見つけたことにしない)。_detectedEvent も外す。
 *                         敵が notetag(<npc> 等)の味方を探すときは、秘匿中の候補を除いた中から最寄りを選ぶ。
 *     2. moveToClosest / moveToPosition : 'detected event' が秘匿中なら、古い覚えを捨ててから動く(動かない)。
 *     3. getLockedTarget : 敵Eventがロックしている標的が秘匿中なら外す。
 *     4. 毎フレーム(Game_Map.update): 敵の _detectedEvent / lockInTarget が秘匿中なら外す(古いキャッシュで追い続けない)。
 *   秘匿が終われば、次の検知でまた標的にできる(再取得)。Hendrix本体は一切書き換えません。
 *   findTargets('player') / UpdateEventHp / 衝突の判定は変えません(ダメージを受ける側は変わらない)。
 *
 * 【製品の敵AIについて】 製品用の共通敵AIはまだありません(各マップのEventページ次第)。このPluginは
 *   「Hendrixの検知部品を使う敵」には自動で効きます。検証済みの範囲はドキュメント(ProjectR_HermesB3A.md)に分けて記録しています。
 *
 * API: ProjectRTargetEligibility
 *   registerConcealment(id, predicate(character, seeker) => boolean) / unregisterConcealment(id) / concealmentIds()
 *   isHostile(seeker)                    敵として標的を選ぶ側か(seeker未指定は敵として扱う)
 *   isConcealed(character, seeker?)      seekerが敵のとき、characterが秘匿中か
 *   isEligibleTarget(seeker, character)  標的にできるか(= !isConcealed)
 *   filterEligible(seeker, list)         標的にできるものだけ
 *   sweep()                              敵の古いキャッシュを今すぐ外す(毎フレーム自動)
 *   diagnostics()                        { suppressedChecks, clearedCaches, filteredCandidates }
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_TargetEligibility") : {};
    const HOSTILE_TAG = String(params.HostileTag || "<enemy>");

    const concealments = new Map(); // id -> predicate
    const stats = { suppressedChecks: 0, clearedCaches: 0, filteredCandidates: 0, errors: 0 };

    const registerConcealment = (id, predicate) => {
        if (!String(id ?? "") || typeof predicate !== "function") return false;
        concealments.set(String(id), predicate);
        return true;
    };
    const unregisterConcealment = id => concealments.delete(String(id));

    const isHostile = seeker => {
        if (seeker === undefined || seeker === null) return true;
        if (typeof $gamePlayer !== "undefined" && seeker === $gamePlayer) return false;
        const note = typeof seeker.event === "function" ? seeker.event()?.note : null;
        return typeof note === "string" && note.includes(HOSTILE_TAG);
    };
    const isConcealed = (character, seeker) => {
        if (!character || !concealments.size || !isHostile(seeker)) return false;
        for (const predicate of concealments.values()) {
            try { if (predicate(character, seeker) === true) return true; } catch (_error) { stats.errors++; }
        }
        return false;
    };
    const isEligibleTarget = (seeker, character) => !isConcealed(character, seeker);
    const filterEligible = (seeker, list) => (Array.isArray(list) ? list : []).filter(character => isEligibleTarget(seeker, character));

    // ---------- Hendrix への接続 ----------
    const seekerOf = (source, context) => {
        if (source === "player" || typeof $gameMap === "undefined" || !$gameMap) return null;
        try { return typeof root.findTarget === "function" ? root.findTarget(source, context) : null; } catch (_error) { return null; }
    };
    const forget = seeker => { if (seeker && seeker._detectedEvent) { seeker._detectedEvent = null; stats.clearedCaches++; } };

    const install = () => {
        const System = typeof Game_System !== "undefined" ? Game_System : null;
        if (System && typeof System.prototype.checkInRange === "function" && !System.prototype.checkInRange.__projectRTargetEligibility) {
            const original = System.prototype.checkInRange;
            const wrapped = function(source, range, target) {
                if (!concealments.size) return original.apply(this, arguments);
                const seeker = seekerOf(source, this);
                if (!seeker || !isHostile(seeker)) return original.apply(this, arguments);
                if (target === "player") {
                    const found = original.apply(this, arguments);
                    if (found && isConcealed($gamePlayer, seeker)) { forget(seeker); stats.suppressedChecks++; return false; }
                    return found;
                }
                if (typeof target === "string" && target !== "this" && target !== "passable" && !target.startsWith("region ")) {
                    // 味方のnotetag検索: 秘匿中の候補を除いた一覧で最寄りを選ばせる(一時的に索引を差し替えて、必ず戻す)。
                    const index = $gameMap.tagToEvents;
                    const list = (index && index.get(target)) || $gameMap.events().filter(event => event && event.event() && event.event().note.includes(target));
                    const eligible = list.filter(event => !isConcealed(event, seeker));
                    if (eligible.length !== list.length) {
                        stats.filteredCandidates += list.length - eligible.length;
                        if (seeker._detectedEvent && isConcealed(seeker._detectedEvent, seeker)) forget(seeker);
                        const hadIndex = !!index, had = hadIndex && index.has(target), previous = had ? index.get(target) : undefined;
                        const map = hadIndex ? index : ($gameMap.tagToEvents = new Map());
                        map.set(target, eligible);
                        try { return original.apply(this, arguments); } finally {
                            if (had) map.set(target, previous); else map.delete(target);
                            if (!hadIndex) delete $gameMap.tagToEvents;
                        }
                    }
                }
                return original.apply(this, arguments);
            };
            wrapped.__projectRTargetEligibility = true;
            System.prototype.checkInRange = wrapped;
        }
        const Character = typeof Game_Character !== "undefined" ? Game_Character : null;
        if (Character) {
            for (const name of ["moveToClosest", "moveToPosition"]) {
                const original = Character.prototype[name];
                if (typeof original !== "function" || original.__projectRTargetEligibility) continue;
                const wrapped = function() {
                    if (this._detectedEvent && concealments.size && isConcealed(this._detectedEvent, this)) forget(this);
                    return original.apply(this, arguments);
                };
                wrapped.__projectRTargetEligibility = true;
                Character.prototype[name] = wrapped;
            }
        }
        const Base = typeof Game_CharacterBase !== "undefined" ? Game_CharacterBase : null;
        if (Base && typeof Base.prototype.getLockedTarget === "function" && !Base.prototype.getLockedTarget.__projectRTargetEligibility) {
            const original = Base.prototype.getLockedTarget;
            const wrapped = function() {
                const target = original.apply(this, arguments);
                if (target && concealments.size && this !== $gamePlayer && isConcealed(target, this)) { this.lockInTarget = null; stats.clearedCaches++; return null; }
                return target;
            };
            wrapped.__projectRTargetEligibility = true;
            Base.prototype.getLockedTarget = wrapped;
        }
    };
    install();

    // 敵が覚えている古い標的を外す。次の検知で「普通の標的選択のルール」に従って選び直す。
    const sweep = () => {
        if (!concealments.size || typeof $gameMap === "undefined" || !$gameMap) return 0;
        let cleared = 0;
        for (const event of $gameMap.events()) {
            if (!event || event._erased || !isHostile(event)) continue;
            if (event._detectedEvent && isConcealed(event._detectedEvent, event)) { event._detectedEvent = null; cleared++; }
            if (event.lockInTarget && isConcealed(event.lockInTarget, event)) { event.lockInTarget = null; cleared++; }
        }
        stats.clearedCaches += cleared;
        return cleared;
    };
    if (typeof Game_Map !== "undefined") {
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            const result = _update.apply(this, arguments);
            if (sceneActive) { try { sweep(); } catch (_error) { stats.errors++; } }
            return result;
        };
    }

    root.ProjectRTargetEligibility = Object.freeze({
        registerConcealment, unregisterConcealment, concealmentIds: () => [...concealments.keys()],
        isHostile, isConcealed, isEligibleTarget, filterEligible, sweep,
        diagnostics: () => ({ ...stats, concealments: concealments.size, hostileTag: HOSTILE_TAG })
    });
})();
