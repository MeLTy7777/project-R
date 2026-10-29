# ProjectR カードの対象指定(Direction / Ground / Buff / Ally / **Cursor**)

Phase H2B-3A で `Cursor` を追加しました。既存の4種類の意味は変えていません。実装は `js/plugins/ProjectR_CardTargeting.js`(Cursorの座標・円の判定・handler登録)。

## 1. 対象タイプの意味

| タイプ | ワークブックの表記 | 位置・向きを読む時点 | 例 |
|---|---|---|---|
| Direction | マウス方向 | **発動の瞬間**のマウス角を1回(固定) | 薙ぎ払い・一閃・黄金の弓矢 |
| Ground | マウス位置 | **発動の瞬間**のマウス位置を1回(固定) | 絶 |
| Buff(= `instant`) | 自分 | 位置を使わない | ストレングス・葦笛・認識阻害 |
| Heal(= `ally`) | マウス最寄り仲間→いなければ自分 | 発動時 | 竪琴の鎮静 |
| **Cursor**(新) | 「その他」(ユーザー確認: カーソル追従) | **効果が続く間、毎フレーム「今のマウス位置」** | ヴェイル |

Cursor は「時間制限のある継続範囲」です。飛び道具でも、固定の地面魔法でも、常駐のUltimate神でもありません。発動(消費・Cooldown・手札の入れ替え)は1回だけで、マウスを動かしても再発動・Cooldownのやり直し・効果時間のやり直しは起きません。

## 2. CardDeckCore は変更しない

`ProjectR_CardDeckCore.js`(保護対象)の `TARGET_TYPES` は `direction/ground/instant/ally` のままです。`cursor` は `ProjectR_CardTargeting` が受け持ちます。

- `ProjectRCardDeck.registerActivationHandler("cursor", fn)` / `getActivationHandler("cursor")` を `ProjectR_CardTargeting` が包んで受け付けます。他の種別は元の関数へそのまま渡します。
- 発動ルーター(`CardActivationRouter`)は、`cursor` のカードを受け取った呼び出しの直前に、`cursor` のhandlerだけをルーターへ渡します。他のhandlerは触りません。
- `cursor` 以外の未知の種別(例: `futureUnknown`)は従来どおり `unsupportedTargetType` で非消費のまま拒否されます(テストで固定)。
- カードの発動の流れ(handlerが検証と計画 → ルーターが1回だけ消費 → 消費の確定後に効果)は他のカードと同じです。handlerが失敗したら何も消費しません。

## 3. 座標変換

```
マップ座標x = $gameMap.displayX() + TouchInput.x / $gameMap.tileWidth()
マップ座標y = $gameMap.displayY() + TouchInput.y / $gameMap.tileHeight()
```
- `TouchInput.x/y` は画面(Graphics)ピクセル。MZ標準のマウス移動(`_onMouseMove`)は、キャンバスの内側にいるときだけ `_onHover` で更新します。
- 画面スクロール(端数も含む)・表示オフセット・標準でないタイルサイズ(32px等)に追従します(単体テストで 48/32px・端数スクロールを固定)。
- 距離はループマップを考慮して `$gameMap.deltaX/deltaY` の最短で測ります。キャラクターの位置は `centerPositionPoint()`(DotMoveの当たり判定の中心)です。
- タイル i は [i, i+1) の範囲(キャラクターの座標系と同じ)。

### 無効なマウス・画面外
- マウスが画面の外(ウィンドウの外へ出て最後の位置が画面外・数値でない)のとき `pointer().ok = false`(`pointerOffScreen` / `invalidPointer`)。
- **発動時**に無効なら、カードは非消費で失敗します(ワークブックの射程「画面内ならどこでも」)。
- **効果中**に無効になっても効果は終わらず、**最後の有効な位置を保ちます**(`pointerHeld: true`)。マウスが戻れば再び追従します。
- 操作できない間(メニュー・メッセージ・会話・フォーカス喪失)は、効果時間も位置の更新も止まります(他の時限カードと同じ「戦闘時間」)。

## 4. API: `ProjectRCardTargeting`
`pointer()` / `screenToWorld(x, y)` / `characterCenter(character)` / `distance(a, b)` / `circleContains(center, radius, character)`(境界を含む) / `setPointerOverride(fn)`(テスト用)。

## 5. 確認の状態
- 自動テスト: `tests/ProjectR_HermesVeil.test.cjs`(Cursorの登録・座標・毎フレーム追従・Groundとの違い・スクロール・半径の境界・時間・失敗の非消費)。
- 実機(NW.js 0.48.4 / Chromium 85、実マウス): `tools/mz_cdp/h3a_verify.cjs` R1〜R3。結果は `docs/evidence_h3a/h3a_real_mz_results.json`。
