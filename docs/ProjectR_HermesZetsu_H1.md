# ProjectR Phase H1 — Hermes「絶」(Zetsu)・VFX層・カットイン層

2026-10-29。基準コミット `6062d39`。ブランチ `chore/update-action-combat-plugins-2026-09`。
対象は **Hermesの新設計7枚のうち「絶」1枚の完成**と、その上に載る**共通の演出基盤(VFX層・カットイン層)**です。
残りの6枚は実装していません(Phase H2以降)。

> 結論: 「絶」は**自動テスト(新規44件)と実際のMZ Playtest(Chromium 85 / NW.js 0.48.4、30項目)の両方で動作を確認**しました。
> ただし、VFX Designerの**エディタ(GUI)での開き直し・保存**、**音**、**出発前ノイズ(予備動作)**は未実施・未決です(第12節)。

---

## 1. 依拠した仕様(ワークブックの実際の状態)

| 項目 | 内容 |
|---|---|
| 見つかったファイル | `C:\Users\hmats\Downloads\ProjectR_CardManagement_Template.xlsx`(SHA-256 `711E548E4F7AA911…48D4DB2A`)。依頼文の `…Template(3).xlsx` という名前のファイルは、Documents / Downloads / Desktop のどこにもありませんでした。 |
| 「カード一覧」シート | **見出し(AU列まで)と通し番号1〜100だけで、カードのデータは1件も入っていません。** 集計シートも全て0です。 |
| 実際にデータがあるシート | 「記入例_絶」だけ(絶の記入例)。 |
| 採用した仕様 | **依頼文の表(7枚の強さ・最大コピー数・Cooldown)と「絶」の詳細仕様を正**とし、「記入例_絶」は補助として照合しました。 |

**依頼文と記入例_絶の食い違い(依頼文を採用し、実装は依頼文どおり)**

| 項目 | 依頼文(採用) | 記入例_絶 |
|---|---|---|
| 強さ | 強力 | 通常(最大コピー数5は例外) |
| Cooldown | 0.5秒 | 3秒 |
| 音 | (指定なし) | 布の擦れる音 → **素材が無いため未実装** |

他の項目(最大コピー数5、最大Lv3、Ground、マウス位置へ瞬間移動、×1.5/×2.0/×3.0、Lv3の速度×2.0を1秒、失敗時は非消費、Hermes演出、黒白ノイズ、左上/右上カットイン)は一致しています。
**どちらが最終なのかをご確認ください**(第13節 判断1)。

---

## 2. 絶の最終仕様(実装した内容)

| 項目 | 値 |
|---|---|
| runtime cardId | `hermes_zetsu`(ワークブックの設計ID 7 とは別の識別子) |
| 神 / 系統 / 強さ | Hermes / movement / strong(強力) |
| 最大コピー数 / 最大Lv / Cooldown | 5 / 3 / 0.5秒 |
| 対象 | Ground(マウス位置)。画面内に制限 |
| 移動 | マウス位置へ直線で瞬間移動。障害物があれば**その直前の最も遠い安全な位置**へ |
| 止まる障害物 | 通行不能な地形・通行不能Event(DotMoveの公式Collision)/ Region 255・`<VisionWall>`・`<CombatWall>`(CombatOcclusion)/ マップ端(ループ設定でも越えない) |
| 失敗 | 動ける地点が無い(その場を指す・壁に接して壁を指す・ほぼ動けない)。**カード消費・Cooldown・補充・強化・成功演出・移動のどれも起きない** |
| ダメージ強化 | 成功した移動から**0.8秒**(戦闘時間48 tick)、**最初に命中した通常の剣/銃**の最終ダメージを Lv1 ×1.5 / Lv2 ×2.0 / Lv3 ×3.0(**置換**) |
| Lv3の追加 | 移動後**1秒**、実効移動速度 ×2.0 |
| 強化の性質 | 1回の命中で消費 / 外れ・無効・0ダメージでは消費しない / 時間切れで消える / 公式クリティカルとは二重にならない / 再発動は置換(重ねがけしない) |
| 対象外 | カードの攻撃・Ultimate・継続ダメージ・敵がプレイヤーへ与えるダメージ |

