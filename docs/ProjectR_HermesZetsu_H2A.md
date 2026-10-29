# ProjectR Phase H2A — 正本の確認 / 通常の剣の修復 / 絶の演出の完成

2026-10-29。基準コミット `d914f22`。ブランチ `chore/update-action-combat-plugins-2026-09`。
**残り6枚のHermesカードの効果は実装していません**(Phase H2B)。本番の最終30枚デッキも有効にしていません。

> 結論: ① 正本のXLSX(SHA-256一致)を読み、移行監査を作りました。② 通常の剣が敵に当たらない原因を実機で再現・特定し、`ProjectR_SwordSystem` で修復しました(実機で確認)。③ 絶の予備動作・CrossArms中の銃の非表示・Ultimateカットイン接続を実装し、実機で確認しました。④ 実機検証の過程で、**H1の `ProjectR_CardModifiers` の本物の欠陥**(強化が消費されずに残る)を見つけて修正しました。
> 自動テスト 全 46 ファイル PASS、実機 23 / 23 PASS、VFX Designerエディタのラウンドトリップ確認済み。**音は素材が無いため未実装**です。

---

## 1. 正本ワークブックとSHA-256

| 項目 | 結果 |
|---|---|
| 読んだファイル | `C:\Users\hmats\Documents\RMMZ\_ProjectR_DesignSources\ProjectR_CardManagement_Template(3).xlsx` と `…\ProjectR_Hermes_Cards_Excel_Transcription.md` |
| XLSX SHA-256 | `babd70c70f3ce0f52f622c4464835eacb4df3d305ecc48a53e84b627505dd32c` = **期待値と一致** |
| 読み取り | 「カード一覧」行2〜8・**全47列**。7枚: 一閃 / サイコポンポス / ヴェイル / ストレングス / 薙ぎ払い / 葦笛 / 絶。最大コピー数 3+3+3+10+3+3+5 = 30 |
| 使わなかったもの | 旧 `Downloads` の空テンプレート、「記入例_絶」(本番仕様ではない) |

詳細・曖昧点の一覧: **[ProjectR_Hermes_MigrationAudit_H2A.md](ProjectR_Hermes_MigrationAudit_H2A.md)**。数値の控え: [ProjectR_Hermes_Workbook_Snapshot.json](ProjectR_Hermes_Workbook_Snapshot.json)。
H1の絶の実装は、正本と**数値・仕様が一致**していました(H1が使った依頼文の表が正本と同じだったため)。

## 2. 設計ID ↔ ランタイムID(要約)

| 設計ID | カード | ランタイムID | 旧カードとの関係 | 状況 |
|---:|---|---|---|---|
| 1 | 一閃 | なし | なし | 未実装 |
| 2 | サイコポンポス | なし | なし | 未実装 |
| 3 | ヴェイル | なし | `hermes_perception_obscure` と近い(共存・判断待ち)。実行時の対象タイプは `Cursor`(Coreは未対応) | 未実装 |
| 4 | ストレングス | なし | なし | 未実装 |
| 5 | 薙ぎ払い | なし | `hermes_sword_attack` と近い(共存・判断待ち) | 未実装 |
| 6 | 葦笛 | なし | `hermes_reed_flute_sleep` と近い(共存・判断待ち) | 未実装 |
| 7 | 絶 | **`hermes_zetsu`** | なし(`hermes_swift_movement` は別カード) | **実装済み** |

旧カードは1枚も削除・改名していません。Apolloの3枚は対象外で保持。旧セーブの所持・デッキは変えていません。`isFinalDeckReady()` は false のままです。重複定義・二重発動は作らない(テスト済み)。データ(`ProjectRCardCatalog.migrationAudit()`)として持っています。

## 3. 通常の剣: 原因と修復

### 原因(実機とハーネスの両方で再現)
- 攻撃入力(左クリック/J)は共通イベント1を予約します。剣のとき、CE1(装備が `ロングソード`(武器ID 2)ならCE4)は、**衝突判定とダメージの対象に「Event 1」を直接書いて**いました:
  `checkCollide(1, '<playerAttack>', 0, 2)` → `UpdateEventHp eventId="1" value="-player weapon"` → `HP(1)<=0` なら `DestroyEvent 1`。
