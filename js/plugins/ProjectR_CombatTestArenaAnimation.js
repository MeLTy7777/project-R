/*:
 * @target MZ
 * @plugindesc v1.0.0 DEV専用 Animation / Weapon Certification Zone（Map004北東の端末群。Playtest限定）。
 * @author ProjectR
 * @base ProjectR_CombatTestArena
 * @base ProjectR_CharacterPresentation
 * @base ProjectR_GunSystem
 * @orderAfter ProjectR_CombatTestArenaFullSpec
 * @orderAfter ProjectR_GunSystem
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
 * 【見た目の高さ144pxのDEVプロファイル】アンカー(銃の回転中心・銃口・神の位置)が背の高いキャラに追従することだけを
 *   確認する設定です。主人公のスプライト画像そのものは標準48pxのままなので、銃が頭の上に見えるのは仕様です
 *   (三頭身の専用画像は未提供。docs/ProjectR_CharacterAnimation.md)。「標準プロファイルへ戻す」で元に戻ります。
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

    const presentation = () => root.ProjectRCharacterPresentation;
    const gun = () => root.ProjectRGunSystem;
    const runtime = { snapshot: null, profile: null };

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
    const restore = () => {
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
            if (!ARENA_MAPS.includes(Number(mapId)) && (runtime.snapshot || runtime.profile)) {
                try { restore(); } catch (_error) { /* DEV補助 */ }
            }
            return result;
        };
    }
    if (typeof DataManager !== "undefined") {
        for (const name of ["extractSaveContents", "setupNewGame"]) {
            if (typeof DataManager[name] !== "function") continue;
            const original = DataManager[name];
            DataManager[name] = function() {
                if (runtime.profile) { presentation()?.registerProfile?.(runtime.profile); runtime.profile = null; }
                runtime.snapshot = null;
                return original.apply(this, arguments);
            };
        }
    }

    root.ProjectRCombatTestArenaAnimation = Object.freeze({
        actions: Object.keys(actions), statusLines, restore,
        run: name => (actions[name] ? actions[name]() : null),
        isActive: () => !!(runtime.snapshot || runtime.profile)
    });
})();
