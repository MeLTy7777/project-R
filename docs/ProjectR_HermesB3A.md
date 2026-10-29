# ProjectR Hermes ヴェイル・Cursor対象・敵の標的選択(Phase H2B-3A)

正本: `C:\Users\hmats\Documents\RMMZ\_ProjectR_DesignSources\ProjectR_CardManagement_Template(3).xlsx`(「カード一覧」Card ID 3 = ヴェイル・47列すべて確認。SHA-256 `babd70c70f3ce0f52f622c4464835eacb4df3d305ecc48a53e84b627505dd32c`、期待値と一致)。
前のコミット: `5c60bd0`(Phase H2B-2)。**サイコポンポスは実装していません。本番の30枚デッキは有効にしていません**(`isFinalDeckReady()` は false。`finalDeckBlockers()` = サイコポンポス)。
関連: [ProjectR_CardTargeting.md](ProjectR_CardTargeting.md)(Cursor) / [ProjectR_EnemyTargetSelection.md](ProjectR_EnemyTargetSelection.md)(Hendrixの敵AIと秘匿) / [ProjectR_Hermes_MigrationAudit_H2A.md](ProjectR_Hermes_MigrationAudit_H2A.md) §7 / [ProjectR_ThirdPartyAssets.md](ProjectR_ThirdPartyAssets.md) §2-e。

## 1. ランタイムID・定義

| 設計ID | カード | ランタイムID | 強さ | 最大枚数 | 最大Lv | Cooldown | 対象タイプ | Plugin |
|---|---|---|---|---|---|---|---|---|
| 3 | ヴェイル | `hermes_veil` | 特殊 | 3 | 3 | 10秒 | **cursor**(ワークブック表記は「その他」。ユーザー確認: カーソル追従) | `ProjectR_HermesVeil.js` |

定義は `ProjectR_CardCatalog` が実行時に追加します(旧7枚の `CardDefinitions` とセーブは不変)。既定で未所持。旧「認識阻害」`hermes_perception_obscure` は削除・上書きせず**共存**(置換するかはユーザー判断・未決)。

## 2. 確定している仕様(ワークブックとユーザーの明確化)

- 有効範囲 半径5マス / 射程 画面内ならどこでも / 効果時間 5秒 / 複数対象 はい / 壁越え いいえ / ダメージなし / 暗い紫 / 重低音(音は未用意)。
- 神の登場: マウスポインタの場所に召喚(**マウスポインタに追従する**)。神の動作: 地面に手を付け有効範囲に魔法陣を作成。消失: 黒いノイズとともに消える。主人公モーション: なにもしない。カットイン: ランダム(左上/右上)。
- Lv1: 範囲内の味方は敵からターゲットを取られなくなる(5秒)。Lv2: +範囲内の味方の移動速度30%上昇。Lv3: +範囲内の味方のクリティカル発生率50%上昇。
- 累積レベル規則(承認済み): 別の効果は累積、同じ効果の新しい数値は置換。
- 「その他」は **Cursor**(追従)であって、発動点に固定する Ground ではない(ユーザーの後からの明確化。固定する解釈より優先)。

## 3. 実装の概要

| 要素 | 実装 |
|---|---|
| Cursor対象 | `ProjectR_CardTargeting.js`(座標変換・円の判定・"cursor" handlerの受け口)。**CardDeckCoreは変更しない**(保護対象。ルーターに cursor を渡す包みを足しただけ) |
| 毎フレーム追従 | 効果は発動の1回だけ。毎フレームの戦闘時間(`updateCooldown(1/60)`)で今のマウスを読み直して中心を更新。再消費・Cooldownのやり直し・効果時間のやり直しなし |
| 標的の秘匿 | `ProjectR_TargetEligibility.js`(Hendrixの検知部品に接続。[詳細](ProjectR_EnemyTargetSelection.md)) |
| 移動速度 | `ProjectR_CardModifiers` のキャラクター別係数(`hermes_veil` というidで x1.3)。他の係数は残り、外すのは自分のidだけ。**主人公の `Game_Player.distancePerFrame` の包みが、キャラクター別係数を掛けていなかった不具合を修正**(H2B-2までは敵Eventだけに効いていた) |
| クリティカル | `ProjectR_CardModifiers` のヒットフックに `critChanceBonus`(確率ポイント加算)/ `critChanceScale`(自然な率への倍率)を追加。公式の `itemCri`(1回の抽選)をその1回の呼び出しの間だけ「自然な率 x 倍率 + ポイント」に差し替える。固定ダメージも同じ式 |
| 表示 | `ProjectR_GodSummonVisual` に追従する神(`spawnFollower/moveFollower/vanishFollower/removeFollower`)、`ProjectR_PresentationVfx` に `anchor:"target"`(Eventへ結び付け・半径で拡縮・止めるまで繰り返し・1件だけ停止 `stop(note)`) |
| DEV | `ProjectR_CombatTestArenaVeil.js`(`ProjectRVeilTest`: DEV敵AI と DEV味方 `<npc>`)。`ProjectRHermesTest.start('veil', lv)` |

