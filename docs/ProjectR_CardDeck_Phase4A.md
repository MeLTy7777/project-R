# Phase 4A Ultimateゲージ基盤

## 範囲

- 実装したのは「戦闘中のゲージ状態・加算API・問い合わせAPI・準備完了判定・満タン消費API・後始末」だけです。
- 実際の戦闘行動(与ダメージ・カード使用・支援・回避)からの加算は**接続していません**(Phase 4B)。Ultimateの入力・攻撃・演出・HUDもありません。ゲージの最終バランス値も決めていません。
- Manager(Divine HP・崩壊・復帰・顕現)、Damage Bridge、Core、7枚のカード、Action Combatは変更していません。新しい小さなplugin `js/plugins/ProjectR_UltimateGauge.js` を追加し、`js/plugins.js` に1件登録しました(Manager・Bridgeの後、全カードの前)。

## データモデルと設定

- 状態は実行時のみ: `{ max, current }` と、使用済みgainIdの集合。セーブしません。
- ゲージ状態は、**有効な常駐Ultimate戦闘状態**(Ultimate指輪を選択し、Playerが所持)がある戦闘にだけ、`startCardBattle`成功時に`0 / 最大値`で作られます。無い場合は作られませんが、戦闘と通常カードは従来どおり動きます。
- Plugin Parameter `MaxGauge`(既定100)。0以下・負・数値以外・空・Infinity・NaNは100として扱います。UI向けには`getUltimateGaugeRate()`で0.0〜1.0が取れます。

## API(`ug = ProjectRUltimateGauge`)

| API | 内容 |
|---|---|
| `ug.addUltimateGauge(amount, source?, gainId?)` | 正の有限数だけ加算。最大値で止まり超えない。`{ ok, reason, requested, gained, gauge, max, rate, full, ready, source, gainId }`を返す。`ok:true`は実際に増えたときだけ。理由: `added` / `invalidAmount` / `invalidGainId` / `noUltimateGauge` / `duplicateGain` / `gaugeFull`。例外は投げない。 |
| `ug.consumeUltimateGauge()` | 満タン かつ 常駐神が顕現中のときだけゲージを0にする(Ultimateは発動しない)。`{ ok, reason, consumed, gauge, max, rate, full, ready }`。失敗理由: `noUltimateGauge` / `notFull` / `persistentUltimateUnavailable`。失敗時は値を変えない。 |
| `hasUltimateGaugeState()` / `getUltimateGauge()` / `getUltimateGaugeMax()` / `getUltimateGaugeRate()` | 状態あり? / 現在値 / 最大値 / 0.0〜1.0。状態が無いときは false / 0 / 0 / 0。 |
| `isUltimateGaugeFull()` / `isUltimateReady()` / `getUltimateGaugeState()` | 満タン? / 使用可能? / 読み取り専用のスナップショット(無ければnull)。 |
| `hasUltimateGaugeGainId(id)` / `getUltimateGaugeGainCount()` / `clear()` | 診断とdebug用。`clear()`はゲージ状態を捨てるだけで、戦闘・Divine HPには触れない。 |

**gainId(任意)**: 同じIDでは戦闘中1回だけ加算します(2回目は`duplicateGain`で加算なし)。省略時は何度でも直接加算できます。数値`42`と文字列`'42'`は同じIDです。すでに満タンでの呼び出しは`gaugeFull`(実加算0)で、**gainIdは使用済みにしません**(ゲージ消費後に同じイベントを再処理しても加算が失われないため)。消費に成功してもgainId履歴は残るので、同じIDの再加算はできません。小数も使え、最大値との差が1e-9未満なら最大値として扱います。

**満タン(full)と使用可能(ready)は別**:
- `full` = 現在値 >= 最大値。常駐神が崩壊していても真になりうる。
- `ready` = ゲージ状態あり かつ full かつ `ProjectRGodSummonManager.isPersistentUltimateAvailable()`。崩壊中は偽。

**崩壊との関係**: 神が崩壊してもゲージは減らず、状態も残ります。崩壊中も加算でき、100に達することもあります(このとき`full:true, ready:false`)。Manager側の15秒後の復帰と同時に`ready`が真になります。満タンでも自動では消費されず、`consumeUltimateGauge()`が呼ばれるまで最大値のままです。自動加算(時間経過・待機・神の復帰・被ダメージ)はありません。

**後始末**: `endCardBattle`・マップ移動・`onMapLoaded`・ロード・戦闘の開始し直し(失敗した開始を含む)でゲージ状態とgainId履歴が消え、次の戦闘は必ず0から始まります。セーブ形式は変えていません。

## MZ実機確認(ユーザーが起動)

既存セーブへは上書きしないでください。実際の加算元は未接続なので、F8 Consoleから上のAPIを呼んで確認します(常設のデバッグUIはありません)。

**準備**: `docs/ProjectR_CardDeck_Phase2C6.md`のF8準備スニペット(一時カード定義・デッキ・`prepare2c6`)を実行したあと、次を実行します。

