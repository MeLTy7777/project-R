# ProjectR 新銃システム(G17)

`js/plugins/ProjectR_GunSystem.js`(v1.0.0)。旧コピー実装は撤去済みです(`docs/ProjectR_LegacyGunRemoval.md`)。
公式 RPG Maker Action Combat(導入済み Hendrix_Action_Engine v1.6.3a)の機能だけで組み、
ProjectR独自の弾数カウンタ・独自の照準・独自の当たり判定は持ちません。

## 参照した公式資料(優先順)

1. 公式マニュアル https://www.rpgmakeractioncombat.com/ (`all-extended-commands`): `rotateTo(destination, range, lerpFrames)` /
   `moveToPosition(destination)`(`'forward'`は回転したイベントの向きへ進む) / `checkCollide(source, target, cooldown)` /
   Gun: `<capacity: x>` `<starting ammo: x>` `<ammo item: x>`、`$gameSystem.gunAmmo(slot)` `gunCapacity` `gunAmmoInInventory`、
   コマンド `Gun - Ammo and Capacity Control` / `Gun - Reload` / Display Weapon / Spawn Event / Destroy Event。
2. 公式テキストチュートリアル/開発ログ(itch.io): 「Devlog #10 - Gun & Reload system」「Video Tutorial: Create a Gun system」
   (Action Combat 1.5.5以降の新しい簡易方式)。**本文・動画は取得できませんでした**(下記)。
3. 導入済みプラグインのヘッダ/実装(`Hendrix_Action_Engine.js` 12341–12506行: Easy Gun System、5900行: Display Weapon、
   9542行: `rotateTo`、15511行: `checkCollide`、5006行: `UpdateEventHp`)。ここを正としました。

### 動画(確認できなかったもの。推測では実装していません)

| 動画 | チャンネル | URL | 必要な情報 |
|---|---|---|---|
| Video Tutorial: Create a Gun system (Action Combat 1.5.5) | Sang Hendrix | 再生リスト https://www.youtube.com/playlist?list=PL785kvkmLIUh4oP32GWsuLHOl-v7w1gjb (個別URLは取得不可) | 公式が推奨する「銃の弾の出し方・リロード入力・反動の付け方」。導入済み1.6.3aのヘッダの範囲で実装したので、動画と手順が違う場合は教えてください |
| How to use plugin RPG Maker Animation Solution - RPG Maker MZ | (チャンネル名は取得不可) | https://www.youtube.com/watch?v=nC0W4g6SZzQ | 背の高いキャラ/アクション用スプライトシートの作り方。字幕を取得できなかったので、導入済みのヘッダ(命名規則)だけに従いました |

## 構成

```
攻撃入力(左クリック/J) → Hendrixが共通イベント1を予約
  → CombatPresence/PlayerDeathControl/FullscreenDialogue が受理を判定(戦闘外・死亡中・会話中は拒否)
  → GunSystem が受理されたキューだけを取り除き、fire()
fire():
  銃を持っているか(公式 getGunData: <capacity> + <ammo item>) / リロード中でない / クールダウンでない / 弾がある
  → 空なら空撃ち音 + 自動リロード(パラメータでOFF可)
  → 照準角 = 武器の回転中心(CharacterPresentationのweaponアンカー)→マウス(0=上・時計回り。Display Weaponと同じ式)
  → 銃口 = 回転中心 + R(照準角) × (forward, side)   … プロファイルのmuzzle
  → 弾Prefab「ProjectR G17 Bullet」をspawnEvent(銃口の位置) → rotateTo(照準角)を一度だけ → Prefab側の moveToPosition('forward')
  → 成功した場合だけ: 公式 GunAmmoControl -1 / 発射音 / 銃口の発光 / GunFireモーション / 銃の反動
毎フレーム(Game_Map.update):
  弾: 壁(Region255/<CombatWall>/<destroyProjectile>)・マップ境界・最大寿命(45frame)で消える
  命中: checkCollide(敵, '<projectRGunBullet>') → UpdateEventHp(-player weapon) → その弾を DestroyEvent(1発1Hit・貫通なし)
```

- **Display Weapon**(公式): 戦闘中に銃を装備すると表示。オフセットは `weaponアンカー`から導出
  (公式の式 `回転中心 = 足元 - タイル高/2 + offset`)。銃をしまう/戦闘終了/マップ移動で消える。
- **ダメージ**: `UpdateEventHp value="-player weapon"` = Databaseの武器ダメージ(攻撃スキルの式・分散・会心・命中)。
  独自のダメージ計算は無い。与ダメージはUltimate Gaugeの既存の経路(`trackDamage`)を通る。
- **弾Prefab**(`data/Map002.json` テンプレート ID7): ノート `<projectRGunBullet>` `<attacker: player>` `<hitbox: 0.2, 0.2>`、
  画像 `VFX/$ProjectR_G17Bullet`、移動 `moveToPosition('forward')` を繰り返す(追尾する命令なし)、速度7(0.5タイル/frame)、
  45frameで自壊。**旧Prefab・旧passive(Projectile vs Enemy)は使わない**。
