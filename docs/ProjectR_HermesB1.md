# ProjectR Hermes 薙ぎ払い・葦笛 と 絶の取引修復(Phase H2B-1)

正本: `C:\Users\hmats\Documents\RMMZ\_ProjectR_DesignSources\ProjectR_CardManagement_Template(3).xlsx`(「カード一覧」行6=薙ぎ払い・行7=葦笛。SHA-256 `babd70c70f3ce0f52f622c4464835eacb4df3d305ecc48a53e84b627505dd32c`、期待値と一致)。
前のコミット: `1ff45cb`(Phase H2A)。本Phaseは一閃・サイコポンポス・ヴェイル・ストレングスを実装しません。

## 1. ランタイムID・定義(設計IDはランタイムIDではない)

| 設計ID | カード | ランタイムID | 強さ | 最大枚数 | 最大Lv | Cooldown | 対象タイプ | Plugin |
|---|---|---|---|---|---|---|---|---|
| 5 | 薙ぎ払い | `hermes_sweep` | 通常 | 3 | 3 | 0.5秒 | direction | `ProjectR_HermesSweep.js` |
| 6 | 葦笛 | `hermes_reed_flute` | 強力 | 3 | 3 | 8秒 | instant(ワークブックは「その他」=狙いを使わない) | `ProjectR_HermesReedFlute.js` |
| 7 | 絶 | `hermes_zetsu` | 強力 | 5 | 3 | 0.5秒 | ground | `ProjectR_HermesZetsu.js` |

定義は `ProjectR_CardCatalog` が実行時に追加します(旧7枚の `CardDefinitions` とセーブは不変)。新カードは既定で**未所持**です。旧「Hermes剣術」「葦笛睡眠」は削除・上書きせず**共存**しています(置換するかどうかはユーザー判断・未決)。保存デッキ・指輪・Apolloは変更していません。30枚の最終デッキは付与していません(`isFinalDeckReady()` は false)。

## 2. 絶の取引の修復(予備動作の後に消費)

不具合: H2Aでは「カード消費 → 8frameの予備動作 → 移動」の順で、予備動作中に目的地へ着地できなくなると、消費済みのまま動かない(`wasted:true`)ことがあった。

修復後の流れ:
1. **予約**: 発動キーで移動先(画面内に制限・安全な着地点)を計画する。有効なら予備動作に入るが、**カードは消費しない**(手札・山札・捨て札・Cooldown・Ultimateゲージ・強化はそのまま)。腕クロス・Hermes・出発点のノイズ・カットインは予約時に出る。呼び出し側へは `{ ok:false, reason:"pending", pending:true }` を返す(消費されていないので成功ではない)。
2. **確定**(8frame後): 現在地から固定の移動先へ着地点を**再計算**する。通る場合だけ、`requestUseCard` の正規経路でカードを**1回だけ**消費し(Cooldown・補充・ゲージも1回)、同じ処理の中で移動・強化・速度係数を適用する。予約時の演出は確定で重ねない(`ProjectRCardModifiers.skipPresentationOnce`)。
3. **中止**: 着地できない・手札からカードが消えた・戦闘が終わった・操作できない・死亡・マップ移動・ロードの場合は、何も消費せず予約と演出(召喚・腕クロス・VFX・カットイン)だけを片付ける。結果は `{ aborted:true, consumed:false }`。
- 予約中の別の絶(別コピー・連続入力)は `teleportPending` で非消費の失敗。他のカードは予約中でも普通に使え、確定時は **instanceIdで手札を探す**ので、手札の並びが変わっても正しい1枚を消費する。
- 移動先はマウス入力の瞬間に固定(確定時に再検証するだけで、マウスを読み直さない)。
- 承認済みの値は不変: Cooldown 0.5秒・最大5枚・強力・Lv1 x1.5 / Lv2 x2.0 / Lv3 x3.0 + 速度x2.0を1秒・強化は移動後0.8秒。
- 予約中に着地できなくなって中止された場合、予約時に出したカットインは同じ中止処理で片付けます(成功を示すカットインを残さない)。ただし中止までの数frameは表示されます。

## 3. 薙ぎ払い(`hermes_sweep`)

