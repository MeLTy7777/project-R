/*:
 * @target MZ
 * @plugindesc v0.3.0 DEV専用 SOUL戦闘 手動テスト用サンドボックス(Playtest限定)。F8コンソールの1コマンドで、アリーナ・カード・SOUL戦闘・回避AI(性格・ボス・近接・複数弾・フェイント)を用意します。
 * @author ProjectR
 * @base ProjectR_CombatTestArena
 * @base ProjectR_SoulBattle
 * @base ProjectR_SoulBattlePoC
 * @base ProjectR_SoulBattleDodge
 * @base ProjectR_SoulBattleAIData
 * @base ProjectR_CombatTestArenaApollo
 * @base ProjectR_BossFramework
 * @orderAfter ProjectR_CombatTestArena
 * @orderAfter ProjectR_CombatTestArenaApollo
 * @orderAfter ProjectR_BossFramework
 * @orderAfter ProjectR_SoulBattleAIData
 *
 * @help
 * ProjectR_SoulBattleSandbox.js
 *
 * RPGツクールMZのPlaytest(テストプレイ)専用です。配布版では何もしません(グローバルAPIも作りません)。
 * 戦闘ロジックは持ちません。既存の ProjectRCombatTestArena / ProjectRSoulBattle / ProjectRSoulBattleDodge を順に呼ぶだけです。
 * イベントの編集は不要です。js/plugins.js から1行消せば無効になります。
 *
 * F8 Console:
 *   ProjectRSoulSandbox.start()              アリーナへ移動 → Apolloのカード戦闘 → SOUL戦闘 → 回避AI を一度に用意する
 *   ProjectRSoulSandbox.start("evasive")     シナリオ指定(下の一覧)。別のシナリオへ切り替えるときも同じ(アリーナはそのまま)
 *   ProjectRSoulSandbox.profile("boss")      動作中の回避AIの性格だけを切り替える(位置・戦績は保つ)
 *   ProjectRSoulSandbox.volley(5)            ダメージなしのデコイ矢を5本、ハートへ扇状に飛ばす(複数弾の回避を見る)
 *   ProjectRSoulSandbox.feint("cancel")      デコイ矢を1本飛ばし、途中で取り消す。"redirect"=途中で向きを変える(フェイント)
 *   ProjectRSoulSandbox.status()             状態を表示(フェーズ・ハート・回避AIの状態/脅威/理由/クールダウン・当たり/外れ・手がかり)
 *   ProjectRSoulSandbox.restart()            同じシナリオをやり直す(ハートのHPと位置を戻す)
 *   ProjectRSoulSandbox.weapon("sword")      通常攻撃(左クリック)の武器を 剣/銃 に替える。"keep"=そのまま。stop() で元に戻す
 *   ProjectRSoulSandbox.stop()               ぜんぶ元に戻して、アリーナから出る(これで終了)
 *   ProjectRSoulSandbox.help()               この一覧を表示
 *
 * シナリオ:
 *   dodge / dodgeFast / dodgeSlow   P3-Aの基本の回避AI(標準/すばやい/遅い)。ハートは9マス先
 *   patrol / static                 回避なし。P0の往復ハート/止まるハート(6マス先)
 *   melee5                          近接の確認(P3-A): ハートは5マス先、武器は剣、回避AIは「バランス」。最初の一撃は避けられず当たり、
 *                                   被弾後にハートが横へ退くので、同じ向きの二撃目は外れる。
 *   beginner / balanced / evasive / aggressive   性格別(初心者/バランス/回避型/攻撃型)。9マス先
 *   multi                           複数弾(回避型)。QとEを続けて押す、または volley(5)。
 *   feint                           フェイント(バランス)。feint("cancel") / feint("redirect") のあと本物の矢を撃つ。
 *   boss                            ボス(dev_boss)。3回連続で避けると息切れし、剣で大ダメージ(90以上)を与えると怯む。HPで形態が変わる。
 *   a16                             A16統合(I2): 本物の混成30枚デッキ(指輪2つ・全カード所持は一時付与)の手札5枚 + SOULのハートをBossFrameworkのボスにする。
 *                                   ハートが唯一の標的(アリーナのダミー・A16のイベント3の体は遠くへ)。ハートのHPが0で勝利して全部元に戻る。
 *                                   ProjectRSoulSandbox.start("a16")  /  start("a16", { level: 1〜3, deck: "mixed"|"apollo"|"hermes", openingHand: ["カードID", ...最大5] })
 *                                   A16のボス戦(ProjectRBossTest)・別のボス戦・別のSOUL戦闘が動いていると、何も変えずに断ります。先に stop() / ProjectRBossTest.end()。
 *
 * 操作: Q 黄金の弓矢 / W 病の矢(継続ダメージ) / E 剣カード / 左クリック 通常攻撃(戦闘エリアの中) / マウスで狙う。R(高速移動)はSOUL中は使えません。
 *   攻撃ターン(約12秒)は攻撃でき、防御ターン(約4秒)は攻撃が出ません。WASDの移動は止まっています。
 *
 * 注意: アリーナは開始時に所持データ(指輪・カード)を一時的に書き換え、stop() で戻します。デコイ矢・武器の変更もstop()で消す/戻します。
 *   テスト中はセーブしないでください(SOUL中はメニューのセーブも使えません)。開発用のNew Gameで使うことを推奨します。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;

    const STAGE = Object.freeze({ x: 12, y: 25 });                  // アリーナ西の広間(何もない)
    const BATTLE = Object.freeze({ attackSeconds: 12, defenseSeconds: 4 });
    const SWORD_ID = 2, GUN_ID = 51, AMMO_ITEM = 31;               // このプロジェクトのDatabase(ロングソード / テストハンドガン / 弾薬)
    const DECOY_TEMPLATE = "ProjectR Apollo Golden Arrow";          // 本物の矢と同じ雛形。ダメージ処理は誰も行わない(見た目と観測だけ)
    const DECOY_LIFETIME = 150;
    const SCENARIOS = Object.freeze({
        dodge: { label: "基本の回避AI", distance: 9, dodge: {}, heart: { pattern: "static" } },
        dodgeFast: { label: "すばやい回避AI", distance: 9, dodge: { reactionFrames: 3, moveSpeed: 16, dodgeDistance: 2.2, cooldownFrames: 20, recoveryFrames: 10 }, heart: { pattern: "static" } },
        dodgeSlow: { label: "遅い回避AI", distance: 9, dodge: { reactionFrames: 16, moveSpeed: 6, dodgeDistance: 1.4, cooldownFrames: 90, recoveryFrames: 40 }, heart: { pattern: "static" } },
        patrol: { label: "P0の往復ハート(回避なし)", distance: 6, dodge: null, heart: { pattern: "patrol", rangeX: 3, speed: 2 } },
        static: { label: "止まるハート(回避なし)", distance: 6, dodge: null, heart: { pattern: "static" } },
        melee5: { label: "近接5マス(バランス・剣)", distance: 5, dodge: { profile: "balanced" }, heart: { pattern: "static" }, weapon: "sword" },
        beginner: { label: "初心者", distance: 9, dodge: { profile: "beginner" }, heart: { pattern: "static" } },
        balanced: { label: "バランス", distance: 9, dodge: { profile: "balanced" }, heart: { pattern: "static" } },
        evasive: { label: "回避型", distance: 9, dodge: { profile: "evasive" }, heart: { pattern: "static" } },
        aggressive: { label: "攻撃型", distance: 9, dodge: { profile: "aggressive" }, heart: { pattern: "static" } },
        multi: { label: "複数弾(回避型)", distance: 9, dodge: { profile: "evasive" }, heart: { pattern: "static" } },
        feint: { label: "フェイント(バランス)", distance: 9, dodge: { profile: "balanced" }, heart: { pattern: "static" } },
        boss: { label: "ボス(dev_boss)", distance: 9, dodge: { boss: "dev_boss" }, heart: { pattern: "static" }, attackSeconds: 20 },
        a16: { label: "A16統合(混成30枚デッキ + SOULボス)", distance: 9, dodge: { boss: "dev_boss" }, heart: { pattern: "static" }, attackSeconds: 20, a16: true }
    });

    const runtime = { scenario: null, job: null, parked: null, weaponSnap: null, hp0: null, startedAt: 0, lastResult: null, decoys: [], a16: null };
    const arena = () => root.ProjectRCombatTestArena;
    const soul = () => root.ProjectRSoulBattle;
    const dodge = () => root.ProjectRSoulBattleDodge;
    const poc = () => root.ProjectRSoulBattlePoC;
    const say = (...lines) => { if (typeof console !== "undefined") for (const line of lines) console.log(line); };
    const fail = (reason, extra) => { const result = { ok: false, reason, ...extra }; say(`[SoulSandbox] 失敗: ${reason}${extra?.hint ? " - " + extra.hint : ""}`); return result; };
    const stage = () => root.ProjectRSoulStage || null;
    const stageState = () => stage()?.getState?.()?.state || "none";
    const inArena = () => typeof $gameMap !== "undefined" && $gameMap && $gameMap.mapId() === arena().ARENA_MAP_ID;
    const sceneReady = () => typeof SceneManager !== "undefined" && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset &&
        typeof $gamePlayer !== "undefined" && !$gamePlayer.isTransferring();
    const command = (name, args, eventId) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId || 0;
        PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", name, args);
    };

    // ---- デコイ矢(ダメージなし)。複数弾・フェイントを、カードを使わずに再現する ----
    const clearDecoys = () => {
        const list = runtime.decoys;
        runtime.decoys = [];
        let removed = 0;
        for (const d of list) {
            try {
                if (typeof $gameMap !== "undefined" && $gameMap && $gameMap.event(d.id) === d.event && !d.event._erased) command("DestroyEvent", { target: String(d.id), destroyNearby: "", permanent: "false" }, d.id);
                removed++;
            } catch (_error) { /* 後始末の失敗は無視(マップ移動で消える) */ }
        }
        return removed;
    };
    const bearingToHeart = () => {
        const state = poc().getState();
        if (!state?.active) return null;
        const pc = $gamePlayer.centerPositionPoint();
        const dx = state.hitCenter.x - pc.x, dy = state.hitCenter.y - pc.y;
        return ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360;
    };
    const spawnDecoy = degree => {
        const template = $dataTemplateMap?.events?.find(e => e?.name === DECOY_TEMPLATE);
        if (!template || typeof $gameMap.spawnEvent !== "function") return null;
        const id = $gameMap.spawnEvent(template.id, $gamePlayer._realX, $gamePlayer._realY, false, degree);
        const event = id && $gameMap.event(id);
        if (!event || typeof event.rotateTo !== "function") return null;
        event.rotateTo(degree);
        const record = { id, event, age: 0, degree, action: null };
        runtime.decoys.push(record);
        return record;
    };
    const decoyGuard = () => {
        if (!soul().isActive()) return fail("notRunning", { hint: "先に start()" });
        if (!sceneReady()) return fail("sceneNotReady");
        return null;
    };
    const volley = (count = 5, spread = 40) => {
        const blocked = decoyGuard();
        if (blocked) return blocked;
        const n = Math.max(1, Math.min(12, Math.floor(Number(count) || 5))), width = Math.max(0, Math.min(120, Number(spread) || 0));
        const center = bearingToHeart();
        if (center === null) return fail("noHeart");
        const ids = [];
        for (let i = 0; i < n; i++) {
            const offset = n === 1 ? 0 : -width / 2 + width * i / (n - 1);
            const record = spawnDecoy(((center + offset) % 360 + 360) % 360);
            if (!record) { clearDecoys(); return fail("decoyUnavailable", { hint: "矢のテンプレートが見つからない" }); }
            ids.push(record.id);
        }
        say(`[SoulSandbox] デコイ矢を${n}本、扇状(${width}度)に飛ばしました(ダメージなし)。status() で回避AIの判断を見られます。`);
        return { ok: true, count: n, ids };
    };
    const feint = (kind = "cancel") => {
        if (!["cancel", "redirect"].includes(kind)) return fail("invalidFeint", { hint: '"cancel"(取り消し) / "redirect"(向きを変える)' });
        const blocked = decoyGuard();
        if (blocked) return blocked;
        const bearing = bearingToHeart();
        if (bearing === null) return fail("noHeart");
        const record = spawnDecoy(bearing);
        if (!record) return fail("decoyUnavailable", { hint: "矢のテンプレートが見つからない" });
        record.action = { at: 9, kind, done: false };         // 飛び出して9frame後(回避AIが避け始める頃)に取り消す/向きを変える
        say(`[SoulSandbox] フェイント(${kind}): デコイ矢が約0.15秒後に${kind === "cancel" ? "消えます" : "向きを変えます"}。続けて本物の矢を撃って、回避AIの反応を見てください。`);
        return { ok: true, id: record.id, kind };
    };
    const updateDecoys = () => {
        if (!runtime.decoys.length) return;
        const alive = [];
        for (const d of runtime.decoys) {
            d.age++;
            const gone = typeof $gameMap === "undefined" || !$gameMap || $gameMap.event(d.id) !== d.event || d.event._erased;
            if (gone) continue;
            if (d.action && !d.action.done && d.age >= d.action.at) {
                d.action.done = true;
                if (d.action.kind === "cancel") { try { d.event.erase(); } catch (_error) { /* noop */ } continue; }
                try { d.event.rotateTo((d.degree + 60) % 360); } catch (_error) { /* noop */ }
            }
            if (d.age >= DECOY_LIFETIME) { try { command("DestroyEvent", { target: String(d.id), destroyNearby: "", permanent: "false" }, d.id); } catch (_error) { /* noop */ } continue; }
            alive.push(d);
        }
        runtime.decoys = alive;
    };

    // ---- 舞台: 邪魔になる敵ダミーを遠くへ(元の位置は覚えておき、stopで戻す) ----
    const parkDummies = () => {
        if (runtime.parked) return;
        runtime.parked = [];
        const width = $gameMap.width();
        let i = 0;
        for (const event of $gameMap.events()) {
            if (!event || event.isSpawnEvent || !event.event()?.note?.includes("<enemy>")) continue;
            runtime.parked.push({ id: event.eventId(), x: event._realX, y: event._realY });
            event.setPosition(width - 3, 2 + i++);
        }
    };
    const restoreDummies = () => {
        const parked = runtime.parked;
        runtime.parked = null;
        if (!parked || typeof $gameMap === "undefined" || !$gameMap || !inArena()) return 0;
        for (const p of parked) $gameMap.event(p.id)?.setPosition(p.x, p.y);
        return parked.length;
    };

    // ---- 通常攻撃の武器(任意)。変えた分だけ stop() で戻す ----
    const weapon = kind => {
        if (!["sword", "gun", "keep"].includes(kind)) return fail("invalidWeapon", { hint: '"sword" / "gun" / "keep" のどれか' });
        if (kind === "keep") return { ok: true, weapon: "keep" };
        const actor = $gameParty?.leader?.();
        if (!actor) return fail("noLeader");
        if (!runtime.weaponSnap) {
            runtime.weaponSnap = { weaponId: actor.equips()[0]?.id || 0, ammoItems: $gameParty.numItems($dataItems[AMMO_ITEM]), gunAmmo: $gameSystem.getGunData?.(GUN_ID)?.currentAmmo };
        }
        const id = kind === "sword" ? SWORD_ID : GUN_ID;
        if (!$dataWeapons[id]) return fail("weaponMissing", { hint: "武器ID " + id });
        actor.forceChangeEquip(0, $dataWeapons[id]);
        if (kind === "gun") {
            const have = $gameParty.numItems($dataItems[AMMO_ITEM]);
            if (have < 60) $gameParty.gainItem($dataItems[AMMO_ITEM], 60 - have);
            $gameSystem.setGunAmmo?.(GUN_ID, 7);
        }
        say(`[SoulSandbox] 通常攻撃(左クリック)の武器: ${$dataWeapons[id].name}`);
        return { ok: true, weapon: kind };
    };
    const restoreWeapon = () => {
        const snap = runtime.weaponSnap;
        runtime.weaponSnap = null;
        const actor = $gameParty?.leader?.();
        if (!snap || !actor) return false;
        actor.forceChangeEquip(0, snap.weaponId ? $dataWeapons[snap.weaponId] : null);
        const have = $gameParty.numItems($dataItems[AMMO_ITEM]);
        if (have !== snap.ammoItems) $gameParty.gainItem($dataItems[AMMO_ITEM], snap.ammoItems - have);
        if (snap.gunAmmo !== undefined) $gameSystem.setGunAmmo?.(GUN_ID, snap.gunAmmo);
        return true;
    };

    // ---- A16統合(I2): 本物の混成30枚デッキ + SOULのハートをBossFrameworkのボスにする ----
    const apolloTest = () => root.ProjectRApolloTest;
    const bossFramework = () => root.ProjectRBossFramework;
    const cardDeck = () => root.ProjectRCardDeck;
    const handIdsNow = () => { try { return (cardDeck()?.getBattleState?.()?.hand || []).map(c => c.cardId); } catch (_error) { return []; } };
    const a16BossId = () => dodge()?.getBoss?.("dev_boss")?.frameworkBossId || null;
    // 衝突の確認(何も変えない)。理由を返すか、問題なければ null。
    // arriving: ステージへの到着後の準備(ステージはこの a16 のために入った物なので、使用中とは見なさない)
    const a16Conflict = ({ arriving = false } = {}) => {
        if (!apolloTest() || !bossFramework() || !a16BossId()) return { reason: "pluginsMissing", hint: "ProjectRApolloTest / ProjectRBossFramework / dev_boss が必要です" };
        const bossTest = root.ProjectRBossTest?.getState?.();
        if (bossTest) return { reason: "bossTestActive", hint: "A16のボス戦が動いています。ProjectRBossTest.end() で終えてから" };
        const bf = bossFramework();
        if (bf.isActive?.() && !(runtime.a16 && bf.getState?.()?.bossId === runtime.a16.bossId)) return { reason: "bossActive", hint: "別のボス戦が動いています(" + (bf.getState?.()?.bossId || "?") + ")。先に終えてください" };
        if (!arriving && !runtime.a16 && !runtime.job && !["none", "idle"].includes(stageState())) return { reason: "stageBusy", hint: "SOUL専用ステージが使用中です(状態: " + stageState() + ")。ProjectRSoulStage.leave() で戻ってから" };
        if (soul().isActive() && !runtime.scenario) return { reason: "soulActive", hint: "別のSOUL戦闘が動いています。ProjectRSoulBattle.end() で終えてから" };
        if (poc().isActive() && !soul().isActive()) return { reason: "pocActive", hint: "P0のハートが単独で動いています。ProjectRSoulBattlePoC.end() で終えてから" };
        if (!runtime.a16 && apolloTest().isDirty?.()) return { reason: "apolloTestDirty", hint: "ProjectRApolloTest が一時データを持っています。ProjectRApolloTest.reset() で戻してから" };
        if (!runtime.a16 && !runtime.scenario && cardDeck()?.isCardBattleActive?.()) return { reason: "cardBattleActive", hint: "別のカード戦闘が動いています。先に終えてください" };
        return null;
    };
    const abort = (reason, detail) => { const error = new Error(reason); error.sandbox = { reason, hint: detail === undefined ? undefined : (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 160)) }; throw error; };
    // 普通のシナリオ(7枚の固定デッキ)を、アリーナの戦闘ごと片づける(a16やほかの入口へ移る前)
    const teardownPlain = () => {
        clearDecoys();
        if (soul().isActive()) soul().end("sandbox");
        dodge().disarm();
        try { arena().endTest(); } catch (_error) { /* DEV用 */ }
        runtime.scenario = null;
    };
    // 後始末。1回だけ行う(動作中の記録を先に外す)。途中の失敗・中断でも、ここで一時データ・指輪・デッキ・ダミー・武器・セッションを戻す。
    const finishA16 = reason => {
        const a = runtime.a16;
        if (!a || a.finishing) return { ok: true, steps: [], already: true };
        a.finishing = true;
        runtime.a16 = null;
        const steps = [];
        const step = (label, fn) => { try { const done = fn(); if (done) steps.push(label); } catch (error) { steps.push(label + "で例外: " + (error?.message || error)); a.errors = (a.errors || 0) + 1; } };
        step("終了通知を解除", () => { a.unsub?.(); a.unsub = null; return false; });
        step("デコイ矢を消去", () => clearDecoys() > 0);
        step("SOUL戦闘を終了", () => { if (soul().isActive()) { soul().end("sandbox:" + reason); return true; } return false; });
        step("回避AIを解除", () => dodge().disarm());
        step("ボス(BossFramework)を終了", () => { const bf = bossFramework(); if (bf?.isActive?.() && bf.getState?.()?.bossId === a.bossId) { bf.end("sandbox"); return true; } return false; });
        step("敵ダミーを元の位置へ", () => restoreDummies() > 0);
        step("武器・弾薬を元へ", () => restoreWeapon());
        step("一時データを元へ(指輪・所持・解放・Level・デッキ・カード戦闘)", () => { const r = apolloTest()?.reset?.(); return !!r?.restored; });
        // ステージで戦っていたなら、元のマップ・座標へ戻る(再開・切り替えのときはステージに残る)。何度呼んでも移動は1回だけ。
        step("ステージから元のマップへ戻る", () => { if (!a.stage || reason === "restart" || reason === "switch") return false; const r = stage()?.leave?.("a16:" + reason); return !!(r && r.ok && !r.already); });
        runtime.scenario = null; runtime.hp0 = null;
        return { ok: !a.errors, steps, reason };
    };
    // a16 の指定の検証(何も変えない)。問題があれば fail(...) の結果を返す。
    const checkA16Options = (options = {}) => {
        const level = options.level === undefined ? 3 : Number(options.level);
        if (!Number.isInteger(level) || level < 1 || level > 3) return fail("invalidLevel", { hint: "1〜3" });
        const deckKind = options.deck === undefined ? "mixed" : options.deck;
        if (!["mixed", "apollo", "hermes"].includes(deckKind)) return fail("invalidDeck", { hint: '"mixed" / "apollo" / "hermes"' });
        const opening = options.openingHand;
        if (opening !== undefined && (!Array.isArray(opening) || opening.length > 5 || !opening.every(id => typeof id === "string"))) return fail("invalidOpeningHand", { hint: "カードIDの配列(最大5)" });
        if (options.weapon !== undefined && !["sword", "gun", "keep"].includes(options.weapon)) return fail("invalidWeapon", { hint: '"sword" / "gun" / "keep"' });
        if (options.stage !== undefined && typeof options.stage !== "boolean") return fail("invalidStage", { hint: "true(専用ステージ・既定) / false(アリーナ)" });
        const look = options.enemyImage;
        if (look !== undefined && !(look && typeof look.name === "string" && look.name && (look.folder === undefined || ["enemies", "sv_enemies"].includes(look.folder)))) return fail("invalidEnemyImage", { hint: '{ name: "Highking", folder: "enemies" | "sv_enemies" }' });
        return null;
    };
    const runA16 = (options = {}) => {
        const conflict = a16Conflict({ arriving: options.stage === true });
        if (conflict) return fail(conflict.reason, { hint: conflict.hint });
        const invalid = checkA16Options(options);
        if (invalid) return invalid;
        const level = options.level === undefined ? 3 : Number(options.level);
        const deckKind = options.deck === undefined ? "mixed" : options.deck;
        const opening = options.openingHand;
        if (options.stage === true && !(stage() && stage().isActive() && sceneReady())) return fail("stageNotReady", { hint: "SOUL専用ステージに着いてから実行します" });
        // ここから先は状態を変える。前のシナリオを片づけ、記録を作り、失敗したらすべて戻す。
        if (runtime.a16) finishA16("restart");
        if (runtime.scenario) teardownPlain();
        clearDecoys();
        const at = apolloTest(), bf = bossFramework();
        const record = { bossId: a16BossId(), level, deck: deckKind, unsub: null, finishing: false, errors: 0, stage: options.stage === true };
        runtime.a16 = record;
        try {
            const gods = deckKind === "apollo" ? ["apollo"] : deckKind === "hermes" ? ["hermes"] : ["apollo", "hermes"];
            for (const god of gods) { const r = at.grantRing(god); if (!r.ok) abort("ringFailed", { god, reason: r.reason, reasons: r.reasons }); }
            const unlocked = at.unlock(level, gods);
            if (!unlocked.ok) abort("unlockFailed", unlocked);
            const built = deckKind === "mixed" ? at.buildMixedDeck() : at.buildDeck(deckKind);
            if (!built.ok || !built.valid || (built.inventoryReasons || []).length) abort("deckInvalid", { reasons: built.reasons, inventoryReasons: built.inventoryReasons });
            const battle = at.startDeckBattle(true);
            if (!battle.ok) abort("battleFailed", battle);
            // 最初の手札の指定(任意): 装備デッキの30枚のうち指定のカードを先に引く並びで、戦闘を始め直す(本物のデッキ・本物のドロー。シャッフルだけを止める)
            if (Array.isArray(opening) && opening.length) {
                const cd = cardDeck(), rest = [...cd.getDeck()], want = [];
                for (const id of opening) { const i = rest.indexOf(id); if (i >= 0) { want.push(id); rest.splice(i, 1); } }
                const order = [...want, ...rest].reverse(), original = Math.random;
                let restarted;
                Math.random = () => 1 - Number.EPSILON;
                try { cd.endCardBattle(); restarted = cd.startCardBattle(order); } finally { Math.random = original; }
                if (!restarted?.ok) abort("openingHandFailed", restarted);
            }
            const hand = handIdsNow();
            if (hand.length !== 5) abort("handInvalid", { hand });
            parkDummies();                                          // ハートが唯一の標的。アリーナのダミーも、A16のイベント3の体も遠くへ(専用ステージには敵Eventが無い)
            const place = record.stage ? stage().layout().player : STAGE;
            $gamePlayer.locate(place.x, place.y);
            $gamePlayer.setDirection?.(8);
            const center = $gamePlayer.centerPositionPoint();
            if (options.weapon) { const w = weapon(options.weapon); if (!w.ok) abort("weaponFailed", w.reason); }
            const armed = dodge().arm({ boss: "dev_boss", ...(options.dodge || {}) });
            if (!armed.ok) abort("dodgeArmFailed", armed.reason);
            // 専用ステージでは、敵ハートは戦闘エリアの上寄り(ステージの配置)。アリーナ(stage:false)では従来どおり、プレイヤーの distance マス北。
            const home = record.stage ? stage().layout().heartHome : null;
            const distance = home ? +Math.hypot(home.x - center.x, home.y - center.y).toFixed(1) : (Number.isFinite(options.distance) ? options.distance : SCENARIOS.a16.distance);
            const started = soul().start({ attackSeconds: options.attackSeconds ?? SCENARIOS.a16.attackSeconds, defenseSeconds: options.defenseSeconds ?? BATTLE.defenseSeconds,
                heart: home ? { centerX: home.x, centerY: home.y, ...SCENARIOS.a16.heart } : { centerX: center.x, centerY: center.y - distance, ...SCENARIOS.a16.heart }, endOnHeartDefeat: true, endOnCardBattleEnd: true,
                prepare: options.prepare === true });      // 準備ループ(PREPARE→ATTACK→DEFENSE→PREPARE)は options.prepare:true のときだけ(既定は従来どおり)
            if (!started.ok) abort("soulStartFailed", started.reason);
            const heartId = soul().getState().heart.eventId;
            const hp = poc().getState().hp;
            const maxHp = Number.isFinite(hp) && hp > 0 ? Math.floor(hp) : 1000;
            const registered = bf.registerBoss({ bossId: record.bossId, name: "SOULボス(dev_boss)", maxHp, eventId: heartId,
                phases: [{ id: "phase2", label: "第二形態", hpRatio: 0.66 }, { id: "phase3", label: "第三形態", hpRatio: 0.33 }] });
            if (!registered.ok) abort("bossRegisterFailed", registered.reason);
            const bossStarted = bf.start(record.bossId, {});
            if (!bossStarted.ok) abort("bossStartFailed", { reason: bossStarted.reason, reasons: bossStarted.reasons });
            record.unsub = soul().onEnd(payload => {
                const reason = payload?.reason || "soulEnd";
                const result = finishA16(reason);
                if (!result.already) say("[SoulSandbox] A16を自動で片づけました(理由: " + reason + (reason === "victory" ? " = ハートを撃破" : "") + ")。" + result.steps.join(" / "), (record.stage ? "  元のマップへ戻ります。" : "  アリーナから出るには ProjectRSoulSandbox.stop()"));
            });
            runtime.scenario = "a16";
            runtime.hp0 = hp;
            runtime.startedAt = Graphics.frameCount || 0;
            const result = { ok: true, scenario: "a16", label: SCENARIOS.a16.label, level, deck: deckKind, hand, deckSize: at.deckInfo().size, distance, heartEventId: heartId, bossId: record.bossId, maxHp };
            runtime.lastResult = result;
            say("[SoulSandbox] 準備完了: A16統合 (" + deckKind + "デッキ30枚・Lv" + level + ")。ハートはあなたの" + distance + "マス北で、唯一の標的です。",
                "  手札(左からQ/W/E/R/T): " + hand.join(" / "),
                record.stage ? "  ハートのHPを0にすると勝利して、元のマップへ戻ります。status() で状態、stop() で中止(元のマップへ戻ります)。絶・高速移動はSOUL中は使えません。" : "  ハートのHPを0にすると勝利して全て元に戻ります。status() で状態、stop() で終了(アリーナから出ます)。絶・高速移動はSOUL中は使えません。");
            return result;
        } catch (error) {
            const info = error.sandbox || { reason: "exception", hint: String(error?.message || error) };
            const cleaned = finishA16("rollback");
            return fail(info.reason, { hint: info.hint, rolledBack: cleaned.steps });
        }
    };

    // ---- 1コマンドの準備本体(アリーナの中にいるときに実行する) ----
    const run = (name, options = {}) => {
        const scenario = SCENARIOS[name];
        if (!scenario) return fail("unknownScenario", { hint: Object.keys(SCENARIOS).join(" / ") });
        if (name === "a16") return runA16(options);
        if (runtime.a16) finishA16("switch");                       // A16のデッキ・指輪を先に元へ戻してから、普通のシナリオへ
        // 前のSOUL・回避AI・デコイを片づける(アリーナの戦闘はそのまま使う)
        clearDecoys();
        if (soul().isActive()) soul().end("sandbox");
        dodge().disarm();
        const deck = root.ProjectRCardDeck;
        if (!deck?.isCardBattleActive?.() || arena().status().scenario !== "apollo") {
            const started = arena().startScenario("apollo");
            if (!started.ok) return fail("arenaScenarioFailed", { hint: String(started.reason) });
        }
        parkDummies();
        $gamePlayer.locate(STAGE.x, STAGE.y);
        $gamePlayer.setDirection?.(8);
        const center = $gamePlayer.centerPositionPoint();
        const distance = Number.isFinite(options.distance) ? options.distance : scenario.distance;
        const wanted = options.weapon || scenario.weapon;
        if (wanted) { const w = weapon(wanted); if (!w.ok) return w; }
        if (scenario.dodge) {
            const armed = dodge().arm({ ...scenario.dodge, ...(options.dodge || {}) });
            if (!armed.ok) return fail("dodgeArmFailed", { hint: armed.reason });
        }
        const started = soul().start({ attackSeconds: options.attackSeconds ?? scenario.attackSeconds ?? BATTLE.attackSeconds, defenseSeconds: options.defenseSeconds ?? BATTLE.defenseSeconds,
            heart: { centerX: center.x, centerY: center.y - distance, ...scenario.heart }, prepare: options.prepare === true });
        if (!started.ok) { dodge().disarm(); return fail("soulStartFailed", { hint: started.reason }); }
        runtime.scenario = name;
        runtime.startedAt = Graphics.frameCount || 0;
        runtime.hp0 = poc().getState().hp;
        const result = { ok: true, scenario: name, label: scenario.label, distance, heartEventId: soul().getState().heart.eventId };
        runtime.lastResult = result;
        say(`[SoulSandbox] 準備完了: ${scenario.label} (${name})。ハートはあなたの${distance}マス北。`,
            "  Q=黄金の弓矢 / W=病の矢 / E=剣カード / 左クリック=通常攻撃 / マウスで狙う。攻撃ターン約12秒→防御ターン約4秒を繰り返します。",
            "  ProjectRSoulSandbox.status() で状態、ProjectRSoulSandbox.stop() で終了(元に戻してアリーナから出ます)。");
        return result;
    };

    // a16 を専用ステージで始める: 元の場所を記録してステージへ移動し、到着してから準備を実行する(着くまで pending)。
    const startA16Stage = options => {
        const st = stageState();
        const opts = { ...options, stage: true };
        if (options.enemyImage !== undefined && stage()?.setEnemyLook) stage().setEnemyLook(options.enemyImage);          // 戦闘エリアの上の敵の絵(既定は Stage の DEFAULT_ENEMY_LOOK)
        if (st === "leaving") return fail("stageLeaving", { hint: "ステージから戻っている途中です。着いてからもう一度" });
        if (st === "active" && mapIs(stage().STAGE_MAP_ID) && sceneReady()) {                                  // ステージの中での再開: 先に片づけ、戦闘中判定(CombatPresence)が静まるまで少し待ってから準備する
            if (runtime.a16) finishA16("restart");
            if (soul().isActive()) soul().end("sandbox:restart");
            runtime.job = { name: "a16", options: opts, waited: -40, stage: true };
            say("[SoulSandbox] A16をやり直します(ステージに残ります)。");
            return { ok: true, pending: true, scenario: "a16", stage: true, restart: true };
        }
        if (st === "idle") {
            const moved = stage().enter();
            if (!moved.ok) return fail("stageEnterFailed", { hint: String(moved.reason) });
            if (!moved.pending) { if (sceneReady()) return run("a16", opts); }
        }
        runtime.job = { name: "a16", options: opts, waited: 0, stage: true };
        say("[SoulSandbox] SOUL専用ステージへ移動中… 到着すると自動で準備します。");
        return { ok: true, pending: true, scenario: "a16", stage: true };
    };
    const mapIs = id => typeof $gameMap !== "undefined" && !!$gameMap && $gameMap.mapId() === id;
    const start = (name = "dodge", options = {}) => {
        if (!isPlaytest()) return { ok: false, reason: "notPlaytest" };
        if (!arena() || !soul() || !dodge() || !poc()) return fail("pluginsMissing", { hint: "CombatTestArena / SoulBattle / Dodge が必要です" });
        if (!SCENARIOS[name]) return fail("unknownScenario", { hint: Object.keys(SCENARIOS).join(" / ") });
        if (typeof $gamePlayer === "undefined" || !$gamePlayer) return fail("gameUnavailable");
        if (name === "a16") {
            const conflict = a16Conflict(); if (conflict) return fail(conflict.reason, { hint: conflict.hint });     // 移動する前に断る(何も変えない)
            const invalid = checkA16Options(options); if (invalid) return invalid;
            if (options.stage !== false && stage()) return startA16Stage(options);
        } else if (!["none", "idle"].includes(stageState())) return fail("stageActive", { hint: "SOUL専用ステージにいます。先に ProjectRSoulSandbox.stop() で元のマップへ戻ってから" });
        if (inArena() && sceneReady()) return run(name, options);
        // アリーナの外: 移動してから、到着後に続きを実行する(Scene_Map.update で待つ)
        runtime.job = { name, options, waited: 0 };
        const moved = arena().enter();
        if (!moved.ok) { runtime.job = null; return fail("enterFailed", { hint: String(moved.reason) }); }
        say("[SoulSandbox] アリーナへ移動中… 到着すると自動で準備します。");
        return { ok: true, pending: true, scenario: name };
    };

    if (typeof Scene_Map !== "undefined") {
        const _update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            const result = _update.apply(this, arguments);
            const job = runtime.job;
            if (job && job.stage && stageState() === "idle") {                                  // ステージへの移動が取り消された・時間切れ
                runtime.job = null;
                say("[SoulSandbox] SOUL専用ステージへ移動できませんでした(" + (stage()?.getState?.()?.lastReason || "?") + ")。何も変更していません。");
            } else if (job && (job.stage ? (stage()?.isActive?.() && mapIs(stage().STAGE_MAP_ID)) : inArena()) && sceneReady() && ++job.waited >= 3) {
                runtime.job = null;
                try {
                    const result = run(job.name, job.options);
                    if (result && result.ok === false && job.stage) stage().leave("a16:" + result.reason);      // 準備に失敗したら、元のマップへ戻る
                } catch (error) { fail("exception", { hint: String(error?.message || error) }); if (job.stage) stage()?.leave?.("a16:exception"); }
            }
            if (runtime.decoys.length) { try { updateDecoys(); } catch (_error) { /* 診断用の機能 */ } }
            return result;
        };
    }

    const restart = () => (runtime.scenario ? start(runtime.scenario) : fail("notStarted", { hint: "先に start()" }));
    const profile = id => {
        if (!dodge().isActive()) return fail("aiInactive", { hint: "回避AIのシナリオを start() してから" });
        const result = dodge().setProfile(id);
        if (!result.ok) return fail("profileFailed", { hint: `${result.reason}(${dodge().listProfiles().join(" / ")})` });
        say(`[SoulSandbox] 回避AIの性格を ${id} に切り替えました。`);
        return result;
    };

    // ---- 状態表示 ----
    const status = () => {
        const s = soul().getState(), d = dodge().getState(), p = poc().getState(), blocked = soul().getBlockedCounts?.() || {};
        const result = { active: !!s.active, scenario: runtime.scenario, phase: s.state, round: s.round, secondsLeft: s.active ? +s.secondsLeft.toFixed(1) : null, decoys: runtime.decoys.length };
        if (s.active && p?.active) {
            result.heart = { x: +p.hitCenter.x.toFixed(2), y: +p.hitCenter.y.toFixed(2), hp: p.hp, damageTaken: Number.isFinite(runtime.hp0) ? runtime.hp0 - p.hp : null };
        }
        result.dodge = d.active ? {
            state: d.state, profile: d.profile, boss: d.boss, phase: d.phase, hits: d.stats.hitsTaken, misses: d.stats.passed, dodges: d.stats.dodges, noticed: d.stats.noticed,
            skippedCooldown: d.stats.skippedCooldown, skippedRecovery: d.stats.skippedRecovery, skippedFrequency: d.stats.skippedFrequency, noRoom: d.stats.noRoom, noImprovement: d.stats.noImprovement,
            cancels: d.stats.cancels, redirects: d.stats.redirects, baited: d.stats.baited, meleeCues: d.stats.meleeCues, hitReactions: d.stats.hitReactions, exhaustions: d.stats.exhaustions, staggers: d.stats.staggers,
            cooldownLeft: d.cooldownLeft, recoveryLeft: d.recoveryLeft, threats: d.threats.length, selectedThreat: d.selectedThreat, dodgeReason: d.dodgeReason, lastDodge: d.lastDodge, lastEval: d.lastEval, feintActive: d.feintActive
        } : { state: "off" };
        result.blocked = { ...blocked };
        if (stage()) {
            const st = stage().getState(), heart = stage().getPlayerHeart();
            result.stage = { state: st.state, viewport: (({ x, y, w, h }) => ({ x, y, w, h }))(stage().getViewport()), playerSpritesHidden: st.hiddenPlayerSprites, mapped: st.mapped,
                playerHeart: heart.active ? { x: Math.round(heart.x), y: Math.round(heart.y), inBox: heart.inBox } : null, returnPoint: st.returnPoint };
            if (st.state !== "idle") say("  専用ステージ: 状態=" + st.state + "  戦闘エリア(16:9) " + result.stage.viewport.w + "x" + result.stage.viewport.h + "  戻り先: マップ" + (st.returnPoint ? st.returnPoint.mapId + "(" + st.returnPoint.x + "," + st.returnPoint.y + ")" : "?"));
        }
        say(`[SoulSandbox] シナリオ=${runtime.scenario || "なし"}  フェーズ=${result.phase}${s.active ? ` 残り${result.secondsLeft}s ラウンド${result.round}` : ""}`);
        if (result.heart) say(`  ハート: 位置(${result.heart.x}, ${result.heart.y})  HP ${result.heart.hp}  累計ダメージ ${result.heart.damageTaken}`);
        if (d.active) {
            say(`  回避AI: 状態=${d.state}  性格=${d.profile || "(個別設定)"}${d.boss ? `  ボス=${d.boss} フェーズ=${d.phase}` : ""}  クールダウン${d.cooldownLeft} 硬直${d.recoveryLeft}`,
                `  戦績: 当たり(被弾)${d.stats.hitsTaken} / 外れ(避けた・通り過ぎた)${d.stats.passed} / 回避${d.stats.dodges}回 / 気づいた${d.stats.noticed}`,
                `  見送り: クールダウン${d.stats.skippedCooldown} 硬直${d.stats.skippedRecovery} 頻度${d.stats.skippedFrequency} 余白なし${d.stats.noRoom} 改善なし${d.stats.noImprovement}`,
                `  手がかり: 近接${d.stats.meleeCues} 取り消し${d.stats.cancels} 向き変更${d.stats.redirects} 釣られた${d.stats.baited} / 被弾後の退避${d.stats.hitReactions} 息切れ${d.stats.exhaustions} 怯み${d.stats.staggers}`,
                `  いま見えている脅威: ${d.threats.length}個${d.selectedThreat ? `  選んだ脅威=${d.selectedThreat.tag}(あと${d.selectedThreat.timeToHit}frame・危険${d.selectedThreat.count}個)` : ""}`);
            if (d.lastDodge) say(`  直近の回避: 理由=${d.lastDodge.reason}  ${d.lastDodge.threat || "(脅威なし)"}  ${d.lastDodge.distance}マス  危険 ${d.lastDodge.dangerBefore ?? "-"}→${d.lastDodge.danger}`);
        } else say("  回避AI: off");
        say(`  遮断(防御/移動カード/奥義/ホットバー): ${blocked.card || 0}/${blocked.movement || 0}/${blocked.ultimate || 0}/${blocked.hotbar || 0}`);
        if (runtime.a16) {
            const info = apolloTest().deckInfo(), bfs = bossFramework().getState?.();
            result.a16 = { bossId: runtime.a16.bossId, level: runtime.a16.level, deck: runtime.a16.deck, deckSize: info.size, deckValid: info.valid, rings: info.rings, hand: handIdsNow(),
                boss: bfs ? { hp: bfs.hp, maxHp: bfs.maxHp, phase: bfs.phase.id, phaseLabel: bfs.phase.label } : null, sessions: [...root.ProjectRCombatSession.sources()],
                dummiesParked: !!runtime.parked, a16BossTestActive: !!root.ProjectRBossTest?.getState?.() };
            const a = result.a16;
            say("  A16: デッキ" + a.deck + "(" + a.deckSize + "枚・" + (a.deckValid ? "有効" : "無効") + ") Lv" + a.level + "  指輪 Apollo=" + a.rings.apollo + " Hermes=" + a.rings.hermes,
                "  手札: " + a.hand.join(" / "),
                a.boss ? "  ボス(" + a.bossId + "): HP " + a.boss.hp + "/" + a.boss.maxHp + "  " + a.boss.phaseLabel + "(" + a.boss.phase + ")" : "  ボス: (終了)",
                "  セッション: " + a.sessions.join(", "));
        }
        return result;
    };

    // ---- 1コマンドの後始末 ----
    const stop = (options = {}) => {
        if (!isPlaytest()) return { ok: false, reason: "notPlaytest" };
        const result = { ok: true, steps: [] };
        runtime.job = null;
        if (runtime.a16) { const done = finishA16("stop"); result.steps.push(...done.steps); if (!done.ok) result.ok = false; }
        try { if (clearDecoys()) result.steps.push("デコイ矢を消去"); } catch (_error) { /* noop */ }
        try { if (soul()?.isActive?.()) { soul().end("sandbox"); result.steps.push("SOUL戦闘を終了"); } } catch (error) { result.ok = false; result.steps.push("SOUL終了で例外: " + error.message); }
        try { if (dodge()?.disarm?.()) result.steps.push("回避AIを解除"); } catch (_error) { /* noop */ }
        try { if (restoreDummies()) result.steps.push("敵ダミーを元の位置へ"); } catch (_error) { /* noop */ }
        try { if (restoreWeapon()) result.steps.push("武器・弾薬を元へ"); } catch (_error) { /* noop */ }
        try {
            if (!["none", "idle"].includes(stageState())) {                                     // SOUL専用ステージにいる: 元のマップ・座標へ戻る(アリーナの退出は使わない)
                const left = stage().leave("stop");
                if (left.ok && !left.already) result.steps.push("ステージから元のマップへ戻る");
                if (!left.ok) { result.ok = false; result.steps.push("ステージから戻れません(" + left.reason + ")"); }
            } else if (!inArena() && !arena().status?.().inTransferRoom) {
                result.steps.push("アリーナにもステージにもいません(移動はしません)");        // 例: 専用ステージの戦闘が終わって、既に元のマップへ戻った後
            } else if (options.exit === false) { arena().endTest(); result.steps.push("カード戦闘を終了(アリーナには残る)"); }
            else { arena().exit(); result.steps.push("アリーナから退出(カード戦闘の終了と所持データの復元を含む)"); }
        } catch (error) { result.ok = false; result.steps.push("アリーナ終了で例外: " + error.message); }
        runtime.scenario = null; runtime.hp0 = null;
        say("[SoulSandbox] 終了: " + result.steps.join(" / "));
        return result;
    };

    const help = () => {
        say("[SoulSandbox] コマンド一覧",
            "  ProjectRSoulSandbox.start(\"シナリオ\")  シナリオ: " + Object.keys(SCENARIOS).join(" / "),
            "  ProjectRSoulSandbox.start(\"a16\")  A16統合: SOUL専用ステージで 混成30枚デッキ + SOULボス(勝利か stop() で元のマップへ戻る。start(\"a16\", { stage: false }) で従来のアリーナ)",
            "  ProjectRSoulSandbox.status()   restart()   profile(\"evasive\")   volley(5)   feint(\"cancel\"|\"redirect\")   weapon(\"sword\"|\"gun\"|\"keep\")   stop()   help()");
        return Object.keys(SCENARIOS);
    };

    root.ProjectRSoulSandbox = Object.freeze({ SCENARIOS: Object.keys(SCENARIOS), STAGE, start, restart, status, stop, weapon, help, profile, volley, feint, scenario: () => runtime.scenario, decoyCount: () => runtime.decoys.length });
})();
