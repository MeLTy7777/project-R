"use strict";
// Phase Apollo-A13: Apolloの指輪・30枚デッキの統合(実エンジン: 実Map004 + 全plugin)。
//   指輪の所持 / 30枚デッキの組成・コピー上限・Lv1〜3 / 指輪なしの拒否 / 混成デッキ(2つの指輪) / 使い捨ての一時データの復元 / セーブの形(JsonEx往復) /
//   本物のデッキ・手札(requestUseCard)で8枚を使う / 山札の補充・Cooldown・捨て札・再シャッフル / Hermes・旧セーブ互換 / 本番の取得経路が無効のまま。
//   MZ実機(デッキ構築画面・実キー・セーブ)は対象外 → tools/mz_cdp/apollo_a13_deck_verify.cjs。保護された5つのセーブには一切触れない(ファイルを読み書きしない)。
const fs = require("node:fs");
const path = require("node:path");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, buildWorld, frames, aimDegree, center, placeEnemy, parkOthers, player, attachHpBars, deckApi, HP, ENEMIES } = fx;
const project = path.join(__dirname, "..");
let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

const APOLLO = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle", "apollo_plague_rain"];
const COPIES = { apollo_golden_volley: 5, apollo_eros_arrow: 5, apollo_lyre_rhythm: 2, apollo_laurel_wreath: 3, apollo_hyacinthus: 3, apollo_gigas_slayer: 5, apollo_oracle: 3, apollo_plague_rain: 4 };
const freshWorld = () => {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    return w;
};
const T = w => w.ctx.ProjectRApolloTest;
const D = w => w.ctx.ProjectRCardDeck;
const system = w => w.ctx.$gameSystem;
const snapshot = w => JSON.stringify({ core: system(w)._projectRCardDeckData ?? null, inv: system(w)._projectRCardInventory ?? null });
const codes = reasons => plain(reasons).map(r => (typeof r === "string" ? r.split(":")[0] : r.code));

test("初期状態: Apolloの指輪もカードも持っていない。本番の初期セット・指輪の取得にApolloは含まれない(自動配布なし)。Playtest用の入口は存在する", () => {
    const w = freshWorld();
    assert.equal(D(w).hasPlayerRing("apollo"), false);
    for (const id of APOLLO) assert.equal(D(w).isCardOwned(id), false, id);
    assert.ok(typeof T(w).grantRing === "function" && typeof T(w).reset === "function");
    const production = w.ctx.ProjectRHermesProductionDeck;
    assert.ok(!/apollo/i.test(JSON.stringify(plain(production.starterSet()))));
    const acquired = plain(production.acquireRing("apollo", { source: "test" }));
    assert.deepEqual([acquired.granted, acquired.reason], [false, "noStarterForRing"]);
    for (const id of APOLLO) assert.equal(w.ctx.ProjectRCardInventory.getOwnedCopies(id), 0, id + " の所持枚数は0のまま");
    // 本番データに、Apolloの指輪を渡す物語イベント・コマンドは無い(新しいイベント・NPCを作っていない)
    const hits = [];
    for (const file of fs.readdirSync(path.join(project, "data")).filter(f => /^(Map\d+|CommonEvents)\.json$/.test(f))) {
        const text = fs.readFileSync(path.join(project, "data", file), "utf8");
        for (const m of text.matchAll(/"code":357,"indent":\d+,"parameters":\[[^\]]*?"(GrantRing|AcquireHermesRing|GrantCardCopies)"[^\]]*?\]/g)) if (/apollo/i.test(m[0])) hits.push(file + ":" + m[0].slice(0, 80));
    }
    assert.deepEqual(hits, []);
});

test("指輪なしの拒否: Apolloのデッキを装備しても、指輪が無いとデッキは無効(REQUIRED_RING_NOT_OWNED)・戦闘は始まらず・カードは使えない", () => {
    const w = freshWorld();
    const built = plain(T(w).buildDeck("apollo"));
    assert.equal(built.size, 30);
    assert.equal(built.valid, false);
    assert.ok(built.reasons.some(r => r.startsWith("REQUIRED_RING_NOT_OWNED")), JSON.stringify(built.reasons));
    assert.ok(built.reasons.some(r => r.startsWith("CARD_NOT_OWNED")), "所持もしていない: " + JSON.stringify(built.reasons.slice(0, 3)));
    const started = plain(T(w).startDeckBattle(false)); // アリーナを使わず、Coreへそのまま戦闘の開始を求める(アリーナの開始は両方の指輪を渡すため)
    assert.equal(started.ok, false); assert.equal(started.reason, "battleStartFailed");
    assert.ok(started.reasons.includes("REQUIRED_RING_NOT_OWNED"));
    for (const id of APOLLO) assert.equal(D(w).canUseCard(id), false, id + " は使えない");
    assert.equal(T(w).reset().restored, true);
});