- マウス方向(発動の瞬間に固定)へ、プレイヤー中心から **190度 x 半径4マス**の扇。
- 当たり判定は実際の幾何: 敵Eventの攻撃判定矩形(`ProjectR_CombatOcclusion.eventPolygon`)と扇の重なり。190度は凸ではないので95度の2つの凸な扇に分け、`hasLineToPolygon(from, polygon, {radius, clipPolygon})` で判定する。壁(Region 255 / `<VisionWall>` / `<CombatWall>` / 通行不能タイルの縁)を通る敵には当たらない。固定のEvent IDは使わない。
- 各敵に1発動につき1回だけダメージ。ダメージは固定値(通常の剣/銃の武器ダメージとは別。絶の強化の対象外)。
- Lv1: 50 / Lv2: 先端1マス(中心から3〜4マス)に敵の体が触れたら +50(クリティカルの後に加算) / Lv3: このカードの攻撃のクリティカル率 +50%。
- 有効な発動(マウス方向が決まる)なら、敵に当たらなくてもカードを消費する。無効(マウスがプレイヤーと同じ位置など)は非消費。ダメージは消費が確定した後に与える。
- 演出: Hermesがプレイヤーの前に現れケーリュケイオンを振る(公式Swing Weapon)・白い杖の残像(VFX Designerライブラリ `ProjectR_Sweep_Staff`、発動方向へ回転)・主人公は腕を前に振り払う(`ArmSweep`)・通常カットイン・Hermesは黒いノイズ(`ProjectR_Hermes_Vanish`)とともに消える。効果音は仮にRTPの `Slash2`(Pluginパラメータで変更可)。

## 4. 葦笛(`hermes_reed_flute`)

- プレイヤー中心から半径8マス。敵の攻撃判定矩形が円に触れ、壁を通らずに届く敵が対象(複数可)。
- 睡眠は旧葦笛と同じState 32(`<ProjectRCard: hermes_reed_flute_sleep>`)を公式AddStateで付与(耐性は公式に委譲)。睡眠中の敵のZzzふきだしは既存の `ProjectR_WeaponPresentation` が表示する。
- 起床: 敵がダメージを受けたら(実際にHPが減ったとき)起きる。回避・無効・0ダメージでは起きない。
- Lv2: このカードで眠らせた敵への**最初の命中**に +50(最終ダメージへの加算)。Lv3: その命中はクリティカル確定。命中の「前」に睡眠状態を見て決め、命中して初めて起こす。起きた後は加算されない(1回の睡眠につき1回)。回避された攻撃には加算されない。
- 通常の剣/銃・カードの固定ダメージ・`<dmg:>` のスキルダメージなど、敵Eventへのプレイヤーのダメージはどれも同じ窓口(`ProjectR_CardModifiers` のヒットフック)を通る。
- 睡眠時間: ワークブックに指定が無いため、旧葦笛睡眠の `DurationSeconds`(4秒)を**引き継いだ**(新しい値は決めていない)。戦闘時間(カードのCooldownと同じ時計)で進む。
- 対象がいなくても有効な発動ならカードを消費する(Cooldown・補充)。旧葦笛睡眠の「付与0体なら非消費」は変えていない。睡眠は消費が確定した後に付与する。
- 演出: Hermesが前に現れて笛を吹く(DEV: 音符のふきだし)・白く半透明の水面の波(ライブラリ `ProjectR_Flute_Ripple`。プレイヤー中心・半径8マスいっぱい)・通常カットイン・Hermesは黒いノイズとともに消える。主人公は何もしない(`cardActions: "None"`)。笛の音は**未用意**。
- 共通Enemy AIがまだ無いため、睡眠中の敵が止まる接続は後続Phase(旧葦笛と同じ)。

## 5. 共有層の変更

- `ProjectR_CardModifiers`: ヒットフック(`registerHitHook`: 命中前の `prepare` で flat加算・クリティカル確定、命中後の `finish`)、固定ダメージ(`projectRFixed:{base, flat, critChanceBonus, source}`。基礎値→クリティカル判定→加算を1度だけ計算)、演出の二重発火防止(`skipPresentationOnce`)。公式のクリティカル抽選は1回だけ(確定指定のときだけ `itemCri` を一時的に1へ)。
- `ProjectR_CutIn`(カード3枚をカットイン対象に追加・`clear(kind)`)、`ProjectR_CharacterPresentation`(`ArmSweep`・`"None"`)、`ProjectR_GunSystem`(ArmSweep中も銃を隠す)、`ProjectR_GodSummonVisual`(カード別の前方位置 `forward`・黒ノイズで消える・音符のふきだし)、`ProjectR_PresentationVfx`(`rotate:"aim"`・`anchor:"event"`)。
- DEVアリーナ `ProjectR_CombatTestArenaHermesB1.js`(Playtest限定): `ProjectRHermesTest.start("sweep"|"flute"|"zetsu", level)`。
- 素材は自作のDEV素材(`tools/gen_dev_h2b1_assets.cjs`)。台帳は `docs/ProjectR_ThirdPartyAssets.md` の 2-c。

## 6. 設計の解釈(ユーザーが確認済みの仕様ではないもの)

