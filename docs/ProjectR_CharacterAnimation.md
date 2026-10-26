# ProjectR キャラクター表示プロファイルと動作

`js/plugins/ProjectR_CharacterPresentation.js`(v1.0.0)。**表示専用**です。HP・弾数・カード・ゲージなどのゲームの状態は持たず、
セーブにも何も保存しません(現在のフレーム/反動/銃口の発光/行動中の動作はすべて実行時だけ。ロード後は通常のIdleへ戻る)。

## 1. 参照した公式資料

- 導入済み `Hendrix_Animation_Solution.js`(v2.0.7)のヘルプ(日本語): 命名規則・`playFrames`・`toFrame`・8方向・イベントごとの速度コメント。**ここを正としました**。
- 公式テキストチュートリアル/マニュアル(https://www.rpgmakeractioncombat.com/ 、itch.io の開発ログ「Ver 1.2.5 - Better Idle, Walk and Run」
  「Version 1.5.3b」「Version 2.0.3」): Idle/Walk/Runはファイル名のキーワードで自動検出される / `playFrames`は1始まり(1.2.2〜) /
  1行スプライトシートは `_fN` 命名 / イベントごとの `<frame idle speed: N>` コメント。
- 公式動画(Animation Solution の使い方: https://www.youtube.com/watch?v=nC0W4g6SZzQ)。**字幕・本文を取得できず**、
  背の高いキャラ/三頭身/アクションシートの具体的な作り方は動画に頼らず、上のヘッダの記述だけに従っています。
  動画から必要な情報: 「背の高いスプライトの足元(原点)の扱い」「アクション用シートを方向ごとに分ける方法」。
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
- 内蔵: `protagonist`(actorId 1。現在は標準48pxスプライト。三頭身の宣言のみ)と `default`。
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
| Down | 100 | 主人公のHPが0(基本状態として報告。専用の動作は未実装) |
| Ultimate | 90 | `ProjectRUltimateActivation` の最後の結果が `started`(Hermes/Apollo) |
| SkillCast | 80 | `ProjectRCardDeck.requestUseCard` が成功(発動成功かつ消費)したカード。失敗では再生しない。`cardActions`で上書き可 |
| GunReload | 70 | `ProjectR_GunSystem` のリロード開始 |
| Damage | 65 | 主人公のHPが減った(0にならなかった) |
| SwordAttack | 60 | 攻撃入力が受理された(剣など非銃武器) |
| GunFire | 60 | `ProjectR_GunSystem` の発射成功 |
| Aim | 40 | 戦闘中に銃を持っている間の基本状態 |
| Run / Walk / Idle | 30 / 20 / 10 | 移動状態から自動(公式Animation Solutionの自動切替に任せる。報告のみ) |

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

## 6. 現状と不足素材

| 項目 | 状態 |
|---|---|
| プロファイル/アンカー/コントローラ | 実装・自動テスト済み(実エンジン読み込み)。MZ実機は**未確認** |
| 三頭身の主人公画像 | **未提供**。主人公は標準48pxのまま。外部素材は入れていません(ライセンスを確認できる適切な素材が未確定。`ProjectR_ThirdPartyAssets.md`) |
| Idle/Walk/Run専用画像 | 未提供(公式の自動検出はファイルを置けばすぐ使える) |
| 剣/GunAim/GunFire/GunReload/SkillCast/Ultimate/Damage/Down 行動シート | 未提供。仮モーションで代替中 |
| 8方向素材 | 未提供 |
| カード別/カテゴリ別の詠唱モーション | 仕組みあり(`cardActions`)。個別素材なし |

## 7. 診断

`ProjectRCharacterPresentation.diagnostics()` / `history()` / `current()`。DEVアリーナの「動作/銃の状態を表示」端末で同じ内容を読めます。
