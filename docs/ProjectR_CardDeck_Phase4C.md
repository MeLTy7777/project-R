# Phase 4C Ultimate入力と発動トランザクション基盤

## 範囲

- 実装したのは「Ultimateキーの入力」「神ごとのhandler登録」「発動の検証」「成功したときだけゲージを消費するトランザクション」だけです。
- **ApolloやHermesのUltimate攻撃・ダメージ・演出・対象選択・HUDはありません。** 本番ではhandlerが未登録なので、ゲージが100でも**Uキーを押すと `noUltimateHandler` になり、ゲージは100のまま残ります**(次のUltimate効果のPhaseまでの想定どおりの動き)。ダメージなどの仮の効果は入れていません。
- 新しい小さなplugin `js/plugins/ProjectR_UltimateActivation.js` を追加し、`js/plugins.js` に1件登録しました(`ProjectR_UltimateGauge`の直後、全カードpluginの前)。
- Gauge(加算・消費)、Manager(Divine HP・崩壊・復帰)、Damage Bridge、Core、7枚のカード、通常の剣/G17/Vision、Action Combatは変更していません。Phase 4Bの加算量・加算元も変更していません。
- 保存形式は変えていません。発動の結果・入力の保留・キーの押下状態は保存されません。

## 入力キー

- 既定は **U**。調査の結果、`Hendrix_Keyboard_Gamepad`のButton Config(W/A/S/D・F=Interact・X/B=Cancel・Esc=Menu・J/左クリック=攻撃)、ProjectRの各plugin(カード1〜5、会話のZ・Home/End)、`data/*.json`のどこにも**Uは使われていません**。
- Plugin Parameter `UltimateKey`(英字1文字)で変更できます。不正値(空・複数文字・数字・記号)は既定のUに戻ります。
- すでに他の操作に使われているキー(例: `J`、`F`、`W`、`Z`)を指定しても**奪いません**。そのキーは従来の操作のままで、Ultimate入力だけが無効になります(`getInputBinding().active === false`、`reason: "keyConflict"`)。プレイヤーがButton Configでキーを入れ替えて衝突した場合も、その時点で入力が無効になります。
- 入力は `ProjectR_CardBattleInput`(Phase 2A)と同じ方針です: `Input._onKeyDown/_onKeyUp`をaliasして物理キー1個だけを扱い、Hotbar/Keyboardの共通イベントとの二重発火を避けます。`keyMapper`/`gamepadMapper`は変更しません。Gamepadのバインドは未実装です。
- **カード戦闘中の押下の瞬間だけ**が1回の要求になります。押しっぱなし(repeat)や二重keydownは再要求しません。キーを離して押し直すと新しい要求になります。フレーム数には依存しません(押下は次のマップ更新で1回だけ処理)。
- 戦闘外・会話・メニュー・Ctrl/Alt/Shift/Meta・IME・編集欄・フォーカス喪失・Scene切替中は何もせず、元のInputに委譲します。カードキー1〜5には干渉しません。
- 入力は `requestUltimateActivation("keyboard")` を呼ぶだけです。トランザクションの中身は入力側にありません。

## API(`ua = ProjectRUltimateActivation`)

| API | 内容 |
|---|---|
| `ua.requestUltimateActivation(source?)` | 検証 → handler呼び出し → 開始成功を確認 → `consumeUltimateGauge()`。Console・テスト・将来のHUD/Gamepadから直接呼べる。例外は投げない。`{ ok, reason, started, source, godId, ringId, consumed, gauge, max, serial, handlerReason?, consumeReason?, error? }` |
| `ua.registerUltimateHandler(godId, handler)` | `{ ok, reason, godId, replaced }`。godIdは英数字/`_`/`-`の空でない文字列、handlerは関数。同じgodIdの再登録は**置き換え**(`reason:"replaced"`, `replaced:true`)。他の神には影響しない。理由: `registered` / `replaced` / `invalidGodId` / `invalidHandler` |
| `ua.unregisterUltimateHandler(godId)` | `{ ok, reason, godId, removed }` |
| `ua.hasUltimateHandler(godId)` / `ua.getRegisteredUltimateGods()` | 登録の有無 / 登録済みgodIdの配列(コピー。内部registryは公開しない) |
| `ua.getLastUltimateActivationResult()` | 直近の結果のコピー(無ければnull) |
| `ua.getInputBinding()` | `{ configured, key, code, keyCode, active, reason }` |

