/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR 指輪の報酬(Stage 5-B1): 通信ランクを満たしたときの指輪の入手と、スキルの固定レベル報酬を、イベントから呼べるようにします。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardDeckCore
 * @orderAfter ProjectR_RingLoadout
 * @orderAfter ProjectR_CommunicationRank
 *
 * @command AcquireRing
 * @text 通信ランクを満たしたら指輪を入手する
 * @desc Apollo / Janus / Themis / Athena の指輪を、ランク変数 ≧ 必要ランク のときだけ主人公の所持にします。設定が足りないときは付与しません。
 *
 * @arg ringId
 * @text 指輪(神)
 * @type select
 * @option (未設定)
 * @value
 * @option Apollo
 * @value apollo
 * @option Janus
 * @value janus
 * @option Themis
 * @value themis
 * @option Athena
 * @value athena
 * @default
 *
 * @arg rankVariableId
 * @text ランクを保存している変数
 * @desc 通信ランクを入れているゲーム変数。0(未設定)なら付与しません。
 * @type variable
 * @default 0
 *
 * @arg requiredRank
 * @text 必要ランク
 * @desc ランク変数がこの値以上のとき入手できます。0(未設定)なら付与しません。
 * @type number
 * @min 0
 * @max 9999
 * @default 0
 *
 * @arg resultVariableId
 * @text 結果コードを入れる変数(任意)
 * @desc 0なら書きません。ランク用の変数は指定できません(何もせず、このイベントを中断します)。コードの意味はヘルプを参照。
 * @type variable
 * @default 0
 *
 * @arg completedSwitchId
 * @text 完了にするスイッチ(任意)
 * @desc 成功(1)またはすでに入手済み(2)のときだけ ON にします。失敗では触りません。0なら書きません。
 * @type switch
 * @default 0
 *
 * @command RaiseSkillLevel
 * @text スキルのレベルを固定値まで上げる
 * @desc そのスキルの指輪を主人公が持っているときだけ、レベルを max(いまのレベル, 目標) にします。下げません。所持フラグ・枚数・ほかのスキルは変えません。
 *
 * @arg skillId
 * @text スキルID
 * @desc 例: janus_reflection / athena_counter / themis_... / apollo_... / hermes_...(指輪のスキルとして登録されているIDだけ)
 * @type string
 * @default
 *
 * @arg targetLevel
 * @text 目標レベル
 * @type select
 * @option (未設定)
 * @value
 * @option Lv2
 * @value 2
 * @option Lv3
 * @value 3
 * @default
 *
 * @arg resultVariableId
 * @text 結果コードを入れる変数(任意)
 * @desc 0なら書きません。通信ランクに登録した変数は指定できません(何もせず、このイベントを中断します)。コードの意味はヘルプを参照。
 * @type variable
 * @default 0
 *
 * @arg completedSwitchId
 * @text 完了にするスイッチ(任意)
 * @desc 成功(1)またはすでに目標以上(2)のときだけ ON にします。失敗では触りません。0なら書きません。
 * @type switch
 * @default 0
 *
 * @help
 * ProjectR_RingRewards.js
 *
 * 【役割】Stage 5-B1。「通信ランクで指輪が解放される」「特定のキャラとのイベントで、決まったスキルが決まったレベルになる」を、
 *   イベントのプラグインコマンドから安全に行うための窓口です。ヒロインの名前・ランクの閾値・変数の番号・通信の画面・マップのイベントは、
 *   このプラグインには入っていません(すべてイベント側で指定します。未設定のままでは何も付与しません)。
 *   新しいセーブ領域は作りません。CardDeckCore の既存の保存(指輪の所有・カードのレベル)だけを使います。
 *
 * 【指輪の入手 AcquireRing】
 *   対象は apollo / janus / themis / athena だけです(hermes は本編の入手のまま。ここでは扱いません)。
 *   次の順で判定し、最初に当てはまったもので終わります。
 *     0) 通信ランクの登録表に誤りがある                        → -1  (何も書かず、このイベントの処理を中断します。下の【設定の誤り】)
 *     1) 結果の変数がランク用の変数と重なる                    → -1  (結果は書けないので、このイベントの処理を中断します。下の【設定の誤り】)
 *     2) 結果の変数・完了スイッチに、使えない番号を指定した      → -1
 *     3) 指輪のIDが不正 / 対象外                              → -2
 *     4) ランク変数 または 必要ランク が未設定(0・空・不正)     → -1  (ランク変数が範囲外のときも -1)
 *     5) すでに主人公が持っている                              → 2   (何も変えない。ランクが後で下がっていても同じ)
 *     6) 仲間が持っている(「指輪の受け渡し」で渡した指輪)       → -5  (取り上げない)
 *     7) ランク変数の値 < 必要ランク                           → -3
 *     8) 戦闘中(カード戦闘中 / 画面に生きた敵がいる)            → -4  (あとでもう一度呼べます)
 *     9) 主人公の所持にする                                    → 1
 *   指輪は装備しません・スキルの枠にも入れません・Qにも選びません(メニューで自分で行います)。
 *   指輪を持てば、その指輪のスキルは5つとも使えるようになります(カードの所持は不要・レベルは現在のまま)。
 *
 * 【スキルのレベル RaiseSkillLevel】
 *   目標は Lv2 か Lv3 だけです。実際のレベルは max(いまのレベル, min(目標, そのカードの最大レベル)) で、下げません。
 *   そのスキルの指輪を主人公が持っているときだけ成功します(hermes のスキルは hermes の指輪)。次の順で判定します。
 *     0) 通信ランクの登録表に誤りがある                              → -1  (何も書かず、このイベントの処理を中断します)
 *     1) 結果の変数が、通信ランクに登録した変数                      → -1  (このイベントの処理を中断します。下の【設定の誤り】)
 *     2) 結果の変数・完了スイッチに、使えない番号を指定した          → -1
 *     3) スキルIDが指輪のスキルでない / 目標が 2・3 以外 / 未設定   → -2
 *     4) その指輪を主人公が持っていない(未所持 / 仲間が持っている)  → -6
 *     5) 戦闘中                                                    → -4
 *     6) いまのレベルが目標(上限)以上                              → 2   (何も変えない)
 *     7) 引き上げた                                                → 1
 *   -6 のときは、レベル・カードの所持フラグ・所持枚数・完了スイッチを変えません(すでに保存されているレベルもそのままです)。
 *   カードの所持フラグ・所持枚数・ほかのスキル・戦闘の処理は変えません(ほかのスキルのレベルも変わりません)。
 *
 * 【結果コード】(「結果コードを入れる変数」に入ります。変数の初期値の 0 は「まだ呼んでいない」)
 *    1  成功(指輪を入手した / レベルを上げた)
 *    2  すでに済み(指輪を持っている / レベルが目標以上)  … 成功と同じ「完了」の扱い
 *   -1  設定が足りない・誤り(ランク変数・必要ランクが未設定、結果の変数がランク変数と同じ、使えない番号の指定、など)
 *   -2  入力が不正(指輪ID・スキルID・目標レベル)
 *   -3  ランクが足りない
 *   -4  戦闘中
 *   -5  仲間が指輪を持っている(指輪の入手 AcquireRing だけ)
 *   -6  スキルの指輪を主人公が持っていない(スキルのレベル RaiseSkillLevel だけ。未所持・仲間が持っている)
 *   -9  そのほかの失敗(ゲームデータが無い・Core が拒否した、など)
 *
 * 【完了スイッチ】「完了にするスイッチ」は、コードが 1 か 2 のときだけ ON にします。失敗(負の値)では触りません。
 *   イベントのページ条件に使えば「成功してから完了にする」ことができます(失敗したら、もう一度会話できます)。
 *   スイッチを OFF に戻す処理は、このプラグインは行いません。
 *
 * 【通信ランクの登録表の誤り】ProjectR_CommunicationRank の「通信ランクの登録」が読めない、または使えない登録が1件でもある場合は、
 *   守るべきランク用の変数がどれか分からないため、指輪の入手もレベル上げも(hermes のスキルを含め)何もしません。結果の変数・完了スイッチも
 *   書かず、そのイベントの処理を中断します(前に残った成功の値で先へ進ませないためです)。API の戻り値は code -1 / status rankConfigurationInvalid です。
 *   空の登録([])や、通信ランクのプラグインが無い場合は、誤りではありません。
 *
 * 【設定の誤り】「結果の変数」「完了スイッチ」は、0(または空)なら使いません。それ以外で、データベースの範囲に無い番号などを指定すると、
 *   何も付与せず・レベルも上げずに -1 にします(結果の変数が使える番号なら -1 を書き、完了スイッチは触りません)。
 *   「結果の変数」がランク用の変数と重なる場合は、結果を書ける場所がありません(書くとランクが壊れ、書かないとランクの値が 1 や 2 のとき
 *   成功に見えます)。ランク用の変数 = 指輪の入手の「ランクを保存している変数」と、ProjectR_CommunicationRank の「通信ランクの登録」の
 *   すべての変数です(レベル上げも同じ。通信ランクのプラグインが無い・登録が空なら、指輪の入手の変数だけ)。
 *   何も付与せず・レベルも上げず、ランクの変数も完了スイッチも変えずに、そのイベントの処理を中断します
 *   (後ろの命令は実行されません。標準の「イベント処理の中断」と同じです)。原因はコンソール(F8)の警告に出ます。
 *   自動実行・並列処理のイベントでは、設定を直すまで同じ警告が繰り返し出ます。コモンイベントの中で呼んだ場合、中断するのは
 *   そのコモンイベントだけで、呼び出し元は続きます。スクリプトから API を呼んだ場合は中断しないので、戻り値の ok を確かめてください。
 *
 * 【API】 ProjectRRingRewards
 *   RESULT / SUPPORTED_RINGS / acquireRing({ringId, rankVariableId, requiredRank, resultVariableId, completedSwitchId})
 *   raiseSkillLevel({skillId, targetLevel, resultVariableId, completedSwitchId}) / validSkillIds()
 *   どちらも { ok, code, status, ... } を返します(ok は成功か済みのとき true)。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_RingRewards";
    const SUPPORTED_RINGS = Object.freeze(["apollo", "janus", "themis", "athena"]);
    const SKILL_RINGS = Object.freeze(["hermes", "apollo", "janus", "themis", "athena"]);
    const RESULT = Object.freeze({ SUCCESS: 1, ALREADY: 2, NOT_CONFIGURED: -1, INVALID: -2, RANK_TOO_LOW: -3, IN_COMBAT: -4, HELD_BY_ALLY: -5, RING_NOT_OWNED: -6, FAILED: -9 });
    const deck = () => root.ProjectRCardDeck;

    // ---- 値の解釈(プラグインコマンドの引数は文字列。数字だけの整数を受け付ける。それ以外は NaN) ----
    const toInt = value => {
        if (typeof value === "number") return Number.isInteger(value) ? value : NaN;
        const text = String(value == null ? "" : value).trim();
        return /^-?\d+$/.test(text) ? Number.parseInt(text, 10) : NaN;
    };
    const text = value => String(value == null ? "" : value).trim().toLowerCase();

    const result = (code, status, extra) => ({ ok: code === RESULT.SUCCESS || code === RESULT.ALREADY, code, status, ...(extra || {}) });

    // ゲームの変数・スイッチ(データが無い = タイトル画面などでは使えない)
    const hasGameData = () => typeof $gameVariables !== "undefined" && !!$gameVariables && typeof $gameSwitches !== "undefined" && !!$gameSwitches;
    const variableCount = () => (typeof $dataSystem !== "undefined" && $dataSystem && Array.isArray($dataSystem.variables) ? $dataSystem.variables.length : 0);
    const switchCount = () => (typeof $dataSystem !== "undefined" && $dataSystem && Array.isArray($dataSystem.switches) ? $dataSystem.switches.length : 0);
    const validVariableId = id => Number.isInteger(id) && id >= 1 && id < variableCount();
    const validSwitchId = id => Number.isInteger(id) && id >= 1 && id < switchCount();

    // 任意の出力先(結果の変数・完了スイッチ)。未指定(空・0)= 使わない。指定したのに使えない番号は設定の誤り(黙って無視せず、何もする前に拒否する)。
    const isUnset = value => value == null || ["", "0"].includes(String(value).trim());
    const outputError = options => {
        if (!isUnset(options.resultVariableId) && !validVariableId(toInt(options.resultVariableId))) return result(RESULT.NOT_CONFIGURED, "invalidResultVariable", { resultVariableId: String(options.resultVariableId) });
        if (!isUnset(options.completedSwitchId) && !validSwitchId(toInt(options.completedSwitchId))) return result(RESULT.NOT_CONFIGURED, "invalidCompletedSwitch", { completedSwitchId: String(options.completedSwitchId) });
        return null;
    };

    // 通信ランク(ProjectR_CommunicationRank)に登録されたランク用の変数。そのプラグインが無い・登録が空なら、何も重ならない。
    const isRegisteredRankVariable = id => {
        const ranks = root.ProjectRCommunicationRank;
        return !!ranks && typeof ranks.rankVariableIds === "function" && ranks.rankVariableIds().includes(id);
    };
    // 通信ランクの登録表に誤りがあるとき(ProjectR_CommunicationRank の fail closed に合わせる)。守るべきランク用の変数がどれか分からないので、
    // 指輪・レベル・結果の変数・スイッチを何も変えず、呼び出し元のイベントも中断する(残った成功の値で先へ進ませない)。プラグインが無い・登録が空なら誤りではない。
    const rankConfigurationError = () => {
        const ranks = root.ProjectRCommunicationRank;
        const list = ranks && typeof ranks.problems === "function" ? ranks.problems() : [];
        return list.length ? result(RESULT.NOT_CONFIGURED, "rankConfigurationInvalid", { configurationInvalid: true, abortEvent: true, problems: list }) : null;
    };
    // 結果の変数が、ランク用の変数(このコマンドの「ランクを保存している変数」/ 通信ランクに登録した変数)と重なる指定。
    // 結果を書くとランクが壊れ、書かないと残ったランクの値(1・2)が成功のコードに見える。何もせずに拒否し、プラグインコマンドから呼ばれた場合は、
    // 呼び出し元のイベントの処理も中断する(abortEvent)。
    const resultCollision = (options, ownRankVariableId) => {
        const resultVar = toInt(options.resultVariableId);
        if (!validVariableId(resultVar) || (resultVar !== ownRankVariableId && !isRegisteredRankVariable(resultVar))) return null;
        return result(RESULT.NOT_CONFIGURED, "resultVariableIsRankVariable", { rankVariableId: resultVar, abortEvent: true });
    };

    // 結果の書き出し(任意)。結果の変数 = コード。完了スイッチ = 成功か済みのときだけ ON(失敗では触らない)。ランク用の変数には書かない。
    const publish = (res, options, protectedVariableId) => {
        if (!hasGameData()) return res;
        if (!res.configurationInvalid) {                                                  // 登録表の誤り: 結果の変数もスイッチも書かない
            const resultVar = toInt(options.resultVariableId), doneSwitch = toInt(options.completedSwitchId);
            if (validVariableId(resultVar) && resultVar !== protectedVariableId && !isRegisteredRankVariable(resultVar)) $gameVariables.setValue(resultVar, res.code);
            if (res.ok && validSwitchId(doneSwitch)) $gameSwitches.setValue(doneSwitch, true);
        }
        if (!res.ok && typeof console !== "undefined") console.warn(`[${PLUGIN}] ${res.status}:`, JSON.stringify(res));
        return res;
    };

    // 戦闘中か(CardDeckCore の指輪の受け渡しの判定と同じ条件)
    const combatActive = () => {
        const d = deck();
        if (d && typeof d.isBattleActive === "function" && d.isBattleActive()) return true;
        if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.inBattle === "function" && $gameParty.inBattle()) return true;
        return !!(root.ProjectRCombatPresence && typeof root.ProjectRCombatPresence.isCombatActive === "function" && root.ProjectRCombatPresence.isCombatActive());
    };

    // ---- 指輪の入手 ----
    const acquireCore = options => {
        const d = deck();
        if (!d || !hasGameData()) return result(RESULT.FAILED, "noGameData");
        const broken = rankConfigurationError();
        if (broken) return broken;
        const rankVar = toInt(options.rankVariableId);
        // 最優先: 結果の変数がランク用の変数と重なる(上の resultCollision)。
        const collision = resultCollision(options, rankVar);
        if (collision) return collision;
        const badOutput = outputError(options);
        if (badOutput) return badOutput;
        const ringId = text(options.ringId);
        if (!ringId || !SUPPORTED_RINGS.includes(ringId) || !d.definitions.ring(ringId)) return result(RESULT.INVALID, "invalidRing", { ringId });
        const required = toInt(options.requiredRank);
        if (!validVariableId(rankVar)) return result(RESULT.NOT_CONFIGURED, "rankVariableNotConfigured", { ringId, rankVariableId: Number.isNaN(rankVar) ? null : rankVar });
        if (!Number.isInteger(required) || required < 1) return result(RESULT.NOT_CONFIGURED, "requiredRankNotConfigured", { ringId, requiredRank: Number.isNaN(required) ? null : required });
        const owner = d.getRingOwner(ringId);
        if (owner === "player") return result(RESULT.ALREADY, "alreadyOwned", { ringId });
        if (owner !== "unowned") return result(RESULT.HELD_BY_ALLY, "heldByAlly", { ringId, owner });
        const rank = Number($gameVariables.value(rankVar));
        if (!(rank >= required)) return result(RESULT.RANK_TOO_LOW, "rankTooLow", { ringId, rank: Number.isFinite(rank) ? rank : null, requiredRank: required });
        if (combatActive()) return result(RESULT.IN_COMBAT, "inCombat", { ringId });
        const assigned = d.assignRingToPlayer(ringId);
        if (!assigned || !assigned.ok) {
            const battle = Array.isArray(assigned && assigned.reasons) && assigned.reasons.some(r => r && r.code === d.InvalidReason.RING_TRANSFER_DURING_BATTLE);
            return battle ? result(RESULT.IN_COMBAT, "inCombat", { ringId }) : result(RESULT.FAILED, "assignFailed", { ringId, detail: assigned && assigned.reasons });
        }
        return result(RESULT.SUCCESS, "granted", { ringId });
    };
    const acquireRing = (options = {}) => publish(acquireCore(options), options, toInt(options.rankVariableId));

    // ---- スキルのレベル ----
    const validSkillIds = () => {
        const loadout = root.ProjectRRingLoadout, ids = [];
        if (loadout && typeof loadout.getRingSkills === "function") for (const ring of SKILL_RINGS) for (const id of loadout.getRingSkills(ring) || []) ids.push(String(id));
        return ids;
    };
    const levelOf = skillId => {
        const entry = deck().getPersistentData().cardOwnership && deck().getPersistentData().cardOwnership[skillId];
        const level = entry ? Number.parseInt(entry.level, 10) : NaN;
        return Number.isFinite(level) && level >= 1 ? level : 1;
    };
    const raiseCore = options => {
        const d = deck();
        if (!d || !hasGameData()) return result(RESULT.FAILED, "noGameData");
        const broken = rankConfigurationError();
        if (broken) return broken;
        const collision = resultCollision(options, NaN);
        if (collision) return collision;
        const badOutput = outputError(options);
        if (badOutput) return badOutput;
        const skillId = String(options.skillId == null ? "" : options.skillId).trim();
        const definition = skillId ? d.definitions.card(skillId) : null;
        if (!skillId || !definition || !validSkillIds().includes(skillId)) return result(RESULT.INVALID, "invalidSkill", { skillId });
        const target = toInt(options.targetLevel);
        if (target !== 2 && target !== 3) return result(RESULT.INVALID, "invalidLevel", { skillId, targetLevel: Number.isNaN(target) ? null : target });
        // そのスキルの指輪を主人公が持っているときだけ(未所持・仲間が持っているときは、何も変えずに拒否する。「済み」にもしない)
        const ringId = String(definition.ringId || "");
        if (!d.hasPlayerRing(ringId)) return result(RESULT.RING_NOT_OWNED, "ringNotOwned", { skillId, ringId, owner: d.getRingOwner(ringId) });
        if (combatActive()) return result(RESULT.IN_COMBAT, "inCombat", { skillId });
        const cap = Math.min(target, Number.parseInt(definition.maxLevel, 10) || 1);
        const before = levelOf(skillId);
        if (before >= cap) return result(RESULT.ALREADY, "unchanged", { skillId, level: before, cap });
        const set = d.setCardLevel(skillId, cap);
        if (!set || !set.ok) return result(RESULT.FAILED, "setLevelFailed", { skillId, detail: set && set.reasons });
        const after = levelOf(skillId);
        if (after !== cap) return result(RESULT.FAILED, "levelNotApplied", { skillId, level: after, cap });
        return result(RESULT.SUCCESS, "raised", { skillId, before, level: after, cap, capped: cap < target });
    };
    const raiseSkillLevel = (options = {}) => publish(raiseCore(options), options, 0);

    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        // abortEvent(結果の変数がランク用の変数と重なる / 通信ランクの登録表の誤り): 結果を返せないので、後ろの条件分岐がランクの値を結果と読まないように、このイベントの処理を中断する(標準の「イベント処理の中断」と同じ)。
        const handler = run => function(args) {
            const res = run(args || {});
            if (res.abortEvent && this && typeof this.command115 === "function") this.command115();
            return res;
        };
        PluginManager.registerCommand(PLUGIN, "AcquireRing", handler(acquireRing));
        PluginManager.registerCommand(PLUGIN, "RaiseSkillLevel", handler(raiseSkillLevel));
    }

    root.ProjectRRingRewards = Object.freeze({ VERSION: "0.1.0", RESULT, SUPPORTED_RINGS, acquireRing, raiseSkillLevel, validSkillIds });
    if (typeof module !== "undefined" && module.exports) module.exports = root.ProjectRRingRewards;
})();