### 累積レベル規則(全神共通。`ProjectRCardCatalog.resolveLevels`)

Lv2はLv1の効果を残して追加、Lv3はLv1・Lv2を残して追加。**同じ効果に後のレベルが新しい数値を与えたときは置換**します(加算・乗算しない)。

```
Lv1 { hitMultiplier: 1.5, hitSeconds: 0.8 }
Lv2 { hitMultiplier: 2.0 }                                      → 解決: { 2.0, 0.8 }
Lv3 { hitMultiplier: 3.0, speedFactor: 2.0, speedSeconds: 1.0 } → 解決: { 3.0, 0.8, 2.0, 1.0 }   (6.5でも9.0でもない)
```

Apollo / Janus / Themis / Athena の将来の実装にも同じ関数を使います(今の生きているカードの挙動は変えていません)。

---

## 3. 既存Hermesカード・セーブとの互換性

**方針: 旧カードとセーブは1文字も変えません。**

| 項目 | 状態 |
|---|---|
| `plugins.js` の `CardDefinitions`(旧7枚) | **不変**(7枚のまま)。絶は含めていません |
| 絶の定義の入れ方 | `ProjectR_CardCatalog` が起動時に `ProjectRCardDeck.definitions` へ**実行時に追加**(cardIdが既にあれば何もしない)。DefinitionRegistryと同じ正規化・凍結 |
| なぜ `CardDefinitions` に足さないか | 最初は足しましたが、**既存テスト26本が「本番カード=7枚」を前提に失敗**しました(山札を `CardDefinitions` から組むため)。旧セーブ・旧挙動を保つため、パラメータは据え置いてこの方式にしました。**テストを緩めて合わせてはいません** |
| 所持データ | 絶は**未所持が既定**。旧セーブ・本番デッキに影響なし。DEVのアリーナだけ開始時に所持にし、終了時に開始前へ戻す |
| セーブ項目 | **新規なし**(強化・速度係数・カットイン・VFXはすべて実行時のみ。テストで `$gameSystem` のキー集合が変わらないことを確認) |
| デッキ規則 | `DECK_SIZE=30`・コピー上限・所持/指輪の検証は**無改変** |
| 本番の最終30枚デッキ | `ProjectRCardCatalog.isFinalDeckReady()` は **false**(未実装6枚: 一閃 / サイコポンポス / ヴェイル / ストレングス / 薙ぎ払い / 葦笛)。`buildFinalHermesDeck()` は null。**設計7枚の最大コピー数の合計は丁度30** |
| 旧カードIDと設計7枚の対応 | **未確定のまま**(ユーザー判断)。参考候補だけをカタログに記録し、何にも使っていません: ヴェイル ≈ `hermes_perception_obscure` / 薙ぎ払い ≈ `hermes_sword_attack` / 葦笛 ≈ `hermes_reed_flute_sleep`。`hermes_swift_movement`(高速移動)は設計7枚に対応が無く、絶とは別カードのままです |

旧セーブを、この版で読み込んでも新しい項目は無く、この版のセーブを旧版で読んでも `hermes_zetsu` の所持は読み飛ばされるだけです(`normalizePersistentData`が未知IDを捨てる)。

---

## 4. 追加・変更したプラグインと責務

