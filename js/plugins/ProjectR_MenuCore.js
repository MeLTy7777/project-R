/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR メニュー基盤（表示カタログ・デッキ/Ultimate/指輪/所持品のモデル・戦闘中ロック）。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardDeckCore
 * @orderAfter ProjectR_UltimateActivation
 *
 * @help
 * ProjectR_MenuCore.js
 *
 * 画面（Scene/Window）を持たない、メニュー用のデータ層です。デッキ・Ultimate・指輪・
 * 所持品の各メニュー画面（ProjectR_DeckBuilder / ProjectR_UltimateSelect /
 * ProjectR_RingParty / ProjectR_Inventory）はここのAPIだけを使います。
 *
 * 二重管理をしません:
 *   ・デッキ検証・所持・指輪・Ultimate選択の正は ProjectR_CardDeckCore（ProjectRCardDeck）です。
 *     ここでは検証を再実装せず、Coreの getCardInvalidReasons / getDeckInvalidReasons /
 *     setDeck / setUltimateRing / assignRingTo* を呼びます。
 *   ・所持品の正はRPGツクールの$gameParty（アイテム・武器・防具）です。別の所持DBは作りません。
 *   ・カード名/アイコンは ProjectR_BattleHUD と同じ解決（Skillのnote <ProjectRCard: id> 等）。
 *
 * 戦闘中ロック（最終ルール）:
 *   明示的な戦闘イベント（ProjectRCombatPresence.isCombatEventActive）またはカード戦闘中は
 *   メニュー自体を開けません（ProjectR_MenuIntegration）。さらに保険として、デッキ変更・
 *   Ultimate変更・指輪の移動はこのモデルが「inCombat」で拒否します。
 *
 * 表示データの追加（将来のカード/神が増えたときにコード変更なしで足せる）:
 *   ProjectRMenuCore.setCardText(cardId, { description })
 *   ProjectRMenuCore.setGodText(godId, { name, ringName, description })
 *   ProjectRMenuCore.setCategoryLabel(category, label)
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;

    // ---- 表示カタログ（文章だけ。数値・効果は持たない） -------------------------------------------
    const CARD_TEXT = {
        hermes_swift_movement: "マウス方向へ最大3マスを高速で移動する。壁やイベントの手前で止まる。",
        hermes_reed_flute_sleep: "葦笛を吹き、周囲の敵を眠らせる。範囲内に敵がいないと発動しない。",
        hermes_perception_obscure: "一定時間、敵に認識されにくくなる。",
        hermes_sword_attack: "マウス方向へ剣で斬りつける近接攻撃。",
        apollo_golden_arrow: "マウス方向へ黄金の矢を放つ。",
        apollo_plague_attack: "マウス方向へ病の矢を放つ。命中した敵を病にして継続ダメージを与える。",
        apollo_lyre_calm: "リラを奏で、睡眠などの精神異常を解除して一定時間防ぐ。"
    };
    const CATEGORY_LABEL = {
        movement: "移動", sleep: "睡眠", concealment: "隠密", attack: "攻撃", ailment: "状態異常",
        support: "支援", normal: "通常"
    };
    const TARGET_LABEL = { direction: "方向", ground: "指定位置", instant: "即時", ally: "味方", cursor: "カーソル追従" };
    // ワークブックの「強さ」の表記(通常 / 強力 / 特殊)に合わせる。
    const RARITY_LABEL = { normal: "通常", strong: "強力", special: "特殊" };
    const GOD_TEXT = {
        hermes: { name: "ヘルメース", ringName: "ヘルメースの指輪" },
        apollo: { name: "アポロン", ringName: "アポロンの指輪" },
        janus: { name: "ヤヌス", ringName: "ヤヌスの指輪" },
        themis: { name: "テミス", ringName: "テミスの指輪" },
        athena: { name: "アテナ", ringName: "アテナの指輪" }
    };
    const cardTextOverrides = new Map();
    const godTextOverrides = new Map();

    const deckApi = () => root.ProjectRCardDeck || null;
    const hud = () => root.ProjectRBattleHUD || null;
    const text = value => value == null ? "" : String(value);

    const setCardText = (cardId, source) => {
        const id = text(cardId);
        if (!id || !source || typeof source !== "object") return false;
        cardTextOverrides.set(id, { ...(cardTextOverrides.get(id) || {}), ...source });
        return true;
    };
    const setGodText = (godId, source) => {
        const id = text(godId);
        if (!id || !source || typeof source !== "object") return false;
        godTextOverrides.set(id, { ...(godTextOverrides.get(id) || {}), ...source });
        return true;
    };
    const setCategoryLabel = (category, label) => {
        if (!text(category) || !text(label)) return false;
        CATEGORY_LABEL[category] = text(label);
        return true;
    };

    const godInfo = godId => {
        const id = text(godId);
        const base = GOD_TEXT[id] || {};
        const override = godTextOverrides.get(id) || {};
        const presentation = hud()?.getGodPresentation?.(id) || {};
        return {
            godId: id,
            name: override.name || base.name || presentation.name || id.toUpperCase(),
            ringName: override.ringName || base.ringName || ((override.name || base.name || id) + "の指輪"),
            description: override.description || base.description || ""
        };
    };
    const ringInfo = ringId => {
        const ring = deckApi()?.definitions?.ring?.(ringId) || null;
        const godId = ring?.godId || text(ringId);
        const god = godInfo(godId);
        return {
            ringId: text(ringId), godId, godName: god.name, name: god.ringName,
            equipActorIds: ring ? [...ring.equipActorIds] : [], defined: !!ring
        };
    };
    const skillFor = cardId => {
        const skillId = hud()?.getCardPresentation?.(cardId)?.skillId;
        return skillId && typeof $dataSkills !== "undefined" ? $dataSkills[skillId] || null : null;
    };
    const cardInfo = cardId => {
        const id = text(cardId);
        const definition = deckApi()?.definitions?.card?.(id) || null;
        const presentation = hud()?.getCardPresentation?.(id) || {};
        const ring = ringInfo(definition?.ringId);
        const override = cardTextOverrides.get(id) || {};
        const skillText = text(skillFor(id)?.description).trim();
        const category = definition?.category || "";
        return {
            cardId: id,
            defined: !!definition,
            name: override.name || presentation.name || id,
            iconIndex: Number.isFinite(presentation.iconIndex) ? presentation.iconIndex : 0,
            description: override.description || skillText || CARD_TEXT[id] || "",
            ringId: definition?.ringId || "",
            ringName: ring.name,
            godId: ring.godId,
            godName: ring.godName,
            category,
            // setCardText の categoryLabel / targetLabel / levels は表示だけの上書き(効果・検証は変えない)。
            categoryLabel: override.categoryLabel || CATEGORY_LABEL[category] || category,
            rarity: definition?.rarity || "",
            rarityLabel: RARITY_LABEL[definition?.rarity] || definition?.rarity || "",
            targetType: definition?.targetType || "",
            targetLabel: override.targetLabel || TARGET_LABEL[definition?.targetType] || definition?.targetType || "",
            cooldownSeconds: definition?.cooldownSeconds ?? 0,
            maxCopies: definition?.maxCopies ?? 0,
            // 所持は「カードの種類」単位で、デッキに入れられる枚数の上限 = 最大コピー数(枚数ごとの在庫は持たない)。
            ownedCopies: deckApi()?.isCardOwned?.(id) ? (definition?.maxCopies ?? 0) : 0,
            maxLevel: definition?.maxLevel ?? 1,
            levels: Array.isArray(override.levels) ? override.levels.map(text) : []
        };
    };

    // ---- 戦闘中ロック ------------------------------------------------------------------------------
    const combatLock = () => {
        const presence = root.ProjectRCombatPresence;
        if (presence?.isCombatEventActive?.()) return { locked: true, reason: "combatEvent" };
        if (deckApi()?.isCardBattleActive?.()) return { locked: true, reason: "cardBattle" };
        if (typeof $gameParty !== "undefined" && $gameParty?.inBattle?.()) return { locked: true, reason: "battle" };
        return { locked: false, reason: null };
    };
    const inCombat = () => combatLock().locked;
    const IN_COMBAT = Object.freeze({ ok: false, reason: "inCombat", message: "戦闘中は変更できません。" });

    // ---- 理由コード → 日本語（検証そのものはCoreが行う） ----------------------------------------------
    const describeReason = reason => {
        const code = reason?.code;
        const name = reason?.cardId ? cardInfo(reason.cardId).name : "";
        const ring = reason?.ringId ? ringInfo(reason.ringId).name : "";
        switch (code) {
            case "INVALID_DECK_SIZE": return `${reason.expected}枚必要（現在${reason.actual}枚）`;
            case "CARD_NOT_OWNED": return `所持していないカード：${name}`;
            case "REQUIRED_RING_NOT_OWNED": return `必要な指輪を所持していない：${name}（${ring}）`;
            case "MAX_COPIES_EXCEEDED": return `コピー上限超過：${name}（${reason.actual}/${reason.maximum}）`;
            case "INVALID_CARD_ID": return `不明なカード：${reason.cardId}`;
            case "INVALID_RING_ID": return `不明な指輪：${reason.ringId}`;
            case "ACTOR_NOT_ALLOWED": return "この仲間はその指輪を装備できません。";
            case "ACTOR_RING_LIMIT": return "この仲間はすでに別の指輪を持っています（1人1つまで）。";
            case "ULTIMATE_RING_NOT_OWNED": return "主人公が所持していない指輪はUltimateに選べません。";
            case "RING_TRANSFER_DURING_BATTLE": return "戦闘中は指輪を移せません。";
            case "DECK_FULL": return "デッキは30枚までです。";
            case "NOT_IN_DECK": return "デッキに入っていません。";
            case "ULTIMATE_NOT_IMPLEMENTED": return "このUltimateは未実装です。";
            default: return code ? String(code) : "";
        }
    };
    const describeReasons = reasons => {
        const lines = [];
        for (const reason of reasons || []) {
            const line = describeReason(reason);
            if (line && !lines.includes(line)) lines.push(line);
        }
        return lines;
    };

    // ---- デッキモデル ------------------------------------------------------------------------------
    const sizeLimit = () => deckApi()?.DECK_SIZE ?? 30;
    const levelOf = cardId => {
        const entry = deckApi()?.getPersistentData?.()?.cardOwnership?.[cardId];
        return entry?.level ?? 1;
    };
    const copiesIn = (cardIds, cardId) => cardIds.reduce((n, id) => n + (id === cardId ? 1 : 0), 0);

    // 追加できるか: 所持・指輪・コピー上限はCoreの検証結果をそのまま使う。デッキ枚数だけ画面側の上限。
    const addCheck = cardId => {
        const deck = deckApi();
        const id = text(cardId);
        if (!deck) return { ok: false, reason: "noCore", reasons: [] };
        if (!deck.definitions.card(id)) return { ok: false, reason: "INVALID_CARD_ID", reasons: [{ code: "INVALID_CARD_ID", cardId: id }] };
        const current = deck.getDeck();
        if (current.length >= sizeLimit()) return { ok: false, reason: "DECK_FULL", reasons: [{ code: "DECK_FULL" }] };
        const reasons = deck.getDeckInvalidReasons([...current, id])
            .filter(r => r.cardId === id && r.code !== "INVALID_DECK_SIZE");
        // 既存のデッキに同じ理由が既にある場合も、新しい1枚を足せない理由として返す。
        return reasons.length ? { ok: false, reason: reasons[0].code, reasons } : { ok: true, reason: null, reasons: [] };
    };

    const collectionEntries = (options = {}) => {
        const deck = deckApi();
        if (!deck) return [];
        const current = deck.getDeck();
        const entries = [];
        for (const definition of deck.definitions.cardDefinitions()) {
            if (!deck.isCardOwned(definition.cardId)) continue;
            const info = cardInfo(definition.cardId);
            const invalid = deck.getCardInvalidReasons(definition.cardId);
            const ringOwned = deck.hasPlayerRing(definition.ringId);
            entries.push({
                cardId: definition.cardId, info, level: levelOf(definition.cardId), maxLevel: definition.maxLevel,
                ringId: definition.ringId, godId: info.godId, ringOwned, usable: invalid.length === 0,
                invalidReasons: invalid, copiesInDeck: copiesIn(current, definition.cardId),
                maxCopies: definition.maxCopies, add: addCheck(definition.cardId)
            });
        }
        const godFilter = options.god || null;
        const status = options.status || "all";
        let result = entries.filter(e => (!godFilter || e.godId === godFilter) &&
            (status === "all" || (status === "available" ? e.usable : !e.ringOwned)));
        const sorter = {
            god: (a, b) => a.godId.localeCompare(b.godId) || a.info.name.localeCompare(b.info.name),
            name: (a, b) => a.info.name.localeCompare(b.info.name),
            level: (a, b) => b.level - a.level || a.info.name.localeCompare(b.info.name),
            cooldown: (a, b) => a.info.cooldownSeconds - b.info.cooldownSeconds
        }[options.sort || "god"];
        if (sorter) result = result.sort(sorter);
        return result;
    };

    const deckEntries = () => {
        const deck = deckApi();
        if (!deck) return [];
        const counts = new Map();
        for (const id of deck.getDeck()) counts.set(id, (counts.get(id) || 0) + 1);
        const entries = [...counts].map(([cardId, count]) => {
            const info = cardInfo(cardId);
            const invalid = deck.getCardInvalidReasons(cardId);
            return { cardId, count, info, level: levelOf(cardId), maxLevel: info.maxLevel,
                usable: invalid.length === 0, invalidReasons: invalid, maxCopies: info.maxCopies };
        });
        return entries.sort((a, b) => a.info.godId.localeCompare(b.info.godId) || a.info.name.localeCompare(b.info.name));
    };

    // 同じ指輪が無いことによる無効を、カードごとに並べず「指輪ごと」にまとめる(デッキの内容は変えない)。
    const groupedMessages = (reasons, cardIds) => {
        const lines = [];
        const byRing = new Map();
        const others = [];
        for (const reason of reasons || []) {
            if (reason?.code === "REQUIRED_RING_NOT_OWNED" && reason.ringId) {
                if (!byRing.has(reason.ringId)) byRing.set(reason.ringId, new Map());
                const names = byRing.get(reason.ringId);
                names.set(reason.cardId, (names.get(reason.cardId) || 0) + 1);
            } else others.push(reason);
        }
        for (const [ringId, names] of byRing) {
            const total = [...names.values()].reduce((a, b) => a + b, 0);
            const list = [...names.keys()].map(id => cardInfo(id).name).join("・");
            lines.push(`${ringInfo(ringId).name}を主人公が持っていないため使えません：${list}（計${total}枚）。指輪を戻すと再び使えます。`);
        }
        for (const line of describeReasons(others)) if (!lines.includes(line)) lines.push(line);
        return lines;
    };
    const deckStatus = () => {
        const deck = deckApi();
        if (!deck) return { count: 0, size: sizeLimit(), valid: false, reasons: [], messages: [], groupedMessages: [], header: "DECK 0 / 30" };
        const cardIds = deck.getDeck();
        const reasons = deck.getDeckInvalidReasons(cardIds);
        return {
            count: cardIds.length, size: sizeLimit(), valid: reasons.length === 0, reasons,
            messages: describeReasons(reasons), groupedMessages: groupedMessages(reasons, cardIds),
            header: `DECK ${cardIds.length} / ${sizeLimit()}`
        };
    };

    const addToDeck = cardId => {
        if (inCombat()) return { ...IN_COMBAT };
        const check = addCheck(cardId);
        if (!check.ok) return { ok: false, reason: check.reason, message: describeReasons(check.reasons)[0] || "", reasons: check.reasons };
        const deck = deckApi();
        deck.setDeck([...deck.getDeck(), text(cardId)]);
        return { ok: true, reason: null, message: "", status: deckStatus() };
    };
    const removeFromDeck = cardId => {
        if (inCombat()) return { ...IN_COMBAT };
        const deck = deckApi();
        const current = deck?.getDeck() || [];
        const index = current.lastIndexOf(text(cardId));
        if (index < 0) return { ok: false, reason: "NOT_IN_DECK", message: describeReason({ code: "NOT_IN_DECK" }), reasons: [] };
        current.splice(index, 1);
        deck.setDeck(current);
        return { ok: true, reason: null, message: "", status: deckStatus() };
    };
    const clearDeck = () => {
        if (inCombat()) return { ...IN_COMBAT };
        deckApi()?.setDeck([]);
        return { ok: true, reason: null, message: "", status: deckStatus() };
    };

    // ---- Ultimateモデル -----------------------------------------------------------------------------
    const ultimateEntries = () => {
        const deck = deckApi();
        if (!deck) return [];
        const activation = root.ProjectRUltimateActivation;
        const selected = deck.getUltimateRingId();
        return deck.definitions.ringDefinitions().map(ring => {
            const owner = deck.getRingOwner(ring.ringId);
            const info = ringInfo(ring.ringId);
            const ownedByPlayer = owner === "player";
            const allyId = /^actor:(\d+)$/.test(owner || "") ? Number(owner.slice(6)) : 0;
            const implemented = !!activation?.hasUltimateHandler?.(ring.godId);
            const reasons = [];
            if (!ownedByPlayer) reasons.push({ code: "ULTIMATE_RING_NOT_OWNED", ringId: ring.ringId });
            if (!implemented) reasons.push({ code: "ULTIMATE_NOT_IMPLEMENTED", ringId: ring.ringId });
            return {
                ringId: ring.ringId, godId: ring.godId, godName: info.godName, ringName: info.name,
                owner, ownedByPlayer, assignedToAllyId: allyId, assignedToAllyName: allyId ? actorName(allyId) : "",
                implemented, selected: selected === ring.ringId, selectable: ownedByPlayer && implemented,
                reasons, messages: describeReasons(reasons),
                iconName: hud()?.getGodPresentation?.(ring.godId)?.imageName || ""
            };
        });
    };
    const selectUltimate = ringId => {
        if (inCombat()) return { ...IN_COMBAT };
        const entry = ultimateEntries().find(e => e.ringId === text(ringId));
        if (!entry) return { ok: false, reason: "INVALID_RING_ID", message: describeReason({ code: "INVALID_RING_ID", ringId }), reasons: [] };
        if (!entry.implemented) return { ok: false, reason: "ULTIMATE_NOT_IMPLEMENTED", message: describeReason({ code: "ULTIMATE_NOT_IMPLEMENTED" }), reasons: entry.reasons };
        const result = deckApi().setUltimateRing(entry.ringId);
        return result.ok ? { ok: true, reason: null, message: "", ringId: entry.ringId, godId: entry.godId }
            : { ok: false, reason: result.reasons[0]?.code, message: describeReasons(result.reasons)[0] || "", reasons: result.reasons };
    };
    const selectedUltimate = () => {
        const ringId = deckApi()?.getUltimateRingId?.() || null;
        return ringId ? { ringId, ...ringInfo(ringId) } : null;
    };

    // ---- 指輪モデル ---------------------------------------------------------------------------------
    const actorName = actorId => {
        const allyName = root.ProjectRPartyCombat?.allyDefinition?.(actorId)?.name;
        if (allyName) return allyName;
        const actor = typeof $gameActors !== "undefined" ? $gameActors?.actor?.(actorId) : null;
        if (actor?.name) return actor.name();
        const data = typeof $dataActors !== "undefined" ? $dataActors?.[actorId] : null;
        return data?.name || `Actor${actorId}`;
    };
    const ringEntries = () => {
        const deck = deckApi();
        if (!deck) return [];
        return deck.definitions.ringDefinitions().map(ring => {
            const owner = deck.getRingOwner(ring.ringId);
            const info = ringInfo(ring.ringId);
            const allyId = /^actor:(\d+)$/.test(owner || "") ? Number(owner.slice(6)) : 0;
            return {
                ringId: ring.ringId, godId: ring.godId, godName: info.godName, ringName: info.name,
                owner, ownerLabel: owner === "player" ? "主人公" : allyId ? actorName(allyId) : "未所持",
                ownedByPlayer: owner === "player", allyId,
                eligibleActors: ring.equipActorIds.map(id => ({ actorId: id, name: actorName(id),
                    reasons: deck.getActorRingInvalidReasons(ring.ringId, id),
                    canReceive: deck.canActorEquipRing(ring.ringId, id) })),
                cardCount: deck.definitions.cardDefinitions().filter(c => c.ringId === ring.ringId).length
            };
        });
    };
    const transferRingToActor = (ringId, actorId) => {
        if (inCombat()) return { ...IN_COMBAT };
        const result = deckApi().assignRingToActor(ringId, actorId);
        return result.ok ? { ok: true, reason: null, message: "" }
            : { ok: false, reason: result.reasons[0]?.code, message: describeReasons(result.reasons)[0] || "", reasons: result.reasons };
    };
    const returnRingToPlayer = ringId => {
        if (inCombat()) return { ...IN_COMBAT };
        const result = deckApi().assignRingToPlayer(ringId);
        return result.ok ? { ok: true, reason: null, message: "" }
            : { ok: false, reason: result.reasons[0]?.code, message: describeReasons(result.reasons)[0] || "", reasons: result.reasons };
    };

    // ---- 所持品モデル（正は$gameParty。読み取り専用） -------------------------------------------------
    const INVENTORY_CATEGORIES = Object.freeze([
        { key: "item", label: "アイテム" }, { key: "weapon", label: "武器" }, { key: "armor", label: "防具" },
        { key: "keyItem", label: "大事なもの" }, { key: "ammo", label: "弾薬" }, { key: "ring", label: "指輪" }
    ]);
    const ammoItemNames = () => {
        const names = new Set();
        const weapons = typeof $dataWeapons !== "undefined" ? $dataWeapons : [];
        for (const weapon of weapons) {
            const match = weapon && String(weapon.note || "").match(/<ammo item:\s*(.+?)>/i);
            if (match) names.add(match[1].trim());
        }
        return names;
    };
    const paramLabel = index => typeof TextManager !== "undefined" && TextManager.param ? TextManager.param(index) : `P${index}`;
    const equipStats = item => (item?.params || []).map((value, index) => ({ label: paramLabel(index), value }))
        .filter(stat => stat.value !== 0);
    const equippedBy = item => {
        if (typeof $gameParty === "undefined" || !$gameParty) return [];
        const members = $gameParty.allMembers ? $gameParty.allMembers() : $gameParty.members();
        return members.filter(actor => actor.equips().includes(item)).map(actor => actor.name());
    };
    // 使えるのは「味方」対象(1人/全員/使用者)の消耗品だけ。弾薬のように対象なし(scope 0)は使えない。
    const usableScope = item => item.itypeId === 1 && [7, 8, 11].includes(item.scope);
    const inventoryEntries = category => {
        const party = typeof $gameParty !== "undefined" ? $gameParty : null;
        if (!party) return [];
        const entry = (item, kind, number) => {
            const wearers = kind === "weapon" || kind === "armor" ? equippedBy(item) : [];
            return {
                kind, item, id: item.id, name: item.name, iconIndex: item.iconIndex || 0, number,
                description: item.description || "", stats: kind === "weapon" || kind === "armor" ? equipStats(item) : [],
                equipped: wearers.length > 0, equippedBy: wearers,
                usable: kind === "item" && usableScope(item) && !!party.canUse?.(item)
            };
        };
        if (category === "item" || category === "ammo" || category === "keyItem") {
            const ammo = ammoItemNames();
            return party.items().filter(item => {
                if (!item || !item.name) return false;
                if (category === "keyItem") return item.itypeId === 2;
                const isAmmo = ammo.has(item.name);
                return item.itypeId === 1 && (category === "ammo" ? isAmmo : !isAmmo);
            }).map(item => entry(item, category === "keyItem" ? "keyItem" : "item", party.numItems(item)));
        }
        if (category === "weapon" || category === "armor") {
            const owned = category === "weapon" ? party.weapons() : party.armors();
            const members = party.allMembers ? party.allMembers() : party.members();
            const worn = members.flatMap(actor => actor.equips()).filter(item => item &&
                (category === "weapon" ? typeof DataManager !== "undefined" && DataManager.isWeapon(item) : DataManager.isArmor(item)));
            const list = [];
            for (const item of worn) if (!list.some(e => e.item === item)) list.push(entry(item, category, 1));
            for (const item of owned) list.push(entry(item, category, party.numItems(item)));
            return list;
        }
        if (category === "ring") {
            return ringEntries().filter(r => r.owner !== "unowned").map(r => ({
                kind: "ring", item: null, id: r.ringId, name: r.ringName, iconIndex: 0, number: 1,
                description: `${r.godName}の指輪。所持者：${r.ownerLabel}。対応カード ${r.cardCount}種。`,
                stats: [], equipped: !r.ownedByPlayer, equippedBy: r.allyId ? [r.ownerLabel] : [], usable: false
            }));
        }
        return [];
    };
    // 回復アイテムなどをメニューから主人公に使う。確認はUI側。戦闘中・使えない物は拒否。
    const useItemOnLeader = item => {
        if (inCombat()) return { ...IN_COMBAT };
        const party = typeof $gameParty !== "undefined" ? $gameParty : null;
        const actor = party?.leader?.();
        if (!party || !actor || !item || !usableScope(item) || !party.canUse(item)) {
            return { ok: false, reason: "cannotUse", message: "今は使えません。" };
        }
        const action = new Game_Action(actor);
        action.setItemObject(item);
        if (!action.testApply(actor)) return { ok: false, reason: "noEffect", message: "効果がありません。" };
        for (let i = 0; i < action.numRepeats(); i++) action.apply(actor);
        actor.useItem(item);
        actor.refresh?.();
        return { ok: true, reason: null, message: "" };
    };

    root.ProjectRMenuCore = {
        VERSION: "1.0.0",
        setCardText, setGodText, setCategoryLabel,
        cardInfo, godInfo, ringInfo, describeReason, describeReasons,
        combatLock, isLocked: inCombat,
        deck: {
            size: sizeLimit, status: deckStatus, collection: collectionEntries, entries: deckEntries,
            canAdd: addCheck, add: addToDeck, remove: removeFromDeck, clear: clearDeck
        },
        ultimate: { entries: ultimateEntries, select: selectUltimate, selected: selectedUltimate },
        rings: { entries: ringEntries, transferToActor: transferRingToActor, returnToPlayer: returnRingToPlayer },
        inventory: { categories: INVENTORY_CATEGORIES, entries: inventoryEntries, useOnLeader: useItemOnLeader }
    };
    if (typeof module !== "undefined" && module.exports) module.exports = root.ProjectRMenuCore;
})();
