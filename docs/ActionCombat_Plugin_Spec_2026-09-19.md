# ProjectR Action Combat Plugin仕様・更新監査レポート

調査・更新日：2026-09-19（日本時間）

## 結論と検証範囲

購入済みSteam DLCのローカル実ファイルを根拠に、Hendrix製4プラグインを同版の日本語配布ファイルへ交換した。DotMoveSystemは同一ファイルなので変更していない。js/plugins.jsへの今回の編集は、Action EngineのCritical倍率を新しいStructへ移行する1パラメータの追加だけである。

戦闘イベントを新Sampleへ置換していない。MenuHUDの未コミット作業、ProjectR独自プラグイン8本、全16データJSON、manifest、保護対象の画像は更新前と同一。Gitへの追加・Commit・Push・mainへのmergeは実施していない。

**実機互換性の最終承認ではない。** 全ソースの検索・AST解析、Header/Parameter/Command比較、重点箇所の実装追跡、限定した実関数のスタブ検査を行った。難読化された実装・エディター用コードも含まれるため、全ゲーム動作を静的検査だけで保証するものではない。RPGツクールMZ/NW.jsは起動していない。

主な実機確認点は、通常攻撃の新しいダメージ計算、画像なしDynamic Hitboxの位置補正、Gun Objectの追従、非戦闘／戦闘の向き切替、入力、メニュー復帰である。

## 更新基準・作業範囲

- 作業ディレクトリー：C:/Users/hmats/Documents/RMMZ/ProjectR
- 更新前HEAD・main・origin/main：4b63104f3baab886d496ae32647137c7848eee0a
- 作業ブランチ：chore/update-action-combat-plugins-2026-09
- 作成操作：git switch -c chore/update-action-combat-plugins-2026-09
- HEADとorigin/mainのahead/behind：0/0。ローカル追跡参照の比較であり、今回fetchは行っていない。
- 旧6ea9a4104f93acbbfdc4f097f34c5987617820ccは戦闘基礎試作の参考チェックポイントだけとした。そこから4b63104fまでにMap001/System等に変更があるため、更新前の戦闘基準へ勝手に戻していない。
- js/plugins.jsの比較元はHEADではなく、MenuHUD登録を含む作業開始時のファイル。
- 更新前スナップショット取得時刻：2026-09-19T04:41:02.757Z（UTC）
- コピー前にも開始時スナップショットを再照合し、保護対象・更新対象の予期しない変化がないことを確認した。

更新前status：

```
## main...origin/main
 M js/plugins.js
?? img/projectr_ui/
?? js/plugins/ProjectR_MenuHUD.js
```

ステージ済み差分は空。ブランチ作成後にも同じMenuHUD関連3項目が残り、ファイル内容・ハッシュ・登録オブジェクトが一致した。

## A. Version表

「最新版」は今回SteamにインストールされているDLC内で確認した版であり、Web上の未配布版等は推定していない。

| Plugin | ProjectR更新前 | Steam EN | Steam JP | 採用／処置 |
| --- | --- | --- | --- | --- |
| DotMoveSystem | 2.2.5 | 2.2.5 | 2.2.5 | 2.2.5／変更なし |
| Hendrix_Action_Engine | 1.6.3a | 1.6.6b | 1.6.6b | JP 1.6.6bへ更新 |
| Hendrix_Animation_Solution | 2.0.5d | 2.0.7 | 2.0.7 | JP 2.0.7へ更新 |
| Hendrix_Hotbar_Creator | 2.0.4 | 2.0.7a | 2.0.7a | JP 2.0.7aへ更新 |
| Hendrix_Keyboard_Gamepad | 1.2.4c PREMIUM | 1.2.5 PREMIUM | 1.2.5 PREMIUM | JP 1.2.5 PREMIUMへ更新 |

DotMoveSystemの日本語ローカライズHeaderには古いv2.2.4表記が残るが、先頭の基本Headerは2.2.5。ProjectR/EN/JPの3ファイルはSHA-256まで一致するため、別版への変更やダウングレードはしていない。

5本すべてで、新ENと新JPのコメントを除くAST（構文構造）が一致した。日本語版を採用したが、ヘルプは日本語でもParameter/Commandの表示名には英語が残る。完全な日本語化を追加改造したものではない。

## B. 更新したPlugin一覧

共通更新元：D:/SteamLibrary/steamapps/common/RPG Maker MZ/dlc/RPG Maker Action Combat Plugin/RPG Maker Action Combat Plugin jP version)/js/plugins/

| 更新ファイル | 更新元と同じSHA-256 |
| --- | --- |
| js/plugins/Hendrix_Action_Engine.js | DACE3AEDFDEC5F1D871856206185DF93C84BE854905EC755E04DC4B1C827E6E0 |
| js/plugins/Hendrix_Animation_Solution.js | 0DAEA14517B293772DF5ADE201CEC7507E5F03552884029A406AFFE836111761 |
| js/plugins/Hendrix_Hotbar_Creator.js | 675BF52C182E486EF2ED036A346BDE30E56B0F7E51D64D90AB6D050DE2C988D1 |
| js/plugins/Hendrix_Keyboard_Gamepad.js | 5D99527DD1CAD606F3B56B17A4D138838CBF47084A8B7F5D4E71063C94F122EE |

更新元パスは上記共通ディレクトリーに各ファイル名を加えたもの。ENの比較元は D:/SteamLibrary/steamapps/common/RPG Maker MZ/dlc/RPG Maker Action Combat Plugin/RPG Maker Action Combat Plugin (En version)/js/plugins/ 。DLC直下のplugins/enおよびplugins/jpのHendrix4本とも対応するSample内ファイルと一致した。ファイル名の変更はない。ソースを独自改造せず、改行・末尾改行も含めて公式配布物と同じファイルをコピーした。

## C. 更新しなかったPlugin一覧

