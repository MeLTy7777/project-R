# ProjectR 属性システムの確認とカードバランス調整システム

このPhaseの追加要件(属性の復元・カードバランスの一元化と開発用エディタ・VFX Designer互換の確認)の記録。コミット前の基準は `837a396`(H2C-B4)。
Apollo 8枚の実装・新カードの追加は行っていない(共有の仕組みと、すでに実装済みのカード効果だけが対象)。

## 0. 最新ワークブックについて

| 項目 | 内容 |
|---|---|
| 依頼された名前 | `ProjectR_CardManagement_Template(3)(4).xlsx`(期待SHA-256 `8cb974a7…271b0`) |
| 探した場所 | `Documents\RMMZ\_ProjectR_DesignSources`、`Downloads`、`Documents`、`Desktop`、`OneDrive` を再帰的に検索し、全 .xlsx のSHA-256を比較 |
| 結果 | **見つからなかった**(期待ハッシュと一致するファイルなし)。見つかったのは旧 `Template(3).xlsx`(`babd70c7…`、Hermes 7枚・Apollo 0行)と空の `Downloads\ProjectR_CardManagement_Template.xlsx` だけ |
| 影響 | このPhaseは共有の仕組みが対象で、Apollo 8枚の仕様は読んでいない。ワークブックは一切書き換えていない。置き場所を教えてもらえれば、次のApollo Phaseの最初に読む |

## 1. 属性システム(復元の調査結果)

### 1.1 結論
ProjectRの属性は **RPGツクールMZ標準の属性システムそのもの**で、作成当初(初回登録コミット `ebf028a`)から一度も変わっていない。独自の属性プラグインや属性表は、どのコミット・ブランチ・別コピー(`ProjectR`、`ProjectR-CardDeck`、`ProjectR-CardTargeting`、`ProjectR_GunTest`、`test*`)にも存在しなかった(削除されたプラグインもなし)。したがって「復元」は、**Databaseの属性定義と有効度の仕組みをそのまま使い、ProjectR独自の攻撃経路(固定ダメージ)にも同じ規則で適用すること**になる。Databaseの属性・敵・武器・スキルの既存データは1バイトも変えていない(テストで固定)。

### 1.2 属性表(System.json の elements。ID順)
| ID | 名前 | | ID | 名前 |
|---|---|---|---|---|
| 0 | 無属性(ダメージ設定で「なし」) | | 5 | 水 |
| 1 | 物理 | | 6 | 土 |
| 2 | 炎 | | 7 | 風 |
| 3 | 氷 | | 8 | 光 |
| 4 | 雷 | | 9 | 闇 |

### 1.3 確認できた現行データ
- **敵キャラ**(Enemies.json): トレント(ID4)のみ 炎の有効度 ×2(弱点、特徴 code 11)。ほかは属性有効度の特徴なし。アリーナの敵ダミーは `<hp: 魔獣>`(ID5)で、属性の特徴なし(等倍)。
- **武器**(Weapons.json): 全武器が攻撃時属性=物理(特徴 code 31, dataId 1)。テストハンドガンも物理。
- **スキル**(Skills.json): 標準の魔法スキル(ファイア/アイス/サンダー/ウォーター/ストーン/ウインド/セイント/シェイドの各段)が属性ID 2〜9。通常攻撃系は属性ID **-1(= 攻撃者の攻撃時属性)**。**ProjectRのスキル(ID 234〜239: アポロン奥義/ヘルメース奥義/黄金の弓矢/ヘルメース剣術/アポロン病攻撃/病ダメージ)はすべて属性ID 0(無属性)**。
- **ステート**: 炎の力/氷の力/雷の力(ID 25〜27)が攻撃時属性と有効度を付ける標準の仕組み。
- **装備**: エレメンタルガード(炎/水/土/風 ×0.5)など標準データ。

