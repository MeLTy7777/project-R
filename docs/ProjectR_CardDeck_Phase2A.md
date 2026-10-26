# Phase 2A 手札入力・発動ルーター

## 接続と責務

- `ProjectR_CardDeckCore.js`: `startCardBattle(cardIds?)` / `endCardBattle()` / `isCardBattleActive()` / `requestUseCard(handIndex)`。開始はPhase 1の検証・シャッフル・5枚ドローを再利用。無効デッキでは理由配列を返し、戦闘を開始しない。開始失敗・終了・旧APIによる開始・ロード・ニューゲームではカード入力を無効化する。
- `ProjectR_CardBattleInput.js`: Core/Keyboard/Hotbarの後に登録。数字列1～5をhand[0～4]へ渡す。入力イベント内では予約だけ行い、次のScene_Map更新で再検証・即時使用する。左クリック不要。テンキー・Gamepadのカード割当は今回追加しない。
- `requestUseCard` → index/手札/所持/指輪検証 → CardDefinition.targetType → handler → `{ok: true}`のときだけ既存`BattleDeckSession.use()` → Cooldown移動・即時ドロー。
- `registerActivationHandler(targetType, handler)`でdirection/ground/instant/allyを差し替える。contextは`{handIndex, instance, definition}`。標準handlerは仮成功のみ。実攻撃・座標取得・対象検索は行わない。
- handlerは同期的に`{ok: true}`または`{ok: false, reason: "生成失敗等"}`を返す。例外・Promise・未返却も`activationFailed`となり消費しない。非同期handlerは未対応で、handler側も成功確定前に不可逆な効果を出さないこと。再入要求は拒否する。
- 戻り値は`{ok, reason, reasons, ...}`。reasonはsuccess / battleInactive / invalidHandIndex / emptyHand / cardUnavailable / unsupportedTargetType / activationFailed / activationInProgress。cardUnavailableのreasonsは既存の未所持等のコードを保持。handlerの失敗詳細はdetail。入力経由の最終結果は`ProjectRCardBattleInput.getLastResult()`から取得する。
- 明示された未知targetTypeは保持して安全拒否する。未指定のinstant既定値は維持する。
- Cooldownは操作可能なScene_Map更新につき既存`updateCooldown(1/60)`を呼ぶ。メニュー・会話・イベント・フォーカス喪失中は停止する。map fast-forwardの内部更新回数に影響されない。Cooldown終了カードだけがdiscardへ戻り、再構築対象になる。
- 旧`startBattle`/`useBattleCard`はPhase 1の低水準APIとして維持。後続の実効果・プレイヤー入力は新しい開始・使用APIを使う。handler登録は接続設定として次戦闘でも保持するが、セーブしない。
- 山札・hand・Cooldown・active・入力予約・最後の入力結果は戦闘一時状態。永続データversion 1を変更しない。

## 入力競合の確認結果

現行Keyboard 1.2.5は`Input.isTriggered/isPressed`で参照し、Scene_Map.updateから割当キーのCEを予約する。現在の割当は移動・F・X/B・Esc/Start・J/左クリック/RT（攻撃CE1）。数字1～5へのCE登録はない。Hotbar 2.0.7aは`updateSlotInputs()`から`Input.isTriggered(buttonConfig)`を参照するが、現行`HotbarConfig.json`のgridsは空。

Keyboardの参照APIとHotbarの`HotbarInputStatus`（全Hotbar ON/OFF）では、物理キー1個の排他的な消費と復元ができない。このため第三者本体を変更せず、MZ Input._onKeyDown/Upの小さなaliasでカード用数字の入力入口を分離する。keyMapper/Gamepad割当は変更しない。カード戦闘中に受け取った数字押下を元Inputへ渡さないため、同じ数字にHotbar/Keyboard CEや別アクションを割り当てても二重発火しない。空枠・失敗でも旧処理へフォールバックしない。戦闘外は元ハンドラーを呼ぶ。捕捉済みキーのrepeatは終了後もkeyupまで抑止し、その後は通常入力へ戻す。

受付条件はカード戦闘active・BattleDeckState有効・activeなScene_Map・遷移/Scene busy/停止中でない・Message/Choice/イベント実行中でない・選択Window操作中でない・転送中でない・FullscreenDialogue非active・フォーカスあり・編集欄でないこと。Engineの`ControlInput`に対応する既存`HallInputBlocked`も尊重する。Ctrl/Alt/Meta/Shift/IMEは対象外。押下時と処理時の両方で検証し、Sceneや戦闘を跨ぐ予約は破棄する。

このcheckoutの銃/SwordはKeyboardの攻撃CE1とCE4、Map002のObject: Gun/Bulletから既存機能へ接続されている。G17/Sword/Visionの専用ProjectRプラグインは登録されていない。数字からそれらへの既存接続も確認されなかった。J/左クリック/RT等は変更せず、保護対象のイベント・Map・Database・第三者プラグインも編集しない。

## Phase 2Bで再利用するBattleHUD

`ProjectR_BattleHUD.js`の`Sprite_ProjectRSkillSlot`、`Sprite_ProjectRSkillHUD`は5枠を生成し、icon/name/available/disabled/selected/cooldownを描画できる。`BattleHUD.selectSkill(index)`も存在する。現在のキー表示は固定Q/R/X/C/Vで、`ProjectRBattleHUDDataAdapter.skills()` / `hotbarSkills()`から既存HotbarのSkill IDとCooldownを読む。手札CardDefinitionとは未接続。

