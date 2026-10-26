# ProjectR 全仕様パス ギャップ監査

作成日: 2026-10-26 / 基準コミット: c6c84bd（視界システム復元の直後）

この文書は、定義済みの仕様を1つずつ現状のRebuildと突き合わせ、分類したものです。
分類の意味は次のとおりです。

| 分類 | 意味 |
| --- | --- |
| COMPLETE | 実装済みで自動テストがある（MZ実機で未確認のものは備考に明記） |
| PARTIAL | 一部だけ実装、または実機で不具合が報告されたまま原因を特定できていない |
| BROKEN IN MZ | MZ実機で壊れていることが確認されている |
| NOT IMPLEMENTED | 仕様は定義されているが未実装 |
| CONTENT NOT YET DEFINED | 仕様側の中身（カード・神・仲間・ボスなど）が未設計。作らない |

「開始時」は監査開始時点、「今回」はこのパスの実装後です。**自動テストの合格は、MZ実機の動作確認の代わりにはなりません。**
私（Claude）はMZを起動できないため、今回実装した画面・見た目はすべて「MZ実機では未確認」です（手順は `docs/ProjectR_FullSpec_ManualVerification.md`）。

## 1. 監査表

| # | 仕様 | 開始時 | 今回 | 備考 |
| --- | --- | --- | --- | --- |
| 1 | 通常メニューが主なインターフェース | PARTIAL | COMPLETE（実機未確認） | 7コマンドの原画メニューのうち SKILL / ULTIMATE / ITEM が「仮処理」だけだった。`MenuHUD.commandScenes` で実画面へ接続。SAVE/LOAD/SYSTEM/TITLEは従来のまま |
| 2 | アイテム画面（所持品・装備の確認） | NOT IMPLEMENTED | COMPLETE（実機未確認） | `ProjectR_Inventory`。アイテム/武器/防具/大事なもの/弾薬/指輪。見るだけでは消費せず、回復アイテムは確認後に使用 |
| 3 | スキル = カードデッキ構築 | NOT IMPLEMENTED | COMPLETE（実機未確認） | `ProjectR_DeckBuilder`。検証はCoreの結果の表示のみ。**製品カードは7種（最大19枚）で30枚に届かない → #34** |
| 4 | アルティメット = 神の選択 | NOT IMPLEMENTED | COMPLETE（実機未確認） | `ProjectR_UltimateSelect`。保存先は既存のUltimateSelection。Janus/Themis/Athenaは「未実装」で選択不可 |
| 5 | 指輪の所持・譲渡 | PARTIAL | COMPLETE（実機未確認） | ルール（主人公は無制限、仲間は1人1つ・対象限定・戦闘外のみ）は元々Coreが実装済み。通常メニューの経路が無かった → `ProjectR_RingParty`（ULTIMATE画面でTab）。**製品の「仲間にできる指輪」は未定義 → #34** |
| 6 | 仲間（Party）システム | NOT IMPLEMENTED | PARTIAL | `ProjectR_PartyCombat`: 定義レジストリ・最大2人・HP/ダウン・デッキ不使用・指輪ごとのAIスキル・自動判断（攻撃/指輪スキル/移動）。**仲間のマップ上の姿・実際の移動と攻撃の演出は未実装**（製品の仲間キャラ自体が未設計）。DEV fixtureのみで動作確認 |
| 7 | 戦闘イベントのライフサイクル | PARTIAL | COMPLETE（実機未確認） | 戦闘イベントのフラグ（CombatPresence）はあったが、開始/終了で他のシステムをまとめて動かす窓口が無かった → `ProjectR_CombatSession.begin/end`（プラグインコマンド BeginCombat / EndCombat） |
| 8 | 戦闘中のF（調べる） | BROKEN IN MZ（実機報告） | PARTIAL | RT3の対策（隣のボタンイベントへ向き合わせ＋標準 `start()`）は実機で未確認のまま。今回の静的レビューで新たな不具合は見つからず、変更なし。状態端末にF入力の診断を表示 |
| 9 | カード入力 Q/E/X/C/V（押下1回=1発動） | COMPLETE | COMPLETE | RT3で実装・自動テスト済み。実機未確認 |
| 10 | カード戦闘ルール（手札5・Cooldown・捨て札の再シャッフル・失敗は非消費） | COMPLETE | COMPLETE | Coreのテストで検証済み |
| 11 | 製品カード7枚が実機で動く | BROKEN IN MZ（Reed Flute/Lyre） | PARTIAL | Reed FluteとLyreの実機失敗は、Hendrixの `findTargets/checkRange/hasState/AddState` とDatabaseのState/敵データを照合したが原因を特定できず、**コードは変えていない**。DEVの状態端末に、Reed Flute・Lyreの発動前提・Ultimate・Fの直近結果を表示 |
| 12 | ターゲティング（Direction/Ground/Buff即時/Heal=最寄りの味方、いなければ自分） | PARTIAL | PARTIAL | 各カードが個別に実装。Healの「最寄りの仲間」は、マップ上に仲間が居ないため自分固定。共通ヘルパー化は仲間の姿が決まってから |
| 13 | 一時的な神の召喚（見える・消える・HPなし・邪魔しない） | COMPLETE | COMPLETE | ロジックは `GodSummonManager`、見た目は表示専用の `GodSummonVisual`。画像はPlugin Parameterで差し替え可（最終アートは未作成） |
| 14 | 常駐Ultimate神 | COMPLETE | COMPLETE | Divine HP・崩壊・15秒後に50%で復帰。実機未確認 |
| 15 | Ultimate Gauge（0%開始・満タン=ready・使用で0・HUDの3状態） | COMPLETE | COMPLETE | HUDは「通常 / READY / GAUGE FULL UNAVAILABLE」を区別 |
| 16 | Ultimate入力 U | BROKEN IN MZ（実機報告） | PARTIAL | RT3の診断のみ。実機未確認。状態端末にU入力の直近結果を表示 |
| 17 | Hermes Ultimateの斬撃の見た目 | NOT IMPLEMENTED | COMPLETE（実機未確認） | Hitbox/ダメージは変更せず、`ProjectR_WeaponPresentation` が6斬撃の各角度で360°の斬撃を描く |
| 18 | Apollo Ultimateの見た目 | PARTIAL | PARTIAL | 7本の矢は公式Prefab（`VFX/$Bullet`画像）で見える。矢以外の追加演出は無し（最終アートが無いため作らない） |
| 19 | 通常の剣（公式Swing Weapon + Dynamic Hitbox + Databaseダメージ） | PARTIAL | PARTIAL | 構成はCE1で既に公式どおり。Swing Weaponは4方向なので、マウス方向の360°斬撃を `WeaponPresentation` で重ねた。**剣の専用画像が無い（Pan.pngは暫定）** → BladeImageで差し替え可 |
| 20 | G17（銃）の見た目 | PARTIAL | PARTIAL | 公式の弾薬・リロード・Prefab弾はそのまま。**弾の画像が空だった（見えなかった）ため `VFX/$Bullet` を設定**。銃口の発光・弾道線・リロード音を追加。反動・リロードの専用アニメ・専用音素材は無し |
| 21 | 武器 / 弾薬 HUD | COMPLETE | COMPLETE | 既存HUD |
| 22 | 戦闘HUD（ボス・仲間を含む） | PARTIAL | COMPLETE（実機未確認） | ボスの名前/HP/フェーズ、仲間HP/DOWNを `ProjectR_CombatExtrasHUD` で追加 |
| 23 | ボス戦開始前のデッキ検証 | NOT IMPLEMENTED | COMPLETE（実機未確認） | `ProjectRBossFramework.start` / `BeginCombat(requireValidDeck)`。拒否時は理由を表示し、デッキを書き換えない |
| 24 | ボス戦の枠組み | NOT IMPLEMENTED | COMPLETE（実機未確認） | `ProjectR_BossFramework`: HP・フェーズ・フック・敗北/リトライ・仲間ダウン転送・後始末。ストーリーボス・最終攻撃は **CONTENT NOT YET DEFINED** |
| 25 | Divine HPダメージ窓口 | COMPLETE | COMPLETE | 既存Bridge。`bossAttack` から利用 |
| 26 | セーブ / ロード（設定のみ保存、戦闘状態は保存しない） | COMPLETE | COMPLETE | 保存されるのはカード所持/Level・30枚デッキ・指輪の持ち主・Ultimate選択だけ。新しいテストで確認 |
| 27 | 遮蔽（視界）システム | NOT IMPLEMENTED | COMPLETE（実機未確認） | 旧ProjectRから復元済み（c6c84bd）。戦闘系の今回の変更と干渉しない（プラグイン順・フックを確認） |
| 28 | メニューのUI/UX | NOT IMPLEMENTED | COMPLETE（実機未確認） | 解像度は `Graphics.boxWidth/boxHeight` から計算。機能優先で最終アートは無し |
| 29 | メニューと戦闘の衝突 | NOT IMPLEMENTED | COMPLETE | 下記「戦闘中のメニューのルール」 |
| 30 | DEV Combat Test Arena | PARTIAL | COMPLETE（実機未確認） | 追加プラグインとMap004の端末8個（ボス/仲間/メニュー/検証） |
| 31 | MZ実機での確認 | – | – | **未実施。手順書を作成**（`docs/ProjectR_FullSpec_ManualVerification.md`） |
| 32 | 自動テスト | PARTIAL | COMPLETE | 新規 70 件（メニュー31 / 戦闘24 / Arena・武器・文書15）。全体で752件（Casino/Holdem含む）が合格、既存テストも全て合格 |
| 33 | プラグインの責務分離 | – | COMPLETE | 下記「構成」 |
| 34 | 未定義の内容を作らない | – | – | 下記「CONTENT NOT YET DEFINED」 |
| 35 | Git | – | – | 論理コミットに分割。無関係な未コミット変更はステージしない |

