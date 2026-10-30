# ProjectR Hermes 初期セット付与の「補充(top-up)」化 (Phase H2C-B4)

H2C-B3 の監査で示した D1(付与方針)について、ユーザーが **補充(top-up)** を正式に承認したため、Hermes の指輪の初期セット付与だけを加算から補充へ変更した。
カード効果・他の神・Core・保存形式・SaveLoadGuard/Esc 修正・Deck Builder・戦闘は変えていない(コミット前の基準 `3f35453`)。

## 1. 仕様

初期セットの各カードについて、付与する枚数を次の式で決める。

```
copiesToGrant = Math.max(0, starterTarget - currentlyOwnedCopies)
```

| カード | 目標 | | カード | 目標 |
|---|---|---|---|---|
| hermes_issen(一閃) | 3 | | hermes_sweep(薙ぎ払い) | 3 |
| hermes_psychopomp(サイコポンポス) | 3 | | hermes_reed_flute(葦笛) | 3 |
| hermes_veil(ヴェイル) | 3 | | hermes_zetsu(絶) | 5 |
| hermes_strength(ストレングス) | 10 | | **合計** | **30** |

ストレングスの例(事前の所持 → 付与 → 合計): 0→10→10 / 2→8→10 / 8→2→10 / 10→0→10 / 12→0→12。

### 守るもの
1. 持っているコピーは減らさない。目標以上を持っていれば0枚(12枚は12枚のまま)。
2. カードLevelを上書きしない。既存のカスタムデッキを上書きしない(デッキが空のときだけ従来どおり30枚で初期化)。
3. 物理所持枚数がそのまま保たれる(デッキ編集・戦闘使用・Level変更で所持は変わらない)。
4. **通常の付与は加算のまま**: `GrantCardCopies`、`grantCopies`、`grantBundle`(`mode` 省略)、IDなしの繰り返し報酬・ショップ。補充は初期セットだけ。
5. 一度だけ: 報酬記録 `hermes.ring.starter`(と H2C-A 以来の付与記録)は従来どおり。ロード・再入手・`GrantRing`・指輪の譲渡と返却・明示付与で二重付与されない。
6. 旧セーブは「指輪を持っているだけ」では付与されない(自動付与なし)。明示付与(`grantStarter({explicit:true})`)のときだけ補充する。H2C-A で30枚を付与済みの旧セーブは、検証済みの記録から報酬記録が作られ補充は行われない。
7. 30枚のデッキ検証と、カードごとの `min(所持, コピー上限)` の上限は変わらない(ストレングス12枚所持でもデッキは10枚まで)。

## 2. 実装

| ファイル | 変更 |
|---|---|
| `js/plugins/ProjectR_CardInventory.js` | `grantBundle(rewardId, cards, {source, mode})` に `mode:"topUp"` を追加(値 = 目標の所持枚数)。`mode` 省略/`"additive"` は従来どおり。付与枚数をすべて決めて検証してから反映(原子的)。重複するカード指定と不明な `mode` は拒否。`previewGrant(rewardId, cards, {mode})` は選んだ方針の結果(`grant`/`after`/`deckLimit`/`satisfied`)を行ごとに返し、加算・補充の両方も参考に返す。 |
| `js/plugins/ProjectR_HermesProductionDeck.js` | `performGrant` が `mode:"topUp"` で付与。付与記録に `policy:"topUp"`・`cards`(実際に付与した枚数)・`targets`・`totalCopies`(実際の合計)・`targetCopies`(30)・`copiesBefore`・`copiesAfter` を残す。`previewStarterGrant()` は `policyInEffect:"topUp"`・`grants`・`totalGrant` を返す(読み取り専用)。 |

付与記録の例(事前に一閃1枚): `cards.hermes_issen = 2`、`copiesBefore.hermes_issen = 1`、`copiesAfter.hermes_issen = 3`、`totalCopies = 29`、`targetCopies = 30`。新しいゲーム(事前の所持なし)では `cards` = `targets`、`totalCopies = 30` で従来と同じ。

