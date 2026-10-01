# ProjectR Card Skill Deck v0.3.5

## Phase 3.4.1：Map010 Debug Arenaの武器Facing補完

対象はDebug有効・Map010・MapInfos名がProjectR Card Test Arenaのときだけ。Map001への二重照準処理は追加しません。JSON・保護Pluginは変更しません。

- Gun原因：Map001の銃エイム制御Parallel Eventに相当する継続照準がMap010にない。CardSkillDeckのScene_Map更新後で補完し、移動中もFix OFF → 公式turnToward('mouse or gamepad', false) → Fix ON。クリック有無に依存しません。非Gun・Message/Event/Scene LockではMap001同様Gun固定を解除します。
- Sword原因：CE4の向き固定OFF→照準取得→Swing→Hitboxは正常。しかしSwing期間の固定がなく、DotMove CharacterMover.dotMoveByDeg→setDirection→Game_CharacterBase.setDirectionにより歩行方向へ戻せる。公式Swingは開始時方向を別に保持するため、Spriteだけがずれる。
- 修正：BeginMainAttack時に攻撃前Fixを保存。既存CEの照準計算後、SwingWeapon開始直前に確定済みDirectionを固定。攻撃Aim、Swing引数、Hitbox分岐、Damage計算は変更しません。
- 終了判定は生成された公式Sprite_WeaponSwingインスタンスの_duration<0／親からの除去。テスト等でSpriteが存在しない場合だけspeed+1フレームで解除。固定を攻撃前状態へ戻します。連続Swing・装備変更・転送・Scene終了・戦闘終了・例外でも所有する固定を解除します。
- 移動入力や座標更新を止めず、Direction Fixだけ使用。Sword中のMouse移動で方向を変えません。次の攻撃は既存CEで再照準します。
- Debug Trace：Sword attack accepted、Sword swing facing frozen、Sword movement facing held、Arena facing restoredにframe、Direction、移動入力、Fix、解除理由を記録。実ソース抽出テストで固定なしの歩行上書きと固定中の防止を確認。
- Phase 3.4の二段階Card入力・クリック消費・Pile/ENERGYとPhase 3.3 VFX、Reshuffleは変更しません。Gamepad検出仕様は公式helperのまま。今回の原因としてGamepad接続は扱いません。

### 実機再確認

1. 専用worktreeを再起動しCARD TESTへ。GunでMouse上＋D移動、Mouse右＋A移動などを試し、歩行先でなく照準方向を向くことを確認。
2. Mouseカードを選択・確定・キャンセル。確定時はカードだけ発射、次クリックでGun、継続Facingが復帰することを確認。
3. SwordでMouse上＋D、Mouse右＋A、Mouse左＋S、Mouse下＋W。移動を続けたままSprite/Swing/Hitbox方向が一致し、Swing後は歩行方向へ戻ることを確認。
4. Swing中のMouse移動、次Swing、Gun⇔Sword、会話/Menu終了、CARD TEST退出で固定が残らないことを確認。
5. Map001の従来動作、Gun/Sword命中ENERGY+1、Card命中+0、30枚Reshuffle、VFX、ITEM/WEAPON、F8赤エラーなしを再確認。

自動テストは実機フレーム順・DotMove物理全体の代替ではありません。MZの自動起動、Stage/Commit/Pushは行いません。

## Phase 3.4：Mouse Card 2-stage casting

本章はMouseカードの操作タイミングについて優先します。Phase 3.3の角度・Projectile・VFXと戦闘計算は維持します。

- Q/E/X/C/V：Nearestは即発動。`<CardTarget:Mouse>`は照準選択のみ。選択時はENERGY・手札・山札・捨札・Action Context・CE・攻撃VFXを変更しません。
- 左クリック押下端：現在のプレイヤー画面座標とクリックのcanvas座標から照準確定。接続パッドよりクリックを優先し、immutable Contextへ`aimSource: "mouse"`と角度を保存します。移動やスクロール後も選択時座標を流用しません。
- 発動可能条件・ENERGY・選択カードを再検査し、既存CE開始処理が成功した場合だけコスト消費→Discard→Draw。補充カードは自動選択しません。
- 確定クリックはdocument capture段階で消費します。公式Keyboard/GamepadのMain Attack入力とMZ TouchInputへ渡さず、移動先も解除。対応するmouseupまで消費し、次の新しいクリックは通常攻撃に戻します。
- CARD TEST/RETURN/ENERGY MAXと表示中のマップMenuボタンは照準確定より優先。Scene_Map以外、メッセージ・選択肢・イベント・死亡・遷移中は発動不可。
- 右クリック／Escape／同じスロット：キャンセル。最初のEscapeはMenuへ渡さず、離して再度押すと通常操作。別スロットは旧選択を解除して新カードを処理します。
- 選択時ENERGY不足は選択拒否。確定時不足は選択保持。Buzzerと約120フレームのNOT ENOUGH ENERGY表示。失敗時はコスト・カードを消費しません。
- 同じフレームのスロット選択とクリックは選択だけ。次フレーム以降の新しい押下が必要。長押し・ダブルクリックでも補充カードは発動しません。
- 選択枠のAIM強調、140pxの半透明ガイドと操作ヒントを表示。GraphicsとBitmapはSceneで生成して再利用。ガイドはプレイヤー移動・マウス移動に追従します。
- Runtime内のaimingは保存対象外。戦闘エリア退出、endCombat、マップ転送、ロード、Scene終了、フォーカス喪失で解除。既存Save禁止仕様は変更しません。
- API：`selectSlot(index)`はUIと同じ選択操作、`isAiming()`、`aimingSlot()`（非選択時-1）、`cancelAiming()`。互換性のため既存`useSlot(index, caller)`／UseCardSlotコマンドはスクリプト用の即時発動APIを維持。
- Debug時はガイド付近にスロット・スキル・選択フレーム・現在マウス座標・角度・状態、debugSnapshotにaiming情報。debugTraceには選択、確定、入力消費、角度固定、CE受理、コスト消費、Discard/Draw、解除理由を記録。
- 新Gamepad Confirmは未実装。既存即時APIのGamepad Aimは維持。左クリック確定のみMouse優先です。

### 実機確認

1. 専用worktreeで再起動し、CARD TESTへ入りENERGYを補充。
2. 天王風／海王水槍のスロットを押し、照準表示だけ出てコスト・手札が変わらないことを確認。
3. 選択後に移動・スクロール・マウス移動し、8方向と斜め任意角度へクリック。現在位置から1発だけ出て、Gun弾やクリック移動が同時に発生しないことを確認。
4. 発射後のマウス移動で弾が曲がらず、次クリックは通常攻撃になることを確認。
5. 右クリック、Escape、同スロット、別Mouse／Nearest、同フレーム入力、長押し、ダブルクリックを確認。
6. ENERGY不足、UIボタン、Menu、会話／選択肢中の誤発射がないこと、戦闘終了・転送で照準が消えることを確認。
7. Gun/SwordのDamageとENERGY+1、Card+0、30枚Reshuffle、9属性VFX、HUD、ITEM/WEAPON、F8赤エラーなしを再確認。

自動テストは実機での描画・入力順・音声確認を代替しません。Stage/Commit/Pushは実施しません。

## Phase 3.3：Mouse照準とVFX（2026-09-30）

現行仕様は本章を優先。Phase 3.2のGun/Sword/ENERGY/Card Damage/Reshuffleは実機合格済みで、ロジックを維持します。ItemEquip、CommonEvents、保護Plugin、画像は変更しません。

### 座標・角度の診断

- TouchInput.x/yはGraphics.pageToCanvasX/Y後の画面ピクセル座標。MZのcanvasToMapX/Yはfloorしたタイル整数を返すため、連続角度の計算には使いません。
- DotMoveのpositionPointは_realX/_realY、centerPositionPointはcenterRealX/Y。MZのscreenX/Yは_realX/Yから画面スクロールを差し引き、描画のオフセットを加えた画面座標です。AEのmount/jump補正もscreenX/Yに含まれます。
- AE rotateTo('mouse or gamepad')はscreenX/Y基準の連続角度（度、上0、時計回り）を使用。turnTowardのMouse分岐は整数タイルから4/8方向を決めるため、Projectileの連続角とは役割が異なります。
- 旧Cardコードは使用時とProjectile生成時に照準を再取得し、Contextへ角度を保存していませんでした。また公式helperは接続済みPadがdeadzone内の場合Mouse分岐を通らない場合があります。
- ASのコマンド角度は度、内部Sprite.rotationはラジアン。ASは回転可能なTargetのSprite角度を加算します。従来のTrailは弾の角度を二重に加える可能性がありました。
- ASのstickMode=trueはマップ上の初期位置へ固定です。旧Trailはtrueを渡していたため、飛翔する弾に追従しませんでした。
- 素材Electric_Dash_Lineは実画像では放射状の電光Sheetで、矢印のような固有前方はありません。推測の90度補正は行わず、3素材ともrotationOffset=0を定義。追加Layerの90度は演出上の回転です。

### Immutable Aim Context

- Skill164/165を含むMouse Cardは敵不要。使用時のPlayer screenX/Y→TouchInputの差からatan2(dx,-dy)を度へ変換し、0以上360未満に正規化。
- 公式checkGamepadInputの有効な右Stick（各軸0.1超）を優先。接続だけではMouseを抑止せず、deadzone時はMouseへ戻します。
- CursorがPlayer画面位置から1px以内、または非有限値なら現在向きへFallback。NaN/Infinityを角度として保存しません。
- ContextにaimAngle、aimSource（mouse/gamepad/facing）、入力時のMouse・Player画面座標と実座標を保存してObject.freeze。Playerの4/8方向もこの値から決定。方向固定フラグは元へ戻します。
- Projectileには既存AEのOrigin/CustomRotation/_applyRotationを使い、保存済み角度を一度だけ適用。発射後のCursor移動や別Cardで既存弾の向きは変わりません。Nearestの敵選択・照準・攻撃範囲は変更しません。
- PlayerとMouseを同じ画面座標系で比較するためMap scroll中も方向一致。canvasToMapの整数化を挟みません。

### Registry / 9属性VFX

- 既存9エントリをlaunch/trail/impact/layerへ拡張。既存3画像のみ使用、追加Assetなし。
- Mercury：青白の小Flash、銀青Trail、青白Burst。
- Venus：黄白の大きめ円形Launchと黄白Impact。
- Earth：土緑のSmokeを近接位置へ大きく表示。
- Mars：赤橙のElectric Launchと大きい火花Burst。攻撃方向の角度を使用。
- Jupiter：紫から黄白へ変更。Burstに黄白Electric Layerを重ねる。
- Saturn：金色Discと遅延・縮小・回転Layerで環を強調。
- Uranus：淡青の小さめTrail。Neptuneより細く見えるサイズ。
- Neptune：濃青、Uranusより大きいTrail、低fpsの飛翔演出。
- Pluto：小さい黒紫収束Launch、拡大Smoke、遅延した赤紫Layer。
- Trailは旧scaleの1.4倍、Impactは原則1.6倍（最大345%）。Launchは約0.2秒、Impactは0.5～0.58秒、TrailはProjectile寿命で終了。演出の視認性は実機で再確認が必要です。
- 公式Show Animated Pictureの正規パラメータだけで再生・サイズ・fps・遅延等を指定。青い元素材への乗算Tintだけでは黄色にならないため、所有SpriteのMZ ColorTone/BlendColorで属性色を付けます。共有Bitmapは変更しません。

### Direction / Lifecycle / Debug

- TrailはstickMode=false、Launch/Impactはtrue。MouseのTrail/ImpactはContextのaimAngleを共通利用。
- ASのTarget角度加算分を除いたコマンド値を渡し、さらに所有AnimatedPictureインスタンスのupdatePosition後だけ最終Sprite角度を固定。Sprite更新順による1フレーム遅れや二重加算を防ぎます。公式prototypeは変更しません。
- Collision時のImpactはDamage 0でも表示。ダメージ計算・ENERGY判定は変更せず、演出呼び出しだけをDamage成功分岐の外へ移しました。
- 各VFXはAction ID＋VFX serial＋実インスタンスで所有。Range/Wall/Transfer/End時に該当Trailをdisposeし、他の弾を消しません。実オブジェクト参照でID再利用にも対応。
- 画像存在確認はPromiseをキャッシュ、画像は既存PermanentImageCache。毎フレームのBitmap生成・ロード・Registry parseはしません。欠損素材は演出のみ省略します。
- Debug+Overlay時に専用パネルを表示。カード名、Aim Source、Mouse座標、Aim/Projectile/実Sprite VFX角、角度差、Launch/Trail/Impact/Cleanupを表示。角度差は360/0境界を折り返します。
- Debug Aimガイド線は追加していません。角度パネルとTrailで確認します。

### 検証・実機確認

