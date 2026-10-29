# ProjectR 第三者素材台帳

新しい外部素材を追加するときは、**素材名・作者・入手元・ライセンス・商用可否・改変可否・必要なクレジット・取り込んだファイル**を
ここに追記してください(既存の記録は上書きしない)。ライセンスを確認できない素材・ゲームから抜き出した素材・
著作物キャラクター・有料素材(購入前)は使いません。

## 1. 今回(Character Animation + 新銃)の外部素材

**外部素材は取り込んでいません(2026-10-27 の三頭身フェーズでも、新しい外部ファイルは0件)。** 主人公の三頭身は**ProjectRの自作**(第2節)です。

- 三頭身の主人公(Idle/Walk/Run/剣/銃/詠唱/奥義/被弾/ダウン)に必要な素材を満たす、ライセンスを確認できた無料素材は用意できませんでした。
  合わない素材を無理に入れて完了にしないため、**開発用の仮素材と仕組み(プロファイル/行動シート差し替え)だけ**を入れています。
- 導入済みのRTP(`img/characters/Actor*.png`、`People*.png` など)は標準48pxで、三頭身には使えません。
  Action Combat / Animation Solution の付属サンプル素材にも、三頭身の行動シートは含まれていませんでした(確認した範囲)。

## 2. 今回追加したProjectR自作の開発用素材(第三者素材ではない)

| ファイル | 内容 | 作成 | ライセンス/扱い |
|---|---|---|---|
| `img/pictures/ProjectR_G17_Dev.png` | G17の仮シルエット(40×16。左端=回転中心、右端=銃口) | ProjectRが`zlib`で自動生成(外部素材を使っていない) | プロジェクト内の仮素材。**最終アートに置き換える前提**。商用利用の制約なし |
| `img/characters/VFX/$ProjectR_G17Bullet.png` | 弾の仮画像(144×192、3×4セルとも同じ縦の弾道=2px幅×15px長の小さな弾筋。回転は`rotateTo`) | `tools/gen_dev_bullet.cjs`で自動生成(外部素材なし) | 同上 |
| `img/characters/$DEV3H_*.png`(11枚: Idle_f4 / Walk_f6 / Run_f6 / SwordAttack_f6 / GunAim_f2 / GunFire_f3 / GunReload_f6 / SkillCast_f6 / Ultimate_f8 / Damage_f3 / Down_f4) | **三頭身の開発用主人公DEV3H**(1コマ96×96、身長84px=頭28px×3、4方向。髪・顔・上着などはすべてコードで描画) | `tools/gen_dev3h_character.cjs`で自動生成(外部素材・既存キャラの流用なし。オリジナルのデザイン) | プロジェクト内の仮素材。**最終アートに置き換える前提**。商用利用の制約なし。取得日 2026-10-27 |

### 2-b. Phase H1(Hermes「絶」)で追加したProjectR自作の開発用素材(第三者素材ではない・2026-10-29)

| ファイル | 内容 | 作成 | ライセンス/扱い |
|---|---|---|---|
| `img/characters/$DEV3H_CrossArms_f4.png` | 絶の「胸の前で両腕をクロス」(4コマ x 4方向、1コマ96x96) | `tools/gen_dev3h_character.cjs` の `CrossArms` で自動生成(既存の`$DEV3H_*`は再生成・上書きしていない。新規ファイルのみ追加) | プロジェクト内の仮素材。**最終アートに置き換える前提**。外部素材なし |
| `img/pictures/Animation/ProjectR_Zetsu_Noise.png` | 絶の黒白ノイズ(640x320、8コマ=4列x2行、1コマ160px) | `tools/gen_dev_cutin_vfx.cjs`(固定シードの乱数ブロックノイズ) | 同上。VFX Designerのライブラリ(`js/AnimationSolutionLibrary.json`)から参照 |
| `img/pictures/ProjectR_CutIn_Hermes_Eyes_DEV.png` / `ProjectR_CutIn_Player_Eyes_DEV.png` | カットイン用のHermes/主人公の目元の仮絵(512x128) | 同上(楕円と円だけで描く簡易の目元) | 同上。**Hermesの最終デザインではない**。最終の肖像画ができたら同名ファイルを差し替えるか、`ProjectR_CutIn`のパラメータ(GodEyesJson/PlayerEyesFile)だけを変える |
| `js/AnimationSolutionLibrary.json` | VFX Designerのライブラリ(`ProjectR_Zetsu_Departure` / `ProjectR_Zetsu_Arrival`) | 導入版Animation Solution v2.0.7が読む項目を直接書いたもの(デザイナーのGUIで保存した形ではない) | データ。外部素材なし |

