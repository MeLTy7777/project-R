# ProjectR 全仕様パス MZ実機確認チェックリスト

## 最終Combat Runtime認定パス(2026-10-27, checkpoint d09e6db 以降)

MZ Playtest(NW.js 0.48.4 / Chromium 85)を実際に起動し、DevToolsのリモートデバッグ経由で状態を読み、**実キー(Q E X C V U R F)・実マウス**を送って確認しました
(セーブは事前にバックアップし、Playtestでは自動セーブを止めたうえで、終了後に全5ファイルのSHA-256が一致することを確認: **セーブ変更なし**)。
状態語: **MZ VERIFIED** = 実機で確認 / **AUTOMATED VERIFIED / MZ NOT VERIFIED** = 自動テストのみ / **DEFECT** = 不具合 / **CONTENT NOT YET DEFINED** = 内容待ち。

| 項目 | 状態 | 実機で見たこと |
| --- | --- | --- |
| 葦笛(Hermes Reed Flute) | **MZ VERIFIED(不具合を修正後)** | 修正前は発動のたびに `Object.hasOwn is not a function` で**常に失敗**していた(MZ同梱のNW.jsはChromium 85でObject.hasOwnが無い。Nodeには有るため自動テストでは見えなかった)。修正後: 4タイル内の2体にState32+Zzz、5タイル離した1体は無影響、約4.0秒で解除、カードはcooldownへ移り補充が1枚引かれる、SkillCast動作、一時Hermes表示。範囲内に敵がいないときは失敗し、手札・cooldownは不変(非消費) |
| Apollo Lyre(リラの支援) | **MZ VERIFIED** | 睡眠32を解除→精神安定34を付与(状態アイコン+音符のふきだし)、精神安定中は睡眠を再付与できない、約6秒で終了、成功時だけ消費・cooldown、SkillCast、一時Apollo |
| Golden Arrow(黄金の弓矢) | **MZ VERIFIED** | 弾が体の前から出てマウス方向へ直進(0/90/135/225/270°を確認)。撃った後にマウスを動かしても曲がらない。命中1回(ダメージ33=atk*2-def±10%)、命中後・寿命後に弾が消える。可視性: スロー再生で橙の弾筋が見える(通常速度の静止画では速すぎて写りにくい) |
| Apollo Disease(病の矢) | **MZ VERIFIED(表示を追加)** | 初撃6、State33、持続6秒、DoTは1秒ごとに6回(各3)試行。敵のEVA 5%でときどき1回が0(公式の回避。DBの設定)。**実機で病の敵に何の表示も無かったため、頭上に水滴のふきだしを1秒ごとに出す表示だけ追加(ゲームプレイは不変)**。弾は命中後に消える。再命中の再付与(非stack)は手札に同じカードが2枚必要で、アリーナの固定手札では作れず **AUTOMATED VERIFIED / MZ NOT VERIFIED** |
| Hermes剣術 | **MZ VERIFIED(表示の向きを修正後)** | Hitbox(マウス方向)・ProjectRの斬撃の弧・3体に1回ずつダメージ(同じ敵に同一斬撃で2回当たらない)。**公式Swing Weaponの表示だけが、神のEventが向き固定のため常に同じ向き(右→下)に振っていた**ので、生成の瞬間だけ向きを差し替えて上下左右に合わせた |
| Hermes Ultimate | **MZ VERIFIED** | Gauge100→U→0、Ultimate動作、斬撃ちょうど6回(0, +60, -60, +120, -120, 反対)、Hitbox順=描画順、同じ敵が別の斬撃に当たる(19〜20ヒット)、同一斬撃内の二重ヒットなし、終了後にHitbox・一時Eventが残らず、カードも使える |
| Apollo Ultimate | **MZ VERIFIED** | Gauge100→U→0、矢ちょうど7本(扇: base, +10, -10, +20, -20, +30, -30)、角度はUを押した瞬間に1回だけ固定(その後にマウスを動かしても不変)、矢は直進、同じ的に別の矢が5回命中、病は付かない、終了後に矢が残らない |
| 新G17(射撃/リロード) | **MZ VERIFIED(音の聞こえ方は未判定)** | クリック1回: 弾倉7→6、SE「Gun1」が1回、銃口は体の前、GunFire→GunAimへ戻る。R: 弾倉6→7・予備92→91を1回、SE「Gun2」が1回、GunReload→GunAimへ戻る。**音そのものの良し悪しは私は聞けないため未判定**(既存のGun1/Gun2を使用。専用のリロード音は無い) |
| Idle/Walk/Run/復帰 | **MZ VERIFIED** | Idle→Walk→Idle→Run→Idle。GunFire/GunReload/SkillCast/Ultimate のあと、戦闘中はGunAim、戦闘を終えるとIdleへ戻り、シートが残らない。SwordAttackの復帰は前回パス(d09e6db)で確認 |
| F(調べる) | **MZ VERIFIED** | 戦闘中、照準が別方向でも 黄色のControl Hub / Gauge端末 / 神の端末 / Full-Spec Status が開き、Fで選択・送り。Action Button化したtransferイベントも戦闘中に実行できた。終了後はGunAimに戻る。**気づき(DEFECTではなく未確認の設計)**: 「プレイヤー接触」のtransferイベント(アリーナの転送ゲート)は戦闘中に踏んでも起動しない(戦闘外では転送できる)。敵・弾を誤って調べないことは自動テストのみ |
| Vision/Occlusion | **MZ VERIFIED(動いている間のちらつきは客観測定せず)** | Region255の壁で裏が影の形に真っ暗、手前は見える。Region254はマップ画像だけ保持しイベントは隠れる。`<VisionWall>`は壁になり、`<VisionKeepVisible>`は視界外でも表示を保つ(壁の裏では隠れる)。戦闘HUDは暗闇の上に出る。三頭身の主人公は隠れない |
| メニュー | **MZ VERIFIED** | Esc→SKILL(Deck Builder)/ULTIMATE/ITEM(指輪カテゴリを含む6カテゴリ)を実キーで開き、X(戻る)で毎回戻れる。指輪画面(Scene_ProjectRRings)も開閉。エラー表示なし。SAVE/LOADは触っていない |
| 30枚デッキ | **CONTENT NOT YET DEFINED** | 製品のコピー上限は合計19枚のまま。コピー上限・30枚ルールは緩めていない(コードの不具合ではない) |

