# ProjectR 旧銃(コピー実装)の撤去記録

新銃(`ProjectR_GunSystem.js`)への置き換えにあたり、G17の発射に関わっていた旧実装を洗い出し、
**REMOVE / REPLACE / KEEP AS DATA / KEEP AS OFFICIAL DEPENDENCY** に分類しました。
旧実装は「スイッチで無効化」ではなく、**到達できないよう実体を取り除いて**あります
(`tests/ProjectR_CharacterAnimationGun.test.cjs` の「旧銃の撤去」「旧銃の経路は到達しない」が検査します)。

## 1. 旧実装の構成(撤去前)

攻撃入力(Hendrix Button Config: 左クリック/J = 共通イベント1)→ `プレイヤー基本攻撃`(CE1)の銃ブランチ:

1. `turnToward('mouse or gamepad')`
2. `spawnEvent "Object: Gun"`(テンプレートMap002の`<gun>`イベント。画像 `VFX/$Gun`、`<child of: player>`)
3. 弾が残っていれば: `Gun1`(音) → `ShowAnimation 111`(銃撃/単発。**体の中心に赤い発光**) →
   `spawnEvent "Bullet"`(テンプレート`<weaponAttack>`) → `GunAmmoControl -1`
4. 空なら: ストックがあれば `GunReload`、なければ `Buzzer1`
5. 敵側: `<passive: 公式銃 Enemy Collision>`(CE3)が `checkCollide(this,'<weaponAttack>')` + `equippedWeaponType('銃')` で
   アニメ127・ノックバック・ダメージ(`-player weapon`)・ダメージ表示を実行
6. 弾側: `<passive: Projectile vs Enemy>`(CE2)が敵/`<destroyProjectile>`に当たると消滅
7. 見た目の層(`ProjectR_WeaponPresentation.js` v1.1): 銃の攻撃が受理されたとき**体の中心**に発光+弾道線(220px)、
   `GunReload`をラップして`Gun2`のリロード音

## 2. 分類

