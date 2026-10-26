# ProjectR Combat Runtime Compliance（Phase 5A-RT3）手動確認

MZのPlaytestで、次の順番どおりに確認してください（自動テストはMZ実機を起動しないため、ここが実機の確認です）。

1. `ProjectR_Rebuild` を開く。
2. MZのPlaytest（テストプレイ）を開始する。
3. F8（デベロッパーツール）のConsoleで `ProjectRCombatTestArena.enter()` を実行する。
4. **戦闘HUDが出ていない**ことを確認する（敵ダミーも見えない）。
5. 上下左右に歩き、**歩いた向きにプレイヤーの向きが変わる**ことを確認する（マウスの方向を向き続けない）。
6. 黄色い端末（操作盤）の前でFキーを押して調べる。
7. 操作盤で **Start Hermes Test** を選ぶ。
8. **このときに初めて**HUDが出ることを確認する（敵ダミーも現れる）。
9. **常駐のHermes（暫定マーカー: 青いクリスタル）が自分の左上に見える**ことを確認する。
10. 戦闘中でもFキーで端末（操作盤・Gauge・Divine HPの端末・門）を調べられることを確認する。
11. **Q / E / X / C / V** を1回ずつ押す（手札の左から1〜5枚目）。数字キー1〜5ではカードが発動しないことも確認する。
12. 操作盤の **Go to Reed Flute Spot** で3体のダミーの真ん中へ移動し、**Vキー**（Reed Flute Sleepが手札5枚目にある場合）を押す。3体とも眠ること（頭上や状態表示）を確認する。
13. Hermes Swordsmanship（ヘルメース剣術）のカードを使い、**剣を振る見た目**とヒット（ダメージ数値）の両方を確認する。
14. 研究室の端末などで **Gaugeを満タン**にする。
15. **Uキー**を押す。
16. Hermes Ultimate（6連斬）が出ること、Gaugeが0になることを確認する。
17. 操作盤で **End Card Battle** を選ぶ。HUDと敵ダミーと神が消える。
18. 操作盤で **Start Apollo Test** を選ぶ。
19. **常駐のApollo（暫定マーカー: 炎）が見える**ことを確認する。
20. 銃（テストハンドガン）を装備している場合は、撃って弾（Bullet）が見えること・弾数が減ることを確認する。
21. Gaugeを満タンにして、Apollo Ultimate（7連矢）を確認する。
22. 操作盤で **End Card Battle**（または Exit Arena）で戦闘を終える。
23. HUDが消え、**歩いたときの通常の向きに戻る**ことを確認する。
24. F8のConsoleに赤い例外が出ていないか確認する。

## うまくいかないとき: 青い状態端末を読む

南西の研究室などにある状態端末（`Status Terminal`）を調べると、診断が出ます。次の実機報告にはこの画面（または `ProjectRCombatTestArena.status().diagnostics`）の内容を貼ってください。

| 表示 | 見方 |
| --- | --- |
| `戦闘イベント:yes/no` | 明示的な戦闘イベント。HUD・神の表示・照準はこれだけで決まる。 |
| `直近キー: KeyQ accepted` / `passedThrough:理由` | Q/E/X/C/Vが入力層で受け付けられたか。拒否理由は `eventRunning` `messageBusy` `activeWindow:...` など。 |
| `直近カード: 成功/失敗 理由` | カード発動の結果。失敗時は手札・山札・Cooldownは変わらない。 |
| `神 … 顕現:yes 表示:yes` | 神の論理状態（顕現）と、見た目（Event）が存在するか。 |
| `Ultimate直近: NG 理由` | `gaugeNotFull` `noUltimateHandler` `persistentUltimateUnavailable` `ultimateStartFailed/handlerReason` など。 |
| `handler Hermes:yes Apollo:yes` | Ultimateのhandlerが実機で登録されているか。 |
| `U入力 受信n 要求n 最後:…` | Uキーが届いたか。`bindingInactive:keyConflict` ならキー割当の衝突。 |
| `F(調べる)直近: canMove:… 実行中:… 候補:… 結果:…` | Fを押したときの判定。結果は `engine`（標準処理）`fallback:ID`（補助）`none`。 |
| `Reed Flute直近: 失敗 noEnemyInRange 敵n 生存n 範囲内n 付与n` | 内訳。`noEnemyFound` `noAliveEnemy` `noEnemyInRange` `noAliveBattler` `stateNotApplied` `missing` のどれか。 |