### 1.4 ダメージの計算順(MZ標準。Hendrixの武器/スキル経路がそのまま使う)
```
基礎値(式)
  × 属性有効度        ← 1ヒットにつき1回だけ(Game_Action.makeDamageValue 内)
  × 物理/魔法ダメージ率(pdr/mdr)  (回復なら × 回復率)
  → クリティカル(Hendrixのcritical倍率)
  → 分散(variance)
  → ガード → 四捨五入
```
- 武器攻撃: スキルの属性ID -1 → 攻撃者の攻撃時属性(特徴 code 31)のうち最大の有効度。
- スキルのダメージ(弾・継続ダメージ・Ultimate): Databaseスキルの「ダメージ > 属性」。有効度0は無効(Hendrixの `lastImmunity`)。
- **固定ダメージ**(カードの「50ダメージ」など。式を持たない): `ProjectR_CardModifiers` の `projectRFixed` に `element` を渡したときだけ、`基礎値 × 属性有効度 → クリティカル(×critDmgMultiplier) → 加算(先端+50などの flat)` の順で **1ヒットにつき1回**属性を掛ける。`element` が0/未指定なら従来の計算を1文字も変えない。
- 吸収(有効度が負)は、スキル/武器経路ではMZ標準(回復)。固定ダメージでは安全側で「無効(0ダメージ)」扱い(固定ダメージでの吸収は未検証)。
- 加算(先端+50、睡眠中+50、Hookのflat)は**属性もクリティカルも受けない**(従来どおり)。

### 1.5 実装したもの
| 追加/変更 | 内容 |
|---|---|
| `js/plugins/ProjectR_Elements.js`(新規) | 属性表(Databaseから読む)・敵の有効度/分類(`profile`)・固定ダメージの属性係数 `fixedFactor`・**弱点ダメージ修飾**(`addWeaknessModifier`。弱点=有効度>1のときだけ有効度に倍率。スキル経路 `calcElementRate` と固定経路の両方に1回ずつ。実行時のみ・セーブしない・戦闘終了/マップ移動/ロードで外れる。Apolloなど将来のカード効果用で、現時点でこれを使うカードはない) |
| `ProjectR_CardModifiers.js`(変更) | 固定ダメージの計算に属性係数を1か所追加(`element` 0/未指定は不変)。ヒットログに `element` / `elementRate` を記録 |
| カードごとの属性 | `data/ProjectR_CardBalance.json` の `constants.element`(0=無属性)と `weaknessMultiplier`(1=変化なし)。薙ぎ払い・一閃(直接ダメージと分割ダメージの各tick)が固定ダメージなので対象。既定は全カード無属性=従来どおり |

武器・スキル・Ultimateの属性は、Databaseの属性ID/特徴を設定するだけで有効(コード不要)。

### 1.6 確認できなかった(史料が無い)歴史的な属性仕様
次は、どのコミット・ブランチ・別コピーにも記録が無く、**推測で作っていない**。
- 各カード・各Ultimateに意図した属性(現行は薙ぎ払い/一閃/Apollo3枚/Ultimate2種とも無属性)。
- 敵ごとの意図した弱点/耐性の設計(Databaseにはトレントの炎弱点だけ)。
- 吸収(有効度が負)を固定ダメージでどう扱う設計か。
- 敵の弱点表示UI・属性アイコン・属性別のエフェクト色(Hendrixのホットバー側にスキルの属性名を扱う処理はあるが、ProjectRの戦闘HUDに属性の表示は無い)。
- Apolloの「弱点ダメージ」系カードの具体数値(最新ワークブックが未入手のため)。

## 2. カードバランス調整システム