### 3.1 Lv1/Lv2/Lv3 の動作

| Lv | 追加される効果 | 数値の扱い |
|---|---|---|
| 1 | 範囲内の味方は敵の標的選択から外れる(5秒)。無敵ではない(ダメージ・衝突・環境ダメージ・すでに出た攻撃は変えない) | 半径5(含む)・5秒 |
| 2 | + 範囲内にいる間だけ移動速度 x1.3。出たら自分の係数だけを外す | 速度+30% |
| 3 | + クリティカル発生率+50%(**暫定の解釈**。§6) | 既定 additive(+50ポイント) |

### 3.2 動的な出入り
毎フレーム、味方の当たり判定の中心が円の内側(境界を含む)かを評価します。入った瞬間にその時のレベルの効果、出た瞬間に停止。マウスを動かして円が覆わなくなれば止まり、覆えば再び受ける。効果時間は出入りでやり直さない。効果は味方の位置に固定されない。

### 3.3 発動の成否(ワークブックの「半径5マス以内にいるとバフを受けられる / 範囲外にいると失敗」)
個々の味方が効果を受ける条件として実装しました(範囲外の味方は効果を受けない)。カードの発動そのものは、戦闘中で、マウスが画面内の有効な位置にあれば受理されます。無効(マウスが画面外/数値でない/戦闘外/主人公の死亡)は**非消費**で失敗します。手札・Cooldown・入れ替え(山札から1枚)は、既存のルーターで**ちょうど1回**です。

### 3.4 後片付け
効果時間の満了(Hermesは黒いノイズで消える)、戦闘終了、主人公の死亡、マップ移動、ロード/ニューゲームで、効果・秘匿・移動速度係数・Hermesの表示Event・VFX(魔法陣・オーラ)をすべて外します。保存しません。ステータスやデータベースは変えません。

## 4. 検証の結果

| 区分 | 結果 |
|---|---|
| 全自動テスト(`tests/*.test.cjs`) | **53/53 PASS**(着手前 51/51。新規2ファイル: `ProjectR_HermesVeil.test.cjs`(19件)・`ProjectR_HermesVeil.integration.test.cjs`(11件)) |
| 実機MZ(NW.js 0.48.4 / Chromium 85・実マウス・実キー) `h3a_verify.cjs` | **17/17 PASS** |
| 実機の回帰(新しいセッション) | `regress.cjs`(G17・剣・F・U・メニュー・Vision・Console)8/8 / `h2b2_verify` 14/14 / `h2b1_verify` 17/17 / `h2a_verify` 23/23 |
| CDP入力を使わないOS入力のPlaytest `h3a_manual_os_input.cjs` | **9/9 PASS**(動作の意図しない繰り返しなし。§5) |
| セーブ(5ファイル) | SHA-256 が実機検証の前後で**一致** |

