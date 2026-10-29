# ProjectR Hermes サイコポンポス・撃破の帰属・魂の収集(Phase H2B-3B)

正本: `C:\Users\hmats\Documents\RMMZ\_ProjectR_DesignSources\ProjectR_CardManagement_Template(3).xlsx`(「カード一覧」Card ID 2 = サイコポンポス・47列すべて確認。SHA-256 `babd70c70f3ce0f52f622c4464835eacb4df3d305ecc48a53e84b627505dd32c`、期待値と一致)。
前のコミット: `49c58e6`(Phase H2B-3A)。**これで設計の7枚がすべて実装済みですが、本番の30枚デッキは有効にしていません**(`isFinalDeckReady()` = true は「実装が揃った」の意味だけ。`isFinalDeckActivated()` は常に false。デッキは適用も付与もしない。有効化は H2C 以降でユーザー判断)。旧カードの移行(置換)もしていません。
関連: [ProjectR_KillAttribution.md](ProjectR_KillAttribution.md)(帰属・魂の基盤。攻撃経路ごとの対応表) / [ProjectR_Hermes_MigrationAudit_H2A.md](ProjectR_Hermes_MigrationAudit_H2A.md) §8 / [ProjectR_ThirdPartyAssets.md](ProjectR_ThirdPartyAssets.md) §2-f

## 1. ランタイムID・定義

| 設計ID | カード | ランタイムID | 強さ | 最大枚数 | 最大Lv | Cooldown | 実行時の対象 | Plugin |
|---|---|---|---|---|---|---|---|---|
| 2 | サイコポンポス | `hermes_psychopomp` | 通常 | 3 | 3 | 10秒 | **instant**(対象を選ばない。ワークブックの表記 `Heal` は設計メタデータ `workbookTargetType` に保持) | `ProjectR_HermesPsychopomp.js` |

ワークブックの「Heal」は「魂を拾って主人公を回復する」の意味で、既存の `ally`(最寄りの味方を選ぶ)の意味ではありません。既存の `ally` の登録・Apolloの旧カードは変えていません(テストで確認)。定義は `ProjectR_CardCatalog` が実行時に追加(旧7枚の `CardDefinitions` とセーブは不変)。既定で未所持。

## 2. 仕様の区分

### 2.1 ワークブック・ユーザー指示で確定している(ユーザー承認済み)
- Hermes / 通常 / 最大3枚 / 最大Lv3 / Cooldown 10秒 / 有効範囲 半径5マス / 射程 画面内ならどこでも / 複数対象 はい / **壁越え いいえ** / 効果時間 10秒 / ダメージなし / 青白 / 初期デッキ(初回入手3枚。**今回は付与しない**)。
- カード発動中に敵を倒すと魂が出る。有効範囲内に入ると回収できる。有効範囲に魂がなければ効果なし(カードは消費する)。
- 神の登場: **プレイヤーが敵にとどめを刺したとき**。神の動作: その敵をヘルメースが殺したかのように攻撃するモーション。神の消失: 黒いノイズ。主人公モーション: 敵を倒すたびに指をはじく。カットイン: 共通(位置・方向はランダム)。VFX: 倒した敵の跡に魂が残る。
- Lv1: 魂1つにつき50回復(効果時間10秒) / Lv2: 100 / Lv3: 150 + 攻撃力上昇3%(重ね掛けあり、拾ってから3秒、重ね掛けのたびに時間は3秒にリセット)。累積規則: 別の効果は累積、同じ効果の新しい数値は置換(回復量は 50 → 100 → 150 で足し算しない)。
- 回復の対象は操作中の主人公(最寄りの味方ではない)。最大HPは変えず、過回復なし。恒久的なATK・装備の変更なし。

