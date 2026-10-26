# Phase 2C-4 Hermes「剣術攻撃」

## 実装と調整

- `hermes_sword_attack`を専用`ProjectR_HermesSwordsmanship`へ接続。Coreは既存handlerを取得する`getActivationHandler(targetType)`の1行追加のみ。登録済みGolden Arrowへ他のdirectionを委譲し、他のtargetTypeは変更しない。
- 発動時に`TouchInput - player.screenX/Y`で角度を固定する。上0・右90度、小数角の360度対応。発動後のmouse/player移動やgamepad入力には追尾しない。
- 公式`spawnEventHitbox`でDynamic Eventを1回生成。Prefab/Map002追加なし。位置は公式spawnのplayer座標基準`centerPositionPoint() - 0.5`に方向ベクトルを加える。`player front`の4方向化を避け、数値position/rotationDegreeを渡し、生成物と`rotateTo(number)`の結果を同期検証する。`PluginManager.callCommand`はコマンドの戻り値を返さないため、イベント前後差分で検証する。
- 仮Parameterは前方中心0.75tile、Hitbox幅1.5×奥行1.5tile、寿命3frame。正面の先端は約1.5tile（四角の角や敵自身のHitbox幅も判定へ含む）。後からPlugin Parameterで変更可能。生成位置に固定し、追従しない。
- 導入版`setRotation`初回は`_realY -= 0.5`、Collisionは回転時の半tile補正を行う。真上は数学的に同値の360度を渡し、0度だけ非回転判定へ入る分岐を避ける。公開debug情報の`degree`は0～360未満、`rotation`は導入版へ渡した角度。
- Dynamic Eventの並列Interpreter開始に依存しないよう`wait`は空にし、操作可能なmap更新3回で除去。各更新でCollisionを確認し、3回目の判定後に消す。`sceneActive=false`/`eventsPaused`中は専用処理を停止する。
- 既存`<enemy>`を対象に、斬撃ごとの一意タグで`checkCollide(enemyId, tag)`。`CollisionManager.lastSourceEventId`を確認し、公式`UpdateEventHp`の`value: '-damage'`を即時要求する。独自HP減算・当たり判定・敵分類は追加しない。同一斬撃から同一敵へは1回、複数敵には各1回、後のframeで範囲へ入った敵にも命中可能。
- 既存CE3は`<weaponAttack>`を主人公武器として計算するため、そのタグを付けない。黄金の弓矢と同じ専用タグ方式を使い、通常Swordの`<playerAttack>`とも競合させない。
- 生成と方向設定の成功で既存Routerが消費・3秒CD・即時ドロー。空振りも成功。生成失敗/不正方向は`activationFailed`で非消費、生成済みの専用イベントも除去する。
- 寿命/終了/マップ切替/ロード時の除去は、公式Dynamic寿命スクリプトと同じ`CollisionManager.clearCollisions`、`removeEventFromTagIndex`、該当イベント解除に、描画・DotMove一時キャッシュ・専用Collision履歴の片付けを加える。第三者本体/Save API/Phase 1永続形式を変更しない。

Skill **ID 237「ヘルメース剣術」**を末尾へ追加。既存Skillを上書きしない。式 **`a.atk * 2 - b.def`**、物理HP Damage、無属性、分散0、Criticalなし、命中100、MP/TP消費0。すべてPhase 2C-4の仮バランスでDatabaseから変更可能。Plugin内にDamage値を固定しない。`<ProjectRCard: hermes_sword_attack>`で一意に解決し、`<dmg: ヘルメース剣術><attacker: player>`を生成する。名前変更もタグ生成へ反映する（同名Skillは不可）。

## 導入版・公式資料

導入版Action Engine 1.6.6bのHeaderと実装を照合した。

