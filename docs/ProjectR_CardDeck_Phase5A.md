# ProjectR Phase 5A: 戦闘HUD基盤

Phase 4D-2（`0060015`）の上に、これまでの仕組み（5枚の手札・クールダウン・Divine HP・崩壊/復帰・Ultimate Gauge・Ultimate）を**画面で確認できる**HUDを追加しました。見た目の完成度ではなく、**表示する情報の正しさと出し入れ（lifecycle）**が目的です。

## 既存HUDの再利用

新しいHUDは作らず、既存の `js/plugins/ProjectR_BattleHUD.js`（FHD基準・5枠のスキルスロット・アイコン・選択枠・クールダウン表示・Ultimate円弧・プレイヤー/武器パネル）を改修しました。

| 項目 | 既存の状態 | Phase 5A |
|---|---|---|
| 5枠のスロット | Hendrix Hotbar（Q/R/X/C/V）を表示 | **カード戦闘中だけ** 手札 `hand[0..4]` を表示。ラベルは **1/2/3/4/5**。それ以外は従来のHotbar表示（Q/R/X/C/V）のまま |
| Ultimate円弧 | 変数/`setUltimate`の値。キー表示は`R`固定 | **カード戦闘中だけ** `ProjectRUltimateGauge`を読む。キーは`ProjectRUltimateActivation.getInputBinding()`の設定値。それ以外は従来のまま |
| プレイヤー/武器/状態異常 | そのまま | **変更なし** |
| 神の名前（プレイヤーパネルの右半分） | 手動設定の`GOD` | カード戦闘中は選択中のUltimate神の名前 |
| 新規 | - | 山札/捨て札/Cooldown山の枚数、Divine HPパネル（崩壊/復帰を含む） |
| 表示条件 | `ProjectRCombatPresence`（敵が画面内） | **カード戦闘中は常に表示**（敵の画面内判定に依存しない）。それ以外は従来どおり |

`js/plugins.js` は**変更していません**（BattleHUDは既に登録済み）。Hendrix / DotMove / `rmmz_*` / 他のProjectR pluginも変更していません。

## データの流れ（HUDは状態を持たない）

HUDは毎回、実行中のAPIから**読むだけ**です。値の複製・独自のタイマー・独自のカウンタは持ちません。

| 表示 | 読み取り元 |
|---|---|
| 手札5枠 | `ProjectRCardDeck.getBattleState().hand`（1枠=`hand[0]`…5枠=`hand[4]`） |
| 枚数 | 同 `drawPile` / `discardPile` / `cooldownPile` の枚数 |
| 使用不可（暗く表示） | `ProjectRCardDeck.canUseCard(cardId)`（15frameに1回） |
| 神・Divine HP・最大値・崩壊・復帰残り秒 | `ProjectRGodSummonManager.getPersistentUltimateBattleState()` |
| Gauge現在値/最大・full・ready | `ProjectRUltimateGauge`（`isUltimateGaugeFull()` と `isUltimateReady()` を**別々**に使用） |
| Ultimateキー | `ProjectRUltimateActivation.getInputBinding()`（`key` / `active`） |
| 発動中の表示 | `ProjectRHermesUltimate.isHermesUltimateActive()` / `ProjectRApolloUltimate.isApolloUltimateActive()` |

- 保存データは**追加していません**。表示値・可視状態・カード名のキャッシュなどは保存されず、ロード後は実行中のシステムから導出し直します（ロードでカード戦闘は終了するため、HUDは消えます）。
- `getBattleState()` は深いコピーを返すため、同一frame内で一度だけ呼びます。表示は4frameごとに確認し、**値が変わったときだけ**文字を描き直します（Bitmap/Spriteは作り直しません）。
- HUDを取り除いてもゲームの動作は変わりません（HUDは読み取り専用）。

## 画面の配置（1920×1080基準。実画面へX/Yを個別に拡大縮小）

| 区画 | 位置 | 内容 |
|---|---|---|
| 手札5枠 | 下中央（既存） | `1`〜`5`のキー表示、`CARD n`、アイコン、カード名。使用不可は暗く、空き枠は「—」 |
| 枚数 | 手札の右上 | `DRAW 18   DISCARD 4   COOLDOWN 2` |
| Ultimate円弧 | 上中央（既存） | 値`40/100`、状態別の色と文言（下表） |
| Divine HPパネル | 左下（プレイヤーパネルの上） | 神の名前、`DIVINE HP 75 / 100`、バー、`ACTIVE` または `COLLAPSED  RECOVERING 12.4s` |
| プレイヤー/武器/状態異常 | 既存のまま | 変更なし |

画面中央は覆いません。

### Ultimate円弧の状態

