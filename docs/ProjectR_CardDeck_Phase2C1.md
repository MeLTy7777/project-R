# Phase 2C-1 Hermes「認識阻害」実機確認

## 実装

- 新規`ProjectR_HermesRecognitionObscure.js`をCore/Input/Apolloの後に登録し、`instant` handlerで`hermes_perception_obscure`だけを実発動する。他のinstantカードはPhase 2Aの仮成功のまま。
- Stateは末尾へ追加した**ID 31「認識阻害」**。既存ID 1～30（空欄を含む）は変更しない。既存「隠れる」はターン制の狙われ率変更なので流用しない。コードはID固定ではなくnoteの`<ProjectRCard: hermes_perception_obscure>`から一意に解決する。
- Stateはtraits空、restriction=0、ターン・歩数・被ダメージでの自動解除なし。無敵・Damage無効・Projectile破棄は行わない。今回、Enemy/Bossの索敵や個別Eventは変更しない。
- 持続時間の仮値はプラグイン設定`DurationSeconds: 5.0`。効果時間だけをクロージャ内で保持し、既存Inputが呼ぶ`updateCooldown(1/60)`に合わせてゲーム内約5秒で解除する。MZのターンには依存しない。メニュー・会話・フォーカス喪失中は既存Cooldownとともに停止する。描画停止中の壁時計時間は数えない。
- 再使用はStateを1件だけ維持し、残り時間を設定値へ更新する。加算しない。カード自体は別Instanceとして通常消費され、既存10秒Cooldownへ移動し、即時ドローする。
- 公式付与後にStateを確認できた場合だけhandler成功。耐性・死亡・設定/API不足・例外は`activationFailed`となり、Routerが手札・Cooldown・山札を維持する。新規付与後の例外では標準Stateを解除して戻す。
- `endCardBattle()`/`endBattle()`/次戦開始/ロード/ニューゲームで解除する。主人公交代を次の時間更新で検出した場合は元Actorから解除する。
- 共通判定は`ProjectRHermesRecognitionObscure.isPlayerRecognitionObscured()`。内部で公式`hasState('player', stateId)`を確認し、タイマーを判定の根拠にしない。将来の新規ターゲット取得側からこのAPIを利用できる。
- 残り時間・ActivationはGameオブジェクトへ格納しない。MZのActor保存用コピーから専用Stateとそのターン数だけを除外し、プレイ中のState・他State・他プラグインの保存項目は維持する。Phase 1の恒久データ/versionは変更しない。

## 公式APIの確認根拠