## 2. 戦闘中のメニューのルール（最終）

- **明示的な戦闘イベント中、またはカード戦闘中は、メニューを開けません**（`Scene_Map.isMenuEnabled` に条件を追加）。
- 保険として、デッキの変更・Ultimateの変更・指輪の移動・アイテムの使用は、モデル側（`ProjectRMenuCore`）が `inCombat` で拒否します。
- 戦闘を終えて（EndCombat / endCardBattle）から開いてください。戦闘中の所持品確認は、メニュー禁止に合わせて不可です。
- Ultimateの変更は次の戦闘から有効です。進行中の戦闘の神は変わりません。

## 3. 構成（責務の分離）

| プラグイン | 役割 |
| --- | --- |
| `ProjectR_MenuCore` | 画面を持たないデータ層（表示カタログ、デッキ/Ultimate/指輪/所持品のモデル、戦闘中ロック） |
| `ProjectR_MenuUI` | 共通のWindow/Scene部品 |
| `ProjectR_DeckBuilder` | デッキ構築画面（SKILL） |
| `ProjectR_UltimateSelect` | 神の選択画面（ULTIMATE） |
| `ProjectR_RingParty` | 指輪 / Party Rings画面 |
| `ProjectR_Inventory` | 所持品・装備の確認画面（ITEM） |
| `ProjectR_MenuIntegration` | MenuHUDへの接続、戦闘中ロック、カード/指輪を進めるプラグインコマンド |
| `ProjectR_PartyCombat` | 仲間の定義・HP・自動判断 |
| `ProjectR_CombatSession` | 戦闘の開始/終了の一元窓口 |
| `ProjectR_BossFramework` | ボス戦の枠組み |
| `ProjectR_CombatExtrasHUD` | ボス/仲間のHUD |
| `ProjectR_WeaponPresentation` | 剣・銃・神の斬撃の見た目（表示専用） |
| `ProjectR_CombatTestArenaFullSpec` | DEV専用の追加シナリオ |

