# ProjectR 敵の標的選択の適格性(秘匿)と Hendrix の敵AI

Phase H2B-3A で追加した `js/plugins/ProjectR_TargetEligibility.js` の仕様と、導入版 Hendrix Action Combat(Hendrix_Action_Engine 1.6.6b)の敵AIの調査結果です。
最初に「何が検証済みで、何が未了か」を3つに分けて書きます。**3つ目が未了のうちは、敵AI全体を完成とは書きません。**

| 区分 | 内容 | 状態 |
|---|---|---|
| ① 秘匿の核(Core target eligibility) | `ProjectRTargetEligibility` と、Hendrixの検知部品(`checkInRange` / 検知した標的への移動 / ロック標的)への接続 | **検証済み**(自動テスト + 実機の公式 `checkRange`) |
| ② DEV敵AI | `ProjectR_CombatTestArenaVeil.js` の検証用AI(Hendrixの `checkRange` で標的を探し `moveToClosest('detected event')` で追う) | **検証済み**(自動テスト + 実機でDEV敵が実際に追い、止まり、再取得する) |
| ③ 製品の敵AIへの接続 | 製品用の共通敵AIは未実装。各マップのEventページ次第 | **未了**(Hendrixの検知部品を使うEventには自動で効くが、製品Eventでは未実行) |

## 1. Hendrix の敵はどう標的を取得・保持するか(調査結果)

公式チュートリアル(07-create-enemy / 16-enemy-attacking-npcs)と導入版のコードから:

1. **取得**: 敵Eventのページの「Range Detection」(条件分岐)= `Game_System.prototype.checkInRange(source, range, target, eyes, blockRegion, exception)`(`window.checkRange` はその別名)。
   - `target === "player"`: プレイヤーが範囲・視界・遮蔽Regionの中なら `true` を返し、`sourceEvent._detectedEvent = $gamePlayer` を覚える。
   - `target` が notetag(`<npc>` など): タグ付きEventの中で最寄りを選び `_detectedEvent` に覚える。公式チュートリアル16は敵が `<npc>` を追う例(target を player から `<npc>` に替えるだけ)。
2. **保持(キャッシュ)**:
   - `event._detectedEvent`(検知した標的の参照)。`moveToClosest('detected event')` / `moveToPosition('detected event')` が、それを見て追う。
   - `lockInTarget`(`LockInTarget` コマンドの対象。主なユーザーはプレイヤーの敵ロック。敵Eventは `getLockedTarget()` で読める)。
   - DotMoveの移動命令(`moveToTargetContinous`): 出した命令は**目的地まで**続く。標的を見失っても、出した命令の余りは最後に見た場所まで進む。
3. **追跡の継続**: 公式の敵に「標的メモリ」や共通の再選択処理は無く、追跡は **各ページが毎フレーム Range Detection を通るかどうか** に依存する(公式チュートリアルも「Range Detection の分岐と自律移動」で追跡を表現)。
4. 標的を選ぶ共通のAIは存在しない。`findTargets('player')` は「攻撃対象にするため」の探索(ダメージの適用)にも使われるので、**ここは変えてはいけない**(秘匿はダメージを止めない)。

## 2. 秘匿の仕組み

`ProjectRTargetEligibility` は「このキャラクターは今、敵の標的になれるか」を、登録された述語から1か所で答えます。

- 述語の登録: `registerConcealment(id, (character, seeker) => boolean)` / `unregisterConcealment(id)`。述語が例外を出しても「秘匿でない」として扱います(`diagnostics().errors`)。
- 「標的を選ぶ側(seeker)」: 敵Event(noteに `HostileTag`(既定 `<enemy>`)を含む)。**主人公・味方NPC・seeker未指定でない非敵は妨げません**(`<npc>` が主人公を追う、主人公が敵を探す、などはそのまま)。seeker未指定は敵として扱います。
- ヴェイルは自分が動いている間だけ登録します(無いときはHendrixの検知に一切介入しません)。

### Hendrix への接続(Hendrix本体は書き換えない)
| 接続点 | 動作 |
|---|---|
| `Game_System.checkInRange`(target=`"player"`) | 元の判定を通したうえで、敵が秘匿中の主人公を見つけた場合は `false` にし、`_detectedEvent` も外す(`suppressedChecks`)。`_lastCheckRange`(デバッグ表示用)は元のまま残る |
| `Game_System.checkInRange`(target=notetag) | 秘匿中の候補を除いたリストで最寄りを選ばせる(タグ索引を一時的に差し替え、必ず元へ戻す)。全員が秘匿なら見つからない |
| `Game_Character.moveToClosest` / `moveToPosition` | `'detected event'` の覚えが秘匿中なら、古い覚えを捨ててから動く(動かない) |
| `Game_CharacterBase.getLockedTarget`(敵Event側) | ロック標的が秘匿中なら外して `null` |
| `Game_Map.update`(毎フレーム) | 敵の `_detectedEvent` / `lockInTarget` が秘匿中なら外す(古いキャッシュで追い続けない) |

秘匿が終わる(または円を出る)と、述語が `false` になるので、次の検知で通常どおり標的にできます(再取得)。

### 秘匿が**変えないもの**
`findTargets` の結果・`UpdateEventHp`・衝突・環境ダメージ・すでに出た攻撃・データベース・ステータス。(テスト: 秘匿中でも主人公のHPは減る。`findTargets('player')` は `[$gamePlayer]` のまま。)

## 3. 既知の限界(正直な記録)

- **すでに出した移動命令は目的地まで続く**: 標的を見失った敵は、新しい命令は出さないが、DotMoveに出した命令は最後に見た場所まで進んで止まる(実機: 余りは約0.4〜0.5マス。80フレーム後には停止)。これは「最後に見た場所へ向かう」振る舞いとしては自然で、標的の参照は外れている。必要なら敵Eventのページ側で `stopMove` 相当を足す。
- Hendrix本体の他の標的処理(例: 敵が物理的に近接して接触する・範囲攻撃に巻き込む)は標的選択ではないので、変えない(秘匿は無敵ではない)。
- 製品の敵Eventページが `checkRange` 以外の方法(Eventの独自スクリプトで `$gamePlayer` を直接参照する等)で標的を取る場合は、このPluginの対象外。製品の敵AIを作るとき、標的の取得に `ProjectRTargetEligibility.isEligibleTarget(seeker, target)` を使う。
- 味方の「マップ上のAI」は製品に無い(`ProjectR_PartyCombat` は意思決定の枠だけ)。味方の参照は `registerFriendlyProvider` で足す。

## 4. 確認の状態
- 自動テスト: `tests/ProjectR_HermesVeil.integration.test.cjs`(秘匿の核・Hendrixの `checkRange`(player / タグ)・古いキャッシュ・DEV敵AI・秘匿が無敵でないこと・無いときは介入しないこと)。
- 実機: `tools/mz_cdp/h3a_verify.cjs` R4a(Hendrixの公式 `checkRange`)、R4b(DEV敵が実際に追う・止まる・再取得する)。R4c(製品の敵AIへの接続)は**未了**として記録。
