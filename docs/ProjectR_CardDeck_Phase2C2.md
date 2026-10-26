# Phase 2C-2 Hermes「葦笛睡眠」

## 実装と接続範囲

- 専用State **32「睡眠」**をDatabase末尾に追加。既存ID 10「睡眠」は被ダメージ・ターン解除のため再利用しない。ID 1～31と空欄は変更しない。
- コードは`<ProjectRCard: hermes_reed_flute_sleep>`からStateを一意に解決する。traits空、restriction=0、被ダメージ・ターン・歩数による解除なし。HP回復・無敵・Projectile/Hitbox削除は行わない。
- `ProjectR_HermesReedFluteSleep`を認識阻害の後に登録。Phase 1.5の`ground`定義と12秒Cooldownを維持し、専用handlerでキー入力直後に主人公周囲へ適用する。マウス操作は不要。召喚演出は将来`activate`から`applySleep`までの間に追加できる。
- 半径`RangeTiles=4`、効果時間`DurationSeconds=4.0`はプラグイン管理で変更可能。既存Inputの`updateCooldown(1/60)`で操作可能時間を計測する。メニュー・会話・フォーカス喪失・カード戦闘非稼働中は進行しない。壁時計の停止時間やMZのターンは使わない。
- 1体以上State適用を確認できたときだけ成功。対象0体・全員耐性・全員付与失敗なら`activationFailed`で手札/山札/Cooldownを維持する。再使用は重複なしで残り時間を4秒へ更新する。
- 戦闘終了・次戦開始・マップ切替・ロードで解除。残り時間はローカルMapのみ保持し、標準セーブの敵Battler/リンク先Actorコピーから睡眠だけ除外する。実体や他State、Phase 1の保存形式は維持する。
- 現在のCommon Eventsは攻撃・Collision用で、移動/攻撃/索敵の開始を安全に統括する共通Enemy AIはない。今回は個別Enemy Eventを変更せず、**AIの完全停止は未接続**。将来の共通Enemy/Boss AIは新しい移動・攻撃・索敵を始める直前に下記APIを確認する。既に発生した攻撃やDamage処理には接続しない。
  - `ProjectRHermesReedFluteSleep.isEventSleeping(eventId)`：公式Stateを参照。
  - `ProjectRHermesReedFluteSleep.canEnemyAct(eventId)`：上記の否定（行動開始の睡眠条件だけ）。
- ボス耐性はEnemy Databaseの「ステート無効化: ID 32」または「ステート有効度: ID 32」を設定する。公式AddStateが処理し、個別Bossデータは今回変更しない。

## Action Combat API根拠

