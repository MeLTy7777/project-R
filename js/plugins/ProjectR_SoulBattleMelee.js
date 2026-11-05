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
 * 【守るもの】 防御ターンに入る前に発動した攻撃(奥義の後続の斬撃を含む)は、防御中も同じように延びます。新しい攻撃の遮断と、
 *   移動カードの遮断(P2-B)は ProjectR_SoulBattle のままです。ダメージ式・Cooldown・カード・セーブには触れません。
 *
 * API: ProjectRSoulBattleMelee
 *   plan(args) -> { extend, reason, extension?, args? }   spawnEventHitbox の引数からの延長計画(状態を変えない。診断・テスト用)
 *   isActive() / getStats() / getLog() / TAGS / config
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_SoulBattleMelee";
    const ENGINE = "Hendrix_Action_Engine";
    const TAGS = Object.freeze(["<projectRNormalSword>", "<projectRHermesSword>", "<projectRHermesUltimate>"]);
    const SWEEP = "hermes_sweep";
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
            let next = args;
            try {
                const result = plan(args);
                if (result.extend) { next = result.args; stats.extended++; }
            } catch (error) { note({ type: "planError", message: String(error?.message || error) }); next = args; } // 計画に失敗したら従来どおり
            return original.call(this, next);
        };
        gates.spawn = true;
    }

    // ---- 薙ぎ払い: 発動の同期呼び出しの間だけ、プレイヤー中心を狙った向きへずらす ----
    let scopeShift = null;
    if (typeof Game_CharacterBase !== "undefined" && typeof Game_CharacterBase.prototype.centerPositionPoint === "function") {
        const original = Game_CharacterBase.prototype.centerPositionPoint;
        Game_CharacterBase.prototype.centerPositionPoint = function() {
            const point = original.apply(this, arguments);
            if (!scopeShift || this !== $gamePlayer || !point) return point;
            const x = point.x + scopeShift.x, y = point.y + scopeShift.y;
            return typeof DotMovePoint !== "undefined" ? new DotMovePoint(x, y) : { x, y };
        };
        gates.origin = true;
    }
    const sweepRadius = () => {
        try { const value = Number(root.ProjectRCardBalance?.constant?.(SWEEP, "radiusTiles")); return Number.isFinite(value) && value > 0 ? value : null; } catch (_error) { return null; }
    };
    const isSweepAt = handIndex => {
        try { return root.ProjectRCardDeck.getBattleState?.()?.hand?.[handIndex]?.cardId === SWEEP; } catch (_error) { return false; }
    };
    // 狙った向きへ何タイルずらすか({x,y}。ずらさないなら null)。狙い方向は、各スキルと同じ「プレイヤーの画面位置からマウスへ」の式。
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
    const deck = root.ProjectRCardDeck;
    if (deck && typeof deck.requestUseCard === "function") {
        const original = deck.requestUseCard;
        deck.requestUseCard = function(handIndex) {
            let shift = null;
            try { shift = isSweepAt(handIndex) ? sweepShift() : null; } catch (error) { note({ type: "sweepError", message: String(error?.message || error) }); }
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
        getLog: () => log.map(entry => ({ ...entry })),
        gates: () => ({ ...gates })
    });
})();
