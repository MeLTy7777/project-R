# Phase 4D-2 Apollo Ultimate（2つ目の本番Ultimate handler）

## 範囲

- 実装したのは **Apollo の Ultimate** です。名称「アポロン奥義」・矢の本数・間隔・扇の角度・ダメージ式はすべて**仮**です（最終的な設定・Lore・バランスではありません）。
- 流れ: `Uキー → Phase 4Cの検証 → Apollo handler → 開始成功 → Phase 4Cがゲージを100→0に消費 → 7本の黄金の矢を扇状に連射 → 各矢がDatabase Skillのダメージ → 終了`。
- Hermes Ultimate（Phase 4D-1）は**変更していません**。これで Hermes と Apollo の2神に本番handlerがあります。他の神（janus/themis/athena）にはありません（`noUltimateHandler`のまま）。
- 新しいplugin `js/plugins/ProjectR_ApolloUltimate.js` を追加し、`js/plugins.js` に1件登録しました（カード用pluginの最後、`ProjectR_ApolloLyreCalm` の直後）。
- 専用Skillは `data/Skills.json` の **ID234**（元は未使用の空きスロット。配列の長さ240は変わらず、他のSkillは1件も変えていません）。
- 専用の矢Prefabは `data/Map002.json` の **Event ID 5「ProjectR Apollo Ultimate Arrow」**（新規追加。既存のID1〜4は1文字も変えていません）。
- 変更していないもの: Core、CardBattleInput、GodSummonManager、Damage Bridge、UltimateGauge、UltimateActivation、Golden Arrow（Skill 236・Prefab ID3）、Disease Attack（Skill 238/239・State 33）、Lyre Calm（State 34）、Hermes系の全plugin、Hermes Ultimate（Skill 235）、Hendrix/DotMove/Action Combat本体、保存形式。

## 矢のPrefab（再利用しなかった理由）

- Golden ArrowのPrefab（ID3）は note に `<dmg: 黄金の弓矢>` が固定されており、矢ごとにSkillを切り替えられません。ダメージの元を実行時に書き換えるとGolden Arrow自体が変わってしまうため、**専用Prefab（ID5）**を作りました。
- ID5は ID3 とnote以外が完全に同じです（見た目 `VFX/$Bullet`、`moveToPosition('forward')` の直進、`wait 90` → `DestroyEvent` の90フレーム寿命、`through:true`）。noteは `<projectRApolloUltimate> <dmg: アポロン奥義> <attacker: player> <hitbox: 0.3, 0.3>`。
- 専用タグ `<projectRApolloUltimate>` は Golden Arrow（`<projectRGoldenArrow>`）・Disease（`<projectRDiseaseAttack>`）のタグを含まないため、互いの判定・破棄に影響しません。

## 仮仕様（Plugin Parameterで変更できます）

| Parameter | 既定 | 内容 |
|---|---|---|
| `ArrowCount` | 7 | 矢の本数（1～15、整数に切り捨て） |
| `ArrowIntervalSeconds` | 0.10 | 発射間隔（秒）。1有効frame = 1/60秒で進める |
| `SpreadStepDegrees` | 10 | 扇の1段の角度（0～90度） |
| `ProjectileLifetimeFrames` | 90 | 矢1本の寿命（有効frame）。Prefabの寿命と同じ |
| `UltimateDamageGeneratesGauge` | false | 奥義のダメージでUltimate Gaugeを得るか |

不正な値（空・範囲外・数値でない）は既定値に戻ります。

## 矢の列とタイミング

- 基準角は**発動の瞬間のマウス方向（上=0度・時計回り、小数可）を1回だけ**固定します。以後にマウスを動かしても、残りの矢の向きは変わりません。各矢は発射時の角度のまま直進します（追尾・貫通・爆発なし）。
- 7本の順序: `基準 → +10 → -10 → +20 → -20 → +30 → -30`。基準が0度なら `0, 10, 350, 20, 340, 30, 330`、23.75度なら `23.75, 33.75, 13.75, 43.75, 3.75, 53.75, 353.75`。4方向に丸めません。
- 発動の瞬間に1本目を生成します。これに失敗すると発動全体が失敗します（ゲージは100のまま、状態・矢は残りません）。2本目以降は有効frame 6/12/18/24/30/36（0.10秒間隔）、最後の矢まで約0.6秒です。
- 全ての矢が命中するか寿命で消えると、奥義は「完了」になります（最も遅くて最後の矢の発射から91有効frame後）。
- メニュー・会話・イベント実行中・フォーカス喪失中は**次の矢を撃ちません**（カードの戦闘時間と同じ判定 `ProjectRCardBattleInput.canAcceptInput()` を使用）。`setTimeout` は使いません。戦闘外では矢は出ません。

