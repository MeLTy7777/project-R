# Apollo「黄金の矢」(設計ID 8 / `apollo_golden_volley`) Lv1〜3(扇) — 実装メモ (Phase Apollo-A4 / A5A)

状態: **Lv1〜2 実装済み(A4)・Lv3 は「通常の扇」と長押しの分岐だけ実装済み(A5A)**。Lv3の**ビーム本体**(長押し0.5秒で1本の太いビーム・連続ヒット・ヒットストップ)は**未実装**(Phase A5B)です。ビームが完成するまで、本番の取得経路には載せていません(§10)。
正本: ワークブック `ProjectR_CardManagement_Template(3)(4).xlsx`(SHA-256 `8cb974a7…271b0`)の「カード一覧」Card ID 8。数値の控えは `docs/ProjectR_Apollo_Workbook_Snapshot.json`。
設計の監査と未決事項は `docs/ProjectR_ApolloCardDesignAudit_A0.md`(§13 が A4)。旧Apollo「黄金の弓矢」(`apollo_golden_arrow`)は**1文字も変えず共存**しています。

## 1. 仕様(ワークブックのとおり)

| 項目 | 値 | 出どころ |
|---|---|---|
| 強さ / 最大コピー数 / Cooldown | 強力 / 5枚 / 3秒 | ワークブック。Cooldownは `ProjectR_CardBalance.json`(`cooldownSeconds`) |
| 対象タイプ | Ground(マウス位置が撃つ方向を決める) | ワークブック。実行時も `ground` |
| Lv1 | 高速でまっすぐ飛ぶ黄金の矢を**3本同時**に発射。間隔は**15度**。1本につき**固定50ダメージ** | ワークブック |
| Lv2 | 矢が**5本**になる(間隔は15度のまま)。中央の1本が**太く**なり、当たった敵に**5秒間で計100**のスリップダメージ | ワークブック |
| 累積 | Lv2はLv1を残し、同じ効果の数値(本数 3→5)は**置換**。ダメージ50と間隔15度はLv1から引き継ぐ | `ProjectRCardCatalog.resolveLevels` |
| 壁 | 矢は壁を通り抜けない | ワークブック「壁越え: いいえ」 |
| 成功 / 失敗 | 射程内の敵にヒット = 成功 / 攻撃が外れる = 失敗(失敗は**カードを消費しない**) | ワークブック + 既存の非消費の方針 |
| 属性 | **無属性のまま**(割り当てない) | A3 までの決定 |

## 1b. Lv3(Phase A5A)

| 項目 | 内容 |
|---|---|
| 扇(tap) | Lv3は**離した時**に発動。0.5秒(戦闘時計で30更新)**未満**で離すと **11本・間隔10度**。中心は**離した直後のマウス方向**(押している間にマウスを動かしても、離した時の向きが中心) |
| Lv2の引き継ぎ | 中央(index 5)の矢だけ太く(0.9)、当たった敵へ5秒で計100のスリップ。1本50ダメージ・まっすぐ飛ぶ・非貫通・壁・VFXはA4と同じ |
| ビームの分岐(hold) | 0.5秒**以上**押して離すと「ビーム」の分岐を選ぶ。**ビームは未実装**なので**安全に失敗**(`beamUnavailable`): カードは消費せず、Cooldownは始まらず、扇も撃たない。Playtestだけ、プレイヤーの頭上に「沈黙」のふきだしとConsoleの案内、診断記録(`getBeamAttempts()`) |
| 1回の入力 | 1回の押下につき発動の依頼は1回(`session.activate`)。tapとholdの両方が出ることはない。キーリピートは無視 |
| 取消 | 押している間の手札の入れ替わり(`handChanged`)・会話/メニュー(`blocked:…`)・戦闘終了/フォーカス喪失/`Input.clear`(`reset`)・手動では何も発動しない(離しても扇もビームも出ない) |
| Lv1〜2 | 従来どおり**押した瞬間**に発動(押下セッションを作らない)。`registerPressProfile` の新しい `when()` が、Lv3のときだけ押下プロファイルを使う |
| 消費 | A4と同じ後払い: 扇のいずれかの矢が**最初に当たった瞬間に1回だけ**消費。全部外れたら非消費。確定待ち中の再入力(tap/hold とも)は `volleyPending` で拒否 |
| 数値 | Lv3の行 `{ projectileCount: 11, spreadDegrees: 10 }` だけを `ProjectR_CardBalance.json` に追加(それ以外はLv2から引き継ぎ)。F6エディタでLv3の本数・間隔を変えられる(偶数にすると中央の矢=太い矢・スリップは無くなる) |
| 0.5秒のしきい値 | プラグインの定数(`HOLD_SECONDS`)。ワークブックの値で、バランスJSONの項目にはしていない |

