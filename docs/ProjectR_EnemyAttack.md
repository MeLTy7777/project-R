# ProjectR_EnemyAttack — 敵の攻撃の予約と予兆(Phase Apollo-A14)

敵の遠距離・近接の攻撃を **「予約 → 溜め → 実行」** で行い、**予約の記録そのものを予兆(telegraph)として公開**する小さな基盤です。
神託(Apollo)の「次の敵の攻撃を予測する」と、月桂冠 Lv3 の「敵の遠距離攻撃を防ぐ」を、**実際に予定された攻撃・実際に撃たれた弾**で確かめられるようにするためのものです。

## 1. 予兆が「本物」である理由
予約した攻撃は、このプラグインの時計が溜め(`windupFrames`)を数え、0になった瞬間に**本物のHendrixの攻撃**を実行します(近接 = `spawnEventHitbox`、遠距離 = 敵のEventの `spawnEvent`)。
予兆は、その**同じ記録**(向き・位置・残りframe)です。予告と実際の攻撃が食い違うことはありません。遠距離の弾は、出た直後に予兆の出発点・向きへ合わせます。
溜めの途中で次のことが起きると、**攻撃は実行されず、予兆も同時に取り消されます**(弾も判定も出ない・ダメージなし):
`sourceGone`(敵のEventが消えた)/ `sourceDown`(HPが0)/ `interrupted`(攻撃を受けた。`interruptOnDamage` 既定 true)/ API(`interrupt`・`cancel`)/ `playerDead` / `mapSetup`・`load`(マップ設定・ロード)。

## 2. API(`ProjectREnemyAttack`)
| 関数 | 内容 |
|---|---|
| `schedule(spec)` | 予約。`{ eventId, kind: "ranged"\|"melee", windupFrames(1〜600。既定45), interruptOnDamage }` + 遠距離: `degree`(数値 or `"player"`)・`template`(Hendrixのテンプレートマップの弾のEvent名)・`length`(予告する射程。既定12)/ 近接: `notetag`(`<tag><dmg: 30>` など)・`reach`(既定1)・`activeFrames`(既定2)。不正な予約は理由つきで拒否(予兆を作らない)。1体につき同時に1つ。 |
| `get(id)` / `list()` | 溜め中の予兆の記録: `{ id, eventId, kind, state, framesLeft, windup, degree, origin, length, area, createdFrame }`(近接の `area` = 判定が出るタイルの `{x, y(中心), width, height}`) |
| `getOutcome(id)` | 終わった予約: `{ state: "fired"\|"cancelled", reason, frame, projectileId?, hitboxId?, damaged? }` |
| `cancel(id, reason)` / `interrupt(eventId, reason)` / `clear(reason)` | 取消・その敵の予約の中断・全消去 |
| `onAnnounce` / `onCancel` / `onFire(fn)` | 通知(登録解除する関数を返す) |

- ダメージ: Hendrixの公式 `UpdateEventHp`(プレイヤー)を、**1つの攻撃につき1回だけ**。近接 = 判定が残る間(`activeFrames`)に1回 / 遠距離 = Hendrixの当たり判定でプレイヤーに届いた瞬間に1回で、その弾は消える。量は攻撃の `<dmg: ...>`(防御・Apolloの軽減などは公式の経路どおり)。
- 実行時のみ(セーブしない)。診断: `diagnostics()`(pending / watchers / outcomes)。

## 3. 利用側
- **神託 Lv1**(`ProjectR_ApolloOracle.js`): 使ったあと、溜め中の攻撃のうち**いちばん早く実行されるもの**(すでに溜め中のものも含む。なければ使ったあとに最初に予約されるもの)を予告する。遠距離 = 向きの線、近接 = 判定が出るタイルの四角(溜めが進むほど濃くなる)。取消されたら消え、実行されたら近接は消え、遠距離は**同じ線が実際の弾へ引き継がれて**弾が消えるまで続く。予測は「次の1回」だけ。予約を通らない従来の敵の弾の予告線(A7)も従来どおり。
- **月桂冠 Lv3**(`ProjectR_ApolloLaurelWreath.js`): 敵のEventが撃った本物の弾(Hendrixが `_inheritedEnemyName` を付けたもの)を、根の範囲に入った瞬間に消して根の壁を作る。**近接の判定のEvent(`spawnEventHitbox` = `Game_MaithlDynamicEvent`)は弾ではない**ので防がない(神託も予告線を作らない)。プレイヤー自身の弾(`<attacker: player>`)は防がない。

## 4. Playtest専用の敵(`ProjectR_CombatTestArenaEnemies.js`。Playtestでしか有効にならない)
`ProjectRTestEnemies.attach(eventId, "ranged"|"melee")` で、アリーナのダミー(`<hp: 魔獣><enemy>`)を、予約で攻撃する敵にする。`attackNow(eventId)` で今すぐ1回予約、`interrupt(eventId)` で中断、`setAuto(true)` で範囲内なら自動で攻撃。遠距離の弾 = メモリ上のテンプレート `ProjectR Test Enemy Bolt`(Map002は変えない)。ストーリーの敵・既存のAIは作っていない/変えていない。

## 5. 検証(`tests/ProjectR_ApolloA14EnemyAttack.test.cjs` 10件 + 実機 `tools/mz_cdp/apollo_a14_enemy_attack_verify.cjs` 8/8)
- 遠距離: 予兆(向き270°・溜め60frame) → 溜め中は弾なし → 実行で弾 → 弾の向き = 予告の向き → プレイヤーに届いて **1回だけ** ダメージ(544 → 524)・弾は消える。実機でも同じ。
- 近接: 予兆の範囲 = 判定が出るタイル(`9.5, 15.5`)= 予約の記録と完全一致 → 実行で、そこにいれば1回だけダメージ(20)。溜めの間に避ければ当たらない。判定のEventは残らない。
- 取消(API・攻撃を受けた・倒れた・消えた): 弾も判定も出ず、予兆も同時に消え、ダメージなし。
- 神託 Lv1 × 遠距離・近接(実機): 予告 → 取消で消える / 実行で消える(遠距離は弾へ引き継ぎ)。月桂冠 Lv3(実機): 敵の弾を防いでダメージなし・根の壁1つ・プレイヤーの銃の弾は防がない・近接は防がない。
- 後片付け: 予約・監視・弾・判定・予告線・根・壁・Apollo召喚が残らない。重複ダメージなし(攻撃ごとに1回)。

## 6. まだ予測を出せない攻撃(検証していないので「対応」とは扱わない)
- **このAPIを通らない既存の敵の攻撃**: Map001の「テスト用ゴブリン」のように、イベントのページに「待つ → 判定を出す → ダメージ」を直接書いたもの。待ち時間・位置がページの式に埋もれていて、事前に正しく読み取る方法が無い(推測は捏造になるため行わない)。対象にするには、その敵の攻撃をこのAPIへ載せ替える必要がある(既存AIの作り直しなので、今回はしていない)。
- **向きや位置が実行の瞬間に決まる攻撃**(溜めの間にプレイヤーを追って向きが変わる追尾の攻撃・実行の瞬間にプレイヤーの位置へ出す範囲攻撃)。このAPIは予約の瞬間に向き・位置を固定する。
- **近接の範囲が1タイル(1x1)以外**(広い範囲・扇・円・連続判定)、**複数回のヒット**、**曲がる・加速する弾**(予告線は直線)、**即着弾(溜めの無い遠距離)**、**接触ダメージ・床のダメージ・状態異常の領域**。
- **ボスの専用の演出・コモンイベントで組まれた攻撃**。
