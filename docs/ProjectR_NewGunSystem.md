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

## 見た目(最小・現実寄り)

- 構え: 銃が体の前でマウスを追う(公式Display Weapon)。
- 発射: 銃口に小さな発光(5〜6frame)、弾が銃口から出る、`GunFire`モーション(体が照準と逆へ少し下がる)、
  銃スプライトが後退して銃口が跳ねる(約9frame)。カメラシェイク/大きな発光/煙は入れていません。
- リロード: `GunReload`モーション(しゃがむ仮モーション)+ `Gun2`(仮のSE)。
- 素材: 銃画像 `img/pictures/ProjectR_G17_Dev.png`、弾 `img/characters/VFX/$ProjectR_G17Bullet.png` は
  **ProjectRが生成した開発用の仮素材**です(外部素材なし。`docs/ProjectR_ThirdPartyAssets.md`)。専用のリロード音・排莢・
  煙・実際の射撃モーション用スプライトは未用意です(下の「不足素材」)。

## G17のデータ

武器ID51「テストハンドガン」(`<capacity: 7>` `<ammo item: 弾薬>`、攻撃力など)はそのまま。`<starting ammo>`は未指定(拾った時点の弾倉は0。
最初にリロードが必要)。武器ノートに `<projectRGunSprite: ピクチャ名>` を書くと武器ごとに銃画像を替えられます。

## パラメータ(`ProjectR_GunSystem`)

`WeaponSprite` / `BulletTemplateName` / `FireCooldownFrames=12` / `ReloadFrames=40` / `BulletMaxFrames=45` / `AutoReloadOnEmpty=true` /
`ReloadKeyCode=KeyR` / `ShotSeName=Gun1(vol45)` / `DryFireSeName=Buzzer1` / `ReloadSeName=Gun2(vol50)`。

## 不足素材(最終アート待ち)

- 三頭身主人公の `GunAim` / `GunFire` / `GunReload` 行動スプライトシート(命名は `docs/ProjectR_CharacterAnimation.md`)
- 銃の最終画像(横向き、左端=回転中心、右端=銃口)、リロード専用SE、排莢・煙のVFX
- 現在は仮モーション(体の移動と伸縮)で「動かない」状態を避けています。

## 手動確認(MZ実機)

`docs/ProjectR_FullSpec_ManualVerification.md` 冒頭の「Character Animation + 新銃」手順(アリーナ北東の Animation / Weapon Zone)を使います。
MZ実機での確認は**未実施**です(自動テストは実エンジンの読み込みまで)。

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

**未確認(実機)**: 銃口の発光の見た目(短すぎて撮れず。色は明るい床向けに橙の外側を追加済みで未再確認) / 銃と体の反動の見た目 / 動作の「跳ね」の見た目 /
Hermes・Apollo各神の演出 / Idle・Walk・Run(専用画像なし) / 三頭身 / 8方向。

## テスト

`node tests/ProjectR_CharacterAnimationGun.test.cjs`(実エンジン・実Map004・物理キー): 構え/発射/銃口位置(8方向)/直進(マウスを動かしても曲がらない)/命中1回/
弾数1減少/連射/空撃ち→自動リロード/リロード(公式1回・二重なし)/反動/後始末/セーブに保存しない/旧銃の不到達。