test("30枚デッキ: 指輪 + 所持を一時的に与えると有効。組成は5/5/2/3/3/5/3/4 = 30枚(8種)、コピー上限どおり。Lv1〜3の設定ができ、Lv4の指定は最大Lv3に丸められる。CardInventoryの検証も通る", () => {
    const w = freshWorld();
    assert.equal(plain(T(w).grantRing("apollo")).ok, true);
    assert.equal(plain(T(w).unlock(3, ["apollo"])).ok, true);
    const info = plain(T(w).buildDeck("apollo"));
    assert.equal(info.valid, true, JSON.stringify(info.reasons));
    assert.equal(info.size, 30);
    assert.deepEqual(info.counts, COPIES);
    assert.deepEqual(info.inventoryReasons, []);
    assert.equal(info.rings.apollo, "player");
    for (const id of APOLLO) {
        assert.equal(D(w).definitions.card(id).maxCopies, COPIES[id], id);
        for (const level of [1, 2, 3]) assert.equal(D(w).setCardLevel(id, level).ok, true, `${id} Lv${level}`);
        D(w).setCardLevel(id, 4); // 最大Lvを超える指定は、最大Lv(3)に丸められる
        assert.equal(D(w).getPersistentData().cardOwnership[id].level, 3, id + " は最大Lv3(Lv4は存在しない)");
        assert.equal(D(w).canUseCard(id), true, id + " は指輪を持てば使える");
    }
    assert.equal(w.ctx.ProjectRCardCatalog.godStatus("apollo").implemented, 8);
    assert.equal(w.ctx.ProjectRCardCatalog.isGodDeckReady("apollo"), true);
    // 31枚目・上限超過は拒否される(自動では直さない)
    const over = [...info.deck.slice(0, 29), "apollo_golden_volley", "apollo_golden_volley"];
    assert.equal(D(w).isDeckValid(over), false);
    assert.ok(codes(D(w).getDeckInvalidReasons(over)).includes("INVALID_DECK_SIZE") || codes(D(w).getDeckInvalidReasons(over)).includes("MAX_COPIES_EXCEEDED"));
    T(w).reset();
});

test("混成デッキ(HermesとApollo): 両方の指輪を持つと有効。片方の指輪を返すと、その神のカードだけが理由つきで無効になり、戦闘は始まらない。戻すと再び有効。ほかの神のカードは影響を受けない", () => {
    const w = freshWorld();
    assert.equal(plain(T(w).grantRing("apollo")).ok, true);
    assert.equal(plain(T(w).grantRing("hermes")).ok, true);
    assert.equal(plain(T(w).unlock(3, ["apollo", "hermes"])).ok, true);
    const mixed = plain(T(w).buildMixedDeck());
    assert.equal(mixed.valid, true, JSON.stringify(mixed.reasons));
    assert.equal(mixed.size, 30);
    const apolloN = mixed.deck.filter(id => id.startsWith("apollo_")).length, hermesN = mixed.deck.filter(id => id.startsWith("hermes_")).length;
    assert.deepEqual([apolloN, hermesN], [15, 15]);
    assert.deepEqual([mixed.rings.apollo, mixed.rings.hermes], ["player", "player"]);
    assert.equal(plain(T(w).revokeRing("apollo")).ok, true);
    const noApollo = plain(T(w).deckInfo());
    assert.equal(noApollo.valid, false);
    assert.ok(noApollo.reasons.every(r => r.startsWith("REQUIRED_RING_NOT_OWNED")), JSON.stringify(noApollo.reasons));
    assert.ok(noApollo.reasons.every(r => r.includes("apollo_")), "Hermesのカードは理由に出ない: " + JSON.stringify(noApollo.reasons));
    assert.equal(D(w).canUseCard("hermes_issen"), true); assert.equal(D(w).canUseCard("apollo_oracle"), false);
    assert.equal(D(w).startCardBattle().ok, false);
    assert.equal(plain(T(w).revokeRing("hermes")).ok, true);
    assert.ok(plain(T(w).deckInfo()).reasons.some(r => r.includes("hermes_")), "Hermesの指輪を返すとHermesのカードも無効");
    assert.equal(plain(T(w).grantRing("apollo")).ok, true); assert.equal(plain(T(w).grantRing("hermes")).ok, true);
    assert.equal(plain(T(w).deckInfo()).valid, true);
    // 戦闘中は指輪の譲渡ができない(Coreの規則)
    assert.equal(plain(T(w).startDeckBattle()).ok, true);
    assert.equal(plain(T(w).revokeRing("apollo")).ok, false);
    assert.equal(plain(T(w).reset()).restored, true);
});