このパスで見つけた不具合(すべて実機でのみ再現し、自動テストは通っていた):
1. 葦笛が常に失敗(Chromium 85に無い `Object.hasOwn`)→ `ProjectR_HermesReedFluteSleep.js` を修正。再発防止に `tests/ProjectR_Chromium85Compat.test.cjs`(Chromium 86以降のAPIをProjectRプラグインが使わないことを検査)。
2. 病(State33)の敵に表示が無い → `ProjectR_WeaponPresentation.js` に水滴のふきだしを追加(読むだけ)。
3. Hermes剣術の公式Swing Weaponが向き固定のため常に同じ向き → `ProjectR_GodSummonVisual.js` で生成の瞬間だけ向きを差し替え。

証跡: `docs/evidence/cert_reed_flute_zzz.png`(葦笛のZzz+一時Hermes)、`docs/evidence/cert_disease_balloon.png`(病の水滴)。

**この認定パスの手順メモ(再現用)**: `nw.exe <project> test --remote-debugging-port=9222` でPlaytestを起動し、Chrome DevTools Protocol(`Runtime.evaluate` / `Input.dispatchKeyEvent` / `Page.captureScreenshot`)で操作・確認した。
速い演出(矢・斬撃・Ultimate)は、`SceneManager.updateMain`を数フレームに1回だけ呼ぶ一時フックでスロー再生して撮影した(ゲームのファイルは変更していない)。

---

## 新: Character Animation + 新銃(G17)の確認【MZ MANUAL VERIFICATION REQUIRED】

新銃・キャラクター表示プロファイル・SkillCast/Ultimate/剣の動作は、**実エンジン読み込みテスト(自動)では通っていますが、MZ実機は未確認**です
(`IMPLEMENTED / AUTOMATED VERIFIED / MZ VERIFICATION REQUIRED`)。見た目・音・実マウスは自動テストの対象外です。
手順は Combat Test Arena の北東の部屋 **Animation / Weapon Certification Zone**(端末は x=28〜36, y=9〜10、射撃レーンは黄色い床(28,6)→標的(44,6))で行います。
F8(DevTools)のConsoleに赤いエラーが出ていないことも毎回見てください。端末「Anim: Status」で状態(プロファイル/動作/弾倉/直近の銃口)を表示できます。