- 既存346ケースを維持し、旧VFXの誤ったstickMode/二重角度や再照準呼び出しを期待したassertionは、新しい最終表示角とContextへ更新。
- Phase 3.3追加52ケース：2Skill×8方向と任意角、スクロール、同一点、発射後Mouse移動、複数弾、公式Pad deadzone、実AS updatePositionでの追従・回転、消去経路、9Registry、Damage0 Impact、欠損素材など。
- MZは自動起動しません。古いテストプレイを終了し、専用worktreeでv0.3.3を再起動してください。
- CARD TESTで天王風／海王水槍を8方向と斜め30/120/225度へ発射。直後にMouseを逆へ動かして既存弾が曲がらないことを確認。
- Player移動／カメラスクロール中、CursorをPlayerに重ねた時、Pad右Stickとdeadzoneで確認。Debugの角度差はほぼ0が基準。
- 9属性の発動・Trail・Impactと、壁／射程終端／RETURN／戦闘終了の残留VFXがないことを確認。必要に応じENERGY MAXを利用。
- Gun/Sword +1、Card +0、Reshuffle30枚、HUD、ITEM/WEAPONを回帰確認。実機の演出品質・実入力は自動テストとは別途確認が必要です。
- Stage/Commit/Push/Merge/Rebaseは行いません。

## Phase 3.2：戦闘ロジックと診断（2026-09-30）

この章はPhase 3.2の履歴です。Phase 3.3で明示した照準・演出以外は維持します。ItemEquipはv0.1.1のままです。

### HPとGun / Card Damage

- 実機Traceのgun:3:1は発射、生成、衝突まで伝播済み。Token生成・保持方式は変更しません。
- AE 1.6.6bの通常敵ではUpdateEventHp→Game_Interpreter.updateEventHpが、対象と同じイベントインスタンスのHPバーcurrentHp/targetHpを同期的に更新します。一方、getCurrentEventHpはhpStorageIdの変数を優先し、この変数の反映は後のHPバーupdateHpChangeです。
- したがってコマンド直後の保存用HPが同値でも、実HPが減っている場合があります。Card側のdamageHpは通常敵のHPバー実値を優先し、それ以外は公式getterを利用します。公式データへの書き込みや遅延タイマーは追加していません。
- CE3は開始後、最初の条件でCollisionを判定し、Animation/Knockback/UpdateEventHpへ進みます。CollisionがCE3を新規起動する構造ではありません。通常の非待機経路ではCollisionとHP更新は同じフレームです。CE3末尾のwait終了は別フレームです。
- Debug TraceにCE3 start、Collision、Before/After UpdateEventHp（実HPとstoredHp）、HP、ENERGY、CE3 endを記録。空振りの常時CE3監視はログを埋めないよう記録しません。
- HPが実際に減った有効な通常攻撃TokenだけENERGY+1。同一Tokenは1回、上限10。Card Projectileは回復対象外。水星弾にも同じ実HP確認と前後Traceを適用。
- 提供された実機TraceのCollision/既存HP確認はframe 1922。修正後の実機フレームとダメージ値は未取得。公式コードを用いた自動テストでは同一フレームに実HP 996→986、storedHp 996のままでGun +1を確認する構成です。

### Sword

- CE4のEvent 1固定Collision/HP更新ブロックをResolveSwordHitboxへ置換。SwingWeapon、SE、方向処理、既存4方向のHitbox生成命令は維持。
- Card側でCE4の生成引数にSWORD_HITBOX_SCALE=1.35と前方1.25タイル（旧1.1から+0.15）を適用。
- 上下：幅1.5/奥行1.2→2.025/1.62。左右：幅1.2/高さ1.5→1.62/2.025。正負の向きは対称、背後・遠い真横は対象外。
- Swing固有タグ付きの公式Dynamic Hitboxを生成。既存tagToEventsの<enemy>索引から生存対象を取得し、公式checkCollideと-player weaponを使用。独自敵リスト／Damage Engineは作成しません。
- 各Swing/各Event IDは最大1ダメージ。複数敵に当たってもENERGYは同じTokenで合計+1。命中窓は既存Hitboxのまま延長しません。
- DebugとOverlayが両方有効な場合だけ白／命中時黄色の境界を表示。公式SwingWeaponのspeed（今回10フレーム）で破棄。境界は命中時の位置の診断表示で、ダメージ判定の寿命を伸ばしません。

### Reshuffle / 診断

- 既存のDiscard→Shuffle→Draw順は維持。途中の使用済みHand枠をnullにし、After Discardで二重計上しないようにしました。
- 正確な例：Before H5/D0/X25→After Discard H4/D0/X26→Shuffle H4/D26/X0→After Draw H5/D25/X0。使用直後の1枚も候補です。
- Runtime欠損は自動テストで再現していません。130回使用・繰り返しShuffleでも30枚の枚数とカード内訳を比較します。
- Debug OverlayにHP前後、Projectile ID、Sword範囲／対象、4段階のPile状態を追加。ENERGY MAXはDebug時のみでENERGYを10にするだけ。デッキ・手札・山札は変更しません。
- VFXのrequest/accepted/sprite created/submitted（名前、対象、回転、期間）、Mouse位置／プレイヤー位置／マウス角／実Projectile角／VFX角をConsole Traceへ追加。画像、Preset、Mouse照準・弾道ロジックは変更しません。ゲームパッド時はマウス角と一致する必要はありません。
- Debugパラメータの現在値は保持し、登録テストをヘッダー初期値と現在のboolean値の形式の検査へ分離。

### 検証と実機手順

- 既存303件にPhase 3.2の43件を追加。公式HP更新／保存値同期の差、4方向×Event 1/2/9/77、除外、範囲、複数敵、30枚内訳、Debug UI、VFX/Mouse診断を検査。
- 自動テストはMZ/PIXI描画や実入力・実セーブの確認を代替しません。MZは自動起動していません。
- 古いテストプレイを終了し専用worktreeから再起動。バージョン0.3.2を確認。CARD TESTでGun単発のHP減少と+1、空振り+0、Swordの4方向・複数敵・背後、Cardは回復なしを確認。
- ENERGY MAXを使い26回以上Cardを使って、空山札時の4段階Traceと最終H5/D25/X0を確認。Uranus/Neptuneの向きとVFX診断も取得。
- 探索／戦闘HUD、RETURN、ITEM/WEAPON、Gun/Sword切替の実機回帰確認を行う。Stage/Commit/Push/Merge/Rebaseはしない。

## Phase 3.1：現在の仕様（2026-09-28）

CardSkillDeck v0.3.1 / ItemEquip v0.1.1。Bug Fix / Integrationのみ。
この章はPhase 3.1の履歴です。Phase 3.2で明示した箇所以外は維持します。
旧Phase 3の「Map開始で自動Start」「探索中もCard HUD表示」「F6のみ」「武器配布なし」は本章で置き換えています。

### P31-1. 作業範囲

- 専用worktree：`C:\Users\hmats\Documents\RMMZ\ProjectR-CardDeck`、`feat/card-skill-deck`。
- HEAD：`e37f7f272fd8cd5b8abc5b1534a94aa27a5feb49`。Stage / Commit / Push / Merge / Rebaseなし。
- 編集はCardSkillDeck、ItemEquip、plugins.js、当仕様書、テストの5ファイルのみ。
- 元ProjectR、MZコア、Hendrix4本、DotMove、BattleHUD、MenuHUD、CombatPresence、PlayerFacingを編集しない。
- Map001 / Map002 / Map010、MapInfos、CommonEvents、Skills、System、画像等の既存変更を維持。
- 実機で確認済みなのはユーザー申告のHUD重複・F6不動・ITEM装備不可の症状。Gun / Sword / 属性 / VFX / Mouse Card / Reshuffleは今回も実機未確認。下の自動検査は実機検査の代わりではない。

### P31-2. 3つの原因

1. **HUD重複**：v0.3.0はAlwaysShowCardHud=trueで、Card Runtimeがinactiveでも空の5枠を表示。一方、旧SkillHUDを隠す条件はruntime.activeだけだった。未完成デッキでは両者が同時表示されていた。
2. **F6**：Hendrix Keyboard/GamepadはcharToKeyCodeの全物理キーをInput.keyMapperへ補完する。未割り当てF6も`117: "f6"`になる。旧CardコードはkeyMapper[117]が存在するだけで競合と判断し、転送を拒否していた。ShowDebugOverlayの設定とは無関係。
3. **ITEM**：WEAPON一覧はprocessOkを実装していたが、Sceneが`setHandler("ok", ...)`を登録していなかった。MZのprocessHandling / onTouchOkはisOkEnabled（isHandled("ok")）を先に確認するため、通常入力ではprocessOkへ到達しなかった。旧テストはprocessOkを直接呼んでいたため、この不具合を検出できなかった。

ロングソード不足だけが装備不可の原因ではない。現在のActors.jsonではActor 1の初期装備はロングソード（Weapon 2）。Map001の銃セットアップは標準の装備変更で銃へ交換するため、剣は所持品へ戻る。個別の既存セーブの所持数は読んでいない。

### P31-3. CombatPresence連携と状態表

通常マップではProjectRCombatPresence.isCombatActiveを唯一の戦闘判定として使用。新しい敵検出器は作らない。既存判定は「画面内の生存Action Enemy」で、召喚・味方・消去済み・透明・HP0は除外。確認間隔3フレーム、退出猶予24フレームをそのまま利用する。

| 状態 | BattleHUD | 旧Skill 5枠 | Card HUD | Runtime |
| --- | --- | --- | --- | --- |
| A 通常探索 | OFF | 親HUDが非表示 | OFF | inactive |
| B 戦闘・有効30枚 | ON | visible=false | ON | 自動Start |
| C 戦闘・未完成 | ON | visible=false | DECK INCOMPLETE n/30 | inactive |
| D 退出猶予後 | OFF | 開始前のvisibleへ復元 | OFF | End・一時状態cleanup |
| E Debug Arena | ON | visible=false | ON、未完成ならINCOMPLETE | 有効ならStart |
| 明示End・戦闘中 | 既存条件のまま | 開始前のvisibleへ復元 | OFF | 次の戦闘進入まで自動再開しない |

BattleHUDの手動非表示、表示スイッチ、会話中の抑止等も既存Adapter.shouldShowを尊重する。上表のONはそれらの抑止がない場合。AutoStartCardCombat=falseの場合は有効デッキでも手動開始まで旧枠を維持する。

- AutoStartCardCombat=trueは「CombatPresenceが戦闘中になった時」の開始を意味する。探索でマップを歩くだけでは開始しない。
- 毎フレームShuffleしない。短い敵判定の途切れは24フレーム猶予に従う。メニュー遷移自体ではRuntimeを終了せず、同じ戦闘へ戻ればHand / Draw / Discard / ENERGYを保持。
- 実際に戦闘判定が終了した時だけEndする。明示EndはRuntimeを終了・表示を復元し、同じ戦闘で即座に自動再Startしない。手動Startは可能。
- AlwaysShowCardHudは互換用として残すが、trueでも探索中表示しない。保存中の設定はfalseへ変更。
- DebugAutoSetupTestDeckはDEBUG有効・ニューゲーム・空デッキのみ30枚を準備する。Runtime開始は戦闘進入まで待つ。既存Saveには配布しない。
- Debug Overlay / Dummy属性ラベルは戦闘中かDebug Arenaのみ表示。探索中は小さな転送ボタンだけ。

### P31-4. 旧SkillHUDの置換と座標

対象は現在のScene_Map._projectRBattleHudLayer（BattleHUD.Manager）の`_skillHUD`。このコンテナー内に`_slots[5]`がある。Hendrixの別UI全体を消す処理ではない。

Cardを表示するときだけ元のvisibleを一度記録してfalseへ変更。背景で覆うのではなく描画を止める。明示End、戦闘退出、Scene終了で記録した値を復元する。元がfalseならfalseのまま。古いSceneのグローバルManagerより現在のSceneを優先。

実際のFHD配置は起点(494,915)、横間隔190、幅172、高さ140、5枚目X=1254。Cardも実スロットのX/Yを読み、同じ領域（X494～1426、Y915～1055）に置く。ENERGYは直上Y867～911。旧縦長画像を縦に圧縮せず、172×140の小型カードとして文字・Icon・属性・コスト・レアリティ・タイプ・キーを描画する。PlayerHUD / WeaponHUDと別の範囲に収まり、解像度変更はManagerの拡大率へ追従する。

CardWidth / CardHeight / CardSpacingは旧設定を壊さないためパラメーター名だけ残す。現行は既存BattleHUD領域を優先する。Player / HP / Weapon / Ammo / Ultimate / Statusの実装は変更しない。

### P31-5. CARD TEST / RETURN

- EnableDebugCommands=trueで、マップ右上（標準メニューボタンの左）に小ボタンを表示。ShowDebugOverlay=falseでも使用可能。
- CARD TESTを左クリックするとMap010の(16,21)、上向きへ転送。元Map ID、x、y、directionを一時変数へ記録。DotMoveの小数座標を丸めない。
- ArenaではRETURNとなり、元のMap・座標・向きへ戻る。Saveへの恒久保存はしない。直接Arenaから開始して記録がない場合だけ従来のMap001(29,19)へ戻る。
- 左マウス押下をcapture段階で消費し、銃撃・マップ移動へ渡さない。タッチ入力も転送ボタン上では移動を抑止。会話、死亡、実行中イベント、転送中などは転送不可。
- DEBUG=falseではボタンを生成しない。
- F6は補助操作として残す。未登録またはHendrixの受動的な`"f6"`だけ許可し、別アクションの割り当てがあれば拒否。Input.keyMapperを変更しない。
- 読み取ったMZコアの予約キー処理にF6はない。実際のNW.jsウィンドウでの物理F6入力は未確認なので、マウスボタンを主経路とする。

