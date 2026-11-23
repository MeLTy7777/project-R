/*:
 * @target MZ
 * @plugindesc v0.3.0 ProjectR 指輪の装備・スキル編成の保存領域と操作API(Stage 1A/1B/1C)。旧セーブの一度だけの移行・自動修復・修復の通知。メニュー(指輪装備/スキル編成)から操作できます。FieldCombat・奥義の実行とはまだ接続しません。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardCatalog
 *
 * @help
 * ProjectR_RingLoadout.js
 *
 * 【役割】「どの指輪を装備しているか」と「5枠 + 奥義枠に何を登録しているか」を、独立した保存領域に持ちます。
 *   メニュー画面(ProjectR_RingParty の「指輪装備」「スキル編成」。ProjectR_MenuCore の loadout モデル経由)から操作できます(Stage 1C)。
 *   FieldCombat・奥義の実行とは接続していません(Stage 1D 以降)。
 *   ProjectR_CardDeckCore・SOUL・既存の戦闘・奥義の挙動は変えません(指輪の所持は読み取るだけです)。
 *
 * 【保存】$gameSystem._projectRRingLoadout = { schema: 1, equipped: [指輪ID...], slots: { lmb, shift, e, x, c: スキルID|null }, ultimate: 指輪ID|null }
 *   ・保存するのは装備と編成だけです。「解放済みのスキル・奥義」は保存せず、指輪の所持(CardDeckCore)から毎回導出します。
 *
 * 【旧セーブの移行(Stage 1B。一度だけ)】
 *   ・読み込み(DataManager.extractSaveContents)の直後に、キーが無い旧セーブへ「装備なし・5枠すべて空・奥義なし」の空の領域を作ります。
 *     指輪の所持・SOUL の保存データ(_projectRSoulLoadout など)・CardDeckCore の保存データには一切触れません。
 *   ・キーを作ったあとは「移行済み」です。何度ロードしても、再び初期化されることはありません。
 *   ・新しいゲームでは、最初から空の領域を持ちます。
 *   ・読み込み中に保存ファイルを書き換えることはありません(メモリ上のデータを整えるだけ。ファイルへ入るのは、プレイヤーが次にセーブしたときです)。
 *
 * 【自動修復(Stage 1B)】
 *   ・読み込み時と、装備・編成を変更するときに、無効な記録を取り除きます。有効な記録は、そのまま残します(全体を初期化しません)。
 *     無効の例: 未知の指輪・スキルID / 所持していない指輪の装備 / 装備していない指輪のスキル・奥義 / 型の不正な値。
 *   ・同じスキルが複数枠にあるときは、LMB → Shift → E → X → C の順で最初の1つだけを残し、残りを空にします。
 *   ・無効な記録を実際に取り除いたときだけ、「自動で修復しました」という短い通知(操作を止めない)を1回出します。
 *     通常の移行・装備・装備解除・所有変更では通知しません。通知はマップ画面で出ます(別の画面にいる間は、マップへ戻ったときに1回)。
 *
 * 【所有変更に追従する掃除(Stage 1B)】
 *   ・指輪が仲間に渡された・未所持になったときは、その場で(手動の reconcile() なしに)装備から外し、その指輪のスキル・奥義の登録を解除します。
 *     主人公へ戻しても、以前の装備・登録は復元しません(解放済みのスキルは所持から導出されるので、再び装備して選び直せます)。
 *   ・ProjectRCardDeck の assignRingToPlayer / assignRingToActor / setRingUnowned の前後で掃除します(CardDeckCore 自体は変更しません)。
 *     それらを通らない経路の取りこぼしは、マップ更新の定期確認(約15フレームごと)が掃除します。
 *   ・この掃除は戦闘中でも行います(所有の変更に伴うシステムの後始末のため)。通常の装備・編成の変更は、戦闘中は拒否します。
 *
 * 【規則(Stage 1Aから)】
 *   ・指輪の所持数・装備数に上限はありません。装備できるのは、主人公が所持している指輪だけです。
 *   ・指輪を入手しても自動では装備されません。装備してもスキルは自動登録されません。
 *   ・主人公が所持している指輪は、その指輪のスキルと奥義を解放済みとみなします(旧セーブの所持指輪も同じ)。
 *   ・スキルは、装備中の指輪に属するものだけを5枠のどれかに登録できます。同じスキルを2枠に登録できません。空欄は可。
 *   ・奥義枠(Q)には、装備中の指輪の奥義を1つ登録できます。
 *   ・指輪を外すと、その指輪のスキル・奥義の登録が解除されます。再び装備しても復元しません。
 *   ・戦闘中(カード戦闘・戦闘イベント・SOUL・通常戦闘)は、装備・編成の変更を拒否します。
 *
 * 【スキルの出どころ】ProjectR_CardCatalog の設計データのうち implemented=true で runtimeCardId を持ち、
 *   CardDeckCore のカード定義に登録済み(指輪IDも一致)のものだけです。IDをこのプラグインで新しく作ることはありません。
 *   ・承認済みの「指輪ごとの通常5スキル」の表は、このファイルの SKILL_SETS です。解放・登録できるのは、表にある実装済みのスキルだけです。
 *     Hermes: 薙ぎ払い hermes_sweep / 絶 hermes_zetsu / 一閃 hermes_issen / 葦笛 hermes_reed_flute / ストレングス hermes_strength
 *     Apollo: 黄金の矢 apollo_golden_volley / エロスの矢 apollo_eros_arrow / 竪琴 apollo_lyre_rhythm / 月桂冠 apollo_laurel_wreath / 疫病の矢 apollo_plague_rain
 *     表に無い指輪(Themis・Athena など。Janus は Stage 2 で表に追加)や、表に無い既存カード(サイコポンポス・ヴェイル・旧カードなど)は、解放も登録もできません。
 *   ・奥義は「指輪ID」で表します(1指輪につき奥義1種類のため)。奥義が実装済みかどうかは、このStageでは確認しません。
 *
 * API: ProjectRRingLoadout
 *   定数: VERSION / KEY / SLOT_IDS(["lmb","shift","e","x","c"]) / ULTIMATE_SLOT("q")
 *   取得(保存データのコピーを返す。変更しても保存データには影響しません):
 *     getState() / getEquippedRings() / isRingEquipped(ringId) / getSlots() / getSkill(slot) / getUltimate() / findSlotOfSkill(skillId)
 *     getRingSkills(ringId) / getSkillSetSource(ringId) / getSkillRing(skillId) / isRingOwned(ringId) / getUnlockedSkills(ringId) / isSkillUnlocked(skillId) / isUltimateUnlocked(ringId)
 *     isLocked() / getLockReason() / getNoticeState()
 *   変更(戻り値 { ok, reason, changed, state }。失敗しても何も変わりません):
 *     equipRing(ringId) / unequipRing(ringId) / setSkill(slot, skillId) / clearSkill(slot) / setUltimate(ringId) / clearUltimate() / reconcile()
 *   reconcile() は、無効な記録を明示的に取り除く手動の修復です(通知は出しません)。所有変更の掃除と読み込み時の修復は、自動で行われます。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const VERSION = "0.3.0";
    const KEY = "_projectRRingLoadout";
    const SCHEMA = 1;
    const SLOT_IDS = Object.freeze(["lmb", "shift", "e", "x", "c"]);
    const ULTIMATE_SLOT = "q";
    const OWNER_PLAYER = "player";
    const SYNC_INTERVAL_FRAMES = 15;
    const NOTICE_TEXT = "装備・編成の無効な設定を自動で修復しました。";
    const NOTICE_FRAMES = 180;
    // 承認済みの「指輪ごとの通常5スキル」の表: { ringId: [スキルID x5] }。解放・登録できるスキルはこの表にあるものだけです。
    // 既存の実装済みスキル(CardCatalogの設計 ∩ CardDeckCoreの登録)のIDだけを書く(未実装のIDを推測で書かない)。表のIDが実装済みでない・指輪が違う場合、そのIDは無視されます。
    // 表に無い指輪(Themis / Athena など)は、解放・登録できるスキルが0です。実装済みスキルが追加されたら、ここに { ringId: [ID...] } の1行を足します。
    const SKILL_SETS = Object.freeze({
        hermes: Object.freeze(["hermes_sweep", "hermes_zetsu", "hermes_issen", "hermes_reed_flute", "hermes_strength"]), // 薙ぎ払い・絶・一閃・葦笛・ストレングス
        apollo: Object.freeze(["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_plague_rain"]), // 黄金の矢・エロスの矢・竪琴・月桂冠・疫病の矢
        janus: Object.freeze(["janus_dual_gate", "janus_closed_gate", "janus_reflection", "janus_inversion", "janus_boundary_slash"]) // 双門・閉門・反照・表裏転化・境界断ち(Stage 2)
    });

    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const api = name => { try { const t = root[name]; return t && (typeof t === "object" || typeof t === "function") ? t : null; } catch (_error) { return null; } };
    const deck = () => api("ProjectRCardDeck");
    const catalog = () => api("ProjectRCardCatalog");
    const system = () => (typeof $gameSystem !== "undefined" && $gameSystem ? $gameSystem : null);
    const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);
    const text = value => (typeof value === "string" ? value.trim() : "");
    const deepFreeze = value => {
        if (value && typeof value === "object" && !Object.isFrozen(value)) {
            Object.freeze(value);
            for (const key of Object.keys(value)) deepFreeze(value[key]);
        }
        return value;
    };

    // ---------------------------------------------------------------- 指輪・スキルの確認(既存の定義だけを使う) ----------------------------------------------------------------
    const ringIdOf = ringId => { const id = text(ringId); return id ? safe(() => deck()?.definitions?.ring?.(id)?.ringId, null) || null : null; };
    const isRingOwned = ringId => { const id = ringIdOf(ringId); return !!id && safe(() => deck().getRingOwner(id), null) === OWNER_PLAYER; };
    // 実装済みの設計カード(CardCatalogの設計 ∩ CardDeckCoreの登録)のうち、指輪に属するもの
    const designSkills = ringId => {
        const id = ringIdOf(ringId);
        const designs = safe(() => catalog()?.designs?.(), null);
        if (!id || !Array.isArray(designs)) return [];
        const out = [];
        for (const row of designs) {
            if (!row || row.implemented !== true || !row.runtimeCardId || row.ringId !== id) continue;
            const def = safe(() => deck().definitions.card(row.runtimeCardId), null);
            if (!def || def.ringId !== id || out.includes(def.cardId)) continue;
            out.push(def.cardId);
        }
        return out;
    };
    const hasApprovedSet = ringId => { const id = ringIdOf(ringId); return !!id && Object.prototype.hasOwnProperty.call(SKILL_SETS, id) && Array.isArray(SKILL_SETS[id]) && SKILL_SETS[id].length > 0; };
    // 許可リスト: 表(SKILL_SETS)にあり、かつ実装済みのスキルだけ。表に無い指輪は空。getUnlockedSkills / setSkill / 読み込み時の検証はすべてここを通る。
    const ringSkills = ringId => {
        const id = ringIdOf(ringId);
        if (!id || !hasApprovedSet(id)) return [];
        const designs = designSkills(id);
        const out = [];
        for (const skillId of SKILL_SETS[id]) if (designs.includes(skillId) && !out.includes(skillId)) out.push(skillId);
        return out;
    };
    const allRingIds = () => safe(() => deck().definitions.ringDefinitions().map(ring => ring.ringId), []) || [];
    const skillRing = skillId => {
        const id = text(skillId);
        if (!id) return null;
        for (const ringId of allRingIds()) if (ringSkills(ringId).includes(id)) return ringId;
        return null;
    };
    const unlockedSkills = ringId => (isRingOwned(ringId) ? ringSkills(ringId) : []);

    // ---------------------------------------------------------------- 保存データ(読み取りは何も書き込まない) ----------------------------------------------------------------
    const emptyData = () => { const slots = {}; for (const slot of SLOT_IDS) slots[slot] = null; return { schema: SCHEMA, equipped: [], slots, ultimate: null }; };
    const isBlank = value => value === undefined || value === null || value === "";
    // 形だけを整えたコピー(型の不正・未知の指輪ID・重複を除く)。除いた記録の数を tally.n に数える。所持や所属の検証は effectiveFrom が行う。
    const sanitize = (raw, tally) => {
        const data = emptyData();
        const drop = () => { if (tally) tally.n++; };
        if (!isObject(raw)) return data;
        if (Array.isArray(raw.equipped)) {
            for (const value of raw.equipped) {
                const id = ringIdOf(value);
                if (id && !data.equipped.includes(id)) data.equipped.push(id); else if (!isBlank(value)) drop();
            }
        } else if (!isBlank(raw.equipped)) drop();
        if (isObject(raw.slots)) {
            for (const slot of SLOT_IDS) { const id = text(raw.slots[slot]); data.slots[slot] = id || null; if (!id && !isBlank(raw.slots[slot])) drop(); }
        } else if (!isBlank(raw.slots)) drop();
        data.ultimate = ringIdOf(raw.ultimate);
        if (!data.ultimate && !isBlank(raw.ultimate)) drop();
        return data;
    };
    // いまの所持・装備・解放に照らして有効なものだけの状態。無効な記録は(書き込まずに)取り除いて見せる。重複は LMB → Shift → E → X → C の順で最初を残す。
    const effectiveFrom = (raw, tally) => {
        const data = sanitize(raw, tally);
        data.equipped = data.equipped.filter(isRingOwned);
        const used = [];
        for (const slot of SLOT_IDS) {
            const id = data.slots[slot];
            const ring = id ? skillRing(id) : null;
            const valid = !!ring && data.equipped.includes(ring) && unlockedSkills(ring).includes(id) && !used.includes(id);
            data.slots[slot] = valid ? id : null;
            if (valid) used.push(id);
        }
        if (data.ultimate && !(data.equipped.includes(data.ultimate) && isRingOwned(data.ultimate))) data.ultimate = null;
        return data;
    };
    const rawData = () => { const s = system(); return s ? s[KEY] : null; };
    const effectiveData = () => effectiveFrom(rawData());
    const writeData = data => {
        const s = system();
        if (!s) return false;
        const slots = {};
        for (const slot of SLOT_IDS) slots[slot] = data.slots[slot] || null;
        s[KEY] = { schema: SCHEMA, equipped: data.equipped.slice(), slots, ultimate: data.ultimate || null };
        return true;
    };
    // raw のうち、無効として取り除かれる記録: { rings, slots, ultimate, other(型の不正など), total }
    const repairReport = raw => {
        const tally = { n: 0 };
        const before = sanitize(raw, tally);
        const after = effectiveFrom(raw);
        const rings = before.equipped.filter(id => !after.equipped.includes(id));
        const slots = SLOT_IDS.filter(slot => before.slots[slot] && before.slots[slot] !== after.slots[slot]);
        const ultimate = !!before.ultimate && !after.ultimate;
        return { rings, slots, ultimate, other: tally.n, total: rings.length + slots.length + (ultimate ? 1 : 0) + tally.n };
    };

    // ---------------------------------------------------------------- 戦闘中ロック ----------------------------------------------------------------
    const lockState = () => {
        const menu = safe(() => api("ProjectRMenuCore")?.combatLock?.(), null);
        if (menu && menu.locked) return { locked: true, reason: menu.reason || "combat" };
        if (safe(() => deck()?.isCardBattleActive?.(), false)) return { locked: true, reason: "cardBattle" };
        if (safe(() => typeof $gameParty !== "undefined" && $gameParty?.inBattle?.(), false)) return { locked: true, reason: "battle" };
        if (safe(() => api("ProjectRCombatPresence")?.isCombatEventActive?.(), false)) return { locked: true, reason: "combatEvent" };
        if (safe(() => api("ProjectRSoulBattle")?.isActive?.(), false)) return { locked: true, reason: "soulBattle" };
        return { locked: false, reason: null };
    };

    // ---------------------------------------------------------------- 通知(自動修復で無効な記録を取り除いたときだけ。操作を止めない) ----------------------------------------------------------------
    const notice = { pending: null, queued: 0, shown: 0 };
    const queueNotice = report => {
        const merged = notice.pending || { text: NOTICE_TEXT, rings: 0, slots: 0, ultimate: 0, other: 0 };
        merged.rings += report.rings.length; merged.slots += report.slots.length; merged.ultimate += report.ultimate ? 1 : 0; merged.other += report.other;
        if (!notice.pending) notice.queued++;                                    // 保留中に重なった修復は、1つの通知にまとめる
        notice.pending = merged;
        presentNotice();
    };
    let NoticeWindow = null;
    const noticeWindowClass = () => {
        if (NoticeWindow || typeof Window_Base === "undefined") return NoticeWindow;
        NoticeWindow = class Window_ProjectRLoadoutNotice extends Window_Base {
            constructor(rect, message) {
                super(rect);
                this._message = message;
                this._life = 0;
                this.active = false;                                             // 入力を受け付けない(表示だけ)
                this.opacity = 220;
                this.refresh();
            }
            refresh() {
                this.contents.clear();
                this.drawText(this._message, 0, 0, this.innerWidth, "center");
            }
            update() {
                super.update();
                this._life++;
                const left = NOTICE_FRAMES - this._life;
                if (left < 30) { const rate = Math.max(0, left / 30); this.opacity = 220 * rate; this.contentsOpacity = 255 * rate; }
                if (left <= 0 && this.parent) { this.parent.removeChild(this); }
            }
        };
        return NoticeWindow;
    };
    // マップ画面にいるときだけ表示する(入力は奪わない・イベントも止めない小さなウィンドウ)。表示できなければ、保留のまま残す。
    function presentNotice() {
        if (!notice.pending) return false;
        const scene = safe(() => (typeof SceneManager !== "undefined" ? SceneManager._scene : null), null);
        if (!scene || typeof Scene_Map === "undefined" || !(scene instanceof Scene_Map) || typeof scene.addWindow !== "function") return false;
        const Cls = noticeWindowClass();
        if (!Cls || typeof Rectangle === "undefined" || typeof Graphics === "undefined") return false;
        try {
            const width = Math.min(Graphics.boxWidth - 32, 560);
            const height = 56;
            const win = new Cls(new Rectangle(Math.floor((Graphics.boxWidth - width) / 2), 16, width, height), notice.pending.text);
            scene.addWindow(win);
            notice.shown++;
            notice.pending = null;
            return true;
        } catch (_error) { return false; }
    }

    // ---------------------------------------------------------------- 取得(コピーを返す) ----------------------------------------------------------------
    const snapshot = data => deepFreeze({ schema: SCHEMA, equipped: data.equipped.slice(), slots: { ...data.slots }, ultimate: data.ultimate });
    const getState = () => snapshot(effectiveData());
    const findSlotOfSkill = skillId => { const id = text(skillId); const data = effectiveData(); return SLOT_IDS.find(slot => data.slots[slot] === id && id) || null; };

    // ---------------------------------------------------------------- 変更 ----------------------------------------------------------------
    const done = (ok, reason, changed, extra) => Object.freeze({ ok, reason, changed, state: getState(), ...(extra || {}) });
    const fail = (reason, extra) => done(false, reason, false, extra);
    // 変更の共通処理: ロック確認 → 有効な状態を取り出す → 変更 → 変わったときだけ保存(このとき無効な記録の取り除きも保存され、取り除いたなら通知する)
    const change = body => {
        const lock = lockState();
        if (lock.locked) return fail("inCombat", { lockReason: lock.reason });
        if (!system()) return fail("noSystem");
        const raw = rawData();
        const report = repairReport(raw);
        const data = effectiveFrom(raw);
        const outcome = body(data);
        if (!outcome.ok) return fail(outcome.reason, outcome.extra);
        if (outcome.changed) {
            writeData(data);
            if (report.total > 0) queueNotice(report);
        }
        return done(true, outcome.changed ? "changed" : "unchanged", !!outcome.changed);
    };
    const equipRing = ringId => change(data => {
        const id = ringIdOf(ringId);
        if (!id) return { ok: false, reason: "invalidRingId" };
        if (!isRingOwned(id)) return { ok: false, reason: "ringNotOwned" };
        if (data.equipped.includes(id)) return { ok: true, changed: false };
        data.equipped.push(id);                                                  // スキル・奥義は自動登録しない
        return { ok: true, changed: true };
    });
    const unequipRing = ringId => change(data => {
        const id = ringIdOf(ringId);
        if (!id) return { ok: false, reason: "invalidRingId" };
        if (!data.equipped.includes(id)) return { ok: true, changed: false };
        data.equipped = data.equipped.filter(x => x !== id);
        for (const slot of SLOT_IDS) if (data.slots[slot] && skillRing(data.slots[slot]) === id) data.slots[slot] = null;
        if (data.ultimate === id) data.ultimate = null;                          // 再び装備しても復元しない
        return { ok: true, changed: true };
    });
    const setSkill = (slot, skillId) => change(data => {
        if (!SLOT_IDS.includes(slot)) return { ok: false, reason: "invalidSlot" };
        const id = text(skillId);
        const ring = id ? skillRing(id) : null;
        if (!ring) return { ok: false, reason: "invalidSkillId" };
        if (!isRingOwned(ring) || !unlockedSkills(ring).includes(id)) return { ok: false, reason: "skillNotUnlocked" };
        if (!data.equipped.includes(ring)) return { ok: false, reason: "ringNotEquipped" };
        const other = SLOT_IDS.find(s => s !== slot && data.slots[s] === id);
        if (other) return { ok: false, reason: "duplicateSkill", extra: { slot: other } };
        if (data.slots[slot] === id) return { ok: true, changed: false };
        data.slots[slot] = id;
        return { ok: true, changed: true };
    });
    const clearSkill = slot => change(data => {
        if (!SLOT_IDS.includes(slot)) return { ok: false, reason: "invalidSlot" };
        if (!data.slots[slot]) return { ok: true, changed: false };
        data.slots[slot] = null;
        return { ok: true, changed: true };
    });
    const setUltimate = ringId => change(data => {
        const id = ringIdOf(ringId);
        if (!id) return { ok: false, reason: "invalidRingId" };
        if (!isRingOwned(id)) return { ok: false, reason: "ringNotOwned" };
        if (!data.equipped.includes(id)) return { ok: false, reason: "ringNotEquipped" };
        if (data.ultimate === id) return { ok: true, changed: false };
        data.ultimate = id;
        return { ok: true, changed: true };
    });
    const clearUltimate = () => change(data => {
        if (!data.ultimate) return { ok: true, changed: false };
        data.ultimate = null;
        return { ok: true, changed: true };
    });
    // 手動の修復: 無効な記録を明示的に取り除く(キーが無ければ何もしない。通知は出さない)
    const reconcile = () => {
        const lock = lockState();
        if (lock.locked) return fail("inCombat", { lockReason: lock.reason });
        if (!system()) return fail("noSystem");
        const raw = rawData();
        if (raw === undefined || raw === null) return done(true, "unchanged", false);
        const report = repairReport(raw);
        const after = effectiveFrom(raw);
        if (JSON.stringify(after) === JSON.stringify(raw)) return done(true, "unchanged", false);   // 書き込み済みの形と同じなら何もしない
        writeData(after);
        return done(true, "changed", true, { removed: deepFreeze({ rings: report.rings, slots: report.slots, ultimate: report.ultimate }) });
    };

    // ---------------------------------------------------------------- 旧セーブの移行・読み込み時の修復・所有変更の掃除(Stage 1B) ----------------------------------------------------------------
    // 読み込み直後(と新しいゲーム)に呼ぶ。キーが無ければ空の領域を作る(一度だけ)。あれば、無効な記録だけを取り除く。保存ファイルは書かない。
    const migrateAndRepair = () => {
        const s = system();
        if (!s) return { migrated: false, repaired: false };
        const raw = s[KEY];
        if (raw === undefined || raw === null) { writeData(emptyData()); return { migrated: true, repaired: false }; }
        const report = repairReport(raw);
        const after = effectiveFrom(raw);
        if (JSON.stringify(after) !== JSON.stringify(raw)) writeData(after);
        if (report.total > 0) queueNotice(report);
        return { migrated: false, repaired: report.total > 0, report };
    };
    // 主人公の所持でなくなった指輪を、装備と編成から外す(通知なし・戦闘中も行う。他の記録はそのまま残す)
    const syncOwnership = () => {
        const raw = rawData();
        if (!isObject(raw) || !Array.isArray(raw.equipped) || !raw.equipped.length) return false;
        const data = sanitize(raw);
        const lost = data.equipped.filter(id => !isRingOwned(id));
        if (!lost.length) return false;
        data.equipped = data.equipped.filter(id => !lost.includes(id));
        for (const slot of SLOT_IDS) if (data.slots[slot] && lost.includes(skillRing(data.slots[slot]))) data.slots[slot] = null;
        if (data.ultimate && lost.includes(data.ultimate)) data.ultimate = null;
        writeData(data);
        return true;
    };
    const guardedSync = () => { try { return syncOwnership(); } catch (_error) { return false; } };

    // ---------------------------------------------------------------- 接続(既存の関数を包む。元の挙動はそのまま) ----------------------------------------------------------------
    // 指輪の所有を変える公開APIの前後で掃除する。前: 取りこぼしを先に掃除(戻しても復元しない)。後: 渡した・未所持にした指輪をその場で外す。
    const wrapOwnershipApi = () => {
        const target = deck();
        if (!target) return;
        for (const name of ["assignRingToPlayer", "assignRingToActor", "setRingUnowned"]) {
            const original = target[name];
            if (typeof original !== "function" || original.__projectRRingLoadout) continue;
            const wrapped = function() {
                guardedSync();
                const result = original.apply(this, arguments);
                guardedSync();
                return result;
            };
            wrapped.__projectRRingLoadout = true;
            target[name] = wrapped;
        }
    };
    wrapOwnershipApi();
    if (typeof Game_System !== "undefined") {
        const _initialize = Game_System.prototype.initialize;
        Game_System.prototype.initialize = function() {
            _initialize.apply(this, arguments);
            this[KEY] = emptyData();                                             // 新しいゲーム: 最初から空
        };
    }
    if (typeof DataManager !== "undefined" && typeof DataManager.extractSaveContents === "function") {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() {
            const result = _extract.apply(this, arguments);
            try { migrateAndRepair(); } catch (_error) { /* 読み込みを止めない */ }
            return result;
        };
    }
    if (typeof Game_Map !== "undefined") {
        let tick = 0;
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function() {
            const result = _update.apply(this, arguments);
            if (++tick % SYNC_INTERVAL_FRAMES === 0) guardedSync();              // wrapを通らない所有変更の取りこぼし対策
            return result;
        };
    }
    if (typeof Scene_Map !== "undefined") {
        const _start = Scene_Map.prototype.start;
        Scene_Map.prototype.start = function() {
            const result = _start.apply(this, arguments);
            presentNotice();                                                     // 別の画面で保留になった通知を、マップへ戻ったときに1回出す
            return result;
        };
    }

    const exported = Object.freeze({
        VERSION, KEY, SLOT_IDS, ULTIMATE_SLOT,
        getState, getEquippedRings: () => getState().equipped, isRingEquipped: ringId => effectiveData().equipped.includes(ringIdOf(ringId)),
        getSlots: () => getState().slots, getSkill: slot => (SLOT_IDS.includes(slot) ? effectiveData().slots[slot] : null),
        getUltimate: () => effectiveData().ultimate, findSlotOfSkill,
        getRingSkills: ringId => ringSkills(ringId).slice(), getSkillSetSource: ringId => (hasApprovedSet(ringId) ? "approvedSet" : "none"),
        getSkillRing: skillRing, isRingOwned,
        getUnlockedSkills: ringId => unlockedSkills(ringId).slice(),
        isSkillUnlocked: skillId => { const ring = skillRing(skillId); return !!ring && unlockedSkills(ring).includes(text(skillId)); },
        isUltimateUnlocked: ringId => isRingOwned(ringId),
        isLocked: () => lockState().locked, getLockReason: () => lockState().reason,
        getNoticeState: () => deepFreeze({ pending: notice.pending ? { ...notice.pending } : null, queued: notice.queued, shown: notice.shown, text: NOTICE_TEXT }),
        equipRing, unequipRing, setSkill, clearSkill, setUltimate, clearUltimate, reconcile
    });
    root.ProjectRRingLoadout = exported;
    if (typeof module !== "undefined" && module.exports) module.exports = exported;
})();