- 公式Action Combatのチュートリアルの攻撃は、Dynamic Eventの当たり判定(`<dmg: weapon>`、3フレームの寿命)を出し、**当たった側**が処理します。CE1の「1」は、ひな形に書かれた特定のEventで、ProjectRの敵(Event ID 2〜6など)ではありません。アリーナのEvent 1は「DEV Impassable Event」(敵ではない)です。
- 向きも4方向固定(`player ± 1` の座標)で、マウス方向ではありませんでした。
- **実機の再現**: 旧CE1を直接実行して剣を振ると、隣の敵(Event 4)のHPは 1000 → 1000 のまま。Event 1は敵ではないため何も起きません。

### Event 1 の扱い(一括置換はしていません)
CE1/CE4 の「1」は、すべて「攻撃対象」としての使用で、**共通イベントのデータ(`data/CommonEvents.json`)は変更しません**(ユーザーの未コミット変更を含むため)。代わりに、銃(`ProjectR_GunSystem`)と同じ入口で剣を処理します。

### 修復: `ProjectR_SwordSystem.js`(新)
- 攻撃入力が受理(CombatPresenceの判定通過)されたとき、**銃ではない武器を装備していれば**、旧CE1の予約を取り下げて、このPluginが斬撃を行う(素手は従来のCE1のまま)。
- 見た目: 公式Swing Weapon + Slash1(旧CEと同じ引数)。マウス方向の斬撃線と `SwordAttack` 動作は、従来どおり `ProjectR_WeaponPresentation` が描く。
- 当たり判定: 公式 `spawnEventHitbox`(Dynamic Event)。**マウス方向(360°)へ回転**。幅1.5×奥行1.2、前方1.0、寿命3フレーム(Parameterで変更可)。
- 命中: `<enemy>` の各Eventへ、公式 `checkCollide(その敵のID, 斬撃ごとの固有タグ)`。**IDをハードコードしない**。
- ダメージ: 公式 `UpdateEventHp(eventId=当たった敵, value="-player weapon")`。Databaseの武器ダメージで、攻撃者はプレイヤー(銃と同じ窓口)。Ultimateゲージの与ダメージ記録(`trackDamage`)も通る。
- 1振り1ヒット: 同じ斬撃で同じ敵に2回当たらない。複数の敵が重なれば全員に1回ずつ。連打は間隔(既定18フレーム)で制限。対象が居なければ何も起きない(例外なし・Event 1へのダメージなし)。
- 公式ドキュメントの `<dmg: weapon>` 方式を使わず、公式HPコマンドの `player weapon` を使う理由: `<dmg: weapon>` の当たり判定は、`checkCollide` の時点で武器ダメージ(回避・会心・State付与の抽選)を計算してしまい、`UpdateEventHp` でもう一度計算すると**二重に抽選**される。銃・絶の強化と**同じ1つの窓口**に揃えるため。

### 絶 × 剣
絶の強化は「`UpdateEventHp` の value に `player weapon` を含み、対象が敵Event」を通常武器の命中と数えるため、**新しい剣の命中は、銃と同じ窓口で自動的に絶の強化の対象**になります(Lv1/2/3 = ×1.5/×2.0/×3.0、1回で消費、外れでは消費しない、0.8秒で失効)。

### 実機検証で見つけたH1の欠陥(修正済み)
実機で剣の命中を調べたところ、**ダメージは正しく ×1.5 になっているのに、強化が消費されず残る**ことがありました。原因は、`$gameMap.getCurrentEventHp`(保存先の変数を読む)が、Hendrixのバーの**次フレームの更新**まで古い値を返すため、命中直後に読むと「HPが減っていない=外れ」と誤判定していたことです。H1の自動テストは偽のHPバーが即時更新だったため見逃し、H1の実機検証も(時間切れのタイミングで)通っていました。
**修正**: HPは公式HPバー(`_eventHpBars`)の `currentHp`(即時更新)から読む。**回帰テスト**(変数が遅れるHPバー)を追加し、**修正前のコードで失敗すること**を確認しました。実機でも、剣・銃とも「1回だけ強化・次は通常」を確認。

## 4. 絶の演出(Phase H1の残り)

流れ: **計画(状態を変えない)→ ルーターがカードを消費(成功確定)→ 予備動作 → 権威ある移動**。

