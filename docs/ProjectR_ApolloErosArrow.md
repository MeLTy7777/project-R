# Apollo「エロスの矢」(設計ID 9 / `apollo_eros_arrow`) Lv1 — 実装メモ (Phase Apollo-A6A)

状態: **Lv1だけ実装済み**。Lv2(3方向・1方向7本)・Lv3(追尾範囲7・中央がビーム)は**未実装**で、カードの登録上の最大Lvは1(Lv2〜3へ上げられない)。数値の一部と下の「仮の決め」は最終のバランス承認・設計の確定を待っています(F6で変更可)。Apolloの指輪の入手・初期セット・30枚デッキは未実装のままで、**本番では入手できません**(`ProjectR_ApolloGoldenVolley.md` §10 と同じ)。
正本: ワークブック `ProjectR_CardManagement_Template(3)(4).xlsx` の「カード一覧」Card ID 9。数値の控えは `docs/ProjectR_Apollo_Workbook_Snapshot.json`。

## 1. 仕様(ワークブックのとおり)
- 特殊 / 最大5枚 / Cooldown 5秒 / 対象タイプ Ground / 射程 ∞ / 壁越え **はい** / 最大Lv3。
- Lv1: ゴールドピンクの矢を連続で1秒間に10本放つ。途中で方向転換可能。放った矢の付近3マス以内に味方、敵がいた場合追尾する。味方に当たると一本につき50ヒール、敵に当たると一本につき20ダメージ。
- 演出: 連続で弓を引く動作 / VFX=小さな矢が輝き連続で放たれる / 色=ピンクゴールドと白 / 音=一本ごとに竪琴。

## 2. 実装の要点
| 項目 | 実装 |
|---|---|
| 連射 | 発動(予約)で始まり、**10本を60更新(1秒)に等間隔**(0,6,…,54更新目)。本数・時間は設定で変わる |
| 方向転換 | 矢ごとに**その瞬間のマウス方向**と**その瞬間のプレイヤー中心**から出る。連射の途中でマウスを動かすと、あとの矢の向きが変わる(出た矢の向きは変えない) |
| 矢 | 論理的な位置・向きをプラグインが持ち、見た目は専用の矢Event(`data/Map002.json` の新テンプレート「ProjectR Apollo Eros Arrow」。位置・向きは毎frame与える)。壁・Region・通行不能を通り抜ける。マップの端・寿命でだけ消える |
| 追尾 | 矢から対象の当たり判定(Hendrixのhitbox)までの距離が追尾の範囲(既定3マス)以内の対象へ、曲がる速さ(既定720度/秒)の上限つきで向きを寄せる。範囲の中にいる間は同じ対象を狙い続ける |
| 命中 | 矢が1frameに通った線(掃き)と対象の当たり判定の交差。1本につき1回、当たった矢は消える(貫通なし・二重命中なし)。複数の対象へ別々に当たってよい |
| ダメージ | 敵へ固定20(属性なし・弱点倍率1)。`UpdateEventHp`(`projectRFixed`)を1本につき1回通すので、既存の被ダメージ修飾・属性窓口・Ultimateゲージ・帰属を迂回も二重にもしない。自然なクリティカルは黄金の矢の直撃と同じ扱い |
| 回復 | 味方へ50(最大HPまで)。出撃中の仲間は `ProjectRPartyCombat.healAlly`、主人公(設定で有効なとき)は `actor.gainHp`(Hermesの回収と同じ) |
| 味方の特定 | 既存の `ProjectRPartyRoster`(主人公 + 出撃中の仲間。ダウンを除く)。任意のNPC・敵・召喚物は含まない。仲間のEventに `<enemy>` が付いていても敵として扱わない |
| 消費 | 黄金の矢と同じ後払い。発動では消費せず(`reserved`)、**最初の有効な命中**で正規の経路(`requestUseCard`)で1回だけ消費してCooldown 5秒。そのあとも残りの矢は撃ち続ける。全部外れたら非消費 |
| 重複発動 | 命中前は確定待ち(`volleyPending`)、確定後も**連射が終わるまで**(10本を放ち終えるまで)同じカードを発動できない(`sequenceActive`)。放ち終えたあと、飛んでいる矢が残っていても次を発動できる |