## 発射位置（選んだ原点）

- 各矢を生成する**瞬間のプレイヤー位置**（`$gamePlayer._realX/_realY`）です。Golden Arrowと同じ原点で、矢の間にプレイヤーが移動すれば、その後の矢はその位置から出ます。**プレイヤーは動かしません。**
- 常駐Apolloの論理アンカーは**使いません**。アンカーはプレイヤーから左上に`(-0.75, -0.75)`tileずれた派生位置のため、プレイヤーが壁際にいると壁の中や壁の向こうに矢が生成され、壁との即時衝突や生成不良の原因になり得ます。プレイヤー位置なら必ず通行可能な点です。
- Apolloは概念上の発射元です（神のスプライトはまだありません）。実際の神の見た目ができた段階で、安全な原点を再検討してください。

## ダメージ

- 専用Skill（ID234 `アポロン奥義`、note `<ProjectRUltimate: apollo_ultimate>`）。式は **`a.atk * 0.9 - b.def * 0.4`**（1本あたり。分散・会心なし）。7本全部が当たると 約6.3×atk と、Golden Arrow（`a.atk * 2 - b.def`）より1本あたりは控えめです。仮バランス。
- 経路はGolden Arrowと同じです: `checkCollide` → `UpdateEventHp(-damage)` → `DestroyEvent`。攻撃者は `<attacker: player>`（矢のEventが発生源）。HPの直接減算はしません。**Disease等のStateは付与しません。**
- **1本の矢は最大1体にだけ1回**当たり、命中した矢はその場で消えます（貫通なし）。**別の矢は同じ敵に当たれます。** プレイヤーの目の前の大きなボスなら、7本全部が同じ敵に当たります。HPが0の敵や、途中で倒れた敵には追加ダメージを与えず、矢は敵を通過して飛び続けます。
- Ultimate instance IDは発動ごとに一意の数値（実行時のみ・保存しない）。ゲージ加算IDに使います。

## ゲージ

- **このpluginはゲージを消費・加算・リセットしません。** handlerが `{ ok:true, started:true }` を返した直後に、Phase 4Cが `consumeUltimateGauge()` で100→0にします。
- 既定（`UltimateDamageGeneratesGauge=false`）では、奥義のダメージで**ゲージは増えません**（Phase 4Bの経路を呼びません）。`true` にすると、既存の `ProjectRUltimateGauge.trackDamage`（Phase 4B）を通して**実際に減ったHP**に応じて加算します（オーバーキルは実HP分）。attackIdは `apolloUltimate:<instance>:arrow:<矢番号>` で、Phase 4Bが敵IDを付けて gain ID（`damage:apolloUltimate:1:arrow:0:<敵ID>`）にします。式（DamageGainRate等）は複製していません。
- 発動後に矢が全て外れても、戦闘終了・マップ移動で中断しても、Apolloが崩壊しても、**ゲージは返しません**。

## 同時実行・崩壊・後始末

- 発動中に再度要求すると、handlerが `ultimateEffectActive` で拒否します。Phase 4Cでは `reason: "ultimateStartFailed"`、`handlerReason: "ultimateEffectActive"` になり、**ゲージは変わりません**（外部からゲージを100に戻していても同様）。
- 通常のカード（Golden Arrowなど）は奥義中も使えます。奥義は一時召喚を作らず、常駐Apolloを増やしません。Golden Arrow・Disease・Lyre Calmの動作は変わりません。
- Hermes Ultimateとは**別のplugin・別の実行時状態**です。命中記録などを共有しません（1戦闘で選べる神は1つですが、実装は互いの状態を壊さないようにしてあります）。
- 開始に成功した連射は、発動中にApolloが崩壊しても**最後まで続きます**（既に出た矢も消さず、返金もしません。崩壊・復帰のルールは変更なし）。崩壊中の発動は従来どおり `persistentUltimateUnavailable`。
- 戦闘終了（`endCardBattle`）・マップ移動・ロード（Mapの入れ替え）・戦闘が非アクティブになった場合は、奥義を即中断して**この奥義の矢だけ**を除去します（Golden Arrow・Diseaseの弾は触りません）。`checkCollide`が`$gameSystem`に作るこの矢の衝突履歴も同時に片付けます。
- 途中の矢の生成に失敗した場合はその矢だけ欠け、残りは続きます。更新中の例外は`Game_Map.update`を壊さず、片付けて終了します。
- 何も保存しません。保存形式は変わりません。

