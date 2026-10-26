# Phase 3C-3 ボス/範囲攻撃 → 常駐Ultimate神のDivine HPダメージ橋渡し

## 調査結果と方針

- ProjectRには**共通のボス攻撃レイヤーがありません**。`js/plugins/ProjectR_*.js`にボス攻撃・範囲攻撃の仕組みは無く、`data/CommonEvents.json`の`<boss>`は「ノックバックを除外する判定」でのみ使われています。Action Engineの`checkRange` / `checkCollide`は、Event同士の接触・索敵用で、攻撃ごとの発動ID(1回の攻撃を識別するtoken)も命中履歴もありません。
- そのため**既存の攻撃には接続していません**(全攻撃の自動改造もしていません)。個々のボス攻撃からの呼び出しは、今後のボス実装フェーズで行います。Action Combat本体・Common Event・既存プラグインは変更していません。
- 今回は小さな専用plugin `js/plugins/ProjectR_UltimateGodDamageBridge.js` を追加しました。

## 橋渡しの構造

- Bridgeが持つもの: 円形範囲の判定、全体攻撃の中継、攻撃IDごとの重複防止(実行時のみ)、Managerへの安全な呼び出し。
- Managerが持ち続けるもの: Divine HP・崩壊・復帰・顕現(`damagePersistentUltimate`の挙動はPhase 3C-2から不変)。HPの実装は増やしていません。Bridge → Managerの一方向の依存で、Manager・Core・カードはBridgeを参照しません。
- 常駐神は論理アンカーのまま。`<enemy>`/`<friendly>`/Party/標的候補/Hurtbox Eventにはならず、ボスAIが標的として選ぶことはありません。**攻撃側がAPIを呼んだときだけ**ダメージが発生します(opt-in)。一時召喚(カード発動)はDivine HPを持たず、対象にもなりません。
- ダメージ量は攻撃側が明示します(Player HP・防御・能力値からは計算しません)。バランス値は決めていません。

## API(`br = ProjectRUltimateGodDamageBridge`、`gm = ProjectRGodSummonManager`)

| API | 内容 |
|---|---|
| `br.damagePersistentUltimateInArea({ attackId, x, y, radius, amount, source })` | 円形範囲。中心(x,y)・radiusはtile座標(`$gamePlayer._realX/_realY`と同じ座標系)。常駐神の論理アンカー(`gm.getPersistentUltimateSummon()`のx,y = Player位置+PersistentOffset)が円内(**境界を含む**)のときだけ`damagePersistentUltimate`へ転送。ループマップは`$gameMap.deltaX/deltaY`で差を求める。 |
| `br.damagePersistentUltimateFromEventArea(eventId, radius, amount, attackId, source)` | Eventの現在の`_realX/_realY`を中心にして上へ渡す補助。 |
| `br.damagePersistentUltimateFromGlobalAttack({ attackId, amount, source })` | 距離判定なしの戦闘全体攻撃。明示的に呼んだ攻撃だけが対象。 |
| `br.createAttackId(prefix)` | `'meteor-1'`のような一意な攻撃IDを作る補助。 |
| `br.getLastResult()` / `br.getRegisteredAttackCount()` / `br.hasAttackHit(attackId)` / `br.clear()` | 診断(読み取り専用コピー)とdebug用のリセット。内部のSet/Mapは公開しません。 |

**結果**: `{ ok, hit, kind('area'|'global'), reason, attackId, damage, collapsed, status, divineHp, maxDivineHp, distance }`。`ok:true`はDivine HPが実際に減ったときだけ。それ以外は`ok:false`と理由(`noPersistentUltimate` / `collapsed` / `notManifested` / `outsideArea` / `alreadyApplied` / `invalidDamage` / `invalidAttackId` / `invalidArea` / `eventNotFound` / `managerUnavailable` / `bridgeError`)で、例外は投げません。**常駐神が居なくてもボス攻撃自体は止めない**でください。

**攻撃ID(1回の攻撃発動ごとの一意なtoken)**
- 同じ攻撃IDでは常駐神に最大1回しかダメージしません。範囲Eventが複数frame残って毎frame呼んでも減りません。別のID(`meteor-43`)なら再びダメージします。
- 命中したときだけ記憶します。範囲外・崩壊中・不正値は記憶しないので、後で範囲に入れば同じ攻撃で当たります。崩壊中の呼び出しは復帰タイマーを再始動せず、追加の崩壊も起こしません。
- 数値`42`と文字列`'42'`は同じIDです。復帰後でも、同じ戦闘で使用済みのIDは再ヒットしません(戦闘終了で消えます)。
- Event IDだけを攻撃IDにしないでください(同じEventの別の攻撃を区別できなくなります)。
- 記憶は実行時のみで、`endCardBattle`・マップ移動・`onMapLoaded`・ロード・戦闘の開始し直しで消えます。セーブしません。

## MZ実機確認(ユーザーが起動)

既存セーブへは上書きしないでください。ボス攻撃の実装がまだ無いため、F8 Consoleから上のAPIを呼んで確認します(常設のデバッグUIはありません)。実際のボス攻撃への接続は無いので、ゲーム内のボス戦での確認項目はありません。

