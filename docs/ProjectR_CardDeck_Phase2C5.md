# Phase 2C-5 Apollo「病の矢」(Disease Attack)

## 実装

- `apollo_plague_attack`（direction・12秒Cooldown・Apollo指輪）を専用`ProjectR_ApolloDiseaseAttack`へ接続。Coreの`getActivationHandler`で前のhandlerを連鎖するので、Golden Arrow / Hermes各カード / 通常Sword / G17 / Visionは変更なし。登録は`ProjectR_HermesSwordsmanship`の後。
- 弾: Map002に専用Prefab ID 4「ProjectR Apollo Disease Attack」を追加（Golden ArrowのPrefab 3と同構造、タグ`<projectRDiseaseAttack>`）。発射時のPlayer→Mouse角を`spawnEvent`＋`rotateTo(degree)`で一度だけ固定し、`moveToPosition('forward')`で直進。追尾・貫通・複数Hitなし。生成/回転に失敗したら`activationFailed`（非消費）。空振りは消費。
- 初撃: `checkCollide(敵ID, '<projectRDiseaseAttack>')`後、Skill **238「アポロン病攻撃」**を`<dmg: アポロン病攻撃><attacker: player>`＋`UpdateEventHp(-damage)`で適用（仮式 `a.atk * 1 - b.def`、分散0。黄金の弓矢の `a.atk * 2 - b.def` より弱い）。
- Disease: State **33「病」**（`<ProjectRCard: apollo_plague_attack>`、traits空・Damage/ターン/歩行で解除なし）。初撃後に公式`AddState`→`hasState`で確認。敵が初撃で倒れた場合は付与しない。
- DoT: Skill **239「病ダメージ」**（`<ProjectRCard: apollo_plague_attack_dot>`、仮式 `a.atk * 0.5 - b.def * 0.5`、分散0）。公式`calculateDamageAgainstEvent`で計算し、公式`UpdateEventHp`の数値で適用（独自の`hp -= x`・独自HPなし）。
- 仮設定（Plugin Parameter）: `DurationSeconds=6.0`、`TickIntervalSeconds=1.0`、`MaxTicks=6`。再命中は非stackで残り6秒・1秒タイマーを初期化。Damageでは解除しない。
- 時間: 認識阻害/睡眠と同じ`deck.updateCooldown`（Inputの1/60秒）。メニュー・会話・フォーカス喪失・カード戦闘非稼働中は進まない。
- 耐性: Database/公式AddStateに委譲。耐性（ステート無効化/有効度0）の敵は初撃のみ、Disease/DoTなし。カード発動自体は成功。
- 終了: `endCardBattle()`・マップ切替(`Game_Map.setup`)・ロードで弾、State、タイマーを破棄。Stateは標準セーブからも除外（実行時タイマーは保存されない）。永続セーブ形式は不変。
- 照会API（将来のAI/UI向け）: `ProjectRApolloDiseaseAttack.isEventDiseased(eventId)`、`getRemainingSeconds(eventId)`、`getActiveProjectiles()`。
- 未実装（範囲外）: Apollo召喚演出、Disease VFX、感染拡大、複数弾、貫通、AoE、Lyre、Ultimate、神HP、Party/Boss AI、HUD。

## MZ実機確認（ユーザーが起動）

自動テストはVM上の導入版Action Engine実コードを使うが、描画・実入力はfixtureです。以下は別途お願いします。既存セーブへは上書きしないでください。

1. テストプレイを開始し、F8 Consoleで以下を実行する（Apollo/Hermes指輪を所持、検証用30枚デッキ、手札先頭に病の矢）。本番7種は19枚のため一時定義11枚を補う。

