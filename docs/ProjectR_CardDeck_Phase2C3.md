# Phase 2C-3 Hermes「高速移動」

## 実装

- `hermes_swift_movement`の既存instant定義・Hermes指輪条件・6秒Cooldownを維持。Core/Input/Phase 1の保存形式は変更しない。
- `ProjectR_HermesSwiftMovement`を認識阻害・葦笛の後へ登録。instantの認識阻害は公開した既存`activate(context)`へ委譲し、direction/ground handlerは変更しない。
- 発動時の`TouchInput.x/y`から、導入版`rotateTo`のmouse分岐と同じ`screenX/Y`基準で方向を取得する。tile幅/高さで距離へ換算。クリック不要、ゲームパッド接続有無にかかわらずマウスを使用する。整数tile/8方向へ丸めず、発動後のマウス変更は反映しない。
- 最大距離は実座標`_realX/Y`からユークリッド距離で**3tile**。遠距離は方向を保って3tile、近距離はカーソルまでの距離とする。45度方向も約2.121×2.121tileで3tile進む。
- DotMoveの正式な`player.mover().createCollisionChecker({ overComplementMode: true }).checkCollision(x, y, direction)`を使う最小adapter。最大1/16tile（Player矩形の幅/高さの半分以下）ごとに両軸の中間点と到達点を確認し、全判定を通過した座標だけ`setPosition`で適用する。最初の衝突で停止し、そのstep内だけを二分して障害物の直前へ詰める。slide、迂回、壁の反対側の着地点探索はしない。マップ端はループ/通行許可設定でも越えない。
- 通行設定は既存DotMove/Action Combatの`checkPassMass`→`isMapPassable`、Eventは`checkCollisionTargetCharacter`→`checkCollisionTargetEvent`を通す。通常通過不可の敵/通常Eventには停止し、すり抜け・通常優先度以外・既存のPlayer通過許可Eventは既存仕様を維持する。Player自身のThrough/DebugThrough中は非消費で発動を拒否する。
- 移動前後の有限な実座標を比較。実質0（0.0001tile以下）は`activationFailed`。この閾値はDotMoveの矩形判定誤差1/65536tileより大きくし、壁密着時の丸め誤差でカードを消費させない。例外/不正座標/3tile超の異常結果は標準`setPosition`で元位置へ戻す。完全停止時はカード/山札/手札/Cooldownを維持する。部分移動も成功とし、成功時だけ既存transactionで消費・6秒Cooldown・即時ドローする。
- 成功後はDotMoveの`cancelMove()`と標準`clearDestination()`で古い移動先を解除する。`setPosition`は既存DotMove aliasを通り、座標とマップのキャッシュを更新する。死亡等の`canMove()`禁止中/乗物中は発動しない。
- Damage、敵State、敵移動、I-frame、透明化、Hitbox無効化、Projectile削除、神召喚/VFXは追加しない。将来の演出は専用`activate`から`movePlayer`までの間へ挿入できる。

## 導入版APIの確認結果

`Hendrix_Action_Engine.js` **1.6.6b**と`DotMoveSystem.js` **2.2.4**の実ソースを確認。第三者プラグイン本体は変更していない。

- `dash(steps)`は`steps * distancePerFrame() * 3`を継続移動の距離とし、方向はスティック/仮想スティック/キー/4～8方向の現在向きから取得する。`_rotation`を読まないため、先にmouseへrotateしてもマウス360度方向・3tileにはならない。Player版はさらにスクロール更新を行う。今回の採用対象外。
- `moveToPosition(x, y)`/`moveToPosition('forward', tiles)`はDotMoveの継続移動を開始する。通常の毎フレームCollisionは使うが、呼出時点で移動完了しない。最初のstepが動いただけでカード消費を確定したり、別入力による継続移動変更を扱う変更をCoreへ広げたりしないため、今回は採用しない。
- `teleportTo(x, y)`/`findNearestValidPosition`は着地点だけを検査し、途中の壁/敵を検査しない。今回の高速移動では両APIを呼ばない。
- `rotateTo('mouse or gamepad')`はgamepadを優先し、mouse分岐では`TouchInput - screenX/Y`を使用する。`turnToward`は通常の4/8方向へ丸める。今回はmouse分岐の座標基準だけを使用し、入力機器切替/rotationの変更はしない。
- 正式なCollisionCheckerを各stepで直接使うことで、既存のtile通行/方向別通行/Event判定と、Action CombatのRegion・通行Event設定をそのまま参照する。独自Collision Engine/Pathfinding、through切替、Hitbox変更は追加しない。

