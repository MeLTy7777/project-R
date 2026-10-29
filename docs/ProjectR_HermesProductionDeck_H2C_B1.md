# ProjectR Hermes 本番デッキの安定化と所持モデル監査(Phase H2C-B1)

2026-10-30。基準コミット `10d77db`(Phase H2C-A)。
**新しい所持モデル(保存データの形)は実装していません。旧カードの変換・移行もしていません。** この Phase でやったのは次の3つです。

1. 所持モデルの**監査**(現状の正確な挙動の記録)と、将来の互換設計の**提案**(承認待ち)。
2. デッキ構築画面の **Esc で戻れない不具合**の再現・原因特定・最小修正。
3. 旧セーブ読込時の **VisionOcclusion 系エラー**の再現・原因特定・最小修正。

保護対象(`ProjectR_CardDeckCore.js`、`Hendrix_*`、`DotMoveSystem.js`、`rmmz_*.js`、`ProjectR_VisionOcclusion.js`、`ProjectR_CombatOcclusion.js`、`data/*`、`manifest.json`、Casino 関連、`AGENTS.md`、既存セーブ)は変更していません。

## 1. 所持モデルの監査(現状)

### 1.1 区別できているもの / できていないもの

| 概念 | 今の扱い | 保存場所 |
|---|---|---|
| 解放済み(その種類を持っているか) | **ある**。種類ごとの `owned` (true/false) | `cardOwnership[cardId].owned` |
| 所持コピー数(何枚持っているか) | **無い**。保存されない | — |
| デッキ内のコピー数 | デッキ配列から数える(`copiesIn`) | `deckDefinition.cardIds` |
| 最大コピー数 | カード定義のデータ `maxCopies`(ストレングス10・絶5・他3など) | カタログ(コード側) |
| Level | **種類ごと**に1つ(コピーごとではない) | `cardOwnership[cardId].level` |

- `ProjectR_MenuCore.js` の `ownedCopies` は表示用の値で、実体は「所持していれば `maxCopies`、していなければ 0」です(保存されていません)。
- Core の検証は `CARD_NOT_OWNED` / `REQUIRED_RING_NOT_OWNED`(種類・指輪)と、デッキ30枚・`count > maxCopies`(上限)だけです。**「持っている枚数を超えて入れた」を検出する仕組みはありません。**

### 1.2 実機(Playtest)での確認(`tools/mz_cdp/h2cb1_verify.cjs` O1〜O5、すべて PASS)

| # | 確認 | 結果 |
|---|---|---|
| O1 | 指輪の入手イベントで7種が所持・デッキ30枚で有効。所持データの形 | 各カードは `{level, owned}` の2項目だけ。コピー数のフィールドは**無い**。トップは `cardOwnership, deckDefinition, ringOwnershipState, ultimateSelection, version(=1)` |
| O2 | ストレングスを所持1種のまま12回追加 | **10枚まで入り、11枚目から `MAX_COPIES_EXCEEDED`**。つまり「1種を所持 = 上限の10枚まで使える」。所持の記録は1つ(`owned:true`)のまま |
| O3 | 所持を外す | デッキは30枚のまま(削除も置換もしない)、`CARD_NOT_OWNED` ×10 で**無効になるだけ**。所持を戻すと有効に戻る |
| O4 | `GrantCard` を Level 指定なしで繰り返す | Level は下がらない(Lv2 → Lv2)。重複して入手しても「枚数」は増えない(種類のフラグ) |
| O5 | `cardOwnership` に未知の `copies` やトップに未知の `futureField` を入れる | Core は**毎回データを正規化し、未知のフィールドを捨てる** |

### 1.3 結論
- **1枚(1種)を持つと上限まで使える**。ストレングスは1種の所持で10枚。
- ボス・NPC・強化などで「1枚だけ渡す」ことは今のモデルでは**表現できません**(渡した瞬間に上限まで使える種類になる)。
- 所持コピー数をいまの `cardOwnership` に足しても、Core が捨てるため保存されません(O5)。**別の保存領域**か、Core 自体の変更(保護対象。固定テストの更新が必要)のどちらかが必要です。

## 2. 将来モデルの提案(未実装・承認待ち)

**目標**: 種類ごとに「持っている枚数」を持てる。ボス・NPC・強化が「持っていない枚数」を勝手に付与しない。旧セーブを壊さず、過去を捏造しない。

### 2.1 保存の形(案)
Core の `cardOwnership` は触らず、**別の版つきの保存領域**に置く案です。

```
$gameSystem._projectRCardInventory = {
  schema: 1,
  copies: { "<cardId>": { owned: <整数>, source: "<入手元の記録(任意)>" } },
  legacy: { "<cardId>": "unknown" | "floor" | "grandfathered" }   // 旧セーブの扱い印
}
```

