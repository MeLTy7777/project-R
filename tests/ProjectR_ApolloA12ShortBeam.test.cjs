"use strict";
// Phase Apollo-A12: 短いビーム区間(壁のすぐ前で撃った)の絵の幅。
//   公式Show VFXの拡縮は縦横一様なので、区間が短いと幅まで縮み、判定(幅3マス)と合わなかった。
//   axisScale: true のビームのキー(黄金の矢 apollo_golden.*・ギガース殺し apollo_gigas.*)だけ、絵が登録されたあとに幅(Spriteのx拡縮)を元へ戻し、
//   長さ(y拡縮)だけを縮める。従来のキー(apollo_volley.*)・他のVFXは従来どおり。ここは実エンジン(Hendrixの絵のSpriteは無いので、絵は偽の登録で確かめる)。
//   実機の幅・位置の測定は tools/mz_cdp/apollo_a12_short_beam_verify.cjs。
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, cardWorld, frames, fireCard, aimDegree, center, placeEnemy, parkOthers, setRegion, player, KEYS } = fx;
let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const world = () => cardWorld("apollo_golden_volley", { level: 3 });
const vfx = w => w.ctx.ProjectRPresentationVfx;
const diag = w => plain(vfx(w).diagnostics());
// 偽の絵(Hendrixの絵の登録の代わり): note が一致する絵のSpriteを、一様に縮んだ状態で置く(公式Show VFXが一様拡縮で作った状態)
const fakePicture = (w, note, uniform) => {
    const scale = { x: uniform, y: uniform, set(x, y) { this.x = x; this.y = y; } };
    const picture = { note, sprite: { scale }, update() {}, dispose() { const list = w.ctx.AnimatedPictureManager._animatedPictures; const i = list.indexOf(this); if (i >= 0) list.splice(i, 1); } };
    (w.ctx.AnimatedPictureManager._animatedPictures = w.ctx.AnimatedPictureManager._animatedPictures || []).push(picture);
    return picture;
};
const tick = (w, n = 1) => frames(w, n);
const originOf = w => { const c = center(w); return { x: c.x, y: c.y }; };

test("登録: apollo_golden.* と apollo_gigas.* だけ axisScale。従来の apollo_volley.* と他のキーは従来どおり(axisScaleなし)", () => {
    const w = world();
    for (const key of ["apollo_golden.beam", "apollo_golden.beamlane", "apollo_gigas.beam", "apollo_gigas.beamlane"]) assert.equal(vfx(w).mapping(key).axisScale, true, key);
    for (const key of vfx(w).keys().filter(k => !/^apollo_(golden|gigas)\.beam/.test(k))) assert.notEqual(vfx(w).mapping(key).axisScale, true, key);
    assert.equal(vfx(w).mapping("apollo_volley.beam").axisScale, undefined);
});

test("短い区間(長さ < 区間): 幅を戻す予約が1つ入り、絵が登録されたら幅(x)は元のまま・長さ(y)だけが縮んだ値になる。予約は消える", () => {
    const w = world();
    const origin = originOf(w);
    const r = vfx(w).play("apollo_golden.beam", { degree: 90, length: 0.6, instance: "t1", origin });
    assert.equal(r.ok, true); assert.equal(plain(r).segments, 1);
    assert.equal(diag(w).pendingScales, 1, "幅を戻す予約");
    const note = plain(r).notes[0];
    const pic = fakePicture(w, note, 0.2); // 一様拡縮で作られた(x, y とも 0.6/3 = 0.2)
    tick(w);
    assert.equal(pic.sprite.scale.x, 1, "幅は元の100%");
    assert.ok(Math.abs(pic.sprite.scale.y - 0.2) < 1e-9, "長さは 0.6 / 3 = 0.2: " + pic.sprite.scale.y);
    assert.equal(diag(w).pendingScales, 0, "反映したら予約は消える");
});

test("1マス未満(0.3 / 0.05マス): 幅は3マス分(x = 1)のまま、長さだけが 0.1 / 0.0167 → 下限 0.005 より小さくならない", () => {
    const w = world();
    const origin = originOf(w);
    for (const [length, wantY] of [[0.3, 0.1], [0.05, 0.05 / 3]]) {
        const r = vfx(w).play("apollo_golden.beam", { degree: 45, length, instance: "t" + length, origin });
        const pic = fakePicture(w, plain(r).notes[0], 0.01);
        tick(w);
        assert.equal(pic.sprite.scale.x, 1);
        assert.ok(Math.abs(pic.sprite.scale.y - wantY) < 1e-9, `${length}マス: ${pic.sprite.scale.y}`);
        pic.dispose();
    }
    const r = vfx(w).play("apollo_golden.beam", { degree: 0, length: 0.001, instance: "tiny", origin });
    const pic = fakePicture(w, plain(r).notes[0], 0.01); tick(w);
    assert.equal(pic.sprite.scale.y, 0.005, "下限");
});

