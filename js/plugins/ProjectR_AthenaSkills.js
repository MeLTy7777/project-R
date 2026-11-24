/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR Athena の通常スキル(Stage 4): アイギスの加護・護槍旋陣・破陣の盾衝・女神の迎撃と、断陣の投槍の投擲。断陣の投槍の入力(タップ = 2段コンボ / 長押し)は ProjectR_FieldCombat。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardBalance
 * @base ProjectR_CombatOcclusion
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_DamageModifiers
 * @orderBefore ProjectR_CardModifiers
 *
 * @help
 * ProjectR_AthenaSkills.js
 *
 * Athena の指輪(RingLoadout)の通常スキルのうち、カードの発動の窓口(registerActivationHandler)で動く4つと、断陣の投槍の投擲を実装します。
 * 装備・SKILL メニュー・HUD・保存・Cooldown はすべて既存の仕組み(RingLoadout / FieldCombat)のままで、新しい保存データはありません。
 * 数値は ProjectR_CardBalance(athena_*)。レベルは所持データの cardOwnership の level。ダメージはすべて「基礎物理ダメージの倍率」(装備の武器のダメージ × 倍率。防御は無視しない)。
 *
 * 【アイギスの加護 athena_aegis】 4 秒間、主人公の被ダメージを 25 / 35 / 45 % 軽減する(既存の ProjectR_ApolloStatus の台帳 = 他の軽減とは積。DamageModifiers の規則は変えない)。Cooldown 14 秒。
 *   効果中の再発動は拒否する(何も消費しない)。仲間への付与はしない。
 * 【護槍旋陣 athena_spear_circle】 主人公を中心に半径 2 マスを全周(360°)で2回斬る(0.3 秒間隔)。各回、基礎物理ダメージの 70 / 80 / 90 %。同じ敵には1回につき1ヒットまで(2回目は別の回なので、同じ敵に2回当たりうる)。壁を挟んだ敵には当たらない。Cooldown 8 秒。
 * 【断陣の投槍 athena_spear_throw】 基本攻撃。タップ(0.25 秒未満)= 2段コンボ(FieldCombat の spearClick。Cooldown 0)/ 長押し(0.25 秒に達した瞬間に1回)= 貫通する投擲(throwSpear)。
 *   投擲: カーソルの向きへ 4.5 マス・幅 0.9 マスの直線上の敵すべてへ、基礎物理ダメージの 160 / 190 / 220 %(同じ敵に1回)。壁の手前で止まり、壁の向こうには当たらない(壁が目の前なら失敗 = 何も消費しない)。
 *   投擲の再使用は、投げた瞬間から別に 10 秒(FieldCombat が持つ。タップのコンボは再使用中も使える)。カード戦闘の手札からは発動しない(何も消費しない)。
 * 【破陣の盾衝 athena_shield_charge】 カーソルの向きへ、最大 2 マスを約 0.3 秒で前進する(壁・敵・マップの端・ほかのキャラクターの手前で止まる = 衝突の安全。前進を始めた瞬間にすでに壁で動けないときは、失敗 = 何も消費しない)。
 *   前進のあと、通った帯と前方の敵に1回、基礎物理ダメージの 140 / 170 / 200 %(同じ敵に1回)。通常の敵は 0.4 / 0.6 / 0.8 秒の怯み(溜め中の攻撃の中断・次の攻撃の遅れ・移動停止)。
 *   ボスは怯まない(ダメージは入る)。敵は押し出さない(ノックバックなし)。Cooldown 10 秒。
 * 【女神の迎撃 athena_counter】 0.6 / 0.7 / 0.8 秒の間、前方 140° からの敵の直接攻撃(近接・飛び道具)の1回を、60 / 75 / 90 % 軽減して受け、
 *   その攻撃の元の敵が 3 マス以内にいて有効なら、基礎物理ダメージの 100 / 120 / 140 % で反撃する。前方の外(背後)からの攻撃は受け流さず、待機を続ける(時間切れまで)。
 *   環境ダメージ(敵ではないイベント・呼び出し元なし)は対象外。飛び道具の削除・反射はしない。反撃のダメージは、この仕組みを再び呼ばない。Cooldown 11 秒。
 *   前方 = カーソルの向き(カーソルが主人公に重なっているときは、主人公の向き)。実装: Hendrix の UpdateEventHp(対象 = 主人公・値がマイナス・呼び出し元が敵イベント)を、待機の間だけ1回、軽減した値で通す。
 *
 * 失敗(対象なし・衝突の危険・効果中の再発動など)は何も起こさず、Cooldown も使わない。ボスの扱い・ダメージの式・命中の手応えは Janus・Themis と同じ既存の仕組み。
 * 見た目: 専用の素材は無く、既存の SE と、コードで描く輪・線(画像ファイルは参照しない)だけ。
 *
 * 実行時のみ(セーブしない)。戦闘の終了・マップ移動・ロードですべて解除する。ProjectRAthenaSkills.getState() / getLastResult()(診断)。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = Object.freeze({ aegis: "athena_aegis", circle: "athena_spear_circle", spear: "athena_spear_throw", charge: "athena_shield_charge", counter: "athena_counter" });
    const FPS = 60, EPS = 1e-6, MIN_THROW_TILES = 0.6;
    const AEGIS_ID = "athena_aegis", CHARGE_SPEED_ID = "athena_shield_charge", STAGGER_ID = "athena_stagger", IMMOBILE_FACTOR = 0.0001;
    const deck = root.ProjectRCardDeck;
    if (!deck || typeof deck.registerActivationHandler !== "function") return;

    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const num = (value, fallback) => (value !== null && value !== "" && Number.isFinite(Number(value)) ? Number(value) : fallback);
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const player = () => (typeof $gamePlayer !== "undefined" ? $gamePlayer : null);
    const occlusion = () => (root.ProjectR && root.ProjectR.CombatOcclusion) || null;
    const modifiers = () => root.ProjectRCardModifiers;
    const normalize = degree => ((degree % 360) + 360) % 360;
    const se = (name, pitch = 100) => safe(() => AudioManager.playSe({ name, volume: 80, pitch, pan: 0 }));

    // ---------------------------------------------------------------- 見た目: コードで描く輪・線(画像・音声などの素材ファイルは新しく参照しない) ------------------------------------------------
    // 表示だけ。失敗(描画できない・親が無い)してもスキルの効果・ダメージ・Cooldown には何も影響しない。マップの移動・ロード・戦闘終了で全部片づける。
    const fx = (() => {
        const entries = [];
        const stats = { created: 0, disposed: 0, failed: 0, lastReason: "" };
        const RING_UNIT = 76;
        let ringBitmap = null, lineBitmap = null;
        const layer = () => { const ss = safe(() => SceneManager._scene._spriteset, null); return (ss && (ss._effectsContainer || ss._tilemap)) || null; };
        const makeRing = () => {
            if (ringBitmap) return ringBitmap;
            const bitmap = new Bitmap(192, 192), c = bitmap.context;
            if (c) safe(() => {
                const edge = c.createRadialGradient(96, 96, 56, 96, 96, 94);
                edge.addColorStop(0, "rgba(255,255,255,0)"); edge.addColorStop(0.45, "rgba(255,255,255,0.95)"); edge.addColorStop(0.62, "rgba(255,255,255,0.4)"); edge.addColorStop(1, "rgba(255,255,255,0)");
                c.fillStyle = edge; c.fillRect(0, 0, 192, 192);
                const fill = c.createRadialGradient(96, 96, 0, 96, 96, 60);
                fill.addColorStop(0, "rgba(255,255,255,0)"); fill.addColorStop(1, "rgba(255,255,255,0.22)");
                c.fillStyle = fill; c.beginPath(); c.arc(96, 96, 60, 0, Math.PI * 2); c.fill();
                if (bitmap._baseTexture && bitmap._baseTexture.update) bitmap._baseTexture.update();
            });
            ringBitmap = bitmap;
            return bitmap;
        };
        const makeLine = () => {
            if (lineBitmap) return lineBitmap;
            const bitmap = new Bitmap(64, 64), c = bitmap.context;
            if (c) safe(() => {
                const g = c.createLinearGradient(0, 0, 0, 64);
                g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.95)"); g.addColorStop(1, "rgba(255,255,255,0)");
                c.fillStyle = g; c.fillRect(0, 0, 64, 64);
                if (bitmap._baseTexture && bitmap._baseTexture.update) bitmap._baseTexture.update();
            });
            lineBitmap = bitmap;
            return bitmap;
        };
        const toScreen = point => { const m = map(); return { x: Math.round(m.adjustX(point.x) * m.tileWidth()), y: Math.round(m.adjustY(point.y) * m.tileHeight()) }; };
        const place = entry => {
            const point = entry.follow ? entry.follow() : entry.at;
            if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) { const s = toScreen(point); entry.sprite.x = s.x; entry.sprite.y = s.y; }
            entry.update(Math.min(1, entry.frame / Math.max(1, entry.total)), entry.sprite);
        };
        const dispose = entry => {
            if (!entry) return;
            const i = entries.indexOf(entry);
            if (i >= 0) { entries.splice(i, 1); stats.disposed++; }
            safe(() => { (entry.parent || entry.sprite.parent).removeChild(entry.sprite); });
        };
        const add = (sprite, total, spec, update) => {
            const parent = layer();
            if (!parent || !map()) { stats.failed++; stats.lastReason = parent ? "noMap" : "noLayer"; return null; }
            sprite.z = 8; sprite.blendMode = 1;                                                          // 1 = 加算合成
            if (spec.color !== undefined) sprite.tint = spec.color;
            parent.addChild(sprite);
            const entry = { sprite, parent, frame: 0, total: Math.max(1, Math.round(total)), at: spec.at || null, follow: spec.follow || null, update, map: map(), persistent: spec.persistent === true };
            entries.push(entry); stats.created++;
            place(entry);
            return entry;
        };
        const alphaAt = (t, peak, hold) => peak * (hold ? Math.min(1, t / 0.06, (1 - t) / 0.12) : Math.min(1, t / 0.15, (1 - t) / 0.35));
        // 輪: at(マップ座標・タイル)または follow(毎フレームの位置)。persistent: true は、dispose されるまで消えない。
        const ring = (spec, radiusTiles, o = {}) => safe(() => {
            const bitmap = makeRing();
            if (!bitmap) return null;
            const sprite = new Sprite(bitmap), r = radiusTiles * map().tileWidth(), from = num(o.from, 0.3), to = num(o.to, 1), peak = num(o.alpha, 0.9);
            sprite.anchor.set(0.5, 0.5);
            return add(sprite, num(o.frames, 20), { at: spec.at, follow: spec.follow, color: o.color, persistent: o.persistent }, (t, s) => {
                const k = from + (to - from) * (o.hold ? t : 1 - (1 - t) * (1 - t)), scale = r * k / RING_UNIT;
                s.scale.set(scale, scale);
                s.opacity = Math.round(255 * Math.max(0, Math.min(1, o.persistent ? peak : alphaAt(t, peak, o.hold === true))));
            });
        }, null);
        // 線(槍・突進の跡): a 点 → b 点を結ぶ。widthTiles の幅。
        const line = (a, b, widthTiles, o = {}) => safe(() => {
            const bitmap = makeLine();
            if (!bitmap) return null;
            const sprite = new Sprite(bitmap), m = map(), peak = num(o.alpha, 0.9), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
            if (!(len > 1e-6)) return null;
            sprite.anchor.set(0, 0.5); sprite.rotation = Math.atan2(dy, dx);
            return add(sprite, num(o.frames, 12), { at: a, color: o.color }, (t, s) => {
                s.scale.set(len * m.tileWidth() / 64, widthTiles * m.tileHeight() / 64);
                s.opacity = Math.round(255 * Math.max(0, Math.min(1, alphaAt(t, peak, o.hold === true))));
            });
        }, null);
        const clear = () => { for (const entry of entries.slice()) dispose(entry); };
        const tick = () => {
            for (const entry of entries.slice()) {
                if (entry.map !== map()) { dispose(entry); continue; }
                if (!entry.persistent && ++entry.frame > entry.total) { dispose(entry); continue; }
                safe(() => place(entry));
            }
        };
        return { ring, tick, line, dispose, clear, stats: () => ({ ...stats }), count: () => entries.length };
    })();
    let lastResults = {};
    let frameNo = 0, serial = 0;
    const remember = (key, result) => { lastResults[key] = { ...result, frame: frameNo }; return result; };

    // ---------------------------------------------------------------- バランス・レベル ----------------------------------------------------------------
    const balance = () => root.ProjectRCardBalance;
    const balanceReady = () => !!balance() && safe(() => balance().isReady() === true, false);
    const cardLevel = id => safe(() => {
        const maxLevel = deck.definitions.card(id)?.maxLevel || 3, lv = Number.parseInt(deck.getPersistentData().cardOwnership?.[id]?.level, 10);
        return Math.min(maxLevel, Math.max(1, Number.isFinite(lv) ? lv : 1));
    }, 1);
    const effectsOf = id => safe(() => balance().effects(id, cardLevel(id)), null);
    const constant = (id, key, fallback) => num(safe(() => balance().constant(id, key), NaN), fallback);

    // ---------------------------------------------------------------- 敵・幾何 ----------------------------------------------------------------
    const isEnemy = e => !!e && !e._erased && typeof e.event === "function" && !!e.event() && String(e.event().note || "").includes("<enemy>");
    const hpOf = id => { const v = modifiers()?.eventHp?.(id); return Number.isFinite(v) ? v : num(map()?.getCurrentEventHp?.(id), 0); };
    const alive = e => isEnemy(e) && map()?.event(e.eventId()) === e && hpOf(e.eventId()) > 0;
    const liveEnemies = () => (safe(() => map().events(), []) || []).filter(alive);
    const playerCenter = () => { const p = safe(() => player().centerPositionPoint(), null); return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : null; };
    const bodyCenter = e => ({ x: e._realX + (typeof e.width === "function" ? e.width() : 1) / 2, y: e._realY + (typeof e.height === "function" ? e.height() : 1) / 2 });
    const eventText = e => `${safe(() => e.event().note, "") || ""}\n${(safe(() => e.page().list, []) || []).filter(c => c.code === 108 || c.code === 408).map(c => c.parameters[0]).join("\n")}`;
    const isBoss = e => /<fieldBoss/i.test(eventText(e)) || safe(() => { const ph = root.ProjectRFieldStrongEnemy?.getPhase?.(e.eventId()); return !!ph && Number(ph.phaseCount) > 1; }, false);
    // origin から radius マス以内に、壁を挟まず届く体の一部がある(CombatOcclusion の視線)。clip を渡すと、その多角形の中の部分だけで判定する。
    const inArea = (origin, radius, e, clip = null) => {
        const occ = occlusion(), polygon = safe(() => occ.eventPolygon(e), null);
        return !!polygon && polygon.length >= 3 && safe(() => occ.hasLineToPolygon(origin, polygon, clip ? { radius, clipPolygon: clip } : { radius }), false) === true;
    };
    const rectangle = (origin, degree, length, width) => {
        const r = degree * Math.PI / 180, ux = Math.sin(r), uy = -Math.cos(r), px = Math.cos(r), py = Math.sin(r), w = width / 2;
        return [{ x: origin.x - px * w, y: origin.y - py * w }, { x: origin.x + px * w, y: origin.y + py * w },
            { x: origin.x + ux * length + px * w, y: origin.y + uy * length + py * w }, { x: origin.x + ux * length - px * w, y: origin.y + uy * length - py * w }];
    };
    // マウス: プレイヤーからのタイル数のずれ(SwordSystem の向きと同じ基準 = プレイヤーの画面位置)。0度 = 上・時計回り
    const mouseVector = () => {
        const p = player(), m = map();
        if (!p || !m || typeof TouchInput === "undefined") return null;
        const v = { x: (TouchInput.x - p.screenX()) / m.tileWidth(), y: (TouchInput.y - p.screenY()) / m.tileHeight() };
        return Number.isFinite(v.x) && Number.isFinite(v.y) ? v : null;
    };
    const mouseDegree = () => {
        const v = mouseVector();
        if (v && Math.hypot(v.x, v.y) > 1e-8) return normalize(Math.atan2(v.y, v.x) * 180 / Math.PI + 450);
        return ({ 8: 0, 6: 90, 2: 180, 4: 270 })[safe(() => player().direction(), 2)] ?? 180;
    };
    const playerDead = () => safe(() => root.ProjectR?.PlayerDeath?.isDead?.() === true, false);

    // ---------------------------------------------------------------- ダメージ(既存の物理ダメージの式: 装備の武器のダメージ × 倍率) ----------------------------------------------------------------
    const command = (name, args, eventId = 0) => { const interpreter = new Game_Interpreter(); interpreter._eventId = eventId; return PluginManager.callCommand(interpreter, ENGINE, name, args); };
    const meleeWeaponId = () => safe(() => root.ProjectRFieldCombat?.getMeleeDamageSource?.().weaponId, null);
    const withDamageWeapon = (weaponId, apply) => {            // SwordSystem と同じ: 銃を持っている間も、近接の武器の攻撃力で計算する(同期の1回の間だけ差し替え、必ず戻す)
        if (weaponId === null || weaponId === undefined) return apply();
        const slot = typeof $gameParty !== "undefined" ? $gameParty.leader?.()?._equips?.[0] : null;
        if (!slot || typeof slot.setObject !== "function" || typeof slot.object !== "function") return apply();
        if (weaponId > 0 && !(typeof $dataWeapons !== "undefined" && $dataWeapons[weaponId])) return apply();
        const original = slot.object();
        slot.setObject(weaponId > 0 ? $dataWeapons[weaponId] : null);
        try { return apply(); } finally { slot.setObject(original); }
    };
    const damageValueOf = scale => (scale === 1 ? "-player weapon" : `-Math.round(player weapon * ${scale})`);
    // options.gauge === false: 与ダメージでゲージを増やさない(奥義のダメージ)。
    const physicalDamage = (event, scale, attackId, options = {}) => {
        const id = event.eventId(), gauge = root.ProjectRUltimateGauge;
        const hp0 = hpOf(id);
        const apply = () => withDamageWeapon(meleeWeaponId(), () => command("UpdateEventHp", { eventId: String(id), value: damageValueOf(scale), exceedMaxHealth: "false", projectRAttackId: attackId }, 0));
        const result = options.gauge !== false && typeof gauge?.trackDamage === "function" ? gauge.trackDamage(id, { attackId, source: "damage:athena" }, apply) : apply();
        safe(() => root.ProjectRFieldCombat?.reportHit?.({ enemyId: id, heavy: options.heavy === true, serial: attackId, hp0 }));          // 命中の手応え(点滅・反動・ヒットストップ・SE)。見た目だけ
        return result;
    };

    // ---------------------------------------------------------------- アイギスの加護: 一定時間の被ダメージ軽減 ----------------------------------------------------------------
    let aegis = null;                   // { remaining, reduction, level, serial, fx }
    const statusLedger = () => { const s = root.ProjectRApolloStatus; return s && typeof s.apply === "function" && typeof s.remove === "function" ? s : null; };
    const endAegis = reason => {
        if (!aegis) return;
        safe(() => statusLedger()?.remove("player", AEGIS_ID));
        if (aegis.fx) fx.dispose(aegis.fx);
        remember("aegisEnd", { ok: true, reason });
        aegis = null;
    };
    const aegisSkill = () => {
        if (!balanceReady()) return failure("balanceUnavailable");
        if (aegis) return failure("alreadyActive");                                                           // 効果中の再発動は拒否(何も消費しない)
        const ledger = statusLedger(), eff = effectsOf(CARD.aegis);
        if (!ledger) return failure("statusLedgerUnavailable");
        if (!eff) return failure("invalidState");
        const reduction = Math.min(0.95, Math.max(0, num(eff.incomingReduction, 0.25))), seconds = constant(CARD.aegis, "durationSeconds", 4);
        const r = safe(() => ledger.apply("player", AEGIS_ID, { seconds, damageTaken: 1 - reduction, source: "athena" }), null);
        if (!r || r.ok !== true) return failure("statusRejected", { detail: r && r.reason || null });
        aegis = { remaining: seconds, reduction, level: cardLevel(CARD.aegis), serial: ++serial, fx: null };
        aegis.fx = fx.ring({ follow: () => playerCenter() }, 1.1, { color: 0x9fd8ff, hold: true, from: 1, to: 1, alpha: 0.65, frames: Math.round(seconds * FPS) + 2 });
        se("Barrier", 100);
        return remember("aegis", { ok: true, reduction, seconds, level: aegis.level });
    };

    // ---------------------------------------------------------------- 護槍旋陣: 主人公を中心に半径 2 マスの全周を、0.3 秒間隔で2回 ----------------------------------------------------------------
    let circle = null;                  // { map, frame, interval, phase, phases, scale, radius, level, serial, hits:[[eventId...]...] }
    const circlePhase = c => {
        const pc = playerCenter();
        c.phase++;
        const hit = [];
        if (pc) {
            for (const e of liveEnemies()) {
                if (!inArea(pc, c.radius + EPS, e)) continue;                                              // 壁を挟んだ敵・範囲外には当たらない
                if (hit.includes(e.eventId())) continue;                                                   // 1つの回で、同じ敵には1ヒットまで
                try { physicalDamage(e, c.scale, `athena_spear_circle:${c.serial}:${c.phase}`); hit.push(e.eventId()); } catch (_error) { /* 1体の失敗で止めない */ }
            }
            fx.ring({ at: pc }, c.radius, { color: 0xffffff, from: 0.4, to: 1.05, frames: 14, alpha: 1 });
        }
        c.hits.push(hit);
        se("Slash2", c.phase === 1 ? 110 : 90);
        remember("circleHit", { ok: true, phase: c.phase, hit: hit.slice(), scale: c.scale, level: c.level });
    };
    const circleSkill = () => {
        if (!balanceReady()) return failure("balanceUnavailable");
        if (circle) return failure("alreadyActive");
        const eff = effectsOf(CARD.circle), pc = playerCenter();
        if (!eff || !pc) return failure("invalidState");
        circle = { map: map(), frame: 0, interval: Math.max(1, Math.round(constant(CARD.circle, "hitIntervalSeconds", 0.3) * FPS)), phase: 0, phases: Math.max(1, Math.round(constant(CARD.circle, "hitCount", 2))),
            scale: num(eff.damageScale, 0.7), radius: constant(CARD.circle, "radiusTiles", 2), level: cardLevel(CARD.circle), serial: ++serial, hits: [] };
        circlePhase(circle);                                                                                // 1回目はすぐ
        if (circle.phase >= circle.phases) circle = null;
        return remember("circle", { ok: true, level: cardLevel(CARD.circle), phases: Math.max(1, Math.round(constant(CARD.circle, "hitCount", 2))) });
    };

    // ---------------------------------------------------------------- 断陣の投槍: 長押しの投擲(FieldCombat が 0.25 秒に達した瞬間に1回だけ呼ぶ) ----------------------------------------------------------------
    const throwSpear = () => {
        if (!balanceReady()) return failure("balanceUnavailable");
        const eff = effectsOf(CARD.spear), pc = playerCenter(), occ = occlusion();
        if (!eff || !pc || !occ || typeof occ.firstBlockerBetween !== "function") return failure("invalidState");
        if (playerDead()) return failure("playerDead");
        const range = constant(CARD.spear, "throwRangeTiles", 4.5), width = constant(CARD.spear, "pathWidthTiles", 0.9), scale = num(eff.holdDamageScale, 1.6);
        const degree = mouseDegree(), r = degree * Math.PI / 180, ux = Math.sin(r), uy = -Math.cos(r);
        const far = { x: pc.x + ux * range, y: pc.y + uy * range };
        const blocker = safe(() => occ.firstBlockerBetween(pc, far, { mode: "combat" }), null);
        let length = range;
        if (blocker && Number.isFinite(blocker.distance)) length = Math.max(0, Math.min(range, blocker.distance - 0.05));        // 壁は貫通しない(壁の手前で止まる)
        if (length < MIN_THROW_TILES) return failure("blocked");                                             // 壁が目の前(主人公の体の半分 0.5 + 余裕の外へ出られない): 何も出さない(何も消費しない)
        const clip = rectangle(pc, degree, length, width), radius = Math.hypot(length, width / 2) + 0.01, hit = [], id = ++serial;
        for (const e of liveEnemies()) {
            if (!inArea(pc, radius, e, clip)) continue;                                                      // 壁の向こう(壁の手前までの帯の外)の敵には当たらない
            try { physicalDamage(e, scale, `athena_spear_throw:${id}`, { heavy: true }); hit.push(e.eventId()); } catch (_error) { /* 1体の失敗で止めない */ }       // 同じ敵に1回
        }
        const end = { x: pc.x + ux * length, y: pc.y + uy * length };
        fx.line(pc, end, Math.max(0.25, width * 0.5), { color: 0xffffff, frames: 14, alpha: 1 });
        fx.line(pc, end, width, { color: 0x9fd8ff, frames: 18, alpha: 0.55 });
        se("Slash2", 130); se("Blow1", 120);
        return remember("throw", { ok: true, serial: id, hit, length, degree, scale, level: cardLevel(CARD.spear) });
    };

    // ---------------------------------------------------------------- 破陣の盾衝: 衝突の安全な前進(最大 2 マス・約 0.3 秒)と、1回のダメージ + 通常の敵の怯み ----------------------------------------------------------------
    let charge = null;                  // { map, frame, frames, start, dist, u, degree, scale, stagger, width, level, serial }
    const staggers = new Map();         // event -> { map, remaining }
    const releaseStagger = event => { staggers.delete(event); safe(() => modifiers()?.clearCharacterSpeedFactor?.(event, STAGGER_ID)); };
    const applyStagger = (e, seconds) => {
        const fc = root.ProjectRFieldCombat, r = safe(() => fc?.staggerEnemy?.(e.eventId(), seconds), null);          // 溜め中の攻撃を中断し、次の攻撃を遅らせる(FieldCombat の敵の行動)
        const held = safe(() => modifiers()?.setCharacterSpeedFactor?.(e, STAGGER_ID, IMMOBILE_FACTOR), null);       // 移動を止める(怯みの間)
        if (held && held.ok === true) staggers.set(e, { map: map(), remaining: seconds });
        return !!(held && held.ok === true) || !!(r && r.ok);
    };
    // 着地点の安全の検査: マップの端・壁(CombatOcclusion)・DotMove の衝突。敵だけに当たるときは kind = "enemy"(その手前で止まる)
    const landingState = (character, dest) => {
        const m = map(), occ = occlusion(), w = character.width(), h = character.height();
        if (![dest.x, dest.y].every(Number.isFinite)) return { ok: false, kind: "invalid" };
        if (dest.x < -1e-9 || dest.y < -1e-9 || dest.x + w > m.width() + 1e-9 || dest.y + h > m.height() + 1e-9) return { ok: false, kind: "edge" };
        const inset = 0.05, half = { x: w / 2 - inset, y: h / 2 - inset };
        const footprint = [{ x: -half.x, y: -half.y }, { x: half.x, y: -half.y }, { x: half.x, y: half.y }, { x: -half.x, y: half.y }];
        const c = { x: dest.x + w / 2, y: dest.y + h / 2 };
        if (safe(() => occ.firstBlockerBetween(c, c, { mode: "combat", unwrapped: true, footprint }), null)) return { ok: false, kind: "wall" };
        const mover = safe(() => character.mover(), null);
        if (!mover || typeof mover.createCollisionChecker !== "function") return { ok: false, kind: "unavailable" };
        const checker = mover.createCollisionChecker({ overComplementMode: true });
        let enemy = false;
        for (const dir of [2, 4, 6, 8]) {
            const results = safe(() => checker.checkCollision(dest.x, dest.y, dir), null);
            if (results === null) return { ok: false, kind: "unavailable" };
            for (const r of results) {
                if (!r || r.targetObject === character) continue;
                if (isEnemy(r.targetObject)) enemy = true; else return { ok: false, kind: "object" };
            }
        }
        return enemy ? { ok: false, kind: "enemy" } : { ok: true, kind: "free" };
    };
    const chargeSkill = () => {
        const p = player(), m = map(), occ = occlusion();
        if (!p || !m || !occ || typeof occ.firstBlockerBetween !== "function") return failure("movementUnavailable");
        if (!balanceReady()) return failure("balanceUnavailable");
        if (charge) return failure("alreadyActive");
        if (playerDead()) return failure("playerDead");
        if (!safe(() => p.canMove(), false) || safe(() => p.isInVehicle?.(), false)) return failure("playerMovementLocked");
        if (safe(() => p.isThrough?.() || p.isDebugThrough?.(), false)) return failure("playerThrough");
        const eff = effectsOf(CARD.charge);
        if (!eff) return failure("invalidState");
        const maxDist = constant(CARD.charge, "chargeDistanceTiles", 2), degree = mouseDegree(), r = degree * Math.PI / 180, u = { x: Math.sin(r), y: -Math.cos(r) };
        const start = { x: p._realX, y: p._realY };
        let dist = 0, blocker = null;
        for (let s = 0.1; s <= maxDist + 1e-9; s += 0.1) {                                                  // 安全に行ける距離を、手前から確かめる(最初に危険な所の手前まで)
            const st = landingState(p, { x: start.x + u.x * s, y: start.y + u.y * s });
            if (!st.ok) { blocker = st; break; }
            dist = Math.round(s * 1000) / 1000;
        }
        if (dist < 0.05 && !(blocker && blocker.kind === "enemy")) return failure("unsafeStart", { kind: blocker ? blocker.kind : "none" });       // 動けない(壁・端・物): 何も消費しない。敵に接している盾打ちは許す
        charge = { map: m, frame: 0, frames: Math.max(1, Math.round(constant(CARD.charge, "chargeSeconds", 0.3) * FPS)), start, dist, u, degree, scale: num(eff.damageScale, 1.4),
            stagger: num(eff.staggerSeconds, 0.4), width: constant(CARD.charge, "pathWidthTiles", 1), level: cardLevel(CARD.charge), serial: ++serial, startCenter: playerCenter(), moved: 0 };
        safe(() => modifiers()?.setMoveSpeedFactor?.(CHARGE_SPEED_ID, IMMOBILE_FACTOR, 0.1));                 // 前進の間、入力の移動は止める(毎フレーム延長し、終わったら外す)
        safe(() => p.cancelMove?.()); safe(() => $gameTemp?.clearDestination?.());
        se("Wind1", 90);
        return remember("charge", { ok: true, distance: dist, degree, frames: charge.frames, blockedBy: blocker ? blocker.kind : null, level: charge.level });
    };
    const finishCharge = reason => {
        const c = charge; charge = null;
        safe(() => modifiers()?.clearMoveSpeedFactor?.(CHARGE_SPEED_ID));
        if (!c) return;
        const result = { ok: true, reason, moved: c.moved, hit: [], staggered: [], bosses: [], level: c.level };
        if (reason === "completed" || reason === "blocked") {
            const pc = playerCenter();
            if (pc) {
                const length = c.moved + 1.2, rect = rectangle(c.startCenter || pc, c.degree, length, c.width), radius = Math.hypot(length, c.width / 2) + 0.01;       // 通った帯と、その前方
                for (const e of liveEnemies()) {
                    if (!inArea(c.startCenter || pc, radius, e, rect)) continue;
                    try { physicalDamage(e, c.scale, `athena_shield_charge:${c.serial}`, { heavy: true }); result.hit.push(e.eventId()); } catch (_error) { continue; }       // 同じ敵に1回
                    if (isBoss(e)) result.bosses.push(e.eventId());                                           // ボスは怯まない(ダメージだけ)
                    else if (alive(e) && applyStagger(e, c.stagger)) result.staggered.push(e.eventId());
                }
                fx.ring({ at: pc }, 1.2, { color: 0xffffff, from: 0.3, to: 1.1, frames: 14, alpha: 1 });
                if (c.startCenter) fx.line(c.startCenter, pc, 0.8, { color: 0x9fd8ff, frames: 16, alpha: 0.7 });
            }
            se("Blow3", 90); se("Barrier", 70);
        }
        remember("chargeEnd", result);
    };
    const stepCharge = () => {
        const c = charge, p = player();
        if (!c || !p) return;
        if (c.map !== map() || playerDead()) { finishCharge("aborted"); return; }
        safe(() => modifiers()?.setMoveSpeedFactor?.(CHARGE_SPEED_ID, IMMOBILE_FACTOR, 0.1));
        c.frame++;
        const t = Math.min(1, c.frame / c.frames), eased = 1 - (1 - t) * (1 - t), travel = c.dist * eased;
        if (travel > c.moved + 1e-9) {
            const dest = { x: c.start.x + c.u.x * travel, y: c.start.y + c.u.y * travel };
            const st = landingState(p, dest);
            if (!st.ok) { finishCharge("blocked"); return; }                                                  // 途中で敵・壁が現れたら、その手前で止まる
            p.setPosition(dest.x, dest.y); c.moved = travel;
        }
        if (c.frame >= c.frames) finishCharge("completed");
    };

    // ---------------------------------------------------------------- 女神の迎撃: 受付の間、前方 140° からの敵の直接攻撃の1回を軽減して受け、反撃 ----------------------------------------------------------------
    let counter = null;           // { remaining, reduction, scale, range, arc, level, serial, fx }
    let counterFx = null, countering = false, reducing = false;
    const disarm = reason => { if (counter) { remember("counterEnd", { ok: true, reason }); counter = null; } if (counterFx) { fx.dispose(counterFx); counterFx = null; } };
    const counterSkill = () => {
        if (!balanceReady()) return failure("balanceUnavailable");
        if (counter) return failure("alreadyArmed");
        const eff = effectsOf(CARD.counter);
        if (!eff) return failure("invalidState");
        counter = { remaining: num(eff.counterWindowSeconds, 0.6), reduction: Math.min(0.95, Math.max(0, num(eff.incomingReduction, 0.6))), scale: num(eff.damageScale, 1), range: constant(CARD.counter, "rangeTiles", 3),
            arc: constant(CARD.counter, "frontArcDegrees", 140), level: cardLevel(CARD.counter), serial: ++serial };
        if (counterFx) fx.dispose(counterFx);
        counterFx = fx.ring({ follow: () => playerCenter() }, 0.95, { color: 0xffe08a, hold: true, from: 1, to: 1, alpha: 0.75, frames: Math.round(counter.remaining * FPS) + 2 });
        se("Barrier", 120);
        return remember("counter", { ok: true, window: counter.remaining, reduction: counter.reduction, scale: counter.scale, arc: counter.arc, level: counter.level });
    };
    const sourceEnemy = interpreter => {
        const id = Number(interpreter && interpreter._eventId);
        if (!(id > 0)) return null;
        const e = safe(() => map().event(id), null);
        return isEnemy(e) ? e : null;
    };
    // 前方 = カーソルの向き(カーソルが主人公に重なっているときは主人公の向き)。攻撃の元の敵が、その向きの ±(arc / 2) 度の中にいる。
    const inFront = (source, arc) => {
        const pc = playerCenter();
        if (!pc) return false;
        const c = bodyCenter(source), dx = c.x - pc.x, dy = c.y - pc.y;
        if (Math.hypot(dx, dy) < 1e-6) return true;
        const toSource = normalize(Math.atan2(dy, dx) * 180 / Math.PI + 450), diff = Math.abs(((toSource - mouseDegree() + 540) % 360) - 180);
        return diff <= arc / 2 + 1e-6;
    };
    const scaledValue = (value, factor) => "-Math.round(-(" + value.trim() + ")*" + factor + ")";          // 負(ダメージ)の式を、四捨五入して負のまま返す(DamageModifiers と同じ書き方)
    const consumeHit = source => {
        const a = counter; counter = null;
        if (counterFx) { fx.dispose(counterFx); counterFx = null; }
        const result = { ok: true, reduced: true, reduction: a.reduction, attackerEventId: source.eventId(), countered: false, scale: a.scale, level: a.level };
        const pc = playerCenter();
        if (pc) fx.ring({ at: pc }, 1.3, { color: 0xffffff, from: 0.4, to: 1.2, frames: 14 });                       // 受け止めの光(主人公)
        se("Blow3", 120);
        return { a, result };
    };
    const counterAttack = (source, a, result) => {
        const pc = playerCenter();
        if (pc && alive(source) && Math.hypot(bodyCenter(source).x - pc.x, bodyCenter(source).y - pc.y) <= a.range + EPS) {
            countering = true;
            try { physicalDamage(source, a.scale, `athena_counter:${a.serial}`, { heavy: true }); result.countered = true; } finally { countering = false; }
            fx.ring({ follow: () => bodyCenter(source) }, 1.0, { color: 0xffe08a, from: 0.3, to: 1.1, frames: 16 });         // 反撃の光(攻撃者)
        }
        remember("counterHit", result);
    };
    const installDamageGuard = () => {
        const commands = typeof PluginManager !== "undefined" ? PluginManager._commands : null, key = `${ENGINE}:UpdateEventHp`;
        const original = commands && commands[key];
        if (typeof original !== "function" || original.__projectRAthena) return false;
        const wrapped = function(args) {
            if (counter && !countering && !reducing && String(args && args.eventId).toLowerCase() === "player" && /^\s*-/.test(String(args && args.value))) {
                const source = sourceEnemy(this);
                if (source && inFront(source, counter.arc)) {                 // 敵の直接攻撃(正面から)の1回。敵ではない(環境など)ダメージ・背後からの攻撃は、そのまま通す
                    const { a, result } = consumeHit(source);
                    let returned;
                    reducing = true;
                    try { returned = original.call(this, Object.assign({}, args, { value: scaledValue(String(args.value), 1 - a.reduction) })); } finally { reducing = false; }
                    counterAttack(source, a, result);
                    return returned;
                }
            }
            return original.apply(this, arguments);
        };
        wrapped.__projectRAthena = true;
        commands[key] = wrapped;
        return true;
    };

    // ---------------------------------------------------------------- 時計・後片付け ----------------------------------------------------------------
    const tick = seconds => {                                    // 秒の時計(戦闘時計 = deck.updateCooldown)
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        for (const [event, s] of [...staggers]) { if (s.map !== map() || !alive(event)) { releaseStagger(event); continue; } s.remaining -= seconds; if (s.remaining < 1e-8) releaseStagger(event); }
        if (aegis) { aegis.remaining -= seconds; if (aegis.remaining < 1e-8) endAegis("expired"); }
        if (counter) { counter.remaining -= seconds; if (counter.remaining < 1e-8) disarm("expired"); }
    };
    const clearAll = reason => {
        for (const event of [...staggers.keys()]) releaseStagger(event);
        endAegis(reason); disarm(reason); circle = null;
        if (charge) finishCharge("aborted");
        fx.clear();
    };
    const canAdvanceNow = (m, sceneActive) => {
        if (!sceneActive || m.eventsPaused) return false;
        const accept = root.ProjectRCardBattleInput?.canAcceptInput;
        return typeof accept === "function" ? accept() === true : true;
    };
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) { const r = _updateCooldown.apply(this, arguments); tick(Number(seconds)); return r; };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clearAll("mapSetup"); return _setup.apply(this, arguments); };
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            _update.apply(this, arguments);
            frameNo++;
            if (fx.count()) fx.tick();                                                         // 見た目の時間は、マップの更新と同じ(メニュー・停止中は進まない)
            if (staggers.size) for (const [event, s] of [...staggers]) if (s.map !== map() || !alive(event)) releaseStagger(event);          // 倒れた敵の怯みは、その場で消える
            if (playerDead()) { if (aegis) endAegis("playerDead"); if (counter) disarm("playerDead"); if (charge) finishCharge("aborted"); circle = null; return; }
            if (!canAdvanceNow(this, sceneActive)) return;
            if (charge) stepCharge();
            if (circle) {
                if (circle.map !== map() || !deck.isCardBattleActive()) circle = null;
                else { circle.frame++; if (circle.frame >= circle.interval * circle.phase) circlePhase(circle); if (circle.phase >= circle.phases) circle = null; }
            }
        };
    }
    if (typeof DataManager !== "undefined") {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { clearAll("load"); return _extract.apply(this, arguments); };
    }
    const guardInstalled = installDamageGuard();

    // ---------------------------------------------------------------- カードの発動の窓口(カード定義の targetType ごとに、cardId で振り分けて、ほかのカードは前の handler へ) ----------------------------------------------------------------
    const chain = (targetType, table) => {
        const previous = deck.getActivationHandler(targetType);
        deck.registerActivationHandler(targetType, context => {
            const fn = table[context?.definition?.cardId];
            if (fn) return fn(context);
            return typeof previous === "function" ? previous(context) : { ok: true };
        });
    };
    // 断陣の投槍 = フィールド戦闘の基本攻撃(タップ = 2段コンボ / 長押し = 投擲)。カード戦闘の手札からは発動しない(何も消費しない)。
    chain("direction", { [CARD.spear]: () => failure("fieldCombatOnly"), [CARD.charge]: chargeSkill });
    chain("instant", { [CARD.aegis]: aegisSkill, [CARD.circle]: circleSkill, [CARD.counter]: counterSkill });

    root.ProjectRAthenaSkills = Object.freeze({
        VERSION: "0.1.0", CARD,
        cardLevel, effectsOf, isBoss, aimDegree: mouseDegree, playerCenter, liveEnemies, inArea, physicalDamage, fx, throwSpear, landingState,       // ProjectR_AthenaUltimate・FieldCombat が使う
        getState: () => ({ aegis: aegis ? { remaining: aegis.remaining, reduction: aegis.reduction, level: aegis.level } : null,
            circle: circle ? { phase: circle.phase, phases: circle.phases, frame: circle.frame, hits: circle.hits.map(h => h.slice()) } : null,
            charge: charge ? { frame: charge.frame, frames: charge.frames, distance: charge.dist, moved: charge.moved } : null,
            counter: counter ? { remaining: counter.remaining, reduction: counter.reduction, scale: counter.scale, arc: counter.arc, level: counter.level } : null,
            staggers: [...staggers].map(([e, s]) => ({ eventId: e.eventId(), remaining: s.remaining })), guardInstalled }),
        getLastResult: key => (key ? (lastResults[key] ? { ...lastResults[key] } : null) : Object.fromEntries(Object.entries(lastResults).map(([k, v]) => [k, { ...v }]))),
        clear: clearAll
    });
})();