[公式Manual（2025年一覧）](https://www.rpgmakeractioncombat.com/2025/)の`add state`、`remove state`、`hasState`、`checkRange`を確認。正確な引数と挙動は導入済み`Hendrix_Action_Engine.js`（1.6.6b）のHeader/登録関数でも確認した。

- `PluginManager.callCommand(interpreter, 'Hendrix_Action_Engine', 'AddState', { target: 'player', stateId: '31' })`。公式処理が主人公Actorの標準`addState`とState耐性を扱う。
- `hasState('player', 31)`で正式Stateの付与を確認する。
- `RemoveState`の引数は`{ stateId: '31' }`のみ。HeaderはState Common Event内向けだが、導入版の実装では呼出元`interpreter._eventId = 0`で主人公Actorの標準`removeState`を呼ぶ。今回はState CEを作らず、この確認済み分岐を使用する。主人公交代時の元Actor解除・例外時の復旧にはMZ標準`actor.removeState(stateId)`を使用する。
- `checkRange(source, range, target, eyeView?, blockRegionId, exceptionNotetag)`は公式の索敵用API。既存Common Eventsに今回接続可能な共通索敵処理はなく、個別イベント/本体へ変更を加えていない。

## MZ実機確認（ユーザーが起動）

1. ProjectR_Rebuildの`Game.rmmzproject`をMZで開き、テストプレイを開始する。画面内に生存敵のいない安全な場所へ移動する。既存セーブへ上書き保存しない。
2. F8 Consoleで次を実行する。Hermes/Apollo指輪を主人公所持にし、認識阻害を1キーへ準備する。本番7カードの上限合計は19枚なので、検証用に11枚分の一時定義を補う。

```js
var cd2c = ProjectRCardDeck;
cd2c.endCardBattle();
var backup2c = cd2c.getPersistentData();
var extras2c = [3, 2, 1, 3, 2].map((maxCopies, i) => ({
    cardId: '__phase2c_manual_' + i, ringId: 'hermes', maxCopies,
    cooldownSeconds: 1, maxLevel: 3, targetType: 'instant'
}));
if (extras2c.some(c => cd2c.definitions.card(c.cardId))) throw Error('fixture already exists');
['hermes', 'apollo'].forEach(id => {
    if (!cd2c.assignRingToPlayer(id).ok) throw Error('move outside existing combat first');
});
new cd2c.DefinitionRegistry(extras2c).cardDefinitions().forEach(c => cd2c.definitions.cards.set(c.cardId, c));
cd2c.definitions.cardDefinitions().forEach(c => cd2c.setCardOwned(c.cardId));
cd2c.setDeck(cd2c.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId)));
if (!cd2c.startCardBattle().ok) throw Error('battle start failed');
var prepareObscure2c = () => {
    for (var n = 0; cd2c.getBattleState().hand[0]?.cardId !== 'hermes_perception_obscure'; n++) {
        if (n >= 30) throw Error('no available recognition card');
        cd2c.useBattleCard(cd2c.getBattleState().hand[0].instanceId);
    }
    console.log(cd2c.getBattleState().hand);
};
prepareObscure2c();
```

3. Consoleを閉じてゲームへフォーカスを戻し、**1**キーを押す。左クリック不要で即時発動すること。押しっぱなしでは再発動しないこと。
4. 5秒以内にF8 Consoleを開き、次を確認する。Consoleを操作している間は時間が停止する。
   - `ProjectRCardBattleInput.getLastResult()`が`success`、`targetType: 'instant'`、`cardId: 'hermes_perception_obscure'`。
   - `hasState('player', 31)`と`ProjectRHermesRecognitionObscure.isPlayerRecognitionObscured()`がともに`true`。
   - `$gameParty.leader()._states.filter(id => id === 31).length`が`1`。
   - `cd2c.getBattleState().cooldownPile`に使用Instanceが入り、手札は5枚へ即時補充されている。カードCooldownは10秒で、効果5秒とは独立している。
5. Consoleを閉じて約5秒動作させる。再びF8で上の2つのState/APIが`false`になることを確認する。HPが減っていても通常どおりDamageを受ける。認識阻害そのものによる攻撃・弾の消去は発生しない。
6. 再使用の時間更新を確認するため、次を実行して1枚目を発動する。

```js
prepareObscure2c();
console.log(cd2c.requestUseCard(0));
prepareObscure2c();
```

7. Consoleを閉じて約3秒動作させ、**1**キーで別の認識阻害を使用する。F8でState件数が1、2枚目もCooldownへ移り即時ドローされていることを確認する。2枚目の使用から約2秒後（最初の効果終了時刻）でもAPIは`true`、2枚目から約5秒後には`false`になることを確認する。
8. F8で`cd2c.startCardBattle(); prepareObscure2c(); cd2c.requestUseCard(0);`を実行して新しい戦闘で再付与し、効果中に`cd2c.endCardBattle()`を実行する。直後にState/APIが`false`、`cd2c.getBattleState()`が`null`になること。F8 ConsoleにExceptionがないこと。
9. 検証の最後に次を実行し、一時定義と恒久データを戻す。検証用デッキのまま保存しない。

```js
cd2c.endCardBattle();
extras2c.forEach(c => cd2c.definitions.cards.delete(c.cardId));
$gameSystem._projectRCardDeckData = backup2c;
console.log(cd2c.isCardBattleActive(), cd2c.getBattleState(),
    ProjectRHermesRecognitionObscure.isPlayerRecognitionObscured());
```

期待: `false / null / false`。黄金の弓矢の360度照準・弾/命中・1Hit・4秒Cooldown・即時ドローは既存Phase 2B手順も参照。通常の銃・Sword入力も確認する。

## 自動確認

Phase 1～2Bの既存89件に加え、新規テストでState/transaction/1～5入力/5秒解除/再使用/戦闘終了/保存・ロード/既存弓矢との共存を検証する。
Action CombatのAddState/RemoveState/hasState/findTargets/State耐性とMZのBattler State処理は実ソース、画面・Actor能力値はVM fixture。手順書のConsoleコードも自動検証する。MZ実画面・実プレイは未実施。

```powershell
node tests/ProjectR_CardDeckCore.test.cjs
node tests/ProjectR_CardDeckCore.phase15.test.cjs
node tests/ProjectR_CardDeckCore.phase2a.test.cjs
node tests/ProjectR_ApolloGoldenArrow.test.cjs
node tests/ProjectR_HermesRecognitionObscure.test.cjs
node --check js/plugins/ProjectR_HermesRecognitionObscure.js
node --check js/plugins.js
git diff --check
```