| ファイル | 役割 |
|---|---|
| `ProjectR_CardCatalog.js`(新) | Hermes 7枚の設計データ(読み取り専用)・累積レベル解決・絶の実行時定義・最終デッキ準備判定 |
| `ProjectR_CardModifiers.js`(新) | 戦闘時間で進む2種類の時限効果: **通常武器ヒット強化**と**移動速度係数**。実行時のみ・保存しない |
| `ProjectR_HermesZetsu.js`(新) | 絶のground handler。移動先の計算・コミット・ロールバック・成功確定後の演出呼び出し |
| `ProjectR_PresentationVfx.js`(新) | カードID→VFX Designerライブラリ→ワールド基準→後片付けの対応表。表示専用 |
| `ProjectR_CutIn.js`(新) | カットイン(通常=ラベル型 / Ultimate=中央大型)。表示専用 |
| `ProjectR_CombatTestArenaZetsu.js`(新・DEV) | Playtest限定。`ProjectRZetsuTest.start(level)` で手札5枚すべて絶のテストを開始 |
| `ProjectR_CharacterPresentation.js`(変更) | 動作 `CrossArms`(優先度80)を追加。`cardActions: { hermes_zetsu: "CrossArms" }` |
| `plugins.js`(変更) | 新6プラグインを登録(下記注意) |
| `js/AnimationSolutionLibrary.json`(新) | VFX Designerライブラリ(`ProjectR_Zetsu_Departure` / `_Arrival`) |
| `tools/gen_dev3h_character.cjs`(変更) / `tools/gen_dev_cutin_vfx.cjs`(新) | DEV素材の生成(既存の `$DEV3H_*` は再生成・上書きしていない) |
| `tools/mz_cdp/*`(新) | 実MZ検証のCDPスクリプト(起動中のPlaytestへ接続するだけ) |
| `tests/ProjectR_HermesZetsu*.cjs`(新4) / `ProjectR_CharacterAnimationGun.test.cjs`(変更2行) | 自動テスト |
| `docs/…`(本書・素材台帳・証跡) | 文書 |

**Hendrix(Action Engine / Animation Solution)・DotMove・`rmmz_*.js` は無改変**です(テストが `git diff HEAD` で検査)。

> `plugins.js` について: 作業開始時から、ユーザーのCasino関連4行が未コミットで入っています。**コミットでは私の6行だけ**を含め、Casinoの行は含めていません。

### 呼び出しの流れ

```
Q/E/X/C/V → ProjectR_CardBattleInput → ProjectRCardDeck.requestUseCard
  → [ProjectR_HermesZetsu.requestUseCard 外側ラッパー]
      → ground handler: 計画(状態を変えない) → 失敗ならここで終了(何も起きない)
                        成功なら Hermes一時召喚の中で: 移動 → 強化を用意 → (Lv3)速度係数
      → ルーターがカードを消費・Cooldown・補充(ここで初めて「成功」)
  → 成功が確定したら: VFX(出発点・到着点) / カットイン(ProjectR_CutIn) / 腕クロス(CharacterPresentation)
     ルーターが消費に失敗したら: 位置・強化・速度・召喚をすべて元へ戻す(ロールバック)
```

---

## 5. 瞬間移動の経路と衝突

1. マウス座標を画面内にクランプし、`player.screenX/Y` からのタイル差(従来の高速移動・Hendrixの `rotateTo(mouse)` と同じ基準)で移動ベクトルを作る。
2. マップ端(ループでも越えない)で距離を制限。
3. **CombatOcclusion** の `firstBlockerBetween`(本体矩形ごとスイープ)で Region 255 / `<VisionWall>` / `<CombatWall>` / 壁辺の最初の接触を求め、手前で止める。
4. **DotMove** の `createCollisionChecker().checkCollision` を短いstep(最大1/8タイル、矩形の半分以下)で進め、通行不能な地形・Eventに当たったら二分探索で境界まで詰める。
5. 着地点を最終確認(マップ内・壁と重ならない)。だめなら1/16タイルずつ手前へ。0.1タイル未満しか動けなければ**失敗**。

独自の衝突系は作っていません。カメラは追従スクロールのまま(瞬間では動かしません)。

---

## 6. 演出