音(布の擦れる音)の素材は**未用意**です(外部素材は取り込んでいません)。

## 3. 既存素材の再利用(新規取り込みではない)

| ファイル/データ | 用途 | 備考 |
|---|---|---|
| `audio/se/Gun1.ogg` | 発射音(音量45) | RPGツクールMZ標準RTPのSE。プロジェクトに同梱済み |
| `audio/se/Gun2.ogg` | リロード音(仮。音量50、ピッチ90) | 同上。**専用のリロード音は未用意** |
| `audio/se/Buzzer1.ogg` | 空撃ち音 | 同上 |
| `img/system/Balloon.png` | 睡眠/精神安定のふきだし | 同上 |
| `img/characters/VFX/$Bullet.png` / `$Gun.png` | Apolloの矢のPrefabが使用中(`$Bullet`) / 旧Gun(`$Gun`は未参照のまま保持) | 既存。削除していません |

### 2-c. Phase H2B-1(薙ぎ払い・葦笛)で追加したProjectR自作の開発用素材(第三者素材ではない・2026-10-29)

| ファイル | 内容 | 作成 | ライセンス/扱い |
|---|---|---|---|
| `img/characters/$DEV3H_ArmSweep_f4.png` | 薙ぎ払いの主人公モーション「腕を前に振り払う」(4コマ x 4方向、1コマ96x96) | `tools/gen_dev3h_character.cjs` の `ArmSweep` で自動生成。`tools/gen_dev_h2b1_assets.cjs` が書き出す | 自作。ProjectRの内部利用(最終アートで差し替え前提) |
| `img/pictures/Animation/ProjectR_Sweep_Staff.png` | 杖の残像(白・半透明。1コマ400px、4列x2行=8コマ、上向きが基準) | `tools/gen_dev_h2b1_assets.cjs`(外部素材なし) | 同上。VFX Designerライブラリ `ProjectR_Sweep_Staff` から参照 |
| `img/pictures/Animation/ProjectR_Flute_Ripple.png` | 葦笛の水面の波(白・半透明。1コマ800px=半径8マス、4列x2行=8コマ) | 同上 | 同上。ライブラリ `ProjectR_Flute_Ripple` |
| `img/pictures/ProjectR_Caduceus_DEV.png` | ケーリュケイオン(杖)の仮絵(64x32。公式Swing Weaponの武器画像。Pan.pngと同じ寸法・向き) | 同上 | 同上 |
| `js/AnimationSolutionLibrary.json` | 上の3項目に加え `ProjectR_Hermes_Vanish`(Hermesが消えるときの黒ノイズ。既存の `ProjectR_Zetsu_Noise.png` を流用)を追記 | 導入版Animation Solution v2.0.7の項目形式を追記(既存項目は変更なし) | 自作 |

効果音: 薙ぎ払いの「ズシャッ」にはRTP同梱の `audio/se/Slash2.ogg` を**仮に**当てています(Pluginパラメータ `SoundEffect` で変更/無音にできる。専用音ができたら差し替え)。葦笛の「笛の音」はRTPに該当する音が無く(Sleep.oggは状態異常のSEで笛ではない)、代用の音は鳴らしていません(**未用意**)。

