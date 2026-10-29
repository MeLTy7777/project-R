/*:
 * @target MZ
 * @plugindesc v1.0.0 Hermes「ヴェイル」(設計ID 3): マウスに追従する半径5マスの魔法陣。5秒間、範囲内の味方は敵に標的にされず(Lv2 移動速度+30% / Lv3 クリティカル率+50%)。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardTargeting
 * @base ProjectR_TargetEligibility
 * @base ProjectR_CardModifiers
 * @base ProjectR_GodSummonVisual
 * @base ProjectR_PresentationVfx
 * @orderAfter ProjectR_CardModifiers
 * @orderAfter ProjectR_CardTargeting
 * @orderAfter ProjectR_TargetEligibility
 * @orderAfter ProjectR_GodSummonVisual
 * @orderAfter ProjectR_PresentationVfx
 * @orderAfter ProjectR_CutIn
 *
 * @param CriticalMode
 * @text Lv3 クリティカル率+50%の計算(暫定)
 * @desc ワークブックは「クリティカル発生率が50%上昇」とだけ書いていて、相対(自然な率の1.5倍)か絶対(+50ポイント)か決まっていません。additive = +50ポイント(既定の暫定)、relative = 自然な率x1.5。
 * @type select
 * @option additive(+50ポイント)
 * @value additive
 * @option relative(x1.5)
 * @value relative
 * @default additive
 *
 * @param OverlapPolicy
 * @text 複数のヴェイルが同時にあるとき(暫定)
 * @desc ワークブックに規定なし。coexist = 並行して存在(効果は重ねず「どれかの範囲内なら受ける」)、replace = 新しいヴェイルが古いものを終わらせる。
 * @type select
 * @option coexist
 * @value coexist
 * @option replace
 * @value replace
 * @default coexist
 *
 * @param RequireFriendlyInside
 * @text 発動時に範囲内の味方が必要か(暫定)
 * @desc ワークブックは「半径5マス以内にいるとバフを受けられる / 範囲外にいると失敗」と書き、空の円で発動できるかは決まっていません。false = 空でも発動を受理し、味方が入るのを待つ(既定の暫定)。true = 範囲内に味方がいなければ非消費で失敗。
 * @type boolean
 * @default false
 *
 * @param FriendlyEventTag
 * @text 味方Eventのnotetag
 * @desc このnotetagを含むEventを、主人公のほかに「効果を受けられる味方」として扱う(製品の味方マップAIは未実装。DEV/将来用の接続点)。
 * @type string
 * @default <npc>
 *
 * @help
 * ProjectR_HermesVeil.js
 *
 * 新カード「ヴェイル」(ワークブック「カード一覧」のCard ID 3)。ランタイムIDは hermes_veil。
 * Hermes / 特殊 / 最大3枚 / 最大Lv3 / Cooldown 10秒 / 対象タイプ Cursor / 有効範囲 半径5マス / 射程 画面内ならどこでも /
 * 効果時間 5秒 / 暗い紫 / ダメージなし。定義はProjectR_CardCatalogが実行時に追加します。
 *
 * 【仕様(ワークブックと、ユーザーの後からの明確化)】
 *   「その他」の対象タイプは Cursor = マウスポインタに追従する範囲(発動点に固定するGroundではない)。
 *   発動すると、マウスの位置にHermesが現れて地面に手を付け、暗い紫の魔法陣(半径5マス)を作る。5秒の間、魔法陣とHermesは
 *   毎フレームの「今のマウス位置」に付いていく。5秒たつとHermesは黒いノイズとともに消え、魔法陣も消える。
 *   Cursor は時間制限のある継続範囲で、飛び道具でも固定の地面魔法でも常駐のUltimate神でもない。
 *   カードの消費・Cooldown・手札の入れ替えは発動の1回だけ。マウスを動かしても再消費・Cooldownのやり直し・効果時間のやり直しはしない。
 *
 * 【レベル(累積。同じ効果の新しい数値は置換)】
 *   Lv1: 範囲内の味方は敵に標的にされなくなる(5秒)。無敵ではない: ダメージ・衝突・環境ダメージ・すでに出た攻撃は変わらない。
 *   Lv2: Lv1 + 範囲内の味方の移動速度+30%(x1.3)。範囲内にいる間だけ。範囲を出ると、自分の係数だけを外す(他の速度修飾は残る)。
 *   Lv3: Lv1+Lv2 + 範囲内の味方のクリティカル発生率+50%。
 *        【暫定】相対か絶対かが不明のため CriticalMode で切替(既定 additive = +50ポイント、relative = 自然な率x1.5)。
 *        実際のダメージ計算(ProjectR_CardModifiers のヒットフック → 公式のクリティカル抽選)に組み込む。確定クリティカル(葦笛)があれば
 *        確定が優先で二重に掛けない。絶の武器ヒット強化中は、絶の仕様(強化がクリティカル相当)を優先して確率の調整は使わない。
 *
 * 【動的な出入り】 範囲は効果中ずっと毎フレーム評価する。味方(の当たり判定の中心)が円に入った瞬間に、その時のレベルの効果を受け、
 *   出た瞬間に止まる。マウスを動かして円が味方を覆わなくなれば止まり、覆えばまた受けられる。効果時間はそのまま(出入りでやり直さない)。
 *   効果は味方の場所に固定されない。
 *
 * 【発動の成否】 ワークブックの「発動成功条件: 半径5マス以内にいるとバフを受けられる / 発動失敗条件: 範囲外にいると失敗」は、
 *   個々の味方が効果を受ける条件として実装する(範囲外の味方は効果を受けない)。カードそのものの発動は、戦闘中で、マウスが画面内の
 *   有効な位置にあれば受理される。無効(マウスが画面外・数値でない・戦闘中でない)は非消費で失敗する。
 *   【未確定】空の円(範囲内に味方がいない)で発動を受理するかは RequireFriendlyInside で切替(既定: 受理して味方の侵入を待つ)。
 *
 * 【標的選択(敵AI)との連携】 ProjectR_TargetEligibility に「秘匿」を登録する。敵がHendrixの範囲検知(checkInRange)・
 *   覚えた標的(_detectedEvent / lockInTarget)で味方を標的にしようとしても、秘匿中は選べず、古いキャッシュも外れる。
 *   効果が終われば(または円を出れば)また標的にできる。製品用の共通敵AIは未実装(ProjectR_HermesB3A.md に検証範囲を分けて記録)。
 *
 * 【味方】 主人公と、FriendlyEventTag(既定 <npc>)のEvent、registerFriendlyProvider で追加した参照。製品用の味方のマップAIは未実装です。
 *   参照は { id, character }(characterはGame_Character)。
 *
 * 【複数のヴェイル】 OverlapPolicy。coexist(既定の暫定)では独立した魔法陣・独立した5秒が並行し、効果は「どれかの範囲内」なら一度だけ(速度x1.3を二重に掛けない)。
 *
 * 【後片付け】 効果時間の満了(Hermesは黒いノイズで消える)、戦闘終了、主人公の死亡、マップ移動、ロード/ニューゲーム ですべて終わらせる。
 *   標的の秘匿・移動速度の係数・Hermesの表示Event・魔法陣/オーラのVFXを外す。保存しない。Actorのステータスやデータベースは変えない。
 *
 * 【演出】 VFX Designerライブラリ ProjectR_Veil_Circle(魔法陣)/ProjectR_Veil_Touch(手を付く波紋)/ProjectR_Veil_Aura(効果を受けている味方)。
 *   Hermesの表示EventをマウスへProjectR_GodSummonVisualが移動し、魔法陣はそのEventに結び付いて付いていく。VFXは判定・時間・速度・クリティカルを持たない。
 *   主人公のモーションなし。通常カットイン。重低音は検証済みの素材が無く未用意。
 *
 * API: ProjectRHermesVeil
 *   getActive()  [{ serial, level, remaining, center:{x,y}, members:[id], pointerHeld }]   getLastResult()   effectsForLevel(lv) / cardLevel()
 *   containsFriendly(id) / isConcealed(character) / membersOf(serial) / friendlyRefs() / criticalBonusFor(attackerId)
 *   registerFriendlyProvider(id, () => [{ id, character }]) / unregisterFriendlyProvider(id)
 *   tick(seconds)  (テスト用: 通常は ProjectRCardDeck.updateCooldown が毎フレーム呼ぶ)   clearAll(reason)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const CARD = "hermes_veil";
    const SPEED_ID = CARD;
    const HOOK_ID = CARD;
    const CONCEAL_ID = CARD;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_HermesVeil") : {};

    // 正本(ワークブック)の値。変更はユーザーの設計変更なので、パラメータにはしない。
    const RADIUS_TILES = 5;
    const DURATION_SECONDS = 5;
    const SPEED_BONUS = 0.30;
    const CRIT_BONUS = 0.50;
    const EXPIRE_EPSILON = 1e-6;
    // 暫定(ワークブックに指定なし。パラメータで変更できる)
    const criticalMode = () => String(params.CriticalMode || "additive") === "relative" ? "relative" : "additive";
    const overlapPolicy = () => String(params.OverlapPolicy || "coexist") === "replace" ? "replace" : "coexist";
    const requireFriendly = () => String(params.RequireFriendlyInside || "false") === "true";
    const FRIENDLY_TAG = String(params.FriendlyEventTag === undefined ? "<npc>" : params.FriendlyEventTag);

    const LEVELS = Object.freeze([
        Object.freeze({ level: 1, effects: Object.freeze({ concealment: true, radiusTiles: RADIUS_TILES, durationSeconds: DURATION_SECONDS }) }),
        Object.freeze({ level: 2, effects: Object.freeze({ speedBonus: SPEED_BONUS }) }),
        Object.freeze({ level: 3, effects: Object.freeze({ criticalChanceBonus: CRIT_BONUS }) })
    ]);
    const effectsForLevel = level => root.ProjectRCardCatalog.resolveLevels(LEVELS, level);
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const targeting = () => root.ProjectRCardTargeting;
    const modifiers = () => root.ProjectRCardModifiers;
    const eligibility = () => root.ProjectRTargetEligibility;
    const visual = () => root.ProjectRGodSummonVisual;
    const vfx = () => root.ProjectRPresentationVfx;
    const safely = (callback, fallback) => { try { return callback(); } catch (_error) { return fallback; } };

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

    // ---------- 味方(データ駆動の参照) ----------
    const providers = new Map(); // id -> () => [{ id, character }]
    const registerFriendlyProvider = (id, provider) => {
        if (!String(id ?? "") || typeof provider !== "function") return false;
        providers.set(String(id), provider);
        return true;
    };
    const unregisterFriendlyProvider = id => providers.delete(String(id));
    registerFriendlyProvider("player", () => typeof $gamePlayer !== "undefined" && $gamePlayer ? [{ id: "player", character: $gamePlayer }] : []);
    registerFriendlyProvider("taggedEvents", () => {
        if (!FRIENDLY_TAG || typeof $gameMap === "undefined" || !$gameMap) return [];
        const hostileTag = eligibility()?.diagnostics?.().hostileTag || "<enemy>";
        const refs = [];
        for (const event of $gameMap.events()) {
            const note = event && !event._erased && typeof event.event === "function" ? event.event()?.note : null;
            if (typeof note === "string" && note.includes(FRIENDLY_TAG) && !note.includes(hostileTag)) refs.push({ id: "event:" + event.eventId(), character: event });
        }
        return refs;
    });
    const friendlyRefs = () => {
        const refs = [], seen = new Set();
        for (const provider of providers.values()) {
            for (const ref of safely(provider, []) || []) {
                if (!ref || !ref.character || seen.has(ref.id)) continue;
                seen.add(ref.id);
                refs.push(ref);
            }
        }
        return refs;
    };
    const eventIdOf = character => character === (typeof $gamePlayer !== "undefined" ? $gamePlayer : null) ? "player" : (typeof character.eventId === "function" ? character.eventId() : null);

    // ---------- 実行中の効果(実行時のみ。保存しない) ----------
    const records = []; // { serial, level, effects, remaining, center, pointerHeld, map, visualId, circleNote, members:Set }
    const auras = new Map(); // friend id -> { note, character }
    const speedApplied = new Map(); // friend id -> character
    let lastResult = null;
    let serial = 0;
    const live = () => records.filter(record => record.map === (typeof $gameMap !== "undefined" ? $gameMap : null));
    const inside = (record, ref) => targeting().circleContains(record.center, record.effects.radiusTiles, ref.character);

    const isConcealed = character => {
        if (!records.length || !character) return false;
        const ref = friendlyRefs().find(item => item.character === character);
        return !!ref && live().some(record => record.effects.concealment === true && inside(record, ref));
    };
    const criticalBonusFor = attackerId => {
        if (!records.length) return 0; // ヴェイルが無いときは何も調べない(毎回のダメージ処理を重くしない)
        let bonus = 0;
        const ref = friendlyRefs().find(item => item.id === String(attackerId));
        if (!ref) return 0;
        for (const record of live()) if (record.effects.criticalChanceBonus > bonus && inside(record, ref)) bonus = record.effects.criticalChanceBonus;
        return bonus;
    };

    const hook = {
        prepare(context) {
            const bonus = criticalBonusFor(context.attacker ?? "player");
            if (!(bonus > 0)) return null;
            return criticalMode() === "relative" ? { critChanceScale: 1 + bonus } : { critChanceBonus: bonus };
        }
    };
    // 秘匿の登録は、ヴェイルが1つでも動いている間だけ(無いときはHendrixの検知に一切介入しない)。ヒットフックは常に登録(中は早期に抜ける)。
    const registerIntegrations = () => modifiers()?.registerHitHook?.(HOOK_ID, hook) === true && !!eligibility()?.registerConcealment;
    const syncConcealment = () => {
        if (records.length) eligibility()?.registerConcealment?.(CONCEAL_ID, isConcealed);
        else eligibility()?.unregisterConcealment?.(CONCEAL_ID);
    };
    let integrated = registerIntegrations();

    // 範囲内の味方に応じて、移動速度の係数・オーラを合わせる。
    const reconcile = () => {
        const refs = friendlyRefs(), now = live();
        const wantSpeed = new Map(), wantAura = new Map();
        for (const ref of refs) {
            let speed = 0, any = false;
            for (const record of now) {
                if (!inside(record, ref)) continue;
                any = true;
                if (record.effects.speedBonus > speed) speed = record.effects.speedBonus;
            }
            if (speed > 0) wantSpeed.set(ref.id, { ref, speed });
            if (any) wantAura.set(ref.id, ref);
        }
        for (const [id, character] of [...speedApplied]) {
            if (!wantSpeed.has(id)) { safely(() => modifiers().clearCharacterSpeedFactor(character, SPEED_ID)); speedApplied.delete(id); }
        }
        for (const [id, { ref, speed }] of wantSpeed) {
            if (modifiers()?.setCharacterSpeedFactor?.(ref.character, SPEED_ID, 1 + speed)?.ok) speedApplied.set(id, ref.character);
        }
        for (const [id, aura] of [...auras]) {
            if (!wantAura.has(id)) { safely(() => vfx()?.stop?.(aura.note)); auras.delete(id); }
        }
        for (const [id, ref] of wantAura) {
            if (auras.has(id)) continue;
            const result = safely(() => vfx()?.play?.("hermes_veil.aura", { eventId: eventIdOf(ref.character), instance: `${id}.${++serial}` }), null);
            if (result?.ok && result.note) auras.set(id, { note: result.note, character: ref.character });
        }
        for (const record of now) record.members = new Set(refs.filter(ref => inside(record, ref)).map(ref => ref.id));
    };

    const endRecord = (record, reason, vanish) => {
        const index = records.indexOf(record);
        if (index >= 0) records.splice(index, 1);
        syncConcealment();
        safely(() => vfx()?.stop?.(record.circleNote));
        if (record.visualId) {
            if (vanish && record.map === $gameMap) safely(() => visual()?.vanishFollower?.(record.visualId));
            else safely(() => visual()?.removeFollower?.(record.visualId));
        }
        lastResult = { ...(lastResult || {}), lastEnd: { serial: record.serial, reason } };
    };
    const clearAll = (reason, options = {}) => {
        for (const record of [...records]) {
            if (options.skipVisual) { const i = records.indexOf(record); if (i >= 0) records.splice(i, 1); } else endRecord(record, reason, false);
        }
        if (options.skipVisual) { auras.clear(); } else for (const [, aura] of auras) safely(() => vfx()?.stop?.(aura.note));
        auras.clear();
        for (const [, character] of speedApplied) safely(() => modifiers().clearCharacterSpeedFactor(character, SPEED_ID));
        speedApplied.clear();
        syncConcealment();
    };

    // 戦闘時間(カードのCooldownと同じ時計)で進める。操作不能中(メニュー・会話)は進まず、位置も更新しない。
    const tick = seconds => {
        if (!records.length && !speedApplied.size && !auras.size) return;
        if (!deck.isCardBattleActive()) { clearAll("battleInactive"); return; }
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        const pointer = targeting().pointer();
        for (const record of [...records]) {
            if (record.map !== $gameMap) { endRecord(record, "mapChanged", false); continue; }
            if (pointer.ok) { record.center = { x: pointer.world.x, y: pointer.world.y }; record.pointerHeld = false; } else record.pointerHeld = true;
            record.remaining = Math.max(0, record.remaining - seconds);
            if (record.remaining < EXPIRE_EPSILON) { endRecord(record, "expired", true); continue; }
            if (record.visualId) safely(() => visual()?.moveFollower?.(record.visualId, record.center));
        }
        reconcile();
    };
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _updateCooldown.apply(this, arguments);
        tick(seconds);
        return result;
    };

    // ---------- 発動 ----------
    // 流れ: handlerが検証と計画(状態を変えない)→ ルーターがカードを1回だけ消費 → 確定後に効果とHermesの表示を始める。
    let pending = null;
    const environment = () => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        if (!player || !map || typeof player.centerPositionPoint !== "function") return failure("mapUnavailable");
        if (!(typeof SceneManager !== "undefined" && SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return failure("mapUnavailable");
        if (!targeting() || !eligibility() || !modifiers()) return failure("targetingUnavailable");
        if (root.ProjectR?.PlayerDeath?.isDead?.() === true) return failure("playerDead");
        return { ok: true };
    };
    const activate = () => {
        if (!deck.isCardBattleActive() || !root.ProjectRCardCatalog) return failure("battleInactive");
        const env = environment();
        if (!env.ok) return env;
        if (!integrated) integrated = registerIntegrations();
        if (!integrated) return failure("integrationUnavailable");
        const pointer = targeting().pointer();
        if (!pointer.ok) return failure(pointer.reason || "invalidPointer");
        const level = cardLevel(), effects = effectsForLevel(level);
        if (requireFriendly()) {
            const probe = { center: pointer.world, effects };
            if (!friendlyRefs().some(ref => inside(probe, ref))) return failure("noFriendlyInArea");
        }
        pending = { level, effects, center: { x: pointer.world.x, y: pointer.world.y } };
        return { ok: true };
    };
    const previousCursor = deck.getActivationHandler("cursor");
    deck.registerActivationHandler("cursor", context => context.definition.cardId === CARD
        ? activate(context) : previousCursor ? previousCursor(context) : { ok: true });

    const startVisuals = record => {
        const follower = safely(() => visual()?.spawnFollower?.("hermes", record.center, { cardId: CARD }), null);
        if (follower?.ok) {
            record.visualId = follower.id;
            const circle = safely(() => vfx()?.play?.("hermes_veil.circle", { eventId: follower.eventId, radiusTiles: record.effects.radiusTiles, instance: record.serial }), null);
            if (circle?.ok && circle.note) record.circleNote = circle.note;
            safely(() => vfx()?.play?.("hermes_veil.touch", { eventId: follower.eventId, instance: record.serial }));
        }
    };
    const resolve = (plan, activation) => {
        if (overlapPolicy() === "replace") for (const old of [...records]) endRecord(old, "replaced", true);
        const record = { serial: ++serial, level: plan.level, effects: plan.effects, remaining: plan.effects.durationSeconds, center: plan.center,
            pointerHeld: false, map: $gameMap, visualId: 0, circleNote: null, members: new Set() };
        records.push(record);
        syncConcealment();
        startVisuals(record);
        reconcile(); // 発動の瞬間に範囲内の味方がいれば、すぐ効果を受ける
        lastResult = { ok: true, consumed: true, level: plan.level, serial: record.serial, effects: plan.effects, instanceId: activation?.instanceId ?? null,
            members: [...record.members], criticalMode: criticalMode(), overlapPolicy: overlapPolicy() };
    };

    const _requestUseCard = deck.requestUseCard;
    deck.requestUseCard = function() {
        pending = null;
        let result;
        try {
            result = _requestUseCard.apply(this, arguments);
        } catch (error) {
            pending = null;
            throw error;
        }
        const plan = pending;
        pending = null;
        if (!plan) return result;
        if (result?.ok === true && result.cardId === CARD) resolve(plan, result);
        else lastResult = { ok: false, consumed: false, reason: result?.detail || result?.reason || "notConsumed", rolledBack: true };
        return result;
    };

    // ---------- 後片付け ----------
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { pending = null; clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    // マップ移動: 旧マップのEvent・VFXはマップごと/各Pluginが片付ける。ここでは状態と主人公の係数だけを戻す。
    Game_Map.prototype.setup = function() { pending = null; clearAll("mapSetup", { skipVisual: true }); return _setup.apply(this, arguments); };
    for (const method of ["extractSaveContents", "setupNewGame"]) {
        const original = DataManager[method];
        if (typeof original !== "function") continue;
        DataManager[method] = function() { pending = null; clearAll(method, { skipVisual: true }); return original.apply(this, arguments); };
    }
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (sceneActive && (records.length || speedApplied.size) && root.ProjectR?.PlayerDeath?.isDead?.() === true) clearAll("playerDead");
    };

    root.ProjectRHermesVeil = Object.freeze({
        CARD, LEVELS, RADIUS_TILES, DURATION_SECONDS,
        getActive: () => records.map(r => ({ serial: r.serial, level: r.level, remaining: r.remaining, center: { ...r.center }, members: [...r.members],
            pointerHeld: r.pointerHeld, visualId: r.visualId, effects: r.effects })),
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        effectsForLevel, cardLevel, criticalMode, overlapPolicy,
        friendlyRefs, registerFriendlyProvider, unregisterFriendlyProvider,
        isConcealed, criticalBonusFor,
        containsFriendly: id => live().some(record => record.members.has(String(id))),
        membersOf: serialNumber => { const r = records.find(item => item.serial === serialNumber); return r ? [...r.members] : []; },
        tick, clearAll
    });
})();