| 時点 | 起きること |
|---|---|
| 成功確定(t=0) | 手札補充・Cooldown開始(0.5秒)。**DEV3Hの両腕クロス**、**Hermesが主人公の真後ろに現れる**(包む位置)、**出発点の黒白ノイズ**(VFX Designerライブラリ。移動後もその場に残る)、**通常カットイン**、**銃のスプライトが隠れる** |
| 予備動作(既定8 map frame ≈0.13秒) | 操作・入力・Cooldownは止まらない。無敵ではない(ダメージを受ける・Stateを付けない)。移動先は発動時に固定し、実行時に現在地から再計算 |
| 移動の瞬間 | 位置変更・強化(0.8秒)・Lv3の速度係数を用意。**到着点の黒白ノイズ** |
| その後 | CrossArms・Hermes・カットインが消え、銃が元の表示へ戻る |

- 二重発動の防止: 予備動作中の別の絶は `teleportPending` で**失敗(非消費)**。強化・速度係数は1つ(置換)。
- 取り消し: 戦闘終了・マップ移動・ロード・`eventsPaused` で予備動作は破棄/停止(後から移動しない・強化も残らない)。
- 稀な失敗: 予備動作中に目的地のすぐ手前まで歩くなどで**実行時に着地できない**場合は、動かず・強化も到着ノイズも出さず、結果に `wasted:true` と記録(カードは消費済み)。
- 認定済みの安全な着地(DotMove+CombatOcclusion)と、倍率(×1.5/×2.0/×3.0)・速度は**変更なし**。`WindupFrames` を 0 にすると H1 と同じく成功確定と同時に移動します。
- **CrossArms中の銃**: `ProjectR_GunSystem` が、公式Display Weaponが毎フレーム置いた後に、CrossArms中だけ銃スプライトの `visible` を落とし、終わると**隠す前の値へ戻す**(隠す前から非表示なら非表示のまま)。**装備・弾薬・リロード・攻撃可否は変えない**(隠している間も撃てる)。
- Hermesの位置: `ProjectR_GodSummonVisual` にカード別の位置(`CardOffsetsJson`、既定 `hermes_zetsu: x0, y-0.25`)を追加。他のカードは従来の右上のまま。見た目は既存の暫定マーカー(赤い結晶)で、**Hermesの最終アートではない**。

## 5. Ultimateカットイン

`ProjectR_CutIn` が、`ProjectR_UltimateActivation` の記録(`getLastUltimateActivationResult()`)を毎フレーム**読むだけ**で、`serial` が変わり、`ok=true かつ started=true` のときだけ、中央大型(神+主人公の目元、横/縦ランダム)を出します。無効な試行(Gauge不足)・古い結果・ロード直後では出ません。**Gauge・Divine HP・神・ダメージ・クールダウンには触れません**(テストでコードにそれらを呼ぶ語が無いことと、前後の値が同じことを確認)。描画順は通常カットインと同じ(Tilemap < Vision < CutIn < 操作キャラ複製。HUDはWindow層でさらに上)。

## 6. VFX Designerのエディタ確認

実際のエディタを、実機の Playtest のドックボタン(`▶️ VFX Designer`)から開いて確認しました。
- 「Animation Library」に、手書きのエントリ `ProjectR_Zetsu_Departure` / `ProjectR_Zetsu_Arrival`(2x4・30 FPS)が**正しく一覧表示**された。
- Arrivalを読み込むと、名前・スプライトシート(`Animation/ProjectR_Zetsu_Noise`)・行列・FPS・Scale 120・Z-Index「6 - Above Characters」が反映され、プレビューが再生された。※Offset Y が -48 と表示されるが、保存しても保存値は -24 のまま(表示上の違い)。
- 「Save to Library」で保存した結果: Departureは**変化なし**、Arrivalは `tintColor` の大文字小文字(`#FFFFFF`→`#ffffff`)と、エディタが付ける `name` / `characterSprite:null` が増えただけ。**スプライトシートのPNGも不変**。保存版のArrivalを実機で再生し、**元と同一**(8コマ・30fps・scale 1.2・z6・同じ位置)。
- 確認が終わった後、**ライブラリは元のファイルへ戻しました**(HEADとの差分なし。「動いているものを書き換えない」ため)。
→ **エディタのラウンドトリップは確認済み**(手書きのJSONでも、エディタで開いて保存し直して壊れない)。

## 7. 音

利用できる「布の擦れる音」は**ありません**。`audio/se`(RTP標準345本)に該当する音は無く(Wind/Moveは別の音)、OGGを作る道具も無いため自作もできません。**未導入の第三者素材は取り込んでいません。代用の音も鳴らしていません。** → **内容要件(未用意)**として残しています(絶: 布の擦れる音。必要になるまで `ProjectR_ThirdPartyAssets.md` の「不足している素材」に記載)。