| # | 手順 | 期待される結果 | 失敗したら報告すること |
| --- | --- | --- | --- |
| A1 | アリーナに入る。操作盤で Start Hermes Test | カードHUD・Hermesが出る。F8にエラーなし | F8の赤い文面 |
| A2 | 歩く・止まる・ダッシュ(Shift) | 移動中はWalk/Run、止まるとIdleの見た目へ戻る(専用画像が無いので標準のまま) | 画面の状況 |
| A3 | 北東の部屋へ行き「Anim: Equip G17」の前でF | 「G17を装備」のメッセージ。メッセージを閉じると銃が体の前に出てマウスを追う | 「Anim: Status」の「構え表示」 |
| A4 | マウスを360°回す | 銃がマウス方向へ回る。左向きでは上下が反転して違和感がない | スクリーンショット |
| A5 | 射撃レーン(28,6)から標的(44,6)へ左クリック | 弾が**銃口**から出て直進し、標的に当たってHPが減る。体の中心の大きな発光は出ない | 弾の出る位置のスクリーンショット |
| A6 | 銃口の発光 | 銃口に小さな発光(約0.1秒)だけ。弾道の線は出ない | スクリーンショット |
| A7 | 発射後にマウスを大きく動かす | 弾は曲がらず直進(追尾なし) | 動画/説明 |
| A8 | 連射(間隔は約0.2秒)。「Anim: Status」で弾倉を確認 | 1発ごとに弾倉が1減る。発射音は1回ずつ(二重に鳴らない) | 弾倉の数値と音 |
| A9 | 銃の反動 | 撃つたびに銃が少し後ろへ下がり銃口が跳ねる。体も少し下がる | 画面の状況 |
| A10 | Rキーでリロード(弾倉が満タンでない状態) | しゃがむ仮モーション+リロード音。約0.7秒後に弾倉が満タン、予備が減る。**1回だけ** | 弾倉/予備の数値 |
| A11 | 「Anim: Empty Magazine」→ 撃つ | 空撃ち音 → 自動で1回リロード | 「Anim: Status」 |
| A12 | 「Anim: Equip Sword」→ 左クリック | 踏み込む仮モーション+斬撃。ダメージ判定と斬撃の向きが合う | 画面の状況 |
| A13 | カード(Q/E/X/C/V)を使う(Hermes/Apollo) | 成功したカードだけ体が少し跳ねる(SkillCast)。失敗したカード(範囲に敵がいない葦笛)では動かない | 「Anim: Status」の「直近の動作」 |
| A14 | Gaugeを満タンにしてU | 体が大きく跳ね(Ultimate)、Hermes=6連斬 / Apollo=7連矢。終わると通常に戻る | 「Anim: Status」 |
| A15 | 「Anim: Damage」「SkillCast」「Ultimate」端末 | カード/ゲージを使わずに動作だけ確認できる | 画面の状況 |
| A16 | 「Anim: Tall Profile (anchors)」→ G17を構える | 銃の回転中心が頭の上まで上がる(アンカーが高さ144pxに追従する確認。画像は48pxのままなのが仕様)。Hermes/Apolloの位置も上がる | スクリーンショット |
| A16b | 端末「Anim: TF Tall Sprite (48x72)」(x=34, y=8)→ G17を構える | 主人公が背の高い見た目(TF TallSpriteMZ、48×72px)になる。銃の回転中心が体の中央(足元-36px)に来る。Hermes/Apolloの位置も少し上がる。もう一度押すと元の見た目 | スクリーンショット |
| A17 | 「Anim: Restore」を押す / アリーナを出る | 装備・弾薬・プロファイルが元に戻る | 装備と弾数 |
| A18 | 戦闘を終了する | 銃の表示が消え、通常のIdle/Walkへ戻る。F8にエラーなし | 画面とF8 |

