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

同一カード上限は通常3／強力2／特殊・高性能1。rarityで仮区分し、maxCopiesへ値を設定する。
categoryはmovement、attack等の役割を維持する。効果範囲・成功率が未確定の認識阻害とリラ支援は通常扱い。
睡眠・病攻撃は攻撃阻害を伴う役割として強力扱い。7カードに特殊扱いを無理に割り当てない。
全カードのmaxLevel=3（Lv1～Lv3）。カードごとの区分は仮設定であり、最終バランスではない。
7種類を上限まで入れても19枚のため、実データだけでは有効な30枚デッキを組めない。
有効な混成30枚の動作確認では、テスト/Console内の一時Registryだけに検証専用定義を補う。
cooldownSeconds、rarity、category、targetTypeもPhase 2接続前に調整可能な仮設定。
威力・Damage・Projectile・Animation・VFX・実効果・状態異常成功率・効果時間は未設定。

| cardId | 能力 | ringId | 秒 | rarity | category | maxCopies | targetType |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hermes_swift_movement | 高速移動 | hermes | 6 | normal | movement | 3 | instant |
| hermes_reed_flute_sleep | 葦笛による睡眠 | hermes | 12 | strong | sleep | 2 | ground |
| hermes_perception_obscure | 認識阻害 | hermes | 10 | normal | concealment | 3 | instant |
| hermes_sword_attack | 剣術攻撃 | hermes | 3 | normal | attack | 3 | direction |
| apollo_golden_arrow | 黄金の弓矢 | apollo | 4 | normal | attack | 3 | direction |
| apollo_plague_attack | 病を与える攻撃 | apollo | 12 | strong | ailment | 2 | direction |
| apollo_lyre_calm | リラによる精神安定・支援 | apollo | 10 | normal | support | 3 | ally |

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

### テスト用所持・実カード上限内デッキをAPIで明示生成

```js
console.log(cd15.assignRingToPlayer("hermes"), cd15.assignRingToPlayer("apollo"));
var ids15 = cd15.definitions.cardDefinitions().map(c => c.cardId);
ids15.forEach(id => cd15.setCardOwned(id, true));
var deck15 = cd15.definitions.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId));
cd15.setDeck(deck15);
console.log(cd15.isDeckValid(), cd15.getDeckInvalidReasons());
console.log(cd15.setUltimateRing("apollo"), cd15.getUltimateRingId());
```

期待: 19枚、有効false、無効理由INVALID_DECK_SIZE、Ultimate指定apollo。
指輪移動結果がRING_TRANSFER_DURING_BATTLEの場合は戦闘外に移ってから実行する。

### 指輪を外して復旧

```js
console.log(cd15.setRingUnowned("apollo"));
console.log(cd15.getDeck().length, cd15.getDeckInvalidReasons(), cd15.getUltimateRingId());
console.table(ids15.map(cardId => ({ cardId, usable: cd15.canUseCard(cardId) })));
console.log(cd15.assignRingToPlayer("apollo"));
console.log(cd15.isDeckValid(), cd15.getDeck());
```

期待: デッキ19枚を維持、Apolloカードだけ使用不可、Ultimate解除。
戻すと全7カードが再び使用可能になり、無効理由は枚数不足だけに戻る。デッキ全体の有効判定はfalseのまま。
Ultimateは戻しただけでは再指定されない。Actor対応未確定のため、この確認は未所持への変更で行う。

### 有効な混成30枚検証用の一時定義

次の検証専用5定義はConsoleの一時Registryだけに置く。
本番の7カードDefinition・$gameSystem・保存デッキには追加しない。
本番のmaxCopiesを緩めず、19枚＋検証専用11枚で30枚を組む。