## MZ実機確認（ユーザーが起動）

自動テストはVM上で導入版のDotMove CollisionChecker・幾何・Eventキャッシュ、Action CombatのEvent/通行alias、MZ通行判定とDotMoveの`setPosition`実ソースを使用する。地形・描画はfixture。MZ描画・人の操作・完全なゲーム更新の確認は未実施。既存セーブを上書きせず、一時検証データは最後に復元する。

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
5. 各回`swiftSlot2c3 = prepareSwift2c3()`で準備し、左・上・下・4斜め・その中間の角度を確認する。障害物なしで遠距離カーソルなら各方向で約3tile、近距離はカーソルまで進むこと。発動直後にmouseを動かしても進路が曲がらないこと。
6. 歩行中・小数座標の位置からも試し、座標ズレ、旧クリック移動先への引き戻し、操作不能が起きないこと。発動後のWASD/通常移動が機能すること。
7. 次を各回準備し直して確認する。通常歩行で通行できない壁/地形を使う（Region250等の通行許可地点は避ける）。
   - 壁に密着して壁方向へ発動：移動できず`activationFailed`、カード非消費・新規Cooldownなし・手札維持。
   - 壁まで1tile/2tileの空間を空けて発動：壁の直前で停止。少しでも進んだら成功し、消費・6秒Cooldown・即時ドロー。
   - 壁の反対側が空いている場所で壁の先へカーソルを置く：壁の手前で停止し、反対側へ抜けない。別の空き地点へ移らない。
   - 斜めの壁と角で4斜め方向へ発動：角抜けや壁沿いの進路変更がない。
   - 通常歩行で通過不可の通常Event/敵Eventへ発動：手前で停止。密着時は非消費。敵へのDamage/State/位置変化なし。通過可能Eventは既存歩行と同様に通過する。
8. 上下左右のマップ端で外方向へ発動する。map外へ出ず端で停止する。端に密着した完全停止なら非消費。マップの反対端へ回り込まない。
9. マウスを主人公の`screenX()/screenY()`と同じ位置へ合わせた場合も、実質移動0なら`activationFailed`で使用Instanceが手札に残り、新たなCooldownがないこと。
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

既存Phase 1～2C-2は127件。`tests/ProjectR_HermesSwiftMovement.test.cjs`は旧33件を今回の経路仕様に更新し、壁/斜め/角/片方向通行/通過不可Event/部分移動/4辺/細いEvent/方向固定等の14件を追加して47件。合計174件。Golden Arrowの実Damage/Collision/1Hitは既存19件の回帰テストで確認する。

```powershell
node tests/ProjectR_CardDeckCore.test.cjs
node tests/ProjectR_CardDeckCore.phase15.test.cjs
node tests/ProjectR_CardDeckCore.phase2a.test.cjs
node tests/ProjectR_ApolloGoldenArrow.test.cjs
node tests/ProjectR_HermesRecognitionObscure.test.cjs
node tests/ProjectR_HermesReedFluteSleep.test.cjs
node tests/ProjectR_HermesSwiftMovement.test.cjs
node --check js/plugins/ProjectR_HermesSwiftMovement.js
node --check tests/ProjectR_HermesSwiftMovement.test.cjs
git diff --check
```
