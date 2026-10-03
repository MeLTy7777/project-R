/*:
 * @target MZ
 * @plugindesc v0.3.5 主人公用30枚カードデッキ・戦闘時5枠スキル・ENERGY。
 * @author ProjectR
 * @base ProjectR_BattleHUD
 * @base ProjectR_MenuHUD
 * @orderAfter ProjectR_MenuHUD
 *
 * @help
 * ProjectR_CardSkillDeck.js v0.3.5
 * 設定手順・制限: docs/ProjectR_CardSkillDeck_Spec.md
 * カードは <Card> のあるスキル。実カードは自動追加しません。
 * 有効な30枚デッキはCombatPresenceの戦闘開始時に自動開始。
 * 探索中はHUD非表示。戦闘終了猶予はCombatPresence側の設定を使用。
 * 操作 Q/E/X/C/V。Fインタラクトと通常Hotbarの保存設定は変更しません。
 * CardActionCEをMZの空いているInterpreter/子Interpreterで実行します。
 * 実行中のCEを上書きせず、実行完了までは次のカードを受け付けません。
 * カード戦闘中のセーブ・オートセーブは禁止。終了後に保存してください。
 * CE1/4のBeginMainAttack通知と公式HP更新を接続。命中1ActionにつきENERGY+1。
 * ダメージ倍率はCard ContextのあるcalculateDamageAgainstEvent(skill)のみ。
 * テストカード158～166、CE21～29。弾は生成時のContextを個別に保持します。
 * DEBUG自動配布は新規ゲーム・空デッキ限定。既存Saveには配布しません。
 * DEBUG時は右上CARD TEST / RETURNボタンでMap010へ往復。
 * F6は補助操作。別アクションへ割り当て済みの場合は使用しません。
 *
 * @param CardWidth
 * @desc 旧版互換用。現在のカード表示はBattleHUDの172px幅へ合わせます。
 * @type number
 * @min 80
 * @max 400
 * @default 150
 * @param CardHeight
 * @desc 旧版互換用。現在のカード表示はBattleHUDの140px高へ合わせます。
 * @type number
 * @min 120
 * @max 500
 * @default 210
 * @param CardSpacing
 * @desc 旧版互換用。現在はBattleHUDのスロット位置を使用します。
 * @type number
 * @min 0
 * @max 80
 * @default 12
 * @param DefaultTargetRange
 * @type number
 * @decimals 2
 * @min 0.1
 * @default 8.0
 * @param Rarity1Color
 * @type string
 * @default #428bdb
 * @param Rarity2Color
 * @type string
 * @default #ab72df
 * @param Rarity3Color
 * @type string
 * @default #e2bb55
 * @param EnableDebugCommands
 * @type boolean
 * @default false
 * @param VfxRegistry
 * @type struct<CardVfx>[]
 * @default []
 * @param AutoStartCardCombat
 * @desc CombatPresenceが戦闘中になった時に、有効デッキを自動開始します。
 * @type boolean
 * @default true
 * @param AlwaysShowCardHud
 * @desc 旧版互換用。trueでも探索中は表示しません。戦闘中の未完成表示は常に有効です。
 * @type boolean
 * @default false
 * @param DebugAutoSetupTestDeck
 * @type boolean
 * @default false
 * @param ShowDebugOverlay
 * @type boolean
 * @default false
 * @param DebugAutoRefillEnergy
 * @type boolean
 * @default false
 *
 * @command StartCardCombat
 * @text Start Card Combat / カード戦闘開始
 * @command EndCardCombat
 * @text End Card Combat / カード戦闘終了
 * @command OpenDeckBuilder
 * @text Open Deck Builder / デッキ編集
 * @command GainCard
 * @text Gain Card / カード入手
 * @arg skillId
 * @type skill
 * @default 1
 * @arg amount
 * @type number
 * @min 1
 * @default 1
 * @command LoseCard
 * @text Lose Card / 所持カードを減らす
 * @arg skillId
 * @type skill
 * @default 1
 * @arg amount
 * @type number
 * @min 1
 * @default 1
 * @command SetEnergy
 * @text Set Energy
 * @arg value
 * @type number
 * @min 0
 * @max 10
 * @default 10
 * @command AddEnergy
 * @text Add Energy
 * @arg value
 * @type number
 * @min -10
 * @max 10
 * @default 1
 * @command UseCardSlot
 * @text Use Card Slot / カード発動
 * @arg slot
 * @type number
 * @min 1
 * @max 5
 * @default 1
 * @command GetEnergy
 * @text Get Energy / 変数へ取得
 * @arg variableId
 * @type variable
 * @default 0
 * @command GetDeckCount
 * @text Get Deck Count / 枚数を変数へ取得
 * @arg variableId
 * @type variable
 * @default 0
 * @command ValidateDeck
 * @text Validate Deck / 有効ならスイッチON
 * @arg switchId
 * @type switch
 * @default 0
 * @command DebugGrantCards
 * @text DEBUG: 全カードを上限枚数入手
 * @command DebugBuildDeck
 * @text DEBUG: 所持カードから30枚構築
 * @command DebugDumpPiles
 * @text DEBUG: 山札状態をConsole表示
 * @command DebugSetupTestDeck
 * @text DEBUG: 9惑星テストデッキを設定
 * @command BeginMainAttack
 * @text 通常攻撃開始通知（CE1/4専用）
 * @arg kind
 * @type select
 * @option fallback
 * @option sword
 * @default fallback
 * @command ResolveSwordHitbox
 * @text Sword: 公式Hitbox内の敵へダメージ（CE4専用）
 */
/*~struct~CardVfx:
 * @param key
 * @text CardVFXタグ名
 * @type string
 * @param animationName
 * @text 公式ライブラリーの登録名
 * @type string
 * @param target
 * @type select
 * @option player
 * @option player front
 * @option target
 * @default player
 * @param ready
 * @text 素材・ライブラリーの配置確認済み
 * @type boolean
 * @default false
 * @param stickMode
 * @type boolean
 * @default false
 */