既存の `ProjectR_CardDeckCore`（検証・所持・保存の正）、`ProjectR_GodSummonManager`、`ProjectR_UltimateGauge`、
`Hendrix_*`、`DotMoveSystem` の本体は変えていません。小さく変えた既存プラグインは次のとおりです。

- `ProjectR_MenuHUD`: `MenuHUD.commandScenes`（接続口）を追加。
- `ProjectR_BattleHUD`: メニューがHUDと同じ名前/アイコンを読む `getCardPresentation / getGodPresentation` を追加。
- `data/Map002.json`: G17の弾（Bullet）の画像を `VFX/$Bullet` に設定（1行）。
- `data/Map004.json`: DEV端末8個を追加（既存の端末は変更なし）。

## 4. CONTENT NOT YET DEFINED（作っていないもの）

- Janus / Themis / Athena の **カード**と **Ultimate**（指輪の定義と神の名前の表示だけある）
- **製品用のカードプール**: 現在7種（コピー上限の合計19枚）。**30枚のデッキは作れず、ボス戦は開始できません**。カードが増えれば自動で一覧に出ます
- **仲間キャラ**、仲間が持てる指輪（`equipActorIds` が全て空）、仲間の最終AIスキル
- **ストーリーのボス**と最終攻撃パターン
- **神の最終アート**、剣の専用画像、リロード専用の音素材

## 5. 既知の未解決（実機の確認が必要）

1. Reed Flute / Lyre が実機で失敗する原因（上記 #11）。状態端末の「Reed Flute直近」「Lyre直近」を報告してください。
2. 戦闘中のF（#8）、U入力（#16）。同様に状態端末の「F(調べる)直近」「Ultimate直近」を報告してください。
3. 今回追加した画面・見た目（メニュー3画面と指輪画面、ボス/仲間HUD、斬撃、銃口発光）はすべて実機で未確認です。