### 2.1 構成
| ファイル | 役割 |
|---|---|
| `data/ProjectR_CardBalance.json`(新規) | **製品の既定値(唯一の置き場所)**。ランタイムカードID別に、クールダウン・Lvごとの効果(Lv1/2/3)・Lvに依らない定数(半径/射程/角度/回数/属性)を持つ。`fields` に各数値の単位・範囲・整数/小数の定義 |
| `js/plugins/ProjectR_CardBalance.js`(新規) | 読み込み(`$dataProjectRCardBalance` → NW.jsのfs同期 → ブラウザXHR)・構造検証・Lv累積の解決(`ProjectRCardCatalog.resolveLevels` を使用: 効果は累積し、同じ効果の新しい数値は前の値を**置換**)・クールダウンをCoreの実行時定義へ反映・開発用の上書き |
| 7枚のプラグイン | Lv表と数値定数のコピーを削除し、すべて `ProjectRCardBalance` から読む(絶/薙ぎ払い/葦笛/一閃/ストレングス/ヴェイル/サイコポンポス)。バランス設定が使えないときは「balanceUnavailable」で発動に失敗(消費なし) |
| `js/plugins/ProjectR_CardBalanceEditor.js`(新規) | Playtest限定のエディタ(F6 / プラグインコマンド) |
| `js/plugins.js`(私の3行だけ追加) | `CardBalance`(CardCatalogの直後、各カードより前)・`Elements`・`CardBalanceEditor` |

### 2.2 JSONにある数値(現行7枚で実在するもの)
| 区分 | 項目 |
|---|---|
| ダメージ | `damage`(薙ぎ払い)・`directDamage`/`splitTotal`/`splitSeconds`/`splitTicks`(一閃)・`tipBonus`(先端+50)・`sleepBonusDamage`(睡眠中+50) |
| 回復 | `healAmount`(サイコポンポス 50/100/150) |
| クリティカル | `criticalChanceBonus`(薙ぎ払い Lv3・ヴェイル Lv3) |
| 攻撃/防御/速度の係数 | `attackBonus`(ストレングス・サイコポンポス)・`speedBonus`(ヴェイル)・`hitMultiplier`(絶)・`speedFactor`(絶)・`slowFactor`(一閃) |
| 持続・クールダウン | `durationSeconds`・`hitSeconds`・`speedSeconds`・`slowSeconds`・`attackBuffSeconds`・`sleepSeconds`・`cooldownSeconds` |
| 範囲 | `radiusTiles`・`collectRadiusTiles`・`rangeTiles`・`pathWidthTiles`・`arcDegrees`・`tipTiles` |
| 属性 | `element`・`weaknessMultiplier` |
| 構造フラグ(変更不可) | `sleep`・`guaranteedCritical`・`concealment`・`ignoreDefense`(数値ではないためエディタでは編集不可) |
| 将来用(予約。定義だけでどのカードも未使用) | `hitCount`・`projectileCount`・`projectileSpeed`・`regenPerSecond`・`dotDamage`・`criticalMultiplier`・`defenseBonus`・`maxStacks`・`stackMultiplier` |

現行の7枚には「重ね掛けの上限/倍率」「弾の本数/速度」「ヒット数」を持つ効果が無い(ストレングス/サイコポンポスの重ね掛けは上限なしの既存仕様)。そのため予約として検証範囲だけ定義し、値は持たせていない(発明しない)。旧カード(Hermes旧4枚・Apollo3枚)は保護された旧実装で、数値はプラグインパラメータ/Databaseのまま(このJSONの対象外)。

### 2.3 製品の既定値と開発用の上書きは別
- 上書きは**メモリ上**。`Utils.isOptionValid("test")` が真のときだけ設定でき、配布版では `setOverride` などは `notPlaytest` で拒否され、保存済みの上書きがあっても無視される(エディタ自体が作られない)。
- 保存先は `dev_tuning/ProjectR_CardBalance.dev.json`(`.json` のみ。ワークブック形式・製品JSONへの保存は拒否)。セーブデータには一切入らない(テストで保存内容の同一性を確認)。
- 読み込みは**全体を検証してから**置き換える(不正な値が1つでもあれば全体を拒否し、今の状態を変えない)。
- 設計ワークブックや `data/ProjectR_CardBalance.json` を自動で書き換えることはない。製品の既定値を変えるときは、JSONを人が編集する。

