/*:
 * @target MZ
 * @plugindesc v1.1.0 DEV専用 Animation / Weapon Certification Zone（Map004北東の端末群。Playtest限定）。
 * @author ProjectR
 * @base ProjectR_CombatTestArena
 * @base ProjectR_CharacterPresentation
 * @base ProjectR_GunSystem
 * @orderAfter ProjectR_CombatTestArenaFullSpec
 * @orderAfter ProjectR_GunSystem
 *
 * @param SuppressAutosaveInPlaytest
 * @text Playtestでは自動セーブしない
 * @desc ONの間、Playtest(テスト実行)中だけ自動セーブを止め、開発中のセーブ(save/)を上書きしません。配布版(Playtestでない)では何もしません。
 * @type boolean
 * @default true
 *
 * @command animEquipGun
 * @text G17を装備(弾薬を補充)
 * @command animEquipSword
 * @text 剣を装備
 * @command animRefill
 * @text 弾倉を満タン+予備60発
 * @command animEmpty
 * @text 弾倉を空に(空撃ち/自動リロード確認)
 * @command animCast
 * @text SkillCast動作を再生
 * @command animUltimate
 * @text Ultimate動作を再生
 * @command animDamage
 * @text Damage動作を再生
 * @command animSword
 * @text SwordAttack動作を再生
 * @command animAim
 * @text 構え(GunAim)の姿勢を切り替え
 * @command animDown
 * @text Down動作を再生
 * @command animAnchors
 * @text アンカー表示を切り替え(足元/頭頂/武器/照準/近接/VFX/召喚/銃口)
 * @command animDev3h
 * @text 主人公をDEV3H(三頭身)にする(古いセーブ用)
 * @command animTfSprite
 * @text TF TallSpriteMZの主人公(48×72)に切り替え/戻す
 * @command animProfileTall
 * @text 見た目の高さ144pxのDEVプロファイル(アンカーだけ)
 * @command animProfileReset
 * @text 標準プロファイルへ戻す
 * @command animRestore
 * @text DEVの装備・弾薬を元に戻す
 * @command animStatus
 * @text 動作/銃の状態を表示
 *
 * @help
 * ProjectR_CombatTestArenaAnimation.js
 *
 * Combat Test Arena(Map004)の北東の部屋(射撃レーン(28,6)→標的(44,6)の手前、y=9〜10)にある
 * 「Animation / Weapon Certification Zone」の端末を動かすDEV専用プラグインです。Playtest以外では何もしません。
 * 既存のArenaゾーン・Map構成には触れず、各プラグインの公開APIだけを使います。
 *
 * 【使い方】カード戦闘を始めた状態(操作盤で Start Hermes Test など)で、
 *   G17を装備 → 射撃レーンの黄色い床(28,6)から標的(44,6)をマウスで狙って左クリック(J)で撃つ。Rでリロード。
 *   確認項目: 構え(銃が体の前でマウスを追う) / 銃口の発光・弾が銃口から出る / 発射後にマウスを動かしても弾が曲がらない /
 *             反動 / 1発ごとに弾数が1減る / リロード動作と音 / 空で撃つと空撃ち→自動リロード。
 *   剣を装備して攻撃 → 踏み込みの動作と斬撃。カード(Q/E/X/C/V)とUで SkillCast / Ultimate 動作。
 *   「SkillCast/Ultimate/Damage動作」端末はカードやゲージを使わずに動作だけを確認できます。
 *
 * 【DEV3H(三頭身の主人公)】主人公の既定の見た目は自作の三頭身 $DEV3H_Idle_f4(身長84px=頭28px x 3、1コマ96x96、4方向)です。
 *   Idle/Walk/Runは公式の自動切替、剣/構え/発射/リロード/詠唱/奥義/被弾/ダウンは行動シートで再生されます。
 *   古いセーブで主人公がRTPのままなら「主人公をDEV3Hに」の端末で切り替えます(アリーナ内のみ。ロード/New Gameで元の保存内容へ)。
 *   「アンカー表示」端末: 足元(白)・頭頂(灰)・武器の回転中心(赤)・照準(緑)・近接(水色)・VFX(黄)・召喚(桃)・銃口(橙)を表示します。
 *
 * 【TF TallSpriteMZ(背の高い主人公)】端末「TF Tall Sprite」で、主人公の見た目を img/characters/TF_Actor1.png
 *   (48×72px。Tonbi@Tobishima-Factory作。クレジットはタイトルの「クレジット」と docs/ProjectR_ThirdPartyAssets.md)に
 *   切り替えます。もう一度押す/「Restore」/アリーナを出る/New Game/ロードで元に戻ります。
 *   見た目の高さはCharacterPresentationが実スプライトから72pxと読み取り、銃の回転中心・銃口・神の位置が追従します。
 *   当たり判定は変わりません。**この画像は規約(そのままの再配布不可)のためGitに入れていません(.gitignore)**。
 *   ファイルが無いPCでは「ファイルがありません」と表示して何もしません。
 *
 * 【見た目の高さ144pxのDEVプロファイル】アンカー(銃の回転中心・銃口・神の位置)が背の高いキャラに追従することだけを
 *   確認する設定です。主人公のスプライト画像そのものは標準48pxのままなので、銃が頭の上に見えるのは仕様です
 *   (三頭身の専用画像は未提供。docs/ProjectR_CharacterAnimation.md)。「標準プロファイルへ戻す」で元に戻ります。
 *
 * 【セーブ保護】Playtestでは自動セーブを止めます(パラメータで解除可)。MZは場所移動のたびに save/file0 を自動セーブするため、
 *   動作確認のたびに開発セーブが上書きされるのを防ぎます。配布版は Utils.isOptionValid("test") が偽なので影響しません。
 *
 * 【保存】装備・弾薬・プロファイルはDEVで一時的に変わります。アリーナ(Map4/5)を出る・New Game・ロードで自動的に戻ります。
 *   テスト中にセーブしないでください。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_CombatTestArenaAnimation";
    const ARENA_MAPS = [4, 5];
    const GUN_WEAPON_ID = 51, SWORD_WEAPON_ID = 2, AMMO_ITEM_ID = 31;
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;

    // Playtest限定の自動セーブ停止(開発セーブの保護)。本番の自動セーブ挙動は変えない(この行はPlaytestでしか実行されない)。
    const playtestParams = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters(PLUGIN) : {};
    const suppressAutosave = String(playtestParams.SuppressAutosaveInPlaytest ?? "true") !== "false";
    if (suppressAutosave && typeof Scene_Base !== "undefined") {
        Scene_Base.prototype.requestAutosave = function() { /* Playtestでは自動セーブしない */ };
    }

    const presentation = () => root.ProjectRCharacterPresentation;
    const gun = () => root.ProjectRGunSystem;
    const runtime = { snapshot: null, profile: null, sprite: null, anchors: false, graphics: null };
    const TF_SPRITE = { name: "TF_Actor1", index: 0, file: "img/characters/TF_Actor1.png" };
    // 画像の有無はNW.jsのfsで確認する(Git管理外のため、無い環境がある)。fsが無い環境(テスト等)は差し替え可能。
    let assetCheck = file => {
        try {
            const fs = require("fs"), path = require("path");
            return fs.existsSync(path.join(path.dirname(process.mainModule.filename), file));
        } catch (_error) { return true; }
    };

    const say = (interpreter, lines) => {
        if (typeof $gameMessage === "undefined" || !$gameMessage) return;
        $gameMessage.setBackground?.(0);
        $gameMessage.setPositionType?.(0);
        for (const line of lines.slice(0, 14)) $gameMessage.add(line);
        interpreter?.setWaitMode?.("message");
    };
    const leader = () => $gameParty.leader();
    const remember = () => {
        if (runtime.snapshot) return;
        const actor = leader();
        runtime.snapshot = { weaponId: actor.equips()[0]?.id || 0, ammoItems: $gameParty.numItems($dataItems[AMMO_ITEM_ID]),
            magazine: $gameSystem.getGunData?.(GUN_WEAPON_ID)?.currentAmmo ?? null };
    };
    const equip = weaponId => {
        remember();
        leader().forceChangeEquip(0, $dataWeapons[weaponId]);
        $gamePlayer.refresh?.();
    };
    const fillAmmo = (magazine = null) => {
        remember();
        const item = $dataItems[AMMO_ITEM_ID];
        const have = $gameParty.numItems(item);
        if (have < 60) $gameParty.gainItem(item, 60 - have);
        const data = $gameSystem.getGunData?.(GUN_WEAPON_ID);
        if (!data) return false;
        $gameSystem.setGunAmmo(GUN_WEAPON_ID, magazine === null ? data.maxCapacity : magazine);
        return true;
    };
    const ANCHOR_COLORS = { feet: 0xffffff, head: 0xaaaaaa, weapon: 0xff3030, aim: 0x30ff60, melee: 0x30e0ff, vfx: 0xffe030, summon: 0xff60e0, muzzle: 0xff9a2e };
    const clearAnchors = () => {
        if (runtime.graphics) { runtime.graphics.parent?.removeChild(runtime.graphics); runtime.graphics = null; }
    };
    const drawAnchors = () => {
        if (!runtime.anchors || typeof PIXI === "undefined" || typeof SceneManager === "undefined") return;
        const scene = SceneManager._scene;
        const api = presentation();
        if (!scene || !api || typeof scene.addChild !== "function") return;
        if (!runtime.graphics || runtime.graphics.parent !== scene) {
            clearAnchors();
            runtime.graphics = new PIXI.Graphics();
            scene.addChild(runtime.graphics);
        }
        const g = runtime.graphics;
        g.clear();
        const feet = { x: $gamePlayer.screenX(), y: $gamePlayer.screenY() };
        const cross = (p, color, r = 5) => {
            g.lineStyle(2, 0x000000, 0.85); g.moveTo(p.x - r, p.y); g.lineTo(p.x + r, p.y); g.moveTo(p.x, p.y - r); g.lineTo(p.x, p.y + r);
            g.lineStyle(1, color, 1); g.moveTo(p.x - r, p.y); g.lineTo(p.x + r, p.y); g.moveTo(p.x, p.y - r); g.lineTo(p.x, p.y + r);
        };
        cross(feet, ANCHOR_COLORS.feet);
        const top = { x: feet.x, y: feet.y - api.visualHeight() };
        g.lineStyle(1, ANCHOR_COLORS.head, 0.9); g.moveTo(top.x - 14, top.y); g.lineTo(top.x + 14, top.y);
        g.moveTo(feet.x - 14, feet.y); g.lineTo(feet.x + 14, feet.y);
        for (const name of ["weapon", "aim", "melee", "vfx", "summon"]) {
            const p = api.anchorScreen(name);
            if (p) cross(p, ANCHOR_COLORS[name], name === "weapon" ? 6 : 4);
        }
        const mouse = typeof TouchInput !== "undefined" ? { x: TouchInput.x, y: TouchInput.y } : null;
        const pivot = api.anchorScreen("weapon");
        if (mouse && pivot && Number.isFinite(mouse.x)) {
            const degree = ((Math.atan2(mouse.y - pivot.y, mouse.x - pivot.x) * 180 / Math.PI + 450) % 360 + 360) % 360;
            const m = api.muzzleScreen({ degree, pivot });
            if (m) { cross(m, ANCHOR_COLORS.muzzle, 5); g.lineStyle(1, ANCHOR_COLORS.muzzle, 0.6); g.moveTo(pivot.x, pivot.y); g.lineTo(m.x, m.y); }
        }
    };
    const restoreSprite = () => {
        const saved = runtime.sprite;
        runtime.sprite = null;
        if (!saved || typeof $gameActors === "undefined" || !$gameActors) return false;
        $gameActors.actor(saved.actorId)?.setCharacterImage(saved.name, saved.index);
        $gamePlayer?.refresh?.();
        return true;
    };
    const restore = () => {
        runtime.anchors = false; clearAnchors();
        restoreSprite();
        const state = runtime.snapshot;
        runtime.snapshot = null;
        if (runtime.profile) { presentation()?.registerProfile?.(runtime.profile); runtime.profile = null; }
        if (!state || typeof $gameParty === "undefined" || !$gameParty) return false;
        const item = $dataItems[AMMO_ITEM_ID];
        const diff = state.ammoItems - $gameParty.numItems(item);
        if (diff) $gameParty.gainItem(item, diff);
        if (state.magazine !== null) $gameSystem.setGunAmmo(GUN_WEAPON_ID, state.magazine);
        leader().forceChangeEquip(0, state.weaponId ? $dataWeapons[state.weaponId] : null);
        return true;
    };

    const actions = {
        animEquipGun: () => { equip(GUN_WEAPON_ID); fillAmmo(); return "G17を装備(弾倉満タン・予備60発)。戦闘中は構えが出ます"; },
        animEquipSword: () => { equip(SWORD_WEAPON_ID); return "剣を装備"; },
        animRefill: () => { fillAmmo() ; return "弾倉を満タン・予備60発に"; },
        animEmpty: () => { fillAmmo(0); return "弾倉を空にしました。攻撃入力で空撃ち→自動リロード"; },
        animCast: () => { const r = presentation().request("SkillCast", { source: "arena" }); return `SkillCast: ${r.ok ? "再生" : r.reason}`; },
        animUltimate: () => { const r = presentation().request("Ultimate", { source: "arena" }); return `Ultimate: ${r.ok ? "再生" : r.reason}`; },
        animDamage: () => { const r = presentation().request("Damage", { source: "arena" }); return `Damage: ${r.ok ? "再生" : r.reason}`; },
        animSword: () => { const r = presentation().request("SwordAttack", { source: "arena" }); return `SwordAttack: ${r.ok ? "再生(動作のみ。斬撃は剣装備で攻撃)" : r.reason}`; },
        animAim: () => {
            const api = presentation();
            api.setAiming(!api.isAiming());
            return `構えの姿勢: ${api.isAiming() ? "ON(GunAimシート。戦闘中にG17を持つと自動で同じ状態)" : "OFF"}`;
        },
        animDown: () => { const r = presentation().request("Down", { source: "arena", frames: 90 }); return `Down: ${r.ok ? "再生(約1.5秒後に起き上がる)" : r.reason}`; },
        animAnchors: () => { runtime.anchors = !runtime.anchors; if (!runtime.anchors) clearAnchors(); return `アンカー表示: ${runtime.anchors ? "ON(もう一度押すとOFF)" : "OFF"}`; },
        animDev3h: () => {
            const api = presentation(), profile = api.profileForActor(1);
            const name = profile?.characterName || "$DEV3H_Idle_f4";
            if (!assetCheck(`img/characters/${name}.png`)) return `NG: img/characters/${name}.png がありません`;
            const actor = leader();
            if (actor.characterName() === name) return "すでにDEV3Hです";
            if (!runtime.sprite) runtime.sprite = { actorId: actor.actorId(), name: actor.characterName(), index: actor.characterIndex() };
            actor.setCharacterImage(name, 0);
            $gamePlayer.refresh();
            return "主人公をDEV3H(三頭身)にしました(Restore/退出で元へ)";
        },
        animTfSprite: () => {
            if (leader().characterName() === TF_SPRITE.name) { restoreSprite(); return "元の主人公の見た目へ戻しました"; }
            if (!assetCheck(TF_SPRITE.file)) return `NG: ${TF_SPRITE.file} がありません(規約上Gitに入れていません。docs/ProjectR_ThirdPartyAssets.md)`;
            const actor = leader();
            if (!runtime.sprite) runtime.sprite = { actorId: actor.actorId(), name: actor.characterName(), index: actor.characterIndex() };
            actor.setCharacterImage(TF_SPRITE.name, TF_SPRITE.index);
            $gamePlayer.refresh();
            return "TF TallSpriteMZ(48×72)に切り替え。見た目の高さはスプライトから自動で読み取ります";
        },
        animProfileTall: () => {
            const api = presentation();
            if (!runtime.profile) runtime.profile = api.profileForActor(1);
            const base = runtime.profile;
            api.registerProfile({ id: base.id, actorId: base.actorId, characterName: base.characterName, heads: base.heads, visualScale: base.visualScale,
                visualHeightPx: 144, directions: base.directions });
            return "見た目の高さ144pxのDEVプロファイル(アンカーだけ変化。画像は48pxのまま)";
        },
        animProfileReset: () => {
            if (runtime.profile) { presentation().registerProfile(runtime.profile); runtime.profile = null; }
            return "標準プロファイルへ戻しました";
        },
        animRestore: () => { restore(); return "DEVの装備・弾薬・プロファイルを元へ戻しました"; }
    };

    const statusLines = () => {
        const api = presentation(), g = gun();
        const profile = api.profileForPlayer();
        const cur = api.current();
        const s = g.status();
        const shot = s.lastShot;
        const history = api.history().filter(e => e.ok).slice(-5).map(e => `${e.name}${e.detail ? "(" + e.detail + ")" : ""}`);
        return [
            "[Animation / Weapon Zone]",
            `プロファイル:${profile.id} ${profile.heads}頭身 高さ${Math.round(api.visualHeight())}px 倍率${profile.visualScale}  現在:${cur.name}${cur.action ? " " + Math.round(cur.progress * 100) + "%" : ""}  構え:${api.isAiming() ? "yes" : "no"}`,
            `直近の動作: ${history.length ? history.join(" > ") : "なし"}`,
            `銃: ${s.equipped ? "装備" : "未装備"}  弾倉 ${s.ammo}/${s.capacity}  予備 ${s.reserve}  リロード中:${s.reloading ? "yes" : "no"}  発射${s.shots}回  空撃ち${s.dryFires}回  リロード${s.reloads}回`,
            `直近の発射: ${shot ? `角度${Math.round(shot.degree)}° 銃口(${Math.round(shot.muzzle.x)},${Math.round(shot.muzzle.y)}) 弾#${shot.eventId}` : "なし"}  飛行中の弾:${s.bullets}  構え表示:${s.displayed || "なし"}`
        ];
    };

    const body = (name, fn) => function() {
        if (!isPlaytest()) return;
        let line;
        try { line = fn(); } catch (error) { line = `NG: ${String(error?.message || error)}`; }
        say(this, [`[Arena] ${line}`, ...statusLines().slice(1, 4)]);
    };
    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        for (const [name, fn] of Object.entries(actions)) PluginManager.registerCommand(PLUGIN, name, body(name, fn));
        PluginManager.registerCommand(PLUGIN, "animStatus", function() { if (isPlaytest()) say(this, statusLines()); });
    }

    // アリーナ(4/5)を出たら、DEVの変更を元へ戻す。New Game/ロードでも。
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function(mapId) {
            const result = _setup.apply(this, arguments);
            if (!ARENA_MAPS.includes(Number(mapId)) && (runtime.snapshot || runtime.profile || runtime.sprite || runtime.anchors)) {
                try { restore(); } catch (_error) { /* DEV補助 */ }
            }
            return result;
        };
    }
    if (typeof Scene_Map !== "undefined") {
        const _update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            _update.apply(this, arguments);
            try { drawAnchors(); } catch (_error) { /* DEV補助 */ }
        };
    }
    if (typeof DataManager !== "undefined") {
        for (const name of ["extractSaveContents", "setupNewGame"]) {
            if (typeof DataManager[name] !== "function") continue;
            const original = DataManager[name];
            DataManager[name] = function() {
                if (runtime.profile) { presentation()?.registerProfile?.(runtime.profile); runtime.profile = null; }
                runtime.snapshot = null;
                runtime.anchors = false; clearAnchors();
                runtime.sprite = null; // New Game/ロードでは作り直されるアクターに任せる
                return original.apply(this, arguments);
            };
        }
    }

    root.ProjectRCombatTestArenaAnimation = Object.freeze({
        actions: Object.keys(actions), statusLines, restore, autosaveSuppressed: () => suppressAutosave,
        run: name => (actions[name] ? actions[name]() : null),
        isActive: () => !!(runtime.snapshot || runtime.profile || runtime.sprite || runtime.anchors),
        anchorsVisible: () => runtime.anchors, _drawAnchors: drawAnchors,
        setAssetCheck: fn => { assetCheck = typeof fn === "function" ? fn : assetCheck; }
    });
})();
