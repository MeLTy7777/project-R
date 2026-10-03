# ProjectR 視界システム v1.0.3

作業先：`C:\Users\hmats\Documents\RMMZ\ProjectR-CardTargeting`

ブランチ：`feat/card-manual-targeting`

今回の修正はRegion255の角タイルの露出判定だけです。Region254、VisionWall、VisionKeepVisible、戦闘判定は維持しています。MZエディターとゲーム本体は自動起動していません。

## v1.0.3の報告（18項目）

| 番号 | 項目 | 結果 |
|---|---|---|
| 1 | 角に影が食い込む原因 | 旧実装はPolygonのFirst Hitと結合壁面の露出区間だけで255の再描画を選び、選択から漏れた部分露出タイルを補完する判定がなかった。未選択タイルにはDarknessが残る。実機画像そのものの再確認は未実施。 |
| 2 | 旧255判定 | First Hit／同じ結合壁面へ続けて当たるRay間の露出区間。中心単一LoSによる判定ではなかった。 |
| 3 | 新判定 | 従来のFirst Hitを優先し、未選択の接続壁へ9点LoS補完。1点でも対象自身へ到達すれば、そのタイル画像全体を保持。 |
| 4 | Sample点 | 中心、上下左右の辺中央、四隅。座標一覧は下記。 |
| 5 | epsilon | 0.02 tile。全てセル内部の点。Ray終点やPolygonを拡張する値ではない。 |
| 6 | Target自身の許可 | 最初のRegion衝突のfractionと、対象セル矩形へ入るfractionを比較。一致する自身への到達は許可。別Regionへ先に衝突する場合やイベント壁が先の場合は拒否。許容誤差はfractionで1e-8。 |
| 7 | 奥255 | 前壁により全9点が遮られた奥壁は非表示。回り込み後の再表示も維持。 |
| 8 | L字回帰 | 内角・外角、中心は遮られるが別Sampleが見えるケース、反対向きL字を確認。実PIXIで角タイル中央・四隅の壁画像と、背後の暗闇を確認。 |
| 9 | Performance | 画面＋約1タイルの既存範囲と静的Cacheのみ。First Hit選択済みは補完を省略。全4角が既存Ray対象となる孤立壁も省略し、結合外周で内部角が失われ得る接続壁だけを補完。9点は1点成功で終了。全Map9Ray走査なし。 |
| 10 | 追加数 | Node14件（要求12ケース＋9点座標＋先行イベント壁）。ピクセル7点追加。 |
| 11 | 総結果 | 視界82件、既存Combat/Gun/Sword等38件、合計120件成功。描画42点＋コマンド1件成功。ページ例外0。 |
| 12 | node --check | 今回変更したJS4ファイルで成功。 |
| 13 | JSON parse | 既存data16ファイルと登録配列を読み取り確認。data変更なし。 |
| 14 | git diff --check | 成功。未追跡の視界関連ファイルは末尾空白/EOF改行を別確認。 |
| 15 | 保護SHA | CombatOcclusion、カード本体/既存テスト/データ等、対象外の開始時変更22ファイルが一致。CardSkillDeck SHAは下記のまま。 |
| 16 | 変更ファイル | Vision、plugins.jsの説明、視界テスト2本、本文書の5ファイル。 |
| 17 | 実機確認 | 下記の角確認手順。実際のMZ上の修正版確認は未実施。 |
| 18 | git status | 指定ブランチ、Index空、開始時変更一覧保持。Stage/Commit/Push/Merge/Rebaseなし。 |

タイル左上を(x,y)、e=0.02とした9点：

```text
(x+.5,y+.5)
(x+.5,y+e)     (x+.5,y+1-e)
(x+e,y+.5)     (x+1-e,y+.5)
(x+e,y+e)      (x+1-e,y+e)
(x+e,y+1-e)    (x+1-e,y+1-e)
```

Polygon、Ray終点、Darknessの穴は変更していません。Map画像の保持選択だけを補完し、255矩形の穴抜きは行いません。角タイル上のEnemyを保持レイヤーへコピーせず、背後の床/Enemy/NPCも暗闇の下に置きます。