| 状態 | 条件 | 色 | タイトル | キー枠 |
|---|---|---|---|---|
| 通常 | 満タン未満 | 金 | `ULTIMATE` | 暗い |
| **READY** | 満タン **かつ** 神が顕現中（`isUltimateReady()`） | 明るい金＋発光 | `U - ULTIMATE`（Uは設定キー） | 明るい |
| **満タンだが使用不可** | 満タン **かつ** 神が崩壊中 | 紫 | `GAUGE FULL / UNAVAILABLE` | 暗い（押せるようには見せない） |
| 発動中 | Hermes/Apolloの奥義を実行中 | 水色 | `ULTIMATE ACTIVE` | 暗い |
| 神なし | Ultimate神が無い戦闘 | Ultimate区画ごと**非表示**（偽の`0/100`は出さない） | - | - |

キーが他の操作と衝突して無効（`binding.active === false`）のときは、キー枠は`—`で暗いままです。

## カード名・アイコンの解決順（美術差し替え口）

CardDeckCoreのカード定義には名前もアイコンも無いため、次の順で解決します。

1. `ProjectRBattleHUD.setCardPresentation(cardId, { name, iconIndex, imageName })`（実行時のみ・保存しない）
2. Skillのnote `<ProjectRCard: cardId>` を持つSkillの名前・アイコン（黄金の弓矢・ヘルメース剣術・アポロン病攻撃）
3. HUD内蔵の既定名（高速移動 / 葦笛睡眠 / 認識阻害 / リラの支援）
4. `cardId` から生成した名前

画像は `img/projectr_ui/battle/` に置いた `imageName`（拡張子なし）が既存の仕組みで読み込まれます。**画像素材は生成していません**。神も同様に `setGodPresentation(godId, { name, imageName })` で差し替えられます（既定名はAPOLLO/HERMES/JANUS/THEMIS/ATHENA）。

## 仕様上の判断（確認してください）

- **カード戦闘以外のHotbar表示は残しました。** 既存の機能を消さないためです。カード戦闘中だけ1〜5になります。
- **手札のカードは「クールダウン中」にはなりません。** 使うと即座にクールダウン山へ移り、補充札が手札に入ります。そのため5枠の「暗い表示」は *使用不可（指輪未所持など）* を意味し、クールダウン中のカードは枚数 `COOLDOWN n` で示します。偽の手札カードは作りません。
- **マップ移動では、カード戦闘そのものは終了しません**（Core/Managerの既存仕様）。移動後はManagerが神の状態を破棄するため、**Divine HPとUltimate区画は消え**、手札と枚数だけが残ります。
- 神の名前・カード名は暫定の表示名です。最終名ではありません。

## テスト（自動）

`tests/ProjectR_BattleHUD.phase5a.test.cjs`（32件）。実Core・実Input・実Manager・実Gauge・実Activation・実Hermes/Apollo Ultimateの上に、**実ソースのままの `ProjectR_BattleHUD.js`** を読み込み、HUDが受け取ったview-modelと、Sprite木に渡された文字列・表示状態を検証します。Sprite/Bitmap/PIXIは記録用のdoubleで、**ピクセル描画やMZ実機のテストではありません**（Canvas依存は追加していません）。

| 分類 | 内容 |
|---|---|
| 再利用・登録・保存 | 新しいHUD pluginを追加しない / `plugins.js`のBattleHUD行は不変 / CardDeckCoreより先に読まれても動く / 保存項目を追加しない / 他pluginが無変更 |
| 出し入れ | 戦闘外は非表示 / 開始で表示・終了で消える / ロード後に復元しない / マップ移動で神の表示が消える / 手動hide・会話・メッセージ / HUD破棄後もゲームが続く |
| カード | 5枠=`hand[0..4]`・ラベル1〜5 / 使用成功と即時補充の反映 / 使用失敗で不変 / 名前とアイコンの導出と上書き / 5枚未満の空き枠 / 枚数とクールダウン完了 / 山札再利用 |
| 軽量性 | 変化が無ければ再描画0回 / `getBattleState`は更新ごとに1回 / UI部品を作り直さない / HUDがゲーム状態・保存データを変更しない |
| 神・Divine HP | 神の選択と名前 / HP・最大値・割合 / 崩壊と復帰残り秒（Managerのタイマー、HUD独自タイマー無し） / 50%復帰 / 繰り返し |
| Gauge・Ultimate | 値の一致 / ready と full-but-collapsed の区別 / 設定キーの表示と競合 / 神なし戦闘 / 戦闘の再開始 |
| 回帰 | Hermes Ultimate・Apollo Ultimate（開始・ゲージ消費・実行中表示・終了）/ 奥義中の通常カード / 7枚のカード定義 |

## MZ実機確認（ユーザーが起動）

