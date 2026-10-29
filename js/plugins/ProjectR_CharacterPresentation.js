/*:
 * @target MZ
 * @plugindesc v1.1.0 ProjectR キャラクター表示プロファイル(三頭身対応)と、攻撃/スキル/奥義の動作コントローラ。表示専用。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @base Hendrix_Animation_Solution
 * @base ProjectR_CardDeckCore
 * @base ProjectR_UltimateActivation
 * @base ProjectR_CombatPresence
 * @orderAfter ProjectR_UltimateActivation
 * @orderAfter ProjectR_CombatPresence
 * @orderAfter ProjectR_PlayerFacing
 *
 * @param ProfilesJson
 * @text 追加プロファイル(JSON配列)
 * @desc 空なら内蔵の主人公プロファイルだけを使います。例: [{"id":"npc_small","characterName":"$small","heads":2.5}]
 * @type note
 * @default
 *
 * @help
 * ProjectR_CharacterPresentation.js
 *
 * 【役割】キャラクターの「見た目の寸法・アンカー」と「動作(Idle/Walk/Run/Aim/剣/銃/詠唱/奥義/被弾/ダウン)」を
 * 1か所で扱います。ゲームの状態(HP・弾数・カード・ゲージ)は一切持ちません。セーブに何も保存しません。
 *
 * 【CharacterVisualProfile】データ駆動の静的設定です。キャラ/アクターごとに独立し、1つの全体倍率はありません。
 *   id / actorId / characterName(基本スプライト) / heads(頭身。情報用で、ロジックは頭身に依存しません)
 *   visualScale(表示倍率。通常は1。三頭身は大きい画像で作り、拡大では作らない)
 *   visualHeightPx(見た目の高さ。0=実スプライトから自動、取れなければ48)
 *   locomotion {idle,walk,run}   公式Animation Solutionの命名規則(後述)。nullなら自動検出に任せます。
 *   actions { Name: { sprite, characterIndex, frames, speed, hold } }  公式のplayFramesで再生する行動スプライト
 *   anchors { weapon, aim, melee, vfx, summon: {x,y(,byDirection)} / muzzle: {forward,side} }
 *            すべて「足元(画面座標)からのpx、上がマイナス」。未指定は見た目の高さから自動計算します。
 *   muzzleByWeapon { 武器ID: {forward,side} }
 *   hitbox  null | {width,height,offsetX,offsetY}  見た目とは別管理。nullなら一切変更しません。
 *   directions 4 | 8   8方向スプライト対応の宣言(実際の向き処理は公式Animation Solutionの8dir規則)
 *
 * 【公式Animation Solutionの命名規則(導入済みv2.0.7のヘルプより)】
 *   待機/歩行/走行: $hero_Idle.png / $hero_Walk_f6.png / $hero_Run.png (キーワードはプラグインパラメータで変更可)
 *   8方向        : $Hero_8dir.png / $Hero_Idle_8dir_f6.png (並び: 下,左下,右下,左,右,上,左上,右上)
 *   行動アニメ    : $hero_sword_f6.png を setImage し、playFrames(1,6,3) で再生(toFrame(n)で1枚指定)
 *
 * 【動作コントローラ】優先度: Down>Ultimate>SkillCast(=CrossArms: 絶専用の両腕クロス)>GunReload>Damage>剣/銃発射>Aim>Run>Walk>Idle
 *   行動は終わると必ず元(Idle/Walk/Run/Aim)へ戻ります。移動・入力は止めません(表示だけ)。
 *   行動スプライトが未設定の動作は、仮の手続き的モーション(踏み込み/反動/しゃがみ/跳ね)を表示します。
 *   画像が用意できたら、プロファイルの actions に sprite を書くだけで差し替わります(コード変更不要)。
 *
 * 【自動で動作が始まる条件】
 *   カード: ProjectRCardDeck.requestUseCardが成功(発動成功・消費)した時だけ SkillCast。失敗では再生しません。
 *   奥義  : ProjectRUltimateActivationが「started」を返した時だけ Ultimate。
 *   被弾  : 主人公HPが減った時 Damage。
 *   剣/銃 : ProjectR_WeaponPresentation / ProjectR_GunSystem が request() を呼びます。
 *
 * API: ProjectRCharacterPresentation
 *   registerProfile(raw) / getProfile(id) / profileForPlayer()
 *   anchor(name, opts) / anchorScreen(name, opts) / muzzleScreen({degree, weaponId}) / screenToMap(pt)
 *   scaleSummonOffset({x,y}) / visualHeight()
 *   request(name, opts) / release(name) / current() / baseline() / isActive(name) / history()
 *   applyHitbox() / diagnostics()
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const params = (typeof PluginManager !== "undefined" && PluginManager.parameters)
        ? PluginManager.parameters("ProjectR_CharacterPresentation") : {};

    const PRIORITY = Object.freeze({
        Idle: 10, Walk: 20, Run: 30, Aim: 40, SwordAttack: 60, GunFire: 60,
        FingerSnap: 62, Damage: 65, GunReload: 70, SkillCast: 80, CrossArms: 80, ArmSweep: 80, FistPump: 80, Ultimate: 90, Down: 100
    });
    const NAMES = Object.freeze(Object.keys(PRIORITY));
    const BASELINE = new Set(["Idle", "Walk", "Run", "Aim"]);
    // 仮モーションの長さ(frame)。プロファイルのactions[name].framesで上書きできます。
    const DEFAULT_FRAMES = Object.freeze({ SwordAttack: 14, GunFire: 9, GunReload: 40, SkillCast: 26, CrossArms: 32, ArmSweep: 22, FistPump: 28, FingerSnap: 16,
        Ultimate: 42, Damage: 12, Down: Infinity });
    const HISTORY_LIMIT = 40;

    const finite = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const tileHeight = () => (typeof $gameMap !== "undefined" && $gameMap?.tileHeight) ? $gameMap.tileHeight() : 48;
    const tileWidth = () => (typeof $gameMap !== "undefined" && $gameMap?.tileWidth) ? $gameMap.tileWidth() : 48;
    const player = () => (typeof $gamePlayer !== "undefined" ? $gamePlayer : null);

    // ---------------- プロファイル(静的設定。セーブしない) ----------------
    const profiles = new Map();
    const cloneJson = value => JSON.parse(JSON.stringify(value));

    const normalizeAnchor = anchor => {
        if (!anchor || typeof anchor !== "object") return null;
        const out = {};
        if (Number.isFinite(Number(anchor.x))) out.x = Number(anchor.x);
        if (Number.isFinite(Number(anchor.y))) out.y = Number(anchor.y);
        if (Number.isFinite(Number(anchor.forward))) out.forward = Number(anchor.forward);
        if (Number.isFinite(Number(anchor.side))) out.side = Number(anchor.side);
        if (anchor.byDirection && typeof anchor.byDirection === "object") out.byDirection = cloneJson(anchor.byDirection);
        return out;
    };
    const normalizeProfile = raw => {
        if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || !raw.id) return null;
        const scale = finite(raw.visualScale, 1);
        const actions = {};
        for (const name of NAMES) {
            const spec = raw.actions?.[name];
            if (spec && typeof spec === "object") {
                actions[name] = Object.freeze({
                    sprite: typeof spec.sprite === "string" && spec.sprite ? spec.sprite : null,
                    characterIndex: Math.max(0, Math.floor(finite(spec.characterIndex, 0))),
                    frames: Math.max(1, Math.floor(finite(spec.frames, 0))) || null,
                    speed: Math.max(1, Math.floor(finite(spec.speed, 3))),
                    hold: Math.max(0, Math.floor(finite(spec.hold, 0)))
                });
            }
        }
        const anchors = {};
        for (const [key, value] of Object.entries(raw.anchors || {})) anchors[key] = normalizeAnchor(value);
        const muzzleByWeapon = {};
        for (const [key, value] of Object.entries(raw.muzzleByWeapon || {})) muzzleByWeapon[key] = normalizeAnchor(value);
        const hitbox = raw.hitbox && typeof raw.hitbox === "object" ? Object.freeze({
            width: finite(raw.hitbox.width, 1), height: finite(raw.hitbox.height, 1),
            offsetX: finite(raw.hitbox.offsetX, 0), offsetY: finite(raw.hitbox.offsetY, 0) }) : null;
        return Object.freeze({
            id: raw.id,
            actorId: Number.isInteger(raw.actorId) ? raw.actorId : null,
            characterName: typeof raw.characterName === "string" && raw.characterName ? raw.characterName : null,
            heads: finite(raw.heads, 3),
            visualScale: scale > 0 ? scale : 1,
            visualHeightPx: Math.max(0, finite(raw.visualHeightPx, 0)),
            locomotion: Object.freeze({ idle: raw.locomotion?.idle || null, walk: raw.locomotion?.walk || null,
                run: raw.locomotion?.run || null }),
            actions: Object.freeze(actions),
            cardActions: Object.freeze({ ...(raw.cardActions || {}) }),
            anchors: Object.freeze(anchors),
            muzzleByWeapon: Object.freeze(muzzleByWeapon),
            hitbox,
            directions: raw.directions === 8 ? 8 : 4,
            notes: typeof raw.notes === "string" ? raw.notes : ""
        });
    };
    const registerProfile = raw => {
        const profile = normalizeProfile(raw);
        if (!profile) return null;
        profiles.set(profile.id, profile);
        return profile;
    };
    const getProfile = id => profiles.get(id) || null;

    // 内蔵: 現在の主人公(標準48pxスプライト)。三頭身の画像が用意できたら、このprofileのcharacterNameなどを
    // 差し替えるだけで寸法・アンカーが追従します(戦闘コードは書き換えません)。
    // 主人公: DEV3H(自作の三頭身。tools/gen_dev3h_character.cjs で生成。1コマ96x96、身長84px=頭28px x 3)。
    // 画像を差し替えるときは、この profile の characterName / locomotion / actions / anchors を書き換えるだけでよい。
    registerProfile({
        id: "protagonist", actorId: 1, heads: 3, visualScale: 1, visualHeightPx: 84, directions: 4,
        characterName: "$DEV3H_Idle_f4",
        locomotion: { idle: "$DEV3H_Idle_f4", walk: "$DEV3H_Walk_f6", run: "$DEV3H_Run_f6" },
        actions: {
            SwordAttack: { sprite: "$DEV3H_SwordAttack_f6", frames: 6, speed: 2, hold: 2 },
            Aim: { sprite: "$DEV3H_GunAim_f2", frames: 2, speed: 30, hold: 0 },
            GunFire: { sprite: "$DEV3H_GunFire_f3", frames: 3, speed: 2, hold: 0 },
            GunReload: { sprite: "$DEV3H_GunReload_f6", frames: 6, speed: 6, hold: 4 },
            SkillCast: { sprite: "$DEV3H_SkillCast_f6", frames: 6, speed: 4, hold: 4 },
            CrossArms: { sprite: "$DEV3H_CrossArms_f4", frames: 4, speed: 5, hold: 12 },
            ArmSweep: { sprite: "$DEV3H_ArmSweep_f4", frames: 4, speed: 4, hold: 6 },
            FistPump: { sprite: "$DEV3H_FistPump_f4", frames: 4, speed: 5, hold: 8 },
            FingerSnap: { sprite: "$DEV3H_FingerSnap_f4", frames: 4, speed: 4, hold: 3 },
            Ultimate: { sprite: "$DEV3H_Ultimate_f8", frames: 8, speed: 5, hold: 4 },
            Damage: { sprite: "$DEV3H_Damage_f3", frames: 3, speed: 4, hold: 0 },
            Down: { sprite: "$DEV3H_Down_f4", frames: 4, speed: 8, hold: 0 }
        },
        // 足元からのpx(上がマイナス)。肩=足元-50、構えた手=足元-49。銃の回転中心は肩の少し前。
        anchors: {
            weapon: { x: 0, y: -49, byDirection: { 4: { x: -4 }, 6: { x: 4 } } },
            aim: { x: 0, y: -49 }, melee: { x: 0, y: -46 }, vfx: { x: 0, y: -42 }, summon: { x: 0, y: -50 },
            muzzle: { forward: 40, side: 0 }
        },
        // カード別の動作(未指定のカードは SkillCast)。絶(Zetsu)は胸の前で両腕をクロス、薙ぎ払いは腕を前に振り払う、
        // 葦笛(新)はワークブックで主人公モーション「なにもしない」なので "None"(動作を出さない)。
        cardActions: { hermes_zetsu: "CrossArms", hermes_sweep: "ArmSweep", hermes_reed_flute: "None", hermes_issen: "ArmSweep", hermes_strength: "FistPump", hermes_veil: "None", hermes_psychopomp: "None" },
        notes: "DEV3H: 自作の三頭身(4方向。8方向なし)。最終アートが決まったら画像と上の数値を差し替える。"
    });
    registerProfile({ id: "default", heads: 3, visualScale: 1, visualHeightPx: 0, directions: 4 });
    try {
        const extra = JSON.parse(String(params.ProfilesJson || "[]").trim() || "[]");
        if (Array.isArray(extra)) extra.forEach(registerProfile);
    } catch (_error) { /* 不正なJSONは無視(内蔵プロファイルで動作) */ }

    const profileForActor = actorId => {
        for (const profile of profiles.values()) if (profile.actorId === actorId) return profile;
        return null;
    };
    const profileForPlayer = () => {
        const leader = typeof $gameParty !== "undefined" ? $gameParty?.leader?.() : null;
        return (leader && profileForActor(leader.actorId())) || profiles.get("default");
    };

    // ---------------- 見た目の高さ・アンカー ----------------
    const playerSprite = () => {
        const spriteset = typeof SceneManager !== "undefined" ? SceneManager._scene?._spriteset : null;
        return spriteset?._characterSprites?.find(sprite => sprite?._character === player()) || null;
    };
    const visualHeight = (profile = profileForPlayer()) => {
        if (profile.visualHeightPx > 0) return profile.visualHeightPx * profile.visualScale;
        const measured = Number(playerSprite()?.patternHeight?.());
        return (Number.isFinite(measured) && measured > 0 ? measured : 48) * profile.visualScale;
    };
    const DEFAULT_RATIO = Object.freeze({ weapon: 0.5, aim: 0.5, melee: 0.5, vfx: 0.5, summon: 0.5 });
    const DEFAULT_MUZZLE = Object.freeze({ forward: 40, side: 0 });

    // 足元からのpx(上がマイナス)。scaleはvisualScaleを含む。byDirection(テンキー向き)で向きごとに上書き可。
    const anchor = (name, options = {}) => {
        const profile = options.profile || profileForPlayer();
        const scale = profile.visualScale;
        const spec = profile.anchors[name];
        const dir = options.direction ?? player()?.direction?.();
        const byDir = spec?.byDirection?.[dir];
        if (name === "muzzle") {
            const weapon = options.weaponId != null ? profile.muzzleByWeapon[options.weaponId] : null;
            const m = { ...DEFAULT_MUZZLE, ...(spec || {}), ...(weapon || {}), ...(byDir || {}) };
            return { forward: m.forward * scale, side: m.side * scale };
        }
        // 未指定は「見た目の高さ(倍率込み)の中央」。指定値はスプライト基準のpxなのでvisualScaleを掛ける。
        const base = { x: 0, y: -(DEFAULT_RATIO[name] ?? 0.5) * visualHeight(profile) };
        if (spec && spec.x !== undefined) base.x = spec.x * scale;
        if (spec && spec.y !== undefined) base.y = spec.y * scale;
        if (byDir) {
            if (byDir.x !== undefined) base.x = byDir.x * scale;
            if (byDir.y !== undefined) base.y = byDir.y * scale;
        }
        return base;
    };
    const feetScreen = () => {
        const p = player();
        if (!p || typeof p.screenX !== "function") return null;
        const x = p.screenX(), y = p.screenY();
        return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    };
    const anchorScreen = (name, options = {}) => {
        const feet = feetScreen();
        if (!feet) return null;
        const a = anchor(name, options);
        return { x: feet.x + a.x, y: feet.y + a.y };
    };
    // 銃口: 武器の回転中心(weapon anchor)から、照準方向(0=上・時計回り)へ forward、直交方向へ side。
    // Display Weaponは左向きのときscale.y=-1で反転するため、sideも反転する(公式の描画と一致)。
    const muzzleScreen = (options = {}) => {
        const pivot = options.pivot || anchorScreen("weapon", options);
        const degree = Number(options.degree);
        if (!pivot || !Number.isFinite(degree)) return null;
        const m = anchor("muzzle", options);
        const theta = (degree - 90) * Math.PI / 180;
        const flip = Math.cos(theta) < -1e-9 ? -1 : 1;
        const side = m.side * flip;
        return { x: pivot.x + m.forward * Math.cos(theta) - side * Math.sin(theta),
            y: pivot.y + m.forward * Math.sin(theta) + side * Math.cos(theta), pivot, degree };
    };
    // 画面座標 → マップ実座標(タイル単位・小数)。スポーン位置は「タイル中心がこの点」になる(x-0.5,y-0.5)。
    const screenToMap = point => {
        if (!point || typeof $gameMap === "undefined" || !$gameMap) return null;
        const x = $gameMap.displayX() + point.x / tileWidth();
        const y = $gameMap.displayY() + point.y / tileHeight();
        return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    };
    // 神(常駐/一時)の召喚オフセット(タイル単位)を、見た目の高さに合わせて拡大する。48pxなら無変更。
    const scaleSummonOffset = offset => {
        const ratio = Math.max(1, visualHeight() / tileHeight());
        return { x: offset.x, y: offset.y * ratio };
    };

    // ---------------- hitbox(見た目とは別。明示的に設定されたときだけ公式コマンドで適用) ----------------
    const applyHitbox = () => {
        const profile = profileForPlayer();
        if (!profile.hitbox || typeof PluginManager === "undefined" || typeof Game_Interpreter === "undefined") return false;
        const args = { width: String(profile.hitbox.width), height: String(profile.hitbox.height),
            offsetX: String(profile.hitbox.offsetX), offsetY: String(profile.hitbox.offsetY) };
        PluginManager.callCommand(new Game_Interpreter(), "Hendrix_Action_Engine", "ChangePlayerHitbox", args);
        return true;
    };

    // ---------------- 動作コントローラ ----------------
    const active = new Map(); // name -> { name, frames, age, degree, official, ... }
    const log = [];
    let aimHeld = false;
    let lastAimDegree = 0;
    let officialApplied = null; // 現在適用中の公式行動スプライト(restoreが必要)
    const remember = (entry) => { log.push(entry); if (log.length > HISTORY_LIMIT) log.shift(); };

    const mouseDegree = () => {
        const p = player();
        if (!p || typeof TouchInput === "undefined") return null;
        const dx = TouchInput.x - p.screenX(), dy = TouchInput.y - p.screenY();
        if (![dx, dy].every(Number.isFinite) || Math.hypot(dx, dy) < 1e-8) return null;
        return ((Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360 + 360) % 360;
    };

    let baselineApplied = null; // 構え(Aim)/ダウン(Down)の基本姿勢として公式スプライトを当てているときの名前
    const restoreOfficial = () => {
        baselineApplied = null;
        if (!officialApplied) return;
        officialApplied = null;
        const p = player();
        try { p?.refresh?.(); } catch (_error) { /* 表示のみ */ }
    };
    const applyOfficial = (name, spec) => {
        const p = player();
        if (!p || typeof p.setImage !== "function") return false;
        p.setImage(spec.sprite, spec.characterIndex);
        if (spec.frames && typeof p.playFrames === "function") p.playFrames(1, spec.frames, spec.speed);
        officialApplied = name;
        return true;
    };

    const request = (name, options = {}) => {
        if (!PRIORITY[name]) return { ok: false, reason: "unknownAction", name };
        const profile = options.profile || profileForPlayer();
        const priority = PRIORITY[name];
        for (const other of active.values()) {
            if (other.name !== name && PRIORITY[other.name] > priority && !other.ended) {
                remember({ name, ok: false, reason: "lowerPriority", by: other.name });
                return { ok: false, reason: "lowerPriority", name, by: other.name };
            }
        }
        // 優先度が自分以下の行動は置き換える(同名は再発動で最初から)。
        for (const other of [...active.values()]) {
            if (PRIORITY[other.name] <= priority) active.delete(other.name);
        }
        const spec = profile.actions[name] || null;
        const official = !!(spec && spec.sprite);
        const frames = finite(options.frames,
            official && spec.frames ? spec.frames * spec.speed + spec.hold : (spec?.frames || DEFAULT_FRAMES[name] || 12));
        const degree = Number.isFinite(Number(options.degree)) ? Number(options.degree) : (mouseDegree() ?? lastAimDegree);
        if (Number.isFinite(degree)) lastAimDegree = degree;
        const entry = { name, frames, age: 0, degree, official, source: options.source || "api", detail: options.detail ?? null };
        if (official && !applyOfficial(name, spec)) entry.official = false;
        active.set(name, entry);
        remember({ name, ok: true, source: entry.source, detail: entry.detail, official: entry.official });
        return { ok: true, name, frames, official: entry.official };
    };
    const release = name => {
        const entry = active.get(name);
        if (!entry) return false;
        active.delete(name);
        if (entry.official) restoreOfficial();
        return true;
    };
    const isActive = name => active.has(name);

    const baseline = () => {
        const dead = root.ProjectR?.PlayerDeath?.isDead?.();
        if (dead) return "Down";
        if (aimHeld) return "Aim";
        const p = player();
        // DotMove の isMoving は移動処理の途中で偽になることがあるため、公式Animation Solutionと同じ「位置の変化」(_isMoving)も見る。
        if (p?._isMoving === true || p?.isMoving?.()) return p.isDashing?.() ? "Run" : "Walk";
        return "Idle";
    };
    const current = () => {
        let best = null;
        for (const entry of active.values()) {
            if (!best || PRIORITY[entry.name] >= PRIORITY[best.name]) best = entry;
        }
        if (best) return { name: best.name, progress: Number.isFinite(best.frames) ? clamp01(best.age / best.frames) : 0,
            frames: best.frames, official: best.official, degree: best.degree, action: true };
        return { name: baseline(), progress: 0, frames: 0, official: false, degree: lastAimDegree, action: false };
    };

    // 手続き的モーション(行動スプライトが無いとき)。aimに沿った方向へ動く。単位px/倍率。
    const shape = (name, t, degree) => {
        const rad = (degree - 90) * Math.PI / 180;
        const fx = Math.cos(rad), fy = Math.sin(rad);
        const bump = Math.sin(Math.PI * clamp01(t));
        switch (name) {
        case "SwordAttack": return { dx: fx * 7 * bump, dy: fy * 7 * bump, sy: 1 - 0.04 * bump };
        case "GunFire": {
            const kick = t < 0.25 ? t / 0.25 : (1 - t) / 0.75;
            return { dx: -fx * 4 * kick, dy: -fy * 4 * kick, sy: 1 - 0.02 * kick };
        }
        case "GunReload": return { dx: 0, dy: 2 * bump, sy: 1 - 0.05 * bump };
        case "SkillCast": return { dx: 0, dy: -4 * bump, sy: 1 + 0.05 * bump };
        case "CrossArms": return { dx: 0, dy: 1 * bump, sy: 1 - 0.02 * bump };
        case "ArmSweep": return { dx: fx * 3 * bump, dy: fy * 3 * bump, sy: 1 };
        case "FistPump": return { dx: 0, dy: -2 * bump, sy: 1 + 0.03 * bump };
        case "FingerSnap": return { dx: 0, dy: -1 * bump, sy: 1 };
        case "Ultimate": return { dx: 0, dy: -8 * Math.sin(Math.PI * clamp01(t * 1.15)), sy: 1 + 0.09 * bump };
        case "Damage": return { dx: (Math.floor(t * 8) % 2 ? 1 : -1) * 3 * (1 - t), dy: 0, sy: 1 };
        default: return { dx: 0, dy: 0, sy: 1 };
        }
    };
    const offsets = () => {
        const cur = current();
        if (!cur.action || cur.official) return { dx: 0, dy: 0, sy: 1, name: cur.name };
        const profile = profileForPlayer();
        const s = shape(cur.name, cur.progress, cur.degree);
        return { dx: s.dx * profile.visualScale, dy: s.dy * profile.visualScale, sy: s.sy, name: cur.name };
    };

    // 基本姿勢のうち、専用スプライトがあるもの(構え=Aim、倒れ=Down)。Idle/Walk/Runは公式の自動切替に任せる。
    // 行動(剣/銃/詠唱…)が再生中は触らず、終わったら構え/倒れへ戻す。構えを解く/復活で標準に戻す。
    const syncBaselineSprite = () => {
        const busy = [...active.values()].some(e => e.official);
        if (busy) return;
        const state = baseline();
        const want = state === "Aim" || state === "Down" ? state : null;
        const spec = want ? profileForPlayer().actions[want] : null;
        if (want && spec && spec.sprite) {
            if (baselineApplied !== want && applyOfficial(want, spec)) baselineApplied = want;
        } else if (baselineApplied) {
            restoreOfficial();
        }
    };
    const tick = () => {
        for (const entry of [...active.values()]) {
            entry.age++;
            if (entry.age >= entry.frames) {
                active.delete(entry.name);
                if (entry.official && ![...active.values()].some(e => e.official)) restoreOfficial();
            }
        }
        syncBaselineSprite();
    };
    const clearAll = () => {
        active.clear();
        aimHeld = false;
        officialApplied = null;
        baselineApplied = null;
        previousHp = null;
        lastUltimateSerial = -1;
    };

    // ---------------- 自動で動作を始める入口(いずれも「成功した事実」だけを見る) ----------------
    const deck = root.ProjectRCardDeck;
    const cardAction = (profile, cardId, category) =>
        profile.cardActions[cardId] || profile.cardActions[`category:${category}`] || "SkillCast";
    if (deck && typeof deck.requestUseCard === "function") {
        const _requestUseCard = deck.requestUseCard;
        deck.requestUseCard = function() {
            const result = _requestUseCard.apply(this, arguments);
            try {
                // SUCCESS(発動成功かつ消費)のときだけ。失敗/拒否では再生しない。
                // 予約時に動作を先に出したカード(絶)は、消費確定の成功では出し直さない(ProjectRCardModifiers.takePresentationSkip)。
                if (result?.ok === true && !root.ProjectRCardModifiers?.takePresentationSkip?.(result.cardId, "action")) {
                    const definition = deck.definitions?.card?.(result.cardId);
                    const action = cardAction(profileForPlayer(), result.cardId, definition?.category);
                    if (action !== "None") request(action, { source: "card", detail: result.cardId });
                }
            } catch (_error) { /* 表示のみ。カード結果は変えない */ }
            return result;
        };
    }
    let lastUltimateSerial = -1;
    let previousHp = null;
    const pollGameplayFacts = () => {
        const ultimate = root.ProjectRUltimateActivation?.getLastUltimateActivationResult?.();
        if (ultimate && Number.isFinite(ultimate.serial) && ultimate.serial !== lastUltimateSerial) {
            lastUltimateSerial = ultimate.serial;
            if (ultimate.ok === true && ultimate.started === true) {
                request("Ultimate", { source: "ultimate", detail: ultimate.godId });
            }
        }
        const leader = typeof $gameParty !== "undefined" ? $gameParty?.leader?.() : null;
        if (leader) {
            if (previousHp !== null && leader.hp < previousHp && leader.hp > 0) request("Damage", { source: "hp" });
            previousHp = leader.hp;
        }
    };

    // ---------------- Game_Player / Sprite_Character への接続 ----------------
    // 【公式Animation Solutionの橋渡し】Idle/Walk/Runの自動切替(updateMovingState/updateGraphics/待機アニメ)は、公式が
    // Game_CharacterBase.prototype.update を差し替えて呼びます。しかしこのプロジェクトでは Hendrix_Action_Engine が先に
    // 読み込まれ、Game_Character.update が「差し替え前」の update を保持しているため、プレイヤーでは公式の処理が呼ばれません
    // (実機で確認: updateMovingState の呼び出し0回。Hendrixファイルは変更しない方針)。
    // そこで、その1フレームに公式の処理が走らなかったときだけ、公式の関数を同じ順で呼びます。公式が走る環境では何もしません。
    const asParams = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("Hendrix_Animation_Solution") : {};
    const asFrameKeyword = String(asParams["Frame Keyword"] || "f");
    const asEnableSwitch = Number(asParams["Enable Switch"] || 0);
    let playerFrame = 0, asTickedFrame = -1;
    if (typeof Game_CharacterBase !== "undefined" && typeof Game_CharacterBase.prototype.updateMovingState === "function") {
        const _updateMovingState = Game_CharacterBase.prototype.updateMovingState;
        Game_CharacterBase.prototype.updateMovingState = function() {
            if (this === player()) asTickedFrame = playerFrame;
            return _updateMovingState.apply(this, arguments);
        };
    }
    const bridgeAnimationSolution = p => {
        if (typeof p.updateMovingState !== "function" || typeof p.updateGraphics !== "function") return false;
        p.updateMovingState();
        const enabled = asEnableSwitch === 0 || (typeof $gameSwitches !== "undefined" && $gameSwitches.value(asEnableSwitch));
        if (enabled && p._autoGraphicsEnabled) p.updateGraphics();
        if (p._isIdleAnimating && !p._isMoving && !p._moveRouteForcing && typeof p.animationWait === "function") {
            p._idleAnimCounter = (p._idleAnimCounter || 0) + 1;
            if (p._idleAnimCounter >= p.animationWait()) {
                p._idleAnimCounter = 0;
                if (p._characterName === p._detectedIdleGraphic) {
                    const match = p._characterName.match(new RegExp(`${asFrameKeyword}(\\d+)$`)) ||
                        p._characterName.match(new RegExp(`${asFrameKeyword}\\((\\d+)\\)$`));
                    p._pattern = (p._pattern + 1) % (match ? Number(match[1]) : 3);
                    p._patternUpdated = true;
                }
            }
        }
        return true;
    };
    if (typeof Game_Player !== "undefined") {
        const _update = Game_Player.prototype.update;
        Game_Player.prototype.update = function() {
            playerFrame++;
            _update.apply(this, arguments);
            try {
                if (asTickedFrame !== playerFrame) bridgeAnimationSolution(this);
                pollGameplayFacts();
                tick();
            } catch (_error) { /* 表示のみ */ }
        };
    }
    if (typeof Sprite_Character !== "undefined") {
        const _updatePosition = Sprite_Character.prototype.updatePosition;
        Sprite_Character.prototype.updatePosition = function() {
            _updatePosition.apply(this, arguments);
            if (this._character !== player()) return;
            const profile = profileForPlayer();
            const o = offsets();
            this.x += o.dx;
            this.y += o.dy;
            // 倍率は縦の潰し/伸びとvisualScaleだけ。左右反転(scale.xの符号)は壊さない。
            const sign = Math.sign(this.scale?.x || 1) || 1;
            if (this.scale && (o.sy !== 1 || profile.visualScale !== 1 || this._projectRScaled)) {
                this.scale.x = sign * profile.visualScale;
                this.scale.y = o.sy * profile.visualScale;
                this._projectRScaled = o.sy !== 1 || profile.visualScale !== 1;
            }
        };
    }
    for (const [proto, method] of [[typeof Game_Map !== "undefined" ? Game_Map.prototype : null, "setup"]]) {
        if (!proto) continue;
        const original = proto[method];
        proto[method] = function() {
            restoreOfficial(); // 行動スプライトのまま次のマップへ持ち越さない
            clearAll();
            return original.apply(this, arguments);
        };
    }
    if (typeof DataManager !== "undefined") {
        for (const method of ["setupNewGame", "extractSaveContents"]) {
            const original = DataManager[method];
            DataManager[method] = function() { clearAll(); return original.apply(this, arguments); };
        }
    }

    root.ProjectRCharacterPresentation = {
        PRIORITY, NAMES,
        registerProfile, getProfile, profileForPlayer, profileForActor,
        profileIds: () => [...profiles.keys()],
        anchor, anchorScreen, muzzleScreen, screenToMap, scaleSummonOffset, visualHeight, applyHitbox,
        request, release, isActive, current, baseline, offsets,
        // 構え(銃を出している間)。GunSystemが設定する。Aimは行動ではなく基本状態。
        setAiming: value => { aimHeld = !!value; },
        isAiming: () => aimHeld,
        activeNames: () => [...active.keys()],
        history: () => log.map(e => ({ ...e })),
        tick, clear: clearAll,
        diagnostics: () => ({ profile: profileForPlayer().id, current: current().name, active: [...active.keys()],
            aiming: aimHeld, visualHeight: visualHeight(), lastAimDegree })
    };
})();