test("一時データの復元: reset() で、指輪・所持・解放・Level・デッキ・CardInventoryの付与記録が、最初の変更の前とまったく同じに戻る(JSON一致)。控えが無ければ何も変えない", () => {
    const w = freshWorld();
    const before = snapshot(w);
    assert.equal(T(w).isDirty(), false);
    assert.deepEqual(plain(T(w).reset()), { ok: true, restored: false });
    assert.equal(snapshot(w), before, "控えが無ければ何も変えない");
    T(w).grantRing("apollo"); T(w).grantRing("hermes"); T(w).unlock(3, ["apollo", "hermes"]); T(w).buildMixedDeck();
    assert.equal(T(w).isDirty(), true);
    assert.notEqual(snapshot(w), before);
    assert.equal(plain(T(w).reset()).restored, true);
    assert.equal(snapshot(w), before, "完全に元へ戻る");
    assert.equal(T(w).isDirty(), false);
    assert.equal(D(w).hasPlayerRing("apollo"), false);
    for (const id of APOLLO) assert.equal(w.ctx.ProjectRCardInventory.getOwnedCopies(id), 0);
});

test("セーブの形(JsonEx往復・ファイルは使わない): Apolloの指輪・所持・Level・30枚デッキは、セーブ内容を文字列にして読み戻すと残る。保存されるのは2か所(Core・CardInventory)だけで、戦闘中の手札・山札・Cooldownは保存されない", () => {
    const w = freshWorld();
    T(w).grantRing("apollo"); T(w).unlock(2, ["apollo"]); T(w).buildDeck("apollo");
    assert.equal(plain(T(w).startDeckBattle()).ok, true);
    const contents = w.ctx.DataManager.makeSaveContents();
    const text = w.ctx.JsonEx.stringify(contents);
    assert.ok(!/drawPile|cooldownPile|discardPile/.test(text), "戦闘中の山札・Cooldownは保存されない");
    const keysSaved = Object.keys(JSON.parse(text).system || {}).filter(k => /^_projectR/.test(k));
    assert.ok(keysSaved.includes("_projectRCardDeckData") && keysSaved.includes("_projectRCardInventory"), JSON.stringify(keysSaved));
    const expectDeck = plain(D(w).getDeck());
    T(w).reset();
    assert.equal(D(w).hasPlayerRing("apollo"), false, "reset後は指輪なし");
    w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(text));
    assert.equal(D(w).hasPlayerRing("apollo"), true, "読み戻すと指輪");
    assert.deepEqual(plain(D(w).getDeck()), expectDeck);
    assert.equal(D(w).isDeckValid(D(w).getDeck()), true);
    for (const id of APOLLO) { assert.equal(w.ctx.ProjectRCardInventory.getOwnedCopies(id), COPIES[id], id); assert.equal(D(w).getPersistentData().cardOwnership[id].level, 2, id + " Lv2"); }
    assert.equal(D(w).isCardBattleActive(), false, "戦闘は復元されない");
});

