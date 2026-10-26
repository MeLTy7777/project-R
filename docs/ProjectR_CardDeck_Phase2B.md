# Phase 2B Apollo「黄金の弓矢」実機確認

## 接続内容

- `ProjectR_ApolloGoldenArrow.js`をCore/Inputの後に登録。既存direction handler登録APIで`apollo_golden_arrow`だけを実発動へ接続し、他6カードはPhase 2Aの仮成功を維持する。
- Map002の新規Prefab **ID 3 / ProjectR Apollo Golden Arrow**を使用。既存Bullet（ID 1）・Gun（ID 2）・CE1～4は変更しない。画像は既存`VFX/$Bullet`を使用し、新規VFX/神Spriteは作らない。
- 発射時のマウス画面座標とプレイヤーscreenX/Yから360度角を1回だけ求める。これはEngineの`rotateTo('mouse or gamepad')`のマウス分岐と同じ角度規約（上0・右90）。Gamepad接続中も必ずマウスを使うため、公式の数値overload `rotateTo(degree)`へ固定角を渡す。
- 導入済み`Game_Map.spawnEvent(templateId, x, y, false, degree)`は生成IDを同期的に返す。戻った実イベントとrotation設定を検証した場合だけhandler成功。null・例外・回転失敗時は新たな専用弾だけを公式破棄し、失敗を返す。Routerが非消費を保証する。
- Prefabのカスタム移動ルートは`moveToPosition('forward')`を反復。実移動はAction Combat→DotMoveSystemへ委譲し、マウスを再参照しない。移動速度はMZ設定6、hitboxは0.3×0.3。並列イベントのWait 90フレーム→`DestroyEvent`で寿命を制限する。
- 既存`<enemy>`を持ちHPが残るイベントについて、`checkCollide(enemyId, '<projectRGoldenArrow>')`を呼ぶ。第1引数はDamage受け手、第2引数の弾がDamage source。逆向きにするとSkill Damageの経路にならないため、敵を受け手にする。
- 弾の`<dmg: 黄金の弓矢><attacker: player>`により、公式`calculateDamageAgainstEvent`→`SHendrix_Action`→Database Skillの式・属性・命中/回避・Critical等を使う。HP変更は公式`UpdateEventHp`（`eventId: 敵ID`, `value: '-damage'`）。独自HP減算・Collision計算はない。
- CollisionManager.lastSourceEventIdで命中した追跡中の弾を特定し、Damage適用直後にその1発を`DestroyEvent`（permanent=false）で消す。同じ弾が次の敵へ残らない。既存`<destroyProjectile>`やmap boundaryとの公式Collisionでも破棄する。
- カード消費・4秒Cooldown・即時ドローは既存Router/Sessionに任せる。missでも生成が成功していれば消費済みとなる。Collision前にはDamageを適用しない。
- 弾の追跡はローカル一時状態。終了・マップ切替で専用弾だけを除去。Save関数・Phase 1永続形式は未変更。Engine標準のMap保存に非恒久Prefabが含まれた場合、ロード後`Scene_Map.onMapLoaded`で未追跡の専用弾を除去する。

## Database

既存SkillsはID 235までで、Apollo/黄金の弓矢に対応するSkillはなかったため、末尾へ**ID 236「黄金の弓矢」**を追加した。既存Skillは上書きしない。

仮設定: HP Damage、物理、無属性、式`a.atk * 2 - b.def`、命中設定100、分散10、Critical可、MP/TP消費0。最終バランスではない。式・属性・命中・Critical・effects等はDatabase側で変更する。Action Combatが対応するSkill効果の範囲は導入済みEngineに従う。

プラグインはID 236をハードコードせず、Skill noteの`<ProjectRCard: apollo_golden_arrow>`から一意なSkillを解決する。Prefabの`<dmg: Skill名>`との一致も検証する。Skill名を改名する場合はPrefabのdmgタグも合わせる。CardDefinitionのmaxCopies=3、maxLevel=3、Cooldown=4秒、targetType=directionは維持する。

## MZでの確認（ユーザーが起動）

1. ProjectR_RebuildのGame.rmmzprojectをMZで開き、テストプレイを開始する。既存セーブに上書き保存しない。
2. 画面内に生存敵のいない安全な場所でF8 Consoleを開く。下記で検証用30枚デッキを準備する。7実カードの上限合計は19枚のため、一時定義11枚分を補う。恒久データは最後に復元する。
3. コード内でApollo/Hermes指輪を主人公所有にし、Card Battleを開始する。既存CombatPresenceがactiveの場所では指輪移動を拒否するので、安全な場所に移動してから行う。
4. コード内で低水準のPhase 1 APIを使い、黄金の弓矢をhand[0]へ送る。これは検証用の手札準備で、他カードの実効果は発動させない。

