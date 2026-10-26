# Phase 4B Ultimateゲージ加算元

## 範囲

- 実際の戦闘行動を、Phase 4Aの`addUltimateGauge`へ接続しました。**加算量はすべて暫定値**で、「約10分のボス戦でUltimateを2〜3回」という目標を達成する値であるとはまだ言えません(実プレイのデータが必要です)。最終バランスは後続で調整します。
- Ultimateの入力・攻撃・演出・HUD・新しい回避システムは**ありません**。
- 加算の方針(量・上限・gainId)はすべて `js/plugins/ProjectR_UltimateGauge.js` に集約しています。カードpluginに加算式はありません。ゲージは「戦闘の観察役」で、ゲージが無い・失敗しても、カード発動とダメージは通常どおり成功します。

## 暫定値(Plugin Parameter)

| Parameter | 既定 | 意味 |
|---|---|---|
| `CardUseGain` | 2.0 | 発動に成功し消費されたカード1枚ごと |
| `SupportBonusGain` | 2.0 | `category=support`のカードが成功したとき、`CardUseGain`に上乗せ |
| `DamageGainRate` | 0.0025 | 実ダメージ × この値 |
| `DamageGainPerHitCap` | 1.5 | 1回のダメージイベントの加算上限 |
| `ImportantDodgeGain` | 5.0 | `recordImportantDodge`成功時 |

負・数値以外・空・NaN・Infinityは既定値へ戻ります。`0`はその加算元を無効にします(`reason:'zeroGain'`)。`js/plugins.js`の登録値は既定値と同じです。

## 加算元

| 加算元 | 接続点 | 内容 |
|---|---|---|
| カード使用 | `ProjectRCardDeck.requestUseCard`(Gaugeがラップ) | Routerが`success`(発動成功かつカード消費)を返したときだけ`CardUseGain`を1回。失敗・未消費は0。空振りでも発動成功なら加算。崩壊中も加算。gainId=`card:<instanceId>:<そのinstanceの使用回数>` |
| 支援 | 同上 | カードのcategoryが`support`(現在はApollo Lyre Calmのみ)なら`SupportBonusGain`を**さらに**加算。つまり成功した支援カード=`CardUseGain + SupportBonusGain`(意図的な重ね)。失敗時は両方0。gainId=`support:<instanceId>:<n>` |
| 与ダメージ | `ProjectRUltimateGauge.trackDamage(...)`(3つの攻撃pluginが既存のHP適用をそのまま包む) | **実際に減ったHP** × `DamageGainRate`、1回あたり`DamageGainPerHitCap`で頭打ち。gainId=`damage:<attackId>:<targetId>[:<tickId>]` |
| 重要回避 | `ProjectRUltimateGauge.recordImportantDodge(dodgeId, source?)` | `ImportantDodgeGain`を1回。gainId=`dodge:<dodgeId>`。**ゲームからの呼び出しは未接続**(下記) |

`instanceId`は冷却後に同じカードが再び手札へ戻ると同じ値になるため、gainIdに「そのinstanceの使用回数」を含めています。同じ`requestUseCard`の結果を2回処理しても1回しか加算されません(`recordCardUse`は結果オブジェクトとその`state`を記憶)。

### 与ダメージの接続範囲

- **接続済み**: Apollo Golden Arrow、Hermes Swordsmanship(斬撃が複数の敵に当たれば敵ごとに別加算)、Apollo Disease Attack の初撃、Apollo Disease の DoT(tickごと)。
- **未接続(保留)**: 通常の剣・G17などAction Engine / Database側の武器攻撃。ProjectR側に所有する実装が無く、共通の安全なフックも無いため、**Action Combat本体は変更していません**。接続するには新しいProjectR側の経路が必要です。
- 実ダメージは`getCurrentEventHp`の前後差です(Action EngineはHPを0で下限にするため、敵のHPが20なら20)。HPが読めない場合は加算しません(偽の精度は作りません)。既に倒れている敵(HP0)・HPが減らなかった攻撃は0。
- gainIdの攻撃IDは、各pluginが持つ連番(矢・病の矢の弾ごと、剣術は斬撃のタグ、DoTはDisease付与ごと)+ 対象の敵ID(+DoTは何回目のtickか)。1つの矢が1体の敵に当たれば1回。Diseaseの再付与は新しい付与連番なので、tickのIDが衝突しません。

### 重要回避

現在ProjectRに回避システムはなく、Action Engineの`lastEvaded`は「敵の回避/無効」でプレイヤーの回避成功ではありません。攻撃が外れただけでは回避とみなしません。そのため`recordImportantDodge(dodgeId, source?)`だけを公開しました(Console確認可)。実際の回避システムができたら、その成功イベントからこのAPIを呼びます。

### 加算しないもの

時間経過・戦闘開始・神の顕現/崩壊/復帰・被ダメージ・Divine HPへのダメージ・カードのドロー/クールダウン・一時召喚の生成・メニュー操作。

## 満タン・崩壊・後始末

