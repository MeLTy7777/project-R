/*:
 * @target MZ
 * @plugindesc v1.0.0 DEV専用: Hermes本番デッキ(H2C-A)の検証用ヘルパー(新しいゲームの再現・セーブ/ロードの往復・指輪の譲渡先の一時設定)。Playtest限定。
 * @author ProjectR
 * @base ProjectR_HermesProductionDeck
 * @orderAfter ProjectR_CombatTestArenaPsychopomp
 *
 * @help
 * ProjectR_CombatTestArenaProduction.js
 *
 * Playtest専用。F8のConsoleから使います。ゲームのファイルは書き換えません(メモリ上だけ。セーブスロットには書きません)。
 *   ProjectRProductionTest.freshGame()          メモリ上を「新しいゲーム」に戻す(DataManager.setupNewGame + マップ再入場)。セーブは触らない
 *   ProjectRProductionTest.roundTrip()          現在の状態を JsonEx で文字列にして読み戻す(セーブ→ロードの往復。ファイルは作らない)
 *   ProjectRProductionTest.allowAlly(actorId)   Hermesの指輪を actorId の仲間へ渡せるよう、メモリ上の定義を一時的に変える(製品では空)
 *   ProjectRProductionTest.restoreRings()       上で変えた指輪の定義を元に戻す
 *   ProjectRProductionTest.legacyOwner()        旧セーブ(旧カードと指輪を所持)の状態をメモリ上に作る
 *   ProjectRProductionTest.report()             ProjectRHermesProductionDeck.diagnose() の結果
 * 製品の入手の入口は、イベントのプラグインコマンド「ヘルメースの指輪を入手する」(ProjectR_HermesProductionDeck)です。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;

    const originalRings = new Map();
    const production = () => root.ProjectRHermesProductionDeck;
    const deck = () => root.ProjectRCardDeck;

    const freshGame = () => {
        deck().endBattle();
        DataManager.setupNewGame();
        if (typeof SceneManager !== "undefined" && typeof Scene_Map !== "undefined") SceneManager.goto(Scene_Map);
        return { ok: true, owner: deck().getRingOwner("hermes"), granted: production().hasGranted() };
    };
    const roundTrip = () => {
        const json = JsonEx.stringify(DataManager.makeSaveContents());
        const contents = JsonEx.parse(json);
        DataManager.extractSaveContents(contents);
        // 本物のロードと同じく、読み込み後はScene_Mapへ入り直す(JsonExはSetを戻さないため、マップの内部状態はScene_Map開始で作り直される)。
        if (typeof SceneManager !== "undefined" && typeof Scene_Map !== "undefined") SceneManager.goto(Scene_Map);
        return { ok: true, bytes: json.length, owner: deck().getRingOwner("hermes"), granted: production().hasGranted() };
    };
    const allowAlly = actorId => {
        const ring = deck().definitions.ring("hermes");
        if (!originalRings.has("hermes")) originalRings.set("hermes", ring);
        deck().definitions.rings.set("hermes", Object.freeze({ ...ring, equipActorIds: Object.freeze([Number(actorId)]) }));
        return deck().definitions.ring("hermes").equipActorIds.slice();
    };
    const restoreRings = () => {
        for (const [id, ring] of originalRings) deck().definitions.rings.set(id, ring);
        originalRings.clear();
        return deck().definitions.ring("hermes").equipActorIds.slice();
    };
    // 旧セーブの再現: 旧7枚(Hermes 4種 + Apollo 3種)の最大コピー(3+2+3+3+3+2+3 = 19枚)を持ち、その19枚を保存デッキにしている状態。
    // 旧カードだけでは30枚に届かない(これが旧セーブの実際の姿)。自動では直さない。
    const LEGACY_DECK = Object.freeze([
        ["hermes_swift_movement", 3], ["hermes_reed_flute_sleep", 2], ["hermes_perception_obscure", 3], ["hermes_sword_attack", 3],
        ["apollo_golden_arrow", 3], ["apollo_plague_attack", 2], ["apollo_lyre_calm", 3]
    ]);
    const legacyOwner = () => {
        const d = deck();
        d.assignRingToPlayer("hermes");
        d.assignRingToPlayer("apollo");
        const ids = [];
        for (const [id, copies] of LEGACY_DECK) {
            d.setCardOwned(id, true);
            d.setCardLevel(id, 2);
            for (let i = 0; i < copies; i++) ids.push(id);
        }
        d.setDeck(ids);
        return { ok: true, owner: d.getRingOwner("hermes"), granted: production().hasGranted(), deck: d.getDeck().length };
    };

    root.ProjectRProductionTest = Object.freeze({ freshGame, roundTrip, allowAlly, restoreRings, legacyOwner, report: () => production().diagnose() });
})();
