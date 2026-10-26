/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR メニュー接続（SKILL=デッキ構築 / ULTIMATE=神の選択 / ITEM=所持品、戦闘中ロック、進行用プラグインコマンド）。
 * @author ProjectR
 * @base ProjectR_MenuHUD
 * @base ProjectR_MenuCore
 * @base ProjectR_DeckBuilder
 * @base ProjectR_UltimateSelect
 * @base ProjectR_Inventory
 * @orderAfter ProjectR_MenuHUD
 * @orderAfter ProjectR_DeckBuilder
 * @orderAfter ProjectR_UltimateSelect
 * @orderAfter ProjectR_RingParty
 * @orderAfter ProjectR_Inventory
 *
 * @command GrantCard
 * @text カードを入手させる
 * @desc カードを所持済みにします（デッキには入れません）。Levelを指定するとそのLevelにします（最大LevelはCardDefinition）。
 * @arg cardId
 * @text Card ID
 * @type string
 * @arg level
 * @text Level（0=変更しない）
 * @type number
 * @min 0
 * @default 0
 *
 * @command GrantRing
 * @text 指輪を主人公に入手させる
 * @desc 指輪を主人公の所持にします（戦闘中は失敗します）。
 * @arg ringId
 * @text Ring ID
 * @type string
 *
 * @command TransferRingToActor
 * @text 指輪を仲間に渡す
 * @desc 指輪を仲間へ渡します。1人1つ・対象限定・戦闘外のみ（判定はCardDeckCore）。
 * @arg ringId
 * @text Ring ID
 * @type string
 * @arg actorId
 * @text 仲間のActor ID
 * @type actor
 *
 * @command ReturnRingToPlayer
 * @text 指輪を主人公へ戻す
 * @arg ringId
 * @text Ring ID
 * @type string
 *
 * @command SetUltimateGod
 * @text Ultimateの神を選ぶ
 * @desc 主人公が所持し、Ultimateが実装済みの指輪だけ選べます。戦闘中は失敗します。
 * @arg ringId
 * @text Ring ID
 * @type string
 *
 * @help
 * ProjectR_MenuIntegration.js
 *
 * ProjectR_MenuHUD の7コマンドのうち、次の3つを実画面へ接続します（SAVE/LOAD/SYSTEM/TITLEは従来どおり）。
 *   SKILL    → デッキ構築（ProjectR_DeckBuilder）
 *   ULTIMATE → 神の選択（ProjectR_UltimateSelect。Tabで指輪の管理）
 *   ITEM     → 所持品・装備の確認（ProjectR_Inventory）
 *
 * 【戦闘中のメニューのルール（最終）】
 *   明示的な戦闘イベント中（ProjectRCombatPresence.isCombatEventActive）、またはカード戦闘中は
 *   メニューを開けません。戦闘中にデッキ・Ultimate・指輪を変えることも、モデル側で拒否されます。
 *   戦闘を終えて（endCombatEvent / endCardBattle）からメニューを開いてください。
 *
 * 【進行用プラグインコマンド】
 *   カード・指輪の入手や譲渡をイベントから行うための窓口です（F8不要）。
 *   検証・上限・戦闘中拒否はすべてCardDeckCore側のルールに従います。
 *
 * API: ProjectRMenuIntegration
 *   openDeckBuilder() / openUltimateSelect() / openInventory()   Sceneを開く
 *   isMenuBlocked()                                              戦闘中ロック中か
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_MenuIntegration";
    const core = () => root.ProjectRMenuCore;
    const deck = () => root.ProjectRCardDeck;

    const hud = root.ProjectR?.MenuHUD || root.ProjectRMenuHUD || null;
    const scenes = () => ({
        skill: root.Scene_ProjectRDeckBuilder,
        ultimate: root.Scene_ProjectRUltimateSelect,
        item: root.Scene_ProjectRInventory
    });
    if (hud) {
        hud.commandScenes = hud.commandScenes || {};
        for (const [symbol, sceneClass] of Object.entries(scenes())) {
            if (sceneClass) hud.commandScenes[symbol] = sceneClass;
        }
    }

    const isMenuBlocked = () => !!core()?.isLocked?.();

    // 戦闘中はメニューを開かない（Mapの「メニュー呼び出し」の許可条件に追加する）。
    if (typeof Scene_Map !== "undefined" && Scene_Map.prototype.isMenuEnabled) {
        const _isMenuEnabled = Scene_Map.prototype.isMenuEnabled;
        Scene_Map.prototype.isMenuEnabled = function() {
            return _isMenuEnabled.apply(this, arguments) && !isMenuBlocked();
        };
    }

    const open = sceneClass => {
        if (!sceneClass || isMenuBlocked() || typeof SceneManager === "undefined") return false;
        SceneManager.push(sceneClass);
        return true;
    };

    // ---- 進行用プラグインコマンド ----
    const report = (label, result) => {
        if (result && result.ok === false && typeof console !== "undefined") {
            console.warn(`[${PLUGIN}] ${label} failed:`, JSON.stringify(result.reasons || result.reason || result));
        }
        return result;
    };
    const commands = {
        GrantCard(args) {
            const id = String(args.cardId || "").trim();
            const result = deck().setCardOwned(id, true);
            const level = Number.parseInt(args.level, 10);
            if (result.ok && level > 0) deck().setCardLevel(id, level);
            return report("GrantCard", result);
        },
        GrantRing: args => report("GrantRing", deck().assignRingToPlayer(String(args.ringId || "").trim())),
        TransferRingToActor: args => report("TransferRingToActor",
            core().rings.transferToActor(String(args.ringId || "").trim(), Number.parseInt(args.actorId, 10))),
        ReturnRingToPlayer: args => report("ReturnRingToPlayer", core().rings.returnToPlayer(String(args.ringId || "").trim())),
        SetUltimateGod: args => report("SetUltimateGod", core().ultimate.select(String(args.ringId || "").trim()))
    };
    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        for (const [name, handler] of Object.entries(commands)) PluginManager.registerCommand(PLUGIN, name, handler);
    }

    root.ProjectRMenuIntegration = {
        openDeckBuilder: () => open(root.Scene_ProjectRDeckBuilder),
        openUltimateSelect: () => open(root.Scene_ProjectRUltimateSelect),
        openInventory: () => open(root.Scene_ProjectRInventory),
        openRings: () => open(root.Scene_ProjectRRings),
        isMenuBlocked,
        commands
    };
})();
