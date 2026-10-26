# Phase 3C-1 常駐Ultimate神の召喚基盤

## 実装

- 既存`ProjectR_GodSummonManager`に、カード用の一時召喚とは別に「常駐Ultimate召喚」(最大1体)を追加。Core・カード・Action Combatは変更なし。
- Ultimate選択はCore既存の保存値(`getUltimateRingId()`)を再利用。新しい選択システムはない。
- `startCardBattle()`が成功した時だけ、その時点の選択を戦闘中のsnapshotとして読み、(1)指輪から神を解決(指輪定義の`godId`、無ければApollo/Hermes表) (2)主人公がその指輪を所持しているか確認 (3)有効なら常駐召喚を作る。未選択・仲間所持・未所持・神不明・Player位置不正などの無効時は常駐召喚なしで戦闘は通常開始(理由は`getPersistentUltimateResult()`)。手札・デッキ・所有・選択は変更しない。
- 戦闘中にUltimate選択を変えても常駐召喚は切り替わらず、次の戦闘から反映。戦闘開始を連続しても旧戦闘を片付けて1体だけ作り直す。`ensurePersistentUltimateSummon()`を再実行しても既存を再利用し重複しない。
- 常駐召喚は論理アンカーのみ(Map Eventなし)。HP / AI / 標的 / 攻撃・衝突判定 / Ultimate Gaugeは持たない。位置は照会ごとにPlayerの現在位置+オフセットから導出するため、壁・経路に影響されず移動も妨げない。オフセットはPlugin Parameter `PersistentOffsetX/Y`(仮の既定値 -0.75 / -0.75 tile)。
- 一時召喚(カード発動)とは別管理。`getActiveSummons()`は一時召喚のみ(`kind: "transient"`)。常駐Apollo中にGolden Arrowを撃つと、常駐は維持されたまま従来の一時Apollo召喚が別に作られる。一時召喚用の`release()`では常駐を消せない。7枚のカード挙動は変更なし。
- 破棄: `endCardBattle` / マップ移動(`Game_Map.setup`) / `onMapLoaded` / ロード。通常探索中には存在しない。実行時のみでセーブしない(Ultimate選択だけが既存どおり保存)。
- 照会API: `hasPersistentUltimateSummon()` / `getPersistentUltimateSummon()`(凍結した読み取り専用コピー) / `getPersistentUltimateGodId()` / `getPersistentUltimateRingId()` / `getPersistentUltimateResult()`。

## MZ実機確認(ユーザーが起動)

既存セーブへは上書きしないでください。神の画像が無いので、F8 Consoleで確認します。`docs/ProjectR_CardDeck_Phase2C6.md`のF8準備スニペットでデッキ・指輪(Apollo/Hermes所持)・`prepare`関数を用意し、`cd = ProjectRCardDeck`、`gm = ProjectRGodSummonManager`とします。戦闘開始の直前に`cd.endCardBattle()`で戦闘を終えておきます。

**Apollo**
1. `cd.setUltimateRing('apollo')`(Apollo指輪が主人公所持であること)。
2. `cd.startCardBattle()`(スニペットの開始処理)。
3. `gm.hasPersistentUltimateSummon()`が`true`、`gm.getPersistentUltimateSummon()`の`godId`が`'apollo'`、`gm.getActiveSummons()`は空であること。
4. マップを歩き回り、そのつど`gm.getPersistentUltimateSummon()`の`x,y`がプレイヤー位置+(-0.75,-0.75)であること(`$gamePlayer._realX/_realY`と比較)。
5. `prepare('apollo_golden_arrow')`でGolden Arrowを撃つ。直後`gm.getActiveSummons()`に一時Apollo(`kind:'transient'`)が1件、常駐の`summonId`は変わらず、約0.2秒後に一時だけが消えること。
6. `cd.endCardBattle()`で`gm.hasPersistentUltimateSummon()`が`false`になること。

**Hermes**
- 同じ手順で`cd.setUltimateRing('hermes')`、`prepare('hermes_sword_attack')`(剣術)。`godId`が`'hermes'`であること。

**共通**
- Ultimate未選択(`cd.setUltimateRing(null)`)で戦闘を開始しても戦闘は通常どおり始まり、`gm.getPersistentUltimateResult().reason`が`'noUltimateSelected'`、常駐は無いこと。
- 選択した指輪を仲間へ渡す(`cd.assignRingToActor`、戦闘外)と選択が解除され、次の戦闘で常駐召喚が作られないこと。
- 常駐中にカードを素早く連続使用しても、常駐は1体のまま残り、一時召喚が寿命後に必ず消えること。
- 戦闘開始を連続しても常駐は1体であること。
- マップ移動後に`gm.hasPersistentUltimateSummon()`が`false`であること。ロード後と通常探索中も`false`で、新しい戦闘開始で再び作られること。
- F8にExceptionがないこと。

## 自動確認

`tests/ProjectR_GodSummonManager.phase3c1.test.cjs`(16件)。Golden Arrow/Swordsmanshipの既存fixture(導入版Action Engine実コード)と、認識阻害・リラの既存fixtureを再利用。描画・入力はVM fixture。MZ実画面・人の操作確認は別途必要。
