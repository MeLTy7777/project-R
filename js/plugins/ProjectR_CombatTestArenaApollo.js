/*:
 * @target MZ
 * @plugindesc v1.2.0 DEV専用 Combat Test Arena 追加: 新Apollo 8枚(黄金の矢・エロスの矢・ギガース殺しなど)のテスト開始(Playtest限定)。
 * @author ProjectR
 * @base ProjectR_CombatTestArena
 * @base ProjectR_ApolloGoldenVolley
 * @orderAfter ProjectR_CombatTestArenaHermesB1
 *
 * @help
 * ProjectR_CombatTestArenaApollo.js
 *
 * Playtest専用。F8のConsoleから使います(アリーナの固定APIは変えません)。
 *   ProjectRApolloTest.start(level = 1, card = "golden")  Apolloの指輪を持ち、アリーナでテストを始め、手札5枚すべてをそのカードにして再開始する。card = "golden"(黄金の矢) / "eros"(エロスの矢。Lv1だけ)
 *   ProjectRApolloTest.setLevel(level)   黄金の矢の所持データのレベル 1〜3(戦闘中でも反映。Lv3は11本の扇。長押しのビームは未実装で、長押しで離すと「未実装」表示のまま失敗)
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
    const CARDS = Object.freeze({ golden: "apollo_golden_volley", eros: "apollo_eros_arrow", gigas: "apollo_gigas_slayer", hyacinthus: "apollo_hyacinthus", plague: "apollo_plague_rain",
        laurel: "apollo_laurel_wreath", lyre: "apollo_lyre_rhythm", oracle: "apollo_oracle" });
    // カードごとのAPI(Phase A7。まだ読み込まれていないカードは undefined → start は pluginsUnavailable)
    const APIS = Object.freeze({ apollo_golden_volley: "ProjectRApolloGoldenVolley", apollo_eros_arrow: "ProjectRApolloErosArrow", apollo_gigas_slayer: "ProjectRApolloGigasSlayer",
        apollo_hyacinthus: "ProjectRApolloHyacinthus", apollo_plague_rain: "ProjectRApolloPlagueRain", apollo_laurel_wreath: "ProjectRApolloLaurelWreath", apollo_lyre_rhythm: "ProjectRApolloLyreRhythm", apollo_oracle: "ProjectRApolloOracle" });
    let CARD = CARDS.golden; // 現在のテストのカード(start で選ぶ)
    const DECK_SIZE = 30;
    const deck = () => root.ProjectRCardDeck;
    const arena = () => root.ProjectRCombatTestArena;
    const volley = () => root[APIS[CARD]];
    const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });
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
        return result?.ok ? { ok: true, level: volley()?.cardLevel?.() ?? level } : fail("cardUnavailable");
    };
    const start = (level = 1, card = "golden") => {
        const d = deck(), a = arena();
        if (!Object.prototype.hasOwnProperty.call(CARDS, card)) return fail("unknownCard");
        CARD = CARDS[card];
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
        return { ok: true, card: CARD, level: volley().cardLevel?.() ?? 1, hand: d.getBattleState().hand.map(c => c.cardId) };
    };
    const status = () => {
        const d = deck(), state = d?.getBattleState?.() || null, v = volley();
        return {
            cardBattleActive: !!d?.isCardBattleActive?.(),
            level: v?.cardLevel?.() ?? null,
            hand: state ? state.hand.map(card => card.cardId) : [],
            counts: state ? { draw: state.drawPile.length, discard: state.discardPile.length, cooldown: state.cooldownPile.length } : null,
            card: CARD, pending: v?.getPending?.() ?? null, arrows: v?.getActiveArrows?.() ?? [], slips: v?.getActiveSlips?.() ?? [],
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
    // ===== Phase A13: 指輪・30枚デッキの統合確認(Playtest専用) =====
    // 本番の取得経路(指輪の入手・初期セットの付与)は一切変えない。ここは、開発者がConsoleから「Apolloの指輪を持った」状態を一時的に作り、
    // 本物のデッキ(Core)・所持枚数(CardInventory)・デッキ構築画面・手札/Cooldown/捨て札・セーブの形で確かめるための入口。
    // 変えるのは $gameSystem の2か所(_projectRCardDeckData / _projectRCardInventory)だけで、最初の変更の前に控えを取り、reset() で必ず元へ戻す。
    // テスト中にセーブしないこと(セーブする場合は使い捨てのフォルダだけ。保護された5つのセーブは絶対に上書きしない)。isDirty() で控えが残っているか分かる。
    const SAVE_KEYS = ["_projectRCardDeckData", "_projectRCardInventory"];
    const REWARD = "dev.a13";
    let kept = null;
    const gameSystem = () => (typeof $gameSystem !== "undefined" ? $gameSystem : null);
    const keep = () => {
        const s = gameSystem();
        if (!s || kept) return;
        kept = {};
        for (const key of SAVE_KEYS) kept[key] = s[key] === undefined ? null : JSON.stringify(s[key]);
    };
    const catalog = () => root.ProjectRCardCatalog;
    const inventory = () => root.ProjectRCardInventory;
    const godRows = god => catalog()?.godDesign?.(god) ?? [];
    const ringOf = god => catalog()?.godStatus?.(god)?.ringId ?? null;
    const grantRing = (god = "apollo") => {
        const d = deck(), ring = ringOf(god);
        if (!d || !ring) return fail("ringUnavailable");
        keep();
        const result = d.assignRingToPlayer(ring);
        return result?.ok ? { ok: true, ring, owner: d.getRingOwner(ring) } : fail("ringTransferRefused", { reasons: result?.reasons });
    };
    const revokeRing = (god = "apollo") => {
        const d = deck(), ring = ringOf(god);
        if (!d || !ring) return fail("ringUnavailable");
        keep();
        const result = d.setRingUnowned(ring);
        return result?.ok ? { ok: true, ring, owner: d.getRingOwner(ring) } : fail("ringTransferRefused", { reasons: result?.reasons });
    };
    // その神の全カードを、コピー上限ぶん所持(CardInventory)・解放(Core)・指定のLevelにする。デッキは変えない。
    const unlock = (level = 3, gods = ["apollo"]) => {
        const d = deck(), inv = inventory();
        if (!d || !inv) return fail("pluginsUnavailable");
        keep();
        const granted = {};
        for (const god of gods) {
            const bundle = {};
            for (const row of godRows(god)) {
                if (!row.runtimeCardId || !row.implemented) continue;
                if (!d.setCardOwned(row.runtimeCardId, true).ok) return fail("cardUnavailable", { cardId: row.runtimeCardId });
                d.setCardLevel(row.runtimeCardId, level);
                bundle[row.runtimeCardId] = row.maxCopies;
            }
            const result = inv.grantBundle(`${REWARD}.${god}`, bundle, { source: "dev", mode: "topUp" });
            if (!result?.ok && result?.code !== "REWARD_ALREADY_GRANTED") return fail("grantRefused", { god, result });
            granted[god] = Object.keys(bundle).length;
        }
        return { ok: true, level, granted };
    };
    const countBy = ids => { const counts = {}; for (const id of ids) counts[id] = (counts[id] || 0) + 1; return counts; };
    const deckInfo = () => {
        const d = deck(), inv = inventory();
        const ids = d?.getDeck?.() ?? [];
        return {
            deck: ids, size: ids.length, counts: countBy(ids),
            valid: !!d?.isDeckValid?.(ids), reasons: (d?.getDeckInvalidReasons?.(ids) ?? []).map(r => r.code + (r.cardId ? ":" + r.cardId : "")),
            inventoryReasons: (inv?.validateDeck?.(ids) ?? []).map(r => r.code + (r.cardId ? ":" + r.cardId : "")),
            rings: { apollo: d?.getRingOwner?.(ringOf("apollo")) ?? null, hermes: d?.getRingOwner?.(ringOf("hermes")) ?? null },
            battleActive: !!d?.isCardBattleActive?.()
        };
    };
    // 神の30枚の参考一覧(ProjectRCardCatalog.buildGodDeck)を装備する。検証はCoreとCardInventoryの結果をそのまま返す(自動では直さない)。
    const buildDeck = (god = "apollo") => {
        const d = deck(), ids = catalog()?.buildGodDeck?.(god);
        if (!d || !ids) return fail("deckUnavailable");
        keep();
        const result = d.setDeck(ids);
        return { ok: !!result?.ok, ...deckInfo() };
    };
    // 2つの指輪を持った混成デッキ: 各神の30枚の一覧から1枚おきに15枚ずつ(各カードのコピー上限・所持枚数の範囲内)。
    const buildMixedDeck = () => {
        const d = deck(), a = catalog()?.buildGodDeck?.("apollo"), h = catalog()?.buildGodDeck?.("hermes");
        if (!d || !a || !h) return fail("deckUnavailable");
        keep();
        const ids = [...h.filter((_, i) => i % 2 === 0), ...a.filter((_, i) => i % 2 === 0)];
        const result = d.setDeck(ids);
        return { ok: !!result?.ok, ...deckInfo() };
    };
    const sceneName = () => (typeof SceneManager !== "undefined" && SceneManager._scene ? SceneManager._scene.constructor.name : null);
    const openDeckBuilder = () => { const m = root.ProjectRMenuIntegration; if (!m?.openDeckBuilder) return fail("menuUnavailable"); m.openDeckBuilder(); return { ok: true }; };
    const closeScene = () => { if (typeof SceneManager !== "undefined" && sceneName() !== "Scene_Map") { SceneManager.pop(); return { ok: true }; } return fail("noSubScene"); };
    // 装備したデッキで、本物の山札・手札・Cooldown・捨て札の戦闘を始める(手札の並びは変えない。山札はCoreの本物のシャッフル)。
    //   useArena = true(既定): アリーナ(ダミーの敵・HUD)を始めてから、装備のデッキで戦闘を始め直す。**アリーナの開始は両方の指輪を主人公へ渡す**(アリーナの仕様)ので、
    //   指輪の有無による拒否はこの経路では確かめられない。useArena = false: アリーナを使わず、Coreへ装備のデッキでそのまま戦闘の開始を求める(指輪・所持の検証がそのまま効く)。
    const startDeckBattle = (useArena = true) => {
        const d = deck(), a = arena();
        if (!d || !a) return fail("pluginsUnavailable");
        if (useArena === false) {
            const direct = d.startCardBattle();
            return direct.ok ? { ok: true, hand: d.getBattleState().hand.map(c => c.cardId), counts: { draw: d.getBattleState().drawPile.length } } : fail("battleStartFailed", { reasons: (direct.reasons || []).map(r => r.code) });
        }
        const equipped = [...d.getDeck()];
        let startedArena = false;
        if (!a.status().cardBattleActive) {
            const started = a.startHermes();
            if (!started.ok) return fail(started.reason || "arenaStartFailed");
            startedArena = true;
        }
        d.setDeck(equipped); // アリーナの開始が差し替えたデッキを、装備していたデッキへ戻す
        const result = d.startCardBattle();
        if (!result.ok) {
            if (startedArena) { try { a.endTest(); } catch (_error) { /* DEV用 */ } } // このデッキでは戦闘を始められない: 入口が始めたアリーナも終える
            return fail("battleStartFailed", { reasons: (result.reasons || []).map(r => r.code) });
        }
        return { ok: true, hand: d.getBattleState().hand.map(c => c.cardId), counts: { draw: d.getBattleState().drawPile.length } };
    };
    // 手札の最初の cardId を、本物の使用経路(requestUseCard)で使う。
    const useCard = cardId => {
        const d = deck();
        if (!d?.isCardBattleActive?.()) return fail("battleInactive");
        const index = d.getBattleState().hand.findIndex(c => c.cardId === cardId);
        if (index < 0) return fail("notInHand");
        return { ...d.requestUseCard(index), index };
    };
    const isDirty = () => !!kept;
    // 一時データを元へ戻す: 戦闘があれば終え、2か所の控えを書き戻す(指輪・所持・解放・Level・デッキ・CardInventoryの付与記録がすべて元の値になる)。
    const reset = () => {
        const d = deck(), s = gameSystem();
        try { if (d?.isCardBattleActive?.()) arena()?.endTest?.(); } catch (_error) { /* DEV用 */ }
        try { d?.endCardBattle?.(); } catch (_error) { /* DEV用 */ }
        if (kept && s) {
            for (const key of SAVE_KEYS) { if (kept[key] === null) delete s[key]; else s[key] = JSON.parse(kept[key]); }
        }
        const restored = !!kept;
        kept = null; grantedRing = false; returnRing = false;
        return { ok: true, restored };
    };
    root.ProjectRApolloTest = Object.freeze({ start, setLevel, status, end,
        grantRing, revokeRing, unlock, buildDeck, buildMixedDeck, deckInfo, openDeckBuilder, closeScene, sceneName, startDeckBattle, useCard, isDirty, reset });
})();