## 診断API（`au = ProjectRApolloUltimate`、読み取り専用のコピー）

| API | 内容 |
|---|---|
| `au.isApolloUltimateActive()` | 発動中か（連射中、または矢が飛行中） |
| `au.getApolloUltimateState()` | 発動中なら `{ instanceId, baseDegree, arrowCount, arrowDegrees, launchedArrows, failedArrows, currentArrowIndex, hitCount, launching, elapsedSeconds, activeProjectiles }`、なければ`null` |
| `au.getApolloUltimateLastResult()` | 直前の奥義の結果 `{ instanceId, outcome: "completed"/"battleEnded"/"mapChanged"/"error", arrowCount, launchedArrows, failedArrows, hitCount, elapsedSeconds }` |
| `au.getActiveProjectileCount()` / `au.getActiveProjectiles()` | 飛行中の矢の数 / 各矢 `{ eventId, arrowIndex, degree, rotation, x, y, framesLeft }` |
| `au.getConfig()` / `au.getRegistration()` | 有効な設定値 / handler登録の結果 |

## MZ実機確認（ユーザーが起動）

既存セーブへは上書きしないでください。キーを押すときは**ゲーム画面をクリックしてフォーカスを戻してから**押してください（F8 Consoleにフォーカスがあるとキーはゲームに届きません）。ダメージを確認する敵は、`<enemy>` と HP が設定された普通の敵Eventを、プレイヤーの近く（1タイル以内、できれば矢の進行方向）に置いてください。

準備（F8 Console。Phase 2C-6と同じ一時定義で30枚デッキを作り、Apolloを常駐Ultimateにして戦闘を開始する）:

```js
var d = ProjectRCardDeck, ug = ProjectRUltimateGauge, ua = ProjectRUltimateActivation, gm = ProjectRGodSummonManager, au = ProjectRApolloUltimate;
d.endCardBattle();
var backup4d2 = d.getPersistentData();
var extras4d2 = [3, 2, 1, 3, 2].map((maxCopies, i) => ({ cardId: '__phase4d2_manual_' + i, ringId: 'hermes', maxCopies, cooldownSeconds: 1, maxLevel: 3, targetType: 'instant' }));
if (extras4d2.some(c => d.definitions.card(c.cardId))) throw Error('fixture already exists');
['hermes', 'apollo'].forEach(id => { if (!d.assignRingToPlayer(id).ok) throw Error('move outside existing combat first'); });
new d.DefinitionRegistry(extras4d2).cardDefinitions().forEach(c => d.definitions.cards.set(c.cardId, c));
d.definitions.cardDefinitions().forEach(c => d.setCardOwned(c.cardId));
d.setDeck(d.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId)));
console.log(JSON.stringify(d.setUltimateRing('apollo')));
if (!d.startCardBattle().ok) throw Error('battle start failed');
var show4d2 = () => console.log(JSON.stringify({ gauge: ug.getUltimateGauge(), ready: ug.isUltimateReady(), god: gm.getPersistentUltimateStatus(),
  active: au.isApolloUltimateActive(), state: au.getApolloUltimateState(), last: au.getApolloUltimateLastResult(),
  activation: ua.getLastUltimateActivationResult() && { ok: ua.getLastUltimateActivationResult().ok, reason: ua.getLastUltimateActivationResult().reason, handlerReason: ua.getLastUltimateActivationResult().handlerReason } }));
// 矢が発射されるたびに表示。ダメージ(UpdateEventHp)の発生源(矢)と対象も記録する。
var last4d2 = -1, timer4d2 = setInterval(() => { var s = au.getApolloUltimateState();
  if (s && s.currentArrowIndex !== last4d2) { last4d2 = s.currentArrowIndex;
    var a = au.getActiveProjectiles().find(x => x.arrowIndex === s.currentArrowIndex);
    console.log('arrow', s.currentArrowIndex + 1 + '/' + s.arrowCount, 'degree', a && a.degree, 'elapsed', s.elapsedSeconds.toFixed(3)); }
  if (!s) last4d2 = -1; }, 10);
var calls4d2 = [], callCommand4d2 = PluginManager.callCommand;
PluginManager.callCommand = function(self, plugin, name, args) {
  if (name === 'UpdateEventHp') calls4d2.push({ arrow: self._eventId, target: Number(args.eventId), hpBefore: $gameMap.getCurrentEventHp(Number(args.eventId)) });
  return callCommand4d2.apply(this, arguments); };
show4d2();
```

