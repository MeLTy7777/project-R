"use strict";
// Phase H2B-3B: サイコポンポスと既存の戦闘の統合(実エンジン)。実際の剣・一閃・ストレングス・絶・ヴェイル・通常の武器ダメージとの併用、
// 撃破の帰属が既存のダメージ/ドロップ/ゲージを変えないこと、Hermesの演出が追加のダメージではないこと。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, PSYCHO, STRENGTH, ISSEN, SWEEP, VEIL, ZETSU, OTHER, deckApi, modifiers, placePolar, placeEnemy, parkOthers, aimDegree, lost, resetHp, runFrames, equip, SWORD_ID,
    ticks, handIds, player, center, countCommands, HP } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const api = w => w.ctx.ProjectRHermesPsychopomp;
const souls = w => w.ctx.ProjectRSoulCollection;
const attr = w => w.ctx.ProjectRKillAttribution;
const leader = w => w.ctx.$gameParty.leader();
const barOf = (w, id) => w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id));
const setHp = (w, id, hp) => { const b = barOf(w, id); b.currentHp = b.targetHp = hp; b.refresh(); };
const enemyBattler = (w, id) => w.run(`SgetBattlerForH($gameMap.event(${id}))`);
// 導入版Hendrixの武器ダメージ式(攻撃: a.atk * 4 - b.def * 2, 分散20%)を乱数0.999(分散が最大側)で独立に計算する。
const expectedDamage = (w, id, multiplier, bypass) => {
    const atk = leader(w).atk * multiplier, def = bypass ? 0 : enemyBattler(w, id).def;
    const raw = atk * 4 - def * 2;
    return Math.round(raw + Math.floor(Math.abs(raw) * 20 / 100));
};
const hit = (w, id, attackId = null, extra = {}) => {
    const interpreter = new w.ctx.Game_Interpreter(); interpreter._eventId = 0;
    const args = { eventId: String(id), value: "-player weapon", exceedMaxHealth: "false", ...extra };
    if (attackId !== null) args.projectRAttackId = attackId;
    const before = lost(w, id);
    w.run("globalThis.__random = Math.random; Math.random = () => 0.999;");
    try { w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", args); } finally { w.run("Math.random = globalThis.__random;"); }
    return lost(w, id) - before;
};
const useById = (w, id) => {
    player(w).center(player(w)._realX, player(w)._realY);
    const index = handIds(w).indexOf(id);
    assert.ok(index >= 0, `手札に ${id}`);
    return plain(deckApi(w).requestUseCard(index));
};
const tick = (w, n = 1) => ticks(w, n);
// 手札に サイコポンポス と別のカードを混ぜた世界。
const mixedWorld = (other, level = 3, { psychoLevel = 3, ...rest } = {}) => {
    const w = hermesWorld({ card: PSYCHO, level: psychoLevel, order: [PSYCHO, PSYCHO, other, other, other, ...OTHER], ...rest });
    if (other !== PSYCHO) assert.equal(deckApi(w).setCardLevel(other, level).ok, true);
    return w;
};
// 魂を拾ってLv3の攻撃力上昇をn個ためる(魂を主人公の近くへ直接置く)。
const stackBuff = (w, n) => {
    const c = center(w);
    for (let i = 0; i < n; i++) { souls(w).spawn({ position: { x: c.x + 2, y: c.y }, enemyKey: "stack" + i + ":" + Math.random(), level: 3 }); tick(w, 1); }
    assert.equal(api(w).getBuff().stacks, n);
};

test("実際の剣: 効果中に剣で敵を倒すと、倒れた場所に魂が1つ。通常の剣の命中・ダメージは魂の仕組みで変わらない(1振り=1回のUpdateEventHp)", () => {
    const w = mixedWorld(PSYCHO, 3, { psychoLevel: 2 });
    assert.equal(useById(w, PSYCHO).ok, true);
    parkOthers(w, [4]);
    equip(w, SWORD_ID);
    placePolar(w, 4, 1.0, 0);
    setHp(w, 4, 1);
    aimDegree(w, 0);
    leader(w).setHp(30);
    w.calls.length = 0;
    assert.equal(w.ctx.ProjectRSwordSystem.swing("test").ok, true);
    runFrames(w, 8);
    assert.equal(barOf(w, 4).currentHp, 0);
    assert.equal(countCommands(w, "Hendrix_Action_Engine", "UpdateEventHp").length, 1, "ダメージの適用は1回(魂・演出は追加のダメージではない)");
    const death = attr(w).lastDeath();
    assert.deepEqual([death.attacker, death.credited, death.basis, death.eventId], ["player", true, "weapon", 4]);
    assert.ok(/^sword:/.test(death.attackId));
    assert.equal(souls(w).diagnostics().spawned, 1);
    const spawnedAt = plain(souls(w).history()).find(h => h.type === "spawn");
    assert.ok(spawnedAt);
    // 近くなので次のtickで回収(魂が出たのと同じ frames の中) → Lv2の100回復
    assert.equal(leader(w).hp, 130);
    assert.deepEqual(plain(api(w).getHealLog()).map(e => [e.level, e.applied]), [[2, 100]]);
});

test("カード効果の撃破: 一閃(固定ダメージ)で倒した敵は主人公の撃破。薙ぎ払いも同じ。魂の位置は敵の死亡位置", () => {
    for (const other of [ISSEN, SWEEP]) {
        const w = mixedWorld(other, 1);
        assert.equal(useById(w, PSYCHO).ok, true);
        parkOthers(w, [4]);
        placePolar(w, 4, 2.0, 0);
        setHp(w, 4, 1);
        aimDegree(w, 0);
        const result = useById(w, other);
        assert.equal(result.ok, true, other);
        runFrames(w, 12);
        assert.equal(barOf(w, 4).currentHp, 0, other);
        const death = attr(w).lastDeath();
        assert.deepEqual([death.attacker, death.credited, death.basis], ["player", true, "explicit"], other); // 固定ダメージは CardModifiers が攻撃者を明示して渡す
        assert.ok(String(death.source).length > 0, other);
        assert.equal(souls(w).diagnostics().spawned, 1, other);
        const killed = plain(api(w).getKillLog())[0];
        assert.equal(killed.attacker, "player");
        const cp = w.ctx.$gameMap.event(4).centerPositionPoint();
        assert.deepEqual([death.position.x, death.position.y], [cp.x, cp.y], `${other}: 死亡位置`);
    }
});

test("通常の武器攻撃は攻撃力上昇を消費しない: 何度殴っても同じ倍率で効き、3秒で消える。基礎ATK・装備は変わらない", () => {
    const w = mixedWorld(PSYCHO, 3);
    assert.equal(useById(w, PSYCHO).ok, true);
    parkOthers(w, [4]); placePolar(w, 4, 1.3, 90);
    equip(w, SWORD_ID);
    const atk = leader(w).atk, equipment = plain(leader(w).equips().map(e => e && e.id));
    assert.equal(hit(w, 4, "sword:1"), expectedDamage(w, 4, 1, false), "上昇なし");
    stackBuff(w, 2);
    resetHp(w, [4]);
    const first = hit(w, 4, "sword:2"), second = hit(w, 4, "sword:3"), third = hit(w, 4, "sword:4");
    assert.equal(first, expectedDamage(w, 4, 1.06, false), "攻撃力x1.06(+3%を2つ)で計算した武器ダメージ");
    assert.equal(second, first);
    assert.equal(third, first, "命中しても消費されない");
    assert.equal(api(w).getBuff().stacks, 2);
    assert.equal(leader(w).atk, atk, "基礎ATKは変わらない(差し替えは計算の間だけ)");
    assert.deepEqual(plain(leader(w).equips().map(e => e && e.id)), equipment);
    tick(w, 181);
    assert.equal(api(w).getBuff(), null);
    resetHp(w, [4]);
    assert.equal(hit(w, 4, "sword:5"), expectedDamage(w, 4, 1, false), "3秒後は元に戻る");
    // 「同じ攻撃動作(同じattackId)が複数の敵に当たっても、全員に同じ強化」
    stackBuff(w, 1);
    parkOthers(w, [3, 4]); placePolar(w, 3, 1.3, 270); resetHp(w, [3, 4]);
    assert.equal(hit(w, 3, "sword:9"), expectedDamage(w, 3, 1.03, false));
    assert.equal(hit(w, 4, "sword:9"), expectedDamage(w, 4, 1.03, false));
});

test("ストレングスとの併用: 2つの強化は掛け合わさり、互いを上書き・消費しない。ストレングスは次の攻撃で全部消費、サイコポンポスは時間まで残る", () => {
    const w = mixedWorld(STRENGTH, 1);
    assert.equal(useById(w, PSYCHO).ok, true);
    parkOthers(w, [4]); placePolar(w, 4, 1.3, 90);
    equip(w, SWORD_ID);
    stackBuff(w, 2); // x1.06
    assert.equal(useById(w, STRENGTH).ok, true);
    assert.equal(useById(w, STRENGTH).ok, true); // Lv1: +10% x 2 = x1.2
    assert.equal(w.ctx.ProjectRHermesStrength.getPending().stacks, 2);
    w.calls.length = 0;
    const first = hit(w, 4, "sword:1");
    assert.equal(first, expectedDamage(w, 4, 1.2 * 1.06, false), "(ストレングスx1.2) x (サイコポンポスx1.06)");
    assert.equal(countCommands(w, "Hendrix_Action_Engine", "UpdateEventHp").length, 1, "ダメージの適用は1回");
    assert.equal(w.ctx.ProjectRHermesStrength.getPending(), null, "ストレングスは消費");
    assert.equal(api(w).getBuff().stacks, 2, "サイコポンポスは消費しない");
    resetHp(w, [4]);
    assert.equal(hit(w, 4, "sword:2"), expectedDamage(w, 4, 1.06, false), "次の攻撃はサイコポンポスだけ");
    // ストレングスのLv3(防御無視)でも同時に働く
    assert.equal(deckApi(w).setCardLevel(STRENGTH, 3).ok, true);
    resetHp(w, [4]);
    assert.equal(useById(w, STRENGTH).ok, true);
    assert.equal(hit(w, 4, "sword:3"), expectedDamage(w, 4, 1.15 * 1.06, true), "防御無視 + 両方の攻撃力");
});

test("絶との併用: サイコポンポスで上げた武器ダメージに絶の倍率がかかる。絶は1回だけ消費・サイコポンポスは残る。ダメージの二重適用なし", () => {
    const w = mixedWorld(PSYCHO, 3);
    assert.equal(useById(w, PSYCHO).ok, true);
    parkOthers(w, [4]); placePolar(w, 4, 1.3, 90);
    equip(w, SWORD_ID);
    stackBuff(w, 3);
    modifiers(w).armWeaponHitBonus({ id: ZETSU, multiplier: 2, seconds: 5, source: ZETSU });
    w.calls.length = 0;
    const dealt = hit(w, 4, "sword:1");
    assert.equal(dealt, Math.round(expectedDamage(w, 4, 1.09, false) * 2), "(攻撃力x1.09の武器ダメージ) x 絶2.0");
    assert.equal(countCommands(w, "Hendrix_Action_Engine", "UpdateEventHp").length, 1);
    assert.equal(modifiers(w).getWeaponHitBonus(), null, "絶は消費");
    assert.equal(api(w).getBuff().stacks, 3, "サイコポンポスは消費しない");
    assert.equal(plain(modifiers(w).getWeaponHitLog()).filter(e => e.type === "consumed").length, 1);
    resetHp(w, [4]);
    assert.equal(hit(w, 4, "sword:2"), expectedDamage(w, 4, 1.09, false), "絶が無ければサイコポンポスだけ");
});

test("ヴェイルとの併用: 同じ命中で攻撃力上昇(サイコポンポス)とクリティカル率(ヴェイルLv3)が別々に働き、互いを妨げない。確定クリティカル以外は乱数で決まる", () => {
    const w = mixedWorld(VEIL, 3);
    assert.equal(useById(w, PSYCHO).ok, true);
    const c = center(w), m = w.ctx.$gameMap;
    w.mouse((c.x - m.displayX()) * m.tileWidth(), (c.y - m.displayY()) * m.tileHeight());
    assert.equal(useById(w, VEIL).ok, true);
    runFrames(w, 2);
    assert.equal(w.ctx.ProjectRHermesVeil.criticalBonusFor("player"), 0.5);
    parkOthers(w, [4]); placePolar(w, 4, 1.3, 90);
    equip(w, SWORD_ID);
    stackBuff(w, 2);
    resetHp(w, [4]);
    // 乱数0.999: クリティカルなし。攻撃力x1.06の通常ダメージ(ヴェイルは攻撃力に触れない)
    assert.equal(hit(w, 4, "sword:1"), expectedDamage(w, 4, 1.06, false));
    // 乱数0.3: 実効クリティカル率 0.1 + 0.5 = 0.6 → クリティカル。攻撃力x1.06の上に、公式のクリティカル倍率
    resetHp(w, [4]);
    const interpreter = new w.ctx.Game_Interpreter(); interpreter._eventId = 0;
    w.run("globalThis.__random = Math.random; Math.random = () => 0.3;");
    const before = lost(w, 4);
    try { w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "4", value: "-player weapon", exceedMaxHealth: "false", projectRAttackId: "sword:2" }); }
    finally { w.run("Math.random = globalThis.__random;"); }
    const crit = lost(w, 4) - before;
    assert.ok(crit > expectedDamage(w, 4, 1.06, false), `クリティカル ${crit}`);
    assert.equal(api(w).getBuff().stacks, 2);
});