- **hitbox**: `rotateTo`後の弾は公式が中心基準に直す(realYが-0.5)ので、弾の見た目の中心は `screenX/screenY`。
  hitboxは中心にそろう(`hitboxData`のオフセットは中心補正済み)。
- **Hendrixの注意**: `CollisionManager.lastSourceEventId` は `<dmg:>` 付きの弾でしか記録されないため、`<dmg:>`の無い本弾は
  「衝突した敵に最も近い弾」を特定して1発を消す(`pickHitBullet`)。

## 弾薬・リロード(持ち主は Hendrix)

| 項目 | 持ち主 / 読み方 |
|---|---|
| 弾倉の現在値 | Hendrix `$gameSystem._gunData[武器ID].currentAmmo` / `gunAmmo()` |
| 容量 | 武器ノート `<capacity: 7>` / `gunCapacity()` |
| ストック | 弾薬アイテム(ID31「弾薬」) / `gunAmmoInInventory()` |
| 1発の減算 | `GunAmmoControl` を1発につき1回(弾が出たときだけ) |
| リロード | `Rキー` → 検証(弾倉が満タンでない・ストックがある・リロード中でない) → Reloadモーション+SE → **40frame後に公式 `GunReload` を1回** |
| 自動リロード | 空で攻撃入力 → 空撃ち音 → 同じ`requestReload`(二重にならない) |
| HUD | 公式の`gunAmmo()`等を読むだけ(ProjectR独自の弾数は無い) |

リロード中に武器を替える/戦闘が終わる/マップ移動 → キャンセル(弾薬は減らない)。

## 銃口・アンカー(`ProjectR_CharacterPresentation.js`)

`muzzle = weaponPivot + R(照準角) × (forward, side × flip)`。`flip`は左向き(cosθ<0)のとき-1
(Display Weaponが`scale.y=-1`で反転するため、銃の上下が逆に回る)。`visualScale`は`forward/side`に掛かる。
武器別の上書きは `muzzleByWeapon[武器ID]`、向き別は `anchors.muzzle.byDirection[テンキー向き]`。
既定: `forward = 40px`(開発用G17画像の幅)、`side = 0`。**画像を差し替えたらこの値だけを合わせてください**。

## 見た目(控えめ・現実寄り。2026-10-27 の最終版)

発射1回の入力から、**同じ1つの経路**で次が同時に出ます: `GunFire` の体(反動のコマ) → 銃の反動 → 銃口の発光 → 弾 → 発射音(`Gun1`)。

- 構え: 銃が胸の高さの回転中心から、マウスを360°追う(公式Display Weapon)。体は4方向の姿勢。
- **銃口の発光**: 銃口の1点だけ。4フレームの短い閃光(橙の小さな円錐 → 淡い黄の円錐 → 白い芯、長さ約9〜14px) +
  その後に銃口から立ちのぼる薄い灰色の煙(14フレーム、小さな円2つ)。体の中心の大きな発光・オレンジの球はありません。
- **弾**: 小さく速い短い弾筋(2px幅×15px長。先端は白→黄→橙の尾、1pxの暗い縁取り)。常駐する長い弾道線はありません。
  `tools/gen_dev_bullet.cjs` で再生成できます。当たり判定は従来どおり(0.2×0.2)。
- **反動**: 銃スプライトが約5px後退して銃口が約8°跳ね、約9フレームで戻る。体は `GunFire` シートで少し仰け反る。当たり精度・ダメージは不変。
- **リロード**: `GunReload` の体(両手を腹の前へ) + 銃が腰の高さへ約12px下がって銃口が足元側へ倒れる(0→1→0の山型) + `Gun2`(仮のSE)。
  公式 `GunReload` は40フレーム後に1回だけ(弾数の更新も1回)。リロードできないとき(満タン/ストック0)は動作もSEも出ません。
- 素材: 銃画像 `img/pictures/ProjectR_G17_Dev.png`、弾 `img/characters/VFX/$ProjectR_G17Bullet.png` は**ProjectRの自作の仮素材**です
  (外部素材なし。`docs/ProjectR_ThirdPartyAssets.md`)。専用のリロード音・排莢は未用意です(下の「不足素材」)。

### 実機で見つけた問題(修正済み)
反動とリロードの銃の動きは、最初 `Spriteset_Map.update` に足していましたが、公式Display Weaponは **`Scene_Map.update` の最後(Spriteset更新の後)**
で毎フレーム位置と角度を置き直すため、足した分が上書きされて**実機では見えませんでした**(自動テストは通っていた)。
`Scene_Map.update` の外側(公式が置いた後)で足すように直し、実機で反動とリロードの下げを確認しました。

## G17のデータ

武器ID51「テストハンドガン」(`<capacity: 7>` `<ammo item: 弾薬>`、攻撃力など)はそのまま。`<starting ammo>`は未指定(拾った時点の弾倉は0。
最初にリロードが必要)。武器ノートに `<projectRGunSprite: ピクチャ名>` を書くと武器ごとに銃画像を替えられます。

## パラメータ(`ProjectR_GunSystem`)