1. **Apolloを選ぶ**: 上の準備で `setUltimateRing('apollo')` が `ok:true` を返す。`d.getUltimateRingId()` が `"apollo"`。
2. **指輪が主人公所持**: `d.hasPlayerRing('apollo')` が `true`。`gm.getPersistentUltimateStatus()` が `"active"`、`gm.getPersistentUltimateGodId()` が `"apollo"`。
3. **戦闘開始**: `d.isCardBattleActive()` が `true`、`ua.getRegisteredUltimateGods()` が `["apollo","hermes"]`、`ug.hasUltimateGaugeState()` が `true`。
4. **ゲージを100にする**: `ug.addUltimateGauge(100, 'f8')`。`ug.isUltimateReady()` が `true`、`ug.getUltimateGauge()` が `100`。
5. **マウスを狙う**: ゲーム画面の、プレイヤーから見て分かりやすい方向（例: 真上や右）にマウスを置く。
6. **Uを押す**: ゲーム画面をクリックし、マウスを動かさずに**Uキーを1回**押す。
7. **ゲージが0**: `show4d2()` で `gauge:0`、`activation.reason` が `"started"`。
8. **7本の矢**: Consoleに `arrow 1/7 ...` から `arrow 7/7` が約0.10秒間隔（最後まで約0.6秒）で出る。発動中は `au.isApolloUltimateActive()` が `true`、`au.getApolloUltimateState().instanceId` が数値（1回目は`1`）。画面に黄金の矢（既存の`$Bullet`）が7本、扇状に飛ぶ。
9. **扇の広がり**: `degree` の列が基準角に対して `+0, +10, -10, +20, -20, +30, -30`（360度の小数角）の順。矢が真っすぐ飛び、曲がらない。
10. **途中でマウスを動かす**: ゲージを`ug.addUltimateGauge(100,'f8')`で戻し、Uを押した直後にマウスを大きく動かす。Consoleの `degree` の列が手順9と同じ並び（基準角はUを押した瞬間の方向）で、残りの矢の向きが変わらない。
11. **1体に複数回命中**: プレイヤーの隣（1タイル以内）の進行方向に、HPの多い敵（ボス想定）を置いてUを押す。`au.getApolloUltimateLastResult().hitCount` が2以上（目の前なら最大7）、敵のHPが `$gameMap.getCurrentEventHp(敵のeventId)` で複数回に分けて減っている。ダメージ1回分は `a.atk * 0.9 - b.def * 0.4`（actorの攻撃力・敵の防御力から）。
12. **各矢は1回だけ**: 手順11の後に `new Set(calls4d2.map(c => c.arrow)).size === calls4d2.length` が `true`（同じ矢が2回当たっていない）。命中した矢は画面から消える（貫通しない）。
13. **外れた場合**: 敵のいない方向にUを押す。矢は約1.5秒（90フレーム）飛んで消え、`au.getApolloUltimateLastResult()` が `outcome:"completed"`、`hitCount:0`。`ug.getUltimateGauge()` は `0` のまま（返金なし）。
14. **ステートが付かない**: 手順11の敵に病（State 33）やLyre（State 34）が付いていない（敵の状態を確認、またはHPバー付近に状態アイコンが無い）。
15. **ダメージでゲージが増えない**: 手順11の後、`ug.getUltimateGauge()` が `0` のまま（`UltimateDamageGeneratesGauge` 既定false）。
16. **ゲージを戻す**: `ug.addUltimateGauge(100, 'f8')` → `ug.isUltimateReady()` が `true`。
17. **2回目の発動**: Uを押す。ゲージが0になり、`au.getApolloUltimateState().instanceId` が前回より1大きい（`2`）。7本がもう一度出る。
18. **発動中にもう一度**: 1行で実行 — `ug.addUltimateGauge(100,'f8'); var r1 = ua.requestUltimateActivation('f8'); ug.addUltimateGauge(100,'f8'); var r2 = ua.requestUltimateActivation('f8'); console.log(r1.reason, r2.reason, r2.handlerReason, ug.getUltimateGauge(), au.getApolloUltimateState().instanceId)`。期待は `started ultimateStartFailed ultimateEffectActive 100` と、進行中のinstance ID。矢が出きるまで待っても `ug.getUltimateGauge()` は `100` のまま。
19. **崩壊中は発動不可**: 奥義が終わったあと `gm.damagePersistentUltimate(100000)` → `god:"collapsed"`。`ug.addUltimateGauge(100,'f8')` でゲージ100にしてUを押す。`activation.reason` が `"persistentUltimateUnavailable"`、ゲージ100のまま、矢は出ない。約15秒待つ（メニュー・会話中は進まない）と `god:"active"` に戻り、Uで発動できる。
20. **通常のApolloカード**: 手札の黄金の弓矢・病攻撃・竪琴をキー1～5で使い、従来どおり動く（黄金の弓矢は従来どおりのダメージ。奥義中に使っても奥義の矢は続き、常駐Apolloは1体のまま `gm.getPersistentUltimateSummon()`、`gm.getActiveSummons()` に一時召喚だけが出る）。
21. **HermesのUltimateは従来どおり**: `d.endCardBattle(); d.setUltimateRing('hermes'); d.startCardBattle(); ug.addUltimateGauge(100,'f8'); ua.requestUltimateActivation('f8').reason` が `"started"`。`ProjectRHermesUltimate.isHermesUltimateActive()` が `true`、6連斬撃が出る（矢は出ない）。`au.isApolloUltimateActive()` は `false`。
22. **発動中に戦闘終了**: Apolloに戻して（`d.endCardBattle(); d.setUltimateRing('apollo'); d.startCardBattle();`）1行で実行 — `ug.addUltimateGauge(100,'f8'); ua.requestUltimateActivation('f8'); var mid4d2 = au.getApolloUltimateState(); d.endCardBattle(); console.log(mid4d2 && mid4d2.instanceId, au.isApolloUltimateActive(), au.getActiveProjectileCount(), au.getApolloUltimateLastResult().outcome, ug.hasUltimateGaugeState())`。期待は `数値 false 0 battleEnded false`（矢が残らず、ゲージは返らない）。その後 `d.startCardBattle().ok` で戦闘を再開すると、ゲージは0から。
23. **F8にExceptionが出ていない**こと。最後に一時データを復元する。