## 検証の順序と失敗理由

| 順 | reason | 条件 |
|---|---|---|
| 1 | `battleInactive` | カード戦闘が開始していない |
| 2 | `noUltimateGauge` | ゲージ状態が無い(Ultimate未選択など) |
| 3 | `gaugeNotFull` | ゲージが最大値未満(部分消費はしない) |
| 4 | `persistentUltimateUnavailable` | 常駐Ultimate神が顕現中でない(崩壊中) |
| 5 | `invalidUltimateGod` | 戦闘のsnapshotからgod/ringを解決できない |
| 6 | `noUltimateHandler` | その神のhandlerが未登録 |
| handler後 | `ultimateHandlerException` | handlerが例外を投げた(ゲージ不変) |
| handler後 | `ultimateStartFailed` | handlerが `{ ok:true, started:true }` を返さなかった(ゲージ不変)。`handlerReason`に理由 |
| 成功後 | `gaugeConsumeFailedAfterStart` | 開始成功後にゲージ消費が失敗(`started:true`、`consumeReason`に診断。巻き戻しはしない) |
| 再入 | `activationInProgress` | handler実行中の再要求 |

成功は `{ ok:true, reason:"started", started:true, consumed:100, gauge:0 }` です。

## handler契約

`handler(context)` は**同期的**に結果を返します。

- 成功: `{ ok: true, started: true, ... }`。失敗: `{ ok: false, reason: "..." }`。
- `undefined`・例外・真偽値・Promise・`started`が`true`でないもの・`ok`が`true`でないものは、**成功として扱いません**。
- `context`(読み取り専用・凍結): `godId`, `ringId`, `battle`(戦闘開始時のManager snapshot), `summon`(常駐召喚), `player`(`{x,y}`), `gauge`, `max`, `source`。戦闘中にUltimate選択が変わっても、戦闘開始時の神が使われます。
- handlerは開始のための**最小限の準備だけ**を行い、次をしてはいけません:
  - Ultimateゲージの消費/リセット(開始成功後にこのpluginが行います)
  - 常駐Ultimate神の崩壊/除去
  - Ultimate選択の変更
  - activationが完了する前に戦闘を同期的に終了すること

  これらはUltimate効果の進行中(後続フレーム)に行ってください。違反するとゲージ消費が失敗し得ますが、投げずに `gaugeConsumeFailedAfterStart` として記録されます。

## 崩壊・復帰・満タン

- ゲージが100でも神が崩壊中は `persistentUltimateUnavailable`。handlerは呼ばれず、ゲージは100のままです。
- 15秒後の復帰で発動可能になります(特別なゲージ復元はありません)。
- 成功後はゲージ0。直後の要求は `gaugeNotFull`。再び100まで貯めれば何度でも発動できます。

## 後始末・保存

- `endCardBattle`・マップ移動・`onMapLoaded`・ロードで、直近の結果と入力の保留を破棄します。押下中のキー(latch)は、keyupまたはInput.clear/フォーカス喪失/マップ移動で解放されます(戦闘終了後のrepeatが元のInputへ漏れないようにするため、Phase 2Aと同じ扱い)。
- handlerの登録はplugin実行時の定義なので、戦闘終了後も残ります。何も保存しません。Ultimate指輪の選択は従来どおり保存され、ゲージとDivine HPは戦闘中の実行時状態のままです。

## MZ実機確認(ユーザーが起動)

既存セーブへは上書きしないでください。本番にはhandlerが無いので、**F8 Consoleで一時的なテストhandlerを登録して**確認します(再起動すれば消え、データには残りません)。キーを押すときは**ゲーム画面をクリックしてフォーカスを戻してから**押してください(F8のConsoleにフォーカスがあるとキーはゲームに届きません)。

準備(`docs/ProjectR_CardDeck_Phase2C6.md`のF8準備スニペットを実行したあと):