失敗した行の番号と、F8の赤い文面(または「Anim: Status」の文字)を教えてください。
**実機で確認済みの範囲**(2026-10-27、三頭身DEV3Hでの再確認。MZ Playtest、操作はDevTools Console+実キー/マウス。キャプチャは `docs/evidence/`):
A1〜A15・A17。三頭身の見た目、Idle/Walk/Run(状態ログで切替を確認)、剣の動作+斬撃、360°の構え(8方向)、発射(小さな閃光と弾筋・反動・体の仰け反り)、
リロード(体+銃が腰へ下がる、弾倉3→7・ストック92→87の1回)、Hermes剣術のSkillCast(一時Hermes+斬撃)、神の位置(左上に浮き、歩いても保つ)、
Ultimate/Damage/Downのシート。**セーブファイルは変更なし**(Playtestでは自動セーブを止めるため。SHA-256一致)。
新しい端末(y=11の列、左から x=28,30,32,34,36): Sword Motion / Gun Aim Pose / Down Motion / Show Anchors / Hero = DEV3H。
**未確認(実機)**: Reed Flute・Lyre・Apollo(矢/疫病)・Hermes奥義の**個別の見た目を1枚ずつ**確認していません(共通のSkillCast/Ultimateシートと既存の神演出)。
発射音・リロード音の聞こえ方。Vision(壁越しの遮蔽)の目視。
**素材について**: DEV3Hは自作の仮アート(4方向のみ)。8方向・最終アート・専用のリロード音は未用意です(`docs/ProjectR_ThirdPartyAssets.md`)。

## 最重要：クリティカル確認シーケンス（まずここだけ）

Reed Flute / Lyre / F / U は、実エンジン読み込みテストでは成功していますが、**MZ実機では未確認**です
（状態は `IMPLEMENTED / AUTOMATED VERIFIED / MZ VERIFICATION REQUIRED`）。次の順で確認し、
**失敗した手順の番号と、その直後の「Full-Spec Status」端末の「[認証]」ブロックの文字**を教えてください。
「Full-Spec Status」端末は、アリーナの南東（x=33, y=26）の `DEV Full-Spec Status` です。

| # | 手順 | 期待される結果 | 失敗したら報告すること |
| --- | --- | --- | --- |
| 1 | PlaytestでConsoleに `ProjectRCombatTestArena.enter()` を実行しアリーナへ入る | アリーナに入る。F8に赤いエラーなし | F8の赤い文面 |
| 2 | 戦闘HUDが出ていないことを確認 | 戦闘外はHUD・神・ダミーなし | 画面のスクリーンショット |
| 3 | 黄色の端末（操作盤など）の前でFを押す | メッセージが開く | Status端末の「F:」の行 |
| 4 | 操作盤で Hermesテスト開始 | カードHUD（Q E X C V）・Hermesが出る | 画面の状況 |
| 5 | HUDと神を確認 | 手札5枚・DRAW/DISCARD/COOLDOWN・Hermes | 「[認証] 戦闘セッション」の行 |
| 6 | 戦闘中にもう一度、端末の前でFを押す | 照準が別方向でもメッセージが開く | 「F:」の行（物理入力の回数・判定・起動イベントID） |
| 7 | Q E X C V を1回ずつ押す | 手札の左から1〜5枚目が1枚ずつ発動 | 「直近キー」「直近カード」 |
| 8 | 操作盤で「Go to Reed Flute Spot」→ 葦笛のカードのキー | ダミー3体の頭上にZzz。DEV端末の「睡眠中ダミー」に3体 | 「葦笛:」の行（候補/生存/範囲内/付与） |
| 9 | Apolloテストを開始し、リラのカードのキー | 主人公の頭上に音符。「Lyre:」が成功、精神安定あり | 「Lyre:」の行 |
| 10 | Hermesテストで、南西の研究室の「Gauge満タン」 | Gauge 100/100 | 「Gauge」の行 |
| 11 | Uキーを押す | Hermes Ultimate：6連斬が見え、Gaugeが0になる。その後もQ E X C Vが使える | 「U:」の行（物理入力・要求・最後・結果） |
| 12 | 操作盤で戦闘を終える（End） | HUD・神が消える | 画面の状況 |
| 13 | Escで通常メニューを開く | メニューが開く（戦闘中は開かない） | 画面の状況 |
| 14 | ITEM（アイテム）を開く | カテゴリ（アイテム/武器/防具/大事なもの/弾薬/指輪）。見るだけでは減らない | 画面とF8 |
| 15 | SKILL（スキル）= デッキ構築を開き、カードを追加・削除 | `DECK n / 30`。コピー上限で拒否。製品では19枚までで30枚に届かない（正常） | 画面とF8 |
| 16 | ULTIMATE（アルティメット）を開きApolloを選ぶ | 「現在の選択：アポロン」。Janus/Themis/Athenaは未実装で選べない | 画面とF8 |
| 17 | Apolloテストを開始 | Apolloが常駐して出る | 「Ultimate選択」「常駐神」 |
| 18 | Gaugeを満タンにしてUキー | 矢7本が扇状に出る。Gaugeが0 | 「U:」の行 |
| 19 | 武器ゾーン(Animation / Weapon Zone)でG17（ハンドガン）を撃つ(詳細は上の A3〜A11) | 弾が見える・銃口の発光・弾数が減る・リロードで音 | 画面の状況 |
| 20 | F8（Console）を確認 | 赤いエラーなし | F8の赤い文面 |