Map010はIDだけでなくMapInfosの名称も照合する。CombatPresenceに強制状態変更の公開APIはないため、Card側から公開`isCombatActive / canUseWeapon / refresh`をAliasし、Debug Arenaに限ってactive相当を返す。refreshは元処理も必ず呼ぶ。BattleHUD / PlayerFacingは同じ公開判定を読む。通常マップは元判定のまま。内部の敵走査・銃生成・召喚処理を書き換えない。

Arenaの9 Dummy、属性、P/M耐性、地形、イベント、画像は無変更。

### P31-6. ITEM装備経路

MenuHUD.confirm → ItemEquip Alias（ITEMのみ）→ ITEM / WEAPON選択。
SKILLは前段Card Aliasへ、それ以外は元MenuHUDへ委譲する。入力消費、決定音、Scene pushは1回。

ITEMは標準Scene_Item。WEAPONはActor 1の現在装備＋Party所持武器を重複なく表示する。装備中で所持数0でも表示。選択後はMZ標準processHandling / onTouchOk → 登録済みokハンドラー → Scene.onWeaponOk → equipの順。

1. Actor 1のequipSlots().indexOf(1)で武器スロットを取得。0固定にしない。二刀流では先頭の武器スロットを対象とする。
2. canEquip、isEquipChangeOk、武器種、所持数を確認。不可なら理由＋Buzzerのみ。
3. changeEquipを使用。標準tradeItemWithPartyにより旧武器を返却し、新武器を所持品から減らす。独自に装備配列を書き換えない。
4. 成功時に一覧・EQUIPPED・選択説明を即更新。同じ装備への再決定では再交換しない。
5. 銃から非銃へ実際に交換したときだけ残ったDirection Fixを解除する。Gun Spriteは既存CombatPresenceのhide/show管理を再利用（イベントを独自に削除しない）。銃への復帰・照準は既存Action Combat / PlayerFacing / Map001照準イベントの処理を利用する。新しいMouse Card方向処理は追加しない。

DEBUG時はCurrent / Selected / Can Equip / Weapon Slotを下部に表示。
EnableDebugCommands=trueかつDebugAutoSetupTestDeck=trueのニューゲームに限り、ロングソード2／テストハンドガン51が装備にも所持品にもない場合だけ1個補う。メニュー再表示やLoadでは配布しない。本番では配布しない。既存Map001銃セットアップイベントの通常配布は変更していない。

### P31-7. 検査結果と未確認境界

- 既存276テストを維持し、仕様変更した期待値のみ更新。27テスト追加、計303テスト成功。
- 実際のBattleHUD / CombatPresence / PlayerFacingをVMへ読み込み、A～E状態、24フレーム猶予、明示End、メニュー復帰、元visible=false、FHD座標・解像度追従を検査。
- 実際のHendrixキー補完部分で117→f6を再現。マウスのcapture、転送・小数座標の復帰、Production無効を検査。
- 実際のMZ Window_Selectable / Window_Commandの決定・タッチ経路を検査。Game_Actor / Game_Party / Game_Item等の標準実装と現在のデータベースで銃→剣→銃、在庫返却、装備不可、重複配布防止を検査。
- Gun ENERGY、Sword ENERGY、VFX、Uranus / Neptune方向、Reshuffleの実処理はPhase 3から変更しない。カード使用受付への戦闘状態条件は追加。
- Node検査は描画・機器入力を一部スタブ化した自動検査。MZ本体、NW.js物理入力、見た目、音、実Saveは自動起動せず、以下の実機確認をユーザーが行う。

### P31-8. 初心者向け実機再テスト手順

1. `ProjectR-CardDeck`のGame.rmmzprojectをMZで開く。元ProjectRではないことを確認する。
2. プラグイン管理でCardSkillDeck v0.3.1、ItemEquip v0.1.1の登録を確認。AutoStartCardCombat=true。EnableDebugCommandsは現在true、DebugAutoSetupTestDeck / ShowDebugOverlay / DebugAutoRefillEnergyは保存中false。
3. 自動テスト用デッキが必要ならDebugAutoSetupTestDeck=trueへ変更し、ニューゲームを開始。既存Saveのロードには自動配布しない。補助表示が必要ならShowDebugOverlay=true。連続使用・Reshuffleを試すときだけDebugAutoRefillEnergy=true。
4. Map001は開始位置付近に既存敵がいるため、開始直後は戦闘になり得る。敵を画面外へ離して約0.4秒待ち、BattleHUD / Card HUD / Overlayが消えることを確認する。
5. 敵が画面内へ戻るとBattleHUDとCard 5枠が表示され、旧Skill 5枠が重ならないことを確認。Player / HP / Weapon / Ammo / Ultimate / Buffの表示を確認する。未完成デッキの別ニューゲームでは戦闘時だけINCOMPLETEになることも確認。
6. 右上CARD TESTをクリックしてArenaへ入る。クリックで発砲・歩行しないこと、RETURNで元位置・向きへ戻ることを確認。F6は補助として任意に確認。F8はエラー確認用で、転送コマンド入力は不要。
7. MenuHUD → ITEM → WEAPON。剣・銃をクリックまたは選択してF / Enterで決定。EQUIPPEDと所持品の戻りを確認。ITEMカテゴリでは通常アイテム画面になることも確認。
8. マップへ戻り、Gun→Swordの銃表示・向き固定解除、Sword→Gunの照準復帰を確認。既存Map001の処理に加えArenaでも確認する。
9. ArenaでENERGYをカード使用により減らしてから通常攻撃を当て、Gun / Swordとも1攻撃につき+1、空振り0、Card攻撃0を確認。Swordは既存制約どおりMercury（Event 1）で検査する。
10. Uranus / Neptuneを敵のいない方向にも向け、Mouse / Gamepadの上下左右を確認。9属性のP/M倍率、VFX、30枚以上の連続使用とReshuffleを確認。これらは前回実機未確認だった項目。
11. 戦闘中にメニューを開いて戻っても手札が毎回再配布されないこと、敵が短時間だけ画面外へ出てもリセットされないこと、退出猶予後は両HUDが消えることを確認。
12. 必要ならF8 Consoleで`ProjectR.CardSkillDeck.endCombat()`を実行し、Card HUDが消え旧Skill枠が元の状態へ戻ることを確認。明示End後は同じ戦闘で即再開しない。手動Startまたは次の戦闘進入で再開できる。
13. DebugAutoSetupTestDeck / ShowDebugOverlay / DebugAutoRefillEnergyを使った場合はテスト後にfalseへ戻す。本番用はEnableDebugCommandsもfalse。F8赤エラー、音、実Save/Loadは実機で確認する。Stage / Commitはまだ行わない。

## Phase 3：履歴（v0.3.0、2026-09-28）

### P3-1. 作業範囲と既存変更

- 専用worktree：`C:\Users\hmats\Documents\RMMZ\ProjectR-CardDeck`
- ブランチ：`feat/card-skill-deck`
- 開始HEAD：`e37f7f272fd8cd5b8abc5b1534a94aa27a5feb49`
- ステージ済み差分：なし。Stage / Commit / Push / Merge / Rebaseは実行しません。
- 元ProjectR、MZコア、第三者プラグイン本体、BattleHUD、MenuHUDは編集しません。
- 既存のPhase 1/2ファイル変更、System.versionId=88657157、MapInfosのエディター座標、EnableDebugCommands=trueを保持します。
- Actors等のデータファイルおよびmanifest/packageは開始時にModified表示ですが、HEAD/index/作業ファイルのバイトが同一でした。正規化や復元は行いません。

今回の編集：Cardプラグイン、ItemEquip新規プラグイン、plugins.jsの当該登録、Map010、MapInfosのID10追加、この仕様書、テスト。
CommonEvents（CE1/3/4を含む）・Skills・Map001・Map002・System・既存画像はPhase 3開始時から変更しません。

### P3-2. Gun ENERGYの原因と修正

実ソースで確認した経路：

1. キーボード／マウス／ゲームパッドの通常攻撃がCE1を実行する。
2. CE1のBeginMainAttack、銃判定、残弾判定を経て、公式spawnEventコマンドがMap002のBulletを生成する。
3. Bulletのメモは`<weaponAttack>`のみで、`<dmg: ...>`はない。移動ルートが照準方向へ弾を動かす。
4. Action EngineのNpcTags設定が`<enemy>`へCE3を割り当てる。CE3が`checkCollide(this._eventId, '<weaponAttack>')`を呼ぶ。
5. AE 1.6.6bのtaggedEventIsCollidingWithTargetEventは、**衝突元にdmgタグがある分岐でのみlastSourceEventIdを書き込む**。dmgタグなしのBulletでは命中がtrueでも、グローバルIDが古い値のままになる。
6. v0.2.0はこのグローバルIDを見ていたため、弾のTokenを取得できず、CE3でHPが減ってもENERGY通知に接続できなかった。

修正後は公式の成功衝突内で呼ばれるGame_Event.getDamageFromNoteTagを後続Aliasし、照会された**弾インスタンスそのもの**をcheckCollide呼出しの局所的な記録に保持します。グローバルの最新弾ID、距離で推測した弾、追加の衝突判定には依存しません。公式関数の戻り値と副作用はそのままです。

発射ごとのTokenを弾インスタンスへ対応付け、衝突時に敵側InterpreterへTokenと対象を記録します。公式UpdateEventHpの前後を比較し、同じ敵のHPが実際に減ったときだけ+1。1 Tokenにつき一度、上限10です。複数の弾は別Token、古い弾の遅延命中もその弾のTokenを使います。

CE3の変更は不要でした。ノックバック、HP計算、ダメージ文字、Hit Animation、破棄処理は既存のままです。

### P3-3. Sword / Fallback / Cardの区別

- Tokenには`attackKind: gun / sword / fallback`、session、mapId、固有IDを保存します。
- CE4の既存開始通知でsword Tokenを発行。同じSwing中の複数の実HP減少は最初だけ+1、空振りは0。
- CE1の通常fallbackも同じ方式。銃分岐ではgunとして記録します。
- Card ContextとMain Attackは別管理。Card弾・Card範囲攻撃・CardスキルのHP更新から通常攻撃回復を呼びません。
- 現在のCE4とfallbackの既存攻撃対象は**Event 1固定**です。今回、攻撃範囲や対象選択は拡張していません。Sword実機確認はMap010のMercury（ID1）またはMap001のゴブリン（ID1）で行ってください。

EnableDebugCommands=trueの場合のみ、Consoleと最大200件の内部履歴に開始／生成／衝突／HP前後／回復accepted・duplicateを記録します。`ProjectR.CardSkillDeck.debugTrace()`で取得できます。Productionではこのログを出しません。

### P3-4. 自動開始・HUD・終了・マップ移動

| パラメーター | 初期値 | 動作 |
| --- | --- | --- |
| AutoStartCardCombat | true | マップScene開始・ロード後のマップ開始時、有効デッキなら開始 |
| AlwaysShowCardHud | true | 非戦闘でも5枠を表示。無効デッキはDECK INCOMPLETE n/30 |
| DebugAutoSetupTestDeck | false | DEBUG有効かつ新規ゲームかつ空デッキの場合だけ9種30枚を準備 |
| ShowDebugOverlay | false | DEBUG有効時だけ左上の結果表示とDummy頭上ラベル |
| DebugAutoRefillEnergy | false | DEBUG有効時だけ使用成立直後にENERGYを10へ戻す |

追加3個のDebugフラグは保存中もfalseです。既存のEnableDebugCommands=trueは維持しています。本番用ではこれもfalseにしてください。

- 自動StartはScene.start単位。毎フレームの再開始はしません。
- 明示Endの後は同じマップ画面にいる限り非アクティブ／待機5枠のまま。手動Start、マップ移動、メニューからマップへ復帰など「次のScene開始」で有効デッキがあれば新しいShuffleになります。
- 通常のマップ移動中はHand/Draw/Discard/Energyを維持。弾、Context、VFX、Main Tokenだけを片付け、session/mapIdを更新します。
- Endは全一時状態を片付け、旧SkillHUDの開始前visibilityを復元します。もともとfalseならfalseに戻します。
- Card HUDはAlwaysShowCardHud=trueのときCombatPresence/BattleHUD全体の表示状態に依存しません。既存Player/Weapon/Ultimate/Status HUDの制御には触れません。
- 戦闘中の標準セーブ禁止は従来どおりです。End後にメニューで保存し、ロード後はデッキから自動開始します。

### P3-5. Debug結果

`lastDebugResult()`にはsource、skillId/name、cardAttribute/type、cost、targetEventId/attribute、attribute/resistance/finalMultiplier、baseDamage/finalDamage、energyBefore/After、mainAttackToken、projectileActionId、resultを保持します。

