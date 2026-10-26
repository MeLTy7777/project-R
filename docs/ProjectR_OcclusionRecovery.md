# ProjectR 視界（遮蔽）システムの復元

旧ProjectRで作った「視界システム」を、現在の `ProjectR_Rebuild` に戻しました。コードは旧プロジェクトから**無改変**で持ってきています（戦闘・カード・HUD・Ultimateのコードには触れていません）。

## 1. どこから来たか

| 項目 | 内容 |
| --- | --- |
| 元のプロジェクト | `C:\Users\hmats\Documents\RMMZ\ProjectR-CardTargeting`（ブランチ `feat/card-manual-targeting`） |
| 元のコミット | `c50d28b` feat: add vision occlusion system（2026-10-03）、`2b4d4b1` refactor: remove legacy handgun prototype（2026-10-04） |
| ProjectR_VisionOcclusion.js | v1.0.3 … `c50d28b` の内容そのまま（旧プロジェクトの最終版。元のフォルダの作業ファイルとも一致） |
| ProjectR_CombatOcclusion.js | v0.1.0 … `2b4d4b1` の内容（旧プロジェクトの最終版。下の注意を参照） |
| 旧プロジェクトでの状態 | どちらも `js/plugins.js` に登録済み・ON（Vision は CombatOcclusion の直後） |
| 一緒に復元したもの | テスト2本（`ProjectR_VisionOcclusion.test.cjs` / `.render.cjs`）。旧文書 `docs/ProjectR_VisionOcclusion.md`（旧作業メモを含む）はコピーせず、Git履歴の `c50d28b` に残してあります（要点は本書に反映） |

`ProjectR`（元のフォルダ）、`ProjectR-CardDeck`、`ProjectR_GunTest`、`test/test2/test3` にも探しましたが、視界システムが入っているのは `ProjectR-CardTargeting` のGit履歴だけでした（`ProjectR`、`ProjectR-CardDeck`、`ProjectR-CardTargeting`、`ProjectR_Rebuild` のGit履歴には同じコミットが入っています）。旧フォルダは読むだけで、一切変更していません。

> 注意：`2b4d4b1` で CombatOcclusion から「旧ハンドガン試作用の弾の壁判定」約50行が削除されています。Rebuildには旧ハンドガンが無く、公式の弾（Hendrix Action Combat）を使うので、削除後の最終版を使いました。

## 2. 何をするシステムか

**プレイヤーから見えない場所を暗闇で隠す「視界（見通し）」システムです。**

- プレイヤーの位置から壁に光線（Ray）を飛ばし、壁の向こう側（見えない側）を黒く覆います。見える範囲は壁の形に合わせて変わります。
- 壁になるのは **Region 255** を塗ったマスと、メモ欄／注釈に `<VisionWall>` と書いたイベントだけです。普通の通行不能マス、`<CombatWall>` だけのイベントは視界を遮りません。
- 暗闇の下に隠れるもの：敵・NPC・イベント・床。壁の向こうにいる敵は見えませんが、いなくなるわけではありません（戦闘やAIはそのまま）。
- **Region 254**（建物）を塗ったマスは、壁に遮られていても**マップ画像だけ**を表示し続けます（建物の屋根や飾りが黒く欠けないように）。敵やNPCは含みません。
- `<VisionKeepVisible>` と書いたイベントは、別の壁に遮られていなければ、そのイベント自身の画像だけを暗闇の上に出し続けます。
- 手前の壁だけが見え、その奥の壁は隠れます（壁を透視しません）。壁を回り込んで見通しが通ると奥の壁も見えます。
- 描画の順番：マップ・キャラ・敵・NPC → **暗闇** → 建物の保持 → 天気・ピクチャ → HUD・ウィンドウ・メッセージ。HUD（戦闘HUD、メニューHUD等）は暗闇の上にあるので暗くなりません。

壁が1つも無いマップでは、視界が画面全体になるので**何も暗くなりません**。現在のRebuildのマップ（Map001〜005）にはRegion 254/255の塗りが無いため、このままでは見た目は変わりません。

## 3. 有効化・無効化