### 2.4 検証の規則
未知のカード/項目/Lv・数値でない値(文字列・NaN・Infinity・null)・範囲外・整数項目への小数・数値でないフラグ・そのカード/Lvに無い項目・関連値(先端の幅 ≤ 半径)・存在しない属性ID・クールダウン0 を理由つきで拒否し、拒否時は何も変えない。小数/秒は小数で、前後の空白は取り除く。

### 2.5 発動中の一貫性
各カードは発動の瞬間に効果(Lv1〜3)と定数のスナップショットを取り、その発動の間は同じ値を使う(ヴェイルの半径・持続、一閃の分割回数/属性、サイコポンポスの回収半径と魂ごとの回復量、葦笛の睡眠秒数)。上書きは**次の発動から**。クールダウンは次に捨て札へ入るときから(今クールダウン中のカードの残り時間は変わらない)。

### 2.6 エディタ(F6)
Playtest中にF6(または Combat Test Arena などのイベントからプラグインコマンド「カードバランスエディタを開く」)。開く間ゲームは止まり、キー/マウスはゲームへ届かない。カードとLv(クールダウン/定数・Lv1〜3・すべて)を選び、「現在の値」を書き換えてEnterで適用、「元の値」(製品の既定値)と並べて見られ、変更済み項目は強調、項目ごとの「戻す」・「このカードをリセット」・「すべてリセット」・「保存(dev)」・「読み込み(dev)」。継承(前のLvから)の項目に入力するとそのLvだけの値として上書きされる。

## 3. 自動テストの結果
- 全スイート: 変更前 60/60 → **62/62**(新規 `ProjectR_Elements.test.cjs` 15件、`ProjectR_CardBalance.test.cjs` 16件)。
- Elements: 属性表=MZ標準/敵の弱点・耐性・無効の分類/無属性の不変(50)/固定ダメージの弱点100・耐性25・無効0・等倍50(1ヒット1回)/計算順(弱点クリティカル+先端=350、先端の加算は属性もクリティカルも受けない)/Lv3クリティカル率との組み合わせ/無効と吸収/一閃の多段(直接200+分割3tickの各ヒットに1回ずつ: 無属性250・弱点500・耐性126)/武器の攻撃時属性(炎の剣×炎に弱い敵≒2倍)/スキル経路(DoT・Ultimate・弾のスキル、四捨五入±1)/弱点修飾(固定とスキルの両方に1回)/撃破の帰属(実ダメージ=HPの減り)/Databaseの属性が作成当初から不変/Chromium 85構文。
- CardBalance: 既定値が従来のコード値と一致/設計ID↔runtime ID/Lv累積と置換/検証と拒否/リセット/dev保存・再読み込み(不正ファイル拒否・.xlsx・製品JSONへの保存拒否)/製品JSONのバイト不変/Playtest以外は無効/発動中の一貫性(ヴェイル・一閃)/クールダウンの上書き/balanceUnavailable で7枚とも消費なし/JSON検証/セーブ互換/ハードコード重複なし/plugins.js順序/エディタ表示モデル。
- 既存テストの変更2件: `RealEngineHarness.cjs`(`$dataProjectRCardBalance` を注入)、`ProjectR_H2CB4.test.cjs`(「7枚の実装を触っていない」の確認を、作業ツリー比較から当時のコミット範囲 `3f35453..837a396` の比較へ。後のPhaseで正当に7枚を変えても過去の事実は変わらないため)。

## 4. 実機(本物のMZ Playtest)の結果
入力はCDP(キーは実キー)で、**人間の手動確認ではない**。新しいゲームはメモリ上、属性の特徴はメモリ上のDatabaseコピーだけに足して終了時に戻す。

