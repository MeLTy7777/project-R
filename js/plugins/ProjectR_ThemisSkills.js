/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR Themis の通常スキル(Stage 3): 戒律の宣告・審理の鎖・衡平の天秤・断罪の判決と、「罪状」の台帳。罪科の刻印(基本攻撃の3段コンボ)は ProjectR_FieldCombat。
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
 * ProjectR_ThemisSkills.js
 *
 * Themis の指輪(RingLoadout)の通常スキルのうち、カードの発動の窓口(registerActivationHandler)で動く4つと、「罪状」の台帳を実装します。
 * 装備・SKILL メニュー・HUD・保存・Cooldown はすべて既存の仕組み(RingLoadout / FieldCombat)のままで、新しい保存データはありません。
 * 数値は ProjectR_CardBalance(themis_*)。レベルは所持データの cardOwnership の level。
 *
 * 【罪状(Sin)】 敵ごとに最大 3。付くたびに +1 され、8 秒の期限が取り直される(重ねがけで期限が延びる)。期限が切れると全部消える。
 *   敵の死亡・戦闘の終了・マップ移動・ロードで消える。ボスにも付く。実行時のみ(セーブしない)。Themis のスキル・奥義以外は、罪状に触れない。
 *   DamageModifiers の「重ねがけの規則」には触れない(罪状は敵の被ダメージ倍率ではなく、断罪の判決・奥義の「ダメージの式」の入力)。
 * 【戒律の宣告 themis_edict】 カーソル上の敵1体(4 マス以内・壁の向こうは不可)へ、基礎物理ダメージの 100 / 120 / 140 %。当たったら罪状 +1。Cooldown 7 秒。
 * 【審理の鎖 themis_chain】 カーソル上の敵1体(3.5 マス以内)の罪状 +1。通常の敵は 1.5 / 2.0 / 2.5 秒の「拘束」(移動できない。攻撃は止めない)。
 *   ボスは同じ時間の移動速度低下 20 / 25 / 30 %。耐性は Hendrix の公式の状態付与(AddState)と同じ判定(ScheckStateResistanceH)に委ねる(麻痺 12・スタン 13)。
 *   耐性で拘束・低下が効かない敵にも、罪状は付く(罪状は状態異常ではない)。Cooldown 10 秒。
 * 【衡平の天秤 themis_balance】 2.5 秒の間、主人公の被ダメージを 20 / 30 / 40 % 軽減する(既存の ProjectR_ApolloStatus の台帳 = 他の軽減とは積。DamageModifiers の規則は変えない)。
 *   効果中に最初に主人公へ当たった敵の直接攻撃(敵イベントが元の HP を減らす呼び出し。環境ダメージは数えない)の元の敵へ、罪状 +1。1回の発動につき最大1回。Cooldown 13 秒。
 * 【罪科の刻印 themis_sin_mark】 基本攻撃の3段コンボ(FieldCombat)。3段目に当たった敵ごとに罪状 +1(この plugin が、斬撃の命中の通知を見張る)。
 * 【断罪の判決 themis_verdict】 カーソル上の敵1体(4 マス以内)へ、基礎物理ダメージの 160 / 195 / 230 % × (1 + 0.4 × その敵の罪状)。ダメージが出た後にだけ、その敵の罪状を全部消費する。Cooldown 8 秒。
 *
 * 失敗(対象なし・射程外・壁の向こう・効果中の再発動など)は何も起こさず、Cooldown も使わない。耐性・ボスの扱い・ダメージの式・命中の手応えは Janus と同じ既存の仕組み。
 * 見た目: 専用の素材は無く、既存の SE と、コードで描く輪・線(画像ファイルは参照しない)だけ。罪状は敵の足元の輪(数が増えるほど大きく濃い)で示す。
 *
 * 実行時のみ(セーブしない)。ProjectRThemisSkills.getState() / getLastResult() / sin.stacksOf(event)(診断)。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = Object.freeze({ edict: "themis_edict", chain: "themis_chain", balance: "themis_balance", mark: "themis_sin_mark", verdict: "themis_verdict" });
    const FPS = 60, EPS = 1e-6;
    const SIN_MAX = 3, SIN_SECONDS = 8;
    const SPEED_ID = "themis_chain", IMMOBILE_FACTOR = 0.0001, RESIST_STATES = Object.freeze([12, 13]), BALANCE_ID = "themis_balance";
    const deck = root.ProjectRCardDeck;
    if (!deck || typeof deck.registerActivationHandler !== "function") return;

    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const num = (value, fallback) => (value !== null && value !== "" && Number.isFinite(Number(value)) ? Number(value) : fallback);
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const player = () => (typeof $gamePlayer !== "undefined" ? $gamePlayer : null);
    const occlusion = () => (root.ProjectR && root.ProjectR.CombatOcclusion) || null;
    const modifiers = () => root.ProjectRCardModifiers;
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
        // 輪: at(マップ座標・タイル)または follow(毎フレームの位置)。persistent: true は、dispose されるまで消えない(罪状の輪)。
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
        // 線(鎖): from 点 → to 点を結ぶ。widthTiles の幅。
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
    const battlerOf = e => safe(() => (typeof SgetBattlerForH === "function" ? SgetBattlerForH(e) : e.databaseEnemy), null);
    // 耐性: Hendrix の公式の状態付与(AddState)と同じ判定(ScheckStateResistanceH = 敵の状態無効化・状態有効度・有効な状態の特徴)に委ねる。
    // 麻痺(12)・スタン(13)のどちらかを無効にする敵は効かない。有効度は確率として扱い(0 = 必ず効かない / 1 = 必ず効く)、2つの状態のうち低い方で1回だけ判定する。
    const resists = e => {
        const id = safe(() => e.eventId(), 0);
        let blocked = false, chance = 1;
        for (const state of RESIST_STATES) {
            let r = typeof ScheckStateResistanceH === "function" ? safe(() => ScheckStateResistanceH(id, state), null) : null;
            if (!r) { const b = battlerOf(e); if (!b) continue; r = { hasStateResist: safe(() => b.isStateResist(state) === true, false), stateRate: num(safe(() => b.stateRate(state), 1), 1) }; }
            if (r.hasStateResist) blocked = true;
            chance = Math.min(chance, num(r.stateRate, 1));
        }
        return blocked || (chance < 1 && Math.random() >= chance);
    };
    // origin から radius マス以内に、壁を挟まず届く体の一部がある(CombatOcclusion の視線)
    const inArea = (origin, radius, e) => {
        const occ = occlusion(), polygon = safe(() => occ.eventPolygon(e), null);
        return !!polygon && polygon.length >= 3 && safe(() => occ.hasLineToPolygon(origin, polygon, { radius }), false) === true;
    };
    const pointInPolygon = (point, polygon) => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const a = polygon[i], b = polygon[j];
            if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
        }
        return inside;
    };
    const mouseVector = () => {
        const p = player(), m = map();
        if (!p || !m || typeof TouchInput === "undefined") return null;
        const v = { x: (TouchInput.x - p.screenX()) / m.tileWidth(), y: (TouchInput.y - p.screenY()) / m.tileHeight() };
        return Number.isFinite(v.x) && Number.isFinite(v.y) ? v : null;
    };
    const cursorPoint = () => { const m = map(); return m && typeof TouchInput !== "undefined" ? { x: m.displayX() + TouchInput.x / m.tileWidth(), y: m.displayY() + TouchInput.y / m.tileHeight() } : null; };
    // カーソル方向の最大 range マス先の点(壁の手前で止まる。マップの内側)。奥義が使う。
    const aimPoint = range => {
        const occ = occlusion(), m = map(), pc = playerCenter();
        if (!occ || typeof occ.firstBlockerBetween !== "function" || !m || !pc) return failure("movementUnavailable");
        const v = mouseVector();
        if (!v) return failure("invalidMousePosition");
        const len = Math.hypot(v.x, v.y);
        if (len <= 1e-6) return { ok: true, center: { x: pc.x, y: pc.y }, distance: 0 };
        let reach = Math.min(len, range);
        const target = { x: pc.x + v.x / len * reach, y: pc.y + v.y / len * reach };
        const hit = safe(() => occ.firstBlockerBetween(pc, target, { mode: "combat" }), null);
        if (hit && Number.isFinite(hit.distance)) reach = Math.max(0, Math.min(reach, hit.distance - 0.1));
        const center = { x: Math.min(Math.max(pc.x + v.x / len * reach, 0), m.width()), y: Math.min(Math.max(pc.y + v.y / len * reach, 0), m.height()) };
        return { ok: true, center, distance: Math.hypot(center.x - pc.x, center.y - pc.y) };
    };
    // カーソル上の敵1体(体の中、または体の中心から 0.75 マス以内)。射程(体のどこかが range マス以内・壁を挟まない)の外は、何も選ばず失敗(Cooldown も使わない)。
    const pickEnemy = range => {
        const cursor = cursorPoint(), pc = playerCenter(), occ = occlusion();
        if (!cursor || !pc || !occ) return failure("invalidMousePosition");
        let best = null;
        for (const e of liveEnemies()) {
            const polygon = safe(() => occ.eventPolygon(e), null);
            if (!polygon || polygon.length < 3) continue;
            const c = bodyCenter(e), d = Math.hypot(c.x - cursor.x, c.y - cursor.y), inside = pointInPolygon(cursor, polygon);
            if (!inside && d > 0.75) continue;
            if (!best || (inside && !best.inside) || (inside === best.inside && d < best.d)) best = { e, d, inside };
        }
        if (!best) return failure("noTarget");
        if (!inArea(pc, range + EPS, best.e)) return failure("outOfRange", { targetEventId: best.e.eventId() });
        return { ok: true, event: best.e };
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
        const result = options.gauge !== false && typeof gauge?.trackDamage === "function" ? gauge.trackDamage(id, { attackId, source: "damage:themis" }, apply) : apply();
        safe(() => root.ProjectRFieldCombat?.reportHit?.({ enemyId: id, heavy: options.heavy === true, serial: attackId, hp0 }));          // 命中の手応え(点滅・反動・ヒットストップ・SE)。見た目だけ
        return result;
    };

    // ---------------------------------------------------------------- 罪状の台帳(敵ごと・最大 3・追加のたびに 8 秒の期限を取り直す・期限切れで全消去) ----------------------------------------------------------------
    const sins = new Map();           // event -> { map, stacks, remaining, fx }
    const sinFxOf = (e, stacks) => fx.ring({ follow: () => bodyCenter(e) }, 0.45 + 0.13 * stacks, { color: stacks >= SIN_MAX ? 0xff3355 : 0xff8aa8, persistent: true, hold: true, from: 1, to: 1, alpha: 0.4 + 0.18 * stacks, frames: 1 });
    const clearSin = (e, reason) => { const s = sins.get(e); if (!s) return 0; if (s.fx) fx.dispose(s.fx); sins.delete(e); void reason; return s.stacks; };
    const stacksOf = e => { const s = e ? sins.get(e) : null; return s && s.map === map() ? s.stacks : 0; };
    const addSin = (e, source) => {
        if (!alive(e)) return failure("invalidTarget");
        let s = sins.get(e);
        if (s && s.map !== map()) { clearSin(e, "mapChanged"); s = null; }
        if (!s) { s = { map: map(), stacks: 0, remaining: 0, fx: null }; sins.set(e, s); }
        const before = s.stacks;
        s.stacks = Math.min(SIN_MAX, s.stacks + 1); s.remaining = SIN_SECONDS;              // 満タンでも期限は取り直す
        if (s.fx) fx.dispose(s.fx);
        s.fx = sinFxOf(e, s.stacks);
        return { ok: true, eventId: e.eventId(), before, stacks: s.stacks, remaining: s.remaining, source };
    };
    const sin = Object.freeze({ MAX: SIN_MAX, SECONDS: SIN_SECONDS, stacksOf, add: addSin, consume: e => clearSin(e, "consumed"),
        remainingOf: e => { const s = e ? sins.get(e) : null; return s ? s.remaining : 0; } });

    // ---------------------------------------------------------------- 戒律の宣告 / 断罪の判決 / 審理の鎖: カーソル上の敵1体 ----------------------------------------------------------------
    const edict = () => {
        if (!balanceReady()) return failure("balanceUnavailable");
        const eff = effectsOf(CARD.edict);
        if (!eff) return failure("invalidState");
        const picked = pickEnemy(constant(CARD.edict, "castRangeTiles", 4));
        if (!picked.ok) return picked;
        const e = picked.event, scale = num(eff.damageScale, 1), id = e.eventId(), pc = playerCenter();
        try { physicalDamage(e, scale, `themis_edict:${++serial}`); } catch (error) { return failure("damageFailed", { detail: String(error && error.message || error) }); }
        const added = addSin(e, "edict");                                                                // 当たったら罪状 +1(ダメージで倒れた敵には付かない)
        if (pc) fx.line(pc, bodyCenter(e), 0.35, { color: 0xffe8a0, frames: 12, alpha: 0.9 });
        fx.ring({ follow: () => bodyCenter(e) }, 0.9, { color: 0xffffff, from: 0.3, to: 1.1, frames: 14 });
        se("Blow1", 80);
        return remember("edict", { ok: true, targetEventId: id, damageScale: scale, level: cardLevel(CARD.edict), sin: added.ok ? added.stacks : 0 });
    };
    const verdict = () => {
        if (!balanceReady()) return failure("balanceUnavailable");
        const eff = effectsOf(CARD.verdict);
        if (!eff) return failure("invalidState");
        const picked = pickEnemy(constant(CARD.verdict, "castRangeTiles", 4));
        if (!picked.ok) return picked;
        const e = picked.event, id = e.eventId(), stacks = stacksOf(e), bonus = constant(CARD.verdict, "sinStackBonus", 0.4);
        const scale = num(eff.damageScale, 1.6) * (1 + bonus * stacks), pc = playerCenter();
        try { physicalDamage(e, scale, `themis_verdict:${++serial}`, { heavy: true }); } catch (error) { return failure("damageFailed", { detail: String(error && error.message || error) }); }   // 失敗したら罪状は消費しない
        clearSin(e, "consumed");                                                                         // ダメージが出た後にだけ、その敵の罪状を全部消費する
        if (pc) fx.line(pc, bodyCenter(e), 0.5, { color: 0xff6a8a, frames: 14, alpha: 1 });
        fx.ring({ follow: () => bodyCenter(e) }, 1.2, { color: 0xff3355, from: 0.3, to: 1.2, frames: 18 });
        se("Slash2", 60); se("Blow1", 70);
        return remember("verdict", { ok: true, targetEventId: id, level: cardLevel(CARD.verdict), stacksConsumed: stacks, damageScale: scale });
    };

    // ---------------------------------------------------------------- 審理の鎖: 罪状 +1 / 拘束(通常の敵)・移動速度低下(ボス) ----------------------------------------------------------------
    const holds = new Map();      // event -> { map, kind, factor, remaining, fx }
    const releaseHold = event => { const h = holds.get(event); if (h && h.fx) fx.dispose(h.fx); holds.delete(event); safe(() => modifiers()?.clearCharacterSpeedFactor?.(event, SPEED_ID)); };
    const applyHold = (event, kind, factor, seconds) => {
        const r = safe(() => modifiers()?.setCharacterSpeedFactor?.(event, SPEED_ID, factor), null);
        if (!r || r.ok !== true) return false;
        holds.set(event, { map: map(), kind, factor, remaining: seconds });                   // 重ねがけはしない: 1体に1つ。効果中の再発動は、残り時間を取り直すだけ
        return true;
    };
    const chainSkill = () => {
        if (!balanceReady()) return failure("balanceUnavailable");
        if (!modifiers() || typeof modifiers().setCharacterSpeedFactor !== "function") return failure("modifiersUnavailable");
        const eff = effectsOf(CARD.chain);
        if (!eff) return failure("invalidState");
        const picked = pickEnemy(constant(CARD.chain, "castRangeTiles", 3.5));
        if (!picked.ok) return picked;
        const e = picked.event, id = e.eventId(), boss = isBoss(e), pc = playerCenter();
        const result = { ok: true, targetEventId: id, level: cardLevel(CARD.chain), boss, immobilized: false, slowed: false, resisted: false, seconds: num(eff.immobilizeSeconds, 0) };
        const added = addSin(e, "chain");
        result.sin = added.ok ? added.stacks : 0;
        if (resists(e)) result.resisted = true;                                                  // 耐性: 拘束・低下だけが効かない(罪状は付く)
        else {
            const before = holds.get(e);
            if (boss) result.slowed = applyHold(e, "slow", num(eff.slowFactor, 1), num(eff.slowSeconds, num(eff.immobilizeSeconds, 0)));
            else result.immobilized = applyHold(e, "immobilize", IMMOBILE_FACTOR, num(eff.immobilizeSeconds, 0));
            const hold = holds.get(e);
            if (hold) {
                if (before && before.fx) fx.dispose(before.fx);
                hold.fx = fx.ring({ follow: () => bodyCenter(e) }, 0.7, { color: boss ? 0xffc27f : 0x9fe0ff, hold: true, from: 1, to: 1, alpha: 0.6, frames: Math.max(12, Math.round(hold.remaining * FPS)) });
            }
        }
        if (pc) fx.line(pc, bodyCenter(e), 0.25, { color: 0xc8d0ff, frames: 16, alpha: 0.9 });            // 鎖
        se("Door1", 70);
        return remember("chain", result);
    };

    // ---------------------------------------------------------------- 衡平の天秤: 一定時間の被ダメージ軽減 + 最初の敵の直接攻撃の元の敵へ罪状 +1 ----------------------------------------------------------------
    let scales = null;                  // { remaining, reduction, granted, level, serial, fx }
    let observing = false;
    const statusLedger = () => { const s = root.ProjectRApolloStatus; return s && typeof s.apply === "function" && typeof s.remove === "function" ? s : null; };
    const endScales = reason => {
        if (!scales) return;
        safe(() => statusLedger()?.remove("player", BALANCE_ID));
        if (scales.fx) fx.dispose(scales.fx);
        remember("balanceEnd", { ok: true, reason, granted: scales.granted });
        scales = null;
    };
    const balanceSkill = () => {
        if (!balanceReady()) return failure("balanceUnavailable");
        if (scales) return failure("alreadyActive");
        const ledger = statusLedger(), eff = effectsOf(CARD.balance);
        if (!ledger) return failure("statusLedgerUnavailable");
        if (!eff) return failure("invalidState");
        const reduction = Math.min(0.95, Math.max(0, num(eff.incomingReduction, 0.2))), seconds = constant(CARD.balance, "durationSeconds", 2.5);
        const r = safe(() => ledger.apply("player", BALANCE_ID, { seconds, damageTaken: 1 - reduction, source: "themis" }), null);
        if (!r || r.ok !== true) return failure("statusRejected", { detail: r && r.reason || null });
        scales = { remaining: seconds, reduction, granted: false, level: cardLevel(CARD.balance), serial: ++serial, fx: null };
        scales.fx = fx.ring({ follow: () => playerCenter() }, 1.0, { color: 0xffd98a, hold: true, from: 1, to: 1, alpha: 0.7, frames: Math.round(seconds * FPS) + 2 });
        se("Barrier", 90);
        return remember("balance", { ok: true, reduction, seconds, level: scales.level });
    };
    const sourceEnemy = interpreter => {
        const id = Number(interpreter && interpreter._eventId);
        if (!(id > 0)) return null;
        const e = safe(() => map().event(id), null);
        return isEnemy(e) ? e : null;
    };
    // 観測だけ(ダメージの値は変えない。軽減は ApolloStatus → DamageModifiers が行う)。効果中に、敵の直接攻撃が主人公の HP を減らす呼び出しの最初の1回だけ、元の敵へ罪状 +1。
    //   環境ダメージ(敵ではないイベント・呼び出し元なし)は数えない。Janus の反照が無効にする攻撃も数えない。
    const installObserver = () => {
        const commands = typeof PluginManager !== "undefined" ? PluginManager._commands : null, key = `${ENGINE}:UpdateEventHp`;
        const original = commands && commands[key];
        if (typeof original !== "function" || original.__projectRThemis) return false;
        const wrapped = function(args) {
            if (scales && !scales.granted && String(args && args.eventId).toLowerCase() === "player" && /^\s*-/.test(String(args && args.value))) {
                const source = sourceEnemy(this), negated = safe(() => !!root.ProjectRJanusSkills?.getState?.().armed, false);
                if (source && !negated && alive(source)) {
                    scales.granted = true;
                    const added = addSin(source, "balance");
                    remember("balanceHit", { ok: true, attackerEventId: source.eventId(), sin: added.ok ? added.stacks : 0 });
                }
            }
            return original.apply(this, arguments);
        };
        wrapped.__projectRThemis = true;
        commands[key] = wrapped;
        observing = true;
        return true;
    };

    // ---------------------------------------------------------------- 罪科の刻印(FieldCombat の3段コンボ): 3段目の斬撃に当たった敵ごとに罪状 +1 ----------------------------------------------------------------
    const watched = [];               // 3段目の斬撃の serial(古いものから捨てる)
    let hitListening = false;
    const onSwordHit = payload => {
        if (!payload || !watched.includes(payload.serial)) return;
        const e = safe(() => map().event(Number(payload.enemyId)), null);
        if (e && alive(e)) addSin(e, "sin_mark");
    };
    const watchSwing = swingSerial => {
        if (!Number.isFinite(Number(swingSerial))) return false;
        if (!hitListening) { const add = safe(() => root.ProjectRSwordSystem.addHitListener, null); if (typeof add === "function") { add(onSwordHit); hitListening = true; } }
        watched.push(swingSerial); while (watched.length > 8) watched.shift();
        return hitListening;
    };

    // ---------------------------------------------------------------- 時計・後片付け ----------------------------------------------------------------
    const prune = () => {
        for (const e of [...sins.keys()]) { const s = sins.get(e); if (!s || s.map !== map() || !alive(e)) clearSin(e, "gone"); }
        for (const event of [...holds.keys()]) { const h = holds.get(event); if (h.map !== map() || !alive(event)) releaseHold(event); }
    };
    const tick = seconds => {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        for (const e of [...sins.keys()]) { const s = sins.get(e); if (!s) continue; s.remaining -= seconds; if (s.remaining < 1e-8) clearSin(e, "expired"); }       // 期限切れ: 全部消える
        prune();
        for (const [event, hold] of [...holds]) { hold.remaining -= seconds; if (hold.remaining < 1e-8) releaseHold(event); }
        if (scales) { scales.remaining -= seconds; if (scales.remaining < 1e-8) endScales("expired"); }
    };
    const clearAll = reason => {
        for (const e of [...sins.keys()]) clearSin(e, reason);
        for (const event of [...holds.keys()]) releaseHold(event);
        endScales(reason); watched.length = 0; fx.clear();
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
            if (sins.size || holds.size) prune();                                                  // 倒れた敵の罪状・拘束は、その場で消える
            if (fx.count()) fx.tick();                                                             // 見た目の時間は、マップの更新と同じ(メニュー・停止中は進まない)
            if (scales && playerDead()) endScales("playerDead");
        };
    }
    if (typeof DataManager !== "undefined") {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { clearAll("load"); return _extract.apply(this, arguments); };
    }
    installObserver();

    // ---------------------------------------------------------------- カードの発動の窓口(カード定義の targetType ごとに、cardId で振り分けて、ほかのカードは前の handler へ) ----------------------------------------------------------------
    const chainHandler = (targetType, table) => {
        const previous = deck.getActivationHandler(targetType);
        deck.registerActivationHandler(targetType, context => {
            const fn = table[context?.definition?.cardId];
            if (fn) return fn(context);
            return typeof previous === "function" ? previous(context) : { ok: true };
        });
    };
    // 罪科の刻印 = フィールド戦闘の基本攻撃(3段コンボ)。カード戦闘の手札からは発動しない(何も消費しない)。
    chainHandler("direction", { [CARD.mark]: () => failure("fieldCombatOnly") });
    chainHandler("ground", { [CARD.edict]: edict, [CARD.chain]: chainSkill, [CARD.verdict]: verdict });
    chainHandler("instant", { [CARD.balance]: balanceSkill });

    root.ProjectRThemisSkills = Object.freeze({
        VERSION: "0.1.0", CARD, sin,
        cardLevel, effectsOf, isBoss, resists, aimPoint, playerCenter, liveEnemies, inArea, physicalDamage, fx, watchSwing,       // ProjectR_ThemisUltimate・FieldCombat が使う
        getState: () => ({ sins: [...sins].map(([e, s]) => ({ eventId: e.eventId(), stacks: s.stacks, remaining: s.remaining })),
            holds: [...holds].map(([e, h]) => ({ eventId: e.eventId(), kind: h.kind, factor: h.factor, remaining: h.remaining })),
            balance: scales ? { remaining: scales.remaining, reduction: scales.reduction, granted: scales.granted, level: scales.level } : null, watched: [...watched], observing }),
        getLastResult: key => (key ? (lastResults[key] ? { ...lastResults[key] } : null) : Object.fromEntries(Object.entries(lastResults).map(([k, v]) => [k, { ...v }]))),
        clear: clearAll
    });
})();