### 2-d. Phase H2B-2(一閃・ストレングス)で追加したProjectR自作の開発用素材(第三者素材ではない・2026-10-29)

| ファイル | 内容 | 作成 | ライセンス/扱い |
|---|---|---|---|
| `img/pictures/Animation/ProjectR_Issen_Trail.png` | 一閃の斬撃の軌跡(白。1コマ160x560、4列x2行=8コマ。上向きの11マス) | `tools/gen_dev_h2b2_assets.cjs`(外部素材なし。固定シード) | 自作・差し替え前提。ライブラリ `ProjectR_Issen_Trail` |
| `img/pictures/Animation/ProjectR_Issen_Lightning.png` | 白と黒の雷(同寸法) | 同上 | 同上。ライブラリ `ProjectR_Issen_Lightning` |
| `img/pictures/Animation/ProjectR_Strength_Circle.png` | ストレングスの黄金の魔法陣(1コマ240、8コマ) | 同上 | 同上。ライブラリ `ProjectR_Strength_Circle` |
| `img/pictures/Animation/ProjectR_Strength_Light.png` | 魔法陣から立ち上る黄金の光(1コマ240x320、8コマ。Add合成) | 同上 | 同上。ライブラリ `ProjectR_Strength_Light` |
| `img/characters/$DEV3H_FistPump_f4.png` | 主人公のガッツポーズ(4コマ x 4方向、1コマ96x96。腕の表現は暫定で弱い) | `tools/gen_dev3h_character.cjs` の `FistPump` | 自作 |
| `js/AnimationSolutionLibrary.json` | 上の4項目を追記(既存項目は変更なし) | エディタ互換の形式を直接追記(エディタでの作成ではない) | 自作 |

効果音: 一閃の「風を切る音」・ストレングスの「輝く音」は、RTPに**検証できた**該当の音が無く、代用音は鳴らしていません(**未用意**)。

## 4. 不足している素材(用意でき次第、ここに記録)

- **一閃(風を切る音)・ストレングス(輝く音)**(Phase H2B-2で確認): 検証済みの素材が無く、代用音も使っていない。内容要件(未用意)。

- **葦笛(新)の「笛の音」**(Phase H2B-1で確認): RTPの`audio/se`に笛の音は無い。第三者素材は取り込まず、代用音も鳴らしていない。内容要件(未用意)。

- **絶(Zetsu)の「布の擦れる音」**(Phase H2Aで確認): RTPの`audio/se`(345本)に該当する音は無く(Wind/Moveは別の音)、OGGを作る道具も無いため自作もできません。第三者素材は取り込まず、代用の音も鳴らしていません。**内容要件(未用意)**。

- 三頭身主人公の**最終アート**(現在は自作のDEV3H。4方向。8方向が望ましい)
- 銃の最終画像、リロード専用SE、排莢/煙のVFX
- 神(Hermes/Apollo)の最終ビジュアル(既存: 仮のマーカー画像)

## 5. 三頭身素材の候補調査(2026-10-27・**未取り込み**)

目的: ライセンスを確認できる無料の三頭身(4/8方向、Idle/Walk/Run/攻撃/銃)素材。**ダウンロード・取り込みはしていません**
(取り込み前にファイル名・入手元・サイズを示して許可を得る)。ページの記述だけを根拠にしており、画像そのもの
(頭身・向き・コマ寸法)は確認できていません。