test("通常の長さ(>= 区間)・レーン(2マス区間)・従来のキー: 通常の長さは予約なし。レーンは短いとき予約あり(幅1マス分 x = 1)。従来の apollo_volley.beam は短くても従来の一様拡縮のまま", () => {
    const w = world();
    const origin = originOf(w);
    vfx(w).play("apollo_golden.beam", { degree: 90, length: 3, instance: "full", origin });
    vfx(w).play("apollo_golden.beam", { degree: 90, length: 20, instance: "long", origin });
    assert.equal(diag(w).pendingScales, 0, "区間以上は拡縮しない");
    const lane = vfx(w).play("apollo_gigas.beamlane", { degree: 90, length: 0.7, lateral: 1, instance: "lane", origin });
    assert.equal(diag(w).pendingScales, 1);
    const pic = fakePicture(w, plain(lane).notes[0], 0.35); tick(w);
    assert.equal(pic.sprite.scale.x, 1); assert.ok(Math.abs(pic.sprite.scale.y - 0.35) < 1e-9, "0.7 / 2 = 0.35");
    pic.dispose();
    const before = diag(w).pendingScales;
    vfx(w).play("apollo_volley.beam", { degree: 90, length: 0.6, instance: "legacy", origin });
    assert.equal(diag(w).pendingScales, before, "従来のキーは予約しない");
});

test("後片付け: 予約は最長120frameで消える(絵が出なくても溜まらない)。stop(note) と clear() で予約も消える", () => {
    const w = world();
    const origin = originOf(w);
    const r1 = vfx(w).play("apollo_golden.beam", { degree: 90, length: 0.6, instance: "a", origin });
    const r2 = vfx(w).play("apollo_golden.beam", { degree: 90, length: 0.5, instance: "b", origin });
    assert.equal(diag(w).pendingScales, 2);
    vfx(w).stop(plain(r1).notes[0]);
    assert.equal(diag(w).pendingScales, 1, "stop で予約も消える");
    tick(w, 125);
    assert.equal(diag(w).pendingScales, 0, "絵が登録されなくても120frameで消える");
    vfx(w).play("apollo_golden.beam", { degree: 90, length: 0.4, instance: "c", origin });
    assert.equal(diag(w).pendingScales, 1);
    vfx(w).clear();
    assert.equal(diag(w).pendingScales, 0, "clear で全部消える");
    void r2;
});

test("黄金の矢・ギガース殺し: 3帯とも壁のすぐ前(0.5マス)でも、1回の再生(長さ0.5 < 区間3)で予約が入り、帯が違う長さのときは帯ごと。判定の長さ = 絵の長さ。向きは横・縦・斜め", () => {
    for (const [card, key, fire] of [["apollo_golden_volley", "apollo_golden", "hold"], ["apollo_gigas_slayer", "apollo_gigas", "tap"]]) {
        for (const [degree, aimX, aimY] of [[90, 3, 0], [0, 0, -3], [45, 3, -3]]) {
            const w = cardWorld(card, { level: 3, bigMap: { width: 80, height: 80 }, x: 40, y: 40 });
            parkOthers(w, []);
            for (const id of [3, 4, 5, 6]) placeEnemy(w, id, 2 + id, 78);
            const c = center(w), r = degree * Math.PI / 180, ux = Math.sin(r), uy = -Math.cos(r), nx = -uy, ny = ux;
            for (const l of [-1, 0, 1]) setRegion(w, Math.floor(c.x + ux * 0.75 + nx * l), Math.floor(c.y + uy * 0.75 + ny * l), 255);
            const pv = vfx(w), plays = [], play = pv.play;
            pv.play = (...a) => { const res = play.apply(pv, a); plays.push({ key: a[0], ctx: a[1] || {}, result: plain(res) }); return res; };
            aimDegree(w, degree, 3);
            player(w).center(player(w)._realX, player(w)._realY);
            if (fire === "hold") { const [code, kc] = KEYS.Q; w.keyDown(code, kc); frames(w, 40); w.keyUp(code, kc); frames(w, 2); } else { fireCard(w, card); frames(w, 31); }
            const beamPlays = plays.filter(p => p.key.startsWith(key + ".beam"));
            assert.ok(beamPlays.length >= 1, `${card} ${degree}°`);
            for (const p of beamPlays) assert.ok(p.ctx.length > 0 && p.ctx.length < (p.key.endsWith("lane") ? 2 : 3), `${card} ${degree}°: 短い区間 ${p.ctx.length}`);
            const g = w.ctx.ProjectRApolloGoldenVolley.geometry.buildLanes({ x: c.x, y: c.y }, degree, 3, 200);
            for (const p of beamPlays) {
                const lane = p.key.endsWith("lane") ? g.find(l => Math.abs(l.center - p.ctx.lateral) < 1e-9) : null;
                const limit = lane ? lane.limit : Math.max(...g.map(l => l.limit));
                assert.ok(Math.abs(p.ctx.length - Math.min(limit, 46)) < 1e-6 || p.ctx.length <= limit + 1e-6, `${card} ${degree}°: 絵の長さ ${p.ctx.length} は判定の長さ ${limit} まで`);
            }
            assert.ok(diag(w).pendingScales >= 1, `${card} ${degree}°: 幅を戻す予約 ${diag(w).pendingScales}`);
            frames(w, 130);
            assert.equal(diag(w).pendingScales, 0, "予約が残らない");
            assert.deepEqual(plain(pv.diagnostics().activeKeys).filter(k => /beam|charge/.test(k)), [], "続くVFXが残らない");
            assert.equal(w.ctx.ProjectRGodSummonVisual.getAnchors().length, 0);
        }
    }
});

console.log(`\n${passed} Apollo A12 short beam tests passed`);