### VFX(VFX Designer)
- 導入済み Hendrix Animation Solution **v2.0.7** のコマンドだけを使用(`showAnimationFromLibrary` / `showAnimatedPicture` / `removeAnimation` と `window.AnimatedPictureManager`)。**存在しないAPIは作っていません。Particles Builder は未導入**です。
- ライブラリの保存先は `js/AnimationSolutionLibrary.json`(導入版のコード上で確認)。**デザイナーのGUIで保存した形ではなく、導入版が読む項目を直接書いたもの**です。実機で `getAnimationFromLibrary` が両エントリを見つけ、再生できました(`library_ProjectR_Zetsu_Arrival`・8コマ・30fps・scale 120%・z=6)。
- **到着点**: ライブラリの「Show VFX from Library」をプレイヤーに(追従)。
- **出発点**: ライブラリ再生はプレイヤー移動後に**非同期**で作られるため出発点に置けません。同じスプライトシートを公式「Show VFX」の位置オフセット+stickModeで再生します(対応表の `anchor: "origin"`)。
- VFXは判定を持たず(コードに消費・ダメージ・Cooldown・移動の操作が無いことをテストで検査)、失敗しても結果は変わりません(例外・コマンド欠落でも成功)。

### カットイン(`ProjectR_CutIn`)
- 通常: 成功時だけ左上/右上ランダムでラベル型(Hermesの目元)。出すカードは `CutInCardIds` で**明示したものだけ**(既存カードの見た目は変えない)。連打しても1枚(置き換え)、54フレームで消える。
- Ultimate: `ProjectRCutIn.show({kind:"ultimate", godId})` で中央大型・神+主人公の目元・横/縦ランダム。**既存の Ultimate 発動への接続は次Phase**(現時点は呼び出し口のみ。実機で見た目は確認済み)。
- **描画順(実機で確認)**: `Tilemap` → `Vision` → `CutIn`(`_baseSprite` の最前)。CutIn層の最上段は**操作キャラクター本体の複製**で、カットインが主人公を隠しません。戦闘HUDはWindow層でさらに上。
  複製は本体Spriteだけ(銃のDisplay Weaponなど別Spriteは複製しない)。
- 戦闘を止めず、判定・操作・カード実行に介入しません。戦闘終了・マップ移動・ロードで消えます。

### キャラクター・神
- 腕クロス: DEV3Hの新動作 `CrossArms`(4コマ x 4方向)。**成功時だけ**再生。正面向きで胸の前に両腕が交差することを実機で確認。
- Hermes: 既存の一時召喚表示(`ProjectR_GodSummonVisual`)。「包む」演出は未実装(第12節)。

---

## 7. DEV素材

すべて ProjectR の自作(外部素材なし)。詳細は [ProjectR_ThirdPartyAssets.md](ProjectR_ThirdPartyAssets.md) の 2-b。

`$DEV3H_CrossArms_f4.png` / `Animation/ProjectR_Zetsu_Noise.png`(黒白ノイズ8コマ)/ `ProjectR_CutIn_Hermes_Eyes_DEV.png` / `ProjectR_CutIn_Player_Eyes_DEV.png`。最終アートは同名で差し替えるか、`ProjectR_CutIn` のパラメータだけで変えられます。

---

## 8. テスト結果

### 自動テスト(Node + 実エンジンのハーネス。MZ実機ではない)

| | 結果 |
|---|---|
| 編集前(全スイート `tests/*.test.cjs`) | **40 / 40 PASS** |
| 編集後 | **43 / 43 PASS**(旧40 + 新3) |
| 新規テスト | 44件(`ProjectR_HermesZetsu.test.cjs` 13 / `.combat.test.cjs` 18 / `.presentation.test.cjs` 13) |
| 既存テストの変更 | `ProjectR_CharacterAnimationGun.test.cjs` の2行のみ(動作 `CrossArms` を足したので、固定していた優先度表・動作名の一覧に `CrossArms` を追加) |
| Chromium 85互換テスト | 維持(新ファイルも自動で検査対象。通過) |