- 種類のフラグ(`owned`)とLevelは今のまま。枚数だけを足す。
- 検証は新しい層で追加する(「デッキ内の枚数 ≦ 所持枚数」)。Core の検証(30枚・`maxCopies`・指輪)は不変。
- 入手 API は「枚数を加算」(冪等な付与は入手元IDを記録して二重加算を防ぐ)。ボス・NPC・強化はこの API だけを使い、**加算した分しか増えない**。

### 2.2 旧セーブの扱い(要決定。§6)
旧セーブには枚数が無い。事実として分かるのは「種類を所持している」「いまのデッキに何枚入っているか」だけ。選択肢:

| 案 | 内容 | 長所 | 短所 |
|---|---|---|---|
| A. 現状維持(grandfather) | 旧セーブの所持種類は `maxCopies` まで使えるまま。新規入手分から枚数管理 | 何も壊れない。履歴を作らない | 旧セーブだけ「1種で上限まで」が残る |
| B. デッキ下限 | 所持枚数 = いまのデッキ内の枚数(下限) | 手持ちのデッキが必ず有効 | 実際より少なく見積もる。デッキを組み替えると増やせない |
| C. 明示的な付与 | 設計者が決めた枚数を、移行用の入口で明示的に付与 | 意図が明確 | 手作業・設計の確定が必要 |

どの案でも**自動では書き換えません**(読込時に黙って移行しない)。承認後に別 Phase で実装します。

### 2.3 互換性のリスク
- 版つきの別領域を読む側が、領域が無いセーブを「全部 0 枚」と扱うと、旧セーブのデッキが全部無効になる。**領域が無い = 旧形式 = 現行の挙動のまま**にする。
- Core が将来 `cardOwnership` を拡張する場合、別領域との二重管理になる。どちらを正本にするかを先に決める。
- 新旧のカードが同じデッキに混ざる(H2C-A と同じ)。枚数管理は新 Hermes 7種から始めるのが安全。

## 3. デッキ構築画面で Esc が効かない不具合

### 3.1 再現(実機・OS キー入力)
`tools/mz_cdp/h2cb1_esc.cjs`(`keybd_event` による OS レベル入力。CDP のキー送信は使わない)。修正前は **13 項目中 7 が PASS**:

- ProjectR メニューからデッキ構築を開いて Esc → 戻れる(PASS)。
- **イベントのスクリプトなどから直接開いた画面**(`ProjectRMenuIntegration.openDeckBuilder()` など)では、デッキ構築・Ultimate 選択・インベントリ・指輪の4画面すべてで Esc が**無反応**(FAIL)。X・B・右クリックは効く(PASS)。

### 3.2 原因と分類
**分類: ゲームの不具合**(キー割り当てや自動テストの限界ではない)。

1. ゲームのキー割り当て(Hendrix Button Config)では Esc(27)は `menu` に割り当てられ、X・B は `escape`(Cancel)です。MZ 標準の `Input._isEscapeCompatible` により cancel と menu は `escape` として扱われますが、Esc キーそのものは `menu` です。
2. `ProjectR_MenuHUD.js` の `supportStandardWindow` は、ProjectR の画面だけ `isCancelTriggered` に `Input.isTriggered("menu")`(= Esc)を足していました。対象の判定が「シーンスタックに `Scene_ProjectRMenu` を含むか」でした。
3. 直接開くとスタックは `[Scene_Map]` で `Scene_ProjectRMenu` を含まないため、対象外になり、Esc だけが無視されました(X・B・右クリックは標準の cancel なので効く)。

### 3.3 修正(最小)
`js/plugins/ProjectR_MenuHUD.js`: 判定に「その画面自身が `Scene_ProjectRPage` か」を足しました(スタック判定は残す)。

```js
function isProjectRPage(scene) {
    return typeof Scene_ProjectRPage === "function" && scene instanceof Scene_ProjectRPage;
}
function isProjectRSubmenu(scene) {
    return scene instanceof Scene_MenuBase &&
        (SceneManager._stack.includes(Scene_ProjectRMenu) || isProjectRPage(scene));
}
```

画面の表示「Esc:戻る」どおりになります。X・B・右クリックは従来どおり。戦闘中の Q/E/X/C/V には触れていません。

