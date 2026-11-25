/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR 通信ランク(Stage 5-B2): ヒロインやNPCの通信ランクをゲーム変数で管理し、イベントから読み取り・最低値への引き上げができます。
 * @author ProjectR
 *
 * @param Characters
 * @text 通信ランクの登録
 * @desc キャラクターキー・ランクを保存するゲーム変数・ランクの上限を登録します。最初は空です(名前や値はここで決めてください)。
 * @type struct<CommunicationCharacter>[]
 * @default []
 *
 * @command ReadRank
 * @text 通信ランクを読み取る
 * @desc 登録したキャラクターの今のランクを、指定した変数に入れます。ランクは変えません。
 *
 * @arg characterKey
 * @text キャラクターキー
 * @desc プラグインの「通信ランクの登録」に入れたキー。
 * @type string
 * @default
 *
 * @arg outputVariableId
 * @text ランクを入れる変数
 * @desc 必須。ランク用に登録した変数は指定できません(何もせず、このイベントを中断します)。失敗したときは -1 が入ります。
 * @type variable
 * @default 0
 *
 * @arg resultVariableId
 * @text 結果コードを入れる変数(任意)
 * @desc 0なら書きません。ランク用に登録した変数は指定できません(何もせず、このイベントを中断します)。
 * @type variable
 * @default 0
 *
 * @arg completedSwitchId
 * @text 成功で ON にするスイッチ(任意)
 * @desc 読み取れたときだけ ON にします。失敗では触りません。0なら使いません。
 * @type switch
 * @default 0
 *
 * @command RaiseRankToMinimum
 * @text 通信ランクを指定の値まで引き上げる
 * @desc ランクを max(いまの値, 指定の値) にします。下げません。繰り返し呼んでも増えません。指輪やスキルは自動では変わりません。
 *
 * @arg characterKey
 * @text キャラクターキー
 * @desc プラグインの「通信ランクの登録」に入れたキー。
 * @type string
 * @default
 *
 * @arg minimumRank
 * @text 引き上げる値
 * @desc 1 以上、そのキャラクターのランクの上限以下。0(未設定)は何もしません。
 * @type number
 * @min 0
 * @max 9999
 * @default 0
 *
 * @arg resultVariableId
 * @text 結果コードを入れる変数(任意)
 * @desc 0なら書きません。ランク用に登録した変数は指定できません(何もせず、このイベントを中断します)。
 * @type variable
 * @default 0
 *
 * @arg completedSwitchId
 * @text 完了にするスイッチ(任意)
 * @desc 引き上げた(1)またはすでに指定の値以上(2)のときだけ ON にします。失敗では触りません。0なら使いません。
 * @type switch
 * @default 0
 *
 * @help
 * ProjectR_CommunicationRank.js
 *
 * 【役割】Stage 5-B2。ヒロインやNPCの「通信ランク」を、RPGツクールMZの標準のゲーム変数に保存して管理する土台です。
 *   ゲーム変数なので、通常のセーブ/ロードでそのまま保存されます。このプラグイン独自のセーブ領域はありません。
 *   キャラクターの名前・どの変数を使うか・ランクの上限は、このプラグインには入っていません(「通信ランクの登録」で設定します。最初は空です)。
 *   ランクを上げても、指輪の入手やスキルのレベル上げは自動では起きません。指輪は「通信ランクを満たしたら指輪を入手する」
 *   (ProjectR_RingRewards)を、決まったイベントで呼びます。必要ランクの変数には、ここで登録した同じ変数を指定してください。
 *   Hermes の指輪は本編の入手のままです。スキルのレベル上げは、決まったキャラクターのイベントで呼びます。
 *
 * 【通信ランクの登録】1件につき次の3つです。
 *   キャラクターキー : 好きな名前の文字列(大文字と小文字は区別します。前後の空白は無視します)。同じキーは2件登録できません。
 *   ランクを保存する変数 : ゲーム変数の番号(データベースの範囲内)。同じ番号を2件で使うことはできません。
 *   ランクの上限 : 1 以上。0(未設定)の登録は使えません。
 *   ランクは 0(まだ何もない)〜 上限の整数です。変数の初期値の 0 がそのままランク 0 になります。
 *
 * 【登録の誤りは、全体を停止します】登録表が読めない(JSON が壊れている)場合や、使えない登録が1件でもある場合(キーが空・キーの重複・
 *   変数の重複や未設定/範囲外・上限の未設定・読めない行)は、守るべきランク用の変数がどれか分からないため、全部のキーを使えなくします。
 *   通信ランクの2つのコマンドも、ProjectR_RingRewards の指輪の入手とスキルのレベル上げも、ランク・結果の変数・出力の変数・スイッチ・
 *   指輪・スキルを何も変えずに、そのイベントの処理を中断します(結果の変数を書けないので、前に残った成功の値で先へ進ませないためです)。
 *   空の登録([])は誤りではありません。理由はコンソール(F8)の警告か、ProjectRCommunicationRank.problems() で確認できます。
 *
 * 【コマンドの判定の順】
 *   最初) 登録表に誤りがある → -1(何も書かず、このイベントを中断します。上の【登録の誤り】)
 *   共通) 結果の変数(読み取りでは「ランクを入れる変数」も)が、登録したランク用の変数と同じ → -1(何もせず、このイベントを中断します)
 *        指定した結果の変数・スイッチ・出力の変数に使えない番号がある → -1
 *        読み取りで、ランクを入れる変数が未指定、または結果の変数と同じ → -1
 *        キャラクターキーが空 → -2
 *        キーが登録されていない → -1
 *   引き上げ) 引き上げる値が 0(未設定) → -1 / 整数でない・負・上限より大きい → -2
 *   共通) 変数の中身が 0 以上の整数でない → -7(上書きしません)
 *   引き上げ) いまの値が指定の値以上 → 2(何も変えない。上限より大きい値が入っていても下げない) / それ以外は指定の値にする → 1
 *
 * 【結果コード】
 *    1  成功(読み取れた / 引き上げた)
 *    2  すでに指定の値以上(引き上げのみ。成功と同じ「完了」の扱い)
 *   -1  設定が足りない・誤り(登録が無い・登録表の誤り・出力先の指定の誤り)
 *   -2  入力が不正(キーが空・引き上げる値)
 *   -7  ランクの変数に、0以上の整数でない値が入っている
 *   -9  そのほかの失敗(ゲームデータが無い・書き込みに失敗)
 *   読み取りに失敗したとき、「ランクを入れる変数」が使える番号なら -1 を入れます(前のランクの値が残らないようにするためです)。
 *   登録表に誤りがあるときは、どの変数も書きません(代わりにイベントを中断します)。
 *
 * 【重なりの防止】結果の変数や読み取り先に、登録したランク用の変数を指定すると、ランクが結果コードで上書きされたり、ランクの値が成功の
 *   コードに見えたりします。そのため何も変えずに拒否し、そのイベントの処理を中断します(標準の「イベント処理の中断」と同じ)。
 *   ProjectR_RingRewards の指輪の入手とスキルのレベル上げの「結果の変数」にも、同じ防止が働きます。
 *   原因はコンソール(テストプレイで F8)の警告に出ます。自動実行・並列処理のイベントでは、直すまで繰り返し出ます。
 *   「変数の操作」コマンドで直接ランクを書き換えることは防げません(下げることもできてしまいます)。ランクはこのコマンドで上げてください。
 *
 * 【API】 ProjectRCommunicationRank
 *   RESULT / entries() / problems() / rankVariableIds() / getRank(key)
 *   readRank({characterKey, outputVariableId?, resultVariableId, completedSwitchId})
 *   raiseRankToMinimum({characterKey, minimumRank, resultVariableId, completedSwitchId})
 *   戻り値は { ok, code, status, ... } です(ok は成功か済みのとき true)。API を直接呼んだ場合はイベントを中断しません(abortEvent を確かめてください)。
 */
