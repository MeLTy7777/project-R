# Phase 4D-1 Hermes Ultimate（最初の本番Ultimate handler）

> Phase 4D-2でApolloの本番Ultimate handlerも追加されました（`docs/ProjectR_CardDeck_Phase4D2.md`）。この文書の「Apolloは未実装」「登録は`["hermes"]`」（手順3・22）はPhase 4D-1時点の記述です。

## 範囲

- 実装したのは **Hermes の Ultimate だけ**です。名称「ヘルメース奥義」・斬撃回数・間隔・範囲・ダメージ式はすべて**仮**です（最終的な設定・Lore・バランスではありません）。
- 流れ: `Uキー → Phase 4Cの検証 → Hermes handler → 開始成功 → Phase 4Cがゲージを100→0に消費 → 6連斬撃 → 敵がDatabase Skillのダメージ → 終了`。
- **Apolloの本番Ultimateは未実装**です。Apolloを選んでゲージ100でUを押すと、従来どおり `noUltimateHandler`（ゲージは100のまま）になります。
- 新しいplugin `js/plugins/ProjectR_HermesUltimate.js` を追加し、`js/plugins.js` に1件登録しました（`ProjectR_HermesSwordsmanship` の直後）。
- 専用Skillは `data/Skills.json` の **ID235**（元は未使用の空きスロット。配列の長さ240は変わらず、他のSkillは1件も変えていません）。
- 変更していないもの: Core、CardBattleInput、GodSummonManager、Damage Bridge、UltimateGauge、UltimateActivation（Phase 4A/4B/4Cの動作）、7枚のカード（Swordsmanshipは引き続きSkill 237の通常カード）、Hendrix/DotMove/Action Combat本体、保存形式。

## 仮仕様（Plugin Parameterで変更できます）

| Parameter | 既定 | 内容 |
|---|---|---|
| `SlashCount` | 6 | 斬撃回数（1～12） |
| `SlashIntervalSeconds` | 0.12 | 斬撃の間隔（秒）。1有効frame = 1/60秒で進める |
| `SequenceSeconds` | 0.75 | 発動中として扱う最短の合計時間（秒） |
| `RangeTiles` | 2.0 | プレイヤー中心から斬撃の先端まで（tile） |
| `HitboxWidth` | 1.5 | 斬撃の幅（tile） |
| `LifetimeFrames` | 3 | 斬撃1回のHitboxの寿命（有効frame）。Swordsmanshipと同じ |
| `UltimateDamageGeneratesGauge` | false | 奥義のダメージでUltimate Gaugeを得るか |

不正な値（空・0以下・数値でない）は既定値に戻ります。`SlashCount` は最大12に丸めます。

## 斬撃の列とタイミング

- 基準角は**発動の瞬間のマウス方向（上=0度・時計回り、小数可）を1回だけ**固定します。以後にマウスを動かしても列は回転しません。
- 6回の順序: `基準 → +60 → -60 → +120 → -120 → 反対(180)`。基準が23.75度なら `23.75, 83.75, 323.75, 143.75, 263.75, 203.75`。他の回数でも `360/回数` 刻みで交互に広げます。4方向に丸めません。
- 各斬撃はDynamic Hitbox（射程2.0 × 幅1.5、プレイヤー中心から前方1.0 tileが中心）。原点は**その斬撃を生成する瞬間のプレイヤー中心**です。常駐Hermesの論理アンカーはプレイヤー近傍の派生位置（オフセット約1 tile）なので、位置のずれを避けてプレイヤー中心を使います。**プレイヤーは動かしません**（突進・瞬間移動なし）。
- 発動の瞬間に1回目の斬撃を生成します。これに失敗すると発動全体が失敗します（ゲージは100のまま、状態は残りません）。2回目以降は有効frame 8/15/22/29/36（約0.12秒間隔）、合計0.75秒（45有効frame）で終了します。
- メニュー・会話・イベント実行中・フォーカス喪失中は進みません（カードの戦闘時間と同じ判定 `ProjectRCardBattleInput.canAcceptInput()` を使用）。`setTimeout` は使いません。

## ダメージ

- 専用Skill（ID235 `ヘルメース奥義`、note `<ProjectRUltimate: hermes_ultimate>`）。式は **`a.atk * 1.2 - b.def * 0.5`**（1斬撃あたり。分散・会心なし）。6回で合計 約7.2×atk と、通常の剣（`a.atk * 2 - b.def`）より大きく、1発あたりは控えめです。仮バランス。
- 経路はSwordsmanshipと同じです: `<dmg: ヘルメース奥義><attacker: player>` のDynamic Hitbox → `checkCollide` → `UpdateEventHp(-damage)`。HPの直接減算はしません。
- 命中記録は**斬撃ごと**に独立しています。同じ敵は1つの斬撃につき最大1回（接触し続けても、離れて戻っても）。別の斬撃には再び当たります。倒れた敵（HP0）・非enemy・消去済みEventにはダメージを与えません。
- Ultimate instance IDは発動ごとに一意の数値（実行時のみ・保存しない）。斬撃Hitboxの一意タグとゲージ加算IDに使います。