### 3.4 結果
- 実機(OS 入力・修正前 7/13 → **修正後 13/13**)。直接開いた4画面の Esc、入れ子(一覧で Esc → 絞り込みへ、もう一度 Esc → マップ)、メニュー経由(1段ずつ戻る)、直後にメニューが勝手に開かない、戦闘中(Esc は何もしない・Q/E/X/C/V は各1回だけ使用)、押されたままのキー無し、Console エラー無し。
- 自動テスト `tests/ProjectR_H2CB1.test.cjs`(Esc を `menu` に割り当てた状態で、直接開く・メニュー経由・X・B・右クリックを確認)。
- 付随: 詳細欄のラベル「所持・コピー上限」を「デッキ内 N / コピー上限 M枚」に変更(§1 のとおり「所持枚数」は存在しないので、誤解を避ける表示だけの修正)。
- 付随: `tools/mz_cdp/os_input.ps1` のサーバーを終了/stdin 切断した時に、押されたままのキーを必ず離す処理を追加。

## 4. 旧セーブ読込時の VisionOcclusion 系エラー

### 4.1 再現(保護コピーのセーブ・本物のロード画面経路)
既存のセーブ(slot1/slot2)は**コピー**を `StorageManager` に向けて読み込み、書き込み(`saveObject`)は例外で拒否しました。本物の `save/` は読み書きしていません(§5.2 のハッシュで確認)。

```
TypeError: Cannot read property 'pages' of null
  at Hendrix_TemplateEvent.Game_Event.page (rmmz_objects.js)
  at eventTags (ProjectR_VisionOcclusion.js:140)
  at snapshot (ProjectR_VisionOcclusion.js)
  ...
```
- マップ: `mapId 1`、`Scene_Map`、プレイヤー(29,19)、イベント7件(slot1)。
- 同じ原因の2つ目: slot2 では視界の呼び出しの前に、Hendrix の `Sprite_Character` が `event().meta` で止まった(`SceneManager.catchException` でゲームループ停止)。

### 4.2 原因
Hendrix が**生成した(spawn した)イベント**は、セーブにテンプレートイベントの番号 `_templateEventId` だけを残します。ツクールでテンプレートマップを編集した後、その番号が現在のテンプレートマップに無いと、`event()` が `null` を返し、標準の `Game_Event.page()`(`this.event().pages`)が例外を投げます。データが変わったセーブは直後に標準の「マップ再読込」で作り直されますが、その直前の数フレームの間に古いイベントが残り、視界(VisionOcclusion)などが `page()` を呼んで止まります。データが変わっていない保存(再読込されない)でも同じ古いイベントが残り、Hendrix のスプライトが止まります。

**VisionOcclusion 自体の不具合ではありません**(Region 255/254・VisionWall・VisionKeepVisible・暗闇描画・CombatOcclusion は原因ではない)。`ProjectR_VisionOcclusion.js` / `ProjectR_CombatOcclusion.js` は固定テスト(`ProjectR_OcclusionRecovery.test.cjs`)の対象で、**変更していません**。

### 4.3 修正(最小・保存データは書き換えない)
新規 `js/plugins/ProjectR_SaveLoadGuard.js`(`plugins.js` の `ProjectR_VisionOcclusion` の直後に1行登録):
1. ロード直後(`DataManager.extractSaveContents`)に、**元のテンプレートが現在のテンプレートマップに無い生成イベント**だけをメモリ上のマップから外す(標準のマップ再読込が生成イベントを消すのと同じ結果)。ファイルは上書きしない。通常のイベント・テンプレートが有るイベントは触らない。
2. `Game_Event.prototype.page` だけを包み、`event()` が空のイベントでは `null`(有効なページ無し)を返す(例外で止まらないための保険)。

診断用: `ProjectRSaveLoadGuard.staleEvents()` / `lastPurged()`。

### 4.4 結果(実機・保護コピー・本物の Scene_Load 経路)
| セーブ | 修正前 | 修正後 |
|---|---|---|
| slot1 | `page` の例外でエラー画面 | エラー 0・ゲームループ動作・`Scene_Map`・外した生成イベント `{mapId:1, eventId:5, templateEventId:2}` |
| slot2 | Hendrix スプライトで停止 | エラー 0・ゲームループ動作・`{mapId:1, eventId:8, templateEventId:2}` |

読込直後と、デッキ構築画面を開閉した後で、指輪・所持・Level・デッキは**完全に同じ**(黙った移行なし)。新 Hermes の一括付与の記録も作られない(両セーブとも指輪未所持・所持0・デッキ0の旧形式)。

## 5. 本番統合・回帰の確認

### 5.1 自動テスト
- 全体: **57 ファイルすべて PASS**(開始時 56 + 新規 `ProjectR_H2CB1.test.cjs`)。

### 5.2 既存セーブの保護
`save/` の5ファイルの SHA-256 は作業前後で**同一**(config / file0 / file1 / file2 / global)。検証はコピーだけを読み込み。

### 5.3 実機(Playtest)
実際の RPG ツクール MZ(NW.js 0.48.4 / Chromium 85)で実行した結果は §7 に記録しました。

