/*:
 * @target MZ
 * @plugindesc v1.0.0 Hermes「サイコポンポス」(設計ID 2): 10秒間、主人公が倒した敵が魂を落とす。半径5マス以内の魂を拾うとHP回復(Lv1 50 / Lv2 100 / Lv3 150 + 攻撃力+3%を3秒・重ね掛け)。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardModifiers
 * @base ProjectR_KillAttribution
 * @base ProjectR_SoulCollection
 * @base ProjectR_GodSummonVisual
 * @base ProjectR_PresentationVfx
 * @base ProjectR_CharacterPresentation
 * @orderAfter ProjectR_CardModifiers
 * @orderAfter ProjectR_KillAttribution
 * @orderAfter ProjectR_SoulCollection
 * @orderAfter ProjectR_GodSummonVisual
 * @orderAfter ProjectR_PresentationVfx
 * @orderAfter ProjectR_CharacterPresentation
 * @orderAfter ProjectR_CutIn
 *
 * @param StackingMode
 * @text 攻撃力上昇の重ね掛けの計算(暫定)
 * @desc ワークブックは「攻撃力上昇3%(重ね掛けあり)」とだけ書き、加算か乗算かは未定です。additive = 倍率 1 + 0.03 x 個数(既定の暫定)、multiplicative = 1.03 の個数乗。
 * @type select
 * @option additive
 * @option multiplicative
 * @default additive
 *
 * @param AfterWindow
 * @text 効果時間が終わった後の未回収の魂(暫定)
 * @desc ワークブックに規定なし。remove = 10秒の効果時間が終わると、拾われていない魂は消える(既定の暫定)。keep = 戦闘が終わるまで残り、効果時間のあとも拾える。
 * @type select
 * @option remove
 * @option keep
 * @default remove
 *
 * @param RecastPolicy
 * @text 効果中にもう一度発動したとき(暫定)
 * @desc ワークブックに規定なし。refresh = 残り時間を10秒に戻す(既定の暫定、魂の数は増えない)。extend = 残り時間に10秒を足す。
 * @type select
 * @option refresh
 * @option extend
 * @default refresh
 *
 * @param CollectAtFullHp
 * @text HPが満タンのときも魂を回収するか(暫定)
 * @desc ワークブックに規定なし。true = 満タンでも回収する(回復量0、Lv3の攻撃力上昇は得られる。既定の暫定)。false = 満タンのあいだは回収しない(魂は残る)。
 * @type boolean
 * @default true
 *
 * @param MaxHermesVisuals
 * @text Hermesの攻撃演出の同時数
 * @desc 多数の敵が同時に倒れたときにEventを増やしすぎないための上限。超えた分はHermesを出さない(魂・主人公のモーションは出る。判定は変わらない)。
 * @type number
 * @min 0
 * @default 3
 *
 * @help
 * ProjectR_HermesPsychopomp.js
 *
 * 新カード「サイコポンポス」(ワークブック「カード一覧」のCard ID 2)。ランタイムIDは hermes_psychopomp。
 * Hermes / 通常 / 最大3枚 / 最大Lv3 / Cooldown 10秒 / ワークブックの対象タイプ表記は Heal / 有効範囲 半径5マス / 射程 画面内ならどこでも /
 * 複数対象 はい / 壁越え いいえ / 効果時間 10秒 / 青白 / ダメージなし。定義はProjectR_CardCatalogが実行時に追加します。
 *
 * 【対象タイプについて】ワークブックの「Heal」は、このカードが「魂を拾って主人公を回復する」ことを指す表記で、既存の Heal(最寄りの味方を選ぶ)
 *   の意味ではありません。実行時の対象タイプは「対象を選ばない」instant にし、ワークブックの表記は設計メタデータ(workbookTargetType: Heal)に残します。
 *   既存の ally/Heal の選択の仕組みには触れません。
 *
 * 【発動】受理されると、カードは1回だけ消費され、Cooldownと補充が始まり、10秒の「回収の時間」が始まる。敵や魂が無くても発動できる。
 *   発動しただけでは回復しない。
 *
 * 【魂が落ちる条件】回収の時間のあいだ、「主人公がとどめを刺したと確かめられた」敵だけが魂を落とす(撃破の帰属 = ProjectR_KillAttribution)。
 *   ・主人公の撃破と見なす: 通常の剣・G17(player weapon)、主人公のカードの固定ダメージ(一閃・薙ぎ払い等)、Hitbox/弾の note が <attacker: player> のもの、
 *     呼び出し側が projectRAttacker:"player" と明示したもの。
 *   ・主人公の撃破と見なさない: 味方(<attacker: 他>)・環境・スクリプト・持ち主を渡さないDoT(既存のApolloの病のDoTは保護対象のため持ち主を渡さず、今回は未対応)・原因が分からない死亡(HPが直接0になった場合を含む)。
 *   魂は、敵が倒れた場所(死亡時の当たり判定の中心)に1つだけ現れる。同じ敵が二重に魂を落とすことはない。
 *
 * 【回収】主人公の中心から魂の中心までが半径5マス以内(境界を含む)で、壁(Region 255 / <VisionWall> / <CombatWall> / 通行不能タイルの縁)に遮られないとき、
 *   自動で回収する。範囲の基準点は「魂 <-> 主人公」の距離(魂は動かないので、「主人公から倒した場所まで」と同じ)。ワークブックの「有効範囲内に入ると」を
 *   この距離の判定として実装した(暫定の解釈)。1つの魂は1回しか回収できない。複数の魂は独立に数える。
 *
 * 【回復(累積。同じ効果の新しい数値は置換)】魂1つにつき: Lv1 50 / Lv2 100 / Lv3 150 HP。対象は操作中の主人公(最寄りの味方ではない)。
 *   HPは最大HPを超えない(最大HPは変えない)。回復量は、その魂が生まれた時点のレベルで決まる。
 *
 * 【Lv3の攻撃力上昇】魂1つにつき攻撃力+3%、3秒。重ね掛けあり。新しく拾うたびに共有の残り時間を3秒に戻す。通常の武器攻撃(剣・G17)に効く。
 *   計算は ProjectR_CardModifiers のヒットフックで、その1回のダメージ計算の間だけ主人公のBattlerの攻撃力(param)に倍率を差し込み、必ず外す。
 *   基礎ATK・装備・Databaseは変えない。時間で消える強化で、攻撃では消費されない(ストレングスの「次の攻撃で全部消費」とは別。両方が同時に働き、倍率は掛け合わさる)。
 *   【暫定】加算か乗算かは未定。StackingMode(既定 additive: 1 + 0.03 x 個数)で切り替え。計算は combine() の1か所。
 *   【未対応】旧Hermes剣術・Apollo黄金の弓矢などのカード攻撃と、一閃・薙ぎ払いの固定ダメージには効かない(ダメージが攻撃力を使わない/UpdateEventHp の時点で計算済み。
 *     ストレングスと同じ制約)。絶の強化中の武器ヒットでは、先に攻撃力を上げた武器ダメージを計算し、その結果に絶の倍率が掛かる。
 *
 * 【暫定(ワークブックに規定なし。パラメータで変えられる。ユーザー承認済みではない)】
 *   AfterWindow(効果時間が終わった後の未回収の魂 = 既定 remove)/ RecastPolicy(効果中の再発動 = 既定 refresh)/
 *   CollectAtFullHp(満タンでも回収 = 既定 true)/ StackingMode(既定 additive)/ 範囲の基準点の解釈。
 *
 * 【演出(表示だけ。撃破・魂・回復・強化の権限を持たない)】
 *   カード発動: 通常カットイン(Hermesの目元。位置・方向はランダム)。主人公のモーションなし。
 *   主人公が(効果中に)敵を倒すたび: 主人公は指をはじく(FingerSnap)。Hermesが敵の脇に現れて攻撃し(公式Swing Weapon + 斬撃の閃光)、
 *   少しして黒いノイズとともに消える。Hermesの攻撃は追加のダメージではない。同時に出す数は MaxHermesVisuals まで。
 *   魂: 倒れた場所に青白い魂(VFX Designerライブラリ ProjectR_Soul_Manifest / _Hover / _Collect、Hermesの閃光 ProjectR_Psychopomp_Strike)。音(閃光の音)は未用意。
 *
 * 【後片付け】効果時間の満了・戦闘終了・主人公の死亡・マップ移動・ロード/ニューゲームで、回収の時間・魂・攻撃力上昇・Hermesの表示を片付ける。保存しない。
 *
 * API: ProjectRHermesPsychopomp
 *   getWindows()  [{ serial, level, remaining }]   getBuff()  { stacks, values, multiplier, remaining } | null   getLastResult()   getHealLog()   getKillLog()   getIgnored()
 *   effectsForLevel(lv) / cardLevel() / stackingMode() / afterWindowPolicy() / recastPolicy() / combine(values) / attackMultiplier()
 *   tick(seconds)  (テスト用: 通常は ProjectRCardDeck.updateCooldown が毎フレーム呼ぶ)   clearAll(reason)   diagnostics()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const CARD = "hermes_psychopomp";
    const HOOK_ID = CARD;
    const SUBSCRIBER = CARD;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_HermesPsychopomp") : {};

    // 正本(ワークブック)の値。変更はユーザーの設計変更なので、パラメータにはしない。
    const COLLECT_RADIUS_TILES = 5;
    const DURATION_SECONDS = 10;
    const HEAL_BY_LEVEL = Object.freeze([50, 100, 150]);
    const ATTACK_BONUS = 0.03;
    const BUFF_SECONDS = 3;
    const EXPIRE_EPSILON = 1e-6;
    // 演出の長さ(frame。表示だけ)
    const HERMES_SWING_DELAY = 2;
    const HERMES_HOLD_FRAMES = 30;
    const HERMES_SIDE_OFFSET = 0.9;
    // 暫定(ワークブックに指定なし。パラメータで変更できる)
    const stackingMode = () => String(params.StackingMode || "additive") === "multiplicative" ? "multiplicative" : "additive";
    const afterWindowPolicy = () => String(params.AfterWindow || "remove") === "keep" ? "keep" : "remove";
    const recastPolicy = () => String(params.RecastPolicy || "refresh") === "extend" ? "extend" : "refresh";
    const collectAtFullHp = () => String(params.CollectAtFullHp === undefined ? "true" : params.CollectAtFullHp) !== "false";
    const maxHermesVisuals = () => { const n = Number.parseInt(params.MaxHermesVisuals, 10); return Number.isFinite(n) && n >= 0 ? n : 3; };

    const LEVELS = Object.freeze([
        Object.freeze({ level: 1, effects: Object.freeze({ healAmount: HEAL_BY_LEVEL[0], collectRadiusTiles: COLLECT_RADIUS_TILES, durationSeconds: DURATION_SECONDS }) }),
        Object.freeze({ level: 2, effects: Object.freeze({ healAmount: HEAL_BY_LEVEL[1] }) }),
        Object.freeze({ level: 3, effects: Object.freeze({ healAmount: HEAL_BY_LEVEL[2], attackBonus: ATTACK_BONUS, attackBuffSeconds: BUFF_SECONDS }) })
    ]);
    const effectsForLevel = level => root.ProjectRCardCatalog.resolveLevels(LEVELS, level);
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const safely = (callback, fallback) => { try { return callback(); } catch (_error) { return fallback; } };
    const modifiers = () => root.ProjectRCardModifiers;
    const kills = () => root.ProjectRKillAttribution;
    const souls = () => root.ProjectRSoulCollection;
    const visual = () => root.ProjectRGodSummonVisual;
    const vfx = () => root.ProjectRPresentationVfx;
    const presentation = () => root.ProjectRCharacterPresentation;
    const currentMapId = () => typeof $gameMap !== "undefined" && $gameMap ? $gameMap.mapId() : 0;
    const playerDead = () => root.ProjectR?.PlayerDeath?.isDead?.() === true;

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

    // ---------- 実行中の状態(実行時のみ。保存しない) ----------
    const windows = []; // { serial, level, effects, remaining, mapId }
    let buff = null; // { values:[p...], remaining }
    const strikes = []; // Hermesの攻撃演出 { followerId, age, enemyPosition, swung, vanished }
    const healLog = [];
    const killLog = [];
    const ignored = [];
    let lastResult = null;
    let windowSerial = 0;
    const stats = { windows: 0, kills: 0, ignoredKills: 0, soulsSpawned: 0, healEvents: 0, healApplied: 0, buffStacks: 0, hermesShown: 0, hermesSkipped: 0, presentationErrors: 0 };
    const LOG_LIMIT = 50;
    const push = (list, entry) => { list.push(entry); if (list.length > LOG_LIMIT) list.shift(); };

    // ---------- 攻撃力上昇(時間制限。攻撃では消費しない) ----------
    const combine = values => {
        const list = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);
        if (stackingMode() === "multiplicative") return list.reduce((product, p) => product * (1 + p), 1);
        return 1 + list.reduce((sum, p) => sum + p, 0);
    };
    const attackMultiplier = () => buff && buff.values.length ? combine(buff.values) : 1;
    const buffView = () => buff ? { stacks: buff.values.length, values: buff.values.slice(), multiplier: combine(buff.values), remaining: buff.remaining } : null;
    const addStack = (bonus, seconds) => {
        if (!buff) buff = { values: [], remaining: 0 };
        buff.values.push(bonus);
        buff.remaining = seconds; // 共有の残り時間を戻す
        stats.buffStacks++;
    };
    let lastBuffedHit = null;
    const hook = {
        prepare(context) {
            if (!buff || !buff.values.length || context.kind !== "weapon") return null;
            if ((context.attacker ?? "player") !== "player") return null;
            return { atkMultiplier: attackMultiplier() };
        },
        // 消費しない。診断のためだけに直近のヒットを記録する。
        finish(context, outcome) {
            if (!buff) return;
            lastBuffedHit = { eventId: context.eventId, multiplier: attackMultiplier(), stacks: buff.values.length, dealt: outcome?.dealt ?? null };
        }
    };
    const registerHook = () => modifiers()?.registerHitHook?.(HOOK_ID, hook) === true;
    let hookRegistered = registerHook();

    // ---------- 撃破の通知 -> 魂 ----------
    const activeWindow = () => windows.find(w => w.mapId === currentMapId()) || null;
    const onDeath = death => {
        const window = activeWindow();
        if (!window) { stats.ignoredKills++; push(ignored, { key: death.key, attacker: death.attacker, reason: "noWindow" }); return; }
        if (!death.credited) { stats.ignoredKills++; push(ignored, { key: death.key, attacker: death.attacker, reason: "notCredited", basis: death.basis }); return; }
        if (death.mapId !== currentMapId()) { stats.ignoredKills++; push(ignored, { key: death.key, attacker: death.attacker, reason: "otherMap" }); return; }
        stats.kills++;
        const spawned = souls().spawn({ position: death.position, enemyKey: death.deathKey, level: window.level, windowSerial: window.serial, source: death.source });
        if (spawned.ok) stats.soulsSpawned++;
        push(killLog, { key: death.key, deathKey: death.deathKey, eventId: death.eventId, attacker: death.attacker, source: death.source, soul: spawned.ok ? spawned.id : null, soulReason: spawned.ok ? null : spawned.reason, windowSerial: window.serial });
        presentKill(death, spawned.ok ? spawned.id : null);
    };
    const syncSubscription = () => {
        if (windows.length) kills()?.subscribe?.(SUBSCRIBER, onDeath);
        else kills()?.unsubscribe?.(SUBSCRIBER);
    };

    // ---------- 回収 ----------
    const collectOne = soul => {
        const actor = typeof $gameParty !== "undefined" ? $gameParty.leader() : null;
        if (!actor) return;
        const effects = effectsForLevel(soul.level);
        const before = actor.hp;
        const room = Math.max(0, actor.mhp - actor.hp);
        const applied = Math.min(effects.healAmount || 0, room); // 最大HPを超えて回復しない
        if (applied > 0) actor.gainHp(applied);
        stats.healEvents++;
        stats.healApplied += actor.hp - before;
        push(healLog, { soulId: soul.id, enemyKey: soul.enemyKey, level: soul.level, requested: effects.healAmount || 0, applied: actor.hp - before, hpBefore: before, hpAfter: actor.hp });
        if (effects.attackBonus > 0) addStack(effects.attackBonus, effects.attackBuffSeconds || BUFF_SECONDS);
    };
    const collectPass = () => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        const actor = typeof $gameParty !== "undefined" ? $gameParty.leader() : null;
        if (!player || !actor || actor.hp <= 0 || playerDead() || typeof player.centerPositionPoint !== "function") return;
        const center = player.centerPositionPoint();
        const filter = collectAtFullHp() ? null : () => actor.hp < actor.mhp;
        const got = souls().collectAround({ center, radius: COLLECT_RADIUS_TILES, lineOfSight: true, filter });
        for (const soul of got) collectOne(soul);
    };

    // ---------- 演出(表示だけ) ----------
    const presentKill = (death, soulId) => {
        safely(() => presentation()?.request?.("FingerSnap", { source: "psychopomp", detail: death.key }));
        if (strikes.length >= maxHermesVisuals()) { stats.hermesSkipped++; return; }
        try {
            const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
            const pc = player && typeof player.centerPositionPoint === "function" ? player.centerPositionPoint() : null;
            let ux = 1, uy = 0;
            // Hermesは敵の「主人公と反対側」に立つ(主人公と重ならず、とどめを刺しに来たように見える)。主人公と敵が重なっていれば東側。
            if (pc) { const dx = death.position.x - pc.x, dy = death.position.y - pc.y, len = Math.hypot(dx, dy); if (len > 1e-6) { ux = dx / len; uy = dy / len; } else { ux = 1; uy = 0; } }
            const point = { x: death.position.x + ux * HERMES_SIDE_OFFSET, y: death.position.y + uy * HERMES_SIDE_OFFSET };
            const follower = visual()?.spawnFollower?.("hermes", point, { cardId: CARD });
            if (!follower?.ok) { stats.hermesSkipped++; return; }
            stats.hermesShown++;
            strikes.push({ followerId: follower.id, soulId, age: 0, point, enemyPosition: { x: death.position.x, y: death.position.y }, swung: false, vanished: false });
        } catch (_error) {
            stats.presentationErrors++;
        }
    };
    const stepStrikes = () => {
        for (const strike of [...strikes]) {
            strike.age++;
            try {
                if (!strike.swung && strike.age >= HERMES_SWING_DELAY) {
                    strike.swung = true;
                    const dx = strike.enemyPosition.x - strike.point.x, dy = strike.enemyPosition.y - strike.point.y;
                    const degree = ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360;
                    visual()?.swingFollower?.(strike.followerId, degree, "Pan");
                    if (strike.soulId) souls()?.playAtSoul?.(strike.soulId, "hermes_psychopomp.strike"); // 倒れた場所の錨Eventに結び付けた斬撃の閃光
                }
                if (!strike.vanished && strike.age >= HERMES_HOLD_FRAMES) {
                    strike.vanished = true;
                    visual()?.vanishFollower?.(strike.followerId); // 黒いノイズとともに消える(短いframe後に破棄)
                }
            } catch (_error) {
                stats.presentationErrors++;
            }
            if (strike.vanished) { const i = strikes.indexOf(strike); if (i >= 0) strikes.splice(i, 1); }
        }
    };

    // ---------- 時間の進行 ----------
    const endWindow = (window, reason) => {
        const index = windows.indexOf(window);
        if (index >= 0) windows.splice(index, 1);
        if (afterWindowPolicy() === "remove") souls()?.removeWhere?.(soul => soul.windowSerial === window.serial, "windowEnded");
        syncSubscription();
        lastResult = { ...(lastResult || {}), lastEnd: { serial: window.serial, reason } };
    };
    const active = () => windows.length > 0 || !!buff || strikes.length > 0 || (afterWindowPolicy() === "keep" && (souls()?.count?.() || 0) > 0);
    const tick = seconds => {
        if (!active()) return;
        if (!deck.isCardBattleActive()) { clearAll("battleInactive"); return; }
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        // 先に回収(この時点で有効な魂 / 回収の時間)、そのあと時間を進める。
        if (windows.length || afterWindowPolicy() === "keep") collectPass();
        for (const window of [...windows]) {
            if (window.mapId !== currentMapId()) { endWindow(window, "mapChanged"); continue; }
            window.remaining = Math.max(0, window.remaining - seconds);
            if (window.remaining < EXPIRE_EPSILON) endWindow(window, "expired");
        }
        if (buff) {
            buff.remaining = Math.max(0, buff.remaining - seconds);
            if (buff.remaining < EXPIRE_EPSILON) buff = null;
        }
    };
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _updateCooldown.apply(this, arguments);
        tick(seconds);
        return result;
    };

    // ---------- 発動 ----------
    // 流れ: handlerが検証と計画(状態を変えない)→ ルーターがカードを1回だけ消費 → 確定後に回収の時間を始める。
    let pending = null;
    const activate = () => {
        if (!deck.isCardBattleActive() || !root.ProjectRCardCatalog) return failure("battleInactive");
        if (typeof $gamePlayer === "undefined" || !$gamePlayer || typeof $gameMap === "undefined" || !$gameMap) return failure("mapUnavailable");
        if (playerDead()) return failure("playerDead");
        if (!kills() || !souls()) return failure("soulSystemUnavailable");
        if (!hookRegistered) hookRegistered = registerHook();
        if (!hookRegistered) return failure("hitHookUnavailable");
        const level = cardLevel();
        pending = { level, effects: effectsForLevel(level) };
        return { ok: true };
    };
    const previousInstant = deck.getActivationHandler("instant");
    deck.registerActivationHandler("instant", context => context.definition.cardId === CARD
        ? activate(context) : previousInstant ? previousInstant(context) : { ok: true });

    const resolve = (plan, activation) => {
        let window = activeWindow();
        if (window) {
            // 効果中の再発動: レベルの数値は新しいものに置き換え、残り時間を RecastPolicy に従って延ばす。
            window.level = plan.level;
            window.effects = plan.effects;
            window.remaining = recastPolicy() === "extend" ? window.remaining + plan.effects.durationSeconds : plan.effects.durationSeconds;
        } else {
            window = { serial: ++windowSerial, level: plan.level, effects: plan.effects, remaining: plan.effects.durationSeconds, mapId: currentMapId() };
            windows.push(window);
        }
        stats.windows++;
        syncSubscription();
        lastResult = { ok: true, consumed: true, level: plan.level, serial: window.serial, remaining: window.remaining, effects: plan.effects,
            instanceId: activation?.instanceId ?? null, stackingMode: stackingMode(), afterWindow: afterWindowPolicy(), recastPolicy: recastPolicy() };
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

    // 診断用の記録(回復・撃破・無視した撃破・件数)は、新しい戦闘の開始で空にする(戦闘をまたいで貯めない)。
    const resetRecords = () => {
        healLog.length = 0; killLog.length = 0; ignored.length = 0; lastResult = null;
        for (const key of Object.keys(stats)) stats[key] = 0;
    };
    const _startCardBattle = deck.startCardBattle;
    deck.startCardBattle = function() { resetRecords(); return _startCardBattle.apply(this, arguments); };

    // ---------- 後片付け ----------
    const clearAll = (reason, options = {}) => {
        windows.length = 0;
        buff = null;
        syncSubscription();
        safely(() => souls()?.clear?.(reason));
        for (const strike of strikes.splice(0)) if (!options.skipVisual) safely(() => visual()?.removeFollower?.(strike.followerId));
        lastBuffedHit = null;
    };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { pending = null; clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    // マップ移動: 旧マップの表示Eventはマップごと片付く。ここでは状態と魂・強化だけを戻す。
    Game_Map.prototype.setup = function() { pending = null; clearAll("mapSetup", { skipVisual: true }); return _setup.apply(this, arguments); };
    for (const method of ["extractSaveContents", "setupNewGame"]) {
        const original = DataManager[method];
        if (typeof original !== "function") continue;
        DataManager[method] = function() { pending = null; clearAll(method, { skipVisual: true }); return original.apply(this, arguments); };
    }
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive) return;
        if (strikes.length) stepStrikes();
        if ((windows.length || buff || strikes.length) && playerDead()) clearAll("playerDead");
    };

    root.ProjectRHermesPsychopomp = Object.freeze({
        CARD, LEVELS, COLLECT_RADIUS_TILES, DURATION_SECONDS, ATTACK_BONUS, BUFF_SECONDS,
        getWindows: () => windows.map(w => ({ serial: w.serial, level: w.level, remaining: w.remaining, effects: w.effects })),
        getBuff: buffView,
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getLastBuffedHit: () => lastBuffedHit ? { ...lastBuffedHit } : null,
        getHealLog: () => healLog.map(e => ({ ...e })),
        getKillLog: () => killLog.map(e => ({ ...e })),
        getIgnored: () => ignored.map(e => ({ ...e })),
        effectsForLevel, cardLevel, stackingMode, afterWindowPolicy, recastPolicy, combine, attackMultiplier,
        tick, clearAll,
        diagnostics: () => ({ ...stats, windows: windows.length, buff: buffView(), strikes: strikes.length, hookRegistered })
    });
})();