### v1.0.3の実機確認手順

1. テストプレイを終了し、MZでProjectR-CardTargetingを開きます。プラグイン管理のVision表示がv1.0.3であることを確認します。
2. 角度360、距離0、暗闇1.0、壁255、建物254、Debug=falseを確認し、テストプレイを再開始します。
3. 問題があったL字角を内側と外側から見て、255角マス全体に壁画像が残り、三角の黒い欠けがないことを確認します。上下左右を反転した角も試します。
4. 角でゆっくり斜め移動し、壁画像のちらつきがないことを確認します。カメラが動いても壁と保持画像がずれないことを確認します。
5. 手前の255 Aと奥の255 Bを一直線に見て、Aだけが表示されること、回り込むとBが表示されることを確認します。
6. 角上/角裏のEnemyが壁画像の保持によって透けないことを確認します。254の建物保護とVisionWall/VisionKeepVisibleは従来どおりか確認します。
7. F8で赤いエラー、F2でゲーム全体のFPSを確認します。Map移動・セーブ/ロード・HUD表示も確認してください。

独立Chrome fixtureの200孤立壁では視界CPU中央値約3.8ms、p95約5.6ms。接続壁が多数ある実Mapとゲーム全体のFPSは未確認です。

## v1.0.2当時の報告（254仕様変更の記録）

以下はv1.0.2時点の確認結果です。現在のテスト総数と最新手順は上記を使用してください。

| 番号 | 項目 | 結果 |
|---|---|---|
| 1 | 直接原因 | v1.0.1で254にもLoSを要求したため、同じ建物の255壁に遮られた屋根や装飾まで保持対象から外れていた。 |
| 2 | 旧条件 | Playerから254の代表点までに別のVision Blockerがない場合だけ保持。 |
| 3 | 新条件 | 254のMap GraphicはLoS、First Blocker、Visibility Polygonに関係なく表示保護。視界内では元のMapを表示し、暗闇部分では専用Tilemapで復元。システムOFFなら通常Map表示。 |
| 4 | 描画方法 | キャッシュ済みの254セルを保持用選択Setへ無条件で追加。既存Structure TilemapのMZ標準描画でそのセルのTile Stackを復元。タイル層0〜3・上層/下層・影・オートタイルを既存描画へ委譲し、1枚のTile IDだけへ置き換えない。 |
| 5 | Darkness Hole | 254矩形の穴は追加していない。Darknessの穴は従来のVisibility Polygonだけ。 |
| 6 | Enemy/NPC | 通常のCharacter SpriteはDarknessの下に置いたまま。254の再描画はMap画像だけ。敵・NPC・Player・通常/Dynamic Eventを254の理由で複製しない。 |
| 7 | Region255 | First Hitで露出した壁だけを保持。奥の255は隠れ、回り込むと表示。既存計算を変更せず、Nodeとピクセル回帰を成功。 |
| 8 | Map Scroll | 元Tilemapのoriginと表示変形を保持Tilemapへ同期。独立したスクロール補正を追加せず、displayX/displayYの二重適用なし。実PIXIで254の位置一致を確認。 |
| 9 | Cache | Map初回表示で254をSetにキャッシュ。毎フレームは表示範囲のキャッシュ参照だけで、全Map走査と254へのRaycastはしない。Map setup、Save/Load、invalidateCacheで再構築。 |
| 10 | 追加テスト | Node14件追加（要求の12ケース＋空Polygon＋通常イベント誤複製防止）。描画確認5点追加（下層、通常重ね層、上層、多数セル、254スクロール）。 |
| 11 | 総結果 | 視界68件＝従来54＋追加14、既存Combat/Gun/Sword等38件、合計106件成功。実PIXI/MZ Tilemapの35ピクセル＋無効化コマンド1件成功、ページ例外0。 |
| 12 | node --check | Vision、plugins.js、視界テスト2本、計4ファイルで成功。 |
| 13 | JSON parse | 変更のある既存dataの16ファイルを読み取り確認し成功。plugins.js配列、登録名とファイル名も確認。JSONの変更はなし。 |
| 14 | git diff --check | 成功。未追跡の視界関連ファイルは末尾空白とEOF改行を別途確認。 |
| 15 | 保護SHA | CombatOcclusionとCardSkillDeck関連を含む対象外の開始時変更ファイル22個のSHA一致。CardSkillDeckのSHAは下記。 |
| 16 | 変更ファイル | Vision、plugins.jsの説明、視界テスト2本、本文書の5ファイル。既存変更を保持。 |
| 17 | 実機再テスト | 下記の手順。実際のMZでの再確認は未実施。 |
| 18 | git status | 指定ブランチ、Index空。開始時の変更/未追跡一覧を維持。Stage/Commit/Push/Merge/Rebase、ファイル追加/削除/移動/改名なし。 |

