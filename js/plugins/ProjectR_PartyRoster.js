/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 主人公と出撃中の仲間(PartyCombat)を読み取り専用で返す名簿(Phase Apollo-A3)。NPCは含まない。仲間のAIは変えない。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_PartyCombat
 *
 * @help
 * ProjectR_PartyRoster.js
 *
 * 将来のカード効果の「味方」(エロスの矢・月桂冠・ヒュアキントス・竪琴など)が、対象を選ぶために使う読み取り専用の窓口です。
 * 味方 = 主人公 + いま戦闘に出ている仲間(ProjectR_PartyCombat のセッションにいる、最大2人)。
 * `<npc>` タグのEventなど、任意のNPC・敵・召喚物は含みません。何も変更せず、仲間の移動・攻撃・判断(AI)にも触れません。
 * 製品の仲間は現在0人なので、通常は主人公だけです(仲間はCombat Test Arenaなどのフィクスチャでだけ現れます)。
 *
 * API: ProjectRPartyRoster
 *   protagonist()                 { key:"player", kind:"protagonist", actorId, name, hp, mhp, alive, eventId:null }
 *   allies({includeDown?})        出撃中の仲間 [{ key:"ally:<actorId>", kind:"ally", actorId, name, hp, mhp, alive, down, eventId, x, y }]。既定はダウン中を除く
 *   members({includeDown?})       主人公 + 仲間
 *   isPartyKey(key) / isPartyEvent(eventId) / keyForEvent(eventId)
 *   count({includeDown?})         人数
 * 返す値は毎回新しいコピーで、変更しても元の状態には影響しません。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const party = () => root.ProjectRPartyCombat || null;
    const leader = () => (typeof $gameParty !== "undefined" ? $gameParty?.leader?.() : null);
    const currentMap = () => (typeof $gameMap !== "undefined" ? $gameMap : null);

    const protagonist = () => {
        const actor = leader();
        if (!actor) return null;
        const hp = Number(actor.hp), mhp = Number(actor.mhp);
        return { key: "player", kind: "protagonist", actorId: typeof actor.actorId === "function" ? actor.actorId() : null,
            name: String(actor.name?.() ?? ""), hp, mhp, alive: hp > 0, eventId: null };
    };
    const linkedEventId = actorId => {
        const map = currentMap();
        if (!map) return null;
        for (const event of map.events()) if (event && !event._erased && Number(event.linkedActorId) === actorId) return event.eventId();
        return null;
    };
    const allies = (options = {}) => {
        const api = party();
        if (!api || typeof api.isActive !== "function" || !api.isActive()) return [];
        const list = [];
        for (const m of api.members()) {
            if (m.down && !options.includeDown) continue;
            const definition = api.allyDefinition?.(m.actorId);
            list.push({ key: "ally:" + m.actorId, kind: "ally", actorId: m.actorId, name: String(definition?.name ?? ""), hp: m.hp, mhp: m.maxHp,
                alive: !m.down, down: !!m.down, eventId: linkedEventId(m.actorId), x: m.x, y: m.y });
        }
        return list;
    };
    const members = (options = {}) => {
        const head = protagonist();
        return (head ? [head] : []).concat(allies(options));
    };
    const isPartyKey = key => members({ includeDown: true }).some(m => m.key === key);
    const keyForEvent = eventId => {
        const id = Number(eventId);
        const found = allies({ includeDown: true }).find(a => a.eventId === id);
        return found ? found.key : null; // 主人公・NPC・敵・召喚物のEventは null(主人公は Event ではなく "player")
    };
    root.ProjectRPartyRoster = Object.freeze({
        protagonist, allies, members, isPartyKey, keyForEvent,
        isPartyEvent: eventId => keyForEvent(eventId) !== null,
        count: options => members(options).length
    });
})();