### 2.2 暫定の解釈(ワークブックに規定なし。**承認済みの規則ではない**。パラメータで変えられる)
| 項目 | 既定(暫定) | 切り替え |
|---|---|---|
| 効果時間(10秒)が終わった後の未回収の魂 | **消える**(`AfterWindow=remove`) | `keep` = 戦闘終了まで残り、窓の後も拾える |
| 効果中にもう一度発動 | 残り時間を10秒へ戻す・窓は1つ(魂の数は増えない)(`RecastPolicy=refresh`) | `extend` = 10秒を足す |
| 範囲の基準点 | **主人公の中心 ↔ 魂の中心の距離 ≦ 5マス(境界を含む)**。魂は動かないので「主人公から倒した場所まで」と同じ。ワークブックの「有効範囲内に入ると」をこの距離判定として実装 | — |
| 回収の方法 | 範囲内に入ると**自動で**回収(ボタンなし)。毎フレーム(戦闘時間 = Cooldownと同じ時計)判定 | — |
| 魂の回復量を決めるレベル | 魂が出た時点のカードレベル(あとでレベルが変わっても、その魂は変わらない) | — |
| 満タンのときの魂 | 回収する(回復量0・Lv3の攻撃力上昇は得られる)(`CollectAtFullHp=true`) | `false` = 満タンの間は回収せず魂が残る |
| 攻撃力上昇の重ね掛けの計算 | additive: 倍率 = 1 + 0.03 x 個数(`StackingMode=additive`) | `multiplicative` = 1.03 の個数乗 |
| 魂・Hermes・錨Eventの上限 | 魂60 / 魂のVFX 30 / Hermesの演出 同時3体(超えた分は見た目なし。魂・回収・回復は変わらない) | `MaxSouls` `MaxSoulVfx` `MaxHermesVisuals` |
| Hermesの立ち位置 | 倒した敵の「主人公と反対側」0.9マス | — |

### 2.3 未対応・未了(正直な記録)
- **Apolloの病のDoTで倒した敵は主人公の撃破にならない**(魂が出ない)。既存Pluginがtickに持ち主を渡さず、そのPluginは保護対象テストで固定されているため。持ち主が確かな将来のDoTは `projectRAttacker: "player"` を渡せば対応できる(テスト済み)。
- **攻撃力+3%が効く攻撃は通常の武器攻撃(剣・G17)だけ**。旧Hermes剣術・Apollo黄金の弓矢などのカード攻撃(`checkCollide` 時点でスキル式から計算済み)と、一閃・薙ぎ払いの固定ダメージ(攻撃力を使わない)には効かない。ストレングスと同じ制約。「全物理攻撃に効く」とは主張しない。
- 製品の敵のドロップ・死亡ページ・ボスのフェーズとの統合は**未確認**(帰属の層は読むだけで何も変えない。製品の敵Eventでの実行は未実施)。ボスEventが `<enemy>` を持ち主人公が倒せば魂が出る(フェーズ遷移には触れない)。
- 実機のG17での撃破は未実施(同じ `UpdateEventHp(-player weapon)` を通る。コードと自動テストの経路は同じ)。
- Apollo Ultimate/Hermes剣術など `<attacker: player>` のHitboxによる撃破は、自動テストでnote判定を確認。実機の個別確認は未了。
- VFX Designer エディタでの作成・保存の往復(ライブラリはエディタ互換の形式を直接追記)。
- 素材・音: Hermesの「攻撃モーション」は暫定の `!Crystal` + 公式Swing Weapon + 自作の斬撃の閃光。ワークブックの音「閃光の音」は、検証できた素材が無く**用意していません**(代用音は鳴らさない)。指をはじく音も未用意。主人公の「指をはじく」は自作のDEVスプライト。

## 3. 実装の概要

