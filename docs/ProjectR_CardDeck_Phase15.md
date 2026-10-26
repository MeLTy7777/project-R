# Phase 1.5 実データとMZ確認手順

Phase 1のデータモデル・API・save version 1をそのまま使用する。
定義の正本は `js/plugins.js` の `ProjectR_CardDeckCore` パラメータ。
cardIdは新戦闘用の安定した文字列IDであり、Database Skill IDではない。
既存Skill・Weapon・Stateへの自動割当は行わない。表示名は下記の能力説明であり、正式カード名は未確定。

## 指輪

| ringId / godId | 神 | initialOwner | equipActorIds |
| --- | --- | --- | --- |
| hermes | ヘルメース | unowned | [] |
| apollo | アポロン | unowned | [] |
| janus | ヤーヌス | unowned | [] |
| themis | テミス | unowned | [] |
| athena | アテナ | unowned | [] |

各ringIdに対応するgodIdで5神をUltimate候補として識別できる。
Ultimate指定可能条件は既存の主人公指輪所持判定を使用する。
Actors.jsonのActor 1～8と、関連Database・Common Event・Mapから確定した神との対応は得られなかった。
equipActorIds=[]は未確定を表し、現段階では味方への割当を許可しない。
主人公への初期配布も行わない。カードも初期未所持、保存デッキも初期空。

## カードと仮設定値

全カードのmaxCopies=5、maxLevel=5は接続確認用の仮調整値。
7種類で30枚を組めるように上限を一時的に5とした。通常3／強力2／特殊1という最終バランスは今回確定しない。
cooldownSeconds、rarity、category、targetTypeもPhase 2接続前に調整可能な仮設定。
威力・Damage・Projectile・Animation・VFX・実効果・状態異常成功率・効果時間は未設定。

| cardId | 能力 | ringId | 秒 | rarity | category | targetType |
| --- | --- | --- | --- | --- | --- | --- |
| hermes_swift_movement | 高速移動 | hermes | 6 | normal | movement | instant |
| hermes_reed_flute_sleep | 葦笛による睡眠 | hermes | 12 | strong | sleep | ground |
| hermes_perception_obscure | 認識阻害 | hermes | 10 | strong | concealment | instant |
| hermes_sword_attack | 剣術攻撃 | hermes | 3 | normal | attack | direction |
| apollo_golden_arrow | 黄金の弓矢 | apollo | 4 | normal | attack | direction |
| apollo_plague_attack | 病を与える攻撃 | apollo | 12 | strong | ailment | direction |
| apollo_lyre_calm | リラによる精神安定・支援 | apollo | 10 | strong | support | ally |

## MZテストプレイから確認

1. ProjectR_RebuildのGame.rmmzprojectを自分で開き、テストプレイでニューゲームを開始する。
2. 戦闘外でF8を押し、DevToolsのConsoleを選ぶ。下記を順に実行する。
3. 所持状態生成はこのテスト中のセーブ対象データを変更するため、既存セーブへ上書きしない。

### 一覧・未配布状態（読み取り）

```js
var cd15 = ProjectRCardDeck;
console.table(cd15.definitions.ringDefinitions());
console.table(cd15.definitions.cardDefinitions());
console.table(cd15.definitions.ringDefinitions().filter(r => cd15.hasPlayerRing(r.ringId)));
console.log(cd15.getPersistentData(), cd15.getDeckInvalidReasons(), cd15.getBattleState());
```

期待: 指輪5種、カード7種、主人公所持指輪0、保存デッキ空、戦闘状態null。

### テスト用所持・30枚デッキをAPIで明示生成

```js
console.log(cd15.assignRingToPlayer("hermes"), cd15.assignRingToPlayer("apollo"));
var ids15 = cd15.definitions.cardDefinitions().map(c => c.cardId);
ids15.forEach(id => cd15.setCardOwned(id, true));
var deck15 = ids15.flatMap((id, i) => Array(i === 0 || i === 4 ? 5 : 4).fill(id));
cd15.setDeck(deck15);
console.log(cd15.isDeckValid(), cd15.getDeckInvalidReasons());
console.log(cd15.setUltimateRing("apollo"), cd15.getUltimateRingId());
```

期待: 30枚、有効true、無効理由[]、Ultimate指定apollo。
指輪移動結果がRING_TRANSFER_DURING_BATTLEの場合は戦闘外に移ってから実行する。

### 指輪を外して復旧

```js
console.log(cd15.setRingUnowned("apollo"));
console.log(cd15.getDeck().length, cd15.getDeckInvalidReasons(), cd15.getUltimateRingId());
console.table(ids15.map(cardId => ({ cardId, usable: cd15.canUseCard(cardId) })));
console.log(cd15.assignRingToPlayer("apollo"));
console.log(cd15.isDeckValid(), cd15.getDeck());
```

期待: デッキ30枚を維持、Apolloだけ無効、Ultimate解除。戻すと有効true。
Ultimateは戻しただけでは再指定されない。Actor対応未確定のため、この確認は未所持への変更で行う。

### 戦闘用デッキ・Cooldown

```js
console.log(cd15.startBattle());
console.log(cd15.getBattleState());
console.log(cd15.useBattleCard(cd15.getBattleState().hand[0].instanceId));
console.log(cd15.getBattleState());
cd15.updateCooldown(12);
console.log(cd15.getBattleState());
cd15.endBattle();
```

期待: 開始時hand=5、drawPile=25。使用後hand=5、drawPile=24、cooldownPile=1。
12秒更新後cooldownPile=0、discardPile=1。
Phase 1 APIの秒更新をConsoleから明示実行しており、実時間での自動進行は後続Phaseで接続する。

### セーブ互換（別スロット）

```js
cd15.setCardLevel("apollo_golden_arrow", 3);
cd15.setUltimateRing("apollo");
console.log(cd15.getPersistentData());
```

ゲームのメニューで未使用スロットに保存し、そのスロットをロードする。
再びF8 Consoleで下記を確認する。

```js
console.log(ProjectRCardDeck.getPersistentData());
console.log(ProjectRCardDeck.getBattleState());
```

期待: Card Level=3、所持、30枚デッキ、Ultimate指定apolloを保持。戦闘状態null。
旧セーブも別途ロードし、既存の進行・所持品を保ちつつ新規指輪が未所持で補完されることを確認する。
最後に従来の銃・剣・移動・会話等の挙動も目視確認する。自動テストはこのMZ実機確認の代替にはならない。
