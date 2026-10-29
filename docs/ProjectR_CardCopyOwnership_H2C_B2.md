# ProjectR カードの物理所持コピーと旧セーブの安全な移行(Phase H2C-B2)

H2C-B1(`9d25e2e`)で調べた「所持は種類単位で、枚数を持たない」を、ユーザーが確定した**実際の所持枚数の管理**へ置き換えた Phase です。
新しいカード効果・Apollo・ボス・物語イベントは作っていません。

## 1. 確定したルール(ユーザー指定)
各カードの種類ごとに、次の3つを別々に持ちます。

| 名前 | 意味 | 保存 |
|---|---|---|
| `OwnedCopies` | 実際の所持枚数(在庫) | する(`_projectRCardInventory.copies`) |
| `DeckCopies` | 今のデッキに入っている枚数 | デッキ定義(Core)が持つ |
| `MaxDeckCopies` | そのカードのデッキ内上限(`maxCopies`) | カード定義(Core) |

デッキに入れられる最大枚数 = **`min(OwnedCopies, MaxDeckCopies)`**。

| ストレングス(上限10) | 所持0 | 所持1 | 所持5 | 所持10 | 所持15 |
|---|---|---|---|---|---|
| デッキの最大 | 0 | 1 | 5 | 10 | 10(15枚は所持のまま保管) |

不変条件:
- デッキの編集は所持を変えない。デッキから外してもカードは消えない。戦闘でカードを使っても所持は減らない。
- 山札・手札・Cooldown・捨て札は戦闘中だけの一時状態(従来どおり保存しない)。
- 負・小数・NaN・不正な所持枚数は無効(読み込み時に取り除き、元の値は残す)。
- 有効な本番デッキはちょうど30枚(従来どおり)。
- Card Levelは**物理コピーごとではなく、カードの種類ごとに共通**(Coreの `cardOwnership.level` のまま)。

## 2. 保存の形(版つき・別領域)
`$gameSystem._projectRCardInventory`(セーブに自動で入る)。CardDeckCore の `_projectRCardDeckData` の形式は**変えていません**。
Core は読み込みのたびに未知のフィールドを捨てるため(H2C-B1 §1.2)、枚数を Core の `cardOwnership` へ足すことはできませんでした。

```
{
  schema: 1,
  seq: 0,                                // 報酬の通し番号
  copies:  { "hermes_strength": 10, ... }, // 0枚のカードは持たない
  rewards: { "hermes.ring.starter": { source, cards, total, seq, migrated? }, ... }, // 一度だけの付与の記録
  legacy:  { source: "newGame" | "legacy",
             diagnostics: [ { code, severity, cardId?, message } ],     // 移行の診断(ユーザーが後から確認できる)
             reconstructed: { cardId: { copies, basis, unlocked, deckCopies, verifiedGrant } },
             unknownOwnership: { 未知のカードID: 元の所持記録 },        // 捨てずに保存
             invalid: { cardId: 取り除いた不正な値 },
             unlocks: { cardId: { kind: "legacyUnlockOnly", copies: 1 } } }
}
```

Core への接続は2点だけで、Core本体は編集していません。
1. `CardDeckService.prototype.deckInvalidReasons` を包み、**所持を超えるデッキ枚数**に `CARD_COPIES_EXCEEDS_OWNED`(`cardId / actual / owned / maxCopies / maximum`)を追加。デッキ構築・戦闘前検証・ボス戦開始の検証すべてに効く。
2. `ProjectRCardDeck.setCardOwned(id, true)`(旧来の「解放だけ」)を包み、所持が0のときだけ最小1枚にする(何度呼んでも増えない)。

## 3. 付与の API(今後の報酬・購入・スクリプトで使う)
`ProjectRCardInventory`(新プラグイン `ProjectR_CardInventory.js`)

| API | 内容 |
|---|---|
| `grantCopies(cardId, copies, {rewardId, source})` | 枚数つき付与。**`rewardId` あり = 一度だけ**(同じIDの2回目は `alreadyGranted` で増えない)。**なし = 毎回加算**(ショップ購入向け) |
| `grantBundle(rewardId, {cardId: copies, ...}, {source})` | 複数カードを一括。全部検証してから反映(原子的。1つでも不正なら何も変わらない) |
| `getOwnedCopies / getDeckCopies / getMaxDeckCopies / getDeckLimit(cardId)` | 読み取り |
| `validateDeck(cardIds?)` / `deckReport(cardIds?)` / `canAddToDeck(cardId)` | 詳細な理由つきの検証 |
| `hasReward(id)` / `rewards()` | 付与済みの報酬ID |
| `diagnostics()` / `state()` | 移行の診断・カードごとの内訳(読み取り専用) |
| プラグインコマンド「カードを枚数つきで入手する」`GrantCardCopies` | `cardId / copies / rewardId`(空欄 = 繰り返し入手可) |