| 項目 | 現在の実装 | 状態 |
|---|---|---|
| 薙ぎ払いLv3「クリティカル発生率50%上昇」 | 自然な率に +50パーセントポイント(加算。MZのCRIは加算で積む規則)。主人公の自然な率は10%なので約60%。相対(x1.5)ではない | **暫定**。ワークブックに加算/相対の明記なし。設計確認が必要 |
| 薙ぎ払いのLv1/Lv2のクリティカル | 主人公の自然なクリティカル率(10%)で確率的に起きる | 暫定(カード攻撃に自然な率を引き継ぐ解釈) |
| 薙ぎ払いLv2の「+50」 | クリティカル倍率の後に加算(倍率は掛からない) | 暫定 |
| 薙ぎ払いの先端 | 中心から3マス以上に敵の体(判定矩形)が触れていること | 暫定 |
| 葦笛の睡眠時間 | 旧葦笛睡眠から引き継いだ4秒(`SleepSeconds` パラメータ。0なら旧Pluginの値) | **継承**(新仕様ではない) |
| 葦笛Lv2/Lv3の対象の攻撃 | 睡眠中の敵に最初に命中した、プレイヤーのダメージ全般(剣/銃/カード)。1回の睡眠につき1回 | 暫定 |
| 葦笛の波の中心 | プレイヤー中心(効果範囲の中心)。ワークブックの「ヘルメースを中心に」とHermesの立ち位置(前方約1マス)は異なる | 暫定 |
| 旧カードとの関係 | 共存(置換未決)。保存デッキの移行は未着手 | **未決** |
| 音 | 薙ぎ払い: RTP Slash2を仮に使用。葦笛: 未用意 | 内容要件 |

## 7. テスト

- 自動: `tests/ProjectR_HermesSweep.test.cjs`(15)・`ProjectR_HermesReedFlute.test.cjs`(14)・`ProjectR_HermesZetsu.h2b1.test.cjs`(8)と共有フィクスチャ `ProjectR_HermesB1Fixture.cjs`。H1/H2Aの絶のテストは、消費が確定(移動)の時点になった新しい契約に合わせて更新した(弱めていない: 未消費の検証を追加)。固定値を持つ既存テスト(優先度表・VFXキー・カタログ)は新しい項目に合わせて更新。
- 実機(NW.js 0.48.4 / Chromium 85): `tools/mz_cdp/h2b1_verify.cjs`(絶の取引・薙ぎ払い・葦笛)、`h2a_verify.cjs`(剣・G17・絶の強化・Ultimateカットイン)、`regress.cjs`(F・U・メニュー・Vision)。結果と証跡は `docs/evidence_h2b1/`。HPは公式HPバーを読み、シーンのフレーム数で待つ(H2Aで見つけた1frame遅れの表示に対応)。

## 8. 検証結果(2026-10-29)

- 全自動スイート: **49/49 PASS**(編集前 46/46 → 新規3ファイル追加)。Chromium 85互換テストを含む。
- 実機(NW.js 0.48.4 / Chromium 85):
  - `h2b1_verify.cjs` **17/17 PASS**: 絶の取引(予約は未消費・確定で1回消費・着地不可で中止・連続入力・中止後に神/VFX/カットイン/予約が残らない)、薙ぎ払い(別Event ID・斜め・境界80度/115度・壁・外れても消費・Lv2先端+50・Lv3クリティカル・演出の片付け)、葦笛(半径8・壁・対象なしでも消費・起床・Lv2 +50・Lv3確定クリティカル・演出の片付け)、Console異常なし。
  - `h2a_verify.cjs` **23/23 PASS**(再実行): 通常の剣(Event ID 2〜6・6方向・重なった2体に1回ずつ)、G17、絶Lv1/2/3 × 剣/G17、Ultimateカットイン、メニュー、Console。
  - `regress.cjs`: R1〜R7 **7/7 PASS**(G17・剣・F・U・メニュー・Vision)。冒頭の証跡撮影ステップの `ENOENT`(旧スクリプトの相対パス)は、Phase H2B-2で修正した(`docs/ProjectR_HermesB2.md` の7節)。
  - HPは公式HPバーを読み、シーンのフレーム数で待った。
- セーブ5ファイルのSHA-256は、Playtestの前後で一致(config `2f0a5000…`・file0 `3ff692fc…`・file1 `7534fc6c…`・file2 `b9db7c4f…`・global `9535c150…`)。
- 証跡: `docs/evidence_h2b1/`(杖の残像・水面の波・Zzzのふきだし・カットイン・中止された絶など)と結果JSON。

### 未検証・未実施
- VFX Designer**エディタ**のload/preview/saveの往復は、本Phaseでは未実施(H2Aで既存2項目について確認済みの手順がある)。新しい3項目は `getAnimationFromLibrary` と実機再生(`showAnimationFromLibrary`)で読めて再生できることだけを確認した。杖の残像は回転のため、同じスプライトシートを公式Show VFXで再生している。
- Hermes・杖・波・ノイズ・腕の最終アート、葦笛の笛の音、薙ぎ払いの専用音。
- 薙ぎ払いの実機でのG17/剣の同時並行・Ultimate中の発動など、組み合わせの網羅。