`WeaponSprite` / `BulletTemplateName` / `FireCooldownFrames=12` / `ReloadFrames=40` / `BulletMaxFrames=45` / `AutoReloadOnEmpty=true` /
`ReloadKeyCode=KeyR` / `ShotSeName=Gun1(vol45)` / `DryFireSeName=Buzzer1` / `ReloadSeName=Gun2(vol50)`。

## 不足素材(最終アート待ち)

- 銃の最終画像(横向き、左端=回転中心、右端=銃口)、リロード専用SE、排莢のVFX
- 三頭身主人公は自作のDEV3H(`GunAim/GunFire/GunReload` シート付き、`docs/ProjectR_CharacterAnimation.md` 第6節)。最終アートに置き換える前提です。

## 手動確認(MZ実機)

`docs/ProjectR_FullSpec_ManualVerification.md` 冒頭の「Character Animation + 新銃」手順(アリーナ北東の Animation / Weapon Zone)を使います。
MZ実機での確認結果は下の「実機(MZ Playtest)での確認結果」。

## 実機(MZ Playtest)での確認結果(部分)

自動テストとは別に、MZ 1.10.0 のPlaytest(F8 DevToolsつき)をデスクトップ操作で実際に起動し、Combat Test Arena(Map004)で確認しました
(確認日: 2026-10-27、操作はDevToolsのConsole+実際のキー/マウス)。

| 項目 | 結果 |
|---|---|
| 全プラグイン読み込み | OK。`ProjectRGunSystem` / `ProjectRCharacterPresentation` / `ProjectRCombatTestArenaAnimation` / `ProjectRWeaponPresentation` が object。F8に例外なし(`window.onerror`でも0件) |
| 構え(Display Weapon) | OK。戦闘中にG17を持つと銃が体の前に出て、マウスで回る。左向きでは銃が反転して上向きのまま(autoFlip) |
| 発射 | OK。左クリックで弾が出る。HUDの弾数が1ずつ減る(7→6→5→4)。弾は照準線上を直進し、発射後にマウスを動かしても曲がらない仕様(自動テストで確認) |
| 弾の見え方 | 初版は細くて黄色い床で見えなかったため、太め+暗い縁取りに直して再確認(左向きの弾が見えた) |
| 弾の速度 | 0.5タイル/frame(`distancePerFrame`で確認。自動テストと一致) |
| 命中 | OK。ダミー(Event 4)のHPが 1000→937(1回分)。隣のダミーは無傷 |
| リロード(Rキー) | OK。弾倉2→7、ストック92→87(公式1回)。しゃがむ仮モーション |
| 動作 | `history()`に GunFire / GunReload / SwordAttack / SkillCast(golden_arrow, sword_attack) / Ultimate(hermes) が記録され、Gaugeが0になった |
| 副作用 | **発見**: アリーナへの移動(`enter()`)時にMZのオートセーブが働き、`save/file0.rmmzsave`(オートセーブ枠)が上書きされた。DEVの装備/状態が保存されるので、アリーナ確認中の実セーブは避けること |

上の表は最初の部分確認(当時は標準48pxの主人公)です。**三頭身のDEV3Hでの最終確認は次の節**です。

## 実機(MZ Playtest)での確認結果(DEV3H・最終版、2026-10-27)

キャプチャ: `docs/evidence/g17_fire_and_reload.png`(発射とリロード) / `docs/evidence/dev3h_aim_8directions.png`(360°の構え)。

| 項目 | 結果 |
|---|---|
| 銃と手の位置 | OK。肩〜胸の高さ(足元-49px)から銃が出る。右向きで腕と銃が一直線、上向きは背中越しに銃口が上へ。下向きは体の前で銃口が下 |
| 360°の構え | OK。右/右上/上/左上/左/左下/下/右下で銃が追従し、左向きでも銃が上下逆にならない |
| 発射 | OK。銃口の小さな閃光と、銃口から出る小さな弾筋。同じフレームに `GunFire` の体 |
| 反動 | OK(修正後)。銃が後退して銃口が跳ね、体が少し仰け反って構えへ戻る |
| リロード | OK(修正後)。体は両手を腹の前へ、銃は腰へ下がって戻る。ログ: 弾倉3→7、ストック92→87の1回だけ |
| 旧演出 | 体の中心の発光・旧弾道線・旧Animation 111 は出ない |
| 副作用 | セーブファイルは変更なし(Playtestの自動セーブ停止。SHA-256一致) |

**未確認(実機)**: 発射音/リロード音の聞こえ方(音量だけをログで確認) / 弾が敵に当たる見た目の再撮影(HPが1回だけ減ることは自動テストと前回の実機で確認)。

## テスト

`node tests/ProjectR_CharacterAnimationGun.test.cjs`(実エンジン・実Map004・物理キー): 構え/発射/銃口位置(8方向)/直進(マウスを動かしても曲がらない)/命中1回/
弾数1減少/連射/空撃ち→自動リロード/リロード(公式1回・二重なし)/反動/後始末/セーブに保存しない/旧銃の不到達。