- 満タン(`full`)では実加算0(`gaugeFull`)でゲージは溢れず、**gainIdは使用済みになりません**(Phase 4Aの仕様どおり)。戦闘やカードの動作は変わりません。
- 常駐神が崩壊中でも、4つの加算元はすべて有効です。100に達すると`full:true, ready:false`で、15秒後の復帰で`ready:true`。
- `endCardBattle`・マップ移動・`onMapLoaded`・ロードで、ゲージ・gainId・使用回数・診断は消えます。保存はしません。

## 診断(読み取り専用・戦闘ごとにリセット・非保存)

```js
ug = ProjectRUltimateGauge;
ug.getGainConfig();   // 現在の加算量
ug.getGainStats();    // { totals: { card, support, damage, dodge }, last: { category, ok, reason, requested, gained, source, gainId } }
```

## MZ実機確認(ユーザーが起動)

既存セーブへは上書きしないでください。常設のデバッグUIはありません。`docs/ProjectR_CardDeck_Phase2C6.md`のF8準備スニペットを実行したあと、次を使います。

```js
var gm = ProjectRGodSummonManager, ug = ProjectRUltimateGauge, d = ProjectRCardDeck;
var show = () => console.log(JSON.stringify({ g: ug.getUltimateGauge(), full: ug.isUltimateGaugeFull(), ready: ug.isUltimateReady(),
  god: gm.getPersistentUltimateStatus(), stats: ug.getGainStats().totals }));
d.endCardBattle(); d.setUltimateRing('apollo');
if (!d.startCardBattle().ok) throw Error('battle start failed');
show();
```

1. Apolloの Ultimate 指輪を選択して戦闘を開始する(上のスニペット)。
2. 戦闘開始直後 `show()` → `g:0`、`stats` はすべて0。
3. 通常カード(Golden Arrow、Hermes剣術など)を1枚、実際のキーで発動する。
4. `show()` → `g:2`(`stats.card:2`)。`ug.getGainStats().last` の`gainId`が`card:card-N:1`。
5. 失敗するカード使用を試す(例: 使えない状態でキーを押す、または手札が空の位置)。`show()` の値が増えていない。
6. 失敗の確認: 失敗後も`last`が前回のまま。
7. Apollo Lyre Calm(支援)を発動する。
8. `show()` → さらに`+4`(`stats.card`+2、`stats.support`+2)。
9. 敵に Golden Arrow を当てる(敵のHPバーが減る)。減ったHPをメモする(例: 敵HP200→120なら80)。
10. `ug.getGainStats().totals.damage` が `80 × 0.0025 = 0.2`。
11. 上限の確認: `DamageGainRate`を大きく(Plugin Managerで`1`など)して再起動すれば、1回の加算が`1.5`で頭打ちになる。もしくはConsoleで `ug.recordDamageDealt(1000, {attackId:'f8-cap', targetId:1})` → `gained:1.5, capped:true`。
12. 二重加算の確認: 同じ矢が当たった後、数秒待っても`damage`の値は増えない。Consoleで同じ呼び出し `ug.recordDamageDealt(1000, {attackId:'f8-cap', targetId:1})` を再実行 → `reason:'duplicateGain'`。
13. 複数の敵: 近くに複数の敵を置いて Hermes剣術 で同時に斬る。`gainId` が敵ごとに別(`damage:<tag>:<敵ID>`)で、`ug.getUltimateGaugeGainCount()`が増える。
14. Disease: Apollo Disease Attack を敵に当て、数秒待つ。初撃で加算され、その後1秒ごとに`stats.damage`が少しずつ増える(`stats.card`は増えない)。倒れた後は増えない。
15. 崩壊: `gm.damagePersistentUltimate(100000)` → `god:"collapsed"`。
16. 崩壊中もカードを使い、敵にダメージを与える。
17. `show()` → `g`が増え続ける。
18. `ug.addUltimateGauge(100, 'f8')` で埋める → `full:true, ready:false`。
19. 満タンのまま通常カード使用・攻撃 → ゲージは100のまま、戦闘とカードは通常どおり。
20. 約15秒待つ → `god:"active"`。
21. `show()` → `ready:true`。
22. 重要回避API: `ug.recordImportantDodge('f8-1','f8')` → `ok:true, gained:5`(消費後で空きがあるとき)。もう一度同じIDで → `duplicateGain`。**実ゲームの回避では呼ばれません**(未接続)。
23. 戦闘を終了する: `d.endCardBattle()` → `ug.hasUltimateGaugeState()`が`false`。`ug.getGainStats().totals`がすべて0。
24. `d.startCardBattle()` で再開始 → `show()`で`g:0`(`f8-1`も再び使える)。
25. F8にExceptionがないこと。

## 自動確認

`tests/ProjectR_UltimateGauge.phase4b.test.cjs`(25件)。Hermes(Golden Arrow/剣術)・Disease・Lyreの既存fixture(導入版Action Engine実コード)とManager・Gaugeの実ソースを使用。MZ実画面・人の操作確認は別途必要です。Phase 4Aのテスト(`ProjectR_UltimateGauge.test.cjs`)は、カード使用が加算元になったため該当2件の期待値を更新しました。
