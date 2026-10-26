# Phase 2C-6 Apollo「リラの支援」(Lyre / 精神安定)

## 実装

- `apollo_lyre_calm`（Apollo指輪・10秒Cooldown・targetType `ally`）を新規`ProjectR_ApolloLyreCalm`へ接続。Coreの`ally`種別handlerを使い、他のallyカードは前のhandlerへ委譲。Golden Arrow / Disease / Hermes各カード / 通常Sword / G17 / Visionは変更なし。カード定義・Coreは未変更。
- 対象選択・マウス不要。発動すると、Database State **34「精神安定」**を公式`AddState`（target: player）で付与し、`hasState('player', 34)`で確認。確認できた場合だけ成功（消費・10秒Cooldown・即時ドロー）。
- 精神異常State（解除・耐性の対象）は、State 34の特徴「ステート無効化」に持たせる。初期値は**睡眠(32)のみ**。認識阻害(31)・病(33)は対象外。恐怖・混乱などを足す場合は、DatabaseでState 34の「ステート無効化」を追加するだけでよい（プラグイン変更不要）。
- 耐性はMZ標準の「ステート無効化」で実現（公式`AddState`も標準`addState`も`isStateResist`を見る）。独自の付与割込みはない。MZ標準の`refresh`が、無効化対象のStateを付与時に消すため、解除もこの特徴で行われる。プラグインは念のため公式`RemoveState`でも解除する（再使用時に混入していた場合など）。
- 解除対象が無くてもCalmだけで成功。付与失敗（耐性・死亡・コマンド欠落・例外）は`activationFailed`で非消費・Cooldownなし・手札不変。付与後の例外では、先に消えた精神異常Stateも元へ戻す。
- 持続時間は`DurationSeconds: 6.0`（Plugin Parameter）。再使用は非stackで残り6秒に更新し、解除も再実行。カードは通常どおり消費される。
- 時間は認識阻害/葦笛睡眠/病と同じ`deck.updateCooldown`で進む。メニュー・会話・フォーカス喪失・カード戦闘非稼働中は停止。
- `endCardBattle()`でCalmを公式`RemoveState`で解除し、タイマーも破棄。残り時間とCalmは保存しない（Actor保存用コピーからState 34を除外、ロード時にタイマー破棄）。恒久データ形式は不変。
- 照会API: `ProjectRApolloLyreCalm.isPlayerCalm()`、`getRemainingSeconds()`、`getMentalStateIds()`。
- 未実装（範囲外）: Apollo召喚演出、音楽/VFX、味方対象、パーティ全体、回復、Ultimate、神HP、Party/Boss AI、HUD。

## MZ実機確認（ユーザーが起動）

既存セーブへは上書きしないでください。

1. Apollo指輪を主人公所持にする。F8 Consoleで次を実行し、Lyreを手札へ準備する（本番7種は19枚のため一時定義11枚を補う）。

```js
var cd2c6 = ProjectRCardDeck;
cd2c6.endCardBattle();
var backup2c6 = cd2c6.getPersistentData();
var extras2c6 = [3, 2, 1, 3, 2].map((maxCopies, i) => ({
    cardId: '__phase2c6_manual_' + i, ringId: 'hermes', maxCopies,
    cooldownSeconds: 1, maxLevel: 3, targetType: 'instant'
}));
if (extras2c6.some(c => cd2c6.definitions.card(c.cardId))) throw Error('fixture already exists');
['hermes', 'apollo'].forEach(id => {
    if (!cd2c6.assignRingToPlayer(id).ok) throw Error('move outside existing combat first');
});
new cd2c6.DefinitionRegistry(extras2c6).cardDefinitions().forEach(c => cd2c6.definitions.cards.set(c.cardId, c));
cd2c6.definitions.cardDefinitions().forEach(c => cd2c6.setCardOwned(c.cardId));
cd2c6.setDeck(cd2c6.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId)));
if (!cd2c6.startCardBattle().ok) throw Error('battle start failed');
var prepare2c6 = id => {
    for (var n = 0; n < 30; n++) {
        var hand = cd2c6.getBattleState().hand;
        var index = hand.findIndex(c => c.cardId === id);
        if (index >= 0) { console.log('Card key:', index + 1); return index; }
        if (!hand[0]) throw Error('restart verification battle');
        cd2c6.useBattleCard(hand[0].instanceId);
    }
    throw Error('no available card');
};
prepare2c6('apollo_lyre_calm');
cd2c6.updateCooldown(10);
var player2c6 = $gameParty.leader();
```

2. 戦闘開始後、睡眠を主人公へ付与する: `PluginManager.callCommand({ _eventId: 0 }, 'Hendrix_Action_Engine', 'AddState', { target: 'player', stateId: '32' }); player2c6.isStateAffected(32)` → `true`。
3. 続けて認識阻害と病も付与する（Lyreが対象外であることの確認用）: `[31, 33].forEach(id => player2c6.addState(id));`
4. 表示されたカードキー（1～5）を押してLyreを使う。
5. 確認: `player2c6.isStateAffected(32)` が`false`（睡眠解除）、`isStateAffected(34)` と `ProjectRApolloLyreCalm.isPlayerCalm()` が`true`、`getRemainingSeconds()` が約6。
6. Calm中に睡眠を再付与できない: `PluginManager.callCommand({ _eventId: 0 }, 'Hendrix_Action_Engine', 'AddState', { target: 'player', stateId: '32' }); player2c6.isStateAffected(32)` → `false`。
7. 認識阻害(31)・病(33)は解除も耐性もされない: `player2c6.isStateAffected(31)` と `isStateAffected(33)` が共に`true`のまま。
8. 約6秒（メニュー・会話・ウィンドウのフォーカス喪失を挟むとその間は進まない）で`isPlayerCalm()`が`false`、`isStateAffected(34)`が`false`。その後は睡眠を再び付与できる。
9. 再使用: `prepare2c6('apollo_lyre_calm'); cd2c6.updateCooldown(10);` で再び手札へ出し、Calm中（例: 3秒後）にもう一度使う。`isStateAffected(34)`が重複せず（`player2c6._states.filter(i => i === 34).length`が1）、`getRemainingSeconds()`が約6へ戻り、睡眠があれば再度解除される。
10. 使用したカードが10秒Cooldownへ入り、手札が即時補充されること（`cd2c6.getBattleState()`）を確認する。
11. F8にExceptionが出ていないこと。`cd2c6.endCardBattle()`でCalmが消える（`isPlayerCalm()`が`false`）ことを確認する。
12. 最後に一時データを復元する。

```js
cd2c6.endCardBattle();
extras2c6.forEach(c => cd2c6.definitions.cards.delete(c.cardId));
$gameSystem._projectRCardDeckData = backup2c6;
console.log(cd2c6.isCardBattleActive(), ProjectRApolloLyreCalm.isPlayerCalm());
```

期待は`false / false`。

## 自動確認

`tests/ProjectR_ApolloLyreCalm.test.cjs`（20件）。MZ標準Battler/Stateの実ソース（耐性・refresh含む）と導入版Action Engineの`AddState`/`RemoveState`/`hasState`実コードを使用。描画・入力環境はVM fixture。MZ実画面・人の操作確認は別途必要。
