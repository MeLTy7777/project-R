/*:
 * @target MZ
 * @plugindesc v1.1.0 DEV専用 Combat Test Arena（Playtest限定）。実戦闘系を手動で通すための補助。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_GodSummonManager
 * @base ProjectR_UltimateGauge
 * @base ProjectR_UltimateGodDamageBridge
 * @base Hendrix_Action_Engine
 * @base ProjectR_CombatPresence
 * @orderAfter ProjectR_ApolloUltimate
 *
 * @command startHermes
 * @text Hermesテスト開始
 * @desc 7枚の実カードと、常駐Ultimate神=Hermesでカード戦闘を開始します。
 *
 * @command startApollo
 * @text Apolloテスト開始
 * @desc 7枚の実カードと、常駐Ultimate神=Apolloでカード戦闘を開始します。
 *
 * @command resetTest
 * @text 現在のテストをリセット
 * @desc マップを読み直して敵ダミーを復活させ、直前のシナリオを再開始します。
 *
 * @command endTest
 * @text カード戦闘を終了
 * @desc カード戦闘を終了し、アリーナが変更した所持データを元に戻します。
 *
 * @command showInstructions
 * @text 操作説明を表示
 *
 * @command exitArena
 * @text アリーナから出る
 * @desc カード戦闘を終了し、入る前のマップ（無ければ初期位置）へ戻ります。
 *
 * @command gaugeAdd25
 * @text Gauge +25
 *
 * @command gaugeFill
 * @text Gaugeを満タンにする
 *
 * @command divineAreaHit
 * @text Divine範囲攻撃 -25
 * @desc 既存のDamage Bridgeの範囲APIで、常駐神の位置を中心に25ダメージ（仮）。
 *
 * @command divineGlobalHit
 * @text Divine全体攻撃 -25
 * @desc 既存のDamage Bridgeの全体APIで25ダメージ（仮）。
 *
 * @command collapseGod
 * @text 神を崩壊させる
 * @desc 現在のDivine HPと同じダメージをBridge経由で与えて崩壊させます。
 *
 * @command applySleep
 * @text 主人公へ睡眠(State 32)付与
 * @desc Lyre Calmの確認用。Hendrixの公式AddStateを使います。
 *
 * @command moveToMultiTarget
 * @text Reed Fluteスポットへ移動
 * @desc 3体の敵ダミーが全て4タイル以内に入る位置へ、同じマップ内で移動します（葦笛の確認用）。
 *
 * @command showStatus
 * @text 現在の状態を表示
 *
 * @help
 * ProjectR_CombatTestArena.js
 *
 * RPGツクールMZのPlaytest（テストプレイ）専用です。配布版では何もしません
 * （グローバルAPI・プラグインコマンド・フックのいずれも作りません）。
 *
 * このプラグインは戦闘ロジックを持ちません。既存のProjectR APIだけを呼びます。
 *   - カード戦闘: ProjectRCardDeck
 *   - 常駐神/Divine HP: ProjectRGodSummonManager
 *   - Gauge: ProjectRUltimateGauge
 *   - Divineダメージ: ProjectRUltimateGodDamageBridge
 *
 * F8 Consoleから:
 *   ProjectRCombatTestArena.enter()   // アリーナ(DEV_CombatTestArena)へ移動
 *   ProjectRCombatTestArena.exit()    // 入る前の場所へ戻る
 *   ProjectRCombatTestArena.status()  // 詳細状態
 *
 * 通常の操作はマップ上の端末を調べる（決定キー）だけで行えます。
 * 詳細は docs/ProjectR_CombatTestArena.md を参照してください。
 *
 * 戦闘HUDと敵ダミーについて:
 *   enter()は移動するだけで戦闘を始めません。HUDの表示条件は本番と同じ
 *   ProjectRCombatPresence.isCombatEventActive()（明示的な戦闘イベント）だけです。
 *   Hermes/Apolloテストの開始が成功したときだけ beginCombatEvent、End/Reset/Exit
 *   （とカード戦闘が他の経路で終わったとき）に endCombatEvent を呼び、その間だけ
 *   敵ダミー(<enemy>)を表示します。敵が画面内にいるかどうかは使いません。
 *   カード: 左から Q / E / X / C / V。
 *
 * 戦闘用デッキについて:
 *   本番のデッキ検証（30枚・コピー上限）は変更しません。テスト開始の一瞬だけ、
 *   登録済みカード定義のmaxCopiesを差し替えて startCardBattle() を呼び、
 *   直後に必ず元の定義へ戻します（try/finally）。プレイヤーの保存デッキは変更しません。
 *
 * セーブ: 戦闘状態・退出先・スナップショットは保存しません。ただし開始時にアリーナは
 *   「指輪=主人公所持」「7枚のカード所持」「Ultimate指輪」を実データへ設定します。
 *   endTest()/exit()で開始前の値へ戻しますが、テスト中にセーブしないでください。
 *   開発用のNew Gameセーブで使うことを推奨します。
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN_NAME = "ProjectR_CombatTestArena";
    const ENGINE = "Hendrix_Action_Engine";

    // 開発用マップ。本番マップからはリンクしない（tests/ProjectR_CombatTestArena.test.cjs が検証）。
    const ARENA_MAP_ID = 4;
    const TRANSFER_ROOM_MAP_ID = 5;
    const ARENA_SPAWN = Object.freeze({ x: 25, y: 26, direction: 8 });
    const SLEEP_STATE_ID = 32;
    const DIVINE_TEST_DAMAGE = 25;
    const GAUGE_TEST_GAIN = 25;
    const SOURCE = "combat-test-arena";

    // 実カードを7枚とも繰り返し出す決定的な引き順。最初の5枚が初期手札(左から)になる。
    const DRAW_SEQUENCE = Object.freeze([
        "apollo_golden_arrow", "apollo_plague_attack", "hermes_sword_attack",
        "hermes_swift_movement", "hermes_reed_flute_sleep", "apollo_lyre_calm", "hermes_perception_obscure"
    ]);
    const DECK_SIZE = 30;

    // ---- Playtest限定ガード。配布版では何も作らずに終了する ----
    const isPlaytest = () => typeof Utils !== "undefined" &&
        typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;

    const refuse = reason => ({ ok: false, reason });
    // 呼出時にも再確認する（多層防御）。
    const guarded = fn => (...args) => isPlaytest() ? fn(...args) : refuse("notPlaytest");

    // 実行時だけの状態。セーブしない。
    const runtime = { systemRef: null, snapshot: null, returnPoint: null, scenario: null, pending: null };
    const clone = value => JSON.parse(JSON.stringify(value));
    const deck = () => root.ProjectRCardDeck || null;
    const manager = () => root.ProjectRGodSummonManager || null;
    const gauge = () => root.ProjectRUltimateGauge || null;
    const bridge = () => root.ProjectRUltimateGodDamageBridge || null;
    const activation = () => root.ProjectRUltimateActivation || null;

    // 別のセーブ/New Gameへ切り替わったら、古いスナップショットを使わない。
    const syncRuntime = () => {
        const system = typeof $gameSystem !== "undefined" ? $gameSystem : null;
        if (runtime.systemRef !== system) {
            runtime.systemRef = system;
            runtime.snapshot = null;
            runtime.scenario = null;
            runtime.pending = null;
        }
        return system;
    };

    const isArenaMap = mapId => mapId === ARENA_MAP_ID || mapId === TRANSFER_ROOM_MAP_ID;
    const currentMapId = () => typeof $gameMap !== "undefined" && $gameMap ? $gameMap.mapId() : 0;

    const transferTo = (mapId, x, y, direction) => {
        if (typeof $gamePlayer === "undefined" || !$gamePlayer) return refuse("playerUnavailable");
        // 同じマップでも読み直して、敵Eventを新品にする。
        if (mapId === currentMapId()) $gamePlayer.requestMapReload?.();
        $gamePlayer.reserveTransfer(mapId, x, y, direction, 0);
        return { ok: true, mapId, x, y, direction };
    };

    // ---- 戦闘デッキ・所持データ ----
    // CardDeckServiceを直接使う。Core公開のクラスで、ring移動の戦闘中ガードは通らないが、
    // 本番APIの検証・上限は一切変えない（テスト用に所持を設定するだけ）。
    const persistentService = () => {
        const d = deck();
        const system = syncRuntime();
        if (!d || !system) return null;
        system._projectRCardDeckData = d.normalizePersistentData(system._projectRCardDeckData, d.definitions);
        return new d.CardDeckService(d.definitions, system._projectRCardDeckData);
    };

    const takeSnapshot = () => {
        if (runtime.snapshot) return;
        const d = deck();
        if (d) {
            runtime.snapshot = clone(d.getPersistentData());
            // H2C-B2: 固定デッキの間だけ所持枚数の検証を外す(終了時に保存領域を元へ戻す)。DEVアリーナ専用。
            root.ProjectRCardInventory?.beginFixture?.();
        }
    };

    const restoreSnapshot = () => {
        const system = syncRuntime();
        const d = deck();
        if (!runtime.snapshot || !system || !d) return false;
        system._projectRCardDeckData = d.normalizePersistentData(runtime.snapshot, d.definitions);
        runtime.snapshot = null;
        root.ProjectRCardInventory?.endFixture?.();
        return true;
    };

    const requiredCardIds = () => [...new Set(DRAW_SEQUENCE)];

    const fixtureDeck = () => {
        const sequence = [];
        for (let index = 0; index < DECK_SIZE; index++) sequence.push(DRAW_SEQUENCE[index % DRAW_SEQUENCE.length]);
        // BattleDeckSessionは山札の末尾から引くので、引き順の逆を渡す。
        return { sequence, cardIds: [...sequence].reverse() };
    };

    // テスト開始の一瞬だけ、実カード定義のmaxCopiesを差し替える。必ず元へ戻す。
    const startFixtureBattle = () => {
        const d = deck();
        const registry = d.definitions.cards;
        const { sequence, cardIds } = fixtureDeck();
        const counts = new Map();
        for (const id of cardIds) counts.set(id, (counts.get(id) || 0) + 1);
        const originals = new Map();
        const realRandom = Math.random;
        try {
            for (const [id, count] of counts) {
                const original = registry.get(id);
                if (!original) return { ok: false, reason: "cardDefinitionMissing", cardId: id };
                originals.set(id, original);
                registry.set(id, Object.freeze({ ...original, maxCopies: Math.max(original.maxCopies, count) }));
            }
            // 山札をシャッフルさせない（Fisher-Yatesが交換しない値）。直後に必ず戻す。
            Math.random = () => 1 - Number.EPSILON;
            const result = d.startCardBattle(cardIds);
            return { ...result, sequence };
        } finally {
            Math.random = realRandom;
            for (const [id, original] of originals) registry.set(id, original);
        }
    };

    // ---- 睡眠State（Lyre Calm確認用）。Hendrixの公式AddState/RemoveStateだけを使う ----
    const stateCommand = (name, args) => {
        const key = `${ENGINE}:${name}`;
        if (typeof PluginManager === "undefined" || typeof PluginManager._commands?.[key] !== "function") return false;
        const interpreter = new Game_Interpreter();
        interpreter._eventId = 0; // 呼出元0 = player
        PluginManager.callCommand(interpreter, ENGINE, name, args);
        return true;
    };
    const leader = () => typeof $gameParty !== "undefined" ? $gameParty?.leader?.() : null;
    const removeSleep = () => {
        const actor = leader();
        if (!actor || !actor.isStateAffected?.(SLEEP_STATE_ID)) return false;
        try { stateCommand("RemoveState", { stateId: String(SLEEP_STATE_ID) }); } catch (error) { /* 下で標準Stateを確実に外す */ }
        if (actor.isStateAffected(SLEEP_STATE_ID)) actor.removeState(SLEEP_STATE_ID);
        return true;
    };

    // ---- 戦闘イベントの宣言とダミーの出現 ----
    // Start Hermes/Apollo が成功したときだけ ProjectRCombatPresence.beginCombatEvent、
    // End / Reset / Exit では endCombatEvent を呼ぶ。HUD等の表示条件は本番と同じ
    // isCombatEventActive() だけで、ここは独自の戦闘フラグを持たない。
    const COMBAT_SOURCE = "ProjectR_CombatTestArena";
    const presence = () => root.ProjectRCombatPresence || null;
    const hasCombatEvent = () => !!presence()?.getCombatEventSources?.().includes(COMBAT_SOURCE);
    const beginCombat = () => presence()?.beginCombatEvent?.(COMBAT_SOURCE) === true;
    const endCombat = () => !!presence()?.endCombatEvent?.(COMBAT_SOURCE);
    const isTestCombat = () => isPlaytest() && runtime.scenario !== null && hasCombatEvent() && !!deck()?.isCardBattleActive?.();

    // 敵ダミー(<enemy>)はテスト中だけ現れる。マップに居るだけで戦闘扱いにならないようにするため。
    const isArenaDummy = event => !!event && /^DEV /.test(event.event?.()?.name || "") &&
        /<enemy>/.test(event.event?.()?.note || "");
    const syncDummies = () => {
        if (!isPlaytest()) return;
        // カード戦闘が他の経路(F8のendCardBattle等)で終わったら、戦闘イベントも終える。
        if (hasCombatEvent() && !deck()?.isCardBattleActive?.() && !runtime.pending) endCombat();
        if (currentMapId() !== ARENA_MAP_ID || typeof $gameMap === "undefined" || !$gameMap) return;
        const visible = isTestCombat();
        for (const event of $gameMap.events?.() || []) {
            if (isArenaDummy(event) && typeof event.setTransparent === "function" && event.isTransparent?.() === visible) {
                event.setTransparent(!visible);
            }
        }
    };

    // ---- 状態表示 ----
    const status = () => {
        const d = deck(), m = manager(), g = gauge(), a = activation();
        const state = d?.getBattleState?.() || null;
        const gaugeState = g?.getUltimateGaugeState?.() || null;
        const god = m?.getPersistentUltimateBattleState?.() || null;
        const sleeping = !!leader()?.isStateAffected?.(SLEEP_STATE_ID);
        return {
            ok: true,
            playtest: true,
            mapId: currentMapId(),
            inArena: currentMapId() === ARENA_MAP_ID,
            inTransferRoom: currentMapId() === TRANSFER_ROOM_MAP_ID,
            scenario: runtime.scenario,
            cardBattleActive: !!d?.isCardBattleActive?.(),
            hand: state ? state.hand.map(card => card.cardId) : [],
            counts: state ? { draw: state.drawPile.length, discard: state.discardPile.length, cooldown: state.cooldownPile.length } : null,
            god: god ? { godId: god.godId, status: god.status, hp: god.divineHp, maxHp: god.maxDivineHp,
                recoverySeconds: god.recoveryRemainingSeconds, manifested: god.manifested } : null,
            gauge: gaugeState ? { current: gaugeState.current, max: gaugeState.max, full: gaugeState.full, ready: gaugeState.ready } : null,
            ultimateKey: a?.getInputBinding?.().key ?? null,
            sleeping,
            combatEvent: !!presence()?.isCombatEventActive?.(),
            lastCardInput: lastCardInput(),
            diagnostics: collectDiagnostics(),
            returnPoint: runtime.returnPoint ? { ...runtime.returnPoint } : null
        };
    };
    // 直近のカードキー(Q/E/X/C/V)入力の結果。発動が失敗した理由(手札は変わらない)を確認できる。
    const lastCardInput = () => {
        const result = root.ProjectRCardBattleInput?.getLastResult?.();
        return result ? { ok: !!result.ok, reason: result.reason, detail: result.detail ?? null, handIndex: result.handIndex ?? null } : null;
    };
    const num = value => Math.round(value * 10) / 10;
    const yn = value => value ? "yes" : "no";
    // 次の実機報告で原因が分かるように、各段の判定をまとめて返す(Playtest限定)。
    const collectDiagnostics = () => {
        const d = deck(), m = manager(), g = gauge(), a = activation();
        const input = root.ProjectRCardBattleInput?.getDiagnostics?.() || null;
        const hermesId = m?.resolveGodId?.("hermes") ?? null;
        const apolloId = m?.resolveGodId?.("apollo") ?? null;
        const visuals = root.ProjectRGodSummonVisual?.getVisuals?.() || [];
        const gs = g?.getUltimateGaugeState?.() || null;
        const god = m?.getPersistentUltimateBattleState?.() || null;
        const last = a?.getLastUltimateActivationResult?.() || null;
        const state = d?.getBattleState?.() || null;
        return {
            combatEventActive: !!presence()?.isCombatEventActive?.(),
            combatEventSources: presence()?.getCombatEventSources?.() || [],
            cardBattleActive: !!d?.isCardBattleActive?.(),
            keyLabels: root.ProjectRCardBattleInput?.getKeyLabels?.() || [],
            lastKey: input ? { code: input.lastCode, index: input.lastIndex, decision: input.lastDecision,
                reason: input.lastReason, accepted: input.accepted, blocked: input.blocked } : null,
            lastCard: lastCardInput(),
            hand: state ? state.hand.map(card => card.cardId) : [],
            counts: state ? { draw: state.drawPile.length, discard: state.discardPile.length, cooldown: state.cooldownPile.length } : null,
            persistentGodId: god?.godId ?? null,
            persistentManifested: !!god?.manifested,
            visibleSummonExists: visuals.length > 0,
            visuals,
            divineHp: god ? god.divineHp : null,
            gauge: gs ? gs.current : null,
            gaugeFull: !!gs?.full,
            ultimateReady: !!gs?.ready && !!m?.isPersistentUltimateAvailable?.(),
            lastUltimate: last ? { ok: !!last.ok, reason: last.reason, handlerReason: last.handlerReason ?? null,
                error: last.error ?? null } : null,
            ultimateInput: a?.getInputDiagnostics?.() ?? null,
            ultimateBinding: a?.getInputBinding?.() ?? null,
            hermesHandler: hermesId ? !!a?.hasUltimateHandler?.(hermesId) : false,
            apolloHandler: apolloId ? !!a?.hasUltimateHandler?.(apolloId) : false,
            interact: root.ProjectRPlayerFacing?.getDiagnostics?.() ?? null,
            reedFlute: root.ProjectRHermesReedFluteSleep?.getLastDiagnostic?.() ?? null
        };
    };
    const diagnosticLines = () => {
        const x = collectDiagnostics();
        const keys = x.keyLabels.join("/") || "-";
        const lastKey = x.lastKey && x.lastKey.code
            ? `${x.lastKey.code} ${x.lastKey.decision}${x.lastKey.reason ? ":" + x.lastKey.reason : ""}` : "なし";
        const lastCard = x.lastCard ? `${x.lastCard.ok ? "成功" : "失敗"} ${x.lastCard.reason}` : "なし";
        const ui = x.ultimateInput;
        const lastUlt = x.lastUltimate
            ? `${x.lastUltimate.ok ? "OK" : "NG"} ${x.lastUltimate.reason}${x.lastUltimate.handlerReason ? "/" + x.lastUltimate.handlerReason : ""}${x.lastUltimate.error ? "/" + x.lastUltimate.error : ""}` : "なし";
        const i = x.interact;
        const f = i?.lastOk
            ? `canMove:${yn(i.lastOk.canMove)} 実行中:${yn(i.lastOk.eventRunning)} 候補:${i.lastOk.candidate ?? "-"} 結果:${i.lastOk.outcome}` : "押下なし";
        const r = x.reedFlute;
        const reed = r
            ? `${r.ok ? "成功" : "失敗"} ${r.detail || r.reason || ""} 敵${r.enemies} 生存${r.alive} 範囲内${r.inRange} 付与${r.applied}${r.stateId ? " State" + r.stateId : ""}${r.error ? " " + r.error : ""}` : "なし";
        return [
            `戦闘イベント:${yn(x.combatEventActive)} [${x.combatEventSources.join(",")}] / カード戦闘:${yn(x.cardBattleActive)} / キー ${keys}`,
            `直近キー: ${lastKey}  (受付${x.lastKey?.accepted ?? 0}/拒否${x.lastKey?.blocked ?? 0}) / 直近カード: ${lastCard}`,
            `手札 [${x.hand.join(", ")}]`,
            `神 ${x.persistentGodId ?? "-"} 顕現:${yn(x.persistentManifested)} 表示:${yn(x.visibleSummonExists)} DivineHP:${x.divineHp ?? "-"} / Gauge ${x.gauge ?? "-"} full:${yn(x.gaugeFull)} ready:${yn(x.ultimateReady)}`,
            `Ultimate直近: ${lastUlt} / handler Hermes:${yn(x.hermesHandler)} Apollo:${yn(x.apolloHandler)} / U入力 受信${ui?.keyDowns ?? "-"} 要求${ui?.requests ?? "-"} 最後:${ui?.lastDecision ?? "-"}${ui?.lastReason ? ":" + ui.lastReason : ""}`,
            `F(調べる)直近: ${f}`,
            `Reed Flute直近: ${reed}`
        ];
    };
    const statusLines = () => {
        const s = status();
        const head = `[Arena] map ${s.mapId} / 戦闘:${s.cardBattleActive ? "ON" : "OFF"} / シナリオ:${s.scenario || "-"}`;
        const god = s.god
            ? `神 ${String(s.god.godId).toUpperCase()}  Divine HP ${num(s.god.hp)}/${num(s.god.maxHp)}  ${s.god.status}` +
              (s.god.status === "collapsed" ? `  復帰まで ${num(s.god.recoverySeconds)}秒` : "")
            : "神: なし（戦闘外 / マップ移動で破棄）";
        const gaugeLine = s.gauge
            ? `Gauge ${num(s.gauge.current)}/${num(s.gauge.max)}  full:${s.gauge.full}  ready:${s.gauge.ready}  Ultimateキー:${s.ultimateKey}`
            : "Gauge: なし";
        const cards = s.counts
            ? `DRAW ${s.counts.draw} / DISCARD ${s.counts.discard} / COOLDOWN ${s.counts.cooldown}  手札 ${s.hand.length}枚` +
              (s.sleeping ? "  [睡眠中]" : "")
            : "手札: なし";
        const last = s.lastCardInput
            ? `直近のカード入力: ${s.lastCardInput.ok ? "成功" : "失敗"} ${s.lastCardInput.reason}` +
              (s.lastCardInput.detail ? ` (${s.lastCardInput.detail})` : "")
            : "直近のカード入力: なし";
        return [head, god, gaugeLine, `${cards}  |  ${last}`];
    };
    const INSTRUCTION_PAGES = [
        ["【操作】 Q E X C V = 手札の左から1〜5枚目 / U = Ultimate / F = 端末を調べる", "F8 = 詳細診断（ProjectRCombatTestArena.status() など）",
            "クリックでゲーム画面にフォーカスを戻してからキーを押す"],
        ["1) 中央の操作盤でHermes/Apolloテスト開始  2) Q E X C V でカード", "3) 南西の研究室でGauge/Divine HPを操作  4) U でUltimate",
            "操作盤の「Go to Reed Flute Spot」= 3体のダミーの真ん中(葦笛=Vキーの確認)",
            "北西=衝突コース 北東=射撃レーン 中央西=複数ダミー 中央東=タンクダミー", "南東の門=マップ移動テスト  操作盤で「アリーナから出る」"]
    ];

    // ---- シナリオ ----
    const endTest = () => {
        const d = deck();
        runtime.pending = null;
        const wasActive = !!d?.isCardBattleActive?.();
        endCombat();
        d?.endCardBattle?.();
        const hadSleep = removeSleep();
        const restored = restoreSnapshot();
        runtime.scenario = null;
        return { ok: true, wasActive, restored, removedSleep: hadSleep };
    };

    const startScenario = kind => {
        const godKind = kind === "apollo" ? "apollo" : kind === "hermes" ? "hermes" : null;
        if (!godKind) return refuse("unknownScenario");
        const d = deck();
        if (!d) return refuse("cardDeckUnavailable");
        if (typeof $gameSystem === "undefined" || !$gameSystem || typeof $gamePlayer === "undefined" || !$gamePlayer) {
            return refuse("gameUnavailable");
        }
        syncRuntime();
        takeSnapshot();
        endCombat();
        d.endCardBattle(); // 前のシナリオを片付ける（神・Gauge・Bridge登録もここで破棄される）
        removeSleep();
        const service = persistentService();
        if (!service) return refuse("cardDeckUnavailable");
        const failures = [];
        for (const ring of ["hermes", "apollo"]) {
            const result = service.assignRingToPlayer(ring);
            if (!result.ok) failures.push(...result.reasons);
        }
        for (const cardId of requiredCardIds()) {
            const result = service.setCardOwned(cardId, true);
            if (!result.ok) failures.push(...result.reasons);
        }
        const ultimate = service.setUltimateRing(godKind);
        if (!ultimate.ok) failures.push(...ultimate.reasons);
        if (failures.length) return { ok: false, reason: "setupFailed", reasons: failures };
        $gameSystem._projectRCardDeckData = service.data;

        const battle = startFixtureBattle();
        if (!battle.ok) {
            // 失敗したら、このシナリオが変えた所持データも元へ戻す。
            restoreSnapshot();
            runtime.scenario = null;
            return { ok: false, reason: battle.reason || "battleStartFailed", reasons: battle.reasons || [] };
        }
        runtime.scenario = godKind;
        runtime.pending = null;
        // 明示的な戦闘イベントの開始。ここで初めてHUD・ダミー・神の表示が現れる。
        if (!beginCombat()) {
            d.endCardBattle();
            restoreSnapshot();
            runtime.scenario = null;
            return { ok: false, reason: "combatEventUnavailable", reasons: [] };
        }
        const s = status();
        const expected = battle.sequence.slice(0, 5);
        return { ok: true, scenario: godKind, hand: s.hand, handMatchesFixture: expected.every((id, i) => s.hand[i] === id),
            god: s.god, gauge: s.gauge };
    };

    const resetScenario = () => {
        const kind = runtime.scenario;
        const d = deck();
        endCombat();
        d?.endCardBattle?.();
        removeSleep();
        // restoreSnapshotはしない（直後にstartScenarioが同じスナップショットを使い続ける）。
        runtime.pending = kind;
        const moved = transferTo(ARENA_MAP_ID, ARENA_SPAWN.x, ARENA_SPAWN.y, ARENA_SPAWN.direction);
        if (!moved.ok) { runtime.pending = null; return moved; }
        return { ok: true, scenario: kind, willRestart: !!kind };
    };

    const runPending = () => {
        if (!runtime.pending || !isPlaytest() || currentMapId() !== ARENA_MAP_ID) return null;
        const kind = runtime.pending;
        runtime.pending = null;
        return startScenario(kind);
    };

    // ---- 入退場 ----
    const enter = () => {
        if (typeof $gamePlayer === "undefined" || !$gamePlayer || typeof $gameMap === "undefined" || !$gameMap) {
            return refuse("playerUnavailable");
        }
        syncRuntime();
        if (!isArenaMap(currentMapId())) {
            runtime.returnPoint = { mapId: currentMapId(), x: $gamePlayer.x, y: $gamePlayer.y, direction: $gamePlayer.direction() };
        }
        endCombat();
        deck()?.endCardBattle?.();
        return transferTo(ARENA_MAP_ID, ARENA_SPAWN.x, ARENA_SPAWN.y, ARENA_SPAWN.direction);
    };

    // 葦笛の確認用: 3体のダミー((10,15) (12,15) (11,17))の真ん中。全て4タイル以内に入る。
    const REED_FLUTE_SPOT = Object.freeze({ x: 11, y: 16, direction: 2 });
    const moveToMultiTarget = () => {
        if (typeof $gamePlayer === "undefined" || !$gamePlayer) return refuse("playerUnavailable");
        if (currentMapId() !== ARENA_MAP_ID) return refuse("notInArena");
        $gamePlayer.locate(REED_FLUTE_SPOT.x, REED_FLUTE_SPOT.y);
        $gamePlayer.setDirection?.(REED_FLUTE_SPOT.direction);
        return { ok: true, x: REED_FLUTE_SPOT.x, y: REED_FLUTE_SPOT.y };
    };

    const exit = () => {
        const ended = endTest();
        const point = runtime.returnPoint;
        runtime.returnPoint = null;
        // 戻り先が無ければ、ゲーム既定の開始位置（無害な場所）へ。
        const target = point || (typeof $dataSystem !== "undefined" && $dataSystem
            ? { mapId: $dataSystem.startMapId, x: $dataSystem.startX, y: $dataSystem.startY, direction: 2 } : null);
        if (!target || !target.mapId) return { ...refuse("noReturnPoint"), ended };
        const moved = transferTo(target.mapId, target.x, target.y, target.direction || 2);
        return { ...moved, ended, usedFallback: !point };
    };

    // ---- Divine / Gauge（既存APIだけを呼ぶ） ----
    const addGauge = amount => {
        const g = gauge();
        if (!g) return refuse("gaugeUnavailable");
        // gainIdは渡さない（何度でも押せる）。満タンはGauge側がgaugeFullで拒否する。
        return g.addUltimateGauge(amount, SOURCE);
    };
    const fillGauge = () => {
        const g = gauge();
        if (!g) return refuse("gaugeUnavailable");
        if (!g.hasUltimateGaugeState()) return g.addUltimateGauge(1, SOURCE); // 理由(noUltimateGauge)をそのまま返す
        const need = g.getUltimateGaugeMax() - g.getUltimateGauge();
        if (!(need > 0)) return { ok: false, reason: "gaugeFull", gauge: g.getUltimateGauge(), max: g.getUltimateGaugeMax() };
        return g.addUltimateGauge(need, SOURCE);
    };
    const damageDivineArea = (amount = DIVINE_TEST_DAMAGE) => {
        const b = bridge(), m = manager();
        if (!b || !m) return refuse("bridgeUnavailable");
        const summon = m.getPersistentUltimateSummon();
        // 顕現していなければ、実Bridgeの拒否理由(notManifested)を見るため範囲中心なしで呼ぶ。
        const attackId = b.createAttackId("dev-arena-area");
        return b.damagePersistentUltimateInArea({
            attackId, x: summon ? summon.x : 0, y: summon ? summon.y : 0, radius: 1, amount, source: SOURCE
        });
    };
    const damageDivineGlobal = (amount = DIVINE_TEST_DAMAGE) => {
        const b = bridge();
        if (!b) return refuse("bridgeUnavailable");
        return b.damagePersistentUltimateFromGlobalAttack({ attackId: b.createAttackId("dev-arena-global"), amount, source: SOURCE });
    };
    const collapseGod = () => {
        const b = bridge(), m = manager();
        if (!b || !m) return refuse("bridgeUnavailable");
        const hp = m.getPersistentUltimateDivineHp();
        if (!(hp > 0)) return { ok: false, reason: m.hasPersistentUltimateBattleState() ? "collapsed" : "noPersistentUltimate", divineHp: hp };
        return b.damagePersistentUltimateFromGlobalAttack({ attackId: b.createAttackId("dev-arena-collapse"), amount: hp, source: SOURCE });
    };
    const applySleep = () => {
        const actor = leader();
        if (!actor) return refuse("actorUnavailable");
        if (!$dataStates?.[SLEEP_STATE_ID]) return refuse("stateMissing");
        if (!stateCommand("AddState", { target: "player", stateId: String(SLEEP_STATE_ID) })) return refuse("hendrixCommandUnavailable");
        return { ok: !!actor.isStateAffected(SLEEP_STATE_ID), stateId: SLEEP_STATE_ID, reason: actor.isStateAffected(SLEEP_STATE_ID) ? "applied" : "notApplied" };
    };

    const api = {
        ARENA_MAP_ID, TRANSFER_ROOM_MAP_ID, ARENA_SPAWN, SLEEP_STATE_ID, DRAW_SEQUENCE,
        isPlaytest, status, statusLines, diagnosticLines, REED_FLUTE_SPOT,
        moveToMultiTarget: guarded(moveToMultiTarget),
        instructions: () => INSTRUCTION_PAGES.map(page => [...page]),
        enter: guarded(enter),
        exit: guarded(exit),
        startScenario: guarded(startScenario),
        startHermes: guarded(() => startScenario("hermes")),
        startApollo: guarded(() => startScenario("apollo")),
        resetScenario: guarded(resetScenario),
        endTest: guarded(endTest),
        addGauge: guarded(amount => addGauge(amount)),
        gaugeAdd25: guarded(() => addGauge(GAUGE_TEST_GAIN)),
        fillGauge: guarded(fillGauge),
        damageDivineArea: guarded(damageDivineArea),
        damageDivineGlobal: guarded(damageDivineGlobal),
        collapseGod: guarded(collapseGod)
    };
    api.applySleep = guarded(applySleep);
    root.ProjectRCombatTestArena = Object.freeze(api);

    // ---- イベントから呼ぶプラグインコマンド（結果は上部のメッセージに表示） ----
    const say = (interpreter, lines) => {
        if (typeof $gameMessage === "undefined" || !$gameMessage) return;
        $gameMessage.setBackground?.(0);
        $gameMessage.setPositionType?.(0); // 上寄せ: 画面下のHUDを隠さない
        for (const line of lines.slice(0, 16)) $gameMessage.add(line);
        interpreter?.setWaitMode?.("message");
    };
    const explain = result => {
        if (result.ok) return null;
        const hints = {
            notManifested: "神が顕現していません（崩壊中/戦闘外）", outsideArea: "範囲外です", collapsed: "神は崩壊中です",
            noPersistentUltimate: "常駐Ultimate神がいません（先にHermes/Apolloテストを開始）",
            noUltimateGauge: "Gaugeがありません（先にテストを開始）", gaugeFull: "Gaugeは既に満タンです",
            alreadyApplied: "同じ攻撃IDは二重適用されません"
        };
        return hints[result.reason] || result.reason;
    };
    const commandBody = (title, fn) => function() {
        if (!isPlaytest()) return;
        let result;
        try { result = fn(); } catch (error) { result = refuse(String(error?.message || error)); }
        const hint = explain(result);
        say(this, [`[Arena] ${title}: ${result.ok ? "OK" : "NG"}${hint ? ` - ${hint}` : ""}`, ...statusLines().slice(1, 3)]);
    };
    const registerCommands = () => {
        if (typeof PluginManager === "undefined" || typeof PluginManager.registerCommand !== "function") return;
        const table = {
            startHermes: ["Hermesテスト開始", () => startScenario("hermes")],
            startApollo: ["Apolloテスト開始", () => startScenario("apollo")],
            endTest: ["カード戦闘を終了", () => endTest()],
            gaugeAdd25: ["Gauge +25", () => addGauge(GAUGE_TEST_GAIN)],
            gaugeFill: ["Gauge満タン", () => fillGauge()],
            divineAreaHit: ["Divine範囲 -25", () => damageDivineArea()],
            divineGlobalHit: ["Divine全体 -25", () => damageDivineGlobal()],
            collapseGod: ["神を崩壊", () => collapseGod()],
            applySleep: ["睡眠付与(State 32)", () => applySleep()],
            moveToMultiTarget: ["Reed Fluteスポットへ移動", () => moveToMultiTarget()]
        };
        for (const [name, [title, fn]] of Object.entries(table)) {
            PluginManager.registerCommand(PLUGIN_NAME, name, commandBody(title, fn));
        }
        PluginManager.registerCommand(PLUGIN_NAME, "resetTest", function() {
            if (!isPlaytest()) return;
            const result = resetScenario();
            if (!result.ok) say(this, [`[Arena] リセット失敗: ${result.reason}`]);
        });
        PluginManager.registerCommand(PLUGIN_NAME, "exitArena", function() {
            if (!isPlaytest()) return;
            const result = exit();
            if (!result.ok) say(this, [`[Arena] 退出失敗: ${result.reason}`]);
        });
        PluginManager.registerCommand(PLUGIN_NAME, "showStatus", function() {
            if (isPlaytest()) say(this, [...statusLines(), ...diagnosticLines()]);
        });
        PluginManager.registerCommand(PLUGIN_NAME, "showInstructions", function() {
            if (!isPlaytest()) return;
            for (const page of INSTRUCTION_PAGES) for (const line of page) $gameMessage.add(line);
            $gameMessage.setBackground?.(0);
            $gameMessage.setPositionType?.(0);
            this.setWaitMode?.("message");
        });
    };
    registerCommands();

    // 敵ダミーの出現/非表示。マップ読込直後(Scene_Map.startの戦闘判定より前)と、毎フレームで合わせる。
    if (typeof Game_Map !== "undefined") {
        if (typeof Game_Map.prototype.setup === "function") {
            const _setup = Game_Map.prototype.setup;
            Game_Map.prototype.setup = function() {
                const result = _setup.apply(this, arguments);
                try { syncDummies(); } catch (error) { /* 表示の同期に失敗してもマップ読込は止めない */ }
                return result;
            };
        }
        if (typeof Game_Map.prototype.update === "function") {
            const _update = Game_Map.prototype.update;
            Game_Map.prototype.update = function() {
                const result = _update.apply(this, arguments);
                try { syncDummies(); } catch (error) { /* 同上 */ }
                return result;
            };
        }
    }

    // リセット後のシナリオ再開始。マップが読み直された後（Scene_Map.start）に一度だけ行う。
    if (typeof Scene_Map !== "undefined" && typeof Scene_Map.prototype.start === "function") {
        const _start = Scene_Map.prototype.start;
        Scene_Map.prototype.start = function() {
            const result = _start.apply(this, arguments);
            try { runPending(); } catch (error) { runtime.pending = null; }
            return result;
        };
    }
})();
