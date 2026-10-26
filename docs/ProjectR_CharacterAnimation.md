# ProjectR キャラクター表示プロファイルと動作

`js/plugins/ProjectR_CharacterPresentation.js`(v1.1.0)。**表示専用**です。HP・弾数・カード・ゲージなどのゲームの状態は持たず、
セーブにも何も保存しません(現在のフレーム/反動/銃口の発光/行動中の動作はすべて実行時だけ。ロード後は通常のIdleへ戻る)。

## 1. 参照した公式資料

- 導入済み `Hendrix_Animation_Solution.js`(v2.0.7)のヘルプ(日本語): 命名規則・`playFrames`・`toFrame`・8方向・イベントごとの速度コメント。**ここを正としました**。
- 公式テキストチュートリアル/マニュアル(https://www.rpgmakeractioncombat.com/ 、itch.io の開発ログ「Ver 1.2.5 - Better Idle, Walk and Run」
  「Version 1.5.3b」「Version 2.0.3」): Idle/Walk/Runはファイル名のキーワードで自動検出される / `playFrames`は1始まり(1.2.2〜) /
  1行スプライトシートは `_fN` 命名 / イベントごとの `<frame idle speed: N>` コメント。
- 公式動画(Animation Solution の使い方: https://www.youtube.com/watch?v=nC0W4g6SZzQ 、題名「How to use plugin RPG Maker Animation Solution - RPG Maker MZ」)。
  **字幕・本文を取得できず**、背の高いキャラ/三頭身/アクションシートの具体的な作り方は動画に頼らず、導入済みコード(v2.0.7)を正としています。
  2026-10-27に公式の文章マニュアル(https://www.rpgmakeractioncombat.com/2025/02/21-master-animation-using-hendrix.html)も再確認しましたが、
  命名規則(`_Idle/_Walk/_Run`・`_8dir`・`_fN`)と `playFrames/toFrame` だけで、**1コマの大きさ・背の高いキャラ・`setImage` の記述はありません**。
  動画から必要な情報と、動画が来たときの扱いは `docs/ProjectR_OfficialVideoNeeded.md`。
- **導入済みコードから確認した大きさの規則**(`Hendrix_Animation_Solution.js` の `Sprite_Character.patternWidth/patternHeight`): `$` 付きの単体キャラは
  1コマの幅 = 画像の幅 ÷ コマ数(`_fN`)、高さ = 画像の高さ ÷ 4(8方向は ÷ 8)。つまり**任意のコマの大きさが使える**(96×96でよい)。
- 公式の「三頭身」「8方向の戦闘用サンプル」に相当する資料は、導入済み版のヘルプには**ありません**。8方向は命名規則と並び順のみ。

## 2. CharacterVisualProfile

データ駆動の静的設定です。キャラ/アクターごとに独立しており、**全体共通の倍率は存在しません**。「3頭身」は現在の主人公の
アート標準であって、エンジンの制限ではありません(ロジックは頭身に依存しません)。

```js
ProjectRCharacterPresentation.registerProfile({
  id: "protagonist", actorId: 1, characterName: "$hero",   // 基本スプライト(情報用)
  heads: 3,                    // 頭身(情報用)
  visualScale: 1,              // 表示倍率。三頭身は「大きい画像」で作り、拡大では作らない
  visualHeightPx: 144,         // 見た目の高さ。0=実スプライトから自動(取れなければ48)
  locomotion: { idle: "$hero_Idle_f4", walk: "$hero_Walk_f6", run: "$hero_Run_f6" },   // 公式の自動検出に任せる(検証用の記録)
  actions: {                   // 行動スプライト(公式 setImage + playFrames)。無い動作は仮モーション
    SwordAttack: { sprite: "$hero_sword_f6", frames: 6, speed: 2 },
    GunFire:     { sprite: "$hero_gunfire_f4", frames: 4, speed: 2 },
    GunReload:   { sprite: "$hero_gunreload_f8", frames: 8, speed: 5 },
    SkillCast:   { sprite: "$hero_cast_f6", frames: 6, speed: 4 },
    Ultimate:    { sprite: "$hero_ultimate_f8", frames: 8, speed: 5, hold: 6 }
  },
  cardActions: { "apollo_lyre_calm": "SkillCast", "category:attack": "SkillCast" },   // カード/カテゴリごとの上書き(既定SkillCast)
  anchors: {                   // 足元(画面座標)からのpx、上がマイナス。未指定=見た目の高さの中央
    weapon: { x: 0, y: -66 }, melee: { y: -60 }, vfx: {}, summon: {}, aim: {},
    muzzle: { forward: 40, side: 0, byDirection: { 4: { side: -2 } } }       // 銃口: 回転中心から照準方向へ forward、直交へ side
  },
  muzzleByWeapon: { "51": { forward: 34 } },                                 // 武器ID別
  hitbox: null,                // 見た目とは別管理。{width,height,offsetX,offsetY} を書いたときだけ公式の ChangePlayerHitbox で適用
  directions: 4                // 8 = 8方向スプライトを使う宣言
});
```

- 追加プロファイルはプラグインパラメータ `ProfilesJson`(JSON配列)でも登録できます。
- 内蔵: `protagonist`(actorId 1。自作の三頭身 DEV3H。第6節)と `default`(標準・自動)。
- `profileForPlayer()` は先頭パーティメンバーのactorIdで引きます。別キャラに替えれば寸法・アンカーはプロファイルに追従し、**戦闘コードは変わりません**。
- プロファイルは `Object.freeze` された静的設定です(実行中に書き換わらない)。

### 見た目 vs 当たり判定

見た目(画像の大きさ・`visualHeightPx`・`visualScale`)と、移動の当たり判定・被弾判定・調べる位置・武器アンカーは別々です。
背を高くしてもドア等を通れなくなることはありません(hitboxは`hitbox`を明示したときだけ変更)。

### アンカー(すべてここから出す)

| アンカー | 用途 |
|---|---|
| `weapon` | Display Weaponの回転中心(公式の式 `足元 - タイル高/2 + offset` に合わせて算出) |
| `muzzle` | 銃口(回転中心 + R(照準角)×(forward, side)。左向きでは公式の反転に合わせsideを反転) |
| `melee` | 斬撃(WeaponPresentation)の中心 |
| `vfx` / `aim` | 汎用のVFX/照準の原点 |
| `summon` | 神(常駐/一時)の召喚オフセットの拡大率(高さ/タイル高。48pxなら無変更) |

## 3. 三頭身キャラクターの作り方(公式のスプライト規則)

1. **標準MZの48×48を300%拡大しない**。背の高い専用画像を作り、`$` 接頭辞の単体キャラクターにする(3列×4行 = 12コマ。
   セル幅/高さ = 画像÷3 / ÷4。MZの`Sprite_Character`が自動で追従)。例: 1コマ 96×144(頭48=三頭身)なら画像は 288×576。
2. **足元(原点)** はセルの**下端中央**(MZの標準。`screenY` = 足元)。足が浮く/沈むときは画像側の余白で合わせる。
3. 歩行/待機/走行は公式の命名規則(下)。アクションは別ファイルを `setImage` して `playFrames` で再生し、終わったら元へ戻す
   (本プラグインが自動で行う)。
4. プロファイルの `visualHeightPx` は 0(自動)でもよい(実スプライトの高さを読む)。固定したいときだけ数値を書く。
5. 当たり判定はプロファイルの `hitbox` か既定のまま。見た目に引きずられない。
6. 武器の回転中心・銃口・斬撃の中心・神の位置は `anchors` で画像に合わせる(足元基準のpx)。

### 公式の命名規則(Animation Solution v2.0.7)

| 種類 | ファイル名 | 備考 |
|---|---|---|
| 待機 | `$hero_Idle.png` / `$hero_Idle_f4.png` | `f4`=4コマの1行シート。キーワードはプラグインパラメータで変更可 |
| 歩行 | `$hero_Walk.png` / `$hero_Walk_f6.png` | 止まれば自動でIdleへ |
| 走行 | `$hero_Run.png` / `$hero_Run_f6.png` | ダッシュ中のみ |
| 8方向 | `$Hero_8dir.png` / `$Hero_Idle_8dir.png` / `$Hero_Idle_8dir_f6.png` | 行の並び: 下(2)・左下(1)・右下(3)・左(4)・右(6)・上(8)・左上(7)・右上(9) |
| 行動 | `$hero_sword_f6.png` など | `Idle`/`Walk`/`Run` の語を含めない(自動検出されるため) |
| 速度 | イベントのコメント `<frame idle speed: 5>` / `<frame walk speed: x>` / `<frame run speed: x>` | プラグインパラメータより優先 |

- `toFrame(x)` / `playFrames(first, last, speed)` は**1始まり**。`playFrames(1, 6, 3)` = 1〜6コマ、各コマ3フレーム待つ。
- 1行シートの左右反転: 「Turn Left」で通常、「Turn Right」で反転。
- 8方向: 4方向のみの素材を偽の8方向に変形しない。8方向素材が用意できたら、ファイル名を `_8dir` にしてプロファイルの `directions: 8` と合わせる
  (向きの処理は公式Animation Solution/Hendrixが行う。ProjectR側のコードは不要)。

## 4. 動作コントローラ

| 動作 | 優先度 | 由来 |
|---|---|---|
| Down | 100 | 主人公のHPが0の間は基本状態として `Down` シートを表示(復活で元へ)。DEV端末の「Down動作」は約1.5秒だけ再生 |
| Ultimate | 90 | `ProjectRUltimateActivation` の最後の結果が `started`(Hermes/Apollo) |
| SkillCast | 80 | `ProjectRCardDeck.requestUseCard` が成功(発動成功かつ消費)したカード。失敗では再生しない。`cardActions`で上書き可 |
| GunReload | 70 | `ProjectR_GunSystem` のリロード開始 |
| Damage | 65 | 主人公のHPが減った(0にならなかった) |
| SwordAttack | 60 | 攻撃入力が受理された(剣など非銃武器) |
| GunFire | 60 | `ProjectR_GunSystem` の発射成功 |
| Aim | 40 | 戦闘中に銃を持っている間の基本状態(`Aim` シートがあれば表示。発射/リロードが終われば構えへ戻る) |
| Run / Walk / Idle | 30 / 20 / 10 | 移動状態から自動(公式Animation Solutionの自動切替。下の「公式の呼び出しの橋渡し」) |

- 高い動作は低い動作に割り込める。低い動作は高い動作を上書きしない(`lowerPriority`)。移動(Walk/Run)は攻撃動作の1フレーム目を上書きしない。
- 動作は時間で必ず終わり、終了後は基本状態(Idle/Walk/Run/Aim)に戻る。**入力・移動は一切止めない**(表示だけ)。
- 行動スプライトがあれば `setImage` + `playFrames` で再生し、終わったら `refresh()` で元の見た目へ戻す(マップ移動でも持ち越さない)。
  無ければ**仮の手続き的モーション**(照準方向への踏み込み/反動/しゃがみ/跳ね)を `Sprite_Character` に足す。画像が揃えばプロファイルを書くだけで差し替わる。
- 剣/銃/カード/奥義の「ゲーム上の効果」はこれまで通り各ゲームプラグインが処理し、動作は**成功した事実を見て**始まる。
  カードの効果・消費・バランスは変更していない。

## 5. 新しいキャラクターの追加手順

1. 画像を用意(`img/characters/`、`$` 接頭辞、背の高い単体キャラクター。必要なら `_Idle`/`_Walk`/`_Run`・行動シート)。
2. プロファイルを登録(`ProfilesJson` パラメータ、または他プラグインから `registerProfile`)。`actorId` を合わせる。
3. `visualHeightPx`(0=自動)、`anchors`(weapon/muzzle/melee/summon)、必要なら `actions`、`hitbox` を書く。
4. DEVアリーナの Animation / Weapon Zone で、構え・銃口・斬撃・神の位置・Idle/Walk/Run を確認。

## 6. 現在の主人公: DEV3H(自作の三頭身・4方向)

外部素材は使っていません。**ProjectRが自作した開発用キャラクター**で、最終アートが決まったら画像とプロファイルの数値を差し替えます
(戦闘コードは頭身に依存しません。`heads` は情報用)。

| 項目 | 内容 |
|---|---|
| ファイル | `img/characters/$DEV3H_Idle_f4.png` / `_Walk_f6` / `_Run_f6` / `_SwordAttack_f6` / `_GunAim_f2` / `_GunFire_f3` / `_GunReload_f6` / `_SkillCast_f6` / `_Ultimate_f8` / `_Damage_f3` / `_Down_f4`(11枚) |
| 規格 | 1コマ **96×96px**、1枚 = (コマ数×96) × (4方向×96)。行の順はMZ標準 = 下・左・右・上。左は右の左右反転 |
| 頭身 | 頭(髪の先〜あご) **28px**、身長 **84px** = **3頭身**。足元はコマの最下行(浮かない)。残りは頭上と左右の余白(腕・剣・オーラ用) |
| 方向 | **4方向のみ**。8方向素材は無く、4方向画像を回して偽の8方向にはしていません。**銃の狙いは360°**(Display Weaponが体と独立に回る)で、体は4方向の姿勢です |
| 生成 | `node tools/gen_dev3h_character.cjs img/characters`(再現可能。テストが画像と生成物の一致を確認) |
| 当たり判定 | **変更なし**(`hitbox: null`)。見た目が高くても1マスの通路を通れる |
| ライセンス | 自作。第三者の権利なし(`docs/ProjectR_ThirdPartyAssets.md` 第2節) |

### プロファイル(`protagonist`、コードの内蔵値)

- `visualHeightPx: 84`、`visualScale: 1`(拡大ではなく専用の大きい画像)、`locomotion`(Idle/Walk/Run)、`actions`(8つの行動シート)。
- アンカー(足元から。上がマイナス): `weapon` (0,-49。右向き+4/左向き-4) = 肩〜構えた手の高さ / `aim` (0,-49) / `melee` (0,-46) / `vfx` (0,-42) /
  `summon` (0,-50。神の召喚オフセットは高さ84/48=1.75倍) / `muzzle` forward 40(銃画像の長さ)。

### 公式の呼び出しの橋渡し(実機で見つけた問題)

実機で Idle/Walk/Run の自動切替が働かない(歩いても Idle のまま)ことを確認しました。原因: `Hendrix_Action_Engine` が先に読み込まれ、
`Game_Character.update` が「Animation Solution が差し替える前の」`update` を保持しているため、プレイヤーでは公式の
`updateMovingState / updateGraphics` と待機アニメが呼ばれません(`js/plugins.js` の順 = DotMove → Action Engine → Animation Solution)。
Hendrixのファイルとプラグイン順は変えず、`ProjectR_CharacterPresentation` が**その1フレームに公式の処理が走らなかったときだけ**、
公式の関数を同じ順で呼びます(走る環境では二重に呼ばない)。実機で Idle → Walk → Idle → Run → Idle の切替と待機アニメを確認済み。

### 基本姿勢の専用シートと戻り

- 構え(`Aim`)・ダウン(`Down`)は基本姿勢。行動(剣/発射/リロード/詠唱/奥義/被弾)が終われば**構えへ戻り**、構えを解けば Idle の画像へ、
  復活すれば Idle へ戻ります(`restoreOfficial` = `$gamePlayer.refresh()`)。マップ移動でも持ち越しません。
- Direction Fix は変えません(向きは `ProjectR_PlayerFacing` のまま)。移動・入力は止めません。

### 実機(MZ Playtest)での確認(2026-10-27、キャプチャは `docs/evidence/`)

| 項目 | 結果 |
|---|---|
| 三頭身の見た目 | OK。主人公がRTPの子供より明らかに大きく(身長84px)、頭が身長の約1/3。`docs/evidence/dev3h_idle_walk_run.png` |
| Idle/Walk/Run | OK(橋渡し後)。状態ログ: Idle → Walk(`$DEV3H_Walk_f6`) → Idle → Run(`$DEV3H_Run_f6`) → Idle |
| SwordAttack | OK。剣を持った腕の振りかぶり→振り下ろしのコマ、斬撃(Hendrixの剣画像)と同時。終われば Idle |
| GunAim(360°) | OK。8方向すべてで銃が胸の高さから狙いに追従、左右反転で銃が逆さにならない。`docs/evidence/dev3h_aim_8directions.png` |
| GunFire / 反動 / 銃口の発光 / 弾 | OK。`docs/evidence/g17_fire_and_reload.png`(上段) |
| GunReload | OK。体は両手を腹の前へ、銃は腰の高さへ下がって銃口が下を向き、終われば構えへ。同(下段) |
| SkillCast(Hermes剣術) | OK。両手を上げて詠唱、一時Hermes(右の水晶)と斬撃が同時。`docs/evidence/hermes_swordsmanship_skillcast.png` |
| Ultimate / Damage / Down | OK。奥義(両手を掲げ金のオーラ)、被弾(のけぞり+赤み)、ダウン(横たわる)をシートで確認 |
| 神(常駐Hermes)の位置 | OK。プレイヤーの左上に浮き、歩いても相対位置を保つ(下の修正後) |
| セーブ | **変更なし**(SHA-256が検証前後で一致。Playtestでは自動セーブを止める) |

#### 神が重なる問題(修正)
`ProjectR_GodSummonVisual` が神を生成すると、Hendrixの親子追従の `lastPlayerX/Y`(生成時は「位置+オフセット」)のずれで、
最初の1フレームに神がプレイヤーの真上へ動いて重なっていました。生成時に現在のプレイヤー位置で上書きして修正(テストで再現→修正を確認)。

### 未確認・既知の制限
- 8方向の体(4方向のみ)。銃を構えたときの腕は4方向の向きで、狙いの角度と腕の角度は一致しない(銃は360°回る)。
- 動作の「Reed Flute / Lyre / Apollo / Hermes奥義」の個別の見た目を、今回の実機で1枚ずつは撮っていない(SkillCast/Ultimate共通のシートと既存の神演出が出ることを確認)。
- DEV3Hは**仮のアート**。最終アートが決まったら、画像・`actions` のframes/speed・`anchors` を差し替える。

## 6b. もう1つ試せる背の高い素材(TF TallSpriteMZ、任意)

DEVアリーナの端末「Anim: TF Tall Sprite (48x72)」で、主人公の見た目を `img/characters/TF_Actor1.png`(48×72px、約2.5頭身)に切り替えられます。
`visualHeightPx: 0`(自動)のまま、見た目の高さ72pxを実スプライトから読み取り、銃の回転中心・銃口・神の位置が追従します(当たり判定は不変)。
画像はGit管理外です(規約上、そのままの再配布不可)。入手先・クレジット・扱いは `docs/ProjectR_ThirdPartyAssets.md` の第6節。

## 7. 診断

`ProjectRCharacterPresentation.diagnostics()` / `history()` / `current()`。DEVアリーナの「動作/銃の状態を表示」端末で同じ内容を読めます。