| 要素 | 実装 |
|---|---|
| 撃破の帰属 | `ProjectR_KillAttribution.js`(新設)。公式 `UpdateEventHp` を `ProjectR_CardModifiers` の内側で包み、HP>0→<=0 の敵を、帰属つきで1回だけ通知。HP・ドロップ・敵の死亡ページ・ボスのフェーズは変えない。詳細・経路表は [ProjectR_KillAttribution.md](ProjectR_KillAttribution.md) |
| 固定ダメージの帰属 | `ProjectR_CardModifiers` が固定ダメージ(一閃・薙ぎ払い)を内側へ渡すとき `projectRAttacker`(ctx.attacker、既定 player)と `projectRSource` を付ける(ダメージの値は不変) |
| 魂 | `ProjectR_SoulCollection.js`(新設)。生成・重複拒否(`deathKey`)・範囲内の回収(壁 = `CombatOcclusion.firstBlockerBetween`)・1回だけの回収・上限・後片付け。回復も攻撃力も持たない |
| カード | `ProjectR_HermesPsychopomp.js`(新設)。発動(instantのhandler → ルーターが1回消費 → 確定後に窓を開始)・窓(戦闘時間で10秒)・回復・攻撃力上昇(ヒットフック)・演出の呼び出し・後片付け |
| 攻撃力上昇 | `ProjectR_CardModifiers` のヒットフック `prepare` が `atkMultiplier` を返す(1回のダメージ計算の間だけ主人公Battlerのparamへ差し込み、必ず外す)。`finish` なし = **攻撃では消費しない**。ストレングス(次の攻撃で全消費)の `atkMultiplier` とは掛け合わさる |
| 演出 | 主人公: `FingerSnap`(`ProjectR_CharacterPresentation` に追加。優先度62 = 剣/銃より上・被弾より下)。Hermes: `GodSummonVisual.spawnFollower` + `swingFollower`(公式Swing Weapon) + 斬撃の閃光VFX → 黒いノイズで消える。魂: 錨Event(`spawnAnchor`)に VFX Designer ライブラリ `ProjectR_Soul_*` を結び付ける。カットイン: `CutInCardIds` に追加(共通) |
| 診断・DEV | `ProjectR_CombatTestArenaPsychopomp.js`(Playtest限定 `ProjectRSoulTest`: layout/hp/hit/wall/state)。`ProjectRHermesTest.start('psychopomp', lv)` |

### 3.1 回復と攻撃力上昇(Lv別)
| Lv | 魂1つあたり | 備考 |
|---|---|---|
| 1 | HP +50 | 半径5・10秒 |
| 2 | HP +100(置換) | |
| 3 | HP +150(置換) + 攻撃力+3%・3秒(重ね掛け・共有の残り時間を3秒へ戻す) | 通常の武器攻撃(剣・G17)に効く。基礎ATK・装備・Databaseは変えない |

### 3.2 既存システムへの変更(最小限)
`ProjectR_CardCatalog`(設計ID2を実装済み・RUNTIME_CARDS追加・`isFinalDeckActivated`)/ `ProjectR_CardModifiers`(固定ダメージの攻撃者の受け渡し)/ `ProjectR_PresentationVfx`(魂・斬撃のマッピング、`stop` の予約、origin の instance)/ `ProjectR_GodSummonVisual`(`swingFollower`・画像なし錨 `spawnAnchor`)/ `ProjectR_CharacterPresentation`(`FingerSnap`)/ `ProjectR_GunSystem`(`FingerSnap` 中は銃を隠す)/ `ProjectR_CutIn`(カードID追加)/ `ProjectR_CombatTestArenaHermesB1`(DEV)。
**変更していないもの**: Hendrix(Action Engine / Animation Solution)・DotMove・`js/rmmz_*.js`・`ProjectR_CardDeckCore`・`ProjectR_ApolloDiseaseAttack`(最初の試みで触ったが、保護対象テストに反するため元へ戻した)・`data/*.json`(ダメージ式・武器・スキル)。

## 4. 検証の結果

| 区分 | 結果 |
|---|---|
| 全自動テスト(`tests/*.test.cjs`) | **55/55 PASS**(着手前 53/53。新規2ファイル: `ProjectR_HermesPsychopomp.test.cjs`(26件)・`ProjectR_HermesPsychopomp.integration.test.cjs`(12件)) |
| 固定値を持つ既存テストの更新(期待値の更新のみ。アサーションは弱めていない) | `CardCatalog.audit` / `HermesZetsu` / `HermesZetsu.presentation` / `HermesVeil` / `CharacterAnimationGun`(FingerSnap追加)。設計の7枚がすべて実装済みになったことと、30枚デッキを**適用していない**ことの両方を表すようにした |
| 実機MZ(NW.js 0.48.4 / Chromium 85・実キー・実際の剣)`h3b_verify.cjs` | **39/39 PASS** |
| 実機の回帰(新しいセッション) | `regress` 8/8 / `h2b2_verify` 14/14 / `h2b1_verify` 17/17 / `h2a_verify` 23/23 / `h3a_verify`(ヴェイル・実マウス追従)17/17 |
| CDP入力を使わないOS入力のPlaytest `h3b_manual_os_input.cjs` | **8/8 PASS**(§5) |
| セーブ(5ファイル) | SHA-256 が実機検証の前後で**一致** |