CardのEnergy前後はそのカード使用時の値です。finalDamageは公式HP更新後の実際の減少量。DEBUG補充時は使用後10になります。別の弾が遅れて命中しても、その弾のCard Contextから倍率を計算します。

左上OverlayはCombat、Energy、Hand/Draw/Discard、最後のCard/対象/倍率/ダメージ、最後のMain Attack/Token/回復結果を表示します。補充モードはAUTO ENERGY表示。Snapshotはrevision更新時だけ作り直し、同じ状態のフレームでは再計算・Bitmap再生成・再描画しません。ラベルの位置だけscreenX/screenYへ追従します。

### P3-6. Map010：ProjectR Card Test Arena

MapInfosと実ファイルを確認し、未使用ID10を採用しました。Map003は使用しません。
34×28、data.length=5712、地面は既存2816、追加レイヤーは0。マップ開始地点設定は変更しません。
F6はEnableDebugCommands=trueのマップ画面でのみ有効。Map010の(16,21)へ転送、もう一度F6で元のマップと地点へ戻ります。入力欄、会話、イベント中、転送中は使用しません。F6の既存keyMapper割り当てを検出した場合は上書きせずショートカットを無効化します。

9体とも`<enemy><PlanetDummy>`と惑星／耐性タグを持ち、`<hp: 魔獣>`で既存Enemy 5（HP1000）を利用します。Enemyデータ自体は変更しません。移動なし、攻撃AIなし。既存NpcTagsによるCE3は有効です。GraphicのIndexは0始まりです。

| ID | 属性 | 座標 | Character / Index | Physical | Magic |
| --- | --- | --- | --- | --- | --- |
| 1 | Mercury | 7,6 | SF_Monster / 4（青いロボット） | 1.00 | 1.00 |
| 2 | Venus | 16,6 | Evil / 6（金色の鎧） | 0.75 | 1.25 |
| 3 | Earth | 25,6 | Monster / 1（緑の獣） | 0.50 | 1.50 |
| 4 | Mars | 7,13 | Monster / 4（赤白の獣） | 1.25 | 0.75 |
| 5 | Jupiter | 16,13 | $BigMonster1 / 0（大型魔王） | 1.50 | 0.50 |
| 6 | Saturn | 25,13 | Monster / 3（暗い鎧） | 0.75 | 0.75 |
| 7 | Uranus | 7,20 | Monster / 2（銀青の獣） | 1.25 | 1.25 |
| 8 | Neptune | 16,20 | Evil / 5（青白の精霊） | 0.50 | 1.25 |
| 9 | Pluto | 25,20 | Monster / 7（紫の魔物） | 1.25 | 0.75 |

ShowDebugOverlay有効時だけ頭上に属性とP/M倍率を表示します。全員下向き固定なので、大型シートの別方向画像へ勝手に切り替わりません。

### P3-7. VFXとMouse Card

新しい画像は追加しません。Phase 2の購入済みDLC由来3画像を再利用します。Show VFXのfps、loopCount、scalePercent、opacity、rotation、blendMode（Normal/Add/Screen）、stickMode、zIndex、playInReverseはAS 2.0.7実ソースで確認しました。

| 属性 | Phase 3演出 |
| --- | --- |
| Mercury | 青白の発射光、追従するElectric_Dash_Line（最大8ループ）、命中Fire_Disc_Burst |
| Venus | 大きな黄白色の発光Burst |
| Earth | 大きな土色のSmoke_Impact |
| Mars | 使用時に橙色の斜めElectric_Dash_Line斬撃、命中時に拡大Fire_Disc_Burst |
| Jupiter | 紫白の電光、2ループ＋90度違いの遅延レイヤー |
| Saturn | 金色の拡大Burst＋遅延した小レイヤー |
| Uranus | 水色の長い軌跡、発射光、命中Burst |
| Neptune | 青色の大きな軌跡、異なる再生速度、発射光、命中Burst |
| Pluto | 黒紫Smokeを拡大・逆再生、6フレーム遅れの赤紫加算レイヤー |

全画面Flashは使用していません。演出はキャラ周辺に置きます。色は所有するPIXI Spriteだけに適用し、共有Bitmapは変更しません。
各演出は固有noteで追跡し、弾の追従VFXは弾破棄時に除去。End/Map移動は自分の全VFXと読込待ち要求を除去します。存在確認・画像と対象Spriteのready確認後に公式Show VFXを呼び、欠落画像は演出だけ省略します。

Uranus/NeptuneはTarget=Mouseのまま。生成時に再度公式turnTowardとrotateTo('mouse or gamepad')を同じ実行区間で呼び、VFXは弾の_rotationを使います。最寄り敵へ置き換えません。MouseとGamepadの上下左右は、公式の回転・向き関数を読み込む自動テストも追加しました。実機での入力機器と見え方は別途確認が必要です。

### P3-8. ProjectR_ItemEquip v0.1.0

登録順はMenuHUD → CardSkillDeck → ItemEquipです。MenuHUD本体を変更せず、最後のAliasがITEMだけを扱い、SKILLやその他は前のconfirmへ委譲します。各選択につき決定音／Scene pushは1回です。

- ITEMを開くとITEM / WEAPONの2カテゴリ。ITEMはMZ標準Scene_Itemを開き、対象選択、使用条件、消費、回復効果はそのまま利用します。
- WEAPONは所持武器とActor 1の現在装備を表示。名前、Icon、武器種、ATK、EQUIPPEDを表示します。
- Actor 1の最初のetypeId=1スロットを使用。canEquip、isEquipChangeOk、所持確認の後、標準changeEquipだけを呼びます。
- 不可武器は暗く表示し、決定時にBuzzerを1回鳴らして理由を表示します。現在装備に再決定しても交換処理を重複しません。
- 銃／ロングソード変更後は既存Action Engineが装備を読むため、独自の攻撃・弾数処理は追加しません。
- 武器そのものは配布しません。一覧には所持している武器だけが出ます。ロングソード（Weapon 2）が所持品にないセーブでは表示されません。
- 防具・アクセサリーUIは今回対象外です。

### P3-9. 自動検査と境界

`node --test tests/ProjectR_CardSkillDeck.test.cjs`：276件成功（既存208件＋68件）。既存ケースは削除せず、Map移動維持とMars発射／命中演出の新仕様に合わせて該当期待値を更新しました。

実際のMZ InterpreterとWindow_Selectableに加え、AE 1.6.6bの衝突関数、spawnEventコマンド／座標式変換、UpdateEventHpコマンド、turnToward、rotateToをテストへ読み込みます。画像描画・音声・物理移動・HPの低レベル反映などはテスト用代替です。**MZを起動した実機試験や実Saveファイル試験の成功を意味しません。**

対象：実CE1/3/4、Gun命中・空振り・0ダメージ・重複・遅延弾、Sword命中／空振り／多対象Token、Card除外、自動Start/ロード、DEBUG配布保護、Snapshot/補充、9体のデータ、VFX/cleanup、Mouse/Gamepad、HUD復帰、転送時の手札維持、Menu Alias、標準Itemへの委譲、装備可否／交換／空一覧。

最終確認は完了しました。新規／変更JSとテストの計4ファイルはnode --check成功、data内17個のJSONはJSON.parse成功、git diff --check成功です。未追跡テキスト5ファイルも空白エラーなし。7保護プラグインのSHA-256は開始時と完全一致しました。ステージ済み差分は空で、HEADは開始時のままです。公式DLC画像の新規コピーはありません。

### P3-10. 初心者向け実機テスト手順

1. MZで開くプロジェクトが`ProjectR-CardDeck`内のGame.rmmzprojectであることを確認してください。元ProjectRを開かないでください。
2. プラグイン管理でCardSkillDeckがv0.3.0、ItemEquipがv0.1.0として有効になっていることを確認してください。順序はMenuHUD、CardSkillDeck、ItemEquipです。
3. カードテスト用にEnableDebugCommands、DebugAutoSetupTestDeck、ShowDebugOverlayをtrueへ設定します。AutoStartCardCombat/AlwaysShowCardHudもtrueにします。最初の回復検証ではDebugAutoRefillEnergyはfalseです。
4. 保存して新しくテストプレイを開始し、「ニューゲーム」を選びます。既存セーブには自動配布しません。カード5枠、ENERGY10、Hand5/Draw25/Discard0が自動で表示されることを確認してください。
5. F6を押すとMap010へ移動します。9体の異なる敵と属性・P/Mラベルを確認してください。もう一度F6で元の場所へ戻れることも確認してください。
6. カードでEnergyを10未満へ減らし、銃を1発命中させます。OverlayのMain Attackがgun、実ダメージあり、Energyが+1になることを確認します。空振りは増えず、10を超えないことも確認します。
7. メニュー → ITEM → WEAPONで所持しているロングソードを選び、EQUIPPEDを確認してマップへ戻ります。通常攻撃の対象は既存仕様のEvent1なので、Map010左上のMercuryのすぐ近くへ移動して振ってください。命中+1／空振り0を確認します。所持していない武器をこのプラグインが勝手に配布することはありません。
8. Q/E/X/C/Vでカードを使い、頭上耐性と左上の倍率・ダメージを確認します。Mercuryの発射／軌跡／命中、Marsの斬撃とBurst、Plutoの二重Smoke、残る6色も確認してください。カード命中ではEnergyが増えません。
9. Uranus/Neptuneが手札に来たら、敵のいない方向をマウスで指し、弾と光がその方向へ飛ぶことを確認します。ゲームパッド照準でも上下左右を確認します。
10. リシャッフル確認時だけDebugAutoRefillEnergy=trueで新しいテストを開始します。AUTO ENERGY表示、毎回10への補充、30枚以上の連続使用と山札補充を確認します。これは通常回復の検証には使わないでください。
11. F6転送前後のEnergy・手札・山札・捨て札を見比べます。値と手札は維持され、移動前の弾や光が移動先へ残らないことを確認します。
12. 終了確認に限りF8 Consoleで`ProjectR.CardSkillDeck.endCombat()`を実行します。Combat INACTIVE、待機5枠、旧SkillHUDの表示復元を確認します。その場で勝手に再Startせず、次のマップScene開始では再Startするのが仕様です。
13. End後にメニューからセーブし、ロード復帰でもデッキが維持されることを確認します。新規ゲーム用自動配布が既存セーブを上書きしないことを確認してください。
14. メニュー → ITEM → ITEMで回復アイテムの使用／対象選択／戻る、WEAPONで不可装備時の暗転と理由、銃への再装備、Fインタラクト、F8に赤エラーがないことを確認します。
15. 本番用ではEnableDebugCommandsと3つのDebugフラグをfalseへ戻してください。実機検証結果が出るまでCommitしません。

## Phase 2の実装履歴（旧仕様）

### Phase 2記録（2026-09-28、以下は当時の記録）

作業場所は `C:\Users\hmats\Documents\RMMZ\ProjectR-CardDeck`、ブランチは `feat/card-skill-deck`。
開始HEADは `e37f7f272fd8cd5b8abc5b1534a94aa27a5feb49`。元のProjectRには変更しません。
v0.1.0の空一覧修正はユーザーによる実機スモークテスト済みです。以下のPhase 2は自動検査済みで、MZ実機確認はこれからです。

### P2-1. テストカード・採用ID

Skill 51以降には既存魔法があるため使用しません。未使用の連続9枠158～166を使用し、他のSkillは維持します。
CEは既存1～4を維持し、21～29を追加します。配列のIDを揃えるため、5～20には名前空欄・実行内容なしのCEを置きます。

| Skill | 名前 | 属性 | Type | ★ | Cost | Target | Range | CE | 所持/Deck枚数 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 158 | 水星弾 | Mercury | Magic | 1 | 1 | Nearest | 8 | 21 | 4 |
| 159 | 金星光 | Venus | Magic | 1 | 2 | Nearest | 7 | 22 | 4 |
| 160 | 岩砕撃 | Earth | Physical | 1 | 2 | Nearest | 3 | 23 | 4 |
| 161 | 火星斬 | Mars | Physical | 1 | 2 | Nearest | 3 | 24 | 4 |
| 162 | 木星雷 | Jupiter | Magic | 1 | 3 | Nearest | 8 | 25 | 4 |
| 163 | 土星環刃 | Saturn | Physical | 2 | 3 | Nearest | 5 | 26 | 3 |
| 164 | 天王風 | Uranus | Magic | 2 | 2 | Mouse | 8 | 27 | 3 |
| 165 | 海王水槍 | Neptune | Magic | 3 | 3 | Mouse | 10 | 28 | 2 |
| 166 | 冥蝕 | Pluto | Magic | 3 | 4 | Nearest | 7 | 29 | 2 |

合計は `4+4+4+4+4+3+3+2+2 = 30`。★1=4、★2=3、★3=2の上限と一致します。
Rangeの単位はタイル。カード本体には名前、説明、Icon（物理76/魔法64）、Skill Type 1、Occasion 0、HP Damageを設定します。
各CEは `ProjectR.CardSkillDeck.executeTestCard(this);` と終了行だけの薄いAdapterです。