## 3. 仮の決め(ワークブックに無い。**仮であり確定ではない**。後から変えられる)
ワークブック(監査 §10 B5/B6)で未決だった次の点を、次のとおり**仮に**決めています。`data/ProjectR_CardBalance.json` / F6 で変えられるものは名前を併記。

1. **対象の優先**: 矢から対象のからだまでの距離が**最も近い対象**(敵と味方を区別しない)。同じ距離なら**味方を先**、次にEvent IDの小さい方。いったん狙った対象は範囲内にいる間は変えない。
2. **主人公自身の回復**: 既定は**回復しない**(`selfHealEnabled` = 0)。1にすると、放った位置から0.8マス以上離れた矢が、HPの減った主人公へ当たって回復する(矢が主人公を追って戻る)。
3. **HP満タンの味方への命中**: 既定は**当てない・追尾もしない(素通り)**(`fullHpAlliesEligible` = 0)。素通りなので、満タンの味方だけでは「有効な命中」にならず消費しない。1にすると満タンでも当たり(回復量0)、有効な命中として消費・矢の消滅が起きる。
4. **味方の範囲**: 出撃中の仲間(PartyCombatのセッションにいる人。ダウンは除く)。製品の仲間は現在0人なので、通常は敵へのダメージだけが起きる(主人公は2.の設定が有効なときだけ)。
5. **同じframeの複数命中**: 同じ味方に同じframeで複数の矢が当たるとき、先の矢でHPが満タンになったら後の矢は「無効な命中」として消える(重ねて回復しない)。敵に当たった矢が同じframeに倒した敵へ重ねて当たるときも同様に、後の矢は消えるだけでダメージを与えない。
6. **矢の速さ・寿命・曲がる速さ**: ワークブックに無いため、12マス/秒・2秒・720度/秒を仮に置いた(射程は 12 x 2 = 24マス)。

## 4. バランス設定(`data/ProjectR_CardBalance.json` の `apollo_eros_arrow` と F6)
| 項目 | キー | 既定 | 範囲 |
|---|---|---:|---|
| 本数 | `projectileCount`(Lv1) | 10 | 1〜50 |
| 連射の時間 | `emitSeconds` | 1 秒 | 0.1〜10 |
| 追尾の範囲 | `homingRadiusTiles` | 3 マス | 0〜20(0=追尾なし) |
| 曲がる速さ | `homingTurnRate` | 720 度/秒 | 1〜3600 |
| 矢の速さ | `projectileSpeed` | 12 マス/秒 | 0.1〜60 |
| 矢の寿命 | `projectileLifetimeSeconds` | 2 秒 | 0.1〜4(矢Eventの安全網が300frameのため上限4秒) |
| 敵へのダメージ | `damage`(Lv1) | 20 | |
| 味方への回復 | `healAmount`(Lv1) | 50 | |
| Cooldown | `cooldownSeconds` | 5 秒 | |
| 主人公の自己回復(仮) | `selfHealEnabled` | 0 | 0/1 |
| 満タンの味方に当てる(仮) | `fullHpAlliesEligible` | 0 | 0/1 |
| 属性・弱点倍率 | `element` / `weaknessMultiplier` | 0 / 1 | |
Lv2〜3の行を触っても、実装しているLv1の効果は変わらない(Lv2〜3は未実装)。Playtestのバランスエディタ(F6)は上の項目を表示・変更できる。

## 5. 演出(いずれも表示だけ。失敗しても消費・ダメージに影響しない)
- **発動時に1回**: 通常のカットイン(`apollo_eros_arrow` を `ProjectR_CutIn` の対象に追加)・主人公の片手(`ArmExtend`。連射の間ずっと)・Apolloの一時召喚の表示Event(連射が終わるまで)。確定(消費)でカットインや動作を重ねない(`skipPresentationOnce`)。
- **矢を放つたび(2本に1回)**: Apolloが弓を引いて放つ(公式Swing Weapon・`ProjectR_Bow_DEV`)・弓の先の閃光(VFX)・効果音(`ArrowSoundEffect`、仮のRTP Chime2)。毎本ではなく2本に1回にして、同時の表示物と音の重なりを抑える。
- **矢のVFX**: VFX Designerライブラリ `ProjectR_Eros_Glow`(飛ぶ矢のまわりの淡い光。同時に最大6本)。矢の見た目そのものは自作DEVの矢画像(`$ProjectR_ErosArrow`、ピンクゴールドと白)。
- **命中**: 敵へはピンクゴールドの火花(`ProjectR_Eros_HitDamage`)、味方へは癒しの光(`ProjectR_Eros_HitHeal`)。同時のVFXの上限は6。命中の効果音は `ImpactSoundEffect`(仮のChime1。4frameより近い命中は間引く)。
- 終わったVFXは一定frame後に公式のdisposeで確実に外す。矢のEventは命中・寿命・マップの端・取消で破棄する。
- 竪琴の効果音の素材はこのプロジェクトに無い。**不足している素材: 竪琴の1音**(今はRTPの Chime2 / Chime1 で代用)。専用音ができたらプラグインパラメータだけ差し替える。

