/*:
 * @target MZ
 * @plugindesc v1.0.0 Hermes「ストレングス」(設計ID 4): 次の物理攻撃の攻撃力を蓄える(Lv1 10% / Lv2 15% / Lv3 15% + 防御無視)。重ね掛け可・一度にすべて消費。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardModifiers
 * @base ProjectR_GodSummonManager
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_CardModifiers
 * @orderAfter ProjectR_CutIn
 * @orderAfter ProjectR_HermesReedFlute
 *
 * @param StackingMode
 * @text 重ね掛けの計算(暫定)
 * @desc additive = 倍率 1 + (各回の%の合計)。multiplicative = 各回の(1+%)の積。ワークブックに計算方法の指定は無いため、暫定の既定は additive。
 * @type select
 * @option additive
 * @option multiplicative
 * @default additive
 *
 * @help
 * ProjectR_HermesStrength.js
 *
 * 新カード「ストレングス」(ワークブック「カード一覧」のCard ID 4)。ランタイムIDは hermes_strength。
 * Hermes / 特殊 / 最大10枚 / 最大Lv3 / Cooldown 0.1秒 / Buff(対象なし = instant)。定義はProjectR_CardCatalogが実行時に追加します。
 *
 * 【効果(累積レベル。同じ効果の数値は置換)】
 *   Lv1: 力を蓄え、次の物理攻撃の「攻撃力」を 10% 上昇させる。重ね掛け可・最大重複数なし。重ね掛けは一度にすべて消費。
 *   Lv2: 1回あたりの上昇を 15% に置換(重ね掛けは維持)。
 *   Lv3: 15%(維持) + その攻撃は防御を無視する。
 *   発動に成功したカードは、対象が無くても必ず1枚消費してCooldown・補充が起きます。
 *
 * 【計算(暫定)】蓄えた回数 n、各回の上昇率 p(Lv1 0.10 / Lv2,Lv3 0.15)として、
 *   additive(既定): 攻撃力の倍率 = 1 + Σp(例: Lv1を3回 = 1.30)。 multiplicative: Π(1 + p)(例: 1.10^3 = 1.331)。
 *   ワークブックに加算か乗算かの指定は無く、ユーザー承認済みの規則ではありません。切り替えは StackingMode パラメータだけ(計算は1か所 combine())。
 *   上限は設けません。各回はその時点のカードレベルの値を記録するので、同じ戦闘中にレベルが変わっても過去の分は変わりません。
 *
 * 【「攻撃力」を上げる(最終ダメージの倍率ではない)】導入版Hendrixの武器ダメージは、武器のスキル式(例 攻撃: a.atk * 4 - b.def * 2)で
 *   a.atk(攻撃者の攻撃力)と b.def(対象の防御)から計算されます。この層は、その1回の計算の間だけ、主人公のBattlerのparam(攻撃力)に
 *   倍率を差し込み(ProjectR_CardModifiersのヒットフック)、計算の後に必ず外します。基礎ATK・装備・Databaseは変更しません。
 *   式の中で攻撃力が増えるので、防御を引いた後の差は倍率以上に増えます(例: atk 10 → 11 で 4*atk - 2*def は +4)。
 *   Lv3の防御無視は、その計算の間だけ対象の防御(param)を0にします。元素耐性・無効・回避・クリティカル・絶の強化(最終ダメージx倍率)には触れません。
 *
 * 【対象になる攻撃(監査結果)】
 *   ・対象: 通常の武器攻撃(剣 = ProjectR_SwordSystem / G17 = ProjectR_GunSystem)。どちらも UpdateEventHp(-player weapon) を通り、
 *     「攻撃動作ID」(sword:シリアル / gun:シリアル)を渡します。
 *   ・対象外(今回は実装しない): 旧Hermes剣術・Apollo黄金の弓矢などのカードの攻撃。ダメージは Hendrix の checkCollide の時点で
 *     スキル式から計算済みで、UpdateEventHp の時点では攻撃力を差し替えられません(別の橋渡しが必要)。物理かどうかの判断も推測しません。
 *   ・対象外: 薙ぎ払い・一閃などの固定ダメージ(攻撃力を使わない数値)。
 *
 * 【消費の規則】
 *   ・次の通常武器攻撃が「実際にダメージを与えた」とき、蓄えた全回数をまとめて1度だけ消費する。外れ(回避・無効・0ダメージ)では消費しない。
 *   ・1回の攻撃動作(同じ攻撃動作ID)が複数の敵に当たっても、全員に同じ強化がかかり、消費は1度だけ。別の攻撃動作には残りが無い。
 *   ・カードを引いた・メニューを開いた・他の効果が起きた、というだけでは消費しない。
 *   ・戦闘終了・マップ移動・ロード・死亡で消える。保存しない。
 *
 * 【絶との併用】絶の強化(最終ダメージx倍率)と同じ命中に両方が働く: 先にストレングスで攻撃力を上げた武器ダメージを計算し、
 *   その結果に絶の倍率がかかる。どちらも1回の命中につき1度だけ消費される。
 *
 * 【演出】Hermesがプレイヤーの後ろに現れ、足元に魔法陣(VFX Designerライブラリ ProjectR_Strength_Circle)、そこから黄金の光
 *   (ProjectR_Strength_Light)が立ち上る。主人公はガッツポーズ(FistPump)。通常カットイン。Hermesは黒いノイズとともに消える。
 *   表示だけで判定を決めない。音(輝く音)は未用意。
 *
 * API: ProjectRHermesStrength
 *   getPending()  { stacks, values:[...], multiplier, ignoreDefense }(蓄え中。無ければ null)    getLastResult()  getLastAttack()
 *   combine(values) / effectsForLevel(lv) / cardLevel() / stackingMode()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const CARD = "hermes_strength";
    const HOOK_ID = CARD;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_HermesStrength") : {};
    const mode = () => String(params.StackingMode || "additive") === "multiplicative" ? "multiplicative" : "additive";

    // 数値(攻撃力+10%/+15%・Lv3の防御無視)は data/ProjectR_CardBalance.json(ProjectR_CardBalance)が持つ。
    const balance = () => root.ProjectRCardBalance;
    const balanceReady = () => !!balance()?.isReady?.() && !!balance().hasCard(CARD);
    const effectsForLevel = level => balance().effects(CARD, level);
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });

    const cardLevel = () => {
        try {
            const definition = deck.definitions?.card?.(CARD);
            const saved = deck.getPersistentData?.().cardOwnership?.[CARD]?.level;
            const level = Number.parseInt(saved, 10);
            return clamp(Number.isFinite(level) ? level : 1, 1, definition?.maxLevel || 3);
        } catch (_error) {
            return 1;
        }
    };

    // 攻撃力の倍率(重ね掛けの計算はここだけ)
    const combine = values => {
        const list = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);
        if (mode() === "multiplicative") return list.reduce((product, p) => product * (1 + p), 1);
        return 1 + list.reduce((sum, p) => sum + p, 0);
    };

    // ---------- 蓄えた力(実行時のみ。保存しない) ----------
    let pending = null; // { values:[p...], ignoreDefense }
    let claim = null; // 直近の攻撃動作の確定済み強化 { attackId, multiplier, ignoreDefense, stacks }
    let lastResult = null;
    let lastAttack = null;
    let serial = 0;

    const pendingView = () => pending ? { stacks: pending.values.length, values: pending.values.slice(), multiplier: combine(pending.values), ignoreDefense: pending.ignoreDefense } : null;
    const clearAll = reason => {
        if (pending || claim) lastResult = { ...(lastResult || {}), cleared: reason };
        pending = null;
        claim = null;
    };

    // ---------- ヒットフック ----------
    // prepare: 同じ攻撃動作IDなら確定済みの強化をそのまま使う(再消費しない)。初めてなら蓄えを「予約」する。
    // finish: 実際にダメージが入ったときだけ、蓄えを消費して確定する。
    const hook = {
        prepare(context) {
            if (context.kind !== "weapon") return null;
            const attackId = context.attackId !== null && context.attackId !== undefined ? String(context.attackId) : null;
            if (claim && attackId !== null && claim.attackId === attackId) {
                return { atkMultiplier: claim.multiplier, ignoreDefense: claim.ignoreDefense, claimed: claim };
            }
            if (!pending || !pending.values.length) return null;
            const trial = { attackId, multiplier: combine(pending.values), ignoreDefense: pending.ignoreDefense, stacks: pending.values.length, values: pending.values.slice() };
            return { atkMultiplier: trial.multiplier, ignoreDefense: trial.ignoreDefense, trial };
        },
        finish(context, outcome, prepared) {
            const trial = prepared?.trial;
            if (!trial) return;
            const landed = outcome.dealt !== null && outcome.dealt !== undefined ? outcome.dealt > 0 : outcome.landed === true;
            if (!landed) return; // 外れ: 蓄えは残る
            if (pending) { pending = null; } // 蓄えを一度にすべて消費(防御無視も一緒に)
            claim = { attackId: trial.attackId, multiplier: trial.multiplier, ignoreDefense: trial.ignoreDefense, stacks: trial.stacks };
            lastAttack = { serial: ++serial, attackId: trial.attackId, eventId: context.eventId, stacks: trial.stacks, multiplier: trial.multiplier, ignoreDefense: trial.ignoreDefense, dealt: outcome.dealt };
        }
    };
    const modifiers = () => root.ProjectRCardModifiers;
    const registerHook = () => modifiers()?.registerHitHook?.(HOOK_ID, hook) === true;
    const hookRegistered = registerHook();

    // ---------- 発動 ----------
    let planned = null;
    const releaseSummon = id => { try { root.ProjectRGodSummonManager?.release?.(id); } catch (_error) { /* 表示のみ */ } };

    const activate = context => {
        if (!deck.isCardBattleActive()) return failure("battleInactive");
        if (!balanceReady()) return failure("balanceUnavailable");
        if (!hookRegistered && !registerHook()) return failure("hitHookUnavailable");
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        const level = cardLevel(), effects = effectsForLevel(level);
        // Hermes一時召喚(表示用の論理アンカー)。対象が無いので失敗する要因は召喚だけ。蓄えは消費が確定した後に足す。
        const result = summons.perform({ definition: context?.definition, aim: false }, () => ({ ok: true }));
        if (!result?.ok) return failure(result?.reason || "activationFailed");
        planned = { level, effects, summonId: result.summonId };
        return { ok: true };
    };
    const previousInstant = deck.getActivationHandler("instant");
    deck.registerActivationHandler("instant", context => context.definition.cardId === CARD
        ? activate(context) : previousInstant ? previousInstant(context) : { ok: true });

    const present = () => {
        try { root.ProjectRPresentationVfx?.play("hermes_strength.circle", {}); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRPresentationVfx?.play("hermes_strength.light", {}); } catch (_error) { /* 表示のみ */ }
    };
    const resolve = (plan, activation) => {
        if (!pending) pending = { values: [], ignoreDefense: false };
        pending.values.push(plan.effects.attackBonus);
        if (plan.effects.ignoreDefense === true) pending.ignoreDefense = true;
        claim = null; // 新しい蓄えがあるので、直前の攻撃動作の確定は引き継がない
        present();
        lastResult = { ok: true, consumed: true, level: plan.level, instanceId: activation?.instanceId ?? null, pending: pendingView(), mode: mode() };
    };

    const _requestUseCard = deck.requestUseCard;
    deck.requestUseCard = function() {
        planned = null;
        let result;
        try {
            result = _requestUseCard.apply(this, arguments);
        } catch (error) {
            if (planned) releaseSummon(planned.summonId);
            planned = null;
            throw error;
        }
        const plan = planned;
        planned = null;
        if (!plan) return result;
        if (result?.ok === true && result.cardId === CARD) resolve(plan, result);
        else {
            releaseSummon(plan.summonId);
            lastResult = { ok: false, consumed: false, reason: result?.detail || result?.reason || "notConsumed", rolledBack: true };
        }
        return result;
    };

    // ---------- 後片付け ----------
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { if (planned) releaseSummon(planned.summonId); planned = null; clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clearAll("mapSetup"); return _setup.apply(this, arguments); };
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() { clearAll("load"); return _extract.apply(this, arguments); };
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (sceneActive && (pending || claim) && root.ProjectR?.PlayerDeath?.isDead?.() === true) clearAll("playerDead");
    };

    root.ProjectRHermesStrength = Object.freeze({
        CARD,
        get LEVELS() { return balance().levels(CARD); },
        getPending: pendingView,
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getLastAttack: () => lastAttack ? { ...lastAttack } : null,
        combine, effectsForLevel, cardLevel, stackingMode: mode
    });
})();
