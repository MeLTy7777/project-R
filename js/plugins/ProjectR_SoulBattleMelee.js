/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘 P2-C 近接アダプタ: 遠くの敵ハートに近接攻撃(通常の剣・剣カード・Hermes奥義・薙ぎ払い)を届かせる。SOUL中だけ働く。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @base ProjectR_SoulBattle
 * @base ProjectR_SoulBattlePoC
 * @orderAfter Hendrix_Action_Engine
 * @orderAfter ProjectR_SwordSystem
 * @orderAfter ProjectR_HermesSwordsmanship
 * @orderAfter ProjectR_HermesSweep
 * @orderAfter ProjectR_HermesUltimate
 * @orderAfter ProjectR_SoulBattle
 *
 * @param Enabled
 * @text アダプタを有効にする
 * @desc オフにすると、近接攻撃は従来の射程のままです(ハートが遠いと届きません)。
 * @type boolean
 * @default true
 *
 * @param MaxTipTiles
 * @text 届く距離の上限(タイル。プレイヤー中心から先端まで)
 * @desc これより遠いハートには延長しません(従来どおり届かない)。近接が遠距離を上回る有利さを抑えます。
 * @type number
 * @decimals 1
 * @min 1
 * @max 30
 * @default 8
 *
 * @param Margin
 * @text 先端をハートへ食い込ませる量(タイル)
 * @desc 動くハートでも斬撃の寿命(数フレーム)の間に判定が外れないよう、先端をハートの手前の縁からこの分だけ奥へ伸ばします。
 * @type number
 * @decimals 2
 * @min 0.05
 * @max 1
 * @default 0.25
 *
 * @help
 * ProjectR_SoulBattleMelee.js
 *
 * 【位置づけ】 SOUL戦闘(ProjectR_SoulBattle)の P2-C。近接攻撃の届く範囲は約1.5〜4マスで、SOULの敵ハートが5〜6マス先にあると届きません。
 *   プレイヤーを動かさず、既存のスキルを変えずに、SOULの間だけ届くようにします。SOULが動作していない間(ハートが無い間も)は何もしません。
 *
 * 【対象と方式】
 *   通常の剣 / 剣カード / Hermes奥義 … 斬撃の判定(DynamicHitbox)を作る公式コマンド spawnEventHitbox を包み、
 *       許可リストのタグ(<projectRNormalSword> <projectRHermesSword> <projectRHermesUltimate>)の判定だけ、
 *       「先端がハートに届かないとき」に限って、奥行を延ばします。向き・幅・ダメージ・命中回数は変えません。
 *       延ばした判定は狙った向きの一直線だけなので、狙いを外せば外れます。ハートが判定の幅から外れている/後ろにある/壁の向こう/
 *       上限(MaxTipTiles)より遠い/注釈の書式が読めないときは、何も変えず従来どおりにします。
 *   薙ぎ払い … 判定を作らず、プレイヤー中心から扇形を計算します。発動の同期呼び出しの間だけ、中心を「狙った向き」へずらして計算させます
 *       (try/finally で必ず元に戻す。プレイヤー本体は動かない)。
 *   一閃 … 元から11マス届くので、何もしません。
 *
 * 【専用ステージ(ProjectR_SoulBattleStage)の間だけ】 近接の起点は「マウスカーソルの位置」(遊べる範囲へ収めた点)になります。プレイヤーは動きません。
 *   斬撃の判定(上の許可リストの3種)は、その点から敵ハートの方向へ向けて作られ、判定が残る間は毎フレーム、ハートの現在位置の方向へ向き直ります(ホーミング)。
 *   判定の前方オフセット(通常の剣は1マス)は、ハートまでの距離を超えて進めません(カーソルがハートの真上なら、その位置に置く)。
 *   判定の幅・奥行・寿命・ダメージ・命中回数・Cooldownは変えません。奥行は延長しないので、カーソルがハートから遠い/ハートが避けると外れます(必中ではない)。
 *   薙ぎ払いは、扇形の中心をカーソルの点へ、向きをハートの方向へ置きます(同期呼び出しの間だけ。try/finallyで元へ戻す)。
 *   一閃も、専用ステージの間だけ同じ方式でカーソル起点にします(ステージではプレイヤー=キャラの置き場がハートから遠く、元の11マスでは届かないため。距離・ダメージは元のまま)。
 *
 *   薙ぎ払いは、専用ステージの間だけ、発動から判定までを SWEEP_FRAMES(12)フレームだけ延ばします(通常のマップは発動と同時のまま)。
 *       扇の起点(カーソルの点)と向き(発動の瞬間のハートの方向)は発動時に固定で、ホーミングしません。発動の瞬間にカード消費・演出(杖のVFXとケーリュケイオンの振りを扇の起点の
 *       見えない錨Eventへ置く)・SEが始まり、ダメージ(固定値・Lv別・クリティカルは ProjectR_HermesSweep が作った適用関数のまま。1発動につき各敵に1回。UpdateEventHp の窓口には触れない)は SWEEP_FRAMES フレーム後に
 *       「その時の敵の位置」が固定した扇に触れていれば与えます(避ければ外れ)。発動の瞬間に扇の外だった敵・SOULが終わった/ステージを出た時は、ダメージなし。
 *       getVisibleSweep() は、画面に見えている扇(起点・向き・広がり・半径)だけを返します。回避AI(ProjectR_SoulBattleDodge)はこれを「見えている動き」として観測します。
 *
 * 【守るもの】 防御ターンに入る前に発動した攻撃(奥義の後続の斬撃を含む)は、防御中も同じように延びます。新しい攻撃の遮断と、
 *   移動カードの遮断(P2-B)は ProjectR_SoulBattle のままです。ダメージ式・Cooldown・カード・セーブには触れません。
 *
 * API: ProjectRSoulBattleMelee   getStageStats() = 専用ステージの間だけの統計
 *   plan(args) -> { extend, reason, extension?, args? }   spawnEventHitbox の引数からの延長計画(状態を変えない。診断・テスト用)
 *   isActive() / getStats() / getLog() / TAGS / config / getVisibleSweep() / SWEEP_FRAMES
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_SoulBattleMelee";
    const ENGINE = "Hendrix_Action_Engine";
    const TAGS = Object.freeze(["<projectRNormalSword>", "<projectRHermesSword>", "<projectRHermesUltimate>"]);
    const SWEEP = "hermes_sweep";
    const ISSEN = "hermes_issen";                                      // 専用ステージの間だけ、薙ぎ払いと同じくカーソル起点にする(元の一閃は11マスだが、ステージではプレイヤー(キャラの置き場)が遠いため)
    const params = PluginManager.parameters(PLUGIN);
    const number = (value, fallback, min, max) => {
        const n = Number(value);
        return value !== "" && value !== undefined && value !== null && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    };
    const config = Object.freeze({
        enabled: params.Enabled === undefined || params.Enabled === "" ? true : String(params.Enabled) === "true",
        maxTip: number(params.MaxTipTiles, 8, 1, 30),
        margin: number(params.Margin, 0.25, 0.05, 1)
    });
    const stats = { extended: 0, sweepShifted: 0, passed: {} };
    const log = [];
    const note = entry => { log.push(entry); if (log.length > 60) log.shift(); };
    const pass = reason => { stats.passed[reason] = (stats.passed[reason] || 0) + 1; return { extend: false, reason }; };

    // ---- SOUL動作中か(コントローラが動作し、そのハートがある) ----
    const heartInfo = () => {
        if (!config.enabled || typeof $gameMap === "undefined" || typeof $gamePlayer === "undefined") return null;
        const soul = root.ProjectRSoulBattle, poc = root.ProjectRSoulBattlePoC;
        if (!soul?.isActive?.() || !poc?.isActive?.()) return null;
        const state = poc.getState();
        if (!state?.active || !state.hitCenter) return null;
        const event = $gameMap.event(state.eventId);
        const polygon = event && !event._erased ? root.ProjectR?.CombatOcclusion?.eventPolygon?.(event) : null;
        if (!Array.isArray(polygon) || polygon.length < 3 || !polygon.every(p => Number.isFinite(p?.x) && Number.isFinite(p?.y))) return null;
        return { center: { x: state.hitCenter.x, y: state.hitCenter.y }, polygon };
    };
    // ---- 専用ステージ(ProjectR_SoulBattleStage)の間だけ: 近接の起点 = カーソル(遊べる範囲へ収めた点) ----
    const stageCursor = () => {
        try { const st = root.ProjectRSoulStage; return st?.isActive?.() ? st.getAttackCursor?.() || null : null; } catch (_error) { return null; }
    };
    const homing = [];                                                 // 追尾中の斬撃 { event, origin, forward, age }
    const HOMING_MAX_FRAMES = 60;
    const aimToHeart = (origin, info) => {
        const dx = info.center.x - origin.x, dy = info.center.y - origin.y, length = Math.hypot(dx, dy);
        return length > 1e-6 ? { ux: dx / length, uy: dy / length, distance: length } : null;
    };
    const rotationOf = (ux, uy) => {                                   // 判定の向き(0=上・時計回り。真上は360)
        let degree = Math.atan2(uy, ux) * 180 / Math.PI + 90;
        degree = ((degree % 360) + 360) % 360;
        return degree < 1e-9 ? 360 : degree;
    };
    const playerCenter = () => {
        const point = typeof $gamePlayer.centerPositionPoint === "function" ? $gamePlayer.centerPositionPoint() : null;
        return point && Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : null;
    };
    // プレイヤー中心 from から to の間の最初の壁までの距離(壁が無ければ null)。判定できなければ null(=壁なし扱い)。
    const wallDistance = (from, to) => {
        try {
            const hit = root.ProjectR?.CombatOcclusion?.firstBlockerBetween?.(from, to, { mode: "combat", unwrapped: true });
            return hit && Number.isFinite(hit.distance) ? hit.distance : null;
        } catch (_error) { return null; }
    };
    const fixed = value => String(Number(value.toFixed(5)));

    // ---- 判定(DynamicHitbox)の延長計画。状態は変えない ----
    const HITBOX = /<hitbox:\s*([^,>]+?)\s*,\s*([^>]+?)\s*>/;
    const plan = args => {
        const info = heartInfo();
        if (!info) return pass("inactive");
        if (!args || typeof args.notetag !== "string" || !TAGS.some(tag => args.notetag.includes(tag))) return pass("notTarget");
        const match = HITBOX.exec(args.notetag);
        if (!match) return pass("noHitbox");
        const width = Number(match[1]), depth = Number(match[2]);
        const position = typeof args.position === "string" ? args.position.split(",").map(part => Number(part.trim())) : [];
        const rotation = Number(args.rotationDegree);
        if (![width, depth, rotation].every(Number.isFinite) || width <= 0 || depth <= 0 || position.length !== 2 || !position.every(Number.isFinite)) {
            note({ type: "invalidHitbox", notetag: String(args.notetag).slice(0, 80), position: args.position, rotation: args.rotationDegree });
            return pass("invalidHitbox");
        }
        const origin = playerCenter();
        if (!origin) return pass("noPlayer");
        const radians = (rotation - 90) * Math.PI / 180, dx = Math.cos(radians), dy = Math.sin(radians);
        const cx = position[0] + 0.5, cy = position[1] + 0.5;                        // 判定の中心(Eventの位置は左上)
        const cursor = stageCursor();
        if (cursor) {                                                                // 専用ステージ: 起点 = カーソル。判定は、元の「プレイヤー中心からの前方オフセット」だけ前へ置く(奥行・幅は変えない)
            const forward = Math.max(0, (cx - origin.x) * dx + (cy - origin.y) * dy);
            const home = aimToHeart(cursor, info) || { ux: dx, uy: dy, distance: 0 };
            const reach = Math.min(forward, home.distance);                           // 前方オフセットは、ハートまでの距離を超えて進めない(カーソルがハートの真上なら、その位置に置く)
            const centerX = cursor.x + home.ux * reach, centerY = cursor.y + home.uy * reach;
            return { extend: true, reason: "cursorOrigin", extension: 0, cursor: { x: cursor.x, y: cursor.y, clamped: cursor.clamped }, forward,
                args: { ...args, position: `${fixed(centerX - 0.5)}, ${fixed(centerY - 0.5)}`, rotationDegree: fixed(rotationOf(home.ux, home.uy)) } };
        }
        const alongCenter = (cx - origin.x) * dx + (cy - origin.y) * dy;
        const sideCenter = -(cx - origin.x) * dy + (cy - origin.y) * dx;
        const start = alongCenter - depth / 2, tip = alongCenter + depth / 2;
        const along = info.polygon.map(p => (p.x - origin.x) * dx + (p.y - origin.y) * dy);
        const side = info.polygon.map(p => -(p.x - origin.x) * dy + (p.y - origin.y) * dx - sideCenter);
        const nearest = Math.min(...along), farthest = Math.max(...along);
        if (farthest <= start) return pass("behind");                                // ハートは判定の後ろ
        if (Math.max(...side) < -width / 2 || Math.min(...side) > width / 2) return pass("offAxis"); // 幅から外れている=狙いを外した
        if (tip >= nearest) return pass("alreadyReaches");
        const needTip = Math.min(nearest + config.margin, farthest);
        if (needTip > config.maxTip) return pass("beyondCap");
        const wall = wallDistance(origin, info.center);
        if (wall !== null && wall < nearest) return pass("wall");
        const extension = needTip - tip;
        const notetag = args.notetag.replace(match[0], `<hitbox: ${fixed(width)}, ${fixed(depth + extension)}>`);
        const moved = `${fixed(position[0] + dx * extension / 2)}, ${fixed(position[1] + dy * extension / 2)}`;
        return { extend: true, reason: "extended", extension, args: { ...args, notetag, position: moved } };
    };

    const commands = typeof PluginManager !== "undefined" ? PluginManager._commands : null;
    const spawnKey = `${ENGINE}:spawnEventHitbox`;
    const gates = { spawn: false, sweep: false, origin: false };
    if (commands && typeof commands[spawnKey] === "function") {
        const original = commands[spawnKey];
        commands[spawnKey] = function(args) {
            let next = args, track = null, before = null;
            try {
                const result = plan(args);
                if (result.extend && result.reason === "cursorOrigin") {
                    track = { origin: result.cursor, forward: result.forward };
                    before = new Set($gameMap.events());
                    next = result.args; stats.cursorOrigin = (stats.cursorOrigin || 0) + 1;
                } else if (result.extend) { next = result.args; stats.extended++; }
            } catch (error) { note({ type: "planError", message: String(error?.message || error) }); next = args; track = null; } // 計画に失敗したら従来どおり
            const returned = original.call(this, next);
            if (track && before) {                                                   // 作られた斬撃の判定を、ハートの方向へ追尾させる
                try {
                    const tag = TAGS.find(t => String(args.notetag).includes(t));
                    for (const event of $gameMap.events()) {
                        if (event && !before.has(event) && String(event.event?.()?.note || "").includes(tag)) homing.push({ event, origin: track.origin, forward: track.forward, age: 0 });
                    }
                } catch (error) { note({ type: "homingError", message: String(error?.message || error) }); }
            }
            return returned;
        };
        gates.spawn = true;
    }

    // ---- 追尾: 専用ステージの斬撃は、判定が残る間、起点(カーソル)からハートの現在位置の方向へ向き直る。起点・奥行・幅・寿命は変えない ----
    if (typeof Game_Map !== "undefined") {
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            if (homing.length) {
                try {
                    const info = heartInfo();
                    for (let i = homing.length - 1; i >= 0; i--) {
                        const h = homing[i], event = h.event;
                        if (!info || !stageCursor() || event._erased || this.event(event.eventId()) !== event || ++h.age > HOMING_MAX_FRAMES) { homing.splice(i, 1); continue; }
                        const home = aimToHeart(h.origin, info);
                        if (!home) continue;
                        const rotation = rotationOf(home.ux, home.uy);
                        const reach = Math.min(h.forward, home.distance);
                        event.setPosition(h.origin.x + home.ux * reach - 0.5, h.origin.y + home.uy * reach - 0.5);
                        event.rotateTo(rotation);
                        stats.homed = (stats.homed || 0) + 1;
                    }
                } catch (error) { note({ type: "homingError", message: String(error?.message || error) }); homing.length = 0; }
            }
            return _update.apply(this, arguments);
        };
    }

    // ---- 薙ぎ払い: 発動の同期呼び出しの間だけ、プレイヤー中心を狙った向きへずらす ----
    let scopeShift = null;
    let scopeCursor = null;                                           // 専用ステージ: { center:{x,y}, screen:{x,y} }  扇形の中心 = カーソルの点、向き = ハートの方向
    if (typeof Game_CharacterBase !== "undefined" && typeof Game_CharacterBase.prototype.centerPositionPoint === "function") {
        const original = Game_CharacterBase.prototype.centerPositionPoint;
        Game_CharacterBase.prototype.centerPositionPoint = function() {
            const point = original.apply(this, arguments);
            if (scopeCursor && this === $gamePlayer && point) return typeof DotMovePoint !== "undefined" ? new DotMovePoint(scopeCursor.center.x, scopeCursor.center.y) : { x: scopeCursor.center.x, y: scopeCursor.center.y };
            if (!scopeShift || this !== $gamePlayer || !point) return point;
            const x = point.x + scopeShift.x, y = point.y + scopeShift.y;
            return typeof DotMovePoint !== "undefined" ? new DotMovePoint(x, y) : { x, y };
        };
        gates.origin = true;
    }
    // 専用ステージの薙ぎ払い(同期呼び出しの間だけ): 中心 = カーソルの点。向きは各スキルと同じ「プレイヤーの画面位置からマウスへ」の式なので、
    // プレイヤーの画面位置を「マウスからハート方向と逆へ少しずらした点」に見せて、向きをハートの方向にする。
    if (typeof Game_CharacterBase !== "undefined") {
        for (const [name, axis] of [["screenX", "x"], ["screenY", "y"]]) {
            const originalScreen = Game_CharacterBase.prototype[name];
            if (typeof originalScreen !== "function") continue;
            Game_CharacterBase.prototype[name] = function() {
                const value = originalScreen.apply(this, arguments);
                return scopeCursor && this === $gamePlayer ? scopeCursor.screen[axis] : value;
            };
        }
    }
    // Game_Player は自分の screenX/screenY を持つので(Game_CharacterBase のものを隠す)、プロトタイプの差し替えだけでは効かない。発動の同期呼び出しの間だけ、
    // プレイヤー本体にインスタンスのプロパティを置いて画面位置を差し替え、必ず元へ戻す(元から自前のプロパティがあれば、その記述子を戻す)。
    const lockPlayerScreen = screen => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!player || !screen) return () => {};
        const saved = ["screenX", "screenY"].map(name => [name, Object.getOwnPropertyDescriptor(player, name)]);
        try {
            Object.defineProperty(player, "screenX", { configurable: true, writable: true, value: () => screen.x });
            Object.defineProperty(player, "screenY", { configurable: true, writable: true, value: () => screen.y });
        } catch (error) { note({ type: "screenLockError", message: String(error?.message || error) }); }
        return () => { for (const [name, descriptor] of saved) { try { if (descriptor) Object.defineProperty(player, name, descriptor); else delete player[name]; } catch (_error) { /* 戻せなければ次の発動で上書き */ } } };
    };
    const sweepRadius = () => {
        try { const value = Number(root.ProjectRCardBalance?.constant?.(SWEEP, "radiusTiles")); return Number.isFinite(value) && value > 0 ? value : null; } catch (_error) { return null; }
    };
    const isSweepAt = handIndex => {
        try { return root.ProjectRCardDeck.getBattleState?.()?.hand?.[handIndex]?.cardId === SWEEP; } catch (_error) { return false; }
    };
    const isIssenAt = handIndex => {
        try { return root.ProjectRCardDeck.getBattleState?.()?.hand?.[handIndex]?.cardId === ISSEN; } catch (_error) { return false; }
    };
    // 狙った向きへ何タイルずらすか({x,y}。ずらさないなら null)。狙い方向は、各スキルと同じ「プレイヤーの画面位置からマウスへ」の式。
    const stageSweep = () => {
        const info = heartInfo(), cursor = stageCursor();
        if (!info || !cursor || typeof TouchInput === "undefined" || !Number.isFinite(TouchInput.x) || !Number.isFinite(TouchInput.y)) return null;
        const home = aimToHeart(cursor, info) || { ux: 0, uy: -1, distance: 0 };
        return { center: { x: cursor.x, y: cursor.y }, screen: { x: TouchInput.x - home.ux * 100, y: TouchInput.y - home.uy * 100 }, distance: home.distance };
    };
    const sweepShift = () => {
        const info = heartInfo(), origin = info && playerCenter(), radius = sweepRadius();
        if (!info || !origin || !radius || typeof TouchInput === "undefined") return null;
        const mx = TouchInput.x - $gamePlayer.screenX(), my = TouchInput.y - $gamePlayer.screenY();
        if (![mx, my].every(Number.isFinite) || Math.hypot(mx, my) < 1e-8) return null;
        const length = Math.hypot(mx, my), ux = mx / length, uy = my / length;     // 画面座標=タイル座標の向き
        const toHeart = (info.center.x - origin.x) * ux + (info.center.y - origin.y) * uy;
        if (toHeart <= 0 || toHeart > config.maxTip) return null;                  // 後ろ・上限より遠い
        const shift = Math.max(0, toHeart - (radius - config.margin * 2));
        if (shift <= 1e-6) return null;                                            // 元の射程で届く
        const apex = { x: origin.x + ux * shift, y: origin.y + uy * shift };
        const wall = wallDistance(origin, apex);
        if (wall !== null) return null;                                            // 壁を越えて扇形の起点をずらさない
        return { x: ux * shift, y: uy * shift, distance: shift };
    };
    // ---- 専用ステージの薙ぎ払い: 発動から判定までを SWEEP_FRAMES だけ延ばす(通常のマップは発動と同時のまま) ----
    //   扇の起点(カーソルの点)と向き(発動の瞬間のハートの方向)は発動時に固定。ホーミングはしない。ダメージ(固定値・Lv別・クリティカル)・1発動1回・Cooldown・消費は元のまま
    //   (ダメージの計算は ProjectR_HermesSweep が作った適用関数をそのまま使う。先端ボーナス(Lv2)の有無は発動時の位置で決まる)。変わるのは「いつ当たるか」だけ:
    //     発動の瞬間は、カード消費・演出(扇のVFX・ケーリュケイオンの振り)・SEが始まる。ダメージの命令は預かり、SWEEP_FRAMES フレーム後に「その時の敵の位置」で扇に触れていれば与える(避ければ外れ)。
    //   VFXは扇の起点の錨Event(見えない)に置く。これがSOULの敵(回避AI)が観測できる「見えている動き」: getVisibleSweep() は扇の起点・向き・広がり・半径だけ。
    //   判定の時刻・ダメージ・当たるかどうかは公開しない(予知を与えない)。
    const SWEEP_FRAMES = 12, SWEEP_TAIL_FRAMES = 30, SWEEP_VFX_KEY = "soul_sweep.staff";
    const sweeps = [];
    // ダメージの命令(UpdateEventHp)の窓口には触れない(CardModifiers が最外のまま)。薙ぎ払いは ProjectRUltimateGauge.trackDamage(敵, 出どころ, 適用する関数) を通して与えるので、
    // 発動の同期呼び出しの間だけ、そのうち薙ぎ払いのものを預かり、判定の時刻に本物の trackDamage で適用する(ゲージの加算も判定の時刻に起きる)。
    let sweepId = 0, captureSweep = null;
    const SWEEP_DAMAGE_SOURCE = "damage:hermes_sweep";
    gates.sweepDelay = typeof root.ProjectRUltimateGauge?.trackDamage === "function";
    const sweepArc = () => { try { const v = Number(root.ProjectRCardBalance?.constant?.(SWEEP, "arcDegrees")); return Number.isFinite(v) && v > 0 ? v : 190; } catch (_error) { return 190; } };
    const beginSweepCapture = () => {                                       // 発動の同期呼び出しの間だけ、本体の演出(プレイヤー位置のVFX・Hermesの振り)を預かる(ステージでは見えない位置に出てしまう)
        const cap = { damage: [], vfx: null, swing: null, restore: [], track: null };
        captureSweep = cap;
        const gauge = root.ProjectRUltimateGauge, vfx = root.ProjectRPresentationVfx, visual = root.ProjectRGodSummonVisual;
        if (gauge && typeof gauge.trackDamage === "function") {
            const o = gauge.trackDamage;
            cap.track = o;
            gauge.trackDamage = function(eventId, meta, apply) {
                if (captureSweep === cap && meta && meta.source === SWEEP_DAMAGE_SOURCE && typeof apply === "function") { cap.damage.push({ eventId: Number(eventId), meta: { ...meta }, apply }); return undefined; }
                return o.apply(this, arguments);
            };
            cap.restore.push(() => { gauge.trackDamage = o; });
        }
        if (vfx && typeof vfx.play === "function") {
            const o = vfx.play;
            vfx.play = function(key) { if (key === "hermes_sweep.staff") { cap.vfx = true; return { ok: true, mode: "deferred" }; } return o.apply(this, arguments); };
            cap.restore.push(() => { vfx.play = o; });
        }
        if (visual && typeof visual.swingWeapon === "function") {
            const o = visual.swingWeapon;
            visual.swingWeapon = function(godId) { if (godId === "hermes") { cap.swing = true; return true; } return o.apply(this, arguments); };
            cap.restore.push(() => { visual.swingWeapon = o; });
        }
        return cap;
    };
    const endSweepCapture = cap => { captureSweep = null; for (const undo of cap.restore.reverse()) { try { undo(); } catch (_error) { /* 戻せなければ次の発動で上書き */ } } };
    const presentSweep = sw => {                                            // 扇の起点の錨Eventへ、既存の演出(杖のVFX・ケーリュケイオンの振り)を置く。表示だけ
        const visual = root.ProjectRGodSummonVisual, vfx = root.ProjectRPresentationVfx;
        try { const anchor = visual?.spawnAnchor?.({ x: sw.apex.x, y: sw.apex.y }, { cardId: SWEEP }); if (anchor?.ok) sw.anchor = { id: anchor.id, eventId: anchor.eventId }; } catch (error) { note({ type: "sweepAnchorError", message: String(error?.message || error) }); }
        if (!sw.anchor) return;
        try {
            if (vfx && typeof vfx.register === "function" && !vfx.mapping?.(SWEEP_VFX_KEY)) { const base = vfx.mapping?.("hermes_sweep.staff"); if (base) vfx.register(SWEEP_VFX_KEY, { ...base, anchor: "event" }); }
            if (vfx?.mapping?.(SWEEP_VFX_KEY)) { const r = vfx.play(SWEEP_VFX_KEY, { degree: sw.aim, eventId: sw.anchor.eventId }); sw.vfx = !!r?.ok; }
        } catch (error) { note({ type: "sweepVfxError", message: String(error?.message || error) }); }
        try { sw.swing = !!visual.swingFollower?.(sw.anchor.id, sw.aim, "ProjectR_Caduceus_DEV"); } catch (error) { note({ type: "sweepSwingError", message: String(error?.message || error) }); }
    };
    const startSweep = (cap, cursor, result) => {
        const last = root.ProjectRHermesSweep?.getLastResult?.();
        if (!(result?.ok === true && result.cardId === SWEEP) || !last?.ok || !last.consumed || !Number.isFinite(last.degree) || typeof cap.track !== "function") return null;   // 消費されなかった(無効な発動)
        const sw = { id: ++sweepId, serial: last.serial, aim: last.degree, apex: { x: cursor.center.x, y: cursor.center.y }, radius: sweepRadius() || 4, arc: sweepArc(),
            age: 0, resolved: false, damage: cap.damage, track: cap.track, anchor: null, vfx: false, swing: false, hits: [], misses: [] };
        presentSweep(sw);
        sweeps.push(sw);
        stats.sweepStaged = (stats.sweepStaged || 0) + 1;
        note({ type: "sweepStart", id: sw.id, aim: sw.aim, apex: { ...sw.apex }, queued: sw.damage.length, anchor: !!sw.anchor, vfx: sw.vfx });
        return sw;
    };
    const releaseSweep = sw => { if (sw.anchor) { try { root.ProjectRGodSummonVisual?.removeAnchor?.(sw.anchor.id); } catch (_error) { /* 表示のみ */ } sw.anchor = null; } };
    const resolveSweep = sw => {                                            // 判定の時刻: 固定した起点・向きの扇に、いまの敵が触れているか(HermesSweep.plan と同じ幾何)
        sw.resolved = true;
        let targets = null;
        const sweep = root.ProjectRHermesSweep;
        try {
            scopeCursor = { center: sw.apex, screen: { x: 0, y: 0 } };
            const planned = sweep?.plan?.(sw.aim);
            if (planned?.ok) targets = planned.targets;
        } catch (error) { note({ type: "sweepPlanError", message: String(error?.message || error) }); } finally { scopeCursor = null; }
        for (const entry of sw.damage) {
            const target = targets && targets.find(t => t.eventId === entry.eventId);
            if (!target) { sw.misses.push(entry.eventId); stats.sweepMiss = (stats.sweepMiss || 0) + 1; continue; }
            try {
                sw.track(entry.eventId, entry.meta, entry.apply);                     // 本物の trackDamage(HermesSweep が発動時に作った適用関数。ダメージ・先端ボーナス・クリティカルはそのまま)
                sw.hits.push(entry.eventId); stats.sweepHit = (stats.sweepHit || 0) + 1;
            } catch (error) { note({ type: "sweepDamageError", message: String(error?.message || error) }); }
        }
        note({ type: "sweepResolve", id: sw.id, hits: sw.hits.slice(), misses: sw.misses.slice() });
    };
    // ---- 専用ステージの一閃の演出: 経路のVFX(軌跡・稲妻)は元のままだとプレイヤー(=キャラの置き場)から出る。実際の起点(カーソルの点)の錨Eventへ置き直す(表示だけ) ----
    const ISSEN_VFX = Object.freeze({ "hermes_issen.trail": "soul_issen.trail", "hermes_issen.lightning": "soul_issen.lightning" });
    const ISSEN_FX_FRAMES = 60;
    const issenFx = [];
    const beginIssenCapture = () => {
        const cap = { plays: [], restore: [] }, vfx = root.ProjectRPresentationVfx;
        if (vfx && typeof vfx.play === "function") {
            const o = vfx.play;
            vfx.play = function(key, context) { if (ISSEN_VFX[key]) { cap.plays.push({ key, context: { ...(context || {}) } }); return { ok: true, mode: "deferred" }; } return o.apply(this, arguments); };
            cap.restore.push(() => { vfx.play = o; });
        }
        return cap;
    };
    const endIssenCapture = cap => { for (const undo of cap.restore.reverse()) { try { undo(); } catch (_error) { /* 戻せなければ次の発動で上書き */ } } };
    const presentIssen = (cap, cursor, result) => {
        if (!(result?.ok === true && result.cardId === ISSEN) || !cap.plays.length) return null;
        const vfx = root.ProjectRPresentationVfx;
        const fx = { id: ++sweepId, origin: { x: cursor.center.x, y: cursor.center.y }, plays: [], anchors: [], age: 0 };
        try {
            for (const play of cap.plays) {
                const key = ISSEN_VFX[play.key];
                if (!vfx.mapping?.(key)) { const base = vfx.mapping?.(play.key); if (base) vfx.register(key, { ...base, anchor: "event" }); }
                if (!vfx.mapping?.(key)) continue;
                const r = vfx.play(key, { ...play.context, origin: fx.origin });                // 経路の起点 = カーソルの点。置き場所は PresentationVfx が錨Eventで決める
                fx.plays.push({ key, ok: !!r?.ok, note: r?.note || null });
                for (const id of (r?.anchors || [])) fx.anchors.push(id);
            }
        } catch (error) { note({ type: "issenVfxError", message: String(error?.message || error) }); }
        issenFx.push(fx);
        stats.issenStaged = (stats.issenStaged || 0) + 1;
        note({ type: "issenVfx", id: fx.id, origin: fx.origin, plays: fx.plays.length, anchors: fx.anchors.length });
        return fx;
    };
    const releaseIssenFx = fx => {
        for (const play of fx.plays) { try { if (play.note) root.ProjectRPresentationVfx?.stop?.(play.note); } catch (_error) { /* 表示のみ */ } }
        for (const id of fx.anchors.splice(0)) { try { root.ProjectRGodSummonVisual?.removeAnchor?.(id); } catch (_error) { /* 表示のみ */ } }
    };
    const stepIssenFx = () => { for (let i = 0; i < issenFx.length; i++) { const fx = issenFx[i]; if (++fx.age >= ISSEN_FX_FRAMES) { releaseIssenFx(fx); issenFx.splice(i--, 1); } } };
    const dropIssenFx = () => { for (const fx of issenFx.splice(0)) releaseIssenFx(fx); };
    const dropSweeps = reason => {
        dropIssenFx();
        for (const sw of sweeps.splice(0)) { if (!sw.resolved) { stats.sweepDropped = (stats.sweepDropped || 0) + 1; note({ type: "sweepDropped", id: sw.id, reason }); } releaseSweep(sw); }
    };
    const stepSweeps = () => {
        if (!sweeps.length) return;
        if (!heartInfo() || !root.ProjectRSoulStage?.isActive?.()) { dropSweeps("inactive"); return; }
        for (let i = 0; i < sweeps.length; i++) {
            const sw = sweeps[i];
            sw.age++;
            if (!sw.resolved && sw.age >= SWEEP_FRAMES) resolveSweep(sw);
            if (sw.age >= SWEEP_FRAMES + SWEEP_TAIL_FRAMES) { releaseSweep(sw); sweeps.splice(i--, 1); }
        }
    };
    if (typeof Game_Map !== "undefined") {
        const _updateSweeps = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            const result = _updateSweeps.apply(this, arguments);
            if (issenFx.length && sceneActive !== false && !this.eventsPaused) { try { stepIssenFx(); } catch (error) { note({ type: "issenStepError", message: String(error?.message || error) }); dropIssenFx(); } }
            if (sweeps.length && sceneActive !== false && !this.eventsPaused) { try { stepSweeps(); } catch (error) { note({ type: "sweepStepError", message: String(error?.message || error) }); dropSweeps("error"); } }
            return result;
        };
    }
    root.ProjectRSoulBattle?.onEnd?.(() => dropSweeps("soulEnd"));

    const deck = root.ProjectRCardDeck;
    if (deck && typeof deck.requestUseCard === "function") {
        const original = deck.requestUseCard;
        deck.requestUseCard = function(handIndex) {
            let shift = null, cursorScope = null, sweepCard = false;
            try {
                if (isSweepAt(handIndex)) { sweepCard = true; cursorScope = stageSweep(); shift = cursorScope ? null : sweepShift(); }
                else if (isIssenAt(handIndex)) cursorScope = stageSweep();                  // 一閃: 専用ステージの間だけ(それ以外は null = 何もしない)
            } catch (error) { note({ type: "sweepError", message: String(error?.message || error) }); }
            if (cursorScope) {
                scopeCursor = cursorScope;
                stats.sweepCursor = (stats.sweepCursor || 0) + 1;
                const cap = sweepCard && gates.sweepDelay ? beginSweepCapture() : null;
                const icap = !sweepCard ? beginIssenCapture() : null;                          // 一閃: 経路のVFXを預かる(実際の起点 = カーソルの点へ置き直す)
                const unlock = lockPlayerScreen(cursorScope.screen);
                let result;
                try { result = original.apply(this, arguments); } finally { unlock(); scopeCursor = null; if (cap) endSweepCapture(cap); if (icap) endIssenCapture(icap); }
                if (cap) { try { startSweep(cap, cursorScope, result); } catch (error) { note({ type: "sweepStartError", message: String(error?.message || error) }); } }
                if (icap) { try { presentIssen(icap, cursorScope, result); } catch (error) { note({ type: "issenStartError", message: String(error?.message || error) }); } }
                return result;
            }
            if (!shift) return original.apply(this, arguments);
            scopeShift = shift;
            stats.sweepShifted++;
            try { return original.apply(this, arguments); } finally { scopeShift = null; }
        };
        gates.sweep = true;
    }

    root.ProjectRSoulBattleMelee = Object.freeze({
        TAGS, config, plan,
        isActive: () => !!heartInfo(),
        getStats: () => ({ extended: stats.extended, sweepShifted: stats.sweepShifted, passed: { ...stats.passed }, scoped: !!scopeShift }),
        // 専用ステージ(ProjectR_SoulBattleStage)の間だけの分: カーソル起点にした斬撃の数・追尾した回数・薙ぎ払い/一閃のカーソル起点の数・追尾中の斬撃・差し替え中か
        getStageStats: () => ({ cursorOrigin: stats.cursorOrigin || 0, homed: stats.homed || 0, sweepCursor: stats.sweepCursor || 0, homing: homing.length, scoped: !!scopeCursor,
            sweepStaged: stats.sweepStaged || 0, issenStaged: stats.issenStaged || 0, issenFx: issenFx.length, sweepHit: stats.sweepHit || 0, sweepMiss: stats.sweepMiss || 0, sweepDropped: stats.sweepDropped || 0, sweeping: sweeps.filter(s => !s.resolved).length, sweepFrames: SWEEP_FRAMES }),
        // 画面に見えている薙ぎ払いの扇(VFXと同じ起点・向き・広がり・半径。発動の瞬間から見える)。回避AIはこれだけを観測する。判定の時刻・ダメージ・当たるかは含まない。無ければ null
        getVisibleSweep: () => { const sw = [...sweeps].reverse().find(s => !s.resolved); return sw ? { id: sw.id, apex: { ...sw.apex }, radius: sw.radius, aim: sw.aim, arc: sw.arc } : null; },
        SWEEP_FRAMES,
        // フェーズの境目(準備ループ。ProjectR_SoulPhaseCleanup が呼ぶ): 判定の時刻に達していない薙ぎ払いの溜め(遅延ダメージ)は、ダメージを与えずに取り消す(早く判定しない)。
        // 扇・一閃の演出・追尾中の斬撃の記録も片づける。取り消した溜めの数を返す。
        cancelPhase: reason => {
            const cancelled = sweeps.filter(sw => !sw.resolved).length;
            dropSweeps(reason || "phase");                                    // 未判定のものは sweepDropped に数える(ダメージ・判定は行わない)
            homing.length = 0;
            return { cancelled };
        },
        getLog: () => log.map(entry => ({ ...entry })),
        gates: () => ({ ...gates })
    });
})();