```js
var cd2b = ProjectRCardDeck;
cd2b.endCardBattle();
var backup2b = cd2b.getPersistentData();
var extras2b = [3, 2, 1, 3, 2].map((maxCopies, i) => ({
    cardId: '__phase2b_manual_' + i, ringId: 'hermes', maxCopies,
    cooldownSeconds: 1, maxLevel: 3, targetType: 'instant'
}));
if (extras2b.some(c => cd2b.definitions.card(c.cardId))) throw Error('fixture already exists');
['hermes', 'apollo'].forEach(id => {
    if (!cd2b.assignRingToPlayer(id).ok) throw Error('move outside existing combat first');
});
new cd2b.DefinitionRegistry(extras2b).cardDefinitions().forEach(c => cd2b.definitions.cards.set(c.cardId, c));
cd2b.definitions.cardDefinitions().forEach(c => cd2b.setCardOwned(c.cardId));
cd2b.setDeck(cd2b.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId)));
console.log(cd2b.startCardBattle());
while (cd2b.getBattleState().hand[0]?.cardId !== 'apollo_golden_arrow') {
    cd2b.useBattleCard(cd2b.getBattleState().hand[0].instanceId);
}
console.log(cd2b.getBattleState().hand);
```

5. Consoleを閉じ、ゲームへフォーカスを戻す。既存の`<enemy>`を持つ敵（Map001の「公式銃テスト敵」等）の近くへ移動する。
6. 敵へマウスを向け、黄金の弓矢の枠に対応するキーを押す（直後の準備状態なら **1**）。左クリックは不要。
7. 弾がマウス方向へ直進し、発射後にマウスを動かしても追尾しないことを確認する。上下左右・斜め8方向と、45度刻みでない方向でも確認する。繰り返す場合は手札内の黄金の弓矢の新しい枠を確認する。
8. 敵のHitboxへ命中するとHP表示が減り、弾が消えることを確認する。敵に重ならない発射ではHPを減らさず、弾は寿命で消える。1発が複数の敵へ貫通しないことも確認する。
9. F8 Consoleを開き、`ProjectRCardBattleInput.getLastResult()`のsuccess、cardId、instanceId、結果stateのcooldownPileを確認する。生成時点で使用カードが4秒Cooldownへ移り、手札5枚へ即時補充されていること。ゲーム内で4秒経過後は該当カードがdiscardへ戻る（メニュー/Console中はPhase 2AのCooldownが停止）。
10. `ProjectRApolloGoldenArrow.getActiveProjectiles()`で追跡弾を確認できる。命中/寿命後は該当弾がなくなる。F8 ConsoleにExceptionがないことを確認する。
11. 終了時は次を実行する。検証用デッキのまま保存しない。

```js
cd2b.endCardBattle();
extras2b.forEach(c => cd2b.definitions.cards.delete(c.cardId));
$gameSystem._projectRCardDeckData = backup2b;
console.log(cd2b.isCardBattleActive(), cd2b.getBattleState(), ProjectRApolloGoldenArrow.getActiveProjectiles());
```

期待: false / null / []。通常の移動、J/左クリック/RTの銃・Sword入力も維持する。

## 自動確認と証拠の範囲

```powershell
node tests/ProjectR_CardDeckCore.test.cjs
node tests/ProjectR_CardDeckCore.phase15.test.cjs
node tests/ProjectR_CardDeckCore.phase2a.test.cjs
node tests/ProjectR_ApolloGoldenArrow.test.cjs
node --check js/plugins/ProjectR_ApolloGoldenArrow.js
node --check js/plugins.js
git diff --check
```

Phase 2Bテストは導入済みEngineのspawnEvent、rotateTo、moveToPosition、CollisionManager、タグindex、回転Hitbox、Skill Damage計算、UpdateEventHp、DestroyEventとMZのGame_Actionを実ソースから読み込む。描画クラス・敵/主人公ステータス・DotMoveの最終移動先はVM用fixture。移動は公式forwardからDotMoveへの固定角委譲までを検証し、実画面上の速度・見た目・命中範囲・DotMoveの実移動・90フレーム寿命の時間経過は上記MZ手順で確認する。MZは自動起動していない。

## 公式根拠

[Collision Checking](https://www.rpgmakeractioncombat.com/2026/07/04-collision-checking.html)、[Player Setup](https://www.rpgmakeractioncombat.com/2026/07/08-setup-player.html)を参照した。[Dynamic Event](https://www.rpgmakeractioncombat.com/2026/07/03-dynamic-event.html)と[Damage Calculation](https://www.rpgmakeractioncombat.com/2026/07/17-damage-calculation.html)のWeb本文は取得制限のため、導入済みAction Engine 1.6.6bのHeaderとAPIを根拠とした。

主なローカル根拠: EngineのspawnEvent Header/実装、`Game_Map.spawnEvent`、`Game_Character.rotateTo`、`Game_Character.moveToPosition`、`window.checkCollide`、`calculateDamageAgainstEvent`、UpdateEventHp/DestroyEvent各登録、`SprocessStateApplicationH`。独自Projectile/Collision/Damage計算の代替実装は追加しない。
