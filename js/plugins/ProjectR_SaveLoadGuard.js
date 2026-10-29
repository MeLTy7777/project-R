/*:
 * @target MZ
 * @base Hendrix_Action_Engine
 * @orderAfter Hendrix_Action_Engine
 * @plugindesc v1.0.0 ProjectR セーブ読込時の保護: 元のテンプレートが無くなったHendrix生成イベントで、マップ更新がエラー停止しないようにします。
 * @author ProjectR
 *
 * @help
 * ProjectR_SaveLoadGuard.js
 *
 * 症状(H2C-B1で再現・修正):
 *   ツクールでデータ(テンプレートマップなど)を編集した後、それ以前に作ったセーブをロードすると、
 *   「Cannot read property 'pages' of null」でエラー画面になり、ゲームが止まることがありました。
 *
 * 原因:
 *   Hendrix_Action_Engineが生成した(spawnした)イベントは、セーブにテンプレートイベントの番号だけを残します。
 *   その番号のイベントが現在のテンプレートマップから無くなっていると、そのイベントのevent()が空になり、
 *   標準のGame_Event.page()(this.event().pages[...])が例外を投げます。
 *   データが変わったセーブは、ロード直後に標準の「マップ再読込」で作り直されますが、
 *   その直前の1〜数フレームの間、古いイベントが残っており、視界(VisionOcclusion)などがpage()を呼んで止まりました。
 *
 * 対策(2つ。どちらも「保存データは書き換えない」):
 *   1) ロード直後(DataManager.extractSaveContents)に、元のテンプレートが無い生成イベント(Hendrix_TemplateEvent)を
 *      メモリ上のマップから外します。これは標準のマップ再読込が生成イベントを消すのと同じ結果です。
 *      データが変わっていないセーブ(再読込されない)でも、Hendrixのスプライトが止まらなくなります。
 *      セーブファイルは上書きしません(次にセーブするまで変わりません)。通常のイベント・テンプレートが有るイベントは触りません。
 *   2) Game_Event.prototype.pageだけを包み、event()が空のイベントではnull(=有効なページ無し)を返します。
 *      生成イベント以外でも、データ未読込の一瞬に例外で止まらないための保険です。
 *   セーブ内容・Hendrix本体・視界/戦闘遮蔽のプラグインは変更しません。
 *
 * ProjectRSaveLoadGuard.staleEvents(): 現在のマップで、元のテンプレートが無いイベントのIDの一覧(診断用)。
 * ProjectRSaveLoadGuard.lastPurged(): 直近のロードで外した生成イベント(mapId / eventId / templateEventId)の一覧(診断用)。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;

    const hasEventData = event => typeof event.event !== "function" || !!event.event();

    const page = Game_Event.prototype.page;
    Game_Event.prototype.page = function() {
        if (!hasEventData(this)) return null;
        return page.apply(this, arguments);
    };

    // 生成イベント(Hendrix_TemplateEvent)で、元のテンプレートが現在のテンプレートマップに無いもの。
    // テンプレートマップ未読込のときは判断できないので対象にしない。
    const isStaleSpawn = event => !!event && typeof event._templateEventId !== "undefined" &&
        typeof $dataTemplateMap !== "undefined" && !!$dataTemplateMap && !hasEventData(event);

    let purged = [];
    const extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() {
        const result = extractSaveContents.apply(this, arguments);
        purged = [];
        const events = typeof $gameMap !== "undefined" && $gameMap && $gameMap._events;
        if (Array.isArray(events)) {
            events.forEach((event, id) => {
                if (!isStaleSpawn(event)) return;
                purged.push({mapId: $gameMap.mapId(), eventId: id, templateEventId: event._templateEventId});
                events[id] = null;
            });
        }
        if (purged.length > 0 && typeof console !== "undefined") {
            console.warn("[ProjectR_SaveLoadGuard] 元のテンプレートが無い生成イベントを外しました:", JSON.stringify(purged));
        }
        return result;
    };

    root.ProjectRSaveLoadGuard = Object.freeze({
        lastPurged: () => purged.slice(),
        staleEvents: () => (typeof $gameMap === "undefined" || !$gameMap ? [] : $gameMap.events())
            .filter(event => !hasEventData(event)).map(event => event.eventId())
    });
})();