| 候補 | 作者 / 入手元 | ライセンス(ページの記述) | 内容(ページの記述) | 合わない点・未確認点 |
|---|---|---|---|---|
| Hand-Drawn Square Characters Animated 8 Directions | RGS_Dev / [itch.io](https://rgsdev.itch.io/hand-drawn-square-characters-animated-8-directions-top-down-free-cc0)・[OpenGameArt](https://opengameart.org/content/hand-drawn-square-characters-animated-8-directions-top-down-free-cc0) | **CC0**(商用可と明記、クレジット不要、生成AI不使用) | 8方向・トップダウン、128×128、4体(基本/ヒーロー/骨/モンスター)、Idle/Walk、銃1丁、約3MB | 「四角い」キャラで頭身の記述なし。Run・攻撃・射撃・リロードなし。「開発中」表示 |
| Action hero (free, CC0) | Printer Not Found / [itch.io](https://printer-not-found.itch.io/sci-fi-hero) | **CC0**(ページに明記。商用可の文言は無いがCC0は商用可)、生成AI不使用、40KB | Idle、銃を構えるポーズ、射撃、Run、スライド、転倒/起き上がり、しゃがみ、パンチ×2、キック | 視点(横/トップダウン)・コマ寸法・頭身が不明。リロード・被弾なし。向きの数が不明 |
| Free Pixel Art Characters – Starter Pack | Clockwork Raven / [itch.io](https://clockworkraven.itch.io/free-pixel-art-characters-starter-pack) | 商用可・改変可・クレジット任意・**単体の再配布/販売は不可**(詳細ライセンスは外部Google Driveで未読)、生成AI不使用 | 48×48、RPGツクールMV/MZのグリッド互換、16キャラ、149KB | 標準48pxで背の高い三頭身ではない。アニメの内容・銃の有無が不明 |
| Toon Characters 1 | Kenney / [OpenGameArt](https://opengameart.org/content/toon-characters-1) | **CC0** | 6キャラ×45ポーズ、別パーツ、スプライトシート、ベクター元データ、5.5MB | ポーズの一覧・視点・寸法が不明(2D)。トップダウン4方向ではなくポーズ集 |
| Chibi Swordman | sonild / [OpenGameArt](https://opengameart.org/content/chibi-swordman) | **CC0** | Attack/Idle/Jump/Run/Walkが各1(制限版) | 視点不明(横スクロールの可能性)、完全版は有料。銃なし |
| Zora Graphics RMMZ Character Base | Zora / [itch.io](https://zora-graphics.itch.io/rmmz-character-base) | CC BY-**ND** 4.0(有料・最低$3) | RPGツクールMZ向け | **改変不可**のため拡大・色替え・三頭身化ができない。不採用 |
| Universal LPC Spritesheet Generator ほか | LPC / [GitHub](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) | 素材ごとに CC0 / CC-BY / CC-BY-SA / GPL が混在 | 4方向の標準的なトップダウン | CC-BY-SA等は派生物にも同じ条件が及ぶため、使うパーツごとの確認が必要。銃の動作なし。三頭身ではない |

### 結論
- **条件(三頭身 + 4/8方向 + Idle/Walk/Run + 近接 + 銃の構え/発射/リロード + 被弾/ダウン)をすべて満たす無料素材は、確認できた範囲ではありません。**
- 最も近い組み合わせ案(いずれも**未取り込み**): 8方向の移動は RGS_Dev(CC0)、銃のポーズと発射は Action hero(CC0)。ただし画像で視点と頭身を確認するまで採用不可。
- 画像を見られていないため、**頭身が三頭身かどうかは未確認**です。取り込む前に、zipを専用の空フォルダへ展開して目視確認する手順を推奨します。
- 取り込むときは、このファイルの上の台帳(素材名・作者・入手元・ライセンス・商用可否・改変可否・クレジット・取り込んだファイル)へ追記します。

### 5.1 ダウンロードして目視確認した結果(2026-10-27・**取り込みなし**)

RGS_Dev と Action hero を、リポジトリ外の専用フォルダへダウンロード・展開して確認しました(プロジェクトには何も追加していません)。

| 項目 | RGS_Dev「Hand-Drawn Square Characters」 | Action hero「science-fiction hero」 |
|---|---|---|
| 入手 | OpenGameArt の zip(2,787,603 B)。License.txt: 「CC0。商用可、クレジット不要」(作者 Raphael Gonçalves / RGS_Dev) | itch.io の zip(41,296 B)。ページに CC0 の記述のみ(ライセンス本文のファイルは同梱なし) |
| 同梱ファイル | 個別PNG 約260枚(128×128)、`gun.png`、`bullet.png`、Death FX、Jump FX、`.url`ショートカット(**開いていません**) | `science-fiction hero.png`(896×768)、`.gif`、`.aseprite` |
| 見た目 | 四角いブロック(顔つき)のキャラ。手足なし。Hero は青い箱に赤い帯・赤い飾り。描画領域は 42×46px(128pxセル内) | 側面視(右向き)の人型。描画領域は約 8×25px(1コマ)と非常に小さい |
| 頭身 | **約1頭身**(頭と胴の区別がない)。三頭身ではない | 頭 約4〜5px/全身 25px → **約5〜6頭身**。三頭身ではない |
| 向き | 5方向のみ(down / down_right / right / up / up_right)。残りは左右反転で補う想定。**8方向の個別絵ではない** | **右向き1方向のみ**(横視点) |
| アニメ | Idle(4コマ)と Jump(8コマ)、死亡/ジャンプのFX。**Walk・Run・攻撃・射撃・リロードなし** | Idle、構え、射撃(5コマ)、Run(14コマ)、パンチ、キック、スライド、しゃがみ、転倒、起き上がり。**リロード・被弾なし** |
| 銃 | 別素材の拳銃(`gun.png`)と弾(`bullet.png`)のみ | 構え・射撃のポーズ |

### 結論(本プロジェクトでの採用可否)
- **どちらも三頭身ではなく、採用しません。** RGS_Dev は1頭身のブロックで、Walk/Run/攻撃がなく8方向でもない。Action hero は5〜6頭身で、25px・横視点・右向きのみで、ProjectRのマウス360°照準のトップダウンには合わない。
- 参考にできる点: Action hero の「構え→射撃→反動」のコマ割り(射撃5コマ、Run14コマ)は、`GunAim` / `GunFire` / `Run` を自作・発注するときの目安になる。
- 次の候補は「三頭身の4方向(RPGツクール形式)で、Idle/Walk/Run と近接・銃の行動シートを持つ素材」。見つからない場合は自作または有償素材の購入(ユーザー判断)になります。

### 5.2 RPGツクール形式(4方向)の背の高いキャラ素材の再調査(2026-10-27・**未ダウンロード**)

| 候補 | 作者 / 入手元 | 条件(ページの記述) | 内容(ページの記述) | 懸念・未確認点 |
|---|---|---|---|---|
| **TF TallSpriteMZ** | Tonbi@Tobishima-Factory / [itch.io](https://tobishima.itch.io/tf-tallspritemz) | 無料。商用・非商用可。**RPGツクールMZを正規に所有していること**、**ツクールシリーズ以外では使用不可**、そのままの再配布は不可(加工版の配布は可)、加工(リタッチ)可。クレジット必須: 「Tonbi@Tobishima-Factory」と「Gotcha Gotcha Games Inc./YOJI OJIMA 2020」。生成AI不使用 | `tf_tallspritemz.zip` 2.5MB、144体、**48×72px**、4方向×3パターン(ツクール標準形式)、被ダメージ画像3種+追加パーツ。「Not so chibi」 | 頭身の数値は記載なし(画像で要確認)。Idle/Walk/Run/攻撃/銃のシートは無い(標準の3パターン歩行のみ)。作者は追加予定なし |
| TF TallSpriteMV(同作者のMV版) | 同上 / [itch.io](https://tobishima.itch.io/tf-tallspritemv) | MV所有が条件、クレジット必須(作者とKADOKAWA)。AI不使用の明記は未確認 | 160体、4方向 | MZ用ではない。MZ版を優先 |
| SF_Actor1(5) Tall Sprite | moai337 / [itch.io](https://moai337.itch.io/rpg-maker-mv-sf-actor15-tall-sprite) | 「MIT license」とだけ記載(本文なし)。生成AI不使用。pay-what-you-want。`SF_Actor1_5h.zip` 98KB | RPGツクールMV/MZ向けの背の高いスプライト | 寸法・コマ数・頭身の記載なし。RTP(KADOKAWA)の改変にあたる可能性があり、MIT単独では使えない恐れ。要確認 |

#### 所見
- ツクール標準の「3列×4行」形式で、**背の高い(48×72)スプライトとして使える**のは TF TallSpriteMZ。ProjectRの方針(大きい画像のスプライトを使い、拡大で三頭身にしない)に合う。プロファイルは `visualHeightPx: 0`(自動)で72pxを読み取る。
- ただし **Idle/Run/攻撃/銃の行動シートは含まれない**。Walkは標準の3パターンのみ。行動は現状どおり仮モーションで代替し、シートは別途用意が必要。
- 利用条件は「ツクール専用・MZ所有・クレジット必須・そのままの再配布不可」。ProjectRはMZ製ゲームなので満たせるが、**ゲームの配布物に含めるときは加工してから(または配布物としては組み込み済みのまま)、クレジットを入れる**こと。ソース素材のzipをそのまま公開しないこと。

### 5.3 TF TallSpriteMZ / SF_Actor1(5) Tall Sprite の目視確認(2026-10-27・**取り込みなし**)

リポジトリ外の専用フォルダへダウンロード・展開して確認しました(プロジェクトには何も追加していません)。

| 項目 | TF TallSpriteMZ | SF_Actor1(5) Tall Sprite |
|---|---|---|
| ダウンロード | `tf_tallspritemz.zip` 2,706,568 B(itch.io) | `SF_Actor1_5h.zip` 100,774 B(itch.io) |
| 同梱 | `characters/`(RTP同名の23枚+Damage3枚)、`ex_characters/`、`doors/`、`faces/`、`README.txt`、利用規約、manual.html | `SF_Actor1_5h.png` 1枚のみ(README・ライセンス本文なし) |
| 形式 | 各シート 576×576 = 4体×2段、1体は**144×288 = 3列×4行(48×72px)**。RPGツクール標準の4方向×3パターン | シート 768×512。**64×64セル**(12列×8行)で、うち**1体だけ**描画(左から4〜6列・下段) |
| 見た目 | ツクールMZ標準キャラ(Actor/People/SF_など)の**リメイク**。頭を上げ、細身にして 48×48 → 48×72 に。描画領域は約 31×61px | 紫のツインテールにベレー帽の女の子1体。描画領域は約 33×50px前後 |
| 頭身 | **約2.5頭身**(髪を含めた頭が全身61pxの約26px=約2.4、顔だけなら約3)。RTPの約2頭身より少し背が高い程度で、**厳密な三頭身ではないが近い** | **約2.3頭身**(ベレー帽と顔で約22px / 全身約50px)。小さく、1体のみ |
| 向き | 4方向(下・左・右・上)、歩行3パターン。Idle/Run/攻撃/銃の行動絵は**なし** | 4方向×3パターン。行動絵なし |
| ProjectRとの相性 | ProjectRの主人公(リード)は `Actor1` の1体目と同じ絵柄。TF版は**同名ファイル**なので、`visualHeightPx: 0`(自動)で72pxを読み取り、アンカー・銃口・神の位置が追従する。既存の `Actor1.png` を上書きせず、別名で追加して使うのが安全 | 1体のみで、64×64セルは標準(48×48)と異なり扱いにくい。出典(RTP由来か自作か)が不明 |
| ライセンスの確認 | README(英/日)に明記: 商用・非商用可(ツクールシリーズ製作品のみ)、**RPGツクールの正規ライセンス所有が条件**、**そのままの再配布不可**、加工可、**クレジット必須**(例: `Material provided by: Tonbi@Tobishima-Factory`)。KADOKAWAのRTPの改変なので「© Gotcha Gotcha Games Inc./YOJI OJIMA 2020」の表記も必要 | ページに「MIT license」とだけあり、**著作権者名・ライセンス本文が同梱されていない**。RTP由来か不明で、MITの条件(著作権表示)を満たす材料がない |
| 採用可否 | **有力候補**。ただし三頭身ではなく約2.5頭身。条件(クレジット・MZ所有・再配布不可)は守れる | **不採用**(1体のみ・寸法が非標準・ライセンス根拠が弱い) |

#### TFを使う場合の注意(未実施)
- クレジット文: `Material provided by: Tonbi@Tobishima-Factory` と、`© Gotcha Gotcha Games Inc./YOJI OJIMA 2020` を、ゲーム内クレジット/同梱の説明書に入れる。
- 素材のzipやPNGをそのまま公開しない(ゲームに組み込んだ形での配布は、RTP同様の扱いだが、規約の「そのままの再配布不可」に注意)。
- 48×72は、見た目が1タイルより高くなる。当たり判定はそのまま(1タイル)にできる。タイルとの重なりが気になるなら、作者推奨の `TF_Billboard.js` または `TF_LayeredMap.js` + `HalfMove.js` を検討(ProjectRは使用していない・追加は別判断)。
- Idle/Run/攻撃/銃の行動シートは含まれない。三頭身に近い素材が入っても、行動は仮モーションのまま。

## 6. 取り込み済みの第三者素材

### TF TallSpriteMZ(Actor1) — `img/characters/TF_Actor1.png`

| 項目 | 内容 |
|---|---|
| 素材名 | TF TallSpriteMZ(Tall size characters for 'RPG Maker MZ')のうち `characters/Actor1.png` |
| 作者 | Tonbi@Tobishima-Factory |
| 入手元 | https://tobishima.itch.io/tf-tallspritemz (配布サイト: http://tonbi.jp/) |
| ライセンス | 同梱README(Brief/Detailed Terms of Use): 商用・非商用可(RPGツクールシリーズの作品のみ)、RPGツクールの正規ライセンス所有が条件、**そのままの再配布は不可**、加工は可、**クレジット必須** |
| 商用利用 | 可(上記条件つき) |
| 改変 | 可(リタッチ可。改変版を単体で配布する場合は規約の追加条件あり) |
| 必要なクレジット | `Material provided by: Tonbi@Tobishima-Factory`、および公式素材の改変なので `(C) Gotcha Gotcha Games Inc./YOJI OJIMA 2020` |
| 取り込んだファイル | `img/characters/TF_Actor1.png`(ダウンロードした `Actor1.png`(58,979 B・576×576)を**そのままコピーして改名**。内容は無改変) |
| 既存への影響 | 既存の `img/characters/Actor1.png` は**上書きしていない**。主人公は引き続き標準の Actor1 を使う。TF版はDEVアリーナの端末でだけ切り替える |
| 用途 | 見た目の高さ(48×72)に追従するアンカー・銃口・神の位置の確認。本番の主人公画像ではない(未決定) |

**Git管理外にしています(`.gitignore`)。** このリポジトリは公開(GitHub)で、規約が「そのままの再配布」を禁じているため、
無改変のコピーをコミット/プッシュしません。ゲームとして書き出す(配布する)ときは、プロジェクトに組み込まれた形で
クレジット付きで配布します。別のPCで使うときは、https://tobishima.itch.io/tf-tallspritemz から同じ素材を入手して
`img/characters/TF_Actor1.png` として置いてください(無い環境では端末が「ファイルがありません」と表示するだけで、ゲームは壊れません)。

**ゲーム内のクレジット:** タイトル画面の「クレジット」(`ProjectR_Credits.js`)に上記2行の表記を表示します。
新しい素材を追加するときは、そのプラグインの `CREDITS` と、この台帳の両方に追記してください。
