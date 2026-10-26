# Phase 3A 一時神召喚基盤(Transient God Summon)

## 実装

- 新規`ProjectR_GodSummonManager`。カード発動時、カードの指輪(`apollo`/`hermes`)から神を解決し、一時召喚の論理アンカーを作って効果へcontextを渡す。CardDeckCore・Action Combat・カード定義は未変更。
- 一時召喚はMap Eventを作らない論理アンカー: HPなし / 標的にならない / 移動を妨げない / AIなし / 自律攻撃なし / セーブされない。美術素材は存在せず未使用(将来Sprite/VFXをアンカーへ足してもカード挙動は変わらない)。
- 位置はプレイヤー位置(Pathfindingなし。壁際でも失敗しない)。contextは`godId, ringId, cardId, owner:"player", summon, x, y, center, degree, radians, distance`。
- 流れ: `perform` → 召喚生成 → 効果(context)実行 → `{ok:true}`なら寿命(`LifetimeFrames`=12、map更新frame。メニュー/会話/非稼働中は進まない)まで保持 → 破棄。効果が失敗/例外なら召喚を即破棄し`activationFailed`(非消費・Cooldownなし・手札不変)。
- 複数の同時発動は別instance(`summonId`)で共存。全体上限なし。常駐の究極神召喚はこの仕組みの対象外。
- 破棄: 寿命 / 効果失敗 / `endCardBattle` / マップ移動(`Game_Map.setup`) / ロード(CoreのendBattleと`onMapLoaded`)。
- **Apollo黄金の弓矢**: Apollo召喚 → 召喚contextの位置・固定済みマウス角から従来どおり弾を発射(origin=プレイヤー位置、Skill 236、attacker=player、直進・1Hit)。
- **Hermes剣術**: Hermes召喚 → 召喚contextの中心・角度から従来どおりHitbox(前方0.75tile・1.5四方・3frame・各敵1Hit、Skill 237、attacker=player)。
- 未移行(従来のまま): 認識阻害 / 葦笛睡眠 / 高速移動 / 病の矢 / リラの支援。通常Swordも無関係。
- 照会API: `ProjectRGodSummonManager.getActiveSummons()`。

## MZ実機確認(ユーザーが起動)

既存セーブへは上書きしないでください。前回(`docs/ProjectR_CardDeck_Phase2C6.md`)と同じF8の準備スニペットで、Apollo/Hermes指輪・検証用デッキ・戦闘を準備し、`prepare`関数でカードを手札へ出してください。以降は変数名を読み替えます(`cd` = `ProjectRCardDeck`)。

**Apollo**
1. Apollo指輪を所持させ、`prepare('apollo_golden_arrow')`で手札へ出す。
2. 戦闘開始後、表示されたカードキー(1～5)を押す。
3. 直後にF8で`ProjectRGodSummonManager.getActiveSummons()`を実行し、`godId:'apollo'`の召喚が1件あることを確認する。
4. 弾が従来どおりマウス方向へ直進し、命中でSkill 236のDamageが入ることを複数方向で確認する。
5. 使用カードが4秒Cooldownへ入り手札が補充されること。約0.2秒後に`getActiveSummons()`が空になること。

**Hermes**
1. Hermes指輪を所持させ、`prepare('hermes_sword_attack')`で手札へ出す。
2. 上下左右・斜めの複数方向で発動し、`getActiveSummons()`に`godId:'hermes'`が1件出ることを確認する。
3. 近接Hitbox(約1.5tile、3frame)・Skill 237のDamage・各敵1Hit・3秒Cooldown・即時補充が従来どおりであること。
4. 約0.2秒後に召喚が空になること。

**共通**
- 連続して何度も発動しても、`getActiveSummons()`が寿命後に必ず空になり、`ProjectRApolloGoldenArrow.getActiveProjectiles()`・`ProjectRHermesSwordsmanship.getActiveHitboxes()`にも残骸がないこと。
- `ProjectRCardDeck.endCardBattle()`で召喚が全て消えること。マップ移動・ロード後も空であること。
- 通常Swordが従来どおり動くこと。
- 神の画像・VFXが無い状態(今回の標準)で、Golden Arrow/剣術が問題なく動くこと。
- F8にExceptionが出ていないこと。

## 自動確認

`tests/ProjectR_GodSummonManager.test.cjs`(17件)。Golden Arrow/Swordsmanshipの既存fixture(導入版Action Engineの実Collision・`checkCollide`・`UpdateEventHp`・`spawnEvent`等)を再利用。Golden Arrow側fixtureにManager読込を1か所追加した。描画・入力はVM fixture。MZ実画面・人の操作確認は別途必要。