## 2. 仕様にない数値(仮の既定値。すべて `data/ProjectR_CardBalance.json` と開発用エディタ F6 で変えられる)

| 項目 | 既定 | 種類 | 備考 |
|---|---:|---|---|
| 矢の速さ `projectileSpeed` | 20 マス/秒 | 定数 | ワークブックは「高速」とだけ。MZの移動速度 6.41 相当(1frame 約0.33マス)。旧「黄金の弓矢」(速度6 = 15マス/秒)より速い |
| 射程 `rangeTiles` | 40 マス | 定数 | ワークブックは「射程 ∞」。壁・マップの端で必ず止まるので、40は安全網。長いマップでも変えられる |
| 細い矢の幅 `pathWidthTiles` | 0.3 マス | 定数 | 旧Prefabと同じhitbox |
| 太い矢の幅 `thickWidthTiles` | 0.9 マス | Lv効果(Lv1=0=太い矢なし / Lv2=0.9) | 「太くなる」の大きさが未記載。Lv3のビームは「3マス」と書かれている |
| スリップの分割回数 `splitTicks` | 5 回 | 定数 | 5秒間に1秒ごと(20 x 5)。合計は必ず100 |
| 矢の間隔 `spreadDegrees` | 15 度 | Lv効果 | Lv3で10に置換される予定(A5。未実装) |
| 本数 `projectileCount` | 3 / 5 | Lv効果 | 偶数に変えると中央の矢は無くなる(太い矢・スリップは奇数のときだけ) |

## 3. 命中までカードを消費しない仕組み(予約 → 確定)

ワークブックは「外れたら失敗」、プロジェクトの方針は「失敗は非消費」です。矢が当たるかどうかは発射の後(数十frame後)に分かるので、
`CardDeckCore` がそのまま使える **絶(Zetsu)と同じ二段階の取引**にしました(**CardDeckCore・Hendrix・DotMove は1文字も変えていません**)。

1. **予約**(発動キー): `ground` のhandlerがマウス方向を固定し、Apollo一時召喚を作って矢を発射し、ルーターへは「まだ消費しない(`reserved`)」と返す。
   呼び出し元には `{ ok:false, pending:true, detail:"volleyReserved" }` が返る。手札・山札・Cooldown・Ultimateゲージは変わらない。演出(弓・手・カットイン・閃光)はここで出る。
2. **確定**(最初の命中の瞬間): 手札に同じカードがあることを確かめ、`requestUseCard` の**正規の経路**で1回だけ消費する(Cooldown 3秒・補充・ゲージも1回)。その命中のダメージを与える。以後に当たる他の矢も、1本につき1回ずつダメージ(貫通なし)。
3. **外れ**: 全部の矢が壁・マップの端・射程・止まった、のどれかで消え、1本も当たらなければ失敗。**何も消費しない**(Cooldownなし・すぐ再発射できる)。
4. **重複防止**: 確定待ちの間は、同じカードの発動はスロットを問わず `volleyPending` で非消費の失敗(矢は増えず、消費は1回だけ)。
5. **確定に失敗する場合**(カードが手札から消えた・戦闘が終わった・消費の経路が失敗した): 矢を消して**何も与えない**(二重消費もしない)。
6. **片付け**: 戦闘終了・マップ移動・ロード・プレイヤーの死亡で、飛んでいる矢・確定待ち・スリップを止める。矢はセーブに入らない(ロード後に残った矢のEventは除去する)。

結論: **安全な後払い(deferred settlement)は現行の CardDeckCore で成立します**。開発専用に留める必要も、規則を弱める必要もありません(ブロッカーなし)。

## 4. 矢の判定(幾何)

- 矢は公式の `spawnEvent`(Map002のPrefab「ProjectR Apollo Golden Volley Arrow」)で出し、`rotateTo` で発射時に一度だけ向きを設定し、移動はPrefabの公式 `moveToPosition('forward')`(追尾なし)。速さはイベントの移動速度。
- 命中・壁は、各frameの「前の位置→今の位置」を**掃く**判定(1frame約0.33マスでも、細い壁や敵をすり抜けない)。
  敵は公式のhitbox(`ProjectR_CombatOcclusion.eventPolygon` = Hendrixの攻撃判定)、壁は `firstBlockerBetween`(Region 255 / `<VisionWall>` / `<CombatWall>` / 通行不能タイルの縁)、マップの端と `<destroyProjectile>` は公式 `checkCollide`。
