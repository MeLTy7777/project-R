/*:
 * @target MZ
 * @plugindesc v1.0.0 DEV専用 Combat Test Arena 追加シナリオ（ボス/仲間/メニュー/指輪。Playtest限定）。
 * @author ProjectR
 * @base ProjectR_CombatTestArena
 * @base ProjectR_BossFramework
 * @base ProjectR_PartyCombat
 * @base ProjectR_MenuIntegration
 * @orderAfter ProjectR_CombatTestArena
 * @orderAfter ProjectR_CombatExtrasHUD
 *
 * @command startBossTest
 * @text DEVボス戦を開始（HUD・フェーズ・仲間）
 * @command bossHit
 * @text DEVボスに25%ダメージ
 * @command bossDivine
 * @text ボスの範囲攻撃（Divine HP）
 * @command allyHit
 * @text DEV仲間に60ダメージ
 * @command bossEntryCheck
 * @text ボス開始のデッキ検証（保存デッキで試す）
 * @command menuTest
 * @text 戦闘を終えてメニュー確認の準備
 * @command fullStatus
 * @text 全仕様パスの状態を表示
 * @command restoreReal
 * @text DEVデータを元に戻す
 *
 * @help
 * ProjectR_CombatTestArenaFullSpec.js
 *
 * Combat Test Arena（Map004）の追加DEVシナリオです。Playtest以外では何もしません。
 * 既存のArenaプラグインには触れず、公開APIだけを使います。製品の仲間・ボスは未設計のため、ここの
 * 「DEVボス」「DEV仲間(Actor 4, 6)」はテスト用のfixtureです（最終キャラ・最終攻撃ではありません）。
 *
 * 【ボス戦テスト】 startBossTest
 *   DEV fixtureとして、7種のカードのコピー上限を5に広げ、30枚のデッキを組み、指輪(Hermes/Apollo)を主人公に渡し、
 *   本番と同じ ProjectRBossFramework.start（デッキ検証つき）でDEVボスを始めます。
 *   → ボスHUD(名前/HP/フェーズ)、仲間HP、カードHUD、Divine HPが出ます。
 *   bossHit    … ボスHPを25%減らし、フェーズ境界(66%, 33%)でメッセージ。HP0で勝利して戦闘が片付く。
 *   bossDivine … ボスの範囲攻撃（Divine HP -25）をBridgeへ（一意の攻撃ID）。
 *   allyHit    … DEV仲間(Actor 4)にダメージ。HP0でダウン（戦闘中は復帰しない）。
 *   仲間はAIの意思決定（通常攻撃/指輪スキル/移動）だけを行い、攻撃はボスHPを少し減らします（見た目の移動・演出は未実装）。
 * 【ボス開始のデッキ検証】 bossEntryCheck
 *   元の（保存済みの）デッキでボス戦開始を試します。製品のカードは7種(最大19枚)で30枚に届かないため、
 *   「戦闘を始められません（30枚必要…）」と理由が出て、デッキは書き換えられません。
 * 【メニュー確認】 menuTest
 *   戦闘を終え、DEV fixtureのデータ（指輪・カード・仲間に渡せる指輪）を残したままにします。
 *   Escキーでメニューを開き、ITEM / SKILL(デッキ構築) / ULTIMATE(Tabで指輪) を確認できます。
 * 【元に戻す】 restoreReal … DEVの変更をすべて元の保存データ・定義へ戻します（アリーナを出たとき、New Game/ロードでも自動）。
 *
 * 保存: DEVの変更は実データを一時的に書き換えます。テスト中にセーブしないでください。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_CombatTestArenaFullSpec";
    const ARENA_MAP_ID = 4, ROOM_MAP_ID = 5;
    const BOSS_ID = "dev_arena_boss";
    const ALLIES = [4, 6];
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;

    const deck = () => root.ProjectRCardDeck;
    const boss = () => root.ProjectRBossFramework;
    const party = () => root.ProjectRPartyCombat;
    const session = () => root.ProjectRCombatSession;
    const clone = value => JSON.parse(JSON.stringify(value));
    const refuse = reason => ({ ok: false, reason });

    // 実行時だけの状態。保存しない。
    const runtime = { snapshot: null, originalCards: null, originalRings: null, log: [], pointers: {}, elapsed: 0, enemyPos: { x: 25, y: 20 } };

    const DECK_ORDER = ["apollo_golden_arrow", "apollo_plague_attack", "hermes_sword_attack", "hermes_swift_movement",
        "hermes_reed_flute_sleep", "apollo_lyre_calm", "hermes_perception_obscure"];
    const fixtureCards = () => Array.from({ length: 30 }, (_, i) => DECK_ORDER[i % DECK_ORDER.length]);

    const mapId = () => typeof $gameMap !== "undefined" && $gameMap ? $gameMap.mapId() : 0;
    const say = (interpreter, lines) => {
        if (typeof $gameMessage === "undefined" || !$gameMessage) return;
        $gameMessage.setBackground?.(0);
        $gameMessage.setPositionType?.(0);
        for (const line of lines.slice(0, 16)) $gameMessage.add(line);
        interpreter?.setWaitMode?.("message");
    };

    // ---- DEV fixture（定義の差し替えと保存データのスナップショット。必ず元へ戻す） ----
    const patchDefinitions = () => {
        const d = deck();
        if (runtime.originalCards) return;
        runtime.originalCards = new Map(d.definitions.cards);
        runtime.originalRings = new Map(d.definitions.rings);
        for (const [id, card] of d.definitions.cards) d.definitions.cards.set(id, Object.freeze({ ...card, maxCopies: Math.max(card.maxCopies, 5) }));
        for (const [id, ring] of d.definitions.rings) {
            if (id === "hermes" || id === "apollo") d.definitions.rings.set(id, Object.freeze({ ...ring, equipActorIds: Object.freeze([...ALLIES]) }));
        }
    };
    const restoreDefinitions = () => {
        const d = deck();
        if (!runtime.originalCards || !d) return false;
        for (const [id, card] of runtime.originalCards) d.definitions.cards.set(id, card);
        for (const [id, ring] of runtime.originalRings) d.definitions.rings.set(id, ring);
        runtime.originalCards = null;
        runtime.originalRings = null;
        return true;
    };
    const takeSnapshot = () => {
        if (!runtime.snapshot) {
            runtime.snapshot = { system: $gameSystem, data: clone(deck().getPersistentData()) };
            root.ProjectRCardInventory?.beginFixture?.(); // H2C-B2: 固定デッキの間だけ所持枚数の検証を外す(DEV専用)
        }
    };
    const restoreSnapshot = () => {
        if (!runtime.snapshot) return false;
        // 別のセーブへ切り替わっていたら古いスナップショットは使わない。
        if (runtime.snapshot.system === $gameSystem) {
            $gameSystem._projectRCardDeckData = deck().normalizePersistentData(runtime.snapshot.data, deck().definitions);
        }
        runtime.snapshot = null;
        root.ProjectRCardInventory?.endFixture?.();
        return true;
    };

    const registerFixtures = () => {
        boss().registerBoss({
            bossId: BOSS_ID, name: "DEV Boss (fixture)", maxHp: 400,
            phases: [{ id: "phase2", label: "第二形態", hpRatio: 0.66 }, { id: "phase3", label: "第三形態", hpRatio: 0.33 }]
        });
        for (const actorId of ALLIES) {
            party().registerAlly({
                actorId, name: `DEV Ally ${actorId}`, maxHp: 120, style: actorId === 4 ? "melee" : "ranged",
                preferredRange: actorId === 4 ? 1.5 : 4, engageRange: 12,
                normalAttack: { id: `dev_attack_${actorId}`, range: actorId === 4 ? 2 : 6, cooldownSeconds: 1.5 },
                ringSkills: {
                    hermes: [{ id: "dev_hermes_strike", range: 3, cooldownSeconds: 6 }],
                    apollo: [{ id: "dev_apollo_mend", cooldownSeconds: 8, target: "allyLowestHp" }]
                }
            });
        }
        // DEV実行者: 通常攻撃/指輪スキルはボスHPを少し減らし、移動は位置を更新する。見た目・演出は無い。
        party().setExecutor(intent => {
            runtime.log.push(`${intent.actorId}:${intent.type}${intent.skillId ? ":" + intent.skillId : ""}`);
            if (runtime.log.length > 6) runtime.log.shift();
            if (intent.type === "attack" || (intent.type === "ringSkill" && intent.targetId != null)) boss().damage(intent.type === "attack" ? 6 : 15, `ally:${intent.actorId}`);
            if (intent.type === "move" && Number.isFinite(intent.x)) {
                const m = party().members().find(o => o.actorId === intent.actorId);
                const from = { x: m?.x ?? $gamePlayer.x, y: m?.y ?? $gamePlayer.y };
                const dx = intent.x - from.x, dy = intent.y - from.y, len = Math.hypot(dx, dy) || 1;
                const stepLen = Math.min(0.06, len) * (intent.approach ? 1 : -1);
                party().setPosition(intent.actorId, from.x + dx / len * stepLen, from.y + dy / len * stepLen);
            }
            return { ok: true };
        });
    };

    const endAll = () => {
        boss().end("dev");
        session().endAll("dev");
        root.ProjectRCombatTestArena?.endTest?.();
    };

    const startBossTest = () => {
        if (!deck() || !boss() || !party() || !session()) return refuse("systemsUnavailable");
        if (![ARENA_MAP_ID, ROOM_MAP_ID].includes(mapId())) return refuse("notInArena");
        endAll();
        takeSnapshot();
        patchDefinitions();
        const d = deck();
        for (const ring of ["hermes", "apollo"]) d.assignRingToPlayer(ring);
        for (const id of DECK_ORDER) d.setCardOwned(id, true);
        d.setUltimateRing("hermes");
        d.setDeck(fixtureCards());
        registerFixtures();
        runtime.log = [];
        runtime.elapsed = 0;
        runtime.enemyPos = { x: $gamePlayer.x + 4, y: $gamePlayer.y - 2 };
        return boss().start(BOSS_ID, { allies: ALLIES });
    };
    const bossHit = () => {
        const state = boss().getState();
        return state ? boss().damage(state.maxHp * 0.25, "dev") : refuse("noBoss");
    };
    const bossDivine = () => boss().isActive() ? boss().bossAttack({ kind: "global", divineDamage: 25 }) : refuse("noBoss");
    const allyHit = () => party().isActive() ? party().damageAlly(ALLIES[0], 60) : refuse("noParty");
    const bossEntryCheck = () => {
        endAll();
        restoreSnapshot();
        restoreDefinitions();
        const result = boss().start(BOSS_ID);
        if (result.ok) boss().end("dev"); // 保存デッキが有効なら始まってしまう。すぐ終える。
        return result;
    };
    const menuTest = () => {
        if (!deck()) return refuse("systemsUnavailable");
        endAll();
        takeSnapshot();
        patchDefinitions();
        const d = deck();
        for (const ring of ["hermes", "apollo"]) d.assignRingToPlayer(ring);
        for (const id of DECK_ORDER) d.setCardOwned(id, true);
        d.setDeck(fixtureCards());
        registerFixtures();
        return { ok: true, openMenu: "Escキー" };
    };
    const restoreReal = () => {
        endAll();
        const had = !!runtime.snapshot || !!runtime.originalCards;
        restoreSnapshot();
        restoreDefinitions();
        return { ok: true, restored: had };
    };
    // MZ実機で失敗したとき、原因を報告できるように直近の結果を並べる（読み取り専用）。
    const short = value => value ? JSON.stringify(value).slice(0, 110) : "なし";
    // Lyre Calmの発動前提（Pluginを変えずに外から確認できる範囲）。直近のカード結果はArena状態端末の「直近カード」。
    const lyrePrerequisites = () => {
        const states = typeof $dataStates !== "undefined" ? $dataStates.filter(s => s?.note?.includes("<ProjectRCard: apollo_lyre_calm>")) : [];
        const engine = name => typeof PluginManager._commands?.[`Hendrix_Action_Engine:${name}`] === "function";
        return { cardBattle: !!deck()?.isCardBattleActive?.(), stateIds: states.map(s => s.id), hasState: typeof root.hasState === "function",
            AddState: engine("AddState"), RemoveState: engine("RemoveState"), leader: !!(typeof $gameParty !== "undefined" && $gameParty.leader?.()),
            summonManager: !!root.ProjectRGodSummonManager, calm: !!root.ProjectRApolloLyreCalm?.isPlayerCalm?.() };
    };
    // ---- 実機確認用の観測(読み取りだけ。ゲームの動作には介入しない) ----
    // 物理キー(F/U)の受信と、カードごとの直近結果。MZ実機で「何が起きたか」を短い行で報告できるようにする。
    const watched = { F: { count: 0, frame: null }, U: { count: 0, frame: null } };
    const frameNow = () => typeof Graphics !== "undefined" && Number.isFinite(Graphics.frameCount) ? Graphics.frameCount : null;
    if (typeof Input !== "undefined" && typeof Input._onKeyDown === "function") {
        const _onKeyDown = Input._onKeyDown;
        Input._onKeyDown = function(event) {
            const letter = event && (/^Key[A-Z]$/.test(event.code || "") ? event.code.slice(3) : String.fromCharCode(event?.keyCode || 0));
            if (letter && watched[letter] && !event.repeat) { watched[letter].count++; watched[letter].frame = frameNow(); }
            return _onKeyDown.apply(this, arguments);
        };
    }
    const lastByCard = {}; // cardId -> { ok, reason, detail }
    let lastSeenInstance = null;
    const trackCards = () => {
        const result = root.ProjectRCardBattleInput?.getLastResult?.();
        if (!result || result.instanceId === lastSeenInstance && result.cardId in lastByCard) return;
        lastSeenInstance = result.instanceId;
        if (result.cardId) lastByCard[result.cardId] = { ok: !!result.ok, reason: result.reason, detail: result.detail ?? null };
    };
    const ago = frame => { const now = frameNow(); return frame === null || now === null ? "?" : `${Math.max(0, now - frame)}f前`; };
    const cardText = id => lastByCard[id] ? `${lastByCard[id].ok ? "成功" : "失敗"}:${lastByCard[id].reason}${lastByCard[id].detail ? "/" + lastByCard[id].detail : ""}` : "未使用";
    const sleepingDummies = () => (typeof $gameMap !== "undefined" && $gameMap ? $gameMap.events() : [])
        .filter(e => e?.databaseEnemy && root.ProjectRHermesReedFluteSleep?.isEventSleeping?.(e.eventId())).map(e => e.eventId());
    // 実機確認用の短い状態行(依頼された値だけ)。
    const certificationLines = () => {
        const d = deck(), m = root.ProjectRGodSummonManager, g = root.ProjectRUltimateGauge, a = root.ProjectRUltimateActivation;
        const input = root.ProjectRCardBattleInput?.getDiagnostics?.() || {};
        const state = d?.getBattleState?.();
        const reed = root.ProjectRHermesReedFluteSleep?.getLastDiagnostic?.();
        const facing = root.ProjectRPlayerFacing?.getDiagnostics?.().lastOk;
        const last = a?.getLastUltimateActivationResult?.();
        const ui = a?.getInputDiagnostics?.() || {};
        const gs = g?.getUltimateGaugeState?.();
        const god = m?.getPersistentUltimateBattleState?.();
        const hermes = m?.resolveGodId?.("hermes"), apollo = m?.resolveGodId?.("apollo");
        const lastCard = root.ProjectRCardBattleInput?.getLastResult?.();
        const yn = v => v ? "yes" : "no";
        trackCards();
        return [
            `[認証] 戦闘セッション:${session().sources().join(",") || "なし"}  カード戦闘:${yn(d?.isCardBattleActive?.())}  戦闘イベント:${yn(root.ProjectRCombatPresence?.isCombatEventActive?.())}`,
            `手札[${state ? state.hand.map(c => c.cardId.replace(/^(hermes|apollo)_/, "")).join(",") : "-"}]  直近キー:${input.lastCode || "なし"} ${input.lastDecision || ""}${input.lastReason ? ":" + input.lastReason : ""}  直近カード:${lastCard ? (lastCard.ok ? "成功 " : "失敗 ") + (lastCard.cardId || lastCard.reason) : "なし"}`,
            `葦笛: 候補${reed ? reed.enemies : "-"} 生存${reed ? reed.alive : "-"} 範囲内${reed ? reed.inRange : "-"} 付与${reed ? reed.applied : "-"} ${reed ? reed.detail || reed.reason : "未使用"} / 睡眠中ダミー[${sleepingDummies().join(",")}]`,
            `Lyre: ${cardText("apollo_lyre_calm")} / 精神安定:${root.ProjectRApolloLyreCalm?.isPlayerCalm?.() ? "あり(残り" + Math.ceil(root.ProjectRApolloLyreCalm.getRemainingSeconds()) + "秒)" : "なし"}`,
            `F: 物理入力${watched.F.count}回(${ago(watched.F.frame)}) 判定:${facing ? facing.outcome : "なし"} 起動イベントID:${facing ? facing.startedEventId ?? "なし" : "-"} (候補${facing?.candidate ?? "-"})`,
            `Gauge ${gs ? Math.round(gs.current) + "/" + gs.max : "なし"}  Ultimate選択:${d?.getUltimateRingId?.() || "未選択"}  常駐神:${god ? god.godId + (m.isPersistentUltimateAvailable() ? "(使用可)" : "(" + god.status + ")") : "なし"}  handler Hermes:${yn(hermes && a?.hasUltimateHandler?.(hermes))} Apollo:${yn(apollo && a?.hasUltimateHandler?.(apollo))}`,
            `U: 物理入力${watched.U.count}回(${ago(watched.U.frame)}) 受信${ui.keyDowns ?? "-"} 要求${ui.requests ?? "-"} 最後:${ui.lastDecision || "-"}${ui.lastReason ? ":" + ui.lastReason : ""} / 結果:${last ? (last.ok ? "OK " : "NG ") + last.reason + (last.handlerReason ? "/" + last.handlerReason : "") + (last.error ? "/" + last.error : "") : "なし"}`
        ];
    };
    const runtimeDiagnostics = () => [`Lyre前提: ${short(lyrePrerequisites())}`];
    const statusLines = () => {
        const b = boss().getHudState(), members = party().members();
        return [
            "[Arena Full Spec]",
            `戦闘セッション: ${session().sources().join(",") || "なし"}  カード戦闘: ${deck().isCardBattleActive() ? "有効" : "なし"}`,
            b ? `ボス: ${b.name} ${Math.ceil(b.hp)}/${b.maxHp} ${b.phaseLabel}` : "ボス: なし",
            members.length ? "仲間: " + members.map(m => `${m.actorId}${m.down ? "(DOWN)" : ":" + Math.ceil(m.hp)}`).join(" ") : "仲間: なし",
            runtime.log.length ? "仲間AI直近: " + runtime.log.slice(-3).join(" | ") : "仲間AI直近: なし",
            `DEV fixture: ${runtime.originalCards ? "適用中(テスト後はrestoreRealを)" : "なし"}`,
            ...certificationLines(),
            ...runtimeDiagnostics()
        ];
    };

    // 仲間AIの時計。戦闘中(party有効)だけ、1フレームごとに判断させる。
    const world = () => {
        const b = boss().getState();
        return { player: { x: $gamePlayer.x, y: $gamePlayer.y },
            enemies: b ? [{ id: BOSS_ID, x: runtime.enemyPos.x, y: runtime.enemyPos.y, hp: b.hp, alive: true }] : [] };
    };
    if (typeof Game_Map !== "undefined") {
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            const result = _update.apply(this, arguments);
            try { trackCards(); } catch (_error) { /* 観測のみ */ }
            try {
                if (sceneActive !== false && !this.eventsPaused && party().isActive() && boss().isActive()) party().tick(1 / 60, world());
            } catch (_error) { /* DEV補助。マップ更新は止めない */ }
            return result;
        };
        // アリーナ(4/5)を出たら、DEVの変更を元へ戻す。
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function(mapId_) {
            const result = _setup.apply(this, arguments);
            if (![ARENA_MAP_ID, ROOM_MAP_ID].includes(Number(mapId_)) && (runtime.snapshot || runtime.originalCards)) {
                try { restoreReal(); } catch (_error) { /* 同上 */ }
            }
            return result;
        };
    }
    if (typeof DataManager !== "undefined") {
        for (const name of ["extractSaveContents", "setupNewGame"]) {
            if (typeof DataManager[name] !== "function") continue;
            const original = DataManager[name];
            DataManager[name] = function() {
                restoreDefinitions();
                runtime.snapshot = null;
                return original.apply(this, arguments);
            };
        }
    }

    const body = (title, fn) => function() {
        if (!isPlaytest()) return;
        let result;
        try { result = fn(); } catch (error) { result = refuse(String(error?.message || error)); }
        const reason = result.ok ? "" : ` - ${result.reason}`;
        const extra = result.messages?.length ? ["理由: " + result.messages.slice(0, 3).join(" / ")] : [];
        if (!result.ok && result.reason === "invalidDeck") session().announceInvalidDeck(this, result.messages);
        else say(this, [`[Arena] ${title}: ${result.ok ? "OK" : "NG"}${reason}`, ...extra, ...statusLines().slice(1, 4)]);
    };
    const table = {
        startBossTest: ["DEVボス戦開始", startBossTest], bossHit: ["ボスにダメージ", bossHit], bossDivine: ["ボスの範囲攻撃", bossDivine],
        allyHit: ["仲間にダメージ", allyHit], bossEntryCheck: ["ボス開始のデッキ検証", bossEntryCheck], menuTest: ["メニュー確認の準備", menuTest],
        restoreReal: ["DEVデータを戻す", restoreReal]
    };
    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        for (const [name, [title, fn]] of Object.entries(table)) PluginManager.registerCommand(PLUGIN, name, body(title, fn));
        PluginManager.registerCommand(PLUGIN, "fullStatus", function() { if (isPlaytest()) say(this, statusLines()); });
    }

    root.ProjectRCombatTestArenaFullSpec = Object.freeze({
        BOSS_ID, ALLIES, startBossTest, bossHit, bossDivine, allyHit, bossEntryCheck, menuTest, restoreReal, statusLines, certificationLines,
        getLog: () => [...runtime.log]
    });
})();