| 旧要素 | 場所 | 分類 | 内容 |
|---|---|---|---|
| CE1 の銃ブランチ全体(Object: Gun生成・弾生成・Gun1音・弾薬減算・自動リロード・ブザー) | `data/CommonEvents.json` CE1 | **REMOVE** | 銃装備時のCE1は何もしない(コメントのみ)。攻撃入力は`ProjectR_GunSystem`が受ける |
| 発射アニメ `ShowAnimation 111`(体の中心の赤い発光) | CE1 | **REMOVE** | 新銃は銃口に小さな発光だけ(WeaponPresentation) |
| CE1/CE4 の剣側にあった旧 `Object: Gun` 破棄 | CE1 else / CE4 | **REMOVE** | 旧Gunオブジェクトが存在しないため |
| `公式銃 Enemy Collision`(CE3)の中身 | CE3 | **REMOVE** | コメントのみにした。名前とIDは残す(参照しているMap001のDEV敵が「存在しないCE」を指さないため) |
| テンプレート `Bullet`(`<weaponAttack>`) | `data/Map002.json` | **REMOVE** | 旧Prefabは削除(ID1は空き)。新弾は専用Prefab `ProjectR G17 Bullet`(ID7) |
| テンプレート `Object: Gun`(`<gun>`) | `data/Map002.json` | **REMOVE** | 銃の表示は公式 Display Weapon に置き換え(ID2は空き) |
| 体の中心の銃口発光 | `ProjectR_WeaponPresentation.js` | **REPLACE** | 銃口の点(CharacterPresentationのアンカー)に小さな発光。点が渡されなければ描かない |
| 弾道線(tracer) | `ProjectR_WeaponPresentation.js` | **REMOVE** | 弾そのものが見えるので二重の弾道は不要 |
| `GunReload`のラップとリロード音 | `ProjectR_WeaponPresentation.js` | **REPLACE** | リロード入力・動作・音を`GunSystem`の1経路に統合(二重リロード/二重音を防ぐ) |
| パラメータ `MuzzleOffsetPixels` / `TracerFrames` / `ReloadSeName` / `ReloadSeVolume` | `WeaponPresentation` | **REMOVE** | 銃口位置はプロファイル、リロード音は`GunSystem`のパラメータへ |
| `Projectile vs Enemy`(CE2) | CE2 | **KEEP AS DATA** | 旧Bulletからしか使われていなかったが、汎用の公式サンプルとして残す(どのイベントからも呼ばれない) |
| `img/characters/VFX/$Gun.png`(旧Gunオブジェクトの画像) | 画像 | **KEEP AS DATA** | 参照されなくなっただけ。ユーザーの許可なく削除しない |
| `img/characters/VFX/$Bullet.png` | 画像 | **KEEP AS DATA** | Apollo各種の矢のPrefabが今も使う |
| Animation 111「銃撃/単発」、127(旧被弾) | `data/Animations.json` | **KEEP AS DATA** | どこからも呼ばれない。Animations.jsonはユーザーの未コミット変更を含むので触らない |
| `公式銃テスト敵`のpassive指定 | `data/Map001.json` | **KEEP AS DATA** | ユーザーの未コミット変更を含むMap001は触らない。CE3が空なので無害 |
| G17(武器ID51 テストハンドガン `<capacity: 7>` `<ammo item: 弾薬>`)、弾薬(アイテムID31) | `data/Weapons.json` `data/Items.json` | **KEEP AS DATA** | 名前・ステータス・弾薬・容量をそのまま使う。セーブ互換のため変更なし |
| Easy Gun System: `gunAmmo()` `gunCapacity()` `gunAmmoInInventory()` `GunAmmoControl` `GunReload` `<starting ammo>` | `Hendrix_Action_Engine.js` | **KEEP AS OFFICIAL DEPENDENCY** | 弾薬・容量・ストック・リロードの唯一の持ち主。ProjectRは別の弾数を持たない |
| Display Weapon | `Hendrix_Action_Engine.js` | **KEEP AS OFFICIAL DEPENDENCY** | 構えと360°照準 |
| `spawnEvent` / `rotateTo` / `moveToPosition('forward')` / `checkCollide` / `UpdateEventHp` / `DestroyEvent` | `Hendrix_Action_Engine.js` | **KEEP AS OFFICIAL DEPENDENCY** | 新弾Prefabと命中処理 |
| 攻撃入力の戦闘外/死亡中/会話中の拒否 | `CombatPresence` / `PlayerDeathControl` / `FullscreenDialogue` | **KEEP** | 新銃も同じ連鎖を通る(受理されたときだけ`GunSystem`が受ける) |
| 戦闘HUDの弾数表示 | `ProjectR_BattleHUD.js` | **KEEP** | 公式の`gunAmmo()`等を読むだけ |

## 3. 撤去できたことの確認

- `CE1` に `Object: Gun` / `"Bullet"` / `GunAmmoControl` / `GunReload` / `Gun1` / `gunAmmo()` / 発射アニメ111 が無い。
- `CE3` はコメントのみ(Bullet判定・ノックバック・アニメ127を実行しない)。
- `Map002` に `Bullet` / `Object: Gun` が無く、`<weaponAttack>` / `<gun>` を持つ Prefab が無い。`ProjectR_*` プラグインにも参照が無い。
- 攻撃入力を1回入れると、共通イベントのキューは空、`$gameTemp` のアニメ要求は0、旧Gun/旧Bulletは生成されず、
  弾は1発、`GunAmmoControl`は1回、`Gun1`は1回(発射経路は1つ)。

## 4. 未対応・注意

- `Animations.json` / `Map001.json` / `CommonEvents.json`(ユーザー側の変更を含む)のうち、CE1/CE3/CE4の行だけを変更しました。
  それ以外のユーザー変更は触っていません。
- `$Gun.png` と `$Bullet.png` は削除していません(許可が必要)。不要になった場合はユーザーが削除してください。