計算式は購入済み日本語DLCの実データを使用します。

- Physical：サンプルSkill 1の `a.atk - b.def`、物理命中、分散20、クリティカルあり。
- Magic：サンプルSkill 2の `(a.mat + 15) / 2 - b.mdf`、魔法命中、分散50、クリティカルあり。
- カード独自の惑星倍率と通常の属性IDが二重に掛からないよう、Elementは0（なし）。Skillの命中率・回避・クリティカル・基本ダメージはAction Engineの `calculateDamageAgainstEvent(event, "skill", skillId)` に任せます。
- その結果へCard Contextの属性倍率とPhysical/Magic耐性を掛けて丸め、公式 `UpdateEventHp` の数値引数でHPを減らします。通常武器の計算式は変更しません。

### P2-2. 明示的なDEBUG配布

保存中の `EnableDebugCommands` は **falseのまま** です。新規ゲームやロード時にカードは自動配布されません。

1. カード専用プロジェクトをMZで開く（元ProjectRではありません）。
2. プラグイン管理で `ProjectR_CardSkillDeck` の `EnableDebugCommands` をテスト時だけtrueにする。
3. 保存後、古いテストプレイを終了して新しく起動する。テスト専用の新規ゲームを推奨します。
4. マップ画面でF8 Consoleを開き、次を1行ずつ実行する。

```javascript
ProjectR.CardSkillDeck.debugSetupTestDeck()
ProjectR.CardSkillDeck.getDeck().length
ProjectR.CardSkillDeck.validateDeck()
ProjectR.CardSkillDeck.testCards.map(c => [c.skillId, ProjectR.CardSkillDeck.ownedCount(c.skillId)])
```

期待値は `{ok:true}`、30、`valid:true`、表の所持枚数です。
`DebugSetupTestDeck` プラグインコマンドでも同じ処理になります。false時、戦闘中、テストSkillの設定不一致時は拒否します。

この操作は**現在のゲーム中の9種類の所持数を指定数へ設定し、編集中のデッキをテストデッキに置き換えます**。
他種類の所持数は保持し、実行を繰り返しても増殖しません。既存の本番Saveに対して実行・上書き保存しないでください。
テスト終了後はパラメータをfalseに戻してください。Codexはtrueへの設定やSaveの編集を行っていません。

### P2-3. カード戦闘・入力・手札

```javascript
ProjectR.CardSkillDeck.startCombat()
ProjectR.CardSkillDeck.energy()
ProjectR.CardSkillDeck.hand()
ProjectR.CardSkillDeck.drawPileCount()
ProjectR.CardSkillDeck.discardPileCount()
```

開始時はENERGY 10/10、Hand 5、Draw 25、Discard 0です。
Q/E/X/C/Vは順にSlot 1～5。使用成功でCostだけENERGYが減り、使ったカードを捨て、同じ枠だけ山札から補充します。
Cost不足は暗転表示＋発動拒否。失敗時にHand/Draw/Discard/ENERGYを変更しません。
1Frameにつき1Card、実行中CEが終了するまでは次のCardを拒否します。CE終了後は先の弾が飛行中でも次のカードを使えます。
Draw 0の次回補充では、今使ったカードを含むDiscardをシャッフルします。26回使用後は再びHand5/Draw25/Discard0になります。
検査用の補充は `ProjectR.CardSkillDeck.setEnergy(10)`、終了は `ProjectR.CardSkillDeck.endCombat()` です。

CombatPresenceの自動ON/OFFとCard Combatの開始/終了は従来どおり別です。敵が画面に入るだけでカード戦闘が自動開始する仕様にはしていません。
Fインタラクト、通常Hotbarの保存設定、他のBattleHUD、MenuHUDの既存処理は変更しません。

### P2-4. 非同期ProjectileとContext

- Mercury、Uranus、Neptuneは非同期Projectile。公式 `spawnEventHitbox` でDynamic Eventを生成します。
- 専用タグ、`<attacker: player>`、公式形式の `<hitbox: 0.3, 0.3>` を使用。既存Gun用 `<weaponAttack>` は付けません。
- `rotateTo(x,y)` または `rotateTo("mouse or gamepad")` で方向を決め、公式 `moveToPosition("forward", range)` とDotMoveで直進。Mercuryは速度7、他2種は6です。
- 既存 `img/characters/VFX/$Bullet.png` を表示に再利用。Map002のテンプレートは変更しません。
- `Map<Game_Event instance, record>` にactionId/mapId/sessionを保持。IDの数字だけでは結び付けません。
- actionIdから `Object.freeze` 済みCard Contextを参照し、命中時の専用Interpreterへ再接続します。手札の補充やCard Bの使用で、弾AのSkill/属性/Typeは変わりません。
- 各フレームで公式 `checkCollide` を使い、`<destroyProjectile>` 接触を先に処理してから生存敵との接触を検査。最初の敵へ1回処理して消えます。外れや壁接触ではENERGYを回復しません。
- 射程終了・最大240フレーム・マップ外・外部でのErase/Destroy・End Combat・Map transferで参照を解放。自分の弾だけを消し、既存通常弾は勝手に消しません。
- 除去は現在マップとイベント実体の一致を確認し、タグ索引、衝突履歴、DotMoveキャッシュ、追加Sprite、待機VFXを掃除。最後の弾とCEが終われば、そのテストCard Contextも解放します。
- 公式Dynamic Eventのwaitは空欄。IDだけを記憶して後から消すタイマーを作らず、再利用された別イベントを誤って消しません。
- 通常のタイル壁通行は既存Bulletと同じthrough方式です。消弾用壁は既存の `<destroyProjectile>` タグ方式を使います。一般タイルの遮蔽・跳弾・貫通は今回追加していません。

Venus/Earth/Mars/Jupiter/Plutoは射程内の最寄り生存敵へ直接処理。Saturnは最寄り敵を中心に半径1.5タイル、かつプレイヤーから射程5以内の生存敵へ各1回処理します。対象がCE開始までに別イベントへ置き換わった場合は攻撃しません。

追加API：`executeTestCard(interpreter)`、`projectileContext(event)`、`destroyCardProjectile(event)`。
手動の汎用 `bindActionContext` は従来どおり提供し、戦闘終了時にはすべて無効化します。

### P2-5. Main Attack ENERGY接続

既存CEへの変更はCE1・CE4の先頭へ `BeginMainAttack` 通知を各1行追加しただけです。
CE1はfallback、CE4はswordのTokenを作ります。元のAim/Gun/Reload/Swing/Hitbox/Damage/Destroyのコマンド列は同一。CE2/CE3は全文同一です。

1. CE1から公式 `Game_Map.spawnEvent` がGun Bulletを生成すると、**弾1発ごと**に固有Tokenを作り、弾の実体へ対応付ける。
2. 公式 `checkCollide` 成功直後に `CollisionManager.lastSourceEventId` の元イベントとTokenを、そのInterpreterに保存する。
3. 公式 `UpdateEventHp` を元の引数で実行し、同じ対象のHPが実際に減った場合だけ `notifyMainAttackHit(token)` を呼ぶ。
4. Tokenごとの受理履歴で1Action合計+1。別の弾、別の振り、別のfallback入力なら再度+1。

後から別の衝突がglobal lastSourceを更新しても、保存済みTokenを使用します。
剣の同じ振りで複数敵/多段へ命中しても合計+1。空振り・HP変化0・壁消滅・Card Contextのダメージは+0。
inactive時は通知を無効化して既存処理へ委譲します。古い戦闘sessionの弾・Tokenも回復に使えません。

検査例：ENERGY5→Gun命中6→空振り6→別Gun命中7→剣複数Hit8→Card命中8。
最後の8は「Card使用コストを別途精算した後、命中で増えない」検査です。実プレイでは使用時に表のCostが減ります。

### P2-6. Map001の属性・耐性

| Event | 位置（変更なし） | 属性 | PhysicalResist | MagicResist |
| --- | --- | --- | --- | --- |
| 1 テスト用ゴブリン | (42,16) | Earth | 0.75 | 1.25 |
| 2 公式銃テスト敵 | (42,19) | Pluto | 1.25 | 0.75 |

Noteへ `<PlanetAttribute:...>`、`<PhysicalResist:...>`、`<MagicResist:...>` を追記しただけです。
元のHPタグやEvent2のenemyタグを保持し、Event1へ新しいenemyタグを勝手に加えていません。ページ、条件、内容、位置、地形、他イベントは変更なし。
Map001は60×40、data.length=14400。System/Map002は変更なしです。

倍率検査：Pluto→Earth=1.50、Earth→Pluto=1.50、Pluto→Pluto=1.00（属性倍率だけ）。
実ダメージではさらにType耐性を掛けます。例：冥蝕→Event1は1.50×1.25=1.875、岩砕撃→Event2は1.50×1.25=1.875、冥蝕→Event2は1.00×0.75=0.75。
Debug=trueなら命中時に `[CardSkillDeck]` とactionId/Skill ID/攻撃属性/敵属性/属性倍率/Type/耐性/最終倍率/基本ダメージを表示。falseでは表示しません。

### P2-7. 実VFX方式・公式素材

Animation Solution 2.0.7のヘルプとソースでは、VFX Designerはゲーム内のDockから開くGUIです。出力先は `js/AnimationSolutionLibrary.json`。
公式JP/ENサンプルのLibraryにはIce Wall、Ice Spike、Ice Aura、Sword Reveal/Gone系があり、今回の3属性をそのまま満たすセットではありません。
MZ/GUIを起動せず、優先順位Cの**公式サンプル画像＋正式なShow VFXコマンド**を採用しました。互換Libraryファイルを自作したわけではありません。

| CardVFXキー | 画像 | 公式根拠 | Phase2表現 |
| --- | --- | --- | --- |
| MercuryShot_Test | Electric_Dash_Line.png | JP CE40、4行5列 | 高速の小さな青白い光、銀白の既存Bulletに追従、fps100 |
| MarsSlash_Test | Fire_Disc_Burst.png | JP CE11、5行6列 | 公式剣サンプル由来の橙/赤の斬撃火花、fps70 |
| PlutoEclipse_Test | Smoke_Impact.png | JP Map003 Event12、5行7列 | 黒紫の煙/粒子を逆再生して収束・侵食風、fps50 |

各色はこのAdapterが作ったPIXI Spriteだけへtintを設定します。共有Bitmap/TextureやPNGファイルは変更しません。
Mercuryの細い弾は既存Bullet表示、追加VFXは短い発光です。完成版の専用描き下ろし演出ではなく、公式Effectの制約内のテスト表現です。
他6属性は今回はVFXなし。カードの攻撃処理自体は実装しています。

コピー元共通フォルダー：

```text
D:\SteamLibrary\steamapps\common\RPG Maker MZ\dlc\RPG Maker Action Combat Plugin\RPG Maker Action Combat Plugin jP version)\img\pictures\Animation
```

コピー先共通フォルダー：

```text
C:\Users\hmats\Documents\RMMZ\ProjectR-CardDeck\img\pictures\ProjectR_CardTest
```

ファイル名は元/先で同一。コピー元・先のSHA-256はバイト単位で一致します。

| ファイル | SHA-256 |
| --- | --- |
| Electric_Dash_Line.png | `448af7aa194ff81ac24c530ec9574df03a5dfe9192d5d48a51f60b14e96b6685` |
| Fire_Disc_Burst.png | `d50d61437c4486f86269b2e91a983879bc67bb475812365de51b735e01936b5b` |
| Smoke_Impact.png | `e967ba5ef226ada5696c7e796a472a77ce094dafdd6e8648adba076fc9bf2e15` |

合計137,912 bytes、3枚のみ。外部Web素材は使いません。

実行経路は `CardVFX → testVfxRegistry → 存在/準備確認 → Hendrix_Animation_Solution:showAnimatedPicture`。
NW.jsではローカル存在確認、WebではHEAD確認を行い、不在ならWarningだけで演出を省略します。画像不在をMZの致命的画像読込へ渡しません。
正式公開API `PermanentImageCache.load` で対象画像を準備し、画像と対象Spriteが両方readyになってからShow VFXを呼びます。
公式2.0.7の無制限ready待機タイマーへ、消えた弾を渡さないための処理です。待機は120フレームまで、弾消滅/End/移動時にキャンセルします。
以前の任意Library用 `registerVfx` は維持します。今回の3キーはPlugin内のテストRegistryに定義し、パラメータの変更は不要です。
素材は必要時読込の専用フォルダーに置くため、manifest.jsonへの登録・一括プリロードは不要です。manifest/packageは変更していません。

### P2-8. 自動検査と保護対象