- 付与は整数 1〜999 のみ。0・負・小数・NaN・文字列・未知のカードID・1カード999枚超は拒否(状態は変わらない)。
- 付与は同時にカードを解放する(現在のLevelは保つ)。
- **旧来の `GrantCard`(解放だけ)は枚数を増やしません**。過去の `GrantCard` が繰り返し枚数を付与することはありません。
- 例: ボス報酬 `grantCopies("hermes_issen", 1, {rewardId: "boss.hermes.1"})`、ショップ `grantCopies("hermes_issen", 1, {source: "shop"})`。

## 4. 旧セーブの移行(1回だけ・メモリ上のみ・ファイルは次にセーブするまで変わらない)
旧セーブに所持枚数はありません。**復元できる事実だけ**を使い、過去の枚数は作り上げません。

| 状況 | 結果 | 根拠(`basis`) | 確かさ |
|---|---|---|---|
| 解放済み・デッキに無い | 1枚 | `reconstructedMinimum` | 推定の最小値(実際の過去の枚数ではない) |
| 解放済み・デッキに N 枚 | max(1, N) 枚 | `reconstructedMinimum` | 推定の最小値 |
| H2C-A の付与記録(`_projectRHermesProduction.rings.hermes`)が「完了済み・7種30枚・合計30」と確認できる | その記録の枚数(3/3/3/10/3/3/5) | `verifiedGrant` | **確認済み**(付与の履歴) |
| 指輪だけ持っている(付与記録なし) | 付与しない | — | 指輪の所持は付与の証拠にしない(診断 `RING_WITHOUT_GRANT_RECORD`) |
| 付与記録が壊れている・30枚でない | 使わない(推定の最小値にする) | `reconstructedMinimum` | 診断 `GRANT_RECORD_UNVERIFIED` |
| 未解放なのにデッキにある | デッキは残す。所持0・未解放のまま | `lockedCardInDeck` | 勝手に解放しない。診断 `LOCKED_CARD_IN_DECK` |
| 未知のカードID(デッキ) | デッキの記録をそのまま残す | — | 診断 `UNKNOWN_CARD_IN_DECK` |
| 未知のカードIDの所持記録 | `legacy.unknownOwnership` に元の値を保存 | — | 診断 `UNKNOWN_OWNERSHIP_PRESERVED` |

- 旧デッキは**自動で削除・並べ替え・切り詰め・補完をしません**。無効なデッキは理由つきで残ります(例: 旧19枚のデッキは「30枚に足りない」だけが理由)。
- 一度移行したら `schema` が記録され、**再移行しません**。ロード/セーブを繰り返しても増えません。移行後に増やした枚数は、再ロードで推定値に戻りません。
- 保存された不正な枚数(負・小数・NaN・文字列)は取り除き、元の値を `legacy.invalid` に残し、診断を出します(診断は増え続けません)。
- **復元できない情報**: 旧セーブ以前に何枚持っていたか(デッキに入れていなかったコピー)、入手履歴、同じカードを2回入手したか。これらは**不明**として扱い、推定の最小値を「確認済み」とは表示しません(Deck Builder は「旧セーブからの推定最小値」と表示)。

## 5. Hermes の初期コレクション
正本: `ProjectR_CardManagement_Template(3).xlsx`(SHA-256 `babd70c7…dd32c`)。

| カード | 枚数 |
|---|---:|
| hermes_issen(一閃) | 3 |
| hermes_psychopomp(サイコポンポス) | 3 |
| hermes_veil(ヴェイル) | 3 |
| hermes_strength(ストレングス) | 10 |
| hermes_sweep(薙ぎ払い) | 3 |
| hermes_reed_flute(葦笛) | 3 |
| hermes_zetsu(絶) | 5 |
| 合計 | 30 |

- H2C-A の初回入手の振る舞いは維持: 新しい入手でだけ一度付与 / ロード・再入手・指輪の譲渡と返却・別経路での再入手では付与しない / 既存のカスタムデッキは上書きしない / 空のデッキだけ30枚で初期化 / 既存のLevelは下げない。
- 付与は報酬ID `hermes.ring.starter` で一度だけ。H2C-A の付与記録(`_projectRHermesProduction`)も従来どおり残す(互換)。
- **すでに独立して持っているコピーは減らさず、その上に初期コピーを加えます**(例: 事前にストレングス2枚 → 12枚。デッキに入るのは上限10枚)。重複付与にならないのは報酬IDの冪等性で保証。この加算の方針は、既存の独立入手分が無い通常の新規ゲームでは影響しません(要確認: 決定事項 D1)。