## 6. 追加・変更したファイル(A6A)
新規: `js/plugins/ProjectR_ApolloErosArrow.js` / `tests/ProjectR_ApolloA6A.test.cjs` / `tests/ProjectR_ApolloErosFixture.cjs` / `tools/mz_cdp/apollo_a6a_verify.cjs` / `tools/mz_cdp/apollo_a6a_os_input.cjs` / `tools/gen_dev_a6a_assets.cjs` / `img/characters/VFX/$ProjectR_ErosArrow.png` / `img/pictures/Animation/ProjectR_Eros_Muzzle.png` / `ProjectR_Eros_Glow.png` / `ProjectR_Eros_HitDamage.png` / `ProjectR_Eros_HitHeal.png` / `docs/ProjectR_ApolloErosArrow.md`。
変更: `data/ProjectR_CardBalance.json`(カード1件・数値項目6つ)/ `data/Map002.json`(矢のテンプレート1件)/ `js/AnimationSolutionLibrary.json`(4件追加)/ `ProjectR_CardCatalog.js`(設計ID 9を実装済みに・maxLevel 1)/ `ProjectR_PresentationVfx.js`(VFXキー4つ)/ `ProjectR_CutIn.js`・`ProjectR_GodSummonVisual.js`(既定のカードID一覧に追加)/ `ProjectR_CombatTestArenaApollo.js`(`ProjectRApolloTest.start(1, "eros")`)/ `js/plugins.js`(Erosの1行とCutInのカードID1つ)/ `tools/mz_cdp/scripts.json`・`vfx_verify.cjs`(VFXのキー数 30)/ 件数が固定された既存のテスト(登録カード数・Apolloの実装済み数・VFXキー・Map002のEvent数)。
**変えていない**: 黄金の矢(Lv1〜3・扇・ビーム・チャージ)、Hermesの全カード、旧Apollo3枚、G17、剣、`ProjectR_CardDeckCore.js`、Hendrix、DotMove、`ProjectR_CardBattleInput.js`、`ProjectR_HitStop.js`、全体のダメージ規則、本番の初期デッキ、セーブ。

## 7. Playtestで自分で試す手順(F8のConsole)
```
ProjectRApolloTest.start(1, "eros")   // 手札5枚がすべてエロスの矢のテスト開始(アリーナ)
// マウスで狙い、Qで発動。連射の途中でマウスを動かすと、あとの矢の向きが変わる
ProjectRApolloTest.status()           // 手札・確定待ち・直近の結果
ProjectRApolloTest.end()
```
味方の確認: `ProjectRPartyCombat.registerAlly({actorId:2,name:"a",maxHp:400,normalAttack:{id:"n",range:1.5,cooldownSeconds:1}}); ProjectRPartyCombat.startSession([2]); $gameMap.event(6).linkedActorId = 2;` でEvent 6を味方にでき、HPが減っていれば矢が曲がって当たり50ずつ回復する。

