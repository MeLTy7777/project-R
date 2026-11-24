/*:
 * @target MZ
 * @plugindesc v0.9.0 ProjectR リアルタイム・フィールド戦闘(BAPBAP参考): LMB/Shift/E/X/C=指輪ロードアウトの通常スキル5枠(RingLoadout が無いときは旧い固定: LMB薙ぎ払い・Shift絶・E一閃・X/C固定カード)・右クリック=銃・Q奥義・Rリロード・V アイテム(短押し=使う/長押し=放射メニュー)・敵の予兆・HUD。SOUL戦闘の開始を止める。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CombatSession
 * @base ProjectR_CombatPresence
 * @base ProjectR_CardBattleInput
 * @base ProjectR_EnemyAttack
 * @orderAfter ProjectR_CardBattleInput
 * @orderAfter ProjectR_UltimateActivation
 * @orderAfter ProjectR_HermesZetsu
 * @orderAfter ProjectR_HermesIssen
 * @orderAfter ProjectR_EnemyAttack
 * @orderAfter ProjectR_SoulDevBoss
 *
 * @param SoulMode
 * @text SOUL戦闘の開始(通常のプレイ)
 * @desc off=SOUL/SOUL RUSHの開始をすべて断る(通常のプレイの既定) / dev=Playtestのときだけ許す / on=許す。コードとセーブデータは消しません。
 * @type select
 * @option off(通常のプレイでは使えない)
 * @value off
 * @option dev(Playtestだけ)
 * @value dev
 * @option on(使える)
 * @value on
 * @default off
 *
 * @param EnforceEncounterOnly
 * @text 戦闘は戦闘マップのエンカウンター中だけ(武器の使用も)
 * @desc true: エンカウンター中(と、アリーナ・SOUL等の既存の戦闘中)以外は、基本攻撃(銃・剣)が使えない。探索マップで戦闘の入力を無効にする。
 * @type boolean
 * @default true
 *
 * @param RequireBattleMapTag
 * @text 戦闘マップに <fieldBattleMap> を必須にする
 * @desc true: 移動先のマップのメモに <fieldBattleMap> が無いと、戦闘を始めず、元のマップへ戻る(探索マップを戦闘マップにしてしまう事故の防止)。
 * @type boolean
 * @default true
 *
 * @param DevAllowOutsideEncounter
 * @text (DEV) エンカウンター以外でも戦闘を始められる
 * @desc true: ProjectRFieldCombat.begin() をエンカウンターの外でも使える(テスト用。通常のプレイでは false)。
 * @type boolean
 * @default false
 *
 * @param EnemyPerception
 * @text 敵の視界(見えている間だけ追う)
 * @desc true: 敵は、視界の距離・視野角の中で、壁・閉じた扉に遮られずにプレイヤーが見えている間だけ追う・攻撃する。見失うと、すぐに止まって待つ(プレイヤーの位置を覚えない)。false: 従来(壁越しでも距離内なら追う)。
 * @type boolean
 * @default true
 *
 * @param EnemySightTiles
 * @text 敵の視界の距離(tile)
 * @desc 敵のイベントのメモ <fieldEnemy: sight=8> で、敵ごとに変えられる(aggro=N でも同じ)。
 * @type number
 * @decimals 1
 * @min 1
 * @default 10
 *
 * @param EnemyFovDegrees
 * @text 敵の視野角(度)
 * @desc 敵の向き(イベントの向き)を中心にした角度。360=全周。敵のイベントのメモ <fieldEnemy: fov=90> で、敵ごとに変えられる。見つけたあとは、プレイヤーの方を向いて追う(見失うまで視野角は問わない)。
 * @type number
 * @min 10
 * @max 360
 * @default 140
 *
 * @param EnemyPathfinding
 * @text 敵の経路探索(通れない所をよけて追う)
 * @desc true: 見えている敵が、まっすぐ進めないとき(柱・家具・閉じた扉の枠・味方の敵など)だけ、通れる経路を探して回り込む。まっすぐ進めるときは従来どおり。見失うと経路を捨てて止まる。false: 従来のまっすぐの追跡だけ。
 * @type boolean
 * @default true
 *
 * @param ChokeSoftCollision
 * @text 出入口でのソフト衝突(はさまれて動けないとき)
 * @desc true: 扉口などの通路で、敵にはさまれて進めないとき(24フレーム)だけ、行く手の敵をプレイヤーが通り抜けられるようにする(壁・扉・柱は変わらない。離れると戻す)。false: 従来の衝突だけ。
 * @type boolean
 * @default true
 *
 * @param LoadoutSource
 * @text 通常スキル5枠の元(auto / legacy)
 * @desc auto=ProjectR_RingLoadout があれば指輪ロードアウト(空の枠は何もしない)・無ければ旧い固定スロット。legacy=常に旧い固定スロット(開発の互換用。空の枠の代わりには使わない)。
 * @type select
 * @option auto(RingLoadout があれば使う)
 * @value auto
 * @option legacy(旧い固定スロット。開発用)
 * @value legacy
 * @default auto
 *
 * @param SpecialCooldown
 * @text E 一閃のCooldown(秒)
 * @desc 0以下ならカードの既定(7秒)。
 * @type number
 * @decimals 1
 * @default 7
 *
 * @param MobilityCooldown
 * @text Shift 絶(瞬間移動)のCooldown(秒)
 * @desc 絶のカードのCooldown(0.5秒)は手札の補充用の値なので、フィールド戦闘ではこの値を使う。
 * @type number
 * @decimals 1
 * @default 3
 *
 * @param ConsumableCooldown
 * @text V アイテムのCooldown(秒。どのアイテムも共通)
 * @type number
 * @decimals 1
 * @default 8
 *
 * @param ConsumableItemId
 * @text V アイテムの最初の選択(0=持っているHP回復薬を自動で選ぶ)
 * @desc 放射メニューで選び直すまでの、使うアイテム。
 * @type item
 * @default 0
 *
 * @param SeparateMeleeDamage
 * @text 近接と銃の攻撃力を分ける
 * @desc オンなら、銃を持っている間の薙ぎ払いは、銃の攻撃力ではなく近接の武器の攻撃力で計算します(銃のダメージは変わりません)。オフにすると従来(銃の攻撃力)です。
 * @type boolean
 * @default true
 *
 * @param MeleeWeaponId
 * @text 近接の武器(0 = 自動)
 * @desc 銃を持っているときの薙ぎ払いの攻撃力の元にする武器(データベースの武器)。0 = 自動: リードのデータベースの初期武器(近接のもの)。それも無ければ素手。近接の武器を装備しているときは、装備中の武器がそのまま使われます。
 * @type weapon
 * @default 0
 *
 * @param HitFeedback
 * @text 命中の手応え(点滅・反動・ヒットストップ・SE)
 * @desc 攻撃が実際にダメージを与えたときだけ、当たった敵に出す見た目と音。オフにすると何も出ません(ダメージ・判定・時間には関係しません)。
 * @type boolean
 * @default true
 *
 * @param HitstopFrames
 * @text ヒットストップ: 通常の近接(フレーム)
 * @desc 当たった敵だけを止める長さ(60フレーム=1秒)。0で無し。時計・入力・Cooldown・他の敵は止めません。
 * @type number
 * @min 0
 * @max 12
 * @default 3
 *
 * @param HitstopHeavyFrames
 * @text ヒットストップ: 3段目の強撃(フレーム)
 * @type number
 * @min 0
 * @max 12
 * @default 6
 *
 * @param HitstopGunFrames
 * @text ヒットストップ: 銃(フレーム)
 * @type number
 * @min 0
 * @max 12
 * @default 2
 *
 * @param RecoilPixels
 * @text 反動(見た目だけ): 通常の近接(px)
 * @desc 当たった敵の絵を、攻撃の向きへ少しずらして戻す距離。敵の位置・当たり判定・経路は変わりません。0で無し。
 * @type number
 * @min 0
 * @max 24
 * @default 4
 *
 * @param RecoilHeavyPixels
 * @text 反動: 3段目の強撃(px)
 * @type number
 * @min 0
 * @max 24
 * @default 10
 *
 * @param RecoilGunPixels
 * @text 反動: 銃(px)
 * @type number
 * @min 0
 * @max 24
 * @default 3
 *
 * @param FlashFrames
 * @text 点滅の長さ: 通常の近接(フレーム)
 * @desc 当たった敵が白く光る長さ(強撃は約1.6倍・銃は約0.6倍)。0で無し。
 * @type number
 * @min 0
 * @max 30
 * @default 6
 *
 * @param HitSeMelee
 * @text 命中SE: 通常の近接(名前:音量:ピッチ。none で無し)
 * @desc 薙ぎ払いが何体に当たっても、1回の攻撃につき1回だけ鳴ります。
 * @type string
 * @default Blow1:55:115
 *
 * @param HitSeHeavy
 * @text 命中SE: 3段目の強撃
 * @type string
 * @default Blow6:75:80
 *
 * @param HitSeGun
 * @text 命中SE: 銃
 * @type string
 * @default Damage1:45:125
 *
 * @param Card1Id
 * @text 1キーの固定カード(実装済みのアクティブカードのID)
 * @desc 戦闘中ずっと装備している(ドロー・準備・SOULなし)。既定は黄金の矢(apollo_golden_volley)。Cooldown はカードの定義の値(秒)。
 * @type string
 * @default apollo_golden_volley
 *
 * @param Card2Id
 * @text 2キーの固定カード(実装済みのアクティブカードのID)
 * @desc 既定はギガース殺し(apollo_gigas_slayer)。
 * @type string
 * @default apollo_gigas_slayer
 *
 * @param ComboTimeout
 * @text 左クリックの3段コンボの受付時間(秒)
 * @desc 前の斬撃からこの時間の内に次のクリックをすると、次の段(1→2→3)へ進む。過ぎると1段目に戻る。
 * @type number
 * @decimals 2
 * @min 0.2
 * @default 0.8
 *
 * @param ComboFinisherDamage
 * @text 3段目(強撃)のダメージ倍率
 * @desc 1・2段目は通常の武器ダメージ(従来の式)。3段目だけ、この倍率を掛ける(範囲も広がる)。
 * @type number
 * @decimals 1
 * @min 1
 * @default 2
 *
 * @param ItemHoldSeconds
 * @text V を長押しして放射メニューを開くまでの時間(秒)
 * @desc これより短く離すと「選んでいるアイテムを使う」。
 * @type number
 * @decimals 2
 * @min 0.05
 * @default 0.3
 *
 * @command StartFieldEncounter
 * @text フィールド戦闘: エンカウンターを始める
 * @desc 元のマップ・位置・向きを記録し、(戦闘マップを指定すれば)そのまま戦闘マップへ移動します。戦闘は、戦闘マップの準備が終わってから始まります。
 * @arg encounterId
 * @text エンカウンターID(記録用の名前)
 * @type string
 * @default field_encounter
 * @arg battleMapId
 * @text 戦闘マップ(0=あとで「戦闘マップへ移動」で指定)
 * @type number
 * @min 0
 * @default 0
 * @arg spawnX
 * @text 出現位置 X
 * @type number
 * @min 0
 * @default 0
 * @arg spawnY
 * @text 出現位置 Y
 * @type number
 * @min 0
 * @default 0
 * @arg direction
 * @text 出現時の向き
 * @type select
 * @option 上
 * @value 8
 * @option 下
 * @value 2
 * @option 左
 * @value 4
 * @option 右
 * @value 6
 * @default 8
 * @arg resultVariableId
 * @text 結果を入れる変数(0=使わない。1=勝利 / 2=敗北 / 3=中断)
 * @type variable
 * @default 0
 * @arg victoryCommonEventId
 * @text 勝利して元のマップへ戻った後に実行するコモンイベント(0=なし)
 * @type common_event
 * @default 0
 * @arg otherCommonEventId
 * @text 中断して元のマップへ戻った後に実行するコモンイベント(0=なし)
 * @type common_event
 * @default 0
 *
 * @command TransferToBattleMap
 * @text フィールド戦闘: 戦闘マップへ移動する
 * @desc 「エンカウンターを始める」で戦闘マップを指定しなかったときに、移動先を指定して移動します(エンカウンターを始めた後だけ)。
 * @arg battleMapId
 * @text 戦闘マップ
 * @type number
 * @min 1
 * @default 1
 * @arg spawnX
 * @text 出現位置 X
 * @type number
 * @min 0
 * @default 0
 * @arg spawnY
 * @text 出現位置 Y
 * @type number
 * @min 0
 * @default 0
 * @arg direction
 * @text 出現時の向き
 * @type select
 * @option 上
 * @value 8
 * @option 下
 * @value 2
 * @option 左
 * @value 4
 * @option 右
 * @value 6
 * @default 8
 *
 * @command CompleteFieldEncounter
 * @text フィールド戦闘: エンカウンターを終える
 * @desc 戦闘を片づけて、元のマップ・位置・向きへ戻ります(結果は1回だけ処理)。敵を全員倒したときは自動で「勝利」になるので、ボス戦・撤退などの特別な終わり方に使います。
 * @arg result
 * @text 結果
 * @type select
 * @option 勝利
 * @value victory
 * @option 中断・撤退
 * @value other
 * @default victory
 *
 * @command AttachFieldEnemy
 * @text フィールド戦闘: 敵の行動をつける
 * @desc 戦闘マップのイベントを、近づいて溜めて攻撃する敵にします(イベントのメモに <fieldEnemy> と書いても同じ。戦闘マップの準備が終わった後に有効)。
 * @arg eventId
 * @text イベントID(0=このイベント)
 * @type number
 * @min 0
 * @default 0
 * @arg windupFrames
 * @text 溜め(フレーム)
 * @type number
 * @min 1
 * @default 36
 * @arg cooldownFrames
 * @text 攻撃後の間(フレーム)
 * @type number
 * @min 0
 * @default 120
 * @arg reach
 * @text 攻撃の届く距離(tile)
 * @type number
 * @decimals 1
 * @default 1.2
 * @arg sightTiles
 * @text 視界の距離(tile。空=パラメータ)
 * @type number
 * @decimals 1
 * @arg fovDegrees
 * @text 視野角(度。空=パラメータ)
 * @type number
 *
 * @command AbortFieldEncounter
 * @text フィールド戦闘: エンカウンターを中断する
 * @desc 戦闘を片づけて元のマップへ戻ります(結果は「中断」)。
 *
 * @help
 * ProjectR_FieldCombat.js
 *
 * 【目的】 戦闘を「マップ上のリアルタイム(BAPBAP参考)」へ戻す。ATTACK/DEFENSEの区切りもカードのドローも使わない。SOUL戦闘は
 *   コードもセーブも消さず、開始だけを止める(SoulMode)。新しい武器・スキル・敵AIは作らず、既存のProjectRの部品をつなぐ。
 *
 * 【エンカウンター(戦闘が使える場所)】 戦闘は、NPCとの会話・物語のイベントから入る「専用の戦闘マップ」の中だけです。探索マップでは、近くに敵がいても
 *   戦闘は始まらず、戦闘の入力(Q/E/R/X/C/V/Shift・基本攻撃)は無効です(移動・NPC・イベント・メニューは普通のまま)。
 *   流れ: ①イベントのプラグインコマンド「エンカウンターを始める」(元のマップ・位置・向きを記録 → 戦闘マップへ移動)
 *         ②戦闘マップの準備が終わる(移動・フェード・開始時のイベントの後)→ 戦闘・敵の行動・アビリティ・HUDが有効になる
 *         ③敵を全員倒すと「勝利」(結果を1回だけ処理 → 戦闘を片づける → 元のマップ・位置・向きへ戻る → 結果の変数・コモンイベント)
 *            「エンカウンターを終える」(ボス戦・撤退など)/「中断する」でも同じ。敗北(HPが0)は、自動では戻らず、既存の死亡・ロードの扱いのまま
 *            (戦闘は片づく・結果=敗北・エンカウンター中はセーブできない)。ロード・ニューゲームで、すべて初期状態へ戻る。
 *   戦闘マップの条件: マップのメモに <fieldBattleMap>(RequireBattleMapTag)。敵にするイベントのメモ(または有効なページの注釈)に <fieldEnemy> と書く。
 *     <fieldEnemy: windup=36, cooldown=120, reach=1.2, aggro=10, chase=1, path=1>  (すべて省略可。数値の単位は「フィールド戦闘: 敵の行動をつける」と同じ)
 *     sight=視界の距離(tile) / fov=視野角(度)。省略すると、プラグインパラメータ(EnemySightTiles / EnemyFovDegrees)。
 *     敵のイベントには、Hendrix の敵の印(<hp: 敵名> と <enemy>)も必要です(武器・奥義が当たるように)。
 *
 * 【操作(固定。エンカウンター中だけ。戦闘外では従来のまま)】
 *   WASD      移動(Hendrix Button Configのまま。DotMoveの自由移動)。Shift のダッシュは、エンカウンター中だけ無効(Shift は絶に使う)
 *   マウス    照準(戦闘中は ProjectR_PlayerFacing が主人公をマウスの方向へ向ける)
 *   左クリック(またはJ)  薙ぎ払いの近接3段コンボ(見た目は Hermes の「薙ぎ払い」の VFX = hermes_sweep.staff + ケーリュケイオン)。1クリック=ちょうど1回の斬撃: 1段目 → 2段目 → 3段目(強撃。反対側にもう1回の扇 = 一回転、ダメージ倍率 ComboFinisherDamage。VFX は2回)→ 1段目へ戻る。当たり判定は、見た目の杖の残像と同じ扇(半径 4・190°・時計回りに約0.25秒)。
 *                        押しっぱなしでは進まない(押し直すたびに1段)。前の斬撃から ComboTimeout 秒を過ぎると1段目に戻る。
 *                        斬撃は既存の ProjectRSwordSystem.swing(sector オプションの扇形の判定。当たったときのダメージ・追跡は既存)。装備が銃でも斬撃は出る(ダメージは装備中の武器の攻撃力)。
 *   右クリック  既存の銃(ProjectRGunSystem.fire)をマウスの方向へ1発。ブラウザの右クリックメニューは出さない。銃を装備していなければ何も起きない
 *   R         リロード(既存の ProjectRGunSystem.requestReload。弾薬・リロード時間・満タン/ストック無しの扱いは既存のまま)
 *   Q         奥義 = Ultimate(UltimateActivation。実際のゲージが満タンのときだけ。ゲージは与ダメージでたまる)
 *   Shift     絶(hermes_zetsu。マウス位置へ瞬間移動 + 直後の通常攻撃1ヒットを強化)。予兆された攻撃の範囲から抜ける回避
 *   E         一閃(hermes_issen。マウス方向の直線上の敵へ防御無視の直接ダメージ + 分割ダメージ)
 *   V         アイテム: 短押し(ItemHoldSeconds より短く離す)= 選んでいる消耗品を1個使う。長押し = 放射メニューを開く
 *   X / C     固定カード2枚(既定: X = 黄金の矢 / C = ギガース殺し。パラメータ Card1Id / Card2Id。エンカウンター中だけ MZ の X(キャンセル / メニュー)を先に受け取る)。戦闘中ずっと装備(ドロー・準備・SOULなし)。既存のカード効果をそのまま1回使う
 *   F         調べる(Hendrix Button Config の Interact。戦闘中もそのまま)
 *   放射メニュー(V 長押し): 持っている消耗品(通常アイテム・消耗する・いつでも使える・味方1人/全体/自分が対象)を円形に並べる。V を押したまま、マウスを動かした方向のアイテムが光り、
 *     V を離すと、そのアイテムを選ぶ(使わない)。動かさずに離す・右クリック・Esc では、選んでいるアイテムは変わらない。開いている間は、右クリック(銃)・左クリック・Q/E/R/Shift/X/C は受け付けない。
 *     アイテムが無ければ「アイテムなし」を表示。開いている間に持ち物が変わっても、一覧が更新される(選んでいたアイテムが無くなれば、選択なし)。
 *     Cooldown(ConsumableCooldown)はどのアイテムも共通。使えないアイテム(HP満タンなど)は、使っても消費せず何も起きない。
 *   戦闘中の入力の衝突は、このPluginがマップ戦闘中だけ Q/E/R/X/C/V/Shift・右クリックを先に受け取って解決する(メッセージ・メニュー・会話・イベント中は元のまま。Shift は絶のキーなので、keydown の shiftKey を修飾キーとして断らない)。
 *   古い割り当て(Q=一閃 / Space=絶 / E=奥義 / R=回復薬 / C=キャンセル / 数字の1・2=固定カード)は、戦闘中は使いません。
 *
 * 【固定アビリティ】 カードの山札・手札・ドローは使わない。CardDeckCore の固定アビリティ(startCardBattle(FIXED_BATTLE) と useFixedCard)で、
 *   既存のカード効果(handler)をそのまま1回使う。所持カード・指輪には依らない。Cooldownはこのプラグインが持つ(スロットごと)。
 *
 * 【敵の視界】 敵は、(1)視界の距離の内側 (2)敵の向きを中心にした視野角の内側(見つける瞬間だけ)(3)敵とプレイヤーを結ぶ線が、壁(Region 255)・閉じた扉(<VisionWall>)に遮られていない、の3つが
 *   そろっている間だけ、プレイヤーを追い、攻撃する。開いた扉は視線を通す。見失った瞬間に、追うのをやめて、その場で待つ(プレイヤーの位置を覚えない・探さない)。
 *   見えるようになれば、また見つけて追う。視線の判定は ProjectR_CombatOcclusion(hasLineOfSight、mode:"vision")で、プレイヤーの霧(FogOfWar)とは無関係。攻撃・ダメージ・HP・戦闘のルールは変えない。
 *   API: getEnemyPerception(eventId) / getPerception() / setPerception({ enabled, sightTiles, fovDegrees })(DEV。保存しない)
 *
 * 【敵の経路探索】 追うかどうかは、上の視界がすべて決める。そのうえで、見えている敵が「まっすぐ進めない」ときだけ、通れない所(壁・柱・家具・閉じた扉・味方の敵)をよける。
 *   ・まっすぐ進める間は、従来どおり(DotMove の dotMoveToPlayer)。通れない所があるときだけ、タイルの格子の A*(8方向。角をまたぐ斜めは禁止)で経路を求め、
 *     まっすぐ行ける最も遠い曲がり角を結んだ折れ線の上を、DotMove の通常の移動(衝突判定)で進む。
 *   ・経路の目標は、見えている間の「いまの」プレイヤーのマスだけ。見失った瞬間に経路を捨てて止まる(最後に見た位置へ向かわない・探さない)。見えるようになれば、また探す。
 *   ・限界: 視界の判定は変えないので、壁(Region 255)や閉じた扉の向こうへ回り込む追跡はしない(視線が切れた瞬間に止まる)。見えている間に、柱などをよける回り込みだけを行う。
 *   ・探索は敵ごとに 12 フレーム以上あけ、全体で 1 フレーム 3 回まで。範囲はプレイヤーまわり(+8マス)・最大 1500 ノード。エンカウンター中・体が 1 マス以下・ループしないマスだけ。
 *   ・敵のメモ <fieldEnemy: path=0> で、その敵だけ従来のまっすぐの追跡にできる。
 *   近接と銃の攻撃力(Stage 6C): 銃を持っている間の薙ぎ払いは、銃の攻撃力ではなく近接の武器(リードのDBの初期武器 = ロングソード。MeleeWeaponId で変更)の攻撃力で計算する。銃のダメージ・式・強撃の倍率は変わらない。
 *     API: getMeleeDamageSource() / setMeleeDamageSource({ separate, weaponId })(DEV。保存しない)。パラメータ SeparateMeleeDamage(オフで従来)/ MeleeWeaponId。
 *   命中の手応え(Stage 6B): 攻撃が実際にダメージを与えたときだけ、当たった敵に 点滅・反動(絵だけ)・ヒットストップ(その敵だけ)・SE を出す。近接1・2段 / 3段目の強撃 / 銃で強さが違う。
 *     SwordSystem / GunSystem の命中の通知(addHitListener)を受け、HP が実際に減ったのを確かめてから出す(HPは次のフレームで減る)。霧で見えていない敵には何も出さない。
 *     API: getHitFx() / setHitFeedback({ enabled, hitstop:{melee,heavy,gun}, recoil:{...}, flash:{...}, se:{melee,heavy,gun} })(DEV。保存しない)。パラメータ HitFeedback / HitstopFrames / RecoilPixels / FlashFrames / HitSeMelee ほか。
 *   API: getEnemyNav(eventId) / findNavPath(from, to, { avoidEnemies, allowPartial }) / getNavStats() / resetNavStats() / setPathfinding(on)・isPathfinding()(DEV。保存しない)
 *
 * 【敵】 ProjectREnemyAttack(予約 → 溜め → 実行)を使う。attachEnemy(eventId) で、生きている敵のEventに「近づいて、溜めて、近接攻撃する」行動を
 *   つける(メモリ上だけ)。溜めの間、予兆(攻撃の範囲)が赤く画面に出る。Eventに元からある並列ページの攻撃は止める(二重にならないように)。
 *
 * API: ProjectRFieldCombat
 *   エンカウンター: startEncounter(options) / transferToBattleMap(options) / completeEncounter(result) / abortEncounter(reason)
 *                  getEncounterState() / onEncounterResult(fn) / isCombatAllowed()
 *   begin(options?) / end(reason?) / isActive() / getState()     (begin はエンカウンター中だけ。DEVは setDevAllowOutsideEncounter(true))
 *   getLoadout() / getCooldowns() / useAbility(slot, source?) / cancel() / getHudState() / getLastResult() / getLog()
 *   attachEnemy(eventId, options?) / detachEnemy(eventId) / listEnemies()
 *   getSoulMode() / setSoulMode(mode) / isSoulAllowed()
 *   スロット名: mobility(Shift) / special(E) / card1(X) / card2(C) / ultimate(Q) / reload(R) / consumable(V)。cancel は API だけ(保留中の入力の取り消し)
 *
 * 【指輪ロードアウト(Stage 1D-1)】 LMB(attack) / Shift(mobility) / E(special) / X(card1) / C(card2) の5枠は、ProjectRRingLoadout.getSkill("lmb"|"shift"|"e"|"x"|"c") のスキルID(承認済みの10種)を使う(保存データは書かない)。
 *   ・スロット名・物理キーは従来のまま。スキルの働きは、割り当てたキーに依らない(薙ぎ払い = どのキーでも同じ SwordSystem の3段コンボ: 1・2段 前方 / 3段 全周・2倍 / 受付 0.5秒 / Cooldown 0。単発のカード版は使わない)。
 *   ・空の枠は何もしない(旧い固定スキルへは戻さない)。戦闘開始時(begin)に5枠の写しを取り、発動のたびに所持・装備を確かめ直す(外れていたら skillUnavailable)。
 *   ・Cooldown はスキルIDごと(物理キーではない)。黄金の矢 = Cooldown 0 + 発射の最小の間隔 0.5秒。絶 = MobilityCooldown(3秒)/ 一閃 = SpecialCooldown(7秒)/ そのほか = カードの定義。
 *   ・入力: 5枠すべてで、押す・離すを別々に受ける(左クリックは TouchInput から「離した」を読む。押しっぱなしでは1回だけ)。黄金の矢 Lv3 だけは、押した瞬間には発射せず、離したときに「短い = 通常の発射 / しきい値(0.5秒)以上 = 発射なし
 *     (ビームは Stage 1D-2)」。Lv1・2 は押した瞬間に通常の発射。竪琴の演奏中の左クリックは、通常の攻撃より先に音符の選択へ(LMB が空でも)。
 *   ・Q(奥義・Stage 1E-1): RingLoadout の Q 枠の指輪(主人公が持っていて・装備していて・奥義の処理が登録済み = いまはヘルメース・アポロン)を、戦闘の開始時に写して
 *     GodSummonManager へ startCardBattle の第2引数 { ultimateRingId } で渡す。Q が空・無効なら、奥義なし(常駐の神もゲージもない。ヘルメースへの自動選択もしない)。
 *     CardDeckCore の保存された奥義の選択は、読み替えも書き換えもしない(一時的にも)。発動のたびに、所持・装備・奥義の処理を確かめ直す(emptySlot / ultimateUnavailable)。
 *     ゲージが満タンかの判定と、成功後のゲージ消費は、既存の UltimateActivation・UltimateGauge のまま。U(奥義のキー)は、指輪モードの戦闘中は受け付けない(入力ゲート)。
 *   ・旧い固定スロットは RingLoadout が無いとき / LoadoutSource=legacy / setLoadoutSource("legacy")(DEV)のときだけ(従来どおり。Q は従来の奥義)。
 *   ・葦笛の睡眠を敵のAIが見て止まる連携は Stage 1D-2B(下記)。
 *
 * 【葦笛の睡眠 × 敵のAI(Stage 1D-2B)】 葦笛(hermes_reed_flute)が付ける睡眠ステート(State 32 / note <ProjectRCard: hermes_reed_flute_sleep>)を、FieldCombat の敵のAIが毎フレーム見る。
 *   ・眠っている間: 動かない(追わない・道を空けない・位置取りもしない)/ 攻撃を始めない / 溜め中・攻撃中の攻撃は中断(ダメージなし。中断は撃ち終えた扱いで、通常と同じ Cooldown)/ Cooldown・視界の更新も止まる。強敵(FieldStrongEnemy)の攻撃も中断。
 *   ・起きたら(ステートが消えたら)、そのフレームから通常のAI。眠らなかった敵(耐性・無効・範囲外)はステートが無いので何も変わらない。
 *   ・睡眠の付与・時間(4秒)・解除(ダメージを与えたら起きる・戦闘の終了)・耐性は、既存の葦笛と Hendrix の AddState のまま(変えていない)。葦笛の Cooldown・ダメージ加算も変えていない。
 *   API: isEnemyAsleep(eventId) / getEnemySleep(eventId) = { asleep, sleeps, interrupted }。
 *
 * 【黄金の矢 Lv3 の押す・離す・長押しビーム(Stage 1D-2A)】 LMB / Shift / E / X / C のどのキーでも同じ。Lv1・2 は押した瞬間に通常の発射(3/5本。従来どおり)。
 *   ・押した瞬間には発射しない。離す < 0.25秒 = 通常の11本 / 0.25秒〜0.90秒未満で離す = 取り消し(発射もCooldownも無し)/ 0.90秒に達した瞬間 = ビーム自動開始。
 *   ・ビーム(ProjectR_ApolloGoldenVolley の持続ビーム): 最大1.5秒。離す・中断で終わる。同じ敵へは0.2秒に1回。マウスへ追従。通常の発射とビームが同じ押下から両方出ることは無い。
 *   ・移動速度: 溜めている間 100% / ビーム中 50%(ProjectRCardModifiers.setMoveSpeedFactor。ビームが終わると外す)。
 *   ・ビーム専用のCooldown 6秒(ビームが終わってから。スキルIDごと。通常の発射とは独立)。その間は、押している間 0.5秒ごとに通常の発射(連射)。
 *     Cooldown が明けても、押しっぱなしのままではビームへ切り替わらない(離して押し直したとき)。溜めを取り消した(ビーム開始前)ときは、このCooldownは付かない。
 *   ・通常の発射は Cooldown 0・最小の間隔 0.5秒。ビームの間隔(0.5秒)の縛りも受けない(ビームは別)。指輪ロードアウトのフィールド戦闘は、前の矢が飛んでいても次を撃てる。
 *   ・中断(溜め = 取り消し・Cooldownなし / ビーム中 = 終了+6秒のCooldown): ほかのスキルの成功・回避・怯み・スタン(interruptHold(reason) が入口)・メニュー・会話・フォーカス喪失・戦闘終了。通常のHPダメージだけでは中断しない。
 *   API: getBeamState() / getBeamRules() / interruptHold(reason) / getHoldState()(押している枠の mode・phase と、離した記録 outcome = tap / cancel / beam / repeat / interrupted ...)。HUD の黄金の矢の枠に beam(state / cooldown)が付く。
 *   API: getLoadoutMode() / getSlotSkills() / getHoldState() / getGates() / setLoadoutSource("auto"|"legacy"|null) / getLoadoutSource() / getSkillDefs()。getLoadout() は戦闘中は5枠にいま入っているスキル。getCooldowns() はスキルIDごと。
 *   attackClick(source?) 近接の1段 / fireGun(source?) 銃1発 / getComboState() / selectConsumable(id) / listConsumables() / getRadialState() / openRadial() / closeRadial(commit)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_FieldCombat";
    const SOURCE = "field_combat";
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters(PLUGIN) : {};
    const num = (v, f, min) => { const n = Number(v); return Number.isFinite(n) && n >= (min ?? -Infinity) ? n : f; };
    const deck = () => root.ProjectRCardDeck;
    const presence = () => root.ProjectRCombatPresence;
    const combatSession = () => root.ProjectRCombatSession;
    const cardInput = () => root.ProjectRCardBattleInput;
    const enemyAttack = () => root.ProjectREnemyAttack;
    const strongApi = () => root.ProjectRFieldStrongEnemy;                      // 強敵の攻撃(Stage 7A: ProjectR_FieldStrongEnemy。<fieldEnemy: strong=名前> の敵だけ)
    const ultimate = () => root.ProjectRUltimateActivation;
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const safe = (fn, fallback) => { try { return fn(); } catch (_error) { return fallback; } };
    const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

    // ------------------------------------------------------------------ 設定(SOUL・自動開始・Cooldown) ----------------------------------------------------------------
    const cfg = {                                                                       // (旧 AutoEngage / EngageTiles / DisengageSeconds は廃止: 近づいただけの自動の戦闘開始はしない)
        soulMode: ["off", "dev", "on"].includes(String(params.SoulMode)) ? String(params.SoulMode) : "off",
        enforce: String(params.EnforceEncounterOnly ?? "true") !== "false",
        requireTag: String(params.RequireBattleMapTag ?? "true") !== "false",
        devAllowOutside: String(params.DevAllowOutsideEncounter ?? "false") === "true",
        consumableItemId: Math.round(num(params.ConsumableItemId, 0, 0)),
        perception: String(params.EnemyPerception ?? "true") !== "false",
        softCollision: String(params.ChokeSoftCollision ?? "true") !== "false",
        sightTiles: Math.max(1, num(params.EnemySightTiles, 10, 0.1)),
        fovDegrees: Math.min(360, Math.max(10, num(params.EnemyFovDegrees, 140, 0)))
    };
    const perceptionDefaults = { perception: cfg.perception, sightTiles: cfg.sightTiles, fovDegrees: cfg.fovDegrees };
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    // SOUL/SOUL RUSHの開始を許すか。通常のプレイでは false(コード・セーブデータは消さない)。ProjectR_SoulEncounter.start と ProjectR_SoulTestEntry が確認する。
    const isSoulAllowed = () => cfg.soulMode === "on" || (cfg.soulMode === "dev" && isPlaytest());

    // ------------------------------------------------------------------ 固定アビリティの定義(ヘルメース) ----------------------------------------------------------------
    // 新しい技は作らない: 既存のカード効果(一閃・絶)・Ultimate・アイテムをスロットへ割り当てるだけ。Cooldownはここの値(カードの手札補充用の値ではない)。
    const LOADOUT = Object.freeze({
        attack:     Object.freeze({ slot: "attack",     key: "LMB",   code: null,        label: "薙ぎ払い", kind: "melee" }),
        gun:        Object.freeze({ slot: "gun",        key: "RMB",   code: null,        label: "銃",     kind: "gun" }),
        ultimate:   Object.freeze({ slot: "ultimate",   key: "Q",     code: "KeyQ",      keyCode: 81, label: "奥義", kind: "ultimate", cooldown: 0 }),
        mobility:   Object.freeze({ slot: "mobility",   key: "Shift", code: "ShiftLeft", keyCode: 16, label: "絶",   kind: "card", cardId: "hermes_zetsu", cooldown: num(params.MobilityCooldown, 3, 0) }),
        special:    Object.freeze({ slot: "special",    key: "E",     code: "KeyE",      keyCode: 69, label: "一閃", kind: "card", cardId: "hermes_issen", cooldown: num(params.SpecialCooldown, 7, 0) }),
        card1:      Object.freeze({ slot: "card1",      key: "X",     code: "KeyX",      keyCode: 88, label: "黄金の矢", kind: "card", cardId: String(params.Card1Id || "").trim() || "apollo_golden_volley", cooldown: 0 }),
        card2:      Object.freeze({ slot: "card2",      key: "C",     code: "KeyC",      keyCode: 67, label: "ギガース殺し", kind: "card", cardId: String(params.Card2Id || "").trim() || "apollo_gigas_slayer", cooldown: 0 }),
        reload:     Object.freeze({ slot: "reload",     key: "R",     code: "KeyR",      keyCode: 82, label: "リロード", kind: "reload", cooldown: 0 }),
        consumable: Object.freeze({ slot: "consumable", key: "V",     code: "KeyV",      keyCode: 86, label: "アイテム", kind: "item", cooldown: num(params.ConsumableCooldown, 8, 0) }),
        cancel:     Object.freeze({ slot: "cancel",     key: "",      code: null,        label: "キャンセル", kind: "cancel", cooldown: 0 })        // キーは無い(API: 保留中の入力の取り消しだけ)
    });
    const SLOT_BY_CODE = Object.freeze({ KeyQ: "ultimate", ShiftLeft: "mobility", ShiftRight: "mobility", KeyE: "special", KeyR: "reload", KeyX: "card1", KeyC: "card2", KeyV: "consumable" });
    const SLOT_BY_KEYCODE = Object.freeze({ 81: "ultimate", 16: "mobility", 69: "special", 82: "reload", 88: "card1", 67: "card2", 86: "consumable" });
    const CAST_SLOTS = ["special", "mobility", "ultimate", "consumable", "reload", "card1", "card2"];
    const FPS = 60;
    // ---- 指輪ロードアウト(Stage 1D-1): LMB / Shift / E / X / C の5枠に、承認済みの通常スキルを入れられる ----
    //   内部のスロット名(attack / mobility / special / card1 / card2)と物理キーは変えない。スキルIDは ProjectRRingLoadout.getSkill("lmb" | "shift" | "e" | "x" | "c") で決める(保存データは書かない)。
    //   スキルの働きは、割り当てたキーに依らない(同じスキルIDは、どのキーでも同じ発動・同じ Cooldown)。空の枠は何もしない(旧い固定スキルへは戻さない)。
    //   旧い固定スロットは、RingLoadout が無いとき / LoadoutSource=legacy / setLoadoutSource("legacy")(DEV。保存しない)のときだけ。
    const RING_SLOT = Object.freeze({ attack: "lmb", mobility: "shift", special: "e", card1: "x", card2: "c" });
    const NORMAL_SLOTS = Object.freeze(["attack", "mobility", "special", "card1", "card2"]);
    // cooldown: 秒(null = カードの定義の cooldownSeconds)。interval: 発射の最小の間隔(秒。Cooldown とは別。HUD の Cooldown 表示には出さない)。
    const SKILL_DEFS = Object.freeze({
        hermes_sweep:         Object.freeze({ label: "薙ぎ払い",   kind: "combo", cooldown: 0, interval: 0 }),
        hermes_zetsu:         Object.freeze({ label: "絶",         kind: "card",  cooldown: num(params.MobilityCooldown, 3, 0), interval: 0 }),
        hermes_issen:         Object.freeze({ label: "一閃",       kind: "card",  cooldown: num(params.SpecialCooldown, 7, 0), interval: 0 }),
        hermes_reed_flute:    Object.freeze({ label: "葦笛",       kind: "card",  cooldown: null, interval: 0 }),
        hermes_strength:      Object.freeze({ label: "ストレングス", kind: "card",  cooldown: null, interval: 0 }),
        apollo_golden_volley: Object.freeze({ label: "黄金の矢",   kind: "card",  cooldown: 0, interval: 0.5, hold: true }),
        apollo_eros_arrow:    Object.freeze({ label: "エロスの矢", kind: "card",  cooldown: null, interval: 0 }),
        apollo_lyre_rhythm:   Object.freeze({ label: "竪琴",       kind: "card",  cooldown: null, interval: 0 }),
        apollo_laurel_wreath: Object.freeze({ label: "月桂冠",     kind: "card",  cooldown: null, interval: 0 }),
        apollo_plague_rain:   Object.freeze({ label: "疫病の矢",   kind: "card",  cooldown: null, interval: 0 }),
        // Janus(Stage 2): 双門 = 基本攻撃の2段コンボ(Cooldown 0。薙ぎ払いと同じ combo の枠)/ 閉門・反照・表裏転化・境界断ち = カード(Cooldown はカタログの値: 10 / 9 / 12 / 7 秒)
        janus_dual_gate:      Object.freeze({ label: "双門",       kind: "combo", cooldown: 0, interval: 0 }),
        janus_closed_gate:    Object.freeze({ label: "閉門",       kind: "card",  cooldown: null, interval: 0 }),
        janus_reflection:     Object.freeze({ label: "反照",       kind: "card",  cooldown: null, interval: 0 }),
        janus_inversion:      Object.freeze({ label: "表裏転化",   kind: "card",  cooldown: null, interval: 0 }),
        janus_boundary_slash: Object.freeze({ label: "境界断ち",   kind: "card",  cooldown: null, interval: 0 }),
        // Themis(Stage 3): 罪科の刻印 = 基本攻撃の3段コンボ(Cooldown 0。薙ぎ払い・双門と同じ combo の枠)/ 戒律の宣告・審理の鎖・衡平の天秤・断罪の判決 = カード(Cooldown はカタログの値: 7 / 10 / 13 / 8 秒)
        themis_edict:         Object.freeze({ label: "戒律の宣告", kind: "card",  cooldown: null, interval: 0 }),
        themis_chain:         Object.freeze({ label: "審理の鎖",   kind: "card",  cooldown: null, interval: 0 }),
        themis_balance:       Object.freeze({ label: "衡平の天秤", kind: "card",  cooldown: null, interval: 0 }),
        themis_sin_mark:      Object.freeze({ label: "罪科の刻印", kind: "combo", cooldown: 0, interval: 0 }),
        themis_verdict:       Object.freeze({ label: "断罪の判決", kind: "card",  cooldown: null, interval: 0 })
    });
    // 黄金の矢 Lv3 の押す・離す・長押しビーム(Stage 1D-2A。どのキーでも同じ。ビームの働き本体は ProjectR_ApolloGoldenVolley の持続ビーム)
    //   離す < 0.25秒 = 通常の11本 / 0.25秒〜0.90秒未満で離す = 取り消し(発射もCooldownも無し)/ 0.90秒押し続けた瞬間 = ビーム自動開始(最大1.5秒。離す・中断で終わる)。
    //   ビーム専用のCooldown 6秒(ビームが終わってから。スキルIDごと)。その間は押している間 0.5秒ごとに通常の発射(Cooldownが明けても、離して押し直すまでビームにはならない)。
    //   移動速度: 溜めている間 100% / ビーム中 50%。溜め・ビームの中断: ほかのスキルの成功・回避・怯み・スタン(通常のHPダメージだけでは中断しない)。
    const BEAM_RULE = Object.freeze({ tapSeconds: 0.25, startSeconds: 0.9, cooldownSeconds: 6, chargeSpeedFactor: 1, beamSpeedFactor: 0.5 });
    const SWEEP_COMBO_SECONDS = 0.5;                                                // 薙ぎ払い(指輪ロードアウト)の3段コンボの受付時間(前の斬撃から)。旧い固定の左クリックは ComboTimeout(0.8秒)のまま
    // 左クリックの近接3段コンボ。段ごとの斬撃は ProjectRSwordSystem.swing の options で渡す(既存の斬撃・Hitbox・ダメージの式)。1・2段目は従来と同じ式、3段目だけ倍率を掛ける。
    const COMBO = Object.freeze({
        max: 3, timeout: Math.max(12, Math.round(num(params.ComboTimeout, 0.8, 0.2) * FPS)), finisher: Math.max(1, num(params.ComboFinisherDamage, 2, 1)),
        steps: Object.freeze([
            Object.freeze({ step: 1, style: "clockwise",        width: 1.5, depth: 1.2, forward: 1.0, lifetime: 3, cooldown: 18, pitch: 140, speed: 10, heavy: false }),
            Object.freeze({ step: 2, style: "counterclockwise", width: 1.7, depth: 1.3, forward: 1.0, lifetime: 3, cooldown: 18, pitch: 150, speed: 10, heavy: false }),
            Object.freeze({ step: 3, style: "fullcircle",       width: 2.4, depth: 1.9, forward: 1.1, lifetime: 5, cooldown: 30, pitch: 75,  speed: 12, heavy: true })
        ])
    });
    const ITEM_HOLD_FRAMES = Math.max(2, Math.round(num(params.ItemHoldSeconds, 0.3, 0.05) * FPS));      // C をこのフレーム数以上押し続けると放射メニュー
    const RADIAL_MAX = 12;
    const newCombo = () => ({ step: 0, lastAt: -1e9, finisherAt: -1e9, swings: 0, finishers: 0, resets: 0, rejected: 0, last: null });
    const newGunState = () => ({ shots: 0, rejected: 0, last: null });
    const newRadial = () => ({ open: false, items: [], index: -1, cx: 0, cy: 0, radius: 0, baseRadius: 0, deadzone: 0, openedAt: 0, opens: 0, commits: 0, cancels: 0, blocked: 0, lastCommit: null });

    const LEGACY_COOLDOWNS = Object.freeze({ special: 0, mobility: 0, ultimate: 0, consumable: 0, card1: 0, card2: 0 });
    const rt = {
        active: false, engaged: false, frame: 0, serial: 0,
        ultimate: null,      // 指輪モードの奥義(Q)の開始時の写し { selected, ringId }(Stage 1E-1。戦闘の間だけ。保存しない)
        mode: "legacy", loadout: { lmb: null, shift: null, e: null, x: null, c: null }, gates: {}, holds: {}, holdLog: [], lmb: { down: false, downAt: 0 }, beam: null, beamCd: {}, devSource: null,     // 指輪ロードアウト(Stage 1D-1): mode = "ring" | "legacy"(begin で決まる)/ loadout = 戦闘開始時の写し / gates = スキルIDごとの発射間隔の残り / holds = 押している枠
        cooldowns: { ...LEGACY_COOLDOWNS },
        pending: [], captured: new Set(), lastResult: null, log: [], diag: { keyDowns: 0, accepted: 0, passed: 0, rmb: 0, lastCode: null, lastDecision: null, lastReason: null },
        enemies: new Map(), flash: { slot: null, until: 0, ok: true }, generation: 0, lastPos: null, touchAssists: 0, soft: new Map(), softLast: null, softBlocked: 0,
        fx: [], combo: newCombo(), gun: newGunState(), item: { down: false, downAt: 0, selectedId: 0, taps: 0 }, radial: newRadial()
    };
    const note = entry => { rt.log.push({ frame: rt.frame, ...entry }); if (rt.log.length > 120) rt.log.shift(); };

    // ------------------------------------------------------------------ 固定戦闘(CardDeckCore は変更しない) ----------------------------------------------------------------
    // カード効果(一閃・絶)は「手札のカードを使う」前提(使ったあとの消費・ダメージの確定を requestUseCard の後処理で行う)。手札・山札を持たない「固定戦闘」を、
    //   CardDeckCore が公開している BattleDeckSession の prototype を広げて作る(CardDeckCore のファイルは変えない)。
    //   ・startCardBattle(FIXED_BATTLE): デッキの検証なしに始まる。この戦闘の「手札」は固定アビリティが置かれる場所になり、使っても消えない(消費・Cooldown山・ドローなし)。
    //   ・useFixedCard(cardId): 固定アビリティを手札に置き(最初だけ)、通常の requestUseCard の経路で1回使う。所持・指輪の確認は省く。通常の戦闘では使えない。
    const FIXED_BATTLE = Object.freeze({ fixedAbilityBattle: true });
    const fixedSessions = new WeakSet();
    let fixedSession = null, pendingFixed = null;
    const installFixedBattle = () => {
        const d = deck(), S = d && d.BattleDeckSession;
        if (!d || !S || !S.prototype || S.prototype.__projectRFixed) return;
        const _start = S.prototype.start, _use = S.prototype.use;
        S.prototype.start = function(cardIds) {
            if (cardIds !== FIXED_BATTLE) return _start.apply(this, arguments);
            fixedSessions.add(this); pendingFixed = this;
            const real = this.service, fixedService = Object.create(real);
            fixedService.cardInvalidReasons = () => [];                                         // 所持・指輪の確認を省く(固定アビリティは所持に依らない)
            Object.defineProperty(this, "service", { get: () => fixedService, set() { /* requestUseCard が毎回代入する値は無視する */ }, configurable: true });
            this.state = { drawPile: [], hand: [], discardPile: [], cooldownPile: [] };
            return { ok: true, reasons: [], state: this.snapshot() };
        };
        S.prototype.use = function(instanceId) {
            if (!fixedSessions.has(this)) return _use.apply(this, arguments);
            if (!this.state) return { ok: false, reason: "BATTLE_NOT_STARTED" };
            return this.state.hand.some(card => card.instanceId === instanceId) ? { ok: true, state: this.snapshot() } : { ok: false, reason: "CARD_NOT_IN_HAND" };
        };
        S.prototype.__projectRFixed = true;
        d.FIXED_BATTLE = FIXED_BATTLE;
        // 指輪ロードアウトのフィールド戦闘だけ、前の矢が飛んでいても(確定待ちでも)次の矢を撃てる(黄金の矢の「長押しで0.5秒ごとの連射」のため)。旧い固定スロット・カード戦闘は従来どおり(確定待ちの間は拒否)。
        d.concurrentVolleysAllowed = () => !!rt.active && rt.mode === "ring" && d.isCardBattleActive() && !!fixedSession;
        d.useFixedCard = cardId => {
            const id = String(cardId ?? "").trim();
            if (!d.isCardBattleActive() || !fixedSession || !fixedSessions.has(fixedSession) || !fixedSession.state) return { ok: false, reason: "battleInactive" };
            if (!d.definitions?.card?.(id)) return { ok: false, reason: "cardUnavailable" };
            const hand = fixedSession.state.hand, instanceId = "fixed-" + id;
            let index = hand.findIndex(card => card.instanceId === instanceId);
            if (index < 0) { if (hand.length >= d.HAND_SIZE) return { ok: false, reason: "handFull" }; hand.push({ instanceId, cardId: id }); index = hand.length - 1; }
            return d.requestUseCard(index);
        };
        // startBattle は、新しい戦闘を作った直後に endBattle(前の戦闘の片づけ)を呼ぶので、開始が終わってから固定セッションを覚える。
        const _startBattle = d.startBattle;
        d.startBattle = function(cardIds) {
            pendingFixed = null;
            const result = _startBattle.apply(this, arguments);
            fixedSession = cardIds === FIXED_BATTLE && result && result.ok ? pendingFixed : null; pendingFixed = null;
            return result;
        };
        const _endBattle = d.endBattle;
        d.endBattle = function() { fixedSession = null; return _endBattle.apply(this, arguments); };
    };
    installFixedBattle();

    // ------------------------------------------------------------------ 開始と終了 ----------------------------------------------------------------
    const sceneIsMap = () => typeof SceneManager !== "undefined" && typeof Scene_Map !== "undefined" && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset;
    const soulBusy = () => safe(() => root.ProjectRSoulBattle?.isActive?.() === true || (root.ProjectRSoulEncounter?.getState?.().state ?? "idle") !== "idle", false);
    // ---- 指輪ロードアウト(Stage 1D-1) ----
    const ringApi = () => { const r = root.ProjectRRingLoadout; return r && typeof r.getSkill === "function" && typeof r.isSkillUnlocked === "function" ? r : null; };
    // 使う方式。auto(既定)= RingLoadout があれば ring。legacy = 旧い固定スロット(RingLoadout が無いときも)。パラメータ LoadoutSource / DEV の setLoadoutSource で決める(保存しない)。
    const configuredSource = () => (rt.devSource !== null ? rt.devSource : (String(params.LoadoutSource || "auto").trim() === "legacy" ? "legacy" : "auto"));
    const loadoutMode = () => (configuredSource() === "legacy" || !ringApi() ? "legacy" : "ring");
    const ringMode = () => rt.mode === "ring";
    const isRingSlot = slot => ringMode() && Object.prototype.hasOwnProperty.call(RING_SLOT, slot);
    // 所持と装備の確認(戦闘中の発動のたびに行う): 指輪を持っていて、装備していて、承認済みの一覧の中。
    const skillAvailable = id => {
        const api = ringApi();
        if (!api || !SKILL_DEFS[id]) return false;
        return safe(() => api.isSkillUnlocked(id) === true && api.isRingEquipped(api.getSkillRing(id)) === true, false);
    };
    const snapshotLoadout = () => {
        const out = { lmb: null, shift: null, e: null, x: null, c: null }, api = ringApi();
        for (const slot of Object.keys(out)) { const id = safe(() => api.getSkill(slot), null); out[slot] = id && skillAvailable(id) ? id : null; }
        return out;
    };
    // ---- 奥義(Q)(Stage 1E-1): 指輪モードは RingLoadout の Q 枠の指輪だけを使う。CardDeckCore の保存された選択は読み替えも書き換えもしない ----
    //   使える条件 = 主人公が今持っている + 装備している + その神の奥義の処理(handler)が登録されている(いまはヘルメース・アポロン)。空・無効なら奥義なし(ヘルメースへの自動選択もしない)。
    //   戦闘開始の写し rt.ultimate = { selected: Q枠の指輪 | null, ringId: 使える指輪 | null }。GodSummonManager へは startCardBattle の第2引数 { ultimateRingId } で、その戦闘だけ渡す。
    const ultimateRingUsable = ringId => {
        const api = ringApi();
        if (!api || typeof ringId !== "string" || !ringId) return false;
        if (!safe(() => api.isRingEquipped(ringId) === true && api.isRingOwned(ringId) === true, false)) return false;
        const godId = safe(() => root.ProjectRGodSummonManager?.resolveGodId?.(ringId), null);
        return !!godId && safe(() => ultimate()?.hasUltimateHandler?.(godId) === true, false);
    };
    const snapshotUltimate = () => {
        const selected = safe(() => ringApi()?.getUltimate?.(), null) || null;
        return { selected, ringId: ultimateRingUsable(selected) ? selected : null };
    };
    // 発動のたびに、写しを現在の所持・装備・handler と照らし直す。null = 使える。
    const ultimateReason = () => {
        const u = rt.ultimate;
        if (!u || !u.selected) return "emptySlot";                                                   // Q が空: 何も起きない(記録・点滅・ゲージもなし)
        if (!u.ringId) return "ultimateUnavailable";                                                 // 開始時から未実装・未所持・未装備
        if (safe(() => ringApi()?.getUltimate?.(), null) !== u.ringId || !ultimateRingUsable(u.ringId)) return "ultimateUnavailable";     // 戦闘中に所持・装備・handler が変わった
        if (safe(() => root.ProjectRGodSummonManager?.getPersistentUltimateRingId?.(), null) !== u.ringId) return "ultimateUnavailable";    // 常駐の神がこの指輪で作れていない
        return null;
    };
    // HUD 用の Q の種類(新しい判定は作らず、ultimateReason の結果を写すだけ): null = 使える(従来の表示)/ "empty" = 未設定 / "unavailable" = 割り当て済みだが使用不可。
    //   使えない理由が出ても、RingLoadout の検証で割り当てがすでに外れていれば(getUltimate() が空)、「使用不可」ではなく「未設定」。
    const ultimateHudKind = () => {
        const why = ultimateReason();
        if (!why) return null;
        if (why === "emptySlot") return "empty";
        return safe(() => ringApi()?.getUltimate?.(), null) ? "unavailable" : "empty";
    };
    const skillIdOf = slot => (isRingSlot(slot) ? rt.loadout[RING_SLOT[slot]] || null : null);
    // スロットの定義。旧い固定スロットはそのまま、指輪ロードアウトの5枠は、いま入っているスキルの定義(空の枠は kind = "empty")。
    const slotDef = slot => {
        const base = LOADOUT[slot];
        if (!isRingSlot(slot)) return base;
        const id = skillIdOf(slot), sd = id ? SKILL_DEFS[id] : null;
        return { ...base, skillId: id, cardId: id, label: sd ? sd.label : "―", kind: sd ? sd.kind : "empty" };
    };
    const skillCooldownSeconds = id => { const sd = SKILL_DEFS[id]; if (!sd) return 0; if (sd.cooldown !== null) return sd.cooldown; return safe(() => Math.max(0, Number(deck().definitions.card(id).cooldownSeconds) || 0), 0); };
    const cdKey = slot => (isRingSlot(slot) ? skillIdOf(slot) : slot);                    // Cooldown の持ち主: 指輪ロードアウトの5枠はスキルID(物理キーではない)/ それ以外はスロット名
    const resetCooldowns = () => {
        rt.cooldowns = ringMode() ? { ultimate: 0, consumable: 0, ...Object.fromEntries(Object.keys(SKILL_DEFS).map(id => [id, 0])) } : { ...LEGACY_COOLDOWNS };
        rt.gates = {}; rt.holds = {}; rt.holdLog = []; rt.lmb = { down: false, downAt: 0 }; rt.beam = null; rt.beamCd = {};
    };
    // 戦闘ごとに、コンボ・銃・放射メニュー・C の押下を初期状態へ(選んでいるアイテム item.selectedId は、このセッションの間だけ残す。保存しない)
    const resetControls = () => { rt.fx = []; rt.combo = newCombo(); rt.gun = newGunState(); rt.radial = newRadial(); rt.item.down = false; rt.item.downAt = 0; rt.item.taps = 0; };

    const begin = (options = {}) => {
        const o = options && typeof options === "object" ? options : {};
        if (rt.active) return fail("alreadyActive");
        if (!o.encounter && !isCombatAllowed()) return fail("encounterRequired");               // 戦闘は戦闘マップのエンカウンター中だけ(DEVだけ例外)
        if (!deck() || !combatSession() || !presence()) return fail("systemUnavailable");
        if (!sceneIsMap() || typeof $gamePlayer === "undefined" || !$gamePlayer) return fail("mapUnavailable");
        if (soulBusy()) return fail("soulActive");
        if (deck().isCardBattleActive?.()) return fail("cardBattleActive");                 // Arena等が持つカード戦闘の最中には始めない
        if (typeof deck().FIXED_BATTLE === "undefined" || typeof deck().useFixedCard !== "function") return fail("fixedBattleUnavailable");
        const mode = loadoutMode();                                                         // 指輪ロードアウト(ring)か、旧い固定スロット(legacy)か。この戦闘の間は変わらない
        // 奥義(Q)の選択: legacy だけ従来どおり(ヘルメースを自動で選ぶ)。ring では CardDeckCore の保存された奥義の選択を書き換えない(一時的にも)。Q は RingLoadout の Q 枠の指輪(下の startCardBattle の第2引数)。
        if (o.grantHermes === true) safe(() => { root.ProjectRHermesProductionDeck?.acquireRing?.("hermes", { source: "fieldCombat" }); if (mode !== "ring") deck().setUltimateRing?.("hermes"); });
        // 固定キャラクター(ヘルメース)の奥義: Ultimate指輪がまだ選ばれておらず、ヘルメースの指輪を主人公が持っているときだけ、ヘルメースを選ぶ(すでに選ばれている指輪は変えない)。
        if (mode !== "ring") safe(() => { if (!deck().getUltimateRingId?.() && deck().hasPlayerRing?.("hermes")) deck().setUltimateRing("hermes"); });
        // 指輪モードだけ、Q 枠の指輪をこの戦闘だけ渡す(Core の選択は触らない。空・無効は null = 奥義なし)。legacy は従来どおり引数を足さない。
        const ultChoice = mode === "ring" ? snapshotUltimate() : null;
        const started = mode === "ring" ? deck().startCardBattle(deck().FIXED_BATTLE, { ultimateRingId: ultChoice.ringId }) : deck().startCardBattle(deck().FIXED_BATTLE);
        if (!started || started.ok !== true) return fail("fixedBattleFailed");
        const began = combatSession().begin(SOURCE, { cardBattle: false });
        if (!began.ok) { deck().endCardBattle(); return fail(began.reason || "combatSessionRejected"); }
        rt.active = true; rt.engaged = o.encounter === true; rt.pending = []; rt.generation++; rt.serial++;
        rt.ultimate = ultChoice;
        rt.mode = mode; rt.loadout = mode === "ring" ? snapshotLoadout() : { lmb: null, shift: null, e: null, x: null, c: null };        // 戦闘開始時の写し(戦闘中は変えない。発動のたびに所持・装備を確かめ直す)
        resetCooldowns(); rt.lastResult = null; resetControls(); clearHitFx("begin"); ensureHitListeners();
        note({ type: "begin", engaged: rt.engaged, mode });
        return { ok: true, engaged: rt.engaged, mode };
    };
    const end = (reason = "end") => {
        if (!rt.active) return false;
        rt.active = false; rt.engaged = false; rt.pending = []; rt.generation++; rt.ultimate = null;
        safe(() => cardInput()?.cancelPress?.(undefined, "fieldEnd"));
        safe(() => combatSession().end(SOURCE, reason));
        safe(() => { if (deck().isCardBattleActive?.()) deck().endCardBattle(); });
        for (const id of [...rt.enemies.keys()]) safe(() => enemyAttack()?.interrupt?.(id, "fieldEnd"));
        safe(() => strongApi()?.clear?.("fieldEnd"));                                  // 強敵の攻撃も、戦闘の終了(勝利・敗北・撤退・マップ移動)で取り消す(ダメージなし)
        rt.captured.clear(); clearSoft(); resetControls(); clearHitFx(reason); dropHolds("end"); rt.lmb = { down: false, downAt: 0 }; rt.beamCd = {};
        note({ type: "end", reason });
        return true;
    };
    // CombatSession.endAll(マップ移動・ロード)で、こちらも終わる。
    if (combatSession()?.onEnd) combatSession().onEnd(info => { if (info && info.sourceId === SOURCE && rt.active) end("sessionEnded"); });

    // ------------------------------------------------------------------ 入力(Q/E/R/C/Shift・右クリック。左クリックは共通イベント1の予約を受ける) ----------------------------------------------------------------
    const isEditing = element => !!element && (element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName || ""));
    const blockedReason = (event = {}) => {
        if (!rt.active) return "inactive";
        if (event.defaultPrevented) return "defaultPrevented";
        if (event.ctrlKey || event.altKey || event.metaKey) return "modifierKey";            // Shift は絶のキー(ダッシュは戦闘中は無効)なので、修飾キーとして扱わない
        if (event.isComposing) return "ime";
        if (typeof document !== "undefined" && (document.hasFocus?.() === false || isEditing(document.activeElement))) return "documentFocus";
        // 実際の入力受付可否は CardBattleInput と同じ判断(Scene・メッセージ・イベント・移動中・全画面会話・開いているウィンドウ)
        // CardBattleInput は shiftKey を「修飾キー」として断る(カード戦闘の Q/E/X/C/V は Shift 同時押しを受けない作り)。
        //   しかし Shift は絶のキーなので、実機で Shift を押すと keydown の shiftKey が true になり、絶(と、Shift を押したままの E/X/C/V/R/Q)が毎回
        //   「modifierKey」で断られていた(CDP の合成キーは修飾フラグを持たないので、以前のテストでは見えなかった)。Shift だけを外した写しで、残りの条件は同じ判断にする。
        const reason = cardInput()?.getBlockedReason?.({ defaultPrevented: false, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, isComposing: !!event.isComposing, target: event.target }) ?? null;
        return reason;
    };
    const isUltimateKey = event => { const b = safe(() => ultimate().getInputBinding(), null); return !!(b && event && (event.code ? event.code === b.code : event.keyCode === b.keyCode)); };
    // UltimateActivation の独自のキー入力(U。keydown の保留と、Scene_Map.update での発動)を、指輪モードの戦闘中は止める(プラグインの読み込み順や、戦闘の前に押された U にも効く)。legacy・SOUL・戦闘外は止めない。
    safe(() => ultimate()?.registerInputGate?.("fieldCombatRing", () => rt.active === true && ringMode()));
    const slotForEvent = event => event ? (event.code ? SLOT_BY_CODE[event.code] : SLOT_BY_KEYCODE[event.keyCode]) || null : null;
    if (typeof Input !== "undefined") {
        const _onKeyDown = Input._onKeyDown;
        Input._onKeyDown = function(event) {
            const slot = slotForEvent(event);
            if (rt.active && rt.radial.open && event && event.code === "Escape" && !event.repeat) rt.pending.push("radialCancel");      // Esc で放射メニューを閉じる(元のInputへも渡す)
            if (rt.active && ringMode() && !slot && isUltimateKey(event)) { event.preventDefault?.(); return; }          // 指輪モード: 奥義は Q だけ。U は受け付けない(UltimateActivation の独自の入力経路も、下の入力ゲートで止める)
            if (slot && rt.active) {
                rt.diag.keyDowns++; rt.diag.lastCode = event.code || String(event.keyCode);
                if (rt.captured.has(slot)) { event.preventDefault?.(); return; }
                const reason = blockedReason(event);
                if (reason === null) {
                    if (rt.radial.open && slot !== "consumable") {                           // 放射メニューを開いている間は、C 以外の戦闘のキーを受け付けない(元へも渡さない)
                        if (!event.repeat) { rt.captured.add(slot); rt.radial.blocked++; rt.diag.lastDecision = "menuOpen"; }
                        event.preventDefault?.();
                        return;
                    }
                    if (!event.repeat) { rt.captured.add(slot); rt.pending.push(slot === "consumable" ? "item:down" : slot); rt.diag.accepted++; rt.diag.lastDecision = "accepted"; rt.diag.lastReason = null; }
                    event.preventDefault?.();
                    return;
                }
                rt.diag.passed++; rt.diag.lastDecision = "passedThrough"; rt.diag.lastReason = reason;
            }
            return _onKeyDown.call(this, event);
        };
        const _onKeyUp = Input._onKeyUp;
        Input._onKeyUp = function(event) {
            const slot = slotForEvent(event);
            if (slot && rt.captured.delete(slot)) {
                if (slot === "consumable" && rt.active) rt.pending.push("item:up");
                else if (rt.active && isRingSlot(slot)) rt.pending.push("up:" + slot);                  // 指輪ロードアウト: 5枠すべてで、押す・離すを別々に受ける(ホールドの長さの記録)
                return;
            }
            return _onKeyUp.call(this, event);
        };
        const _clear = Input.clear;
        Input.clear = function() { rt.captured.clear(); rt.pending = []; interruptControls(); return _clear.apply(this, arguments); };
    }
    if (typeof root.addEventListener === "function") root.addEventListener("blur", () => { rt.captured.clear(); rt.pending = []; interruptControls(); });
    // 右クリック = 銃。ブラウザの右クリックメニューは出さない(戦闘中だけ)。1クリック=1発(押しっぱなしでは撃ち続けない)。
    if (typeof document !== "undefined" && document && typeof document.addEventListener === "function") {
        document.addEventListener("mousedown", event => {
            if (!rt.active || !event || event.button !== 2) return;
            event.preventDefault?.(); rt.diag.rmb++; rt.pending.push("gun");          // マウスのボタンは、押しっぱなしでは mousedown が繰り返されない(1クリック=1回)
        }, true);
        document.addEventListener("contextmenu", event => { if (rt.active && event) event.preventDefault?.(); }, true);
    }
    // 左クリック(とJ)= 共通イベント1の予約(Hendrix Button Config の「攻撃」。1クリックにつき1回)。戦闘中は、元の経路(銃・剣のどちらか)へ回さず、近接の3段コンボへ。
    if (typeof Game_Temp !== "undefined" && Game_Temp.prototype && typeof Game_Temp.prototype.reserveCommonEvent === "function") {
        const _reserve = Game_Temp.prototype.reserveCommonEvent;
        Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
            if (rt.active && Number(commonEventId) === safe(() => presence().settings.attackCommonEventId, 1)) { leftClick("attack"); return; }
            return _reserve.apply(this, arguments);
        };
    }
    // 戦闘中は Shift のダッシュを無効にする(Shift は絶)。右クリック(RMB)で、マップのメニューを開かない(RMB は銃)。戦闘外は従来のまま。
    if (typeof Game_Player !== "undefined" && Game_Player.prototype && typeof Game_Player.prototype.isDashButtonPressed === "function") {
        const _dash = Game_Player.prototype.isDashButtonPressed;
        Game_Player.prototype.isDashButtonPressed = function() { return rt.active ? false : _dash.apply(this, arguments); };
    }
    if (typeof Scene_Map !== "undefined" && Scene_Map.prototype && typeof Scene_Map.prototype.isMenuCalled === "function") {
        const _menuCalled = Scene_Map.prototype.isMenuCalled;
        Scene_Map.prototype.isMenuCalled = function() {
            if (rt.active && safe(() => TouchInput.isCancelled(), false)) return false;
            return _menuCalled.apply(this, arguments);
        };
    }

    // ------------------------------------------------------------------ アビリティの発動 ----------------------------------------------------------------
    const playerDead = () => safe(() => root.ProjectR?.PlayerDeath?.isDead?.() === true, false);
    // Cooldown の持ち主: 指輪ロードアウトの5枠はスキルID(どのキーに入れても同じ)/ それ以外(奥義・アイテム・旧い固定スロット)はスロット名。空の枠は持ち主なし。
    const cooldownOf = slot => { const key = cdKey(slot); return key ? rt.cooldowns[key] || 0 : 0; };
    // Cooldown(秒): 旧い固定スロット = 一閃・絶・アイテムはパラメータ、固定カード1・2(card1 / card2)はカードの定義の値(cooldownSeconds)/ 指輪ロードアウト = スキルごとの値(SKILL_DEFS)
    const cooldownSecondsOf = slot => {
        if (isRingSlot(slot)) { const id = skillIdOf(slot); return id ? skillCooldownSeconds(id) : 0; }
        const d = LOADOUT[slot]; if (d.cooldown > 0) return d.cooldown; if (slot === "card1" || slot === "card2") return safe(() => Math.max(0, Number(deck().definitions.card(d.cardId).cooldownSeconds) || 0), 0); return 0;
    };
    const startCooldown = slot => { const key = cdKey(slot); if (key) rt.cooldowns[key] = Math.max(0, cooldownSecondsOf(slot)); };
    const hasCooldown = slot => { const key = cdKey(slot); return !!key && key in rt.cooldowns; };
    const flash = (slot, ok) => { rt.flash = { slot, until: rt.frame + 14, ok }; };

    // ---- アイテム(C): 持っている消耗品の一覧・選択・使用 ----
    // 一覧に出すのは、通常アイテム(itypeId 1)・消耗する・いつでも使える(occasion 0)・対象が味方1人/全体/自分(scope 7/8/11)のもの。「-----」で始まる区切りは除く。数量は実際の持ち物から読む。
    const FIELD_ITEM_SCOPES = [7, 8, 11];
    const isFieldConsumable = item => !!item && item.itypeId === 1 && item.consumable === true && item.occasion === 0 && FIELD_ITEM_SCOPES.includes(item.scope) && !/^-{3,}/.test(String(item.name || ""));
    const leaderActor = () => (typeof $gameParty !== "undefined" && typeof $dataItems !== "undefined" ? safe(() => $gameParty.leader(), null) : null);
    const itemView = item => { const actor = leaderActor(); return { id: item.id, name: String(item.name || ""), iconIndex: Number(item.iconIndex) || 0, count: safe(() => $gameParty.numItems(item), 0), usable: !!actor && safe(() => actor.canUse(item), false) === true }; };
    const listConsumables = () => {
        if (!leaderActor()) return [];
        return safe(() => $gameParty.items(), []).filter(item => isFieldConsumable(item) && safe(() => $gameParty.numItems(item), 0) > 0).slice(0, RADIAL_MAX).map(itemView);
    };
    // 選んでいるアイテム: 放射メニューで選んだもの(持っている数が0になっても、選び直すまでそのまま。0なら使えない表示)→ なければ ConsumableItemId → なければ持っているHP回復薬 → 最初の消耗品。
    const selectedConsumable = () => {
        if (!leaderActor()) return null;
        const chosen = rt.item.selectedId > 0 ? $dataItems[rt.item.selectedId] : null;
        if (isFieldConsumable(chosen)) return chosen;
        if (cfg.consumableItemId > 0) { const item = $dataItems[cfg.consumableItemId]; if (isFieldConsumable(item) && safe(() => $gameParty.hasItem(item), false)) return item; }
        const list = safe(() => $gameParty.items(), []).filter(item => isFieldConsumable(item) && safe(() => $gameParty.numItems(item), 0) > 0);
        return list.find(item => Array.isArray(item.effects) && item.effects.some(e => e.code === 11)) || list[0] || null;
    };
    const selectConsumable = itemId => {
        const id = Math.round(Number(itemId));
        if (!(id > 0) || typeof $dataItems === "undefined" || !isFieldConsumable($dataItems[id])) return fail("notFieldItem", { itemId: id || 0 });
        rt.item.selectedId = id;
        return { ok: true, itemId: id };
    };
    const useConsumable = () => {
        const actor = leaderActor();
        if (!actor) return fail("noActor");
        const item = selectedConsumable();
        if (!item) return fail("noItem");
        if (!$gameParty.hasItem(item)) return fail("noItem", { itemId: item.id });             // 持っている数が0
        if (!actor.canUse(item)) return fail("cannotUse", { itemId: item.id });
        const action = new Game_Action(actor);
        action.setItemObject(item);
        if (!action.testApply(actor)) return fail("noEffect", { itemId: item.id });                 // HPが満タンなどで効果がない: 消費しない
        const before = actor.hp;
        actor.useItem(item);
        action.apply(actor);
        actor.refresh?.();
        return { ok: true, itemId: item.id, healed: actor.hp - before };
    };

    // ---- 放射メニュー(C 長押し): マウスを動かした方向のアイテムを選ぶ。C を離すと、そのアイテムを「選んだ状態」にする(使わない) ----
    const gfx = () => ({ w: safe(() => Graphics.width, 0) || 1920, h: safe(() => Graphics.height, 0) || 1080 });
    const mousePoint = () => { const g = gfx(), x = safe(() => TouchInput.x, NaN), y = safe(() => TouchInput.y, NaN); return { x: Number.isFinite(x) ? x : g.w / 2, y: Number.isFinite(y) ? y : g.h / 2 }; };
    const radialBaseRadius = n => Math.max(110, Math.min(170, Math.round(n * 42 / Math.PI)));        // HUD(1920x1080基準)の輪の半径
    const radialIndexAt = (r, point) => {
        const n = r.items.length, dx = point.x - r.cx, dy = point.y - r.cy;
        if (n === 0 || Math.hypot(dx, dy) < r.deadzone) return -1;                                  // 中央(動かさない)= 選ばない
        const turn = ((Math.atan2(dy, dx) + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);   // 真上から時計回り
        return Math.round(turn / (2 * Math.PI / n)) % n;
    };
    const openRadial = () => {
        if (!rt.active || rt.radial.open) return false;
        const g = gfx(), s = g.h / 1080, items = listConsumables(), m = mousePoint(), baseRadius = radialBaseRadius(items.length), radius = baseRadius * s, margin = radius + 70 * s;
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(Math.max(lo, hi), v));
        rt.radial = { ...newRadial(), opens: rt.radial.opens + 1, commits: rt.radial.commits, cancels: rt.radial.cancels, blocked: rt.radial.blocked, lastCommit: rt.radial.lastCommit,
            open: true, items, index: -1, radius, baseRadius, deadzone: 46 * s, openedAt: rt.frame, cx: clamp(m.x, margin, g.w - margin), cy: clamp(m.y, margin, g.h - margin) };
        note({ type: "radialOpen", items: items.length });
        return true;
    };
    const closeRadial = (commit) => {
        const r = rt.radial;
        if (!r.open) return null;
        let result = { committed: false, itemId: 0 };
        const picked = commit && r.index >= 0 ? r.items[r.index] : null;
        if (picked) { rt.item.selectedId = picked.id; r.commits++; result = { committed: true, itemId: picked.id }; r.lastCommit = { itemId: picked.id, frame: rt.frame }; }
        else r.cancels++;
        r.open = false; r.items = []; r.index = -1;
        rt.item.down = false;                                                                      // 閉じたあとも C を押し続けていても、開き直さない(離すまで何もしない)
        note({ type: "radialClose", committed: result.committed, itemId: result.itemId });
        return result;
    };
    const updateRadial = () => {
        const r = rt.radial;
        if (!r.open) return;
        if ((rt.frame - r.openedAt) % 6 === 0) {                                                    // 開いている間に持ち物が変わったら、一覧を更新する
            r.items = listConsumables();
            const s = gfx().h / 1080; r.baseRadius = radialBaseRadius(r.items.length); r.radius = r.baseRadius * s;
        }
        r.index = radialIndexAt(r, mousePoint());
    };
    const interruptControls = () => { rt.item.down = false; dropHolds("interrupt"); rt.lmb = { down: false, downAt: 0 }; if (rt.radial.open) closeRadial(false); };        // 押している途中の入力(ホールド・左クリック)は、何も発動せずに取り消す
    const itemRelease = () => {
        if (!rt.item.down) return null;
        const held = rt.frame - rt.item.downAt;
        rt.item.down = false;
        if (rt.radial.open) return closeRadial(true);
        if (held >= ITEM_HOLD_FRAMES) return null;                                                  // 長押しになったのにメニューが開く前に離した(まれ)。何も使わない
        rt.item.taps++;
        return useAbility("consumable", "tap");
    };
    // 毎フレーム: C を押し続けた長さを見て、放射メニューを開く。開いている間は、マウスの方向から選ぶアイテムを更新する。
    const controlsTick = () => {
        while (rt.fx.length && rt.fx[0].at <= rt.frame) { const fx = rt.fx.shift(); safe(() => root.ProjectRPresentationVfx.play(sweepVfx(), { degree: fx.degree })); }
        if (rt.item.down && !rt.radial.open && rt.frame - rt.item.downAt >= ITEM_HOLD_FRAMES) openRadial();
        updateRadial();
        holdTick();
    };
    const processRequest = req => {
        if (typeof req === "string" && req.startsWith("up:")) { releaseSlot(req.slice(3), "keyboard"); return; }          // 指輪ロードアウト: 5枠のキーを離した
        if (req === "item:down") { if (!rt.radial.open) { rt.item.down = true; rt.item.downAt = rt.frame - 1; } return; }          // 押したのは、このフレームの1つ前の更新のあと(長押しの長さを、押してからのフレーム数にそろえる)
        if (req === "item:up") { itemRelease(); return; }
        if (req === "gun") { if (rt.radial.open) { closeRadial(false); return; } fireGun("rmb"); return; }          // 放射メニュー中の右クリックは、撃たずにメニューを閉じる
        if (req === "radialCancel") { closeRadial(false); return; }
        if (rt.radial.open) { rt.radial.blocked++; return; }
        pressSlot(req, "keyboard");
    };
    const getRadialState = () => {
        const r = rt.radial, sel = safe(() => selectedConsumable(), null);
        return { open: r.open, items: r.items.map(i => ({ ...i })), index: r.index, hoverId: r.items[r.index]?.id ?? 0, selectedId: sel ? sel.id : 0,
            center: { x: r.cx, y: r.cy }, radius: r.radius, baseRadius: r.baseRadius, deadzone: r.deadzone, opens: r.opens, commits: r.commits, cancels: r.cancels, blocked: r.blocked, lastCommit: r.lastCommit && { ...r.lastCommit } };
    };

    // ---- 近接3段コンボ(左クリック)と銃(右クリック)。斬撃・弾は既存の ProjectRSwordSystem.swing / ProjectRGunSystem.fire ----
    const comboTimeout = () => (ringMode() ? Math.max(12, Math.round(SWEEP_COMBO_SECONDS * FPS)) : COMBO.timeout);          // 指輪ロードアウトの薙ぎ払い = 0.5秒 / 旧い固定の左クリック = ComboTimeout
    // Janus 双門(Stage 2)は2段コンボ。受付は「攻撃の硬直が終わってから」なので、斬撃のとき c.timeout = 硬直 + 受付(フレーム)を持つ。薙ぎ払い・旧い固定の左クリックは c.timeout が無く、従来の comboTimeout()。
    const JANUS_DUAL = "janus_dual_gate";
    // Themis 罪科の刻印(Stage 3)は3段コンボ(薙ぎ払いと同じ段数)。受付は Janus と同じく「攻撃の硬直が終わってから」。
    const THEMIS_MARK = "themis_sin_mark";
    const comboSkill = () => rt.combo.skill || (ringMode() && skillIdOf("attack") === JANUS_DUAL ? JANUS_DUAL : ringMode() && skillIdOf("attack") === THEMIS_MARK ? THEMIS_MARK : "hermes_sweep");
    const comboMax = () => (comboSkill() === JANUS_DUAL ? 2 : COMBO.max);
    const comboWindow = () => rt.combo.timeout || comboTimeout();
    const comboStep = () => {
        const c = rt.combo;
        if (c.step > 0 && rt.frame - c.lastAt > comboWindow()) { c.step = 0; c.resets++; }          // 受付時間を過ぎたら1段目へ戻る
        return c.step;
    };
    const getComboState = () => {
        const step = comboStep(), c = rt.combo;
        return { step, next: step + 1, max: comboMax(), timeout: comboWindow(), timeLeft: step > 0 ? Math.max(0, 1 - (rt.frame - c.lastAt) / comboWindow()) : 0,
            swings: c.swings, finishers: c.finishers, resets: c.resets, rejected: c.rejected, finisherFlash: rt.frame - c.finisherAt < 24, last: c.last && { ...c.last } };
    };
    const combatInputReason = () => {
        if (!rt.active) return "inactive";
        if (playerDead()) return "playerDead";
        if (rt.radial.open) return "menuOpen";
        return null;
    };
    // 当たり判定 = 見た目の薙ぎ払い(白い杖の残像)と同じ扇形。形(半径・弧)は元の薙ぎ払いカードと同じ数値(ProjectR_CardBalance の hermes_sweep: radiusTiles / arcDegrees)、
    //   振る時間は残像の素材と同じ(8コマ・24fps のうち、杖が -95° → +95° へ動く6区間 = 15更新)。残像の素材は全段とも時計回りなので、判定も全段で時計回りに振る。
    //   3段目(強撃)は、残像が2回(反対側へ、6更新あとにもう1回)出るので、判定も同じ2回の扇(ぜんぶで一回転)。1つの斬撃で、同じ敵には1回だけ当たる。
    //   絵(VFX)は、斬撃の更新の次の更新から出る(実機の記録)ので、判定も1更新遅らせて、見えている杖の先に重ねる(SWEEP_START_DELAY)。
    const SWEEP_FRAMES = 15, HEAVY_SECOND_DELAY = 6, SWEEP_START_DELAY = 1;
    // 見た目の中心も、判定の中心(プレイヤーのマスの中心)へ合わせる。元の hermes_sweep.staff は offsetY -24 だが、Hendrix の位置オフセットはプレイヤーの絵の拡縮で2倍に効く(実機: 中心の高さ = 基準414 + 2 x offsetY)ため、
    //   このままだと残像の中心が約1.5マス上(頭の上)になり、判定の扇とずれる。FieldCombat 用に、同じ素材・同じ設定で offsetY だけ 12(= マスの中心)にした別名を登録して使う(元の hermes_sweep.staff は変えない)。
    const SWEEP_VFX_KEY = "fieldcombat_sweep.staff", SWEEP_VFX_OFFSET_Y = 12;
    let sweepVfxKey = null;
    const sweepVfx = () => {
        if (sweepVfxKey) return sweepVfxKey;
        const vfx = root.ProjectRPresentationVfx;
        const base = safe(() => vfx.mapping("hermes_sweep.staff"), null);
        sweepVfxKey = base && typeof vfx.register === "function" && safe(() => { vfx.register(SWEEP_VFX_KEY, { ...base, offsetY: SWEEP_VFX_OFFSET_Y }); return true; }, false) ? SWEEP_VFX_KEY : "hermes_sweep.staff";
        return sweepVfxKey;
    };
    const sweepSector = def => {
        const arc = safe(() => Number(root.ProjectRCardBalance.constant("hermes_sweep", "arcDegrees")), NaN), radius = safe(() => Number(root.ProjectRCardBalance.constant("hermes_sweep", "radiusTiles")), NaN);
        return { radius: radius > 0 ? radius : 4, arc: arc > 0 ? arc : 190, frames: SWEEP_FRAMES, passes: def.heavy ? [{ offset: 0, delay: SWEEP_START_DELAY }, { offset: 180, delay: SWEEP_START_DELAY + HEAVY_SECOND_DELAY }] : [{ offset: 0, delay: SWEEP_START_DELAY }] };
    };
    // 薙ぎ払いのVFX(ProjectR_HermesSweep と同じ: VFX hermes_sweep.staff + ケーリュケイオンの Swing Weapon + SE)。見た目だけで、判定・ダメージは SwordSystem の Hitbox。
    const sweepPresentation = (degree, heavy) => {
        safe(() => root.ProjectRPresentationVfx.play(sweepVfx(), { degree }));
        safe(() => root.ProjectRGodSummonVisual.swingWeapon("hermes", degree, "ProjectR_Caduceus_DEV"));
        safe(() => AudioManager.playSe({ name: "Slash2", volume: 85, pitch: heavy ? 70 : 100, pan: 0 }));
        if (heavy) rt.fx.push({ at: rt.frame + HEAVY_SECOND_DELAY, degree: ((degree + 180) % 360 + 360) % 360 });        // 強撃は、反対側へもう1回(一回転)
    };
    const hasSweepVfx = () => !!safe(() => root.ProjectRPresentationVfx && typeof root.ProjectRPresentationVfx.play === "function", false);
    // 近接3段コンボの1段(SwordSystem の斬撃)。旧い固定の左クリックも、指輪ロードアウトの薙ぎ払い(hermes_sweep)も、同じこの経路(どのキーでも同じ。単発のカード版は使わない)。
    const sweepClick = (source = "api") => {
        let result = null;
        const reason = combatInputReason();
        const sword = root.ProjectRSwordSystem;
        if (reason) result = fail(reason);
        else if (!sword || typeof sword.swing !== "function") result = fail("swordUnavailable");
        else {
            if (rt.combo.skill !== "hermes_sweep") { rt.combo.skill = "hermes_sweep"; rt.combo.step = 0; rt.combo.timeout = null; }          // 別のコンボ(双門)から切り替わったら、1段目から
            const next = comboStep() + 1, def = COMBO.steps[next - 1], meleeSource = getMeleeDamageSource();
            const swung = sword.swing("field", { anyWeapon: true, step: next, width: def.width, depth: def.depth, forward: def.forward, lifetime: def.lifetime, cooldown: def.cooldown,
                damageScale: def.heavy ? COMBO.finisher : 1, style: def.style, pitch: def.pitch, speed: def.speed, visual: !hasSweepVfx(),
                ...(meleeSource.weaponId !== null ? { damageWeapon: meleeSource.weaponId } : {}),          // Stage 6C: 銃を持っている間は、近接の武器の攻撃力で計算する(近接の武器を装備していれば何も足さない)
                ...(hasSweepVfx() ? { sector: sweepSector(def) } : {}) });          // VFX がある(通常)ときは、見た目と同じ扇形の判定。無いときだけ従来の長方形のHitbox
            if (swung && swung.ok) {
                const c = rt.combo;
                c.swings++; c.lastAt = rt.frame;
                if (hasSweepVfx()) sweepPresentation(Number.isFinite(swung.degree) ? swung.degree : 0, !!def.heavy);
                if (next >= COMBO.max) { c.step = 0; c.finishers++; c.finisherAt = rt.frame; }         // 3段目(強撃)のあとは、1段目へ戻る
                else c.step = next;
                result = { ok: true, step: next, heavy: def.heavy, scale: def.heavy ? COMBO.finisher : 1, degree: swung.degree, serial: swung.serial };
            } else { rt.combo.rejected++; result = fail(swung?.reason || "swingFailed", { step: next }); }       // 間隔の内(cooldown)などで出なかったクリックは、段を進めない
        }
        result.source = source; result.frame = rt.frame;
        rt.combo.last = { ...result };
        note({ type: "attack", ok: result.ok === true, step: result.step || 0, reason: result.reason || null });
        return result;
    };
    // ---- Janus 双門(Stage 2): 基本攻撃の2段コンボ。斬撃・ダメージは既存の ProjectRSwordSystem.swing(扇形の判定 sector・長方形のHitbox・1振り1ヒット・武器の攻撃力 × damageScale)。 ----
    //   1段目: 前方 110° の扇・1.8 マス・基礎物理ダメージの 100 / 108 / 115 %(Lv1 / 2 / 3)。2段目: 前方の貫通する直線(3.0 マス × 幅 0.9)・125 / 135 / 150 %。
    //   2段目の入力でも、いまのマウスの方向へ向け直す(swing が毎回マウスの向きを読む)。Cooldown 0。継続の受付 = 攻撃の硬直(斬撃の最小の間隔)が終わってから 0.5 秒。
    //   数値は ProjectR_CardBalance の janus_dual_gate(Lv は所持データの cardOwnership の level)。硬直(フレーム)と扇の振る時間は、薙ぎ払いの近接に合わせた実装の値(仕様の指定なし)。
    const DUAL_RECOVERY = Object.freeze([18, 24]), DUAL_SWEEP_FRAMES = 9;
    const cardLevelOf = id => safe(() => { const maxLevel = deck().definitions.card(id)?.maxLevel || 3, lv = Number.parseInt(deck().getPersistentData().cardOwnership?.[id]?.level, 10); return Math.min(maxLevel, Math.max(1, Number.isFinite(lv) ? lv : 1)); }, 1);
    const dualGateSpec = () => {
        const bal = root.ProjectRCardBalance, lv = cardLevelOf(JANUS_DUAL);
        const eff = safe(() => bal.effects(JANUS_DUAL, lv), null) || {}, k = key => safe(() => Number(bal.constant(JANUS_DUAL, key)), NaN), pick = (v, f) => (Number.isFinite(v) && v > 0 ? v : f);
        return { level: lv, scale1: pick(Number(eff.damageScale), 1), scale2: pick(Number(eff.secondDamageScale), 1.25), arc: pick(k("arcDegrees"), 110), radius: pick(k("radiusTiles"), 1.8),
            length: pick(k("rangeTiles"), 3), width: pick(k("pathWidthTiles"), 0.9), windowFrames: Math.max(1, Math.round(pick(k("comboWindowSeconds"), 0.5) * FPS)) };
    };
    const dualGateClick = (source = "api") => {
        let result = null;
        const reason = combatInputReason(), sword = root.ProjectRSwordSystem;
        if (reason) result = fail(reason);
        else if (!sword || typeof sword.swing !== "function") result = fail("swordUnavailable");
        else {
            const c = rt.combo;
            if (c.skill !== JANUS_DUAL) { c.skill = JANUS_DUAL; c.step = 0; c.timeout = null; }          // 別のコンボ(薙ぎ払い)から切り替わったら、1段目から
            const next = comboStep() + 1, spec = dualGateSpec(), meleeSource = getMeleeDamageSource(), recovery = DUAL_RECOVERY[next - 1];
            const common = { anyWeapon: true, step: next, cooldown: recovery, ...(meleeSource.weaponId !== null ? { damageWeapon: meleeSource.weaponId } : {}) };
            const swung = sword.swing("field", next === 1
                ? { ...common, damageScale: spec.scale1, style: "clockwise", sector: { radius: spec.radius, arc: spec.arc, frames: DUAL_SWEEP_FRAMES, passes: [{ offset: 0, delay: 0 }] } }
                : { ...common, damageScale: spec.scale2, style: "thrust", width: spec.width, depth: spec.length, forward: spec.length / 2, lifetime: 3 });
            if (swung && swung.ok) {
                c.swings++; c.lastAt = rt.frame; c.timeout = recovery + spec.windowFrames;
                if (next >= 2) { c.step = 0; c.finishers++; c.finisherAt = rt.frame; } else c.step = next;
                result = { ok: true, step: next, heavy: next >= 2, scale: next === 1 ? spec.scale1 : spec.scale2, level: spec.level, degree: swung.degree, serial: swung.serial };
            } else { c.rejected++; result = fail(swung?.reason || "swingFailed", { step: next }); }
        }
        result.source = source; result.frame = rt.frame;
        rt.combo.last = { ...result };
        note({ type: "attack", ok: result.ok === true, step: result.step || 0, reason: result.reason || null, skillId: JANUS_DUAL });
        return result;
    };
    // ---- Themis 罪科の刻印(Stage 3): 基本攻撃の3段コンボ。斬撃・ダメージは既存の ProjectRSwordSystem.swing(扇形の判定 sector・長方形のHitbox・1振り1ヒット・武器の攻撃力 × damageScale)。 ----
    //   1段目: 前方 110° の扇・1.8 マス・基礎物理ダメージの 90 / 100 / 110 %(Lv1 / 2 / 3)。2段目: 同じ扇(振る向きは同じ)・100 / 110 / 125 %。3段目: 前方の貫通する直線(3.0 マス × 幅 0.9)・115 / 130 / 145 %。
    //   3段目に当たった敵ごとに、罪状 1(ProjectR_ThemisSkills が、この斬撃の serial を見張って付ける。ダメージが出た敵だけ)。各段の入力でマウスの向きへ向け直す。
    //   Cooldown 0。継続の受付 = 攻撃の硬直(斬撃の最小の間隔)が終わってから 0.5 秒。数値は ProjectR_CardBalance の themis_sin_mark。形(扇・直線)と硬直(フレーム)は、双門・薙ぎ払いに合わせた実装の値(仕様の指定なし)。
    const MARK_RECOVERY = Object.freeze([16, 18, 26]), MARK_SWEEP_FRAMES = 9;
    const sinMarkSpec = () => {
        const bal = root.ProjectRCardBalance, lv = cardLevelOf(THEMIS_MARK);
        const eff = safe(() => bal.effects(THEMIS_MARK, lv), null) || {}, k = key => safe(() => Number(bal.constant(THEMIS_MARK, key)), NaN), pick = (v, f) => (Number.isFinite(v) && v > 0 ? v : f);
        return { level: lv, scale: [pick(Number(eff.damageScale), 0.9), pick(Number(eff.secondDamageScale), 1), pick(Number(eff.thirdDamageScale), 1.15)], arc: pick(k("arcDegrees"), 110), radius: pick(k("radiusTiles"), 1.8),
            length: pick(k("rangeTiles"), 3), width: pick(k("pathWidthTiles"), 0.9), windowFrames: Math.max(1, Math.round(pick(k("comboWindowSeconds"), 0.5) * FPS)) };
    };
    const sinMarkClick = (source = "api") => {
        let result = null;
        const reason = combatInputReason(), sword = root.ProjectRSwordSystem;
        if (reason) result = fail(reason);
        else if (!sword || typeof sword.swing !== "function") result = fail("swordUnavailable");
        else {
            const c = rt.combo;
            if (c.skill !== THEMIS_MARK) { c.skill = THEMIS_MARK; c.step = 0; c.timeout = null; }          // 別のコンボ(薙ぎ払い・双門)から切り替わったら、1段目から
            const next = comboStep() + 1, spec = sinMarkSpec(), meleeSource = getMeleeDamageSource(), recovery = MARK_RECOVERY[next - 1];
            const common = { anyWeapon: true, step: next, cooldown: recovery, damageScale: spec.scale[next - 1], ...(meleeSource.weaponId !== null ? { damageWeapon: meleeSource.weaponId } : {}) };
            const sector = { radius: spec.radius, arc: spec.arc, frames: MARK_SWEEP_FRAMES, passes: [{ offset: 0, delay: 0 }] };
            const swung = sword.swing("field", next === 1 ? { ...common, style: "clockwise", sector } : next === 2 ? { ...common, style: "counterclockwise", sector }
                : { ...common, style: "thrust", width: spec.width, depth: spec.length, forward: spec.length / 2, lifetime: 3 });
            if (swung && swung.ok) {
                c.swings++; c.lastAt = rt.frame; c.timeout = recovery + spec.windowFrames;
                if (next >= 3) { safe(() => root.ProjectRThemisSkills?.watchSwing?.(swung.serial)); c.step = 0; c.finishers++; c.finisherAt = rt.frame; } else c.step = next;          // 3段目: 当たった敵ごとに罪状 1(見張りは ThemisSkills)
                result = { ok: true, step: next, heavy: next >= 3, scale: spec.scale[next - 1], level: spec.level, degree: swung.degree, serial: swung.serial };
            } else { c.rejected++; result = fail(swung?.reason || "swingFailed", { step: next }); }
        }
        result.source = source; result.frame = rt.frame;
        rt.combo.last = { ...result };
        note({ type: "attack", ok: result.ok === true, step: result.step || 0, reason: result.reason || null, skillId: THEMIS_MARK });
        return result;
    };
    const fireGun = (source = "api") => {
        let result = null;
        const reason = combatInputReason();
        const gun = root.ProjectRGunSystem;
        if (reason) result = fail(reason);
        else if (!gun || typeof gun.fire !== "function") result = fail("gunUnavailable");
        else { const shot = gun.fire("field"); result = shot && shot.ok ? { ok: true, eventId: shot.eventId, degree: shot.degree } : fail(shot?.reason || "fireFailed"); }
        if (result.ok) rt.gun.shots++; else rt.gun.rejected++;
        result.source = source; result.frame = rt.frame;
        rt.gun.last = { ...result };
        note({ type: "gun", ok: result.ok === true, reason: result.reason || null });
        return result;
    };
    const cancel = () => {
        let cancelled = 0;
        if (rt.pending.length) { cancelled += rt.pending.length; rt.pending = []; }
        if (rt.radial.open) { closeRadial(false); cancelled++; }
        rt.item.down = false;
        if (safe(() => cardInput()?.cancelPress?.(undefined, "fieldCancel"), false)) cancelled++;
        safe(() => $gameTemp?.clearDestination?.());
        note({ type: "cancel", cancelled });
        return { ok: true, slot: "cancel", cancelled };
    };

    const sleepSweep = () => { const api = enemyAttack(); if (!api) return; for (const [id, b] of rt.enemies) { const e = map()?.event(id); if (e && enemyAlive(e) && enemyAsleep(e)) suppressSleeper(id, b, api); } };
    const castReason = slot => {
        if (!rt.active) return "inactive";
        if (playerDead()) return "playerDead";
        if (!CAST_SLOTS.includes(slot) && !(isRingSlot(slot))) return "invalidSlot";
        if (rt.radial.open) return "menuOpen";                                                       // 放射メニューを開いている間は、ほかの戦闘の入力は受け付けない
        if (isRingSlot(slot)) {
            const id = skillIdOf(slot);
            if (!id) return "emptySlot";                                                             // 空の枠は何もしない(旧い固定スキルへは戻さない)
            if (!skillAvailable(id)) return "skillUnavailable";                                      // 戦闘中に所持・装備が変わっていたら発動しない
            if (cooldownOf(slot) > 0) return "cooldown";
            if ((rt.gates[id] || 0) > 0) return "interval";                                          // 発射の最小の間隔(黄金の矢 0.5秒)
            return null;
        }
        if (slot === "ultimate" && ringMode()) return ultimateReason();                              // 指輪モード: Q 枠の指輪(開始時の写し)を、所持・装備・handler で確かめ直す(ゲージが満タンかは UltimateActivation が見る)
        if (cooldownOf(slot) > 0) return "cooldown";
        return null;
    };
    const useAbility = (slot, source = "api") => {
        if (slot === "cancel") { const r = cancel(); rt.lastResult = { ...r, source }; return r; }
        const reason = castReason(slot);
        if (reason === "emptySlot") return fail("emptySlot", { slot, source, frame: rt.frame });      // 何も起きない(記録・点滅・Cooldownもなし)
        let result;
        if (reason) result = fail(reason, { slot, cooldown: cooldownOf(slot), ...(isRingSlot(slot) ? { skillId: skillIdOf(slot) } : {}) });
        else {
            const def = slotDef(slot);
            try {
                if (isRingSlot(slot) && def.kind === "combo") {
                    const swung = def.skillId === JANUS_DUAL ? dualGateClick(source) : def.skillId === THEMIS_MARK ? sinMarkClick(source) : sweepClick(source);      // 薙ぎ払い: どのキーでも同じ3段コンボ / 双門(Janus): 同じく2段コンボ / 罪科の刻印(Themis): 3段コンボ
                    result = { ...swung, slot, skillId: def.skillId };
                } else if (def.kind === "card") {
                    const used = deck().useFixedCard(def.cardId);
                    // 絶は「予約 → 予備動作 → 確定」なので、予約できた時点(pending)を成功とみなす。確定できなかった場合は getLastResult で分かる。
                    result = used && (used.ok === true || used.pending === true) ? { ok: true, slot, cardId: def.cardId, pending: used.pending === true } : fail("abilityFailed", { slot, detail: used?.detail || used?.reason || null });
                    if (isRingSlot(slot)) result.skillId = def.skillId;
                } else if (def.kind === "ultimate") {
                    const used = ultimate()?.requestUltimateActivation?.("field");
                    result = used && used.ok === true ? { ok: true, slot, godId: used.godId ?? null } : fail(used?.reason || "ultimateUnavailable", { slot, detail: used?.handlerReason || null });
                } else if (def.kind === "reload") {
                    // リロードは既存の銃の仕組み(弾薬・リロード時間・満タン/ストック無し/銃なしの扱い)のまま。Cooldownはこちらで持たない。
                    const used = root.ProjectRGunSystem?.requestReload?.("field");
                    result = used && used.ok === true ? { ok: true, slot, frames: used.frames } : fail(used?.reason || "gunUnavailable", { slot });
                } else if (def.kind === "item") {
                    const used = useConsumable();
                    result = { ...used, slot };
                } else result = fail("unsupportedKind", { slot });
            } catch (error) { result = fail("exception", { slot, detail: String(error?.message || error) }); }
            if (result.ok && def.cardId === "hermes_reed_flute") sleepSweep();                       // 葦笛: 眠った敵の溜め中の攻撃を、すぐ中断する(溜めが終わる瞬間に当てない)
            if (result.ok && hasCooldown(slot)) startCooldown(slot);                                 // 成功したときだけCooldown(失敗は何も消費しない)
            if (result.ok && isRingSlot(slot) && def.skillId) { const iv = SKILL_DEFS[def.skillId].interval; if (iv > 0) rt.gates[def.skillId] = iv; interruptHolds("skill", slot); }        // 発射の最小の間隔(黄金の矢 0.5秒)。Cooldown とは別
        }
        result.source = source; result.frame = rt.frame;
        rt.lastResult = result; flash(slot, result.ok === true);
        note({ type: "cast", slot, ok: result.ok === true, reason: result.reason || null, ...(isRingSlot(slot) ? { skillId: skillIdOf(slot) } : {}) });
        return result;
    };

    // ---- 入力の受け口(指輪ロードアウト: 5枠すべてで、押す・離すを別々に扱う。キー・左クリックとも同じ流れ) ----
    //   ホールド対応のスキル = 黄金の矢 Lv3(ビームの段階)。押した瞬間には発射しない。押している長さ(フレーム)で、離したときの動きと自動のビーム開始が決まる(定数 BEAM_RULE):
    //     離す < 0.25秒 = 通常の発射(11本)/ 0.25秒〜0.90秒未満で離す = 取り消し(発射もCooldownも無し)/ 0.90秒に達した瞬間 = ビーム自動開始(最大1.5秒。離す・中断で終わる)。
    //     ビームが終わったあと(時間切れ・中断)も押し続けていたら、離して押し直すまで何も出ない(同じ押下から通常の発射とビームの両方は出さない)。
    //   ビーム専用のCooldown(6秒・ビームが終わってから。スキルIDごと): その間に押すと「連射」: 押した瞬間と、押している間 0.5秒ごとに通常の発射(ビーム側の Cooldown が明けても、離して押し直すまでビームにはならない)。
    //   ホールド対応でない(Lv1・2 など)スキルは、押した瞬間に発動(従来どおり)。離しては何も起きない。
    const BEAM_TAP_FRAMES = Math.max(1, Math.round(BEAM_RULE.tapSeconds * FPS)), BEAM_START_FRAMES = Math.max(BEAM_TAP_FRAMES + 1, Math.round(BEAM_RULE.startSeconds * FPS));
    const BEAM_SPEED_ID = "fieldcombat_golden_beam";
    const goldenApi = () => { const a = root.ProjectRApolloGoldenVolley; return a && typeof a.startHeldBeam === "function" && typeof a.stopHeldBeam === "function" ? a : null; };
    const holdCapable = id => {
        if (id !== "apollo_golden_volley" || !(SKILL_DEFS[id] && SKILL_DEFS[id].hold) || !ringMode()) return false;
        const api = goldenApi();
        return !!api && Number(safe(() => api.cardLevel(), 0)) >= Number(api.beamLevel);                    // ビームの段階(Lv3)でなければ、押した瞬間に通常の発射
    };
    const holdLogPush = entry => { rt.holdLog.push({ frame: rt.frame, ...entry }); if (rt.holdLog.length > 40) rt.holdLog.shift(); };
    const holdStartReason = slot => { const r = castReason(slot); return r === "interval" ? null : r; };     // 押し始め・ビーム開始は、通常の発射の最小の間隔(0.5秒)には縛られない(ビームは通常の発射とは別)
    const applyBeamSpeed = () => { safe(() => root.ProjectRCardModifiers.setMoveSpeedFactor(BEAM_SPEED_ID, BEAM_RULE.beamSpeedFactor, 0.25)); };          // ビーム中だけ 50%。毎フレーム延長し、終わったら外す(万一止まっても短い時間で自然に消える)
    const clearBeamSpeed = () => { safe(() => root.ProjectRCardModifiers.clearMoveSpeedFactor(BEAM_SPEED_ID)); };
    // ビームが終わった(離す・時間切れ・中断・戦闘終了)。ビーム専用のCooldownは、実際にビームが始まっていたときだけ。終わるたびに1回だけ呼ばれる(onEnd)。
    const beamEnded = (id, info) => {
        const b = rt.beam;
        if (!b || b.skillId !== id || (info && b.serial !== info.serial)) return;
        rt.beam = null;
        rt.beamCd[id] = BEAM_RULE.cooldownSeconds;
        clearBeamSpeed();
        const h = rt.holds[b.slot]; if (h && h.phase === "beam") h.phase = "spent";
        holdLogPush({ slot: b.slot, skillId: id, frames: rt.frame - b.startedAt, source: "beam", outcome: "beam", reason: info ? info.reason : null, hits: info ? info.totalHits : 0, damage: info ? info.totalDamage : 0 });
        note({ type: "beamEnd", slot: b.slot, skillId: id, reason: info ? info.reason : null });
    };
    const startBeamFor = h => {
        const api = goldenApi(), reason = api ? holdStartReason(h.slot) : "apiUnavailable";
        if (reason) { h.phase = "canceled"; holdLogPush({ slot: h.slot, skillId: h.skillId, frames: rt.frame - h.downAt, outcome: "beamFailed", reason }); note({ type: "beamStartFailed", slot: h.slot, skillId: h.skillId, reason }); return false; }
        const started = api.startHeldBeam({ onEnd: info => beamEnded(h.skillId, info) });
        if (!started || started.ok !== true) {                                                               // 開始できなかった(マウスが真上など): ビームは始まっていないのでCooldownは無い
            const why = (started && started.reason) || "beamFailed";
            h.phase = "canceled"; rt.lastResult = { ...fail(why, { slot: h.slot, skillId: h.skillId, beam: true }), source: "hold", frame: rt.frame }; flash(h.slot, false);
            holdLogPush({ slot: h.slot, skillId: h.skillId, frames: rt.frame - h.downAt, outcome: "beamFailed", reason: why }); note({ type: "beamStartFailed", slot: h.slot, skillId: h.skillId, reason: why });
            return false;
        }
        h.phase = "beam"; h.beamStarted = true; h.serial = started.serial;
        rt.beam = { slot: h.slot, skillId: h.skillId, startedAt: rt.frame, serial: started.serial };
        applyBeamSpeed();
        rt.lastResult = { ok: true, slot: h.slot, skillId: h.skillId, cardId: h.skillId, beam: true, source: "hold", frame: rt.frame }; flash(h.slot, true);
        note({ type: "beamStart", slot: h.slot, skillId: h.skillId });
        interruptHolds("skill", h.slot);
        return true;
    };
    // 押している長さで、段階(tap → charge → beam)を進める。離したとき・毎フレームの両方から呼んでも結果は同じ。
    const advanceHold = h => {
        const frames = rt.frame - h.downAt;
        if (h.mode !== "charge") return frames;
        if (h.phase === "tap" && frames >= BEAM_TAP_FRAMES) h.phase = "charge";
        if ((h.phase === "tap" || h.phase === "charge") && frames >= BEAM_START_FRAMES) { h.ready = true; startBeamFor(h); }
        return frames;
    };
    // 中断(ほかのスキルの成功・回避・怯み・スタン。通常のHPダメージだけでは呼ばない)。溜めている最中 = 取り消し(Cooldownなし)/ ビーム中 = ビームを終わらせる(6秒のCooldownが始まる)。
    //   押し続けていても、離すまでは何も出ない(キー・左クリックとも)。連射中(ビーム側のCooldown中)は、「ほかのスキル」では止まらない(溜めではないので)。回避・怯み・スタンなら止まる。
    const interruptHolds = (reason, exceptSlot = null) => {
        let count = 0;
        for (const h of Object.values(rt.holds)) {
            if (h.slot === exceptSlot) continue;
            if (h.phase === "repeat" && reason === "skill") continue;
            if (h.phase === "beam") { const api = goldenApi(); if (api) api.stopHeldBeam("interrupt:" + reason); h.phase = "spent"; count++; }
            else if (h.phase === "tap" || h.phase === "charge" || h.phase === "repeat") { h.phase = "canceled"; holdLogPush({ slot: h.slot, skillId: h.skillId, frames: rt.frame - h.downAt, outcome: "interrupted", reason }); note({ type: "holdInterrupted", slot: h.slot, skillId: h.skillId, reason }); count++; }
        }
        return count;
    };
    // 押している記録を全部捨てる(メニュー・会話・戦闘終了など)。ビーム中ならビームも終わらせる(Cooldownが始まる)。何も発動しない。
    const dropHolds = reason => {
        const api = goldenApi();
        if (rt.beam && api) api.stopHeldBeam(reason);
        rt.holds = {};
        if (rt.beam) { rt.beam = null; clearBeamSpeed(); }
    };
    const pressSlot = (slot, source = "api") => {
        if (isRingSlot(slot)) {
            const id = skillIdOf(slot);
            if (id && holdCapable(id) && !holdStartReason(slot)) {
                if (rt.holds[slot]) return { ok: false, reason: "holding", slot, skillId: id, source, frame: rt.frame };          // 押しっぱなしの重複は無視(二重の発動なし)
                const repeat = (rt.beamCd[id] || 0) > 0;                                                    // ビーム専用のCooldown中は、押している間の連射
                const h = { slot, skillId: id, downAt: rt.frame, source, mode: repeat ? "repeat" : "charge", phase: repeat ? "repeat" : "tap", ready: false, beamStarted: false, repeats: 0 };
                rt.holds[slot] = h;
                note({ type: "holdStart", slot, skillId: id, mode: h.mode });
                if (!repeat) return { ok: true, held: true, slot, skillId: id, source, frame: rt.frame };
                if (castReason(slot)) return { ok: true, held: true, repeat: true, waiting: true, slot, skillId: id, source, frame: rt.frame };          // 間隔(0.5秒)の途中で押した: あいたら撃つ
                const fired = useAbility(slot, "repeat"); if (fired.ok) h.repeats++;
                return { ...fired, held: true, repeat: true };
            }
        }
        return useAbility(slot, source);
    };
    const releaseSlot = (slot, source = "api") => {
        const h = rt.holds[slot];
        if (!h) return null;
        const frames = advanceHold(h);
        delete rt.holds[slot];
        const entry = { slot, skillId: h.skillId, frames, source, mode: h.mode };
        if (h.phase === "beam") { const api = goldenApi(); if (api) api.stopHeldBeam("release"); return { ok: true, beam: true, ended: "release", slot, skillId: h.skillId, frames, source, frame: rt.frame }; }          // ログは beamEnded が書く
        if (h.phase === "repeat") { entry.outcome = "repeat"; entry.repeats = h.repeats; holdLogPush(entry); note({ type: "holdRelease", slot, skillId: h.skillId, frames, outcome: entry.outcome }); return null; }
        if (h.phase === "spent" || h.phase === "canceled") { entry.outcome = h.phase === "spent" ? "afterBeam" : "canceled"; holdLogPush(entry); note({ type: "holdRelease", slot, skillId: h.skillId, frames, outcome: entry.outcome }); return null; }
        if (h.phase === "charge") {                                                                          // 0.25秒〜0.90秒未満: 取り消し(発射もCooldownも無し)
            entry.outcome = "cancel"; holdLogPush(entry); note({ type: "holdRelease", slot, skillId: h.skillId, frames, outcome: entry.outcome });
            return { ok: false, reason: "holdCancel", slot, skillId: h.skillId, frames, source, frame: rt.frame };
        }
        entry.outcome = "tap"; holdLogPush(entry); note({ type: "holdRelease", slot, skillId: h.skillId, frames, outcome: entry.outcome });          // 0.25秒未満: 離したときに通常の発射
        return useAbility(slot, "tap");
    };
    // 毎フレーム: 押している長さを見て段階を進める(0.9秒でビーム開始)/ ビーム中は移動速度 50% を延長 / 連射中は間隔があいたら撃つ。左クリックは「離した」を TouchInput から読む(共通イベントの予約は押した瞬間だけ来るため)。
    const holdTick = () => {
        for (const h of Object.values(rt.holds)) {
            if (rt.holds[h.slot] !== h) continue;
            if (h.phase === "repeat") { if (!castReason(h.slot)) { const fired = useAbility(h.slot, "repeat"); if (fired.ok) h.repeats++; } continue; }
            advanceHold(h);
        }
        if (rt.beam) applyBeamSpeed();
        if (rt.lmb.down && rt.frame > rt.lmb.downAt && !safe(() => TouchInput.isPressed(), false)) { rt.lmb.down = false; releaseSlot("attack", "mouse"); }
    };
    // 左クリック(共通イベント1の予約)。竪琴の演奏中は、まず音符の選択へ(通常の攻撃より先)。押しっぱなしの重複は無視。
    const lyreInput = () => {
        const lyre = root.ProjectRApolloLyreRhythm;
        const r = lyre && typeof lyre.press === "function" ? safe(() => lyre.press("attack"), null) : null;
        return !!(r && r.ok === true);
    };
    const leftClick = (source = "attack") => {
        if (!ringMode()) return attackClick(source);                                                // 旧い固定の左クリックは従来どおり(竪琴の演奏中の転送だけ追加)
        if (rt.lmb.down) return { ok: false, reason: "holding", slot: "attack", source, frame: rt.frame };          // 押しっぱなしの間は、1クリックにつき1回だけ(離したと分かるまで次を受けない)
        rt.lmb = { down: true, downAt: rt.frame };
        if (lyreInput()) { note({ type: "lyreInput" }); return { ok: true, slot: "attack", lyre: true, source, frame: rt.frame }; }
        if (!skillIdOf("attack")) return fail("emptySlot", { slot: "attack", source, frame: rt.frame });
        return pressSlot("attack", source);
    };
    // API: 左クリック1回分。旧い固定 = 近接の1段 / 指輪ロードアウト = LMB 枠のスキルを使う(押す → すぐ離す)。
    const attackClick = (source = "api") => {
        if (!ringMode()) { const lyre = rt.active && lyreInput(); return lyre ? { ok: true, lyre: true, source, frame: rt.frame } : sweepClick(source); }
        if (lyreInput()) return { ok: true, slot: "attack", lyre: true, source, frame: rt.frame };
        const pressed = pressSlot("attack", source);
        return pressed && pressed.held ? (releaseSlot("attack", source) || pressed) : pressed;          // 押す → すぐ離す(黄金の矢 Lv3 = 0.25秒未満の離し = 通常の発射 / ビームのCooldown中 = 連射の1発)
    };

    // ------------------------------------------------------------------ 敵(予約 → 溜め → 近接攻撃 + 予兆) ----------------------------------------------------------------
    // 視界(ProjectR_FogOfWar): いまの視界の外にいる敵は、戦闘の開始・予兆・HUDで位置や存在をもらさない(AI・状態は止めない)。霧が無い・無効なら常に見えている扱い。
    const fog = () => root.ProjectR && root.ProjectR.FogOfWar;
    const eventVisible = event => { const f = fog(); return !f || typeof f.isEventVisible !== "function" || f.isEventVisible(event) !== false; };
    const enemyAlive = event => !!event && !event._erased && !!event.databaseEnemy && !event.linkedActorId && !event._isMinionActor &&
        typeof map()?.getCurrentEventHp === "function" && Number(map().getCurrentEventHp(event.eventId())) > 0;
    const center = e => ({ x: e._realX + 0.5, y: e._realY + 0.5 });
    const playerCenter = () => { const p = safe(() => $gamePlayer.centerPositionPoint?.(), null); return p ? { x: p.x, y: p.y } : { x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 }; };
    const enemiesMayAct = () => sceneIsMap() && !safe(() => $gameMessage.isBusy(), false) && !safe(() => $gameMap.isEventRunning(), false) && !safe(() => $gamePlayer.isTransferring(), false);
    const attachEnemy = (eventId, options = {}) => {
        const e = map()?.event(Number(eventId));
        if (!e || e._erased) return fail("eventMissing");
        if (!enemyAlive(e)) return fail("notAliveEnemy");
        if (!enemyAttack()) return fail("enemyAttackUnavailable");
        const o = options && typeof options === "object" ? options : {};
        rt.enemies.set(e.eventId(), {
            eventId: e.eventId(), state: "chase", cooldown: 0, attackId: null,
            windupFrames: Math.round(num(o.windupFrames, 36, 1)), cooldownFrames: Math.round(num(o.cooldownFrames, 120, 0)),
            reach: num(o.reach, 1.2, 0.5), notetag: String(o.notetag || "<projectRFieldMelee><dmg: ゴブリン>"), chase: o.chase !== false, pathfinding: o.pathfinding !== false,
            attacks: 0, aggroTiles: num(o.aggroTiles, 10, 1), strong: o.strong ? String(o.strong) : null,
            // 視界(敵ごとに変えられる): sight / aggro(旧名)→ 距離。fov → 視野角。省略は、プラグインパラメータ
            sightTiles: Math.max(1, num(o.sightTiles, num(o.aggroTiles, cfg.sightTiles, 0.1), 0.1)), fovDegrees: Math.min(360, Math.max(10, num(o.fovDegrees, cfg.fovDegrees, 0))),
            customSight: o.sightTiles !== undefined || o.aggroTiles !== undefined, customFov: o.fovDegrees !== undefined,
            aware: false, sees: false, seeReason: null, acquired: 0, losses: 0,
            home: { x: Math.floor(Number(e._realX) + 0.5), y: Math.floor(Number(e._realY) + 0.5) }
        });
        e._interpreter = null;                                                                    // 元からある並列ページの攻撃は止める(二重に攻撃しない)
        note({ type: "attach", eventId: e.eventId() });
        return { ok: true, eventId: e.eventId() };
    };
    // 倒された敵(HPが0以下)は、すぐに通り抜けられるようにする。Hendrix は、HP が 0 になってもイベントを消さない(消す処理は敵のページ/共通イベントにある)ので、
    //   戸口で倒れた敵が、プレイヤー・ほかの敵の通行をふさぎ続けていた。生きている敵の当たり判定・攻撃の判定・ドロップ・勝利の判定は変えない(通行だけ)。
    //   見た目(倒れた絵)は残し、プレイヤーの下に描かれる優先度(0)にする。
    const settleDeadEnemy = e => {
        if (!e || e._erased || e._projectRFieldSettled) return false;
        e._projectRFieldSettled = true;
        safe(() => { if (typeof e.setThrough === "function") e.setThrough(true); else e._through = true; });
        safe(() => { e._through = true; if (e._setThroughReserve != null) e._setThroughReserve = undefined; });       // DotMove の setThrough は、動いている間は「移動が終わってから」に予約する。倒れた敵は待たずに、いますぐ通れるようにする(予約も消す)
        safe(() => { if (typeof e.setPriorityType === "function") e.setPriorityType(0); });
        navState.ctx = null; softRelease(e.eventId());                                           // 経路探索の地図の写し(通れないイベント)を捨てる
        note({ type: "enemyDown", eventId: e.eventId() });
        return true;
    };
    const settleDeadEnemies = () => { for (const id of rt.enemies.keys()) { const e = map()?.event(id); if (e && !enemyAlive(e)) settleDeadEnemy(e); } for (const id of enc.attached) { const e = map()?.event(id); if (e && !enemyAlive(e)) settleDeadEnemy(e); } };
    // ------------------------------------------------------------------ 敵の視界(距離・視野角・壁/閉じた扉) ----------------------------------------------------------------
    // 追うのは「いま見えている」間だけ。見失ったらすぐ止まって待つ(最後に見た位置を覚えない・探さない)。プレイヤーの霧(FogOfWar)とは無関係(ProjectR_CombatOcclusion の視線の判定だけを使う)。
    const occlusion = () => root.ProjectR && root.ProjectR.CombatOcclusion;
    const FACING_DEGREE = { 8: 0, 6: 90, 2: 180, 4: 270 };
    const bearingDegree = (from, to) => { const d = Math.atan2(to.x - from.x, -(to.y - from.y)) * 180 / Math.PI; return ((d % 360) + 360) % 360; };
    const directionOfBearing = deg => (deg >= 315 || deg < 45 ? 8 : deg < 135 ? 6 : deg < 225 ? 2 : 4);
    const enemyFacing = e => { const d = safe(() => (typeof e.direction === "function" ? e.direction() : e._direction), undefined); return FACING_DEGREE[d]; };
    const perceive = (e, b, p) => {
        const c = center(e), dist = Math.hypot(p.x - c.x, p.y - c.y);
        if (dist > b.sightTiles) return { sees: false, reason: "range", dist };
        const o = occlusion();
        if (o && typeof o.hasLineOfSight === "function" && !safe(() => o.hasLineOfSight(c, p, { mode: "vision", ignoreEventIds: [e.eventId()] }), true)) return { sees: false, reason: "blocked", dist };
        if (!b.aware && b.fovDegrees < 360) {                                                    // 見つける瞬間だけ視野角を見る(見つけたあとは、プレイヤーの方を向く)
            const facing = enemyFacing(e);
            if (facing !== undefined) { const diff = Math.abs(((bearingDegree(c, p) - facing + 540) % 360) - 180); if (diff > b.fovDegrees / 2 + 1e-6) return { sees: false, reason: "fov", dist }; }
        }
        return { sees: true, reason: "seen", dist };
    };
    const getEnemyPerception = eventId => {
        const b = rt.enemies.get(Number(eventId)), e = map()?.event(Number(eventId));
        if (!b || !e) return null;
        const p = playerCenter(), r = perceive(e, b, p);
        return { eventId: b.eventId, enabled: cfg.perception, aware: b.aware, sees: b.sees, canSeeNow: r.sees, reason: r.reason, dist: r.dist, sightTiles: b.sightTiles, fovDegrees: b.fovDegrees, facing: enemyFacing(e) ?? null, acquired: b.acquired, losses: b.losses };
    };
    const setPerception = o => {
        const c = o && typeof o === "object" ? o : {};
        if (typeof c.enabled === "boolean") cfg.perception = c.enabled;
        if (c.sightTiles !== undefined) cfg.sightTiles = Math.max(1, num(c.sightTiles, cfg.sightTiles, 0.1));
        if (c.fovDegrees !== undefined) cfg.fovDegrees = Math.min(360, Math.max(10, num(c.fovDegrees, cfg.fovDegrees, 0)));
        for (const b of rt.enemies.values()) { if (!b.customSight) b.sightTiles = cfg.sightTiles; if (!b.customFov) b.fovDegrees = cfg.fovDegrees; }
        return { enabled: cfg.perception, sightTiles: cfg.sightTiles, fovDegrees: cfg.fovDegrees };
    };
    const resetPerception = () => { cfg.perception = perceptionDefaults.perception; return setPerception({ sightTiles: perceptionDefaults.sightTiles, fovDegrees: perceptionDefaults.fovDegrees }); };
    const detachEnemy = eventId => { const had = rt.enemies.delete(Number(eventId)); softRelease(Number(eventId)); if (had) { safe(() => enemyAttack()?.interrupt?.(Number(eventId), "detach")); safe(() => strongApi()?.interrupt?.(Number(eventId), "detach")); } return had; };
    // ------------------------------------------------------------------ 敵の経路探索(Stage 4: 通れない所をよけて追う) ----------------------------------------------------------------
    // 「追うかどうか」は、上の視界の判定がすべてを決める(見えている間だけ)。ここは「どう動くか」だけ。
    //   1. まっすぐ進める(体の大きさの四角が、通れるマスだけを通って、プレイヤーまで行ける)間は、従来どおり dotMoveToPlayer(動きは変わらない)。
    //   2. まっすぐ進めない(柱・家具・閉じた扉・味方の敵などの通れない所がある)ときだけ、タイルの格子で A*(8方向。角をまたぐ斜めは禁止)の経路を求め、
    //      「まっすぐ行ける最も遠い曲がり角」だけを結んだ折れ線にして、その上を DotMove の移動(dotMoveByDeg = 通常の衝突判定)で進む。
    //   3. 経路の目標は、見えている間の「いまの」プレイヤーのマスだけ。見失った瞬間に経路を捨てて止まる(最後に見た位置へ向かわない・探さない)。
    //      視界(距離・視野角・壁・閉じた扉)の判定には、いっさい手を入れない。壁の向こうへ回り込む追跡は、見失えば止まるのでしない(仕様の限界)。
    //   計算量: 探索は敵ごとに 12 フレーム以上あけ、全体で 1 フレーム 3 回まで。探索は、プレイヤーを中心にした範囲(+8マス)・最大 1500 ノードに限る。
    //   使うのは、エンカウンター中(rt.active)・敵の視界が有効・ループしないマス・体が 1 マス以下の敵だけ。それ以外は従来のまっすぐの追跡。
    const NAV = Object.freeze({ EPS: 0.02, SAMPLE: 0.25, DIRECT_FRAMES: 4, REPLAN_FRAMES: 12, CHECK_FRAMES: 10, STUCK_FRAMES: 24, AVOID_FRAMES: 60, RETRY_FRAMES: 30, MAX_SEARCHES: 3, MAX_NODES: 1500, MARGIN: 8, LOOKAHEAD: 40, CELL_FRAMES: 120, CTX_FRAMES: 4 });
    const navNew = () => ({ mode: "idle", path: null, pi: 0, segFrom: null, partial: false, goal: null, plannedAt: -1e9, nextDirect: 0, direct: false, noDirectUntil: 0, avoidUntil: 0, retryAt: 0, nextCheck: 0, lastPos: null, stuck: 0, stuckCount: 0, plans: 0, noPaths: 0, nodes: 0, lost: 0 });
    const navStats = { searches: 0, found: 0, noPath: 0, limited: 0, expanded: 0, searchMs: 0, maxSearchMs: 0, sweeps: 0, directFrames: 0, pathFrames: 0, waitFrames: 0, stuck: 0, budgetSkips: 0, legacyFrames: 0, lostSight: 0, frames: 0, navMs: 0, maxFrameMs: 0, maxFrameSearches: 0, errors: 0, partial: 0, why: {}, yields: 0, yieldFrames: 0, yieldBlocked: 0, softPass: 0, softEnd: 0 };
    const navState = { enabled: String(params.EnemyPathfinding ?? "true") !== "false", frameSearches: 0, frameMs: 0, ctx: null, grid: null, solid: null, buf: null, lastError: null };
    const navDefault = navState.enabled;
    const nowMs = () => (typeof performance !== "undefined" && performance && typeof performance.now === "function" ? performance.now() : Date.now());
    const DIRBIT = { 2: 1, 4: 2, 6: 4, 8: 8 };
    const bodySize = e => ({ w: Number(safe(() => e.width(), 1)) || 1, h: Number(safe(() => e.height(), 1)) || 1 });
    const navUsable = (e, b) => {
        if (!navState.enabled || b.pathfinding === false || !cfg.perception || !rt.active) return false;
        const m = map();
        if (!m || typeof m.isPassable !== "function" || typeof m.width !== "function" || typeof m.height !== "function" || typeof m.events !== "function") return false;
        if (typeof e.dotMoveByDeg !== "function" || typeof e.centerRealX !== "function" || typeof e.centerRealY !== "function") return false;
        if (safe(() => m.isLoopHorizontal() || m.isLoopVertical(), false)) return false;
        const s = bodySize(e);
        return s.w <= 1 + NAV.EPS && s.h <= 1 + NAV.EPS;
    };
    // そのフレームの地図の写し: 通れる向き(タイルの属性。一定時間キャッシュ)と、通れない(動かない)イベントのマス(毎フレーム作り直す。扉の開閉に追いつく)
    const navContext = () => {
        const m = map();
        if (navState.ctx && navState.ctx.m === m && rt.frame >= navState.ctx.frame && rt.frame - navState.ctx.frame < NAV.CTX_FRAMES) return navState.ctx;      // 通れないイベントの写しは 4 フレームごとに作り直す(扉が閉じれば視線が切れて止まるので、数フレームの遅れは影響しない)
        const W = m.width(), H = m.height(), data = typeof $dataMap !== "undefined" ? $dataMap : null, id = safe(() => m.mapId(), 0);
        let g = navState.grid;
        if (!g || g.m !== m || g.data !== data || g.id !== id || g.W !== W || g.H !== H || rt.frame < g.at || rt.frame - g.at >= NAV.CELL_FRAMES) g = navState.grid = { m, data, id, W, H, at: rt.frame, dirs: new Int8Array(W * H).fill(-1) };
        if (!navState.solid || navState.solid.length !== W * H) navState.solid = new Uint8Array(W * H); else navState.solid.fill(0);
        const solid = navState.solid;
        for (const ev of m.events()) {
            if (!ev || ev._erased || rt.enemies.has(ev.eventId())) continue;                    // 動く敵(味方)は、地図の一部にしない(必要なときだけ、よける相手として足す)
            if (safe(() => ev.isThrough(), true) || !safe(() => ev.isNormalPriority(), false) || ev._pageIndex < 0) continue;
            const s = bodySize(ev), x0 = Math.floor(ev._realX + NAV.EPS), x1 = Math.floor(ev._realX + s.w - NAV.EPS), y0 = Math.floor(ev._realY + NAV.EPS), y1 = Math.floor(ev._realY + s.h - NAV.EPS);
            for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) solid[y * W + x] = 1;
        }
        return (navState.ctx = { frame: rt.frame, m, W, H, g, solid });
    };
    const navDirs = (ctx, x, y) => {
        const i = y * ctx.W + x; let v = ctx.g.dirs[i];
        if (v < 0) { const m = ctx.m; v = (m.isPassable(x, y, 2) ? 1 : 0) | (m.isPassable(x, y, 4) ? 2 : 0) | (m.isPassable(x, y, 6) ? 4 : 0) | (m.isPassable(x, y, 8) ? 8 : 0); ctx.g.dirs[i] = v; }
        return v;
    };
    // 0 = 通れない / 1 = 一部の向きだけ通れる / 2 = どの向きにも通れる。extra = 追加でよけるマス(味方の敵)
    const navCell = (ctx, x, y, extra) => {
        if (x < 0 || y < 0 || x >= ctx.W || y >= ctx.H) return 0;
        const i = y * ctx.W + x;
        if (ctx.solid[i] || (extra && extra.has(i))) return 0;
        const v = navDirs(ctx, x, y);
        return v === 15 ? 2 : v === 0 ? 0 : 1;
    };
    const navEdge = (ctx, x, y, nx, ny, d, rev) => (navDirs(ctx, x, y) & DIRBIT[d]) !== 0 && (navDirs(ctx, nx, ny) & DIRBIT[rev]) !== 0;
    const navBodyOpen = (ctx, rx, ry, bw, bh, extra) => {
        const x0 = Math.floor(rx + NAV.EPS), x1 = Math.floor(rx + bw - NAV.EPS), y0 = Math.floor(ry + NAV.EPS), y1 = Math.floor(ry + bh - NAV.EPS);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (navCell(ctx, x, y, extra) !== 2) return false;
        return true;
    };
    // 体(左上の座標 a → b)を、一定の間隔で動かし、どの位置でも体が「どの向きにも通れるマス」だけに乗っているか
    const navSweep = (ctx, ax, ay, bx, by, bw, bh, extra) => {
        navStats.sweeps++;
        const dx = bx - ax, dy = by - ay, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / NAV.SAMPLE));
        for (let k = 0; k <= n; k++) if (!navBodyOpen(ctx, ax + dx * k / n, ay + dy * k / n, bw, bh, extra)) return false;
        return true;
    };
    const ensureBuf = n => {
        let b = navState.buf;
        if (!b || b.g.length < n) b = navState.buf = { g: new Float32Array(n), parent: new Int32Array(n), seen: new Int32Array(n), closed: new Int32Array(n), gen: 0 };
        return b;
    };
    // 8方向 A*(範囲 = 敵とプレイヤーを含む四角 + MARGIN)。斜めは、となりの2マスと斜め先のマスがすべて通れるときだけ。
    //   戻り値 = { tiles: [{x,y}...](始点から), partial } / null。目標へ届かない(囲まれている・ノード上限)ときは、いちばん近づけたマスまでの経路(partial: true)。1歩も近づけなければ null
    const navFind = (ctx, sx, sy, gx, gy, extra) => {
        const W = ctx.W, H = ctx.H;
        const x0 = Math.max(0, Math.min(sx, gx) - NAV.MARGIN), x1 = Math.min(W - 1, Math.max(sx, gx) + NAV.MARGIN), y0 = Math.max(0, Math.min(sy, gy) - NAV.MARGIN), y1 = Math.min(H - 1, Math.max(sy, gy) + NAV.MARGIN);
        const bw = x1 - x0 + 1, area = bw * (y1 - y0 + 1), buf = ensureBuf(area), gen = ++buf.gen;
        const ix = (x, y) => (y - y0) * bw + (x - x0), inside = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
        const heur = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return dx + dy - 0.5857864 * Math.min(dx, dy); };
        const hf = [], hi = [];                                                                 // 二分ヒープ(f 値・マスの番号)。更新は「追加して古いものを読み飛ばす」
        const push = (f, i) => { let k = hf.length; hf.push(f); hi.push(i); while (k > 0) { const q = (k - 1) >> 1; if (hf[q] <= f) break; hf[k] = hf[q]; hi[k] = hi[q]; k = q; } hf[k] = f; hi[k] = i; };
        const pop = () => {
            const top = hi[0], lf = hf.pop(), li = hi.pop(), n = hf.length;
            if (n > 0) { let k = 0; for (;;) { let c = 2 * k + 1; if (c >= n) break; if (c + 1 < n && hf[c + 1] < hf[c]) c++; if (hf[c] >= lf) break; hf[k] = hf[c]; hi[k] = hi[c]; k = c; } hf[k] = lf; hi[k] = li; }
            return top;
        };
        const s = ix(sx, sy), goalIndex = ix(gx, gy);
        buf.g[s] = 0; buf.parent[s] = -1; buf.seen[s] = gen; push(heur(sx, sy), s);
        const enter = (x, y) => (x === gx && y === gy) || navCell(ctx, x, y, extra) !== 0;      // 目標(プレイヤーのいるマス)は、必ず入れる
        const step = (x, y, dx, dy) => {                                                       // (x,y) から上下左右へ 1 マス進めるか
            const nx = x + dx, ny = y + dy; if (!inside(nx, ny) || !enter(nx, ny)) return false;
            return dx ? navEdge(ctx, x, y, nx, ny, dx > 0 ? 6 : 4, dx > 0 ? 4 : 6) : navEdge(ctx, x, y, nx, ny, dy > 0 ? 2 : 8, dy > 0 ? 8 : 2);
        };
        let expanded = 0, found = false, limited = false, best = s, bestH = heur(sx, sy);
        const relax = (x, y, nx, ny, cost, from) => {
            const j = ix(nx, ny); if (buf.closed[j] === gen) return;
            const ng = buf.g[from] + cost;
            if (buf.seen[j] !== gen || ng < buf.g[j]) { buf.seen[j] = gen; buf.g[j] = ng; buf.parent[j] = from; push(ng + heur(nx, ny), j); }
        };
        while (hf.length) {
            const cur = pop();
            if (buf.closed[cur] === gen) continue;
            buf.closed[cur] = gen;
            if (cur === goalIndex) { found = true; break; }
            if (++expanded > NAV.MAX_NODES) { limited = true; break; }
            const x = x0 + cur % bw, y = y0 + Math.floor(cur / bw);
            { const h = heur(x, y); if (h < bestH - 1e-9) { bestH = h; best = cur; } }
            const sN = step(x, y, 0, -1), sE = step(x, y, 1, 0), sS = step(x, y, 0, 1), sW = step(x, y, -1, 0);
            if (sN) relax(x, y, x, y - 1, 1, cur); if (sE) relax(x, y, x + 1, y, 1, cur); if (sS) relax(x, y, x, y + 1, 1, cur); if (sW) relax(x, y, x - 1, y, 1, cur);
            for (const [dx, dy] of [[1, -1], [1, 1], [-1, 1], [-1, -1]]) {
                const ox = dx > 0 ? sE : sW, oy = dy > 0 ? sS : sN;                              // 角をまたぐ斜め禁止: となりの2マスへ進めること
                if (!ox || !oy) continue;
                if (step(x + dx, y, 0, dy) && step(x, y + dy, dx, 0)) relax(x, y, x + dx, y + dy, 1.4142136, cur);
            }
        }
        navStats.expanded += expanded;
        if (limited) navStats.limited++;
        if (!found && best === s) return null;
        const out = [];
        for (let k = found ? goalIndex : best; k >= 0; k = buf.parent[k]) { out.push({ x: x0 + k % bw, y: y0 + Math.floor(k / bw) }); if (k === s) break; }
        return { tiles: out.reverse(), partial: !found };
    };
    // 折れ線にする: いまの位置から「まっすぐ行ける最も遠い」経路のマスの中心を、次の曲がり角にする(経路が折れる所だけが残る)
    const navSmooth = (ctx, e, tiles, bw, bh, extra) => {
        const k = tiles.length - 1, out = [], center = t => ({ x: t.x + 0.5, y: t.y + 0.5 });
        let fx = e._realX, fy = e._realY, idx = 0, firstTry = true;
        while (idx < k) {
            let pick = -1;
            for (let j = Math.min(k, idx + NAV.LOOKAHEAD); j > idx; j--) {
                const c = center(tiles[j]);
                if (navSweep(ctx, fx, fy, c.x - bw / 2, c.y - bh / 2, bw, bh, extra)) { pick = j; break; }
            }
            if (pick < 0) {
                if (firstTry && idx === 0) { const c = center(tiles[0]); out.push(c); fx = c.x - bw / 2; fy = c.y - bh / 2; firstTry = false; continue; }   // 体が端に寄っているときは、まず自分のマスの中心へ
                pick = idx + 1;
            }
            firstTry = false;
            const c = center(tiles[pick]); out.push(c); fx = c.x - bw / 2; fy = c.y - bh / 2; idx = pick;
        }
        if (!out.length) out.push(center(tiles[k]));
        return out;
    };
    const allyCells = (ctx, selfId) => {
        const set = new Set();
        for (const [id] of rt.enemies) {
            if (id === selfId) continue;
            const o = map()?.event(id); if (!o || !enemyAlive(o) || safe(() => o.isThrough(), false)) continue;
            const s = bodySize(o);
            for (let y = Math.floor(o._realY + NAV.EPS); y <= Math.floor(o._realY + s.h - NAV.EPS); y++) for (let x = Math.floor(o._realX + NAV.EPS); x <= Math.floor(o._realX + s.w - NAV.EPS); x++) if (x >= 0 && y >= 0 && x < ctx.W && y < ctx.H) set.add(y * ctx.W + x);
        }
        return set;
    };
    const navPlan = (e, b, nv, p, ctx, avoid) => {
        const s = bodySize(e), cx = e.centerRealX(), cy = e.centerRealY();
        const sx = Math.min(ctx.W - 1, Math.max(0, Math.floor(cx))), sy = Math.min(ctx.H - 1, Math.max(0, Math.floor(cy)));
        const gx = Math.min(ctx.W - 1, Math.max(0, Math.floor(p.x))), gy = Math.min(ctx.H - 1, Math.max(0, Math.floor(p.y)));
        const extra = avoid ? allyCells(ctx, b.eventId) : null;
        const t0 = nowMs();
        const found = navFind(ctx, sx, sy, gx, gy, extra), tiles = found ? found.tiles : null;
        const path = tiles ? navSmooth(ctx, e, tiles, s.w, s.h, extra) : null;
        const ms = nowMs() - t0;
        navStats.searches++; navStats.searchMs += ms; navStats.maxSearchMs = Math.max(navStats.maxSearchMs, ms); navState.frameSearches++; navState.frameMs += ms;
        nv.plannedAt = rt.frame; nv.goal = { x: gx, y: gy }; nv.plans++;
        if (!path) { navStats.noPath++; nv.noPaths++; nv.path = null; nv.pi = 0; nv.nodes = 0; nv.retryAt = rt.frame + NAV.RETRY_FRAMES; return false; }
        navStats.found++; if (found.partial) navStats.partial++; nv.path = path; nv.pi = 0; nv.segFrom = null; nv.nodes = tiles.length; nv.partial = found.partial;
        return true;
    };
    // 次の数個の曲がり角のマスが、まだ通れるか(扉が閉じる・イベントが動いた)。通れなければ探し直す
    const navPathValid = (ctx, nv, extra) => {
        for (let i = nv.pi; i < Math.min(nv.path.length, nv.pi + 3); i++) {
            const x = Math.floor(nv.path[i].x), y = Math.floor(nv.path[i].y);
            if (nv.goal && x === nv.goal.x && y === nv.goal.y) continue;                        // 目標(プレイヤーのいるマス)は調べない(イベントの上に立っていても、探し直しを繰り返さない)
            if (navCell(ctx, x, y, extra) === 0) return false;
        }
        return true;
    };
    const navIdle = (b, mode = "idle") => { const nv = b.nav; if (!nv) return; nv.mode = mode; nv.path = null; nv.pi = 0; nv.segFrom = null; nv.lastPos = null; nv.stuck = 0; nv.direct = false; nv.nextDirect = 0; };
    const navLose = b => { const nv = b.nav; if (!nv || nv.mode === "yield" || (nv.mode === "idle" && !nv.path)) return; navIdle(b); nv.lost++; navStats.lostSight++; };
    const legacyChase = e => safe(() => e.dotMoveToPlayer?.());
    // 折れ線の「いまの区間」(前の曲がり角 → 次の曲がり角)の線に沿って進む。線から横にずれているぶんは、1 歩の中で少しずつ(最大 0.7 歩分)戻し、有限の歩数で線の上に乗る
    //   (曲がり角で、1 マス幅の通路の壁へ体をこすらない。「線の先を狙う」方式は、線へ近づき続けるだけで、ぴったり乗らない)。戻り値 = DotMove の角度 / 区間の終わりなら null
    const navStepDeg = (e, nv) => {
        const cx = e.centerRealX(), cy = e.centerRealY(), dpf = Number(safe(() => e.distancePerFrame(), 0.07)) || 0.07, tol = Math.max(dpf * 0.75, 0.05);
        while (nv.pi < nv.path.length && Math.hypot(nv.path[nv.pi].x - cx, nv.path[nv.pi].y - cy) <= tol) { nv.segFrom = nv.path[nv.pi]; nv.pi++; }
        if (nv.pi >= nv.path.length) return null;
        const to = nv.path[nv.pi], from = nv.segFrom || { x: cx, y: cy }, sx = to.x - from.x, sy = to.y - from.y, len = Math.hypot(sx, sy);
        let vx = to.x - cx, vy = to.y - cy;                                                     // 既定: 次の曲がり角へまっすぐ
        if (len > 1e-6) {
            const tx = sx / len, ty = sy / len, remain = len - ((cx - from.x) * tx + (cy - from.y) * ty), lat = (cx - from.x) * -ty + (cy - from.y) * tx;
            if (remain > 1e-4) {
                const l = Math.max(-0.7 * dpf, Math.min(0.7 * dpf, -lat)), f = Math.min(remain, Math.sqrt(Math.max(0, dpf * dpf - l * l)));
                vx = tx * f - ty * l; vy = ty * f + tx * l;
            }
        }
        return ((Math.atan2(vy, vx) * 180 / Math.PI + 90) % 360 + 360) % 360;                  // DotMove の角度: 0 = 上・時計回り
    };
    const navMove = (e, nv, deg) => {
        nv.lastPos = { x: e._realX, y: e._realY };
        e.dotMoveByDeg(deg);
    };
    // プレイヤーを追う 1 フレーム(見えていて、追う条件がそろっているときだけ呼ばれる)
    const chaseStep = (e, b, p) => {
        if (!navUsable(e, b)) { navStats.legacyFrames++; legacyChase(e); return; }
        const t = rt.frame, nv = b.nav || (b.nav = navNew()), t0 = nowMs();
        if (nv.mode === "yield") navIdle(b);                                                     // 道を空けている途中で、また見えた: 空ける動きは捨てて、追う
        const ctx = navContext(), s = bodySize(e);
        if (nv.lastPos) {                                                                       // 前のフレームに進もうとしたのに、進めたか(壁・味方・角で止まっていないか)
            const dpf = Number(safe(() => e.distancePerFrame(), 0.07)) || 0.07;
            nv.stuck = Math.hypot(e._realX - nv.lastPos.x, e._realY - nv.lastPos.y) < dpf * 0.3 ? nv.stuck + 1 : 0;
        }
        if (nv.stuck >= NAV.STUCK_FRAMES) {                                                     // 止まり続けたら、しばらく味方の敵もよける経路にする(まっすぐは試さない)
            nv.stuck = 0; nv.stuckCount++; navStats.stuck++; nv.avoidUntil = t + NAV.AVOID_FRAMES; nv.noDirectUntil = t + NAV.AVOID_FRAMES; nv.path = null; nv.direct = false; nv.retryAt = 0;
        }
        const avoid = t < nv.avoidUntil;
        if (t < nv.noDirectUntil) nv.direct = false;
        else if (t >= nv.nextDirect) { nv.nextDirect = t + NAV.DIRECT_FRAMES; nv.direct = navSweep(ctx, e._realX, e._realY, p.x - s.w / 2, p.y - s.h / 2, s.w, s.h, null); }
        if (nv.direct) {                                                                        // まっすぐ行ける: 従来どおり
            if (nv.mode !== "direct") { nv.mode = "direct"; nv.path = null; nv.pi = 0; }
            navStats.directFrames++; nv.lastPos = { x: e._realX, y: e._realY }; legacyChase(e);
        } else {
            nv.mode = "path";
            const extra = avoid ? allyCells(ctx, b.eventId) : null, gx = Math.floor(p.x), gy = Math.floor(p.y);
            let need = !nv.path || nv.pi >= nv.path.length, why = nv.plans ? "again" : "first";
            if (!need && (nv.goal.x !== gx || nv.goal.y !== gy) && t - nv.plannedAt >= NAV.REPLAN_FRAMES) { need = true; why = "moved"; }      // プレイヤーが別のマスへ動いた
            if (!need && t >= nv.nextCheck) { nv.nextCheck = t + NAV.CHECK_FRAMES; if (!navPathValid(ctx, nv, extra)) { need = true; why = "invalid"; } }
            let ok = !need;
            if (need && t >= nv.retryAt) {
                if (navState.frameSearches >= NAV.MAX_SEARCHES) { navStats.budgetSkips++; ok = !!nv.path && nv.pi < nv.path.length; }         // このフレームの探索の予算切れ: 古い経路で進む(なければ待つ)
                else { navStats.why[why] = (navStats.why[why] || 0) + 1; ok = navPlan(e, b, nv, p, ctx, avoid); }
            } else if (need) ok = false;
            if (ok) {
                const deg = navStepDeg(e, nv);
                if (deg !== null) { navStats.pathFrames++; navMove(e, nv, deg); }
                else { navStats.waitFrames++; nv.lastPos = null; nv.path = null; if (nv.partial) nv.retryAt = t + NAV.RETRY_FRAMES; }      // 経路の終わり: 目標に着いた(探し直しは次のフレーム)/ 近づけるところまで来た(30フレーム待ってから探し直す)
            } else { navStats.waitFrames++; nv.lastPos = null; nv.stuck = 0; }                  // 経路がない/予算切れ: 壁に押しつけず、その場で待つ
        }
        const ms = nowMs() - t0; navStats.navMs += ms; navState.frameMs += ms;
    };
    // 経路探索で想定外のエラーが出ても、敵が固まらないように、従来のまっすぐの追跡へ戻す(エラーは数えて残す)
    const chaseStepSafe = (e, b, p) => {
        try { chaseStep(e, b, p); } catch (error) { navStats.errors++; navState.lastError = String(error && error.message || error); navIdle(b); legacyChase(e); }
    };
    const getEnemyNav = eventId => {
        const b = rt.enemies.get(Number(eventId)); if (!b) return null;
        const nv = b.nav || navNew();
        return { eventId: b.eventId, mode: nv.mode, direct: nv.direct, pathLength: nv.path ? nv.path.length : 0, remaining: nv.path ? Math.max(0, nv.path.length - nv.pi) : 0, waypoints: nv.path ? nv.path.slice(nv.pi, nv.pi + 40).map(w => ({ x: w.x, y: w.y })) : [],
            goal: nv.goal ? { ...nv.goal } : null, plannedAt: nv.plannedAt, plans: nv.plans, noPaths: nv.noPaths, nodes: nv.nodes, partial: nv.partial, yieldWhy: nv.yieldWhy || null, yieldWait: nv.yieldWait || 0, frame: rt.frame, stuckCount: nv.stuckCount, lost: nv.lost, avoiding: rt.frame < nv.avoidUntil, usable: !!map()?.event(b.eventId) && navUsable(map().event(b.eventId), b) };
    };
    // DEV・検証用: 経路だけを求める(動かさない)。from / to はマスの座標。戻り値 = マスの並び / null
    const findNavPath = (from, to, options = {}) => {
        if (!map() || typeof map().isPassable !== "function" || !from || !to) return null;
        const ctx = navContext(), clamp = (v, hi) => Math.min(hi - 1, Math.max(0, Math.floor(Number(v) || 0)));
        const extra = options.avoidEnemies ? allyCells(ctx, Number(options.selfId) || -1) : null;
        const r = navFind(ctx, clamp(from.x, ctx.W), clamp(from.y, ctx.H), clamp(to.x, ctx.W), clamp(to.y, ctx.H), extra);
        return r && (!r.partial || options.allowPartial) ? r.tiles : null;
    };
    const invalidateNavCache = () => { navState.grid = null; navState.ctx = null; return true; };                  // 実行中にタイルを書き換えたとき(通常は不要。DEV・検証用)
    const setPathfinding = on => { navState.enabled = !!on; if (!on) for (const b of rt.enemies.values()) navIdle(b); return navState.enabled; };
    const resetNavStats = () => { for (const k of Object.keys(navStats)) navStats[k] = k === "why" ? {} : 0; };
    // ------------------------------------------------------------------ 出入口の渋滞(Stage 4b) ----------------------------------------------------------------
    // 原因: (1) 視界の仕様で、見失った敵はその場で止まる。扉口に縦に並んだ敵が、プレイヤーが扉の正面の線を外れた瞬間に全員そのまま固まり、扉口をふさぎ続ける。
    //       (2) 扉口で前後を敵にはさまれると、DotMove の通常の衝突(敵は通れない物)で、プレイヤーが動けなくなる(攻撃以外に抜ける道がない)。
    //   対策: (1) 出入口(通路のマス = 通れる上下か左右の 2 方向だけ)に立って見失っている敵は、いちばん近い「出入口でないマス」へ道を空ける(追跡ではない。プレイヤーの位置は使わない。
    //            候補が同じ近さなら、元の持ち場に近い側。味方・通れない物のあるマスは使わない)。出たあとは 30 フレーム動かない(行ったり来たりしない)。
    //         (2) 出入口(プレイヤーか敵が通路のマス)で、進もうとして 24 フレーム進めないとき、または 2 体以上に囲まれて進めないとき、行く手の敵だけを、Hendrix の
    //            「プレイヤーが通り抜けるイベント」(_playerPassThroughEvents)へ入れる。壁・扉・柱は変わらない(イベントの当たり判定だけ)。攻撃の当たり判定・敵の通れる/通れないは変えない。
    //            離れる(体が重ならなくなる)と戻す。戦闘が終わる・敵が倒れる・外れると、必ず戻す(セーブに残さない)。
    const SOFT = Object.freeze({ BLOCK_FRAMES: 24, MIN_FRAMES: 20, MAX_FRAMES: 600, TOUCH: 1.15, YIELD_DEPTH: 5, YIELD_WAIT: 30, YIELD_INSET: 0.3 });
    const DIRVEC = { 1: [-1, 1], 2: [0, 1], 3: [1, 1], 4: [-1, 0], 6: [1, 0], 7: [-1, -1], 8: [0, -1], 9: [1, -1] };
    const navReady = () => { const m = map(); return !!m && typeof m.isPassable === "function" && typeof m.width === "function" && typeof m.height === "function" && typeof m.events === "function" && !safe(() => m.isLoopHorizontal() || m.isLoopVertical(), false); };
    // 通路のマス: 通れる上下左右のとなりが、ちょうど 2 つで、向かい合っている(扉口・1マス幅の通路)
    const isChokeTile = (ctx, x, y) => {
        if (navCell(ctx, x, y, null) === 0) return false;
        const open = (dx, dy) => { const nx = x + dx, ny = y + dy; return navCell(ctx, nx, ny, null) !== 0 && navEdge(ctx, x, y, nx, ny, dx ? (dx > 0 ? 6 : 4) : (dy > 0 ? 2 : 8), dx ? (dx > 0 ? 4 : 6) : (dy > 0 ? 8 : 2)); };
        const n = open(0, -1), so = open(0, 1), w = open(-1, 0), ea = open(1, 0);
        return (n + so + w + ea) === 2 && ((n && so) || (w && ea));
    };
    const bodyTiles = (e, s, inset = NAV.EPS) => { const out = []; for (let y = Math.floor(e._realY + inset); y <= Math.floor(e._realY + s.h - inset); y++) for (let x = Math.floor(e._realX + inset); x <= Math.floor(e._realX + s.w - inset); x++) out.push([x, y]); return out; };
    const softList = () => { const sys = typeof $gameSystem !== "undefined" ? $gameSystem : null; if (!sys) return null; if (!Array.isArray(sys._playerPassThroughEvents)) sys._playerPassThroughEvents = []; return sys._playerPassThroughEvents; };
    function softRelease(id) {
        const rec = rt.soft.get(id); if (!rec) return false;
        rt.soft.delete(id);
        if (rec.added) { const l = softList(); const i = l ? l.indexOf(id) : -1; if (i >= 0) l.splice(i, 1); }
        navStats.softEnd++; return true;
    }
    function clearSoft() { for (const id of [...rt.soft.keys()]) softRelease(id); rt.softBlocked = 0; rt.softLast = null; }
    const softAdd = (id, why) => {
        const l = softList(); if (!l || rt.soft.has(id)) return false;
        const added = !l.includes(id); if (added) l.push(id);
        rt.soft.set(id, { at: rt.frame, added, why }); navStats.softPass++; note({ type: "softPass", eventId: id, why });
        return true;
    };
    const softTick = () => {
        const p = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!p) return;
        const x = p._realX, y = p._realY, last = rt.softLast; rt.softLast = { x, y };
        for (const [id, rec] of [...rt.soft]) {                                                 // 戻す: 敵がいない・倒れた・体が重ならなくなった(最短 20 フレーム)・長すぎる(600 フレーム)
            const e = map()?.event(id);
            if (!e || !rt.enemies.has(id) || !enemyAlive(e)) { softRelease(id); continue; }
            const age = rt.frame - rec.at, s = bodySize(e);
            if (age >= SOFT.MAX_FRAMES || (age >= SOFT.MIN_FRAMES && !(Math.abs(e._realX - x) < 0.98 * (s.w + 1) / 2 && Math.abs(e._realY - y) < 0.98 * (s.h + 1) / 2))) softRelease(id);
        }
        // 重なりの救済: 体が敵と重なっている間は(絶の着地で、壁と敵のすきまに降りたとき など)、その敵をプレイヤーが通り抜けられるようにして、閉じ込められないようにする。離れれば戻す。
        if (cfg.softCollision && rt.active) {
            const pc0 = playerCenter(), ps0 = bodySize(p);
            for (const [id] of rt.enemies) {
                const e = map()?.event(id); if (!e || !enemyAlive(e) || safe(() => e.isThrough(), false) || rt.soft.has(id)) continue;
                const c = center(e), s0 = bodySize(e);
                if (Math.abs(c.x - pc0.x) < 0.85 * (ps0.w + s0.w) / 2 && Math.abs(c.y - pc0.y) < 0.85 * (ps0.h + s0.h) / 2) softAdd(id, "overlap");
            }
        }
        if (!cfg.softCollision || !navReady() || typeof Input === "undefined") return;
        const dir = Input.dir8 || Input.dir4 || 0;
        if (!dir || !last || Math.hypot(x - last.x, y - last.y) > 0.004 || !safe(() => p.canMove(), false) || safe(() => $gameMap.isEventRunning(), true)) { rt.softBlocked = 0; return; }
        if (++rt.softBlocked < SOFT.BLOCK_FRAMES) return;
        const v = DIRVEC[dir]; if (!v) return;
        const pc = playerCenter(), ps = bodySize(p), hits = []; let near = 0;
        for (const [id] of rt.enemies) {
            const e = map()?.event(id); if (!e || !enemyAlive(e) || safe(() => e.isThrough(), false) || rt.soft.has(id)) continue;
            const c = center(e), dx = c.x - pc.x, dy = c.y - pc.y, s = bodySize(e), lim = [(ps.w + s.w) / 2, (ps.h + s.h) / 2];
            if (Math.hypot(dx, dy) <= SOFT.TOUCH) near++;
            if (dx * v[0] + dy * v[1] <= 0) continue;                                           // 押している向きにいる敵だけ
            if (Math.abs(dx - v[0] * 0.3) < lim[0] - 1e-6 && Math.abs(dy - v[1] * 0.3) < lim[1] - 1e-6) hits.push({ id, tile: [Math.floor(c.x), Math.floor(c.y)] });
        }
        if (!hits.length) return;
        const ctx = navContext(), ahead = [Math.floor(pc.x + v[0] * 0.8), Math.floor(pc.y + v[1] * 0.8)];
        if (navCell(ctx, ahead[0], ahead[1], null) === 0 && !hits.some(h => h.tile[0] === ahead[0] && h.tile[1] === ahead[1])) return;   // 壁・扉・柱で止まっている(敵のせいではない)
        const choke = isChokeTile(ctx, Math.floor(pc.x), Math.floor(pc.y)) || hits.some(h => isChokeTile(ctx, h.tile[0], h.tile[1]));
        if (!choke && near < 2) return;                                                         // 広い所で、1体に当たっているだけなら、従来どおり(横へ回れる)
        for (const h of hits) softAdd(h.id, choke ? "choke" : "surrounded");
        rt.softBlocked = 0;
    };
    // 出入口に立って見失っている敵の、道を空ける動き
    const yieldStep = (e, b) => {
        const nv0 = b.nav || (b.nav = navNew());
        if (!navUsable(e, b)) { nv0.yieldWhy = "unusable"; return; }
        const t = rt.frame, nv = nv0, ctx = navContext(), s = bodySize(e);
        if (nv.mode === "yield") {
            const extra = allyCells(ctx, b.eventId);
            // 味方がいる・通れなくなった(扉が閉じた等)マスが出たら、道を空けるのをやめる
            const mine = Math.floor(e.centerRealY()) * ctx.W + Math.floor(e.centerRealX());       // 自分のいるマスは、体が重なっている味方がいても調べない
            if (!nv.path || t - nv.yieldAt > 240 || nv.path.slice(nv.pi).some(w => { const k = Math.floor(w.y) * ctx.W + Math.floor(w.x); return k !== mine && (extra.has(k) || navCell(ctx, Math.floor(w.x), Math.floor(w.y), null) === 0); })) { navIdle(b); nv.yieldWait = t + SOFT.YIELD_WAIT; return; }
            if (nv.lastPos && Math.hypot(e._realX - nv.lastPos.x, e._realY - nv.lastPos.y) < 0.002) nv.yieldStill++; else nv.yieldStill = 0;
            if (nv.yieldStill >= 20) { (nv.yieldBad || (nv.yieldBad = new Set())).add(nv.yieldTarget); navIdle(b); nv.yieldWait = t + 5; navStats.yieldBlocked++; return; }       // 20 フレーム進めない(壁・味方で): その出口は避けて、別の出口を探す
            const deg = navStepDeg(e, nv);
            if (deg === null) { navIdle(b); nv.yieldWait = t + SOFT.YIELD_WAIT; if (nv.yieldBad) nv.yieldBad.clear(); return; }
            nv.lastPos = { x: e._realX, y: e._realY }; e.dotMoveByDeg(deg); navStats.yieldFrames++;
            return;
        }
        if (t < (nv.yieldWait || 0)) { if (!String(nv.yieldWhy).startsWith("noExit")) nv.yieldWhy = "wait"; return; }
        if (!bodyTiles(e, s, SOFT.YIELD_INSET).some(([x, y]) => isChokeTile(ctx, x, y))) { nv.yieldWhy = "notChoke"; if (nv.mode !== "idle") navIdle(b); return; }
        const extra = allyCells(ctx, b.eventId), cx = Math.floor(e.centerRealX()), cy = Math.floor(e.centerRealY()), home = b.home || { x: cx, y: cy };
        const key = (x, y) => y * ctx.W + x, parent = new Map([[key(cx, cy), null]]), depth = new Map([[key(cx, cy), 0]]), queue = [[cx, cy]];
        let best = null;
        while (queue.length) {
            const [x, y] = queue.shift(), d = depth.get(key(x, y));
            if (d > 0 && !isChokeTile(ctx, x, y) && !extra.has(key(x, y)) && !(nv.yieldBad && nv.yieldBad.has(key(x, y)))) { const score = Math.hypot(x - home.x, y - home.y); if (!best || d < best.d || (d === best.d && score < best.score)) best = { x, y, d, score }; }
            if (best && d >= best.d) continue;
            if (d >= SOFT.YIELD_DEPTH) continue;
            for (const [dx, dy, dd, rv] of [[0, -1, 8, 2], [1, 0, 6, 4], [0, 1, 2, 8], [-1, 0, 4, 6]]) {
                const nx = x + dx, ny = y + dy, k = key(nx, ny);
                if (depth.has(k) || navCell(ctx, nx, ny, extra) === 0 || !navEdge(ctx, x, y, nx, ny, dd, rv)) continue;
                depth.set(k, d + 1); parent.set(k, [x, y]); queue.push([nx, ny]);
            }
        }
        if (!best) { nv.yieldWhy = "noExit:" + depth.size + ":" + cx + "," + cy; nv.yieldWait = t + SOFT.YIELD_WAIT * 2; return; }                          // 出られる所がない: その場で待つ(押しつけない)
        const tiles = []; for (let c = [best.x, best.y]; c; c = parent.get(key(c[0], c[1]))) tiles.push(c);
        tiles.reverse();
        nv.mode = "yield"; nv.path = tiles.slice(1).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 })); nv.yieldTarget = key(best.x, best.y); nv.yieldStill = 0; nv.pi = 0; nv.segFrom = null; nv.yieldAt = t; nv.direct = false; nv.stuck = 0; nv.yieldWhy = "started"; navStats.yields++;
        note({ type: "yield", eventId: b.eventId, to: [best.x, best.y] });
    };
    const yieldStepSafe = (e, b) => { try { yieldStep(e, b); } catch (error) { navStats.errors++; navState.lastError = String(error && error.message || error); navIdle(b); } };
    // ---- 睡眠(Stage 1D-2B): 葦笛(hermes_reed_flute)が付けるステート(note <ProjectRCard: hermes_reed_flute_sleep> = State 32)を、敵のAIが見る ----
    //   睡眠の付与・時間・解除(ダメージを与えたら起きる・4秒・戦闘の終了)・耐性/無効は、既存の ProjectR_HermesReedFlute と Hendrix の AddState のまま(ここでは変えない・足さない)。
    //   FieldCombat は「いま睡眠ステートがある敵」を、毎フレーム見るだけ: 眠っている間は 動かない(追わない・道を空けない・位置取りもしない)/ 攻撃を始めない / 溜め中・攻撃中の攻撃は中断(ダメージなし)。
    //   起きたら(ステートが消えたら)通常のAIへ戻る。眠らなかった敵(耐性・無効・範囲外)はステートが無いので、何も変わらない。
    let sleepStateCache = 0;
    const sleepStateId = () => {
        if (sleepStateCache > 0 && safe(() => /<ProjectRCard: hermes_reed_flute_sleep>/.test($dataStates[sleepStateCache].note), false)) return sleepStateCache;
        const list = safe(() => $dataStates.filter(st => st && st.note && st.note.includes("<ProjectRCard: hermes_reed_flute_sleep>")), []);
        return (sleepStateCache = list.length === 1 ? list[0].id : 0);
    };
    const enemyAsleep = e => { const id = sleepStateId(); return id > 0 && !!e && typeof root.hasState === "function" && safe(() => root.hasState(e.eventId(), id) === true, false); };
    // 眠っている敵の抑止。溜め中の攻撃(予兆つき)・強敵の攻撃は中断する(ダメージなし。溜めが終わる瞬間に当てない)。中断した攻撃は撃ち終えたものとして扱い、起きたあとすぐ連続で撃たない(通常の撃ち終わりと同じ Cooldown)。
    const suppressSleeper = (id, b, api) => {
        if (!b.asleep) { b.asleep = true; b.sleeps = (b.sleeps || 0) + 1; note({ type: "sleep", eventId: id }); }
        if (b.state === "windup" || b.attackId != null) { safe(() => api.interrupt(id, "sleep")); b.state = "chase"; b.attackId = null; b.cooldown = b.cooldownFrames; b.slept = (b.slept || 0) + 1; }
        if (b.strong) { const sx = strongApi(); if (sx && safe(() => sx.interrupt(id, "sleep"), false)) { b.slept = (b.slept || 0) + 1; b.cooldown = b.cooldownFrames; } if (b.state === "strong") b.state = "chase"; }
        navIdle(b);
    };
    const wakeSleeper = (id, b) => { b.asleep = false; note({ type: "wake", eventId: id }); };
    const updateEnemies = () => {
        const api = enemyAttack();
        if (!api || !rt.enemies.size) return;
        const p = playerCenter();
        navState.frameSearches = 0; navState.frameMs = 0;
        for (const [id, b] of [...rt.enemies]) {
            const e = map()?.event(id);
            if (!e || !enemyAlive(e)) { settleDeadEnemy(e); rt.enemies.delete(id); safe(() => api.interrupt(id, "enemyGone")); safe(() => strongApi()?.interrupt?.(id, "enemyGone")); continue; }
            if (enemyAsleep(e)) { suppressSleeper(id, b, api); continue; }                          // 眠っている敵(葦笛): 動かない・攻撃を始めない・溜め中の攻撃は中断。Cooldown・視界の更新も止まる
            if (b.asleep) wakeSleeper(id, b);                                                       // 起きた(ステートが消えた): このフレームから通常のAIへ
            if (hit.fx.size && hitFrozen(e)) continue;                                              // 命中のヒットストップ(Stage 6B): 当たったその敵だけ、数フレーム止まる(他の敵・時計・入力・Cooldown は止めない)
            if (b.cooldown > 0) b.cooldown--;
            const c = center(e), dist = Math.hypot(p.x - c.x, p.y - c.y);
            // 視界: 見えている間だけ「気づいている」。見失ったら、すぐ止まる(追跡の目標は持たない)。溜め(windup)の間は、いまの攻撃を撃ち終える(従来どおり)
            let sees = true;
            if (cfg.perception) {
                const r = perceive(e, b, p);
                sees = r.sees && !playerDead();
                b.seeReason = playerDead() ? "playerDead" : r.reason;
                if (sees && !b.aware) { b.aware = true; b.acquired++; note({ type: "acquire", eventId: id }); }
                else if (!sees && b.aware) { b.aware = false; b.losses++; note({ type: "lose", eventId: id, reason: b.seeReason }); }
                if (sees && b.state !== "windup" && b.state !== "strong" && (dist <= b.reach || !(b.nav && b.nav.mode === "path"))) safe(() => e.setDirection(directionOfBearing(bearingDegree(c, p))));      // 見つけたら、プレイヤーの方を向く(経路を進んでいる間は進む向き。攻撃の範囲に入ったら、プレイヤーの方)
            } else if (b.aware) { b.aware = false; }
            b.sees = sees;
            if (!sees) navLose(b);                                                                  // 見失った瞬間に経路を捨てる(最後に見た位置を覚えない)
            if (b.strong) {                                                                         // 強敵(Stage 7A): 攻撃の選び方と 溜め → 判定 → 硬直 は ProjectR_FieldStrongEnemy が持つ。攻撃している間は、ほかの動き・攻撃をしない
                const sx = strongApi();
                const sr = sx ? safe(() => sx.update({ eventId: id, profile: b.strong, active: rt.active, chase: b.chase, cooldownFrames: b.cooldownFrames, sees, playerDead: playerDead(), cooldown: b.cooldown, dist, center: c, player: p }), null) : null;
                if (sr && sr.finished) { b.cooldown = Number.isFinite(sr.cooldown) ? sr.cooldown : b.cooldownFrames; b.attacks++; }          // 中ボスのフェーズ2は、連続の2撃目(0)・短い Cooldown・長い休みを cooldown で返す
                else if (sr && Number.isFinite(sr.cooldown)) b.cooldown = sr.cooldown;
                if (sr && sr.busy) { b.state = "strong"; navIdle(b); continue; }
                if (b.state === "strong") b.state = "chase";
                if (sr && (sr.move === "hold" || sr.move === "retreat")) { navIdle(b); continue; }              // 位置取り(Stage 7B): 帯の中では動かない / 下がる(動きは ProjectR_FieldStrongEnemy が DotMove で行う)。approach / default は、従来の追跡
            }
            if (b.state === "windup") {
                const outcome = b.attackId != null ? safe(() => api.getOutcome(b.attackId), null) : null;
                const pendingRecord = b.attackId != null ? safe(() => api.get(b.attackId), null) : null;
                if (outcome || !pendingRecord || pendingRecord.state !== "pending") {
                    b.state = "chase"; b.cooldown = b.cooldownFrames; b.attackId = null; b.attacks++;
                }
                continue;                                                                           // 溜めの間は動かない(予兆と実際の攻撃を一致させる)
            }
            if (!b.strong && !playerDead() && sees && dist <= b.reach && b.cooldown <= 0) {
                const r = api.schedule({ eventId: id, kind: "melee", windupFrames: b.windupFrames, notetag: b.notetag, reach: Math.max(1, b.reach) });
                if (r && r.ok) { b.state = "windup"; b.attackId = r.id; navIdle(b); }
                continue;
            }
            if (b.chase && sees && !playerDead() && dist > b.reach * 0.8 && dist <= (cfg.perception ? b.sightTiles : b.aggroTiles)) chaseStepSafe(e, b, p);
            else if (!sees && cfg.perception && b.state !== "windup") yieldStepSafe(e, b);              // 見失って出入口に立っている敵は、道を空ける(追わない・プレイヤーの位置を使わない)
            else if (b.nav && b.nav.mode !== "idle") navIdle(b);                                    // 追わない間は、経路を持たない
        }
        if (navState.frameMs > 0 || navState.frameSearches > 0) { navStats.frames++; navStats.maxFrameMs = Math.max(navStats.maxFrameMs, navState.frameMs); navStats.maxFrameSearches = Math.max(navStats.maxFrameSearches, navState.frameSearches); }
    };

    // ------------------------------------------------------------------ 戦闘中の接触イベント ----------------------------------------------------------------
    // 戦闘中は主人公の向きがマウスの方向に固定される。DotMove の「接触」イベント(場所移動の扉など)は、主人公の向き(顔の向き)で前方を調べるので、
    //   マウスと違う方向へ歩いて扉にぶつかっても発火しなくなる。そこで戦闘中だけ、移動キーを押しているのに進めなかったとき、押している方向の前方を調べる
    //   (通常のMZが「進めなかったとき、進行方向の前を調べる」のと同じ。調べるのはイベントの接触トリガーだけ)。
    const touchAssist = () => {
        const p = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!p || typeof Input === "undefined") return;
        const x = p._realX, y = p._realY, dir = Input.dir4 || 0, was = rt.lastPos;
        rt.lastPos = { x, y };
        if (dir > 0 && was && Math.abs(x - was.x) + Math.abs(y - was.y) < 1e-4 && safe(() => p.canMove(), false) && !safe(() => $gameMap.isEventRunning(), true)) {
            rt.touchAssists++;
            safe(() => p.checkEventTriggerTouchFront(dir));
        }
    };


    // ------------------------------------------------------------------ エンカウンター(戦闘マップ) ----------------------------------------------------------------
    // 戦闘は、NPCとの会話・物語のイベントから入る専用の戦闘マップの中だけ。探索マップでは、近くに敵がいても戦闘は始まらず、戦闘の入力は無効。
    //   state: idle → armed(開始した。元のマップ・位置・向きを記録済み)→ entering(戦闘マップへ移動中)→ fighting(戦闘マップの準備が終わり、戦闘が有効)
    //          → leaving(元のマップへ戻る途中)→ idle     /  fighting → defeat(敗北: 自動では戻らない。ロード・ニューゲームで idle)
    const RESULT = Object.freeze({ NONE: 0, VICTORY: 1, DEFEAT: 2, OTHER: 3 });
    const enc = {
        state: "idle", id: "", origin: null, battleMapId: 0, spawn: null, resultVarId: 0, victoryCE: 0, otherCE: 0, serial: 0, blockSave: false, systemRef: null,
        resolved: false, applied: false, pendingResult: RESULT.NONE, last: null, waited: 0, readyFrames: 0, attached: new Set(), queued: [], listeners: new Set(), log: []
    };
    const encNote = entry => { enc.log.push({ frame: rt.frame, ...entry }); if (enc.log.length > 80) enc.log.shift(); note({ type: "encounter", ...entry }); };
    const validVariable = id => Number.isInteger(id) && id >= 0 && (id === 0 || (typeof $dataSystem !== "undefined" && !!$dataSystem && id < $dataSystem.variables.length));
    const validMap = id => Number.isInteger(id) && id > 0 && typeof $dataMapInfos !== "undefined" && !!$dataMapInfos && !!$dataMapInfos[id];
    const int = (v, f) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : f; };
    // 戦闘が使えるのは、エンカウンターが fighting のとき(DEVの許可を除く)
    const isCombatAllowed = () => cfg.devAllowOutside || (enc.state === "fighting" && !!map() && map().mapId() === enc.battleMapId);

    const resetEncounter = (reason) => {
        const was = enc.state;
        if (rt.active) end("encounter:" + reason);
        for (const id of [...rt.enemies.keys()]) detachEnemy(id);
        enc.attached.clear(); enc.queued = [];
        enc.state = "idle"; enc.blockSave = false; enc.systemRef = null; enc.origin = null; enc.battleMapId = 0; enc.spawn = null; enc.waited = 0; enc.readyFrames = 0;
        enc.resolved = false; enc.applied = false; enc.pendingResult = RESULT.NONE; enc.id = ""; enc.resultVarId = 0; enc.victoryCE = 0; enc.otherCE = 0;
        if (was !== "idle") encNote({ type: "reset", reason, was });
    };
    const setResultVariable = code => { if (enc.resultVarId > 0 && typeof $gameVariables !== "undefined" && $gameVariables) safe(() => $gameVariables.setValue(enc.resultVarId, code)); };
    const fireResult = payload => { for (const fn of [...enc.listeners]) safe(() => fn(payload)); };

    const startEncounter = (options = {}) => {
        const o = options && typeof options === "object" ? options : {};
        if (enc.state !== "idle") return fail("encounterActive", { state: enc.state });
        if (typeof $gamePlayer === "undefined" || !$gamePlayer || !map() || !sceneIsMap()) return fail("mapUnavailable");
        if (soulBusy()) return fail("soulActive");
        if (rt.active || deck()?.isCardBattleActive?.()) return fail("combatActive");
        if (playerDead()) return fail("playerDead");
        const battleMapId = int(o.battleMapId, 0), varId = int(o.resultVariableId, 0);
        if (!validVariable(varId)) return fail("invalidResultVariable");
        if (battleMapId > 0 && !validMap(battleMapId)) return fail("unknownBattleMap");
        if (battleMapId > 0 && battleMapId === map().mapId()) return fail("battleMapIsCurrentMap");
        enc.id = String(o.encounterId || "field_encounter"); enc.resultVarId = varId; enc.victoryCE = Math.max(0, int(o.victoryCommonEventId, 0)); enc.otherCE = Math.max(0, int(o.otherCommonEventId, 0));
        // 元のマップ・位置・向きを、移動の前に記録する(実座標も。戻るときに元の位置へ戻す)
        enc.origin = { mapId: map().mapId(), x: $gamePlayer.x, y: $gamePlayer.y, realX: $gamePlayer._realX, realY: $gamePlayer._realY, direction: $gamePlayer.direction() };
        enc.state = "armed"; enc.blockSave = true; enc.systemRef = $gameSystem; enc.resolved = false; enc.applied = false; enc.pendingResult = RESULT.NONE; enc.serial++; enc.waited = 0; enc.readyFrames = 0;
        setResultVariable(RESULT.NONE);                                                                // 戦闘中は 0
        encNote({ type: "start", id: enc.id, origin: { ...enc.origin } });
        if (battleMapId > 0) {
            const moved = transferToBattleMap({ battleMapId, spawnX: o.spawnX, spawnY: o.spawnY, direction: o.direction });
            if (!moved.ok) { resetEncounter("transferRejected"); return moved; }
        }
        return { ok: true, state: enc.state, origin: { ...enc.origin } };
    };
    // 戦闘マップのセルフスイッチ(扉の開閉・仕掛けなど)は、エンカウンターの開始のたびに初期状態へ戻す(マップを読み直しても、セルフスイッチは残るため)。
    const resetBattleMapSwitches = mapId => {
        const sw = typeof $gameSelfSwitches !== "undefined" ? $gameSelfSwitches : null;
        if (!sw || !sw._data) return 0;
        let n = 0;
        for (const key of Object.keys(sw._data)) if (String(key).split(",")[0] === String(mapId)) { delete sw._data[key]; n++; }
        return n;
    };
    const transferToBattleMap = (options = {}) => {
        const o = options && typeof options === "object" ? options : {};
        if (enc.state !== "armed") return fail("notArmed", { state: enc.state });
        const mapId = int(o.battleMapId, 0), x = int(o.spawnX, 0), y = int(o.spawnY, 0), d = [2, 4, 6, 8].includes(int(o.direction, 8)) ? int(o.direction, 8) : 8;
        if (!validMap(mapId)) return fail("unknownBattleMap");
        if (enc.origin && mapId === enc.origin.mapId) return fail("battleMapIsCurrentMap");
        enc.battleMapId = mapId; enc.spawn = { x, y, direction: d };
        resetBattleMapSwitches(mapId);                                                                 // 繰り返しのエンカウンターが、前回の扉・仕掛けの状態を引き継がない
        $gamePlayer.reserveTransfer(mapId, x, y, d, 0);
        enc.state = "entering"; enc.waited = 0; enc.readyFrames = 0;
        encNote({ type: "transfer", mapId, x, y, direction: d });
        return { ok: true, state: enc.state };
    };

    // ---- 敵(イベントのメモ <fieldEnemy: ...>・有効なページの注釈 / プラグインコマンド) ----
    const eventText = e => ((safe(() => e.event().note, "") || "") + "\n" + (safe(() => e.page().list, []) || []).filter(c => c.code === 108 || c.code === 408).map(c => c.parameters[0]).join("\n"));
    const parseEnemyTag = text => {
        const m = /<fieldEnemy(?::([^>]*))?>/i.exec(text || "");
        if (!m) return null;
        const o = {};
        for (const part of String(m[1] || "").split(/[,\s]+/)) {
            const kv = /^(\w+)=(.+)$/.exec(part.trim()); if (!kv) continue;
            const key = kv[1].toLowerCase(), v = kv[2];
            if (key === "windup") o.windupFrames = Number(v); else if (key === "cooldown") o.cooldownFrames = Number(v); else if (key === "reach") o.reach = Number(v);
            else if (key === "aggro") o.aggroTiles = Number(v); else if (key === "sight") o.sightTiles = Number(v); else if (key === "fov") o.fovDegrees = Number(v); else if (key === "strong") o.strong = v; else if (key === "chase") o.chase = !(v === "0" || v.toLowerCase() === "false"); else if (key === "path") o.pathfinding = !(v === "0" || v.toLowerCase() === "false");
        }
        return o;
    };
    const attachEncounterEnemy = (eventId, options) => {
        const r = attachEnemy(eventId, options);
        if (r.ok) enc.attached.add(Number(eventId));
        return r;
    };
    const scanEnemyTags = () => {
        let n = 0;
        for (const e of map().events()) { if (!e || e._erased) continue; const opt = parseEnemyTag(eventText(e)); if (opt && attachEncounterEnemy(e.eventId(), opt).ok) n++; }
        return n;
    };

    // ---- 戦闘マップの準備が終わったら戦闘を始める ----
    const activateEncounter = () => {
        const m = map();
        if (cfg.requireTag && !/<fieldBattleMap>/i.test(String(safe(() => $dataMap.note, "") || ""))) { encNote({ type: "notBattleMap", mapId: m.mapId() }); enc.state = "fighting"; finishEncounter("other", { reason: "notBattleMap" }); return; }
        enc.state = "fighting";                                                                        // begin() の許可のため先に fighting にする
        const began = begin({ encounter: true });
        if (!began.ok) { encNote({ type: "beginFailed", reason: began.reason }); finishEncounter("other", { reason: began.reason }); return; }
        const tagged = scanEnemyTags();
        for (const q of enc.queued.splice(0)) attachEncounterEnemy(q.eventId, q.options);
        encNote({ type: "fighting", enemies: [...enc.attached], tagged });
    };
    const allAttachedDead = () => {
        if (!enc.attached.size) return false;
        for (const id of enc.attached) { const e = map()?.event(id); if (e && !e._erased && enemyAlive(e)) return false; }
        return true;
    };

    // ---- 終わり方 ----
    // 勝利・中断: 結果は1回だけ。戦闘を片づけ(アビリティ・敵の行動・HUDを止める)、元のマップ・位置・向きへ戻り、戻ったあとに結果の変数・コモンイベントを処理する。
    const finishEncounter = (kind, info = {}) => {
        if (enc.state === "idle" || enc.state === "leaving" || enc.state === "defeat" || enc.resolved) return fail("notFighting", { state: enc.state });
        enc.resolved = true;
        settleDeadEnemies();
        const victory = kind === "victory";
        if (rt.active) end("encounter:" + kind);
        for (const id of [...rt.enemies.keys()]) detachEnemy(id);
        enc.pendingResult = victory ? RESULT.VICTORY : RESULT.OTHER;
        enc.state = "leaving"; enc.waited = 0;
        const o = enc.origin;
        if (o) safe(() => $gamePlayer.reserveTransfer(o.mapId, o.x, o.y, o.direction, 0));
        encNote({ type: "leaving", result: kind, ...info });
        return { ok: true, result: kind };
    };
    const applyReturn = () => {
        if (enc.applied) return;
        enc.applied = true;
        const o = enc.origin, code = enc.pendingResult, ce = code === RESULT.VICTORY ? enc.victoryCE : enc.otherCE;
        if (o) safe(() => { $gamePlayer._realX = o.realX; $gamePlayer._realY = o.realY; $gamePlayer.setDirection(o.direction); if ($gamePlayer.center) $gamePlayer.center(o.realX, o.realY); });
        setResultVariable(code);
        enc.last = { id: enc.id, result: code === RESULT.VICTORY ? "victory" : "other", code, serial: enc.serial };
        if (ce > 0 && typeof $gameTemp !== "undefined" && $gameTemp) safe(() => $gameTemp.reserveCommonEvent(ce));
        const payload = { ...enc.last };
        const last = enc.last;
        resetEncounter("returned");
        enc.last = last;
        encNote({ type: "returned", ...payload });
        fireResult(payload);
    };
    // 敗北: 自動では戻らない(既存の死亡・ロードの扱いのまま)。戦闘は片づけ、結果は1回だけ(変数=2)、エンカウンター中のセーブ禁止は続ける。
    const defeatEncounter = () => {
        if (enc.state !== "fighting" || enc.resolved) return;
        enc.resolved = true;
        if (rt.active) end("encounter:defeat");
        for (const id of [...rt.enemies.keys()]) detachEnemy(id);
        enc.state = "defeat"; enc.pendingResult = RESULT.DEFEAT;
        setResultVariable(RESULT.DEFEAT);
        enc.last = { id: enc.id, result: "defeat", code: RESULT.DEFEAT, serial: enc.serial };
        encNote({ type: "defeat" });
        fireResult({ ...enc.last });
    };
    const completeEncounter = (result = "victory") => {
        if (enc.state !== "fighting") return fail("notFighting", { state: enc.state });
        return finishEncounter(result === "victory" ? "victory" : "other", { reason: "command" });
    };
    // 中断(コマンド・外からの終了): 戦闘マップにいれば元のマップへ戻る。まだ移動していない(armed)なら、そのまま取り消す。
    const abortEncounter = (reason = "abort") => {
        if (enc.state === "idle") return false;
        if (enc.state === "leaving") return true;
        if ((enc.state === "fighting" || enc.state === "entering") && enc.origin && map() && map().mapId() !== enc.origin.mapId) { enc.state = "fighting"; finishEncounter("other", { reason }); return true; }
        if (!enc.resolved && enc.state !== "defeat") setResultVariable(RESULT.OTHER);
        resetEncounter(reason);
        return true;
    };
    // 予期しない場所へ移動した・戦闘が外から終えられた: 戻らずに片づける(結果=中断を1回だけ)
    const hardAbort = reason => {
        if (enc.state === "idle") return;
        if (!enc.resolved && enc.state !== "defeat") setResultVariable(RESULT.OTHER);
        encNote({ type: "hardAbort", reason });
        resetEncounter(reason);
    };

    const encounterTick = () => {
        if (enc.state === "idle" || enc.state === "armed" || enc.state === "defeat") return;
        const m = map();
        if (!m || typeof $gamePlayer === "undefined" || !$gamePlayer) return;
        const here = m.mapId(), busy = safe(() => $gamePlayer.isTransferring(), false);
        if (enc.state === "entering") {
            enc.waited++;
            if (here === enc.battleMapId && !busy && sceneIsMap()) {
                if (safe(() => $gameMap.isEventRunning() || $gameMessage.isBusy(), false)) { enc.readyFrames = 0; return; }       // 到着時のイベント・メッセージが終わるまで待つ
                if (++enc.readyFrames >= 3) activateEncounter();
            } else if (here !== enc.battleMapId && here !== enc.origin.mapId) hardAbort("mapChanged");
            else if (enc.waited > 1800 && !busy && !safe(() => $gameMap.isEventRunning(), false)) hardAbort("transferTimeout");
            return;
        }
        if (enc.state === "fighting") {
            if (here !== enc.battleMapId) { hardAbort("mapChanged"); return; }
            if (!rt.active) { if (!busy) finishEncounter("other", { reason: "combatEnded" }); return; }
            if (playerDead()) { defeatEncounter(); return; }
            settleDeadEnemies();
            if (rt.frame % 10 === 0 && allAttachedDead()) finishEncounter("victory", { reason: "allEnemiesDefeated" });
            return;
        }
        if (enc.state === "leaving") {
            enc.waited++;
            if (here === enc.origin.mapId && !busy && sceneIsMap()) applyReturn();
            else if (here !== enc.origin.mapId && here !== enc.battleMapId) hardAbort("mapChanged");
            else if (enc.waited > 1800 && !busy) hardAbort("returnTimeout");
        }
    };
    const getEncounterState = () => ({ state: enc.state, id: enc.id, serial: enc.serial, origin: enc.origin ? { ...enc.origin } : null, battleMapId: enc.battleMapId, spawn: enc.spawn ? { ...enc.spawn } : null,
        saveBlocked: enc.blockSave, enemies: [...enc.attached], resultVariableId: enc.resultVarId, last: enc.last ? { ...enc.last } : null, log: enc.log.slice(-12) });
    const onEncounterResult = fn => { if (typeof fn !== "function") return () => {}; enc.listeners.add(fn); return () => enc.listeners.delete(fn); };

    // ---- セーブの禁止(エンカウンター中。敗北後も、ロード・ニューゲームまで)/ ロード・ニューゲーム・マップ移動での片づけ ----
    const saveBlockedNow = system => enc.blockSave && (system === undefined || system === enc.systemRef);
    if (typeof Game_System !== "undefined") {
        const _isSaveEnabled = Game_System.prototype.isSaveEnabled;
        if (typeof _isSaveEnabled === "function") Game_System.prototype.isSaveEnabled = function() { return saveBlockedNow(this) ? false : _isSaveEnabled.apply(this, arguments); };
    }
    if (typeof Scene_Save !== "undefined") {                                                          // isSaveEnabled を見ない経路(イベントコマンド「セーブ画面を開く」)も、保存の実行で止める
        const _executeSave = Scene_Save.prototype.executeSave;
        Scene_Save.prototype.executeSave = function() {
            if (saveBlockedNow($gameSystem)) { if (typeof this.onSaveFailure === "function") this.onSaveFailure(); return undefined; }
            return _executeSave.apply(this, arguments);
        };
    }
    if (typeof DataManager !== "undefined") {
        const _setup = DataManager.setupNewGame;
        DataManager.setupNewGame = function() { resetEncounter("newGame"); return _setup.apply(this, arguments); };
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { resetEncounter("load"); return _extract.apply(this, arguments); };
    }
    // マップ移動: 想定した移動(戦闘マップへ入る・元のマップへ戻る)以外は、戻らずに片づける。戦闘が探索マップに残らない。
    if (typeof Game_Map !== "undefined") {
        const _mapSetup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function(mapId) {
            if (enc.state === "entering" || enc.state === "fighting") { if (mapId !== enc.battleMapId) hardAbort("mapChanged"); }
            else if (enc.state === "leaving") { if (!enc.origin || mapId !== enc.origin.mapId) hardAbort("mapChanged"); }
            else if (enc.state === "defeat" && mapId !== enc.battleMapId) resetEncounter("leftDefeatMap");
            return _mapSetup.apply(this, arguments);
        };
    }
    // 探索マップでは、基本攻撃(銃・剣)も使えない(CombatPresence の「画面内に敵がいる」だけでは使えない)。エンカウンター中・既存の戦闘(アリーナ・SOUL)・DEVの許可は除く。
    const weaponAllowed = () => !cfg.enforce || cfg.devAllowOutside || rt.active || isCombatAllowed() || !!presence()?.isCombatEventActive?.() || !!deck()?.isCardBattleActive?.() || soulBusy();
    const installWeaponGate = () => {
        const p = presence();
        if (!p || typeof p.canUseWeapon !== "function" || p.__projectRFieldGate) return;
        const original = p.canUseWeapon;
        p.canUseWeapon = function() { const v = original.apply(this, arguments); return v ? weaponAllowed() : v; };
        // 「戦闘中」の判定も同じ: 画面内に敵がいるだけでは戦闘中にしない。これを使う側(指輪の受け渡しの禁止・主人公のマウス向き)が、探索マップで画面内に敵がいても、
        //   指輪を入手できる・NPCへ向き直せる(正当な戦闘中=エンカウンター・既存の戦闘では、従来どおり禁止)。
        if (typeof p.isCombatActive === "function") { const originalActive = p.isCombatActive; p.isCombatActive = function() { const v = originalActive.apply(this, arguments); return v ? weaponAllowed() : v; }; }
        p.__projectRFieldGate = true;
    };
    installWeaponGate();

    // ---- プラグインコマンド ----
    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        const warn = (name, r) => { if (r && r.ok === false && typeof console !== "undefined") console.warn(`[${PLUGIN}] ${name} rejected:`, r.reason); };
        PluginManager.registerCommand(PLUGIN, "StartFieldEncounter", args => warn("StartFieldEncounter", startEncounter(args)));
        PluginManager.registerCommand(PLUGIN, "TransferToBattleMap", args => warn("TransferToBattleMap", transferToBattleMap(args)));
        PluginManager.registerCommand(PLUGIN, "CompleteFieldEncounter", args => warn("CompleteFieldEncounter", completeEncounter(String(args && args.result || "victory"))));
        PluginManager.registerCommand(PLUGIN, "AbortFieldEncounter", () => { abortEncounter("command"); });
        PluginManager.registerCommand(PLUGIN, "AttachFieldEnemy", function(args) {
            const id = int(args && args.eventId, 0) || (this && typeof this.eventId === "function" ? this.eventId() : 0);
            const options = { windupFrames: Number(args && args.windupFrames) || undefined, cooldownFrames: args && args.cooldownFrames !== undefined && args.cooldownFrames !== "" ? Number(args.cooldownFrames) : undefined, reach: Number(args && args.reach) || undefined, sightTiles: args && args.sightTiles !== undefined && args.sightTiles !== "" ? Number(args.sightTiles) : undefined, fovDegrees: args && args.fovDegrees !== undefined && args.fovDegrees !== "" ? Number(args.fovDegrees) : undefined };
            if (enc.state === "fighting") warn("AttachFieldEnemy", attachEncounterEnemy(id, options));
            else if (enc.state === "entering" || enc.state === "armed") enc.queued.push({ eventId: id, options });          // 戦闘マップの準備が終わってから有効にする
        });
    }

    // ------------------------------------------------------------------ 毎フレーム ----------------------------------------------------------------
    const tickFrame = () => {
        rt.frame++;
        if (rt.active) {
            // 他の経路がカード戦闘を入れ替えた/終えた(Arena・SOUL等)ときは、こちらも終わる
            if (!deck()?.isCardBattleActive?.() || !presence()?.isCombatEventActive?.()) end("externalChange");
        }
        encounterTick();
    };
    if (typeof Scene_Map !== "undefined") {
        const _update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            const requests = rt.pending, generation = rt.generation;
            rt.pending = [];
            _update.apply(this, arguments);
            tickFrame();
            hitTick();
            // 敵の行動(attachEnemy)は、戦闘中でなくても、隠れていても止めない(メッセージ・イベント・メニュー中だけ止まる)
            if (rt.enemies.size && enemiesMayAct()) updateEnemies();
            if (!rt.active || generation !== rt.generation) return;
            if (cardInput()?.getBlockedReason?.() !== null) { rt.pending = []; interruptControls(); return; }          // メニュー・会話・イベント中は進めない(C の押下・放射メニューも取り消す)
            const dt = 1 / FPS;
            for (const slot of Object.keys(rt.cooldowns)) if (rt.cooldowns[slot] > 0) rt.cooldowns[slot] = Math.max(0, rt.cooldowns[slot] - dt);
            for (const id of Object.keys(rt.gates)) { rt.gates[id] = Math.max(0, rt.gates[id] - dt); if (rt.gates[id] <= 1e-9) delete rt.gates[id]; }
            for (const id of Object.keys(rt.beamCd)) { rt.beamCd[id] = Math.max(0, rt.beamCd[id] - dt); if (rt.beamCd[id] <= 1e-9) delete rt.beamCd[id]; }          // ビーム専用のCooldown(スキルIDごと。ビームが終わってから6秒)          // 発射の最小の間隔
            // カード戦闘の時計(deck.updateCooldown: 一閃の分割ダメージ・睡眠・各種ステータスの時間)は、ここでは進めない。
            //   ProjectR_CardBattleInput の Scene_Map.update が、操作可能なフレームごとに 1/60 秒を 1 回だけ進める(ここと同じ getBlockedReason の条件)。
            //   以前はここでも進めていたため、FieldCombat 中は 1 フレームに 2 回(2倍速)進み、睡眠 4秒 が実時間で約2秒になっていた(Stage 1D-2C で修正)。
            touchAssist(); softTick();
            controlsTick();
            for (const req of requests) { if (!rt.active || generation !== rt.generation) break; processRequest(req); }
            refreshLayer(this);
        };
        const _createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
        Scene_Map.prototype.createDisplayObjects = function() {
            _createDisplayObjects.apply(this, arguments);
            createLayer(this);
        };
    }

    // ------------------------------------------------------------------ 近接と銃の攻撃力の分離(Stage 6C) ----------------------------------------------------------------
    //   原因: 命中のダメージは Hendrix の "player weapon" = スロット1の武器の攻撃スキルとアクターの ATK(装備の合計)で計算される。FieldCombat のプレイヤーはスロット1に銃を持つので、
    //   薙ぎ払いも「銃の攻撃力」で計算されていた(銃の攻撃力を上げると近接も上がる)。独立した近接の攻撃力(能力値・スロット)は無い。
    //   方針(新しい能力値・スロットは作らない。セーブは変えない): 銃を持っている間の薙ぎ払いだけ、命中のダメージ計算の間、スロット1の武器を「近接の武器」に一時的に差し替える(SwordSystem の damageWeapon)。
    //     近接の武器 = パラメータ MeleeWeaponId(0 = 自動)→ リードのデータベースの初期武器(銃でないもの)→ 素手。近接の武器を装備しているときは、装備中の武器がそのまま(従来どおり)。
    //   ダメージの式・強撃の倍率・判定・手応え・操作は変わらない。銃のダメージは銃を装備したまま(従来どおり)。
    const meleeCfg = { separate: String(params.SeparateMeleeDamage === undefined ? "true" : params.SeparateMeleeDamage) !== "false", weaponId: Math.max(0, Math.floor(num(params.MeleeWeaponId, 0, 0))) };
    const isGunWeapon = w => !!w && /<capacity:/i.test(w.note || "");                          // SwordSystem・GunSystem と同じ判定(<capacity:> を持つ武器 = 銃)
    const isMeleeWeaponId = id => id > 0 && safe(() => { const w = $dataWeapons[id]; return !!w && !isGunWeapon(w); }, false);
    const getMeleeDamageSource = () => {
        const leader = safe(() => $gameParty.leader(), null);
        const out = { separate: meleeCfg.separate, configuredWeaponId: meleeCfg.weaponId, weaponId: null, source: "off", equipped: null };
        if (!leader) { out.source = "noLeader"; return out; }
        const equipped = safe(() => leader.weapons()[0] || null, null);
        out.equipped = equipped ? { id: equipped.id, name: equipped.name, gun: isGunWeapon(equipped) } : null;
        if (!meleeCfg.separate) return out;
        if (equipped && !isGunWeapon(equipped)) { out.source = "equippedMelee"; return out; }              // 近接の武器を装備している: 装備中の武器がそのまま(従来どおり)
        if (isMeleeWeaponId(meleeCfg.weaponId)) { out.weaponId = meleeCfg.weaponId; out.source = "parameter"; return out; }
        const dbId = safe(() => Number($dataActors[leader.actorId()].equips[0]) || 0, 0);
        if (isMeleeWeaponId(dbId)) { out.weaponId = dbId; out.source = "actorDefault"; return out; }
        out.weaponId = 0; out.source = "unarmed"; return out;                                               // 近接の武器が無い: 素手(銃の攻撃力は使わない)
    };
    const setMeleeDamageSource = o => {
        const v = o && typeof o === "object" ? o : {};
        if (typeof v.separate === "boolean") meleeCfg.separate = v.separate;
        if (v.weaponId !== undefined && Number.isFinite(Number(v.weaponId)) && Number(v.weaponId) >= 0) meleeCfg.weaponId = Math.floor(Number(v.weaponId));
        return getMeleeDamageSource();
    };

    // ------------------------------------------------------------------ 命中の手応え(Stage 6B): 点滅・反動・ヒットストップ・SE ----------------------------------------------------------------
    //   攻撃が「実際にダメージを与えた」ときだけ、当たった敵に短い手応えを出す。ダメージの計算・判定・時間・Cooldown・入力・敵のAIは変えない(見た目と音と、当たった敵だけの短い停止)。
    //   ・SwordSystem / GunSystem が、ダメージを出した直後に命中を通知する(addHitListener)。HP は次のフレームで減るので、ここで HP が減ったことを確かめてから出す(減らなければ何も出さない)。
    //   ・種類: melee(1・2段目)/ heavy(3段目の強撃)/ gun(銃)。強いほど 点滅が長く・反動が大きく・ヒットストップが長く・SEが低くて重い。
    //   ・ヒットストップ: 既存の ProjectR_HitStop で、当たった敵の Game_Event.update だけを数フレーム飛ばす(その敵のAI・移動も一緒に止める)。倒れた敵は止めない。
    //   ・反動: 敵の絵(Sprite_Character)だけを、攻撃の向きへ数px ずらして戻す。Game_Event の位置は動かさない(押し戻し・経路・当たり判定は変わらない)。
    //   ・SE: 既存の効果音。薙ぎ払いが複数の敵に当たっても、1回の攻撃につき1回だけ。続けて鳴らさない(間隔 4 フレーム)。
    //   ・霧(Fog of War): 命中の瞬間に見えていなかった敵には、点滅・反動・SE・ヒットストップのどれも出さない(位置がもれない)。
    //   ・片づけ: 戦闘の開始・終了(勝利・撤退・マップ移動・ロード)で、予約・点滅・反動・ヒットストップを全部捨てる。倒れた・消えた敵の分も捨てる。
    const parseSe = (text, fallback) => {
        const raw = text === undefined || text === null || String(text).trim() === "" ? fallback : String(text);
        const parts = raw.split(":"), name = parts[0].trim();
        return !name || name.toLowerCase() === "none" ? null : { name, volume: num(parts[1], 70, 0), pitch: num(parts[2], 100, 50) };
    };
    const flashBase = Math.floor(num(params.FlashFrames, 6, 0));
    const hitCfg = {
        enabled: String(params.HitFeedback === undefined ? "true" : params.HitFeedback) !== "false",
        hitstop: { melee: Math.floor(num(params.HitstopFrames, 3, 0)), heavy: Math.floor(num(params.HitstopHeavyFrames, 6, 0)), gun: Math.floor(num(params.HitstopGunFrames, 2, 0)) },
        recoil: { melee: num(params.RecoilPixels, 4, 0), heavy: num(params.RecoilHeavyPixels, 10, 0), gun: num(params.RecoilGunPixels, 3, 0) },
        recoilFrames: { melee: 8, heavy: 12, gun: 6 },
        flash: { melee: flashBase, heavy: Math.round(flashBase * 1.6), gun: flashBase > 0 ? Math.max(2, Math.round(flashBase * 0.6)) : 0 },
        flashAlpha: { melee: 170, heavy: 230, gun: 130 },
        se: { melee: parseSe(params.HitSeMelee, "Blow1:55:115"), heavy: parseSe(params.HitSeHeavy, "Blow6:75:80"), gun: parseSe(params.HitSeGun, "Damage1:45:125") },
        seGap: 4, confirmFrames: 8, hitstopMax: 12
    };
    const hit = { pending: [], fx: new Map(), seDone: new Set(), seLast: -999, regs: { sword: false, gun: false },
        stats: { notified: 0, confirmed: 0, dropped: 0, killed: 0, hidden: 0, se: 0, seSkipped: 0, hitstops: 0, flashes: 0, recoils: 0, cleared: 0 } };
    const hitFrozen = e => { const f = hit.fx.get(e); return !!f && rt.frame < f.stopUntil; };
    const onHit = payload => {
        hit.stats.notified++;
        if (!rt.active || !hitCfg.enabled || !payload) return;
        const id = Number(payload.enemyId), e = map()?.event(id);
        if (!e || e._erased) return;
        const hp0 = Number.isFinite(Number(payload.hp0)) ? Number(payload.hp0) : safe(() => map().getCurrentEventHp(id), null);      // payload.hp0 = ダメージを出す前の HP(外部のスキルが渡す。SwordSystem・GunSystem は渡さない = 従来どおり)
        if (hp0 == null || !(hp0 > 0)) return;
        if (!eventVisible(e)) { hit.stats.hidden++; return; }                               // 見えていない敵には何も出さない(位置がもれる)
        const kind = payload.kind === "gun" ? "gun" : (Number(payload.step) >= COMBO.max ? "heavy" : "melee");
        hit.pending.push({ eventId: id, event: e, hp0, kind, key: String(payload.kind) + ":" + String(payload.serial), degree: Number(payload.degree), born: rt.frame });
        if (hit.pending.length > 64) { hit.pending.shift(); hit.stats.dropped++; }
    };
    const ensureHitListeners = () => {
        for (const [reg, name] of [["sword", "ProjectRSwordSystem"], ["gun", "ProjectRGunSystem"]]) {
            if (hit.regs[reg]) continue;
            const add = safe(() => root[name].addHitListener, null);
            if (typeof add === "function") { add(onHit); hit.regs[reg] = true; }
        }
    };
    const recoilDirection = (p, e) => {
        let vx, vy;
        if (p.kind === "gun" && Number.isFinite(p.degree)) { vx = Math.sin(p.degree * Math.PI / 180); vy = -Math.cos(p.degree * Math.PI / 180); }
        else { const c = center(e), pc = playerCenter(); vx = c.x - pc.x; vy = c.y - pc.y; }
        const len = Math.hypot(vx, vy);
        if (!(len > 0.001)) { const d = Number.isFinite(p.degree) ? p.degree : 180; vx = Math.sin(d * Math.PI / 180); vy = -Math.cos(d * Math.PI / 180); return { x: vx, y: vy }; }
        return { x: vx / len, y: vy / len };
    };
    const confirmHit = (p, e, hp) => {
        const dead = hp <= 0 || e._erased, kind = p.kind;
        hit.stats.confirmed++;
        if (dead) hit.stats.killed++;
        // SE: 1回の攻撃につき1回だけ(薙ぎ払いが何体に当たっても)。続けて鳴らさない
        const se = hitCfg.se[kind];
        if (se && !hit.seDone.has(p.key) && rt.frame - hit.seLast >= hitCfg.seGap) {
            safe(() => AudioManager.playSe({ name: se.name, volume: se.volume, pitch: se.pitch, pan: 0 }));
            hit.seDone.add(p.key); if (hit.seDone.size > 32) hit.seDone.clear();
            hit.seLast = rt.frame; hit.stats.se++;
        } else if (se) hit.stats.seSkipped++;
        const flash = hitCfg.flash[kind];
        const prev = hit.fx.get(e);
        const entry = { event: e, eventId: p.eventId, kind, start: rt.frame, flashFrames: flash, flashAlpha: hitCfg.flashAlpha[kind], recoilFrames: hitCfg.recoilFrames[kind], amp: 0, dx: 0, dy: 0, stopUntil: 0, life: 0 };
        if (!dead) {                                                                         // 倒れた敵は動かさない・止めない(倒れる動きを妨げない)
            const px = hitCfg.recoil[kind];
            if (px > 0) { const d = recoilDirection(p, e); entry.amp = px; entry.dx = d.x; entry.dy = d.y; hit.stats.recoils++; }
            const frames = Math.min(hitCfg.hitstopMax, hitCfg.hitstop[kind]);
            if (frames > 0 && safe(() => root.ProjectRHitStop.apply(e, frames, { owner: "fieldcombat:" + p.key, maxFrames: hitCfg.hitstopMax * 2 }).ok, false)) { entry.stopUntil = rt.frame + frames; hit.stats.hitstops++; }
        }
        if (flash > 0) hit.stats.flashes++;
        if (prev && prev.stopUntil > entry.stopUntil) entry.stopUntil = prev.stopUntil;
        entry.life = Math.max(flash, entry.amp > 0 ? entry.recoilFrames : 0, entry.stopUntil - rt.frame) + 1;
        if (flash > 0 || entry.amp > 0 || entry.stopUntil > rt.frame) hit.fx.set(e, entry);
    };
    // 毎フレーム: 予約した命中の「実際にHPが減ったか」を確かめる(減らなかったら捨てる)。終わった手応えを片づける。
    const hitTick = () => {
        if (!hit.pending.length && !hit.fx.size) return;
        const m = map();
        for (const p of hit.pending.slice()) {
            const e = p.event;
            const hp = !m || m.event(p.eventId) !== e ? 0 : safe(() => m.getCurrentEventHp(p.eventId), null);
            if (hp != null && hp < p.hp0) { hit.pending.splice(hit.pending.indexOf(p), 1); confirmHit(p, e, hp); }
            else if (rt.frame - p.born > hitCfg.confirmFrames || hp == null) { hit.pending.splice(hit.pending.indexOf(p), 1); hit.stats.dropped++; }
        }
        for (const [e, fx] of [...hit.fx]) if (!m || e._erased || m.event(fx.eventId) !== e || rt.frame - fx.start > fx.life) hit.fx.delete(e);
    };
    const clearHitFx = reason => {
        if (hit.fx.size || hit.pending.length) hit.stats.cleared++;
        for (const e of hit.fx.keys()) safe(() => root.ProjectRHitStop?.clear?.(e));
        hit.pending = []; hit.fx.clear(); hit.seDone.clear(); hit.seLast = -999;
        note({ type: "hitFxClear", reason });
    };
    // 敵の絵(Sprite_Character)だけに 点滅(blend color)と反動(位置のずらし)を足す。Game_Event には何も書かない(セーブに残らない)。
    if (typeof Sprite_Character !== "undefined") {
        const _updatePosition = Sprite_Character.prototype.updatePosition;
        Sprite_Character.prototype.updatePosition = function() {
            _updatePosition.apply(this, arguments);
            const fx = hit.fx.size ? hit.fx.get(this._character) : undefined;
            if (!fx || !(fx.amp > 0)) return;
            const t = (rt.frame - fx.start) / fx.recoilFrames;
            if (t < 0 || t >= 1) return;
            const s = t < 0.3 ? t / 0.3 : Math.pow(1 - (t - 0.3) / 0.7, 2);                 // すばやく押され、ゆっくり戻る
            this.x += fx.dx * fx.amp * s; this.y += fx.dy * fx.amp * s;
        };
        const _update = Sprite_Character.prototype.update;
        Sprite_Character.prototype.update = function() {
            _update.apply(this, arguments);
            const fx = hit.fx.size ? hit.fx.get(this._character) : undefined;
            const left = fx ? fx.start + fx.flashFrames - rt.frame : 0;
            if (fx && left > 0) { this.setBlendColor([255, 255, 255, Math.round(fx.flashAlpha * left / fx.flashFrames)]); this._projectRHitFlash = true; }
            else if (this._projectRHitFlash) { this.setBlendColor([0, 0, 0, 0]); this._projectRHitFlash = false; }
        };
    }
    const getHitFx = () => ({ config: JSON.parse(JSON.stringify(hitCfg)), listening: { ...hit.regs }, pending: hit.pending.map(p => ({ eventId: p.eventId, kind: p.kind, key: p.key, hp0: p.hp0, born: p.born })),
        active: [...hit.fx.values()].map(f => ({ eventId: f.eventId, kind: f.kind, start: f.start, flashFrames: f.flashFrames, amp: f.amp, dx: f.dx, dy: f.dy, stopUntil: f.stopUntil, life: f.life })), stats: { ...hit.stats } });
    const setHitFeedback = o => {
        const v = o && typeof o === "object" ? o : {};
        if (typeof v.enabled === "boolean") { hitCfg.enabled = v.enabled; if (!v.enabled) clearHitFx("disabled"); }
        for (const group of ["hitstop", "recoil", "flash"]) if (v[group] && typeof v[group] === "object") for (const k of ["melee", "heavy", "gun"]) if (Number.isFinite(Number(v[group][k])) && Number(v[group][k]) >= 0) hitCfg[group][k] = Number(v[group][k]);
        if (v.se && typeof v.se === "object") for (const k of ["melee", "heavy", "gun"]) if (k in v.se) hitCfg.se[k] = v.se[k] && v.se[k].name ? { name: String(v.se[k].name), volume: num(v.se[k].volume, 70, 0), pitch: num(v.se[k].pitch, 100, 50) } : null;
        return getHitFx().config;
    };
    ensureHitListeners();
    // 外部のスキル(Stage 2-E: Janus)が与えたダメージを、同じ手応え(点滅・反動・ヒットストップ・SE)に乗せる追加専用の入口。見た目だけ。
    // 呼ぶ側が、ダメージを出した直後に通知する(HP が実際に減ったことは onHit → hitTick が確かめる。減らなければ何も出ない)。heavy: true は強撃の手応え。
    const reportHit = o => {
        try {
            if (!o || !Number.isFinite(Number(o.enemyId))) return false;
            onHit({ enemyId: Number(o.enemyId), kind: "skill", step: o.heavy ? COMBO.max : 1, serial: String(o.serial === undefined ? "" : o.serial), degree: Number(o.degree), hp0: o.hp0 });
            return true;
        } catch (_error) { return false; }
    };

    // ------------------------------------------------------------------ 表示(スロットのHUD・敵の予兆) ----------------------------------------------------------------
    const reloadView = () => {
        const g = safe(() => root.ProjectRGunSystem?.status?.(), null);
        if (!g || !g.equipped) return { state: "noGun", ready: false, ammo: 0, capacity: 0, reserve: 0, equipped: false };
        const state = g.reloading ? "reloading" : g.ammo >= g.capacity ? "full" : g.reserve <= 0 ? "noReserve" : "ready";
        return { state, ready: state === "ready", ammo: g.ammo, capacity: g.capacity, reserve: g.reserve, equipped: true };
    };
    // 使えなかった直後(約1.5秒)は、枠の下の文字に理由を出す(Cooldown は COOL のまま)。Shift(絶)が「無反応」に見えないように、予約はできたが確定できなかった(壁・方向なし等)場合も出す。
    const NOTICE_FRAMES = 90;
    const FAIL_NOTICE = Object.freeze({ invalidMousePosition: "方向なし", noDestination: "進めない", blocked: "進めない", movementUnavailable: "動けない", playerMovementLocked: "動けない", playerThrough: "動けない",
        noTarget: "対象なし", noItem: "なし", cannotUse: "使用不可", noEffect: "効果なし", playerDead: "戦闘不能", battleInactive: "戦闘外", skillUnavailable: "使用不可" });
    const noticeOf = slot => {
        const r = rt.lastResult;
        if (!r || r.slot !== slot || r.frame === undefined || rt.frame - r.frame > NOTICE_FRAMES || rt.frame < r.frame) return null;
        let key = null;
        if (r.ok === false && r.reason !== "cooldown" && r.reason !== "menuOpen" && r.reason !== "interval" && r.reason !== "holding" && r.reason !== "holdDeferred") key = r.detail || r.reason;
        else if (r.ok === true && r.pending === true && (isRingSlot(slot) ? r.skillId === "hermes_zetsu" : slot === "mobility")) {             // 絶(どのキーでも): 予約のあと確定できなかった(壁・方向なし等)
            const z = safe(() => root.ProjectRHermesZetsu.getLastResult(), null);
            if (z && z.ok === false && z.reason !== "pending" && z.reason !== "reserved" && z.reason !== "teleportPending") key = z.reason;
        }
        return key ? FAIL_NOTICE[key] || "使用不可" : null;
    };
    // 黄金の矢 Lv3 のビームの状態: ready(撃てる)/ charging(0.25秒を過ぎて溜め中)/ active(ビーム中)/ cooldown(ビーム専用の6秒。通常の発射は撃てる)
    const beamView = id => {
        if (id !== "apollo_golden_volley" || !holdCapable(id)) return null;
        const cd = rt.beamCd[id] || 0, h = Object.values(rt.holds).find(x => x.skillId === id);
        const state = rt.beam && rt.beam.skillId === id ? "active" : (h && h.mode === "charge" && h.phase === "charge") ? "charging" : cd > 0 ? "cooldown" : "ready";
        return { state, cooldown: cd, total: BEAM_RULE.cooldownSeconds, ratio: cd > 0 ? Math.min(1, cd / BEAM_RULE.cooldownSeconds) : 0 };
    };
    const getHudState = () => {
        const gauge = safe(() => { const g = root.ProjectRUltimateGauge; const max = g?.getUltimateGaugeMax?.() ?? 0; return max > 0 ? { gauge: g.getUltimateGauge(), max } : null; }, null);
        const slotNames = ["ultimate", "mobility", "special", "reload", "consumable", "card1", "card2"];
        if (ringMode()) slotNames.push("attack");                                                    // 指輪ロードアウト: LMB も、ほかの4枠と同じスキルの枠(末尾に足す。既存の並びは変えない)
        const slots = slotNames.map(slot => {
            const d = slotDef(slot), cd = cooldownOf(slot);
            const total = Math.max(0.0001, cooldownSecondsOf(slot));
            let ready = cd <= 0, extra = null, state = cd > 0 ? "cooldown" : "ready";
            if (slot === "ultimate") {
                const kind = ringMode() ? ultimateHudKind() : null;                                  // 指輪モード: Q 枠が空 / 使えない指輪のとき(ゲージは出さない)
                if (kind) { ready = false; state = kind; extra = { ringId: rt.ultimate ? rt.ultimate.selected : null, empty: kind === "empty", reason: ultimateReason() }; }
                else { ready = !!gauge && gauge.gauge >= gauge.max; extra = gauge ? { gauge: gauge.gauge, max: gauge.max } : null; state = ready ? "ready" : "charging"; }
            }
            else if (slot === "reload") { const r = reloadView(); ready = r.ready; extra = r; state = r.state; }
            else if (slot === "consumable") {
                const item = selectedConsumable(), v = item ? itemView(item) : null;
                extra = v ? { id: v.id, name: v.name, iconIndex: v.iconIndex, count: v.count, usable: v.usable } : { id: 0, name: "", iconIndex: 0, count: 0, usable: false };
                ready = cd <= 0 && !!v && v.count > 0 && v.usable;
                state = !v ? "none" : v.count <= 0 ? "empty" : cd > 0 ? "cooldown" : !v.usable ? "unusable" : "ready";
            }
            if (isRingSlot(slot)) {                                                                  // 指輪ロードアウトの5枠: 入っているスキルの状態(空 / 薙ぎ払い / カード)
                if (!d.skillId) { ready = false; state = "empty"; extra = { skillId: null, empty: true }; }
                else if (d.kind === "combo") { ready = true; state = "ready"; extra = { skillId: d.skillId, combo: true }; }
                else { const known = safe(() => !!deck().definitions.card(d.cardId), false) && skillAvailable(d.skillId); ready = ready && known; state = !known ? "unavailable" : state; extra = { skillId: d.skillId, cardId: d.cardId, known }; }
            } else if (slot === "card1" || slot === "card2") { const known = safe(() => !!deck().definitions.card(d.cardId), false); ready = ready && known; state = !known ? "unavailable" : state; extra = { cardId: d.cardId, known }; }
            const bv = isRingSlot(slot) && d.skillId ? beamView(d.skillId) : null;                  // 黄金の矢 Lv3 のスロットだけ: ビームの状態(通常の Cooldown・ready とは別)
            return { slot, key: d.key, label: d.label, cooldown: cd, ratio: cooldownSecondsOf(slot) > 0 ? Math.min(1, cd / total) : 0, ready, state, extra, flash: rt.flash.slot === slot && rt.frame < rt.flash.until ? (rt.flash.ok ? "ok" : "ng") : null, notice: noticeOf(slot), ...(bv ? { beam: bv } : {}) };
        });
        const reload = reloadView();
        return { active: rt.active, mode: rt.mode, slots, attack: { key: "LMB", label: slotDef("attack").label }, gun: { key: "RMB", label: "射撃", ammo: reload.ammo, capacity: reload.capacity, equipped: reload.equipped },
            combo: getComboState(), item: slots[4], radial: getRadialState(), telegraphs: telegraphRecords().length + strongTelegraphs().length };
    };
    const telegraphRecords = () => {
        const api = enemyAttack(); if (!api || !rt.active) return [];
        return safe(() => api.list().filter(r => r && r.state === "pending" && eventVisible(map()?.event(r.eventId))), []);          // 隠れている敵の予兆は出さない(位置がもれる)
    };
    // 強敵の予兆(Stage 7A): 判定と同じ多角形(溜め = 淡い赤で濃くなる / 判定中 = 濃い赤と白い縁)。見えていない敵の予兆は出さない。
    const strongTelegraphs = () => { const sx = strongApi(); if (!sx || !rt.active) return []; return safe(() => sx.telegraphs().filter(r => eventVisible(map()?.event(r.eventId))), []); };
    const strongCues = () => { const sx = strongApi(); if (!sx || !rt.active || typeof sx.cues !== "function") return []; return safe(() => sx.cues().filter(r => eventVisible(map()?.event(r.eventId))), []); };
    // HUD: 既存の ProjectR_BattleHUD の5枠(スキル枠)に、固定アビリティを表示する(カードの手札・山札の表示は、フィールド戦闘の間だけ使わない)。
    //   BattleHUD のデータ元(DataAdapter)の skills() / cardCounts() を、フィールド戦闘の間だけ差し替える。HUDの描画・配置は既存のまま。
    const slotIcon = (def, item) => {
        if (def.kind === "card") return safe(() => root.ProjectRBattleHUD?.getCardPresentation?.(def.cardId) || null, null);
        if (def.kind === "item" && item) return { name: item.name, iconIndex: item.iconIndex, imageName: "" };
        if (def.kind === "reload") return { name: def.label, iconIndex: safe(() => ($dataItems.find(i => i && i.name === "弾薬") || {}).iconIndex, 0) || 0, imageName: "" };
        return null;
    };
    // 枠の下の短い状態の文字(detail)と色の種類(tone: ok / warn / ng / muted)。
    const slotDetail = (slot, view) => {
        if (!view) return { text: "", tone: "muted" };
        const x = view.extra || {};
        if (slot === "ultimate" && view.state === "empty") return { text: "---", tone: "muted" };    // 指輪モード: Q 枠が空(奥義なし。ゲージもない)
        if (slot === "ultimate" && view.state === "unavailable") return { text: "N/A", tone: "ng" };  // 未実装・未所持・未装備の指輪
        if (slot === "ultimate") return view.ready ? { text: "READY", tone: "ok" } : { text: x.max > 0 ? `${Math.floor(Math.max(0, Math.min(1, x.gauge / x.max)) * 100 + 1e-6)}%` : "--%", tone: "muted" };
        if (slot === "reload") {
            if (view.state === "noGun") return { text: "NO GUN", tone: "muted" };
            if (view.state === "reloading") return { text: "RELOAD…", tone: "warn" };
            return { text: `${x.ammo}/${x.capacity}`, tone: x.ammo <= 0 ? "ng" : view.state === "noReserve" ? "warn" : "ok" };
        }
        if (slot === "consumable") {
            if (view.state === "none") return { text: "NO ITEM", tone: "muted" };
            if (view.state === "empty") return { text: "×0", tone: "ng" };
            if (view.state === "unusable") return { text: `×${x.count} 不可`, tone: "ng" };
            if (view.notice && !(view.cooldown > 0)) return { text: view.notice, tone: "ng" };          // 使えなかった直後は理由(数量は、HUD がアイコンの右下に出す)
            return { text: `×${x.count}`, tone: view.state === "cooldown" ? "muted" : "ok" };
        }
        if (view.state === "empty") return { text: "---", tone: "muted" };                          // 指輪ロードアウト: 空の枠(何もしない)
        if (view.state === "unavailable") return { text: "N/A", tone: "ng" };
        if (view.notice && !(view.cooldown > 0)) return { text: view.notice, tone: "ng" };
        return view.cooldown > 0 ? { text: "COOL", tone: "muted" } : { text: "READY", tone: "ok" };
    };
    // 固定カードの表示名(BattleHUD の内蔵名は英語なので、実装済みのカードは日本語の名前で出す)
    const CARD_NAMES = Object.freeze({ apollo_golden_volley: "黄金の矢", apollo_gigas_slayer: "ギガース殺し", hermes_reed_flute: "葦笛", hermes_veil: "ヴェイル", hermes_psychopomp: "サイコポンポス", hermes_strength: "ストレングス", hermes_sweep: "薙ぎ払い" });
    // 指輪ロードアウト: スキルごとのアイコン(物理キーではなくスキルIDで決める)。新しい素材は使わず、既存の IconSet の番号だけ。
    //   薙ぎ払い・絶・一閃・黄金の矢は従来の枠と同じ番号。残りの6つは仮の番号(実機で見た目を確かめて、必要なら差し替える。BattleHUD の setCardPresentation があればそちらが優先)。
    const SKILL_ICON_DEFAULT = Object.freeze({ hermes_sweep: 76, hermes_zetsu: 82, hermes_issen: 78, apollo_golden_volley: 102, hermes_reed_flute: 79, hermes_strength: 77, apollo_eros_arrow: 103, apollo_lyre_rhythm: 81, apollo_laurel_wreath: 83, apollo_plague_rain: 104, janus_dual_gate: 76, janus_closed_gate: 84, janus_reflection: 85, janus_inversion: 86, janus_boundary_slash: 87, themis_edict: 88, themis_chain: 89, themis_balance: 90, themis_sin_mark: 76, themis_verdict: 91 });
    // Stage 6A: 5つの固定スキルのアイコン。新しい素材は使わず、既存の img/system/IconSet.png の番号を使う。
    //   優先順: BattleHUD の setCardPresentation / Skill の note <ProjectRCard> が決めたアイコン(あれば)> この既定。
    //   attack=薙ぎ払い(DBの薙ぎ払いスキル id173 と同じ 76)/ mobility=絶(82 ブーツ)/ special=一閃(78 閃光)/ card1=黄金の矢(102 弓)/ card2=ギガース殺し(70 光の柱)
    const SLOT_ICON_DEFAULT = Object.freeze({ attack: 76, mobility: 82, special: 78, card1: 102, card2: 70 });
    const SLOT_PRESENTATION_ID = Object.freeze({ attack: "hermes_sweep" });
    const slotIconOf = (slot, d) => {
        const ring = isRingSlot(slot);
        const presId = ring ? d.skillId : (SLOT_PRESENTATION_ID[slot] || d.cardId);                // 指輪ロードアウト: 入っているスキルで決める(空の枠はアイコンなし)
        const pres = presId ? safe(() => root.ProjectRBattleHUD?.getCardPresentation?.(presId) || null, null) : null;
        if (pres && (pres.iconIndex > 0 || pres.imageName)) return { iconIndex: pres.iconIndex || 0, imageName: pres.imageName || "", name: pres.name };
        return { iconIndex: ring ? (presId ? SKILL_ICON_DEFAULT[presId] || 0 : 0) : (SLOT_ICON_DEFAULT[slot] || 0), imageName: "", name: pres && pres.name };
    };
    const hudSlots = () => {
        const state = getHudState();
        const bySlot = Object.fromEntries(state.slots.map(s => [s.slot, s]));
        const make = slot => {
            const d = slotDef(slot), view = bySlot[slot];
            if (isRingSlot(slot) ? d.kind === "combo" : slot === "attack") {            // 薙ぎ払い(旧い固定 = LMB / 指輪ロードアウト = 入っているキー): 近接3段コンボ(進み具合)
                const ic = slotIconOf(slot, d), c = state.combo;
                return { mode: "field", key: d.key, slot, name: d.label, detail: c.finisherFlash ? "強撃!" : (c.step > 0 ? `${c.step}/${c.max}` : "READY"), tone: c.finisherFlash ? "warn" : "ok", accent: "",
                    iconIndex: ic.iconIndex, imageName: ic.imageName, skillId: 0, available: true, disabled: false, selected: c.step > 0 || c.finisherFlash, cooldown: { active: false, remaining: 0, total: 0 },
                    state: "ready", ratio: 0, alert: false, count: null, combo: { step: c.step, max: c.max, timeLeft: c.timeLeft, finisher: !!c.finisherFlash } };
            }
            const item = slot === "consumable" && view && view.extra && view.extra.id > 0 ? { name: view.extra.name, iconIndex: view.extra.iconIndex } : null;
            const pres = slot === "consumable" || slot === "reload" ? (slotIcon(d, item) || {}) : slotIconOf(slot, d);
            const cd = view ? view.cooldown : 0, baseDetail = slotDetail(slot, view), bv = view && view.beam ? view.beam : null;
            const detail = bv && bv.state === "active" ? { text: "BEAM", tone: "ok" } : bv && bv.state === "charging" ? { text: "CHARGE", tone: "warn" }
                : bv && bv.state === "cooldown" && baseDetail.text === "READY" ? { text: `B ${bv.cooldown.toFixed(1)}`, tone: "muted" } : baseDetail;          // 黄金の矢 Lv3: ビーム中・溜め中・ビームのCooldown中(通常の発射は撃てる)を、枠の下の文字に出す
            const name = slot === "consumable" ? (item ? item.name : d.label) : (isRingSlot(slot) ? d.label : ((slot === "card1" || slot === "card2") ? (CARD_NAMES[d.cardId] || pres.name || d.label) : d.label));
            const ready = !!(view && view.ready);
            return {
                mode: "field", key: d.key, slot, name, detail: detail.text, tone: detail.tone, accent: slot === "consumable" ? "item" : "",
                iconIndex: pres.iconIndex || 0, imageName: pres.imageName || "", skillId: 0, ...(isRingSlot(slot) ? { fieldSkillId: d.skillId || null, empty: !d.skillId } : {}),
                available: !!(view && (view.ready || cd > 0)), disabled: !(view && view.ready),
                selected: !!(view && (view.flash === "ok" || (slot === "ultimate" && view.ready))), cooldown: { active: cd > 0, remaining: cd, total: cooldownSecondsOf(slot) },
                // Stage 6A: HUD が状態を読みやすく描くための追加(cooldown=待ち中 / ready=使える / unavailable=使えない)。ratio は Cooldown の残り割合(1 → 0)
                state: cd > 0 ? "cooldown" : ready ? "ready" : "unavailable", ratio: view ? view.ratio : 0, alert: !!(view && view.notice && !(cd > 0)),
                count: slot === "consumable" && view && view.extra ? view.extra.count : null, combo: null, ...(bv ? { beam: bv } : {})
            };
        };
        return ["attack", "mobility", "special", "card1", "card2", "consumable"].map(make);      // メイン5枠(LMB 薙ぎ払い / Shift 絶 / E 一閃 / X・C 固定カード)+ 別枠の V アイテム。Q 奥義・R リロード・右クリックの銃は、HUDの枠には出さない(操作はそのまま使える)
    };
    const installHud = () => {
        const proto = root.ProjectRBattleHUD?.DataAdapter?.prototype;
        if (!proto || proto.__projectRFieldCombat) return;
        const _skills = proto.skills, _counts = proto.cardCounts;
        proto.skills = function() { return rt.active ? hudSlots() : _skills.apply(this, arguments); };
        proto.cardCounts = function() { return rt.active ? null : _counts.apply(this, arguments); };
        // 指輪モードの Q は、戦闘中は常に Ultimate 区画に出す(Stage 1E-3): 空 = 暗い Q + 「未設定」/ 割り当て済みで使えない = 暗い Q + 「使用不可」。どちらもゲージ・神のパネルは出さない。
        //   使える Q(充填中・READY・発動中・発動後)は従来どおりの表示。legacy・戦闘外・SOUL は何も変えない。
        const _ultimate = proto.ultimate, _divine = proto.divine;
        const dimmedQ = kind => ({ mode: "card", available: false, state: "none", value: 0, max: 0, progress: 0, full: false, ready: false, key: "Q", keyActive: true, executing: false, ...(kind === "empty" ? { slotEmpty: true } : { slotUnavailable: true }) });
        proto.ultimate = function() {
            const data = _ultimate.apply(this, arguments);
            const kind = rt.active && ringMode() ? ultimateHudKind() : null;
            return kind ? dimmedQ(kind) : data;
        };
        if (typeof _divine === "function") proto.divine = function() {
            const data = _divine.apply(this, arguments);
            return rt.active && ringMode() && ultimateHudKind() ? null : data;                            // Q が空・使えないときは、神のパネル(DIVINE HP)も出さない
        };
        proto.__projectRFieldCombat = true;
    };
    installHud();
    // 奥義のキー表示も Q にそろえる(Uキーも従来どおり使える)。
    safe(() => {
        const ua = ultimate();
        if (ua && typeof ua.getInputBinding === "function") {
            const original = ua.getInputBinding;
            ua.getInputBinding = function() { const b = original.apply(this, arguments); return rt.active && b ? { ...b, key: "Q", active: true } : b; };
        }
    });

    // 予兆: ProjectREnemyAttack の予約の記録(いま溜め中の攻撃)を、そのまま赤く描く。予約が取り消されれば、予兆も同時に消える。
    let layerState = null;
    const createLayer = scene => {
        if (typeof PIXI === "undefined") return;
        const layer = new PIXI.Container();
        const tele = new PIXI.Graphics();
        layer.addChild(tele);
        const index = scene._windowLayer ? scene.getChildIndex(scene._windowLayer) : scene.children.length;
        scene.addChildAt(layer, Math.max(0, index));
        layerState = { scene, layer, tele };
    };
    const tw = () => (map()?.tileWidth?.() ?? 48), th = () => (map()?.tileHeight?.() ?? 48);
    const toScreen = (tx, ty) => ({ x: map().adjustX(tx) * tw(), y: map().adjustY(ty) * th() });
    const drawTelegraphs = g => {
        g.clear();
        for (const r of telegraphRecords()) {
            const progress = r.windup > 0 ? 1 - r.framesLeft / r.windup : 1;
            const fill = 0.16 + 0.34 * Math.max(0, Math.min(1, progress));
            if (r.area) {
                const p = toScreen(r.area.x, r.area.y);
                g.beginFill(0xff2a2a, fill); g.lineStyle(2, 0xff6666, 0.85);
                g.drawRect(p.x, p.y, r.area.width * tw(), r.area.height * th()); g.endFill();
            } else if (r.origin && Number.isFinite(r.degree)) {
                const o = toScreen(r.origin.x, r.origin.y), len = (r.length || 6) * tw(), rad = r.degree * Math.PI / 180;
                const ex = o.x + Math.sin(rad) * len, ey = o.y - Math.cos(rad) * len, w = 0.5 * tw();
                const nx = Math.cos(rad) * w / 2, ny = Math.sin(rad) * w / 2;
                g.beginFill(0xff2a2a, fill); g.lineStyle(2, 0xff6666, 0.85);
                g.drawPolygon([o.x - nx, o.y - ny, o.x + nx, o.y + ny, ex + nx, ey + ny, ex - nx, ey - ny]); g.endFill();
            }
        }
        for (const r of strongTelegraphs()) {
            const pts = []; for (const q of r.polygon) { const sp = toScreen(q.x, q.y); pts.push(sp.x, sp.y); }
            const lk = r.look || null;                                                              // 中ボスのフェーズ2は、予兆の色がオレンジ(形・時間は同じ)
            if (r.phase === "active") { g.beginFill(lk ? lk.fill : 0xff1a1a, 0.62); g.lineStyle(3, 0xffffff, 0.95); } else { g.beginFill(lk ? lk.fill : 0xff2a2a, 0.16 + 0.34 * Math.max(0, Math.min(1, r.progress))); g.lineStyle(2, lk ? lk.line : 0xff6666, 0.85); }
            g.drawPolygon(pts); g.endFill();
        }
        for (const r of strongCues()) {                                                             // 中ボスの遷移の輪(金色の輪。攻撃ではない)
            const pts = []; for (const q of r.polygon) { const sp = toScreen(q.x, q.y); pts.push(sp.x, sp.y); }
            g.beginFill(0xffd24a, 0.10 * (1 - r.progress)); g.lineStyle(4, 0xffe27a, 0.95 * (1 - 0.5 * r.progress)); g.drawPolygon(pts); g.endFill();
        }
    };
    const refreshLayer = scene => {
        const L = layerState;
        if (!L || L.scene !== scene || L.layer.destroyed) return;
        L.layer.visible = rt.active;
        if (rt.active) drawTelegraphs(L.tele);
    };

    // 絶(Shift)の瞬間移動は、エンカウンター中、敵の体に止められない(壁・閉じた扉・通れない地形では、これまでどおり止まる)。着地は、敵の体と重ならない位置。
    const isEnemyBody = o => rt.active && !!o && typeof o.eventId === "function" && (rt.enemies.has(o.eventId()) || enc.attached.has(o.eventId()) || o.databaseEnemy === true || /<enemy>/.test(safe(() => String(o.event().note), "")));
    safe(() => root.ProjectRHermesZetsu.registerCollisionFilter(isEnemyBody));

    // ------------------------------------------------------------------ 公開API ----------------------------------------------------------------
    root.ProjectRFieldCombat = Object.freeze({
        VERSION: "0.9.0", SOURCE,
        begin, end, isActive: () => rt.active,
        getState: () => ({ active: rt.active, engaged: rt.engaged, encounter: enc.state, serial: rt.serial, frame: rt.frame, enemies: [...rt.enemies.values()].map(b => ({ eventId: b.eventId, state: b.state, attacks: b.attacks, cooldown: b.cooldown })), diagnostics: { ...rt.diag }, pending: rt.pending.length, touchAssists: rt.touchAssists }),
        getLoadout: () => JSON.parse(JSON.stringify(ringMode() ? Object.fromEntries(Object.keys(LOADOUT).map(slot => [slot, slotDef(slot)])) : LOADOUT)),          // 指輪ロードアウトの戦闘中は、5枠にいま入っているスキル(skillId / cardId / label / kind)
        getUltimateState: () => ({ mode: rt.mode, active: rt.active, selected: rt.ultimate ? rt.ultimate.selected : null, ringId: rt.ultimate ? rt.ultimate.ringId : null, reason: rt.active && ringMode() ? ultimateReason() : null }),      // 指輪モードの奥義(Q): 開始時の写しと、いま使えるか(reason = null なら使える。ゲージは別)
        getCooldowns: () => ({ ...rt.cooldowns }),                                                  // 指輪ロードアウト: スキルIDごと(+ ultimate / consumable)/ 旧い固定: スロットごと
        // 指輪ロードアウト(Stage 1D-1)
        getLoadoutMode: () => (rt.active ? rt.mode : loadoutMode()),                                // "ring" | "legacy"
        getSlotSkills: () => ({ mode: rt.mode, ...rt.loadout }),                                    // 戦闘開始時の写し(lmb / shift / e / x / c = スキルID or null)
        getHoldState: () => ({ holds: Object.values(rt.holds).map(h => ({ ...h })), log: rt.holdLog.map(e => ({ ...e })), lmbDown: rt.lmb.down }),          // ホールドの記録(Lv3 ビームは Stage 1D-2 でここへつなぐ)
        getGates: () => ({ ...rt.gates }),
        getBeamState: () => ({ active: !!rt.beam, beam: rt.beam ? { ...rt.beam } : null, cooldowns: { ...rt.beamCd }, holds: Object.values(rt.holds).map(h => ({ slot: h.slot, skillId: h.skillId, mode: h.mode, phase: h.phase })), speedFactor: safe(() => root.ProjectRCardModifiers.moveSpeedFactor(), 1) }),          // 黄金の矢 Lv3 のビーム(Stage 1D-2A)
        getBeamRules: () => ({ ...BEAM_RULE, tapFrames: BEAM_TAP_FRAMES, startFrames: BEAM_START_FRAMES, durationSeconds: safe(() => root.ProjectRApolloGoldenVolley.heldBeamRules.seconds, null), hitSeconds: safe(() => root.ProjectRApolloGoldenVolley.heldBeamRules.hitSeconds, null), repeatIntervalSeconds: SKILL_DEFS.apollo_golden_volley.interval }),
        interruptHold: reason => { const r = String(reason === undefined || reason === null || reason === "" ? "api" : reason); const n = interruptHolds(r); return { ok: true, reason: r, interrupted: n }; },          // 回避・怯み・スタンなどの中断の入口(溜め = 取り消し / ビーム中 = 終了 + 6秒のCooldown)。通常のHPダメージでは呼ばない                                                          // スキルIDごとの発射間隔の残り(秒)
        setLoadoutSource: source => { if (rt.active) return false; if (source === "legacy" || source === "auto") { rt.devSource = source; return true; } if (source === null) { rt.devSource = null; return true; } return false; },          // DEV(保存しない)。次の begin から有効。legacy = 旧い固定スロット
        getLoadoutSource: () => configuredSource(),
        getSkillDefs: () => JSON.parse(JSON.stringify(SKILL_DEFS)),
        useAbility, cancel, getHudState, getHudSlots: hudSlots,
        attackClick, fireGun, getComboState, getComboConfig: () => JSON.parse(JSON.stringify({ ...COMBO, timeout: comboTimeout() })), getSweepVfxKey: () => sweepVfx(), listConsumables, selectConsumable, getSelectedConsumable: () => { const i = selectedConsumable(); return i ? itemView(i) : null; },
        getRadialState, openRadial, closeRadial, getHitFx, setHitFeedback, reportHit, getMeleeDamageSource, setMeleeDamageSource, getItemHoldFrames: () => ITEM_HOLD_FRAMES, getControlStats: () => ({ combo: getComboState(), gun: { ...rt.gun, last: rt.gun.last && { ...rt.gun.last } }, item: { ...rt.item }, radial: getRadialState(), diag: { ...rt.diag } }),
        getLastResult: () => (rt.lastResult ? JSON.parse(JSON.stringify(rt.lastResult)) : null),
        getLog: () => rt.log.map(e => ({ ...e })),
        attachEnemy, detachEnemy, listEnemies: () => [...rt.enemies.keys()],
        isEnemyAsleep: eventId => { const e = map()?.event(Number(eventId)); return !!e && enemyAsleep(e); },          // 葦笛の睡眠ステートがあるか(Stage 1D-2B)
        getEnemySleep: eventId => { const b = rt.enemies.get(Number(eventId)); return b ? { asleep: !!b.asleep, sleeps: b.sleeps || 0, interrupted: b.slept || 0 } : null; },
        getEnemyNav, findNavPath, invalidateNavCache, getSoftPass: () => [...rt.soft.keys()], setSoftCollision: on => { cfg.softCollision = !!on; if (!on) clearSoft(); return cfg.softCollision; }, setPathfinding, isPathfinding: () => navState.enabled, resetPathfinding: () => setPathfinding(navDefault), getNavStats: () => ({ ...navStats, why: { ...navStats.why }, lastError: navState.lastError }), resetNavStats,
        getEnemyPerception, getPerception: () => ({ enabled: cfg.perception, sightTiles: cfg.sightTiles, fovDegrees: cfg.fovDegrees }), setPerception, resetPerception,
        getVisibleEnemies: () => [...rt.enemies.keys()].filter(id => eventVisible(map()?.event(id))),
        setDevAllowOutsideEncounter: on => { cfg.devAllowOutside = !!on; return cfg.devAllowOutside; },
        isCombatAllowed,
        startEncounter, transferToBattleMap, completeEncounter, abortEncounter, getEncounterState, onEncounterResult,
        getConfig: () => ({ ...cfg }),
        getSoulMode: () => cfg.soulMode,
        setSoulMode: mode => { if (!["off", "dev", "on"].includes(mode)) return false; cfg.soulMode = mode; return true; },
        isSoulAllowed
    });
})();
