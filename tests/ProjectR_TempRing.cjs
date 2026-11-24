"use strict";
// Stage 4: 5つの指輪(hermes / apollo / janus / themis / athena)がすべて実装済みになったので、「定義はあるが実装されていない指輪」を確かめるテストは、
// 1つの世界(buildWorld の仮想環境)の中だけに一時的な指輪を足して使う。
//   ・触るのは、その世界の実行時のレジストリ(ProjectRCardDeck.definitions.rings)と、その世界の保存データのメモリ上の所有状態だけ。plugin・data・ファイル・本物のセーブは書き換えない。
//   ・cleanup() で、装備・所有・Q の割り当て・定義を元に戻す(世界は1つのテストで使い捨てだが、後始末も確かめられるようにする)。
//   ・実在しない神の ID(zeus)を使う。Athena など実在の指輪の ID は使わない。
const TEMP_RING = "zeus";

function addTempRing(w, ringId = TEMP_RING) {
    const D = w.ctx.ProjectRCardDeck, RL = w.ctx.ProjectRRingLoadout;
    if (D.definitions.ring(ringId)) throw new Error("既にある指輪の ID は一時の指輪に使えない: " + ringId);
    const ring = Object.freeze({ ringId, godId: ringId, equipActorIds: Object.freeze([]), initialOwner: "unowned" });
    D.definitions.rings.set(ringId, ring);
    const ownership = () => { const data = w.ctx.$gameSystem && w.ctx.$gameSystem._projectRCardDeckData; return data && data.ringOwnershipState ? data.ringOwnershipState : null; };
    const api = {
        ringId,
        own() { const r = D.assignRingToPlayer(ringId); if (!r.ok) throw new Error("一時の指輪を所持できない: " + JSON.stringify(r)); return r; },
        equip() { const r = RL.equipRing(ringId); if (!r.ok) throw new Error("一時の指輪を装備できない: " + JSON.stringify(r)); return r; },
        cleanup() {
            try { if (RL.getUltimate() === ringId) RL.clearUltimate(); } catch (_e) { /* 後片付けは続ける */ }
            try { if (RL.isRingEquipped(ringId)) RL.unequipRing(ringId); } catch (_e) { /* 同上 */ }
            const own = ownership(); if (own) delete own[ringId];
            D.definitions.rings.delete(ringId);
            return { removed: !D.definitions.ring(ringId), ownershipCleared: !(ownership() && ringId in ownership()) };
        }
    };
    return api;
}
module.exports = { TEMP_RING, addTempRing };
