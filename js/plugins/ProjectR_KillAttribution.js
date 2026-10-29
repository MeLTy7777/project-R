/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 撃破の帰属(誰が倒したか)と、敵の死亡通知。敵のHPが0になった瞬間を1回だけ通知する共通の橋渡し。表示・報酬は持たない。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @orderAfter Hendrix_Action_Engine
 * @orderBefore ProjectR_CardModifiers
 *
 * @param EnemyTag
 * @text 敵Eventのnotetag
 * @desc このnotetagを含むEventを「敵」として扱う(ProjectRの攻撃Pluginと同じ <enemy>)。
 * @type string
 * @default <enemy>
 *
 * @help
 * ProjectR_KillAttribution.js
 *
 * 【役割】敵Eventの「HPが0になった」ことを、誰のダメージで倒れたか(帰属)つきで1回だけ購読者へ通知します。
 *   最初の購読者はサイコポンポス(魂)です。この層はHP・ダメージ・ドロップ・敵の死亡ページ・ボスのフェーズを一切変えません。
 *   保存しません。購読者がいなければ、毎フレームの確認も行いません。
 *
 * 【どこで検知するか】導入版Hendrixの敵HPは、公式プラグインコマンド UpdateEventHp が敵HPバーを減らして決まります。
 *   ProjectRの攻撃(剣・G17・薙ぎ払い・一閃・葦笛・Apollo・Ultimateなど)は全部このコマンドを通ります。
 *   このPluginはそのコマンドを包み(ProjectR_CardModifiers の前に読み込まれ、CardModifiersの内側になる。CardModifiersが最も外側の窓口であり続ける)、
 *   「実行前にHP>0 → 実行後にHP<=0」になった敵を、その呼び出しの帰属つきで通知します。
 *   コマンドを通らずにHPが0になった敵(直接のHP書き換えなど)は、毎フレームの確認で見つけ、帰属 "unknown" として通知します(主人公の撃破にはしない)。
 *
 * 【帰属の決め方(優先順)】
 *   1. UpdateEventHp の引数 projectRAttacker (文字列): 呼び出し側が明示した攻撃者。"player" のとき主人公の撃破。出どころは projectRSource。
 *      (ProjectR_CardModifiers は固定ダメージ(一閃・薙ぎ払い)をここへ変換して渡す: 攻撃者 = ctx.attacker(既定 player)、出どころ = ctx.source)
 *   2. 固定ダメージ(projectRFixed。一閃・薙ぎ払いなど主人公のカード): "player"
 *   3. 式が「player weapon」(通常の剣・G17): "player"
 *   4. 呼び出し元のEvent(Hitbox/弾)のnoteに <attacker: player>: "player"。 <attacker: 他>: "event:他"(味方など。主人公の撃破ではない)
 *   5. withAttacker(attacker, source, fn) の範囲内: 指定した攻撃者(環境・スクリプトなど)
 *   6. 呼び出し元が敵Event: "enemy"
 *   7. それ以外: "unknown"(DoTで持ち主が失われた場合、スクリプトによる死亡など)
 *   主人公の撃破 = 帰属が "player" のもの(credited:true)。それ以外は通知されるが credited:false。
 *
 * 【通知の内容】{ serial, key(戦闘中ずっと同じ敵の識別子), deathKey(その敵の n 回目の死亡。生き返った敵は別の値), mapId, eventId, position:{x,y}(死亡時の当たり判定の中心・タイル),
 *   attacker, credited, basis, source, attackId, kind, hpBefore, hpAfter, sweep }
 *   同じ敵(同じEventオブジェクト)の2回目以降の通知は出さない(重複なし)。HPが回復して生き返った敵は、また倒れれば新しい通知になる。
 *   Event IDは固定しない(任意のIDの敵で働く)。ミニオンやアクター連携のEventは対象外。
 *
 * API: ProjectRKillAttribution
 *   subscribe(id, listener) / unsubscribe(id)   listener(death) を呼ぶ。購読者の例外は握りつぶし、ダメージ処理を止めない。
 *   deaths() / lastDeath()   直近の通知(最大60件)    hasDied(event)   identityOf(event)
 *   withAttacker(attacker, source, fn)   fnの間だけ、帰属が決まらない呼び出しに攻撃者を与える
 *   classify(args, interpreter)   帰属の判定だけを行う(診断・テスト)    isEnemy(event)   diagnostics()   reset(reason)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const ENGINE = "Hendrix_Action_Engine";
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_KillAttribution") : {};
    const ENEMY_TAG = String(params.EnemyTag === undefined || params.EnemyTag === "" ? "<enemy>" : params.EnemyTag);
    const LOG_LIMIT = 60;

    const listeners = new Map();
    const log = [];
    const stats = { lethalHits: 0, sweepDeaths: 0, notified: 0, credited: 0, uncredited: 0, duplicates: 0, revived: 0, listenerErrors: 0, classifyErrors: 0 };
    let identities = new WeakMap(); // Eventオブジェクト -> { id, serial }
    let dead = new WeakSet(); // 通知済み(まだ生き返っていない)Event
    let seenAlive = new WeakSet(); // HPが正だったことを観測したEvent(初期HP0の誤検知を避ける)
    let identitySerial = 0;
    let deathSerial = 0;
    const scopes = []; // withAttacker の範囲 { attacker, source }

    const safely = (callback, fallback) => { try { return callback(); } catch (_error) { return fallback; } };
    const currentMap = () => typeof $gameMap !== "undefined" ? $gameMap : null;

    const isEnemy = event => {
        if (!event || event._erased || event._isMinionActor || event.linkedActorId) return false;
        const note = typeof event.event === "function" ? event.event()?.note : null;
        return typeof note === "string" && note.includes(ENEMY_TAG);
    };
    // 同じ敵が生き返って再び倒れたとき、死亡ごとに別の識別子(deathKey = key/n)にする(魂などの重複拒否は deathKey で行う)。
    const identityOf = event => {
        if (!event || typeof event !== "object") return null;
        let identity = identities.get(event);
        if (!identity) {
            identity = { serial: ++identitySerial, deaths: 0 };
            identity.id = `m${currentMap()?.mapId?.() ?? 0}:e${typeof event.eventId === "function" ? event.eventId() : 0}#${identity.serial}`;
            identities.set(event, identity);
        }
        return identity.id;
    };

    // 公式のHPバーを優先して読む(getCurrentEventHp は保存先の変数を読み、バーの次の更新で書かれるため、ダメージ直後は古い)。
    const hpOf = event => {
        const map = currentMap();
        if (!map || !event) return null;
        const bars = typeof SceneManager !== "undefined" ? SceneManager._scene?._spriteset?._eventHpBars : null;
        const bar = Array.isArray(bars) ? bars.find(b => b && b._event === event) : null;
        if (bar && Number.isFinite(bar.currentHp)) return Math.max(0, bar.currentHp);
        const hp = typeof map.getCurrentEventHp === "function" ? map.getCurrentEventHp(event.eventId()) : null;
        return Number.isFinite(hp) ? hp : null;
    };

    const positionOf = event => {
        const point = safely(() => event.centerPositionPoint(), null);
        if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) return { x: point.x, y: point.y };
        return { x: Number(event._realX) + 0.5 || 0, y: Number(event._realY) + 0.5 || 0 };
    };

    const sourceEventOf = interpreter => {
        const id = Number(interpreter?._eventId);
        const map = currentMap();
        return Number.isInteger(id) && id > 0 && map ? map.event(id) : null;
    };
    const noteOf = event => safely(() => event?.event?.()?.note, "") || "";

    // 帰属の判定(優先順は help に記載)。{ attacker, basis, source }
    const classify = (args, interpreter) => {
        try {
            const explicit = args && args.projectRAttacker !== undefined && args.projectRAttacker !== null && String(args.projectRAttacker) !== "" ? String(args.projectRAttacker) : null;
            const fixed = args && typeof args.projectRFixed === "object" && args.projectRFixed ? args.projectRFixed : null;
            const value = String(args && args.value !== undefined ? args.value : "");
            const explicitSource = args && args.projectRSource !== undefined && args.projectRSource !== null && String(args.projectRSource) !== "" ? String(args.projectRSource) : null;
            if (explicit) return { attacker: explicit, basis: "explicit", source: explicitSource !== null ? explicitSource : fixed ? String(fixed.source ?? "") : null };
            if (fixed) return { attacker: "player", basis: "fixed", source: String(fixed.source ?? "fixed") };
            if (/player\s+weapon/i.test(value)) return { attacker: "player", basis: "weapon", source: "weapon" };
            const sourceEvent = sourceEventOf(interpreter);
            if (sourceEvent) {
                const match = /<attacker:\s*([^>]*?)\s*>/i.exec(noteOf(sourceEvent));
                if (match) {
                    const who = match[1].trim();
                    return who.toLowerCase() === "player" ? { attacker: "player", basis: "hitboxNote", source: "event:" + sourceEvent.eventId() }
                        : { attacker: "event:" + who, basis: "hitboxNote", source: "event:" + sourceEvent.eventId() };
                }
            }
            if (scopes.length) { const scope = scopes[scopes.length - 1]; return { attacker: scope.attacker, basis: "scope", source: scope.source }; }
            if (sourceEvent && isEnemy(sourceEvent)) return { attacker: "enemy", basis: "sourceEnemy", source: "event:" + sourceEvent.eventId() };
        } catch (_error) {
            stats.classifyErrors++;
        }
        return { attacker: "unknown", basis: "none", source: null };
    };

    const emit = death => {
        log.push(death);
        if (log.length > LOG_LIMIT) log.shift();
        for (const [id, listener] of [...listeners]) {
            try { listener(death); } catch (_error) { stats.listenerErrors++; void id; }
        }
    };
    const notify = (event, info) => {
        if (dead.has(event)) { stats.duplicates++; return null; }
        dead.add(event);
        const credited = info.attacker === "player";
        const key = identityOf(event), identity = identities.get(event);
        identity.deaths++;
        const death = Object.freeze({ serial: ++deathSerial, key, deathKey: `${key}/${identity.deaths}`, mapId: currentMap()?.mapId?.() ?? 0, eventId: event.eventId(), position: positionOf(event),
            attacker: info.attacker, credited, basis: info.basis, source: info.source ?? null, attackId: info.attackId ?? null, kind: info.kind ?? null,
            hpBefore: info.hpBefore ?? null, hpAfter: info.hpAfter ?? null, sweep: info.sweep === true });
        stats.notified++;
        if (credited) stats.credited++; else stats.uncredited++;
        emit(death);
        return death;
    };

    const targetEventId = (args, interpreter) => {
        const raw = args?.eventId;
        if (raw === "this") { const id = Number(interpreter?._eventId); return Number.isInteger(id) && id > 0 ? id : null; }
        if (raw === "player" || raw === "all" || raw === undefined || raw === null || raw === "") return null;
        const id = Number(raw);
        return Number.isInteger(id) && id > 0 ? id : null;
    };

    // ---------- UpdateEventHp の包み(ダメージの結果は一切変えない) ----------
    const wrap = () => {
        const key = `${ENGINE}:UpdateEventHp`;
        const original = typeof PluginManager !== "undefined" ? PluginManager._commands?.[key] : null;
        if (typeof original !== "function" || original.__projectRKillAttribution) return false;
        const wrapped = function(args) {
            let event = null, before = null;
            try {
                const id = targetEventId(args, this);
                const candidate = id !== null && currentMap() ? currentMap().event(id) : null;
                if (candidate && isEnemy(candidate)) {
                    event = candidate;
                    before = hpOf(event);
                    // HPが回復して生き返った敵は、また倒れれば新しい通知にする。
                    if (before !== null && before > 0) { seenAlive.add(event); if (dead.delete(event)) stats.revived++; }
                }
            } catch (_error) { event = null; }
            try {
                return original.apply(this, arguments);
            } finally {
                if (event) {
                    try {
                        const after = hpOf(event);
                        if (before !== null && before > 0 && after !== null && after <= 0) {
                            stats.lethalHits++;
                            const info = classify(args, this);
                            notify(event, Object.assign(info, { attackId: args && args.projectRAttackId !== undefined ? String(args.projectRAttackId) : null,
                                kind: args && args.projectRFixed ? "fixed" : /player\s+weapon/i.test(String(args && args.value)) ? "weapon" : "expression", hpBefore: before, hpAfter: after }));
                        }
                    } catch (_error) { stats.classifyErrors++; }
                }
            }
        };
        wrapped.__projectRKillAttribution = true;
        PluginManager._commands[key] = wrapped;
        return true;
    };
    let installed = wrap();

    // ---------- 毎フレームの確認(コマンドを通らずに0になった敵・生き返った敵) ----------
    const sweep = () => {
        const map = currentMap();
        if (!map || typeof map.events !== "function") return;
        for (const event of map.events()) {
            if (!isEnemy(event)) continue;
            const hp = hpOf(event);
            if (hp === null) continue;
            if (hp > 0) {
                seenAlive.add(event);
                if (dead.delete(event)) stats.revived++;
            } else if (seenAlive.has(event) && !dead.has(event)) {
                stats.sweepDeaths++;
                notify(event, { attacker: "unknown", basis: "sweep", source: null, sweep: true, hpBefore: null, hpAfter: hp });
            }
        }
    };

    if (typeof Game_Map !== "undefined") {
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            _update.apply(this, arguments);
            if (!installed) installed = wrap();
            if (sceneActive !== false && listeners.size) safely(sweep, null);
        };
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { reset("mapSetup"); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined") {
        for (const method of ["extractSaveContents", "setupNewGame"]) {
            const original = DataManager[method];
            if (typeof original !== "function") continue;
            DataManager[method] = function() { reset(method); return original.apply(this, arguments); };
        }
    }
    const deck = root.ProjectRCardDeck;
    if (deck && typeof deck.endBattle === "function") {
        const _endBattle = deck.endBattle;
        deck.endBattle = function() { reset("battleEnd"); return _endBattle.apply(this, arguments); };
    }

    // 戦闘ごとに通知済みの印・識別子を作り直す(別の戦闘に持ち越さない)。購読は残す。
    function reset(reason) {
        identities = new WeakMap();
        dead = new WeakSet();
        seenAlive = new WeakSet();
        scopes.length = 0;
        log.length = 0;
        for (const key of Object.keys(stats)) stats[key] = 0; // 戦闘ごとの件数
        void reason;
    }

    const withAttacker = (attacker, source, fn) => {
        if (typeof fn !== "function") return undefined;
        scopes.push({ attacker: String(attacker ?? "unknown"), source: source === undefined ? null : String(source) });
        try { return fn(); } finally { scopes.pop(); }
    };

    root.ProjectRKillAttribution = Object.freeze({
        ENEMY_TAG,
        subscribe: (id, listener) => { if (!String(id ?? "") || typeof listener !== "function") return false; listeners.set(String(id), listener); return true; },
        unsubscribe: id => listeners.delete(String(id)),
        deaths: () => log.map(entry => ({ ...entry })),
        lastDeath: () => log.length ? { ...log[log.length - 1] } : null,
        hasDied: event => !!event && dead.has(event),
        identityOf, isEnemy, classify, withAttacker, reset,
        diagnostics: () => ({ ...stats, installed, listeners: listeners.size, logged: log.length })
    });
})();