- 矢の位置は「見た目の中心」(`screenX/Y`)、体の大きさは公式の `hitboxData`(幅 = 進行方向に直交、高さ = 進行方向)、向きは発射角から作る。
  ※ Hendrixのhitbox矩形をそのまま回すと、回転した矢のhitboxが**半タイル下へずれ、0度だけ別の式**になる(`eventPolygon` の回転式)ため、位置と向きは自前で作る。実機の見た目と当たりが一致することを実機で確認済み。
- 止まった矢(マップの端などで進めない)は4frame進めなければ外れ扱いで消し、寿命の上限(射程÷速さ + 1秒)も安全網にしている。

## 5. 演出(いずれも表示だけ。失敗しても消費・ダメージに影響しない)

| 要素 | 実装 | 素材(自作のDEV素材。`tools/gen_dev_a4_assets.cjs`) |
|---|---|---|
| Apolloが弓を引く | `ProjectRGodSummonVisual.swingWeapon("apollo", 角度, "ProjectR_Bow_DEV")`(公式Swing Weapon) | `img/pictures/ProjectR_Bow_DEV.png` |
| 主人公が手を前に突き出す | `ProjectRCharacterPresentation` の新動作 `ArmExtend`(`cardActions` に登録) | `img/characters/$DEV3H_ArmExtend_f4.png` |
| 通常カットイン | `ProjectRCutIn.show`(`CutInCardIds` に追加。目元はApolloの設定 = いまは仮でHermesと同じ画像) | 既存 |
| 黄金に輝く矢 | Prefabの絵(細い・太い) | `img/characters/VFX/$ProjectR_GoldenArrow(Thick).png` |
| 発射の閃光(黄金の電撃) | VFX Designerライブラリ `ProjectR_Volley_Burst`(発射角へ回して再生) | `img/pictures/Animation/ProjectR_Volley_Burst.png` |
| Apolloから漂う光の粒子 | ライブラリ `ProjectR_Volley_Particles`(Apolloの表示Eventへ結び付け) | `.../ProjectR_Volley_Particles.png` |
| 効果音 | プラグインパラメータ `SoundEffect`(既定 RTP の Chime2。ワークブックは「竪琴の1音」) | RTP |

- 演出は**発射時**に出し、確定(消費)では重ねて出さない(`CardModifiers.skipPresentationOnce`)。外れても発射の演出は出る。
- VFXは2件ともVFX Designerのライブラリに登録済みなので、VFX Designerで見た目を調整できる(`ProjectR_PresentationVfx` の対応表 `apollo_volley.burst` / `apollo_volley.particles`)。
- 弓は公式Swing Weaponの「振る」動作で表現している(「引き絞る」専用の動作は無い)。最終アートが決まったら画像だけ差し替える。

## 6. 追加・変更したファイル

| 区分 | ファイル |
|---|---|
| 新規 | `js/plugins/ProjectR_ApolloGoldenVolley.js`(本体) / `js/plugins/ProjectR_CombatTestArenaApollo.js`(DEVの入口。Playtest限定) |
| A5Aの変更 | `js/plugins/ProjectR_ApolloGoldenVolley.js`(v1.1.0)/ `js/plugins/ProjectR_CardBattleInput.js`(v1.3.0: 押下プロファイルに任意の `when()`)/ `js/plugins/ProjectR_CardCatalog.js`(`implementedLevels: 3`・`beamImplemented: false`)/ `js/plugins/ProjectR_CombatTestArenaApollo.js` / `data/ProjectR_CardBalance.json`(Lv3の行)/ テスト `tests/ProjectR_ApolloA5A.test.cjs` / 実機 `tools/mz_cdp/apollo_a5a_verify.cjs`・`apollo_a5a_os_input.cjs` |
| 変更(追加のみ) | `data/Map002.json`(矢のPrefabを1件追加。既存の8件は不変) / `data/ProjectR_CardBalance.json`(黄金の矢と項目 `spreadDegrees`・`thickWidthTiles`、`projectileCount`/`projectileSpeed` の予約印を外した) / `js/plugins/ProjectR_CardCatalog.js`(設計ID 8を実装済みにし、実行時に登録) / `ProjectR_CharacterPresentation.js`(`ArmExtend`) / `ProjectR_CutIn.js`・`ProjectR_GodSummonVisual.js`・`ProjectR_PresentationVfx.js`(黄金の矢の分) / `js/plugins.js`(2行 + CutInの対象) / `js/AnimationSolutionLibrary.json`(2件を末尾へ追加) |
| 素材 | 画像6枚(上の表) |
| テスト・ツール | `tests/ProjectR_ApolloGoldenVolley.test.cjs` / `tests/ProjectR_ApolloVolleyFixture.cjs` / `tools/mz_cdp/apollo_a4_verify.cjs` / `tools/mz_cdp/apollo_a4_os_input.cjs` / `tools/gen_dev_a4_assets.cjs` / `tools/gen_dev3h_character.cjs`(`ArmExtend`) |