後続では表示データ提供部分を`getBattleState().hand`と定義・Cooldownへ接続し、キー表示を1～5へ変更できる。カードはSkill Database IDではないので既存skillIdをカードIDと同一視しない。今回HUD本体は変更しない。

## 公式機能との境界

[公式Player設定](https://www.rpgmakeractioncombat.com/2026/07/08-setup-player.html)は、入力条件からSwing WeaponやDynamic Eventを使い、既存Damageへつなぐ流れを示している。今回のhandlerはその接続点までで、代替の攻撃・Collision・Damageシステムを作成しない。

参照: [Tutorial案内](https://www.rpgmakeractioncombat.com/2026/07/00-how-to-use-tutorials.html)、[Home](https://www.rpgmakeractioncombat.com/p/welcome.html)。指定の[Dynamic Event](https://www.rpgmakeractioncombat.com/2026/07/03-dynamic-event.html)と[Damage Calculation](https://www.rpgmakeractioncombat.com/2026/07/17-damage-calculation.html)は調査時に429/アクセス制限で本文取得不可。Phase 2B実装時に再確認する。

## 自動確認

```powershell
node tests/ProjectR_CardDeckCore.test.cjs
node tests/ProjectR_CardDeckCore.phase15.test.cjs
node tests/ProjectR_CardDeckCore.phase2a.test.cjs
node --check js/plugins/ProjectR_CardDeckCore.js
node --check js/plugins/ProjectR_CardBattleInput.js
node --check js/plugins.js
git diff --check
```

Phase 2Aは実MZ InputとKeyboard全文、Hotbarの実`updateSlotInputs`関数をVMで使用する。描画・実DOM・Engine全体を起動した確認ではない。既存Hotbar/Keyboardに数字CEを追加するfixtureはテスト内だけで、本番設定を変更しない。

## 手動確認（MZはユーザーが起動）

1. ProjectR_Rebuildを自分で開いてテストプレイし、画面内に生存敵のいない場所へ移動する。既存セーブへ上書きしない。
2. F8 Consoleで`ProjectRCardDeck.startCardBattle()`を実行する。初期デッキは未配布・空なので開始拒否とreasonsを確認する。実7種も上限合計19枚であり、定義を変更せず実カードだけで30枚にはできない。
3. 下の一時fixtureを実行する。所持・デッキは確認の間だけ変わるので、この状態でセーブしない。通常データのバックアップは最後の片付けで戻す。

```js
var cd2a = ProjectRCardDeck;
cd2a.endCardBattle();
var backup2a = cd2a.getPersistentData();
var extras2a = [3, 2, 1, 3, 2].map((maxCopies, index) => ({
    cardId: '__phase2a_manual_' + index, ringId: 'hermes',
    maxCopies, cooldownSeconds: 1, maxLevel: 3, targetType: 'instant'
}));
if (extras2a.some(c => cd2a.definitions.card(c.cardId))) throw Error('fixture already exists');
var fixture2a = new cd2a.DefinitionRegistry(extras2a);
fixture2a.cardDefinitions().forEach(c => cd2a.definitions.cards.set(c.cardId, c));
['hermes', 'apollo'].forEach(id => {
    if (!cd2a.assignRingToPlayer(id).ok) throw Error('move outside existing combat first');
});
cd2a.definitions.cardDefinitions().forEach(c => cd2a.setCardOwned(c.cardId));
var deck2a = cd2a.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId));
cd2a.setDeck(deck2a);
console.log(cd2a.startCardBattle());
console.log(cd2a.getBattleState());
```

期待: ok=true、hand=5、drawPile=25。これはConsole内の検証専用定義で、plugins.jsには追加しない。

4. Consoleを閉じてゲームへフォーカスを戻す。1～5を順に押す。左クリックを追加で押さず、各押下で1回だけ消費することを確認する。長押しで連発しないことも確認する。
5. Consoleを開き、`ProjectRCardBattleInput.getLastResult()`のreason=success、handIndex、instanceIdと、結果stateのhand=5・cooldownPileへの移動・drawPile減少を確認する。現在状態は`cd2a.getBattleState()`で取得する。ゲームへ戻って該当秒数待つとdiscardへ移動する。Console操作やメニュー・会話中の数字で消費しないことも確認する。
6. Consoleで失敗を確認する（同期実行なのでCooldown進行との比較差がない）。

```js
var type2a = cd2a.definitions.card(cd2a.getBattleState().hand[0].cardId).targetType;
cd2a.registerActivationHandler(type2a, () => ({ ok: false, reason: 'testSpawnFailed' }));
var before2a = JSON.stringify(cd2a.getBattleState());
console.log(cd2a.requestUseCard(0));
console.log(before2a === JSON.stringify(cd2a.getBattleState()));
cd2a.registerActivationHandler(type2a, () => ({ ok: true }));
```

期待: activationFailed、detail=testSpawnFailed、状態比較true。

7. 最後に片付ける。

```js
cd2a.endCardBattle();
extras2a.forEach(c => cd2a.definitions.cards.delete(c.cardId));
$gameSystem._projectRCardDeckData = backup2a;
console.log(cd2a.isCardBattleActive(), cd2a.getBattleState());
console.log(ProjectRCardBattleInput.getLastResult());
```

期待: false / null / null。通常探索時の数字割当（存在する場合）、移動、J/左クリック/RT、メニュー、会話が元通り動くことを確認する。本番のHotbar設定が空なので、実Hotbarスロットの数字競合は自動fixtureで検証し、実機の配置・操作は後続の設定時にも再確認する。