[公式Manual](https://www.rpgmakeractioncombat.com/2025/)と導入版`Hendrix_Action_Engine.js` 1.6.6bのHeader/実装を確認。

- `findTargets('<enemy>')`は導入済みの公開関数。既存タグ索引（未索引なら公式fallback）から複数イベントを返す。
- `checkRange(enemyId, 4, 'player')`は円形・tile単位。導入版のtargetイベントID指定は未実装なので、敵ごとに主人公への距離を公式判定する。視野角/遮蔽を指定しない円は主人公中心の円と等価。副作用の敵検知情報とdebug rangeは呼出後に復元する。
- `getCurrentEventHp(eventId)`で生存対象を確認し、独自HPは作らない。
- `AddState`は`{target: String(eventId), stateId: '32'}`。`hasState(eventId, 32)`で成功確認。
- `RemoveState`は`{stateId: '32'}`のみ。HeaderはState CE内向けだが、導入版実装は呼出元`interpreter._eventId`の敵Battlerを解除する。State CEは追加しない。
- 公式State処理と共通の内部`SgetBattlerForH(event)`を最小adapterで利用し、Database耐性・生存/掃除対象Battlerを共有する。マップ差替え/付与後例外の掃除だけMZ標準`removeState`を使用する。

## MZ実機確認（ユーザーが起動）

1. MZで本プロジェクトを開きテストプレイする。既存セーブへ上書きしない。Map001の「公式銃テスト敵」（`<enemy>`と`<hp: ゴブリン>`）を検証用に使う。タグのない「テスト用ゴブリン」は対象外。
2. F8 Consoleで以下を実行する。Hermes指輪を主人公所持にし、手札へ葦笛を配置する。本番7カードは合計19枚のため、既存Phase手順と同様に一時定義11枚を補う。

```js
var cd2c2 = ProjectRCardDeck;
cd2c2.endCardBattle();
var backup2c2 = cd2c2.getPersistentData();
var extras2c2 = [3, 2, 1, 3, 2].map((maxCopies, i) => ({
    cardId: '__phase2c2_manual_' + i, ringId: 'hermes', maxCopies,
    cooldownSeconds: 1, maxLevel: 3, targetType: 'instant'
}));
if (extras2c2.some(c => cd2c2.definitions.card(c.cardId))) throw Error('fixture already exists');
['hermes', 'apollo'].forEach(id => {
    if (!cd2c2.assignRingToPlayer(id).ok) throw Error('move outside existing combat first');
});
new cd2c2.DefinitionRegistry(extras2c2).cardDefinitions().forEach(c => cd2c2.definitions.cards.set(c.cardId, c));
cd2c2.definitions.cardDefinitions().forEach(c => cd2c2.setCardOwned(c.cardId));
cd2c2.setDeck(cd2c2.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId)));
if (!cd2c2.startCardBattle().ok) throw Error('battle start failed');
var prepareSleep2c2 = () => {
    for (var n = 0; n < 30; n++) {
        var hand = cd2c2.getBattleState().hand;
        var index = hand.findIndex(c => c.cardId === 'hermes_reed_flute_sleep');
        if (index >= 0) { console.log('Card key:', index + 1); return index; }
        if (!hand[0]) throw Error('restart verification battle');
        cd2c2.useBattleCard(hand[0].instanceId);
    }
    throw Error('no available sleep card');
};
var sleepSlot2c2 = prepareSleep2c2();
cd2c2.updateCooldown(12); // 初回発動前に検証用の使用済み札を捨て札へ戻す。
```

3. 生存敵1体を主人公から4tile以内に配置する。Consoleなら`$gameMap.event(2).locate($gamePlayer.x + 2, $gamePlayer.y)`。通行可能な場所で行う。Consoleを閉じ、表示されたカードキー（1～5）を押す。クリックなしで発動する。
4. すぐF8で`ProjectRCardBattleInput.getLastResult()`の`success`を確認する。`hasState(2, 32)`と`ProjectRHermesReedFluteSleep.isEventSleeping(2)`がtrue、`canEnemyAct(2)`がfalse。`cd2c2.getBattleState()`で使用InstanceがCooldownへ移り、残りが約12秒、手札が即時補充されることを確認する。
5. Consoleを閉じて約4秒動作後、State/APIがfalseへ戻ることを確認する。途中でメニュー・会話・フォーカス喪失を挟み、操作不能時間は数えないことも確認する。
6. 検証用マップで同じ`<enemy>`敵を複数配置（MZ上での複製はユーザー操作）。円内2体と4tile外1体で、内側だけが睡眠になることを確認する。斜め4×4tileは円外。対象0体、全員State32無効化でも使用失敗・非消費になることを確認する。一部耐性では残りの敵に適用され消費する。
7. 12秒Cooldownが戻った後、再使用更新を確認する。Consoleで次を実行する。

```js
sleepSlot2c2 = prepareSleep2c2();
console.log(cd2c2.requestUseCard(sleepSlot2c2));
sleepSlot2c2 = prepareSleep2c2();
```

8. Consoleを閉じ約3秒後、表示されたキーで別Instanceを使用する。最初の発動から4秒を過ぎてもStateが継続し、2回目から約4秒後に解除されることを確認する。敵Battlerの`_states.filter(id => id === 32).length`は1。既存攻撃でDamageを与えてもSleepは解除されず、HP回復・無敵化・既存弾/Hitboxの消去は発生しないことを確認する。
9. 睡眠中に`cd2c2.endCardBattle()`で解除されることを確認する。F8にExceptionがないこと。AI停止は未接続なので、既存敵の移動/攻撃停止を合格条件にしない。
10. Action Combatのプラグイン設定「Debug Hitbox Button」（導入版既定9）で通常の範囲表示を確認できる。葦笛検索はAI検知情報を復元するため、そのままでは範囲を保持表示しない。必要ならF8で`checkRange('player', 4, '<enemy>')`を実行して主人公中心4tileのdebug円を表示し、終了後は検証戦闘を終了する。Stateは上記公式`hasState`で確認する。
11. 最後に一時データを復元する。

```js
cd2c2.endCardBattle();
extras2c2.forEach(c => cd2c2.definitions.cards.delete(c.cardId));
$gameSystem._projectRCardDeckData = backup2c2;
console.log(cd2c2.isCardBattleActive(), ProjectRHermesReedFluteSleep.isEventSleeping(2));
```

期待は`false / false`。Golden Arrowと認識阻害の実機回帰はPhase 2B/2C-1手順を参照。

## 自動確認

既存Phase 1～2C-1の105件と新規Phase 2C-2テストを実行する。新規テストは公式findTargets/checkRange/checkInRange/AddState/RemoveState/hasState/State耐性とMZのEnemy/Battler State/Damage実ソースを使用する。描画/マップ配置/入力環境はVM fixture。MZ実画面・人の操作確認は別途必要。