### 4.1 自動テストの網羅(要求の対応)
発動と10秒の窓 / Lv別回復量 / 主人公の撃破の帰属 / 味方・環境・スクリプト・不明・敵同士・直接HP0の除外 / 武器と固定ダメージの撃破 / DoTの持ち主(あり・なし)/ 重複通知 / 任意のEvent ID / 同時多数 / 5マスの境界(5.0は回収・5.0001は不可)/ 壁(Region 255・`<CombatWall>` Event・判定不能は安全側)/ 1回だけの回収 / 最大HPの上限 / Lv3の重ね掛けと3秒のリセット(additive・multiplicative)/ ストレングス・絶・ヴェイル・通常の武器との併用(ダメージの二重適用なし)/ 窓の満了・戦闘終了・死亡・マップ移動・ロード・ニューゲームの後片付け(魂・錨Event・VFX・購読)/ VFX・Hermes・主人公モーション・錨Eventの失敗の隔離(10通り)/ セーブ互換(保存内容に何も増えない)/ Chromium 85の構文検査。

### 4.2 実機で確認した数値・挙動
- 実キー Q を1回: 山札25→24・Cooldown +1・窓1つ・残り約9.75秒・HP不変(回復なし)・魂なし。窓の間に敵を倒さなければ回復しない。約600フレーム(10秒)で窓が終わる。
- **実際の剣(J キー)** で敵(HP 1)を倒す: 主人公の撃破(`weapon`)として魂1つが倒れた場所に出る。指をはじく動作1回・Hermes 1体。近いので自動回収(Lv2で HP 100 → 200)。倒れた敵を何度殴っても魂・通知は増えない。Hermesは演出のあと黒いノイズで消える。
- 範囲: 約7マス先の魂は回収されず残る。**実際に歩いて**中心距離が 5.0625 → 5.0 に入った瞬間に回収(1回・HP +50)。
- 壁: Region 255 の向こう(範囲内3マス)の魂は回収されず残る(遮られた回数95)。壁を外すと回収。
- 回復: Lv1 +50 / Lv2 +100 / Lv3 +150(最大HP 691 は不変)。最大HP 691 に対しHP 671 のとき要求150・適用20。
- Lv3: 魂1つ目 x1.03(残り約2.9秒)→ 1.5秒後に2つ目で x1.06・共有の残り時間が約2.9秒へ戻る。武器ダメージ(乱数0.999固定)は 基準120 → 129(= 公式式で独立に計算した x1.06 の値)。何度殴っても同じ(消費されない)。3秒後に 120 へ戻る。基礎ATK 35 は不変。
- ストレングス(+10% x2)との併用: 165(= x1.2 x 1.06 の値)。ストレングスは消費・サイコポンポスは残る。次の攻撃は 129。絶(x2)との併用: 258(= 129 x 2)。ダメージの適用は1回。
- 否定側: 環境・味方・直接HP0の撃破では魂が出ない(通知は `credited:false`)。
- 同時5体: 魂5つ(重複なし)・Hermesは3体まで(残り2は見た目なし)・範囲内の魂は回収・窓の終了で未回収の魂とVFXが消える。
- 後片付け: 戦闘終了・マップ移動の後、窓・魂・攻撃力上昇・Hermes・錨Event・魂VFX・購読がすべて消える。Consoleにエラーなし。押しっぱなしのキーなし。

