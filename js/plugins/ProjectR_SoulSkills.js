/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘のスキル(承認済み9枚): 絶・サイコポンポス・葦笛・エロスの矢・神託・竪琴・ヴェイル・月桂冠・ヒュアキントス。SOUL戦闘の間・ATTACKだけ。通常のマップ戦闘は変えません。
 * @author ProjectR
 * @base ProjectR_SoulBattle
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardModifiers
 * @orderAfter ProjectR_SoulBattleInput
 * @orderAfter ProjectR_SoulBattleStage
 * @orderAfter ProjectR_SoulBattleDodge
 * @orderAfter ProjectR_ApolloLyreRhythm
 * @orderAfter ProjectR_ApolloErosArrow
 * @orderAfter ProjectR_HermesZetsu
 * @orderAfter ProjectR_HermesVeil
 *
 * @help
 * ProjectR_SoulSkills.js
 *
 * SOUL戦闘(ProjectRSoulBattle が動いている間)だけ、次の9枚のカードの効果を「敵ハート1つ・ATTACK/DEFENSEのターン制」用に置き換えます。
 * 通常のマップ戦闘・通常のカード戦闘では、元のカードの効果・数値は一切変わりません(このプラグインは SOUL が動いていない間は何もしません)。
 * 承認元: docs/spece/ProjectR_SOUL戦闘_スキル再設計テンプレート_20261106.xlsx(絶・サイコポンポス・葦笛・エロスの矢・神託(コメントの修正案)・竪琴)
 *          docs/spece/ProjectR_SOUL戦闘_未承認3スキル再提案_20261106.xlsm(ヴェイル・月桂冠・ヒュアキントス。L列=承認)
 *
 * 【共通の規則】
 *   ・発動できるのは ATTACK の間だけ(DEFENSEは ProjectR_SoulBattle がカードを遮断)。
 *   ・スキルの効果は ATTACK が終わる時にすべて解除(DEFENSEへ持ち越さない)。SOULの終了・中断でも同じ。残った魂などは先に清算します。
 *   ・カードの消費・Cooldown・手札・デッキ・ダメージ式・セーブには触れません。元のカードの発動の検証(消費の確定)は同じ経路で、効果だけを差し替えます。
 *   ・敵への状態異常(停止・減速・反応の遅れ)は、敵ハートの回避AI(ProjectR_SoulBattleDodge の setModifier)へ。AIの観測・評価・必中化はしません。
 *
 * 【各カード(SOUL)】  Lvは累積
 *   絶        ATTACK専用の「構え」。移動しない。0.8秒以内の最初の通常武器の命中ダメージ ×1.5 / ×2.0 / ×3.0。Lv3は1秒間、通常武器の攻撃間隔が半分。
 *             Cooldown 6秒(SOUL中だけ)。通常武器(剣・銃)が無ければ使えない(カード非消費)。移動カードの遮断は他のカード(高速移動)にそのまま残ります。
 *   サイコポンポス  使用後10秒間、敵ハートにダメージが当たるたびに魂が1つ(最大3つ)。カーソルを重ねるか2秒で回収し、プレイヤーHP +50/+100/+150。
 *             Lv3は回収から3秒間 攻撃力+3%(重ね掛け・3秒へ更新)。ATTACKが終わる時、残った魂は自動回収。
 *   葦笛      カーソル中心の半径8マスに敵ハートがいれば、4秒間(ボスは2秒)回避AIが停止。ダメージを受けると起きる。Lv2: 眠っている間の最初の攻撃 +50。Lv3: その攻撃は確定クリティカル。
 *   エロスの矢  元の矢・ビームのまま。敵ハートに当てた矢1本ごとにプレイヤーHP +5(1回の使用で最大50 / Lv2以降100)。Lv3のビームは 100HP/秒。追尾は敵ハートのみ。
 *   神託      ATTACKの時間を3秒止める(敵ハートの動き・自分の攻撃の動きがすべて止まる)。停止中に放った弾は解除後に弾速+20%(Lv2〜)。
 *             Lv2〜: 解除後3秒、通常武器の攻撃間隔も20%短い(近接の弾速の読み替え)。Lv3: 解除後3秒、クリティカル率 +30ポイント。ATTACKが終わる時は必ず解除。
 *   竪琴      元のリズム入力(左クリック)のまま。「速度」の音符はカードのCooldown短縮(−10%・8秒)。「全部同じ音符」は効果量×1.5(画面全体は廃止)。敵(病)は敵ハート。
 *   ヴェイル    カーソルに追従する魔法陣(半径5・5秒)。中の敵ハートは攻撃の予兆への反応が6フレーム遅れる。Lv2: 移動速度 −15%。Lv3: 魔法陣の中の敵ハートへの攻撃のクリティカル率 +15ポイント(最終50%まで)。
 *   月桂冠      カーソル地点に半径5の根(7秒・固定)。敵ハートが中にいる間、プレイヤーHP 毎秒+20(1使用最大100)。Lv2: 毎秒30ダメージ・移動速度 −15%。Lv3: 移動速度の低下は −25%(置換)。
 *   ヒュアキントス  使用後3秒(Lv3は5秒)以内の最初の命中で、命中地点に花(8秒・半径2。Lv2〜は3)。花の中での追加命中ごとにプレイヤーHP +10/+15/+20(1使用最大80/100/120)。
 *
 * 公開API: ProjectRSoulSkills
 *   CARDS / TUNE / owns(cardId) / isActive() / getEffects() / getState() / endAll(reason)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const VERSION = "0.1.0";
    const deck = root.ProjectRCardDeck;
    if (!deck || typeof Game_Map === "undefined") return;
    const CARDS = Object.freeze({ zetsu: "hermes_zetsu", psychopomp: "hermes_psychopomp", reed: "hermes_reed_flute", eros: "apollo_eros_arrow", oracle: "apollo_oracle",
        lyre: "apollo_lyre_rhythm", veil: "hermes_veil", laurel: "apollo_laurel_wreath", hyacinth: "apollo_hyacinthus" });
    // 効果を差し替えるカード(元の効果を実行しない)。エロスの矢・竪琴は元の効果のまま、命中フック/アダプタで SOUL 用の部分だけ変える。
    const REPLACED = Object.freeze([CARDS.zetsu, CARDS.psychopomp, CARDS.reed, CARDS.oracle, CARDS.veil, CARDS.laurel, CARDS.hyacinth]);
    const FPS = 60;
    // 承認済みの数値(Lv1/Lv2/Lv3の配列は添字=Lv-1)。回復量・時間・Cooldown・上限はスプレッドシートのとおり。
    const TUNE = Object.freeze({
        zetsu: Object.freeze({ cooldownSeconds: 6, multipliers: [1.5, 2, 3], windowSeconds: 0.8, speedSeconds: 1, speedScale: 2 }),
        psychopomp: Object.freeze({ seconds: 10, maxSouls: 3, autoCollectFrames: 2 * FPS, collectTiles: 1.2, heal: [50, 100, 150], buffRate: 0.03, buffFrames: 3 * FPS }),
        reed: Object.freeze({ radiusTiles: 8, seconds: 4, bossSeconds: 2, bonus: [0, 50, 50] }),
        eros: Object.freeze({ healPerArrow: 5, caps: [50, 100, 100], beamHealPerSecond: 100, beamTickSeconds: 0.1 }),
        oracle: Object.freeze({ stopSeconds: 3, boostRate: 1.2, boostSeconds: 3, critPoints: 0.3 }),
        lyre: Object.freeze({ cooldownCut: 0.1, wideBoost: 1.5, maxCut: 0.5 }),
        veil: Object.freeze({ radiusTiles: 5, seconds: 5, reactionDelay: 6, slow: 0.85, critPoints: 0.15, critCap: 0.5 }),
        laurel: Object.freeze({ radiusTiles: 5, seconds: 7, healPerSecond: 20, healCap: 100, dotPerSecond: 30, slow: [1, 0.85, 0.75] }),
        hyacinth: Object.freeze({ accept: [3, 3, 5], bloomSeconds: 8, radius: [2, 3, 3], heal: [10, 15, 20], caps: [80, 100, 120] })
    });
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const api = name => { try { const t = root[name]; return t && (typeof t === "object" || typeof t === "function") ? t : null; } catch (_error) { return null; } };
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    // ---------------------------------------------------------------- 状態(実行時だけ。セーブしない) ----------------------------------------------------------------
    const rt = { wall: 0, clock: 0, effects: [], ownPause: false, hookOn: false, defs: null, pendingSoul: null, serial: 0, lastEnd: null, stats: { activations: 0, ends: 0, heals: 0, healed: 0 }, log: [] };
    const note = entry => { rt.log.push(entry); if (rt.log.length > 80) rt.log.shift(); };
    const soulActive = () => !!safe(() => api("ProjectRSoulBattle")?.isActive?.(), false);
    const phase = () => safe(() => api("ProjectRSoulBattle")?.getPhase?.(), null);
    const attacking = () => soulActive() && phase() === "attack";
    // 準備ループ(prepare:true)の SOUL か。マナ制(L4-B)のときだけ、クールダウンに頼らない規則(重ね掛けの防止・竪琴の割引)を使う。従来の攻撃⇄防御は今までどおり。
    const loopMode = () => !!safe(() => api("ProjectRSoulBattle")?.getState?.().prepare, false);
    let loopSeen = false;                                   // この SOUL が準備ループだったか(onEnd の時点ではコントローラは idle で prepare を読めないので、実行中に覚える)
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const levelOf = cardId => {
        try {
            const def = deck.definitions?.card?.(cardId), saved = Number.parseInt(deck.getPersistentData?.().cardOwnership?.[cardId]?.level, 10);
            return clamp(Number.isFinite(saved) ? saved : 1, 1, def?.maxLevel || 3);
        } catch (_error) { return 1; }
    };
    const heartId = () => safe(() => api("ProjectRSoulBattle")?.getState?.().heart?.eventId, null);
    const heartPos = () => { const c = safe(() => api("ProjectRSoulBattlePoC")?.getState?.()?.hitCenter, null); return c && Number.isFinite(c.x) && Number.isFinite(c.y) ? { x: c.x, y: c.y } : null; };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    // 攻撃の起点(マウスカーソルのタイル座標)。専用ステージ = 遊べる範囲へ収めた点。アリーナ = 画面上のカーソルのマップ座標。
    const cursorPoint = () => {
        const stage = api("ProjectRSoulStage");
        if (stage?.isActive?.()) { const c = safe(() => stage.getAttackCursor(), null); if (c && Number.isFinite(c.x)) return { x: c.x, y: c.y }; }
        const m = map();
        if (m && typeof TouchInput !== "undefined" && Number.isFinite(TouchInput.x)) return { x: m.canvasToMapX(TouchInput.x), y: m.canvasToMapY(TouchInput.y) };
        return heartPos();
    };
    const healPlayer = amount => {
        const actor = safe(() => $gameParty.leader(), null);
        if (!actor || !(amount > 0) || !(actor.hp > 0)) return 0;
        const applied = Math.min(Math.round(amount), Math.max(0, actor.mhp - actor.hp));
        if (applied > 0) { actor.gainHp(applied); rt.stats.heals++; rt.stats.healed += applied; }
        return applied;
    };
    const dodge = () => api("ProjectRSoulBattleDodge");
    const modifiers = () => api("ProjectRCardModifiers");
    const setScale = value => { for (const name of ["ProjectRSwordSystem", "ProjectRGunSystem"]) safe(() => api(name)?.setCooldownScale?.(value)); };

    // ---------------------------------------------------------------- 演出(表示だけ): 見えない錨Eventの位置で既存のVFXを再生する ----------------------------------------------------------------
    const ensureKey = (key, base, patch) => {
        const vfx = api("ProjectRPresentationVfx");
        if (!vfx || vfx.mapping?.(key)) return !!vfx?.mapping?.(key);
        const def = vfx.mapping?.(base);
        if (!def) return false;
        vfx.register?.(key, { ...def, ...patch });
        return true;
    };
    const vfxAt = (key, point, context = {}) => {
        try {
            const visual = api("ProjectRGodSummonVisual"), vfx = api("ProjectRPresentationVfx");
            if (!visual || !vfx || !point) return null;
            const anchor = visual.spawnAnchor?.({ x: point.x, y: point.y }, { cardId: "soul_skills" });
            if (!anchor?.ok) return null;
            const played = vfx.play(key, { eventId: anchor.eventId, ...context });
            const handle = { id: anchor.id, eventId: anchor.eventId, note: played?.note || null,
                move: p => { try { visual.moveFollower?.(anchor.id, p); } catch (_error) { /* 表示のみ */ } },
                stop: () => { try { if (handle.note) vfx.stop?.(handle.note); } catch (_error) { /* 表示のみ */ } try { visual.removeAnchor?.(anchor.id); } catch (_error) { /* 表示のみ */ } } };
            return handle;
        } catch (_error) { return null; }
    };
    const flash = (key, point, frames = 40, context = {}) => { const h = vfxAt(key, point, context); if (h) rt.effects.push({ kind: "vfx", expire: rt.wall + frames, handle: h }); return h; };

    // ---------------------------------------------------------------- 効果の登録・解除 ----------------------------------------------------------------
    const add = effect => { effect.serial = ++rt.serial; effect.born = rt.clock; rt.effects.push(effect); return effect; };
    const find = kind => rt.effects.find(e => e.kind === kind && !e.done);
    const finish = (effect, reason) => {
        if (effect.done) return;
        effect.done = true;
        try { END[effect.kind]?.(effect, reason); } catch (error) { note({ type: "endError", kind: effect.kind, message: String(error?.message || error) }); }
        try { effect.handle?.stop?.(); } catch (_error) { /* 表示のみ */ }
    };
    const endAll = reason => {
        const had = rt.effects.length > 0;
        for (const e of [...rt.effects]) finish(e, reason);
        rt.effects.length = 0;
        // 共有の窓口に残した物を、必ず元へ戻す(効果ごとの解除が失敗しても)
        safe(() => modifiers()?.clearWeaponHitBonus?.("soulAttackEnd"));
        safe(() => dodge()?.clearModifiers?.());
        setScale(1);
        releasePause("attackEnd");
        safe(() => api("ProjectRApolloLyreRhythm")?.clear?.("soulAttackEnd"));
        // ストレングスの蓄え(準備ループのみ): 使われなかった強化は ATTACK の終了で捨てる(DEFENSE・PREPARE・次の ATTACK へ持ち越さない。新しい持続時間は作らない)
        if (loopMode() || loopSeen) { const dropped = safe(() => api("ProjectRHermesStrength")?.clear?.("soulAttackEnd:" + reason), false); if (dropped) { rt.stats.strengthDropped = (rt.stats.strengthDropped || 0) + 1; note({ type: "strengthDropped", reason }); } }
        // 飛行中の矢・ビーム・疫病の地面の円(準備ループのみ): ATTACK の終了で打ち切る。残すと DEFENSE の間もハートへダメージ・状態付与が続く(消費は発射時に確定済みで返金しない)
        if (loopMode() || loopSeen) {
            for (const name of ["ProjectRApolloErosArrow", "ProjectRApolloPlagueRain"]) {
                const dropped = safe(() => api(name)?.clear?.("soulAttackEnd:" + reason), false);
                if (dropped) { rt.stats.attacksDropped = (rt.stats.attacksDropped || 0) + 1; note({ type: "attackDropped", name, reason }); }
            }
        }
        // 敵ハート・プレイヤーに付いた SOUL のカードの状態(ギガース殺しの弱体/出血・疫病・竪琴の強化/病など)も、ATTACK の終了で外す(準備ループのみ)。
        // 外さないと、時間が残ったまま DEFENSE へ(出血の継続ダメージ)・PREPARE の凍結を経て次の ATTACK へ持ち越される。
        if (loopMode() || loopSeen) {
            const status = api("ProjectRApolloStatus");
            if (status && typeof status.list === "function" && typeof status.remove === "function") {
                const hid = heartId(), keys = ["player"];
                if (hid) keys.push(status.targetKeyOfEvent(hid));
                for (const key of keys) for (const e of safe(() => status.list(key), []) || []) { if (safe(() => status.remove(key, e.id, "soulAttackEnd"), false)) rt.stats.statusDropped = (rt.stats.statusDropped || 0) + 1; }
            }
        }
        if (had) { rt.stats.ends++; rt.lastEnd = { reason, wall: rt.wall }; note({ type: "endAll", reason }); }
        return had;
    };

    // ---------------------------------------------------------------- 時間停止(神託): Hendrix の eventsPaused を使う(ProjectRのすべての更新がこれを見る) ----------------------------------------------------------------
    const takePause = () => { const m = map(); if (!m || rt.ownPause) return false; if (m.eventsPaused) return false; m.eventsPaused = true; rt.ownPause = true; return true; };
    const releasePause = reason => { const m = map(); if (!rt.ownPause) return false; rt.ownPause = false; if (m) m.eventsPaused = false; note({ type: "pauseRelease", reason }); return true; };
    const PROJECTILE_TAG = /<projectR(?:Golden|Eros|Gigas|Plague)Arrow>|<projectRGunBullet>|<projectRGoldenVolley>|<projectRNormalSword>|<projectRHermesSword>/;

    // ---------------------------------------------------------------- 各カードの発動後の処理 ----------------------------------------------------------------
    const START = {
        zetsu(p) {
            const T = TUNE.zetsu, level = p.level, mult = T.multipliers[level - 1];
            const armed = modifiers()?.armWeaponHitBonus?.({ id: "hermes_zetsu_soul", multiplier: mult, seconds: T.windowSeconds, source: CARDS.zetsu });
            if (armed && armed.ok === false) return { ok: false, reason: armed.reason };
            if (level >= 3) {
                setScale(T.speedScale);
                const running = find("zetsuSpeed");                                   // 構えは重ねない: 動作中の速度の強化があれば、新しく足さず時間を更新するだけ(解除の二重化を防ぐ)
                if (running) running.expireClock = rt.clock + Math.round(T.speedSeconds * FPS);
                else add({ kind: "zetsuSpeed", expireClock: rt.clock + Math.round(T.speedSeconds * FPS) });
            }
            const at = cursorPoint();
            if (at && ensureKey("soul_zetsu.noise", "hermes_zetsu.departure", { anchor: "event", noLibrary: true })) flash("soul_zetsu.noise", at, 40);
            return { ok: true, multiplier: mult };
        },
        psychopomp(p) {
            const T = TUNE.psychopomp;
            const old = find("psychopomp"); if (old) finish(old, "replaced");
            add({ kind: "psychopomp", level: p.level, expireClock: rt.clock + T.seconds * FPS, souls: [], spawned: 0, stacks: 0, buffUntil: 0 });
            return { ok: true };
        },
        reed(p) {
            const T = TUNE.reed, d = dodge(), center = cursorPoint(), heart = heartPos();
            flash(ensureKey("soul_flute.ripple", "hermes_flute.ripple", { anchor: "event", noLibrary: true }) ? "soul_flute.ripple" : "hermes_flute.ripple", center, 50);
            const old = find("reed"); if (old) finish(old, "replaced");
            if (!center || !heart || !d || dist(center, heart) > T.radiusTiles) return { ok: true, hit: false };          // 範囲外: 効果なしでカードは消費
            const boss = !!safe(() => d.getState?.().boss, null);
            const seconds = boss ? T.bossSeconds : T.seconds;
            d.setModifier("soul_reed", { frozen: true });
            add({ kind: "reed", level: p.level, expireClock: rt.clock + Math.round(seconds * FPS), seconds, boss });
            return { ok: true, hit: true, seconds, boss };
        },
        oracle(p) {
            const T = TUNE.oracle, old = find("oracle"); if (old) finish(old, "replaced");
            if (!takePause() && !rt.ownPause) return { ok: true, stopped: false };
            const known = new Set((map()?.events() || []).filter(Boolean).map(e => e.eventId()));
            add({ kind: "oracle", level: p.level, endWall: rt.wall + Math.round(T.stopSeconds * FPS), known, tracked: [] });
            return { ok: true, stopped: true };
        },
        veil(p) {
            const T = TUNE.veil, old = find("veil"); if (old) finish(old, "replaced");
            const at = cursorPoint() || heartPos();
            const e = add({ kind: "veil", level: p.level, expireClock: rt.clock + T.seconds * FPS, center: at, inside: false });
            if (at) e.handle = vfxAt("hermes_veil.circle", at, { radiusTiles: T.radiusTiles, instance: e.serial }) || null;
            return { ok: true };
        },
        laurel(p) {
            const T = TUNE.laurel, old = find("laurel"); if (old) finish(old, "replaced");
            const at = cursorPoint() || heartPos();
            const e = add({ kind: "laurel", level: p.level, expireClock: rt.clock + T.seconds * FPS, center: at, healed: 0, acc: 0, dotAcc: 0, inside: false });
            if (at) { e.handle = vfxAt("apollo_laurel.zone", at, { radiusTiles: T.radiusTiles }) || null; flash("apollo_laurel.burst", at, 40); }
            return { ok: true };
        },
        hyacinth(p) {
            const T = TUNE.hyacinth, old = find("hyacinth"); if (old) finish(old, "replaced");
            add({ kind: "hyacinth", level: p.level, acceptUntil: rt.clock + T.accept[p.level - 1] * FPS, bloom: null, healed: 0, hits: 0 });
            return { ok: true };
        }
    };
    const END = {
        zetsuSpeed() { setScale(1); },
        psychopomp(e, reason) { for (const s of [...e.souls]) collectSoul(e, s, reason); },
        reed() { safe(() => dodge()?.clearModifier?.("soul_reed")); },
        oracle(e) { releasePause("oracleEnd"); if (e.boost) { setScale(1); } },
        veil() { safe(() => dodge()?.clearModifier?.("soul_veil")); },
        laurel() { safe(() => dodge()?.clearModifier?.("soul_laurel")); },
        hyacinth(e) { e.bloom?.handle?.stop?.(); }
    };
    // 神託の解除: 停止を解き、Lv2以降は解除後の強化(弾速+20%・攻撃間隔)を始める
    const releaseOracle = (e, reason) => {
        if (e.released) return;
        e.released = true;
        releasePause(reason);
        const T = TUNE.oracle;
        if (e.level >= 2) {
            e.boost = { until: rt.clock + Math.round(T.boostSeconds * FPS) };
            setScale(T.boostRate);
            e.prev = new Map();
            for (const ev of e.tracked) if (ev && !ev._erased) e.prev.set(ev, { x: ev._realX, y: ev._realY });
        }
        note({ type: "oracleRelease", reason, tracked: e.tracked.length, boost: !!e.boost });
        if (!e.boost) finish(e, "released");                                                 // Lv1(解除後の強化なし)は、解除と同時に終わる
    };
    const collectSoul = (e, soul, reason) => {
        const i = e.souls.indexOf(soul); if (i < 0) return;
        e.souls.splice(i, 1);
        const T = TUNE.psychopomp;
        healPlayer(T.heal[e.level - 1]);
        if (e.level >= 3) { e.stacks++; e.buffUntil = rt.clock + T.buffFrames; }
        try { soul.handle?.stop?.(); } catch (_error) { /* 表示のみ */ }
        flash("hermes_psychopomp.collect", { x: 0, y: 0 }, 40, { eventId: "player" });
        note({ type: "soulCollected", reason });
    };

    // ---------------------------------------------------------------- 命中フック(SOUL中だけ登録。敵ハートへの命中の前後) ----------------------------------------------------------------
    const HOOK_ID = "soul_skills";
    const hook = {
        prepare(ctx) {
            if (!attacking() || ctx.eventId !== heartId()) return null;
            const out = { flat: 0, forceCritical: false, atkMultiplier: 1, critChanceBonus: 0 };
            let used = false;
            const reed = find("reed");
            if (reed && !reed.woke) { const f = TUNE.reed.bonus[reed.level - 1] || 0; if (f > 0) { out.flat += f; used = true; } if (reed.level >= 3) { out.forceCritical = true; used = true; } }
            const oracle = find("oracle");
            if (oracle && oracle.level >= 3 && oracle.boost) { out.critChanceBonus += TUNE.oracle.critPoints; used = true; }
            const veil = find("veil");
            if (veil && veil.level >= 3 && veil.inside) {
                const natural = safe(() => modifiers().naturalCriticalChance(ctx.eventId), 0) || 0;
                const add = clamp(TUNE.veil.critCap - natural, 0, TUNE.veil.critPoints);
                if (add > 0) { out.critChanceBonus += add; used = true; }
            }
            const pp = find("psychopomp");
            if (pp && pp.stacks > 0 && rt.clock <= pp.buffUntil) { out.atkMultiplier = 1 + TUNE.psychopomp.buffRate * pp.stacks; used = true; }
            void used;
            return out;                                                      // 敵ハートへの命中は常に返す(CardModifiers は prepare が返したフックにだけ finish を呼ぶ)
        },
        finish(ctx, outcome) {
            if (!attacking() || ctx.eventId !== heartId()) return;
            const landed = outcome && (outcome.dealt !== null && outcome.dealt !== undefined ? outcome.dealt > 0 : outcome.landed === true);
            if (!landed) return;
            const reed = find("reed");
            if (reed && !reed.woke) { reed.woke = true; safe(() => dodge()?.clearModifier?.("soul_reed")); finish(reed, "damaged"); }
            const ownDot = ctx.source === CARDS.laurel;
            const pp = find("psychopomp");
            if (pp && !ownDot && pp.spawned < TUNE.psychopomp.maxSouls) {
                const at = heartPos();
                if (at) {
                    pp.spawned++;
                    const soul = { x: at.x, y: at.y, age: 0 };
                    soul.handle = vfxAt("hermes_psychopomp.manifest", at, {}) || null;
                    pp.souls.push(soul);
                }
            }
            const hy = find("hyacinth");
            if (hy && !ownDot) {
                const T = TUNE.hyacinth, at = heartPos();
                if (!hy.bloom && rt.clock <= hy.acceptUntil && at) {
                    const radius = T.radius[hy.level - 1];
                    hy.bloom = { x: at.x, y: at.y, radius, until: rt.clock + Math.round(T.bloomSeconds * FPS) };
                    hy.bloom.handle = vfxAt("apollo_hyacinth.bloom", at, { radiusTiles: radius }) || null;
                    flash("apollo_hyacinth.petals", at, 50);
                } else if (hy.bloom && at && rt.clock <= hy.bloom.until && dist(at, hy.bloom) <= hy.bloom.radius) {
                    const cap = T.caps[hy.level - 1];
                    const room = cap - hy.healed;
                    if (room > 0) { const got = healPlayer(Math.min(T.heal[hy.level - 1], room)); hy.healed += Math.min(T.heal[hy.level - 1], room); hy.hits++; void got; }
                }
            }
            if (ctx.source === CARDS.eros) {
                const T = TUNE.eros, id = String(ctx.attackId || ""), level = levelOf(CARDS.eros);
                if (id.startsWith("erosb:")) healPlayer(T.beamHealPerSecond * T.beamTickSeconds);                       // Lv3のビーム: 100HP/秒(1ティック=0.1秒)
                else if (id.startsWith("eros:")) {
                    const key = id.split(":")[1];
                    rt.eros = rt.eros || {};
                    const total = rt.eros[key] || 0, cap = T.caps[level - 1], give = Math.min(T.healPerArrow, cap - total);
                    if (give > 0) { rt.eros[key] = total + give; healPlayer(give); }
                }
            }
        }
    };
    const registerHook = () => { if (rt.hookOn) return; const m = modifiers(); if (m?.registerHitHook?.(HOOK_ID, hook) === true) rt.hookOn = true; };
    const unregisterHook = () => { if (!rt.hookOn) return; safe(() => modifiers()?.unregisterHitHook?.(HOOK_ID)); rt.hookOn = false; };

    // ---------------------------------------------------------------- SOUL中だけカードの定義を変える(絶: Cooldown 6秒・SOUL専用の構えとして発動可) ----------------------------------------------------------------
    const applyDefs = () => {
        if (rt.defs) return;
        const cards = deck.definitions?.cards;
        if (!(cards instanceof Map)) return;
        const def = cards.get(CARDS.zetsu);
        if (!def) return;
        rt.defs = { id: CARDS.zetsu, original: def };
        // 分類 movement だけを外す(ProjectR_SoulBattle の移動カード遮断の対象から外れる)。ほかの移動カード(高速移動)はそのまま遮断される。
        // 準備ループ(マナ制)では絶のSOUL専用の冷却6秒を撤廃する(元の定義の秒数のまま。使用の判定はマナだけ)。従来の攻撃⇄防御は6秒のまま。
        cards.set(CARDS.zetsu, Object.freeze({ ...def, cooldownSeconds: loopMode() ? def.cooldownSeconds : TUNE.zetsu.cooldownSeconds, category: "special" }));
    };
    const restoreDefs = () => {
        if (!rt.defs) return;
        const cards = deck.definitions?.cards;
        if (cards instanceof Map) cards.set(rt.defs.id, rt.defs.original);
        rt.defs = null;
    };

    // ---------------------------------------------------------------- 発動の窓口(元の発動の検証と消費はそのまま。SOULでは効果を差し替える) ----------------------------------------------------------------
    const soulHandler = (type, previous) => context => {
        const cardId = context?.definition?.cardId;
        if (!REPLACED.includes(cardId) || !soulActive()) return previous ? previous(context) : { ok: true };
        if (phase() !== "attack") { const why = phase() === "prepare" ? "soulPrepare" : "soulDefense"; return { ok: false, reason: why, reasons: [{ code: why }] }; }   // DEFENSE / PREPARE: スキルは発動しない
        const key = Object.keys(CARDS).find(k => CARDS[k] === cardId);
        if (key === "oracle" && loopMode()) {                                                                         // 神託の時間停止は延長しない: 停止中・解除後の強化中の再発動は拒否(何も消費しない)
            const running = find("oracle");
            if (running) return { ok: false, reason: "oracleActive", reasons: [{ code: "oracleActive" }] };
        }
        if (key === "zetsu") {
            const weapon = safe(() => api("ProjectRGunSystem")?.status?.().equipped, false) || !!safe(() => api("ProjectRSwordSystem")?.status?.().weapon, null);
            if (!weapon) return { ok: false, reason: "noWeapon" };                                                      // 倍率の対象になる通常武器が無い: 非消費
        }
        rt.pendingSoul = { cardId, key, level: levelOf(cardId) };
        return { ok: true };
    };
    for (const type of ["ground", "instant", "cursor"]) {
        const previous = deck.getActivationHandler?.(type);
        deck.registerActivationHandler?.(type, soulHandler(type, previous));
    }
    const _requestUseCard = deck.requestUseCard;
    deck.requestUseCard = function() {
        rt.pendingSoul = null;
        if (soulActive()) applyDefs();
        let result;
        try { result = _requestUseCard.apply(this, arguments); }
        catch (error) { rt.pendingSoul = null; throw error; }
        const p = rt.pendingSoul;
        rt.pendingSoul = null;
        if (p && result && result.ok === true && result.cardId === p.cardId) {
            registerHook();
            try { const r = START[p.key](p); rt.stats.activations++; note({ type: "start", card: p.cardId, level: p.level, result: r }); }
            catch (error) { note({ type: "startError", card: p.cardId, message: String(error?.message || error) }); }
        }
        return result;
    };
    // エロスの矢の1回の使用ごとの回復量の記録は、使用のたびに新しく数える(攻撃IDの通し番号 = その使用)
    if (api("ProjectRSoulBattle")?.onPhase) api("ProjectRSoulBattle").onPhase(event => {
        if (event && api("ProjectRSoulBattle")?.getState?.().prepare) loopSeen = true;
        if (event && event.to !== "attack") { endAll("phase:" + event.to); }
        if (event && event.to === "attack") { applyDefs(); registerHook(); rt.eros = {}; if (loopMode()) safe(() => api("ProjectRHermesStrength")?.clear?.("soulAttackStart")); }   // 新しい ATTACK は蓄えなしから(準備ループ)
    });
    if (api("ProjectRSoulBattle")?.onEnd) api("ProjectRSoulBattle").onEnd(() => { endAll("soulEnd"); loopSeen = false; unregisterHook(); restoreDefs(); rt.eros = {}; });

    // ---------------------------------------------------------------- 毎フレーム(Game_Map.update の後) ----------------------------------------------------------------
    const UPDATE = {
        zetsuSpeed(e) { if (rt.clock >= e.expireClock) finish(e, "expired"); },
        psychopomp(e) {
            const T = TUNE.psychopomp, cursor = cursorPoint();
            for (const soul of [...e.souls]) {
                soul.age++;
                if (soul.age >= T.autoCollectFrames || (cursor && dist(cursor, soul) <= T.collectTiles)) collectSoul(e, soul, soul.age >= T.autoCollectFrames ? "auto" : "cursor");
            }
            if (rt.clock >= e.expireClock && !e.souls.length) finish(e, "expired");
            else if (e.stacks && rt.clock > e.buffUntil) e.stacks = 0;
        },
        reed(e) { if (rt.clock >= e.expireClock) { safe(() => dodge()?.clearModifier?.("soul_reed")); finish(e, "expired"); } },
        veil(e) {
            const T = TUNE.veil, heart = heartPos(), cursor = cursorPoint();
            if (cursor) { e.center = cursor; e.handle?.move?.(cursor); }
            e.inside = !!(heart && e.center && dist(heart, e.center) <= T.radiusTiles);
            const d = dodge();
            if (e.inside) d?.setModifier?.("soul_veil", { reactionDelay: T.reactionDelay, speedScale: e.level >= 2 ? T.slow : 1 }); else d?.clearModifier?.("soul_veil");
            if (rt.clock >= e.expireClock) finish(e, "expired");
        },
        laurel(e) {
            const T = TUNE.laurel, heart = heartPos(), d = dodge();
            e.inside = !!(heart && e.center && dist(heart, e.center) <= T.radiusTiles);
            if (e.inside) {
                e.acc += T.healPerSecond / FPS;
                const whole = Math.floor(e.acc);
                if (whole >= 1) { e.acc -= whole; const room = T.healCap - e.healed; if (room > 0) { const give = Math.min(whole, room); healPlayer(give); e.healed += give; } }
                if (e.level >= 2) {
                    d?.setModifier?.("soul_laurel", { speedScale: T.slow[e.level - 1] });
                    e.dotAcc += T.dotPerSecond / FPS;
                    if (e.dotAcc >= T.dotPerSecond / 2) { const dmg = Math.round(e.dotAcc); e.dotAcc = 0; dealDot(dmg); }       // 0.5秒ごと(1秒に30ダメージ)
                }
            } else d?.clearModifier?.("soul_laurel");
            if (rt.clock >= e.expireClock) finish(e, "expired");
        },
        hyacinth(e) {
            if (e.bloom) {
                if (rt.clock >= e.bloom.until) { e.bloom.handle?.stop?.(); e.bloom.handle = null; finish(e, "bloomExpired"); }
            } else if (rt.clock > e.acceptUntil) finish(e, "noHit");
        },
        vfx(e) { if (rt.wall >= e.expire) finish(e, "expired"); }
    };
    const dealDot = amount => {
        const id = heartId();
        if (!id || !(amount > 0)) return;
        const run = () => { const interpreter = new Game_Interpreter(); interpreter._eventId = 0;
            PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: `-${amount}`, exceedMaxHealth: "false", projectRFixed: { base: amount, flat: 0, critical: false, source: CARDS.laurel } }); };
        const gauge = api("ProjectRUltimateGauge");
        if (typeof gauge?.trackDamage === "function") gauge.trackDamage(id, { attackId: "soul:laurel:" + rt.serial, source: "damage:apollo_laurel_wreath" }, run); else run();
    };
    // 神託の更新(停止の残り・解除・解除後の弾速+20%)
    const updateOracle = e => {
        if (!e.released) {
            for (const ev of map()?.events?.() || []) {
                if (!ev || ev._erased || e.known.has(ev.eventId())) continue;
                e.known.add(ev.eventId());
                if (PROJECTILE_TAG.test(String(ev.event?.()?.note || ""))) e.tracked.push(ev);               // 停止中に放った弾・斬撃
            }
            if (rt.wall >= e.endWall) releaseOracle(e, "expired");
            return;
        }
        if (e.boost) {
            if (e.level >= 2 && e.prev) {
                for (const ev of [...e.prev.keys()]) {
                    if (!ev || ev._erased || map()?.event?.(ev.eventId()) !== ev) { e.prev.delete(ev); continue; }
                    const p = e.prev.get(ev), dx = ev._realX - p.x, dy = ev._realY - p.y;
                    if (dx !== 0 || dy !== 0) { const rate = TUNE.oracle.boostRate - 1; try { ev.setPosition(ev._realX + dx * rate, ev._realY + dy * rate); } catch (_error) { /* 動かせなければそのまま */ } }
                    e.prev.set(ev, { x: ev._realX, y: ev._realY });
                }
            }
            if (rt.clock >= e.boost.until) { setScale(1); e.boost = null; finish(e, "boostEnd"); }
        } else finish(e, "released");
    };
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        const result = _update.apply(this, arguments);
        if (!sceneActive) return result;
        try {
            if (!soulActive()) { if (rt.effects.length || rt.ownPause || rt.hookOn || rt.defs) { endAll("soulInactive"); unregisterHook(); restoreDefs(); } return result; }
            if (phase() !== "attack") { if (rt.effects.length) endAll("notAttack"); return result; }
            applyDefs();
            rt.wall++;
            const oracle = find("oracle");
            if (oracle) updateOracle(oracle);
            if (!this.eventsPaused) {
                rt.clock++;
                for (const e of [...rt.effects]) { if (e.done || e.kind === "oracle") continue; UPDATE[e.kind]?.(e); }
                rt.effects = rt.effects.filter(e => !e.done);
            } else if (!rt.ownPause) {
                // 他の理由(会話・イベント)で止まっている間は、時間を進めない
            } else {
                for (const e of [...rt.effects]) { if (e.done || e.kind !== "vfx") continue; UPDATE.vfx(e); }
                rt.effects = rt.effects.filter(e => !e.done);
            }
            // ビューモデル用の見えない効果(神託の終了)
            if (oracle && oracle.done) rt.effects = rt.effects.filter(e => e !== oracle);
        } catch (error) { note({ type: "updateError", message: String(error?.message || error) }); endAll("error"); }
        return result;
    };
    // 神託は停止中も数える(eventsPaused の間は上のループに入らない)ので、効果の一覧から外れるのは終了後
    const _oracleCleanup = () => { rt.effects = rt.effects.filter(e => !e.done); };
    void _oracleCleanup;

    // ---------------------------------------------------------------- 竪琴のアダプタ(元の竪琴の効果のSOUL用の部分だけ) ----------------------------------------------------------------
    const lyreCut = { value: 0, until: 0, stacks: 0 };
    const lyreAdapter = {
        active: () => soulActive(),
        enemies: () => { const id = heartId(), ev = id ? map()?.event?.(id) : null; return ev && !ev._erased ? [ev] : []; },
        boost: wide => (wide ? TUNE.lyre.wideBoost : 1),
        speed: (n, k, cfg) => {
            if (loopMode()) {                                                              // マナ制: 「速度」の音符 = 次のカード1枚の消費マナの割引(-1 / 「全部同じ音符」で -2。最低1。8秒・1回・竪琴自身には効かない)
                const granted = safe(() => api("ProjectRSoulMana")?.grantDiscount?.({ amount: k > 1 ? 2 : 1, seconds: cfg.buffSeconds || 8 }), null);
                note({ type: "lyreDiscount", granted });
                return granted && granted.ok ? { discount: granted.amount } : 0;
            }
            const cut = clamp(TUNE.lyre.cooldownCut * n * k, 0, TUNE.lyre.maxCut);
            const e = find("lyreCooldown") || add({ kind: "lyreCooldown" });
            e.cut = cut; e.expireClock = rt.clock + Math.round((cfg.buffSeconds || 8) * FPS);
            return cut;
        },
        vfx: null
    };
    // 竪琴の波紋は、攻撃の起点の錨に出す(戻り値の eventId を使う)。ここでは錨を作らず、呼び出しごとに1つ作って短時間で消す。
    lyreAdapter.vfx = () => {
        const at = cursorPoint(); if (!at) return null;
        const visual = api("ProjectRGodSummonVisual"), anchor = safe(() => visual?.spawnAnchor?.({ x: at.x, y: at.y }, { cardId: "soul_skills" }), null);
        if (!anchor?.ok) return null;
        rt.effects.push({ kind: "vfx", expire: rt.wall + 70, handle: { stop: () => { try { visual.removeAnchor?.(anchor.id); } catch (_error) { /* 表示のみ */ } } } });
        return { eventId: anchor.eventId };
    };
    // 冷却の短縮は「冷却山札の残り秒数」だけを進める。deck.updateCooldown() は他の効果(ダメージ補正・状態異常・
    // 絶・神託・各カードの持続タイマー)の時計も兼ねているので呼ばない。BattleDeckSession.prototype.updateCooldown を
    // 直接呼ぶと、冷却山札の残り秒数と「終わった札の捨て札への移動」だけが進む(コアの1フレーム分の呼び出しは無改造)。
    const SessionProto = deck?.BattleDeckSession?.prototype;
    const sessionCooldown = SessionProto?.updateCooldown;
    if (typeof sessionCooldown === "function" && !sessionCooldown.__soulSkills) {
        const wrapped = function (seconds) { rt.session = this; return sessionCooldown.call(this, seconds); };
        wrapped.__soulSkills = true;
        SessionProto.updateCooldown = wrapped;
    }
    UPDATE.lyreCooldown = e => {
        if (rt.clock >= e.expireClock) { finish(e, "expired"); return; }
        const extra = 1 / (1 - e.cut) - 1;                                                  // Cooldown が (1 - cut) 倍の時間で終わる速さ
        if (extra > 0 && rt.session && typeof sessionCooldown === "function") safe(() => sessionCooldown.call(rt.session, extra / FPS));
    };
    END.lyreCooldown = () => {};
    safe(() => api("ProjectRApolloLyreRhythm")?.setAdapter?.(lyreAdapter));

    root.ProjectRSoulSkills = Object.freeze({
        VERSION, CARDS, TUNE, REPLACED,
        owns: cardId => Object.values(CARDS).includes(cardId),
        isActive: () => soulActive(),
        getEffects: () => rt.effects.filter(e => !e.done && e.kind !== "vfx").map(e => ({ cut: e.cut, kind: e.kind, level: e.level || null, serial: e.serial, souls: e.souls ? e.souls.length : undefined, inside: e.inside, healed: e.healed, boost: !!e.boost, released: !!e.released, bloom: e.bloom ? { radius: e.bloom.radius } : undefined })),
        getState: () => ({ wall: rt.wall, clock: rt.clock, ownPause: rt.ownPause, hook: rt.hookOn, defsSwapped: !!rt.defs, stats: { ...rt.stats }, lastEnd: rt.lastEnd && { ...rt.lastEnd }, effects: rt.effects.filter(e => !e.done).length }),
        getLog: () => rt.log.map(e => ({ ...e })),
        endAll
    });
})();