### 原子性
- 不正な入力(未知のカード・0・小数・文字列・1000枚・重複・不明な mode・空の束)は、所持・Core・付与記録・デッキを一切変えず、報酬記録も作らない。
- 製品側の失敗(戦闘中 `inCombat`、設計データ不正 `definitionsInvalid`)も何も変えない。復元後の入手は正しく補充される。
- 報酬記録は、すべての検証と反映が終わった最後に書く。

## 3. 検証結果

### 自動テスト
- 基準(変更前): **59/59 PASS**
- 最終: **60/60 PASS**(新規 `tests/ProjectR_H2CB4.test.cjs` 20件を追加)
- 方針変更で期待値を直した既存の2件: `ProjectR_H2CB2.test.cjs`(事前2枚のストレングスは12 → 10)、`ProjectR_H2CB3.test.cjs`(プレビューの方針とtotals、実際の挙動の固定)。ルールを弱めたのではなく、承認された新方針に合わせて固定し直した。

新規テストの観点: ストレングス 0/2/8/10/12、混在(一部だけ所持)、目標超過、7種すべて目標ちょうど、Level保持、再入手/GrantRing/ロード/指輪の譲渡と返却、保存後の再補充なし、プレビューの一致と非変更、通常の付与は加算、原子的な失敗、カスタムデッキ保持、30枚/上限の維持、旧セーブ(自動付与なし・明示付与のみ・H2C-A 記録)、戦闘中の所持不変、Chromium 85 構文、保護ファイルの非変更。

### 実機(本物の RPG Maker MZ / NW.js)
入力はスクリプト(CDP。戦闘のQ/Eは CDP の実キー)で、**人間の手動確認ではない**。新しいゲームはメモリ上に作り、保存は一時フォルダにだけ書いた。

| スクリプト | 結果 |
|---|---|
| `h2cb4_verify.cjs`(新規) | **16/16** |
| `h2cb3_verify.cjs`(M1/M2 を補充に更新) | 11/11 |
| `h2cb2_verify.cjs` | 25/25 |
| `h2cb1_verify.cjs` | 11/11 |
| `h2ca_verify.cjs` | 21/21 |
| `regress.cjs` | 8/8 |
| `verify.cjs` | 23/23 |
| `h2b2_verify.cjs` | 14/14 |

`h2cb4_verify` の実際の付与枚数(実機): ストレングス 0/2/8/10/12 → 付与 10/8/2/0/0、合計 10/10/10/10/12。混在(一閃1・サイコ3・ストレングス6・薙ぎ払い5・葦笛2)→ 付与 2/0/3/4/0/1/5、合計 3/3/3/10/5/3/5(薙ぎ払い5枚は減らない)。目標超過・ちょうどは付与0枚。旧セーブ(指輪あり・記録なし)はロード後に新Hermes 0枚、明示付与で 3/3/3/10/3/3/5。

### 保護セーブ
`save/` の5ファイルを実機検証の前に退避・SHA-256 を記録し、後で比較して**同一**だった(config `2f0a5000…`、file0 `3ff692fc…`、file1 `7534fc6c…`、file2 `b9db7c4f…`、global `9535c150…`)。元の `ProjectR` は変更していない。

## 4. 未確認・制約
- OS入力(OSレベルのキー/マウス)のスクリプト(`h2ca_manual_os_input` など)は今回再実行していない。新しいゲームの入手結果は従来と同一(3/3/3/10/3/3/5)で、自動テストと実機の CDP 検証で確認している。
- 実在の保護セーブは所持0・デッキ0の旧形式のため、複数枚の旧デッキを持つ実セーブでの補充は合成した旧形式セーブでの確認になる。
- 旧カードと新カードの共存(D2)、推定の最小値の救済(D3)、指輪を入手する物語イベント(D4)、高上限カードの入手経路と報酬ID(D5)は未決のまま(`ProjectR_HermesFinalStabilization_H2C_B3.md`)。D1 は本フェーズで解決した。