新規テストの範囲: 瞬間移動の経路・壁(地形/Event/Region 255/`<VisionWall>`/`<CombatWall>`)・安全な着地・失敗の原子性・画面外クランプ・マップ端 / Lv別倍率(**剣と銃**)と**実弾**での命中 / 1回だけ・外れ・失効境界(47/48 tick)・公式クリティカルとの非二重化 / **5枚の絶**での二重発動・二重強化なし / 速度の復元と他の係数の保全 / 戦闘終了・移動・ロードの後片付け / ルーター失敗時のロールバック / VFXの隔離・後片付け / カットインの状態・描画順・画像欠落 / 腕クロス / 登録・読み込み順・第三者製プラグイン無改変。

### 実機(MZ Playtest)

`nw.exe <project> test --remote-debugging-port=9222`(MZ 1.10.0 同梱の NW.js 0.48.4 / **Chromium 85.0.4183.121**)。新しいゲーム(`DataManager.setupNewGame`)→アリーナ(Map004)。実マウス(`Input.dispatchMouseEvent`)・実キー(`Input.dispatchKeyEvent`)で Q を押しました。
結果の全文: [evidence_zetsu_h1/zetsu_h1_real_mz_results.json](evidence_zetsu_h1/zetsu_h1_real_mz_results.json)。再現: `tools/mz_cdp/`。

| # | 確認 | 結果 |
|---|---|---|
| 0 | 全プラグイン読み込み・カード定義が実機で登録(8定義) | PASS |
| 1 | 有効な地面へ成功(5タイル右へ丁度5.00)/ 1枚消費・即時補充・Cooldown / Lv1強化 / カットイン / ライブラリ経由VFX2件(失敗0)/ 腕クロス | PASS ×5 |
| 2 | 通行不能な地形の手前で停止(y=26.97、壁は28) | PASS |
| 3 | 通行不能Event(DEV Impassable Event)の手前で停止(x=12.00) | PASS |
| 4 | **Region 255**で停止(地形は通行可。x=14.97) | PASS |
| 5 | **`<CombatWall>`**・**`<VisionWall>`** イベントで停止(x=14.97) | PASS ×2 |
| 6 | 失敗(その場/壁に接して壁を指す): 山札・手札・捨て札・Cooldown・位置・強化・速度・カットイン・VFXのどれも変化なし | PASS ×2 |
| 7 | **実G17の弾**: 基準 64 → Lv1 **96**(×1.5)/ Lv2 **128**(×2.0)/ Lv3 **192**(×3.0)、**次弾は64に戻る** | PASS ×3 |
| 8 | 剣の窓口(公式 `UpdateEventHp -player weapon`): 84 → Lv2 168 → 次84。実際のJキー(共通イベント1)では強化は消費されない | PASS ×2 |
| 9 | 0.8秒で自動失効(1.3秒後は強化なし) | PASS |
| 10 | Lv3: 移動直後 `distancePerFrame` が 0.0625 → **0.125(×2.0)**、1.3秒後に **0.0625 へ完全に復元**(`_moveSpeed` 不変) | PASS |
| 11 | 5枚の絶を続けて使用: 5回移動・強化は常に1つ | PASS |
| 12 | 描画順: `Tilemap` < `Vision` < `CutIn`(最前) | PASS |
| 13 | Console(F8)に赤いエラーなし | PASS |
| R1〜R7 | 回帰: G17(発射・弾数・リロード、旧Gunの復活なし)/ 剣(共通イベント1)/ F(調べる)/ U(Ultimate: Gauge不足で拒否)/ メニュー(Esc→`Scene_ProjectRMenu`→Escで戻る)/ Vision層 / 赤いエラーなし | PASS ×7 |

