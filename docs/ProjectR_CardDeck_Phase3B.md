# Phase 3B 残り5枚の一時神召喚への移行

## 実装

- 既存`ProjectR_GodSummonManager`を再利用(新Managerなし)。Phase 3Aの論理アンカー(HP/AI/標的/衝突/移動妨害なし、セーブなし、発動ごとに別instance)は変更なし。
- 移行したカード(効果・数値・Cooldown・Stateは変更なし)。
  - Hermes **認識阻害**: Hermes召喚 → 従来のState 31付与・5秒タイマー。
  - Hermes **葦笛睡眠**: Hermes召喚 → 従来の範囲(半径4tile)Sleep処理。範囲判定は変更なし。
  - Hermes **高速移動**: Hermes召喚 → 従来のPlayer移動(最大3tile、1/16tile衝突判定)。移動するのはPlayerのみで召喚は動かない。
  - Apollo **病の矢**: Apollo召喚 → 召喚contextの位置・固定済みマウス角から従来の弾を発射(Golden Arrowと同方式)。Skill 238/239、State 33、DoT処理は変更なし。
  - Apollo **リラの支援**: Apollo召喚 → 従来のCalm(State 34)付与・睡眠解除。rollback処理は変更なし。
- これで現行7枚(Golden Arrow・剣術を含む)すべてが「発動 → 神を解決 → 一時召喚 → 召喚context経由で効果 → 破棄」の流れ。
- 方向を使わない効果(認識阻害・葦笛・リラ)は`perform({ aim: false })`。マウス座標の有無に依存せず、`degree`/`radians`/`distance`は`null`。Golden Arrow・剣術・高速移動・病の矢はマウス方向を持つ従来の動作。contextの他の項目はPhase 3Aと同じ。
- 依存: Managerは`js/plugins.js`でCore/Inputの後・全移行カードより前(既存の位置)。各カードplugin冒頭に`@base ProjectR_GodSummonManager`を追加。Managerが無い場合は従来経路へ戻らず`godSummonUnavailable`で発動失敗(非消費・Cooldownなし・State/移動/弾なし)。召喚生成に失敗した場合も、効果は実行されず同様。
- 召喚は発動の瞬間だけ(`LifetimeFrames`=12)。State/Disease/Calm/Sleepの効果時間とは無関係。
- 破棄: 寿命 / 効果失敗 / `endCardBattle` / マップ移動 / ロード。複数同時発動は別instanceで共存。

## MZ実機確認(ユーザーが起動)

既存セーブへは上書きしないでください。`docs/ProjectR_CardDeck_Phase2C6.md`のF8準備スニペットで、Apollo/Hermes指輪・検証用デッキ・戦闘開始・`prepare`関数(カードを手札へ出す)を用意します。以降`cd = ProjectRCardDeck`、召喚の確認は`ProjectRGodSummonManager.getActiveSummons()`です。

各カードで共通して確認すること:
- 発動直後に`getActiveSummons()`へ正しい神(`godId`)の召喚が1件ある。
- 約0.2秒後(12 map更新frame)に召喚が空になる。
- 従来どおりの効果が起き、使用カードが所定のCooldownへ入り、手札が補充される。
- F8にExceptionがない。

**Hermes** (`godId: 'hermes'`)
1. 認識阻害(`prepare('hermes_perception_obscure')`): `ProjectRHermesRecognitionObscure.isPlayerRecognitionObscured()`が`true`、約5秒で`false`。Cooldown 10秒。
2. 葦笛睡眠(`prepare('hermes_reed_flute_sleep')`): 半径約4tile内の敵が睡眠(`ProjectRHermesReedFluteSleep.isEventSleeping(敵ID)`)、約4秒で解除。範囲外は無影響。対象が居ないときは発動失敗でカード非消費。Cooldown 12秒。
3. 高速移動(`prepare('hermes_swift_movement')`): マウス方向へ最大3tile移動し、壁/通行不可Eventの手前で停止。完全に動けない場合は失敗で非消費。移動するのはプレイヤーのみ。Cooldown 6秒。
4. 剣術(`prepare('hermes_sword_attack')`): 近接Hitbox・Damageが従来どおり。Cooldown 3秒。

**Apollo** (`godId: 'apollo'`)
5. 黄金の弓矢(`prepare('apollo_golden_arrow')`): マウス方向へ直進し、命中でDamage。Cooldown 4秒。
6. 病の矢(`prepare('apollo_plague_attack')`): 弾が直進し、命中で初撃→Disease(`ProjectRApolloDiseaseAttack.isEventDiseased(敵ID)`)→1秒ごとのDoT(最大6回)。Cooldown 12秒。
7. リラの支援(`prepare('apollo_lyre_calm')`): 睡眠(32)があれば解除され、`ProjectRApolloLyreCalm.isPlayerCalm()`が`true`で約6秒。31/33は無影響。Cooldown 10秒。

**共通**
- 異なる神を素早く続けて発動(例: Hermes剣術 → Apollo黄金の弓矢)しても、`getActiveSummons()`に2件が共存し、各自の寿命後にそれぞれ消える。
- 同じ神を続けて発動(例: 剣術 → 高速移動)しても別instanceで共存し、残骸が残らない。
- `cd.endCardBattle()`で召喚が全て消える。マップ移動・ロード後は空である。
- 神の画像・VFXが無い状態(今回の標準)でも、7枚全てが問題なく動く。通常Swordも従来どおり。
- F8にExceptionがない。

## 自動確認

`tests/ProjectR_GodSummonManager.phase3b.test.cjs`(16件)。各カードの既存fixture(MZ標準State、導入版Action Engineの実コード)を再利用。単体fixture向けの補助`tests/GodSummonFixture.cjs`は、Managerを実ソースのまま読込み、無い場合のみ最小のGame_Map/Scene_Map/Player座標を補う。既存の5カードのテストは、この補助でManagerを読み込む1行だけを追加(テスト内容は変更なし)。描画・入力はVM fixture。MZ実画面・人の操作確認は別途必要。