CardSkillDeck本体の作業前後SHA256：

```text
9F6A1A20B52E2F9264D14F56527BBE986DB90278D731FFE0A2AA7F0F55196F45
```

今回、CombatOcclusion、CardSkillDeck本体・仕様書・既存テスト、Skills、CommonEvents、カードデータ/VFX、Gun、Sword、Action Engine、DotMoveSystem、コアスクリプトは変更していません。Mapデータや素材にも手を加えていません。

## 現在の正式仕様

| 対象 | 視界を遮るか | 暗闇上へ保持する条件 |
|---|---|---|
| Region255 | はい。既存Combat Blockも維持 | First Hit＋接続壁の9点補完で露出したタイル全体。奥の255は保持しない |
| Region254 | いいえ。視界壁としてCombatにも追加しない | 常にMap画像だけを保持。敵やイベントは含まない |
| VisionWallイベント | はい。既存Combat Blockも維持 | First Hitまたは別の壁に遮られない場合。自身のSpriteだけ |
| VisionKeepVisibleイベント | いいえ | v1.0.1を維持。別の壁に遮られない場合だけ自身を保持 |
| CombatWallのみ | 視界は遮らない | 視界Pluginでは特別扱いしない |
| 通常通行不能タイル | 視界は遮らない | 視界Pluginでは特別扱いしない |
| Region250 | 既存Action Combat用途を維持 | 今回の視界/保持リージョンとして使用しない |

Region254の「Combatを遮らない」は、この表示保護Regionによる追加遮断がないという意味です。元のタイル自体の通行設定など、既存Combat判定は変更しません。

描画順は、Map/Character/Enemy/NPC → Darkness → Structure Keep-Visible → Weather/Pictures → HUD/Window/Message/Fullscreen Dialogueです。Structure Layer内もMZの上下優先度を維持します。元の可視部分を二重描画してCharacterを覆わないよう、Structure Layerの再描画は暗闇部分だけにStencil Maskを適用しています。

壁角へのangle−epsilon、angle、angle＋epsilonのRayと画面四隅の方式は維持しています。255はFirst Hitと露出壁面の連続区間を再利用し、長い壁の途中を欠けさせません。254はこの判定から独立した表示保護です。

## 今回の変更ファイル

1. `js/plugins/ProjectR_VisionOcclusion.js`：254のLoS条件を解除、v1.0.2へ更新。
2. `js/plugins.js`：Vision登録行の説明・バージョンだけを更新。既存パラメータ、ON/OFF、他の登録、並び順を保持。
3. `tests/ProjectR_VisionOcclusion.test.cjs`：14件追加。旧254仕様を確認していた2件は新仕様へ期待値を変更。その他の既存ケースは維持。
4. `tests/ProjectR_VisionOcclusion.render.cjs`：遮蔽裏の254は表示、Enemyは隠れる期待値へ変更。複数のタイル層とスクロールを追加確認。
5. `docs/ProjectR_VisionOcclusion.md`：本書を現在の正式仕様へ更新。

## 初心者向けの実機再テスト手順