```js
var gm = ProjectRGodSummonManager, ug = ProjectRUltimateGauge, ua = ProjectRUltimateActivation, d = ProjectRCardDeck;
var calls = 0, mode = 'ok';
var show = () => console.log(JSON.stringify({ g: ug.getUltimateGauge(), ready: ug.isUltimateReady(), god: gm.getPersistentUltimateStatus(),
  calls: calls, last: ua.getLastUltimateActivationResult() && { ok: ua.getLastUltimateActivationResult().ok, reason: ua.getLastUltimateActivationResult().reason } }));
d.endCardBattle(); d.setUltimateRing('apollo');
if (!d.startCardBattle().ok) throw Error('battle start failed');
console.log(JSON.stringify(ua.getInputBinding()), ua.getRegisteredUltimateGods());
```

1. Apolloの Ultimate 指輪を選択して戦闘を開始する(上の準備)。`getInputBinding()`が`key:"U", active:true`、`getRegisteredUltimateGods()`が`[]`。
2. `ug.addUltimateGauge(100, 'f8')` でゲージを100にする。
3. `ug.isUltimateReady()` が `true`。
4. ゲーム画面をクリックして**Uキー**を1回押す(まだhandlerは登録していない)。
5. `show()` → `last.reason` が `noUltimateHandler`。
6. `ug.getUltimateGauge()` が `100` のまま。
7. 一時的なテストhandlerを現在の神に登録する: `ua.registerUltimateHandler('apollo', ctx => { calls++; console.log('handler ctx', JSON.stringify(ctx)); return mode === 'ok' ? { ok: true, started: true } : { ok: false, reason: 'test-fail' }; })` → `{ ok:true, reason:'registered', replaced:false }`。Hermesで試す場合は`'hermes'`。
8. ゲーム画面をクリックしてUキーを1回押す。
9. `show()` → `calls:1`。Consoleの`handler ctx`に`godId`・`ringId`・`battle`・`summon`が出ている。
10. `ug.getUltimateGauge()` が `0`、`last.reason` が `started`。
11. ゲージを再度100にして(`ug.addUltimateGauge(100,'f8')`)、**Uキーを1秒ほど押しっぱなしにする**。`calls` が +1 だけ(押しっぱなしで連続発動しない)。離す。
12. 再度 `ug.addUltimateGauge(100,'f8')` でゲージを100にする(手順11で消費済みのため)。
13. 失敗handlerを使う: `mode = 'fail'`(同じhandlerが失敗を返す)。
14. Uキーを押す → `last.reason` が `ultimateStartFailed`、`ug.getUltimateGauge()` が `100` のまま(`calls` は +1)。
15. 神を崩壊させる: `mode = 'ok'; gm.damagePersistentUltimate(100000)` → `god:"collapsed"`。
16. Uキーを押す。
17. `calls` が増えていない、`last.reason` が `persistentUltimateUnavailable`、ゲージが100のまま。
18. 約15秒待つ(戦闘時間が進む状態で)。`god:"active"` になる。
19. `ug.isUltimateReady()` が `true`。Uキーを押すと発動できる状態に戻っている。
20. Uキーを押す → `calls` +1、ゲージ0。`ug.addUltimateGauge(100,'f8')` で満タンにしてもう一度Uキー → 2回目の成功サイクル(ゲージ0)。成功直後にもう一度Uキーを押すと `gaugeNotFull`。
21. 戦闘を終了する: `d.endCardBattle()`。
22. 後始末の確認: `ua.getLastUltimateActivationResult()` が `null`、`ug.hasUltimateGaugeState()` が `false`。Uキーを押しても何も起きない(戦闘外)。`ua.getRegisteredUltimateGods()` は登録したhandlerが残っている(`['apollo']`)。`ua.unregisterUltimateHandler('apollo')` で消す。
23. F8にExceptionがないこと。

付随確認: カードキー1〜5を押すと従来どおりカードが発動し、Uの要求にはならない。通常の剣(J)・移動(WASD)・Interact(F)は変わらない。

## 自動確認

`tests/ProjectR_UltimateActivation.phase4c.test.cjs`(35件)。導入版Action Engine・実Hendrix Keyboard・実Input・実Manager・実Gauge・実CardBattleInputを使い、handlerはテスト用のfakeだけです。MZ実画面・人の操作確認は別途必要です。