## 6. 次の Phase(H2C-B2)の前に決めること
1. **旧セーブの所持コピーの扱い**(§2.2 の A/B/C)。推奨は A(現状維持)+ 新規入手分から枚数管理。
2. **保存場所**: 別の版つき領域(§2.1 推奨)か、Core の拡張(固定テスト更新が必要)か。
3. ストレングス(10枚)など上限の高いカードを、最初から全枚数付与するか、段階的に付与するか(ボス・NPC・強化の設計)。
4. 指輪を入手する**物語イベント**(未作成のまま。H2C-A の入口 `AcquireHermesRing` を使う)。
5. 旧 Hermes カード(認識阻害・葦笛睡眠・Hermes 剣術・高速移動)と新カードの共存・置換方針(H2C-A から未決)。

## 7. 実機の確認結果

### 7.1 実行結果(すべて終了コードと最後の合計を確認済み)
| スクリプト | 内容 | 結果 |
|---|---|---|
| `h2cb1_esc.cjs` | デッキ構築画面の Esc(OS キー入力) | 修正前 7/13 → **修正後 13/13** |
| `h2cb1_verify.cjs` | 所持の監査・旧セーブ読込(保護コピー)・デッキ30枚・冪等な入手 | **11/11** |
| `h2ca_verify.cjs` | H2C-A 回帰 | 21/21 |
| `h2ca_manual_os_input.cjs` | H2C-A の OS キー入力 | 9/9 |
| `regress.cjs` | 基本回帰 | 8/8 |
| `h2a_verify.cjs` | H2A 回帰 | 23/23 |
| `h2b1_verify.cjs` | H2B-1 回帰 | 17/17 |
| `h2b2_verify.cjs` | H2B-2 回帰 | 14/14 |
| `h3a_verify.cjs` | H2B-3A(ヴェイル)回帰 | 1回目 15/17(R4a・R4b 失敗)、**再実行2回とも 17/17**(§7.2) |
| `h3b_verify.cjs` | H2B-3B(プシュコポンポス)回帰 | 39/39 |

これらの実機スクリプトは**スクリプトによる自動入力**であり、人間が手で操作した確認ではありません。人間による手動確認は未実施です。

### 7.2 h3a_verify の R4a・R4b について(正直な記録)
- 1回目の実行で R4a・R4b の2項目だけ失敗しました(証跡: `docs/evidence_h2cb1/h3a_run1_FAILED_R4a_R4b.json`)。内容は「ヴェイル発動直後(Q を押して6フレーム後)に、敵がまだ追跡状態で `checkRange` が `true`」でした。
- 同じスクリプトを、コードを一切変えずに2回再実行し、**2回とも 17/17 PASS**(`h3a_run2_pass.json`、`h3a_run3_pass.json`)。
- このスクリプトは、ヴェイルの発動 → 6フレーム後の敵の検知状態という**時刻合わせに依存**する検査で、今回の変更ファイル(`ProjectR_MenuHUD.js`・`ProjectR_SaveLoadGuard.js`・`ProjectR_DeckBuilder.js`・`ProjectR_MenuCore.js`)はヴェイルや敵の検知処理に触れていません(`SaveLoadGuard` の `page()` 包みは、有効なイベントでは元の処理をそのまま呼びます)。
- ただし、1回目の失敗の原因を完全には特定していません。「時刻合わせによる断続的な失敗」は推定であり、確定ではありません。3回中2回成功という事実のみを確定事項とします。未解決事項として最終報告に残します。

### 7.3 保存データの保護
`save/` の5ファイルの SHA-256 は、全テストの前後で一致しました。

| ファイル | SHA-256 |
|---|---|
| config.rmmzsave | `2f0a5000b94b35b1fc97d0f94911571f31a50856c1a6fce3e1491f4490076673` |
| file0.rmmzsave | `3ff692fcfc7d7289be72ef56f1c07335594c6e2fb58bcf38af4cd43254b7ffba` |
| file1.rmmzsave | `7534fc6c9c817cc6f3eb4b982fc8a8b0c3cc3ab414bf66460361a6a2ec009a64` |
| file2.rmmzsave | `b9db7c4f27ea1078de561eba22aa5ae016f4685371bad719cef1dd7eeb814bef` |
| global.rmmzsave | `9535c150402acaaec69c4117c19919d7c641ebd96fa4b666857e3b33a211732f` |

保護対象の元プロジェクト `ProjectR` は変更していません。

### 7.4 証跡
`docs/evidence_h2cb1/` に結果の JSON を保存しました(Esc の修正前/後、`h2cb1_verify` の結果、h3a の3回分)。