/*~struct~CommunicationCharacter:
 * @param Key
 * @text キャラクターキー
 * @desc コマンドで指定する文字列。ほかの登録と重ならないもの。
 * @type string
 * @default
 *
 * @param VariableId
 * @text ランクを保存する変数
 * @desc このキャラクター専用のゲーム変数。0(未設定)の登録は使えません。
 * @type variable
 * @default 0
 *
 * @param MaxRank
 * @text ランクの上限
 * @desc 1 以上。0(未設定)の登録は使えません。
 * @type number
 * @min 0
 * @max 9999
 * @default 0
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_CommunicationRank";
    const RESULT = Object.freeze({ SUCCESS: 1, ALREADY: 2, NOT_CONFIGURED: -1, INVALID: -2, BAD_RANK_VALUE: -7, FAILED: -9 });
    const FAILURE_OUTPUT = -1;                                                  // 読み取りに失敗したときに出力の変数へ入れる値(ランクは 0 以上なので、ランクと見分けられる)

    const toInt = value => {
        if (typeof value === "number") return Number.isInteger(value) ? value : NaN;
        const text = String(value == null ? "" : value).trim();
        return /^-?\d+$/.test(text) ? Number.parseInt(text, 10) : NaN;
    };
    const textOf = value => String(value == null ? "" : value).trim();
    const isUnset = value => value == null || ["", "0"].includes(String(value).trim());
    const result = (code, status, extra) => ({ ok: code === RESULT.SUCCESS || code === RESULT.ALREADY, code, status, ...(extra || {}) });

    const hasGameData = () => typeof $gameVariables !== "undefined" && !!$gameVariables && typeof $gameSwitches !== "undefined" && !!$gameSwitches;
    const variableCount = () => (typeof $dataSystem !== "undefined" && $dataSystem && Array.isArray($dataSystem.variables) ? $dataSystem.variables.length : 0);
    const switchCount = () => (typeof $dataSystem !== "undefined" && $dataSystem && Array.isArray($dataSystem.switches) ? $dataSystem.switches.length : 0);
    const validVariableId = id => Number.isInteger(id) && id >= 1 && id < variableCount();
    const validSwitchId = id => Number.isInteger(id) && id >= 1 && id < switchCount();

    // ---- 登録表(プラグインの設定)の読み取りと検証。同じ文字列なら解析結果を使い回す。データベースの範囲の確認は、呼ぶたびに行う ----
    const parseJson = text => { try { return JSON.parse(text); } catch (_e) { return undefined; } };
    let cache = { raw: undefined, rows: [], tableError: null };
    const parsedTable = () => {
        const parameters = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters(PLUGIN) : {};
        const value = parameters ? parameters.Characters : undefined;
        const raw = value === undefined ? "" : typeof value === "string" ? value.trim() : null;
        if (raw === cache.raw) return cache;
        const rows = [];
        let tableError = null;
        const list = raw === null ? undefined : raw === "" ? [] : parseJson(raw);       // null = 設定が文字列でない(plugins.js を手で壊した場合)
        if (!Array.isArray(list)) tableError = "tableNotReadable";
        else list.forEach((item, index) => {
            const row = typeof item === "string" ? parseJson(item) : item;
            if (!row || typeof row !== "object" || Array.isArray(row)) { rows.push({ index, key: "", variableId: NaN, maxRank: NaN, unreadable: true }); return; }
            rows.push({ index, key: typeof row.Key === "string" ? row.Key.trim() : "", variableId: toInt(row.VariableId), maxRank: toInt(row.MaxRank) });
        });
        cache = { raw, rows, tableError };
        return cache;
    };
    // 登録の一覧(誤りの理由つき)。キーの重複・変数の重複は、重なった登録をすべて使えなくする(どれが正しいか分からないため)
    const entries = () => {
        const rows = parsedTable().rows;
        const countBy = pick => rows.reduce((map, row) => { const k = pick(row); if (k !== null) map.set(k, (map.get(k) || 0) + 1); return map; }, new Map());
        const keys = countBy(row => (row.key ? row.key : null));
        const variables = countBy(row => (Number.isInteger(row.variableId) && row.variableId > 0 ? row.variableId : null));
        return rows.map(row => {
            const reasons = [];
            if (row.unreadable) reasons.push("unreadableEntry");
            else {
                if (!row.key) reasons.push("missingKey");
                else if (keys.get(row.key) > 1) reasons.push("duplicateKey");
                if (!validVariableId(row.variableId)) reasons.push("invalidVariableId");
                else if (variables.get(row.variableId) > 1) reasons.push("duplicateVariableId");
                if (!Number.isInteger(row.maxRank) || row.maxRank < 1) reasons.push("invalidMaxRank");
            }
            return { index: row.index, key: row.key, variableId: Number.isNaN(row.variableId) ? null : row.variableId, maxRank: Number.isNaN(row.maxRank) ? null : row.maxRank, valid: reasons.length === 0, reasons };
        });
    };
    const problems = () => {
        const table = parsedTable();
        const list = entries().filter(e => !e.valid).map(e => ({ index: e.index, key: e.key, reasons: e.reasons }));
        return table.tableError ? [{ index: -1, key: "", reasons: [table.tableError] }, ...list] : list;
    };
    // ランク用として扱う変数の番号。誤りのある登録の番号も含める(上書きから守るほうを選ぶ)
    const rankVariableIds = () => [...new Set(parsedTable().rows.map(row => row.variableId).filter(id => Number.isInteger(id) && id > 0))];
    const isRankVariable = id => rankVariableIds().includes(id);
    // 登録表に誤りが1つでもあれば、全体を停止する(fail closed)。守るべき変数がどれか分からないので、どこにも書かず、呼び出し元のイベントも中断する
    const configurationError = () => {
        const list = problems();
        return list.length ? result(RESULT.NOT_CONFIGURED, "rankConfigurationInvalid", { configurationInvalid: true, abortEvent: true, problems: list }) : null;
    };
    // 登録表の誤りを確かめた後に呼ぶ(ここに来る登録は、すべて正しい)
    const findCharacter = key => {
        const entry = entries().find(e => e.key === key);
        return entry ? { entry } : { error: result(RESULT.NOT_CONFIGURED, "unknownCharacter", { characterKey: key }) };
    };

    // ---- 出力先(結果の変数・スイッチ・読み取り先)の検証 ----
    const outputCollision = (options, names) => {
        for (const [field, status] of names) {
            const id = toInt(options[field]);
            if (validVariableId(id) && isRankVariable(id)) return result(RESULT.NOT_CONFIGURED, status, { [field]: id, abortEvent: true });
        }
        return null;
    };
    const outputError = options => {
        if (!isUnset(options.resultVariableId) && !validVariableId(toInt(options.resultVariableId))) return result(RESULT.NOT_CONFIGURED, "invalidResultVariable", { resultVariableId: String(options.resultVariableId) });
        if (!isUnset(options.completedSwitchId) && !validSwitchId(toInt(options.completedSwitchId))) return result(RESULT.NOT_CONFIGURED, "invalidCompletedSwitch", { completedSwitchId: String(options.completedSwitchId) });
        if (!isUnset(options.outputVariableId) && !validVariableId(toInt(options.outputVariableId))) return result(RESULT.NOT_CONFIGURED, "invalidOutputVariable", { outputVariableId: String(options.outputVariableId) });
        return null;
    };
    // 結果の書き出し。ランク用の変数には、どんな場合も書かない。完了スイッチは成功か済みのときだけ ON(失敗では触らない)
    const publish = (res, options) => {
        if (!hasGameData()) return res;
        if (!res.configurationInvalid) {                                                  // 登録表の誤り: 結果の変数もスイッチも書かない
            const resultVar = toInt(options.resultVariableId), doneSwitch = toInt(options.completedSwitchId);
            if (validVariableId(resultVar) && !isRankVariable(resultVar)) $gameVariables.setValue(resultVar, res.code);
            if (res.ok && validSwitchId(doneSwitch)) $gameSwitches.setValue(doneSwitch, true);
        }
        if (!res.ok && typeof console !== "undefined") console.warn(`[${PLUGIN}] ${res.status}:`, JSON.stringify(res));
        return res;
    };

    // 保存されているランク。0 以上の整数だけを読み、それ以外は上書きもしない
    const storedRank = entry => {
        const value = $gameVariables.value(entry.variableId);
        return Number.isInteger(value) && value >= 0 ? { rank: value } : { error: result(RESULT.BAD_RANK_VALUE, "invalidStoredRank", { characterKey: entry.key, variableId: entry.variableId }) };
    };
    const lookup = key => {
        if (!key) return { error: result(RESULT.INVALID, "missingCharacterKey") };
        return findCharacter(key);
    };

    // ---- 読み取り ----
    const readCore = (options, requireOutput) => {
        if (!hasGameData()) return result(RESULT.FAILED, "noGameData");
        const broken = configurationError();
        if (broken) return broken;
        const collision = outputCollision(options, [["resultVariableId", "resultVariableIsRankVariable"], ["outputVariableId", "outputVariableIsRankVariable"]]);
        if (collision) return collision;
        const bad = outputError(options);
        if (bad) return bad;
        const outputVar = toInt(options.outputVariableId);
        if (requireOutput && !validVariableId(outputVar)) return result(RESULT.NOT_CONFIGURED, "outputVariableNotConfigured");
        if (validVariableId(outputVar) && outputVar === toInt(options.resultVariableId)) return result(RESULT.NOT_CONFIGURED, "outputVariableIsResultVariable", { outputVariableId: outputVar });
        const found = lookup(textOf(options.characterKey));
        if (found.error) return found.error;
        const stored = storedRank(found.entry);
        if (stored.error) return stored.error;
        return result(RESULT.SUCCESS, "read", { characterKey: found.entry.key, rank: stored.rank, maxRank: found.entry.maxRank, variableId: found.entry.variableId });
    };
    const read = (options, requireOutput) => {
        const res = readCore(options, requireOutput);
        if (hasGameData() && !res.configurationInvalid) {
            const outputVar = toInt(options.outputVariableId);
            // 出力の変数: 成功ならランク、失敗なら -1(前の値が残って、別のランクに見えないように)。ランク用の変数には書かない
            if (validVariableId(outputVar) && !isRankVariable(outputVar)) $gameVariables.setValue(outputVar, res.ok ? res.rank : FAILURE_OUTPUT);
        }
        return publish(res, options);
    };
    const readRank = (options = {}) => read(options, false);

    // ---- 引き上げ(下げない・繰り返しても増えない) ----
    const raiseCore = options => {
        if (!hasGameData()) return result(RESULT.FAILED, "noGameData");
        const broken = configurationError();
        if (broken) return broken;
        const collision = outputCollision(options, [["resultVariableId", "resultVariableIsRankVariable"]]);
        if (collision) return collision;
        const bad = outputError({ resultVariableId: options.resultVariableId, completedSwitchId: options.completedSwitchId });
        if (bad) return bad;
        const found = lookup(textOf(options.characterKey));
        if (found.error) return found.error;
        const entry = found.entry;
        if (isUnset(options.minimumRank)) return result(RESULT.NOT_CONFIGURED, "minimumRankNotConfigured", { characterKey: entry.key });
        const minimum = toInt(options.minimumRank);
        if (!Number.isInteger(minimum) || minimum < 1 || minimum > entry.maxRank) return result(RESULT.INVALID, "invalidMinimumRank", { characterKey: entry.key, minimumRank: String(options.minimumRank), maxRank: entry.maxRank });
        const stored = storedRank(entry);
        if (stored.error) return stored.error;
        if (stored.rank >= minimum) return result(RESULT.ALREADY, "unchanged", { characterKey: entry.key, rank: stored.rank, maxRank: entry.maxRank });
        $gameVariables.setValue(entry.variableId, minimum);
        const after = $gameVariables.value(entry.variableId);
        if (after !== minimum) return result(RESULT.FAILED, "rankNotApplied", { characterKey: entry.key, rank: after });
        return result(RESULT.SUCCESS, "raised", { characterKey: entry.key, before: stored.rank, rank: after, maxRank: entry.maxRank });
    };
    const raiseRankToMinimum = (options = {}) => publish(raiseCore(options), options);

    const getRank = characterKey => {
        if (!hasGameData()) return result(RESULT.FAILED, "noGameData");
        const broken = configurationError();
        if (broken) return broken;
        const found = lookup(textOf(characterKey));
        if (found.error) return found.error;
        const stored = storedRank(found.entry);
        return stored.error || result(RESULT.SUCCESS, "read", { characterKey: found.entry.key, rank: stored.rank, maxRank: found.entry.maxRank, variableId: found.entry.variableId });
    };

    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        // abortEvent(出力先がランク用の変数 / 登録表の誤り): 後ろの条件分岐がランクの値を結果と読まないように、このイベントの処理を中断する(標準の「イベント処理の中断」と同じ)
        const handler = run => function(args) {
            const res = run(args || {});
            if (res.abortEvent && this && typeof this.command115 === "function") this.command115();
            return res;
        };
        PluginManager.registerCommand(PLUGIN, "ReadRank", handler(args => read(args, true)));
        PluginManager.registerCommand(PLUGIN, "RaiseRankToMinimum", handler(raiseRankToMinimum));
    }

    root.ProjectRCommunicationRank = Object.freeze({ VERSION: "0.1.0", RESULT, entries, problems, rankVariableIds, getRank, readRank, raiseRankToMinimum });
    if (typeof module !== "undefined" && module.exports) module.exports = root.ProjectRCommunicationRank;
})();