## 8. テスト結果

### 自動(Node + 実エンジンのハーネス。MZ実機ではない)
| | 結果 |
|---|---|
| 編集前(全スイート) | **43 / 43 PASS**(H1の最終) |
| 編集後 | **46 / 46 PASS**(新規3ファイル) |
| 新規 | `ProjectR_SwordSystem.test.cjs` 10 / `ProjectR_HermesZetsu.h2a.test.cjs` 15 / `ProjectR_CardCatalog.audit.test.cjs` 7(+ 既存H1テストの更新) |
| 既存テストの変更 | `ProjectR_CharacterAnimationGun.test.cjs`: 「剣は旧CE1を実行する」という**今回修復した挙動そのもの**を固定していた1か所を、「旧CE1は予約せず `ProjectR_SwordSystem` が行う」に更新。H1の3ファイル: 予備動作の既定(フィクスチャで0frame=H1と同じ権威ロジックを検証)、出発点VFXがライブラリ+固定になった点、ルーター失敗時の確認方法 |
| Chromium 85互換テスト | 維持(新ファイルも検査対象で通過) |

新規テストの範囲: 剣(原因のデータ・各Event ID・8方向・複数ヒット・同一斬撃の再ヒットなし・対象なし・入口の条件(銃/素手/使えない状態)・絶との連携・ゲージ記録・後始末)/ 予備動作(順序・無敵でない・操作可能・二重発動防止・Cooldown・取り消し・稀な失敗・Hermesの位置)/ CrossArms中の銃(隠す・戻す・弾薬不変・撃てる・元が非表示の場合・実プレイ経路)/ Ultimateカットイン(成功・無効・古い結果・読み取りのみ)/ HP遅延の回帰 / 正本との整合・移行監査・セーブ互換。

### 実機(Playtest: NW.js 0.48.4 / Chromium 85.0.4183.121。実マウス・実キー)
結果の全文: [evidence_zetsu_h2a/h2a_real_mz_results.json](evidence_zetsu_h2a/h2a_real_mz_results.json)。再現: `tools/mz_cdp/h2a_verify.cjs`(HPは公式HPバーを、**シーンのフレームを数えて**から読む)。

| # | 確認 | 結果 |
|---|---|---|
| A | 絶Lv1/2/3 × 通常の剣: 基準84 → **126 / 168 / 252**(×1.5/×2.0/×3.0)、各1回だけ消費(ログ `consumed` が1件・Event 4) | PASS ×3 |
| B | 外れの斬撃では強化は消費されず、0.8秒で失効 | PASS |
| C | 絶Lv1/2/3 × G17(予備動作つき): 基準64 → **96 / 128 / 192**、次弾は64 | PASS ×3 |
| D | 演出の通し: 予備動作の間(移動前)に 腕クロス+Hermes+出発点ノイズ+カットインが同時に出る / 銃のスプライトは隠れ、終わると戻る(弾薬・装備不変)/ 移動後に到着ノイズ、Hermesは最後に消える | PASS ×3 |
| E | Ultimate: 無効な試行ではカットインなし・Gauge/Divine HP不変 / 成功時に中央大型(横・縦)/ 描画順 Tilemap < Vision < CutIn | PASS ×3 |
| F | **剣**: 旧CE1の再現(敵に当たらない)/ **Event ID 2,3,4,5,6 のどれでも**斬った敵だけに当たる / 東西南北・斜め6方向でマウス方向 / 重なった2体に1回ずつ・繰り返し当たらない / 対象なしで例外なし・Event 1無傷 | PASS ×5 |
| G | 回帰: G17の発射・F(調べる)/ 予備動作中に戦闘を終えると破棄され移動しない / メニューの開閉 | PASS ×3 |
| H | Console(F8)に赤いエラーなし | PASS |
| — | VFX Designerエディタのラウンドトリップ(第6節) | 確認済み |

測定の注意: HPバーは次のフレームで更新される(H1で判明)ので、ダメージは「シーンのフレームを数えて待つ」(スロー再生中も正しい)。スロー再生中はキー入力のトリガを取りこぼすため、剣のJ攻撃は等速で行いました。