プラグイン管理に `ProjectR_CombatOcclusion` → `ProjectR_VisionOcclusion` の順で登録済み（ON）です。Visionは必ずCombatOcclusionの直後に置いてください（順序が違うとゲーム起動時にエラーで止まります）。

| 切り替え方 | 方法 |
| --- | --- |
| 全体をOFFにする | プラグイン管理で `ProjectR_VisionOcclusion` を OFF（またはパラメータ「視界システム有効」を false） |
| ゲーム中に切り替える | プラグインコマンド「視界を有効化」「視界を無効化」（セーブに保存されます） |

### Plugin Parameters（Vision）

| パラメータ | 初期値 | 意味 |
| --- | --- | --- |
| 視界システム有効（Enabled） | true | 全体のON/OFF |
| 視界角度（VisionAngle） | 360 | 視界の広さ（1〜360度） |
| 視界距離（VisionRangeTiles） | 0 | タイル数。0は画面端／マップ端まで |
| 暗闇の濃さ（DarknessOpacity） | 1.0 | 0〜1。1で真っ黒 |
| 視界壁リージョンID（VisionWallRegionId） | 255 | CombatOcclusionと同じ値にします（違うと起動時にエラー）。250は禁止 |
| 建物表示リージョンID（StructureRegionId） | 254 | 建物の画像を保持するリージョン。250は禁止 |
| 視界デバッグ表示（Debug） | false | true にすると光線・壁・建物の枠を色付きで表示 |

`ProjectR_CombatOcclusion` のパラメータは `VisionWallRegionId`（255）だけです。

### プラグインコマンド（日本語名）

視界を有効化 / 視界を無効化 / 視界距離変更 / 視界角度変更 / 暗闇濃度変更 / デバッグ表示ON / デバッグ表示OFF

## 4. 実機での確認手順（MZ）

自動テストはMZを起動しないので、見た目はここで確認してください（私は未確認です）。

### 方法A：データを編集せずに確認（おすすめ・F8コンソール使用）

1. MZでテストプレイを開始し、**Map001**（通常のマップ）に入ります。戦闘アリーナ（Map004）ではなく通常マップで試してください。
2. `F8` でデベロッパーツールのConsoleを開き、次を貼って Enter を押します。プレイヤーの右3マスに、縦7マスの壁（Region 255）が現れます。

```js
(() => { const m = $gameMap, w = m.width(), h = m.height(), px = Math.round($gamePlayer.x), py = Math.round($gamePlayer.y);
for (let dy = -3; dy <= 3; dy++) { const x = px + 3, y = py + dy; if (m.isValid(x, y)) m.data()[(5 * h + y) * w + x] = 255; }
ProjectR.VisionOcclusion.invalidateCache(); })()
```

3. 期待する結果：壁の**手前**は普通に見え、壁の**向こう側**が壁の影の形で真っ黒になります。プレイヤーが動くと影が追従します。壁の縁を回り込むと、向こう側が見え始めます。
4. 消す場合は、同じ式の `= 255` を `= 0` に変えて実行するか、別マップへ移動して戻ります（このやり方はメモリ上だけで、マップのデータファイルは変わりません）。
5. 同じ要領で暗闇の濃さ（プラグインコマンド「暗闇濃度変更」）やデバッグ表示を試せます。コンソールで `ProjectR.VisionOcclusion.settings()` と打つと現在の設定が見えます。

### 方法B：マップエディタで壁を塗る（本番の使い方）

1. テストプレイを終了し、MZのマップエディタで試したいマップを開きます。
2. 「リージョン」編集モードで、壁にしたいマスに **255**、建物の屋根・飾りのマスに **254** を塗ります。
3. 壁として使いたいイベントがあれば、メモ欄に `<VisionWall>` と書きます。壁に遮られなくても見せ続けたいイベントには `<VisionKeepVisible>` と書きます。
4. 保存してテストプレイします。

### 確認リスト

