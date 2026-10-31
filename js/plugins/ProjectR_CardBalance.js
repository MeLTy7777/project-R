/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR カードバランス設定(data/ProjectR_CardBalance.json)の読み込み・検証・Lv別の解決・開発用の一時上書き。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @orderAfter ProjectR_CardCatalog
 *
 * @param DevConfigPath
 * @text 開発用の上書きの保存先(プロジェクトからの相対パス)
 * @desc Playtest限定。製品の既定値(data/ProjectR_CardBalance.json)とは別のファイル。配布版では読み書きしません。
 * @type string
 * @default dev_tuning/ProjectR_CardBalance.dev.json
 *
 * @help
 * ProjectR_CardBalance.js
 *
 * 【役割】カードの数値(ダメージ・回復・持続・半径・射程・クリティカル・攻撃力/速度の係数・クールダウン・属性など)を
 *   data/ProjectR_CardBalance.json 1か所に集め、各カードのプラグインはここから読みます(数値をコードに書き写しません)。
 *   カードIDはランタイムID(ワークブックの設計IDではない)。Lvごとの効果は累積し、同じ効果の新しい数値は前のLvの値を
 *   置き換えます(ProjectRCardCatalog.resolveLevels と同じ規則。加算・乗算はしません)。
 *
 * 【読み込み】$dataProjectRCardBalance(テスト用に注入可)→ NW.jsのfs同期読み込み → ブラウザのXHR(非同期)の順。
 *   読み込めない/検証に失敗したときは isReady()=false で、各カードは「balanceUnavailable」で発動に失敗します(消費なし)。
 *
 * 【製品の既定値と開発用の上書きは別】JSONの既定値は Playtest 以外では絶対に変わりません。上書き(overrides)は
 *   Playtestのときだけ設定でき、メモリ上に持ち、dev_tuning/ に保存/読み込みできます(セーブデータには入りません)。
 *   設計の正本(ワークブック)とdata/のJSONは、このプラグインが書き換えることはありません。
 *
 * 【発動中の一貫性】各カードは発動の瞬間に effects(cardId, level) / constant() の結果を取り、その発動の間は同じ値を使います。
 *   上書きは次の発動から効きます(発動中の効果は変わりません)。クールダウンは次にカードが捨て札に入るときから反映されます。
 *
 * API: ProjectRCardBalance
 *   isReady() / status()                 読み込み状態({ready, source, error, schema, cards})
 *   cardIds() / hasCard(id) / fields()   カード一覧・数値の定義(単位・範囲・整数/小数)
 *   levels(cardId)                       Lv1〜3の行 [{level, effects}](既定+上書き。凍結)
 *   effects(cardId, level)               Lv累積で解決した効果(凍結。発動時にスナップショットとして使う)
 *   constant(cardId, key)                Lvに依らない数値(半径・角度・射程・属性など)
 *   cooldownSeconds(cardId)              クールダウン(秒)
 *   describe(cardId)                     エディタ用: 値ごとの 元の値/現在の値/変更済み/継承/範囲
 *   validate(cardId, scope, key, value)  scope = "cooldown" | "constant" | 1 | 2 | 3
 *   (Playtest限定) setOverride / resetValue / resetCard / resetAll / overrides() / saveDev() / loadDev() / revision()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_CardBalance";
    const DATA_FILE = "data/ProjectR_CardBalance.json";
    const MAX_LEVEL = 3;
    const SCHEMA = 1;
    const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    const parameters = () => (typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters(PLUGIN) : {});
    const plain = value => JSON.parse(JSON.stringify(value));
    const deepFreeze = value => {
        if (value && typeof value === "object" && !Object.isFrozen(value)) {
            Object.freeze(value);
            for (const key of Object.keys(value)) deepFreeze(value[key]);
        }
        return value;
    };

    const state = { data: null, source: null, error: null, loading: false };
    let overrides = {}; // { cardId: { cooldownSeconds?: n, constants: {k: n}, levels: { "1": {k: n} } } }
    let revision = 0;
    const listeners = [];
    const bump = () => { revision++; for (const fn of listeners.slice()) { try { fn(revision); } catch (_error) { /* 通知先の失敗は無視 */ } } };

    // ---- 検証(数値の定義はJSONのfields) ----
    const elementCount = () => (typeof $dataSystem !== "undefined" && Array.isArray($dataSystem?.elements)) ? $dataSystem.elements.length : null;
    const checkNumber = (field, key, raw) => {
        if (field.type === "boolean" || field.editable === false) return { ok: false, reason: "notEditable", detail: key };
        let value = raw;
        if (typeof value === "string") {
            if (!/^\s*-?\d+(\.\d+)?\s*$/.test(value)) return { ok: false, reason: "notANumber", detail: key };
            value = Number(value);
        }
        if (typeof value !== "number" || !Number.isFinite(value)) return { ok: false, reason: "notANumber", detail: key };
        if (field.integer && !Number.isInteger(value)) return { ok: false, reason: "mustBeInteger", detail: key };
        if (Number.isFinite(field.min) && value < field.min) return { ok: false, reason: "belowMin", detail: key, min: field.min };
        if (Number.isFinite(field.max) && value > field.max) return { ok: false, reason: "aboveMax", detail: key, max: field.max };
        if (field.elementId === true) {
            const count = elementCount();
            if (count !== null && value >= count) return { ok: false, reason: "unknownElement", detail: key, max: count - 1 };
        }
        return { ok: true, value };
    };

    // 構造の検証(製品JSON・開発用ファイル共通のうち製品JSON側)。問題の一覧を返す。
    const validateData = data => {
        const problems = [];
        if (!data || typeof data !== "object" || Array.isArray(data)) return ["notAnObject"];
        if (data.schema !== SCHEMA) problems.push("unsupportedSchema:" + data.schema);
        if (!data.fields || typeof data.fields !== "object") problems.push("missingFields");
        if (!data.cards || typeof data.cards !== "object") problems.push("missingCards");
        if (problems.length) return problems;
        for (const cardId of Object.keys(data.cards)) {
            const card = data.cards[cardId];
            if (!card || typeof card !== "object") { problems.push(cardId + ":notAnObject"); continue; }
            const cd = checkNumber(data.fields.cooldownSeconds || {}, "cooldownSeconds", card.cooldownSeconds);
            if (!cd.ok) problems.push(cardId + ":cooldownSeconds:" + cd.reason);
            for (const key of Object.keys(card.constants || {})) {
                const field = data.fields[key];
                if (!field) { problems.push(cardId + ":constants." + key + ":unknownField"); continue; }
                if (field.type === "boolean") { if (typeof card.constants[key] !== "boolean") problems.push(cardId + ":constants." + key + ":notBoolean"); continue; }
                const r = checkNumber(Object.assign({}, field, { editable: true }), key, card.constants[key]);
                if (!r.ok) problems.push(cardId + ":constants." + key + ":" + r.reason);
            }
            const levels = card.levels || {};
            for (const level of Object.keys(levels)) {
                if (!/^[1-3]$/.test(level)) { problems.push(cardId + ":levels." + level + ":badLevel"); continue; }
                for (const key of Object.keys(levels[level])) {
                    const field = data.fields[key];
                    if (!field) { problems.push(cardId + ":levels." + level + "." + key + ":unknownField"); continue; }
                    if (field.type === "boolean") { if (typeof levels[level][key] !== "boolean") problems.push(cardId + ":levels." + level + "." + key + ":notBoolean"); continue; }
                    const r = checkNumber(Object.assign({}, field, { editable: true }), key, levels[level][key]);
                    if (!r.ok) problems.push(cardId + ":levels." + level + "." + key + ":" + r.reason);
                }
            }
            if (!own(levels, "1")) problems.push(cardId + ":missingLevel1");
        }
        return problems;
    };

    const adopt = (data, source) => {
        const problems = validateData(data);
        if (problems.length) {
            state.data = null; state.source = source; state.error = problems;
            if (typeof console !== "undefined") console.error("[" + PLUGIN + "] invalid " + DATA_FILE + ":", problems.join(", "));
            return false;
        }
        state.data = deepFreeze(plain(data)); state.source = source; state.error = null;
        return true;
    };

    // ---- 読み込み ----
    const nodeRequire = name => { try { return typeof require === "function" ? require(name) : null; } catch (_error) { return null; } };
    const projectDir = () => {
        const path = nodeRequire("path");
        try { return path && typeof process !== "undefined" && process.mainModule ? path.dirname(process.mainModule.filename) : null; } catch (_error) { return null; }
    };
    const readProjectFile = relative => {
        const fs = nodeRequire("fs"), path = nodeRequire("path"), dir = projectDir();
        if (!fs || !path || !dir) return null;
        try { const file = path.join(dir, relative); return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null; } catch (_error) { return null; }
    };
    const load = () => {
        if (root.$dataProjectRCardBalance && typeof root.$dataProjectRCardBalance === "object") return adopt(root.$dataProjectRCardBalance, "injected");
        const text = readProjectFile(DATA_FILE);
        if (text !== null) {
            try { return adopt(JSON.parse(text), "file"); } catch (error) { state.data = null; state.source = "file"; state.error = ["parseError:" + String(error?.message || error)]; return false; }
        }
        if (typeof XMLHttpRequest !== "undefined" && !state.loading) { // ブラウザ実行(非同期)
            state.loading = true;
            const xhr = new XMLHttpRequest();
            xhr.open("GET", DATA_FILE);
            xhr.overrideMimeType("application/json");
            xhr.onload = () => { state.loading = false; try { adopt(JSON.parse(xhr.responseText), "xhr"); applyCooldowns(); bump(); } catch (error) { state.error = ["parseError:" + String(error?.message || error)]; } };
            xhr.onerror = () => { state.loading = false; state.error = ["loadFailed"]; };
            xhr.send();
            return false;
        }
        state.error = state.error || ["notFound"];
        return false;
    };

    // ---- 解決 ----
    const ready = () => !!state.data;
    const data = () => state.data;
    const cardData = cardId => (state.data && own(state.data.cards, cardId)) ? state.data.cards[cardId] : null;
    const activeOverrides = () => (isPlaytest() ? overrides : {});
    const cardOverride = cardId => { const o = activeOverrides(); return own(o, cardId) ? o[cardId] : null; };
    const catalog = () => root.ProjectRCardCatalog;

    const levelRows = cardId => {
        const base = cardData(cardId), ov = cardOverride(cardId);
        if (!base) return null;
        const rows = [];
        for (let level = 1; level <= MAX_LEVEL; level++) {
            const effects = Object.assign({}, base.levels[level] || {}, (ov && ov.levels && ov.levels[level]) || {});
            rows.push(Object.freeze({ level, effects: Object.freeze(effects) }));
        }
        return Object.freeze(rows);
    };
    const levels = cardId => levelRows(cardId);
    const effects = (cardId, level) => {
        const rows = levelRows(cardId);
        if (!rows) return null;
        const resolve = catalog()?.resolveLevels;
        if (typeof resolve !== "function") return null;
        return resolve(rows, level); // 累積。同じ効果は後のLvの値で置換(凍結済み)
    };
    const constant = (cardId, key) => {
        const base = cardData(cardId);
        if (!base || !own(base.constants || {}, key)) return undefined;
        const ov = cardOverride(cardId);
        return ov && ov.constants && own(ov.constants, key) ? ov.constants[key] : base.constants[key];
    };
    const cooldownSeconds = cardId => {
        const base = cardData(cardId);
        if (!base) return undefined;
        const ov = cardOverride(cardId);
        return ov && own(ov, "cooldownSeconds") ? ov.cooldownSeconds : base.cooldownSeconds;
    };
    const cardIds = () => (state.data ? Object.keys(state.data.cards) : []);

    // ---- クールダウンをCoreの実行時定義へ反映(Coreは変更しない。登録Mapの項目を凍結コピーで置き換える) ----
    function applyCooldowns() {
        const cards = root.ProjectRCardDeck?.definitions?.cards;
        if (!(cards instanceof Map) || !state.data) return 0;
        let changed = 0;
        for (const cardId of cardIds()) {
            const definition = cards.get(cardId);
            const wanted = cooldownSeconds(cardId);
            if (!definition || !Number.isFinite(wanted) || definition.cooldownSeconds === wanted) continue;
            cards.set(cardId, Object.freeze(Object.assign({}, definition, { cooldownSeconds: wanted })));
            changed++;
        }
        return changed;
    }

    // ---- 値の定義・説明 ----
    const fieldOf = key => (state.data && own(state.data.fields, key)) ? state.data.fields[key] : null;
    const validate = (cardId, scope, key, value) => {
        if (!ready()) return { ok: false, reason: "balanceUnavailable" };
        const base = cardData(cardId);
        if (!base) return { ok: false, reason: "unknownCard", detail: cardId };
        if (scope === "cooldown") key = "cooldownSeconds";
        const field = fieldOf(key);
        if (!field) return { ok: false, reason: "unknownField", detail: key };
        if (scope === "cooldown") { const r = checkNumber(field, key, value); return r.ok ? { ok: true, value: r.value, scope, key } : r; }
        if (scope === "constant") {
            if (!own(base.constants || {}, key)) return { ok: false, reason: "unsupportedField", detail: key };
        } else if (scope === 1 || scope === 2 || scope === 3) {
            let defined = false;
            for (let level = 1; level <= scope; level++) if (own(base.levels[level] || {}, key)) defined = true;
            if (!defined) return { ok: false, reason: "unsupportedField", detail: key };
        } else {
            return { ok: false, reason: "badScope", detail: String(scope) };
        }
        const r = checkNumber(field, key, value);
        if (!r.ok) return r;
        // 他の数値との関係(例: 先端の幅は半径以下)
        if (field.lteKey && scope === "constant") {
            const limit = constant(cardId, field.lteKey);
            if (Number.isFinite(limit) && r.value > limit) return { ok: false, reason: "aboveRelated", detail: key, related: field.lteKey, max: limit };
        }
        for (const other of Object.keys(base.constants || {})) {
            const f = fieldOf(other);
            if (f && f.lteKey === key && scope === "constant") {
                const v = constant(cardId, other);
                if (Number.isFinite(v) && v > r.value) return { ok: false, reason: "belowRelated", detail: key, related: other, min: v };
            }
        }
        return { ok: true, value: r.value, scope, key };
    };

    const fields = () => (state.data ? plain(state.data.fields) : {});
    const describe = cardId => {
        const base = cardData(cardId);
        if (!base) return null;
        const ov = cardOverride(cardId);
        const rows = [];
        const push = (scope, key, original, current, inherited) => {
            const field = fieldOf(key) || {};
            rows.push({ scope, level: typeof scope === "number" ? scope : null, key, label: field.label || key, unit: field.unit || "",
                original, current, modified: original !== current, inherited: !!inherited,
                editable: field.type !== "boolean" && field.editable !== false, type: field.type || "number",
                min: field.min, max: field.max, integer: !!field.integer, reserved: !!field.reserved });
        };
        push("cooldown", "cooldownSeconds", base.cooldownSeconds, cooldownSeconds(cardId), false);
        for (const key of Object.keys(base.constants || {})) push("constant", key, base.constants[key], constant(cardId, key), false);
        for (let level = 1; level <= MAX_LEVEL; level++) {
            const resolved = effects(cardId, level);
            const own_ = base.levels[level] || {};
            for (const key of Object.keys(resolved)) {
                const originalResolved = (() => { const o = {}; for (let l = 1; l <= level; l++) Object.assign(o, base.levels[l] || {}); return o[key]; })();
                const isOwn = own(own_, key) || !!(ov && ov.levels && ov.levels[level] && own(ov.levels[level], key));
                push(level, key, originalResolved, resolved[key], !isOwn);
            }
        }
        return { cardId, name: base.name, designId: base.designId, rows };
    };

    // ---- 開発用の上書き(Playtest限定) ----
    const guardDev = () => (isPlaytest() ? null : { ok: false, reason: "notPlaytest" });
    const ensureCard = cardId => (own(overrides, cardId) ? overrides[cardId] : (overrides[cardId] = { constants: {}, levels: {} }));
    const prune = cardId => {
        const ov = overrides[cardId];
        if (!ov) return;
        for (const level of Object.keys(ov.levels)) if (!Object.keys(ov.levels[level]).length) delete ov.levels[level];
        if (!Object.keys(ov.constants).length && !Object.keys(ov.levels).length && !own(ov, "cooldownSeconds")) delete overrides[cardId];
    };
    const originalFor = (cardId, scope, key) => {
        const base = cardData(cardId);
        if (scope === "cooldown") return base.cooldownSeconds;
        if (scope === "constant") return base.constants[key];
        const merged = {};
        for (let l = 1; l <= scope; l++) Object.assign(merged, base.levels[l] || {});
        return merged[key];
    };
    const setOverride = (cardId, scope, key, value) => {
        const denied = guardDev(); if (denied) return denied;
        const checked = validate(cardId, scope, key, value);
        if (!checked.ok) return checked;
        const ov = ensureCard(cardId);
        const original = (scope === "cooldown" || scope === "constant" || own(cardData(cardId).levels[scope] || {}, key)) ? originalFor(cardId, scope, key) : originalFor(cardId, scope, key);
        const k = scope === "cooldown" ? "cooldownSeconds" : key;
        if (scope === "cooldown") {
            if (checked.value === original) delete ov.cooldownSeconds; else ov.cooldownSeconds = checked.value;
        } else if (scope === "constant") {
            if (checked.value === original) delete ov.constants[k]; else ov.constants[k] = checked.value;
        } else {
            const slot = ov.levels[scope] || (ov.levels[scope] = {});
            const ownDefault = cardData(cardId).levels[scope];
            // そのLv自身の既定と同じ値なら上書きを外す。継承元と同じ値でも「このLvで明示した値」として残す(継承元だけ後で変えたとき別物になるため)。
            if (ownDefault && own(ownDefault, k) && ownDefault[k] === checked.value) delete slot[k]; else slot[k] = checked.value;
        }
        prune(cardId);
        if (scope === "cooldown") applyCooldowns();
        bump();
        return { ok: true, value: checked.value };
    };
    const resetValue = (cardId, scope, key) => {
        const denied = guardDev(); if (denied) return denied;
        const ov = own(overrides, cardId) ? overrides[cardId] : null;
        if (!ov) return { ok: true, removed: false };
        let removed = false;
        if (scope === "cooldown") { removed = own(ov, "cooldownSeconds"); delete ov.cooldownSeconds; }
        else if (scope === "constant") { removed = own(ov.constants, key); delete ov.constants[key]; }
        else if (ov.levels[scope]) { removed = own(ov.levels[scope], key); delete ov.levels[scope][key]; }
        prune(cardId);
        if (removed) { applyCooldowns(); bump(); }
        return { ok: true, removed };
    };
    const resetCard = cardId => {
        const denied = guardDev(); if (denied) return denied;
        const had = own(overrides, cardId);
        delete overrides[cardId];
        if (had) { applyCooldowns(); bump(); }
        return { ok: true, removed: had };
    };
    const resetAll = () => {
        const denied = guardDev(); if (denied) return denied;
        const had = Object.keys(overrides).length > 0;
        overrides = {};
        if (had) { applyCooldowns(); bump(); }
        return { ok: true, removed: had };
    };
    const countOverrides = () => {
        let n = 0;
        for (const cardId of Object.keys(overrides)) {
            const ov = overrides[cardId];
            if (own(ov, "cooldownSeconds")) n++;
            n += Object.keys(ov.constants).length;
            for (const level of Object.keys(ov.levels)) n += Object.keys(ov.levels[level]).length;
        }
        return n;
    };
    const getOverrides = () => plain(overrides);

    // 開発用ファイル(製品のdata/とは別。セーブデータにも入らない)
    const devPath = () => String(parameters().DevConfigPath || "dev_tuning/ProjectR_CardBalance.dev.json");
    let devPathOverride = null;
    const devFile = () => {
        const path = nodeRequire("path"), dir = projectDir();
        const rel = devPathOverride || devPath();
        if (!path) return null;
        if (path.isAbsolute(rel)) return rel;
        return dir ? path.join(dir, rel) : null;
    };
    const safeDevPath = file => {
        // 製品の既定値ファイル・ワークブックを指す保存先は拒否する。
        const path = nodeRequire("path");
        if (!path || !file) return false;
        const base = path.basename(file).toLowerCase();
        if (/\.xlsx?$/.test(base) || path.resolve(file) === path.resolve(path.join(projectDir() || "", DATA_FILE))) return false;
        return /\.json$/.test(base);
    };
    const fileFormat = () => ({ schema: SCHEMA, kind: "ProjectR_CardBalance.dev", overrides: plain(overrides) });
    const saveDev = () => {
        const denied = guardDev(); if (denied) return denied;
        const fs = nodeRequire("fs"), path = nodeRequire("path"), file = devFile();
        if (!fs || !path || !file) return { ok: false, reason: "noFileSystem" };
        if (!safeDevPath(file)) return { ok: false, reason: "unsafeDevPath" };
        try {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, JSON.stringify(fileFormat(), null, 2), "utf8");
            return { ok: true, file, count: countOverrides() };
        } catch (error) { return { ok: false, reason: "writeFailed", detail: String(error?.message || error) }; }
    };
    // 読み込みは検証してから置き換える(1つでも不正なら全体を拒否し、今の上書きは変えない)。
    const parseDev = parsed => {
        if (!parsed || typeof parsed !== "object" || parsed.schema !== SCHEMA || typeof parsed.overrides !== "object" || parsed.overrides === null) return { ok: false, reason: "badFormat" };
        const next = {}, problems = [];
        for (const cardId of Object.keys(parsed.overrides)) {
            const src = parsed.overrides[cardId];
            if (!cardData(cardId)) { problems.push(cardId + ":unknownCard"); continue; }
            if (!src || typeof src !== "object") { problems.push(cardId + ":badEntry"); continue; }
            const dst = { constants: {}, levels: {} };
            const check = (scope, key, value, assign) => {
                // 検証は「今の上書きなし」の状態で行う(関連値の検証がファイル内の他の値と食い違わないよう、いったん素の既定で見る)。
                const r = validateWith({}, cardId, scope, key, value);
                if (!r.ok) problems.push(cardId + ":" + String(scope) + "." + key + ":" + r.reason); else assign(r.value);
            };
            if (own(src, "cooldownSeconds")) check("cooldown", "cooldownSeconds", src.cooldownSeconds, v => { dst.cooldownSeconds = v; });
            for (const key of Object.keys(src.constants || {})) check("constant", key, src.constants[key], v => { dst.constants[key] = v; });
            for (const level of Object.keys(src.levels || {})) {
                if (!/^[1-3]$/.test(level)) { problems.push(cardId + ":levels." + level + ":badLevel"); continue; }
                dst.levels[level] = {};
                for (const key of Object.keys(src.levels[level])) check(Number(level), key, src.levels[level][key], v => { dst.levels[level][key] = v; });
            }
            next[cardId] = dst;
        }
        if (problems.length) return { ok: false, reason: "invalidValues", problems };
        return { ok: true, next };
    };
    const validateWith = (tempOverrides, cardId, scope, key, value) => {
        const saved = overrides;
        overrides = tempOverrides;
        try { return validate(cardId, scope, key, value); } finally { overrides = saved; }
    };
    const loadDev = () => {
        const denied = guardDev(); if (denied) return denied;
        const fs = nodeRequire("fs"), file = devFile();
        if (!fs || !file) return { ok: false, reason: "noFileSystem" };
        if (!safeDevPath(file)) return { ok: false, reason: "unsafeDevPath" };
        let parsed;
        try { if (!fs.existsSync(file)) return { ok: false, reason: "noFile", file }; parsed = JSON.parse(fs.readFileSync(file, "utf8")); }
        catch (error) { return { ok: false, reason: "readFailed", detail: String(error?.message || error) }; }
        const result = parseDev(parsed);
        if (!result.ok) return result;
        overrides = result.next;
        for (const cardId of Object.keys(overrides)) prune(cardId);
        applyCooldowns();
        bump();
        return { ok: true, file, count: countOverrides() };
    };
    const importOverrides = parsed => { // テスト・エディタ用: ファイルを介さず同じ検証で取り込む
        const denied = guardDev(); if (denied) return denied;
        const result = parseDev({ schema: SCHEMA, overrides: parsed });
        if (!result.ok) return result;
        overrides = result.next;
        for (const cardId of Object.keys(overrides)) prune(cardId);
        applyCooldowns();
        bump();
        return { ok: true, count: countOverrides() };
    };

    load();
    applyCooldowns();

    root.ProjectRCardBalance = Object.freeze({
        SCHEMA, MAX_LEVEL, DATA_FILE,
        isReady: ready, status: () => ({ ready: ready(), source: state.source, error: state.error ? state.error.slice() : null, schema: SCHEMA, cards: cardIds().length }),
        reload: () => { const ok = load(); applyCooldowns(); bump(); return ok; },
        cardIds, hasCard: id => !!cardData(id), fields, fieldOf: key => (fieldOf(key) ? plain(fieldOf(key)) : null),
        levels, effects, constant, cooldownSeconds, describe, validate,
        applyCooldowns,
        isPlaytest, setOverride, resetValue, resetCard, resetAll, overrides: getOverrides, overrideCount: countOverrides,
        importOverrides, saveDev, loadDev, devFile, setDevFile: file => { devPathOverride = file ? String(file) : null; },
        revision: () => revision, onChange: fn => { if (typeof fn === "function") listeners.push(fn); },
        defaultsSnapshot: () => (state.data ? plain(state.data) : null)
    });
})();