- 既存151件＋Phase2追加57件＝208件成功。MZ実Interpreter/Windowのほか、DotMoveの実DotMovePoint、公式AE 1.6.6bのUpdateEventHpコマンドも限定VMで実行して接続を検査。
- 9定義/30枚/所持/レアリティ/Debug拒否、全9カード発動、A/B同時飛行・元属性での命中、Context解放、ID再利用、Gun固有Token、Sword複数Hit、fallback、HP減少時だけ回復、Card除外、Pluto倍率、低ENERGY暗転、リシャッフル、VFX引数/色/素材欠落/準備待機を検査。
- node --check：Card Plugin、plugins.js、testの3ファイル。
- git diff --check成功。未追跡のPlugin/仕様書/testも別途検査し、末尾空白・余分な末尾空行なし。
- JSON.parse：Skills、CommonEvents、Map001。開始前内容との比較で既存SkillとCE命令列、Map001のNote以外が維持されていることを確認。
- DotMove、公式4Plugin、BattleHUD、MenuHUDのSHA-256は開始時と同一。
- js/plugins.js、Map002、System、manifest、packageも開始時と同一。Pluginの登録名/ファイル名一致、Debug=false、既存登録順を確認。
- manifest/packageはstatus上Mと表示される場合がありますが、HEAD/index/working treeのバイト内容は同一。restore/addで直していません。
- Gitのstage/commit/push/merge/rebaseは実行しません。MZの起動・保存も行いません。

自動検査の描画・物理・通常武器のダメージ値にはStubを含みます。実際の当たり判定、ゲームパッド、見た目、音、実Saveファイルまで実機検証したという意味ではありません。

### P2-9. ユーザー向け実機テストの順序

1. P2-2の手順でテスト専用新規ゲームに30枚を設定。SKILL画面で9種類/各枚数/READYを確認。
2. マップへ戻り、F8で `ProjectR.CardSkillDeck.startCombat()` を実行。10ENERGY・5手札を確認。
3. 開始位置(29,19)から敵(42,16)/(42,19)へ近づく。初期位置はNearestカードの射程外なので、不発は正常。射程3のカードは十分近づいて試す。
4. Q/E/X/C/Vを各1回、押しっぱなし、同時押しで確認。成功時だけCost消費/同じ枠の補充、同一Frame二重発動なし、F会話/移動/通常武器/他HUDが正常か確認。
5. `setEnergy(5)` 後にGun命中/空振り/別弾命中、Longsword、fallbackを試す。HPが減った攻撃だけ+1。同じ振り・同じ弾で重複回復しないことを確認。
6. MercuryまたはNeptuneを撃ち、弾が残っている間に別Cardを使用。命中ログのactionIdと元Skill/属性が混線しないことを確認。壁タグ/射程終了/End/移動後に弾が残らないことも確認。
7. Earth敵とPluto敵へカードを当て、P2-6の属性・耐性とConsoleの倍率を確認。敵を倒した場合はテストを再開し、HPや敵ページを勝手に書き換えない。
8. Mercuryの青白、Marsの火花、Plutoの紫粒子が表示され、F8に赤いRuntime Error/ERR_FILE_NOT_FOUNDが出ないことを確認。最終的な大きさ・位置・色・体感速度はここで判断する。
9. `setEnergy(0)` で暗転/不発/手札不変。必要時だけ `setEnergy(10)` を挟み26回使い、Discard→Drawの再シャッフルを確認。
10. `endCombat()` で通常SkillHUDへ復帰。カード戦闘中はSAVE不可、終了後は可能。保存を試す場合も本番Saveを上書きせず、別のテストスロットを使用する。
11. Debugをfalseに戻して再起動。DEBUG配布拒否、通常プレイへの自動配布なし、倍率ログなしを確認。
12. 実機確認完了まではgit add/commit/push/merge/rebaseを行わない。

保留はPhase 2の実機確認、演出の最終調整、他6属性の固有VFX、CombatPresenceとのカード戦闘自動開始/終了です。後2点は今回の必須範囲外です。

---

## v0.1.0の実装記録（過去の状態）

以下は初期実装と空一覧修正時の記録です。「未接続」「未作成」は当時の状態を表します。現在の実装・テスト手順は上のPhase 2を参照してください。

## 1. 今回の完成範囲と、まだ接続していない部分

このプラグインは、主人公用の「所持カード」「30枚のデッキ」「戦闘中の5枚の手札」を管理します。カード1種類はツクールのスキル1個に対応します。

今回、実際のスキル・敵・コモンイベント・画像は追加していません。新規ゲームは所持0枚、デッキ0/30で正常です。この状態では戦闘開始が拒否されます。

| 機能 | v0.1.0の状態 |
| --- | --- |
| 所持、30枚デッキ、レアリティ制限、手札、山札、捨て札 | 実装 |
| Q/E/X/C/V、カードHUD、ENERGY、SKILLからデッキ編集 | 実装 |
| Nearest / Mouse照準、カード用CEの安全な開始 | 実装 |
| 属性・物理/魔法耐性の計算 | 実装。全81属性組合せを自動検査 |
| ダメージへの自動倍率適用 | Card ContextのあるInterpreterが公式`calculateDamageAgainstEvent(..., "skill", 当該Skill)`を呼ぶ経路のみ |
| 非同期ProjectileへのContext自動伝播 | 保留。明示的な`bindActionContext` APIは提供 |
| 通常攻撃命中時のENERGY自動回復 | 保留。`notifyMainAttackHit(token)` APIは提供 |
| VFX | Registryと公式ライブラリー呼出Adapterを実装。画像制作・DLC素材コピー・実再生は未実施 |
| セーブ | 戦闘外で所持/デッキを保存。カード戦闘中は通常セーブ・オートセーブ・標準saveGame APIを禁止 |

通常攻撃の回復が未接続なので、今の段階では実戦用の完成形ではありません。ENERGYを使い切った後の動作テストにはSet Energyコマンドが必要です。敵が見えた時のCombatPresenceとカード戦闘の開始/終了は別です。今回、自動で結び付けていません。

## 2. 作業場所・依存関係

今回の作業場所は `C:\Users\hmats\Documents\RMMZ\ProjectR-CardDeck` のみです。

- Branch: `feat/card-skill-deck`
- 開始HEAD: `e37f7f272fd8cd5b8abc5b1534a94aa27a5feb49`
- 新Plugin: `js/plugins/ProjectR_CardSkillDeck.js`
- 名前空間: `ProjectR.CardSkillDeck`
- 登録: 既存13本を保持し、MenuHUD直後の14本目に追加
- 実ファイルで確認した依存版: DotMove 2.2.5、Action Engine 1.6.6b、Animation Solution 2.0.7、Hotbar 2.0.7a、Keyboard/Gamepad 1.2.5 PREMIUM、MenuHUD 2.0.0

登録名とファイル名は同一です。元ProjectR、公式プラグイン、BattleHUD、MenuHUD、MZコア、既存データJSONを編集しません。

調査根拠は、同じworktreeの `docs/ActionCombat_Plugin_Spec_2026-09-19.md` と実ソースです。特に以下を確認しています。

- AE `Game_Character.turnToward`、`getCurrentEventHp`、`NpcTags`、`calculateDamageAgainstEvent`、`UpdateEventHp`、`ActorUseSkill`、Dynamic Event、Projectile、SwingWeapon。
- Hotbar `SetSkill`/保存処理は通常設定へ反映され、発動はマップInterpreterを`clear()`してからCEを設定する経路を持ちます。安全な一時割当・復元の公開APIとしては利用しません。
- `ActorUseSkill`はlinkedActorIdを持つイベント向けで、主人公の汎用カード発動APIとしては利用しません。
- `js/HotbarConfig.json`のgridsは空。既存KeyboardのInteractはF、XはCancelです。
- BattleHUDは全文確認。Managerの`_skillHUD`が5枠の表示を独立して持っています。
- MenuHUDの公開Scene、layout.commands、confirm、consumeInputを利用します。

## 3. カードを作る手順（次の工程で実施）

次の手順は説明です。今回の実装ではSkills.jsonなどを変更していません。

1. カード専用worktreeのGame.rmmzprojectを自分で開きます。元ProjectRを誤って開かないでください。
2. データベースの「スキル」で未使用IDを選びます。例の31は空いている保証がないため、必ず自分のデータで確認します。
3. 名前、アイコン、通常のツクールのダメージ計算式を設定します。
4. メモ欄へ次を設定します。
5. 空いているコモンイベントを別途作成し、そのIDをCardActionCEに指定します。例の21も未使用か確認してください。

```text
<Card>
<CardCost:2>
<CardAttribute:Mars>
<CardType:Physical>
<CardRarity:2>
<CardTarget:Nearest>
<CardRange:4>
<CardActionCE:21>
<CardVFX:MarsSlash01>
```

| タグ | 意味・省略時 |
| --- | --- |
| Card | このタグがあるスキルだけカード扱い |
| CardCost | ENERGY消費。整数1～10、既定1。小数は切り捨て、0以下は1、11以上は10 |
| CardAttribute | 9惑星。英語ID・日本語名・英字大小を正規化。省略/不明は無属性 |
| CardType | Physical/物理、Magic/魔法。省略/不明はPhysical |
| CardRarity | ★1～3。既定1、範囲外は1～3に制限 |
| CardTarget | Nearest/最寄り、Mouse/照準。既定Nearest |
| CardRange | タイル単位。既定8.0、最小0.1 |
| CardActionCE | 発動するCEの正整数ID。未設定・存在しないCEは無効カードとして追加/戦闘を拒否 |
| CardVFX | Registryのキー。省略可。未登録ならWarningだけで演出を省略 |

不正な数値文字列はWarningと既定値で安全に処理します。メタデータはデータベース読込後に1回キャッシュします。開発中にメモを実行時変更した場合だけ、`rebuildMetadataCache()`で再構築してください。

v0.1.0のカード消費資源はENERGYだけです。スキルの通常HotbarによるMP消費、クールダウン、自動効果実行を重ねません。実際のアクションはCardActionCEで定義します。カード用スキルに「コモンイベント」効果を設定しても、その効果はこのプラグインから自動実行されません。

## 4. 所持カード・30枚デッキ

所持数はSkill IDごとに保存します。デッキはSkill IDの配列です。同じカードは同じIDを複数回並べて表します。

| レアリティ | 同じSkill IDの最大投入数 | 枠・星の既定色 |
| --- | --- | --- |
| ★1 | 4枚 | 青 #428bdb |
| ★2 | 3枚 | 紫 #ab72df |
| ★3 | 2枚 | 金 #e2bb55 |

投入できるのは `min(所持枚数, レアリティ上限)` です。色は属性ではなくレアリティを表します。

有効なデッキは、ちょうど30枚、すべて有効なカード、所持以内、レアリティ上限以内を満たす必要があります。29枚以下は編集途中として保存できますが、DECK INCOMPLETEで戦闘開始不可です。無効IDや30枚超えの古い/不正データも検証で拒否し、勝手に削除しません。

Gain Cardでカードを入手してから、メニューのSKILLでデッキへ投入してください。Lose Cardは所持だけ減らします。投入済み枚数より所持が少なくなった場合、デッキはそのまま残り、検証で所持不足を表示します。手動でデッキから外してください。

## 5. デッキ編集画面

1. 通常メニューのSKILLを決定します。
2. 左に所持カード、右に投入済みデッキが表示されます。
3. 下の「所持から追加」「デッキから外す」「戻る」を選びます。
4. 所持一覧のカードを決定すると1枚追加。右一覧で決定すると1枚外します。外しても所持枚数は減りません。
5. 枚数上限などに違反すると、ブザー1回と理由が表示されます。
6. Xで一覧から下のボタンへ戻ります。「戻る」または下のボタン上でXを押すと前の画面へ戻ります。

Keyboard/Gamepadの現設定ではW/S・A/Dが移動、Fが決定、Xがキャンセルです。MenuHUD経由では既存MenuHUDの物理キー補助により矢印/Enter/Escも利用できます。OpenDeckBuilderで直接開いた場合はW/S・A/D・F・Xを使ってください。マウスは下のボタン/一覧をクリックして操作します。標準Windowを使うため、ゲームパッドの標準メニュー操作も利用できますが実機確認は別途必要です。

各行にアイコン、名前、属性、コスト、★、物理/魔法、所持枚数、投入枚数を表示します。所持0枚なら空表示です。戦闘中に開いた場合は閲覧のみで、追加・削除は拒否します。

MenuHUDへの接続は新Plugin側のconfirm aliasです。SKILLだけ入力消費→決定SE→Scene pushを1回行い、他の6項目は元のconfirmへ渡します。MenuHUD画像のQ/R/X/C/V表記は変更していません。

## 6. 戦闘開始・手札循環

主人公（データベース初期パーティの先頭アクター）を先頭にして、マップ上でStart Card Combatを実行します。開始後に先頭アクターを交代するとカード使用を拒否します。

1. デッキを検証。不正なら何も開始しません。
2. ENERGYを10にします。
3. 保存デッキをコピーし、Fisher–Yatesでシャッフルします。保存デッキ自体は並べ替えません。
4. 山札から5枚を引き、5つの手札スロットに置きます。山札残り25、捨て札0です。
5. Q/E/X/C/Vで左からSlot1/2/3/4/5を使用します。
6. 成立時にENERGY消費→CE開始準備→使用カードを捨て札→同じ枠へ1枚補充します。
7. 補充時に山札が空なら、捨て札をシャッフルして山札に戻します。直前に使ったカードも含みます。