```js
var cd2c5 = ProjectRCardDeck;
cd2c5.endCardBattle();
var backup2c5 = cd2c5.getPersistentData();
var extras2c5 = [3, 2, 1, 3, 2].map((maxCopies, i) => ({
    cardId: '__phase2c5_manual_' + i, ringId: 'hermes', maxCopies,
    cooldownSeconds: 1, maxLevel: 3, targetType: 'instant'
}));
if (extras2c5.some(c => cd2c5.definitions.card(c.cardId))) throw Error('fixture already exists');
['hermes', 'apollo'].forEach(id => {
    if (!cd2c5.assignRingToPlayer(id).ok) throw Error('move outside existing combat first');
});
new cd2c5.DefinitionRegistry(extras2c5).cardDefinitions().forEach(c => cd2c5.definitions.cards.set(c.cardId, c));
cd2c5.definitions.cardDefinitions().forEach(c => cd2c5.setCardOwned(c.cardId));
cd2c5.setDeck(cd2c5.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId)));
if (!cd2c5.startCardBattle().ok) throw Error('battle start failed');
var prepare2c5 = id => {
    for (var n = 0; n < 30; n++) {
        var hand = cd2c5.getBattleState().hand;
        var index = hand.findIndex(c => c.cardId === id);
        if (index >= 0) { console.log('Card key:', index + 1); return index; }
        if (!hand[0]) throw Error('restart verification battle');
        cd2c5.useBattleCard(hand[0].instanceId);
    }
    throw Error('no available card');
};
var slot2c5 = prepare2c5('apollo_plague_attack');
cd2c5.updateCooldown(12);
```

2. Consoleを閉じ、Map001の`<enemy>`付き敵（公式銃テスト敵）の方向へマウスを向け、表示されたカードキー（1～5）を押す。複数の方向（上下左右・斜め）で発射し、弾が直進し追尾しないことを確認する（再度使うにはConsoleで`slot2c5 = prepare2c5('apollo_plague_attack'); cd2c5.updateCooldown(12);`）。
3. 命中時に初撃Damage（仮設定で約30）が入り、弾が消えること。F8で`ProjectRApolloDiseaseAttack.isEventDiseased(2)`（敵のEvent ID）がtrue、`getRemainingSeconds(2)`が約6。
4. 約1秒ごとにHPが減る（約15ずつ）ことを確認する。約6秒後に`isEventDiseased`がfalseに戻り、DoTは合計6回で止まる。途中でメニュー・会話・ウィンドウのフォーカス喪失を挟むと時間が進まない。
5. DoT中にもう一度命中させ、重複せず（`$gameMap.event(2)`の敵Battler `_states`で33が1つ）残り時間が約6秒へ戻り、次のDoTが約1秒後になることを確認する。Damageを受けても病は解除されない。
6. Enemy Databaseで検証用敵に「ステート無効化: 病(33)」を設定し、命中時は初撃だけでDisease/DoTがないこと、カードは消費されることを確認する。
7. 使用したカードが12秒Cooldownへ入り、手札が即時補充されること（`cd2c5.getBattleState()`）を確認する。
8. Golden Arrowが従来どおり発射・命中できることを確認する。
9. F8にExceptionが出ていないこと。`cd2c5.endCardBattle()`でDisease/弾が消えることを確認する。
10. 最後に一時データを復元する。

```js
cd2c5.endCardBattle();
extras2c5.forEach(c => cd2c5.definitions.cards.delete(c.cardId));
$gameSystem._projectRCardDeckData = backup2c5;
console.log(cd2c5.isCardBattleActive(), ProjectRApolloDiseaseAttack.getActiveProjectiles().length);
```

期待は`false / 0`。

## 自動確認

`tests/ProjectR_ApolloDiseaseAttack.test.cjs`（22件）。導入版Action Engineの実Collision・`checkCollide`・`UpdateEventHp`・`calculateDamageAgainstEvent`・`AddState`/`RemoveState`/`hasState`・State耐性とMZ標準Battler/Stateの実ソースを使用。描画・マップ配置・入力環境はVM fixture。MZ実画面・人の操作確認は別途必要。