## 変更点のまとめ

- カードキー: 手札の左から **Q / E / X / C / V**（1〜5キーは廃止）。HUDの表示も同じ。戦闘外では元の割当のまま。
- 戦闘HUD: `ProjectRCombatPresence.isCombatEventActive()`（`beginCombatEvent(sourceId)` で開始、`endCombatEvent(sourceId)` で終了）だけで出る。敵が画面内にいる・カード戦闘が有効・テストマップにいる、というだけでは出ない。将来のボス戦も同じAPIを呼べばよい。
- 向き: 戦闘イベント中だけ毎フレーム公式の `turnToward('mouse or gamepad', true)` で照準を向く。戦闘外・戦闘終了後は通常の移動向き（攻撃共通イベントが残したDirection Fixも歩行入力で解放）。
- Fキー: 戦闘中、隣の「決定ボタン」イベントへ向きを合わせ、それでも標準処理で起動しなければ標準の `start()` で起動する。診断で `canMove`/`イベント実行中` が見える。
- 神の見える召喚: `ProjectR_GodSummonVisual`（表示専用）。Map002の公式Prefab「ProjectR God Visual」（`<child of: player>`）を `spawnEvent` で生成してPlayerの子として追従。Divine HP・崩壊・復帰はこれまでどおり `ProjectR_GodSummonManager`が持つ。
- Hermes剣術: 既存のSkill 237のDynamic Eventヒットボックスはそのまま、公式Swing Weaponの見た目を神の表示Eventから出す（無ければPlayerから）。
- 通常の剣（CE1の近接ブランチ）: 公式のSetup Playerの順序に合わせ、Swing Weapon → 短寿命Dynamic Eventヒットボックス → 衝突 → Database武器ダメージ。
- 銃（G17/テストハンドガン）: すでに公式構成（弾薬API・Display Weapon・Prefab弾 `rotateTo` 1回 + `moveToPosition('forward')`・射撃SE/アニメーション）。変更なし。

## 通常の剣・銃の確認手順

1. 通常のマップ（敵がいる場所）で剣（ショートソード等）を装備して攻撃（J、または左クリック）する。
2. **剣を振る見た目（Pan画像の軌跡）** が出て、敵に当たればダメージ数値が出る。1回の攻撃で1回だけ当たる。
3. 銃（テストハンドガン）を装備して攻撃する。銃が表示され、撃つと弾が見えて弾数 `n/7` が減り、0になるとリロード（弾薬アイテム）される。
4. 弾はクリック時のマウス方向へまっすぐ進み、カーソルを動かしても曲がらない。

## 既知の制限（アセット・仕様）

- **Hermes / Apolloの専用スプライトは存在しません。** 常駐/一時召喚には暫定マーカー（Hermes = `img/characters/!Crystal.png` index 0、Apollo = `img/characters/!Flame.png` index 0）を使っています。最終アートではありません。本番の画像ができたら、`ProjectR_GodSummonVisual` のPlugin Parameter（`HermesCharacterName/Index`、`ApolloCharacterName/Index`）を変えるだけで差し替えられます。
- 剣の軌跡は公式Swing Weaponの暫定画像 `img/pictures/Pan.png`（フライパン）です。最終の武器画像は未作成。
- Swing Weaponは4方向（上下左右）で振ります。マウス方向（360°）に合わせた剣の見た目は公式コマンドでは出せません。ヒットボックスはCE1が4方向に置きます（Hermes剣術は360°対応）。
- プレイヤー・武器・神に使える多コマの攻撃スプライトシートがありません。そのため **Animation Solution（`playFrames`/`toFrame`）は使っていません**（導入・有効化は確認済み）。多コマ画像ができたらここで使えます。
- MZ実機での確認は未実施です。上の1〜24が実機の確認項目です。

## 自動テスト

```
node tests/ProjectR_CombatRuntimeCompliance.test.cjs
```

他のカードテスト・Arenaテスト・Casino/Holdemの `*.test.cjs` も従来どおり実行できます。