```js
var gm = ProjectRGodSummonManager, ug = ProjectRUltimateGauge;
var show = () => console.log(JSON.stringify({ g: ug.getUltimateGauge(), max: ug.getUltimateGaugeMax(), rate: ug.getUltimateGaugeRate(),
  full: ug.isUltimateGaugeFull(), ready: ug.isUltimateReady(), god: gm.getPersistentUltimateStatus(), hp: gm.getPersistentUltimateDivineHp() }));
cd2c6.endCardBattle();
cd2c6.setUltimateRing('apollo');   // Hermesで試す場合は 'hermes'
if (!cd2c6.startCardBattle().ok) throw Error('battle start failed');
show();
```

1. Apollo(またはHermes)のUltimate指輪を選択し、Playerがその指輪を所持している状態で戦闘を開始する(上の準備)。
2. 戦闘開始直後: `show()` → `g:0, max:100, rate:0, full:false, ready:false, god:"active", hp:100`。`ug.hasUltimateGaugeState()`が`true`。
3. **25加算**: `ug.addUltimateGauge(25, 'f8')` → `ok:true, gained:25, gauge:25`。`show()`で`g:25, rate:0.25`。
4. **上限**: `ug.addUltimateGauge(200, 'f8')` → `gained:75, gauge:100, full:true, ready:true`。`show()`で`g:100, rate:1, full:true, ready:true`。100になっても自動で0に戻らない(数秒後に`show()`しても100)。
5. **満タン時の加算**: `ug.addUltimateGauge(10)` → `ok:false, reason:'gaugeFull', gained:0, gauge:100`(100を超えない)。
6. **崩壊**: `gm.damagePersistentUltimate(100000)` → `collapsed:true`。`show()`で`g:100`のまま、`full:true, ready:false, god:"collapsed", hp:0`。
7. **崩壊中の消費は失敗**: `ug.consumeUltimateGauge()` → `ok:false, reason:'persistentUltimateUnavailable'`、`gauge:100`のまま。
8. **約15秒待つ**(戦闘時間が進む状態で。メッセージ表示中などは止まります)。`show()`で`god:"active", hp:50, g:100, full:true, ready:true`(復帰と同時にreadyになる)。
9. **消費**: `ug.consumeUltimateGauge()` → `ok:true, reason:'consumed', consumed:100, gauge:0`。`show()`で`g:0, full:false, ready:false`。Ultimateは発動しない。直後にもう一度呼ぶと`reason:'notFull'`。
10. **2周目**: `ug.addUltimateGauge(60, 'f8')` → 60、`ug.addUltimateGauge(60, 'f8')` → 100(`gained:40`)、`ug.consumeUltimateGauge()` → `ok:true`。複数回繰り返せること。
11. **gainId**: `ug.addUltimateGauge(10, 'f8', 'damage-attack-42')` → `gained:10`。同じ行をもう一度 → `ok:false, reason:'duplicateGain', gained:0`(ゲージは10のまま)。`ug.addUltimateGauge(10, 'f8', 'damage-attack-43')` → 20。`ug.hasUltimateGaugeGainId('damage-attack-42')`が`true`。
12. **満タン時のgainId**: `ug.addUltimateGauge(100, 'f8', 'fill-1')`で100にしたあと`ug.addUltimateGauge(5, 'f8', 'late-1')` → `gaugeFull`。`ug.hasUltimateGaugeGainId('late-1')`が`false`(使用済みにならない)。`ug.consumeUltimateGauge()`のあと同じ`late-1`で加算すると`gained:5`。
13. **通常カード**: `prepare2c6('apollo_golden_arrow')`で表示されたキーを押す。崩壊中・満タン中でも矢が発射される。(Phase 4Aの時点ではカード使用でゲージは増えなかったが、**Phase 4B以降は成功したカード使用で`CardUseGain`が加算される**。満タン中は100のまま。詳細は`ProjectR_CardDeck_Phase4B.md`。)
14. **戦闘終了**: `cd2c6.endCardBattle()` → `ug.hasUltimateGaugeState()`が`false`、`ug.getUltimateGauge()`が`0`、`ug.getUltimateGaugeGainCount()`が`0`、`ug.consumeUltimateGauge().reason`が`'noUltimateGauge'`。
15. **次の戦闘**: `cd2c6.startCardBattle()` → `show()`で`g:0`(前の戦闘のゲージ・gainIdは持ち越さない。手順11の`damage-attack-42`で再び加算できる)。
16. マップ移動・セーブしてロードした後も`ug.hasUltimateGaugeState()`が`false`(ゲージはセーブされない)。ロード後に戦闘を始めると`g:0`から。Ultimate指輪の選択は保存されたまま。
17. Ultimate未選択(`cd2c6.setUltimateRing(null)`)で戦闘を始めると`ug.hasUltimateGaugeState()`が`false`で、`ug.addUltimateGauge(10).reason`が`'noUltimateGauge'`。例外にならず、戦闘とカードは通常どおり動く。
18. F8にExceptionがないこと。

## 自動確認

`tests/ProjectR_UltimateGauge.test.cjs`(28件)。Golden Arrow/Swordsmanshipの既存fixture(導入版Action Engine実コード)とManager・Bridgeの実ソースを使用。MZ実画面・人の操作確認は別途必要。
