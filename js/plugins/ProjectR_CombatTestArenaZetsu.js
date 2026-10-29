/*:
 * @target MZ
 * @plugindesc v1.0.0 DEV専用 Combat Test Arena 追加: 絶(Zetsu)テスト開始(Playtest限定)。
 * @author ProjectR
 * @base ProjectR_CombatTestArena
 * @base ProjectR_HermesZetsu
 * @orderAfter ProjectR_CombatTestArena
 * @orderAfter ProjectR_HermesZetsu
 *
 * @help
 * ProjectR_CombatTestArenaZetsu.js
 *
 * Playtest専用。F8のConsoleから使います(アリーナの固定APIは変えません)。
 *   ProjectRZetsuTest.start(level = 1)   アリーナでHermesテストを始め、手札5枚すべてを「絶」にして再開始する
 *                                        (複数コピーの二重発動・二重強化がないことを手で確認するため)。
 *   ProjectRZetsuTest.setLevel(level)    絶の所持データのレベルを 1〜3 にする(戦闘中でも反映)。
 *   ProjectRZetsuTest.status()           手札・レベル・強化・速度係数・カットイン・VFXの現在値(読み取り)
 *   ProjectRZetsuTest.end()              アリーナのテストを終了(所持データは開始前へ戻る)
 *
 * 本番のデッキ検証(30枚・コピー上限)は変更しません。開始の一瞬だけ、アリーナと同じ方法で
 * 登録済みの定義のmaxCopiesを差し替えて startCardBattle() を呼び、直後に必ず元へ戻します(try/finally)。
 * 本番の初期30枚デッキは、Hermes 7枚がすべて実装されるまで有効にしません(ProjectRCardCatalog.isFinalDeckReady)。
 * テスト中にセーブしないでください(開発用のNew Gameで使う想定)。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;
    const CARD = "hermes_zetsu";
    const ZETSU_IN_HAND = 5;
    const DECK_SIZE = 30;

    const deck = () => root.ProjectRCardDeck;
    const arena = () => root.ProjectRCombatTestArena;
    const fail = reason => ({ ok: false, reason });

    // 引き順: 最初の5枚(手札)を全部「絶」、以降はアリーナの7枚を繰り返す。
    const sequence = () => {
        const rest = arena().DRAW_SEQUENCE;
        const order = [];
        for (let i = 0; i < ZETSU_IN_HAND; i++) order.push(CARD);
        for (let i = 0; order.length < DECK_SIZE; i++) order.push(rest[i % rest.length]);
        return order;
    };

    const setLevel = level => {
        const d = deck();
        const result = d?.setCardLevel(CARD, level);
        return result?.ok ? { ok: true, level: root.ProjectRHermesZetsu.cardLevel() } : fail("cardUnavailable");
    };

    const start = (level = 1) => {
        const d = deck(), a = arena();
        if (!d || !a || !root.ProjectRHermesZetsu) return fail("pluginsUnavailable");
        if (!a.status().cardBattleActive) {
            const started = a.startHermes();
            if (!started.ok) return fail(started.reason || "arenaStartFailed");
        }
        // 絶を所持にし、レベルを設定(アリーナの終了時に開始前の所持データへ戻る)
        const owned = d.setCardOwned(CARD, true);
        if (!owned.ok) return fail("cardUnavailable");
        setLevel(level);
        const order = sequence();
        const cardIds = [...order].reverse(); // 山札は末尾から引く
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
        return { ok: true, level: root.ProjectRHermesZetsu.cardLevel(), hand: d.getBattleState().hand.map(card => card.cardId) };
    };

    const status = () => {
        const d = deck();
        const state = d?.getBattleState?.() || null;
        return {
            cardBattleActive: !!d?.isCardBattleActive?.(),
            level: root.ProjectRHermesZetsu?.cardLevel?.() ?? null,
            hand: state ? state.hand.map(card => card.cardId) : [],
            counts: state ? { draw: state.drawPile.length, discard: state.discardPile.length, cooldown: state.cooldownPile.length } : null,
            bonus: root.ProjectRCardModifiers?.getWeaponHitBonus?.() ?? null,
            speedFactor: root.ProjectRCardModifiers?.moveSpeedFactor?.() ?? 1,
            cutIn: root.ProjectRCutIn?.getActive?.() ?? [],
            vfx: root.ProjectRPresentationVfx?.diagnostics?.() ?? null,
            last: root.ProjectRHermesZetsu?.getLastResult?.() ?? null
        };
    };

    root.ProjectRZetsuTest = Object.freeze({
        start, setLevel, status,
        end: () => arena()?.endTest?.() ?? fail("arenaUnavailable")
    });
})();
