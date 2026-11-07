/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘 L0後始末。準備ループ(prepare:true)のフェーズの境目で、前のフェーズの飛び道具・一時的な攻撃判定を片づけ、次のフェーズへ持ち越さない。
 * @author ProjectR
 * @base ProjectR_SoulBattle
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_SoulBattle
 * @orderAfter ProjectR_SoulBattleMelee
 * @orderAfter ProjectR_SoulSkills
 * @orderAfter ProjectR_SoulBattleDodge
 *
 * @help
 * ProjectR_SoulPhaseCleanup.js
 *
 * 位置づけ: 準備ループ(PREPARE → ATTACK → DEFENSE → PREPARE)のとき、フェーズが切り替わる瞬間に、前のフェーズで出た
 *   「プレイヤー側の攻撃のEvent」(飛んでいる矢・弾・斬撃・範囲の判定)と、薙ぎ払いの遅延ダメージの待ち・一閃の演出を片づけます。
 *   これで、ATTACKで撃った矢が DEFENSE の間に敵ハートへ当たったり、PREPARE で止まっていた矢が次の ATTACK で動き出したりしません。
 *   準備ループを使わないとき(従来の攻撃⇄防御)は何もしません。
 *
 * 片づけるもの(すべて「Hendrixが生成した動的なEvent」で、メモ欄に下の印を持つものだけ):
 *   矢・弾・斬撃・範囲の判定の印(TAGS)。常駐の神の見た目・支援効果(月桂冠・ヒュアキントス)・敵ハート・マップ上の通常のEventには触れません。
 *   スキル(SOUL専用の効果)の解除は ProjectR_SoulSkills が防御に入る時点で行います。ここでは扱いません。
 *   薙ぎ払い(ProjectR_SoulBattleMelee): 判定の時刻に達していない溜め(遅延ダメージ)は、ダメージを与えずに取り消します(早く判定しません)。
 *
 * 持ち主の分離(プレイヤーの ATTACK の攻撃と、将来の敵の DEFENSE の弾を混ぜない):
 *   "player" の印 = TAGS(上の13種)。フェーズが切り替わるたびに片づける(ATTACK の攻撃は DEFENSE に入る時点で消える)。
 *   "enemy"  の印 = registerTag(tag, "enemy") で登録したもの。DEFENSE が終わるとき(と SOUL の終了)にだけ片づける。ATTACK→DEFENSE の境目では触れないので、
 *            DEFENSE の頭に出る敵の弾が、プレイヤーの攻撃の後始末で消えることはありません。
 *   セーブ: checkCollide が作る当たり履歴($gameSystem)のうち、片づけた矢のものも消します。
 *   SOULの終了(準備ループの戦闘のみ)でも同じ片づけをします。
 *
 * 将来: DEFENSE の敵の攻撃(弾幕)を作るときは、その攻撃のEventの印を registerTag(印, "enemy") で登録してください(持ち主 "enemy" として、DEFENSE の終わりに片づきます)。
 *
 * API: ProjectRSoulPhaseCleanup
 *   TAGS(player) / registerTag(tag, owner) -> boolean(owner は "player" | "enemy" のどちらか必須) / getTags(owner?)
 *   sweepNow(reason, { owners:["player","enemy"] }) -> { destroyed, ids, cancelledSweeps }
 *   isLoopActive() / getStats() / getLog()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const VERSION = "0.1.0";
    const ENGINE = "Hendrix_Action_Engine";
    // プレイヤー側の攻撃のEvent(ProjectR_SoulBattleDodge の THREAT_TAGS / MELEE_TAGS / UNSUPPORTED_TAGS と同じ集合。テストで一致を確認する)
    const BASE_TAGS = Object.freeze([
        "<projectRGoldenArrow>", "<projectRDiseaseAttack>", "<projectRApolloUltimate>", "<projectRGunBullet>", "<projectRGoldenVolley>", "<projectRErosArrow>", "<projectRGigasArrow>", "<projectRPlagueArrow>",
        "<projectRErosBeam>", "<projectRPlagueRat>",
        "<projectRNormalSword>", "<projectRHermesSword>", "<projectRHermesUltimate>"
    ]);
    const extra = { player: [], enemy: [] };                         // 登録された印(持ち主ごと)
    const log = [];
    const stats = { sweeps: 0, destroyed: 0, cancelledSweeps: 0, errors: 0, ended: 0 };
    let loopSeen = false;                                            // 準備ループの戦闘が動いたか(終了時の片づけの要否)
    const note = entry => { log.push(entry); if (log.length > 60) log.shift(); };
    const soul = () => root.ProjectRSoulBattle;
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const tagsOf = owner => (owner === "enemy" ? [...extra.enemy] : [...BASE_TAGS, ...extra.player]);
    const allTags = () => [...tagsOf("player"), ...tagsOf("enemy")];

    const isSpawned = event =>
        (typeof Hendrix_TemplateEvent !== "undefined" && event instanceof Hendrix_TemplateEvent) ||
        (typeof Game_MaithlDynamicEvent !== "undefined" && event instanceof Game_MaithlDynamicEvent);
    const matches = (event, owners) => {
        let text = "";
        try { text = String(event?.event?.()?.note || ""); } catch (_error) { return false; }
        return !!text && owners.some(owner => tagsOf(owner).some(tag => text.includes(tag)));
    };
    // checkCollide がこの攻撃のために $gameSystem へ作る当たり履歴(キー: mapId-EventのID-相手-印)。セーブに残さない
    const purgeHistory = ids => {
        if (typeof $gameSystem === "undefined" || !$gameSystem) return;
        const wanted = new Set(ids.map(String));
        for (const cache of [$gameSystem.collisionTimestamps, $gameSystem.collidedOnceEvents]) {
            for (const key of Object.keys(cache || {})) if (wanted.has(String(key).split("-")[1])) delete cache[key];
        }
    };
    const destroy = event => {
        const id = event.eventId();
        const interpreter = new Game_Interpreter();
        interpreter._eventId = id;
        PluginManager.callCommand(interpreter, ENGINE, "DestroyEvent", { target: String(id), destroyNearby: "", permanent: "false" });   // 各プラグイン(矢・剣)と同じ破棄手順
        return id;
    };

    // 薙ぎ払いの溜め・一閃の演出を片づける。溜め(未判定)はダメージを与えずに取り消す(プレイヤーの ATTACK の分なので "player" のときだけ)
    const cancelMelee = reason => {
        try { const r = root.ProjectRSoulBattleMelee?.cancelPhase?.(reason); return Number(r?.cancelled) || 0; } catch (error) { stats.errors++; note({ type: "cancelError", message: String(error?.message || error) }); return 0; }
    };

    const sweepNow = (reason = "manual", options = {}) => {
        const m = map();
        const owners = Array.isArray(options.owners) && options.owners.length ? options.owners.filter(o => o === "player" || o === "enemy") : ["player", "enemy"];
        const cancelledSweeps = owners.includes("player") ? cancelMelee(reason) : 0;
        const ids = [];
        if (m && typeof m.events === "function") {
            for (const event of m.events().slice()) {
                if (!event || event._erased || !isSpawned(event) || !matches(event, owners)) continue;
                try { ids.push(destroy(event)); } catch (error) { stats.errors++; note({ type: "destroyError", id: event?.eventId?.(), message: String(error?.message || error) }); }
            }
        }
        purgeHistory(ids);
        stats.sweeps++; stats.destroyed += ids.length; stats.cancelledSweeps += cancelledSweeps;
        note({ type: "sweep", reason, owners, destroyed: ids.length, cancelledSweeps });
        return { destroyed: ids.length, ids, cancelledSweeps };
    };

    const loopActive = () => { try { return !!soul()?.getState?.()?.prepare; } catch (_error) { return false; } };
    if (soul()?.onPhase) {
        soul().onPhase(event => {
            if (!event || event.from === "idle" || !loopActive()) return;      // 準備ループの戦闘だけ(従来の攻撃⇄防御は変えない)
            loopSeen = true;
            const owners = event.from === "defense" ? ["player", "enemy"] : ["player"];       // 敵の弾は DEFENSE が終わるときだけ(ATTACK→DEFENSE で、DEFENSE の頭に出る敵の弾を消さない)
            try { sweepNow(`phase:${event.from}>${event.to}`, { owners }); } catch (error) { stats.errors++; note({ type: "sweepError", message: String(error?.message || error) }); }
        });
        soul().onEnd(() => {
            if (!loopSeen) return;
            loopSeen = false; stats.ended++;
            try { sweepNow("soulEnd"); } catch (error) { stats.errors++; note({ type: "sweepError", message: String(error?.message || error) }); }
        });
    }

    root.ProjectRSoulPhaseCleanup = Object.freeze({
        VERSION, TAGS: BASE_TAGS,
        registerTag: (tag, owner) => {
            const t = String(tag || "");
            if ((owner !== "player" && owner !== "enemy") || !/^<projectR[A-Za-z0-9_]+>$/.test(t) || allTags().includes(t)) return false;
            extra[owner].push(t); return true;
        },
        getTags: owner => (owner === "player" || owner === "enemy" ? tagsOf(owner) : allTags()),
        sweepNow,
        isLoopActive: loopActive,
        getStats: () => ({ ...stats }),
        getLog: () => log.map(entry => ({ ...entry }))
    });
})();