### 「[認証]」ブロックの読み方

```
[認証] 戦闘セッション:…  カード戦闘:yes/no  戦闘イベント:yes/no
手札[…]  直近キー:KeyV accepted/passedThrough:理由  直近カード:成功/失敗 …
葦笛: 候補N 生存N 範囲内N 付与N <理由>  / 睡眠中ダミー[…]
Lyre: 成功:success / 失敗:理由   / 精神安定:あり(残りN秒)/なし
F: 物理入力N回  判定:engine / engineAligned:ID / none  起動イベントID:…
Gauge 現在/最大  Ultimate選択:…  常駐神:…  handler Hermes:yes Apollo:yes
U: 物理入力N回  受信N 要求N 最後:queued/blocked:理由  結果:OK started / NG 理由
```

- 「物理入力0回」= そのキーがゲームに届いていません（ウィンドウのフォーカス、IME、別アプリが原因のことがあります）。
- `blocked:messageBusy` / `eventRunning` / `activeWindow:…` = メッセージや別Windowが開いていて入力が受け付けられていません。
- 「葦笛: 候補0」= `<enemy>` のイベントを見つけられていません。「範囲内0」= 4タイル内に敵がいません。
- 「U: … 結果: NG gaugeNotFull」= Gaugeが満タンではありません。

### 製品のデッキが30枚にならないこと（CONTENT BLOCKER）

製品のカードは7種で、コピー上限の合計は19枚です。そのため製品ではボス戦が必ず「30枚必要（現在N枚）」で拒否されます。
**コードの不具合ではなく、カード追加待ちです。** 30枚ルールもコピー上限も緩めていません。DEV端末の「DEVボス戦開始」だけ、DEV fixtureで試せます。

---

自動テストはMZを起動しません。次の手順は**MZのPlaytest（テストプレイ）で実際に確認**してください。
私（Claude）はMZを起動できないため、ここに書いた項目はすべて「MZ実機では未確認」です。
確認できたら、結果（OK / NG と、NGのときは画面の文字）を教えてください。

## 準備

1. `ProjectR_Rebuild` をMZで開き、Playtestを開始する（New Gameで可）。
2. F8でConsoleを開き、赤いエラーが出ていないことを確認する。起動時にエラーが出たら、その文面を報告する。
3. `ProjectRCombatTestArena.enter()` をConsoleで実行してアリーナへ入る。
4. 中央の南東あたり（座標 x=29〜35, y=22 と y=26）に、新しい端末が8個ある。

## A. メニュー（戦闘外）

1. Escキーでメニューを開く。原画のメニューが出る。
2. **SKILL** を選ぶ → デッキ構築画面（`DECK n / 30`、カード一覧、デッキ）が出る。
3. **ULTIMATE** を選ぶ → 神の一覧が出る。**ITEM** を選ぶ → 所持品画面が出る。
4. それぞれ Esc で原画のメニューへ戻れる（カーソル位置が保たれる）。マウスのクリックと右クリックでも操作できる。

## B. アイテム画面

1. 左右でカテゴリ（アイテム/武器/防具/大事なもの/弾薬/指輪）を切り替える。
2. 決定で一覧へ入り、各項目のアイコン・名前・個数・説明・攻撃力などが出る。装備中は「E」。
3. 武器・防具・大事なもので決定しても何も減らない。
4. 回復アイテム（ポーション）で決定すると「使う/やめる」が出る。初期カーソルは「やめる」。「使う」を選んだときだけ1個減る。

## C. デッキ構築（SKILL）

事前に、Consoleで次を実行して指輪とカードを渡す（またはアリーナの「メニュー確認の準備」端末を使う）。

```js
ProjectRCardDeck.assignRingToPlayer("hermes"); ProjectRCardDeck.assignRingToPlayer("apollo");
["hermes_swift_movement","hermes_reed_flute_sleep","hermes_perception_obscure","hermes_sword_attack","apollo_golden_arrow","apollo_plague_attack","apollo_lyre_calm"].forEach(c => ProjectRCardDeck.setCardOwned(c, true));
```