> 実機の確認は「Playtestを自動で操作して、ゲーム内の値と画面を読んだ」ものです。見た目の良し悪し(演出の格好よさ・音)はこれで判定していません。

### 証跡(画像)

| ファイル | 内容 |
|---|---|
| [zetsu_h1_cutin_hermes_vfx.png](evidence_zetsu_h1/zetsu_h1_cutin_hermes_vfx.png) | 成功直後: 左上のHermes目元カットイン、一時召喚のHermes(赤い結晶=DEVの暫定マーカー)、HUD |
| [zetsu_h1_noise_vfx_library.png](evidence_zetsu_h1/zetsu_h1_noise_vfx_library.png) | VFX Designerライブラリの黒白ノイズ(到着点・プレイヤーに重なる。確認用にループ再生) |
| [zetsu_h1_ultimate_cutin_over_player.png](evidence_zetsu_h1/zetsu_h1_ultimate_cutin_over_player.png) | Ultimate用の中央大型カットイン(神=上段/主人公=下段)の**上に操作キャラクターが描かれている**。HUDはさらに上 |
| [zetsu_h1_cross_arms_front.png](evidence_zetsu_h1/zetsu_h1_cross_arms_front.png) | 腕クロス(正面向き・拡大) |

---

## 9. セーブの保護

Playtest前に `save/` の5ファイルをバックアップし、SHA-256を記録しました。**Playtest後は5ファイルすべて完全に一致**し、更新日時も変わっていません(新しいゲームから開始・オートセーブは前回Phaseで停止済み)。

| ファイル | SHA-256(前 = 後) |
|---|---|
| config.rmmzsave | `2f0a5000b94b35b1fc97d0f94911571f31a50856c1a6fce3e1491f4490076673` |
| file0.rmmzsave | `3ff692fcfc7d7289be72ef56f1c07335594c6e2fb58bcf38af4cd43254b7ffba` |
| file1.rmmzsave | `7534fc6c9c817cc6f3eb4b982fc8a8b0c3cc3ab414bf66460361a6a2ec009a64` |
| file2.rmmzsave | `b9db7c4f27ea1078de561eba22aa5ae016f4685371bad719cef1dd7eeb814bef` |
| global.rmmzsave | `9535c150402acaaec69c4117c19919d7c641ebd96fa4b666857e3b33a211732f` |

---

## 10. あなたが手で確認する手順(MZのPlaytest)

1. MZのテストプレイ(New Game)を始め、F8のConsoleで `ProjectRCombatTestArena.enter()`。
2. 続けて `ProjectRZetsuTest.start(1)`(Lv2/Lv3は `start(2)` / `start(3)`)。手札5枚がすべて「ZETSU」になります。
3. マウスを地面の少し離れた所へ動かして **Q**。→ その地点へ移動し、左上/右上にHermesの目元、足元に黒白ノイズ、胸の前で腕が交差します。
4. 壁の向こうを指して **Q** → 壁の手前で止まります。自分の足元を指して Q → 何も起きず、カードも減りません。
5. 移動直後(0.8秒以内)に銃で敵(DEV Dummy)を撃つ → 1発だけダメージが大きくなります(`ProjectRZetsuTest.status()` で強化の有無を確認)。
6. 終わったら `ProjectRZetsuTest.end()`。**テスト中にセーブしないでください**。

---

## 11. 既知の事実(確認で分かったこと)

- **通常の剣(共通イベント1)は、Hendrix のチュートリアル由来の定義で、攻撃対象を Event 1 に固定**しています(`checkCollide(1,'<playerAttack>')` と `UpdateEventHp eventId=1`)。アリーナの Event 1 は「DEV Impassable Event」(敵ではない)なので、**今の共通イベントの剣は敵にダメージを与えません**。絶の強化は剣の命中も銃と同じ窓口(`UpdateEventHp ... player weapon` + 敵Event)で数えるため、**剣が敵へ当たるようになった時点で自動的に強化されます**(窓口で自動テスト済み)。共通イベントは変更していません。
- 同じ理由で、強化は「敵Event以外」への `player weapon`(例: Event 1、プレイヤー)では消費されません。
- 画面のHPは次フレームで更新されます(Hendrixのバー)。ヒット直後に読むと古い値になります。