## ゲージ

- **このpluginはゲージを消費・加算・リセットしません。** handlerが `{ ok:true, started:true }` を返した直後に、Phase 4Cが `consumeUltimateGauge()` で100→0にします。
- 既定（`UltimateDamageGeneratesGauge=false`）では、奥義のダメージで**ゲージは増えません**（Phase 4Bの経路を呼びません）。`true` にすると、既存の `ProjectRUltimateGauge.trackDamage`（Phase 4B）を通して加算します。実ダメージの換算・上限・重複判定は4Bの共通処理に任せ、式は複製していません。
- 発動後に戦闘終了・マップ移動などで中断しても**ゲージは返しません**（カードが対象に当たらなくても消費されるのと同じ）。

## 同時実行・崩壊・後始末

- 発動中に再度要求すると、handlerが `ultimateEffectActive` で拒否します。Phase 4Cでは `reason: "ultimateStartFailed"`、`handlerReason: "ultimateEffectActive"` になり、**ゲージは変わりません**（外部からゲージを100に戻していても同様）。
- 通常のカードは奥義中も使えます。奥義は一時召喚を作らず、常駐Hermesを増やしません。
- 開始に成功した奥義は、発動中に常駐Hermesが崩壊しても**最後まで続きます**（無敵化も途中キャンセルもしません。崩壊・復帰のルールは変更なし）。崩壊中の発動は従来どおり `persistentUltimateUnavailable`。
- 戦闘終了（`endCardBattle`）・マップ移動・ロード（Mapの入れ替え）・戦闘が非アクティブになった場合は、奥義を即中断して専用Hitboxと命中記録を全て除去します。
- 途中の斬撃の生成に失敗した場合はその斬撃だけ欠け、残りは続きます。更新中の例外は`Game_Map.update`を壊さず、片付けて終了します。
- 何も保存しません。保存形式は変わりません。

## 診断API（`hu = ProjectRHermesUltimate`、読み取り専用のコピー）

| API | 内容 |
|---|---|
| `hu.isHermesUltimateActive()` | 発動中か |
| `hu.getHermesUltimateState()` | 発動中なら `{ instanceId, baseDegree, slashCount, slashDegrees, spawnedSlashes, failedSlashes, currentSlashIndex, hitCount, elapsedSeconds, remainingSeconds, activeHitboxes }`、なければ`null` |
| `hu.getHermesUltimateLastResult()` | 直前の奥義の結果 `{ instanceId, outcome: "completed"/"battleEnded"/"mapChanged"/"error", slashCount, spawnedSlashes, failedSlashes, hitCount, elapsedSeconds }` |
| `hu.getActiveHitboxes()` | 現在残っている斬撃Hitbox（診断用） |
| `hu.getConfig()` / `hu.getRegistration()` | 有効な設定値 / handler登録の結果 |

## MZ実機確認（ユーザーが起動）

既存セーブへは上書きしないでください。キーを押すときは**ゲーム画面をクリックしてフォーカスを戻してから**押してください（F8 Consoleにフォーカスがあるとキーはゲームに届きません）。ダメージを確認する敵は、`<enemy>` と HP が設定された普通の敵Eventを、プレイヤーの近く（1タイル以内）に置いてください。

準備（F8 Console。Phase 2C-6と同じ一時定義で30枚デッキを作り、Hermesを常駐Ultimateにして戦闘を開始する）:

```js
var d = ProjectRCardDeck, ug = ProjectRUltimateGauge, ua = ProjectRUltimateActivation, gm = ProjectRGodSummonManager, hu = ProjectRHermesUltimate;
d.endCardBattle();
var backup4d1 = d.getPersistentData();
var extras4d1 = [3, 2, 1, 3, 2].map((maxCopies, i) => ({ cardId: '__phase4d1_manual_' + i, ringId: 'hermes', maxCopies, cooldownSeconds: 1, maxLevel: 3, targetType: 'instant' }));
if (extras4d1.some(c => d.definitions.card(c.cardId))) throw Error('fixture already exists');
['hermes', 'apollo'].forEach(id => { if (!d.assignRingToPlayer(id).ok) throw Error('move outside existing combat first'); });
new d.DefinitionRegistry(extras4d1).cardDefinitions().forEach(c => d.definitions.cards.set(c.cardId, c));
d.definitions.cardDefinitions().forEach(c => d.setCardOwned(c.cardId));
d.setDeck(d.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId)));
console.log(JSON.stringify(d.setUltimateRing('hermes')));
if (!d.startCardBattle().ok) throw Error('battle start failed');
var show4d1 = () => console.log(JSON.stringify({ gauge: ug.getUltimateGauge(), ready: ug.isUltimateReady(), god: gm.getPersistentUltimateStatus(),
  active: hu.isHermesUltimateActive(), state: hu.getHermesUltimateState(), last: hu.getHermesUltimateLastResult(),
  activation: ua.getLastUltimateActivationResult() && { ok: ua.getLastUltimateActivationResult().ok, reason: ua.getLastUltimateActivationResult().reason, handlerReason: ua.getLastUltimateActivationResult().handlerReason } }));
// 斬撃が生成されるたびに表示。ダメージ(UpdateEventHp)の発生源と対象も記録する。
var last4d1 = -1, timer4d1 = setInterval(() => { var s = hu.getHermesUltimateState();
  if (s && s.currentSlashIndex !== last4d1) { last4d1 = s.currentSlashIndex;
    var b = hu.getActiveHitboxes().find(x => x.slashIndex === s.currentSlashIndex);
    console.log('slash', s.currentSlashIndex + 1 + '/' + s.slashCount, 'degree', b && b.degree, 'elapsed', s.elapsedSeconds.toFixed(3)); }
  if (!s) last4d1 = -1; }, 10);
var calls4d1 = [], callCommand4d1 = PluginManager.callCommand;
PluginManager.callCommand = function(self, plugin, name, args) {
  if (name === 'UpdateEventHp') calls4d1.push({ hitbox: self._eventId, target: Number(args.eventId), hpBefore: $gameMap.getCurrentEventHp(Number(args.eventId)) });
  return callCommand4d1.apply(this, arguments); };
show4d1();
```