test("撃破の帰属は既存の挙動を変えない: ダメージの値・敵以外のEventへのUpdateEventHp・倒れた敵への追撃・敵でないEvent(ミニオン/アクター連携)の扱い", () => {
    const w = mixedWorld(PSYCHO, 3);
    parkOthers(w, [4, 5]); placePolar(w, 4, 1.3, 90);
    equip(w, SWORD_ID);
    // 窓が無くても通知は記録される(購読者がいないので毎フレームの確認はしない)
    assert.equal(attr(w).diagnostics().listeners, 0);
    const damage = hit(w, 4, "sword:1");
    assert.equal(damage, expectedDamage(w, 4, 1, false), "帰属の層はダメージを変えない");
    setHp(w, 4, 1); hit(w, 4, "sword:2");
    assert.equal(attr(w).diagnostics().notified, 1);
    assert.equal(souls(w).diagnostics().spawned, 0, "窓が無いので魂は出ない");
    // 敵でないEvent(主人公のミニオン/アクター連携を模す): 通知しない
    const ally = w.ctx.$gameMap.event(5);
    ally._isMinionActor = true;
    placePolar(w, 5, 2, 0);
    setHp(w, 5, 1); hit(w, 5, "sword:3");
    assert.equal(attr(w).deaths().filter(d => d.eventId === 5).length, 0, "ミニオンは敵ではない");
    ally._isMinionActor = false;
    // 敵ではないEvent(タグ無し)
    const hub = w.ctx.$gameMap.event(7);
    assert.equal(attr(w).isEnemy(hub), false);
    // UpdateEventHp が例外を投げても、帰属の層は例外を握りつぶさず通知もしない
    const key = "Hendrix_Action_Engine:UpdateEventHp";
    const wrapped = w.ctx.PluginManager._commands[key];
    assert.equal(wrapped.__projectRCardModifiers, true, "最も外側のコマンドは従来どおりCardModifiers(窓口は1回だけ包まれている)");
    assert.equal(wrapped.__projectRKillAttribution, undefined, "帰属の層はその内側");
    assert.equal(attr(w).diagnostics().installed, true);
});