- [公式Player Setup](https://www.rpgmakeractioncombat.com/2026/07/08-setup-player.html)：前方Dynamic、1.5四方、3frame構成。
- [公式Collision Checking](https://www.rpgmakeractioncombat.com/2026/07/04-collision-checking.html)：`checkCollide`による接触判定。
- [公式Dynamic Event](https://www.rpgmakeractioncombat.com/2026/07/03-dynamic-event.html)、[公式Damage Calculation](https://www.rpgmakeractioncombat.com/2026/07/17-damage-calculation.html)：今回の取得はそれぞれ429/アクセス制限で本文未取得。API引数は推測せず導入版実装を根拠にした。
- 照合API：`spawnEventHitbox(name, notetag, comment, position, rotationDegree, turnToward, attachTo, wait)`のコマンド引数、`Game_MaithlDynamicEvent`、`rotateTo(number)`、`checkCollide`、`getCurrentEventHp`、`UpdateEventHp`、`calculateDamageAgainstEvent`、`SHendrix_Action`。
- `DestroyEvent`はDynamicを判別するが呼出先`unspawnEvent`がTemplate専用で戻る。`DestroyDynamicEvent`は50ms後に現在のmap/IDを参照するため、3frame寿命・移動時cleanupには採用しない。専用adapterは公式Dynamicの同期寿命スクリプトを参照した。

## MZ実機確認（ユーザーが起動）

自動テストはVM上で導入版のDynamic生成・Collision幾何・Skill Damage実コードを実行する。描画・実入力・完全なmap更新はfixtureなので、以下は別途実施する。既存セーブへ上書き保存しない。

1. MZで本プロジェクトを開きテストプレイ。安全な地点でF8 Consoleを開き、次を実行する。Hermes/Apollo指輪を主人公所持にし、検証用30枚デッキを作る。本番7種は上限合計19枚のため一時定義11枚を補う。最後に復元する。

```js
var cd2c4 = ProjectRCardDeck;
cd2c4.endCardBattle();
var backup2c4 = cd2c4.getPersistentData();
var extras2c4 = [3, 2, 1, 3, 2].map((maxCopies, i) => ({
    cardId: '__phase2c4_manual_' + i, ringId: 'hermes', maxCopies,
    cooldownSeconds: 1, maxLevel: 3, targetType: 'instant'
}));
if (extras2c4.some(c => cd2c4.definitions.card(c.cardId))) throw Error('fixture already exists');
['hermes', 'apollo'].forEach(id => {
    if (!cd2c4.assignRingToPlayer(id).ok) throw Error('move outside existing combat first');
});
new cd2c4.DefinitionRegistry(extras2c4).cardDefinitions().forEach(c => cd2c4.definitions.cards.set(c.cardId, c));
cd2c4.definitions.cardDefinitions().forEach(c => cd2c4.setCardOwned(c.cardId));
if (!cd2c4.setDeck(cd2c4.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId))).ok) {
    throw Error('deck setup failed');
}
if (!cd2c4.startCardBattle().ok) throw Error('battle start failed');
var prepareSword2c4 = () => {
    cd2c4.updateCooldown(12); // 再試験の準備時だけCDを送る。実測中は実行しない。
    for (var n = 0; n < 60; n++) {
        var hand = cd2c4.getBattleState().hand;
        var index = hand.findIndex(c => c.cardId === 'hermes_sword_attack');
        if (index >= 0) {
            window.swordBefore2c4 = { instanceId: hand[index].instanceId, state: cd2c4.getBattleState() };
            console.log('Card key:', index + 1);
            return index;
        }
        if (!hand[0]) throw Error('restart verification battle');
        cd2c4.useBattleCard(hand[0].instanceId);
        cd2c4.updateCooldown(12);
    }
    throw Error('sword card not found');
};
var swordSlot2c4 = prepareSword2c4();
```

2. 敵なしで主人公の右へmouseを置き、Consoleを閉じて表示された1～5キーを押す（クリック不要）。F8で`ProjectRCardBattleInput.getLastResult()`が`success`、手札から使用Instanceが消え、即時補充されたことを確認する。`cd2c4.getBattleState().cooldownPile.find(c => c.instance.instanceId === swordBefore2c4.instanceId)`で残CDを確認する。3秒は操作可能時間で測る。F8までの進行分だけ減る。
3. 各回`prepareSword2c4()`で準備し、右・左・上・下・斜め4方向と中間角を試す。発動直後mouseを動かしても方向・位置が変わらないこと。通常移動でもHitboxを引きずらないこと。
4. Engineのdebug表示（既定9キー）をONにし、主人公前方の短寿命Hitboxを確認する。3frameで短いため必要なら画面録画をコマ送りし、8方向・中間角・真上で位置が飛ばないこと、3更新後に残らないことを見る。VFX/召喚Spriteは今回ない。
5. 生存敵1体の近距離へ向けて使用しHP Damageを確認。同じ斬撃が3frame接触しても1Hitのみ。敵を背後/範囲外に置いた空振りはDamageなしでカードを消費する。Damageの数値は主人公atk/敵defとSkill237で決まる。
6. 近接した敵2体をHitboxに収めて使用し、双方へ各1Hit。最初の1体に当たっても判定全体が早期消滅しないこと。
7. 空振り・命中どちらも3秒Cooldownと即時ドローを確認する。押しっぱなしで連続発動しないこと。
8. F8で`$gameSystem._projectRCardDeckData.ringOwnershipState.hermes`を一時的に`'unowned'`へ変更して使用し、`cardUnavailable`、手札維持・新CDなしを確認。元の`'player'`へ戻す。戦闘外も発動しないこと。
9. 生成失敗はConsoleで一時的に`PluginManager._commands['Hendrix_Action_Engine:spawnEventHitbox']`を退避し、空関数に差し替えて1度試す。`activationFailed`、手札/山札/CD維持を確認したら、必ず退避した関数を戻す（ゲームを再起動しても戻る）。
10. 通常Swordを通常入力で使用し、既存の向き/Hitbox/Damageが正常であること。Golden Arrow、認識阻害、葦笛、高速移動、G17、Visionは既存手順どおり確認する。F8にExceptionがないこと。
11. Battle終了、マップ移動、テスト用別セーブのロードで専用Hitboxが残らず、既存弾/通常Swordのイベントを消さないこと。保存互換の実機確認では既存セーブを上書きしない。
12. 終了後、次で一時データを復元する。

```js
cd2c4.endCardBattle();
extras2c4.forEach(c => cd2c4.definitions.cards.delete(c.cardId));
$gameSystem._projectRCardDeckData = backup2c4;
console.log(cd2c4.isCardBattleActive(), cd2c4.getBattleState()); // false / null
```

## 自動確認

既存Phase 1～2C-3.1の7ファイル174件と、`tests/ProjectR_HermesSwordsmanship.test.cjs`の追加27件を実行する。通常Swordは既存イベントを変更せず専用処理に巻き込まないことをVMで確認する。MZ実機での通常Sword操作は上記手順で別確認。

```powershell
node tests/ProjectR_CardDeckCore.test.cjs
node tests/ProjectR_CardDeckCore.phase15.test.cjs
node tests/ProjectR_CardDeckCore.phase2a.test.cjs
node tests/ProjectR_ApolloGoldenArrow.test.cjs
node tests/ProjectR_HermesRecognitionObscure.test.cjs
node tests/ProjectR_HermesReedFluteSleep.test.cjs
node tests/ProjectR_HermesSwiftMovement.test.cjs
node tests/ProjectR_HermesSwordsmanship.test.cjs
node --check js/plugins/ProjectR_CardDeckCore.js
node --check js/plugins/ProjectR_HermesSwordsmanship.js
node --check tests/ProjectR_HermesSwordsmanship.test.cjs
node --check js/plugins.js
node -e 'JSON.parse(require("fs").readFileSync("data/Skills.json", "utf8"));'
git diff --check
```
