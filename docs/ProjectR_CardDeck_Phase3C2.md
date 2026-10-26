# Phase 3C-2 常駐Ultimate神のDivine HP / 崩壊 / 復帰

## 実装

- 既存`ProjectR_GodSummonManager`に追加。Core・Input・7枚のカードplugin・Action Combatは変更なし。Phase 3C-1の仕組み(戦闘開始時のsnapshot、論理アンカー、Player位置+offset、一時召喚との分離)は作り直していない。
- **戦闘状態と顕現を分離**。
  - 常駐Ultimate戦闘状態: `godId` / `ringId`(戦闘開始時のsnapshot) / 最大HP / 現在HP / status(`active`・`collapsed`) / 復帰タイマー。有効な常駐Ultimateがある戦闘中だけ存在する。
  - 顕現: Phase 3C-1の論理アンカー。崩壊中は消え、復帰で作り直される(`summonId`は新しくなる)。
- **Divine HPは常駐Ultimate神だけ**の戦闘専用リソース。Player/敵のHP、一時召喚、カードには持たせない。論理アンカーはMap Eventや当たり判定を持たず、敵HP APIも使っていない。
- 仮の設定値(Plugin Parameter。`js/plugins.js`にも明示。バランス用の仮値):

| Parameter | 既定 | 補足 |
|---|---|---|
| `DefaultDivineMaxHp` | 100 | 1未満・不正値は100 |
| `RecoveryDelaySeconds` | 15 | 負・不正値は15。0なら次の戦闘時間で即復帰 |
| `RecoveryHpRate` | 0.5 | 0〜1に丸め。復帰HPは最低でも1(0を指定しても0HPで復帰しない) |
| `PersistentOffsetX/Y` | -0.75 | Phase 3C-1から変更なし(今回`plugins.js`へ明示) |

- **戦闘開始**: 有効な常駐Ultimate(Phase 3C-1の検証を通ったもの)なら、Divine HP = 最大(既定100/100)、status = active、タイマー0、顕現あり。毎戦闘ごとに満タン。HPは戦闘をまたいで持ち越さない。
- **ダメージAPI** `damagePersistentUltimate(amount, source?)`: 有限な正の数だけ受け付け、0未満にはならない。NaN・Infinity・負・0・文字列・null等は`{ok:false, reason:'invalidDamage'}`でHP不変。常駐Ultimateが無ければ`noPersistentUltimate`、崩壊中は`collapsed`(重複崩壊・タイマー再始動なし)。成功時は`{ok, damage(実ダメージ), requested, collapsed, status, divineHp, maxDivineHp, divineHpRate, source}`。`source`は文字列のみ保持する任意のメタ情報。物理的な当たり判定は作らない(ボス/AoEとの接続は後続フェーズ)。
- **崩壊(HP 0)**: HPを0に固定 → statusを`collapsed` → 顕現を消す → 復帰タイマー開始(既定15秒)。`endCardBattle`は呼ばず、指輪・Ultimate選択・デッキ・手札・所有は変えない。Ultimateは使用不可(`isPersistentUltimateAvailable()`がfalse)。
- **復帰**: 崩壊中だけタイマーが進み、0になるとHPを`最大 × RecoveryHpRate`(既定50)にして`active`へ戻し、顕現を作り直す。再びHPが0になれば同じ流れを何度でも繰り返す(古いタイマーや二重顕現はなし)。
- **時間の進み方**: 認識阻害・睡眠・病・リラと同じ`deck.updateCooldown`(Inputの1/60秒)。メニュー・会話・イベント実行中・Scene切替・フォーカス喪失中は止まる。`setTimeout`不使用。探索中(戦闘外)は進まない。
- **通常カードは崩壊の影響を受けない**: 同じ神のカード(Golden Arrow / 病の矢 / リラ / 剣術 / 認識阻害 / 葦笛 / 高速移動)は、常駐神が崩壊していても従来どおり一時召喚経由で発動する。カード側・Core・Inputに崩壊チェックは無い(テストで確認)。一時召喚の掃除は常駐の崩壊/復帰に影響しない。
- **破棄/セーブ**: `endCardBattle`・マップ移動・`onMapLoaded`・ロードで、戦闘状態・HP・タイマー・顕現が全て消える。いずれもセーブしない(Ultimate選択だけが従来どおり保存)。ロード後は新しい戦闘開始まで何も存在しない。

## 照会API(`gm = ProjectRGodSummonManager`)

| API | 意味 |
|---|---|
| `gm.hasPersistentUltimateBattleState()` | 戦闘中の常駐Ultimateがいるか(崩壊中もtrue) |
| `gm.getPersistentUltimateStatus()` | `'none'` / `'active'` / `'collapsed'` |
| `gm.isPersistentUltimateCollapsed()` | 崩壊中か |
| `gm.isPersistentUltimateAvailable()` | 戦闘状態あり・active・HP>0・顕現ありの全てを満たすときだけtrue(将来のUltimate用) |
| `gm.getPersistentUltimateDivineHp()` / `getPersistentUltimateMaxDivineHp()` / `getPersistentUltimateDivineHpRate()` | 現在値/最大値/割合(状態が無いときは0) |
| `gm.getPersistentUltimateRecoveryRemainingSeconds()` | 崩壊中の復帰までの残り秒。それ以外は0 |
| `gm.getPersistentUltimateBattleState()` | 上の情報をまとめた読み取り専用コピー(無ければnull)。変更しても内部は変わらない |
| `gm.damagePersistentUltimate(amount, source?)` | ダメージ(唯一の変更手段) |
| `gm.hasPersistentUltimateSummon()` / `getPersistentUltimateSummon()` | **顕現中のみ**true / 非null(崩壊中はfalse / null) |
| `gm.getPersistentUltimateGodId()` / `getPersistentUltimateRingId()` | 戦闘状態の神/指輪。**崩壊中も返す**(Phase 3C-1では顕現と同時に存在したため、通常時の挙動は同じ) |