1. 壁の影が、プレイヤーを中心に壁の裏へ伸びる。
2. 壁の裏にいる敵・NPCが見えない。壁の手前や回り込んだあとは見える。
3. 255の壁の画像が、角のマスも含めて欠けずに表示される（三角の黒い欠けがない）。
4. 254を塗った建物の画像は、壁の裏でも黒くならない（敵やNPCは隠れたまま）。
5. 手前の壁Aは見え、真後ろの壁Bは隠れる。回り込むとBも見える。
6. 戦闘HUD・メニュー・メッセージが暗くならない。
7. 別マップへ移動して戻る、セーブ／ロードをしても、前のマップの影が残らない。
8. F8コンソールに赤いエラーが出ない。

### うまく動いていないときの見分け方

| 症状 | 原因の候補 |
| --- | --- |
| 何も暗くならない | マップにRegion 255が塗られていない／Visionが OFF／「視界を無効化」を実行済み／壁が画面外 |
| 起動時にエラー「更新したProjectR_CombatOcclusionを直前で有効にしてください」 | CombatOcclusionがOFF、または順序がVisionより後ろ |
| 起動時にエラー「視界壁リージョンIDをCombatOcclusionと一致させてください」 | 2つのパラメータの値が違う |
| 画面全体が真っ黒 | 暗闇の濃さが1.0でプレイヤーが壁に囲まれている／視界角度が小さすぎる |
| 影の形がおかしい・壁の判定とずれる | イベントの `<VisionWall>` はHendrixの当たり判定（hitbox）の大きさで判定。画像と当たり判定の大きさを合わせる |
| Debug をtrue にして確認したい | 白=原点、緑=視界、黄=光線、赤=リージョン壁、紫=イベント壁、青=建物 |

## 5. Rebuildで行った変更（互換対応）

| 内容 | 理由 |
| --- | --- |
| `js/plugins.js` に2行を追加（`ProjectR_CombatOcclusion` → `ProjectR_VisionOcclusion`、MenuHUDの直後・カード基盤より前） | 旧プロジェクトと同じ説明・パラメータで登録。他の行は変更なし |
| テスト `ProjectR_VisionOcclusion.test.cjs` の登録順の1項目だけ修正 | 旧テストは「Visionの次が `ProjectR_CardSkillDeck`」と決め打ちしていたが、Rebuildには旧カード実装が無いため |
| プラグイン本体のコードは変更なし | Hendrix Action Engine は旧プロジェクトと同一ファイル（v1.6.6b）。DotMoveはRebuildの方が新しい（v2.2.5）ので置き換えていない |

マップ・コモンイベント・システムなどのデータ、画像・音声、戦闘/カード/HUD/Ultimate/神召喚/Arena/Casinoのコードは触っていません。

## 6. 既知の制限

- **MZ実機での見た目は未確認**です。自動テストは（a）MZの代役を使うNode上の検証82件＋Rebuild用18件、（b）ヘッドレスChromeで実PIXI・MZ標準Tilemapを使った描画検証42点です。
- 戦闘アリーナ（Map004/005）には視界テストゾーンを追加していません（壁を置くと敵ダミーが隠れてアリーナ本来の戦闘テストに影響するため）。上の方法Aで通常マップから確認してください。
- 旧システムのカード照準（旧 `ProjectR_CardSkillDeck`）との連携は復元していません。Rebuildのカード実装（CardDeckCore以降）は視界システムを使っていません。CombatOcclusionの `hasLineOfSight` などのAPIは、今後Rebuildの戦闘から使えます（今回は接続していません）。
- 実マップでの長時間FPS、大きな／ループするマップ、全タイル素材での表示、セーブファイルでの実機確認は未実施です。独立fixtureでは壁200個で視界CPU中央値が数ミリ秒でした。
- 特殊なスクリプトで実行中にリージョンを書き換えたときは、`ProjectR.VisionOcclusion.invalidateCache()` を呼んでください。

## 7. 自動テスト

```
node tests/ProjectR_OcclusionRecovery.test.cjs
node --test tests/ProjectR_VisionOcclusion.test.cjs
node tests/ProjectR_VisionOcclusion.render.cjs
```

`render.cjs` はヘッドレスChrome（Playwright）が必要です。ゲーム本体やMZは起動しません。