1. 上段で「全て」のまま決定 → 一覧に7枚が出る。決定で1枚ずつデッキに入り、`DECK n / 30` が増える。
2. 同じカードを上限を超えて入れようとすると、ブザーと「コピー上限超過」が出る（ヘルメース移動=3、葦笛睡眠=2）。
3. Shiftキーで一覧からデッキの1枚を戻せる。Tabで一覧とデッキを行き来できる。デッキ側の決定でも戻せる。
4. 製品の7種ではデッキが最大19枚で、30枚には届かない（ヘッダーに「30枚必要（現在n枚）」）。**これは不具合ではなく、カードの追加待ちです。**
5. 絞り込み（ヘルメース / アポロン / ヤヌス / テミス / アテナ / 使用可 / 指輪なし）が動く。ヤヌス・テミス・アテナは空。上段の右端で並び替えが切り替わる。
6. 詳細に、神/指輪・分類・Level（例: Level 1 / 最大3）・Cooldown・対象・コピー数/上限・説明が出る。

## D. Ultimate選択

1. ヘルメースを選ぶと「現在の選択：ヘルメース」になる。アポロンも同様。
2. ヤヌス・テミス・アテナは「未実装」で、決定するとブザーで選べない。
3. Esc→再度ULTIMATEで、選択が保たれている。

## E. 指輪（ULTIMATE画面でTab）

製品では「仲間にできる指輪」が未設定のため、仲間への譲渡は「移せる相手がいません」になるのが正常です。
譲渡の確認は、アリーナの「メニュー確認の準備」端末を調べたあとで行います（DEV仲間のActor 4, 6に渡せる設定になります）。

1. 指輪を選んで決定 → 移し先の一覧（DEV仲間、戻す）が出る。
2. 仲間に渡すと、SKILLのデッキ表示で対応カードが「必要な指輪を所持していない」になる。デッキの中身は消えない。
3. 主人公へ戻すと、元どおり有効になる。仲間は1人1つまで（2つ目は拒否される）。

## F. 戦闘のライフサイクルとメニュー禁止

1. 「DEVボス戦開始」端末（x=29,y=22）を調べる。ボスHUD（名前・HPバー・フェーズ）、カードHUD（Q E X C V）、仲間HP、神が出る。
2. 戦闘中にEscを押してもメニューが開かない。
3. 「DEVボス戦」を終える（ボスのHPを0にする、または「DEVデータを元に戻す」端末）と、HUDが消え、Escでメニューが開く。

## G. ボス戦とフェーズ

1. 「ボスにダメージ」端末を3〜4回調べる。HPが減り、66%・33%を下回るたびに第二形態・第三形態に変わる。
2. 「ボスの範囲攻撃」端末で、神のDivine HPが25減る（Hermes）。続けて4回で崩壊し、約15秒後に50%で復帰する。
3. 「仲間にダメージ」端末を2回で、DEV仲間がDOWNになる（戦闘中は復帰しない）。
4. 仲間はAIで判断し、ボスのHPがゆっくり減る（見た目の移動・攻撃演出はまだ無い）。

## H. ボス開始のデッキ検証

1. 「ボス開始のデッキ検証」端末を調べる。**「戦闘を始められません」と理由（例: 30枚必要）が出る**。ボス戦は始まらない。
2. メニューのSKILLを開くと、デッキが書き換わっていない。

## I. 武器と斬撃（Map001など通常の戦闘場所、または武器ゾーン）

1. ショートソードを装備して攻撃（クリックまたはJ）。**マウス方向（上下左右以外の斜めも）へ弧状の斬撃**が見える。
2. 銃（テストハンドガン）を装備して撃つ。**弾が見える**（以前は見えなかった）、**銃口の発光と短い弾道線**が出る。弾数が減り、リロードで音が鳴る（仮の音: Gun2）。
3. Hermes剣術カードと、HermesのUltimate（6連斬）で、各斬撃の方向に斬撃が見える。ダメージ数値も出る。

## J. 以前の実機不具合の再確認（上の最重要シーケンスと同じ内容。「Full-Spec Status」端末の「[認証]」ブロックを使う）

アリーナの Hermes / Apollo テストを開始し、次を試して、状態端末（Status Terminal）の下のほうの行を報告してください。