### 4.1 実機で確認した数値
- 円とHermesの位置: 実マウスを5点へ動かし、毎回、円の中心 = マウスの世界座標(誤差0.05以内)・Hermesの位置 = マウス。発動点に残らない。カード: 山札-1・Cooldown+1が1回だけ(マウス移動後も不変)。
- 魔法陣のVFX: Hermesの表示Eventに結び付き(固定しない)、ループは止めるまで(`Infinity`)。
- 効果時間: 発動から301フレーム・実時間 約4.85秒(計測開始までの差を補正)で終了。終了後 followers 0・VFX 0・Event増加なし。
- 範囲の出入り: 主人公/DEV味方で、入った瞬間 x1.3・秘匿 / 出た瞬間 x1 ・解除(数フレーム以内)。効果時間は1本のまま(3.82秒残り)。
- 敵: Hendrixの `checkRange` は通常は主人公を検知(true)、ヴェイル中は検知しない(false・`_detectedEvent` も外れる)、終われば再び検知。DEV敵AIは 追跡(約3.2マス移動)→ヴェイル中は idle で停止(すでに出した移動命令の余り 約0.4マスのあとは停止)→範囲を外すと再追跡→戻すと見失う→終了後に再取得して再び動く。
- Lv2 実際の移動速度: 範囲内 0.0635 / 自由 0.0496(フレームあたり)→ x1.28(目標1.3・許容±0.12)。範囲外は x0.99。
- Lv3 クリティカル: 自然な率 0.10、乱数を 0.35(自然な率より大きく、+50ポイントより小さい値)に固定。ヴェイルなしの剣 78(クリティカルなし)→ ヴェイル範囲内 236(クリティカル・約3.0倍・実効率 0.60 がヒットログに残る)→ 範囲外 78。
- 演出: 通常カットイン(Hermesの目元)・主人公のモーションなし・範囲内の味方に紫のオーラ・Hermesが円の中心にいる。スクリーンショットは `docs/evidence_h3a/`(`r1_mouse_2` / `r7_cast_b` / `r7_moved` / `r4_hidden` / `os6_second_cast`)。

## 5. 動作が意図せず繰り返されないか(CDP入力なし)
自動テストのCDP入力で以前「キャラクターの動作が繰り返される」ように見えた件を、CDPの**入力**を使わず確認しました。`tools/mz_cdp/h3a_manual_os_input.cjs` は、準備(アリーナへ入る・カードの用意)と観測(状態の読み取り)にだけCDPを使い、**キー/マウスはOSの入力**(`os_input.ps1`: `keybd_event` / `SetCursorPos`)で送ります。
- Qを1回(80ms)→ カード使用の呼び出し **1回**・山札-1・Cooldown+1。OSマウスを5点へ動かしてもカードは再使用されない(使用1回のまま)。
- Jを1回 → 剣は **1回**だけ振られ、動作の変化は `SwordAttack` → 終了の1往復。ダメージも1回分。
- Dを700ms押して離す → 動いて、離すと止まる(勝手に走り続けない)。
- Qをもう1回 → カード使用はちょうど+1(合計2回)。押しっぱなしのキーなし(OS側・ゲーム側とも)。
- **限界(正直な記録)**: これは人間が手で遊ぶ代わりではありません。マウス/キーのタイミング・長押しの自動リピート・実際の手の動きは再現していません。最終確認として、下の手順で人の手による短い確認をお願いします。
  1. `nw.exe` でPlaytestを起動(通常どおり。F8の `ProjectRHermesTest.start('veil', 3)` でヴェイルをテスト)。
  2. マウスを動かしながら Q を1回押す → 魔法陣がマウスに付いてくる・5秒で消える・Qの手札が1枚入れ替わる(複数回は使われない)。
  3. J(剣)を1回押す → 1振りだけ。もう一度押したときだけ次の1振り。

## 6. 暫定の解釈・未確定事項(ワークブックで決まっていない。**ユーザーの承認済みの規則ではない**)

| # | 項目 | 現状の既定 | 切替・場所 |
|---|---|---|---|
| 1 | Lv3 クリティカル+50%が 相対か絶対か | **additive(+50ポイント)**。自然な率0.10 → 0.60 | `CriticalMode`(`additive` / `relative`=自然x1.5) |
| 2 | 空の円(範囲内に味方がいない)で発動してよいか | **受理して、味方が入るのを待つ**(カードは消費) | `RequireFriendlyInside`(true で非消費の失敗) |
| 3 | 複数のヴェイルの同時存在 | **coexist**(独立した円・独立した5秒。効果は「どれかの範囲内」で一度だけ=二重掛けなし) | `OverlapPolicy`(`replace` = 新しい発動が古いものを終わらせる) |
| 4 | 円の判定の基準 | 味方の**当たり判定の中心**が半径5(境界を含む)の内側 | `ProjectRCardTargeting.circleContains` |
| 5 | マウスが画面外のとき | 発動は非消費で失敗。効果中は**最後の有効な位置を保つ** | `pointer()` |
| 6 | 絶の武器強化中のクリティカル | 絶の仕様(強化がクリティカル相当・公式のクリティカル抽選を止める)を優先。ヴェイルの確率補正は使わない | `ProjectR_CardModifiers` |
| 7 | 確定クリティカル(葦笛)との関係 | 確定が優先。確率補正は使わず、倍率は1回だけ | 同上 |
| 8 | 旧「認識阻害」との関係 | 共存(判断待ち) | CardCatalog の `migration` |