---

## 12. 未実施・保留(正直な一覧)

| 項目 | 状態 |
|---|---|
| VFX Designer(エディタ)の**GUIでの開き直し・保存** | **未実施(保留)**。ライブラリJSONを直接書いて実機で再生までは確認。MZ側(プラグインのVFX Designerボタン、`showDockButton`)から `ProjectR_Zetsu_Departure/Arrival` を開いて保存し直し、見た目を調整する作業は手動です |
| 出発**前**の黒白ノイズ(体の上) | **未実装(判断待ち)**。瞬間移動を権威ある同期処理のまま保つため、ノイズは「出発点に残る」形(位置固定)にしています。体の上に出すには数フレームの予備動作(移動の遅延)が必要で、判断1の後に決めます |
| 神が主人公を「包む」演出 | 既存の一時召喚表示(赤い結晶の暫定マーカー)。Hermesの最終アートと「包む」配置は未実装 |
| 音(布の擦れる音) | **素材なし・未実装** |
| 銃装備中の腕クロス | 体は腕クロスですが、**銃のDisplay Weaponのスプライトが体の前に残ります**(隠す処理は未実装) |
| Ultimateのカットイン | APIと見た目は完成・実機確認済み。**既存のUltimate発動への接続は未実装**(既存の挙動を変えないため) |
| `manifest.json` | Playtest起動のたびにHendrixが自動生成し直します。**今回のコミットには含めていません**(ユーザーのCasino関連の未コミット変更と混ざるため)。Web配信する場合は再生成が必要です |
| 他の6枚 | 未実装 |

---

## 13. ユーザー判断が必要な仕様

1. **絶の強さ・Cooldown**: 依頼文 = 強力・0.5秒 / ワークブック記入例 = 通常・3秒。**現在は依頼文どおり。**
2. **旧カードID ↔ 設計7枚の対応**(ヴェイル≈認識阻害 / 薙ぎ払い・一閃≈剣術 / 葦笛≈葦笛睡眠 / 高速移動の扱い)。移行計画(旧セーブ互換)が必要です。
3. **出発前ノイズ**を体の上に出すための予備動作(例: 6〜10フレーム)を許すか。
4. **通常の剣**を敵に当てる経路(共通イベント1が敵Event 1固定)を、どう直すか(ProjectR専用の剣ヒット処理を別プラグインにするのが無難)。
5. 銃装備中の**腕クロス時に銃を隠す**か。
6. 最終デッキの**Hermes 30枚**を有効にするタイミング(7枚すべて実装後)。
7. 神の目元の**最終アート**とHermesの最終デザイン。

---

## 14. Phase H2 への推奨

1. **旧カードIDの移行計画を先に決める**(判断2)。これが決まらないと、残り6枚の `cardId`・保存・デッキ構築UIが固まりません。
2. 次に実装する2〜3枚は、**今回の基盤に乗るものから**: 「薙ぎ払い」(通常・0.5秒、Dynamic Hitbox)と「葦笛」(強力・既存の睡眠を新仕様へ)。VFX層・カットイン層・累積レベルがそのまま使えます。**ストレングス**(特殊・0.1秒・最大10枚)は、Cooldownが極端に短いので `ProjectR_CardModifiers` に別の係数が要るか最初に確認してください。
3. 通常の剣のダメージ経路(判断4)を整え、剣でも実機で強化を確認する。
4. VFX Designerで両ライブラリをGUIから開いて保存し直し、最終VFXに置き換える。
5. 7枚が揃うまで、本番の最終30枚デッキは有効にしない(`isFinalDeckReady()` がtrueになるまで)。
