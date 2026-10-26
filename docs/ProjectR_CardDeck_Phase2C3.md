# Phase 2C-3 Hermes「高速移動」

## 実装

- `hermes_swift_movement`の既存instant定義・Hermes指輪条件・6秒Cooldownを維持。Core/Input/Phase 1の保存形式は変更しない。
- `ProjectR_HermesSwiftMovement`を認識阻害・葦笛の後へ登録。instantの認識阻害は公開した既存`activate(context)`へ委譲し、direction/ground handlerは変更しない。
- 発動時の`TouchInput.x/y`を`canvasToMapX/Y`でmap座標へ変換する。クリック不要、ゲームパッド接続有無にかかわらずマウスを使用する。
- 最大距離は実座標`_realX/Y`からユークリッド距離で**3tile**。遠距離は方向を保って制限し、制限位置の周囲の整数座標から3tile以内で最も近いものを選ぶ。これは座標の整数化だけで、通行判定や経路探索ではない。斜めでは例として2×2tile（約2.83tile）になる。近距離はカーソルのtileをそのまま指定する。
- 公式`findNearestValidPosition(x, y)`で補正先を取得し、補正先が3tile超/存在しない場合は移動せず失敗。実装済みの`$gamePlayer.teleportTo(x, y)`へ補正先を渡す。独自の壁判定・pathfindingは追加しない。
- 移動前後の有限な実座標を比較。変化なしは`activationFailed`。例外/非有限座標/3tile超の異常結果は標準`setPosition`で元位置へ戻す。失敗時はカード/山札/手札/Cooldownを維持する。成功時だけ既存transactionで消費・6秒Cooldown・即時ドローする。
- 成功後はDotMoveの`cancelMove()`と標準`clearDestination()`で古い移動先を解除する。`setPosition`は既存DotMove aliasを通り、座標とマップのキャッシュを更新する。死亡等の`canMove()`禁止中/乗物中は発動しない。
- Damage、敵State、敵移動、I-frame、透明化、Hitbox無効化、Projectile削除、神召喚/VFX/Cameraは追加しない。将来の演出は専用`activate`から`movePlayer`までの間へ挿入できる。

## 公式APIの確認結果