1. テストプレイ中なら、一度ゲームを終了します。修正済みPluginは新しく開始したゲームで読み直します。
2. MZを自分で起動し、「ファイル」→「プロジェクトを開く」から`ProjectR-CardTargeting`の`.rmmzproject`を開きます。元の`ProjectR`とは別の作業先です。
3. 「ツール」→「プラグイン管理」を開き、CombatOcclusion直後のVisionがONで、説明がv1.0.3になっていることを確認します。
4. Visionをダブルクリックし、視界角度360、視界距離0、暗闇1.0、視界壁255、建物254、Debug=falseを確認します。登録と値の初期設定は済んでいます。
5. 今回不具合を見つけた建物でテストプレイを開始します。まずプレイヤー側から見える255壁が表示されていることを確認します。
6. 建物の裏へ移動し、以前黒くなっていた254の屋根・装飾が、壁に遮られていても表示されることを確認します。複数タイルに254を塗った部分は、全体が残ることが正しい動作です。
7. 254上と、その後ろのEnemy/NPCを確認します。255壁の裏では、建物画像だけが見え、敵やNPCは暗闇に隠れていることを確認します。
8. さらに奥の255壁を確認します。奥の255は引き続き隠れます。手前の壁を回り込んで奥の壁への見通しが通ると、奥の255が表示されることを確認します。
9. カメラが動くように歩き、254の屋根・装飾と通常Map画像の位置がずれないことを確認します。斜めの小数移動、ズームや画面の揺れを使用している場合も試します。
10. 別Mapへ移動して戻り、254の保持が正常で、前Mapの画像が残らないことを確認します。セーブ/ロードも試します。
11. HUD、Message、Fullscreen Dialogue、選択肢が暗くならないことを確認します。
12. VisionKeepVisibleは今回変更していません。このタグのイベントが別の壁の裏で隠れることは現在の正常仕様です。
13. F8でConsoleを開き、赤いエラーがないことを確認します。負荷の高いMapではF2のFPS表示も確認します。
14. 確認用の新しい配置が必要なら、カード作業用Map/CE/Skillsを編集せず、確認専用Mapへ配置してください。今回は自動作業でMapデータや敵配置を変更していません。

Region254の指定は、MZの「リージョン」編集モードで建物の画像があるセルに254を塗ります。254は表示保護だけなので、視界の壁にしたいセルへは255を使用します。

## パラメータとコマンド（変更なし）

日本語パラメータ7項目：有効=true、角度=360、距離=0、暗闇=1.0、視界壁リージョン=255、建物表示リージョン=254、Debug=false。距離0は画面端/Map境界までです。

日本語コマンド7種類：視界を有効化、視界を無効化、視界距離変更、視界角度変更、暗闇濃度変更、デバッグ表示ON/OFF。コマンドによる設定はセーブに保持され、旧セーブは初期値へ戻ります。Plugin Managerの初期値を変えても、保存済みのコマンド設定を上書きしません。

## 自動確認と未確認事項

実行済み：

```powershell
node --test tests/ProjectR_VisionOcclusion.test.cjs
node --test --test-name-pattern=Occlusion tests/ProjectR_CardSkillDeck.test.cjs
node tests/ProjectR_VisionOcclusion.render.cjs
```

描画確認はプロジェクト内のPIXI 5.3.12とMZ標準Tilemapを独立ページで使用し、ゲーム本体を起動せず35点を検証しました。254上の敵が隠れたまま下層/通常の重ね層/上層画像が復元されること、複数254、スクロール、255の前後、イベント保持条件、HUD、Eraseを含みます。ページ例外0、無効化コマンドも成功。

Chromeの独立fixtureで、1920×1080相当・独立壁200個・Player小数移動の視界更新はCPU中央値約5.7ms、p95約6.6ms。通常fixtureは約0.2ms。描画・AI・戦闘を含むゲーム全体のFPSを保証する値ではありません。Node VMの同等確認では中央値約22msと遅く、ブラウザ測定と区別しています。

未確認：実MZ上の再表示、入力、実際のセーブファイル、全HUDとの実表示、音声、実Prefab生成/削除、長時間のFPS、大規模/ループMapの実画面、透明建物素材と全タイル種別の実素材表示。Tile StackはMZ標準描画を利用し、独立fixtureでは通常タイルと上層タイルの重なりを確認しています。

特殊なスクリプトでMapのRegionを実行中に書き換える場合は、変更後に`ProjectR.VisionOcclusion.invalidateCache()`を呼んでください。通常のMap移動とSave/Loadでは自動破棄します。
