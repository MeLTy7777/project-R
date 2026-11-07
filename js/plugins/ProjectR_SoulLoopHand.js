/*:
 * @target MZ
 * @plugindesc v0.2.0 ProjectR SOUL戦闘 L3〜L4-B 準備の手札(10枚ドロー・5枚選択・Q/W/E/R/T割り当て)。準備ループ(prepare:true)のときだけ。カードは消費されず5枠に固定。使用はマナ(承認済みD8コスト)で判定・消費。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_SoulBattle
 * @base ProjectR_SoulLoopData
 * @orderAfter ProjectR_CardDeckCore
 * @orderAfter ProjectR_SoulBattle
 * @orderAfter ProjectR_SoulSkills
 * @orderAfter ProjectR_SoulLoopData
 *
 * @help
 * ProjectR_SoulLoopHand.js
 *
 * 位置づけ: 新ループ(準備 → 攻撃 → 防御)の「準備の手札」の規則(L3)です。画面(キャラ選択・10枚の選択・5枠の割り当て)は ProjectR_SoulBattlePrepare が出します。
 *   準備ループ(ProjectRSoulBattle.start({prepare:true}))のときだけ動き、それ以外(従来の攻撃⇄防御・通常のマップ戦闘)では何も変えません。
 *
 * 承認済みの規則:
 *   D4 準備に入るたびに、選んだキャラの実際のデッキ(ProjectRSoulLoopData.getDeck の30枚)をその都度シャッフルし直して、重複なしに10枚(カード実体)を引く。
 *   D5 10枚のうちちょうど5枚を選び、Q/W/E/R/T に割り当てる。選ばれなかったカードもすべて所持のまま。次の準備では30枚全部をまた混ぜ直す。
 *   D6 割り当てたカードは ATTACK の間ずっと5枠に装備されたままで、使っても消費されない(何度でも使える)。
 *
 * 5枠の固定(カードのコアは変更しません。BattleDeckSession のメソッドを包みます):
 *   ・確定(commit)のとき、いま動いているカード戦闘の手札を、割り当てた5枚に入れ替えます(戦闘は作り直さない = 常駐の神・ゲージ・Divine HPはそのまま)。
 *   ・この「固定手札」の間は、カードを使っても手札から外れず、山札から1枚引く補充も起きません(従来の自動ドロー・手札の入れ替えで5枠が崩れない)。
 *   ・SOULが終わると固定を解きます(5枚の手札と残り25枚の山札のまま、通常の戦闘の規則へ戻る)。
 *
 * 使用の判定と消費(L4-B。ProjectR_SoulMana の承認済み D8 コストを使う。以前の枠ごとのクールダウン slotCooldown は廃止): ATTACK の間、
 *   ・使う前にマナを確認し、足りなければ拒否します(理由 insufficientMana。カード・マナ・効果は何も動かない)。
 *   ・消費はちょうど1回。同期で成功するカードは「カードの消費の確定」(BattleDeckSession.use)のとき。予約型のカード(発動が pending を返す矢)は、発動の時にコスト分を予約し、
 *     発射が成功した時点で確定して消費します(命中・外れは関係なく、外れても返金しません。発射前の失敗・中止だけ解放して消費しません。ProjectR_SoulMana が各カードの読み取り専用の窓口で発射を見ます)。
 *   ・カードは手札に残ったまま、何度でも使えます(マナが足りる限り)。Coreのクールダウンの山は使いません。
 *
 * API: ProjectRSoulHand
 *   DRAW_COUNT(10) / SLOT_COUNT(5)
 *   draw(characterKey, { force }) -> { ok, reused?, serial, characterKey, deckSize, drawn:[{instanceId, cardId, order}] }   準備のときだけ。同じ準備で同じキャラなら引き直さない
 *   toggle(instanceId) / clearSelection() / selectedCount() / assignDefault() / swapSlots(a, b)
 *   commit() -> { ok, slots:[cardId x5] }         いまのカード戦闘の手札を5枠に入れ替える(準備のときだけ・5枚選択済み・割り当て済み)
 *   getState()  診断用(いまの引き・選択・5枠・固定の有無)       isFixed()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const VERSION = "0.1.0";
    const DRAW_COUNT = 10, SLOT_COUNT = 5;
    const deck = root.ProjectRCardDeck;
    if (!deck || !deck.BattleDeckSession) return;
    const proto = deck.BattleDeckSession.prototype;
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const soul = () => root.ProjectRSoulBattle;
    const data = () => root.ProjectRSoulLoopData;
    const phase = () => safe(() => soul()?.getPhase?.(), null);
    const loopRun = () => !!safe(() => soul()?.getState?.()?.prepare, false);
    const copy = value => JSON.parse(JSON.stringify(value));

    // ---------------------------------------------------------------- 準備の状態(実行時だけ。セーブしない) ----------------------------------------------------------------
    const prep = { serial: 0, characterKey: null, deckSize: 0, drawn: [], selected: [], slots: [], round: 0, committed: false, lastResult: null };
    const stats = { draws: 0, reused: 0, commits: 0, rejected: 0, fixedUses: 0, manaBlocked: 0, manaRejectedAtUse: 0, reserved: 0, released: 0 };
    const log = [];
    const note = entry => { log.push(entry); if (log.length > 60) log.shift(); };
    const resetPrep = (keepSerial = true) => {
        prep.characterKey = null; prep.deckSize = 0; prep.drawn = []; prep.selected = []; prep.slots = []; prep.committed = false; prep.lastResult = null;
        if (!keepSerial) prep.serial = 0;
    };

    // ---------------------------------------------------------------- BattleDeckSession の固定手札(準備ループで確定したときだけ有効) ----------------------------------------------------------------
    let live = null;                       // いま動いているカード戦闘のセッション(start で記録。end で外す)
    const origStart = proto.start, origUse = proto.use, origSnapshot = proto.snapshot, origEnd = proto.end;
    const mana = () => root.ProjectRSoulMana;
    proto.start = function() {
        const result = origStart.apply(this, arguments);
        if (result && result.ok) { live = this; this._soulFixed = null; }
        return result;
    };
    proto.end = function() {
        if (live === this) live = null;
        this._soulFixed = null;
        return origEnd.apply(this, arguments);
    };
    proto.use = function(instanceId) {
        const fixed = this._soulFixed;
        if (!fixed) return origUse.apply(this, arguments);
        if (!this.state) return { ok: false, reason: "BATTLE_NOT_STARTED" };
        const index = this.state.hand.findIndex(card => card.instanceId === instanceId);
        if (index < 0) return { ok: false, reason: "CARD_NOT_IN_HAND" };
        // 固定手札: 手札から外さない・山札から補充しない・Coreのクールダウンの山へ入らない(消費されない)。
        // マナ(L4-B): 「カードの消費の確定」= ここで、承認済みのコストをちょうど1回だけ引く。足りなければ失敗(カードも消費されない)。
        const m = mana();
        if (m && m.isActive && m.isActive()) {
            const paid = m.settle(instanceId, this.state.hand[index].cardId);
            if (!paid.ok) { stats.manaRejectedAtUse++; return { ok: false, reason: paid.reason || "insufficientMana" }; }
        }
        fixed.uses++; stats.fixedUses++;
        return { ok: true, state: this.snapshot() };
    };
    proto.snapshot = function() {
        const snap = origSnapshot.apply(this, arguments);
        if (snap && this._soulFixed) snap.soulFixed = { uses: this._soulFixed.uses, serial: this._soulFixed.serial };
        return snap;
    };
    // ATTACK の使用: 使う前にマナを確認する(足りなければ拒否。カード・マナ・効果は何も動かない)。予約型のカード(pending)はコスト分を予約する。
    // PREPARE / DEFENSE の遮断(soulPrepare / soulDefense)はコントローラが先に行う(ここでは ATTACK のときだけ判定する)。
    if (typeof deck.requestUseCard === "function") {
        const original = deck.requestUseCard;
        deck.requestUseCard = function(handIndex) {
            const fixed = live && live._soulFixed, m = mana();
            if (fixed && m && m.isActive && m.isActive() && phase() === "attack" && Number.isInteger(handIndex)) {
                const card = live.state && live.state.hand[handIndex];
                if (card) {
                    const q = m.quote(card.cardId);
                    if (!q.ok) { stats.manaBlocked++; return { ok: false, reason: q.reason, reasons: [{ code: q.reason, cost: q.cost, available: q.available }], handIndex }; }
                    const result = original.apply(this, arguments);
                    if (result && result.pending === true && result.instanceId) { if (m.reserve(result.instanceId, card.cardId).ok) stats.reserved++; }
                    return result;
                }
            }
            return original.apply(this, arguments);
        };
    }
    const sessionReady = () => !!live && !!live.state && !!safe(() => deck.isCardBattleActive?.(), false);

    // ---------------------------------------------------------------- 引く(D4) ----------------------------------------------------------------
    const names = id => safe(() => root.ProjectRSoulBattleHUD?.cardName?.(id), null) || id;
    const draw = (characterKey, options = {}) => {
        if (phase() !== "prepare" || !loopRun()) { stats.rejected++; return { ok: false, reason: "notPreparing" }; }
        const key = String(characterKey ?? "");
        if (prep.characterKey === key && prep.drawn.length === DRAW_COUNT && !options.force) { stats.reused++; return { ok: true, reused: true, ...view() }; }
        const character = safe(() => data().getCharacter(key), null);
        if (!character || !character.eligible) { stats.rejected++; return { ok: false, reason: "unknownCharacter" }; }
        const source = safe(() => data().getDeck(key), null);
        if (!source || !source.ok) { stats.rejected++; return { ok: false, reason: source?.reason || "NO_CHARACTER_DECK" }; }
        if (!source.valid) { stats.rejected++; return { ok: false, reason: "INVALID_DECK", reasons: copy(source.reasons || []) }; }
        const ids = source.cardIds;
        if (ids.length < DRAW_COUNT) { stats.rejected++; return { ok: false, reason: "DECK_TOO_SMALL" }; }
        // 準備に入るたびに、その場でシャッフルし直す(前の並びを引き継がない)。実体(インスタンス)ごとに重複なしで10枚引く
        prep.serial++;
        const instances = ids.map((cardId, i) => ({ instanceId: `soul-${prep.serial}-${i + 1}`, cardId }));
        for (let i = instances.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [instances[i], instances[j]] = [instances[j], instances[i]]; }
        prep.characterKey = key; prep.deckSize = instances.length; prep.round = safe(() => soul().getState().round, 0);
        prep.drawn = instances.slice(0, DRAW_COUNT).map((c, i) => ({ instanceId: c.instanceId, cardId: c.cardId, order: i + 1 }));
        prep.selected = []; prep.slots = []; prep.committed = false;
        stats.draws++;
        prep.lastResult = { type: "draw", serial: prep.serial, characterKey: key, deckSize: prep.deckSize, drawn: prep.drawn.map(c => c.cardId) };
        note(prep.lastResult);
        return { ok: true, reused: false, ...view() };
    };
    const view = () => ({ serial: prep.serial, characterKey: prep.characterKey, deckSize: prep.deckSize, remaining: Math.max(0, prep.deckSize - prep.drawn.length), drawn: prep.drawn.map(c => ({ ...c })) });

    // ---------------------------------------------------------------- 選ぶ(D5)・割り当てる ----------------------------------------------------------------
    const toggle = instanceId => {
        if (phase() !== "prepare") return { ok: false, reason: "notPreparing" };
        if (!prep.drawn.some(c => c.instanceId === instanceId)) return { ok: false, reason: "notDrawn" };
        const index = prep.selected.indexOf(instanceId);
        if (index >= 0) { prep.selected.splice(index, 1); prep.slots = []; return { ok: true, selected: [...prep.selected], count: prep.selected.length, removed: true }; }
        if (prep.selected.length >= SLOT_COUNT) return { ok: false, reason: "selectionFull", count: prep.selected.length };
        prep.selected.push(instanceId); prep.slots = [];
        return { ok: true, selected: [...prep.selected], count: prep.selected.length, removed: false };
    };
    const clearSelection = () => { prep.selected = []; prep.slots = []; return true; };
    // 選んだ順を Q/W/E/R/T の初期の割り当てにする(ちょうど5枚のときだけ)
    const assignDefault = () => {
        if (prep.selected.length !== SLOT_COUNT) return { ok: false, reason: "needFive", count: prep.selected.length };
        prep.slots = [...prep.selected];
        return { ok: true, slots: [...prep.slots] };
    };
    const swapSlots = (a, b) => {
        if (prep.slots.length !== SLOT_COUNT) return { ok: false, reason: "notAssigned" };
        if (![a, b].every(i => Number.isInteger(i) && i >= 0 && i < SLOT_COUNT)) return { ok: false, reason: "invalidSlot" };
        [prep.slots[a], prep.slots[b]] = [prep.slots[b], prep.slots[a]];
        return { ok: true, slots: [...prep.slots] };
    };
    const slotCards = () => prep.slots.map(id => prep.drawn.find(c => c.instanceId === id) || null);

    // ---------------------------------------------------------------- 確定: いまのカード戦闘の手札を5枠へ(戦闘は作り直さない) ----------------------------------------------------------------
    const commit = () => {
        if (phase() !== "prepare" || !loopRun()) { stats.rejected++; return { ok: false, reason: "notPreparing" }; }
        if (prep.slots.length !== SLOT_COUNT || prep.slots.some(id => !prep.drawn.some(c => c.instanceId === id)) || new Set(prep.slots).size !== SLOT_COUNT) { stats.rejected++; return { ok: false, reason: "notAssigned" }; }
        if (!sessionReady()) { stats.rejected++; return { ok: false, reason: "noCardBattle" }; }
        const wanted = slotCards().map(c => c.cardId);
        const s = live.state;
        const pool = [...s.hand, ...s.drawPile, ...s.discardPile, ...s.cooldownPile.map(e => e.instance)];
        const hand = [];
        for (const cardId of wanted) {                                           // 同じカードの別の実体(重複)は、それぞれ別の1枚として取り出す
            const i = pool.findIndex(c => c.cardId === cardId);
            if (i < 0) { stats.rejected++; return { ok: false, reason: "sessionDeckMismatch", cardId }; }
            hand.push(pool.splice(i, 1)[0]);
        }
        s.hand = hand; s.drawPile = pool; s.discardPile = []; s.cooldownPile = [];
        live._soulFixed = { uses: 0, serial: prep.serial };
        prep.committed = true; stats.commits++;
        prep.lastResult = { type: "commit", serial: prep.serial, slots: wanted };
        note(prep.lastResult);
        return { ok: true, slots: wanted, instanceIds: hand.map(c => c.instanceId), serial: prep.serial };
    };

    // ---------------------------------------------------------------- フェーズ・終了 ----------------------------------------------------------------
    const release = reason => {
        if (live && live._soulFixed) { live._soulFixed = null; stats.released++; note({ type: "release", reason }); }
    };
    if (soul()?.onPhase) {
        soul().onPhase(event => {
            if (event && event.to === "prepare") resetPrep();                    // 準備に入るたびに、前の引き・選択は捨てる(次の準備で30枚を混ぜ直す)
        });
        soul().onEnd(payload => { resetPrep(); release("soulEnd"); });
    }

    root.ProjectRSoulHand = Object.freeze({
        VERSION, DRAW_COUNT, SLOT_COUNT,
        draw, toggle, clearSelection, assignDefault, swapSlots, commit,
        selectedCount: () => prep.selected.length,
        isFixed: () => !!(live && live._soulFixed),
        getState: () => ({
            ...view(), selected: [...prep.selected], selectedCards: prep.selected.map(id => prep.drawn.find(c => c.instanceId === id)).filter(Boolean).map(c => ({ ...c })),
            slots: [...prep.slots], slotCards: slotCards().map(c => (c ? { ...c } : null)), committed: prep.committed, fixed: !!(live && live._soulFixed),
            lastResult: prep.lastResult && copy(prep.lastResult), stats: { ...stats }
        }),
        getLog: () => log.map(entry => ({ ...entry }))
    });
})();
