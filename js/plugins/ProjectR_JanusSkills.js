/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR Janus の通常スキル(Stage 2): 閉門・反照・表裏転化・境界断ち。双門(基本攻撃の2段コンボ)は ProjectR_FieldCombat。
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
 * ProjectR_JanusSkills.js
 *
 * Janus の指輪(RingLoadout)の通常スキルのうち、カードの発動の窓口(registerActivationHandler)で動く4つを実装します。
 * 装備・SKILL メニュー・HUD・保存・Cooldown はすべて既存の仕組み(RingLoadout / FieldCombat)のままで、新しい保存データはありません。
 * 数値は ProjectR_CardBalance(janus_*)。レベルは所持データの cardOwnership の level(累積・置換は CardBalance の規則)。
 *
 * 【閉門 janus_closed_gate】 カーソル方向の最大 3 マス先(壁の手前で止まる)を中心に、半径 1.2 マスの範囲へ即時に発動。ダメージなし。Cooldown 10 秒。
 *   通常の敵は 1.5 / 2.0 / 2.5 秒の「拘束」(移動できない。攻撃は止めない)。ボスは同じ時間の移動速度低下 20 / 25 / 30 %(速度 80 / 75 / 70 %)。
 *   発動の瞬間に範囲(壁を挟まない)にいる敵にだけ1回。重ねがけはしない(効果中の再発動は残り時間を取り直すだけ)。
 *   耐性: Hendrix の公式の状態付与(AddState)と同じ判定(ScheckStateResistanceH)に委ねる。データベースの麻痺(12)・スタン(13)の無効化(「状態異常防止」を含む)・状態有効度(0 = 必ず効かない / 1 = 必ず効く / 途中は確率)が敵にあれば効かない(専用のステートは作らない)。
 *   拘束は、敵の移動速度の係数(ProjectRCardModifiers.setCharacterSpeedFactor。0.0001 倍)で実現する。敵の攻撃の予約・判定には触れない。
 *   ボス = <fieldBoss> のタグを持つ敵、または複数の段階を持つ強敵(ProjectRFieldStrongEnemy.getPhase の phaseCount > 1)。
 * 【反照 janus_reflection】 Cooldown 9 秒。受付 0.4 / 0.5 / 0.6 秒の間、敵の直接攻撃(近接・飛び道具)の1回を無効にし(ダメージ・予約済みの命中の消費はそのまま)、
 *   その攻撃の元の敵が 3 マス以内にいて有効なら、基礎物理ダメージの 100 / 125 / 150 % で反撃する。弾の反射・環境ダメージの無効化・カウンターの連鎖はなし(反撃のダメージは敵への攻撃で、受付は1回で終わる)。
 *   実装: Hendrix の UpdateEventHp(対象 = 主人公・値がマイナス・呼び出し元が敵イベント)を、受付の間だけ1回止める。環境・敵ではないイベントのダメージは止めない。
 * 【表裏転化 janus_inversion】 カーソル上の通常の敵1体と位置を入れ替える(2.5 / 3.0 / 3.5 マス以内)。Cooldown 12 秒。ダメージなし。
 *   両方の移動先(相手の位置)を、マップの端・壁(CombatOcclusion)・DotMove の衝突で確かめ、1つでも危ないとき・ボス・無効な対象・範囲外は、何も動かさず、Cooldown も使わない(失敗で返す)。
 *   入れ替えたあと、その敵の溜め中の攻撃(予約)は中断する(古い位置から出る攻撃が、入れ替わった主人公に当たらないように。仕様にはない安全のための動き)。
 * 【境界断ち janus_boundary_slash】 Cooldown 7 秒。0.2 秒の予備動作のあと、発動の瞬間の位置・マウスの向きへ、長さ 4 マス × 幅 1.2 マスの直線の範囲を斬る(貫通)。
 *   基礎物理ダメージの 180 / 210 / 240 %(防御は無視しない)。同じ敵に1回。壁を挟んだ敵には当たらない(CombatOcclusion の視線)。
 *
 * 実行時のみ(セーブしない)。戦闘の終了・マップ移動・ロードですべて解除する。ProjectRJanusSkills.getState() / getLastResult()(診断)。
 * 見た目: 専用の素材は無く、既存の SE と、コードで描く輪・線(画像ファイルは参照しない)だけ。命中の手応え(点滅・反動・ヒットストップ・SE)は FieldCombat の既存の仕組み(reportHit)へ通知する。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = Object.freeze({ dual: "janus_dual_gate", closed: "janus_closed_gate", reflection: "janus_reflection", inversion: "janus_inversion", slash: "janus_boundary_slash" });
    const FPS = 60, EPS = 1e-6;
    const SPEED_ID = "janus_closed_gate", IMMOBILE_FACTOR = 0.0001, RESIST_STATES = Object.freeze([12, 13]);
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

    // ---------------------------------------------------------------- 見た目: コードで描く輪・線(画像・音声などの素材ファイルは新しく参照しない) ----------------------------------------------------------------
    // 表示だけ。失敗(描画できない・親が無い)してもスキルの効果・ダメージ・Cooldown には何も影響しない。マップの移動・ロード・戦闘終了で全部片づける。
    const fx = (() => {
        const entries = [];
        const stats = { created: 0, disposed: 0, failed: 0, lastReason: "" };               // 診断用
        const RING_UNIT = 76;                                   // 輪の画像で、いちばん明るい所の半径(px)
        let ringBitmap = null, lineBitmap = null;
        const layer = () => { const ss = safe(() => SceneManager._scene._spriteset, null); return (ss && (ss._effectsContainer || ss._tilemap)) || null; };
        const makeRing = () => {
            if (ringBitmap) return ringBitmap;
            const bitmap = new Bitmap(192, 192), c = bitmap.context;
            if (c) safe(() => {                                                          // 描けない環境でも、空の画像のまま動く(見た目が出ないだけ)
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
            safe(() => { (entry.parent || entry.sprite.parent).removeChild(entry.sprite); });      // 共有の画像は壊さない(destroy しない)
        };
        const add = (sprite, total, spec, update) => {
            const parent = layer();
            if (!parent || !map()) { stats.failed++; stats.lastReason = parent ? "noMap" : "noLayer"; return null; }
            sprite.z = 8; sprite.blendMode = 1;                                                          // 1 = 加算合成
            if (spec.color !== undefined) sprite.tint = spec.color;
            parent.addChild(sprite);
            const entry = { sprite, parent, frame: 0, total: Math.max(1, Math.round(total)), at: spec.at || null, follow: spec.follow || null, update, map: map() };
            entries.push(entry); stats.created++;
            place(entry);
            return entry;
        };
        // 入って(0 → 15%)・抜ける(65% → 100%)明るさ。hold のときは長い間ほぼ一定で、最後だけ抜ける。
        const alphaAt = (t, peak, hold) => peak * (hold ? Math.min(1, t / 0.06, (1 - t) / 0.12) : Math.min(1, t / 0.15, (1 - t) / 0.35));
        // 輪: at(マップ座標・タイル)または follow(毎フレームの位置)。radiusTiles の輪が、from 倍 → to 倍へ変わる。
        const ring = (spec, radiusTiles, o = {}) => safe(() => {
            const bitmap = makeRing();
            if (!bitmap) return null;
            const sprite = new Sprite(bitmap), r = radiusTiles * map().tileWidth(), from = num(o.from, 0.3), to = num(o.to, 1), peak = num(o.alpha, 0.9);
            sprite.anchor.set(0.5, 0.5);
            return add(sprite, num(o.frames, 20), { at: spec.at, follow: spec.follow, color: o.color }, (t, s) => {
                const k = from + (to - from) * (o.hold ? t : 1 - (1 - t) * (1 - t)), scale = r * k / RING_UNIT;
                s.scale.set(scale, scale);
                s.opacity = Math.round(255 * Math.max(0, Math.min(1, alphaAt(t, peak, o.hold === true))));
            });
        }, null);
        // 線(境界断ち): origin から degree(0 = 上・時計回り)の向きへ lengthTiles。widthTiles の幅が、from 倍 → to 倍へ変わる。
        const line = (origin, degree, lengthTiles, widthTiles, o = {}) => safe(() => {
            const bitmap = makeLine();
            if (!bitmap) return null;
            const sprite = new Sprite(bitmap), m = map(), from = num(o.from, 1), to = num(o.to, 1), peak = num(o.alpha, 0.9);
            sprite.anchor.set(0, 0.5); sprite.rotation = (degree - 90) * Math.PI / 180;
            return add(sprite, num(o.frames, 10), { at: origin, color: o.color }, (t, s) => {
                s.scale.set(lengthTiles * m.tileWidth() / 64, widthTiles * m.tileHeight() * (from + (to - from) * t) / 64);
                s.opacity = Math.round(255 * Math.max(0, Math.min(1, alphaAt(t, peak, o.hold === true))));
            });
        }, null);
        const clear = () => { for (const entry of entries.slice()) dispose(entry); };
        const tick = () => {
            for (const entry of entries.slice()) {
                if (entry.map !== map()) { dispose(entry); continue; }
                if (++entry.frame > entry.total) { dispose(entry); continue; }
                safe(() => place(entry));
            }
        };
        return { ring, tick, line, dispose, clear, stats: () => ({ ...stats }), count: () => entries.length, entries: () => entries.map(e => ({ frame: e.frame, total: e.total })) };
    })();
    let lastResults = {};
    const remember =(key, result) => { lastResults[key] = { ...result, frame: frameNo }; return result; };
    let frameNo = 0, serial = 0;

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
    // 麻痺(12)・スタン(13)のどちらかを無効にする敵は効かない。有効度は確率として扱い(0 = 必ず効かない / 1 = 必ず効く。AddState と同じ)、2つの状態のうち低い方で1回だけ判定する。
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
    // カーソルのマップ座標(タイル。小数)
    const cursorPoint = () => { const m = map(); return m && typeof TouchInput !== "undefined" ? { x: m.displayX() + TouchInput.x / m.tileWidth(), y: m.displayY() + TouchInput.y / m.tileHeight() } : null; };

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
    // options.gauge === false: 与ダメージでゲージを増やさない(奥義のダメージ。Hermes・Apollo の奥義と同じ既定)
    const physicalDamage = (event, scale, attackId, options = {}) => {
        const id = event.eventId(), gauge = root.ProjectRUltimateGauge;
        const hp0 = hpOf(id);                                                                   // ダメージの前の HP(命中の手応えが、実際に減ったことを確かめるため)
        const apply = () => withDamageWeapon(meleeWeaponId(), () => command("UpdateEventHp", { eventId: String(id), value: damageValueOf(scale), exceedMaxHealth: "false", projectRAttackId: attackId }, 0));
        const result = options.gauge !== false && typeof gauge?.trackDamage === "function" ? gauge.trackDamage(id, { attackId, source: "damage:janus" }, apply) : apply();
        // 命中の手応え(点滅・反動・ヒットストップ・SE)。既存の FieldCombat の仕組みへ通知するだけ(見た目と、当たった敵だけの短い停止。ダメージ・判定・時間は変えない)
        safe(() => root.ProjectRFieldCombat?.reportHit?.({ enemyId: id, heavy: options.heavy === true, serial: attackId, hp0 }));
        return result;
    };
    // カーソル方向の最大 range マス先の点(壁の手前で止まる。マップの内側)。{ ok, center, distance } / { ok:false, reason }
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
    const playerDead = () => safe(() => root.ProjectR?.PlayerDeath?.isDead?.() === true, false);

    // ---------------------------------------------------------------- 閉門: 拘束(通常の敵)/ 移動速度低下(ボス) ----------------------------------------------------------------
    const holds = new Map();      // event -> { map, kind, factor, remaining }
    const releaseHold = event => { const h = holds.get(event); if (h && h.fx) fx.dispose(h.fx); holds.delete(event); safe(() => modifiers()?.clearCharacterSpeedFactor?.(event, SPEED_ID)); };
    const applyHold = (event, kind, factor, seconds) => {
        const r = safe(() => modifiers()?.setCharacterSpeedFactor?.(event, SPEED_ID, factor), null);
        if (!r || r.ok !== true) return false;
        holds.set(event, { map: map(), kind, factor, remaining: seconds });                   // 重ねがけはしない: 1体に1つ。効果中の再発動は、残り時間を取り直すだけ
        return true;
    };
    const closedGate = () => {
        const p = player(), m = map(), occ = occlusion();
        if (!p || !m || !occ || typeof occ.firstBlockerBetween !== "function") return failure("movementUnavailable");
        if (!balanceReady()) return failure("balanceUnavailable");
        if (!modifiers() || typeof modifiers().setCharacterSpeedFactor !== "function") return failure("modifiersUnavailable");
        const eff = effectsOf(CARD.closed), pc = playerCenter();
        if (!eff || !pc) return failure("invalidState");
        const castRange = constant(CARD.closed, "castRangeTiles", 3), radius = constant(CARD.closed, "radiusTiles", 1.2);
        const aim = aimPoint(castRange);                                                           // カーソル方向の最大 castRange マス先(壁の手前で止まる)
        if (!aim.ok) return aim;
        const center = aim.center;
        const result = { ok: true, center, radius, level: cardLevel(CARD.closed), immobilized: [], slowed: [], resisted: [], seconds: num(eff.immobilizeSeconds, 0) };
        for (const e of liveEnemies()) {
            if (!inArea(center, radius, e)) continue;
            const id = e.eventId(), boss = isBoss(e);
            if (resists(e)) { result.resisted.push(id); continue; }
            const before = holds.get(e);
            if (boss) { if (applyHold(e, "slow", num(eff.slowFactor, 1), num(eff.slowSeconds, num(eff.immobilizeSeconds, 0)))) result.slowed.push(id); }
            else if (applyHold(e, "immobilize", IMMOBILE_FACTOR, num(eff.immobilizeSeconds, 0))) result.immobilized.push(id);
            const hold = holds.get(e);
            if (hold) {                                                                           // 拘束・低下している間、敵に小さな輪を出す(効果中の再発動では出し直す)
                if (before && before.fx) fx.dispose(before.fx);
                hold.fx = fx.ring({ follow: () => bodyCenter(e) }, 0.7, { color: boss ? 0xffc27f : 0x7fe0ff, hold: true, from: 1, to: 1, alpha: 0.7, frames: Math.max(12, Math.round(hold.remaining * FPS)) });
            }
        }
        fx.ring({ at: center }, radius, { color: 0x7fe0ff, from: 1.5, to: 1, frames: 20 });          // 門が閉じる輪
        se("Door1", 90);
        return remember("closed", result);
    };

    // ---------------------------------------------------------------- 反照: 受付の間、敵の直接攻撃の1回を無効にして反撃 ----------------------------------------------------------------
    let armed = null;             // { remaining, scale, range, level, serial }
    let armedFx = null;           // 受け流し待機の輪(見た目だけ。getState には載せない)
    let countering = false;
    const disarm = reason => { if (armed) { remember("reflectionEnd", { ok: true, reason }); armed = null; } if (armedFx) { fx.dispose(armedFx); armedFx = null; } };
    const reflection = () => {
        if (!balanceReady()) return failure("balanceUnavailable");
        if (armed) return failure("alreadyArmed");
        const eff = effectsOf(CARD.reflection);
        if (!eff) return failure("invalidState");
        armed = { remaining: num(eff.counterWindowSeconds, 0.4), scale: num(eff.damageScale, 1), range: constant(CARD.reflection, "rangeTiles", 3), level: cardLevel(CARD.reflection), serial: ++serial };
        if (armedFx) fx.dispose(armedFx);
        armedFx = fx.ring({ follow: () => playerCenter() }, 0.95, { color: 0xffe08a, hold: true, from: 1, to: 1, alpha: 0.75, frames: Math.round(armed.remaining * FPS) + 2 });
        se("Barrier", 110);
        return remember("reflection", { ok: true, window: armed.remaining, scale: armed.scale, level: armed.level });
    };
    const sourceEnemy = interpreter => {
        const id = Number(interpreter && interpreter._eventId);
        if (!(id > 0)) return null;
        const e = safe(() => map().event(id), null);
        return isEnemy(e) ? e : null;
    };
    const consumeHit = source => {
        const a = armed; armed = null;
        if (armedFx) { fx.dispose(armedFx); armedFx = null; }
        const result = { ok: true, negated: true, attackerEventId: source.eventId(), countered: false, scale: a.scale, level: a.level };
        const pc = playerCenter();
        if (pc && alive(source) && Math.hypot(bodyCenter(source).x - pc.x, bodyCenter(source).y - pc.y) <= a.range) {
            countering = true;
            try { physicalDamage(source, a.scale, `janus_reflection:${a.serial}`); result.countered = true; } finally { countering = false; }
        }
        if (pc) fx.ring({ at: pc }, 1.3, { color: 0xffffff, from: 0.4, to: 1.2, frames: 14 });                   // 受け流しの光(主人公)
        fx.ring({ follow: () => bodyCenter(source) }, 1.0, { color: 0xffe08a, from: 0.3, to: 1.1, frames: 16 });        // 反撃の光(攻撃者)
        se("Blow1", 120);
        remember("reflectionHit", result);
    };
    const installDamageGuard = () => {
        const commands = typeof PluginManager !== "undefined" ? PluginManager._commands : null, key = `${ENGINE}:UpdateEventHp`;
        const original = commands && commands[key];
        if (typeof original !== "function" || original.__projectRJanus) return false;
        const wrapped = function(args) {
            if (armed && !countering && String(args && args.eventId).toLowerCase() === "player" && /^\s*-/.test(String(args && args.value))) {
                const source = sourceEnemy(this);
                if (source) { consumeHit(source); return undefined; }             // 敵の直接攻撃の1回を無効にする。敵ではない(環境など)ダメージは止めない
            }
            return original.apply(this, arguments);
        };
        wrapped.__projectRJanus = true;
        commands[key] = wrapped;
        return true;
    };

    // ---------------------------------------------------------------- 表裏転化: カーソル上の通常の敵と位置を入れ替える ----------------------------------------------------------------
    const pickTarget = range => {
        const cursor = cursorPoint(), pc = playerCenter(), occ = occlusion();
        if (!cursor || !pc) return failure("invalidMousePosition");
        let best = null;
        for (const e of liveEnemies()) {
            const polygon = safe(() => occ.eventPolygon(e), null);
            if (!polygon || polygon.length < 3) continue;
            const c = bodyCenter(e), d = Math.hypot(c.x - cursor.x, c.y - cursor.y), inside = pointInPolygon(cursor, polygon);
            if (!inside && d > 0.75) continue;
            if (!best || (inside && !best.inside) || (inside === best.inside && d < best.d)) best = { e, d, inside };
        }
        if (!best) return failure("noTarget");
        if (Math.hypot(bodyCenter(best.e).x - pc.x, bodyCenter(best.e).y - pc.y) > range + EPS) return failure("outOfRange");
        return { ok: true, event: best.e };
    };
    const landingSafe = (character, dest, partner) => {
        const m = map(), occ = occlusion(), w = character.width(), h = character.height();
        if (![dest.x, dest.y].every(Number.isFinite)) return false;
        if (dest.x < -1e-9 || dest.y < -1e-9 || dest.x + w > m.width() + 1e-9 || dest.y + h > m.height() + 1e-9) return false;
        const inset = 0.05, half = { x: w / 2 - inset, y: h / 2 - inset };
        const footprint = [{ x: -half.x, y: -half.y }, { x: half.x, y: -half.y }, { x: half.x, y: half.y }, { x: -half.x, y: half.y }];
        const c = { x: dest.x + w / 2, y: dest.y + h / 2 };
        if (safe(() => occ.firstBlockerBetween(c, c, { mode: "combat", unwrapped: true, footprint }), null)) return false;
        const mover = safe(() => character.mover(), null);
        if (!mover || typeof mover.createCollisionChecker !== "function") return false;
        const checker = mover.createCollisionChecker({ overComplementMode: true });
        for (const dir of [2, 4, 6, 8]) {
            const results = safe(() => checker.checkCollision(dest.x, dest.y, dir), null);
            if (results === null) return false;
            if (results.some(r => r && r.targetObject !== partner && r.targetObject !== character)) return false;
        }
        return true;
    };
    const inversion = () => {
        const p = player(), m = map(), occ = occlusion();
        if (!p || !m || !occ || typeof occ.firstBlockerBetween !== "function") return failure("movementUnavailable");
        if (!balanceReady()) return failure("balanceUnavailable");
        if (!safe(() => p.canMove(), false) || safe(() => p.isInVehicle?.(), false)) return failure("playerMovementLocked");
        if (safe(() => p.isThrough?.() || p.isDebugThrough?.(), false)) return failure("playerThrough");
        const eff = effectsOf(CARD.inversion);
        if (!eff) return failure("invalidState");
        const range = num(eff.rangeTiles, 2.5), picked = pickTarget(range);
        if (!picked.ok) return picked;
        const e = picked.event;
        if (isBoss(e)) return failure("bossImmune");
        const pw = p.width(), ph = p.height(), ew = e.width(), eh = e.height();
        const pc = { x: p._realX + pw / 2, y: p._realY + ph / 2 }, ec = { x: e._realX + ew / 2, y: e._realY + eh / 2 };
        const pDest = { x: ec.x - pw / 2, y: ec.y - ph / 2 }, eDest = { x: pc.x - ew / 2, y: pc.y - eh / 2 };
        if (!landingSafe(p, pDest, e) || !landingSafe(e, eDest, p)) return failure("unsafeSwap");
        const pStart = { x: p._realX, y: p._realY }, eStart = { x: e._realX, y: e._realY };
        try {
            p.setPosition(pDest.x, pDest.y); e.setPosition(eDest.x, eDest.y);
            const ok = Math.hypot(p._realX - pDest.x, p._realY - pDest.y) < 1e-4 && Math.hypot(e._realX - eDest.x, e._realY - eDest.y) < 1e-4;
            if (!ok) throw Error("invalidMovementResult");
        } catch (error) {
            p.setPosition(pStart.x, pStart.y); e.setPosition(eStart.x, eStart.y);
            return failure("swapFailed", { detail: String(error && error.message || error) });
        }
        fx.ring({ at: pc }, 0.9, { color: 0xc9a2ff, from: 0.3, to: 1.2, frames: 18 }); fx.ring({ at: ec }, 0.9, { color: 0xc9a2ff, from: 0.3, to: 1.2, frames: 18 });   // 入れ替わった2か所
        safe(() => p.cancelMove?.()); safe(() => $gameTemp?.clearDestination?.());
        safe(() => root.ProjectREnemyAttack?.interrupt?.(e.eventId(), "janusInversion")); safe(() => root.ProjectRFieldStrongEnemy?.interrupt?.(e.eventId(), "janusInversion"));
        se("Evasion1", 90);
        return remember("inversion", { ok: true, targetEventId: e.eventId(), level: cardLevel(CARD.inversion), range, from: pStart, to: pDest });
    };

    // ---------------------------------------------------------------- 境界断ち: 0.2秒の予備動作のあと、直線の範囲を斬る ----------------------------------------------------------------
    let pendingSlash = null;
    let slashFx = null;           // 予備動作の線(見た目だけ)
    const rectangle = (origin, degree, length, width) => {
        const r = degree * Math.PI / 180, ux = Math.sin(r), uy = -Math.cos(r), px = Math.cos(r), py = Math.sin(r), w = width / 2;
        return [{ x: origin.x - px * w, y: origin.y - py * w }, { x: origin.x + px * w, y: origin.y + py * w },
            { x: origin.x + ux * length + px * w, y: origin.y + uy * length + py * w }, { x: origin.x + ux * length - px * w, y: origin.y + uy * length - py * w }];
    };
    const boundarySlash = () => {
        if (!balanceReady()) return failure("balanceUnavailable");
        if (pendingSlash) return failure("slashPending");
        const eff = effectsOf(CARD.slash), pc = playerCenter();
        if (!eff || !pc) return failure("invalidState");
        pendingSlash = { frames: Math.max(0, Math.round(constant(CARD.slash, "windupSeconds", 0.2) * FPS)), windup: 0, origin: pc, degree: mouseDegree(), scale: num(eff.damageScale, 1.8),
            length: constant(CARD.slash, "rangeTiles", 4), width: constant(CARD.slash, "pathWidthTiles", 1.2), level: cardLevel(CARD.slash), serial: ++serial };
        pendingSlash.windup = pendingSlash.frames;
        slashFx = fx.line(pendingSlash.origin, pendingSlash.degree, pendingSlash.length, pendingSlash.width, { color: 0x9fd8ff, from: 0.15, to: 0.5, alpha: 0.6, hold: true, frames: pendingSlash.frames + 1 });
        se("Slash2", 80);
        if (pendingSlash.frames <= 0) fireSlash();
        return remember("slash", { ok: true, windupFrames: pendingSlash ? pendingSlash.windup : 0, degree: pendingSlash ? pendingSlash.degree : null, level: cardLevel(CARD.slash) });
    };
    const fireSlash = () => {
        const s = pendingSlash; pendingSlash = null;
        if (slashFx) { fx.dispose(slashFx); slashFx = null; }
        if (!s) return;
        fx.line(s.origin, s.degree, s.length, s.width, { color: 0xffffff, from: 0.8, to: 0.2, alpha: 1, frames: 12 });          // 斬撃の光
        const occ = occlusion(), clip = rectangle(s.origin, s.degree, s.length, s.width), radius = Math.hypot(s.length, s.width / 2) + 0.01, hit = [];
        for (const e of liveEnemies()) {
            const polygon = safe(() => occ.eventPolygon(e), null);
            if (!polygon || polygon.length < 3 || !safe(() => occ.hasLineToPolygon(s.origin, polygon, { radius, clipPolygon: clip }), false)) continue;
            physicalDamage(e, s.scale, `janus_boundary_slash:${s.serial}`, { heavy: true });              // 1つの斬撃で、敵ごとに1回
            hit.push(e.eventId());
        }
        se("Slash2", 130);
        remember("slashHit", { ok: true, hit, degree: s.degree, scale: s.scale, level: s.level });
    };

    // ---------------------------------------------------------------- 時計・後片付け ----------------------------------------------------------------
    const tick = seconds => {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        for (const [event, hold] of [...holds]) {
            if (hold.map !== map() || !alive(event)) { releaseHold(event); continue; }
            hold.remaining -= seconds;
            if (hold.remaining < 1e-8) releaseHold(event);
        }
        if (armed) { armed.remaining -= seconds; if (armed.remaining < 1e-8) disarm("expired"); }
    };
    const clearAll = reason => {
        for (const event of [...holds.keys()]) releaseHold(event);
        disarm(reason); pendingSlash = null; slashFx = null; fx.clear();
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
            if (fx.count()) fx.tick();                                                        // 見た目の時間は、マップの更新と同じ(メニュー・停止中は進まない)
            if (!pendingSlash || !sceneActive || this.eventsPaused) return;
            if (!deck.isCardBattleActive() || playerDead()) { pendingSlash = null; if (slashFx) { fx.dispose(slashFx); slashFx = null; } return; }
            if (--pendingSlash.frames <= 0) fireSlash();
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
    // 双門 = フィールド戦闘の基本攻撃(2段コンボ)。カード戦闘の手札からは発動しない(何も消費しない)。
    chain("direction", { [CARD.dual]: () => failure("fieldCombatOnly"), [CARD.slash]: boundarySlash });
    chain("ground", { [CARD.closed]: closedGate, [CARD.inversion]: inversion });
    chain("instant", { [CARD.reflection]: reflection });

    root.ProjectRJanusSkills = Object.freeze({
        VERSION: "0.1.0", CARD,
        cardLevel, effectsOf, isBoss, resists, aimPoint, playerCenter, liveEnemies, inArea, physicalDamage, fx,       // ProjectR_JanusUltimate が使う
        getState: () => ({ armed: armed ? { ...armed } : null, slashPending: pendingSlash ? { ...pendingSlash } : null,
            holds: [...holds].map(([e, h]) => ({ eventId: e.eventId(), kind: h.kind, factor: h.factor, remaining: h.remaining })), guardInstalled }),
        getLastResult: key => (key ? (lastResults[key] ? { ...lastResults[key] } : null) : Object.fromEntries(Object.entries(lastResults).map(([k, v]) => [k, { ...v }]))),
        clear: clearAll
    });
})();