```js
clearInterval(timer4d2);
PluginManager.callCommand = callCommand4d2;
d.endCardBattle();
extras4d2.forEach(c => d.definitions.cards.delete(c.cardId));
$gameSystem._projectRCardDeckData = backup4d2;
console.log(d.isCardBattleActive(), au.isApolloUltimateActive(), au.getActiveProjectileCount());
```

期待は `false / false / 0`。

## 自動確認

`tests/ProjectR_ApolloUltimate.phase4d2.test.cjs`（49件）。導入版Action Engineの実Collision・`spawnEvent`・`UpdateEventHp`・`DestroyEvent`、実Hendrix Keyboard、実MZ Input、実Manager・実Gauge・実Activation・実CardBattleInput・実Golden Arrow・実Hermes Ultimateを使い、handlerもfakeではなく本番のものを使います。MZ実画面・人の操作確認は別途必要です（このfixtureでは矢の移動自体は行われないため、矢の位置は敵を重ねて確認しています。実際の飛行は上の手順で確認してください）。

既存テストの更新（挙動の変更ではなく前提の更新）: `tests/ProjectR_HermesSwordsmanship.test.cjs` と `tests/ProjectR_HermesUltimate.phase4d1.test.cjs` の「Skills.jsonが当時と同一」は、未使用だったID234（Apollo Ultimate専用になった）も除いて比較するようにしました。`tests/ProjectR_UltimateActivation.phase4c.test.cjs` の「Ultimate関連のApolloファイルが存在しない」は、「各神のUltimateは別pluginにある」の確認に変えました（その試験はActivation単体を読み込むので、`noUltimateHandler` の検証自体は従来どおり有効です）。Phase 4D-1の文書の手順3・22（`["hermes"]`・Apolloは`noUltimateHandler`）はPhase 4D-1時点の記述です。
