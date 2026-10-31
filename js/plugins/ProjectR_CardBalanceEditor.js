/*:
 * @target MZ
 * @plugindesc v1.0.0 DEV専用 カードバランスエディタ(Playtest限定・F6)。製品の既定値(data/ProjectR_CardBalance.json)は変更しない。
 * @author ProjectR
 * @base ProjectR_CardBalance
 * @orderAfter ProjectR_CardBalance
 *
 * @command openBalanceEditor
 * @text カードバランスエディタを開く(Playtest限定)
 * @desc Combat Test Arenaなどのイベントから呼べます。F6キーでも開閉できます。配布版では何もしません。
 *
 * @help
 * ProjectR_CardBalanceEditor.js
 *
 * 【使い方】Playtest中に F6(または プラグインコマンド「カードバランスエディタを開く」)で開閉します。開いている間、ゲームは止まります。
 *   ・カードとLv(クールダウン/定数/Lv1/Lv2/Lv3)を選ぶ。
 *   ・「現在の値」を書き換えて Enter(またはフォーカスを外す)で適用。範囲・整数/小数・単位が合わない値は理由つきで拒否され、元の値に戻ります。
 *   ・「元の値」は製品の既定値(data/ProjectR_CardBalance.json)。変更した項目は強調され、項目ごとの「戻す」で個別にリセットできます。
 *   ・「このカードをリセット」「すべてリセット」「保存(dev)」「読み込み(dev)」。保存先は dev_tuning/ProjectR_CardBalance.dev.json(製品の既定値・セーブデータとは別)。
 *   ・Lvは累積し、同じ効果の新しい数値は前のLvの値を置き換えます。「継承」と出る項目は前のLvの値で、ここで入力するとそのLvだけの値として上書きされます。
 *   ・変更は次の発動から効きます。すでに発動した効果(持続中)は発動時の値のまま動きます。クールダウンは次に捨て札へ入るときから。
 * 【安全】Playtest以外では何も作らず、F6も効きません。ワークブックや製品のJSONを書き換えることはありません。
 *
 * API: ProjectRCardBalanceEditor
 *   open() / close() / toggle() / isOpen()
 *   viewModel(cardId) / applyEdit(cardId, scope, key, text) / explain(result)   画面を介さない操作(テスト用)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const balance = () => root.ProjectRCardBalance;
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return; // 配布版では何も作らない

    const REASONS = {
        notPlaytest: "Playtestでのみ変更できます", balanceUnavailable: "バランス設定が読み込めていません", unknownCard: "不明なカードです",
        unknownField: "不明な項目です", unsupportedField: "この項目はこのカード/Lvにありません", badScope: "範囲の指定が不正です",
        notEditable: "この項目は数値ではないため変更できません", notANumber: "数値を入力してください", mustBeInteger: "整数で入力してください",
        belowMin: "下限より小さい値です", aboveMax: "上限より大きい値です", unknownElement: "存在しない属性IDです",
        aboveRelated: "関連する値(半径など)より大きくできません", belowRelated: "関連する値より小さくできません",
        noFileSystem: "ファイルを扱えません", unsafeDevPath: "保存先が安全ではありません", noFile: "保存ファイルがまだありません",
        readFailed: "ファイルを読めませんでした", writeFailed: "ファイルに書けませんでした", badFormat: "ファイルの形式が正しくありません",
        invalidValues: "ファイルに不正な値があります(何も変更していません)"
    };
    const explain = result => {
        if (!result || result.ok) return "";
        let text = REASONS[result.reason] || String(result.reason || "失敗");
        if (result.detail) text += ` (${result.detail})`;
        if (Number.isFinite(result.min) && result.reason === "belowMin") text += ` 下限 ${result.min}`;
        if (Number.isFinite(result.max) && (result.reason === "aboveMax" || result.reason === "unknownElement" || result.reason === "aboveRelated")) text += ` 上限 ${result.max}`;
        if (Array.isArray(result.problems)) text += ": " + result.problems.slice(0, 3).join(" / ");
        return text;
    };

    const SCOPES = [["all", "すべて"], ["cooldown", "クールダウン/定数"], [1, "Lv1"], [2, "Lv2"], [3, "Lv3"]];
    // 画面に出す行(エディタ用の表示モデル)。scope: "all" | "cooldown"(クールダウンと定数) | 1 | 2 | 3
    const viewModel = (cardId, scope = "all") => {
        const d = balance()?.describe?.(cardId);
        if (!d) return null;
        const rows = d.rows.filter(row => scope === "all" || (scope === "cooldown" ? (row.scope === "cooldown" || row.scope === "constant") : row.scope === scope));
        return { cardId, name: d.name, designId: d.designId, scope, rows, overrideCount: balance().overrideCount() };
    };
    const applyEdit = (cardId, scope, key, text) => {
        const api = balance();
        if (!api) return { ok: false, reason: "balanceUnavailable" };
        return api.setOverride(cardId, scope, key, String(text).trim());
    };

    // ---- 画面(DOMのモーダル) ----
    let overlay = null, paused = false;
    const isOpen = () => !!overlay;
    const STYLE = "position:fixed;top:0;right:0;bottom:0;width:640px;max-width:100vw;z-index:2147483000;background:#14171c;color:#e6e9ee;" +
        "font:13px/1.5 'Segoe UI','Yu Gothic UI',Meiryo,sans-serif;display:flex;flex-direction:column;box-shadow:-8px 0 24px rgba(0,0,0,.5);";
    const el = (tag, props, children) => {
        const node = document.createElement(tag);
        for (const key of Object.keys(props || {})) {
            if (key === "style") node.style.cssText = props[key]; else if (key === "text") node.textContent = props[key]; else node[key] = props[key];
        }
        for (const child of children || []) node.appendChild(child);
        return node;
    };
    const state = { cardId: null, scope: "all", message: "", ok: true };
    const BTN = "background:#2a3140;color:#e6e9ee;border:1px solid #475066;border-radius:4px;padding:3px 10px;margin:0 4px 4px 0;cursor:pointer;font:inherit;";

    // 再描画の最中に消される入力欄は blur → change を同期に起こし、その中の再描画が同じ入力欄を先に消すため、外側の removeChild が
    // NotFoundError になる(実機で判明)。描画中は commit を無視し、再入しない。
    let rendering = false;
    const render = () => {
        if (!overlay || rendering) return;
        rendering = true;
        try { renderBody(); } finally { rendering = false; }
    };
    const renderBody = () => {
        const api = balance();
        const body = overlay.querySelector("[data-role=body]");
        while (body.firstChild) body.removeChild(body.firstChild);
        const ids = api.cardIds();
        if (!state.cardId || ids.indexOf(state.cardId) < 0) state.cardId = ids[0] || null;
        const vm = state.cardId ? viewModel(state.cardId, state.scope) : null;
        overlay.querySelector("[data-role=count]").textContent = `上書き中: ${api.overrideCount()} 件(製品の既定値は変更されません)`;
        const msg = overlay.querySelector("[data-role=message]");
        msg.textContent = state.message || "値を書き換えて Enter。変更は次の発動から効きます。";
        msg.style.color = state.ok ? "#9fb3c8" : "#ff8a80";
        const select = overlay.querySelector("[data-role=card]");
        if (select.options.length !== ids.length) {
            while (select.firstChild) select.removeChild(select.firstChild);
            for (const id of ids) { const o = document.createElement("option"); o.value = id; select.appendChild(o); }
        }
        for (const o of select.options) {
            const card = api.describe(o.value);
            const changed = card && card.rows.some(r => r.modified);
            o.textContent = `${card ? card.name : o.value} (${o.value})${changed ? " ●" : ""}`;
        }
        select.value = state.cardId;
        for (const b of overlay.querySelectorAll("[data-scope]")) b.style.background = String(b.getAttribute("data-scope")) === String(state.scope) ? "#3b6ea5" : "#2a3140";
        if (!vm) { body.appendChild(el("div", { text: "バランス設定を読み込めていません。" })); return; }
        const table = el("table", { style: "width:100%;border-collapse:collapse;" });
        const head = el("tr", {}, ["項目", "範囲", "元の値", "現在の値", ""].map(t => el("th", { text: t, style: "text-align:left;padding:3px 6px;border-bottom:1px solid #475066;color:#9fb3c8;font-weight:600;" })));
        table.appendChild(head);
        let lastScope = null;
        for (const row of vm.rows) {
            if (row.scope !== lastScope) {
                lastScope = row.scope;
                const title = row.scope === "cooldown" ? "クールダウン" : row.scope === "constant" ? "定数(Lvに依らない)" : `Lv${row.scope}`;
                const cell = el("td", { text: title, colSpan: 5, style: "padding:8px 6px 2px;color:#7fd1b9;font-weight:700;" });
                table.appendChild(el("tr", {}, [cell]));
            }
            const editable = row.editable;
            const rangeText = row.type === "boolean" ? "(変更不可)" : `${Number.isFinite(row.min) ? row.min : ""}〜${Number.isFinite(row.max) ? row.max : ""}${row.integer ? " 整数" : ""} ${row.unit}`;
            const label = `${row.label}${row.inherited ? "(継承)" : ""}${row.reserved ? "(予約)" : ""}`;
            const tr = el("tr", { style: row.modified ? "background:#2b2a1a;" : "" });
            const nameCell = el("td", { style: "padding:2px 6px;", title: row.key });
            nameCell.appendChild(el("div", { text: label }));
            nameCell.appendChild(el("div", { text: row.key, style: "color:#7b8798;font-size:11px;" }));
            tr.appendChild(nameCell);
            tr.appendChild(el("td", { text: rangeText, style: "padding:2px 6px;color:#9fb3c8;font-size:11px;" }));
            tr.appendChild(el("td", { text: String(row.original), style: "padding:2px 6px;color:#9fb3c8;" }));
            const valueCell = el("td", { style: "padding:2px 6px;" });
            if (editable) {
                const input = el("input", { type: "text", value: String(row.current), style: "width:90px;background:#0e1115;color:#fff;border:1px solid " + (row.modified ? "#e6c14e" : "#475066") + ";border-radius:3px;padding:2px 4px;" });
                input.setAttribute("data-key", row.key);
                input.setAttribute("data-scope", String(row.scope));
                const commit = () => {
                    if (rendering || input.value === String(row.current)) return;
                    const result = applyEdit(state.cardId, row.scope, row.key, input.value);
                    state.ok = !!result.ok;
                    state.message = result.ok ? `${label} = ${result.value} を適用しました(次の発動から)。` : `${label}: ${explain(result)}`;
                    render();
                };
                input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); commit(); } });
                input.addEventListener("change", commit);
                valueCell.appendChild(input);
                if (row.key === "element" && root.ProjectRElements) valueCell.appendChild(el("span", { text: " " + (root.ProjectRElements.nameOf(row.current) || ""), style: "color:#9fb3c8;" }));
            } else {
                valueCell.appendChild(el("span", { text: String(row.current), style: "color:#9fb3c8;" }));
            }
            tr.appendChild(valueCell);
            const actionCell = el("td", { style: "padding:2px 6px;" });
            if (row.modified || (row.scope !== "cooldown" && row.scope !== "constant" && !row.inherited && editable && api.overrides()[state.cardId]?.levels?.[row.scope]?.[row.key] !== undefined)) {
                const reset = el("button", { text: "戻す", style: BTN });
                reset.addEventListener("click", () => { const r = api.resetValue(state.cardId, row.scope, row.key); state.ok = !!r.ok; state.message = `${label} を元の値に戻しました。`; render(); });
                actionCell.appendChild(reset);
            }
            tr.appendChild(actionCell);
            table.appendChild(tr);
        }
        body.appendChild(table);
    };

    const stopEvents = node => {
        // ゲーム側(Input/TouchInput/Hendrix)へキー・マウスを渡さない。
        for (const type of ["keydown", "keyup", "keypress", "mousedown", "mouseup", "mousemove", "wheel", "contextmenu", "touchstart", "touchend", "touchmove", "pointerdown", "pointerup"]) {
            node.addEventListener(type, event => { event.stopPropagation(); }, false);
        }
    };

    const open = () => {
        if (!isPlaytest()) return { ok: false, reason: "notPlaytest" };
        if (typeof document === "undefined") return { ok: false, reason: "noDom" };
        if (overlay) return { ok: true, already: true };
        if (!balance()) return { ok: false, reason: "balanceUnavailable" };
        overlay = el("div", { style: STYLE });
        overlay.setAttribute("data-projectr-balance-editor", "1");
        const header = el("div", { style: "padding:10px 12px;background:#1d222b;border-bottom:1px solid #475066;" });
        header.appendChild(el("div", { text: "ProjectR カードバランスエディタ(Playtest専用)", style: "font-size:15px;font-weight:700;" }));
        const countLine = el("div", { text: "", style: "color:#9fb3c8;margin-top:2px;" });
        countLine.setAttribute("data-role", "count");
        header.appendChild(countLine);
        const row1 = el("div", { style: "margin-top:6px;" });
        const select = el("select", { style: "background:#0e1115;color:#fff;border:1px solid #475066;padding:3px;margin-right:8px;min-width:260px;" });
        select.setAttribute("data-role", "card");
        select.addEventListener("change", () => { state.cardId = select.value; state.message = ""; state.ok = true; render(); });
        row1.appendChild(select);
        const closeBtn = el("button", { text: "閉じる (F6)", style: BTN });
        closeBtn.addEventListener("click", () => close());
        row1.appendChild(closeBtn);
        header.appendChild(row1);
        const row2 = el("div", { style: "margin-top:6px;" });
        for (const entry of SCOPES) {
            const b = el("button", { text: entry[1], style: BTN });
            b.setAttribute("data-scope", String(entry[0]));
            b.addEventListener("click", () => { state.scope = entry[0]; render(); });
            row2.appendChild(b);
        }
        header.appendChild(row2);
        overlay.appendChild(header);
        const body = el("div", { style: "flex:1;overflow:auto;padding:6px 8px;" });
        body.setAttribute("data-role", "body");
        overlay.appendChild(body);
        const footer = el("div", { style: "padding:8px 12px;background:#1d222b;border-top:1px solid #475066;" });
        const message = el("div", { text: "", style: "min-height:20px;margin-bottom:6px;" });
        message.setAttribute("data-role", "message");
        footer.appendChild(message);
        const act = (text, fn) => { const b = el("button", { text, style: BTN }); b.addEventListener("click", () => { const r = fn(); state.ok = !!(r && r.ok !== false); state.message = r && r.text ? r.text : ""; render(); }); footer.appendChild(b); return b; };
        act("このカードをリセット", () => { const r = balance().resetCard(state.cardId); return { ok: r.ok, text: "このカードの上書きをすべて戻しました。" }; });
        act("すべてリセット", () => { const r = balance().resetAll(); return { ok: r.ok, text: "すべての上書きを戻しました。" }; });
        act("保存(dev)", () => { const r = balance().saveDev(); return r.ok ? { ok: true, text: `保存しました: ${r.file}(${r.count}件)` } : { ok: false, text: explain(r) }; });
        act("読み込み(dev)", () => { const r = balance().loadDev(); return r.ok ? { ok: true, text: `読み込みました(${r.count}件)` } : { ok: false, text: explain(r) }; });
        overlay.appendChild(footer);
        stopEvents(overlay);
        document.body.appendChild(overlay);
        paused = true;
        render();
        return { ok: true };
    };
    const close = () => {
        if (!overlay) return { ok: true, already: true };
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null; paused = false;
        return { ok: true };
    };
    const toggle = () => (overlay ? close() : open());

    // ゲームを止める(開いている間は場面の更新をしない。描画だけ続く)。
    if (typeof SceneManager !== "undefined" && SceneManager.updateScene) {
        const _updateScene = SceneManager.updateScene;
        SceneManager.updateScene = function() { if (paused) return; return _updateScene.apply(this, arguments); };
    }
    if (typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("keydown", event => { if (event.key === "F6" || event.keyCode === 117) { event.preventDefault(); toggle(); } });
    }
    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        PluginManager.registerCommand("ProjectR_CardBalanceEditor", "openBalanceEditor", () => { open(); });
    }

    root.ProjectRCardBalanceEditor = Object.freeze({ open, close, toggle, isOpen, viewModel, applyEdit, explain, isPaused: () => paused, state: () => Object.assign({}, state) });
})();