**このPhaseは、これまで実機未確認の仕組みを一度に通す統合スモークテストを含みます。** 既存セーブへは上書きしないでください。キーを押すときは**ゲーム画面をクリックしてフォーカスを戻してから**押してください（F8 Consoleにフォーカスがあるとキーはゲームに届きません）。敵は `<enemy>` とHPが設定された普通の敵Eventを、プレイヤーの近くに置いてください。

準備（F8 Console。Phase 4D-2と同じ一時定義で30枚デッキを作る。**まだ戦闘は開始しません**）:

```js
var d = ProjectRCardDeck, ug = ProjectRUltimateGauge, ua = ProjectRUltimateActivation, gm = ProjectRGodSummonManager, hud = ProjectRBattleHUD;
d.endCardBattle();
var extras5a = [3, 2, 1, 3, 2].map((maxCopies, i) => ({ cardId: '__phase5a_manual_' + i, ringId: 'hermes', maxCopies, cooldownSeconds: 1, maxLevel: 3, targetType: 'instant' }));
if (extras5a.some(c => d.definitions.card(c.cardId))) throw Error('fixture already exists');
['hermes', 'apollo'].forEach(id => { if (!d.assignRingToPlayer(id).ok) throw Error('move outside existing combat first'); });
new d.DefinitionRegistry(extras5a).cardDefinitions().forEach(c => d.definitions.cards.set(c.cardId, c));
d.definitions.cardDefinitions().forEach(c => d.setCardOwned(c.cardId));
d.setDeck(d.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId)));
console.log(JSON.stringify(d.setUltimateRing('apollo')));
var show5a = () => { var v = hud.getViewModel(); console.log(JSON.stringify({ visible: v.visible, card: v.cardBattleActive,
  slots: v.slots.map(s => s.key + ':' + (s.name || '-') + (s.disabled ? '(x)' : '')), counts: v.counts,
  ult: v.ultimate && { state: v.ultimate.state, v: v.ultimate.value, max: v.ultimate.max, full: v.ultimate.full, ready: v.ultimate.ready, key: v.ultimate.key },
  divine: v.divine && { god: v.divine.godId, hp: v.divine.hp, max: v.divine.maxHp, st: v.divine.status, rec: v.divine.recoverySeconds } })); };
```

`show5a()` は **HUDが今描こうとしている値**（実システムから読んだコピー）を表示します。画面の表示とConsoleの値を見比べてください。

### 手順（35項目）

**A. 表示の出し入れ**

1. **探索を開始する**: 戦闘を始めずにマップを歩く。
2. **HUDが出ていない**: 画面下に5枠・Ultimate円弧・Divine HPパネルが無い（敵が画面に居ない場合）。`show5a()` が `visible:false, card:false`。
3. **カード戦闘を開始する**: `d.startCardBattle().ok`（`true`）。
4. **HUDが現れる**: 数フレーム以内に画面下に5枠、右上に枚数、左下にDivine HP、上にUltimate円弧が出る。
5. **5枚が実際の手札と一致する**: `d.getBattleState().hand.map(c => c.cardId)` と、画面の5枚（左から）の順が対応する。`show5a()` の `slots` も同じ順。
6. **ラベルが1〜5**: 各スロットのキー枠が `1 2 3 4 5`、下の文字が `CARD 1`〜`CARD 5`。Q/R/X/C/Vは出ない。

**B. カード**

7. **カード1〜5を使う**: ゲーム画面をクリックしてから `1`、`2`、`3`、`4`、`5` を順に押す（各カードは対応する効果を出す）。
8. **補充が即座に反映される**: 1枚使うごとに、手札が左へ詰まり、右端に新しい札が入る。`show5a()` の `slots` が `d.getBattleState().hand` と一致し、`counts` の `cooldown` が1ずつ増える。
9. **クールダウンが手札表示を壊さない**: 1秒（fixtureカード）〜十数秒待つと `COOLDOWN` が減り `DISCARD` が増えるが、5枠の並びは変わらない。
10. **枚数**: `DRAW / DISCARD / COOLDOWN` の合計＋手札5が30（`d.getBattleState()` の各 `.length` と画面が一致）。

**C. 神・Divine HP**

11. **選択中のUltimate神**: 左下のパネルに `APOLLO`、プレイヤーパネル右半分の文字も `APOLLO`。
12. **Divine HPが満タン**: `DIVINE HP 100 / 100`、緑のバーが満タン、`ACTIVE`。
13. **Divine HPを減らす**: `gm.damagePersistentUltimate(25)`。
14. **HUDが減る**: `DIVINE HP 75 / 100`、バーが3/4。`show5a()` の `divine.hp` が `75`。
15. **崩壊させる**: `gm.damagePersistentUltimate(100000)`。
16. **崩壊/復帰の表示**: `DIVINE HP 0 / 100`、赤いバー（空）、`COLLAPSED  RECOVERING 15.0s` 付近の表示。
17. **復帰カウントダウン**: 数秒待つと残り秒が減る（メニューや会話中は止まる。HUD独自のタイマーではなくManagerの値）。`gm.getPersistentUltimateRecoveryRemainingSeconds()` と近い値。
18. **約15秒で50%復帰**: 約15秒後に `DIVINE HP 50 / 100`、`ACTIVE`、復帰表示が消える。