- DotMoveSystem.js：同一版・同一SHA-256のため交換不要。
- ProjectR_*.js：全8本を変更していない（MenuHUDを含む）。
- 追加Plugin・外部Libraryのインストールは行っていない。
- js/rmmz_*.js、data/*.json、画像・音声・effects、manifest、package.json、HotbarConfig.jsonは今回の編集対象外。

## D. Pluginロード順

| 順序 | 登録名 | 状態 |
| --- | --- | --- |
| 1 | DotMoveSystem | ON |
| 2 | Hendrix_Action_Engine | ON |
| 3 | Hendrix_Animation_Solution | ON |
| 4 | Hendrix_Hotbar_Creator | ON |
| 5 | Hendrix_Keyboard_Gamepad | ON |
| 6 | ProjectR_PlayerDeath | ON |
| 7 | ProjectR_PlayerDeathControl | ON |
| 8 | ProjectR_FullscreenDialogue | ON |
| 9 | ProjectR_FullscreenDialogueChoices | ON |
| 10 | ProjectR_CombatPresence | ON |
| 11 | ProjectR_PlayerFacing | ON |
| 12 | ProjectR_BattleHUD | ON |
| 13 | ProjectR_MenuHUD | ON |

順序・ON/OFF・全ProjectR登録オブジェクトは維持した。13登録すべてについて、登録名とjs/plugins内のファイル名が一致することを確認した。

最新版EngineのHeaderはDotMove → Animation → Keyboard → Action → Hotbarを案内している。実SampleもEN/JPで順序が違う。今回はユーザー指示の現在順序を維持し、並べ替えていない。

特に新ControlInputコマンドはKeyboardをActionより前へ置くようHeaderに明記されている。現在のProjectRではこのコマンドを使用していない。今後使用するときは、別作業として順序と独自入力制御の再検証が必要。現在順序で「すべての新機能に対応済み」とは扱わない。

## E. 各Pluginの役割・Dependency

| Plugin | 役割 |
| --- | --- |
| Action Engine | イベント生成・破棄、当たり判定、HP/ダメージ、武器表示、Ammo/Reload、NPC/Passive、移動補助 |
| Animation Solution | 連番画像／スプライトシートVFX、Idle/Walk/Run、任意フレーム・8方向画像、preload、VFX編集UI |
| Hotbar Creator | スロット／グリッドUI、装備・Item・Skill選択、仲間ごとのSkill、キー／Gamepad／Touch連携 |
| Keyboard/Gamepad PREMIUM | キー・マウス・Gamepad割当、Common Event起動、Button Config画面 |
| DotMoveSystem | 小数タイル座標の移動、角度・連続移動、移動用の衝突判定 |

Sampleのjs/plugins.js、js/plugins、js直下、js/libs、package.json、manifest.jsonを比較した。新しい必須Plugin/npm依存は確認されなかった。SampleにあるAnalogStickEx.jsはEN/JPとも登録されておらず、今回の既存動作のためにコピーする必要はない。高度な別APIで使う場合は個別に依存を確認する。

js/libsのファイル構成は共通：effekseer.min.js、effekseer.wasm、localforage.min.js、pako.min.js、pixi.js、vorbisdecoder.js。追加された外部Library指定はなく、組込みfs/path等の利用を確認。Sampleのpackage.jsonには新たなdependencies指定はない。ゲーム名やウインドウ寸法までコピーしない。

Sample側だけにある補助ファイル：

- AnimationSolutionLibrary.json：保存したVFXプリセット。未使用時は必須でない。loadAnimationLibraryは不足時に空の辞書を返す。Library名を使うときは対応プリセットと画像が必要。
- variableBarPosition.json：公式HUDの配置保存。MaithlReadUIPositionsは不足時に空設定へフォールバックする。現在HUDsは空。
- HotbarPosition.json：Sampleの補助データ。現行Hotbarの実際の設定読込先はHotbarConfig.json。ProjectRには同ファイルがあり、grids=[]、positions={}を維持。
- 新Sampleのimg/pictures/GunやReloading等は、新SampleのDisplayWeapon/VFXを採用するときの素材。現行Object: Gunに自動的に必要になるものではない。

既存manifestに列挙された47キャラクター画像はすべて実在。Pan、VFX/$Gun、VFX/$Bullet、ShootNormal.efkefc、PierceEffect.efkefcも実在を確認した。preload設定に残るimg/pictures/Animationとimg/pictures/framesはProjectRには存在しないが、これは更新前からの状態で、現行戦闘はそのVFXを呼んでいない。デスクトップのpreloadFolderは不足フォルダーを警告してスキップする。勝手に素材や空フォルダーを追加していない。

根拠：[AE:11105](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:11105)、[AS:1047](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Animation_Solution.js:1047)、[AS:4329](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Animation_Solution.js:4329)、[HB:543](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Hotbar_Creator.js:543)。

## F. Action Engine主要API

| API／Command | 現行の呼出し・返り値／要点 |
| --- | --- |
| equippedWeapon(search, slot=1) | IDまたは名前で装備を判定しbooleanを返す。equippedWeapon(2)を維持。slotは1/2（Ammo Commandの0始まりと混同しない）。 |
| equippedWeaponType(search, slot=1) | 武器タイプIDまたはSystemの武器タイプ名を照合するboolean。銃という日本語名の照合を維持。 |
| turnToward(target, forceDirection=false, maxDistance=null) | 方向を変更する。値を返すAPIではない。詳細G。 |
| rotateTo(x, y, lerpFrames) | 連続角度・回転中心を変更する。詳細H。 |
| moveToPosition(targetX, targetY, rotate=false) | 移動を開始／指定する。完了結果をbooleanで返すAPIではない。詳細I。 |
| setMoveSpeed(moveSpeed) | MZのGame_CharacterBaseメソッド。8を代入可能。コアの速度設定を使用し今回コアは変更しない。 |
| checkCollide(targetId, tags, cooldown=0, range=6) | boolean。内部で衝突履歴・ダメージ情報も更新するため、純粋な距離だけの問い合わせではない。 |
| spawnEvent / Spawn Event | templateMapIdのイベントをID/名前で生成。position、startDegree、attachTo等。 |
| spawnEventHitbox / Create Dynamic Event | テンプレート不要のイベントを生成。notetag/comment/position/rotationDegree/attachTo/waitを維持。コールバックは生成IDを返す。 |
| DestroyEvent / Destroy Event | target、destroyNearby、permanent。大文字DのCommand。 |
| destroyEvent / Destroy Event（旧方式） | identifierでID/名前/タグを指定。小文字dの別Commandで、CE1/CE4のObject: Gun cleanupは今も登録されている。 |
| UpdateEventHp | eventId、value、exceedMaxHealth。player/this/IDに加えて名前・タグ指定を拡張。-player weaponは新計算式に注意。 |
| GunAmmoControl / GunReload | 0始まりの装備slot。現在のslot=0、ammo=-1、Reloadを維持。 |
| SwingWeapon | weaponSprite/eventId/offset/zIndex/style/speed/visualSettingsを使用。表示効果だけで自動攻撃判定にはならない。 |

使用中のEngine Command 11種類は、最新版で実際の登録を確認した：spawnEvent、GunAmmoControl、GunReload、destroyEvent、spawnEventHitbox、UpdateEventHp、DestroyEvent、ControlSelfSwitch、Knockback、ShowVariableOnEvent、SwingWeapon。

根拠：[AE:16076](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:16076)、[AE:15511](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:15511)、[AE:7043](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:7043)、[AE:8124](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:8124)、[AE:8268](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:8268)。

## G. turnToward最新版仕様

Signature：Game_Character.prototype.turnToward(target, forceDirection=false, maxDistance=null)

この関数本体は旧1.6.3aと新1.6.6bでAST一致。現行の引数に破壊的変更はない。

- mouse or gamepad：Gamepad接続／入力が優先。接続中にスティックが中立でも、必ずマウスへ戻るわけではない。
- マウスはcanvasToMapX/Yでマップ座標へ変換して方向を決める。
- 通常画像は4方向。is8DirSpriteの画像は8方向処理。
- falseではDirection Fixを強制解除しない。固定中ならsetDirectionが方向変更を受け付けない。
- trueでは必要に応じて固定解除し、通常の処理終端でDirection FixをONにする。「以前の固定状態を常に復元する」という意味ではない。対象不在／範囲外の早期returnには元状態を復元する分岐もある。
- maxDistanceは対象との距離制限。戻り値は通常undefined。

ProjectRのOFF → turnToward('mouse or gamepad', false) → ONは新実装でも成立する。実関数をスタブ環境へ切り出して4方向、固定状態、ProjectR_PlayerFacingとの組合せを検査した。

4b63104f基準では、ProjectR_PlayerFacingが非戦闘中のプレイヤー照準を抑止する。したがって「銃装備中はどこでも常時マウス向き」が現在仕様だとは説明しない。戦闘中の方向更新と、非戦闘中の移動向きを保持した。

根拠：[AE:9755](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:9755)、ProjectR_PlayerFacing.jsのturnTowardラッパー。

## H. rotateTo最新版仕様

Signature：Game_Character.prototype.rotateTo(x, y, lerpFrames)

- rotateTo('mouse or gamepad')：マウス／右スティック方向へ回転。
- rotateTo('mouse or gamepad', 'player')：現行Gun Objectの回転中心指定を維持。第2引数を数値のdurationとして使う形ではない。
- rotateTo(x座標, y座標, frames)：DotMoveの座標へ回転。
- rotateTo(角度, null, frames)：指定角度へ回転。frames未指定なら従来の即時回転経路。
- rotateTo('player', frames)、ロック対象、近いタグ／名前、左スティック・移動方向等も分岐を持つ。
- 角度は上0度、右90度、下180度、左270度の扱い。_applyRotationで補間回転を扱う。
- **Breaking Change：数値1引数はイベントIDではなく角度になった。** 座標2数値の形とも区別する。

ProjectRのBulletとObject: Gunは文字列mouse or gamepadを使用しており、数値1引数の変更には該当しない。Direction Fixによる4方向本体の固定と、Spriteの連続角度回転は別の処理である。

根拠：[AE:9542](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:9542)、[AE:9697](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:9697)。

## I. moveToPosition最新版仕様

Signature：Game_Character.prototype.moveToPosition(targetX, targetY, rotate=false)

- 第2引数がbooleanならrotateとして読み替える。
- forwardのみ：現在_rotationの角度を使い、DotMoveのdotMoveByDegを呼ぶ。
- forward + 数値／tile：指定タイル分の連続移動を開始する。
- backward：現在角度+180度の逆方向移動が追加された。
- mouse or gamepad、player、イベント・タグ、ロック対象、region等の分岐を持つ。
- 戻り値で到着を判定するAPIではない。移動ルートのwait、ループ、イベントの寿命設計と組み合わせる。
- setMoveSpeed(8)はMZの速度設定値であり、「毎秒8px」等の単位ではない。

ProjectRのBulletはsetMoveSpeed(8) → rotateTo('mouse or gamepad') → forward計8回を保持。Sample最新版は生成時に角度を与えるためBullet内のrotateToを省いているが、ProjectRをその方式に置換していない。

根拠：[AE:9281](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:9281)、js/rmmz_objects.jsのsetMoveSpeed。

## J. Collision最新版仕様

checkCollide(targetId, tags, collisionCooldownInFrames=0, collisionRange=6)はGame_Map.taggedEventIsCollidingWithTargetEventへ委譲する。

- 第1引数：検査する対象。現在のplayer、イベントID、this._eventIdを継続使用。
- 第2引数：衝突候補を絞るタグ。`<enemy>`、`<weaponAttack>`、`<playerAttack>`は固定予約の自動攻撃種別ではなく、この仕組みで検索する任意タグ。
- 第3引数：フレーム単位の衝突間隔。0でも同じ対象ペアの衝突履歴を扱うため、毎回無制限にダメージを入れるという意味ではない。cooldownという文字列ではタグ側の値を読む。
- 第4引数：候補検索範囲。Hitboxの幅／高さそのものではない。CE4の2を維持。
- hitboxesAreCollidingは非回転矩形の重なり比較と、回転時の矩形投影による判定を持つ。
- 新版はmap boundary、passable等の特殊条件を拡張。既存タグの引数は変更不要。
- `<dmg: ...>`のイベントでは衝突情報にダメージ元を記録し、HPコマンドのdamage式につながる。判定だけで自動HP減少が完結するわけではない。
- 旧setCollisionStatus等の内部・旧APIは名称整理がある。現在のProjectRからの使用は検索で見つからなかった。

難読化された中心実装はEngineの長い3321行にある。新旧差分すべてを「表示だけの変更」とは扱わない。

根拠：[AE:3321](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:3321)、[AE:15511](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:15511)。

## K. Dynamic Event最新版仕様

Command IDはspawnEventHitboxのまま。表示名はCreate Dynamic Event。

- classはGame_DynamicEventからGame_MaithlDynamicEventへ変更。ProjectRはクラスを直接参照していない。
- name追加：空ならDynamicHitbox。turnToward追加：空なら追加の向き変更なし。
- positionはタイル座標の式を処理する。現在のplayer ± 1.1はそのまま。
- notetagはイベントnote、commentはコメント命令へ反映。
- rotationDegreeの空欄は0。非0なら中心基準のcustomRotationとsetRotationを設定。
- attachToは空なら追従なし。player/this/タグを指定した場合は親と相対位置を保存して追従。
- waitはイベント自身の待機後破棄。現在の1は1フレームであって1秒ではない。呼出し側を自動的に1フレーム待たせる設定でもない。
- ダメージ元のActor/Enemy等を生成元から引き継ぐ処理が追加されている。
- Destroy後は衝突・タグ登録等を解除する。別途Sprite表示は必須ではない。

根拠：[AE:7577](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:7577)、[AE:7668](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:7668)、[AE:7905](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:7905)。

## L. Hitbox最新版仕様

`<hitbox: width, height, offsetX, offsetY>`のwidth/heightはタイル数。省略可能なoffsetX/offsetYはピクセル補正。hitboxDataはタイル中央へ合わせる補正を加算する。この数値解釈の関数は旧版とAST一致。

現在のロングソードを完全維持：

| 向き | タグ | 生成位置 | wait |
| --- | --- | --- | --- |
| 下 | `<playerAttack>``<hitbox: 1.5, 1.2>` | player, player + 1.1 | 1 |
| 上 | `<playerAttack>``<hitbox: 1.5, 1.2>` | player, player - 1.1 | 1 |
| 右 | `<playerAttack>``<hitbox: 1.2, 1.5>` | player + 1.1, player | 1 |
| 左 | `<playerAttack>``<hitbox: 1.2, 1.5>` | player - 1.1, player | 1 |

rotationDegree/attachToは空欄。48pxタイルで幅×高さは上下72×57.6px、左右57.6×72px、位置差1.1タイルは52.8px。ただし最終描画／判定には位置・画像の補正も関係する。

重要変更：画像名が空のGame_MaithlDynamicEventはisObjectCharacter()がtrueを返すようになった。MZのshiftY()は通常キャラ6px、Object扱い0pxである。これにより従来の透明Dynamic Eventに生じた上寄り補正がなくなる。サイズ数値が同じでも縦位置の当たり方は再テストが必要。Changelogの1.6.6a修正と実装が対応する。

Dynamic Hitboxは通常画面へ矩形を描かない。「見た目で矩形が大きくならない」を不具合とは扱わない。今回サイズ・位置・寿命の再調整は行っていない。

根拠：[AE:2939](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:2939)、[AE:7663](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:7663)、js/rmmz_objects.js:7175。

## M. Damage最新版仕様

UpdateEventHpの既存eventId/value/exceedMaxHealthは受け付けられる。しかし計算結果の互換性は別である。

- 新MaithlCalculateDamagePlayerWeaponはSHendrix_Action（Game_Action派生）を作り、ActorのattackSkillId()を使う。
- 武器に通常攻撃スキル置換Traitがあれば、それを採用する分岐がある。単に「常にSkill 1固定」ではない。
- 現在のProjectRでは通常攻撃Skill 1の式がa.atk * 4 - b.def * 2、分散20、会心可である。
- 最新SampleのSkill 1はa.atk - b.def。Sampleのデータをコピーして計算式をそろえてはいない。
- -player weaponを使うCE1/CE3/CE4は新式の影響を受ける。従来のHP200→185などを同じ値のままと保証できない。
- ゴブリン側の`<dmg: ゴブリン>`も、新版のGame_Action／Enemyデータ・Trait対応を含むダメージ経路の再確認対象。
- 新武器ダメージ計算では通常の結果に最低1の丸め処理がある。一方、回避などには0を返す別経路もあるため、「どんな場合も最低1」とは断言しない。
- SHendrix_Action.applyCriticalは新criticalDamageSettings内の倍率を使用。ProjectRの3.0を移行済み。
- 数値が大きいだけで会心色にする旧largeNumberThresholdではなく、実際の会心情報を使う。
- HPコマンド内のdef/mdefキーワードや旧random指定など、旧式を使う別イベントは移行が必要。現在の保護対象データには該当呼出しを見つけていない。

今回、ダメージ調整やSkill 1編集は許可範囲外なので行っていない。旧威力の完全維持が必要なら、実機で数値を記録後、別作業として式・敵防御・武器の調整方針を決める。

根拠：[AE:3049](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:3049)、[AE:3086](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:3086)、[AE:5006](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:5006)、data/Skills.json ID 1。

## N. Gun最新版仕様

getGunData、setGunAmmo、setGunCapacity、GunAmmoControlの実装は旧版とAST一致。GunReloadの呼出し先はperformGunReloadからSperformGunReloadHへ内部名が整理されたが、外部Command IDは同じ。

- `<capacity: 7>`：最大装填数。
- `<ammo item: 弾薬>`：Item名またはIDで弾薬を解決。
- `<starting ammo: n>`：初回データの装填数。未指定は0であり、capacityだけでは最初から満装填しない。
- GunAmmoControl slot=0/target=ammo/value=-1：現在装填から1減算。
- 同コマンドの正の追加は所持弾薬を消費し、空き容量で制限。
- GunReload slot=0：不足分と所持数の小さい方を装填。フル装填・所持0なら追加なし。
- 内部Reload関数は成功true／不可false。Plugin Command自身の実行でSE、待機、画像を自動追加するものではない。

現在のWeapon 51／Item 31、CE1/CE2/CE3、Map002 Bullet／Object: Gun、初期装備用Map001 Event 3は変更なし。ニューゲームの1回限りセットアップは武器+1、弾薬+99、Actor 1装備、Reload、Self Switch A ONのまま。

実関数を使用した限定テストで、旧版と新版の両方が初期0 → Reload後7/所持92 → 7発消費後0/92 → Reload後7/85となることを確認。実マップのタイミング・効果音・Spriteは未検証。

最新版SampleはDisplayWeaponで銃を表示する方式へ移行したが、ProjectRのObject: Gun方式を廃止する必須変更ではない。旧spawn/destroy、`<child of: player>`、rotateToの呼出しは残っている。

根拠：[AE:12341](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:12341)、[AE:12398](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:12398)、[AE:12432](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:12432)。

## O. Swing Weapon最新版仕様

SwingWeapon CommandとSprite_WeaponSwingクラス全体は旧版とAST一致。4方向表示・描画用モーションのための処理であり、Dynamic Hitboxとは独立している。

現在CE4の引数を保持：

| 引数 | 値 |
| --- | --- |
| weaponSprite | Pan |
| eventId | player |
| offset | 0, -15 |
| zIndex | same |
| style | clockwise |
| speed | 10 |
| visualSettings | traitEffect=true / traitColor=空 / traitBlend=screen / traitOrder=above |

offsetはピクセル。speedは内部のスイング進行用の値。Sprite画像はimg/picturesから読む。clockwise、counterclockwise、fullcircle、thrust等の表示方式を持つが、今回は変更しない。

CE4の順序：Direction Fix OFF → turnToward → `<gun>`存在時にdestroyEvent(identifier=Object: Gun) → Slash1(volume80/pitch140) → SwingWeapon → 4方向Dynamic Hitbox → checkCollide → -player weapon → wait1 → HP判定 → DestroyEvent。

Pan.pngを変更していない。ファイル名PanをSpriteに使う現行設定も保持した。

根拠：[AE:11997](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:11997)、data/CommonEvents.json CE4。

## P. Enemy / Passive / NpcTags仕様

- `<enemy>`はNpcTagsからCommon Event 3へ対応付け。設定の二重JSON形式も既存のまま。
- `<hp: ゴブリン>`が敵データ参照につながり、databaseEnemyと現在HPを持つ。ProjectR_CombatPresenceが見るdatabaseEnemy/getCurrentEventHpは最新版にも存在する。
- `<passive: Projectile vs Enemy>`はコメントから名前を解決し、CE2をそのイベントIDのInterpreterで実行する。
- 新版のapplyCommonEventsFromNotetagはNpcTagsとページコメントのCE群を集約・重複排除する。`<no passive>`等のブロックやページ更新も処理する。
- NpcTagsはイベントnote、`<passive: ...>`・`<child of: ...>`・`<no sliding>`は主にページコメントを見る。どこへ書いても同じとは扱わない。
- `<child of: player>`はsetupPlayerChildにより親と相対座標を保存する。新版には子イベントoffset修正があり、Gunの位置・追従を実機で確認する。
- `<no sliding>`は移動時の滑り制御。攻撃Hitboxのサイズ指定ではない。
- `<death>`は現在のBulletがControlSelfSwitchで対象ページを探すコメント。タグを書くだけで共通の死亡処理が自動生成されるわけではない。
- `<slot text: ...>`と`<slot disallow>`はHotbar側の表示／利用制約として保持。

根拠：[AE:5954](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:5954)、[AE:5986](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:5986)、[AE:6036](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Action_Engine.js:6036)、setupPlayerChild、getCurrentEventHp、ControlSelfSwitch。

## Q. Animation Solution主要仕様

2.0.5d → 2.0.7。全体をAST解析し、Command/Struct、画像読込、AnimatedPicture、preload、キャラクター画像切替、エディター関連の変更を追跡した。

- Show VFX：Command ID showAnimatedPicture。既存IDは維持。個別連番frames/baseFilename1...、またはimg/picturesのspritesheetとrow/columnを指定する。
- Show VFX from Library：showAnimationFromLibrary。AnimationSolutionLibrary.jsonの名前を非同期に解決。ファイルや名前がない場合はVFXを再生できない。
- AnimatedPictureは内部管理クラス。rotationは度で指定され、描画側ではラジアンへ変換。flip/flipY・randomFlipX/Y・randomRotation、scale・opacity・blend・hue、Bloomを扱う。
- positionSettings.offsetX/Y、eventId、zIndex、originで配置を指定。拡縮・回転Spriteの補正も含むため、表示位置は実機で合わせる。
- followという独立した公開Command引数はない。stickMode=falseで対象追従、trueで初期マップ位置へ固定する。trueでもカメラ移動への補正は行う。
- 新player front / this front / eventID frontは、getFrontOffsetで方向に応じて半タイルのoffsetを加える。LibraryとShow VFXの両経路に実装。
- fps、loopCount、infinite、frameRange、opening/endingAnimationを扱う。
- Idle/Walk/Runはファイル名キーワードと実在画像の検出を使用。_fxや_8dir、playFrames、toFrame、Frame Speedを持つ。最新版ではフォルダー／manifest内のパス正規化や画像切替処理に変更がある。
- showDockButton追加。旧Controlキーで開くVFX Designer Button設定はHeaderから削除。VFX編集ボタンはテスト時の共通Dockへ移った。
- alwaysRunGame Parameterは削除。新版の_hxAlwaysRunは初期false、VFXプレビュー中にtrue、終了でfalse。旧常時バックグラウンド実行と同じではない。
- animationEffect（既にDeprecatedだったCommand）は削除。現行ProjectRのイベントからは呼んでいない。今後はremoveAnimationのeffect/duration等を用途に合わせて使用する。

preload：

- デスクトップではファイルシステムを列挙し、ブラウザー側ではmanifest.jsonを読む。
- Enable Preload=trueの現行設定を維持。manifest形式はfolder→拡張子なし相対パス配列のまま。
- デスクトップのScene_BootはgenerateManifestを呼び、起動時にmanifest.jsonを書き出し得る。今回Codexは起動していない。次の実機テスト後にmanifestの差分が出たら、自動生成分を区別して確認する。
- Animation 111/127はMZ標準のeffectNameでShootNormal/PierceEffectを再生するデータ。今回そのデータ・effectsを変更していない。Show VFXプリセットへ置換していない。
- 表示実機、8方向画像、Library再生、Web配布・暗号化環境は今回未確認。

根拠：[AS:769](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Animation_Solution.js:769)、[AS:987](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Animation_Solution.js:987)、[AS:1136](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Animation_Solution.js:1136)、[AS:1160](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Animation_Solution.js:1160)、[AS:1275](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Animation_Solution.js:1275)、[AS:1917](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Animation_Solution.js:1917)、[AS:3293](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Animation_Solution.js:3293)、[AS:4329](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Animation_Solution.js:4329)。

## R. Hotbar主要仕様

2.0.4 → 2.0.7a。登録済みの全Parameter値とHotbarConfig.jsonを保持。

- Slotは名前と格納物のtype/idを持ち、Gridが配置・列数・背景・操作系をまとめる。
- Weapon/Armorは装備、Item/Skillは使用やCommon Event等の処理と連携する。SwingやGunの攻撃イベントそのものを自動置換するものではない。
- 主なCommand：HotbarInputStatus、LockSlot、UseSelectedSlot、UseSlot、SetSkill、RemoveFromSlot、PushNextStuff、GamepadPushNextStuff、AllowItemUse。
- `<slot disallow>`はスロット使用を禁止。`<slot text: 式>`は数値等の追加表示。弾薬Item 31とWeapon 51のタグを保持。
- PartyMembersHotbar=trueのとき、syncActorHotbarSkillがActor別Skillを$gameSystem._actorHotbarDataへ同期。仲間交代時のSkill表示・配置等は新版で変更されている。
- TouchInput=false、GamepadUseSlotButton=A、既存Icon/Text/Font値等は完全維持。
- Button表示はInput.keyMapper/gamepadMapperを参照し、Keyboard側の設定と連携。
- showHotbarButton追加（未設定でもtrue）。旧visualEditorButtonはHeaderから削除し、共通Dockのテスト用ボタンへ変更。
- hideWhenOnPlayer追加（未設定でもtrue）。isPlayerBehindHotbar/updatePlayerOverlapFadeでプレイヤーとUIの重なりを扱う。
- 実行中の設定はHotbarConfig.jsonのgrids/positionsを読む。現在は空Gridで、ProjectRの攻撃入力はKeyboard→CE1。今回Hotbar攻撃入力を導入していない。

実機ではBattleHUD/MenuHUDと表示・入力の競合がないこと、メニュー復帰後のUIを確認する。Hotbar配置エディターを操作・保存するテストは別の変更を生み得るため、今回の戦闘確認では行わない。

根拠：[HB:510](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Hotbar_Creator.js:510)、[HB:597](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Hotbar_Creator.js:597)、[HB:2189](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Hotbar_Creator.js:2189)、[HB:2446](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Hotbar_Creator.js:2446)、loadConfigFile、syncActorHotbarSkill。

## S. Keyboard/Gamepad主要仕様

1.2.4c PREMIUM → 1.2.5 PREMIUM。4つのParameterとCustomButton Structの型・既定値に意味上の変更はない。現在のButton Configは文字列まで維持。

現在の攻撃行：

```
{
  "DisplayName": "攻撃",
  "From Key": "J",
  "To Key": "J, leftclick",
  "Gamepad Key": "RT",
  "Visibility": "Show in Button Config",
  "a": "",
  "aa": "",
  "b": "",
  "Icon": "0",
  "Common Event ID": "1",
  "Options": "triggered",
  "AllowParallel": "false"
}
```


- J、leftclick、RTをCE1へ接続。triggered、AllowParallel=falseを維持。
- leftclick/rightclickはマウスの押下を判定。middleclickも専用検出器を持つ。
- wheelup / wheeldownが新版でInput.isPressed/isTriggeredおよびButton Configのホイール捕捉へ追加。スクロールは押し続けるボタンとは異なり検出フラグをリセットする。
- remapKeysがkeyboard/gamepadのmapperを組み直す。複数キーはカンマ区切り。
- checkCustomButtonsが候補キー／Gamepadを調べ、同フレームのCE重複を抑止。AllowParallel=falseならイベント／メッセージ中に予約しない。
- Button Configの再割当データは実機側の保存設定も関わる。登録が正しくても以前にユーザーが再割当した環境では、その設定を別途確認する。
- 新ControlInputと組み合わせる場合の順序制約はD参照。

ソース上、現在のJ/leftclick/RT→CE1経路は維持される。実キーボード・RT接続・F8確認は未実施。

根拠：[KG:190](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Keyboard_Gamepad.js:190)、[KG:393](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Keyboard_Gamepad.js:393)、[KG:595](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Keyboard_Gamepad.js:595)、[KG:638](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Keyboard_Gamepad.js:638)、[KG:771](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Keyboard_Gamepad.js:771)、[KG:1082](C:/Users/hmats/Documents/RMMZ/ProjectR/js/plugins/Hendrix_Keyboard_Gamepad.js:1082)。

## T. DotMove主要仕様

Steam EN/JPとProjectRのDotMoveSystemは同じ2.2.5実ファイル。SHA-256：

6D95D9F88774D7CDE5DFE12C98942DF6630F2D4F7D4D13871A49DABA6B6AA4C7

CharacterMover、Degree、positionPoint、dotMoveByDeg、startContinuousMove等が移動の基盤。今回、移動用のcollisionRectとAction Engineの攻撃用Hitboxを同一の設定として変更していない。速度・滑り・ストレイフの実機確認は新Action Engine等との組合せを確認するためで、DotMove本体を更新したためではない。

## U. 旧VersionからのBreaking Changes・Changelog

付属資料：D:/SteamLibrary/steamapps/common/RPG Maker MZ/dlc/RPG Maker Action Combat Plugin/Action_Combat_1.6.5-1.6.6b_Changelog_JA.pdf（全9ページ）、D:/SteamLibrary/steamapps/common/RPG Maker MZ/dlc/RPG Maker Action Combat Plugin/Action Combat 166a Changelog.pdf（全6ページ）。全文を抽出して照合した。ファイル名が166aの英語資料にも1.6.6bの説明を含む。

この資料は全プラグインの全中間版を網羅する完全な更新履歴ではない。特に1.6.3a→1.6.5間およびAnimation/Hotbar/Keyboardの各中間版は、旧実ファイルと新実ファイルの差分から確認し、資料にない版ごとの日付・変更順を推定していない。

| 変更 | ProjectRへの判断 |
| --- | --- |
| Critical倍率をcriticalDamageSettings Structへ移動 | 今回3.0を移行。旧キーは保存しても新版の倍率読込には使われない。 |
| player weaponのGame_Action／通常攻撃Skill式対応 | 現在のCEに影響。旧ダメージ値を保証不可。 |
| 数値1引数rotateToのID→角度 | 現在は文字列指定なので該当なし。新規実装で注意。 |
| 透明Dynamic EventのshiftY補正修正（1.6.6a） | CE4およびゴブリンのDynamic Hitboxで位置の再テストが必要。 |
| spawnEventのspawnInFront引数削除、turnToward追加 | 現在はspawnInFront=false。新position/turnTowardを使うためのイベント変更はしていない。 |
| SetValue randomMax削除、値min:maxへ | 現在の戦闘イベントでは使用なし。 |
| largeNumberThreshold削除、実際の会心情報へ | ダメージ色の見え方が変わり得る。 |
| HP式のdef/mdef簡易キーワード廃止等 | 現在の使用式では該当呼出しなし。 |
| VFX animationEffect削除 | 現在使用なし。 |
| VFX/Hotbarの旧エディター起動キー削除 | Dockボタンへ変更。旧Parameter文字列は残したが新コードでは無効。 |
| alwaysRunGame削除 | 通常のフォーカス外実行は従来と異なる。 |
| 内部名・一部ヘルパー変更（equippedArmor等） | 現在のProjectRで呼出しなし。新規実装は現行ソース名を確認。 |

Action Engine付属Changelogの主な範囲：

- 1.6.5：Game_Action/Trait対応強化、新しい武器表示・騎乗・ランダム獲得・優先度・入力制御・Dynamic Event名等、獲得通知、通常攻撃式の変更。
- 1.6.6：Enemy/State/Trait処理、DynamicPassable、ページ/Passive、子offset等の修正。
- 1.6.6a：透明Dynamic Eventの縦ずれ、backward、Ignore $ Offset、StopQueue対象、押しっぱなし入力再開、アウトライン等。
- 1.6.6b：DisplayWeapon autoFlip、Sample Gunの表示方式・Reload状態、HP表示対象等。

AnimationはVFX front対象、画像検出、Dock・フォーカス処理等、HotbarはActor別Skill同期／表示／Dock等、Keyboardはホイール入力が新旧ソース差分で確認できる。

## V. ProjectRで注意が必要な変更

1. 銃／剣／敵のダメージ値を記録する。現行Skill 1式は新Sampleと異なる。
2. 剣の上下・左右・少し横ずれ・後方を再確認する。透明Hitboxの縦補正が変わる。
3. Gun Objectの親子offset・回転・左右切替・武器持替え後のcleanupを確認する。
4. 攻撃入力と常時Aimは別。現在の非戦闘抑止を含めて確認する。
5. 右スティックの接続がマウス優先順位に影響する。マウス確認時は接続状況も記録する。
6. 新獲得通知は未設定でも有効。初期セットアップで武器／弾薬を付与した際の表示が増える可能性がある。
7. 通知のVisual Settingは、Header上位のStruct初期値と未設定時のソースfallbackが一部異なる。今回必要な倍率移行以外は追加していないので、fallback側が使われる。
8. 新しいDockボタンはテスト画面の表示確認が必要。編集UIで保存しない。
9. MZを起動するとmanifest自動生成等の差分が出る可能性がある。検査前後で区別する。
10. 古いsave/configの移行動作は未確認。まずニューゲームを使い、必要なら別の検査として既存セーブ読込も行う。

## W. 現在実装との互換性・検査結果

| 項目 | 静的確認 |
| --- | --- |
| Gun Ammo/Reload | 外部Command・タグ維持。旧新の実関数スタブで初期装填／消費／再装填一致。 |
| Gun Projectile | 速度8、forward8回、生成・破棄・Passive・文字列rotateToの呼出しを維持。 |
| Gun Sprite | 旧Object Event方式のAPIが存在。最新DisplayWeapon方式には置換していない。 |
| Aim/Strafe | turnToward本体AST一致。OFF→false→ONと独自非戦闘抑止をスタブで確認。 |
| Swing Weapon | CommandとSpriteクラスAST一致。SEと引数・画像を保持。 |
| Sword Hitbox | 値は保持。透明イベントの補正変更につき実機で再評価。 |
| Damage | 引数は受理されるが新計算式への変更あり。旧威力と完全互換とは判定しない。 |
| Enemy/Passive | NpcTags・名前解決・イベントHP APIが存在。実マップの実行順は未検証。 |
| Input | Button Config保持。J/leftclick/RT→CE1のソース経路を確認。 |
| MenuHUD等 | 8独自PluginのSHAと登録維持。UI実動作は未確認。 |

- node --check：指定6ファイルすべて終了コード0。
- JSON.parse：指定10ファイルすべて成功。
- 実関数の限定スタブ検査：16項目成功。MZ本体を起動する実機試験ではない。
- 旧新でAST一致を確認した重点10項目：turnToward、hitboxData、getGunData、setGunAmmo、setGunCapacity、GunAmmoControl、SwingWeapon Command、Sprite_WeaponSwing、equippedWeapon、equippedWeaponType。
- 全保護対象のバイト単位SHA一致。実ファイル名とのPlugin登録整合も確認。
- git diff --cached：空。
- git diff --check：**不合格（Git本体の終了コード2）。配布元コメントの末尾空白49件**。内訳はAction 36、Animation 8、Hotbar 1、Keyboard 4。公式ファイルと同一ハッシュを維持するため改変していない。PowerShell経由の初回ツール終了値1とは別に、Gitプロセスの値2を取得して確認した。
- git diff --checkのLF→CRLF警告は、コピー前から同内容のファイル等にも出るGit設定上の警告。警告があるだけでそのファイルを編集済みと判定していない。

明確に必要だった設定移行はCritical Struct追加。戦闘データへの必須置換はソース上特定しなかったが、旧威力・当たり方を維持するための調整要否は実機結果待ち。勝手に追加修正していない。

## X. 今後利用できる新機能

今回導入した機能ではなく、別途設計して試せる候補：

- DisplayWeapon：親子Gun Objectを使わない公式武器表示。autoFlip対応。現行Gunからの切替は独立した作業にする。
- VFXのplayer front／this front：方向に応じた前方表示。
- Dynamic Eventのname／turnToward：生成後の識別・向き設定をCommand側で指定。
- backward移動、角度補間：後退・滑らかな回転。
- Actor別Hotbar Skill、ランダムアイテム獲得、獲得通知、クリック輪郭設定。
- Mount／ChangePriority／GameMode／RecoverDestroyedEvents等。
- ControlInput：利用前にロード順とPlayerDeathControl等を再検証。
- wheelup／wheeldown：新操作への割当候補。現在の攻撃割当を置換していない。

## Y. 最新公式Sampleとの差

EN/JPの最新Sampleはほぼ同じ新戦闘構成。日本語Sample内にもSword/Gun等の英語条件文字列が残る箇所がある。Sampleデータを日本語ProjectRへ無条件に移植する根拠にはしない。

| 項目 | 現在ProjectR | 最新版Sampleで確認した構成 |
| --- | --- | --- |
| 基本攻撃 | CE1→Weapon 2だけCE4 | CE13のSword/Gun分岐。入力・Stamina・Combo・他スイッチ制御を含む。 |
| Sword | 4方向Hitboxを直後に検査。Slash1、Swing Pan、wait1 | CE13/CE17等のCombo、Dash、clockwise/counterclockwise/fullcircle、スキル指定の攻撃イベント。 |
| Gun Sprite | Map002 Object: Gun、`<gun>`、子イベント追従、持替え時destroyEvent | DisplayWeapon(status=true/false、Gun、autoFlip=true)。Object: Gunイベントは最新Sampleにはない。 |
| Bullet | `<weaponAttack>`、生成後rotateTo、setMoveSpeed8、forward8回 | Map003 Event5、`<dmg: weapon>` `<magicAttack>`、生成startDegree=mouse or gamepad、内部rotateToなし、速度/8回は同様。 |
| 敵衝突 | `<enemy>`→CE3。`<weaponAttack>`判定後 -player weapon | CE1が`<magicAttack>`を判定し、-damageで処理。overTimeAttack等もある。 |
| 通常攻撃式 | Skill1: a.atk * 4 - b.def * 2 | Skill1: a.atk - b.def。両者は同じ式ではない。 |
| Ammo | capacity7、Item31、GunReload slot0 | capacity7、弾薬Item、同じAmmo/Reload API。 |
| Reload演出 | 即時Reload中心 | 60フレーム待機、Reloading VFX、状態Switch。Manual ReloadのCE10もある。 |
| Projectile寿命 | CE2で`<enemy>`/`<destroyProjectile>`→`<death>`、最終破棄 | CE30にも同じ基本構成が残る。 |
| Aim | Map001 Event4＋ProjectR_PlayerFacingの戦闘状態制御 | 発砲時turnToward(..., true)・DisplayWeapon等。ProjectR独自の戦闘判定は含まない。 |

旧1.6.3aのSampleディレクトリーそのものの保存コピーは今回の比較元にしていない。旧Sampleとの差として確証を持つのは、旧版由来の現行ProjectR実装・旧Plugin・Changelogとの対応。全旧Sampleファイル対新Sampleファイルの完全diffを取得したとは報告しない。

## 付録1. Parameter比較とMigrationの全体記録

Header比較は型・値・初期値・Struct等の意味上の差を分類した。翻訳・表示名だけの変更と、見出し用Parameterも区別している。

| Plugin | 旧定義数 | 新定義数 | 同定義 | 追加 | 削除 | 意味上の変更 |
| --- | --- | --- | --- | --- | --- | --- |
| DotMoveSystem | 0 | 0 | 0 | 0 | 0 | 0 |
| Hendrix_Action_Engine | 83 | 93 | 78 | 13 | 3 | 2 |
| Hendrix_Animation_Solution | 20 | 19 | 18 | 1 | 2 | 0 |
| Hendrix_Hotbar_Creator | 40 | 40 | 38 | 2 | 2 | 0 |
| Hendrix_Keyboard_Gamepad | 4 | 4 | 4 | 0 | 0 | 0 |

同じ名前のParameterに型そのものの変更は見つからなかった。単純な名前変更を推定して移行した項目もない。Criticalは旧トップレベル値から新Structの子項目へ格納場所が変わったため、以下の明示移行だけを実施した。

js/plugins.jsの今回の追加値：

```
{
  "plugin": "Hendrix_Action_Engine",
  "added": {
    "criticalDamageSettings": "{\"critDmgMultiplier\":\"3.0\",\"criticalBackground\":\"\",\"backgroundSize\":\"100\"}"
  },
  "removed": [],
  "existingChanged": []
}
```


新CriticalDamageSettingsの背景画像は空、backgroundSize=100をHeader Defaultから使用。EN/JP Sampleのplugins.jsは新Structをまだ持たず、旧倍率2.00、templateMapId=3の値が残っている。Sample丸ごとコピーならProjectRの3.0とMap2を壊すため採用していない。

旧critDmgMultiplier=3.0は削除せず保持したが、実際の新版倍率はcriticalDamageSettings.critDmgMultiplierから読み込まれる。全既存Parameter値は維持。古い未使用キーを勝手に掃除していない。

追加したのはこの1つだけ。ほかの新Parameterはソース内で既定処理を持つ任意機能であり、使用のために必須と確認できなかったため追加していない。Header Defaultと未設定時fallbackが違う項目は、その違いを理解した上で今後別途設定する。

### Plugin別の追加・削除・変更

#### DotMoveSystem

追加定義なし。

削除定義：なし。

意味上の定義が同じ項目：なし（HeaderのParameter定義なし）。

#### Hendrix_Action_Engine

追加定義（今回の保存設定へすべて追加したという意味ではない）：

| 名前 | 型 | Header Default |
| --- | --- | --- |
| Input Support | select | all |
| criticalDamageSettings | struct`<CriticalDamageSettings>` | {"critDmgMultiplier":"3.0","criticalBackground":"","backgroundSize":"100"} |
| forceStatusTarget | boolean | false |
| 468erhshdgfwd | 見出し／文字列 | -------------------------- |
| ItemGainNotificationzc | 見出し／文字列 | 指定なし |
| 468erhshdgfwdzxc | 見出し／文字列 | -------------------------- |
| Enable Item Gain Notification | boolean | true |
| Show Quantity | boolean | true |
| Display Duration | number | 120 |
| Visual Setting | struct`<ItemGainVisualSettings>` | {"Alignment":"center","Transparent Window":"true","aawwcczxczxc":"--------------------------","Display Above Player":"true","Above Player Vertical Offset":"-25","aawwcczxczxcvxv":"--------------------------","Position":"center, 0","Padding":"10","aawwcczxczxcvxvccc":"--------------------------","Weapon Text Color":"#FFFFFF","Armor Text Color":"#FFFFFF","Gold Text Color":"#FFFFFF","Item Text Color":"#FFFFFF"} |
| Sound Settings | struct`<ItemGainSoundSettings>` | {"Weapon SFX":"","Armor SFX":"","Gold SFX":"","Item SFX":"","General SFX Volume Pitch":"100, 100"} |
| Ignore $ Offset | boolean | false |
| Clickable Outline Settings | struct`<ClickableOutlineSettings>` | {"Color":"#FFFFFF","Thickness":"2","Opacity":"255"} |

削除定義：largeNumberThreshold、critDmgMultiplier、Fix Shaky Events。

- Drop Item Style：旧 {"type":"select","value":["icon","template"],"default":"icon"} → 新 {"type":"select","value":["icon","template","both"],"default":"icon"}。ProjectR既存値は変更していない。
- pickupSFX：旧 {"type":"struct`<PickupSFX>`","default":"{\"sfxFile\":\"Item1\",\"volume\":\"90\",\"pitch\":\"100\"}"} → 新 {"type":"struct`<PickupSFX>`","default":"{\"sfxFile\":\"\",\"volume\":\"90\",\"pitch\":\"100\"}"}。ProjectR既存値は変更していない。

意味上の定義が同じ項目：axc34234234、gameGenre、axc、deszco1、avd4、Debug Toggle Button、Debug Collision Button、axcxcxc、deszco1s、axcxcxcx、templateMapId、Events To Spawn、Spawn Actors at Start、axcx、deszco1x、avdx、NpcTags、LimitAreaOfCalling、a、desco1、aa、barSize、borderImage、showRadius、axczr、desco1er、aaww、HUDs、smartHUDVisibility、hideHUDDuringMessages、customFontFile、aaa、desco3z、aaaa、addValue、damageTextSettings、aaaazfrt、desco3zxctrwe、aaaazxce353、Gain XP when enemy defeated、Gain Gold when enemy defeated、missSfxSettings、aaaazfrtvvvc、desco3zxctrwexcvd、aaaazxce353fsdgsdh、Enemy Drop Items、aaaaz、desco3zxc、aaaazxc、Player Hitbox、playerCollisionRect、Player Graphical Offset、dashSpeedMultiplier、Auto Game Over、aaaaazxcxcxczxcxcs、desco3zxcxczsdffdfdwe、aaaazxcxsdasdczxx、Block Region ID、Allow Region ID、Building & Wall Block、blockTarget、aaaaazxcxcxczxcxcs34、desco3zxcxczsdffdfdwex1、aaaazxcxsdasdczxx234、passageType、passableSwitch、aaaazfrt33、desco3zxctrwe234、aaaazxce353zxc、Disable Right Click Menu、SoloPlayerMenu、RemoveFormation、aaaaazxcxcxcs234、desco3zxcxczsdwe、aaaazxcxczxx、Easy Conditional Branch、Move via Cursor、eventSliding。

#### Hendrix_Animation_Solution

追加定義（今回の保存設定へすべて追加したという意味ではない）：

| 名前 | 型 | Header Default |
| --- | --- | --- |
| showDockButton | boolean | true |

削除定義：VFX Designer Button、alwaysRunGame。

意味上の定義が同じ項目：-----------s--s---s--2342-----、-----------s--s---s-------、PRELOAD、-------------s--s--------、Enable Preload、Preload Folders、-----------s--s----------、BASIC SETTINGS、-------------s----------、Frame Keyword、Frame Speed、Player Frame Modifier、Nearest、-----------------------、IDLE/MOVE GRAPHIC、-----------------z------、Enable Switch、Animation Keywords。

#### Hendrix_Hotbar_Creator

追加定義（今回の保存設定へすべて追加したという意味ではない）：

| 名前 | 型 | Header Default |
| --- | --- | --- |
| showHotbarButton | boolean | true |
| hideWhenOnPlayer | boolean | true |

削除定義：5cc、visualEditorButton。

意味上の定義が同じ項目：5cccccxcxczxczxc、deszco1wcc、6cc、GamepadCursorImage、EmptySlotIcon、GamepadUseSlotButton、TouchInput、AllowEquipNonUsable、PartyMembersHotbar、1z、deszco1、2zz、VisibilitySwitch、HideUIduringMessage、ShowZeroQuantity、UnequipEmptyItems、3z、deszco1wz、4zz、ShowItemQuantity、QuantityTextOffsetY、ShowManaCost、ManaCostHeight、3zxcxewr、deszco1wz23412edsd、4zzxcxbsdf、IconReplacements、IconMaxSize、3zxcqwe123、deszco1wzcv、4zzdd、WindowSelectionSize、UseNowText、EmptySlotText、7xczz、deszco1wx、8xczz、FontSettings。

#### Hendrix_Keyboard_Gamepad

追加定義なし。

削除定義：なし。

意味上の定義が同じ項目：Show in Option Menu、Option Name、Button Config、DisallowRebindMovementKeys。

### Struct・Commandの差

- CriticalDamageSettings、ItemGainVisualSettings、ItemGainSoundSettings、ClickableOutlineSettings、RandomItemEntryが追加。
- HUD.sizeAndPositionのHeader Defaultが100, 20, 0, 0から画面中央基準のGraphics式へ変更。現在のHUDs=[]はそのまま。
- ItemGainの上位Visual Settingの初期JSONはcenter/透明/プレイヤー頭上を含むが、子Struct Defaultや未設定時fallbackは一部異なる。今回無関係な表示仕様を選び直していない。
- pickupSFXの新Header Defaultは無音だが、ProjectRのItem1/90/100を保持した。
- Drop Item Styleにbothが追加。ProjectRのiconは保持した。
- Animation/Hotbar/Keyboardの既存Struct型・既定値は意味上の変更なし。
- spawnEvent：spawnInFront削除、turnToward追加。
- spawnEventHitbox：name、turnToward追加。現在使用中の6引数は維持。
- StopQueue：target追加（空／既定this）。SetValue：randomMax削除。
- 新Engine Command：RecoverDestroyedEvents、GainItemsRandomly、GameMode、ChangePriority、ResetEventPages、ControlInput、ActorUseSkill、Mount、DisplayWeapon。
- Animation：animationEffect削除。それ以外の既存Command引数の型・既定値に変更なし。
- Hotbar/Keyboard/DotMove：Header上のCommand引数に意味上の変更なし。

### 特に保持した設定

| 設定 | 作業前／後 共通の値 |
| --- | --- |
| Action templateMapId | 2 |
| Action NpcTags | `<enemy>` → Common Event 3 |
| Critical multiplier | 3.0（新Structへ明示移行） |
| Keyboard攻撃 | J / leftclick / RT → CE1、triggered、AllowParallel=false |
| Hotbar | 開始時の全Parameter値を保持 |
| Plugin順・ON/OFF | 全13登録を保持 |
| ProjectR登録 | 全8登録の名前・status・description・parameters・順序一致 |
| 公式Pluginのdescription | Parameter移行に不要なため開始時の文字列を維持。Actionの一覧descriptionにv1.6.3aが残るが、実ファイルHeader/ハッシュは1.6.6b。 |

## 付録2. Action Combat更新前MenuHUD基準

### js/plugins.js

| 時点 | bytes | SHA-256 |
| --- | --- | --- |
| 更新前（MenuHUD未コミット登録込み） | 12425 | 0F3836C2E594ED3976A232115B978382E85B62FE41097CE86DF7E798895677FB |
| 更新後（Critical Struct追加のみ） | 12539 | 5E1D08EDB3D47DCC6E89F9FD259F6448B0B4EA7F943EB1065D9FD33FEDD9EBC5 |

今回追加したCritical Structを差し引くと、登録配列は更新前と完全一致する。ファイル文字列も「開始時のAction登録行に1設定を挿入した結果」と完全一致した。

### ProjectR_MenuHUD登録オブジェクト

配列index=12、一覧の13番目。前後で同じオブジェクト。

```
{
  "name": "ProjectR_MenuHUD",
  "status": true,
  "description": "v2.0.0 メニュー原画をそのまま表示するProjectR専用メニューの土台。",
  "parameters": {
    "ArtworkFile": "menu_main.jpg"
  }
}
```


### ProjectR_MenuHUD.js

| 相対パス | bytes（前後同じ） | 更新前／後 共通SHA-256 |
| --- | --- | --- |
| js/plugins/ProjectR_MenuHUD.js | 30865 | C287EE6EA9A2879ACEDA97DA45CCFBC15D5B52C44CEEC6DBEE42BAE970E31D72 |

SHA-256は更新前・更新後で完全一致。今回このPlugin本体を変更したファイル数は0。

### img/projectr_ui 全ファイル

| 相対パス | bytes（前後同じ） | 更新前／後 共通SHA-256 |
| --- | --- | --- |
| img/projectr_ui/menu/menu_main.jpg | 543882 | 5B6E6693D6A2E6BAEBB67BC03F74D5F3EA7C79536A6376E265BB83C952BEBC28 |

ファイル数=1。全相対パス・サイズ・SHA-256が前後一致。画像の追加・削除・変更なし。

### 開始時から存在したjs/plugins.jsの差分

以下は今回発生した差分ではない。開始時点で記録したMenuHUD登録追加のdiffである。

```
diff --git a/js/plugins.js b/js/plugins.js
index 76a761e..bd8d1a1 100644
--- a/js/plugins.js
+++ b/js/plugins.js
@@ -13,5 +13,6 @@ var $plugins =
 {"name":"ProjectR_FullscreenDialogueChoices","status":true,"description":"v1.0.0 全画面会話の上に金色に発光する専用選択肢を表示します。","parameters":{"ChoiceGoldColor":"#FFD76A","ChoiceBrightGoldColor":"#FFF3B0","ChoiceDarkGoldColor":"#9A6718","ChoiceSelectedTextColor":"#FFF4C2","ChoiceNormalTextColor":"#FFFFFF","ChoiceDisabledTextColor":"#777777","ChoiceBackgroundOpacity":"180","ChoiceGlowOpacity":"184","ChoiceGlowLayers":"4","ChoiceGlowPulseFrames":"90","ChoiceGlowPulseMinimum":"0.75","ChoiceGlowPulseMaximum":"1.00","ChoiceItemHeight":"56","ChoiceItemSpacing":"10","ChoiceFontSize":"22","ChoiceWindowWidth":"680","ChoiceWindowMaxHeightRate":"80","ChoiceWindowPosition":"center","ChoiceWindowYOffset":"0","ChoiceScreenDimOpacity":"80","ChoiceBlurFilterEnabled":"false","ChoiceHelpEnabled":"true","ChoiceHelpHeight":"100","ChoiceHelpFontSize":"20","ChoiceCursorSe":"{\"name\":\"\",\"volume\":\"90\",\"pitch\":\"100\",\"pan\":\"0\"}","ChoiceConfirmSe":"{\"name\":\"\",\"volume\":\"90\",\"pitch\":\"100\",\"pan\":\"0\"}","ChoiceCancelSe":"{\"name\":\"\",\"volume\":\"90\",\"pitch\":\"100\",\"pan\":\"0\"}","ChoiceDisabledSe":"{\"name\":\"\",\"volume\":\"90\",\"pitch\":\"100\",\"pan\":\"0\"}"}},
 {"name":"ProjectR_CombatPresence","status":true,"description":"v1.0.0 画面内の生存敵に応じてProjectRの戦闘状態を切り替えます。","parameters":{"AttackCommonEventId":"1","ScanIntervalFrames":"3","EndGraceFrames":"24"}},
 {"name":"ProjectR_PlayerFacing","status":true,"description":"v1.0.0 戦闘中だけプレイヤーを照準方向へ向けます。","parameters":{}},
-{"name":"ProjectR_BattleHUD","status":true,"description":"v1.0.0 FHD基準のProjectR専用アクション戦闘HUDを表示します。","parameters":{"DebugPreview":"false","VisibilitySwitchId":"0","HideDuringMessages":"true","UltimateVariableId":"0","UltimateMaxVariableId":"0","AssetFolder":"img/projectr_ui/battle/","GodLabel":"GOD"}}
+{"name":"ProjectR_BattleHUD","status":true,"description":"v1.0.0 FHD基準のProjectR専用アクション戦闘HUDを表示します。","parameters":{"DebugPreview":"false","VisibilitySwitchId":"0","HideDuringMessages":"true","UltimateVariableId":"0","UltimateMaxVariableId":"0","AssetFolder":"img/projectr_ui/battle/","GodLabel":"GOD"}},
+{"name":"ProjectR_MenuHUD","status":true,"description":"v2.0.0 メニュー原画をそのまま表示するProjectR専用メニューの土台。","parameters":{"ArtworkFile":"menu_main.jpg"}}
 ];
```


## 付録3. 独自Plugin・戦闘データ保護証跡

### ProjectR独自Plugin全8本

| 相対パス | bytes（前後同じ） | 更新前／後 共通SHA-256 |
| --- | --- | --- |
| js/plugins/ProjectR_BattleHUD.js | 71920 | AF58B643B4937C6753B6C09E8DC9A318584D5E01D2868EC83DB1EB518D8B59F7 |
| js/plugins/ProjectR_CombatPresence.js | 16011 | 39671C59188DA2C7A8115236EB18432BCCDB3663D2E211A5387EB1F05020DBA7 |
| js/plugins/ProjectR_FullscreenDialogue.js | 95765 | 00EAF58E1A9B5F3E1A6F6A6327B9303D2A63F101B2A37E439F9F581F7173356A |
| js/plugins/ProjectR_FullscreenDialogueChoices.js | 77876 | FEA220CB85A372603A2714D729267827ACC5DF8321D8560169CCEA36807D0764 |
| js/plugins/ProjectR_MenuHUD.js | 30865 | C287EE6EA9A2879ACEDA97DA45CCFBC15D5B52C44CEEC6DBEE42BAE970E31D72 |
| js/plugins/ProjectR_PlayerDeath.js | 3004 | 280BFEA0F922391C6BBEBA976CEA443BB506A0BAF937796F07D5B5B9830C6176 |
| js/plugins/ProjectR_PlayerDeathControl.js | 2822 | 0B069CE95B076263739C54A00B4283B05EA7385115A7D813E3E3713D5EC360F0 |
| js/plugins/ProjectR_PlayerFacing.js | 3002 | E00EC32FBC6222AFB2BF73434343BB81B6A8DB4A2AEF55013E1EB806B7AD6803 |

### 全16データJSON・manifest・指定画像

| 相対パス | bytes（前後同じ） | 更新前／後 共通SHA-256 |
| --- | --- | --- |
| data/Actors.json | 2029 | 3E889CCEBC35D0082DAD1E39E0ADF5EBD106888892E1EF4BF10F10545341AC3E |
| data/Animations.json | 71541 | 0681199A90011A0622816CB978981FB43490C0B3C49B569234DA5D813883FDB7 |
| data/Armors.json | 24868 | 0557487DD826F011F3A22DA0C28B532407EDB71D09DE47DE52ECA0F9A37E9F2C |
| data/Classes.json | 30535 | 9339552A3CCA02073DC58625E80DEEE2FF11B175D9E7C726FBFEF125D3972883 |
| data/CommonEvents.json | 14016 | 1D1CC3EDEF9E789AAA225BEFACCE16FC374F884CE9DE7DACE4EA7EF7195028A6 |
| data/Enemies.json | 2853 | 39A6570DD03EEF49AA200C58BF893C541B91A5FC6E9C2A7AF8FEFB846BE2A679 |
| data/Items.json | 12068 | 4300D7E37118F969404290253B6792BC74403ECB7C533E27E07B5933D70ACE49 |
| data/Map001.json | 42335 | 36E405958D5C629B6FE8869AF17B6F3B182B29295F062D2DDA6159852DBFF81C |
| data/Map002.json | 8704 | ADAC553FE748C3431B6743EB2C1EB7359AE35CA5A293BBEAC3FF94674969BA9B |
| data/MapInfos.json | 230 | C934C3C49213E61E57BF9ED68519EE62B0391AED149D0D9BC13EE5916D6B0C35 |
| data/Skills.json | 108138 | 36EF412B00C8F1F8EAE8BB8059E1B1667A037ABCBBD895E3DD08A6A733013679 |
| data/States.json | 14068 | 381DAD27D34411FCCCF87638EBD09DBB11A0119DD3613568DD5AF8AE9BF98F88 |
| data/System.json | 7141 | C23504BF2500F2B88836E0963037857CC6BE81822BEC243841E79483AC555EEA |
| data/Tilesets.json | 246742 | D2530779D8090BA6525DF05AC1195388DA80BFBAB08AF191FA97216F865D41BB |
| data/Troops.json | 1902 | FCF8DC75F8609F5D7F42924A578DF1351CEEA9446E7A54FF6BA0514FD0377114 |
| data/Weapons.json | 14706 | D37067CF2E76FDAA6215CA058B2759550A44A24F75DD1BF2BEE8C7CDA758E58A |
| manifest.json | 788 | BBE612742B8FC853B8DCEE212B269CDA2590CC4447DD9BB9EF9DF04D14B79C68 |
| img/pictures/Pan.png | 542 | FE7F96B3DF3485E6403026697D8C929A22D295703E6E0B202322F4FA7D7CAEF1 |
| img/characters/VFX/$Gun.png | 566 | F48B2B60793689F85EA4DF0D97173E727315659F57B6AAF044351F2027E551F6 |
| img/characters/VFX/$Bullet.png | 4261 | FBC2CA31166DC829C2BC89928BFFB86B82F9FADF71194A5A6B9BD3DA4366AA5A |

ファイル単位で一致するため、内部のWeapon 51、Item 31、CE1～4、Map001 Event 1～4、Map002 Bullet/Object: Gun、Animation 111/127も変更されていない。

Systemの4値はscreenWidth=1920、screenHeight=1080、uiAreaWidth=1920、uiAreaHeight=1080。

### 旧公式Pluginの記録

| 相対パス | 更新前bytes | 更新前SHA-256 |
| --- | --- | --- |
| js/plugins/DotMoveSystem.js | 146624 | 6D95D9F88774D7CDE5DFE12C98942DF6630F2D4F7D4D13871A49DABA6B6AA4C7 |
| js/plugins/Hendrix_Action_Engine.js | 577136 | 781C7DBF868765AF5BBAD7B9C9FC4269A9E985F91531EA3996D9BCF05DE0575D |
| js/plugins/Hendrix_Animation_Solution.js | 542903 | B331F7D97B5DD01BC3781C3E53610C739A4547B1ADDA0675D84738BA1713E71C |
| js/plugins/Hendrix_Hotbar_Creator.js | 471859 | 1A6B385702306AE929DD674CB2517FD37AFDDD341706C027E5B7CD55BDFD74E9 |
| js/plugins/Hendrix_Keyboard_Gamepad.js | 70832 | 293254745BD71CD5B5E0BCD7738512BDCB308F93DFEA86EF486C5A68C5D27C3F |

## 付録4. Git差分の分離・最終状態

A：更新前から存在したMenuHUD差分（保持したまま）：

- js/plugins.jsのProjectR_MenuHUD登録追加と直前行のカンマ。
- js/plugins/ProjectR_MenuHUD.js（未追跡）。
- img/projectr_ui/menu/menu_main.jpg（未追跡）。

B：今回のAction Combat更新で新規に発生した差分：

- js/plugins/Hendrix_Action_Engine.js：公式JP 1.6.6bへコピー。
- js/plugins/Hendrix_Animation_Solution.js：公式JP 2.0.7へコピー。
- js/plugins/Hendrix_Hotbar_Creator.js：公式JP 2.0.7aへコピー。
- js/plugins/Hendrix_Keyboard_Gamepad.js：公式JP 1.2.5 PREMIUMへコピー。
- js/plugins.js：ActionのcriticalDamageSettingsのみ追加。
- docs/ActionCombat_Plugin_Spec_2026-09-19.md：この新規レポート。

「MenuHUD関連で今回変更したものが0」という判定は、共有ファイルjs/plugins.js自体が無変更という意味ではない。MenuHUD本体・画像・登録部分が無変更で、共有ファイルのAction設定だけを変更したという意味である。

Gitのdiff --statは未追跡のレポート／MenuHUD／画像を含まない。またHEADとの差分には開始時のMenuHUD登録が含まれるため、それだけを今回の編集一覧にしていない。

最終status・最終検証コマンド結果は次の最終監査欄へ記載する。git add/commit/push/merge/restore/reset/clean/stashはいずれも実行していない。

## 付録5. 次にユーザーが行う実機テスト

Codex側ではRPGツクールMZを起動・保存していない。静的検査だけでは判定できない内容を以下の順に確認する。

1. 自分でProjectRを開き、まずデータやPlugin設定を保存し直さずにテストプレイする。最初はニューゲームを選ぶ。既存セーブの上書きを避ける。
2. F8を開き、起動エラーがないか確認する。新しい獲得通知やDockの表示も記録する。
3. 自動セットアップが1回だけ動作し、テストハンドガン装備・装填7発になることを確認する。ページを調べるための左クリック操作は不要。
4. マウスで4方向を狙い、プレイヤーの向き・Gun Sprite・Bulletの方向と速度を確認する。敵がいる戦闘状態と、敵がいない非戦闘状態を区別する。
5. Jと左クリックをそれぞれ試す。7発消費後のAmmo/Reloadと所持弾数を確認する。Gamepadを使う場合はRT・右スティックも別に確認する。
6. 公式銃テスト敵へ命中させ、HPの前後・会心の有無・表示ダメージを記録する。Animation111/127、Gun1、Knockbackも確認する。以前の15ダメージと違っても、直ちに命中APIの故障と決めない。
7. 既存の方法でロングソードへ持ち替え、Gun Spriteが残らないことを確認する。
8. 剣の上下左右、少し横ずれ、後方へ順に試す。特に透明Hitboxの縦補正が変わった点に注意する。Slash1、Swing、Pan画像、Animation6非表示、HP減少を確認する。
9. Gunへ戻してAmmo/Reload/Bulletが継続することを確認する。ゴブリンからの攻撃、HP減少、死亡時入力禁止も確認する。
10. MenuHUDを開き、閉じて戻る。FullscreenDialogue・BattleHUD・非戦闘／戦闘切替が崩れていないか確認する。
11. F8にエラーがないか再確認する。VFX/Hotbarの編集UIは保存しない。
12. テスト終了後、git statusでmanifest等の自動生成差分を確認する。予期しない差分があってもrestore等で消さず、内容を報告する。合格するまでStage/Commit/Push/mergeしない。

記録するとよい項目：使用武器、敵、攻撃方向、HP前→後、会心の有無、Ammo/所持数、Gamepad接続有無、F8のエラー全文。

## 付録6. 最終監査・要求54項目の回答

| 番号 | 要求項目 | 結果 |
| --- | --- | --- |
| 1 | 更新Branch | chore/update-action-combat-plugins-2026-09 |
| 2 | 更新前HEAD | 4b63104f3baab886d496ae32647137c7848eee0a |
| 3 | ProjectR旧Version | Dot 2.2.5 / Action 1.6.3a / Animation 2.0.5d / Hotbar 2.0.4 / Keyboard 1.2.4c PREMIUM |
| 4 | Steam EN最新 | 2.2.5 / 1.6.6b / 2.0.7 / 2.0.7a / 1.2.5 PREMIUM |
| 5 | Steam JP最新 | ENと同じ5版。Dotの古い日本語Header表記の注意はA参照 |
| 6 | 採用Version | A表のとおり。Hendrix4本はJP、Dotは既存同一ファイル |
| 7 | 更新Plugin | Action / Animation / Hotbar / Keyboardの4本 |
| 8 | 更新しないPlugin | DotMoveSystemと全ProjectR独自Plugin |
| 9 | 更新元 | Bの共通JPパス内の各JS。個別SHA-256もBに記録 |
| 10 | 日本語版採用 | はい。表示項目の一部が英語なのは配布物そのまま |
| 11 | 新Dependency | 現行動作に追加必須のものは確認されず。Sample補助ファイルはE参照 |
| 12 | Parameter差分 | 付録1に同名・追加・削除・型・Default・Struct・Commandを分類 |
| 13 | Migration | Action criticalDamageSettingsを1個追加。既存値の削除・変更0 |
| 14 | templateMapId | 2を保持 |
| 15 | NpcTags | `<enemy>` → CE3を保持 |
| 16 | Critical | 3.0を新Struct内へ移行 |
| 17 | Keyboard設定 | J / leftclick / RT → CE1を完全保持 |
| 18 | Plugin順 | 13登録の順序・ON/OFFを保持 |
| 19 | turnToward | 3引数Signature、本体AST一致。OFF→false→ONをスタブ確認 |
| 20 | rotateTo | 数値1引数は角度へ変更。現在の文字列呼出しはそのまま |
| 21 | moveToPosition | forward継続、backward追加。Bullet速度8・forward8回を維持 |
| 22 | Dynamic Event | name/turnToward追加、生成元情報・内部クラス変更。現行引数を保持 |
| 23 | Hitbox | サイズ・位置・waitを保持。透明イベントの6px上寄り補正解消に注意 |
| 24 | Collision | 既存タグ引数継続。衝突履歴・ダメージ元情報・特殊判定を拡張 |
| 25 | Damage | 通常攻撃Skill式を使用。従来のダメージ数値との完全互換は保証しない |
| 26 | Gun | Ammo/Reloadの外部API継続、実関数限定検査で旧新一致 |
| 27 | Swing Weapon | CommandとSpriteクラスAST一致、全CE4設定保持 |
| 28 | Animation | front対象、Dock、画像切替等を更新。標準111/127はデータ無変更 |
| 29 | Hotbar | Actor別Skill同期・重なりフェード・Dock。既存全設定保持 |
| 30 | Keyboard/Gamepad | wheelup/wheeldown対応。既存Button Configを保持 |
| 31 | DotMove | 同梱2.2.5とバイト一致、更新なし |
| 32 | Breaking Changes | U参照。Damage・数値rotateTo・透明Hitbox・旧設定/Command等 |
| 33 | 現在戦闘との互換性 | 使用APIの存在と重点処理を静的確認。実機互換性は未確定 |
| 34 | 追加修正の要否 | 必要な倍率設定移行は実施済み。戦闘数値/位置の追加調整は実機結果次第 |
| 35 | 有用な新機能 | DisplayWeapon、VFX front、Dynamic名/向き、backward、ホイール等（未導入） |
| 36 | 最新Sampleとの差 | GunがDisplayWeapon、Bulletがdmg/魔法攻撃タグ、敵が-damage、Skill1式も相違 |
| 37 | 作成レポート | C:/Users/hmats/Documents/RMMZ/ProjectR/docs/ActionCombat_Plugin_Spec_2026-09-19.md |
| 38 | node --check | 指定6件すべて終了コード0 |
| 39 | JSON.parse | 指定10件すべて成功 |
| 40 | Custom hash | ProjectR独自8本の前後SHA-256一致 |
| 41 | 戦闘データ | 指定オブジェクトを含むファイル・素材の前後SHA-256一致 |
| 42 | git diff --check | Git終了コード2、公式コメントの末尾空白49件。独自に修正せず配布元ハッシュ維持 |
| 43 | 今回の変更ファイル | 公式4JS、js/plugins.js、仕様MDの計6ファイル。A/B分離は付録4 |
| 44 | git status | 下記の出力。全変更unstaged、cached diffは空 |
| 45 | 実機確認項目 | 付録5の12手順。RPGツクールはCodexから起動していない |
| 46 | 新しい基準HEAD | 4b63104f3baab886d496ae32647137c7848eee0a |
| 47 | MenuHUD更新前status | M js/plugins.js、?? img/projectr_ui/、?? js/plugins/ProjectR_MenuHUD.js |
| 48 | MenuHUD前後SHA-256 | C287EE6EA9A2879ACEDA97DA45CCFBC15D5B52C44CEEC6DBEE42BAE970E31D72（前後同一） |
| 49 | UI画像の前後一致 | 1ファイル、パス・サイズ・SHAすべて一致 |
| 50 | MenuHUD登録の前後一致 | 名前/status/description/parameters/13番目の配置が完全一致 |
| 51 | 今回のMenuHUD変更数 | 0。共有js/plugins.jsのAction設定変更とは区別 |
| 52 | 開始時の差分 | MenuHUD本体・画像・登録追加。付録2/4のA |
| 53 | 今回発生した差分 | 公式4本の更新、Critical Struct追加、仕様レポート新規。付録4のB |
| 54 | Branch作成時のdirty維持 | 作成直後に3項目と内容・ハッシュを再確認。一切退避/破棄せず引き継いだ |

### 最終git status --short --branch

```
## chore/update-action-combat-plugins-2026-09
 M js/plugins.js
 M js/plugins/Hendrix_Action_Engine.js
 M js/plugins/Hendrix_Animation_Solution.js
 M js/plugins/Hendrix_Hotbar_Creator.js
 M js/plugins/Hendrix_Keyboard_Gamepad.js
?? docs/
?? img/projectr_ui/
?? js/plugins/ProjectR_MenuHUD.js
```

通常statusでは新規docsディレクトリーと表示される。今回作成した中身はActionCombat_Plugin_Spec_2026-09-19.mdのみ。

### 最終Git検査

- git status --porcelain：上記8項目に対応する5件の未ステージ変更と3件の未追跡ディレクトリー／ファイル。
- git diff --cached：空、終了コード0。
- git diff --cached --stat：空、終了コード0。
- HEAD / main / origin/main：いずれも4b63104f3baab886d496ae32647137c7848eee0a。
- ahead/behind：0/0。
- data、manifest、package、確認したMZ core、HotbarConfigへのGit内容差分：空。
- js/plugins.js限定のgit diff --check：終了コード0。
- 新規仕様MDの末尾空白検査：0件。参照したソースへのファイルリンク・行番号も検査した。
- 全体git diff --check：終了コード2。49件すべて配布元と同一内容のコメント末尾空白であることを確認。
- 最終の再スナップショットでも、MenuHUD登録・画像・独自Plugin・全保護データの一致を確認。

### Gitで実施していない操作

git add、git commit、git push、mainへのmerge、git restore、git reset、git clean、stashは実行していない。変更はこの更新ブランチ上の未ステージ状態で残している。実機テスト・承認前のチェックポイント作成も行っていない。
