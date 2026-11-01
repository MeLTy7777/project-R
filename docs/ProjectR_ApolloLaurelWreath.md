# Apollo「月桂冠」(apollo_laurel_wreath) — Phase Apollo-A7

設計ID 11 / Apollo / 支援 / 強力 / 最大3枚 / 最大Lv3 / Cooldown 8秒 / Buff(狙いなし = instant)/ 壁越え いいえ / 半径5マス。実装は `js/plugins/ProjectR_ApolloLaurelWreath.js`。数値は `data/ProjectR_CardBalance.json`(開発用エディタ F6)。軽減は共通の状態台帳 `ProjectR_ApolloStatus`(弱点の増分は `weaknessMode: "excessScale"`)。

## 1. ワークブックの記述(確定)
- Lv1: 効果範囲内に月桂樹の根を張り巡らす。操作キャラが移動すると根っこがその場に残ったまま範囲が増加する。根っこの生えている時間は7秒。根っこに触れている間、自分を含む味方が秒間回復50を得る。根っこに触れている間、被ダメージ-30%、弱点属性増加被ダメージ-90%。
- Lv2: 根っこに触れている間の移動速度が20%上昇し、敵が触れるとスリップダメージ秒間30ダメージ。
- Lv3: 敵の遠距離攻撃が発射されると、根っこの範囲に入った瞬間に根っこが壁をつくり、防ぐ。
- 演出: 後ろにApollo・指をはじく / 右手を上げる / 白と金の根っこ / 音「ジュルジュル」。

## 2. 実装(累積レベル)
| Lv | 効果 | バランスの項目(既定) |
|---|---|---|
| 1 | 使った瞬間に消費。使った場所に半径5マス・7秒の根のパッチ。使ってから7秒の間、操作キャラが2マス動くたびにその場へ新しいパッチ(最大12。各7秒で別々に消える)。根の範囲 = 生きているパッチの和。触れている味方(主人公+出撃中の仲間): 0.5秒ごとに25(秒間50)回復・被ダメージx0.7・弱点の増分x0.1(2.0→1.1) | `radiusTiles` 5 / `rootSeconds` 7 / `growSeconds` 7 / `trailStepTiles` 2 / `maxPatches` 12 / `laurelHealPerSecond` 50 / `laurelHealTickSeconds` 0.5 / `laurelDamageTaken` 0.7 / `laurelWeaknessScale` 0.1 |
| 2 | 主人公の移動速度x1.2(根の中だけ)。根の中の敵に秒間30(0.5秒ごとに15) | `speedBonus` 0.2 / `thornDamagePerSecond` 30 / `thornTickSeconds` 0.5 |
| 3 | 敵が撃った弾(Hendrixの `_inheritedEnemyName` を持つEvent、または `<attacker: 敵の名前>`)が根の範囲に入った瞬間に、その弾を消して根の壁(1.5秒)を作る。壁の0.8マス以内を通る弾も壁がある間は消す | `projectileWall` 1 / `wallSeconds` 1.5 / `wallBlockRadiusTiles` 0.8 |

## 3. 仮の決め(ワークブックに無い部分。確定仕様として扱わない)
1. 根が増える条件: 使ってから7秒の間・2マス動くたび・新しいパッチの半径も5。「根っこの生えている時間は7秒」は各パッチの寿命と読んだ。
2. 「触れている」= 中心が根の範囲にある。仲間の被ダメージ軽減は「受けた後の差し戻し」(PartyCombat の被ダメージ窓口は DamageModifiers に接続していないため): 受けたダメージ D のうち D − round(D x 0.7) を戻す。製品の仲間は現在0人。
3. 「弱点属性増加被ダメージ-90%」は、弱点で増えた分(有効度−1)の90%を打ち消す(`excessScale` 0.1)。等倍・耐性は変えない。
4. 使い直しは成長の期間を数え直す(既存のパッチは残る)。壁は同時8枚まで・根の絵(円)は同時6つまで・根のEventは最大24個。
5. **Lv3の敵の遠距離攻撃は、現行の本番データに存在しない**(監査文書 §8: 敵の弾のPrefabが無い)。実装は Hendrix の標準(敵が生成した弾 = `_inheritedEnemyName`、または `<attacker: 敵名>`)で判定し、自動テストと実機は「敵の弾に見立てたEvent」で検証した。本番の敵の弾が作られたら、そのまま防げる見込みだが、実際の敵の弾での確認は未実施(**残りの確認事項**)。
6. 音は専用音が無く、RTPの Twine(根が張る)/ Parry(壁が防ぐ)で代用。

## 4. 検証
- 自動テスト: `tests/ProjectR_ApolloA7Laurel.test.cjs`(12件)。
- 実機(MZ Playtest・CDPの実キーQ/D): `tools/mz_cdp/apollo_a7_laurel_verify.cjs` 8/8(根の回復と軽減・歩いて広がる根と各パッチの寿命・Lv2の移動と敵へのスリップ・Lv3の壁と弾・仲間・取消の後片付け・updateScene平均1.9ms・退行なし)。

## 5. 残っていること
- 根・壁・円の絵は自作のDEV素材(`tools/gen_dev_a7_assets.cjs laurel`)。音も差し替え前提。
- Lv3: 実際の敵の遠距離攻撃(敵の弾のPrefab)がまだ無いため、本番の弾での確認は未実施。
- Apolloの指輪の入手・初期セット・30枚デッキは未実装(8枚の完成まで本番に載せない)。