`tools/mz_cdp/balance_verify.cjs`: **29/29**
- 既定値が従来値と同一/Database属性表の一致/炎=弱点・氷=耐性・光=無効・雷=等倍。
- 薙ぎ払い(実機カード): 無属性50・炎100・氷25・光0・雷50(属性係数の計算は各1回)。弱点+クリティカル+先端=350。
- 実際の剣: 炎の剣×炎に弱い敵 98 → 195(≒2倍)。
- 一閃の多段: 無属性250・弱点500(4ヒットに各1回)・耐性126。
- 弱点修飾×1.5: 弱点150・耐性25、戦闘終了で外れる。
- バランス上書き: 薙ぎ払いLv1=80 → 実機で80、リセットで50。ヴェイル発動中に半径を変えても発動中は5のまま。
- dev保存→全リセット→読み込みで復元、.xlsxへの保存は拒否、製品JSONはバイト不変。
- 上書きの有無でセーブ内容は同一。
- エディタ画面: F6で開閉、開く間ゲームが止まり閉じると再開、7枚が選べ、値の適用/小数・文字列の拒否(画面の値も元に戻る)/元の値と現在の値/項目ごとの戻す/カードのリセット、画面で変えた値(80)が実際の発動に効く。
- Apollo黄金の弓矢(Databaseスキルの弾): 炎スキル×炎に弱い敵 = 無属性の2倍(同じ乱数でエンジン単体 46→92 と一致)。
- コンソールエラーなし。

### 既存の実機スクリプトの回帰(7枚のプラグインを触ったため全件を再実行。すべて失敗0)
`verify` 23/23・`regress` 8/8・`h2a_verify` 23/23・`h2b1_verify` 17/17・`h2b2_verify` 14/14・`h3a_verify` 18/18・`h3b_verify` 39/39・`h2ca_verify` 21/21・`h2cb1_verify` 11/11・`h2cb2_verify` 25/25・`h2cb3_verify` 11/11・`h2cb4_verify` 16/16。VFX: `vfx_verify` 7/7。

### 保護セーブ(実機検証の前に退避してSHA-256を記録し、全実行の後に比較: 5件とも同一)
config `2F0A5000…`・file0 `3FF692FC…`・file1 `7534FC6C…`・file2 `B9DB7C4F…`・global `9535C150…`。`js/AnimationSolutionLibrary.json`(`1B4BE3F1…`)も実行前後で同一。

### 実機で見つかり、直したもの
1. **エディタの再入バグ**(実機だけで判明): 入力欄で値を確定すると、再描画で消される入力欄の blur → change が同期に発火し、内側の再描画が同じ入力欄を先に消すため、外側の `removeChild` が NotFoundError → MZの`SceneManager.onError`でゲームが止まった。描画中は commit を無視し再入しない(`rendering` フラグ)ようにして解消(R11i: 閉じた後ゲームが再開)。
2. テスト側の原因(ゲームのコードは変えていない): 起動直後に `isDatabaseLoaded()` が一度も true を返す前に `setupNewGame` を呼ぶとHendrixの敵名キャッシュが未作成で敵Eventの初期化が失敗する(スクリプトで待つように修正)/セーブ内容の比較は1回の同期評価で前後を取る(間にゲームが進むとフレームカウンタだけが変わる)/一時停止の測定は `Scene_Map.update` の呼び出し回数で数える/手札を回す間の病の矢の継続ダメージが計測に混ざったため、敵のいない方向へ狙う。

## 5. VFX Designer(Hendrix Animation Solution 2.0.7)の状態
参照: https://www.rpgmakeractioncombat.com/2026/07/15-spritesheet-animator.html(VFX Designerのドック「▶️ VFX Designer」ボタンから別ウィンドウで開く、ライブラリに保存して「Show VFX From Library」で再生する流れ)。`tools/mz_cdp/vfx_verify.cjs` で実機確認(7/7)。