コスト不足、Nearestの対象不在、CE不正、別イベント/予約CE/カードCE実行中、同一フレームの重複入力では、ENERGY・手札・山札・捨て札を消費しません。成立後の攻撃が外れても返却しません。秒数によるクールダウンはありません。ただし、カードCEを安全に実行するため同時に開始できるカードアクションは1つです。

既存PlayerDeathControlの死亡ロック、主人公の戦闘不能、FullscreenDialogueの会話中も使用を拒否します。壊れたCEリストやCE開始準備の例外では、カードを消費せず開始を中止します。

End Card Combatで手札・山札・捨て札・ENERGY・Action Contextを終了します。所持と保存デッキは保持します。実行中のカード所有Interpreterだけ停止します。既に発生したダメージや演出を巻き戻す処理ではありません。別マップのsetup、新規ゲーム、ロード時にもランタイムを終了します。同じマップ内の場所移動は継続可能です。

CombatPresenceがOFFになっただけでは自動Endしません。カードHUDは既存BattleHUDの表示条件に従うため、敵が画面外になった場合などは見えなくなりますがカード戦闘の内部状態は継続します。イベントで明示的に終了する設計です。Mouseカードは敵不在でもAPI上使用できます。

## 7. 入力・Hotbar・HUD

Q/E/X/C/Vの物理keydownをマップ上のカード戦闘中だけcapture段階で取得します。押下端だけをキューに入れ、repeat・押しっぱなし・同一フレーム重複を抑止します。Xが同時にキャンセル/メニューへ届くことを防ぎます。keyupは通常入力にも渡して押下状態を解放します。メニュー、メッセージ、HTML入力欄、Ctrl/Alt/Meta付き操作は通常入力を維持します。Fインタラクト、マウス攻撃、ゲームパッド照準、Input.keyMapperは変更しません。

公式Hotbarのキーボードスロット更新、UseSlot/UseSelectedSlot、各スロットのuseSlotContentsはカード戦闘中だけ抑止します。終了後は元の処理へ委譲します。割当・所持・HotbarInputStatus・永続データを一切書き換えないため、危険な一時上書きや復元用コピーは不要です。カード発動のゲームパッド専用割当は第1版では追加しません。

BattleHUDの`_skillHUD.visible`だけを一時的に隠し、カードHUDを別のSpriteとして表示します。終了時は元のvisible値を復元します。Player/HP、Weapon/Ammo、Ultimate、Buff/Debuff、StatusHUDの追従処理は変更しません。既存BattleHUDの表示スイッチ・会話非表示・CombatPresence条件も維持します。

カードは長方形で、左上属性・右上コスト・上部★・中央アイコン・中央下名前・左下種類・下にQ/E/X/C/V。近くにENERGY数値とバーを描画します。外部カード画像は不要です。IconSetは既存ツクール素材を使います。

パラメータ初期値はCardWidth=150、CardHeight=210、CardSpacing=12、DefaultTargetRange=8.0です。Graphics.boxWidth/boxHeightに合わせて画面下部中央へ縮小配置し、既存HUD両側を避けます。カードBitmapは生成時に用意し、状態変化時だけ描き直します。毎フレームBitmapを生成しません。

## 8. ENERGY・通常攻撃命中通知

ENERGYは0～10、戦闘開始時10。カード成立時にCardCostを減らします。

現在のCE1/3/4には「実際に命中した、同じ1攻撃を識別するToken」が一貫して渡されていません。銃は遅れて敵CEで命中処理され、剣/fallbackとも共有のUpdateEventHpを使用します。単なるHP減少だけでは、1攻撃の複数敵/多段とカード攻撃を安全に区別できないため、自動接続していません。

次の工程では、攻撃開始時にTokenを1個作成し、その攻撃のProjectile/Hitboxへ保持させ、実命中後に同じTokenを通知する必要があります。必要ならCE1/3/4の最小変更を別途承認後に行います。

```js
const cards = ProjectR.CardSkillDeck;
const token = cards.createMainAttackToken(); // 攻撃開始で1回だけ。命中ごとに作らない。
// ...このtokenを当該攻撃の命中処理まで引き継ぐ...
cards.notifyMainAttackHit(token); // 実命中時だけ。2回目以降は回復しない。
```

文字列/有限数値Tokenも利用できます。同じ攻撃は同じToken、別攻撃は新しいTokenにしてください。Card Context実行中やcard:プレフィックスのTokenは拒否します。非同期カード攻撃を通常攻撃と偽って通知してはいけません。API自体が命中判定を行うわけではありません。

## 9. 敵・距離・照準

Nearestは使用時だけ`$gameMap.events()`を確認します。公式AEが設定したdatabaseEnemy、公式getCurrentEventHpを使い、消去済み、HP0以下、アクター/召喚、無効ページ、透明イベントを除外します。独立した敵リストは作りません。

既存`<enemy>`→NpcTags→CE3の仕組みは保持します。`<enemy>`はタグからCEを呼ぶ設定で、タグだけで敵HPやdatabaseEnemyが作られるわけではありません。既存と同じ`<hp: 敵データ名>`などの公式設定も必要です。

DotMoveの公開positionPoint()から実座標（小数タイル）を取得し、MZのdeltaX/deltaYでループマップも考慮してユークリッド距離を比較します。同距離なら小さいEvent IDを選びます。対象不在なら不発です。

Nearestは公式`turnToward(eventId, false)`、Mouseは`turnToward('mouse or gamepad', false)`を呼びます。その呼出中だけ方向固定を解除して、finallyで元に戻します。Mouseが敵不在でも照準可能になるよう、既存PlayerFacingが参照するCombatPresence判定をこの同期的な照準呼出の間だけ通します。実際のCombatPresence状態やHUD表示条件は切り替えません。

## 10. 惑星・物理/魔法・耐性

8惑星の時計回り順序は、水星→金星→地球→火星→木星→土星→天王星→海王星です。

| ID | 表示 | 推奨VFX |
| --- | --- | --- |
| Mercury | 水星 | 銀白、高速、流線 |
| Venus | 金星 | 黄白、光粒子 |
| Earth | 地球 | 青緑、岩石・自然 |
| Mars | 火星 | 赤、火花・爆発 |
| Jupiter | 木星 | 黄橙、雷・嵐 |
| Saturn | 土星 | 金、リング |
| Uranus | 天王星 | 淡青、風・冷気 |
| Neptune | 海王星 | 濃青、水流 |
| Pluto | 冥王星 | 黒紫・赤紫、侵食 |

| 攻撃属性から対象まで時計回りoffset | 倍率 |
| --- | --- |
| 0（同属性） | 1.00 |
| 1 | 1.50 |
| 2 | 1.30 |
| 3 | 1.15 |
| 4 | 1.00 |
| 5 | 1 / 1.15 |
| 6 | 1 / 1.30 |
| 7 | 1 / 1.50 |

冥王星→8惑星は1.5、8惑星→冥王星も1.5、冥王星同士は1。対象無属性/不明属性は1。不明な攻撃属性はWarningと倍率1です。

敵イベントのメモ、または有効ページの「注釈」に設定します。

```text
<PlanetAttribute:Mars>
<PhysicalResist:0.75>
<MagicResist:1.25>
```

同じタグが両方にある場合は有効ページ注釈（108/408）が優先です。耐性は自由倍率で、省略/不正数値は1、負数は0へ制限します。0=無効、0.5=半分、1.5=1.5倍です。ページが変わると再解析します。ページオブジェクト内の注釈をスクリプトで直接書き換える運用は行わず、別ページへの切替を利用してください。

ボスも別計算式を作りません。通常敵と同様の公式敵データ/HP設定に加えて惑星/耐性を設定します。例として高い物理耐性のボスはPhysicalResist:0.5、魔法弱点はMagicResist:1.5。既存`<boss>`によるノックバック等の処理は保持されます。

## 11. Action CE・Context・ダメージ接続

使用成立時、空いているMZマップInterpreterへCEを設定します。Use Card Slotプラグインコマンドが親CEから呼ばれた場合は、その親の子Interpreterとして開始します。既に実行中の無関係CEをclear/上書きしたり、予約CEを上書きしたりしません。次カードは前カードCEの実行完了まで拒否します。親子CEの待機・再開はMZ標準処理です。

ContextはactionIdごとに凍結したオブジェクトで、実行InterpreterへWeakMapで対応付けます。子CEにも引き継ぎます。Interpreterの再利用時は古いContextを消去し、通常攻撃へ漏らしません。

```js
const context = ProjectR.CardSkillDeck.currentContext(this);
// skillId, slotIndex(0～4), targetEventId(対象なしは0), attribute,
// type, cost, vfx, mapId, actionId
```

`currentContext()`は現在実行中のInterpreterを自動で参照します。戦闘CE外ではnullです。過去の発動Contextは`contextByActionId(id)`で戦闘終了まで取得できます。外部の遅延処理では最新カードを参照せず、最初のactionIdを保持してください。

公式`Game_Interpreter.calculateDamageAgainstEvent`を新Plugin側からaliasしています。条件は、当該Interpreterに有効なCard Contextがあり、damageSourceがskill、渡されたSkillがそのカード自身、対象が有効な生存敵であることです。

Skill IDを数値で渡す方法を推奨します。名前指定は名前がデータベース内で一意の場合のみ倍率適用します。同名スキルが複数ある場合に別スキルへ誤適用することを避けています。

```text
最終値 = round(公式AEが計算した基本Damage × 惑星倍率 × Physical/Magic耐性)
```

命中/回避/クリティカル/通常ダメージ式などは公式処理のままです。回避の0は0、耐性0も0になります。通常武器や別Skill、Contextなしのダメージは一切変えません。倍率をHP増減の全経路へ推測で適用しません。

次工程で作るNearest単発カードのCEには、例えば「スクリプト」で以下を設定できます。これは仕様例であり、今回はCEへ書き込んでいません。

```js
const cards = ProjectR.CardSkillDeck;
const ctx = cards.currentContext(this);
const enemy = ctx && $gameMap.event(ctx.targetEventId);
if (enemy && !enemy._erased && $gameMap.getCurrentEventHp(ctx.targetEventId) > 0) {
    // 公式基本計算＋このPluginの倍率。ここでさらに倍率を掛けない。
    const damage = this.calculateDamageAgainstEvent(enemy, "skill", ctx.skillId, 0);
    PluginManager.callCommand(this, "Hendrix_Action_Engine", "UpdateEventHp", {
        eventId: String(ctx.targetEventId),
        value: String(-damage),
        exceedMaxHealth: "false"
    });
}
```

この例は通常の公式スキルダメージ計算とHP変更を使います。スキルの状態付与など全効果を自動適用する汎用エンジンではありません。必要な追加効果は承認されたCEで設定してください。

Dynamic Event/Projectileは別Interpreterで遅れて命中するため、生成元カード情報の自動伝播は未接続です。公式のspawnEvent/spawnEventHitboxを使っても自動ではCard Contextが付きません。接続を設計する際は、発生元actionIdを該当Projectileへ保持し、実際の命中Interpreterのsetup後に`bindActionContext(interpreter, actionId)`を呼びます。対応関係が不明なイベントへ推測でbindしてはいけません。Map移動/End後のContextは無効です。

CE設計上の注意：カードCEに長いメッセージ、メニュー呼出、無限ループ、恒久的な方向固定を入れないでください。MZ通常イベントなので、待機中は通常のプレイヤー入力制限を受けます。演出を長く待つと次カードが使えなくなります。短いアクション開始CEと、将来明示的に接続する遅延命中処理を分ける設計が適切です。

## 12. VFX Design Maker / Animation Solution

公式2.0.7のHeaderと実装では、VFX DESIGNERはゲーム中にプラグイン設定のDesignerキーで開く機能です。保存データは`js/AnimationSolutionLibrary.json`に名前付きエントリーとして入り、スプライトシートは`img/pictures/`基準です。

実際の呼出名は、Plugin=`Hendrix_Animation_Solution`、Command=`showAnimationFromLibrary`です。引数はanimationName、eventId、loopCount、stickMode。stickMode=trueは初期位置固定、falseは対象へ追従です。架空のVFXコマンドは追加していません。

使用手順（別工程で素材が用意できてから）：

1. 自分でMZテストプレイを起動し、Animation Solution設定のDesignerキーを確認して開きます。
2. VFXを制作し、ライブラリーへ分かりやすい名前で保存します。
3. Library JSONと、そこに記載したspritesheetFileの画像がこのworktreeにあることを確認します。
4. CardSkillDeckのVfxRegistryへkey=`MarsSlash01`、animationName=`保存名`、target=`player`/`player front`/`target`を設定します。
5. 画像の配置確認後だけready=trueにします。初期値falseのままなら画像を要求しません。
6. カードのCardVFXへ同じkeyを設定します。演出は成立時1ループで呼び出します。

スクリプト登録も可能です（ゲーム起動ごとの設定、セーブ対象ではありません）。

```js
ProjectR.CardSkillDeck.registerVfx("MarsSlash01", {
    animationName: "自分で保存した名称",
    target: "player front",
    ready: false, // 素材を配置・確認した後にtrueへ。
    stickMode: false
});
```