// ---------- 本物のデッキ・手札・Cooldown・再シャッフル ----------
const stage = w => {
    parkOthers(w, [3, 4, 5, 6]);
    const c = center(w);
    placeEnemy(w, 3, c.x + 6, c.y); placeEnemy(w, 4, c.x + 7, c.y + 2); placeEnemy(w, 5, c.x + 5, c.y - 2); placeEnemy(w, 6, c.x + 9, c.y);
    attachHpBars(w, ENEMIES, 10000000);
    aimDegree(w, 90, 3);
    w.run("Math.random = () => 0.9;"); // 乱数を固定(クリティカルなし)。山札のシャッフルはCore側が使う Math.random を、あとで本物に戻す
};
const state = w => plain(D(w).getBattleState());
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
test("本物のデッキで戦闘: 装備した30枚が山札・手札(5)・捨て札・Cooldownに分かれ、カードは常に30枚(増減なし)。使う → 手札が補充 → Cooldownが明けると捨て札 → 山札が尽きると捨て札を再シャッフルして山札に戻る", () => {
    const w = freshWorld();
    T(w).grantRing("apollo"); T(w).unlock(3, ["apollo"]); T(w).buildDeck("apollo");
    w.run("Math.random = (function(seed) { return function() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; })(20261102);");
    assert.equal(plain(T(w).startDeckBattle()).ok, true);
    let s = state(w);
    const total = x => x.drawPile.length + x.hand.length + x.discardPile.length + x.cooldownPile.length;
    assert.deepEqual([s.hand.length, s.drawPile.length, s.discardPile.length, s.cooldownPile.length], [5, 25, 0, 0]);
    assert.equal(total(s), 30);
    assert.deepEqual(Object.fromEntries(Object.entries([...s.hand, ...s.drawPile].reduce((m, c) => (m[c.cardId] = (m[c.cardId] || 0) + 1, m), {})).sort()), Object.fromEntries(Object.entries(COPIES).sort()), "デッキの組成どおり");
    // 低水準の使用(消費 + 補充)を繰り返して、山札が尽きて再シャッフルされるまで回す
    let reshuffled = false, uses = 0;
    for (let i = 0; i < 80; i++) {
        s = state(w);
        const before = s.drawPile.length;
        const r = plain(D(w).useBattleCard(s.hand[0].instanceId));
        assert.equal(r.ok, true);
        uses++;
        s = state(w);
        assert.equal(s.hand.length, 5, "使うたびに手札は5枚へ補充");
        assert.equal(total(s), 30, "カードは増減しない");
        if (before === 0) reshuffled = true;
        D(w).updateCooldown(10); // Cooldown(3〜8秒)が全部明ける
        s = state(w);
        assert.equal(s.cooldownPile.length, 0, "Cooldownが明けたら捨て札へ");
    }
    assert.ok(reshuffled && uses === 80, "山札が尽きて、捨て札から再シャッフルされた");
    s = state(w);
    assert.equal(total(s), 30);
    w.run("Math.random = Math.random;");
    T(w).reset();
});

