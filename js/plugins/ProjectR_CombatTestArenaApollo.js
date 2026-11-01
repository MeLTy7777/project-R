/*:
 * @target MZ
 * @plugindesc v1.0.0 DEV専用 Combat Test Arena 追加: 黄金の矢(apollo_golden_volley)のテスト開始(Playtest限定)。
 * @author ProjectR
 * @base ProjectR_CombatTestArena
 * @base ProjectR_ApolloGoldenVolley
 * @orderAfter ProjectR_CombatTestArenaHermesB1
 *
 * @help
 * ProjectR_CombatTestArenaApollo.js
 *
 * Playtest専用。F8のConsoleから使います(アリーナの固定APIは変えません)。
 *   ProjectRApolloTest.start(level = 1)  Apolloの指輪を持ち、アリーナでテストを始め、手札5枚すべてを黄金の矢にして再開始する。
 *   ProjectRApolloTest.setLevel(level)   所持データのレベル 1〜3(戦闘中でも反映。Lv3は11本の扇。長押しのビームは未実装で、長押しで離すと「未実装」表示のまま失敗)
 *   ProjectRApolloTest.status()          手札・Lv・確定待ち・飛んでいる矢・スリップ・直近の結果(読み取り)
 *   ProjectRApolloTest.end()             アリーナのテストを終了(所持データと、この入口が渡したApolloの指輪は開始前へ戻る)
 *
 * 本番の初期デッキ・取得の経路は変えません。開始の一瞬だけ、アリーナと同じ方法で登録済みの定義のmaxCopiesを差し替えて
 * startCardBattle() を呼び、直後に必ず元へ戻します(try/finally)。Apolloの指輪の入手(物語イベント・初期セットの付与)は未実装なので、
 * このDEV用の入口でだけ、戦闘の外で主人公へ指輪を渡します。テスト中にセーブしないでください(開発用のNew Gameで使う想定)。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;
    const CARD = "apollo_golden_volley";
    const DECK_SIZE = 30;
    const deck = () => root.ProjectRCardDeck;
    const arena = () => root.ProjectRCombatTestArena;
    const volley = () => root.ProjectRApolloGoldenVolley;
    const fail = reason => ({ ok: false, reason });
    let grantedRing = false; // このDEVの入口が渡した指輪(戦闘の余韻が明けたら返す)
    let returnRing = false;

    const sequence = () => {
        const rest = arena().DRAW_SEQUENCE;
        const order = [];
        for (let i = 0; i < 5; i++) order.push(CARD);
        for (let i = 0; order.length < DECK_SIZE; i++) order.push(rest[i % rest.length]);
        return order;
    };
    const setLevel = level => {
        const result = deck()?.setCardLevel(CARD, level);
        return result?.ok ? { ok: true, level: volley()?.cardLevel?.() } : fail("cardUnavailable");
    };
    const start = (level = 1) => {
        const d = deck(), a = arena();
        if (!d || !a || !volley()) return fail("pluginsUnavailable");
        if (!a.status().cardBattleActive) {
            // 指輪の譲渡は戦闘の外だけ可能。Apolloの指輪をDEV用に渡す(アリーナの終了で開始前の所持データへ戻る)。
            if (!d.hasPlayerRing("apollo")) {
                const ring = d.assignRingToPlayer("apollo");
                if (!ring?.ok) return fail("ringUnavailable");
                grantedRing = true;
            }
            const started = a.startHermes();
            if (!started.ok) return fail(started.reason || "arenaStartFailed");
        } else if (!d.hasPlayerRing("apollo")) return fail("ringUnavailable");
        if (!d.setCardOwned(CARD, true).ok) return fail("cardUnavailable");
        setLevel(level);
        const cardIds = [...sequence()].reverse(); // 山札は末尾から引く
        const counts = new Map();
        for (const id of cardIds) counts.set(id, (counts.get(id) || 0) + 1);
        const registry = d.definitions.cards;
        const originals = new Map();
        const realRandom = Math.random;
        try {
            for (const [id, count] of counts) {
                const original = registry.get(id);
                if (!original) return fail("cardDefinitionMissing");
                originals.set(id, original);
                registry.set(id, Object.freeze({ ...original, maxCopies: Math.max(original.maxCopies, count) }));
            }
            Math.random = () => 1 - Number.EPSILON; // シャッフルしない
            const result = d.startCardBattle(cardIds);
            if (!result.ok) return fail("battleStartFailed");
        } finally {
            Math.random = realRandom;
            for (const [id, original] of originals) registry.set(id, original);
        }
        return { ok: true, card: CARD, level: volley().cardLevel(), hand: d.getBattleState().hand.map(c => c.cardId) };
    };
    const status = () => {
        const d = deck(), state = d?.getBattleState?.() || null, v = volley();
        return {
            cardBattleActive: !!d?.isCardBattleActive?.(),
            level: v?.cardLevel?.() ?? null,
            hand: state ? state.hand.map(card => card.cardId) : [],
            counts: state ? { draw: state.drawPile.length, discard: state.discardPile.length, cooldown: state.cooldownPile.length } : null,
            pending: v?.getPending?.() ?? null, arrows: v?.getActiveArrows?.() ?? [], slips: v?.getActiveSlips?.() ?? [],
            last: v?.getLastResult?.() ?? null, beamAttempts: v?.getBeamAttempts?.() ?? [], press: root.ProjectRCardBattleInput?.getPressSessions?.() ?? [],
            cutIn: root.ProjectRCutIn?.getActive?.() ?? [], vfx: root.ProjectRPresentationVfx?.diagnostics?.() ?? null
        };
    };
    const end = () => {
        const result = arena()?.endTest?.() ?? fail("arenaUnavailable");
        // アリーナが戻すのは戦闘の開始時点の所持データ。この入口が戦闘の前に渡したApolloの指輪は、戦闘の余韻(CombatPresenceの終了猶予)が明けて
        // 指輪の譲渡ができるようになったら、次のマップ更新で返す。
        if (grantedRing) returnRing = true;
        return result;
    };
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!returnRing || !sceneActive || !deck() || deck().isCardBattleActive()) return;
        try {
            if (deck().setRingUnowned("apollo")?.ok) { grantedRing = false; returnRing = false; }
        } catch (_error) { /* DEV用。次の更新で再試行 */ }
    };
    root.ProjectRApolloTest = Object.freeze({ start, setLevel, status, end });
})();