### 証跡(画像)
`docs/evidence_zetsu_h2a/`: `h2a_presentation_departure.png`(予備動作中: 出発点のノイズ・腕クロス・Hermes・右上のカットイン)/ `h2a_presentation_arrival.png`(到着後)/ `h2a_ultimate_cutin_horizontal.png` / `…_vertical.png`(中央大型のUltimateカットイン)/ `h2a_vfx_designer_library.png` / `…_loaded_entry.png`(エディタ)。
**観察していないものは確認済みにしていません**: 音(未導入)、Hermesの最終デザイン(暫定マーカー)、見た目の良し悪し、VFXの最終アート。

## 9. セーブの保護
Playtest前に `save/` の5ファイルをバックアップしSHA-256を記録。**Playtest後は5ファイルすべて一致**(更新日時も不変)。

| ファイル | SHA-256(前 = 後) |
|---|---|
| config.rmmzsave | `2f0a5000b94b35b1fc97d0f94911571f31a50856c1a6fce3e1491f4490076673` |
| file0.rmmzsave | `3ff692fcfc7d7289be72ef56f1c07335594c6e2fb58bcf38af4cd43254b7ffba` |
| file1.rmmzsave | `7534fc6c9c817cc6f3eb4b982fc8a8b0c3cc3ab414bf66460361a6a2ec009a64` |
| file2.rmmzsave | `b9db7c4f27ea1078de561eba22aa5ae016f4685371bad719cef1dd7eeb814bef` |
| global.rmmzsave | `9535c150402acaaec69c4117c19919d7c641ebd96fa4b666857e3b33a211732f` |

## 10. 変更ファイル

| ファイル | 理由 |
|---|---|
| `js/plugins/ProjectR_SwordSystem.js`(新) | 通常の剣の修復 |
| `js/plugins/ProjectR_HermesZetsu.js` | 予備動作(計画→消費→予備動作→移動)、二重発動防止、取り消し |
| `js/plugins/ProjectR_CardModifiers.js` | **欠陥の修正**: HPを公式HPバーから読む |
| `js/plugins/ProjectR_GunSystem.js` | CrossArms中の銃スプライトを隠す(表示のみ) |
| `js/plugins/ProjectR_GodSummonVisual.js` | カード別の一時召喚の位置(絶=真後ろ) |
| `js/plugins/ProjectR_PresentationVfx.js` | 出発点のVFXをライブラリ+固定(stick)で出せるように |
| `js/plugins/ProjectR_CutIn.js` | Ultimate発動の記録を読んでカットインを出す |
| `js/plugins/ProjectR_CardCatalog.js` | 正本の項目(対象タイプ・初回入手枚数・コピー上限の例外)と移行監査 |
| `js/plugins.js` | `ProjectR_SwordSystem` の1行だけ(Casino行は含めない) |
| `tests/…`(新3・更新5) / `tools/mz_cdp/h2a_verify.cjs`(新)・`lib.cjs` | 自動テストと実機検証 |
| `docs/…` | 本書・移行監査・正本の控え・証跡・H1文書の追記 |

`data/*`・Hendrix・DotMove・`rmmz_*.js`・ユーザーのCasino・`AGENTS.md`・`manifest.json` は変更していません。

## 11. Phase H2B への準備状況

**着手できる(ブロッカーなし)**: 薙ぎ払い(Dynamic Hitbox・扇状は未実装だが `ProjectR_SwordSystem` と同じ構成で作れる)、葦笛、ストレングス(`ProjectR_CardModifiers` に「次の物理攻撃の攻撃力」係数を足す)。VFX層・カットイン層・累積レベル・強化の窓口は共通で使えます。
**先に決める必要がある**:
1. 旧カードとの関係(ヴェイル・薙ぎ払い・葦笛の「共存か置換か」)と、旧セーブの所持・デッキの移行処理(第2節・監査)。
2. 「対象なし時は消費する」(4枚)を、カード基盤が「成功」として扱う方法。
3. ヴェイルの `Cursor` 対象タイプ(Coreの `TARGET_TYPES` へ追加)と、**共通の敵AI(ターゲット選択)が無い**問題(「ターゲットを取られなくなる」の接続先)。サイコポンポスの「魂」の仕組み。
4. 曖昧点(監査の第4節)のうち、数値の意味(クリティカル+50%の意味、ストレングスと絶の倍率の順序など)。
**準備できていないもの**: 音の素材、Hermesの最終アート、予備動作の長さ(8frame)の最終判断。