1. **F（調べる）**: 戦闘中に隣の端末をFで調べる。
2. **Reed Flute**: 操作盤で「Go to Reed Flute Spot」→ 葦笛カードのキー。
3. **Lyre**: 睡眠付与の端末→ リラのカードのキー。
4. **U**: Gaugeを満タンにしてUキー。

状態端末の行 `Reed Flute直近` / `Lyre直近` / `Ultimate直近` / `F(調べる)直近` が、原因調査の手がかりになります。

## K. 視界（遮蔽）との同居

`docs/ProjectR_OcclusionRecovery.md` の手順で壁（Region 255）を置いても、戦闘HUD・メニュー・ボスHUDが暗くならないことを確認する。

## L. 後片付け

「DEVデータを元に戻す」端末を調べるか、アリーナから出る。保存データが元に戻る。
（アリーナのテスト中はセーブしないでください。）

## 自動テスト

```
node tests/ProjectR_RuntimeCertification.test.cjs   # 実エンジン: Reed Flute/Lyre/F/U/Q E X C V
node tests/ProjectR_MenuRuntimeCertification.test.cjs   # 実Window: アイテム/デッキ構築/アルティメット/指輪
node tests/ProjectR_FullSpec.menu.test.cjs
node tests/ProjectR_FullSpec.combat.test.cjs
node tests/ProjectR_FullSpec.arena.test.cjs
```

## 追記(Phase H2C-A): Hermes本番デッキの手動確認

F8のConsoleから(Playtest限定のDEVヘルパー。セーブは触りません):

```js
ProjectRProductionTest.freshGame()     // メモリ上を新しいゲームに戻す
// イベントのプラグインコマンド「ヘルメースの指輪を入手する」と同じ入口:
ProjectRHermesProductionDeck.acquireRing("hermes")    // 初回だけ7種30枚。もう一度呼んでも増えない
ProjectRHermesProductionDeck.diagnose()                // 指輪・新旧カード・デッキの診断(読み取り専用)
ProjectRProductionTest.roundTrip()     // セーブ→ロードのメモリ往復(ファイルは作らない)
ProjectRProductionTest.legacyOwner()   // 旧セーブ(指輪と旧カード19枚)の状態をメモリ上に作る
```

スキル(デッキ構築)画面で7種の名前・Level別効果・コピー上限を確認し、戦闘を始めて手札5枚を確認してください。この環境のキー割り当てでは、ウィンドウの「戻る」は **X / B / 右クリック** です(Escは「メニュー」キーで、デッキ構築画面の下の説明には Esc:戻る と出ますが、ウィンドウは閉じません)。

## 追記(Phase H2C-B1): 手動確認の追加項目

1. デッキ構築画面(スキル画面)で **Esc** を押すと、一覧のときはマップへ、絞り込み中は先に絞り込みへ戻る。X・B・右クリックも従来どおり。戦闘中の Esc は何もせず、Q/E/X/C/V は従来どおり。
2. 古いセーブ(ツクールでデータを編集する前のもの)をロードしてもエラー画面にならない。**自動実機スクリプトの確認であり、人間による手動確認は未実施**です。実際のセーブは上書きしないよう、コピーで試してください。
3. 詳細・テスト・実機の結果: `docs/ProjectR_HermesProductionDeck_H2C_B1.md`。

## 追記(Phase H2C-B2): デッキ構築の手動確認の追加項目

1. 詳細欄に「ストレングス：所持N枚 / デッキN枚 / 上限10枚」が出る。一覧の右端は「デッキ内/所持」。
2. 所持枚数を超えて追加しようとすると拒否され、「所持枚数を超えています」と出る。プラグインコマンド「カードを枚数つきで入手する」で増やすと入る。
3. Esc / X / B / 右クリックは従来どおり。
4. これらは **スクリプト入力による自動確認**(`tools/mz_cdp/h2cb2_verify.cjs`・`h2cb1_esc.cjs`)で、人間による手動確認は未実施です。

## 追記(Phase H2C-B3): 実機スクリプトの整理

実機スクリプトの台帳は `tools/mz_cdp/scripts.json`。旧 `verify.cjs` は現行仕様(カード定義の件数の決め打ちを廃止・絶の取引結果の確定を待つ)に更新して保守対象。詳細は `docs/ProjectR_HermesFinalStabilization_H2C_B3.md` §4・§10。
