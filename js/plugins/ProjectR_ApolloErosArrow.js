/*:
 * @target MZ
 * @plugindesc v1.2.0 Apollo「エロスの矢」(設計ID 9 / apollo_eros_arrow) Lv1〜3: 1秒でピンクゴールドの矢を連射(Lv1は10本、Lv2は80度間隔の3方向x7本、Lv3は左右の2方向x7本=14本+中央の3秒のビーム)。追尾(Lv1〜2は3マス、Lv3は7マス)、敵に20ダメージ・味方に50回復(ビームは毎秒敵80・味方300)。命中が確定してから消費。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardBalance
 * @base ProjectR_CardModifiers
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_GodSummonManager
 * @base ProjectR_PartyRoster
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @orderAfter ProjectR_CardModifiers
 * @orderAfter ProjectR_PartyRoster
 * @orderAfter ProjectR_CutIn
 * @orderAfter ProjectR_CharacterPresentation
 * @orderAfter ProjectR_ApolloGoldenVolley
 *
 * @param ArrowSoundEffect
 * @text 矢を放つ効果音(RTPのSE名。空なら鳴らさない。2本に1回)
 * @desc ワークブックは「一本ごとに竪琴」。竪琴の素材は無いので、RTPのChime2を仮に当てています(専用音ができたらここだけ差し替え)。
 * @type string
 * @default Chime2
 *
 * @param ImpactSoundEffect
 * @text 命中の効果音(RTPのSE名。空なら鳴らさない。4frameより近い命中は間引く)
 * @desc 仮のRTP音(Chime1)です。
 * @type string
 * @default Chime1
 *
 * @param BeamSoundEffect
 * @text ビームの始まりの効果音(RTPのSE名。空なら鳴らさない)
 * @desc ワークブックは「ビームは長い一音」。竪琴の素材は無いので、RTPのBell1を仮に当てています(専用音ができたらここだけ差し替え)。
 * @type string
 * @default Bell1
 *
 * @help
 * ProjectR_ApolloErosArrow.js
 *
 * Apollo「エロスの矢」(ワークブック設計ID 9 / 特殊 / 最大5枚 / Cooldown 5秒 / Ground / 壁越え はい)の Lv1〜2 を実装します。
 * Lv3(追尾範囲7・まっすぐ飛ぶ矢がビームに変更)はPhase A6Cで実装しました(下の【Lv3】)。カードの登録上の最大Lvは3です。
 *
 * 【Lv2(ワークブック)】三方向から発射する。80°間隔で発射される。ただし1方向につき7本に変更。
 *   実装: マウス方向を中心に 80度間隔の3方向(マウス方向・その左右80度)。1方向7本 x 3方向 = 21本を、Lv1と同じ1秒で放つ(7回の「発射の時刻」に、3方向から1本ずつ同時に)。
 *   方向はその発射の時刻のマウス方向から毎回計算し直し、矢ごとに最初の向きを固定する。3方向とも出発点はプレイヤーの中心(仮。directionOriginOffsetTiles で各方向の矢の出発点を、その方向へずらせる)。
 *   Lv1の追尾・壁越え・追尾範囲3・敵20・味方50・仮の決め・消費の規則はそのまま。
 *
 * 【Lv3(ワークブック)】矢の追尾する範囲が7になる。まっすぐに飛ぶ矢がビームに変更される。ビームは3秒間発射され、一秒に味方を300ヒール、敵に80ダメージ。
 *   確定している仕様: 追尾範囲 3→7(通常の矢)/ 中央の「まっすぐ飛ぶ矢」がビームに変わる / 3秒 / 味方へ毎秒300・敵へ毎秒80 / 壁越え(はい)。Lv2の左右80度の2方向x7本(14本)は残る。
 *   【仮(ワークブックに無い。確定ではない。後から変えられる)】
 *     ・ビームの効果は毎秒10回(0.1秒ごと): 味方へ30回復・敵へ8ダメージを1回ずつ。1回の発動で同じ対象へ最大30回(= 3秒 / 0.1秒。900回復・240ダメージが上限)。同じ対象に同じtickで2回は当たらない。
 *     ・ビームは発動の瞬間から3秒(180更新)。向きは現在のマウス方向に毎更新追従し(出発点は主人公の中心、directionOriginOffsetTilesでずらせる)、出ている間ずっと続く。ビームの長さは12マス(beamRangeTiles。マップの端で短くなる。24マスが上限)。
 *     ・ビームの幅は0.9マス(beamWidthTiles。黄金の矢のビームの3マスは流用しない)。幅の中に当たり判定が重なる敵・味方すべてへ(複数同時)。壁・Regionで止まらない。主人公自身はビームの対象にしない。
 *     ・ビームの対象の規則は矢と同じ: 出撃中の仲間(ダウン除く)と敵だけ。任意のNPCは対象外。HP満タンの味方はビームに当たっても回復できないので、有効な当たりに数えない(確定の消費にもならない)。
 *     ・消費: 側面の矢の最初の有効な命中、またはビームの最初の有効な効果(敵へダメージ・HPの減った味方へ回復)のうち早い方で1回消費。3秒の間に有効な効果が1つも無ければ消費しない。
 *   ビームの見た目: 専用の区間Event(Map002「ProjectR Apollo Eros Beam Segment」。1マスの区間を並べ、向きをマウスへ毎更新追従させる。VFX Designerの絵は向きを後から変えられないため)+ VFX Designerの始まりの閃光・Apolloの光・命中の火花。
 *
 * 【Lv1(ワークブック)】ゴールドピンクの矢を連続で1秒間に10本放つ。途中で方向転換可能。放った矢の付近3マス以内に味方、敵がいた場合追尾する。
 *   味方に当たると一本につき50ヒール、敵に当たると一本につき20ダメージ。
 *
 * 【実装】
 *   ・発動(予約): マウス方向を向いて連射が始まる。発動の時点ではカードを消費しない。
 *   ・連射: 10本を 1秒(60更新。0,6,12,…,54更新目)に等間隔で放つ。矢ごとに「その瞬間のマウス方向」と「その瞬間のプレイヤー位置」から出る(途中の方向転換で後の矢の向きが変わる)。
 *   ・矢: 速さ・寿命・追尾の範囲・曲がる速さ・ダメージ・回復量・本数・連射の時間は data/ProjectR_CardBalance.json と開発用エディタ F6 で変えられる。
 *     矢は壁・Region・通行不能を無視して通り抜ける(ワークブック「壁越え: はい」)。マップの端・寿命でだけ消える。
 *   ・追尾: 矢の「からだ(当たり判定)」まで3マス以内にいる対象へ、曲がる速さの上限つきで向きを寄せる。いったん狙った対象は、範囲内にいる間は変えない。
 *   ・命中: 矢の通った線(掃き)と対象の当たり判定の交差で1本につき1回。当たった矢は消える(貫通なし・二重命中なし)。敵へは固定20(属性なし・弱点倍率1)、味方へは回復50(最大HPまで)。
 *     複数の対象に別々に当たってよい。敵を回復することも、味方を傷つけることもない(判定の対象がそもそも別)。
 *   ・消費: 最初の有効な命中(敵へのダメージ、または回復できる味方への命中)の瞬間に、正規の経路(requestUseCard)で1回だけ消費してCooldown。
 *     そのあとも残りの矢は撃ち続ける。全部外れたら消費しない。連射が終わるまで(命中前は確定まで)、同じカードの再発動は拒否する。
 *   ・取消・後片付け: 戦闘終了・マップ移動・ロード・主人公の戦闘不能・手札から消えた・対象の消滅で、矢のEvent・VFX・召喚の表示を残さない。
 *
 * 【仮の決め(ワークブックに無い。後から変えられる。仮であり確定ではない)】
 *   1. 対象の優先: 矢から対象のからだまでの距離が最も近い対象(敵と味方を区別しない)。同じ距離なら味方を先、次にEvent IDの小さい方。いったん決めた対象は範囲内にいる間は保つ。
 *   2. 主人公自身: 回復の対象にしない(selfHealEnabled=0)。1にすると、放った位置から0.8マス以上離れた矢が主人公のHPが減っていれば当たる。
 *   3. HP満タンの味方: 当てない・追尾もしない(素通り。fullHpAlliesEligible=0)。1にすると満タンでも当たり(回復量0)、確定の有効な命中になる。
 *   4. 味方 = ProjectR_PartyRoster の「出撃中の仲間(ダウンを除く)」だけ。任意のNPC・召喚物は含まない。仲間のAI・移動は変えない。
 *   5. 同じframeに同じ味方へ複数の矢が当たるとき、先の矢でHPが満タンになったら、後の矢は「無効な命中」として消える(重ねて回復しない)。
 *
 * 【演出(表示だけ。失敗しても消費・ダメージに影響しない)】
 *   通常のカットイン1回・Apollo(一時召喚の表示Event。連射が終わるまで出す)・主人公は片手を伸ばす(ArmExtend)。
 *   矢は専用の矢Event(Map002のテンプレート「ProjectR Apollo Eros Arrow」。DEVの自作画像 $ProjectR_ErosArrow)で、位置・向きはプラグインが毎frame与える。
 *   VFX Designerライブラリ(ProjectR_Eros_*): 放つ閃光(2本に1回)・飛ぶ矢の光(同時に最大6本)・命中の火花(敵)/癒しの光(味方)。1度に出す数に上限があり、終われば公式のdisposeで外す。
 *   効果音はパラメータ。竪琴の素材は無いので仮のRTPのChime。
 *
 * API: ProjectRApolloErosArrow
 *   CARD / implementedMaxLevel / config() / emitSchedule(count, frames) / geometry{ distanceToPolygon, footprint }
 *   isPending() / getPending() / getSequences() / getActiveArrows() / getEmissionLog() / getHitLog() / getLastResult() / getTempObjectCount() / getActiveVfxJobs()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "apollo_eros_arrow";
    const TAG = "<projectRErosArrow>";
    const TEMPLATE_NAME = "ProjectR Apollo Eros Arrow";
    const BOW_SPRITE = "ProjectR_Bow_DEV";
    const IMPLEMENTED_MAX_LEVEL = 3;
    const BEAM_TEMPLATE_NAME = "ProjectR Apollo Eros Beam Segment";
    const BEAM_TAG = "<projectRErosBeam>";
    const MAX_BEAM_LENGTH = 24; // ビームの長さの上限(マス)。見た目の区間の上限と同じ(見えないビームを作らない)
    const BEAM_SEGMENT_BUDGET = 24; // ビームの見た目の区間(Event)の同時の上限
    const BEAM_SOUND_GAP_FRAMES = 15; // ビームの効果の音は、この間隔より近いものを間引く
    const BEAM_MAX_TICKS_LIMIT = 100; // 設定の誤りで暴走させない(1対象あたりの最大tick数)
    const VISUAL_ARROW_BUDGET = 30; // 矢の見た目(Event)の同時の上限。超えた矢は見た目なしで(判定・命中は同じに)飛ぶ
    const MAX_TOTAL_ARROWS = 120; // 1回の発動の矢の合計の上限(設定の誤りで暴走させない)
    const EPSILON = 1e-8;
    const ALONG_HALF = 0.15; // 矢の当たり判定: 進行方向の半分の長さ(0.3マス)
    const ACROSS_HALF = 0.1; // 直交方向の半分の幅(0.2マス)
    const ALLY_BODY_HALF = 0.35; // からだの当たり判定が取れないときの代用(0.7マス角)
    const SELF_MIN_TRAVEL = 0.8; // 主人公自身へ当たるのは、放った位置からこれ以上離れてから
    const PRESENT_EVERY = 2; // 放つ演出(弓・閃光・音)は何本に1回か(同時の表示物と音の重なりを抑える)
    const GLOW_BUDGET = 6; // 飛ぶ矢の光を同時に付ける最大本数
    const SHORT_VFX_BUDGET = 6; // 放つ閃光・命中の火花を同時に出す最大数
    const SHORT_VFX_FRAMES = 26; // これを過ぎたら公式のdisposeで確実に外す
    const IMPACT_SOUND_GAP_FRAMES = 4;
    const ROTATION_PIVOT_PX = 10; // 実機で測った値: 回した矢Eventの絵の中心は、Eventの画面位置より尾の側へこのpx(回転の支点)ずれる
    const SHIFT_Y_PX = 6; // MZの通常キャラクターは、画面位置が足元より6px上
    const MIN_SHOWN_DEGREE = 0.01; // Hendrixはちょうど0度のEventを「回していない」扱いにして絵の位置の式が変わる。0度にしない
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_ApolloErosArrow") : {};

    const balance = () => root.ProjectRCardBalance;
    const balanceReady = () => !!balance()?.isReady?.() && !!balance().hasCard(CARD);
    const tune = key => balance().constant(CARD, key);
    const num = key => { const v = tune(key); return Number.isFinite(Number(v)) ? Number(v) : NaN; };
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const rad = degree => degree * Math.PI / 180;
    const normalize = degree => ((degree % 360) + 360) % 360;
    const modifiers = () => root.ProjectRCardModifiers;
    const occlusion = () => root.ProjectR?.CombatOcclusion || null;
    const roster = () => root.ProjectRPartyRoster || null;
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);

    const cardLevel = () => {
        try {
            const saved = Number.parseInt(deck.getPersistentData?.().cardOwnership?.[CARD]?.level, 10);
            return clamp(Number.isFinite(saved) ? saved : 1, 1, IMPLEMENTED_MAX_LEVEL);
        } catch (_error) { return 1; }
    };
    // 数値設定(バランスJSON/F6)。1つでも不正ならnull(発動を拒否して非消費)。
    const config = (level = cardLevel()) => {
        try {
            const effects = balance().effects(CARD, level);
            const cfg = { level, directions: Math.floor(Number(effects.directionCount)), perDirection: Math.floor(Number(effects.arrowsPerDirection)), spacing: Number(effects.directionSpacingDegrees ?? 0),
                originOffset: num("directionOriginOffsetTiles"), damage: Number(effects.damage), heal: Number(effects.healAmount),
                emitSeconds: num("emitSeconds"), speed: num("projectileSpeed"), radius: Number(effects.homingRadiusTiles ?? num("homingRadiusTiles")), turnRate: num("homingTurnRate"),
                lifetimeSeconds: num("projectileLifetimeSeconds"), selfHeal: num("selfHealEnabled") === 1, fullHp: num("fullHpAlliesEligible") === 1,
                element: num("element"), weaknessMultiplier: num("weaknessMultiplier") };
            // Lv3: 中央の「まっすぐ飛ぶ矢」(方向の数が奇数のときの真ん中の方向)をビームに置き換える。方向の数が偶数なら、狙い方向のビームを追加する。
            const beamSeconds = Number(effects.beamDurationSeconds ?? 0);
            cfg.beam = beamSeconds > 0;
            cfg.centerIndex = cfg.directions % 2 === 1 ? (cfg.directions - 1) / 2 : -1;
            cfg.sideCount = cfg.directions - (cfg.beam && cfg.centerIndex >= 0 ? 1 : 0);
            if (cfg.beam) {
                Object.assign(cfg, { beamSeconds, beamHealRate: Number(effects.beamHealPerSecond), beamDamageRate: Number(effects.beamDamagePerSecond), beamTickSeconds: Number(effects.beamTickSeconds),
                    beamWidth: Number(effects.beamWidthTiles), beamRange: Number(effects.beamRangeTiles) });
                cfg.beamFrames = Math.max(1, Math.round(beamSeconds * 60));
                cfg.beamTickFrames = Math.max(1, Math.round(cfg.beamTickSeconds * 60));
                cfg.beamMaxTicks = Math.max(1, Math.floor(beamSeconds / cfg.beamTickSeconds + 1e-6));
                cfg.beamTickHeal = Math.round(cfg.beamHealRate * cfg.beamTickSeconds);
                cfg.beamTickDamage = Math.round(cfg.beamDamageRate * cfg.beamTickSeconds);
                cfg.beamLength = Math.min(cfg.beamRange, MAX_BEAM_LENGTH);
            }
            cfg.count = cfg.sideCount * cfg.perDirection;
            const beamOk = !cfg.beam || (cfg.beamHealRate >= 0 && cfg.beamDamageRate >= 0 && cfg.beamTickSeconds > 0 && cfg.beamTickSeconds <= cfg.beamSeconds && cfg.beamWidth > 0 && cfg.beamRange >= 1 && cfg.beamMaxTicks <= BEAM_MAX_TICKS_LIMIT);
            const ok = beamOk && cfg.radius >= 0 && cfg.directions >= 1 && cfg.perDirection >= 1 && cfg.count <= MAX_TOTAL_ARROWS && (cfg.directions === 1 || cfg.spacing > 0) && cfg.originOffset >= 0 && cfg.damage >= 0 && cfg.heal >= 0 && cfg.emitSeconds > 0 && cfg.speed > 0 && cfg.radius >= 0 && cfg.turnRate > 0
                && cfg.lifetimeSeconds > 0 && Number.isFinite(cfg.element) && Number.isFinite(cfg.weaknessMultiplier);
            if (!ok) return null;
            cfg.emitFrames = Math.max(1, Math.round(cfg.emitSeconds * 60));
            cfg.lifetimeFrames = Math.max(1, Math.round(cfg.lifetimeSeconds * 60));
            cfg.step = cfg.speed / 60;
            return cfg;
        } catch (_error) { return null; }
    };
    // 狙いを中心に spacing 度ずつ左右へ並べた発射角(本数が偶数なら狙いの左右に対称。奇数なら中央が狙い)。Lv1は1方向=狙いそのまま。
    const directionDegrees = (aim, count, spacing) => {
        const n = Math.max(1, Math.floor(count)), step = Number(spacing) || 0;
        return Array.from({ length: n }, (_, i) => normalize(aim + (i - (n - 1) / 2) * step));
    };
    // i回目(0始まり)の「発射の時刻」の更新番号。連射の時間を発射の回数で等分する(10回・60更新なら 0,6,12,…,54。Lv2は7回なら 0,8,17,25,34,42,51)。
    const emitSchedule = (count, frames) => Array.from({ length: Math.max(1, Math.floor(count)) }, (_, i) => Math.floor(i * frames / Math.max(1, Math.floor(count))));

    // ---------- 幾何 ----------
    const footprint = degree => {
        const ux = Math.sin(rad(degree)), uy = -Math.cos(rad(degree)), nx = -uy, ny = ux;
        return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ x: nx * ACROSS_HALF * a + ux * ALONG_HALF * b, y: ny * ACROSS_HALF * a + uy * ALONG_HALF * b }));
    };
    const centroid = polygon => ({ x: polygon.reduce((s, p) => s + p.x, 0) / polygon.length, y: polygon.reduce((s, p) => s + p.y, 0) / polygon.length });
    const insidePolygon = (point, polygon) => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const a = polygon[i], b = polygon[j];
            if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
        }
        return inside;
    };
    const distanceToPolygon = (point, polygon) => {
        if (insidePolygon(point, polygon)) return 0;
        let best = Infinity;
        for (let i = 0; i < polygon.length; i++) {
            const a = polygon[i], b = polygon[(i + 1) % polygon.length], dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1;
            const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / len2, 0, 1);
            best = Math.min(best, Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t)));
        }
        return best;
    };
    const degreeFromTo = (from, to) => normalize(Math.atan2(to.x - from.x, -(to.y - from.y)) * 180 / Math.PI);
    const square = (c, half) => [{ x: c.x - half, y: c.y - half }, { x: c.x + half, y: c.y - half }, { x: c.x + half, y: c.y + half }, { x: c.x - half, y: c.y + half }];

    // ---------- 環境・Hendrix呼び出し ----------
    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const trackDamage = (enemyId, attackId, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        return typeof gauge?.trackDamage === "function"
            ? gauge.trackDamage(enemyId, { attackId, source: "damage:apollo_eros_arrow" }, apply) : apply();
    };
    const dealFixed = (eventId, base, attackId, cfg) => trackDamage(eventId, attackId, () => command("UpdateEventHp", {
        eventId: String(eventId), value: `-${base}`, exceedMaxHealth: "false",
        projectRFixed: { base, flat: 0, source: CARD, element: cfg.element, weaknessMultiplier: cfg.weaknessMultiplier }
    }));
    const hpOf = id => { const v = modifiers()?.eventHp?.(id); return Number.isFinite(v) ? v : (map()?.getCurrentEventHp?.(id) ?? 0); };
    const isEnemy = (event, partyIds) => !!event && !event._erased && !!event.event?.()?.note?.includes("<enemy>") && !partyIds.has(event.eventId());
    const isArrow = event => !!event?.event?.()?.note?.includes(TAG);
    const isBeamEvent = event => !!event?.event?.()?.note?.includes(BEAM_TAG);
    const releaseSummon = id => { try { root.ProjectRGodSummonManager?.release?.(id); } catch (_error) { /* 表示のみ */ } };
    const eventCenter = event => ({ x: event._realX + 0.5, y: event._realY + 0.5 });
    const playerCenter = () => {
        const p = $gamePlayer.centerPositionPoint?.();
        return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : { x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 };
    };
    const aimNow = () => { // GodSummonManager.create と同じ画面座標系・角度式(0=上・時計回り)
        try {
            const dx = TouchInput.x - $gamePlayer.screenX(), dy = TouchInput.y - $gamePlayer.screenY();
            return Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) > EPSILON ? normalize(Math.atan2(dy, dx) * 180 / Math.PI + 450) : null;
        } catch (_error) { return null; }
    };

    const environment = (needBeam = false) => {
        const m = map();
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!player || !m || typeof m.getCurrentEventHp !== "function") return failure("mapUnavailable");
        if (!(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return failure("mapUnavailable");
        if (typeof DotMoveSystem === "undefined" || typeof m.spawnEvent !== "function") return failure("actionCombatUnavailable");
        if (!["UpdateEventHp", "DestroyEvent"].every(name => typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) return failure("actionCombatUnavailable");
        const occ = occlusion();
        if (typeof occ?.firstContact !== "function" || typeof occ?.eventPolygon !== "function") return failure("occlusionUnavailable");
        if (!roster()) return failure("partyRosterUnavailable");
        const templates = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null;
        const template = templates?.find(event => event?.name === TEMPLATE_NAME);
        if (!template || !template.note.includes(TAG)) return failure("projectileTemplateUnavailable");
        let beamTemplate = null;
        if (needBeam) {
            beamTemplate = templates?.find(event => event?.name === BEAM_TEMPLATE_NAME) || null;
            if (!beamTemplate || !beamTemplate.note.includes(BEAM_TAG)) return failure("beamTemplateUnavailable");
        }
        return { ok: true, map: m, template, beamTemplate };
    };

    // ---------- 状態 ----------
    const sequences = new Map(); // serial -> seq
    let serial = 0;
    let pendingSeq = null; // 確定待ち(まだ消費していない)
    let reserve = null; // handlerが立てた予約(requestUseCardの同期呼び出しの間だけ)
    let mode = null; // "commit"のときだけ、handlerは立てずに成功を返す
    let commitPlan = null;
    let lastResult = null;
    let frameNo = 0;
    let lastImpactSoundFrame = -Infinity;
    const emissionLog = [];
    const hitLog = [];
    const endLog = []; // 矢の最期(命中・寿命・マップの端など)の診断記録
    const vfxJobs = []; // { frames, note } 短いVFX(閃光・火花)を終わったら確実に外す
    const LOG_LIMIT = 200;
    const pushLog = (log, entry) => { log.push(entry); if (log.length > LOG_LIMIT) log.shift(); };

    const destroyArrow = arrow => {
        if (arrow.gone && arrow.destroyed) return;
        arrow.gone = true; arrow.destroyed = true;
        if (arrow.serial !== undefined) pushLog(endLog, { serial: arrow.serial, index: arrow.index, end: arrow.end || "removed", travelled: Math.round(arrow.travelled * 100) / 100, age: arrow.age, hit: arrow.hit || null });
        stopNote(arrow.glow); arrow.glow = null;
        const m = map();
        if (!arrow.event || !m || arrow.map !== m || m.event(arrow.eventId) !== arrow.event) return;
        try { command("DestroyEvent", { target: String(arrow.eventId), destroyNearby: "", permanent: "false" }, arrow.eventId); } catch (_error) { /* 後片付けの失敗は握りつぶす */ }
    };
    const liveArrows = seq => seq.arrows.filter(arrow => !arrow.gone);
    const emitting = seq => seq.slot < seq.slots;
    const beamActive = seq => !!seq.beam && seq.beam.active;
    const busy = seq => emitting(seq) || beamActive(seq); // 連射(側面の矢)の途中、またはビームが出ている間は、同じカードの再発動を拒否する
    const visualCount = () => { let n = 0; for (const seq of sequences.values()) for (const arrow of seq.arrows) if (!arrow.gone && arrow.event) n++; return n; };

    // ---------- 演出(表示だけ) ----------
    const pvPlay = (key, context) => { try { return root.ProjectRPresentationVfx?.play?.(key, context) || null; } catch (_error) { return null; } };
    function stopNote(note) { if (note) { try { root.ProjectRPresentationVfx?.stop?.(note); } catch (_error) { /* 表示のみ */ } } }
    const playSe = (key, fallback, volume, pitch) => {
        try {
            const name = String(params[key] === undefined ? fallback : params[key]).trim();
            if (name && typeof AudioManager !== "undefined") AudioManager.playSe({ name, volume, pitch, pan: 0 });
        } catch (_error) { /* 表示のみ */ }
    };
    const startShortVfx = (key, context) => {
        if (vfxJobs.length >= SHORT_VFX_BUDGET) return false; // 上限: 同時のVFXを増やしすぎない
        const r = pvPlay(key, context);
        if (r?.ok && r.note) { vfxJobs.push({ frames: SHORT_VFX_FRAMES, note: r.note, key }); return true; }
        return false;
    };
    const tickVfxJobs = () => {
        for (let i = vfxJobs.length - 1; i >= 0; i--) {
            if (--vfxJobs[i].frames <= 0) { stopNote(vfxJobs[i].note); vfxJobs.splice(i, 1); }
        }
    };
    const clearVfxJobs = () => { for (const job of vfxJobs.splice(0)) stopNote(job.note); };
    const godIdFor = definition => {
        const ringId = definition?.ringId;
        return deck.definitions?.ring?.(ringId)?.godId || root.ProjectRGodSummonManager?.resolveGodId?.(ringId) || "apollo";
    };
    // 発動(予約)の演出: 通常のカットイン1回・主人公の片手(連射の間ずっと)。Apolloは一時召喚の表示Eventが連射の間出る。
    const presentStart = seq => {
        try { root.ProjectRCharacterPresentation?.request?.("ArmExtend", { source: "card", detail: CARD, frames: Math.max(seq.cfg.emitFrames, seq.cfg.beamFrames || 0) + 14, degree: seq.firstAim }); } catch (_error) { /* 表示のみ */ }
        try { if (root.ProjectRCutIn?.isCardEnabled?.(CARD)) root.ProjectRCutIn.show({ kind: "card", godId: godIdFor(seq.definition), cardId: CARD }); } catch (_error) { /* 表示のみ */ }
    };
    // 矢を放つ演出(発射の時刻PRESENT_EVERY回に1回。Lv2も3方向でまとめて1回): Apolloが弓を引いて放つ・閃光・音
    const presentEmit = (seq, arrow) => {
        if (arrow.direction !== 0 || arrow.slot % PRESENT_EVERY !== 0) return;
        try { root.ProjectRGodSummonVisual?.swingWeapon?.("apollo", arrow.aim, BOW_SPRITE); } catch (_error) { /* 表示のみ */ }
        const apolloEvent = root.ProjectRGodSummonVisual?.getTransientEventId?.("apollo") || 0;
        startShortVfx("apollo_eros.muzzle", { eventId: apolloEvent || "player", instance: "m" + seq.serial + "." + arrow.slot });
        playSe("ArrowSoundEffect", "Chime2", 55, 120);
    };
    const glowCount = seq => liveArrows(seq).filter(arrow => arrow.glow).length;

    // ---------- 対象 ----------
    const bodyOf = (char, center) => {
        let polygon = [];
        try { polygon = occlusion().eventPolygon(char); } catch (_error) { polygon = []; }
        return Array.isArray(polygon) && polygon.length >= 3 && polygon.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)) ? polygon : square(center, ALLY_BODY_HALF);
    };
    // いまの当たり対象(敵・出撃中の仲間・設定が許せば主人公)。毎frame1回だけ集める。
    const gatherTargets = cfg => {
        const m = map(), r = roster(), list = [];
        const partyIds = new Set(r.allies({ includeDown: true }).map(a => a.eventId)); // 仲間のEventは敵として扱わない(<enemy>が付いていても)
        for (const event of m.events()) {
            if (!event || event._erased || !isEnemy(event, partyIds)) continue;
            const id = event.eventId();
            if (hpOf(id) > 0) list.push({ kind: "enemy", key: "e" + id, id, order: 1, event, polygon: bodyOf(event, eventCenter(event)) });
        }
        for (const ally of r.allies()) {
            if (ally.eventId === null || ally.eventId === undefined || !ally.alive) continue;
            const event = m.event(ally.eventId);
            if (!event || event._erased) continue;
            if (!(ally.hp < ally.mhp) && !cfg.fullHp) continue; // HP満タンは素通り(仮)
            list.push({ kind: "ally", key: "a" + ally.actorId, id: ally.eventId, actorId: ally.actorId, hp: ally.hp, mhp: ally.mhp, order: 0, event, polygon: bodyOf(event, eventCenter(event)) });
        }
        if (cfg.selfHeal) {
            const p = r.protagonist();
            if (p && p.alive && (p.hp < p.mhp || cfg.fullHp)) list.push({ kind: "self", key: "player", id: "player", order: 0, event: $gamePlayer, polygon: bodyOf($gamePlayer, playerCenter()) });
        }
        return list;
    };
    const usable = (target, arrow) => target.kind !== "self" || arrow.travelled >= SELF_MIN_TRAVEL;

    // ---------- 矢の生成・移動 ----------
    // 論理位置(矢の中心のタイル座標)に絵の中心が来るEvent位置。回した絵の中心は画面位置から尾の側へ ROTATION_PIVOT_PX ずれ、画面位置は足元の6px上。
    const shownDegree = degree => Math.max(MIN_SHOWN_DEGREE, normalize(degree));
    const visualReal = (x, y, degree) => {
        const h = rad(shownDegree(degree)), tw = map()?.tileWidth?.() || 48, th = map()?.tileHeight?.() || 48;
        return { x: x - 0.5 + ROTATION_PIVOT_PX * Math.sin(h) / tw, y: y - 1 + (SHIFT_Y_PX - ROTATION_PIVOT_PX * Math.cos(h)) / th };
    };
    const spawnArrowEvent = (env, spec) => {
        const m = env.map, before = new Set(m.events());
        try {
            const at = visualReal(spec.x, spec.y, spec.degree);
            const id = m.spawnEvent(env.template.id, at.x, at.y, false, shownDegree(spec.degree));
            const event = id && m.event(id);
            if (!event || before.has(event) || !isArrow(event) || typeof event.rotateTo !== "function") throw Error("projectileCreationFailed");
            event.rotateTo(shownDegree(spec.degree));
            return { ok: true, eventId: id, event, map: m };
        } catch (error) {
            for (const event of m.events()) if (!before.has(event) && isArrow(event)) destroyArrow({ eventId: event.eventId(), event, map: m, gone: false });
            return failure(String(error?.message || error));
        }
    };
    const placeVisual = arrow => {
        const event = arrow.event;
        if (!event || event._erased) return;
        event.isPlayerChild = false;
        const at = visualReal(arrow.x, arrow.y, arrow.heading);
        event.setPosition(at.x, at.y);
        if (Math.abs(normalize(arrow.heading - arrow.shownHeading + 180) - 180) > 0.01) { event.rotateTo(shownDegree(arrow.heading)); arrow.shownHeading = arrow.heading; }
    };
    // 1回の「発射の時刻」: その瞬間のマウス方向を中心に方向を計算し直し、各方向から1本ずつ放つ。矢ごとに最初の向きを固定する。
    const emitSlot = (seq, slot, env) => {
        const cfg = seq.cfg;
        const aim = slot === 0 ? seq.firstAim : (aimNow() ?? seq.lastAim);
        seq.lastAim = aim;
        const origin = playerCenter();
        const degrees = directionDegrees(aim, cfg.directions, cfg.spacing);
        const made = [];
        for (let k = 0; k < degrees.length; k++) {
            if (cfg.beam && k === cfg.centerIndex) continue; // 中央の矢はビームに置き換わる
            const degree = degrees[k], index = slot * cfg.sideCount + made.length;
            const start = { x: origin.x + Math.sin(rad(degree)) * cfg.originOffset, y: origin.y - Math.cos(rad(degree)) * cfg.originOffset };
            // 見た目のEventには上限がある。超えた矢は見た目なしで、判定・命中は同じように飛ぶ。
            const visual = visualCount() < VISUAL_ARROW_BUDGET;
            const spawned = visual ? spawnArrowEvent(env, { x: start.x, y: start.y, degree }) : { ok: true, eventId: 0, event: null, map: env.map, hidden: true };
            const arrow = { serial: seq.serial, index, slot, direction: k, aim, heading: degree, shownHeading: degree, x: start.x, y: start.y, last: { x: start.x, y: start.y }, age: 0, travelled: 0, lock: null,
                eventId: spawned.ok ? spawned.eventId : 0, event: spawned.ok ? spawned.event : null, map: spawned.ok ? spawned.map : null, gone: !spawned.ok, destroyed: !spawned.ok,
                hidden: !!spawned.hidden, glow: null, end: spawned.ok ? null : "spawnFailed", emitTick: seq.tick };
            seq.arrows.push(arrow);
            made.push(arrow);
            pushLog(emissionLog, { serial: seq.serial, index, slot, direction: k, tick: seq.tick, frame: frameNo, degree, aim, x: start.x, y: start.y, spawned: spawned.ok, visual: !!spawned.event });
            if (!spawned.ok) { seq.spawnFailures++; continue; }
            if (arrow.event && glowCount(seq) < GLOW_BUDGET) arrow.glow = pvPlay("apollo_eros.glow", { eventId: arrow.eventId, instance: "g" + seq.serial + "." + index })?.note || null;
        }
        seq.next += cfg.sideCount;
        if (made[0]) presentEmit(seq, made[0]);
        return made;
    };

    // 1本の、このframeの結果: { impact: {target, fraction} } | { end } | null(まだ飛んでいる)
    const stepArrow = (seq, arrow, targets) => {
        const cfg = seq.cfg, m = map(), occ = occlusion();
        if (arrow.event && (arrow.map !== m || m.event(arrow.eventId) !== arrow.event || arrow.event._erased)) return { end: "gone" };
        if (!arrow.event && arrow.map !== m) return { end: "gone" };
        arrow.age++;
        const eligible = targets.filter(t => usable(t, arrow));
        // 追尾: 範囲内の対象のうち最も近い対象(同距離は味方→Event ID順)。狙った対象は範囲内にいる間は保つ。曲がる速さに上限。
        if (cfg.radius > 0 && eligible.length) {
            const near = eligible.map(t => ({ t, d: distanceToPolygon(arrow, t.polygon) })).filter(x => x.d <= cfg.radius + EPSILON);
            let pick = arrow.lock ? near.find(x => x.t.key === arrow.lock) : null;
            if (!pick) { near.sort((a, b) => (Math.abs(a.d - b.d) > 1e-6 ? a.d - b.d : a.t.order - b.t.order || (Number(a.t.id) || 0) - (Number(b.t.id) || 0))); pick = near[0] || null; }
            arrow.lock = pick ? pick.t.key : null;
            if (pick) {
                const delta = normalize(degreeFromTo(arrow, centroid(pick.t.polygon)) - arrow.heading + 180) - 180, maxTurn = cfg.turnRate / 60;
                arrow.heading = normalize(arrow.heading + clamp(delta, -maxTurn, maxTurn));
            }
        } else arrow.lock = null;
        const from = { x: arrow.x, y: arrow.y };
        const to = { x: from.x + Math.sin(rad(arrow.heading)) * cfg.step, y: from.y - Math.cos(rad(arrow.heading)) * cfg.step };
        const body = footprint(arrow.heading);
        let best = null;
        for (const target of eligible) {
            const fraction = occ.firstContact(from, to, target.polygon, body);
            if (fraction === null) continue;
            if (!best || fraction < best.fraction - EPSILON || (Math.abs(fraction - best.fraction) <= EPSILON && String(target.key) < String(best.target.key))) best = { target, fraction };
        }
        if (best) { // 当たった位置まで進めて止める(見た目の火花の位置)
            arrow.x = from.x + (to.x - from.x) * best.fraction; arrow.y = from.y + (to.y - from.y) * best.fraction;
            arrow.travelled += cfg.step * best.fraction; arrow.last = from;
            return { impact: best };
        }
        arrow.last = from; arrow.x = to.x; arrow.y = to.y; arrow.travelled += cfg.step;
        placeVisual(arrow);
        // 壁・Region・通行不能は通り抜ける(ワークブック: 壁越え はい)。マップの端と寿命でだけ消える。
        const w = m.width(), h = m.height();
        if (!m.isLoopHorizontal() && (arrow.x < -1 || arrow.x > w + 1)) return { end: "boundary" };
        if (!m.isLoopVertical() && (arrow.y < -1 || arrow.y > h + 1)) return { end: "boundary" };
        if (arrow.age > cfg.lifetimeFrames) return { end: "lifetime" };
        return null;
    };

    // ---------- 命中の適用 ----------
    const healAlly = (target, amount) => {
        const api = root.ProjectRPartyCombat;
        const member = api?.members?.().find(m => m.actorId === target.actorId);
        if (!member || member.down) return { ok: false, reason: "notAvailable" };
        const before = member.hp, result = api.healAlly(target.actorId, amount);
        return result?.ok ? { ok: true, applied: result.hp - before, hp: result.hp, mhp: member.maxHp } : { ok: false, reason: result?.reason || "healFailed" };
    };
    const healSelf = amount => {
        const actor = typeof $gameParty !== "undefined" ? $gameParty.leader() : null;
        if (!actor || !(actor.hp > 0)) return { ok: false, reason: "notAvailable" };
        const before = actor.hp, applied = Math.min(amount, Math.max(0, actor.mhp - actor.hp));
        if (applied > 0) actor.gainHp(applied);
        return { ok: true, applied: actor.hp - before, hp: actor.hp, mhp: actor.mhp };
    };
    const impactSound = () => {
        if (frameNo - lastImpactSoundFrame < IMPACT_SOUND_GAP_FRAMES) return;
        lastImpactSoundFrame = frameNo;
        playSe("ImpactSoundEffect", "Chime1", 60, 100);
    };
    const applyImpact = (seq, arrow, target) => {
        const record = { serial: seq.serial, arrow: arrow.index, slot: arrow.slot, direction: arrow.direction, kind: target.kind, id: target.id, key: target.key, frame: frameNo };
        arrow.end = "hit"; arrow.hit = target.key;
        destroyArrow(arrow);
        try {
            if (target.kind === "enemy") {
                if (!seq.map.event(target.id) || target.event._erased || hpOf(target.id) <= 0) { record.skipped = "targetGone"; }
                else {
                    const before = hpOf(target.id);
                    dealFixed(target.id, seq.cfg.damage, `eros:${seq.serial}:${arrow.index}`, seq.cfg);
                    record.damage = seq.cfg.damage; record.hpLost = before - hpOf(target.id);
                    startShortVfx("apollo_eros.hit", { eventId: target.id, instance: `h${seq.serial}.${arrow.index}` });
                }
            } else {
                const result = target.kind === "self" ? healSelf(seq.cfg.heal) : healAlly(target, seq.cfg.heal);
                if (!result.ok) record.skipped = result.reason;
                else {
                    record.requested = seq.cfg.heal; record.healed = result.applied;
                    startShortVfx("apollo_eros.heal", { eventId: target.kind === "self" ? "player" : target.id, instance: `h${seq.serial}.${arrow.index}` });
                }
            }
            if (!record.skipped) impactSound();
        } catch (error) {
            record.error = String(error?.message || error);
        }
        seq.hits.push(record);
        pushLog(hitLog, { ...record });
    };

    // ---------- ビーム(Lv3。中央の矢の置き換え) ----------
    // 凸多角形どうしの重なり(接するだけは重ならない)。分離軸判定。
    const convexOverlap = (A, B) => {
        for (const poly of [A, B]) {
            for (let i = 0; i < poly.length; i++) {
                const p = poly[i], q = poly[(i + 1) % poly.length], nx = -(q.y - p.y), ny = q.x - p.x, len = Math.hypot(nx, ny) || 1;
                let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
                for (const v of A) { const d = (v.x * nx + v.y * ny) / len; if (d < minA) minA = d; if (d > maxA) maxA = d; }
                for (const v of B) { const d = (v.x * nx + v.y * ny) / len; if (d < minB) minB = d; if (d > maxB) maxB = d; }
                if (maxA <= minB + EPSILON || maxB <= minA + EPSILON) return false;
            }
        }
        return true;
    };
    // 出発点から向きdegreeへ進んでマップの端(ループしない方向)に出るまでの距離
    const edgeDistance = (origin, degree) => {
        const m = map(), ux = Math.sin(rad(degree)), uy = -Math.cos(rad(degree));
        const along = (p, u, size, loop) => (loop ? Infinity : (u > 1e-9 ? (size - p) / u : (u < -1e-9 ? (0 - p) / u : Infinity)));
        return Math.max(0, Math.min(along(origin.x, ux, m.width(), m.isLoopHorizontal()), along(origin.y, uy, m.height(), m.isLoopVertical())));
    };
    // ビームの当たり(向きに合わせた長方形): 長さ length x 幅 width。壁・Regionで止まらない(壁越え)。
    const beamRectangle = (origin, degree, length, width) => {
        const ux = Math.sin(rad(degree)), uy = -Math.cos(rad(degree)), nx = -uy, ny = ux, hw = width / 2;
        return [[0, -hw], [length, -hw], [length, hw], [0, hw]].map(([a, b]) => ({ x: origin.x + ux * a + nx * b, y: origin.y + uy * a + ny * b }));
    };
    // ビームの見た目: 1マスの区間Eventを並べ、向きと位置を毎更新合わせる(マウスへの追従)。表示だけ。
    const spawnSegment = (seq, x, y, degree) => {
        const m = seq.env.map, before = new Set(m.events());
        try {
            const at = visualReal(x, y, degree);
            const id = m.spawnEvent(seq.env.beamTemplate.id, at.x, at.y, false, shownDegree(degree));
            const event = id && m.event(id);
            if (!event || before.has(event) || !isBeamEvent(event) || typeof event.rotateTo !== "function") throw Error("beamSegmentCreationFailed");
            event.rotateTo(shownDegree(degree));
            return { eventId: id, event, map: m, shownHeading: degree };
        } catch (_error) {
            for (const event of m.events()) if (!before.has(event) && isBeamEvent(event)) { try { command("DestroyEvent", { target: String(event.eventId()), destroyNearby: "", permanent: "false" }, event.eventId()); } catch (_e) { /* 後片付け */ } }
            return null;
        }
    };
    const destroySegment = segment => {
        const m = map();
        if (!segment || !m || segment.map !== m || m.event(segment.eventId) !== segment.event) return;
        try { command("DestroyEvent", { target: String(segment.eventId), destroyNearby: "", permanent: "false" }, segment.eventId); } catch (_error) { /* 後片付けの失敗は握りつぶす */ }
    };
    const destroyBeamVisuals = seq => {
        const beam = seq.beam;
        if (!beam) return;
        for (const segment of beam.segments.splice(0)) destroySegment(segment);
        stopNote(beam.glow); beam.glow = null;
    };
    const updateBeamVisual = seq => {
        const beam = seq.beam, need = Math.min(BEAM_SEGMENT_BUDGET, Math.ceil(beam.length - 1e-6));
        while (beam.segments.length > need) destroySegment(beam.segments.pop());
        const ux = Math.sin(rad(beam.heading)), uy = -Math.cos(rad(beam.heading));
        for (let i = 0; i < need; i++) {
            const center = need === 1 ? beam.length / 2 : Math.min(i + 0.5, beam.length - 0.5);
            const x = beam.origin.x + ux * center, y = beam.origin.y + uy * center;
            let segment = beam.segments[i];
            if (!segment) { segment = spawnSegment(seq, x, y, beam.heading); if (!segment) continue; beam.segments[i] = segment; continue; }
            const event = segment.event;
            if (!event || event._erased) continue;
            event.isPlayerChild = false;
            const at = visualReal(x, y, beam.heading);
            event.setPosition(at.x, at.y);
            if (Math.abs(normalize(beam.heading - segment.shownHeading + 180) - 180) > 0.01) { event.rotateTo(shownDegree(beam.heading)); segment.shownHeading = beam.heading; }
        }
        beam.segments = beam.segments.filter(Boolean);
    };
    const beamSummary = seq => seq.beam ? { active: seq.beam.active, ticks: seq.beam.ticks, tickIndex: seq.beam.tickIndex, maxTicks: seq.beam.maxTicks, length: seq.beam.length, heading: seq.beam.heading,
        damageTotal: seq.beam.damageTotal, healTotal: seq.beam.healTotal, segments: seq.beam.segments.length, perTarget: Object.fromEntries(Object.entries(seq.beam.perTarget).map(([k, v]) => [k, { ...v }])) } : null;
    // このframeのビーム: 向きと出発点をいまのマウス・プレイヤーへ合わせ、見た目を更新し、tickの時刻なら効果を与える対象を返す。
    const planBeam = (seq, getTargets) => {
        const cfg = seq.cfg, beam = seq.beam;
        const aim = aimNow() ?? beam.heading;
        const c = playerCenter();
        beam.heading = aim;
        beam.origin = { x: c.x + Math.sin(rad(aim)) * cfg.originOffset, y: c.y - Math.cos(rad(aim)) * cfg.originOffset };
        beam.length = Math.min(cfg.beamLength, edgeDistance(beam.origin, aim));
        if (!beam.started) {
            beam.started = true;
            playSe("BeamSoundEffect", "Bell1", 70, 100);
            const apollo = root.ProjectRGodSummonVisual?.getTransientEventId?.("apollo") || 0;
            startShortVfx("apollo_eros.beamstart", { eventId: apollo || "player", instance: "bs" + seq.serial });
        }
        if (!beam.glow && seq.tick >= 1) { // Apolloの表示Eventは発動の次の更新で現れる。現れたら、ビームの間そこへ光を付ける(最大12更新待つ)
            const apollo = root.ProjectRGodSummonVisual?.getTransientEventId?.("apollo") || 0;
            if (apollo || seq.tick >= 12) beam.glow = pvPlay("apollo_eros.beamglow", { eventId: apollo || "player", instance: "bg" + seq.serial })?.note || "none";
            if (beam.glow === "none") beam.glow = null;
        }
        try { updateBeamVisual(seq); } catch (_error) { /* 表示のみ */ }
        const due = seq.tick % beam.tickFrames === 0 && seq.tick / beam.tickFrames < beam.maxTicks;
        const tickIndex = due ? seq.tick / beam.tickFrames : -1;
        const list = [];
        if (due && beam.length > EPSILON) {
            const rect = beamRectangle(beam.origin, aim, beam.length, cfg.beamWidth);
            for (const target of getTargets()) {
                if (target.kind === "self") continue; // 主人公はビームの出発点にいるため、ビームの対象にしない(仮)
                if (target.kind === "ally" && !(target.hp < target.mhp)) continue; // HP満タンへの当たりは回復にならないので有効な当たりに数えない
                const rec = beam.perTarget[target.key];
                if (rec && (rec.ticks >= beam.maxTicks || rec.lastTick === tickIndex)) continue; // 1対象あたり最大tick数・同じtickで二重に当てない
                if (convexOverlap(rect, target.polygon)) list.push(target);
            }
        }
        return { due, tickIndex, targets: list };
    };
    const applyBeamTick = (seq, plan) => {
        const cfg = seq.cfg, beam = seq.beam;
        beam.tickIndex = plan.tickIndex;
        beam.ticks++;
        for (const target of plan.targets) {
            const rec = beam.perTarget[target.key] || (beam.perTarget[target.key] = { kind: target.kind, id: target.id, ticks: 0, damage: 0, healed: 0, lastTick: -1 });
            if (rec.ticks >= beam.maxTicks || rec.lastTick === plan.tickIndex) continue;
            rec.lastTick = plan.tickIndex;
            try {
                if (target.kind === "enemy") {
                    if (target.event._erased || hpOf(target.id) <= 0) continue;
                    const before = hpOf(target.id);
                    dealFixed(target.id, cfg.beamTickDamage, "erosb:" + seq.serial + ":" + plan.tickIndex, cfg);
                    rec.ticks++; rec.damage += before - hpOf(target.id); beam.damageTotal += before - hpOf(target.id);
                    startShortVfx("apollo_eros.hit", { eventId: target.id, instance: "bh" + seq.serial + "." + plan.tickIndex + "." + target.id });
                } else {
                    const result = healAlly(target, cfg.beamTickHeal);
                    if (!result.ok || !(result.applied > 0)) continue;
                    rec.ticks++; rec.healed += result.applied; beam.healTotal += result.applied;
                    startShortVfx("apollo_eros.heal", { eventId: target.id, instance: "bh" + seq.serial + "." + plan.tickIndex + "." + target.id });
                }
                if (frameNo - beam.lastSoundFrame >= BEAM_SOUND_GAP_FRAMES) { beam.lastSoundFrame = frameNo; playSe("ImpactSoundEffect", "Chime1", 45, 90); }
            } catch (error) { rec.error = String(error?.message || error); }
        }
        pushLog(hitLog, { serial: seq.serial, beam: true, tick: plan.tickIndex, frame: frameNo, targets: plan.targets.map(x => x.key) });
    };
    const endBeam = seq => { if (!seq.beam || !seq.beam.active) return; seq.beam.active = false; destroyBeamVisuals(seq); };

    // ---------- 発動(予約) ----------
    const activate = context => {
        if (mode === "commit") return commitPlan ? { ok: true } : failure("noCommitPlan");
        if (!deck.isCardBattleActive() || !root.ProjectRCardCatalog) return failure("battleInactive");
        if (pendingSeq) return failure("volleyPending");
        for (const seq of sequences.values()) if (busy(seq)) return failure("sequenceActive"); // 連射の途中は、別の手札の同じカードでも発動しない
        if (!balanceReady()) return failure("balanceUnavailable");
        const cfg = config();
        if (!cfg) return failure("balanceInvalid");
        const env = environment(cfg.beam);
        if (!env.ok) return failure(env.reason);
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        let seq = null;
        const result = summons.perform({ definition: context?.definition, lifetimeFrames: Math.max(cfg.emitFrames, cfg.beamFrames || 0) + 4 }, summon => {
            if (!Number.isFinite(summon.degree) || !(summon.distance >= EPSILON)) return failure("invalidMousePosition");
            seq = { serial: ++serial, instanceId: context.instance.instanceId, definition: context.definition, cfg, level: cfg.level, count: cfg.count, slots: cfg.perDirection, slot: 0, schedule: emitSchedule(cfg.perDirection, cfg.emitFrames),
                beam: cfg.beam ? { active: true, frames: cfg.beamFrames, tickFrames: cfg.beamTickFrames, maxTicks: cfg.beamMaxTicks, ticks: 0, tickIndex: -1, segments: [], heading: normalize(summon.degree), origin: null, length: 0, perTarget: {}, damageTotal: 0, healTotal: 0, glow: null, started: false, lastSoundFrame: -Infinity, shownHeading: null } : null,
                tick: 0, next: 0, arrows: [], hits: [], committed: false, aborted: false, summonId: summon.summonId, firstAim: normalize(summon.degree), lastAim: normalize(summon.degree),
                env, map: env.map, spawnFailures: 0 };
            return { ok: true };
        });
        if (!result?.ok || !seq) return failure(result?.reason || "activationFailed");
        seq.summonId = result.summonId ?? seq.summonId;
        reserve = seq;
        return failure("reserved"); // ルーターには「まだ消費しない」と伝える。確定(最初の命中)の時に正規経路で1回だけ消費する。
    };
    const previousGround = deck.getActivationHandler("ground");
    deck.registerActivationHandler("ground", context => context.definition.cardId === CARD
        ? activate(context) : previousGround ? previousGround(context) : { ok: true });

    // ---------- 予約 → 確定 ----------
    const handIndexOf = instanceId => {
        const state = deck.getBattleState?.();
        return state ? state.hand.findIndex(card => card.instanceId === instanceId) : -1;
    };
    const finishPending = seq => { if (pendingSeq === seq) pendingSeq = null; };
    const resultOf = (seq, extra = {}) => ({ serial: seq.serial, arrows: seq.count, emitted: seq.next, hits: seq.hits.map(h => ({ ...h })), beam: beamSummary(seq), cfg: { ...seq.cfg }, instanceId: seq.instanceConsumed ?? seq.instanceId, ...extra });
    const destroySeq = seq => { for (const arrow of seq.arrows) destroyArrow(arrow); destroyBeamVisuals(seq); if (seq.beam) seq.beam.active = false; };
    // 取り消し: 矢を消し、カード・Cooldown・手札・山札・ゲージは一切変えていないので、戻す物は無い(確定前のみ)。
    const abortSeq = (seq, reason, extra = {}) => {
        if (seq.aborted) return;
        seq.aborted = true;
        destroySeq(seq);
        sequences.delete(seq.serial);
        finishPending(seq);
        releaseSummon(seq.summonId);
        lastResult = { ok: false, reason, aborted: true, consumed: false, committed: false, ...resultOf(seq), ...extra };
    };
    const commitSeq = seq => {
        if (seq.committed) return true;
        if (!deck.isCardBattleActive()) { abortSeq(seq, "battleInactive"); return false; }
        const index = handIndexOf(seq.instanceId);
        if (index < 0) { abortSeq(seq, "cardGone"); return false; }
        commitPlan = seq;
        mode = "commit";
        modifiers()?.skipPresentationOnce?.(CARD, ["cutIn", "action"]); // 発動時に演出済み
        let result;
        try {
            result = _requestUseCard.call(deck, index);
        } catch (error) {
            result = { ok: false, reason: "activationFailed", detail: String(error?.message || error) };
        } finally {
            mode = null;
            commitPlan = null;
            modifiers()?.clearPresentationSkip?.(CARD);
        }
        if (result?.ok === true && result.cardId === CARD) {
            seq.committed = true;
            seq.instanceConsumed = result.instanceId ?? seq.instanceId;
            finishPending(seq);
            return true;
        }
        abortSeq(seq, result?.detail || result?.reason || "notConsumed");
        return false;
    };
    const _requestUseCard = deck.requestUseCard;
    deck.requestUseCard = function() {
        reserve = null;
        let result;
        try {
            result = _requestUseCard.apply(this, arguments);
        } catch (error) {
            if (reserve) releaseSummon(reserve.summonId);
            reserve = null;
            throw error;
        }
        const seq = reserve;
        reserve = null;
        if (!seq) return result;
        pendingSeq = seq;
        sequences.set(seq.serial, seq);
        lastResult = { ok: true, pending: true, consumed: false, committed: false, aim: seq.firstAim, ...resultOf(seq) };
        presentStart(seq);
        return { ok: false, reason: "pending", reasons: [{ code: "pending" }], pending: true, cardId: CARD, instanceId: seq.instanceId, detail: "erosReserved" };
    };

    // ---------- 毎フレーム ----------
    const processSequence = seq => {
        const cfg = seq.cfg;
        // 1) 放つ(このframeに放つ番の矢。放ったframeは動かさない)
        const fresh = new Set();
        while (seq.slot < seq.slots && seq.schedule[seq.slot] <= seq.tick) {
            for (const arrow of emitSlot(seq, seq.slot, seq.env)) fresh.add(arrow);
            seq.slot++;
        }
        if (!seq.committed && seq.arrows.length && seq.arrows.every(arrow => arrow.end === "spawnFailed")) { abortSeq(seq, "projectileCreationFailed"); return; } // 最初の1本が作れないなら非消費で取り消す
        // 2) 動かして当たりを調べる
        const live = liveArrows(seq).filter(arrow => !fresh.has(arrow));
        const impacts = [];
        let gathered = null; // このframeの当たり対象(必要になった時に1回だけ集める)
        const getTargets = () => gathered || (gathered = gatherTargets(cfg));
        if (live.length) {
            const targets = getTargets();
            for (const arrow of live) {
                const outcome = stepArrow(seq, arrow, targets);
                if (!outcome) continue;
                if (outcome.impact) impacts.push({ arrow, target: outcome.impact.target });
                else { arrow.end = outcome.end; destroyArrow(arrow); }
            }
        }
        // 2b) ビーム(Lv3): 向き・見た目を合わせ、tickの時刻なら効果を与える対象を求める
        const plan = beamActive(seq) ? planBeam(seq, getTargets) : null;
        // 3) 最初の有効な命中(矢の命中、またはビームの有効な効果)でカードを消費する。消費できなければ全部消して何も与えない。
        if ((impacts.length || (plan && plan.targets.length)) && !seq.committed && !commitSeq(seq)) return;
        impacts.sort((a, b) => a.arrow.index - b.arrow.index);
        for (const impact of impacts) applyImpact(seq, impact.arrow, impact.target);
        if (plan && plan.due) applyBeamTick(seq, plan);
        if (seq.beam && seq.beam.active && seq.tick + 1 >= seq.beam.frames) endBeam(seq);
        seq.tick++;
        if (seq.committed) lastResult = { ok: true, pending: false, consumed: true, committed: true, ...resultOf(seq) };
        // 4) 全部放ち終わって、飛んでいる矢が無ければ終わり。確定していなければ外れ(非消費)。
        if (!busy(seq) && !liveArrows(seq).length) {
            if (!seq.committed) abortSeq(seq, "missed");
            else { // 正常な終わり(確定済み): 消費は済んでいて、矢を全部放ち終えた
                sequences.delete(seq.serial); releaseSummon(seq.summonId);
                lastResult = { ok: true, pending: false, consumed: true, committed: true, completed: true, cancelled: false, ...resultOf(seq) };
            }
        }
    };

    const clearAll = reason => {
        for (const seq of [...sequences.values()]) {
            if (!seq.committed) abortSeq(seq, reason);
            else { // 外からの取消(確定のあと): 残りの矢を消す。消費は戻らない(確定済み)。正常な終わりとは区別して記録する
                destroySeq(seq); sequences.delete(seq.serial); releaseSummon(seq.summonId);
                lastResult = { ok: false, reason, pending: false, consumed: true, committed: true, completed: false, cancelled: true, ...resultOf(seq) };
            }
        }
        if (pendingSeq) abortSeq(pendingSeq, reason);
        pendingSeq = null;
        clearVfxJobs();
    };

    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive) return;
        frameNo++;
        if (vfxJobs.length) tickVfxJobs();
        if (!sequences.size || this.eventsPaused) return;
        if (!deck.isCardBattleActive()) { clearAll("battleInactive"); return; }
        if (root.ProjectR?.PlayerDeath?.isDead?.() === true) { clearAll("playerDead"); return; }
        for (const seq of [...sequences.values()]) {
            try { processSequence(seq); } catch (error) { abortSeq(seq, "error:" + String(error?.message || error)); }
        }
    };

    const _endBattle = deck.endBattle;
    deck.endBattle = function() { clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clearAll("mapSetup"); return _setup.apply(this, arguments); };
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() { clearAll("load"); return _extract.apply(this, arguments); };
    // セーブに含まれた非恒久の矢(Hendrixの標準Map保存)は、ロード後に追跡が無いまま残る。このカードの矢だけを除去する。
    const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _onMapLoaded.apply(this, arguments);
        const m = map();
        if (!m) return;
        const tracked = new Set([...sequences.values()].flatMap(s => s.arrows.map(a => a.event).concat(s.beam ? s.beam.segments.map(g => g.event) : [])));
        for (const event of m.events()) if ((isArrow(event) || isBeamEvent(event)) && !tracked.has(event)) destroyArrow({ eventId: event.eventId(), event, map: m, gone: false });
    };

    const tempObjectCount = () => {
        let arrows = 0, events = 0, glows = 0, segments = 0, beamGlow = 0;
        for (const seq of sequences.values()) {
            for (const arrow of liveArrows(seq)) { arrows++; if (arrow.event) events++; if (arrow.glow) glows++; }
            if (seq.beam) { segments += seq.beam.segments.length; if (seq.beam.glow) beamGlow++; }
        }
        return { arrows, events, glows, segments, beamGlow, short: vfxJobs.length, total: events + glows + segments + beamGlow + vfxJobs.length }; // arrows=飛んでいる矢(判定)、events=そのうち見た目のEvent、total=一時的な表示物の合計
    };
    root.ProjectRApolloErosArrow = Object.freeze({
        CARD, implementedMaxLevel: IMPLEMENTED_MAX_LEVEL,
        constants: Object.freeze({ ALONG_HALF, ACROSS_HALF, SELF_MIN_TRAVEL, PRESENT_EVERY, GLOW_BUDGET, SHORT_VFX_BUDGET, SHORT_VFX_FRAMES }),
        limits: Object.freeze({ VISUAL_ARROW_BUDGET, MAX_TOTAL_ARROWS, MAX_BEAM_LENGTH, BEAM_SEGMENT_BUDGET }),
        getBeam: () => { const s = [...sequences.values()].find(x => x.beam); return s ? beamSummary(s) : null; },
        geometry3: Object.freeze({ convexOverlap, beamRectangle, edgeDistance }),
        cardLevel,
        config: level => { const c = config(level); return c ? { ...c } : null; },
        emitSchedule, directionDegrees,
        visualArrowCount: visualCount,
        geometry: Object.freeze({ distanceToPolygon, footprint, centroid, visualReal }),
        isPending: () => !!pendingSeq,
        getPending: () => pendingSeq ? { serial: pendingSeq.serial, instanceId: pendingSeq.instanceId, emitted: pendingSeq.next, arrows: liveArrows(pendingSeq).length } : null,
        getSequences: () => [...sequences.values()].map(s => ({ serial: s.serial, committed: s.committed, level: s.level, beam: beamSummary(s), emitted: s.next, slot: s.slot, slots: s.slots, count: s.count, tick: s.tick, arrows: liveArrows(s).length, hits: s.hits.length })),
        getActiveArrows: () => [...sequences.values()].flatMap(s => liveArrows(s).map(a => ({ serial: s.serial, eventId: a.eventId, index: a.index, slot: a.slot, direction: a.direction, hidden: a.hidden, aim: a.aim, heading: a.heading,
            x: a.x, y: a.y, age: a.age, travelled: a.travelled, lock: a.lock, glow: !!a.glow }))),
        getEmissionLog: () => emissionLog.map(entry => ({ ...entry })),
        getHitLog: () => hitLog.map(entry => ({ ...entry })),
        getEndLog: () => endLog.map(entry => ({ ...entry })),
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getTempObjectCount: tempObjectCount,
        getActiveVfxJobs: () => vfxJobs.map(job => ({ frames: job.frames, note: job.note, key: job.key }))
    });
})();
