/*:
 * @target MZ
 * @plugindesc v1.0.0 DEV専用 Combat Test Arena 追加: 薙ぎ払い・葦笛・絶のテスト開始(Playtest限定)。
 * @author ProjectR
 * @base ProjectR_CombatTestArena
 * @base ProjectR_HermesSweep
 * @base ProjectR_HermesReedFlute
 * @base ProjectR_HermesZetsu
 * @orderAfter ProjectR_CombatTestArenaZetsu
 *
 * @help
 * ProjectR_CombatTestArenaHermesB1.js
 *
 * Playtest専用。F8のConsoleから使います(アリーナの固定APIは変えません)。
 *   ProjectRHermesTest.start(card, level = 1)   card = "sweep" | "flute" | "zetsu"(または runtime cardId)。
 *                                               アリーナでHermesテストを始め、手札5枚すべてをそのカードにして再開始する。
 *   ProjectRHermesTest.setLevel(card, level)    所持データのレベル 1〜3(戦闘中でも反映)
 *   ProjectRHermesTest.status()                 手札・Lv・山札の枚数・直近の結果・睡眠中の敵・ヒットログ(読み取り)
 *   ProjectRHermesTest.end()                    アリーナのテストを終了(所持データは開始前へ戻る)
 *
 * 本番のデッキ検証(30枚・コピー上限)は変更しません。開始の一瞬だけ、アリーナと同じ方法で登録済みの定義のmaxCopiesを
 * 差し替えて startCardBattle() を呼び、直後に必ず元へ戻します(try/finally)。本番の初期30枚デッキは、Hermes 7枚がすべて
 * 実装されるまで有効にしません(ProjectRCardCatalog.isFinalDeckReady)。テスト中にセーブしないでください(開発用のNew Gameで使う想定)。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;
    const DECK_SIZE = 30;
    const CARDS = Object.freeze({
        sweep: { id: "hermes_sweep", api: () => root.ProjectRHermesSweep },
        flute: { id: "hermes_reed_flute", api: () => root.ProjectRHermesReedFlute },
        zetsu: { id: "hermes_zetsu", api: () => root.ProjectRHermesZetsu }
    });
    const deck = () => root.ProjectRCardDeck;
    const arena = () => root.ProjectRCombatTestArena;
    const fail = reason => ({ ok: false, reason });
    const resolveCard = card => CARDS[card] || Object.values(CARDS).find(entry => entry.id === card) || null;

    const sequence = id => {
        const rest = arena().DRAW_SEQUENCE;
        const order = [];
        for (let i = 0; i < 5; i++) order.push(id);
        for (let i = 0; order.length < DECK_SIZE; i++) order.push(rest[i % rest.length]);
        return order;
    };

    const setLevel = (card, level) => {
        const entry = resolveCard(card), d = deck();
        if (!entry || !d) return fail("cardUnavailable");
        const result = d.setCardLevel(entry.id, level);
        return result?.ok ? { ok: true, level: entry.api()?.cardLevel?.() } : fail("cardUnavailable");
    };

    const start = (card, level = 1) => {
        const entry = resolveCard(card), d = deck(), a = arena();
        if (!entry || !d || !a || !entry.api()) return fail("pluginsUnavailable");
        if (!a.status().cardBattleActive) {
            const started = a.startHermes();
            if (!started.ok) return fail(started.reason || "arenaStartFailed");
        }
        // 対象のカードを所持にし、レベルを設定(アリーナの終了時に開始前の所持データへ戻る)
        if (!d.setCardOwned(entry.id, true).ok) return fail("cardUnavailable");
        setLevel(entry.id, level);
        const cardIds = [...sequence(entry.id)].reverse(); // 山札は末尾から引く
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
        return { ok: true, card: entry.id, level: entry.api().cardLevel(), hand: d.getBattleState().hand.map(c => c.cardId) };
    };

    const status = () => {
        const d = deck();
        const state = d?.getBattleState?.() || null;
        return {
            cardBattleActive: !!d?.isCardBattleActive?.(),
            levels: Object.fromEntries(Object.entries(CARDS).map(([name, entry]) => [name, entry.api()?.cardLevel?.() ?? null])),
            hand: state ? state.hand.map(card => card.cardId) : [],
            counts: state ? { draw: state.drawPile.length, discard: state.discardPile.length, cooldown: state.cooldownPile.length } : null,
            last: { sweep: root.ProjectRHermesSweep?.getLastResult?.() ?? null, flute: root.ProjectRHermesReedFlute?.getLastResult?.() ?? null,
                zetsu: root.ProjectRHermesZetsu?.getLastResult?.() ?? null },
            sleepers: root.ProjectRHermesReedFlute?.getSleepers?.() ?? [],
            hits: root.ProjectRCardModifiers?.getWeaponHitLog?.() ?? [],
            cutIn: root.ProjectRCutIn?.getActive?.() ?? [],
            vfx: root.ProjectRPresentationVfx?.diagnostics?.() ?? null
        };
    };

    root.ProjectRHermesTest = Object.freeze({
        start, setLevel, status,
        end: () => arena()?.endTest?.() ?? fail("arenaUnavailable")
    });
})();