### 4.3 VFXの証拠(`docs/evidence_h3b/`)
- `e1_kills_manifest_hermes.png`: 5体が同時に倒れた直後(スロー再生)。共通のHermesの目元カットイン(左上)、主人公の「指をはじく」ポーズ、各敵の位置の出現の輪、Hermes(赤い結晶 = 暫定マーカー)が敵の脇で剣を振る・斬撃の閃光。
- `e3_souls_hovering.png`: 70フレーム後。範囲外の魂が青白く漂う。範囲内の魂は回収済みで、HPが 250 に回復している。
- `e4_collect_burst.png`: 魂に近づいた瞬間の回収の光(輪)。
- `r3_sword_kill.png`: 実際の剣で倒した直後。Hermesが黒いノイズとともに消えていく。
- `r9_buffed.png` / `h3b_results.json` / `h3b_os_input_results.json`: Lv3の重ね掛けの状態と全チェックの結果。
- 実機の確認で見つかり、直したこと: ① 公式Show VFXの `stickMode`+位置オフセットが約2倍に効いて魂のVFXが離れた場所に出た → 錨Eventへ結び付ける方式に変更(魂の位置と一致を実機で確認)。② 絵の登録が遅れて「止める」が空振りし、漂うVFXが残った → `stop` に予約を追加。③ 敵と主人公が隣り合うとHermesが主人公と重なった → 敵の「主人公と反対側」に変更。

## 5. 動作が意図せず繰り返されないか(CDP入力なし)
`tools/mz_cdp/h3b_manual_os_input.cjs`(OSレベルのキー/マウス入力 `os_input.ps1`。CDPは準備と読み取りだけ)。**人間の手動プレイの代わりではありません**(自動のOS入力です。長押しの自動リピートや実際の手の動きは再現していません)。
- Q を1回: カード使用1回・窓1つ。J を1回: 剣は1振り・撃破1回・魂1つ・指をはじく動作1回・回復1回(100 → 250)。D は押している間だけ移動(12 → 14.625)・離すと止まる。Q をもう1回: 使用はちょうど+1・窓は1つのまま残り時間が戻る。窓の終了後も勝手にカードは使われず、動作も繰り返されない。押しっぱなしのキーなし・Consoleエラーなし。
- 人の手での確認手順(短い): ① 手札にサイコポンポスを入れてアリーナで Q を1回押す(HPは変わらない) ② 敵を剣で倒す(魂が出て、近づくと回復する・Lv3なら攻撃が少し強くなる・3秒で戻る) ③ 壁の向こうの魂は拾えない。

## 6. ユーザーに確認したいこと(未確定)
1. 効果時間(10秒)が終わったとき、未回収の魂は消えてよいか(既定)/ 戦闘終了まで残して拾えるようにするか。
2. 効果中にもう一度使ったとき、残り時間を10秒に戻す(既定)/ 10秒を足す/ 別の窓にするか。
3. 範囲 5マスの基準点: 主人公の中心と魂の中心の距離で、範囲に入ったら自動回収、でよいか。
4. Lv3の攻撃力上昇の重ね掛け: 加算 1+0.03n(既定)/ 乗算 1.03^n。
5. HPが満タンのとき、魂を回収する(既定)/ しない。
6. 旧Hermes剣術・Apolloのカード攻撃・一閃/薙ぎ払い・DoT(Apolloの病)にも攻撃力上昇・撃破の帰属を広げるか(広げるなら個別の橋渡しが必要。Apolloの病は保護対象Pluginの変更許可も必要)。
7. 製品の敵のドロップ・ボスの扱い(ボスを倒したときも魂を出すか)。
8. Hermesの見た目(攻撃モーション)・「閃光の音」・指をはじく音の最終素材。

## 7. H2C(最終デッキ・旧カードの移行)の準備状況
設計の7枚はすべて実装済み(`finalDeckBlockers()` は空)。`buildFinalHermesDeck()` は30枚の一覧を返せるが、**どこにも適用していない**。H2Cで決めること: 30枚デッキの有効化と初期付与、旧カード(認識阻害・葦笛睡眠・Hermes剣術・高速移動)の置換/共存、上の暫定項目の確定。