**準備**: `docs/ProjectR_CardDeck_Phase2C6.md`のF8準備スニペット(一時カード定義・デッキ・`prepare2c6`)を実行したあと、次を実行します。

```js
var gm = ProjectRGodSummonManager, br = ProjectRUltimateGodDamageBridge;
cd2c6.endCardBattle();
cd2c6.setUltimateRing('apollo');
if (!cd2c6.startCardBattle().ok) throw Error('battle start failed');
var god = gm.getPersistentUltimateSummon();
console.log(gm.getPersistentUltimateDivineHp(), god.x, god.y);
```

1. Apollo(またはHermes)を選択して戦闘開始。上の最後の行が`100`と神の座標(Player位置+(-0.75,-0.75))を表示すること。
2. **範囲内**: `br.damagePersistentUltimateInArea({ attackId: 'm-1', x: god.x, y: god.y, radius: 1, amount: 20 })` → `ok:true, hit:true, damage:20, divineHp:80`。`gm.getPersistentUltimateDivineHp()`が80。
3. **同じ攻撃ID**: 同じコマンドをもう一度 → `ok:false, reason:'alreadyApplied'`、HPは80のまま。
4. **別の攻撃ID**: `attackId: 'm-2'`で同じコマンド → `divineHp:60`。
5. **範囲外**: `br.damagePersistentUltimateInArea({ attackId: 'm-3', x: god.x + 10, y: god.y, radius: 2, amount: 20 })` → `ok:false, reason:'outsideArea'`、`distance`は約10、HPは60のまま。
6. **境界**: `br.damagePersistentUltimateInArea({ attackId: 'm-4', x: god.x + 3, y: god.y, radius: 3, amount: 5 })` → 境界上なので`hit:true`、HPは55。
7. **全体攻撃**: `br.damagePersistentUltimateFromGlobalAttack({ attackId: 'g-1', amount: 15 })` → `divineHp:40`。同じ`g-1`をもう一度 → `alreadyApplied`。
8. **崩壊**: `br.damagePersistentUltimateFromGlobalAttack({ attackId: 'g-2', amount: 9999 })` → `collapsed:true, status:'collapsed', damage:40`。`gm.hasPersistentUltimateSummon()`が`false`、`gm.getPersistentUltimateRecoveryRemainingSeconds()`が約15。
9. **崩壊中のBridge**: `br.damagePersistentUltimateInArea({ attackId: 'm-5', x: god.x, y: god.y, radius: 5, amount: 50 })`と`br.damagePersistentUltimateFromGlobalAttack({ attackId: 'g-3', amount: 50 })` → どちらも`ok:false, reason:'collapsed'`。残り秒数が増えない(15に戻らない)こと。
10. **通常カード**: `prepare2c6('apollo_golden_arrow')`で表示されたキーを押す。崩壊中でも矢が発射され、`gm.getActiveSummons()`にApolloの一時召喚が1件出て、Divine HPやBridgeの結果は変わらないこと。他のApolloカードも発動できること。
11. **復帰**: 約15秒待つ。`gm.getPersistentUltimateStatus()`が`'active'`、`gm.getPersistentUltimateDivineHp()`が`50`、`gm.hasPersistentUltimateSummon()`が`true`。
12. **復帰後に新しい攻撃ID**: `br.damagePersistentUltimateFromGlobalAttack({ attackId: 'g-4', amount: 20 })` → `divineHp:30`。`attackId: 'g-2'`(崩壊させた攻撃)は`alreadyApplied`のままで再ヒットしないこと。
13. 神が動く確認: Playerを移動してから`god = gm.getPersistentUltimateSummon()`を取り直し、新しい座標を中心にした範囲だけが当たること(古い座標では`outsideArea`)。
14. **記憶の確認**: `br.getRegisteredAttackCount()`で命中した攻撃数が増えていること。`br.getLastResult()`で直近の結果が見えること。
15. **戦闘終了の掃除**: `cd2c6.endCardBattle()` → `br.getRegisteredAttackCount()`が`0`、`br.getLastResult()`が`null`。`br.damagePersistentUltimateFromGlobalAttack({ attackId: 'g-5', amount: 10 })`が`noPersistentUltimate`。マップ移動・ロード後も同じこと(ロード後に`br.getRegisteredAttackCount()`が0)。
16. **Event中心(任意)**: 敵などのEvent IDが分かる場合、`br.damagePersistentUltimateFromEventArea(<eventId>, 3, 20, 'ev-1')`。Eventが神から半径3tile以内なら当たり、遠ければ`outsideArea`。存在しないIDは`eventNotFound`。
17. Ultimateを選んでいない戦闘で上のコマンドを呼んでも例外にならず、`reason:'noPersistentUltimate'`を返すこと。
18. F8にExceptionがないこと。

## 自動確認

`tests/ProjectR_UltimateGodDamageBridge.test.cjs`(24件)。Golden Arrow/Swordsmanshipの既存fixture(導入版Action Engine実コード)とManagerの実ソースを使用。MZ実画面・人の操作確認は別途必要。