## 6. デッキ構築画面
`ストレングス：所持5枚 / デッキ5枚 / 上限10枚`(詳細欄)。上限を超える所持は「(上限を超える5枚は保管)」、旧セーブからの推定は「(旧セーブからの推定最小値)」を添える。
一覧の右端は `デッキ内/所持枚数`(例 `5/5枚`)。6枚目は「所持枚数を超えています：ストレングス（所持5枚・デッキ6枚）」と拒否される。
画面のレイアウト・操作(決定/Shift/Tab/Esc/X/B/右クリック)・Level表示は変えていない。

## 7. 指輪・戦闘との関係
指輪の規則(主人公は複数、仲間は1つ、戦闘中は譲渡不可)は変更なし。指輪を譲渡すると該当カードは `REQUIRED_RING_NOT_OWNED` で無効になるが、**所持もデッキも消えない**。返すと有効に戻り、コピーは増えない。所持と指輪の両方が検証される。
5枚の手札・Cooldown・捨て札・シャッフル・消費・ドローは変更なし。

## 8. DEV(テスト用アリーナ)
アリーナは固定デッキ(同じカードを多数枚)を一時的に組むため、`beginFixture()` / `endFixture()` で所持枚数の検証を外し、終了時に保存領域を元へ戻す(`ProjectR_CombatTestArena.js` / `…FullSpec.js` のスナップショットに接続)。通常のゲームでは使われない。

## 9. H2C-B1 の修正の維持
Deck Builder の Esc と `ProjectR_SaveLoadGuard` は変更していない。`ProjectR_VisionOcclusion.js` / `ProjectR_CombatOcclusion.js` / `ProjectR_CardDeckCore.js` / `ProjectR_CardCatalog.js` も変更していない(自動テストで確認)。

## 10. 検証結果
(§10〜§12 は実行後に記入)
### 10.1 自動テスト
- 全体スイート: 下記「最終結果」に記載(開始時 57/57)。
- 新規 `tests/ProjectR_H2CB2.test.cjs`(30件): 所持0/1/5/10/15・6枚目の拒否・デッキ編集で所持不変・不正数量・報酬ID(一度だけ/別ID/繰り返し)・解放だけの操作・初期30枚の内訳・再入手/ロード/譲渡で増えない・独立コピーの上に加算・既存デッキの非上書き・指輪の譲渡と返却・Hermes/Apollo混在・戦闘でカードを使っても不変・Levelは種類ごと・セーブ往復・旧セーブ(解放のみ/複数枚デッキ/付与記録つき/記録の破損/未解放がデッキに/未知ID/冪等/不正な枚数)・DEV固定デッキ・Chromium 85構文・Core等が未変更。
- 意図して更新した既存テスト: `ProjectR_H2CB1.test.cjs`(旧モデル「1枚の解放で10枚入る」の記録 → 新モデル)、`ProjectR_HermesProductionDeck.test.cjs`(Apolloと旧カードの上限確認で、実コピーを付与してから確認)、`ProjectR_MenuRuntimeCertification.test.cjs`(同)。いずれも**検証対象の規則(コピー上限など)は弱めておらず**、前提の所持を新モデルで用意するようにしただけ。

### 10.2 実機(Playtest)の結果
入力は、戦闘のQ/Eと OS キー入力のスクリプトで、**人間による手動確認ではありません**。

| スクリプト | 内容 | 結果 |
|---|---|---|
| `h2cb2_verify.cjs` | 新モデルの実機確認 A部(新しいゲーム: 初回入手・30枚・デッキ構築画面の描画文字列・戦闘・Q/E・外す/追加/拒否・追加付与・15枚所持・セーブ/ロード・再入手・指輪の譲渡/返却)、B部(保護コピーslot1/2を本物のロード経路・読み取りのみ)、C部(旧形式の保存を一時フォルダに作り本物のロード) | **25/25** |
| `h2cb1_esc.cjs`(OS入力) | Deck BuilderのEsc・X/B・右クリック・戦闘中のキー | 13/13 |
| `h2cb1_verify.cjs` | 旧セーブのロード(保護コピー) | 11/11 |
| `h2ca_verify.cjs` | Hermes本番デッキ | 21/21 |
| `h2ca_manual_os_input.cjs`(OS入力) | | 9/9 |
| `regress.cjs` | 剣・G17・F・Ultimate・メニュー・Vision | 8/8 |
| `h2a_verify.cjs` / `h2b1_verify.cjs` / `h2b2_verify.cjs` | Hermes各カード | 23/23 / 17/17 / 14/14 |
| `h3a_verify.cjs` | ヴェイル(R4a/R4bを含む) | 17/17 |
| `h3b_verify.cjs` | サイコポンポス | 39/39 |
| `h3a_manual_os_input.cjs` / `h3b_manual_os_input.cjs`(OS入力) | | 9/9 / 8/8 |
| `verify.cjs`(H1時代の絶の旧スクリプト) | 6項目FAIL(boot=カード定義が8件のはず、壁の手前で止まる4件など) | **対象外**: `ProjectR_CardInventory` を無効にしても同じ6項目が失敗する(今回の変更が原因ではない)。boot検査は「定義がちょうど8件」を期待する古い検査で、H2A以降は常に失敗する。H2A以降の絶の確認は `h2a_verify`/`h2b1_verify` が担う |

