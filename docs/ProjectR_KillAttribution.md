# ProjectR 撃破の帰属(誰が倒したか)と魂の収集基盤(Phase H2B-3B)

`js/plugins/ProjectR_KillAttribution.js`(敵の死亡通知)と `js/plugins/ProjectR_SoulCollection.js`(魂)の仕様と、**どの攻撃経路が主人公の撃破として確かめられるか**の一覧です。
最初に「何が検証済みで、何が未対応か」を書きます。**未対応の経路は、主人公の撃破として扱いません**(黙って全部を主人公の撃破にすることはしません)。

## 1. 敵の死亡の検知(導入版 Hendrix Action Engine 1.6.6b の調査結果)

| 項目 | 調査結果 |
|---|---|
| 敵のHPの持ち方 | 敵Eventの公式HPバー(`Spriteset_Map._eventHpBars`)の `currentHp`。`UpdateEventHp` コマンドが即時に書く。`getCurrentEventHp` は保存先の変数を読み、バーの次の更新(次フレーム)で書かれるため、ダメージ直後は古い(H2Aの実機検証で判明)→ **バーを優先して読む** |
| 敵の死亡 | Hendrixに「死亡イベント」はない。HPが0になったあとの処理(消す・報酬・ドロップ)は、各敵Eventのページ(公式チュートリアル21 loot)が行う。**HP 0 になる瞬間は `UpdateEventHp` の中** |
| ProjectRの攻撃 | 剣・G17・薙ぎ払い・一閃・葦笛・Hermes剣術・Apollo・Ultimate は、すべて公式 `UpdateEventHp` コマンドを通る(`ProjectR_CardModifiers` が最も外側で包んでいる) |
| 使った仕組み | `UpdateEventHp` を、`ProjectR_CardModifiers` の**内側**(読み込み順で前)でもう1枚包む。実行前にHP>0 → 実行後にHP<=0 になった敵を、その呼び出しの帰属つきで1回だけ通知する。HP・ダメージ・ドロップ・敵の死亡ページ・ボスのフェーズには**何も書かない**(読むだけ) |
| コマンドを通らない死亡 | 毎フレームの確認(購読者がいるときだけ)で見つけ、帰属 `unknown` として通知する(主人公の撃破にはならない)。一度もHPが正だと観測されていないEvent(初期HP 0)は通知しない |

## 2. 帰属の決め方と、経路ごとの扱い

優先順(上が先): ① `projectRAttacker` 引数 → ② 固定ダメージ(`projectRFixed`)→ ③ 式が `player weapon` → ④ 呼び出し元Eventのnote `<attacker: …>` → ⑤ `withAttacker()` の範囲 → ⑥ 呼び出し元が敵Event → ⑦ それ以外 = `unknown`。主人公の撃破 = 帰属が `"player"`(`credited: true`)。

| 攻撃・死亡の経路 | 帰属 | 状態 |
|---|---|---|
| 通常の剣(`ProjectR_SwordSystem`)・G17(`ProjectR_GunSystem`): `-player weapon` | player | **検証済み**(自動テスト・実機の剣 J キー) |
| 一閃・薙ぎ払い(固定ダメージ `projectRFixed`。`ProjectR_CardModifiers` が攻撃者 `ctx.attacker`(既定 player)と出どころ `ctx.source` を明示して内側へ渡す) | player | **検証済み**(自動テスト。実機はコマンド経由) |
| Hermes剣術・Hermes Ultimate・Apollo黄金の弓矢・Apollo Ultimate など、`<dmg: …><attacker: player>` を持つHitbox/弾が `UpdateEventHp` を呼ぶもの | player(Hitbox の note) | **自動テストで検証済み**(note の読み取り)。実機の個別確認は未了 |
| 明示 `projectRAttacker: "player"`(将来の攻撃・DoTが持ち主を渡す正規の方法) | player | **検証済み** |
| 味方の攻撃(`<attacker: 他>`) | `event:他` | 検証済み(主人公の撃破にしない) |
| 環境・罠・スクリプト(`projectRAttacker: "environment"` / `withAttacker("script", …)`) | その値 | 検証済み(主人公の撃破にしない) |
| 敵が敵を倒す | `enemy` | 検証済み(主人公の撃破にしない) |
| 直接HPバーを0にする・コマンドを通らない | `unknown`(sweep) | 検証済み(主人公の撃破にしない) |
| **Apolloの病のDoT**(`ProjectR_ApolloDiseaseAttack` の tick) | `unknown` | **未対応**。tick の `UpdateEventHp` に持ち主を渡していないため。このPluginは保護対象テストで固定されており、今回は変更しない。DoTの持ち主が確かな将来のDoTは `projectRAttacker` を渡せば対応できる(テスト済み)。**「持ち主が失われたDoTを主人公の撃破と誤認しない」を優先した結果** |
| 旧Hermes剣術・Apolloなどの**カード攻撃**で攻撃力上昇を効かせること | — | 別の話(ダメージが `UpdateEventHp` の時点で計算済み。ストレングスと同じ制約。docs/ProjectR_HermesB3B.md §3) |