1. **Hermesを選ぶ**: 上の準備で `setUltimateRing('hermes')` が `ok:true` を返す。`d.getUltimateRingId()` が `"hermes"`。
2. **指輪が主人公所持**: `d.hasPlayerRing('hermes')` が `true`。`gm.getPersistentUltimateStatus()` が `"active"`。
3. **戦闘開始**: `d.isCardBattleActive()` が `true`、`ua.getRegisteredUltimateGods()` が `["hermes"]`（Apolloは無い）、`ug.hasUltimateGaugeState()` が `true`。
4. **ゲージを100にする**: `ug.addUltimateGauge(100, 'f8')`。
5. **準備完了**: `ug.isUltimateReady()` が `true`、`ug.getUltimateGauge()` が `100`。
6. **マウスを狙う**: ゲーム画面の、プレイヤーから見て分かりやすい方向（例: 真上や右上）にマウスを置く。
7. **Uを押す**: ゲーム画面をクリックし、マウスを動かさずに**Uキーを1回**押す。
8. **ゲージが0**: `show4d1()` で `gauge:0`、`activation.reason` が `"started"`。
9. **奥義が始まった**: Consoleに `slash 1/6 ...` が出る。発動中なら `hu.isHermesUltimateActive()` が `true`、`hu.getHermesUltimateState().instanceId` が数値（1回目は`1`）。
10. **6回の斬撃**: Consoleに `slash 1/6` から `slash 6/6` が約0.12秒間隔で出る。`degree` は基準角に対して `+0, +60, -60, +120, -120, +180` の順（360度の小数角）。終わると `hu.isHermesUltimateActive()` が `false`、`hu.getHermesUltimateLastResult()` が `outcome:"completed"`、`spawnedSlashes:6`。プレイヤーは動いていない。
11. **途中でマウスを動かす**: ゲージを`ug.addUltimateGauge(100,'f8')`で戻し、Uを押した直後にマウスを大きく動かす。Consoleの `degree` の列が手順10と同じ並び（基準角はUを押した瞬間の方向）で、回転していない。
12. **1体に複数回命中**: プレイヤーの隣（1タイル以内）に敵を置いてUを押す。`hu.getHermesUltimateLastResult().hitCount` が2以上、敵のHPが `$gameMap.getCurrentEventHp(敵のeventId)` で複数回に分けて減っている。ダメージ1回分は `a.atk * 1.2 - b.def * 0.5`（actorの攻撃力・敵の防御力から）。
13. **斬撃ごとの命中**: 手順12の後に `new Set(calls4d1.map(c => c.hitbox + ':' + c.target)).size === calls4d1.length` が `true`（同じ斬撃Hitboxが同じ敵に2回当たっていない）。`new Set(calls4d1.filter(c => c.target === 敵のeventId).map(c => c.hitbox)).size` が命中回数と同じ（別々の斬撃に当たっている）。
14. **複数の敵**: プレイヤーの周囲に敵を2～3体置いてUを押す。1つの斬撃が複数の敵に当たり（`calls4d1` に同じ`hitbox`で別`target`が出る）、離れた敵には当たらない。
15. **ダメージでゲージが増えない**: 手順12・14のあと、`ug.getUltimateGauge()` が `0` のまま（`UltimateDamageGeneratesGauge` 既定false）。
16. **終了後にゲージを戻す**: `ug.addUltimateGauge(100, 'f8')` → `ug.isUltimateReady()` が `true`。
17. **2回目の発動**: Uを押す。ゲージが0になり、`hu.getHermesUltimateState().instanceId` が前回より1大きい（`2`）。6連斬撃がもう一度出る。
18. **発動中にもう一度**: 1行で実行 — `ug.addUltimateGauge(100,'f8'); var r1 = ua.requestUltimateActivation('f8'); ug.addUltimateGauge(100,'f8'); var r2 = ua.requestUltimateActivation('f8'); console.log(r1.reason, r2.reason, r2.handlerReason, ug.getUltimateGauge(), hu.getHermesUltimateState().instanceId)`。期待は `started ultimateStartFailed ultimateEffectActive 100` と、進行中のinstance ID。終わったら（約1秒後）`ug.getUltimateGauge()` が `100` のまま。
19. **崩壊中は発動不可**: 奥義が終わったあと `gm.damagePersistentUltimate(100000)` → `god:"collapsed"`。`ug.addUltimateGauge(100,'f8')` でゲージ100にしてUを押す。`activation.reason` が `"persistentUltimateUnavailable"`、ゲージ100のまま、斬撃は出ない。約15秒待つ（メニュー・会話中は進まない）と `god:"active"` に戻り、Uで発動できる。
20. **通常のHermesカード**: 手札の剣・高速移動・認識阻害・葦笛をキー1～5で使い、従来どおり動く（剣は前方に斬撃Hitboxが出て従来どおりのダメージ。奥義中に剣を使っても奥義の斬撃は続き、常駐Hermesは1体のまま `gm.getPersistentUltimateSummon()`、`gm.getActiveSummons()` に剣の一時召喚だけが出る）。
21. **発動中に戦闘終了**: 1行で実行 — `ug.addUltimateGauge(100,'f8'); ua.requestUltimateActivation('f8'); var mid4d1 = hu.getHermesUltimateState(); d.endCardBattle(); console.log(mid4d1 && mid4d1.instanceId, hu.isHermesUltimateActive(), hu.getActiveHitboxes().length, hu.getHermesUltimateLastResult().outcome, ug.hasUltimateGaugeState())`。期待は `数値 false 0 battleEnded false`（Hitboxが残らず、ゲージは返らない）。その後 `d.startCardBattle().ok` で戦闘を再開すると、ゲージは0から。
22. **Apolloに本番Ultimateは無い**: `d.endCardBattle(); d.setUltimateRing('apollo'); d.startCardBattle(); ug.addUltimateGauge(100,'f8'); ua.requestUltimateActivation('f8').reason` が `"noUltimateHandler"`、`ug.getUltimateGauge()` が `100`、`ua.getRegisteredUltimateGods()` が `["hermes"]`。
23. **F8にExceptionが出ていない**こと。最後に一時データを復元する。

```js
clearInterval(timer4d1);
PluginManager.callCommand = callCommand4d1;
d.endCardBattle();
extras4d1.forEach(c => d.definitions.cards.delete(c.cardId));
$gameSystem._projectRCardDeckData = backup4d1;
console.log(d.isCardBattleActive(), hu.isHermesUltimateActive(), hu.getActiveHitboxes().length);
```

期待は `false / false / 0`。

## 自動確認

`tests/ProjectR_HermesUltimate.phase4d1.test.cjs`（41件）。導入版Action Engineの実Collision・`spawnEventHitbox`・`UpdateEventHp`、実Hendrix Keyboard、実MZ Input、実Manager・実Gauge・実Activation・実CardBattleInputを使い、handlerもfakeではなく本番のものを使います。MZ実画面・人の操作確認は別途必要です。

既存テストの更新（挙動の変更ではなく前提の更新）: `tests/ProjectR_HermesSwordsmanship.test.cjs` の「Skills.jsonの先頭237件が当時と同一」は、未使用だったID235を除いて比較するようにしました。`tests/ProjectR_UltimateActivation.phase4c.test.cjs` の「Ultimate関連のHermesファイルが存在しない」は、Apollo側のみ未実装を確認するようにしました。