test("Hermesの演出は追加の攻撃ではない: 主人公の撃破ごとに指をはじく・Hermesが現れるが、ダメージ・HPコマンドは増えない。主人公以外の撃破では出ない。Hermesの表示Eventは攻撃判定を持たない", () => {
    const w = mixedWorld(PSYCHO, 1);
    assert.equal(useById(w, PSYCHO).ok, true);
    parkOthers(w, [4, 5]); placePolar(w, 4, 3, 90); placePolar(w, 5, 3, 270);
    w.calls.length = 0;
    setHp(w, 5, 1);
    w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "5", value: "-99999", exceedMaxHealth: "false", projectRAttacker: "environment" });
    runFrames(w, 3);
    assert.equal(plain(w.ctx.ProjectRCharacterPresentation.history()).filter(e => e.ok && e.name === "FingerSnap").length, 0, "主人公以外の撃破では指をはじかない");
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length, 0);
    w.calls.length = 0;
    setHp(w, 4, 1);
    hit(w, 4, "sword:1");
    runFrames(w, 4);
    const snaps = plain(w.ctx.ProjectRCharacterPresentation.history()).filter(e => e.ok && e.name === "FingerSnap");
    assert.equal(snaps.length, 1, "主人公の撃破1回につき指をはじく動作1回");
    const followers = plain(w.ctx.ProjectRGodSummonVisual.getFollowers());
    assert.equal(followers.length, 1);
    assert.equal(countCommands(w, "Hendrix_Action_Engine", "UpdateEventHp").length, 1, "Hermesの攻撃の見た目は追加のダメージではない");
    assert.equal(countCommands(w, "Hendrix_Action_Engine", "SwingWeapon").length >= 1, true, "公式Swing Weaponで見た目だけ攻撃する");
    const hermes = w.ctx.$gameMap.event(followers[0].eventId), note = String(hermes.event().note);
    assert.ok(!/<dmg|<attacker|<enemy|<hitbox|<projectR(?!God)/i.test(note), `Hermesの表示Eventに攻撃判定・敵タグが無い: ${note}`);
    assert.equal(barOf(w, 4).currentHp, 0);
    assert.equal(HP - barOf(w, 3).currentHp, 0, "他の敵のHPは変わらない");
    runFrames(w, 60);
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length, 0, "Hermesは黒いノイズとともに消える");
});