## 7. Playtest で自分で試す手順(F8のConsole)

```js
ProjectRApolloTest.start(1)   // Lv1(3本)。2 なら Lv2(5本・太い中央+スリップ)、3 なら Lv3(11本の扇。短押しで離す)
```
マウスを敵へ向けて **Q / E / X / C / V**(手札5枚はすべて黄金の矢)。矢が飛んでいる間は手札のカードが減らず、**当たった瞬間**に1枚消費されます。外れたときは減りません。
`ProjectRApolloTest.status()` で確定待ち・飛んでいる矢・スリップ・直近の結果を読み取れます。`ProjectRApolloTest.setLevel(2)` でLvを変更、`ProjectRApolloTest.end()` で終了。
数値は **F6(バランスエディタ)** で「黄金の矢」を選んで変えられます(Playtest限定。製品のJSONは変わりません)。Apolloの指輪の入手イベントはまだ無いので、テスト用の入口だけが指輪を渡します(New Gameで使い、セーブしないでください)。

Lv3では、**短く押して離す**と扇、**0.5秒以上押して離す**とビームの分岐(未実装の表示: 頭上のふきだし)になります。`ProjectRApolloTest.status()` の `beamAttempts` / `press` で分岐と押下の状態を読めます。

## 8. 検証

自動テスト・実機(MZ Playtest)の結果は監査文書 §13.4 にまとめています。

## 9. 残っている決定と Lv3 への準備(§13.5)

- **確認済みの方針(ユーザー指示)**: 外れは非消費・属性は無属性・旧カードは不変・Lv3は別Phase・被ダメージの重ねがけ規則は変えない。
- **この実装で決めた仮の扱い**(後から変えられる。変えるときは数行): スリップの再命中は「置換」/ 矢は1本につき1回当たると消える(貫通なし)/ 直接ダメージの自然なクリティカルは他の固定ダメージのカードと同じ扱い(スリップは無し)/ 太い矢の幅と速さ・射程の既定値。
- **Lv3 のビーム(A5B)の前に必要**: ヒットストップ(全体停止か敵だけか、長さ)・連続ヒット(1マスあたり3ヒット。ヒット間隔・敵ごとの上限)・ビーム(幅3マス。掃き判定は `arrowBody` の幅を変えるだけ)・「各矢のダメージが収束」の定義(ビーム1本の合計がいくつか)・ビームの確定(消費)のタイミング(離した時か)。長押しの入力(tap/hold・取消・重複)は A5A で実装・実機確認済みで、holdの分岐は `activate` の `beamUnavailable` を置き換えるだけで繋げられる。詳細は監査 §14。

## 10. 本番の取得経路には載せない(Phase A5A)

Lv3 の長押し(ビーム)が未実装のうちは、黄金の矢を本番で入手できません。現状の根拠(テストで固定):
- Apollo の指輪の入手イベント・初期セットの付与(`apollo.ring.starter`)が**未実装**。Hermes の初期付与にも黄金の矢は含まれない。
- Apollo の30枚デッキは、他の7枚が未実装なので組み立てられない(`ProjectRCardCatalog.buildGodDeck("apollo") === null`)。
- カタログは `implementedLevels: 3` かつ `beamImplemented: false`(「完成」ではない)。Lv3 にできるのは開発用の `setCardLevel` / `ProjectRApolloTest` だけ。
- Apollo の指輪の入手を実装する Phase は、ビーム(A5B)の完成を確かめてから行うこと。
