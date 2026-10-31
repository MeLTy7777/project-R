/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 属性(Database属性ID)の共通窓口: 属性倍率の読み取り・固定ダメージの属性補正(1回だけ)・弱点ダメージ修飾。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardBalance
 *
 * @help
 * ProjectR_Elements.js
 *
 * 【属性の正体】ProjectRの属性は、RPGツクールMZ標準の属性システム(Database > タイプ > 属性、System.json の elements)そのものです。
 *   作成当初から変わっていません(物理/炎/氷/雷/水/土/風/光/闇。ID 1〜9。ID 0 = 無属性)。独自の属性表は作りません。
 *   弱点・耐性は MZ の「属性有効度」(敵キャラ/ステート/装備の特徴、code 11)と Element Rate の仕組みをそのまま使います。
 *
 * 【ダメージの計算順(MZ標準。Hendrixの武器/スキルのダメージ経路がそのまま使う)】
 *   基礎値(式) × 属性有効度 → ×物理/魔法ダメージ率 → (回復なら×回復率) → クリティカル → 分散 → 防御(ガード) → 四捨五入。
 *   属性有効度は makeDamageValue の中で「1回だけ」掛かります(複数ヒット・弾・継続ダメージも、1ヒットごとに1回)。
 *   - 通常の武器攻撃: スキルの属性ID -1 = 攻撃者(武器・装備)の攻撃時属性(特徴 code 31)の最大有効度。
 *   - スキルのダメージ(弾・DoT・Ultimate): Database スキルの「ダメージ > 属性」。
 *   - 属性有効度 0 は無効(Hendrixの immunity 判定と同じ)。
 *
 * 【固定ダメージ(カードの「50ダメージ」など)】
 *   固定値のカードは式を持たないので、MZと同じ位置(基礎値 × 属性有効度 → クリティカル → 加算)で、CardModifiers の
 *   projectRFixed:{ element, weaknessMultiplier } がこのプラグインの fixedFactor() を1回だけ呼びます。
 *   element が 0 / 未指定なら一切変えません(無属性は従来どおり)。属性は data/ProjectR_CardBalance.json のカードごとの "element" で決めます。
 *   吸収(有効度が負)は固定ダメージでは「無効(0ダメージ)」として扱います(MZは吸収で回復しますが、固定ダメージでは未検証のため安全側)。
 *
 * 【弱点ダメージ修飾(将来のカード効果用)】
 *   addWeaknessModifier(id, multiplier): 属性有効度が 1 を超える(弱点)ときだけ、有効度に multiplier を掛けます。
 *   スキル経路(Game_Action.calcElementRate)と固定ダメージ経路の両方に、同じ値が1回ずつ効きます。
 *   カードごとの固定ダメージの "weaknessMultiplier"(既定1 = 変化なし)も同じ式です。実行時のみ(セーブしない)。
 *   同じidで再設定すると置換(重ねがけしません)。戦闘終了・マップ移動・ロードで全部外れます。
 *
 * API: ProjectRElements
 *   table() / nameOf(id) / idOf(name)           属性表(Databaseから読む)
 *   rateOf(eventId, elementId)                  敵Eventの属性有効度(MZのelementRate)
 *   profile(eventId)                            敵の全属性の有効度と分類(weak/resist/immune/absorb/neutral)
 *   classify(rate)                              有効度の分類
 *   adjustRate(rate, extraMultiplier)           弱点修飾を含めた実効有効度
 *   fixedFactor(eventId, fixed)                 固定ダメージの属性係数 { applied, element, rate, factor, kind }
 *   addWeaknessModifier / removeWeaknessModifier / clearWeaknessModifiers / weaknessModifiers()
 *   setLogging(on) / getLog() / clearLog()      検証用(何回・どの有効度を適用したか)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
    const modifiers = new Map(); // id -> multiplier(弱点のときだけ掛ける)。実行時のみ。
    let logging = false;
    const log = [];
    const LOG_LIMIT = 200;
    const note = entry => { if (logging) { log.push(entry); if (log.length > LOG_LIMIT) log.shift(); } };

    const elementNames = () => (typeof $dataSystem !== "undefined" && Array.isArray($dataSystem?.elements) ? $dataSystem.elements : []);
    const table = () => {
        const names = elementNames(), rows = [{ id: 0, name: "無属性" }];
        for (let id = 1; id < names.length; id++) if (names[id]) rows.push({ id, name: names[id] });
        return rows;
    };
    const nameOf = id => (Number(id) === 0 ? "無属性" : (elementNames()[Number(id)] || ""));
    const idOf = name => { const index = elementNames().indexOf(String(name)); return index > 0 ? index : (name === "無属性" ? 0 : -1); };

    const battlerOf = eventId => {
        try {
            const event = typeof $gameMap !== "undefined" ? $gameMap.event(Number(eventId)) : null;
            return event && typeof SgetBattlerForH === "function" ? SgetBattlerForH(event) : null;
        } catch (_error) { return null; }
    };
    const classify = rate => (rate < 0 ? "absorb" : rate === 0 ? "immune" : rate < 1 ? "resist" : rate > 1 ? "weak" : "neutral");
    const rateOf = (eventId, elementId) => {
        const id = Number(elementId);
        if (!(id > 0)) return 1; // 0 = 無属性 → 常に等倍
        const battler = battlerOf(eventId);
        return battler && typeof battler.elementRate === "function" ? battler.elementRate(id) : 1;
    };
    const profile = eventId => table().filter(row => row.id > 0).map(row => {
        const rate = rateOf(eventId, row.id);
        return { id: row.id, name: row.name, rate, kind: classify(rate) };
    });

    // ---- 弱点ダメージ修飾 ----
    const weaknessProduct = () => { let product = 1; for (const value of modifiers.values()) product *= value; return product; };
    const addWeaknessModifier = (id, multiplier) => {
        const m = Number(multiplier);
        if (!String(id ?? "") || !Number.isFinite(m) || m < 0) return { ok: false, reason: "invalidModifier" };
        modifiers.set(String(id), m);
        return { ok: true };
    };
    const removeWeaknessModifier = id => modifiers.delete(String(id));
    const clearWeaknessModifiers = () => { const had = modifiers.size > 0; modifiers.clear(); return had; };
    // 弱点(有効度>1)のときだけ、実行時の修飾と呼び出し側の追加倍率を掛ける。等倍・耐性・無効・吸収は変えない。
    const adjustRate = (rate, extra) => {
        if (!(rate > 1)) return rate;
        const e = Number(extra);
        return rate * weaknessProduct() * (Number.isFinite(e) && e >= 0 ? e : 1);
    };

    // ---- 固定ダメージの属性係数(CardModifiersが1ヒットにつき1回呼ぶ) ----
    const neutral = { applied: false, element: 0, rate: 1, factor: 1, kind: "neutral" };
    const fixedFactor = (eventId, fixed) => {
        const element = Number(fixed && fixed.element);
        if (!(element > 0) || !Number.isInteger(element)) return neutral;
        const battler = battlerOf(eventId);
        if (!battler || typeof battler.elementRate !== "function") return neutral;
        const rate = battler.elementRate(element);
        let factor = adjustRate(rate, fixed.weaknessMultiplier);
        if (factor < 0) factor = 0; // 吸収は固定ダメージでは無効扱い
        const result = { applied: true, element, rate, factor, kind: classify(rate) };
        note({ type: "fixed", eventId: Number(eventId), element, rate, factor });
        return result;
    };

    // ---- スキル/武器の経路: MZのcalcElementRateに弱点修飾だけを足す(修飾が空ならそのまま) ----
    if (typeof Game_Action !== "undefined" && Game_Action.prototype && typeof Game_Action.prototype.calcElementRate === "function"
            && !Game_Action.prototype.calcElementRate.__projectRElements) {
        const original = Game_Action.prototype.calcElementRate;
        const wrapped = function() {
            const rate = original.apply(this, arguments);
            const adjusted = modifiers.size ? adjustRate(rate, 1) : rate;
            if (logging) note({ type: "skill", rate, adjusted });
            return adjusted;
        };
        wrapped.__projectRElements = true;
        Game_Action.prototype.calcElementRate = wrapped;
    }

    // ---- 後片付け(実行時のみの修飾) ----
    const deck = root.ProjectRCardDeck;
    if (deck && typeof deck.endBattle === "function") {
        const _endBattle = deck.endBattle;
        deck.endBattle = function() { clearWeaknessModifiers(); return _endBattle.apply(this, arguments); };
    }
    if (typeof Game_Map !== "undefined" && Game_Map.prototype.setup) {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clearWeaknessModifiers(); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined" && DataManager.extractSaveContents) {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { clearWeaknessModifiers(); return _extract.apply(this, arguments); };
    }

    root.ProjectRElements = Object.freeze({
        table, nameOf, idOf, rateOf, profile, classify, adjustRate, fixedFactor,
        addWeaknessModifier, removeWeaknessModifier, clearWeaknessModifiers,
        weaknessModifiers: () => [...modifiers].map(([id, multiplier]) => ({ id, multiplier })),
        weaknessProduct,
        setLogging: on => { logging = !!on; }, getLog: () => log.map(entry => Object.assign({}, entry)), clearLog: () => { log.length = 0; }
    });
})();