test("Hendrixの敵・主人公のダメージ処理を変えない: findTargets・checkCollide・HPバー・敵のHP書き込みは帰属の層が一切触れない(読むだけ)", () => {
    const fs = require("node:fs"), path = require("node:path");
    const read = file => fs.readFileSync(path.join(__dirname, "..", "js", "plugins", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const file of ["ProjectR_KillAttribution.js", "ProjectR_SoulCollection.js", "ProjectR_HermesPsychopomp.js"]) {
        const source = read(file);
        assert.ok(!/\.currentHp\s*=[^=]|\.targetHp\s*=|updateEventHp\(|callCommand\([^)]*"UpdateEventHp"|prototype\.findTargets\s*=|checkCollide\s*=|\.setHp\(/.test(source), `${file}: 敵のHP・命中・標的を書き換えない`);
    }
    // 魂とHPバーの関係: 魂の層は敵のHPを読まない・書かない
    assert.ok(!/getCurrentEventHp|_eventHpBars/.test(read("ProjectR_SoulCollection.js")));
    // ProjectRの保護対象(Hendrix・DotMove・CardDeckCore)は変更していない
    const cp = require("node:child_process");
    const diff = cp.spawnSync("git", ["diff", "--stat", "--", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/Hendrix_Animation_Solution.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_CardDeckCore.js", "js/rmmz_core.js", "js/rmmz_objects.js", "data/Weapons.json", "data/Actors.json", "data/Skills.json"], { cwd: path.join(__dirname, "..") });
    assert.equal(String(diff.stdout).trim(), "", "Hendrix/DotMove/CardDeckCore/MZコア/ダメージ式のデータは変更なし");
});

test("既存カードとの共存: 設計の他の6枚とApolloの旧カードは登録・対象タイプ・ハンドラが変わらない。サイコポンポスを使っても手札5枚・Q/E/X/C/Vの入力は変わらない", () => {
    const w = mixedWorld(PSYCHO, 1);
    const d = deckApi(w);
    for (const [id, type] of [[ZETSU, "ground"], [SWEEP, "direction"], [ISSEN, "direction"], [STRENGTH, "instant"], [VEIL, "cursor"], ["hermes_reed_flute", "instant"], [PSYCHO, "instant"]]) {
        assert.equal(d.definitions.card(id).targetType, type, id);
    }
    assert.equal(plain(d.getBattleState().hand).length, 5);
    assert.equal(useById(w, PSYCHO).ok, true);
    assert.equal(plain(d.getBattleState().hand).length, 5, "補充で手札は5枚のまま");
    // 他のinstantカード(ストレングス・葦笛)の発動は影響を受けない
    const strength = mixedWorld(STRENGTH, 1);
    assert.equal(useById(strength, STRENGTH).ok, true);
    assert.equal(strength.ctx.ProjectRHermesStrength.getPending().stacks, 1);
    assert.equal(api(strength).getWindows().length, 0, "ストレングスの発動でサイコポンポスの窓は始まらない");
    // 実際のキー入力(Q = 手札0)でも1回だけ発動
    const key = hermesWorld({ card: PSYCHO, level: 1 });
    player(key).center(player(key)._realX, player(key)._realY);
    key.tap(...fx.KEYS.Q);
    runFrames(key, 3);
    assert.equal(api(key).getWindows().length, 1, "Qを1回押して窓は1つ");
    assert.equal(plain(deckApi(key).getBattleState().cooldownPile).length, 1, "消費は1回");
});

test("魂が出ても通常のドロップ・敵の死亡処理と干渉しない: 魂はアイテムでも敵Eventでもなく、インベントリ・所持金を増減しない。見た目用の画像なし・通り抜け可能の錨Eventだけが一時的に増え、片付く", () => {
    const w = mixedWorld(PSYCHO, 3);
    assert.equal(useById(w, PSYCHO).ok, true);
    parkOthers(w, [4]); placePolar(w, 4, 3, 90);
    const events = w.ctx.$gameMap.events().length;
    const gold = w.ctx.$gameParty.gold(), items = JSON.stringify(plain(w.ctx.$gameParty._items)), weapons = JSON.stringify(plain(w.ctx.$gameParty._weapons));
    setHp(w, 4, 1); hit(w, 4, "sword:1");
    assert.equal(souls(w).count(), 1);
    const followers = plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length; // Hermesの表示Event(演出)
    const anchors = plain(w.ctx.ProjectRGodSummonVisual.getAnchors());
    assert.equal(anchors.length, 1, "魂のVFXの錨は魂1つにつき1つ");
    assert.equal(w.ctx.$gameMap.events().length, events + followers + anchors.length, "増えるのはHermesの表示と錨だけ");
    for (const a of anchors) {
        const anchorEvent = w.ctx.$gameMap.event(a.eventId);
        assert.equal(anchorEvent._characterName, "", "錨は画像なし");
        assert.equal(anchorEvent._through, true, "錨は通り抜けられる(移動の邪魔にならない)");
        assert.ok(!/<enemy>|<dmg|<attacker|<hitbox/i.test(String(anchorEvent.event().note)), "錨は敵でも攻撃判定でもない");
    }
    assert.equal(plain(w.ctx.ProjectRSoulCollection.diagnostics()).vfxActive, 1);
    runFrames(w, 60);
    assert.equal(w.ctx.$gameMap.events().length, events, "演出のEventも片付く");
    assert.equal(w.ctx.$gameParty.gold(), gold);
    assert.equal(JSON.stringify(plain(w.ctx.$gameParty._items)), items);
    assert.equal(JSON.stringify(plain(w.ctx.$gameParty._weapons)), weapons);
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getAnchors()).length, 0, "回収の光が終わったあと、錨も片付く");
});

test("DEV敵Event(Event ID違い・距離違い・壁)のフィクスチャ: layout で敵が距離違いに並び、壁(Region)の向こうの魂は拾えず、近い魂だけ拾える", () => {
    const w = mixedWorld(PSYCHO, 1, { bars: [2, 3, 4, 5, 6] });
    assert.equal(useById(w, PSYCHO).ok, true);
    const c = center(w);
    const placed = plain(w.ctx.ProjectRSoulTest.layout(c.x, c.y));
    assert.deepEqual(placed, { 2: true, 3: true, 4: true, 5: true, 6: true });
    // 北(id5)との間に壁
    const tx = Math.floor(c.x), ty = Math.floor(c.y);
    for (const x of [tx - 1, tx, tx + 1]) w.ctx.ProjectRSoulTest.wall(x, ty - 2, 255);
    leader(w).setHp(10);
    for (const id of [2, 3, 4, 5, 6]) w.ctx.ProjectRSoulTest.hit(id);
    tick(w, 2);
    const log = plain(api(w).getHealLog());
    // 3(東3) / 6(南4) / 2(西4)は範囲内で壁なし → 回収。4(東8)は範囲外、5(北4)は壁の向こう
    assert.deepEqual(log.map(e => e.enemyKey.split("#")[0]).sort(), ["m4:e2", "m4:e3", "m4:e6"]);
    assert.equal(souls(w).count(), 2, "範囲外と壁の向こうの魂は残る");
    const remain = plain(souls(w).list()).map(s => s.enemyKey.split("#")[0]).sort();
    assert.deepEqual(remain, ["m4:e4", "m4:e5"]);
});

console.log(`${passed} Hermes Psychopomp integration tests passed`);