## MZ実機確認(ユーザーが起動)

既存セーブへは上書きしないでください。ボス攻撃との接続は未実装なので、F8 ConsoleのManager APIで確認します。常設のデバッグUIはありません。

**準備**: `docs/ProjectR_CardDeck_Phase2C6.md`のF8準備スニペット(一時カード定義・デッキ・戦闘開始・`prepare2c6`)を実行したあと、次で戦闘を開始し直します。

```js
var gm = ProjectRGodSummonManager;
cd2c6.endCardBattle();
cd2c6.setUltimateRing('apollo');
if (!cd2c6.startCardBattle().ok) throw Error('battle start failed');
gm.getPersistentUltimateBattleState();
```

1. **満タン確認**: 上の最後の行で`status:'active'`、`divineHp:100`、`maxDivineHp:100`、`manifested:true`。`gm.isPersistentUltimateAvailable()`が`true`。
2. **部分ダメージ**: `gm.damagePersistentUltimate(30, 'manual')` → `divineHp:70`。`gm.getPersistentUltimateDivineHp()`が70、`gm.hasPersistentUltimateSummon()`が`true`のまま。
3. **不正値**: `gm.damagePersistentUltimate(-5)` / `(NaN)` / `('10')` が`ok:false, reason:'invalidDamage'`でHPが70のまま。
4. **崩壊**: `gm.damagePersistentUltimate(9999)` → `damage:70, collapsed:true, status:'collapsed'`。`gm.hasPersistentUltimateSummon()`が`false`、`gm.getPersistentUltimateSummon()`が`null`、`gm.isPersistentUltimateCollapsed()`が`true`、`gm.isPersistentUltimateAvailable()`が`false`。`gm.getPersistentUltimateGodId()`は`'apollo'`のまま、`cd2c6.isCardBattleActive()`が`true`、`cd2c6.getUltimateRingId()`が`'apollo'`のまま。
5. **崩壊中の追加ダメージ**: `gm.damagePersistentUltimate(10)` → `ok:false, reason:'collapsed'`。`gm.getPersistentUltimateRecoveryRemainingSeconds()`がリセットされない(14〜15のまま減っていく)。
6. **崩壊中のカード**: `prepare2c6('apollo_golden_arrow')`で表示されたキーを押して発動。矢が飛び、`gm.getActiveSummons()`に`godId:'apollo'`の一時召喚が1件(約0.2秒で消える)。この間`gm.hasPersistentUltimateSummon()`は`false`のまま、残り秒数は進み続ける。`prepare2c6('apollo_lyre_calm')`など他のApolloカードも発動できる。
7. **復帰前**: 崩壊直後から時間を計り、約14秒時点で`gm.isPersistentUltimateCollapsed()`が`true`、`gm.getPersistentUltimateDivineHp()`が`0`。
8. **復帰**: 約15秒で`gm.getPersistentUltimateStatus()`が`'active'`、`gm.getPersistentUltimateDivineHp()`が`50`、`gm.getPersistentUltimateDivineHpRate()`が`0.5`、`gm.hasPersistentUltimateSummon()`が`true`(`summonId`は崩壊前と別)、`gm.isPersistentUltimateAvailable()`が`true`、`gm.getPersistentUltimateRecoveryRemainingSeconds()`が`0`。顕現の`x,y`はPlayer位置+(-0.75,-0.75)に追従している。
9. **2回目**: `gm.damagePersistentUltimate(50)`で再び崩壊 → 15秒後に再び50で復帰。顕現が常に最大1体であること。
10. **停止確認**: 崩壊させ、`gm.getPersistentUltimateRecoveryRemainingSeconds()`を控えてから、メニューを開く(メニュー中は変わらない)、会話イベント中、ゲームウィンドウを別アプリに切り替える(フォーカス喪失中は変わらない)。閉じて操作に戻ると続きから減る。探索中に戻る(戦闘を終える)と復帰しない。
11. **戦闘終了時の掃除**: 崩壊中に`cd2c6.endCardBattle()` → `gm.hasPersistentUltimateBattleState()`が`false`、`gm.getPersistentUltimateStatus()`が`'none'`、残り秒数0、`gm.hasPersistentUltimateSummon()`が`false`。しばらく待っても復帰しない。マップ移動・ロードでも同じこと。次に戦闘を開始すると必ず`100/100`の新しい状態。
12. **Hermes**: `cd2c6.endCardBattle(); cd2c6.setUltimateRing('hermes'); cd2c6.startCardBattle();` で同じ手順。Hermesのカード(`hermes_sword_attack`など)が崩壊中も使えること。
13. **セーブ互換**: 崩壊中にセーブしてロードすると、`gm.hasPersistentUltimateBattleState()`が`false`で、`cd2c6.getUltimateRingId()`は選択したままであること。
14. F8に例外が出ていないこと。

秒数の確認を急ぎたいときは、`cd2c6.updateCooldown(10)`でも復帰タイマーを進められます(カードのCooldownも同時に進みます。実時間の確認は上の手順で行ってください)。

## 自動確認

`tests/ProjectR_GodSummonManager.phase3c2.test.cjs`(29件)。Golden Arrow/Swordsmanshipの既存fixture(導入版Action Engine実コード、Scene_Map経由のInput時間)と、他5枚の既存fixtureを再利用。描画・入力はVM fixture。MZ実画面・人の操作確認は別途必要。