購入済みSteam日本語版DLCのLibraryにはIce Wall、Ice Wall 2、Ice Spike等が存在し、Ice Wallは`Animation/Ice_Under_Smoke`の5×5スプライトシートを参照します。今回は参照調査のみで、素材やLibraryをコピーしていません。現在のworktreeにLibraryがないためサンプル実再生は保留です。

未登録/ready=falseはWarningで演出だけ省略し、ファイルアクセスを行いません。ready=trueは配置済みという明示的な宣言です。誤った宣言による画像不足は公式画像ローダーのエラーになり得るため、必ず配置確認してください。公式ライブラリー呼出は非同期で、End時の強制取消APIはありません。長時間/無限ループ演出は使わず、マップ移動を伴うカードは次工程で検証してください。

## 13. 保存と互換性

Game_Systemの`_projectRCardSkillDeck`へ以下のみ保存します。

```js
{ version: 1, ownedCards: { /* skillId: count */ }, deck: [/* Skill IDs */] }
```

旧セーブに項目がなくても、読込後または初めてAPIを使う時に空データを用意します。initializeだけに依存しません。既存デッキの不正/所持超過は保持して検証エラーにします。ロード後はカード戦闘inactiveです。

カード戦闘中はGame_System.isSaveEnabled、Scene_Map.shouldAutosave、DataManager.saveGameで保存を禁止します。ランタイムの手札/Interpreter/WeakMapを不完全に保存することはしません。Endしてから通常メニューで保存してください。StorageManagerを直接使う独自保存など、標準APIを迂回する外部コードは対象外です。

## 14. プラグインコマンド一覧

| コマンドID | 引数 | 動作 |
| --- | --- | --- |
| StartCardCombat | なし | 検証後、10ENERGY・5手札で開始 |
| EndCardCombat | なし | ランタイム終了、既存HUD/Hotbar動作へ復帰 |
| OpenDeckBuilder | なし | 編集画面を開く。戦闘中は閲覧のみ |
| GainCard | skillId, amount | 所持を追加 |
| LoseCard | skillId, amount | 所持を減算。0未満にしない |
| SetEnergy | value | 0～10へ制限して設定 |
| AddEnergy | value | 加算。負数も可、0～10へ制限 |
| UseCardSlot | slot=1～5 | 指定枠を使用。APIのindexと違い1始まり |
| GetEnergy | variableId | 指定変数へENERGY。ID0は何もしない |
| GetDeckCount | variableId | 指定変数へ保存デッキ枚数 |
| ValidateDeck | switchId | 有効なら指定スイッチON、無効ならOFF |
| DebugGrantCards | なし | Debug=true時のみ、全有効Cardの所持をレアリティ上限まで補充 |
| DebugBuildDeck | なし | Debug=true・戦闘外のみ、所持から30枚構築。不足時は既存デッキを変更しない |
| DebugDumpPiles | なし | Debug=true時のみ、手札/山札/捨て札をConsole表示 |

EnableDebugCommands初期値false。通常コマンド失敗時はブザーとConsole Warning、公開API失敗時は戻り値で理由を返します。戦闘開始失敗が見えるイベントを作る場合はValidateDeckのスイッチで分岐してください。

## 15. 公開API

以下はすべて`ProjectR.CardSkillDeck`配下です。

| API | 戻り値・注意 |
| --- | --- |
| version / keys / planets | 0.1.0 / Q,E,X,C,V / 惑星順序 |
| metadata(skillId) | 凍結済みメタデータ、非Cardならnull |
| rebuildMetadataCache() | 開発時の明示的な再解析 |
| isCombatActive(), startCombat(), endCombat() | bool / 成否 / 成否 |
| energy(), maxEnergy(), setEnergy(v), addEnergy(v) | 現在値/10/変更後値 |
| ownedCount(id), gainCard(id,n), loseCard(id,n) | 所持数 / 成否 / 成否 |
| getDeck(), addDeckCard(id), removeDeckAt(index) | 配列コピー / 成否 / 成否。削除indexは0始まり |
| validateDeck(optionalDeck) | { valid, count, errors } |
| hand(), drawPileCount(), discardPileCount() | 手札ID配列コピー / 数 / 数 |
| useSlot(index) | 0～4指定。{ ok, reason } |
| attributeMultiplier(a,b) | 属性倍率 |
| resistanceMultiplier(type,event) | 物理/魔法倍率 |
| cardDamageMultiplier(cardOrSkillId,event) | 属性×種類倍率 |
| currentContext(optionalInterpreter) | 該当Contextまたはnull |
| contextByActionId(id) | 戦闘中の保持Contextまたはnull |
| bindActionContext(interpreter,id) | 既存actionIdを明示的に対応付け。成否bool |
| createMainAttackToken(), notifyMainAttackHit(token) | 新Token / 回復を受理したかbool |
| registerVfx(key,entry) | Registry登録、成否bool |
| lastResult() | 直近の操作結果 { ok, reason } のコピー |
| Scene / CardHUD | デッキ編集Scene / HUDクラス |

手札やデッキの戻り配列を書き換えても内部データは変わりません。gain/loseなどはゲームデータが存在する時に呼びます。Scene切替中やマップ外からの戦闘開始/使用は拒否します。

## 16. 自動検査と実機テスト手順

PowerShellで必ずカードworktreeを開いて実行します。

```powershell
Set-Location 'C:\Users\hmats\Documents\RMMZ\ProjectR-CardDeck'
node --check js/plugins/ProjectR_CardSkillDeck.js
node --check js/plugins.js
node --check tests/ProjectR_CardSkillDeck.test.cjs
node tests/ProjectR_CardSkillDeck.test.cjs
git diff --check
git status --short --branch
```

テストはゲームオブジェクト・描画・入力機器をStub化し、Interpreterの親子/待機/再利用と、Window_Scrollable/Window_Selectable/Window_Command/Window_HorzCommandの初期化・選択・スクロール・入力処理にはMZ実ソースを使います。コアファイル自体は変更しません。属性は56方向＋同属性8＋冥王星17=81件、誤差1e-10で比較します。画像生成、実機入力、実際の音、実セーブファイル、公式VFX描画までは証明しません。

初回実装時の検査結果は自動テスト131件成功、JavaScript構文3ファイル成功、git diff --check成功でした。未追跡の新規3ファイルも追加で空白検査済みです。保護対象7プラグインのSHA-256、元ProjectRの事前監査対象38ファイルのSHA-256は初回実装の作業前後一致し、既存13登録の内容・順序も一致していました。当時のUI StubにはMZの初期化経路がなく、後の実機で判明した下記のエラーを検出できませんでした。

実機での確認はユーザーが別途行います。今回MZは自動起動していません。

1. まずスキルを追加せず起動。SKILLを開き、0/30・空一覧・戻るが正常であることを確認。
2. 以前のセーブをロードし、クラッシュせず空データが作られることを確認。
3. 後工程で承認したテストカード/CEを作成し、Gain Cardで入手。29枚では開始拒否、30枚で開始することを確認。
4. 左右一覧をマウスとWASD/F/X（Menu経由は矢印/Enter/Escも）で操作。上限、所持不足、削除、メニュー復帰を確認。
5. カード戦闘開始後、Q/E/X/C/Vを各1回押し、同じ枠だけ補充、ENERGY消費、押しっぱなし不発、Xでメニューが開かないことを確認。
6. Fインタラクト、通常移動、マウス/ゲームパッド照準、武器・残弾、Player/Ultimate/StatusHUDが既存どおりか確認。
7. Nearest範囲外・敵撃破後・ENERGY不足でカードが減らないことを確認。
8. 十分なSet Energyを挟んで26回使用し、捨て札の再シャッフルを確認。
9. 敵属性と物理/魔法耐性を切り替えて、公式計算経路で期待倍率/耐性0を確認。通常武器ダメージが変わらないことを確認。
10. Endすると元のSkillHUD/Hotbarへ戻ることを確認。画面の敵不在ではHUDが既存条件で非表示になることも確認。
11. 戦闘中SAVE不可・オートセーブされないこと、End後の保存/ロードで所持/編集途中デッキが維持されることを確認。
12. 素材配置後だけVFXをready=trueにして実再生を確認。通常攻撃の自動ENERGY回復は未接続なので、この段階で回復しないのが仕様。
13. この実機確認が終わるまではgit add/commit/push/merge/rebaseを行わないでください。

## 17. 次に必要なテストカード案（未作成）

最少8種類すべて★1を4枚ずつ所持すれば、7種類×4枚＋8種類目2枚で30枚を作れます。8惑星各1種類、COST1～3を割り振り、Nearestを6種類・Mouseを2種類、Physical/Magic両方を含める案です。

追加検査用として、冥王星★3・COST10、同属性のPhysical/Magic対、★2の3枚上限確認カードを別に用意すると、今回の要件を実機で広く確認できます。Skill ID、CE ID、名前、計算式、命中/演出内容は次工程で選定します。

Mouse用CEはまず無害な短い動作/ログで発動だけ確認し、Projectileのdamage接続は別の承認工程に分けてください。通常攻撃命中通知のToken伝播、非同期カードContextの伝播、完成VFX、CombatPresenceとの開始/終了自動連携は今後の課題です。

## 18. v0.1.0 空一覧クラッシュ修正（2026-09-27）

実機でMenuHUD → SKILLを開くと、`Cannot read property '-1' of undefined`が発生しました。直接原因は、カードデータを返す独自`row()`がMZ標準のカーソル行番号用`row()`を上書きしたことです。

`super(rect)` → `Window_Selectable.initialize`（`_index = -1`）→ `deactivate` → `reselect` → `ensureCursorVisible` → `row()`の順で呼ばれ、子クラスの`_rows = []`より前に`undefined[-1]`を参照していました。`-1`はMZの正常な「未選択」です。空データの破損ではなく、非空データでも初期化時やカーソル計算を壊し得る名前衝突です。

修正内容：

- データ取得を`entryAt(index)`/`currentEntry()`へ分離し、MZ標準`row()`をそのまま継承。
- 配列未初期化・非配列・負数・範囲外・非整数の取得は`null`。対象がない`drawItem`は何もしない。
- 0件なら選択は常に`-1`。親クラス初期化中も安全に扱い、`super()`より前に`this`を使わない。
- 空一覧は「所持カードはありません」「デッキは空です」を描画。通常の再描画でも消えない。
- `0 / 30`・`DECK INCOMPLETE`を維持。空一覧の決定はブザーのみでデータを変更しない。
- 一覧のキャンセルで下部操作ボタンへ戻り、もう一度キャンセル、または「戻る」の決定で前画面へ戻る。既存の操作順序を維持。
- 一覧縮小時は選択とスクロールを範囲内に戻し、最後のカードを外した後も空表示が見える。

テスト環境をMZ実ウィンドウソースに切り替えた段階で、修正前の同じ`undefined[-1]`エラーと呼び出し経路を再現しました。修正後は既存131件＋新規20件＝151件が成功しています。新規検査は新規/旧Save・カード定義0件・所持0件・デッキ0件・未初期化配列・未選択・初期化/再選択/再描画・決定/キャンセル・上下左右/ページ/マウス/ホイール・所持1/2/30/100種類・30枚デッキ・スクロール後の全件削除を含みます。データベースや実セーブにテストカードを作成していません。

今回の変更はカードPlugin・この仕様書・テストのみです。30枚Deck、5 Hand、Q/E/X/C/V、ENERGY、属性、Physical/Magic、Rarity、Save、VFX、Damage、Hotbar、BattleHUDの仕様は変更していません。`js/plugins.js`、保護対象7プラグイン、元ProjectRには変更を加えていません。

`chrome-extension://...`のSourceMap Warningは、この`TypeError`とは別件です。ProjectRのJS/JSON/HTMLに同スキーム参照がなく、ProjectR専用プラグインに`sourceMappingURL`もありません。表示されたURLは拡張機能側を指すため、DevTools設定や拡張機能を変更する対象にはしていません。省略されたURLから拡張機能名までは特定していません。

今回の修正の実機再テストは未実施です。MZは自動起動していません。カード専用worktreeのプロジェクトで次を確認してください。

1. 起動中の古いテストプレイを終了し、カード未入手の新規ゲームでMenuHUD → SKILLを開く。
2. 左右の空表示と`DECK 0 / 30  DECK INCOMPLETE`が表示され、赤いTypeErrorが出ないことを確認。
3. 左右の一覧をクリックし、決定F、上下左右、PageUp/PageDown、クリック、ホイールで落ちないことを確認。決定でカードは増減しない。
4. 一覧でキャンセルX → 下部ボタンへ戻る → もう一度X（または「戻る」をF）でMenuHUDへ戻れることを確認。
5. 旧Saveでも同様に開けることを確認。既存Saveは上書きせず、必要なら別スロットを使用。
6. カードを用意する後工程で、所持1/2/30/大量時の選択・スクロール・追加/削除・全件削除後の空表示を確認。今回はSkills.json等へテストデータを追加していない。
7. 実機再テスト完了まではgit add/commit/push/merge/rebaseを行わない。