test("8枚を本物の手札から使う(requestUseCard): 即時のカード(神託・月桂冠・ヒュアキントス・竪琴)は使った瞬間に消費、矢のカード(黄金・エロス・ギガース・疫病)は命中で確定して1回だけ消費、外れは消費しない。使えない間は手札が詰まらない", () => {
    const w = freshWorld();
    T(w).grantRing("apollo"); T(w).unlock(3, ["apollo"]); T(w).buildDeck("apollo");
    stage(w);
    w.run("Math.random = (function(seed) { var base = function() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; return function() { return base() * 0 + 0.9; }; })(7);");
    assert.equal(plain(T(w).startDeckBattle()).ok, true);
    const bySlot = {};
    const used = new Set();
    // 山札の中のカードは、手札の別のカードを(効果なしの低水準の消費で)回さないと手札に来ない。Cooldownは進めて捨て札へ戻し、山札が尽きたら再シャッフルされる。
    const need = id => {
        for (let i = 0; i < 200 && !state(w).hand.some(c => c.cardId === id); i++) {
            const other = state(w).hand.find(c => c.cardId !== id);
            if (other) D(w).useBattleCard(other.instanceId);
            D(w).updateCooldown(10);
        }
        return state(w).hand.some(c => c.cardId === id);
    };
    const fire = id => { assert.ok(need(id), id + " が手札に来る"); player(w).center(player(w)._realX, player(w)._realY); const r = plain(T(w).useCard(id)); frames(w, 2); return r; };
    for (const id of ["apollo_oracle", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_lyre_rhythm"]) {
        const before = state(w).cooldownPile.filter(e => e.instance.cardId === id).length;
        const r = fire(id);
        assert.equal(r.ok, true, `${id}: ${JSON.stringify(r).slice(0, 160)}`);
        assert.equal(state(w).cooldownPile.filter(e => e.instance.cardId === id).length, before + 1, id + " は使った瞬間に消費");
        used.add(id); bySlot[id] = "instant";
    }
    // 矢のカード: 使った直後は未確定(deferred)、命中で消費。いったんCooldownを進めて手札へ戻す
    D(w).updateCooldown(20); frames(w, 5);
    for (const id of ["apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer", "apollo_plague_rain"]) {
        player(w).center(player(w)._realX, player(w)._realY); aimDegree(w, 90, 3);
        const pileBefore = state(w).cooldownPile.filter(e => e.instance.cardId === id).length;
        const r = fire(id);
        assert.ok(r.ok === true || r.pending === true, `${id}: ${JSON.stringify(r).slice(0, 160)}`);
        for (let i = 0; i < 700; i++) { frames(w, 1); D(w).updateCooldown(1 / 60); const ok = state(w).cooldownPile.some(e => e.instance.cardId === id) || state(w).discardPile.some(c => c.cardId === id); if (ok && i > 40) break; }
        const consumed = state(w).cooldownPile.filter(e => e.instance.cardId === id).length + state(w).discardPile.filter(c => c.cardId === id).length;
        assert.ok(consumed >= 1, id + " は命中したので消費された");
        used.add(id); bySlot[id] = r.pending ? "deferred" : "instantResult";
        D(w).updateCooldown(20); frames(w, 5);
    }
    assert.equal(used.size, 8, "8種すべてを本物の手札から使った: " + JSON.stringify(bySlot));
    // 外れ: 敵のいない向きの黄金の矢は消費しない(手札も詰まらない)
    D(w).updateCooldown(20); frames(w, 5);
    parkOthers(w, []);
    aimDegree(w, 270, 3); player(w).center(player(w)._realX, player(w)._realY);
    assert.ok(need("apollo_gigas_slayer"));
    const handBefore = state(w).hand.map(c => c.cardId), pileN = state(w).cooldownPile.length;
    const miss = fire("apollo_gigas_slayer");
    for (let i = 0; i < 800 && (w.ctx.ProjectRApolloGigasSlayer.getShots().length || w.ctx.ProjectRApolloGigasSlayer.isPending()); i++) frames(w, 1);
    assert.equal(state(w).cooldownPile.length, pileN, "外れは消費しない");
    assert.deepEqual(state(w).hand.map(c => c.cardId), handBefore, "手札は変わらない");
    void miss;
    D(w).endCardBattle(); frames(w, 5);
    T(w).reset();
});

test("Hermesの既存デッキ・旧セーブの互換: Apolloの一時データを作って reset() しても、Hermesの指輪・所持・デッキ・初期セットは変わらない。Hermesだけのデッキは従来どおり有効", () => {
    const w = freshWorld();
    const production = w.ctx.ProjectRHermesProductionDeck;
    production.acquireRing("hermes", { source: "test" });
    const hermesDeck = plain(D(w).getDeck());
    const before = snapshot(w);
    assert.equal(D(w).hasPlayerRing("hermes"), true);
    assert.equal(D(w).isDeckValid(D(w).getDeck()), true, "Hermesの初期30枚は有効");
    T(w).grantRing("apollo"); T(w).unlock(3, ["apollo"]); T(w).buildDeck("apollo");
    assert.equal(D(w).hasPlayerRing("hermes"), true, "Apolloの操作でHermesの指輪は動かない");
    for (const id of ["hermes_issen", "hermes_psychopomp", "hermes_veil"]) assert.equal(D(w).isCardOwned(id), true, id);
    T(w).reset();
    assert.equal(snapshot(w), before, "Hermesだけの状態へ完全に戻る");
    assert.deepEqual(plain(D(w).getDeck()), hermesDeck);
    assert.equal(D(w).isDeckValid(D(w).getDeck()), true);
    assert.equal(w.ctx.ProjectRCardCatalog.godStatus("hermes").ready, true);
    assert.equal(production.starterTotal(), 30);
    // 旧セーブ互換: Apolloのデータが無いセーブを読み込んでも、Apolloの指輪・カードは増えない
    const text = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
    w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(text));
    assert.equal(D(w).hasPlayerRing("apollo"), false);
    for (const id of APOLLO) assert.equal(D(w).isCardOwned(id), false, id);
});

console.log(`\n${passed} Apollo A13 deck integration tests passed`);