実機で確認した新モデルの要点: 初回入手で 3/3/3/10/3/3/5(合計30)・デッキ30枚で有効 / 詳細欄の描画文字列「ストレングス：所持10枚 / デッキ10枚 / 上限10枚」・一覧「10/10枚」 / 所持2枚のカードの3枚目は拒否(日本語の理由つき)・報酬IDで1枚増やすと入る・上限3の4枚目は拒否 / ストレングス15枚所持でもデッキは10枚まで / 実キーでカードを使っても所持不変 / 実際のセーブ(一時フォルダ)→新しいゲーム→ロード2回で完全に同じ / 再入手で増えない / 指輪の譲渡でカードは無効(所持枚数の理由は出ない)・返すと有効。
旧形式の保存(C部): 旧カード19枚のデッキ → 各 3/2/3/3/3/2/3 に移行しデッキは変わらず(30枚には足りないだけ) / 付与記録つき → 記録の30枚(verifiedGrant)・再取得で増えない / 未解放・未知IDがデッキにある → デッキを残し所持0・未解放のまま、診断に出る。

### 10.3 既存セーブの保護
`save/` の5ファイルのSHA-256は作業前後で同一(config `2f0a5000…`、file0 `3ff692fc…`、file1 `7534fc6c…`、file2 `b9db7c4f…`、global `9535c150…`)。保護コピーは読み取りのみ(書き込みは例外で拒否)、セーブ/ロードの書き込みは一時フォルダだけ。保護対象の元 `ProjectR` は変更していない。
実在の保護セーブ(slot1/slot2)は所持0・デッキ0の旧形式のため、複数枚のデッキの移行は C 部の合成セーブ(旧形式の保存)で確認した。**実際のプレイデータでの確認は未実施**。

### 10.4 Esc / SaveLoadGuard
H2C-B1の修正は変更なし。Escは `h2cb1_esc` 13/13、旧セーブのロードは slot1/2 ともエラー0(B部・`h2cb1_verify`)。

### 10.5 ヴェイル R4a/R4b(断続的な失敗)
H2C-B1 で `h3a_verify` が1回だけ 15/17(R4a/R4b)になり、再実行で2回とも 17/17 でした。このPhaseの実機回帰では `h3a_verify` は **17/17**(1回)で、**再発していません**。原因は未特定のままで、「断続的な失敗の可能性がある」記録として残します(時間待ちの追加やテストの弱体化はしていません)。再発した場合に備えて、検知対象・キャッシュ・フレーム数の記録を残す対応は未実装(再発時に追加)。

## 11. 事実の区別
- **ユーザー確定のルール**: 物理所持、min(所持, 上限)、Hermes初期30枚(正本のワークブック)、デッキ30枚。
- **再構成した最小値**: 旧セーブの解放済みカード(max(1, デッキ内の枚数))。実際の過去の所持数ではない。
- **確認済みの付与履歴**: H2C-A の付与記録(30枚)があるセーブのみ。
- **不明**: 旧セーブ以前の所持数・入手履歴。
- **DEV確認**: 自動テスト(実エンジンのスタブ描画)。
- **実機で確認済み**: §10.2(スクリプト入力。人間の手動確認ではない)。

## 12. 未解決・次に決めること
- **D1**: すでに独立して持つコピーの上に初期30枚を**加算**する方針(§5)でよいか(代案: 初期枚数までの補充)。通常の新規ゲームでは影響しない。
- **D2**: 旧カード(Hermes4種・Apollo3種)と新Hermes 7枚の共存・置換(H2C-Aから未決。このPhaseでは触れていない)。
- **D3**: 旧セーブの推定最小値が実際より少ない場合の救済(例: ユーザーが明示的に枚数を修正する手段・特別な救済付与)。自動では行わない。
- **D4**: 指輪を入手する物語イベント(未作成)。入口は `AcquireHermesRing` / `GrantRing`。
- **D5**: 上限の高いカード(ストレングス10枚)の今後の入手経路(ボス・NPC・ショップ)と価格・報酬ID の命名規則。
- ヴェイル R4a/R4b の断続的な失敗は原因未特定(§10.5)。
- 保存領域の読み込み時の診断をユーザーに見せる画面は未実装(API `diagnostics()` のみ)。