**D. Ultimate Gauge**

19. **ゲージを増やす**: `ug.addUltimateGauge(40, '5a')`。
20. **ゲージが増える**: 円弧が増え、値が `40/100`。`ug.getUltimateGauge()` と一致。
21. **100にする**: `ug.addUltimateGauge(60, '5a')`。
22. **ready状態**: 値`100/100`、円弧が明るい金で発光、タイトルが `U - ULTIMATE`、キー枠が明るい。`ug.isUltimateReady()` が `true`。
23. **満タンのまま崩壊させる**: `gm.damagePersistentUltimate(100000)`。
24. **「満タンだが使用不可」の見た目**: 値は`100/100`のまま、円弧が**紫**、タイトルが `GAUGE FULL / UNAVAILABLE`、キー枠が暗い。`ug.isUltimateGaugeFull()` は `true`、`ug.isUltimateReady()` は `false`。この状態でUを押しても発動しない（`ua.getLastUltimateActivationResult().reason` が `persistentUltimateUnavailable`）。
25. **神を復帰させる**: 約15秒待つ。
26. **readyが戻る**: 円弧が再び明るい金になり `U - ULTIMATE` に戻る。

**E. Ultimate**

27. **Hermes Ultimateを発動**: `d.endCardBattle(); d.setUltimateRing('hermes'); d.startCardBattle(); ug.addUltimateGauge(100,'5a')`、画面をクリックしてから `U`。6連斬撃が出る。発動中は円弧のタイトルが水色の `ULTIMATE ACTIVE`、左下が `HERMES`。
28. **ゲージが0に戻る**: 円弧が`0/100`、`ug.getUltimateGauge()` が `0`。奥義が終わるとタイトルが `ULTIMATE` に戻る。
29. **Apollo Ultimateを発動**: `d.endCardBattle(); d.setUltimateRing('apollo'); d.startCardBattle(); ug.addUltimateGauge(100,'5a')`、画面をクリックしてから `U`。7本の扇状の矢が出る。
30. **ゲージが0に戻る**: 円弧が`0/100`。矢が出きるとタイトルが `ULTIMATE` に戻る。
31. **奥義中・奥義後も通常カードが使える**: 奥義中に `1`〜`5` を押すと通常カードが発動し、手札・枚数が更新される。

**F. 終了と後始末**

32. **戦闘を終了する**: `d.endCardBattle()`。
33. **HUDが消える**: 5枠・枚数・Divine HP・Ultimate円弧が消える（敵が画面に居る場合は従来のHotbar表示 `Q R X C V` に戻る。カード表示は引き継がれない）。
34. **マップ移動とロード**: 戦闘を開始した状態で別マップへ移動 → 手札は残るがDivine HPとUltimate円弧が**消える**こと。続けて戦闘中にセーブ→ロードすると、HUDは消えていて古い手札や神の情報が出ない。再度`d.startCardBattle()`すると新しい値で出る。
35. **F8にエラーが出ていない**: 手順全体を通して、F8 Consoleに赤いエラーが出ていない。

### 同時に確認してほしい、これまで実機未確認の仕組み

自動テストでは**飛行・当たり判定・見た目**を再現できていません。ついでに目視してください。**ここで見つかった不具合は、挙動を変えず「実機の不具合」として別に記録してください**（好みでの調整はこのPhaseでは行いません）。

- Golden Arrowの実際の飛行（直進・命中・寿命で消える）
- Disease（病攻撃）の弾の実際の飛行
- Swift Movementの壁際の挙動
- Hermes剣術のヒットボックス
- Hermes Ultimateの6連斬撃の流れ
- Apollo Ultimateの矢の飛行（扇状・間隔0.10秒・命中）

### 後始末

```js
d.endCardBattle();
// 一時定義は再起動で消えます（保存されません）。
```

## 制限

- 最終的な美術・神のポートレート・ゲージのアニメーションは未実装です（文字と単純な図形のみ）。
- Gamepadからの表示の変更・入力は対象外です。
- 神の見た目（ポートレート）の素材はありません。`setGodPresentation` の `imageName` で後から差し替えられます。
- 描画の見た目（位置・重なり・文字の収まり）はMZ実機でしか確認できません。