## 8. 検証
- **自動テスト**: 全69ファイルが成功(新規 `ProjectR_ApolloA6A.test.cjs` 21件)。確認項目: 登録(特殊・5枚・Cooldown 5・最大Lv1・Lv3へ上げられない)・保護ファイル不変・バランスの項目と不正値の拒否・**10本が0,6,…,54更新目に出る**・**途中のマウス移動で後の矢の向きと出発点が変わる**・敵へ追尾して1本20(10本で200)と追尾なしの対照・追尾範囲の内外・味方への追尾と50回復(最大HPで止まる)・<enemy>が付いた仲間のEventは敵扱いしない・任意のNPCは素通り・満タンの味方(仮)・主人公の自己回復(仮)・**壁越え**(Region 255・<CombatWall>・<VisionWall>)・複数の対象と二重命中の防止・対象の優先(同距離は味方が先)・**最初の命中で1回だけ消費**(連射の途中・10ヒットでも1枚)・全外れは非消費・重複発動の拒否・取消(戦闘終了・マップ移動・ロード・戦闘不能・手札から消えた・敵の消滅)・演出が1回だけ(カットイン・ArmExtend)・一時オブジェクトの上限・UpdateEventHpが1本1回。登録カード数などが固定された既存の10ファイルは新しい数に更新。
- **実機(MZ Playtest。CDPの実マウス移動 + 実キーQ)** `apollo_a6a_verify` 11/11: 10本が60更新に等間隔・マウス移動で向きが 90→0→270 度へ変わる / 追尾して10本とも命中=200(矢Eventは同時に最大5・VFXの絵は最大10・一時オブジェクトは最大16。終われば全部0) / 追尾範囲の外(上5マス)は外れて非消費・すぐ撃ち直せる / 仲間のHPが100→400へ50ずつ(6本)・<enemy>枠のEventにダメージなし / Region 255の壁の向こうへ10本とも命中 / 3方向へ撃ち分けて敵と味方の両方へ(重複なし・ダメージ合計=命中数x20)/ 予約では消費せず最初の命中で1回(連射の途中=6本目まで放ったとき)・連射中の再発動は拒否 / 連射の途中の敵の消滅と戦闘終了で矢・VFX・Apollo・錨・召喚が全部0 / 黄金の矢 Lv1は50ダメージで従来どおり / Consoleのエラーなし。
- **OS入力** `apollo_a6a_os_input` 5/5(OSカーソル + 実キーQ): 10本が等間隔・追尾して合計200・予約→命中で1回消費 / 連射の途中で実カーソルを動かすと向きが右(86度)から真上(0度)へ変わる / 終了後の片付け / 押されたままのキーなし。1回だけ、ウィンドウの位置が変わって狙いがずれ失敗した(原因はウィンドウ位置の較正。再実行は成功)。人間の手動プレイの代わりではありません。
- **既存の回帰(実機)**: すべて失敗0 — apollo_a5c 8 / a5b 10 / a5a 10 / a4 11 / a3 11 / a2 8 / vfx 7 / verify 23 / regress 8 / h2a 23 / h2b1 17 / h2b2 14 / h3a 18 / h3b 39 / h2ca 21 / h2cb1 11 / h2cb2 25 / h2cb3 11 / h2cb4 16 / balance 29(a4・a3・a2・h2cb3・balance は「カード数」の固定値だけを新しい数へ更新して再実行)。OS入力: apollo_a5c 5 / a5a 6 / a4 6 / h3a 9 / h3b 8 / h2cb1_esc 13。
- **保護されたセーブ5ファイル**: 実行前後のSHA-256が**同一**。
- 証拠の画像(実機): 連射と追尾(`e2_homing_mid`)・味方への回復(`e4_ally_heal`)・壁越え(`e5_through_wall`)・複数の対象(`e6_multi`)。

## 9. 残っている決定・Lv2〜3
- Lv2「3方向(80度間隔)・1方向につき7本」: 連射の時間は1秒のままか、本数 21本の扱い(1方向の本数が7になる=合計21本?)と、方向転換の扱い(3方向がすべてマウスに追随するか)。
- Lv3「追尾の範囲7・まっすぐ飛ぶ矢がビームに変更・3秒間発射・毎秒味方300ヒール/敵80ダメージ」: 「まっすぐ飛ぶ矢」がどの矢か(各方向の中央の1本か)、ビームの幅・判定(黄金の矢のビームの基盤を流用できるが、味方への継続回復の窓口は未整備)。
- 上の「仮の決め」(対象の優先・主人公の自己回復・満タンの味方・矢の速さ/寿命/曲がる速さ)の確定。
- 竪琴の効果音の素材(仮のRTP Chime)・本番素材への差し替え(矢の絵・VFX)。
- Apolloの指輪の入手・初期セット・30枚デッキ(他のApolloカードの実装後)。