| 区分 | 状態 |
|---|---|
| **ライブラリ再生** | ProjectRの16キーすべてにライブラリ項目(`js/AnimationSolutionLibrary.json` 16件)とスプライトシート画像があり、行/列/FPSが `ProjectR_PresentationVfx` の対応表と一致。16キーすべて再生成功。**6キーが「Show VFX From Library」(絶の出発/到着・葦笛の波紋・ストレングスの魔法陣/光・Hermesの消失)、10キーは同じシート・同じ設定で公式「Show VFX」(スプライトシート指定)で再生** |
| **VFX Designer(エディタ)の互換** | ドックのボタンでエディタが開き、ライブラリ16件が一覧に出る。全16項目を読み込むと名前/行/列/FPS/拡大率/不透明度/ブレンドがライブラリの値と一致。1件(ストレングスの光)の不透明度を235→200に編集して「Save to Library」で保存すると、ゲーム側のライブラリとJSONに反映され、同じキーで再生できた。試験後、`js/AnimationSolutionLibrary.json` は実行前とSHA-256が同一になるよう復元済み。エディタを閉じてもゲームは動き続け、コンソールエラーなし |
| **まだカスタムな表現** | 公式「Show VFX」(シート指定)で再生する10キー(薙ぎ払いの杖・一閃の軌跡と雷・ヴェイルの魔法陣/手/オーラ・サイコポンポスの魂/回収/斬撃)。理由は、ライブラリ再生が回転/経路/範囲の拡縮/出発点への固定を上書きできないため(同じシート・同じ見た目をライブラリにも登録済みで、Designerで見た目は調整できるが、数値を変えるときは両方を合わせる)。そのほか、神のカットイン(`ProjectR_CutIn`)・神の一時召喚の表示(`GodSummonVisual`)・主人公の腕の動き(ArmSweep)・HPバーはProjectR独自の表示 |
| **手動のエディタ設定が必要なもの** | ①ライブラリ再生できない10キーの見た目をDesignerで調整する場合は、ライブラリ項目と `ProjectR_PresentationVfx` の対応表(シート定義)の両方を同じ数値にする。②Apollo用のVFX(未実装)は、素材とライブラリ項目をこれから作る。③カットインの目元画像は仮(Hermesの仮画像をApolloでも流用中) |

ゲームの処理はVFXに依存しない(再生に失敗してもカード消費・ダメージ・クールダウンは変わらない)。Hendrix本体は書き換えていない。

## 6. 保護対象と互換性
- Core(`ProjectR_CardDeckCore`)・Catalog・Hendrix・`rmmz_*`・DotMove・旧Apollo/旧Hermesの保護プラグイン・Occlusion・SaveLoadGuard は変更していない。
- セーブ形式は変更なし(バランス設定と上書きはセーブに入らない)。Databaseの既存ID・属性・スキル・敵・武器は変更なし。
- 旧7枚の`CardDefinitions`・既存セーブのカード所持/デッキ/Levelに影響なし。

## 7. 既知の制限・未決
- 最新ワークブック `Template(3)(4).xlsx` は未入手(§0)。
- 歴史的な属性仕様のうち確認できなかったもの(§1.6)。
- 旧カード(旧Hermes4・旧Apollo3)の数値は対象外(保護された旧実装。パラメータ/Databaseのまま)。
- 重ね掛けの上限/倍率・弾の本数/速度・ヒット数は、対応する効果を持つカードが現行に無いため、検証範囲の定義だけで値は未設定。
- 配布時に未使用ファイルを除外する設定を使う場合、`data/ProjectR_CardBalance.json` を含めること(読み込めないとカードは「balanceUnavailable」で発動しない)。
- 実機のOS入力スクリプト(`h2ca_manual_os_input`・`h2cb1_esc`・`h3a/h3b_manual_os_input`)は今回再実行していない(CDPの回帰スクリプトで確認。OS入力は人間の手動確認ではない)。
- 配布版(`test` 引数なし)で実際に起動したときのエディタ非表示は、VM(Playtest=false)の自動テストで確認した。実機の配布版起動は未実施。