(() => {
    "use strict";
    const NAME = "ProjectR_CardSkillDeck";
    const API = (window.ProjectR = window.ProjectR || {}).CardSkillDeck = {};
    const parameters = PluginManager.parameters(NAME);
    const KEYS = Object.freeze(["Q", "E", "X", "C", "V"]);
    const PLANETS = Object.freeze(["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]);
    const LABELS = Object.freeze(["水星", "金星", "地球", "火星", "木星", "土星", "天王星", "海王星", "冥王星"]);
    const FACTORS = Object.freeze([1, 1.5, 1.3, 1.15, 1, 1 / 1.15, 1 / 1.3, 1 / 1.5]);
    const TEST_CARDS = Object.freeze([
        [158, 21, "Mercury", "Magic", 1, 1, "Nearest", 8, 4, "projectile"],
        [159, 22, "Venus", "Magic", 1, 2, "Nearest", 7, 4, "target"],
        [160, 23, "Earth", "Physical", 1, 2, "Nearest", 3, 4, "target"],
        [161, 24, "Mars", "Physical", 1, 2, "Nearest", 3, 4, "target"],
        [162, 25, "Jupiter", "Magic", 1, 3, "Nearest", 8, 4, "target"],
        [163, 26, "Saturn", "Physical", 2, 3, "Nearest", 5, 3, "area"],
        [164, 27, "Uranus", "Magic", 2, 2, "Mouse", 8, 3, "projectile"],
        [165, 28, "Neptune", "Magic", 3, 3, "Mouse", 10, 2, "projectile"],
        [166, 29, "Pluto", "Magic", 3, 4, "Nearest", 7, 2, "target"]
    ].map(([skillId, actionCE, attribute, type, rarity, cost, target, range, copies, mode]) =>
        Object.freeze({ skillId, actionCE, attribute, type, rarity, cost, target, range, copies, mode })));
    const testCard = id => TEST_CARDS.find(card => card.skillId === id);
    const warnings = new Set();
    const warn = message => {
        if (!warnings.has(message)) {
            warnings.add(message);
            console.warn(`[${NAME}] ${message}`);
        }
    };
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const number = (v, fallback) => v !== "" && v != null && Number.isFinite(Number(v)) ? Number(v) : fallback;
    const integer = (v, fallback = 0) => Math.trunc(number(v, fallback));
    const positiveId = v => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : 0;
    const config = Object.freeze({
        range: Math.max(0.1, number(parameters.DefaultTargetRange, 8)),
        colors: [null, parameters.Rarity1Color || "#428bdb", parameters.Rarity2Color || "#ab72df", parameters.Rarity3Color || "#e2bb55"],
        debug: parameters.EnableDebugCommands === "true",
        autoStart: parameters.AutoStartCardCombat !== "false",
        autoDeck: parameters.DebugAutoSetupTestDeck === "true",
        overlay: parameters.ShowDebugOverlay === "true",
        autoEnergy: parameters.DebugAutoRefillEnergy === "true"
    });
    let revision = 0;
    let metadataSource = null;
    let metadata = new Map();
    let uniqueSkillNames = new Map();
    let enemyCache = new WeakMap();
    const migrated = new WeakSet();
    const interpreterContexts = new WeakMap();
    const contextTargets = new WeakMap();
    let mainAttacks = new WeakMap();
    let pendingHits = new WeakMap();
    const swordHits = new WeakMap();
    const swordSwings = new WeakMap();
    const swordVisuals = [];
    const SWORD_HITBOX_SCALE = 1.35;
    let swordSnapshot = null, pileTrace = [];
    // Key by instance, never event ID alone: MZ reuses dynamic/template event IDs.
    const eventActions = new Map();
    const managedContexts = new Set();
    const executionStack = [];
    let sessionSerial = 0;
    const freshRuntime = () => ({ active: false, energy: 0, hand: [], draw: [], discard: [],
        serial: 0, mainSerial: 0, session: 0, mapId: 0, actorId: 0, action: null,
        contexts: new Map(), hits: new Set(), lastFrame: -1, aiming: null });
    let runtime = freshRuntime();
    let arenaFacingLock = null;
    const swordPriorFix = new WeakMap();
    function restoreArenaFacing(reason) {
        if (!arenaFacingLock) return;
        const lock = arenaFacingLock;
        arenaFacingLock = null;
        lock.player.setDirectionFix(lock.priorFix);
        trace("Arena facing restored", { reason, mode: lock.mode, direction: lock.player.direction(), fix: lock.priorFix });
    }
    function arenaFacingAllowed() {
        return isDebugArena() && onMap() && !playerLocked() && !$gameMessage.isBusy() &&
            !window.ProjectR?.FullscreenDialogue?.isActive?.() && !$gamePlayer.isTransferring?.();
    }
    function updateArenaFacing() {
        if (!arenaFacingAllowed()) { restoreArenaFacing("arena/scene/lock"); return; }
        if (arenaFacingLock?.mode === "sword") {
            const lock = arenaFacingLock;
            const finished = lock.sprite ? lock.sprite._duration < 0 || !lock.sprite.parent : frame() >= lock.expires;
            if (finished) restoreArenaFacing("swingEnd");
            else {
                const movement = Input.dir8 || Input.dir4 || 0;
                if (movement !== lock.movement) {
                    lock.movement = movement;
                    trace("Sword movement facing held", { movement, attackDirection: lock.direction,
                        playerDirection: $gamePlayer.direction(), directionFix: $gamePlayer.isDirectionFixed() });
                }
                return;
            }
        }
        restoreArenaFacing("equipment/event");
    }
    let aimingStatus = "WAITING", aimingNoticeUntil = -1;
    const consumedMouseButtons = new Set();
    let consumedEscape = false;
    let lastResult = { ok: true, reason: "" };
    let debugResult = null, debugCard = null, debugMain = null;
    let debugRevision = -1, debugSnapshot = null, arenaReturn = null;
    let battleWasActive = false, autoStartBlocked = false, battleAttemptRevision = -1;
    const traces = [];
    function trace(message, details = {}) {
        if (!config.debug) return;
        const entry = Object.freeze({ frame: frame(), message, ...details });
        traces.push(entry);
        if (traces.length > 200) traces.shift();
        console.log("[MainAttack]", entry);
    }
    function recordDebug(values) {
        if (!config.debug) return;
        debugResult = Object.freeze({ source: null, skillId: 0, skillName: "", cardAttribute: null,
            cardType: null, cost: 0, targetEventId: 0, targetAttribute: null, attributeMultiplier: 1,
            resistanceMultiplier: 1, finalMultiplier: 1, baseDamage: 0, finalDamage: 0,
            energyBefore: runtime.energy, energyAfter: runtime.energy, mainAttackToken: null,
            projectileActionId: null, result: "", ...values });
        if (values.source === "card") debugCard = debugResult;
        else debugMain = debugResult;
        revision++;
    }
    function snapshot() {
        if (!config.debug) return null;
        if (debugRevision !== revision) {
            debugRevision = revision;
            debugSnapshot = Object.freeze({ revision, active: runtime.active, energy: runtime.energy,
                hand: runtime.hand.length, draw: runtime.draw.length, discard: runtime.discard.length,
                autoEnergy: config.autoEnergy, card: debugCard, main: debugMain, result: debugResult,
                sword: swordSnapshot, piles: pileTrace.slice(), lastReason: lastResult.reason,
                aim: aimDebug, vfx: vfxDebug, aiming: Object.freeze({ active: false, confirm: aimingStatus }) });
        }
        return runtime.aiming ? Object.freeze({ ...debugSnapshot, aiming:
            Object.freeze({ ...runtime.aiming, currentAim: captureMouseAim(true), confirm: aimingStatus }) }) : debugSnapshot;
    }
    const result = (ok, reason = "") => {
        lastResult = { ok, reason };
        if (config.debug && !ok && runtime.active) { trace("Request rejected", { reason }); revision++; }
        return lastResult;
    };
    const canonical = (value, ids, labels) => {
        const text = String(value ?? "").trim().toLowerCase();
        const i = ids.findIndex((id, n) => id.toLowerCase() === text || labels[n] === text);
        return i < 0 ? null : ids[i];
    };
    const planet = value => canonical(value, PLANETS, LABELS);
    const cardType = value => canonical(value, ["Physical", "Magic"], ["物理", "魔法"]);
    const attributeLabel = value => LABELS[PLANETS.indexOf(value)] || "無属性";
    const typeLabel = value => value === "Magic" ? "魔法" : "物理";
    const tags = note => {
        const values = Object.create(null);
        const regex = /<([^<>:]+)(?::([^<>]*))?>/g;
        for (const match of String(note || "").matchAll(regex)) {
            values[match[1].trim().toLowerCase()] = match[2] === undefined ? true : match[2].trim();
        }
        return values;
    };
    const validActionList = list => Array.isArray(list) && list.every(command =>
        command && Number.isInteger(command.code) && Array.isArray(command.parameters));
    function parseCard(skill) {
        if (!skill) return null;
        const t = tags(skill.note);
        if (t.card === undefined) return null;
        const numeric = (key, fallback) => {
            if (t[key] === undefined) return fallback;
            const n = t[key] === true ? NaN : number(t[key], NaN);
            if (Number.isFinite(n)) return n;
            warn(`Skill ${skill.id}: ${key} が不正です。${fallback}を使用します。`);
            return fallback;
        };
        const attribute = planet(t.cardattribute);
        if (t.cardattribute !== undefined && !attribute) warn(`Skill ${skill.id}: 不明な属性 ${t.cardattribute}。倍率1。`);
        const type = cardType(t.cardtype) || "Physical";
        if (t.cardtype !== undefined && !cardType(t.cardtype)) warn(`Skill ${skill.id}: 不明な種類。Physicalを使用。`);
        const target = canonical(t.cardtarget || "Nearest", ["Nearest", "Mouse"], ["最寄り", "照準"]) || "Nearest";
        if (t.cardtarget && !canonical(t.cardtarget, ["Nearest", "Mouse"], ["最寄り", "照準"])) warn(`Skill ${skill.id}: 不明なTarget。Nearestを使用。`);
        const actionCE = positiveId(t.cardactionce);
        const valid = !!actionCE && validActionList($dataCommonEvents?.[actionCE]?.list);
        if (!valid) warn(`Skill ${skill.id}: CardActionCEが未設定、または存在しません。`);
        return Object.freeze({ skillId: skill.id, cost: clamp(Math.trunc(numeric("cardcost", 1)), 1, 10),
            attribute, type, rarity: clamp(Math.trunc(numeric("cardrarity", 1)), 1, 3), target,
            range: Math.max(0.1, numeric("cardrange", config.range)), actionCE,
            vfx: typeof t.cardvfx === "string" ? t.cardvfx : "", valid });
    }
    function rebuildMetadataCache() {
        metadata = new Map();
        uniqueSkillNames = new Map();
        for (const skill of $dataSkills || []) {
            if (skill) {
                const name = String(skill.name || "").toLowerCase();
                uniqueSkillNames.set(name, uniqueSkillNames.has(name) ? null : skill.id);
            }
            const card = parseCard(skill);
            if (card) metadata.set(card.skillId, card);
        }
        metadataSource = $dataSkills;
        revision++;
    }
    const getCard = skillId => metadata.get(Number(skillId)) || null;
    const rarityLimit = card => 5 - card.rarity;
    function state() {
        if (!$gameSystem) return null;
        if (!migrated.has($gameSystem)) {
            const old = $gameSystem._projectRCardSkillDeck;
            const ownedCards = {};
            if (old?.ownedCards && typeof old.ownedCards === "object") {
                for (const [id, count] of Object.entries(old.ownedCards)) {
                    if (positiveId(id)) ownedCards[id] = clamp(integer(count), 0, Number.MAX_SAFE_INTEGER);
                }
            }
            // Preserve even invalid/overfull deck entries for explicit user correction.
            $gameSystem._projectRCardSkillDeck = { version: 1, ownedCards, deck: Array.isArray(old?.deck) ? old.deck.slice() : [] };
            migrated.add($gameSystem);
        }
        return $gameSystem._projectRCardSkillDeck;
    }
    const ownedCount = id => state()?.ownedCards[positiveId(id)] || 0;
    const getDeck = () => state()?.deck.slice() || [];
    function validateDeck(deck = getDeck()) {
        const errors = [];
        if (!Array.isArray(deck)) return { valid: false, count: 0, errors: ["デッキが配列ではありません。"] };
        if (deck.length !== 30) errors.push(`DECK INCOMPLETE: ${deck.length} / 30`);
        const counts = new Map();
        for (const id of deck) counts.set(id, (counts.get(id) || 0) + 1);
        for (const [id, count] of counts) {
            const card = Number.isInteger(id) ? getCard(id) : null;
            if (!card || !card.valid) errors.push(`Skill ${id}: 有効なCard/ActionCEがありません。`);
            if (count > ownedCount(id)) errors.push(`Skill ${id}: 所持枚数不足 (${count}/${ownedCount(id)})。`);
            if (card && count > rarityLimit(card)) errors.push(`Skill ${id}: ★${card.rarity}は最大${rarityLimit(card)}枚。`);
        }
        return { valid: errors.length === 0, count: deck.length, errors };
    }
    function gainCard(id, amount = 1) {
        id = positiveId(id);
        if (!getCard(id) || !state()) return result(false, "<Card>のあるスキルを指定してください。");
        const count = Math.max(0, integer(amount));
        state().ownedCards[id] = Math.min(Number.MAX_SAFE_INTEGER, ownedCount(id) + count);
        revision++;
        return result(true);
    }
    function loseCard(id, amount = 1) {
        id = positiveId(id);
        if (!id || !state()) return result(false, "Skill IDが不正です。");
        state().ownedCards[id] = Math.max(0, ownedCount(id) - Math.max(0, integer(amount)));
        revision++;
        return result(true);
    }
    function addDeckCard(id) {
        if (runtime.active) return result(false, "カード戦闘を終了してから編集してください。");
        const card = getCard(id);
        if (!card?.valid || !state()) return result(false, "有効なCard/ActionCEがありません。");
        const deck = state().deck;
        if (deck.length >= 30) return result(false, "デッキは最大30枚です。");
        const count = deck.filter(value => value === card.skillId).length;
        if (count >= ownedCount(card.skillId)) return result(false, "所持枚数が不足しています。");
        if (count >= rarityLimit(card)) return result(false, `★${card.rarity}は同じカード最大${rarityLimit(card)}枚です。`);
        deck.push(card.skillId);
        revision++;
        return result(true);
    }
    function removeDeckAt(index) {
        if (runtime.active) return result(false, "カード戦闘を終了してから編集してください。");
        if (!state() || !Number.isInteger(index) || index < 0 || index >= state().deck.length) return result(false, "カードを選択してください。");
        state().deck.splice(index, 1);
        revision++;
        return result(true);
    }
    function shuffle(values) {
        const output = values.slice();
        for (let i = output.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [output[i], output[j]] = [output[j], output[i]];
        }
        return output;
    }
    function draw() {
        if (!runtime.draw.length && runtime.discard.length) {
            runtime.draw = shuffle(runtime.discard);
            runtime.discard = [];
            tracePile("RESHUFFLE");
        }
        return runtime.draw.pop() || null;
    }
    function tracePile(stage) {
        if (!config.debug) return;
        const state = { stage, hand: runtime.hand.filter(Boolean).length, draw: runtime.draw.length, discard: runtime.discard.length };
        pileTrace.push(state); if (pileTrace.length > 4) pileTrace.shift();
        trace("Pile", state); revision++;
    }
    const onMap = () => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isActive() && !SceneManager.isSceneChanging();
    const isDebugArena = () => config.debug && SceneManager._scene instanceof Scene_Map &&
        $gameMap.mapId() === 10 && typeof $dataMapInfos !== "undefined" &&
        $dataMapInfos[10]?.name === "ProjectR Card Test Arena";
    const battleAreaActive = () => isDebugArena() || !!window.ProjectRCombatPresence?.isCombatActive?.();
    const frame = () => Number(Graphics.frameCount) || 0;
    const playerLocked = () => !!window.ProjectR?.PlayerDeathControl?.isLocked?.() ||
        !!$gameParty.leader()?.isDead?.();
    function startCombat() {
        if (runtime.active) return result(false, "カード戦闘は開始済みです。");
        if (!onMap()) return result(false, "マップ上で開始してください。");
        if (playerLocked()) return result(false, "死亡中はカード戦闘を開始できません。");
        const valid = validateDeck();
        if (!valid.valid) return result(false, valid.errors.join("\n"));
        const actor = $gameParty.leader();
        if (!actor || actor.actorId() !== $dataSystem.partyMembers[0]) return result(false, "主人公を先頭にしてください。");
        runtime = freshRuntime();
        runtime.session = ++sessionSerial;
        runtime.mapId = $gameMap.mapId();
        runtime.actorId = actor.actorId();
        runtime.draw = shuffle(getDeck());
        runtime.hand = Array.from({ length: 5 }, draw);
        runtime.energy = 10;
        runtime.active = true;
        autoStartBlocked = false;
        installHotbarSlotGuards();
        syncOriginalSlots();
        revision++;
        return result(true);
    }
    function clearTransientState() {
        restoreArenaFacing("cleanup");
        cancelAiming("battleEnd");
        clearSwordVisuals();
        visualAngles.clear();
        pendingVfx.clear();
        for (const [note, target] of liveVfx) removeOwnedVfx(note, target);
        liveVfx.clear();
        for (const [event, record] of eventActions) releaseEventAction(event, record.kind === "card");
        managedContexts.clear();
        // Only the interpreter owned by this action is cleared; never a foreign CE.
        if (runtime.action && contextFor(runtime.action.interpreter) === runtime.action.context) runtime.action.interpreter.clear();
        runtime.action = null;
        runtime.contexts.clear();
        runtime.hits.clear();
        mainAttacks = new WeakMap();
        pendingHits = new WeakMap();
        keyQueue.length = 0;
        heldKeys.clear();
        arenaQueued = false;
    }
    function endCombat() {
        clearTransientState();
        runtime = freshRuntime();
        debugResult = debugCard = debugMain = null;
        autoStartBlocked = battleAreaActive();
        revision++;
        syncOriginalSlots();
        return result(true);
    }
    const setEnergy = value => {
        runtime.energy = clamp(number(value, runtime.energy), 0, 10);
        revision++;
        return runtime.energy;
    };
    const addEnergy = value => setEnergy(runtime.energy + number(value, 0));
    function notifyMainAttackHit(token) {
        if (!runtime.active || currentContext()) return false;
        if (token && typeof token === "object" && token.session !== undefined &&
            (token.session !== runtime.session || token.mapId !== runtime.mapId)) return false;
        const key = typeof token === "object" && token?.kind === "main" ? token.id : token;
        if ((typeof key !== "string" && typeof key !== "number") || key === "" ||
            (typeof key === "number" && !Number.isFinite(key)) || String(key).startsWith("card:")) return false;
        if (runtime.hits.has(key)) { trace("Energy recovery ignored duplicate", { token: key }); return false; }
        const before = runtime.energy;
        runtime.hits.add(key);
        addEnergy(1);
        trace("Energy recovery accepted", { token: key, before, after: runtime.energy });
        return true;
    }
    function readEnemyMetadata(event) {
        if (!event || typeof event.event !== "function") return { attribute: null, physical: 1, magic: 1 };
        const data = event.event();
        const page = event.page?.();
        const cached = enemyCache.get(event);
        if (cached && cached.data === data && cached.page === page && cached.note === data?.note) return cached.value;
        const comments = (page?.list || []).filter(c => c.code === 108 || c.code === 408).map(c => c.parameters?.[0] || "").join("\n");
        const t = tags(`${data?.note || ""}\n${comments}`);
        const resist = key => {
            if (t[key] === undefined) return 1;
            const n = t[key] === true ? NaN : number(t[key], NaN);
            if (Number.isFinite(n)) return Math.max(0, n);
            warn(`Event ${event.eventId?.()}: ${key}が不正です。1を使用。`);
            return 1;
        };
        const value = Object.freeze({ attribute: planet(t.planetattribute), physical: resist("physicalresist"), magic: resist("magicresist") });
        if (t.planetattribute && !value.attribute) warn(`Event ${event.eventId?.()}: 不明なPlanetAttribute。倍率1。`);
        enemyCache.set(event, { data, page, note: data?.note, value });
        return value;
    }
    function attributeMultiplier(attacker, target) {
        const a = planet(attacker), b = planet(target);
        if (!a) {
            if (attacker != null && attacker !== "") warn(`不明な攻撃属性 ${attacker}。倍率1。`);
            return 1;
        }
        if (!b || a === b) return 1;
        if (a === "Pluto" || b === "Pluto") return 1.5;
        return FACTORS[(PLANETS.indexOf(b) - PLANETS.indexOf(a) + 8) % 8];
    }
    function resistanceMultiplier(type, event) {
        const value = readEnemyMetadata(event);
        const normalized = cardType(type);
        return normalized === "Physical" ? value.physical : normalized === "Magic" ? value.magic : 1;
    }
    function cardDamageMultiplier(card, event) {
        card = typeof card === "number" ? getCard(card) : card;
        return card ? attributeMultiplier(card.attribute, readEnemyMetadata(event).attribute) * resistanceMultiplier(card.type, event) : 1;
    }
    // AE 1.6.6b writes regular-enemy HP to the exact HP-bar instance first.
    // Its variable-backed getter is synchronized later by updateHpChange().
    // Read the damage destination; never change the official HP or its storage.
    function damageHp(event) {
        if (!event || $gameMap.event(event.eventId()) !== event) return null;
        if (!event._isMinionActor && !event.linkedActorId) {
            const bar = SceneManager._scene?._spriteset?._eventHpBars?.find(b => b._event === event);
            if (bar && Number.isFinite(bar.currentHp)) return Math.max(0, bar.currentHp);
        }
        return $gameMap.getCurrentEventHp(event.eventId());
    }
    function isLivingEnemy(event) {
        return !!event && !event._erased && !!event.databaseEnemy && !event.databaseActor &&
            !event._isMinionActor && !event.linkedActorId && !!event.event?.() && !!event.page?.() &&
            !event.isTransparent?.() && $gameMap.event(event.eventId()) === event &&
            typeof $gameMap.getCurrentEventHp === "function" && Number(damageHp(event)) > 0;
    }
    function position(character) {
        const p = character.positionPoint?.(); // DotMove 2.2.5 public fractional-tile API.
        return p || { x: number(character._realX, character.x), y: number(character._realY, character.y) };
    }
    function nearestTarget(range) {
        const player = position($gamePlayer);
        let found = null, distance = range;
        for (const event of $gameMap.events()) {
            if (!isLivingEnemy(event)) continue;
            const p = position(event);
            const d = Math.hypot($gameMap.deltaX(p.x, player.x), $gameMap.deltaY(p.y, player.y));
            if (d <= range && (!found || d < distance || (d === distance && event.eventId() < found.eventId()))) {
                found = event;
                distance = d;
            }
        }
        return found;
    }
    let aimDepth = 0;
    const presence = window.ProjectRCombatPresence;
    if (presence?.isCombatActive) {
        const original = presence.isCombatActive;
        // Allow the existing PlayerFacing alias only inside this synchronous aim call.
        presence.isCombatActive = function() { return aimDepth > 0 || isDebugArena() || original.apply(this, arguments); };
    }
    // CombatPresence exposes no force-state setter. Extend its public queries only
    // for the opt-in debug arena; normal maps retain its own scan + exit grace.
    for (const name of ["canUseWeapon", "refresh"]) if (typeof presence?.[name] === "function") {
        const original = presence[name];
        presence[name] = function() { const value = original.apply(this, arguments); return isDebugArena() || value; };
    }
    const normalizeAngle = angle => ((angle % 360) + 360) % 360;
    const angleDifference = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
    function captureMouseAim(mouseOnly = false, pointer = TouchInput) {
        const screenX = $gamePlayer.screenX(), screenY = $gamePlayer.screenY();
        let stick = null;
        try { if (!mouseOnly) stick = window.checkGamepadInput?.(); } catch (_) { /* No gamepad API: use mouse. */ }
        const gamepad = stick && Number.isFinite(stick.x) && Number.isFinite(stick.y) &&
            (Math.abs(stick.x) > 0.1 || Math.abs(stick.y) > 0.1);
        const dx = gamepad ? stick.x : pointer.x - screenX;
        const dy = gamepad ? stick.y : pointer.y - screenY;
        const fallback = !Number.isFinite(dx) || !Number.isFinite(dy) || (!gamepad && Math.hypot(dx, dy) <= 1);
        const angle = fallback ? ({8:0,9:45,6:90,3:135,2:180,1:225,4:270,7:315}[$gamePlayer.direction()] ?? 0) :
            normalizeAngle(Math.atan2(dx, -dy) * 180 / Math.PI);
        return Object.freeze({ angle, source: mouseOnly ? "mouse" : fallback ? "facing" : gamepad ? "gamepad" : "mouse",
            mouseX: pointer.x, mouseY: pointer.y, screenX, screenY,
            realX: $gamePlayer._realX, realY: $gamePlayer._realY });
    }
    function aim(card, target, frozenAim = null) {
        if (typeof $gamePlayer.turnToward !== "function") return false;
        const fixed = $gamePlayer.isDirectionFixed();
        aimDepth++;
        try {
            $gamePlayer.setDirectionFix(false);
            if (card.target === "Mouse" && frozenAim) {
                const directions = $gamePlayer.is8DirSprite?.() ? [8,9,6,3,2,1,4,7] : [8,6,2,4];
                $gamePlayer.setDirection(directions[Math.round(frozenAim.angle / (360 / directions.length)) % directions.length]);
            } else $gamePlayer.turnToward(target.eventId(), false);
        } finally {
            $gamePlayer.setDirectionFix(fixed);
            aimDepth--;
        }
        return true;
    }
    function contextFor(interpreter) {
        const context = interpreterContexts.get(interpreter);
        return context && runtime.active && runtime.contexts.get(context.actionId) === context ? context : null;
    }
    function currentContext(interpreter = executionStack[executionStack.length - 1]) {
        return interpreter ? contextFor(interpreter) : null;
    }
    function finishActionIfDone() {
        if (runtime.action && (!runtime.action.interpreter.isRunning() ||
            contextFor(runtime.action.interpreter) !== runtime.action.context)) runtime.action = null;
        for (const id of managedContexts) releaseUnusedContext(id);
    }
    function useSlot(index, caller = null, clickAim = null) {
        finishActionIfDone();
        if (!runtime.active || !onMap() || !battleAreaActive()) return result(false, "戦闘エリアのカード戦闘中に使用してください。");
        if (playerLocked() || window.ProjectR?.FullscreenDialogue?.isActive?.()) return result(false, "死亡中・会話中はカードを使用できません。");
        if (!Number.isInteger(index) || index < 0 || index > 4) return result(false, "Slot indexは0～4です。");
        if (runtime.actorId !== $gameParty.leader()?.actorId()) return result(false, "カード戦闘中に操作アクターが変更されています。");
        if (runtime.action || $gameMessage.isBusy() || $gameTemp.isCommonEventReserved()) return result(false, "イベント実行中です。");
        if (runtime.lastFrame === frame()) return result(false, "同一フレームの重複入力です。");
        const mapInterpreter = $gameMap._interpreter;
        const owner = caller && caller === executionStack[executionStack.length - 1] ? caller : null;
        // A command may create a child on its executing caller; otherwise use only an idle map interpreter.
        if (!mapInterpreter || (!owner && $gameMap.isEventRunning()) || owner?._childInterpreter?.isRunning()) return result(false, "別のイベントが実行中です。");
        const card = getCard(runtime.hand[index]);
        const commonEvent = card && $dataCommonEvents[card.actionCE];
        if (!card?.valid || !validActionList(commonEvent?.list)) return result(false, "CardActionCEが無効です。");
        if (runtime.energy < card.cost) return result(false, "ENERGYが不足しています。");
        const target = card.target === "Nearest" ? nearestTarget(card.range) : null;
        if (card.target === "Nearest" && !target) return result(false, "範囲内に生存敵がいません。");
        const frozenAim = card.target === "Mouse" ? clickAim || captureMouseAim() : null;
        try {
            if (!aim(card, target, frozenAim)) return result(false, "公式turnToward APIがありません。");
        } catch (error) {
            warn(`照準処理を中止: ${error.message}`);
            return result(false, "照準処理に失敗しました。");
        }
        const context = Object.freeze({ skillId: card.skillId, slotIndex: index,
            aimAngle: frozenAim?.angle ?? null, aimSource: frozenAim?.source ?? null, aim: frozenAim,
            targetEventId: target?.eventId() || 0, attribute: card.attribute, type: card.type,
            cost: card.cost, vfx: card.vfx, mapId: runtime.mapId,
            energyBefore: runtime.energy, energyAfter: config.debug && config.autoEnergy ? 10 : runtime.energy - card.cost,
            actionId: `card:${runtime.session}:${++runtime.serial}` });
        let interpreter;
        const previousChild = owner?._childInterpreter;
        try {
            if (owner) {
                owner.setupChild(commonEvent.list, 0);
                interpreter = owner._childInterpreter;
            } else {
                interpreter = mapInterpreter;
                interpreter.setup(commonEvent.list, 0);
            }
        } catch (error) {
            if (owner) owner._childInterpreter = previousChild;
            else interpreter?.clear();
            warn(`CardActionCEの開始失敗: ${error.message}`);
            return result(false, "CardActionCEを開始できませんでした。");
        }
        interpreterContexts.set(interpreter, context);
        if (target) contextTargets.set(context, target);
        runtime.contexts.set(context.actionId, context);
        runtime.action = { interpreter, context };
        runtime.lastFrame = frame();
        setEnergy(runtime.energy - card.cost);
        pileTrace = [];
        tracePile("Before Use");
        runtime.hand[index] = null;
        runtime.discard.push(card.skillId);
        tracePile("After Discard");
        runtime.hand[index] = draw();
        tracePile("After Draw");
        if (config.debug && config.autoEnergy) setEnergy(10);
        recordDebug({ source: "card", skillId: card.skillId, skillName: $dataSkills[card.skillId].name,
            cardAttribute: card.attribute, cardType: card.type, cost: card.cost, targetEventId: context.targetEventId,
            targetAttribute: target ? readEnemyMetadata(target).attribute : null,
            energyBefore: context.energyBefore, energyAfter: context.energyAfter,
            projectileActionId: context.actionId, result: "started" });
        // Phase 2 adapters play at the actual target/projectile, not before CE execution.
        if (!testCard(card.skillId)) playVfx(context, interpreter);
        revision++;
        return result(true);
    }
    // UI selection is separate from the compatible immediate-use scripting API.
    function cancelAiming(reason = "api") {
        if (!runtime.aiming) return false;
        runtime.aiming = null;
        aimingStatus = reason === "cast" ? "CAST" : "CANCELLED";
        aimingNoticeUntil = -1;
        trace(reason === "cast" ? "Aiming ended" : "Aiming cancelled", { reason });
        revision++;
        return true;
    }
    function aimingInputAllowed() {
        return capturesCardKeys() && !playerLocked() && !$gameMap.isEventRunning() &&
            !$gameTemp.isCommonEventReserved() && !$gamePlayer.isTransferring?.() && !runtime.action &&
            runtime.actorId === $gameParty.leader()?.actorId();
    }
    function aimingEnergyRejected() {
        aimingStatus = "NOT ENOUGH ENERGY";
        aimingNoticeUntil = frame() + 120;
        revision++;
        return result(false, "ENERGYが不足しています。");
    }
    function selectSlot(index) {
        finishActionIfDone();
        if (!aimingInputAllowed()) return result(false, "現在カードを選択できません。");
        const same = runtime.aiming?.slotIndex === index;
        cancelAiming(same ? "sameSlot" : "slotChange");
        if (same) return result(true);
        const card = getCard(runtime.hand[index]);
        if (card?.target !== "Mouse") return useSlot(index);
        if (!card.valid || !validActionList($dataCommonEvents[card.actionCE]?.list)) return result(false, "CardActionCEが無効です。");
        if (runtime.energy < card.cost) return aimingEnergyRejected();
        runtime.aiming = Object.freeze({ active: true, slotIndex: index, skillId: card.skillId,
            selectedAtFrame: frame(), mapId: $gameMap.mapId() });
        aimingStatus = "WAITING";
        aimingNoticeUntil = -1;
        trace("Mouse Card selected", runtime.aiming);
        trace("Aiming started", runtime.aiming);
        revision++;
        return result(true);
    }
    function confirmAiming(pointer = TouchInput) {
        finishActionIfDone();
        const selected = runtime.aiming;
        if (!selected || selected.selectedAtFrame >= frame() || !aimingInputAllowed()) return result(false, "照準の確定を待機しています。");
        if (selected.mapId !== $gameMap.mapId() || runtime.hand[selected.slotIndex] !== selected.skillId) {
            cancelAiming("selectionChanged"); return result(false, "選択カードが変更されています。");
        }
        const card = getCard(selected.skillId);
        if (runtime.energy < card.cost) return aimingEnergyRejected();
        const frozenAim = captureMouseAim(true, pointer);
        trace("Mouse confirm", { slotIndex: selected.slotIndex });
        trace("Aim frozen", frozenAim);
        const accepted = useSlot(selected.slotIndex, null, frozenAim);
        if (accepted.ok) {
            trace("Card action accepted", { skillId: selected.skillId });
            trace("Energy consumed", { cost: card.cost });
            trace("Discard", { skillId: selected.skillId });
            trace("Draw", { skillId: runtime.hand[selected.slotIndex] });
            cancelAiming("cast");
        }
        return accepted;
    }

    const vfxRegistry = new Map();
    const pendingVfx = new Map();
    const vfxAppearance = new Map();
    const liveVfx = new Map();
    let vfxSerial = 0;
    // Official JP sample spritesheet grids/command schema (CE11, CE40, Map003).
    // Designer GUI is not automated; these are Show VFX presets, NOT fabricated library output.
    const baseVfxRegistry = Object.freeze({
        MercuryShot_Test: Object.freeze({ file: "Electric_Dash_Line", rows: 4, columns: 5, fps: 40,
            scale: 95, tint: "#D4EDFF", opacity: 255, reverse: false, follow: true, blend: "Add", loops: 8 }),
        Venus: Object.freeze({ file: "Fire_Disc_Burst", rows: 5, columns: 6, fps: 40,
            scale: 190, tint: "#FFE890", opacity: 255, rotation: 45, blend: "Add" }),
        Earth: Object.freeze({ file: "Smoke_Impact", rows: 5, columns: 7, fps: 35,
            scale: 145, tint: "#D0AE72", opacity: 255, rotation: 0, blend: "Normal" }),
        MarsSlash_Test: Object.freeze({ file: "Fire_Disc_Burst", rows: 5, columns: 6, fps: 42,
            scale: 230, tint: "#FFAA66", opacity: 255, reverse: false, follow: false, blend: "Add" }),
        Jupiter: Object.freeze({ file: "Electric_Dash_Line", rows: 4, columns: 5, fps: 32,
            scale: 170, tint: "#DABCFF", opacity: 255, rotation: 15, blend: "Add", loops: 2 }),
        Saturn: Object.freeze({ file: "Fire_Disc_Burst", rows: 5, columns: 6, fps: 35,
            scale: 220, tint: "#FFDDA0", opacity: 255, rotation: 90, blend: "Screen" }),
        Uranus: Object.freeze({ file: "Electric_Dash_Line", rows: 4, columns: 5, fps: 35,
            scale: 110, tint: "#A0FFF0", opacity: 255, follow: true, blend: "Add", loops: 8 }),
        Neptune: Object.freeze({ file: "Electric_Dash_Line", rows: 4, columns: 5, fps: 28,
            scale: 135, tint: "#609DFF", opacity: 255, follow: true, blend: "Screen", loops: 8 }),
        PlutoEclipse_Test: Object.freeze({ file: "Smoke_Impact", rows: 5, columns: 7, fps: 32,
            scale: 155, tint: "#662080", opacity: 255, reverse: true, follow: false, blend: "Normal" })
    });
    // The sheets are radial/spark impacts, not directional arrows: no guessed 90-degree correction.
    const vfxRotationOffsets = Object.freeze({ Electric_Dash_Line: 0, Fire_Disc_Burst: 0, Smoke_Impact: 0 });
    const testVfxRegistry = Object.freeze(Object.fromEntries(Object.entries(baseVfxRegistry).map(([key, base]) => {
        const tint = key === "Jupiter" ? "#FFF078" : key === "Uranus" ? "#BFEFFF" :
            key === "Neptune" ? "#286FE8" : key === "Earth" ? "#A6AA68" : base.tint;
        const impactFile = key === "Earth" || key === "PlutoEclipse_Test" ? "Smoke_Impact" : "Fire_Disc_Burst";
        const impact = Object.freeze({ ...base, phase: "impact", file: impactFile, rows: 5,
            columns: impactFile === "Smoke_Impact" ? 7 : 6, fps: 60,
            tint, scale: Math.min(345, Math.round((base.follow ? 160 : base.scale) * 1.6)),
            follow: false, loops: 1, rotation: undefined, reverse: false });
        const trail = Object.freeze({ ...base, phase: "trail", tint, scale: Math.round(base.scale * 1.4),
            rotation: undefined, follow: true, loops: 16 });
        const launch = Object.freeze({ ...impact, phase: "launch", scale: key === "Venus" ? 180 : 90,
            fps: 60, frameRange: "1-12", reverse: key === "PlutoEclipse_Test", opacity: 230,
            ...(key === "MarsSlash_Test" ? { file: "Electric_Dash_Line", rows: 4, columns: 5, scale: 210 } : {}) });
        const layer = ["Jupiter","Saturn","PlutoEclipse_Test"].includes(key) ? Object.freeze({ ...impact,
            phase: "impact", delay: 5, scale: impact.scale * 0.7, rotationOffset: 90,
            tint: key === "PlutoEclipse_Test" ? "#CE409E" : tint, blend: "Add",
            ...(key === "Jupiter" ? { file: "Electric_Dash_Line", rows: 4, columns: 5, fps: 45 } : {}) }) : null;
        return [key, Object.freeze({ ...(base.follow ? trail : impact), launch, trail, impact, layer })];
    })));
    const presetFor = (context, phase) => {
        const entry = testVfxRegistry[context.vfx] || testVfxRegistry[context.attribute];
        return phase ? entry?.[phase] : entry;
    };
    const visualAngles = new Map(), ownedPictures = new Map();
    let aimDebug = null, vfxDebug = null;
    function visualAngle(context) { return context.aimAngle ?? visualAngles.get(context.actionId) ?? 0; }
    function removeOwnedVfx(note, entry) {
        const target = entry.target;
        const owned = ownedPictures.get(note);
        if (owned?.dispose) { owned.dispose(); ownedPictures.delete(note); liveVfx.delete(note);
            if (config.debug) { vfxDebug = { ...vfxDebug, cleanup: "ok" }; revision++; } return; }
        if (target !== $gamePlayer && $gameMap.event(target.eventId()) !== target) {
            // The official command resolves numeric IDs through the current map.
            // If an ID was erased/reused, dispose only our exact old target+note,
            // using the same disposal API as AS's removeAnimation command.
            for (const picture of window.AnimatedPictureManager?._animatedPictures?.slice() || []) {
                if (picture.target === target && picture.note === note) picture.dispose();
            }
        } else {
            PluginManager._commands?.["Hendrix_Animation_Solution:removeAnimation"]?.call(new Game_Interpreter(), {
                eventId: target === $gamePlayer ? "player" : String(target.eventId()), notetag: note, effect: "none", duration: "0"
            });
        }
        liveVfx.delete(note);
        ownedPictures.delete(note);
    }
    const assetAvailability = new Map();
    function testAssetAvailable(filename) {
        if (!assetAvailability.has(filename)) assetAvailability.set(filename, probeTestAsset(filename));
        return assetAvailability.get(filename);
    }
    function probeTestAsset(filename) {
        try {
            if (typeof require === "function" && Utils.isNwjs?.()) {
                return Promise.resolve(require("fs").existsSync(require("path").resolve(filename)));
            }
            // The optional loader never passes a known missing URL to MZ's fatal ImageManager path.
            if (typeof fetch === "function") return fetch(filename, { method: "HEAD" }).then(response => response.ok, () => false);
        } catch (_) { /* Optional presentation must not stop a card action. */ }
        return Promise.resolve(false);
    }
    async function playTestVfx(context, interpreter, target, override = null) {
        const preset = override || presetFor(context);
        trace("VFX request", { name: preset?.file || context.vfx, target: target?.eventId?.() || "player", action: context.actionId });
        if (!preset) return playVfx(context, interpreter);
        const show = PluginManager._commands?.["Hendrix_Animation_Solution:showAnimatedPicture"];
        if (!show || !target) return false;
        const session = runtime.session;
        const path = `img/pictures/ProjectR_CardTest/${preset.file}.png`;
        if (!await testAssetAvailable(path)) { warn(`VFX素材なし: ${path}。演出のみ省略します。`); return false; }
        // Async availability checks must not animate a reused ID or a different map/session.
        if (!runtime.active || runtime.session !== session || context.mapId !== $gameMap.mapId() ||
            (target !== $gamePlayer && $gameMap.event(target.eventId()) !== target) || target._erased ||
            (preset.follow && !projectileContext(target))) return false;
        try {
            const bitmap = window.PermanentImageCache?.load("img/pictures/", `ProjectR_CardTest/${preset.file}`);
            if (!bitmap) { warn("公式PermanentImageCacheがありません。テストVFXを省略します。"); return false; }
            const id = `${context.actionId}:vfx:${++vfxSerial}`;
            pendingVfx.set(id, { context, interpreter, target, preset, session, bitmap, born: frame(), readyAt: frame() + (preset.delay || 0) });
            trace("VFX accepted", { name: preset.file, target: target.eventId?.() || "player", action: context.actionId });
            flushTestVfx();
            return true;
        } catch (error) { warn(`テストVFX読込失敗: ${error.message}`); return false; }
    }
    function flushTestVfx() {
        for (const [id, entry] of liveVfx) if (frame() >= entry.expires) removeOwnedVfx(id, entry);
        for (const [id, request] of pendingVfx) {
            const { context, interpreter, target, preset, session, bitmap } = request;
            if (!runtime.active || runtime.session !== session || context.mapId !== $gameMap.mapId() ||
                (target !== $gamePlayer && $gameMap.event(target.eventId()) !== target) || target._erased ||
                (preset.follow && !projectileContext(target)) || frame() - request.born > 120 || bitmap.isError?.()) {
                pendingVfx.delete(id); continue;
            }
            const sprite = SceneManager._scene?._spriteset?.findCharacterSprite(target);
            // AS 2.0.7 otherwise starts an unbounded readiness timer. Only call it when
            // BOTH its cached sheet and the exact target sprite are already ready.
            if (frame() < request.readyAt || !bitmap.isReady() || !sprite?.bitmap?.isReady()) continue;
            pendingVfx.delete(id);
            vfxAppearance.set(id, preset);
            try {
                const desiredAngle = normalizeAngle(visualAngle(context) + (preset.rotationOffset ?? vfxRotationOffsets[preset.file] ?? 0));
                // AS adds targetSprite.rotation to this command rotation. Supply only the remainder.
                const inheritedAngle = target.customRotationPoint ? (target._rotation || 0) : 0;
                const commandAngle = normalizeAngle(desiredAngle - inheritedAngle);
                vfxAppearance.set(id, { ...preset, desiredAngle, aimContext: context });
                PluginManager.callCommand(interpreter, "Hendrix_Animation_Solution", "showAnimatedPicture", {
                    note: id, fps: String(preset.fps), loopCount: String(preset.loops || 1),
                    spritesheetSettings: JSON.stringify({ spritesheetFile: `ProjectR_CardTest/${preset.file}`, row: String(preset.rows), column: String(preset.columns), frameRange: preset.frameRange || "" }),
                    positionSettings: JSON.stringify({ eventId: target === $gamePlayer ? "player" : String(target.eventId()), offsetX: "0", offsetY: "0", zIndex: "8", stickMode: String(!preset.follow) }),
                    visualSettings: JSON.stringify({ scalePercent: String(preset.scale), opacity: String(preset.opacity), hue: "0", blendMode: preset.blend || "Normal", playInReverse: String(!!preset.reverse) }),
                    transformSettings: JSON.stringify({ flip: "false", flipY: "false", randomFlipX: "false", randomFlipY: "false",
                        rotation: String(commandAngle), randomRotation: "false" }),
                    bloomSettings: JSON.stringify({ bloomEffect: "false", blurAmount: "0", intensity: "0", tintColor: preset.tint })
                });
                liveVfx.set(id, { target, expires: frame() + Math.ceil(preset.rows * preset.columns / preset.fps * 60 * (preset.loops || 1)) + 30 });
                if (config.debug) {
                    vfxDebug = { ...(vfxDebug?.action === context.actionId ? vfxDebug : {}), name: context.vfx || context.attribute,
                        action: context.actionId, [preset.phase || "impact"]: ownedPictures.has(id) ? "created" : "submitted" };
                    if (context.aim && preset.phase === "trail") aimDebug = { ...context.aim, projectile: target._rotation,
                        vfx: desiredAngle, difference: angleDifference(context.aimAngle, desiredAngle), skillId: context.skillId };
                    revision++;
                }
                trace("VFX submitted", { name: preset.file, target: target.eventId?.() || "player",
                    rotation: desiredAngle, commandAngle, inheritedAngle, phase: preset.phase,
                    duration: Math.ceil(preset.rows * preset.columns / preset.fps * 60 * (preset.loops || 1)) });
            } catch (error) { warn(`テストVFX呼出失敗: ${error.message}`); }
            finally { vfxAppearance.delete(id); }
        }
    }
    const addAnimatedPicture = Scene_Map.prototype.addAnimatedPicture;
    if (addAnimatedPicture) Scene_Map.prototype.addAnimatedPicture = function(picture) {
        const preset = vfxAppearance.get(picture.note);
        if (preset) ownedPictures.set(picture.note, picture);
        if (preset && picture.updatePosition) {
            const updatePosition = picture.updatePosition;
            const radians = preset.desiredAngle * Math.PI / 180;
            picture.updatePosition = function() {
                updatePosition.apply(this, arguments);
                // Instance-only presentation hook: AS may see a one-frame-old target Sprite rotation.
                if (this.sprite) this.sprite.rotation = radians;
                if (this.bloomSprite) this.bloomSprite.rotation = radians;
                if (config.debug && preset.phase === "trail" && preset.aimContext.aim && this.sprite) {
                    const context = preset.aimContext, rendered = normalizeAngle(this.sprite.rotation * 180 / Math.PI);
                    const difference = Math.max(angleDifference(context.aimAngle, this.target._rotation),
                        angleDifference(context.aimAngle, rendered - (preset.rotationOffset ?? 0)));
                    if (aimDebug?.vfx !== rendered || aimDebug?.difference !== difference) {
                        aimDebug = { ...context.aim, projectile: this.target._rotation, vfx: rendered, difference, skillId: context.skillId };
                        revision++;
                    }
                }
            };
        }
        if (preset) trace("VFX sprite created", { name: preset.file, created: !!picture.sprite });
        // AS tintColor colors its bloom only. Tint this owned PIXI sprite, not the
        // shared Bitmap/texture, to obtain dark purple smoke without changing assets.
        if (preset && picture.sprite) {
            const color = parseInt(preset.tint.slice(1), 16);
            if (picture.sprite.setColorTone && picture.sprite.setBlendColor) {
                picture.sprite.setColorTone([0, 0, 0, 255]);
                picture.sprite.setBlendColor([(color >> 16) & 255, (color >> 8) & 255, color & 255, 180]);
            } else picture.sprite.tint = color;
        }
        return addAnimatedPicture.apply(this, arguments);
    };
    function registerVfx(key, entry) {
        if (!key || !entry?.animationName || !["player", "player front", "target"].includes(entry.target || "player")) return false;
        vfxRegistry.set(String(key), Object.freeze({ animationName: String(entry.animationName),
            target: entry.target || "player", ready: entry.ready === true || entry.ready === "true",
            stickMode: entry.stickMode === true || entry.stickMode === "true" }));
        return true;
    }
    try {
        for (const value of JSON.parse(parameters.VfxRegistry || "[]")) {
            const entry = typeof value === "string" ? JSON.parse(value) : value;
            registerVfx(entry.key, entry);
        }
    } catch (error) { warn(`VfxRegistryを読み込めません: ${error.message}`); }
    function playVfx(context, interpreter) {
        if (!context.vfx) return false;
        const entry = vfxRegistry.get(context.vfx);
        // Opt-in: unconfigured/incomplete effects cause NO file or image request.
        if (!entry?.ready) {
            warn(`VFX ${context.vfx}: 配置確認済みRegistryがありません。演出のみ省略します。`);
            return false;
        }
        if (entry.target === "target" && !context.targetEventId) return false;
        if (!PluginManager._commands?.["Hendrix_Animation_Solution:showAnimationFromLibrary"]) {
            warn("Animation SolutionのshowAnimationFromLibraryがありません。");
            return false;
        }
        try {
            PluginManager.callCommand(interpreter, "Hendrix_Animation_Solution", "showAnimationFromLibrary", {
                animationName: entry.animationName,
                eventId: entry.target === "target" ? String(context.targetEventId) : entry.target,
                loopCount: "1", stickMode: String(entry.stickMode)
            });
            return true;
        } catch (error) {
            warn(`VFX呼出失敗: ${error.message}`);
            return false;
        }
    }
    function bindActionContext(interpreter, actionId) {
        const context = runtime.contexts.get(actionId);
        if (!runtime.active || !context || context.mapId !== $gameMap.mapId() ||
            !(interpreter instanceof Game_Interpreter)) return false;
        interpreterContexts.set(interpreter, context);
        return true;
    }

    function debugSetupTestDeck() {
        if (!config.debug) return result(false, "EnableDebugCommands=false: DEBUG配布は無効です。");
        if (runtime.active || !state()) return result(false, "カード戦闘を終了してからDEBUG設定してください。");
        for (const expected of TEST_CARDS) {
            const actual = getCard(expected.skillId);
            if (!actual?.valid || ["actionCE", "attribute", "type", "rarity", "cost", "target", "range"].some(k => actual[k] !== expected[k])) {
                return result(false, `テストSkill ${expected.skillId}の設定が一致しません。配布しません。`);
            }
        }
        // Explicit DEV replacement of these nine counts and the deck only; other inventory survives.
        const data = state();
        for (const card of TEST_CARDS) data.ownedCards[card.skillId] = card.copies;
        data.deck = TEST_CARDS.flatMap(card => Array(card.copies).fill(card.skillId));
        revision++;
        return result(validateDeck().valid);
    }
    function createMainAttackToken(kind = "fallback") {
        if (!["sword", "fallback"].includes(kind)) kind = "fallback";
        return Object.freeze({ kind: "main", attackKind: kind, session: runtime.session,
            mapId: runtime.mapId, id: `${kind}:${runtime.session}:${++runtime.mainSerial}` });
    }
    function validMainToken(token) {
        return runtime.active && token?.kind === "main" && token.session === runtime.session && token.mapId === $gameMap.mapId();
    }
    function resolveSwordHitbox(interpreter) {
        const token = mainAttacks.get(interpreter);
        if (!validMainToken(token) || token.attackKind !== "sword" || contextFor(interpreter)) return false;
        const tag = `<ProjectRSword:${token.id}>`;
        const hitboxes = $gameMap.tagToEvents?.get(tag) || [];
        const hitbox = hitboxes.find(e => e && !e._erased && $gameMap.event(e.eventId()) === e);
        if (!hitbox) return false;
        let hits = swordHits.get(token);
        if (!hits) { hits = new Set(); swordHits.set(token, hits); }
        const detected = [];
        // Candidates come from AE's existing tag index; collision and damage are official APIs.
        for (const target of ($gameMap.tagToEvents?.get("<enemy>") || []).slice()) {
            if (!target?.event()?.note?.includes("<enemy>") || !isLivingEnemy(target) || hits.has(target.eventId())) continue;
            if (!window.checkCollide(target.eventId(), tag, 0, 6)) continue;
            hits.add(target.eventId()); detected.push(target.eventId());
            pendingHits.set(interpreter, { target, token });
            PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", {
                eventId: String(target.eventId()), value: "-player weapon", exceedMaxHealth: "false"
            });
        }
        if (config.debug) {
            const hb = hitbox.hitboxData();
            swordSnapshot = { token: token.id, direction: $gamePlayer.direction(), x: hitbox._realX, y: hitbox._realY,
                width: hb.width, height: hb.height, detected };
            trace("Sword hitbox", swordSnapshot); revision++;
            if (config.overlay && typeof PIXI !== "undefined" && PIXI.Graphics) {
                const graphics = new PIXI.Graphics();
                graphics.lineStyle(2, detected.length ? 0xffd34d : 0xffffff, 0.8);
                graphics.drawRect(-$gameMap.tileWidth() / 2 + hb.offsetX, -$gameMap.tileHeight() + hb.offsetY,
                    hb.width * $gameMap.tileWidth(), hb.height * $gameMap.tileHeight());
                graphics.x = hitbox.screenX(); graphics.y = hitbox.screenY();
                SceneManager._scene.addChild(graphics);
                swordVisuals.push({ graphics, event: hitbox, mapId: runtime.mapId,
                    expires: swordSwings.get(token) ?? frame() + 10 });
            }
        }
        return detected.length > 0;
    }
    function beginMainAttack(interpreter, kind = "fallback") {
        if (!runtime.active || !(interpreter instanceof Game_Interpreter) || contextFor(interpreter)) return null;
        const token = createMainAttackToken(kind);
        if (kind === "sword" && isDebugArena()) {
            restoreArenaFacing("nextSword");
            swordPriorFix.set(token, $gamePlayer.isDirectionFixed());
            trace("Sword attack accepted", { direction: $gamePlayer.direction(), fix: $gamePlayer.isDirectionFixed() });
        }
        mainAttacks.set(interpreter, token);
        pendingHits.delete(interpreter);
        trace(`${token.attackKind} start`, { token: token.id });
        return token;
    }
    const collisions = () => typeof CollisionManager !== "undefined" ? CollisionManager : null;
    function validEventAction(event, record) {
        return runtime.active && record && record.session === runtime.session && record.mapId === $gameMap.mapId() &&
            $gameMap.event(event.eventId()) === event && !event._erased;
    }
    function projectileContext(event) {
        const record = eventActions.get(event);
        return validEventAction(event, record) && record.kind === "card" ? runtime.contexts.get(record.actionId) || null : null;
    }
    function releaseUnusedContext(id) {
        if (!managedContexts.has(id) || runtime.action?.context.actionId === id ||
            Array.from(eventActions.values()).some(record => record.actionId === id)) return;
        runtime.contexts.delete(id);
        managedContexts.delete(id);
    }
    function releaseEventAction(event, destroy = false) {
        const record = eventActions.get(event);
        if (!record) return false;
        eventActions.delete(event);
        for (const [id, request] of pendingVfx) if (request.target === event) pendingVfx.delete(id);
        for (const [id, entry] of liveVfx) if (entry.target === event) removeOwnedVfx(id, entry);
        // Never erase a newly allocated event which happens to have the same numeric ID.
        if (destroy && record.kind === "card" && record.mapId === $gameMap.mapId() && $gameMap.event(event.eventId()) === event) {
            event.erase?.();
            collisions()?.clearCollisions(event.eventId());
            $gameMap.removeEventFromTagIndex?.(event);
            // Same immediate removal as the official Dynamic Event lifetime script,
            // but guarded by map AND instance (no delayed callback against a reused ID).
            $gameMap._events[event.eventId()] = null;
            event.removeMapCharactersCache?.();
            $gameTemp._characterTempDatas?.delete(event);
            $gameTemp._lastAllCharacters?.delete(event);
        }
        if (record.sprite) {
            record.sprite.parent?.removeChild(record.sprite);
            const list = record.spriteset?._characterSprites;
            const index = list?.indexOf(record.sprite) ?? -1;
            if (index >= 0) list.splice(index, 1);
            record.sprite.destroy({ children: true, texture: false, baseTexture: false });
        }
        if (record.actionId) releaseUnusedContext(record.actionId);
        return true;
    }
    const unspawnEvent = Game_Map.prototype.unspawnEvent;
    if (unspawnEvent) Game_Map.prototype.unspawnEvent = function(id) {
        const event = this.event(id);
        const value = unspawnEvent.apply(this, arguments);
        if (event && this.event(id) !== event) releaseEventAction(event);
        return value;
    };
    const checkCollision = window.checkCollide;
    if (typeof checkCollision === "function") window.checkCollide = function(targetId) {
        const hit = checkCollision.apply(this, arguments);
        const interpreter = executionStack[executionStack.length - 1];
        if (runtime.active && interpreter) {
            pendingHits.delete(interpreter);
            const target = $gameMap.event(Number(targetId));
            if (hit && !contextFor(interpreter) && isLivingEnemy(target)) {
                const token = arguments[1] === "<playerAttack>" ? mainAttacks.get(interpreter) : null;
                if (validMainToken(token)) {
                    pendingHits.set(interpreter, { target, token });
                    trace("Collision", { target: target.eventId(), token: token.id });
                }
            }
        }
        return hit;
    };
    function dealCardDamage(context, event) {
        if (!runtime.active || runtime.contexts.get(context.actionId) !== context || !isLivingEnemy(event)) return 0;
        const interpreter = new Game_Interpreter();
        bindActionContext(interpreter, context.actionId);
        executionStack.push(interpreter);
        try {
            const damage = interpreter.calculateDamageAgainstEvent(event, "skill", context.skillId);
            if (!Number.isFinite(damage) || damage <= 0) return 0;
            const before = damageHp(event);
            trace("Card before UpdateEventHp", { target: event.eventId(), hp: before, action: context.actionId });
            PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", {
                eventId: String(event.eventId()), value: String(-damage), useWeaponAttack: "none", exceedMaxHealth: "false"
            });
            const after = damageHp(event);
            const actual = Number.isFinite(before) && Number.isFinite(after) ? Math.max(0, before - after) : 0;
            trace("Card after UpdateEventHp", { target: event.eventId(), before, after, damage: actual, action: context.actionId });
            if (config.debug && debugCard?.projectileActionId === context.actionId) {
                recordDebug({ ...debugCard, finalDamage: actual, result: actual > 0 ? "hit" : "no damage" });
            }
            return actual;
        } finally { executionStack.pop(); interpreter.clear(); }
    }
    function spawnCardProjectile(context, interpreter) {
        const spawn = PluginManager._commands?.["Hendrix_Action_Engine:spawnEventHitbox"];
        if (!spawn || typeof window.checkCollide !== "function") { warn("公式Projectile APIがありません。"); return null; }
        const card = getCard(context.skillId);
        const tag = `<ProjectRCard_${runtime.session}_${runtime.serial}>`;
        // Blank wait: the official CE must not install an ID-only delayed destroy script.
        const id = spawn.call(interpreter, { position: "player", notetag: `${tag}<attacker: player><hitbox: 0.3, 0.3>`,
            wait: "", comment: "", name: "ProjectRCardProjectile", turnToward: "", rotationDegree: "0" });
        const event = $gameMap.event(id);
        if (!event) return null;
        const start = position(event);
        const record = { kind: "card", actionId: context.actionId, session: runtime.session,
            mapId: runtime.mapId, tag, origin: { x: start.x, y: start.y }, born: frame(), range: card.range };
        eventActions.set(event, record);
        try {
            const target = $gameMap.event(context.targetEventId);
            if (card.target === "Nearest" && target) { const p = position(target); event.rotateTo(p.x, p.y); }
            else {
                event.setOriginPoint("center"); event.setCustomRotation(false); event.customRotationPoint = true;
                event._applyRotation(context.aimAngle);
            }
            visualAngles.set(context.actionId, event._rotation);
            if (config.debug && context.aim) { aimDebug = { ...context.aim, projectile: event._rotation,
                vfx: context.aimAngle, difference: angleDifference(context.aimAngle, event._rotation), skillId: context.skillId }; revision++; }
            if (config.debug && card.target === "Mouse") trace("Mouse diagnostic", { ...context.aim,
                playerX: context.aim.realX, playerY: context.aim.realY, mouseAngle: context.aimAngle,
                projectileAngle: event._rotation, vfxAngle: presetFor(context)?.rotation ?? event._rotation,
                unit: "degrees", action: context.actionId });
            event.setMoveSpeed(card.attribute === "Mercury" ? 7 : 6);
            event.setImage("VFX/$Bullet", 0); // Existing ProjectR asset, not an additional dependency.
            event.setPriorityType(1);
            event.forceMoveRoute({ repeat: false, skippable: true, wait: false, list: [
                { code: 45, parameters: [`this.moveToPosition('forward', ${card.range});`] }, { code: 0, parameters: [] }
            ] });
            const spriteset = SceneManager._scene?._spriteset;
            if (spriteset && typeof Sprite_Character !== "undefined") {
                record.sprite = new Sprite_Character(event);
                record.spriteset = spriteset;
                spriteset._characterSprites.push(record.sprite);
                spriteset._tilemap.addChild(record.sprite);
            }
            playTestVfx(context, interpreter, event, presetFor(context, "trail"));
            playTestVfx(context, interpreter, $gamePlayer, presetFor(context, "launch"));
            return event;
        } catch (error) {
            releaseEventAction(event, true);
            warn(`Projectile生成失敗: ${error.message}`);
            return null;
        }
    }
    function executeTestCard(interpreter) {
        const context = contextFor(interpreter), spec = context && testCard(context.skillId);
        if (!spec || managedContexts.has(context.actionId)) return false;
        managedContexts.add(context.actionId);
        if (spec.target === "Nearest" && contextTargets.get(context) !== $gameMap.event(context.targetEventId)) return false;
        if (spec.mode === "projectile") return !!spawnCardProjectile(context, interpreter);
        const target = $gameMap.event(context.targetEventId);
        if (!isLivingEnemy(target)) return false;
        const origin = position($gamePlayer), center = position(target);
        const inRange = event => {
            const p = position(event);
            return Math.hypot($gameMap.deltaX(p.x, origin.x), $gameMap.deltaY(p.y, origin.y)) <= spec.range;
        };
        const targets = spec.mode === "area" ? $gameMap.events().filter(event => {
            if (!isLivingEnemy(event) || !inRange(event)) return false;
            const p = position(event);
            return Math.hypot($gameMap.deltaX(p.x, center.x), $gameMap.deltaY(p.y, center.y)) <= 1.5;
        }) : (inRange(target) ? [target] : []);
        visualAngles.set(context.actionId, normalizeAngle(Math.atan2($gameMap.deltaX(center.x, origin.x), -$gameMap.deltaY(center.y, origin.y)) * 180 / Math.PI));
        playTestVfx(context, interpreter, context.attribute === "Mars" ? $gamePlayer : target, presetFor(context, "launch"));
        for (const enemy of targets) { dealCardDamage(context, enemy); playHitVfx(context, interpreter, enemy); }
        return targets.length > 0;
    }
    function playHitVfx(context, interpreter, target) {
        const preset = presetFor(context, "impact");
        if (!preset) return playTestVfx(context, interpreter, target);
        playTestVfx(context, interpreter, target, preset);
        const layer = presetFor(context, "layer");
        if (layer) playTestVfx(context, interpreter, target, layer);
    }
    function clearSwordVisuals() {
        for (const v of swordVisuals.splice(0)) {
            v.graphics.parent?.removeChild(v.graphics);
            if (!v.graphics.destroyed && !v.graphics._destroyed) v.graphics.destroy();
        }
    }
    function updateEventActions() {
        for (let i = swordVisuals.length - 1; i >= 0; i--) {
            const v = swordVisuals[i];
            if (!runtime.active || v.mapId !== $gameMap.mapId() || frame() >= v.expires) {
                v.graphics.parent?.removeChild(v.graphics); v.graphics.destroy(); swordVisuals.splice(i, 1);
            } else { v.graphics.x = v.event.screenX(); v.graphics.y = v.event.screenY(); }
        }
        if (!runtime.active) return;
        for (const [event, record] of eventActions) {
            if (!validEventAction(event, record)) { releaseEventAction(event, true); continue; }
            if (record.kind !== "card") continue;
            const p = position(event);
            const distance = Math.hypot($gameMap.deltaX(p.x, record.origin.x), $gameMap.deltaY(p.y, record.origin.y));
            if (frame() - record.born > 240 || distance > record.range + 0.5 ||
                ($gameMap.isValid && !$gameMap.isValid(Math.floor(p.x), Math.floor(p.y)))) {
                releaseEventAction(event, true); continue;
            }
            if (window.checkCollide(event.eventId(), "<destroyProjectile>", 0, 2)) { releaseEventAction(event, true); continue; }
            let hit = false;
            for (const target of $gameMap.events()) {
                if (!isLivingEnemy(target)) continue;
                if (window.checkCollide(target.eventId(), record.tag, 0, 2)) {
                    const context = projectileContext(event);
                    trace("Card Collision", { projectileId: event.eventId(), target: target.eventId(), action: context?.actionId });
                    if (context) dealCardDamage(context, target);
                    if (context) playHitVfx(context, new Game_Interpreter(), target);
                    hit = true;
                    break;
                }
            }
            if (hit || distance >= record.range) releaseEventAction(event, true);
        }
    }
    const gameMapUpdate = Game_Map.prototype.update;
    if (gameMapUpdate) Game_Map.prototype.update = function() {
        const value = gameMapUpdate.apply(this, arguments);
        updateEventActions();
        flushTestVfx();
        return value;
    };

    // Scope is attached to an interpreter, including its MZ common-event children.
    // It is never a mutable global "last used card" and is removed on reuse.
    const interpreterClear = Game_Interpreter.prototype.clear;
    Game_Interpreter.prototype.clear = function() {
        interpreterContexts.delete(this);
        mainAttacks.delete(this);
        pendingHits.delete(this);
        return interpreterClear.apply(this, arguments);
    };
    const setupChild = Game_Interpreter.prototype.setupChild;
    Game_Interpreter.prototype.setupChild = function() {
        const value = setupChild.apply(this, arguments);
        const context = contextFor(this);
        if (context && this._childInterpreter) interpreterContexts.set(this._childInterpreter, context);
        const token = mainAttacks.get(this);
        if (validMainToken(token) && this._childInterpreter) mainAttacks.set(this._childInterpreter, token);
        return value;
    };
    const interpreterUpdate = Game_Interpreter.prototype.update;
    Game_Interpreter.prototype.update = function() {
        executionStack.push(this);
        try { return interpreterUpdate.apply(this, arguments); }
        finally {
            executionStack.pop();
            if (!this.isRunning()) { interpreterContexts.delete(this); mainAttacks.delete(this); pendingHits.delete(this); }
            finishActionIfDone();
        }
    };
    const calculateDamage = Game_Interpreter.prototype.calculateDamageAgainstEvent;
    if (typeof calculateDamage === "function") {
        Game_Interpreter.prototype.calculateDamageAgainstEvent = function(target, source, skill) {
            const baseDamage = calculateDamage.apply(this, arguments);
            const context = contextFor(this);
            const originalSkill = context && $dataSkills[context.skillId];
            const matches = originalSkill && (skill === originalSkill.id || skill === originalSkill ||
                (typeof skill === "string" && uniqueSkillNames.get(skill.toLowerCase()) === originalSkill.id));
            if (!context || source !== "skill" || !matches || !isLivingEnemy(target) || !Number.isFinite(baseDamage)) return baseDamage;
            // The official engine still calculates accuracy, crit, formula and standard traits.
            if (config.debug) console.log("[CardSkillDeck]", {
                actionId: context.actionId, skillId: context.skillId, from: context.attribute, to: readEnemyMetadata(target).attribute,
                attributeMultiplier: attributeMultiplier(context.attribute, readEnemyMetadata(target).attribute),
                type: context.type, resistance: resistanceMultiplier(context.type, target),
                finalMultiplier: cardDamageMultiplier(context, target), baseDamage
            });
            const finalDamage = Math.round(baseDamage * cardDamageMultiplier(context, target));
            recordDebug({ source: "card", skillId: context.skillId, skillName: originalSkill.name,
                cardAttribute: context.attribute, cardType: context.type, cost: context.cost,
                targetEventId: target.eventId(), targetAttribute: readEnemyMetadata(target).attribute,
                attributeMultiplier: attributeMultiplier(context.attribute, readEnemyMetadata(target).attribute),
                resistanceMultiplier: resistanceMultiplier(context.type, target), finalMultiplier: cardDamageMultiplier(context, target),
                baseDamage, finalDamage, energyBefore: context.energyBefore, energyAfter: context.energyAfter,
                projectileActionId: context.actionId, result: finalDamage > 0 ? "calculated" : "miss" });
            return finalDamage;
        };
    } else warn("公式calculateDamageAgainstEventがありません。倍率計算APIのみ利用可能です。");

    // Physical edge-trigger capture occurs BEFORE MZ / Hendrix keyboard listeners.
    // In menus/messages/editable HTML fields the normal input path is untouched.
    const heldKeys = new Set();
    const keyQueue = [];
    let arenaQueued = false;
    function openTestArena() {
        if (!config.debug || !onMap() || playerLocked() || $gameMessage.isBusy() ||
            $gameMap.isEventRunning() || $gamePlayer.isTransferring?.() ||
            window.ProjectR?.FullscreenDialogue?.isActive?.()) return false;
        if (typeof $dataMapInfos === "undefined" || $dataMapInfos[10]?.name !== "ProjectR Card Test Arena") return false;
        if ($gameMap.mapId() !== 10) {
            arenaReturn = { mapId: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y, direction: $gamePlayer.direction() };
            $gamePlayer.reserveTransfer(10, 16, 21, 8, 0);
        } else {
            const back = arenaReturn || { mapId: 1, x: 29, y: 19, direction: 2 };
            $gamePlayer.reserveTransfer(back.mapId, back.x, back.y, back.direction, 0);
            arenaReturn = null;
        }
        return true;
    }
    const codeToSlot = new Map(KEYS.map((key, i) => [`Key${key}`, i]));
    function capturesCardKeys() {
        return runtime.active && battleAreaActive() && onMap() && !$gameMessage.isBusy() &&
            !window.ProjectR?.FullscreenDialogue?.isActive?.();
    }
    function overMapUi(x, y) {
        const scene = SceneManager._scene;
        const buttons = [scene?._menuButton, ...(scene?._buttons || [])];
        return buttons.some(button => button?.visible && button.worldVisible !== false &&
            button.getBounds?.().contains(x, y));
    }
    if (typeof document !== "undefined") {
        let arenaMouseDown = false;
        document.addEventListener("mousedown", event => {
            const energy = SceneManager._scene?._projectRCardEnergyButton;
            if (event.button === 0 && energy?.containsPointer(Graphics.pageToCanvasX(event.pageX), Graphics.pageToCanvasY(event.pageY))) {
                event.preventDefault(); event.stopImmediatePropagation(); arenaMouseDown = true;
                setEnergy(10); $gameTemp.clearDestination?.(); return;
            }
            const button = SceneManager._scene?._projectRCardArenaButton;
            if (event.button === 0 && button?.containsPointer(Graphics.pageToCanvasX(event.pageX), Graphics.pageToCanvasY(event.pageY))) {
                event.preventDefault(); event.stopImmediatePropagation();
                arenaMouseDown = true; arenaQueued = true;
                $gameTemp.clearDestination?.(); return;
            }
            if (!onMap() || (event.button !== 0 && event.button !== 2)) return;
            const pointer = { x: Graphics.pageToCanvasX(event.pageX), y: Graphics.pageToCanvasY(event.pageY) };
            if (overMapUi(pointer.x, pointer.y)) return;
            const pendingMouse = keyQueue.some(index => getCard(runtime.hand[index])?.target === "Mouse");
            if (!runtime.aiming && !pendingMouse && !consumedMouseButtons.has(event.button)) return;
            event.preventDefault(); event.stopImmediatePropagation();
            if (consumedMouseButtons.has(event.button)) return;
            consumedMouseButtons.add(event.button);
            $gameTemp.clearDestination?.();
            if (event.button === 2) { keyQueue.length = 0; cancelAiming("rightClick"); return; }
            trace("Main attack click suppressed");
            // A queued slot is processed by Scene_Map: this press cannot confirm it.
            if (!keyQueue.length && !confirmAiming(pointer).ok) SoundManager.playBuzzer();
        }, true);
        document.addEventListener("mouseup", event => {
            if (consumedMouseButtons.delete(event.button)) {
                event.preventDefault(); event.stopImmediatePropagation(); return;
            }
            if (!arenaMouseDown || event.button !== 0) return;
            arenaMouseDown = false; event.preventDefault(); event.stopImmediatePropagation();
        }, true);
        document.addEventListener("keydown", event => {
            if (event.code === "Escape" && onMap() && (runtime.aiming || consumedEscape)) {
                event.preventDefault(); event.stopImmediatePropagation(); consumedEscape = true;
                cancelAiming("escape"); return;
            }
            if (config.debug && event.code === "F6" && onMap() && !event.repeat &&
                !event.ctrlKey && !event.altKey && !event.metaKey &&
                !["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName) && !event.target?.isContentEditable) {
                // Hendrix registers every physical key, including the passive 'f6'.
                // Only an actual remap to another action is a conflict.
                if (Input.keyMapper[117] && Input.keyMapper[117] !== "f6") { warn("F6に別アクションの割り当てがあるため、CARD TESTボタンを使用してください。"); return; }
                event.preventDefault(); event.stopImmediatePropagation(); arenaQueued = true; return;
            }
            const index = codeToSlot.get(event.code);
            if (index === undefined) return;
            const wasHeld = heldKeys.has(event.code);
            heldKeys.add(event.code);
            const tag = event.target?.tagName;
            if (!capturesCardKeys() || event.ctrlKey || event.metaKey || event.altKey ||
                ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || event.target?.isContentEditable) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!wasHeld && !event.repeat && !playerLocked() && !$gameMap.isEventRunning() && !runtime.action) keyQueue.push(index);
        }, true);
        document.addEventListener("keyup", event => {
            heldKeys.delete(event.code);
            if (event.code === "Escape" && consumedEscape) {
                consumedEscape = false; event.preventDefault(); event.stopImmediatePropagation();
            }
        }, true);
        window.addEventListener("blur", () => {
            heldKeys.clear(); keyQueue.length = 0; arenaQueued = arenaMouseDown = false;
            consumedMouseButtons.clear(); consumedEscape = false; cancelAiming("blur");
        });
    }
    const guardedSlots = new WeakSet();
    function installHotbarSlotGuards() {
        // No assignment/save data/HotbarInputStatus mutation, therefore no lossy snapshot.
        const slots = SceneManager._scene?._skillUI?._slots;
        if (!slots?.forEach) return;
        slots.forEach(slot => {
            if (!slot || guardedSlots.has(slot) || typeof slot.useSlotContents !== "function") return;
            const original = slot.useSlotContents;
            slot.useSlotContents = function() {
                if (!runtime.active) return original.apply(this, arguments);
            };
            guardedSlots.add(slot);
        });
    }
    const slotInputs = Scene_Map.prototype.updateSlotInputs;
    if (slotInputs) Scene_Map.prototype.updateSlotInputs = function() {
        if (runtime.active) { installHotbarSlotGuards(); return; }
        return slotInputs.apply(this, arguments);
    };
    const callCommand = PluginManager.callCommand;
    PluginManager.callCommand = function(self, plugin, command, args) {
        const sword = mainAttacks.get(self);
        const arenaSwing = arenaFacingAllowed() && plugin === "Hendrix_Action_Engine" && command === "SwingWeapon" &&
            args.eventId === "player" && validMainToken(sword) && sword.attackKind === "sword";
        let swingLock = null, swingParent = null, previousSprites = null;
        if (arenaSwing) {
            restoreArenaFacing("newSwing");
            swingLock = { mode: "sword", player: $gamePlayer, direction: $gamePlayer.direction(),
                priorFix: swordPriorFix.get(sword) ?? $gamePlayer.isDirectionFixed(),
                expires: frame() + (parseInt(args.speed) || 20) + 1, sprite: null };
            arenaFacingLock = swingLock;
            $gamePlayer.setDirectionFix(true);
            swingParent = SceneManager._scene?._spriteset?._tilemap || SceneManager._scene?._spriteset;
            previousSprites = new Set(swingParent?.children || []);
            trace("Sword swing facing frozen", { direction: swingLock.direction, priorFix: swingLock.priorFix,
                movement: Input.dir8 || Input.dir4 || 0 });
        }
        if (config.debug && plugin === "Hendrix_Action_Engine" && command === "SwingWeapon" &&
            validMainToken(sword) && sword.attackKind === "sword") {
            swordSwings.set(sword, frame() + (parseInt(args.speed) || 20));
        }
        if (plugin === "Hendrix_Action_Engine" && command === "spawnEventHitbox" &&
            validMainToken(sword) && sword.attackKind === "sword" && !contextFor(self) && args.notetag?.includes("<playerAttack>")) {
            args = { ...args, notetag: args.notetag.replace(/<hitbox:\s*([\d.]+),\s*([\d.]+)>/, (_, w, h) =>
                `<hitbox: ${Number(w) * SWORD_HITBOX_SCALE}, ${Number(h) * SWORD_HITBOX_SCALE}>`) + `<ProjectRSword:${sword.id}>`,
                position: args.position.replace(/1\.1\b/g, "1.25") };
        }
        if (runtime.active && plugin === "Hendrix_Hotbar_Creator" &&
            ["UseSlot", "UseSelectedSlot"].includes(command)) return;
        const isDamage = runtime.active && plugin === "Hendrix_Action_Engine" && command === "UpdateEventHp";
        const target = isDamage ? $gameMap.event(args.eventId === "this" ? self._eventId : Number(args.eventId)) : null;
        const pending = isDamage && !contextFor(self) ? pendingHits.get(self) : null;
        const before = pending?.target === target && isLivingEnemy(target) ? damageHp(target) : null;
        if (isDamage) trace("Before UpdateEventHp", { target: target?.eventId(), hp: target ? damageHp(target) : null,
            storedHp: target ? $gameMap.getCurrentEventHp(target.eventId()) : null, token: pending?.token?.id || null });
        if (isDamage) pendingHits.delete(self);
        executionStack.push(self);
        try {
            const value = callCommand.call(this, self, plugin, command, args);
            if (swingLock) swingLock.sprite = swingParent?.children?.find(sprite => !previousSprites.has(sprite) &&
                sprite._source === $gamePlayer && Number.isFinite(sprite._duration)) || null;
            if (isDamage) trace("After UpdateEventHp", { target: target?.eventId(), hp: target ? damageHp(target) : null,
                storedHp: target ? $gameMap.getCurrentEventHp(target.eventId()) : null, token: pending?.token?.id || null });
            if (before !== null && $gameMap.event(target.eventId()) === target && validMainToken(pending.token)) {
                const after = damageHp(target), energyBefore = runtime.energy;
                trace("HP", { target: target.eventId(), token: pending.token.id, before, after, damage: before - after });
                const accepted = Number.isFinite(after) && after < before && notifyMainAttackHit(pending.token);
                recordDebug({ source: pending.token.attackKind, targetEventId: target.eventId(),
                    targetAttribute: readEnemyMetadata(target).attribute, baseDamage: before - after, finalDamage: before - after,
                    energyBefore, energyAfter: runtime.energy, mainAttackToken: pending.token.id, hpBefore: before, hpAfter: after,
                    projectileId: pending.projectileId || null,
                    result: after >= before ? "no damage" : accepted ? "accepted" : "duplicate" });
            }
            return value;
        } catch (error) {
            if (swingLock && arenaFacingLock === swingLock) restoreArenaFacing("swingError");
            throw error;
        } finally { executionStack.pop(); }
    };

    // Persistent inventory/deck only. Saving an executing CE would lose its WeakMap
    // context; block standard save APIs instead of producing an unrecoverable save.
    const databaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        const ready = databaseLoaded.apply(this, arguments);
        if (ready && metadataSource !== $dataSkills) rebuildMetadataCache();
        return ready;
    };
    const initializeSystem = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        initializeSystem.apply(this, arguments);
        this._projectRCardSkillDeck = { version: 1, ownedCards: {}, deck: [] };
        migrated.add(this);
    };
    const saveEnabled = Game_System.prototype.isSaveEnabled;
    Game_System.prototype.isSaveEnabled = function() { return !runtime.active && saveEnabled.apply(this, arguments); };
    const saveGame = DataManager.saveGame;
    DataManager.saveGame = function() {
        if (runtime.active) return Promise.reject(new Error("カード戦闘終了後にセーブしてください。"));
        return saveGame.apply(this, arguments);
    };
    const autosave = Scene_Map.prototype.shouldAutosave;
    Scene_Map.prototype.shouldAutosave = function() { return !runtime.active && autosave.apply(this, arguments); };
    const extractSave = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() {
        endCombat();
        arenaReturn = null;
        battleWasActive = autoStartBlocked = false;
        battleAttemptRevision = -1;
        const value = extractSave.apply(this, arguments);
        state();
        return value;
    };
    const setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        endCombat();
        arenaReturn = null;
        battleWasActive = autoStartBlocked = false;
        battleAttemptRevision = -1;
        const value = setupNewGame.apply(this, arguments);
        if (config.debug && config.autoDeck && !getDeck().length) debugSetupTestDeck();
        return value;
    };
    const mapSetup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() {
        clearTransientState();
        restoreOriginalSlots();
        enemyCache = new WeakMap();
        const value = mapSetup.apply(this, arguments);
        runtime.session = ++sessionSerial;
        runtime.mapId = this.mapId();
        debugResult = debugCard = debugMain = null;
        revision++;
        return value;
    };
    const mapStart = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        const value = mapStart?.apply(this, arguments);
        syncBattleFlow();
        syncBattlePresentation(this);
        return value;
    };
    function syncBattleFlow() {
        if (!onMap()) return; // Menu/transfer transitions are not battle exits.
        const active = battleAreaActive();
        if (!active) {
            // CombatPresence already waited EndGraceFrames (24 by default).
            if (runtime.active) endCombat();
            autoStartBlocked = false;
            battleAttemptRevision = -1;
        } else if (config.autoStart && !runtime.active && !autoStartBlocked &&
            (!battleWasActive || battleAttemptRevision !== revision)) {
            if (validateDeck().valid) startCombat();
            battleAttemptRevision = revision;
        }
        battleWasActive = active;
    }
    function syncBattlePresentation(scene) {
        const manager = scene?._projectRBattleHudLayer;
        if (manager?._adapter?.shouldShow) manager.visible = manager._adapter.shouldShow();
        syncOriginalSlots();
        scene?._projectRCardHandHUD?.updatePresentation();
        scene?._projectRCardDebug?.update();
    }
    const mapUpdate = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        if (runtime.aiming && (!battleAreaActive() || $gamePlayer.isTransferring?.())) cancelAiming("battleEnd");
        if (this._projectRCardEnergyButton?.containsPointer() && TouchInput.isTriggered()) {
            TouchInput.update(); $gameTemp.clearDestination?.(); setEnergy(10);
        }
        // Consume the debug button before the map's touch movement / weapon input.
        const button = this._projectRCardArenaButton;
        if (button?.containsPointer() && TouchInput.isTriggered()) {
            TouchInput.update();
            $gameTemp.clearDestination?.();
            if (openTestArena()) SoundManager.playOk(); else SoundManager.playBuzzer();
        }
        mapUpdate.apply(this, arguments);
        updateArenaFacing();
        finishActionIfDone();
        syncBattleFlow();
        syncBattlePresentation(this);
        if (arenaQueued) { arenaQueued = false; if (!openTestArena()) SoundManager.playBuzzer(); }
        const queued = keyQueue.splice(0);
        if (!capturesCardKeys()) return;
        for (const slot of queued) {
            if (!selectSlot(slot).ok) SoundManager.playBuzzer();
        }
    };
    const mapTouch = Scene_Map.prototype.isAnyButtonPressed;
    Scene_Map.prototype.isAnyButtonPressed = function() {
        return !!this._projectRCardEnergyButton?.containsPointer() || !!this._projectRCardArenaButton?.containsPointer() || !!mapTouch?.apply(this, arguments);
    };
    const mapTerminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        restoreArenaFacing("sceneExit");
        cancelAiming("sceneExit");
        clearSwordVisuals();
        restoreOriginalSlots();
        return mapTerminate?.apply(this, arguments);
    };

    const currentHudManager = () => SceneManager._scene?._projectRBattleHudLayer || window.ProjectR?.BattleHUD?._manager;
    function cardHudShown() {
        const manager = currentHudManager();
        return battleAreaActive() && !!manager?.visible && !autoStartBlocked && (runtime.active || !validateDeckCached().valid);
    }
    let validationRevision = -1, validationResult = null;
    function validateDeckCached() {
        if (validationRevision !== revision) { validationRevision = revision; validationResult = validateDeck(); }
        return validationResult;
    }
    function restoreOriginalSlots() {
        const manager = currentHudManager();
        if (manager?._skillHUD && Object.prototype.hasOwnProperty.call(manager, "_cardDeckOriginalSkillVisible")) {
            manager._skillHUD.visible = manager._cardDeckOriginalSkillVisible;
            delete manager._cardDeckOriginalSkillVisible;
        }
    }
    function syncOriginalSlots() {
        const manager = currentHudManager();
        const skill = manager?._skillHUD;
        if (!skill) return;
        if (cardHudShown()) {
            if (!Object.prototype.hasOwnProperty.call(manager, "_cardDeckOriginalSkillVisible")) manager._cardDeckOriginalSkillVisible = skill.visible;
            skill.visible = false;
        } else if (Object.prototype.hasOwnProperty.call(manager, "_cardDeckOriginalSkillVisible")) {
            restoreOriginalSlots();
        }
    }
    class Sprite_CardHandHUD extends Sprite {
        constructor() {
            super();
            this._revision = -1;
            this._cards = KEYS.map((key, index) => {
                const sprite = new Sprite(new Bitmap(172, 140));
                sprite.x = index * 190;
                sprite.y = 48;
                this.addChild(sprite);
                return sprite;
            });
            this._rowWidth = 172 * 5 + 18 * 4;
            this._energy = new Sprite(new Bitmap(this._rowWidth, 44));
            this.addChild(this._energy);
            this._icons = ImageManager.loadSystem("IconSet");
            this._icons.addLoadListener(() => { this._revision = -1; });
            this.visible = false;
        }
        update() {
            super.update();
            this.updatePresentation();
        }
        updatePresentation() {
            syncOriginalSlots();
            this.visible = cardHudShown();
            if (!this.visible) return;
            const manager = currentHudManager(), slots = manager?._skillHUD?._slots;
            // Actual BattleHUD slots: x=494..1254, y=915, width=172, height=140.
            // Bounds fallback is only for a missing/older HUD layout; no new row.
            const left = slots?.[0]?.x ?? 494, top = slots?.[0]?.y ?? 915;
            const step = slots?.length > 1 ? slots[1].x - slots[0].x : 190;
            const width = 172, height = 140, rowWidth = step * 4 + width;
            const sx = manager?.scale?.x || Graphics.width / 1920, sy = manager?.scale?.y || Graphics.height / 1080;
            this.scale.set(sx, sy);
            this.x = (manager?.x || 0) + left * sx;
            this.y = (manager?.y || 0) + (top - 48) * sy;
            this._cards.forEach((sprite, i) => {
                sprite.x = (slots?.[i]?.x ?? left + step * i) - left;
                sprite.scale.set(width / sprite.bitmap.width, height / sprite.bitmap.height);
            });
            this._energy.scale.set(rowWidth / this._rowWidth, 1);
            if (this._revision !== revision) {
                this._revision = revision;
                this.redraw();
            }
        }
        redraw() {
            this._cards.forEach((sprite, i) => {
                this.drawCard(sprite.bitmap, getCard(runtime.hand[i]), KEYS[i]);
                if (runtime.aiming?.slotIndex === i) {
                    const b = sprite.bitmap;
                    b.fillRect(0, 0, b.width, 4, "#b5f5ff");
                    b.fillRect(0, b.height - 4, b.width, 4, "#b5f5ff");
                    b.fillRect(0, 0, 4, b.height, "#b5f5ff");
                    b.fillRect(b.width - 4, 0, 4, b.height, "#b5f5ff");
                    b.fontSize = 16; b.textColor = "#b5f5ff";
                    b.drawText("AIM", 118, 3, 46, 22, "right");
                }
            });
            const b = this._energy.bitmap;
            b.clear();
            b.fontSize = 20;
            b.textColor = "#f6db82";
            const label = runtime.active ? `ENERGY  ${runtime.energy} / 10` :
                validateDeck().valid ? "CARD COMBAT WAITING" : `DECK INCOMPLETE  ${getDeck().length} / 30`;
            b.drawText(label, 0, 0, this._rowWidth, 26, "center");
            const width = Math.min(320, this._rowWidth);
            const x = (this._rowWidth - width) / 2;
            b.fillRect(x, 31, width, 7, "#1a2432");
            b.fillRect(x, 31, width * runtime.energy / 10, 7, "#f6cb52");
        }
        drawCard(b, card, key) {
            b.clear();
            // Draw a compact card natively; do not vertically squash the old
            // 210px portrait (and its lettering) into the 140px Skill HUD area.
            const w = b.width, h = b.height;
            const color = config.colors[card?.rarity || 1];
            b.fillRect(0, 0, w, h, color);
            b.fillRect(3, 5, w - 6, h - 8, "#142132");
            b.fontFace = $gameSystem.mainFontFace();
            b.fontSize = 17;
            b.textColor = "#f1f4f9";
            if (card) {
                b.drawText(attributeLabel(card.attribute), 9, 4, w - 53, 24, "left");
                b.textColor = runtime.energy >= card.cost ? "#f6db82" : "#e97676";
                b.drawText(String(card.cost), w - 40, 4, 30, 24, "center");
                b.textColor = color;
                b.drawText("★".repeat(card.rarity), 9, 27, w - 18, 22, "left");
                const skill = $dataSkills[card.skillId];
                const size = 32;
                const pw = ImageManager.iconWidth, ph = ImageManager.iconHeight;
                if (this._icons.isReady() && skill) {
                    b.blt(this._icons, (skill.iconIndex % 16) * pw, Math.floor(skill.iconIndex / 16) * ph,
                        pw, ph, (w - size) / 2, 48, size, size);
                }
                b.textColor = "#f1f4f9";
                b.fontSize = 18;
                b.drawText(skill?.name || `Skill ${card.skillId}`, 8, 81, w - 16, 24, "center");
                b.fontSize = 16;
                b.drawText(typeLabel(card.type), 9, 110, w - 54, 24, "left");
            } else b.drawText("EMPTY", 8, 53, w - 16, 30, "center");
            if (card && runtime.energy < card.cost) b.fillRect(0, 0, w, h, "rgba(0,0,0,0.55)");
            b.fontSize = 20;
            b.textColor = "#ffffff";
            b.drawText(key, w - 38, 108, 30, 26, "center");
        }
        destroy(options) {
            for (const sprite of [...this._cards, this._energy]) sprite.bitmap.destroy();
            super.destroy(options);
        }
    }
    class Sprite_CardDebug extends Sprite {
        constructor() {
            super(new Bitmap(440, 690));
            this.x = 12; this.y = 12; this._revision = -1;
        }
        update() {
            super.update();
            this.visible = battleAreaActive();
            if (!this.visible) return;
            const s = snapshot();
            if (!s || s.revision === this._revision) return;
            this._revision = s.revision;
            const b = this.bitmap, card = s.card, main = s.main;
            b.clear(); b.fillRect(0, 0, 440, 690, "rgba(8,14,25,0.85)");
            b.fontSize = 18; b.textColor = "#ecf4ff";
            const lines = ["CARD DEBUG",
                `Combat: ${s.active ? "ACTIVE" : "INACTIVE"}${s.autoEnergy ? "   AUTO ENERGY" : ""}`,
                `Energy ${s.energy}/10  Hand ${s.hand}  Draw ${s.draw}  Discard ${s.discard}`,
                "Last Card:", card?.skillName || "-",
                card ? `${card.cardAttribute} / ${card.cardType} / Cost ${card.cost}` : "-",
                `Target: Event ${card?.targetEventId || "-"} / ${card?.targetAttribute || "-"}`,
                `Attribute: x${card?.attributeMultiplier?.toFixed(3) || "-"}`,
                `Resistance: x${card?.resistanceMultiplier?.toFixed(3) || "-"}`,
                `Final: x${card?.finalMultiplier?.toFixed(3) || "-"}`,
                `Damage: ${card?.finalDamage ?? "-"} (base ${card?.baseDamage ?? "-"}) ${card?.result || ""}`,
                "Main Attack:", main?.source || "-", `Token: ${main?.mainAttackToken || "-"}`,
                main ? `Energy ${main.energyBefore} -> ${main.energyAfter} (${main.result})` : "Energy Recovery: -"];
            lines.push(`Projectile ${main?.projectileId ?? "-"} / Target ${main?.targetEventId ?? "-"}`,
                `HP ${main?.hpBefore ?? "-"} -> ${main?.hpAfter ?? "-"} / Damage ${main?.finalDamage ?? "-"}`,
                s.sword ? `Sword dir ${s.sword.direction}: ${s.sword.x},${s.sword.y} ${s.sword.width}x${s.sword.height}` : "Sword hitbox: -",
                `Detected: ${s.sword?.detected.join(", ") || "-"}`);
            for (const p of s.piles) lines.push(`${p.stage}: H${p.hand} D${p.draw} X${p.discard}`);
            lines.push(s.lastReason || "");
            lines.forEach((line, n) => b.drawText(line, 10, 7 + n * 28, 420, 28));
        }
        destroy(options) { this.bitmap.destroy(); super.destroy(options); }
    }
    class Sprite_CardAimDebug extends Sprite {
        constructor() { super(new Bitmap(420, 280)); this.x = 462; this.y = 190; this._revision = -1; }
        update() {
            super.update(); this.visible = battleAreaActive();
            if (!this.visible || this._revision === revision) return;
            this._revision = revision;
            const a = aimDebug, v = vfxDebug, b = this.bitmap;
            b.clear(); b.fillRect(0, 0, 420, 280, "rgba(8,14,25,0.85)"); b.fontSize = 18; b.textColor = "#ecf4ff";
            const deg = x => Number.isFinite(x) ? x.toFixed(1) + "°" : "-";
            const lines = [a ? $dataSkills[a.skillId]?.name : "MOUSE / VFX DEBUG",
                `Aim Source: ${a?.source || "-"}`, `Mouse: ${a?.mouseX ?? "-"}, ${a?.mouseY ?? "-"}`,
                `Aim: ${deg(a?.angle)}  Projectile: ${deg(a?.projectile)}`,
                `VFX: ${deg(a?.vfx)}  Difference: ${deg(a?.difference)}`, `VFX: ${v?.name || "-"}`,
                `Launch: ${v?.launch || "-"}`, `Trail: ${v?.trail || "-"}`, `Impact: ${v?.impact || "-"}`, `Cleanup: ${v?.cleanup || "-"}`];
            lines.forEach((line, i) => b.drawText(line, 8, 6 + i * 26, 404, 26));
        }
        destroy(options) { this.bitmap.destroy(); super.destroy(options); }
    }
    class Sprite_PlanetLabel extends Sprite {
        constructor(event) {
            super(new Bitmap(180, 66));
            this._event = event;
            const meta = readEnemyMetadata(event), b = this.bitmap;
            b.fontSize = 17; b.textColor = "#ffffff"; b.outlineColor = "#101522"; b.outlineWidth = 4;
            [`[${meta.attribute?.toUpperCase()}]`, `P x${meta.physical.toFixed(2)}  M x${meta.magic.toFixed(2)}`]
                .forEach((line, i) => b.drawText(line, 0, i * 25, 180, 25, "center"));
        }
        update() {
            super.update();
            const e = this._event;
            this.visible = battleAreaActive() && !e._erased && $gameMap.event(e.eventId()) === e;
            this.x = e.screenX() - 90; this.y = e.screenY() - 112;
        }
        destroy(options) { this.bitmap.destroy(); super.destroy(options); }
    }
    class Sprite_CardArenaButton extends Sprite {
        constructor() {
            super(new Bitmap(180, 44));
            this._label = "";
            this.update();
        }
        containsPointer(x = TouchInput.x, y = TouchInput.y) {
            return config.debug && onMap() && this.visible && x >= this.x && x < this.x + 180 &&
                y >= this.y && y < this.y + 44;
        }
        update() {
            super.update();
            this.visible = config.debug && onMap() && !$gameMessage.isBusy() &&
                !window.ProjectR?.FullscreenDialogue?.isActive?.();
            this.x = Graphics.width - 260; this.y = 12; // Leave the MZ menu button unobstructed.
            const label = isDebugArena() ? "RETURN" : "CARD TEST";
            if (label === this._label) return;
            this._label = label;
            this.bitmap.clear(); this.bitmap.fillRect(0, 0, 180, 44, "#142132");
            this.bitmap.fontSize = 22; this.bitmap.textColor = "#f6db82";
            this.bitmap.drawText(label, 0, 0, 180, 44, "center");
        }
        destroy(options) { this.bitmap.destroy(); super.destroy(options); }
    }
    class Sprite_CardEnergyButton extends Sprite_CardArenaButton {
        update() {
            Sprite.prototype.update.call(this);
            this.x = Graphics.width - 260; this.y = 64;
            this.visible = config.debug && onMap() && runtime.active && battleAreaActive() && !$gameMessage.isBusy() &&
                !window.ProjectR?.FullscreenDialogue?.isActive?.();
            if (this._energyLabel) return;
            this._energyLabel = true;
            this.bitmap.clear(); this.bitmap.fillRect(0, 0, 180, 44, "#142132");
            this.bitmap.fontSize = 22; this.bitmap.textColor = "#f6db82";
            this.bitmap.drawText("ENERGY MAX", 0, 0, 180, 44, "center");
        }
    }
    class Sprite_CardAimPreview extends Sprite {
        constructor() {
            super();
            this._guide = typeof PIXI !== "undefined" ? new PIXI.Graphics() : null;
            if (this._guide) this.addChild(this._guide);
            this._label = new Sprite(new Bitmap(430, 100)); this.addChild(this._label);
            this._text = "";
        }
        update() {
            super.update();
            this.visible = onMap() && battleAreaActive() && (!!runtime.aiming || frame() < aimingNoticeUntil);
            this._guide?.clear();
            if (!this.visible) return;
            const a = captureMouseAim(true), angle = a.angle * Math.PI / 180;
            this.x = a.screenX; this.y = a.screenY;
            if (runtime.aiming && this._guide) {
                this._guide.lineStyle(2, 0xb5f5ff, 0.6);
                this._guide.moveTo(0, 0); this._guide.lineTo(Math.sin(angle) * 140, -Math.cos(angle) * 140);
            }
            const text = frame() < aimingNoticeUntil ? "NOT ENOUGH ENERGY" : runtime.aiming ?
                "AIMING | LEFT CLICK : CAST\nRIGHT CLICK / ESC : CANCEL" : "";
            const debug = config.debug && runtime.aiming ?
                `\nSlot ${runtime.aiming.slotIndex + 1} / ${$dataSkills[runtime.aiming.skillId]?.name} / ${a.angle.toFixed(1)}°\nFrame ${runtime.aiming.selectedAtFrame} / Mouse ${Math.round(a.mouseX)},${Math.round(a.mouseY)} / ${aimingStatus}` : "";
            if (this._text !== text + debug) {
                this._text = text + debug;
                const b = this._label.bitmap; b.clear(); b.fontSize = 16; b.textColor = "#d4f8ff";
                this._text.split("\n").forEach((line, i) => b.drawText(line, 0, i * 23, 430, 23, "center"));
            }
            this._label.x = -215; this._label.y = 30;
        }
        destroy(options) { this._label.bitmap.destroy(); super.destroy(options); }
    }
    const createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        createDisplayObjects.apply(this, arguments);
        this._projectRCardHandHUD = new Sprite_CardHandHUD();
        const manager = this._projectRBattleHudLayer;
        const index = manager ? this.children.indexOf(manager) : -1;
        if (index >= 0) this.addChildAt(this._projectRCardHandHUD, index + 1);
        else this.addChild(this._projectRCardHandHUD);
        this._projectRCardAimPreview = new Sprite_CardAimPreview();
        this.addChild(this._projectRCardAimPreview);
        if (runtime.active) installHotbarSlotGuards();
        syncOriginalSlots();
        if (config.debug) {
            this._projectRCardArenaButton = new Sprite_CardArenaButton();
            this.addChild(this._projectRCardArenaButton);
            this._projectRCardEnergyButton = new Sprite_CardEnergyButton();
            this.addChild(this._projectRCardEnergyButton);
        }
        if (config.debug && config.overlay) {
            this._projectRCardDebug = new Sprite_CardDebug();
            this.addChild(this._projectRCardDebug);
            this.addChild(new Sprite_CardAimDebug());
            for (const event of $gameMap.events()) if (tags(event.event()?.note).planetdummy) this.addChild(new Sprite_PlanetLabel(event));
        }
    };

    class Window_CardDeckActions extends Window_HorzCommand {
        maxCols() { return 3; }
        makeCommandList() {
            this.addCommand("所持から追加", "owned");
            this.addCommand("デッキから外す", "deck");
            this.addCommand("戻る", "back");
        }
    }
    class Window_CardDeckList extends Window_Selectable {
        constructor(rect, mode, scene) {
            super(rect);
            this._mode = mode;
            this._deckScene = scene;
            this._rows = [];
            this.refreshList();
        }
        maxItems() { return Array.isArray(this._rows) ? this._rows.length : 0; }
        itemHeight() { return 100; }
        // MZ row() returns a cursor row number and is called during super(rect),
        // before _rows exists. Keep that inherited method separate from entries.
        entryAt(index) {
            if (!Array.isArray(this._rows) || !Number.isInteger(index) || index < 0 || index >= this._rows.length) return null;
            return this._rows[index] ?? null;
        }
        currentEntry() { return this.entryAt(this.index()); }
        select(index) {
            // Also keep direct wrapped cursor calls from selecting NaN at 0 items.
            super.select(this.maxItems() ? index : -1);
        }
        refreshList() {
            const deck = getDeck();
            const counts = new Map();
            deck.forEach((id, index) => {
                if (!counts.has(id)) counts.set(id, { id, deckIndex: index, count: 0 });
                counts.get(id).count++;
            });
            this._rows = this._mode === "owned" ? Object.keys(state()?.ownedCards || {})
                .map(Number).filter(id => ownedCount(id) > 0).sort((a, b) => a - b)
                .map(id => ({ id, count: counts.get(id)?.count || 0 })) : [...counts.values()];
            this.select(this.maxItems() ? Math.max(0, Math.min(this.index(), this.maxItems() - 1)) : -1);
            this.scrollTo(this.scrollX(), this.scrollY());
            this.ensureCursorVisible(false);
            this.refresh();
        }
        drawAllItems() {
            super.drawAllItems();
            if (!this.maxItems() && this.contents) {
                this.resetTextColor();
                this.contents.fontSize = 20;
                this.drawText(this._mode === "owned" ? "所持カードはありません" : "デッキは空です", 0, 12, this.innerWidth, "center");
            }
        }
        drawItem(index) {
            const row = this.entryAt(index);
            if (!row) return;
            const rect = this.itemRectWithPadding(index);
            const card = getCard(row.id), skill = $dataSkills[row.id];
            this.resetTextColor();
            this.contents.fontSize = 20;
            if (skill) this.drawIcon(skill.iconIndex, rect.x, rect.y + 2);
            this.drawText(skill?.name || `無効なSkill ${row.id}`, rect.x + 38, rect.y, rect.width - 38);
            this.contents.fontSize = 17;
            if (card) {
                this.changeTextColor(config.colors[card.rarity]);
                this.drawText(`${attributeLabel(card.attribute)}  ${"★".repeat(card.rarity)}  COST ${card.cost}  ${typeLabel(card.type)}`,
                    rect.x, rect.y + 31, rect.width);
            }
            this.resetTextColor();
            this.drawText(`所持 ${ownedCount(row.id)}枚 / デッキ ${row.count}枚${card?.valid ? "" : "  設定要確認"}`,
                rect.x, rect.y + 61, rect.width);
        }
        isCurrentItemEnabled() { return !!this.currentEntry(); }
        processOk() {
            if (!this.isCurrentItemEnabled()) { this.playBuzzerSound(); return; }
            // The scene plays exactly one success/buzzer sound after validation.
            this.updateInputData();
            this.deactivate();
            this.callOkHandler();
        }
        processTouch() {
            if (!this.active && this.isOpen() && TouchInput.isTriggered() && this.isTouchedInsideFrame()) {
                this._deckScene.focusList(this._mode);
            }
            super.processTouch();
        }
    }
    class Scene_ProjectRCardDeckBuilder extends Scene_MenuBase {
        create() {
            super.create();
            const w = Graphics.boxWidth, h = Graphics.boxHeight;
            const half = Math.floor((w - 12) / 2);
            this._summaryWindow = new Window_Base(new Rectangle(0, 0, w, 116));
            this.addWindow(this._summaryWindow);
            this._ownedWindow = new Window_CardDeckList(new Rectangle(0, 120, half, Math.max(120, h - 192)), "owned", this);
            this._deckWindow = new Window_CardDeckList(new Rectangle(half + 12, 120, w - half - 12, Math.max(120, h - 192)), "deck", this);
            this.addWindow(this._ownedWindow);
            this.addWindow(this._deckWindow);
            this._actionsWindow = new Window_CardDeckActions(new Rectangle(0, h - 68, w, 68));
            this.addWindow(this._actionsWindow);
            this._ownedWindow.setHandler("ok", () => this.edit("owned"));
            this._deckWindow.setHandler("ok", () => this.edit("deck"));
            this._ownedWindow.setHandler("cancel", () => this.focusActions());
            this._deckWindow.setHandler("cancel", () => this.focusActions());
            this._actionsWindow.setHandler("owned", () => this.focusList("owned"));
            this._actionsWindow.setHandler("deck", () => this.focusList("deck"));
            this._actionsWindow.setHandler("back", () => this.popScene());
            this._actionsWindow.setHandler("cancel", () => this.popScene());
            this.focusActions();
            this.refreshSummary();
        }
        focusActions() {
            this._ownedWindow.deactivate();
            this._deckWindow.deactivate();
            this._actionsWindow.activate();
        }
        focusList(mode) {
            this._actionsWindow.deactivate();
            this._ownedWindow.deactivate();
            this._deckWindow.deactivate();
            (mode === "owned" ? this._ownedWindow : this._deckWindow).activate();
        }
        edit(mode) {
            const row = (mode === "owned" ? this._ownedWindow : this._deckWindow).currentEntry();
            const r = mode === "owned" ? addDeckCard(row?.id) : removeDeckAt(row?.deckIndex);
            if (r.ok) SoundManager.playOk();
            else SoundManager.playBuzzer();
            this._ownedWindow.refreshList();
            this._deckWindow.refreshList();
            this.refreshSummary(r.reason || (mode === "owned" ? "1枚追加しました。" : "1枚外しました。所持枚数は変わりません。"));
            this.focusList(mode);
        }
        refreshSummary(message = "") {
            const window = this._summaryWindow, valid = validateDeck();
            window.contents.clear();
            window.contents.fontSize = 23;
            window.changeTextColor(valid.valid ? "#8ad49d" : "#f6cb52");
            window.drawText(`DECK ${valid.count} / 30  ${valid.valid ? "READY" : "DECK INCOMPLETE"}`, 0, 0, window.innerWidth);
            window.resetTextColor();
            window.contents.fontSize = 18;
            const error = valid.errors.find(text => !text.startsWith("DECK INCOMPLETE"));
            window.drawText(message || (runtime.active ? "戦闘中は閲覧のみ。終了後に編集・保存してください。" : error || "下のボタンで操作を選択。決定:F、戻る:X、一覧はクリックでも切替。"), 0, 31, window.innerWidth);
            window.drawText("左：所持カード（決定で追加）　　　　　　右：デッキ（決定で1枚外す）", 0, 60, window.innerWidth);
        }
    }
    const menuScene = window.ProjectR?.MenuHUD?.Scene;
    if (menuScene?.prototype.confirm) {
        const confirm = menuScene.prototype.confirm;
        menuScene.prototype.confirm = function() {
            const command = window.ProjectR.MenuHUD.layout.commands[this._index]?.symbol;
            if (command !== "skill") return confirm.apply(this, arguments);
            if (!this.isActive() || SceneManager.isSceneChanging()) return;
            this.selectedCommand = "skill";
            this.consumeInput();
            SoundManager.playOk();
            SceneManager.push(Scene_ProjectRCardDeckBuilder);
        };
    } else warn("MenuHUD Scene.confirmがありません。OpenDeckBuilderコマンドを使用してください。");

    function commandResult(value) {
        if (!value.ok) { warn(value.reason); SoundManager.playBuzzer(); }
        return value;
    }
    const command = (name, fn) => PluginManager.registerCommand(NAME, name, fn);
    command("StartCardCombat", () => commandResult(startCombat()));
    command("EndCardCombat", endCombat);
    command("OpenDeckBuilder", () => {
        if (!SceneManager.isSceneChanging()) SceneManager.push(Scene_ProjectRCardDeckBuilder);
    });
    command("GainCard", args => commandResult(gainCard(args.skillId, args.amount)));
    command("LoseCard", args => commandResult(loseCard(args.skillId, args.amount)));
    command("SetEnergy", args => setEnergy(args.value));
    command("AddEnergy", args => addEnergy(args.value));
    command("UseCardSlot", function(args) { return commandResult(useSlot(integer(args.slot) - 1, this)); });
    command("GetEnergy", args => { if (positiveId(args.variableId)) $gameVariables.setValue(Number(args.variableId), runtime.energy); });
    command("GetDeckCount", args => { if (positiveId(args.variableId)) $gameVariables.setValue(Number(args.variableId), getDeck().length); });
    command("ValidateDeck", args => { if (positiveId(args.switchId)) $gameSwitches.setValue(Number(args.switchId), validateDeck().valid); });
    command("DebugGrantCards", () => {
        if (!config.debug) return;
        for (const card of metadata.values()) if (card.valid) gainCard(card.skillId, Math.max(0, rarityLimit(card) - ownedCount(card.skillId)));
    });
    command("DebugBuildDeck", () => {
        if (!config.debug || runtime.active || !state()) return;
        const candidate = [];
        for (const card of metadata.values()) {
            if (!card.valid) continue;
            for (let i = 0; i < Math.min(ownedCount(card.skillId), rarityLimit(card)) && candidate.length < 30; i++) candidate.push(card.skillId);
        }
        if (candidate.length !== 30) { commandResult(result(false, "有効な所持カードが30枚に足りません。デッキは変更しません。")); return; }
        state().deck = candidate;
        revision++;
    });
    command("DebugDumpPiles", () => {
        if (config.debug) console.log(NAME, { hand: runtime.hand.slice(), draw: runtime.draw.slice(), discard: runtime.discard.slice(), energy: runtime.energy });
    });
    command("DebugSetupTestDeck", () => commandResult(debugSetupTestDeck()));
    command("BeginMainAttack", function(args) { return beginMainAttack(this, args.kind); });
    command("ResolveSwordHitbox", function() { return resolveSwordHitbox(this); });
    Object.assign(API, {
        version: "0.3.5", keys: KEYS, planets: PLANETS, metadata: getCard, rebuildMetadataCache,
        isAiming: () => !!runtime.aiming, aimingSlot: () => runtime.aiming?.slotIndex ?? -1,
        selectSlot, cancelAiming,
        isCombatActive: () => runtime.active, startCombat, endCombat,
        energy: () => runtime.energy, maxEnergy: () => 10, setEnergy, addEnergy,
        getDeck, validateDeck, ownedCount, gainCard, loseCard, addDeckCard, removeDeckAt,
        hand: () => runtime.hand.slice(), drawPileCount: () => runtime.draw.length,
        discardPileCount: () => runtime.discard.length, useSlot,
        attributeMultiplier, resistanceMultiplier, cardDamageMultiplier,
        currentContext, contextByActionId: id => runtime.contexts.get(id) || null, bindActionContext,
        notifyMainAttackHit,
        createMainAttackToken, beginMainAttack, debugSetupTestDeck, testCards: TEST_CARDS, executeTestCard,
        projectileContext, destroyCardProjectile: event => eventActions.get(event)?.kind === "card" && releaseEventAction(event, true),
        testVfxRegistry, playTestVfx,
        registerVfx, lastResult: () => ({ ...lastResult }),
        lastDebugResult: () => debugResult, debugSnapshot: snapshot, debugTrace: () => traces.slice(),
        debugPiles: () => config.debug ? { hand: runtime.hand.slice(), draw: runtime.draw.slice(), discard: runtime.discard.slice() } : null,
        openTestArena, isBattleAreaActive: battleAreaActive,
        Scene: Scene_ProjectRCardDeckBuilder, CardHUD: Sprite_CardHandHUD
    });
})();