### 識別子
- `key`: 戦闘中ずっと同じ敵の識別子 `m<マップID>:e<EventID>#<通し番号>`(Eventオブジェクトごと。Event IDは固定しない)。
- `deathKey`: その敵の n 回目の死亡 `key/n`。HPが回復して生き返った敵が再び倒れると別の死亡になる。魂の重複拒否は `deathKey` で行う。
- 同じ敵(同じ死亡)への2回目以降の通知は出さない(`duplicates` に数える)。
- `Game_Map.setup` / `ProjectRCardDeck.endBattle` / ロード / ニューゲームで識別子・通知済みの印・件数を作り直す(購読は残る)。

## 3. 魂(`ProjectR_SoulCollection`)

- 魂 = 戦闘中だけの一時オブジェクト(アイテム・通貨・装備ドロップではない。インベントリ・所持金・通常のドロップに触れない)。保存しない。
- 固有ID・位置(敵の死亡位置 = 当たり判定の中心)・`deathKey`・生成時のレベル・窓のシリアル。同じ `deathKey` の魂は作らない。
- 回収: `collectAround({ center, radius, lineOfSight, filter })`。距離 <= radius(境界を含む)かつ壁(`ProjectR_CombatOcclusion.firstBlockerBetween`)に遮られないときだけ。判定できない場合は回収しない(安全側)。返す前に台帳から外すので二重回収なし。複数の魂は生成順に独立に返す。
- 上限: `MaxSouls`(既定60。超えたら古い魂から外す・回復は得られない)、`MaxSoulVfx`(既定30。表示の錨Eventの上限。超えた魂は見た目なしで残り、回収はできる)。
- 表示(VFX Designer): 魂ごとに**画像なし・通り抜け可能の「錨Event」**(`ProjectR_GodSummonVisual.spawnAnchor`)を出し、そこへ `ProjectR_Soul_Manifest`(出現)・`ProjectR_Soul_Hover`(漂う・ループ)・`ProjectR_Soul_Collect`(回収)を結び付ける。回収した魂の錨は回収の光(約30フレーム)が終わるまで40フレーム残して消す。
  - **実機で分かったこと**: 公式Show VFXの `stickMode` + 位置オフセットは、プレイヤーの絵の拡縮によりオフセットが約2倍に効く(魂が2倍離れた場所に出た)。ワールド位置の指定には使わず、錨Eventへ結び付ける方式にした(実機で魂の位置と一致を確認)。
  - **実機で分かったこと(2)**: 公式Show VFXの絵の登録が少し遅れることがあり、魂が出た直後に回収されると「止める」が空振りして漂うVFXが残った。`ProjectRPresentationVfx.stop(note)` に「止める予約」(登録されたら止める・最長600フレーム)を足して解消した。
- 後片付け: 戦闘終了・マップ移動(`Game_Map.setup`)・ロード・ニューゲーム・主人公の死亡(カード側が呼ぶ)・窓の満了(`AfterWindow=remove` のとき)。
- 表示の失敗(VFX・錨Eventの生成・Hermes・主人公モーションが例外/失敗/欠落)は、魂・回収・回復・攻撃力上昇に影響しない(自動テストで10通り確認)。