```js
var extra15 = ["normal", "strong", "special", "normal", "strong"].map((rarity, i) => ({
    cardId: "test_only_" + i, ringId: i % 2 ? "apollo" : "hermes",
    maxCopies: { normal: 3, strong: 2, special: 1 }[rarity],
    cooldownSeconds: 1, maxLevel: 3, rarity, category: "test_only", targetType: "instant"
}));
var registry15 = new cd15.DefinitionRegistry(
    [...cd15.definitions.cardDefinitions(), ...extra15], cd15.definitions.ringDefinitions());
var service15 = new cd15.CardDeckService(registry15);
service15.assignRingToPlayer("hermes");
service15.assignRingToPlayer("apollo");
registry15.cardDefinitions().forEach(c => service15.setCardOwned(c.cardId));
var mixed15 = registry15.cardDefinitions().flatMap(c => Array(c.maxCopies).fill(c.cardId));
service15.setDeck(mixed15);
console.log(mixed15.length, service15.isDeckValid(), service15.deckInvalidReasons());
service15.setRingUnowned("apollo");
console.log(service15.deckInvalidReasons(), service15.deck().length);
service15.assignRingToPlayer("apollo");
console.log(service15.isDeckValid(), service15.deck());
```

期待: 最初は30枚、true、[]。Apollo解除でそのカードのみ無効、30枚保持。戻すとtrue。
この一時Serviceは本番の所持状態・デッキ・セーブへ接続していない。

### 一時Serviceの戦闘用デッキ・Cooldown

```js
var battle15 = new cd15.BattleDeckSession(service15);
console.log(battle15.start());
console.log(battle15.snapshot());
console.log(battle15.use(battle15.snapshot().hand[0].instanceId));
console.log(battle15.snapshot());
battle15.updateCooldown(12);
console.log(battle15.snapshot());
console.log(JSON.stringify(DataManager.makeSaveContents()).includes('"cooldownPile"'));
battle15.end();
```

期待: 開始時hand=5、drawPile=25。使用後hand=5、drawPile=24、cooldownPile=1。
12秒更新後cooldownPile=0、discardPile=1。一時SessionはGame_Systemに接続しないためセーブ内cooldownPileはfalse。
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

期待: Card Level=3、所持、実カード19枚デッキ、Ultimate指定apolloを保持。戦闘状態null。
前の仮仕様でLv4/5を保存していた場合、Phase 1既存の上限処理でLv3へ補正される。所持・指輪・デッキは維持する。
旧セーブも別途ロードし、既存の進行・所持品を保ちつつ新規指輪が未所持で補完されることを確認する。
最後に従来の銃・剣・移動・会話等の挙動も目視確認する。自動テストはこのMZ実機確認の代替にはならない。

## 追記(Phase H2C-A): 指輪の入手とカード所持の運用

- カードの所持は「カードの種類」単位(`cardOwnership[cardId] = { owned, level }`)で、デッキに入れられる枚数の上限は各カードの `maxCopies` です。枚数ごとの在庫は持ちません。したがって「Hermesの初期30枚」は、7種を所持にすること(最大コピーの合計 = 30)を意味します。
- 指輪は `assignRingToPlayer`(低水準)で主人公のものになりますが、これは**カードを付与しません**。進行(イベント)からの入手は、プラグインコマンド `ProjectR_HermesProductionDeck: AcquireHermesRing` か既存の `ProjectR_MenuIntegration: GrantRing`(ringId=hermes)を使います。どちらも、初めての入手のときだけ初期カードを付与します(付与の記録は `$gameSystem._projectRHermesProduction`、version 1。記録の無い旧セーブは未付与として読む)。
- 詳細・テスト・実機の結果: `docs/ProjectR_HermesProductionDeck_H2C_A.md`。

## 追記(Phase H2C-B1)

- `ownedCopies` は保存値ではなく派生値です(所持していれば `maxCopies`、未所持は 0)。所持の保存は `owned` と `level` のみ。デッキ構築画面の表示は「デッキ内 N / コピー上限 M枚」に変更しました。
- 将来の枚数管理案(別の版つき領域)は未実装です。
- 詳細・テスト・実機の結果: `docs/ProjectR_HermesProductionDeck_H2C_B1.md`。

## 追記(Phase H2C-B2): 保存互換

- CardDeckCoreの保存(`_projectRCardDeckData`)は変更なし。所持枚数は別の版つき領域 `_projectRCardInventory`(schema 1)で、旧セーブには領域が無く、ロード時に1回だけ移行します(ファイルは次にセーブするまで書き換わりません)。
- 詳細・テスト・実機の結果: `docs/ProjectR_CardCopyOwnership_H2C_B2.md`。