[公式Tutorial](https://www.rpgmakeractioncombat.com/2025/05/player-teleportation.html)はMovement Routeから`teleportTo('forward', distance)`/`dash(distance)`を呼ぶ方式を説明。
[公式Manual](https://www.rpgmakeractioncombat.com/2025/)には`teleportTo('mouse or gamepad', distance)`と座標指定が記載されている。

ただし導入版`Hendrix_Action_Engine.js` **1.6.6b**の`Game_Character.prototype.teleportTo(notetag, minDistance = null, maxDistance = null)`にはマウス指定分岐がない。未対応の引数は使用せず、実装確認済みの数値2引数overloadを使用する。数値はmapのx/yで、第二引数を距離として推測しない。公式Movement Route adapterも`this.teleportTo(...)`へ委譲するため、同期的な`$gamePlayer.teleportTo(x, y)`を使用し、既存移動ルートを上書きしない。

導入版は成功時も`undefined`を返すため戻り値では判定しない。`isValidPosition`はmap境界と着地点の4方向tile通行設定を確認し、`findNearestValidPosition`は周囲を探索する。**途中の壁やEnemy Eventとの衝突を検査するAPIではない**。この公式Teleportの性質を維持し、独自の経路Collisionは追加しない。壁内着地防止と、中間の壁を越えるTeleportの可否は実機で分けて確認する。

## MZ実機確認（ユーザーが起動）

自動テストはVM上で導入版のTeleport/通行補正、MZとDotMoveの`setPosition`実ソースを使用する。MZ描画・人の操作・完全なDotMove連続更新の確認は未実施。既存セーブを上書きせず、一時検証データは最後に復元する。

1. 本プロジェクトをMZで開きテストプレイする。F8 Consoleで以下を実行する。Hermes指輪を主人公所持にし、必要枚数の一時定義を補い、高速移動を手札へ配置してCard Battleを開始する（本番7カードだけでは30枚に不足する）。

```js
var cd2c3 = ProjectRCardDeck;
cd2c3.endCardBattle();
var backup2c3 = cd2c3.getPersistentData();
var extras2c3 = [3, 2, 1, 3, 2].map((maxCopies, i) => ({
    cardId: '__phase2c3_manual_' + i, ringId: 'hermes', maxCopies,
    cooldownSeconds: 1, maxLevel: 3, targetType: 'instant'
}));
if (extras2c3.some(c => cd2c3.definitions.card(c.cardId))) throw Error('fixture already exists');
['hermes', 'apollo'].forEach(id => {
    if (!cd2c3.assignRingToPlayer(id).ok) throw Error('move outside existing combat first');
});
new cd2c3.DefinitionRegistry(extras2c3).cardDefinitions().forEach(c => cd2c3.definitions.cards.set(c.cardId, c));
cd2c3.definitions.cardDefinitions().forEach(c => cd2c3.setCardOwned(c.cardId));
if (!cd2c3.setDeck(cd2c3.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId))).ok) {
    throw Error('deck setup failed');
}
if (!cd2c3.startCardBattle().ok) throw Error('battle start failed');
var prepareSwift2c3 = () => {
    // 再試験時だけCDを進め、同一戦闘で札を循環させる。
    cd2c3.updateCooldown(12);
    for (var n = 0; n < 60; n++) {
        var hand = cd2c3.getBattleState().hand;
        var index = hand.findIndex(c => c.cardId === 'hermes_swift_movement');
        if (index >= 0) {
            cd2c3.updateCooldown(12);
            window.swiftBefore2c3 = {
                x: $gamePlayer._realX, y: $gamePlayer._realY,
                instanceId: hand[index].instanceId,
                state: cd2c3.getBattleState()
            };
            console.log('Card key:', index + 1);
            return index;
        }
        if (!hand[0]) throw Error('restart verification battle');
        cd2c3.useBattleCard(hand[0].instanceId);
        cd2c3.updateCooldown(12);
    }
    throw Error('no available swift card');
};
var swiftSlot2c3 = prepareSwift2c3();
```

2. 広い通行可能地点に移動後、必要なら再び`prepareSwift2c3()`で開始位置を記録する。Consoleを閉じ、主人公の右へカーソルを置いて表示された1～5キーを押す。左クリックは不要。
3. F8で`ProjectRCardBattleInput.getLastResult()`が`success`、主人公だけが移動したことを確認する。以下で移動距離と使用Instanceを確認する。

```js
console.log('distance', Math.hypot(
    $gamePlayer._realX - swiftBefore2c3.x,
    $gamePlayer._realY - swiftBefore2c3.y
));
console.log(cd2c3.getBattleState().cooldownPile.find(
    c => c.instance.instanceId === swiftBefore2c3.instanceId
));
console.log('hand', cd2c3.getBattleState().hand);
```

4. 成功時は距離が0より大きく3以下、使用札が手札から消え、手札を即時補充すること。Cooldownは操作可能時間で6秒（F8を開くまでの進行分だけ減る）。メニュー/会話/フォーカス喪失中は既存仕様どおり停止する。キーを押し続けても2回目が発動しないこと。
5. 各回`swiftSlot2c3 = prepareSwift2c3()`で準備し、左・上・下・4斜めを確認する。3tile以上離れたカーソルは3tile以内、近距離はそのtileへ移動すること。斜めの整数化による距離短縮は正常。
6. 歩行中・小数座標の位置からも試し、座標ズレ、旧クリック移動先への引き戻し、操作不能が起きないこと。発動後のWASD/通常移動が機能すること。
7. 壁/通行不可地点へカーソルを置いて発動する。公式の近傍補正が使われ、通行不可tile内に着地しないこと。補正先が3tile超/ない/開始位置と同じなら失敗・カード非消費・新規Cooldownなし・手札維持。公式APIは中間経路を検査しないため、壁の向こうの通行可能tileへ移動する場合は別途記録する。
8. マップ端でマップ外方向へカーソルを置く。map外に出ず、補正先への移動または非消費の失敗になること。
9. 確実な失敗例は、主人公が整数座標で止まっているときに同じtileへカーソルを置く方法。`activationFailed`で使用Instanceが手札に残り、新たなCooldownがないこと。必要なら検証用にF8で`$gamePlayer.setPosition(Math.round($gamePlayer._realX), Math.round($gamePlayer._realY))`としてから準備する（通行可能地点のみ）。
10. Hermes指輪未所持/通常探索時の1～5で高速移動が発動しないこと。認識阻害（State31/5秒/更新/10秒CD）、葦笛（State32/半径4/複数敵/4秒/12秒CD）、Golden Arrow（360度/Skill Damage/Collision/1Hit）はPhase 2B～2C-2手順で回帰確認する。G17/Sword/既存Visionも変更前どおりであること。
11. 無敵化、敵へのDamage/State、敵Eventの移動、Hitbox無効化、既存Projectile削除が追加されていないこと。F8にExceptionがないこと。
12. 終了後は次で一時データを復元する。

```js
cd2c3.endCardBattle();
extras2c3.forEach(c => cd2c3.definitions.cards.delete(c.cardId));
$gameSystem._projectRCardDeckData = backup2c3;
console.log(cd2c3.isCardBattleActive(), cd2c3.getBattleState()); // false / null
```

## 自動テスト

既存Phase 1～2C-2は127件。追加の`tests/ProjectR_HermesSwiftMovement.test.cjs`は33件で、登録/公式API実装/8方向/距離制限/小数座標/近距離/通行補正/map端/失敗非消費/例外復元/6秒CD/即時ドロー/入力排他/無攻撃/既存Hermes/Saveを検証する。Golden Arrowの実Damage/Collision/1Hitは既存19件の回帰テストで確認する。