## 7. 未了・ブロック

- **製品の敵AIへの接続: 未了**。製品用の共通敵AIは未実装(各マップのEventページ次第)。秘匿の核(Hendrixの `checkRange` など)とDEV敵AIは検証済みだが、製品の敵Eventでの実行は未確認。完成とは書かない。
- **味方のマップAI: 未実装**。味方の参照(`registerFriendlyProvider`)と DEV の `<npc>` Event で検証しただけ。製品の味方が実際にいるわけではない。
- **カード攻撃(旧Hermes剣術・Apollo)のクリティカル補正: 未対応**。ダメージが `checkCollide` の時点で計算済みで、後から確率を差し替えられない(通常の剣・G17・固定ダメージだけが対象)。
- **VFX Designer のエディタでの作成・保存の往復: 未実施**。ライブラリ項目(`ProjectR_Veil_Circle/Touch/Aura`)はエディタ互換の形式を直接追記した。魔法陣・オーラは、拡縮・個別停止のために公式の Show VFX(`showAnimatedPicture`)で再生する(同じ画像・同じ設定。ライブラリ項目は設計者が見た目を調整するために登録済み)。
- **素材**: 重低音は検証済みの素材が無く未用意(代用音は鳴らしていない)。Hermesの表示は暫定の `!Crystal`(マーカー)で、**「膝をついて地面に手を付く」姿のアートは未用意**(代わりに、足元に手を付いた波紋 `ProjectR_Veil_Touch` を出す)。魔法陣・波紋・オーラは自作のDEV素材(差し替え前提)。
- 出した移動命令の余り: 敵は標的を見失っても、すでにDotMoveへ出した移動命令は最後に見た場所(約0.4マス)まで進む。新しい命令は出さない。

## 8. 既存システムへの変更
- `ProjectR_CardModifiers`: ヒットフックの `critChanceBonus/critChanceScale`、`adjustChance`、攻撃者 `ctx.attacker`、**`Game_Player.distancePerFrame` がキャラクター別係数を掛ける**(不具合修正)。ヴェイルが無い呼び出しの経路は不変(既存テスト全PASS)。
- `ProjectR_GodSummonVisual`: 追従する神のAPI(既存の一時召喚・常駐Ultimate・swing/balloon/dashは不変)。
- `ProjectR_PresentationVfx`: `anchor:"target"`・`stop(note)`・`diagnostics().activeKeys`(既存のキー・挙動は不変)。
- `ProjectR_CardCatalog`: `hermes_veil` を追加(設計ID3を実装済みに)。`ProjectR_CutIn`: 対象カードに追加。`ProjectR_CharacterPresentation`: `hermes_veil: "None"`(主人公の特別な動作なし)。
- 新規: `ProjectR_CardTargeting.js` / `ProjectR_TargetEligibility.js` / `ProjectR_HermesVeil.js` / `ProjectR_CombatTestArenaVeil.js`(DEV)。
- **CardDeckCore・Hendrix・DotMove・`rmmz_*.js` は変更していません**(保護対象のテストもそのまま通る)。
- 検証スクリプト: `tools/mz_cdp/h3a_verify.cjs`(新規)、`h3a_manual_os_input.cjs` / `os_input.ps1`(新規)、`cdp.cjs` に WASD のキー定義を追加(移動はHendrix_Keyboard_GamepadでWASDに割り当て済み)。
- 固定値を持つ既存テストの更新(アサーションは弱めていない): `ProjectR_CardCatalog.audit`(ヴェイルが実装済み・Cursor対応済み)・`ProjectR_HermesZetsu`(カード数13・実装済み6枚)・`ProjectR_HermesZetsu.presentation`(VFXキーとフレームの寸法)。

## 9. H2B-3B(サイコポンポス)の準備状況
共通基盤(ヒットフック・攻撃動作ID・固定ダメージ・キャラクター別の速度係数・取引パターン・Cursor・標的の秘匿)は整っています。サイコポンポスは「魂」の仕組み(ワークブックの定義の確認が必要)が前提で、ここでは着手していません。
