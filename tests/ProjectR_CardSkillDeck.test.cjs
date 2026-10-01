"use strict";
const { test } = require("node:test");
test("Phase32 reshuffle snapshot includes just-used card before draw and exact counts",()=>{
    const h=phase2(); h.earth.hp=h.pluto.hp=1e9;
    for(let n=0;n<26;n++){h.api.setEnergy(10);h.api.useSlot(0);h.flush();}
    const t=clone(h.api.debugSnapshot().piles);
    assert.deepEqual(t.map(v=>[v.stage,v.hand,v.draw,v.discard]),[
        ["Before Use",5,0,25],["After Discard",4,0,26],["RESHUFFLE",4,26,0],["After Draw",5,25,0]]);
});
test("Phase32 ENERGY MAX only modifies energy; pointer does not activate arena",()=>{
    const h=phase2(),s=h.c.SceneManager._scene;s.createDisplayObjects();
    const before=clone(h.api.debugPiles());h.api.setEnergy(1);
    const b=s._projectRCardEnergyButton;b.update();
    const e=h.key("mousedown",null,false,{button:0,pageX:b.x+5,pageY:b.y+5});
    assert.equal(h.api.energy(),10);assert.deepEqual(clone(h.api.debugPiles()),before);
    assert.equal(e.stopped,true);assert.equal(h.logs.transfer,undefined);
});
test("Phase32 production has no ENERGY MAX or debug piles",()=>{
    const h=boot({debug:false});h.c.SceneManager._scene.createDisplayObjects();
    assert.equal(h.c.SceneManager._scene._projectRCardEnergyButton,undefined);assert.equal(h.api.debugPiles(),null);
});
test("Phase32 Sword debug graphics expires at official Swing duration",()=>{
    const h=phase2([158],{officialCollision:true,officialHp:true,realMain:true,parameters:{ShowDebugOverlay:"true"}});
    h.logs.weaponType="sword";let g;
    h.c.PIXI={Graphics:class extends h.c.Sprite { constructor(){super();g=this;} lineStyle(){} drawRect(...args){this.rect=args;} destroy(){this.destroyed=true;} }};
    h.enemy(77,1.25,0,"<enemy>");runCommon(h,4);
    assert.ok(g?.rect);h.tick(15);assert.equal(g.destroyed,true);
});
test("Phase32 Mouse/VFX diagnostic snapshots; presentation angles unchanged",async()=>{
    const h=phase2([164],{assets:true});h.logs.aimDegrees=90;h.c.TouchInput.x=200;h.c.TouchInput.y=0;
    h.api.useSlot(0);h.flush();await new Promise(r=>setImmediate(r));
    const trace=h.api.debugTrace(),m=trace.find(t=>t.message==="Mouse diagnostic");
    assert.equal(m.projectileAngle,90);assert.equal(m.unit,"degrees");
    for(const message of ["VFX request","VFX accepted","VFX sprite created","VFX submitted"])assert.ok(trace.some(t=>t.message===message),message);
});
test("Phase32 Sword real HP storage destination: two targets damage, single ENERGY",()=>{
    const h=swordCase(),a=h.enemy(2,1.25,0,"<enemy>"),b=h.enemy(9,1.25,.3,"<enemy>"),bar=officialStoredHp(h);
    runCommon(h,4);assert.equal(bar(a).currentHp,986);assert.equal(bar(b).currentHp,986);assert.equal(h.api.energy(),6);
});
const angleNear=(a,b)=>assert.ok(Math.abs(((a-b+540)%360)-180)<1e-7,`angle ${a} / ${b}`);
function mousePoint(h, degrees) {
    const rad=degrees*Math.PI/180;h.c.TouchInput.x=h.c.$gamePlayer.screenX()+200*Math.sin(rad);h.c.TouchInput.y=h.c.$gamePlayer.screenY()-200*Math.cos(rad);
}
for(const id of [164,165]) for(const angle of [0,45,90,135,180,225,270,315,30,120,359.9]) test(`Phase33 Mouse ${id} ${angle} degrees immutable no nearest snap`,()=>{
    const h=phase2([id]);mousePoint(h,angle);h.api.useSlot(0);
    const context=h.api.currentContext?.() || h.api.debugSnapshot(); // Actual context is observed on projectile after CE.
    h.c.TouchInput.x=-900;h.c.TouchInput.y=900;h.flush();
    const p=h.projectiles()[0],action=h.api.projectileContext(p);
    angleNear(p._rotation,angle);angleNear(action.aimAngle,angle);assert.equal(action.aimSource,"mouse");assert.equal(action.targetEventId,0);assert.ok(Object.isFrozen(action));
    h.tick();angleNear(p._rotation,angle);
});
for(const direction of [2,4,6,8]) test(`Phase33 cursor coincidence fallback ${direction}`,()=>{
    const h=phase2([164]);h.c.$gamePlayer.direction=()=>direction;
    h.c.TouchInput.x=h.c.$gamePlayer.screenX();h.c.TouchInput.y=h.c.$gamePlayer.screenY();h.api.useSlot(0);h.flush();
    const p=h.projectiles()[0];assert.equal(p._rotation,{2:180,4:270,6:90,8:0}[direction]);assert.equal(h.api.projectileContext(p).aimSource,"facing");
});
for(const id of [164,165]) for(const scroll of [0,14.25]) test(`Phase33 scroll fractional real coordinates ${id} ${scroll}`,()=>{
    const h=phase2([id]),p=h.c.$gamePlayer;p._realX=29.375;p._realY=19.625;
    p.screenX=()=> (p._realX-scroll)*48+24;p.screenY=()=> (p._realY-scroll)*48+48;
    mousePoint(h,120);h.api.useSlot(0);h.flush();angleNear(h.projectiles()[0]._rotation,120);
});
for(const id of [164,165]) for(const active of [true,false]) test(`Phase33 official gamepad helper ${id} active ${active}`,()=>{
    const h=phase2([id],{officialAim:true});mousePoint(h,30);h.logs.stick=active?{x:-.8,y:.8}:null;
    h.c.checkGamepad=()=>true;h.api.useSlot(0);h.flush();const p=h.projectiles()[0],c=h.api.projectileContext(p);
    angleNear(p._rotation,active?225:30);assert.equal(c.aimSource,active?"gamepad":"mouse");
});
test("Phase33 independent frozen projectile contexts",()=>{
    const h=phase2([164,165]);mousePoint(h,30);h.api.useSlot(0);h.flush();const a=h.projectiles()[0];
    mousePoint(h,225);h.api.useSlot(1);h.flush();const b=h.projectiles().find(p=>p!==a);mousePoint(h,120);h.tick();
    angleNear(a._rotation,30);angleNear(b._rotation,225);assert.notEqual(h.api.projectileContext(a).actionId,h.api.projectileContext(b).actionId);
});
function installRealVfxPosition(h) {
    const c=h.c,as=fs.readFileSync(path.join(root,"js/plugins/Hendrix_Animation_Solution.js"),"utf8");
    const cls=as.slice(as.indexOf("  class AnimatedPicture {"),as.indexOf("  Spriteset_Map.prototype.findCharacterSprite"));
    c.Imported={Hendrix_Action_Engine:true};c.$gameMap.displayX=()=>0;c.$gameMap.displayY=()=>0;
    const Picture=vm.runInContext("("+cls.trim()+")",c);
    c.PluginManager.registerCommand("Hendrix_Animation_Solution","showAnimatedPicture",function(args){
        const pos=JSON.parse(args.positionSettings),p=Object.create(Picture.prototype),target=pos.eventId==="player"?c.$gamePlayer:c.$gameMap.event(Number(pos.eventId));
        Object.assign(p,{note:args.note,target,initialSpriteWidth:72,initialSpriteHeight:72,offsetX:0,offsetY:0,lastKnownX:null,lastKnownY:null,
            stickMode:pos.stickMode==="true",rotation:Number(JSON.parse(args.transformSettings).rotation)*Math.PI/180,
            sprite:{x:0,y:0,rotation:0},targetSprite:{x:target.screenX(),y:target.screenY(),rotation:0,scale:{x:1,y:1},width:72,height:72}});
        p.dispose=function(){this.disposed=true;};c.SceneManager._scene.addAnimatedPicture(p);p.updatePosition();
    });
}
for(const angle of [0,30,90,120,225,359.9]) test(`Phase33 actual AS position follows trail and rotation never doubles ${angle}`,async()=>{
    const h=phase2([164],{assets:true});installRealVfxPosition(h);mousePoint(h,angle);h.api.useSlot(0);h.flush();
    await new Promise(r=>setImmediate(r));const p=h.projectiles()[0],fx=h.logs.effects.find(e=>e.target===p);
    assert.ok(fx);assert.equal(fx.stickMode,false);
    fx.targetSprite.rotation=angle*Math.PI/180;fx.targetSprite.x+=50;fx.updatePosition();
    angleNear(fx.sprite.rotation*180/Math.PI,angle);near(fx.sprite.x,fx.targetSprite.x);
    const launch=h.logs.effects.find(e=>e.target===h.c.$gamePlayer);assert.equal(launch.stickMode,true);
});
for(const reason of ["range","transfer","combat","wall"]) test(`Phase33 trail owned cleanup ${reason}`,async()=>{
    const h=phase2([164],{assets:true});installRealVfxPosition(h);mousePoint(h,0);h.api.useSlot(0);h.flush();await new Promise(r=>setImmediate(r));
    const p=h.projectiles()[0],fx=h.logs.effects.find(e=>e.target===p);
    if(reason==="combat")h.api.endCombat();
    else if(reason==="transfer"){h.c.$gameMap.setup(2);h.tick();}
    else if(reason==="range"){p._realY=-100;h.tick();}
    else {h.enemy(77,p._realX,p._realY,"<destroyProjectile>");h.tick();}
    assert.equal(fx.disposed,true);
});
test("Phase33 registry nine complete stages and existing assets only",()=>{
    const h=boot();for(const e of Object.values(h.api.testVfxRegistry))for(const phase of ["launch","trail","impact"]){
        assert.ok(Object.isFrozen(e[phase]));assert.ok(["Electric_Dash_Line","Fire_Disc_Burst","Smoke_Impact"].includes(e[phase].file));
    }
    assert.equal(Object.keys(h.api.testVfxRegistry).length,9);
});
test("Phase33 simultaneous VFX cleanup keeps other bullet trail",async()=>{
    const h=phase2([164,165],{assets:true});installRealVfxPosition(h);mousePoint(h,0);h.api.useSlot(0);h.flush();await new Promise(r=>setImmediate(r));
    const a=h.projectiles()[0];mousePoint(h,180);h.api.useSlot(1);h.flush();await new Promise(r=>setImmediate(r));const b=h.projectiles().find(p=>p!==a);
    const fa=h.logs.effects.find(f=>f.target===a),fb=h.logs.effects.find(f=>f.target===b);
    h.api.destroyCardProjectile(a);assert.equal(fa.disposed,true);assert.notEqual(fb.disposed,true);assert.notEqual(fa.note,fb.note);
});
test("Phase33 collision immune still shows impact without ENERGY",async()=>{
    const h=phase2([158],{assets:true});h.logs.baseDamage=0;h.api.useSlot(0);h.flush();h.tick(8);await new Promise(r=>setImmediate(r));
    assert.equal(h.earth.hp,10000);assert.ok(h.logs.effects.some(e=>e.target===h.earth));assert.equal(h.api.energy(),9);
});
test("Phase33 missing assets safe and frozen aim still fires",async()=>{
    const h=phase2([164],{assets:false});mousePoint(h,45);h.api.useSlot(0);h.flush();await new Promise(r=>setImmediate(r));
    assert.equal(h.logs.images.length,0);assert.equal(h.logs.effects.length,0);angleNear(h.projectiles()[0]._rotation,45);
});
for(const axes of [[0.05,0.05],[-0.8,0.8]]) test(`Phase33 actual official right-stick deadzone ${axes}`,()=>{
    const h=phase2([165],{officialAim:true}),c=h.c;mousePoint(h,30);
    c.navigator={getGamepads:()=>[{connected:true,axes:[0,0,...axes]}]};
    const tail=engineSource.slice(engineSource.indexOf("window.checkGamepadInput = function"));
    vm.runInContext(tail.slice(0,/\r?\n\};/.exec(tail).index+4),c);
    h.api.useSlot(0);h.flush();const p=h.projectiles()[0];
    angleNear(p._rotation,axes[0]===0.05?30:225);
});
test("Phase33 debug angle difference wraps 359.9 to 0.1",()=>{
    const h=phase2([164]),c=h.c,original=c.PluginManager._commands["Hendrix_Action_Engine:spawnEventHitbox"];
    c.PluginManager.registerCommand("Hendrix_Action_Engine","spawnEventHitbox",function(args){
        const id=original.call(this,args);c.$gameMap.event(id)._applyRotation=function(){this._rotation=0.1;};return id;
    });
    mousePoint(h,359.9);h.api.useSlot(0);h.flush();near(h.api.debugSnapshot().aim.difference,0.2);
});
function officialStoredHp(h, hp = 996) {
    const c = h.c;
    c.$gameVariables._data = {};
    c.SceneManager._scene._spriteset ||= {};
    c.SceneManager._scene._spriteset._eventHpBars = [];
    for (const e of c.$gameMap.events().filter(e => e.databaseEnemy)) {
        e.hpStorageId = e.eventId() + 1000;
        c.$gameVariables._data[e.hpStorageId] = hp;
        c.SceneManager._scene._spriteset._eventHpBars.push({ _event:e, currentHp:hp, targetHp:hp, _hpChangeDuration:10, refresh() {} });
    }
    for (const key of ["Game_Map.prototype.getCurrentEventHp", "Game_Interpreter.prototype.updateEventHp"]) {
        const tail = engineSource.slice(engineSource.indexOf(key + " = function"));
        vm.runInContext(tail.slice(0, /\r?\n\};/.exec(tail).index + 4), c);
    }
    return e => c.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === e);
}
test("Phase32 real AE HP storage lag: Gun damage confirmed synchronously", () => {
    const h=realGun(), bar=officialStoredHp(h); h.bullet._realX=1;
    runCommon(h,3,40);
    assert.equal(bar(h.earth).currentHp,986);
    assert.equal(h.c.$gameMap.getCurrentEventHp(40),996,"official storage is not yet synchronized");
    assert.equal(h.api.energy(),6);
    const trace=h.api.debugTrace();
    const before=trace.find(t=>t.message==="Before UpdateEventHp"), after=trace.find(t=>t.message==="After UpdateEventHp");
    assert.equal(before.frame,after.frame); assert.equal(after.hp,986); assert.equal(after.storedHp,996);
    assert.ok(trace.some(t=>t.message==="CE3 start")); assert.ok(trace.some(t=>t.message==="CE3 end"));
    assert.equal(trace.find(t=>t.message==="Collision").frame,before.frame);
    assert.equal(h.api.lastDebugResult().projectileId,h.bullet.eventId());
});
test("Phase32 real AE HP storage lag: zero damage remains +0", () => {
    const h=realGun(); officialStoredHp(h); h.bullet._realX=1; h.c.MaithlCalculateDamagePlayerWeapon=()=>0;
    runCommon(h,3,40); assert.equal(h.api.energy(),5);
});
test("Phase32 real AE HP storage lag: Mercury actual damage but no ENERGY", () => {
    const h=phase2([158],{officialHp:true}), bar=officialStoredHp(h,10000); const before=h.api.energy();
    h.api.useSlot(0); h.flush(); h.tick(12);
    assert.ok(bar(h.earth).currentHp<10000);
    assert.equal(h.c.$gameMap.getCurrentEventHp(40),10000);
    assert.equal(h.api.energy(),before-h.api.metadata(158).cost);
    assert.ok(h.api.debugTrace().some(t=>t.message==="Card after UpdateEventHp" && t.damage>0));
});
function swordCase(direction=6) {
    const h=phase2([158],{officialCollision:true,officialHp:true,realMain:true});
    h.logs.weaponType="sword"; h.earth._realX=20; h.pluto._realX=20;
    h.c.$gamePlayer.direction=()=>direction; h.api.setEnergy(5);
    return h;
}
for(const direction of [2,4,6,8]) for(const id of [1,2,9,77]) test(`Phase32 Sword direction ${direction} enemy ${id}`,()=>{
    const h=swordCase(direction), dx=direction===6?1.25:direction===4?-1.25:0, dy=direction===2?1.25:direction===8?-1.25:0;
    const e=h.enemy(id,dx,dy,"<enemy>"); runCommon(h,4);
    assert.equal(e.hp,90); assert.equal(h.api.energy(),6);
    const s=h.api.debugSnapshot().sword; assert.ok(s.detected.includes(id));
    near(s.width, direction===2||direction===8?2.025:1.62); near(s.height,direction===2||direction===8?1.62:2.025);
});
for(const direction of [2,4,6,8]) test(`Phase32 Sword rear excluded ${direction}`,()=>{
    const h=swordCase(direction), x=direction===6?-1:direction===4?1:0, y=direction===2?-1:direction===8?1:0;
    const e=h.enemy(77,x,y,"<enemy>"); runCommon(h,4); assert.equal(e.hp,100); assert.equal(h.api.energy(),5);
});
for(const invalid of ["nonenemy","erased","dead","farSide"]) test(`Phase32 Sword rejects ${invalid}`,()=>{
    const h=swordCase(), e=h.enemy(77,1.25,invalid==="farSide"?4:0,invalid==="nonenemy"?"":"<enemy>");
    if(invalid==="erased")e._erased=true; if(invalid==="dead")e.hp=0;
    const hp=e.hp;runCommon(h,4);assert.equal(e.hp,hp);assert.equal(h.api.energy(),5);
});
test("Phase32 Sword two enemies one damage each, one ENERGY, repeated resolve inert",()=>{
    const h=swordCase(),a=h.enemy(2,1.25,0,"<enemy>"),b=h.enemy(9,1.25,.3,"<enemy>");
    const list=h.c.$dataCommonEvents[4].list, resolve=list.find(v=>v.code===357 && v.parameters[1]==="ResolveSwordHitbox");
    list.splice(list.length-1,0,clone(resolve)); // Repeat within the same live interpreter/swing.
    const i=runCommon(h,4);h.c.PluginManager.callCommand(i,"ProjectR_CardSkillDeck","ResolveSwordHitbox",{});
    assert.equal(a.hp,90);assert.equal(b.hp,90);assert.equal(h.api.energy(),6);
});
test("Phase32 Sword widened side range hits within new width",()=>{
    const h=swordCase(),e=h.enemy(77,1.25,1.15,"<enemy>");runCommon(h,4);assert.equal(e.hp,90);
});
for(const uses of [26,27,51,52,76,77,101,130]) test(`Phase32 runtime reshuffle ${uses} uses preserves exact 30-card multiset`,()=>{
    const h=phase2();h.earth.hp=h.pluto.hp=1e9;
    const original=clone(h.api.getDeck()).sort((a,b)=>a-b);
    for(let n=0;n<uses;n++){
        h.api.setEnergy(10);assert.equal(h.api.useSlot(n%5).ok,true);h.flush();
        const p=h.api.debugPiles();
        assert.equal(p.hand.length,5);
        assert.deepEqual(clone([...p.hand,...p.draw,...p.discard]).sort((a,b)=>a-b),original);
    }
    assert.ok(h.api.debugTrace().some(t=>t.message==="Pile"));
});
// Node only: no MZ launch, database writes, generated images or real save I/O.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "js/plugins/ProjectR_CardSkillDeck.js"), "utf8");
// Real MZ interpreter lifecycle with stubbed game objects verifies CE ownership,
// wait, child execution and clear/reuse without oversimplifying those semantics.
const objects = fs.readFileSync(path.join(root, "js/rmmz_objects.js"), "utf8");
const interpreterSource = objects.slice(objects.indexOf("function Game_Interpreter()"));
// Use the actual MZ scroll/select/command windows. Only rendering and devices
// are stubbed: superclass initialization must really call deactivate/reselect.
const windows = fs.readFileSync(path.join(root, "js/rmmz_windows.js"), "utf8");
const selectableSource = windows.slice(windows.indexOf("function Window_Scrollable()"), windows.indexOf("function Window_Help()"));
const engineSource = fs.readFileSync(path.join(root, "js/plugins/Hendrix_Action_Engine.js"), "utf8");
const dotSource = fs.readFileSync(path.join(root, "js/plugins/DotMoveSystem.js"), "utf8");
const dotPointSource = dotSource.slice(dotSource.indexOf("class DotMovePoint {"), dotSource.indexOf("DotMoveSystem.DotMovePoint = DotMovePoint;"));
const hpCommandSource = engineSource.slice(engineSource.indexOf('PluginManager.registerCommand(HpluginName, "UpdateEventHp"'),
    engineSource.indexOf('PluginManager.registerCommand(HpluginName, "UpdatePlayerHp"'));
function officialCommand(name) {
    const start = engineSource.indexOf(`PluginManager.registerCommand(HpluginName, "${name}"`);
    const tail = engineSource.slice(start), end = /\r?\n\}\);/.exec(tail);
    assert.ok(start >= 0 && end); return tail.slice(0, end.index + end[0].length);
}
const clone = v => JSON.parse(JSON.stringify(v));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const script = text => ({ code: 355, indent: 0, parameters: [text] });
const wait = n => ({ code: 230, indent: 0, parameters: [n] });
const end = { code: 0, indent: 0, parameters: [] };

function boot(options = {}) {
    const logs = { warnings: [], sounds: [], commands: [], images: [], pushes: [], normal: 0, saved: 0, bitmaps: 0, draws: 0,
        debug: [], hpUpdates: [], fills: [], effects: [], damageSkills: [], assetChecks: [] };
    logs.presence = options.presence ?? true;
    const listeners = new Map();
    const document = { addEventListener(type, fn, capture) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push({ fn, capture: !!capture });
    } };
    class Bitmap {
        constructor(w, h) { this.width = w; this.height = h; this.text = []; logs.bitmaps++; }
        clear() { this.text = []; logs.draws++; }
        drawText(text) { this.text.push(text); }
        fillRect(...args) { logs.fills.push(args); } clearRect() {} gradientFillRect() {} strokeRect() {} blt() {} isReady() { return true; }
        addLoadListener(fn) { fn(); } destroy() { this.destroyed = true; }
        resize(w, h) { this.width = w; this.height = h; } isError() { return false; }
    }
    class Sprite {
        constructor(...args) { this.initialize(...args); }
        initialize(bitmap) {
            this.bitmap = bitmap; this.children = []; this.visible = true; this.x = 0; this.y = 0;
            this.scale = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y; } };
            this.anchor = { x: 0, y: 0, set(x, y = x) { this.x = x; this.y = y; } }; this.position = { set: (x,y) => { this.x=x; this.y=y; } };
        }
        setFrame() {} hide() { this.visible = false; this._hidden = true; } show() { this.visible = true; this._hidden = false; }
        addChild(c) { this.children.push(c); c.parent = this; return c; }
        removeChild(c) { this.children = this.children.filter(v => v !== c); c.parent = null; }
        addChildAt(c, i) { this.children.splice(i, 0, c); return c; }
        update() { this.children.forEach(c => c.update?.()); }
        destroy() { this.children.forEach(c => c.destroy?.()); }
    }
    class Point { constructor(x, y) { Object.assign(this, { x, y }); } }
    class Rectangle {
        constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); }
        contains(x, y) { return x >= this.x && y >= this.y && x < this.x + this.width && y < this.y + this.height; }
        enlarge(rect) {
            const right = Math.max(this.x + this.width, rect.x + rect.width), bottom = Math.max(this.y + this.height, rect.y + rect.height);
            this.x = Math.min(this.x, rect.x); this.y = Math.min(this.y, rect.y);
            this.width = right - this.x; this.height = bottom - this.y;
        }
    }
    class Window_Base extends Sprite {
        constructor(rect) { super(rect); }
        initialize(rect) {
            Sprite.prototype.initialize.call(this);
            Object.assign(this, rect); this.children = []; this.visible = true; this.active = false; this.padding = 12;
            this.innerWidth = rect.width - 24; this.innerHeight = rect.height - 24;
            this.innerRect = new Rectangle(12, 12, this.innerWidth, this.innerHeight); this.origin = new Point(0, 0);
            this.worldTransform = { applyInverse: p => new Point(p.x - this.x, p.y - this.y) };
            this.contents = new Bitmap(this.innerWidth, this.innerHeight); this.contentsBack = new Bitmap(this.innerWidth, this.innerHeight);
            this._cursorRect = new Rectangle(0, 0, 0, 0);
        }
        drawText(...args) { this.contents.drawText(...args); }
        drawIcon() {} resetTextColor() {} changeTextColor() {} changePaintOpacity(value) { (logs.paint ||= []).push(value); }
        activate() { this.active = true; } deactivate() { this.active = false; }
        isOpen() { return true; } update() {} moveInnerChildrenBy() {}
        itemHeight() { return 36; } lineHeight() { return 36; } itemPadding() { return 8; }
        setCursorRect(x, y, width, height) {
            assert.ok([x, y, width, height].every(Number.isFinite), "cursor coordinates must be finite");
            this._cursorRect = new Rectangle(x, y, width, height);
        }
        moveCursorBy(x, y) { this._cursorRect.x += x; this._cursorRect.y += y; }
        playCursorSound() { logs.sounds.push("cursor"); } playOkSound() { logs.sounds.push("ok"); }
        playBuzzerSound() { logs.sounds.push("buzzer"); }
    }
    class Scene_Base extends Sprite { isActive() { return this.active !== false; } create() {} start() {} terminate() {} }
    class Scene_MenuBase extends Scene_Base {
        addWindow(w) { this.addChild(w); } popScene() { logs.popped = true; }
    }
    class Scene_Map extends Scene_Base {
        constructor() {
            super();
            this._spriteset = { _characterSprites: [], _tilemap: new Sprite(),
                refreshEventHpBars() {},
                findCharacterSprite: target => target && !logs.spriteNotReady ? { bitmap: { isReady: () => true } } : null };
        }
        addAnimatedPicture(picture) { logs.effects.push(picture); }
        createDisplayObjects() {
            if (options.realBattle) return; // The real BattleHUD creates its own manager and slots.
            this._projectRBattleHudLayer = new Sprite();
            for (const name of ["_skillHUD", "_playerHUD", "_weaponHUD", "_ultimateHUD", "_statusHUD"]) this._projectRBattleHudLayer[name] = new Sprite();
            context.ProjectR.BattleHUD._manager = this._projectRBattleHudLayer;
            this.addChild(this._projectRBattleHudLayer);
        }
        updateSlotInputs() { logs.normal++; }
        update() { super.update(); this.updateSlotInputs(); }
        shouldAutosave() { return true; }
    }
    class Menu extends Scene_Base {
        constructor() { super(); this._index = 0; }
        confirm() { logs.normal++; } consumeInput() { logs.consumed = (logs.consumed || 0) + 1; }
    }
    class Game_System {
        initialize() {} isSaveEnabled() { return true; } mainFontFace() { return "sans-serif"; }
    }
    class Game_Map {
        constructor() { this._events = []; this._id = 1; this._mapId = 1; this.scans = 0; }
        mapId() { return this._id; } setup(id) { this._id = id; }
        events() { this.scans++; return this._events.filter(Boolean); } event(id) { return this._events[id]; }
        getCurrentEventHp(id) { return this.event(id)?.hp || 0; }
        width() { return 60; } height() { return 40; }
        tileWidth() { return 48; } tileHeight() { return 48; } refreshIfNeeded() {}
        canvasToMapX(x) { return x / 48; } canvasToMapY(y) { return y / 48; }
        deltaX(a, b) { let d = a - b; if (this.loopX && Math.abs(d) > 30) d += d < 0 ? 60 : -60; return d; }
        deltaY(a, b) { return a - b; }
        isEventRunning() { return this.busy || this._interpreter.isRunning(); }
        unlock() {} eraseEvent() {}
        getNextEventId() { let id = 1; while (this._events[id]) id++; return id; }
        addEventToTagIndex() {} removeEventFromTagIndex(event) { logs.removedTag = event; }
        hitboxesAreColliding(ax, ay, a, bx, by) { return !logs.forceMiss && Math.hypot(ax - bx, ay - by) < 20; }
        isValid(x, y) { return x >= -30 && x < 60 && y >= -30 && y < 40; }
        spawnEvent(id, x = 0, y = 0) { return makeProjectile(this, options.realMain ? context.$dataTemplateMap.events[id].note : "<weaponAttack>", x, y).eventId(); }
        unspawnEvent(id) { this._events[id] = null; }
        update() {
            for (const e of this._events.filter(Boolean)) if (e.route && e.travelled < e.range) {
                const step = e.speed === 7 ? 0.25 : 0.125, rad = e._rotation * Math.PI / 180;
                e._realX += Math.sin(rad) * step; e._realY -= Math.cos(rad) * step; e.travelled += step;
            }
        }
    }
    class Game_Event {
        get _x() { return this._realX; } get _y() { return this._realY; }
        screenX() { return this._realX * 48; } screenY() { return this._realY * 48; }
        hitboxData() { return { width: 0.3, height: 0.3, offsetX: 0, offsetY: 0 }; }
        getDamageFromNoteTag() { return 0; }
    }
    function makeProjectile(map, note, x, y) {
        const id = map.getNextEventId();
        const e = { _eventId: id, _realX: x, _realY: y, _rotation: 90, travelled: 0,
            eventId: () => id, event: () => ({ note }), positionPoint() { return new context.DotMovePoint(this._realX, this._realY); },
            erase() { this._erased = true; }, removeMapCharactersCache() { logs.removedCache = this; },
            rotateTo(x, y) {
                if (options.officialAim) return context.Game_Character.prototype.rotateTo.call(this, x, y);
                this._rotation = x === "mouse or gamepad" ? (logs.aimDegrees ?? 90) : Math.atan2(x - this._realX, -(y - this._realY)) * 180 / Math.PI;
            },
            setOriginPoint() {}, setCustomRotation() {}, _applyRotation(degrees) { this._rotation = degrees; },
            setMoveSpeed(n) { this.speed = n; }, setImage(name) { this.image = name; }, setPriorityType() {},
            forceMoveRoute(route) { this.route = route; this.range = Number(route.list[0].parameters[0].match(/, ([\d.]+)\)/)[1]); }
        };
        Object.setPrototypeOf(e, Game_Event.prototype); e._pageIndex = -1;
        map._events[id] = e; map.addEventToTagIndex(e); return e;
    }
    const actor = { actorId: () => 1, name: () => "リード", hp: 544, mhp: 544,
        faceName: () => "", faceIndex: () => 0, equips: () => [], states: () => [] };
    const context = vm.createContext({
        console: { warn: t => logs.warnings.push(t), log(...args) { logs.debug.push(args); } }, document,
        Bitmap, Sprite, Point, Rectangle, Window_Base,
        Sprite_Character: class extends Sprite { constructor(event) { super(new Bitmap(32, 32)); this._character = event; } },
        Scene_Base, Scene_MenuBase, Scene_Map, Game_System, Game_Map, Game_Event,
        Graphics: { width: 1920, height: 1080, boxWidth: 1920, boxHeight: 1080, frameCount: 1,
            pageToCanvasX: x => x, pageToCanvasY: y => y },
        TouchInput: {
            x: 0, y: 0, wheelY: 0, isTriggered: () => !!logs.touch, isClicked: () => !!logs.click,
            isHovered: () => !!logs.hover, isCancelled: () => !!logs.touchCancel,
            isReleased: () => !!logs.release, isMoved: () => !!logs.move, isPressed: () => !!logs.touch,
            update() { logs.touch = logs.click = logs.hover = logs.touchCancel = logs.release = logs.move = false; }
        },
        Input: {
            keyMapper: { 70: "ok", 88: "escape" }, keyRepeatInterval: 6,
            isRepeated: symbol => logs.input === symbol, isTriggered: symbol => logs.input === symbol,
            update() { logs.input = null; logs.consumed = (logs.consumed || 0) + 1; }
        },
        SceneManager: { _scene: null, isSceneChanging: () => !!logs.changing, push: cls => logs.pushes.push(cls) },
        SoundManager: Object.fromEntries(["Ok", "Buzzer", "Cursor", "Cancel"].map(s => [`play${s}`, () => logs.sounds.push(s.toLowerCase())])),
        ColorManager: { itemBackColor1: () => "#111", itemBackColor2: () => "#222" },
        ImageManager: { iconWidth: 32, iconHeight: 32, loadSystem(name) { logs.images.push(name); return new Bitmap(512, 512); } },
        PluginManager: {
            _commands: {}, parameters: name => name === "ProjectR_CardSkillDeck" ? ({ EnableDebugCommands: options.debug ? "true" : "false",
                AutoStartCardCombat: "false", AlwaysShowCardHud: "false", ...options.parameters }) : {},
            registerCommand(plugin, name, fn) { this._commands[`${plugin}:${name}`] = fn; },
            callCommand(self, plugin, name, args) { logs.commands.push([plugin, name, args]); return this._commands[`${plugin}:${name}`]?.call(self, args); }
        },
        DataManager: {
            isDatabaseLoaded: () => true, saveGame: async () => { logs.saved++; return 0; },
            extractSaveContents(contents) { context.$gameSystem = contents.system; },
            setupNewGame() { context.$gameSystem = new Game_System(); context.$gameSystem.initialize();
                if(options.newGameDeck) context.$gameSystem._projectRCardSkillDeck.deck = options.newGameDeck.slice(); }
        },
        ProjectR: { BattleHUD: {}, MenuHUD: { Scene: Menu, layout: { commands: ["skill", "ultimate", "item", "save", "load", "system", "title"].map(symbol => ({ symbol })) } } },
        ProjectRCombatPresence: { isCombatActive: () => !!logs.presence },
        $dataSystem: { partyMembers: [1] }, $dataSkills: [null], $dataCommonEvents: [null],
        $gameTemp: { isCommonEventReserved: () => !!logs.reserved }, $gameMessage: { isBusy: () => !!logs.message },
        $gameParty: { leader: () => actor, inBattle: () => false },
        $gameVariables: { setValue(id, value) { logs.variable = [id, value]; } },
        $gameSwitches: { setValue(id, value) { logs.switch = [id, value]; } },
        observed: [], Utils: { isOptionValid: () => false, extractFileName: value => value.split("/").pop() }
    });
    context.CollisionManager = { lastSourceEventId: 0, addCollision() {}, clearCollisions(id) { logs.clearedCollision = id; } };
    context.checkCollide = (targetId, tag) => {
        if (options.officialCollision) {
            const map = context.$gameMap;
            map.tagToEvents = new Map();
            for (const e of map.events()) for (const match of e.event().note.matchAll(/<[^>]+>/g)) {
                if (!map.tagToEvents.has(match[0])) map.tagToEvents.set(match[0], []);
                map.tagToEvents.get(match[0]).push(e);
            }
            return map.taggedEventIsCollidingWithTargetEvent(targetId, tag);
        }
        const target = context.$gameMap.event(Number(targetId));
        if (!target || logs.forceMiss) return false;
        const source = context.$gameMap.events().find(e => e !== target && !e._erased && e.event().note.includes(tag) &&
            Math.hypot(e._realX - target._realX, e._realY - target._realY) < 0.4);
        if (source) source.getDamageFromNoteTag(); // Match the shipped Bullet (no <dmg>, global ID stays stale).
        return !!source;
    };
    context.fetch = async (url, args) => { logs.assetChecks.push([url, args.method]); return { ok: !!options.assets }; };
    context.PermanentImageCache = { load(folder, name) {
        logs.images.push(folder + name); return { isReady: () => !logs.bitmapNotReady, isError: () => !!logs.bitmapError };
    } };
    context.window = context; context.addEventListener = document.addEventListener.bind(document);
    context.DotMovePoint = vm.runInContext(`(() => { ${dotPointSource}; return DotMovePoint; })()`, context);
    vm.runInContext("Number.prototype.clamp = function(min, max) { return Math.min(Math.max(this, min), max); };", context);
    vm.runInContext(selectableSource, context, { filename: "MZ_Window_Selectable.js" });
    vm.runInContext(interpreterSource, context, { filename: "MZ_Game_Interpreter.js" });
    if (options.officialAim) {
        context.Game_Character = function() {}; context.H_DotMoveSystem = true;
        context.checkGamepadInput = () => logs.stick || null; context.checkGamepad = () => !!logs.stick;
        for(const name of["rotateTo","turnToward"]) {
            const tail=engineSource.slice(engineSource.indexOf(`Game_Character.prototype.${name} = function`));
            const match=/\r?\n\};/.exec(tail);
            vm.runInContext(tail.slice(0,match.index+match[0].length),context,{filename:`AE166b_${name}.js`});
        }
    }
    if (options.officialCollision) {
        context.HpluginName = "Hendrix_Action_Engine";
        context.SprocessEnemyAttackTraitsH = () => {};
        vm.runInContext(engineSource.split("\n").find(line => line.includes("['taggedEven'")), context, { filename: "AE166b_real_collision.js" });
    }
    context.Game_Interpreter.prototype.calculateDamageAgainstEvent = function(target, source, skill) {
        logs.baseDamageCalls = (logs.baseDamageCalls || 0) + 1;
        logs.damageSkills.push({ targetId: target?.eventId(), source, skill }); return logs.baseDamage ?? 100;
    };
    context.PluginManager.registerCommand("Hendrix_Action_Engine", "spawnEventHitbox", function(args) {
        logs.hitboxArgs = clone(args);
        const player = context.$gamePlayer;
        const xy = (args.position.includes(',') ? args.position : args.position + ',' + args.position).split(',').map((s, axis) => {
            const match = /player\s*([+-])?\s*([\d.]+)?/.exec(s);
            return (axis ? player._realY : player._realX) + (match?.[2] ? Number(match[2]) * (match[1] === '-' ? -1 : 1) : 0);
        });
        const event = makeProjectile(context.$gameMap, args.notetag, ...xy);
        const match = /<hitbox:\s*([\d.]+),\s*([\d.]+)>/.exec(args.notetag);
        if (match) { const w=Number(match[1]), h=Number(match[2]); event.hitboxData = () => ({width:w,height:h,offsetX:(48-w*48)/2,offsetY:(48-h*48)/2}); }
        return event.eventId();
    });
    context.PluginManager.registerCommand("Hendrix_Action_Engine", "UpdateEventHp", function(args) {
        const target = context.$gameMap.event(args.eventId === "this" ? this._eventId : Number(args.eventId));
        if (target && !logs.immune) { const damage = /player weapon/.test(args.value) ? -10 : Number(args.value);
            target.hp = Math.max(0, target.hp + damage); logs.hpUpdates.push([target.eventId(), damage]); }
    });
    context.PluginManager.registerCommand("Hendrix_Animation_Solution", "showAnimatedPicture", function(args) {
        const picture = { note: args.note, sprite: {}, target: context.$gameMap.event(Number(JSON.parse(args.positionSettings).eventId)) };
        context.SceneManager._scene.addAnimatedPicture(picture);
    });
    if (options.officialHp) {
        context.HpluginName = "Hendrix_Action_Engine";
        context.MaithlCalculateDamagePlayerWeapon = () => 10;
        context.Game_Interpreter.prototype.updateEventHp = function(id, value) {
            const target = context.$gameMap.event(id); target.hp = Math.max(0, target.hp + value); logs.hpUpdates.push([id, value]);
        };
        vm.runInContext(hpCommandSource, context, { filename: "AE166b_UpdateEventHp.js" });
    }
    if (options.realMain) {
        context.HpluginName = "Hendrix_Action_Engine"; context.H_DotMoveSystem = true;
        context.$dataTemplateMap = JSON.parse(fs.readFileSync(path.join(root, "data/Map002.json")));
        context.equippedWeaponType = () => logs.weaponType !== "sword";
        context.equippedWeapon = id => logs.weaponType === "sword" && id === 2;
        context.notetag = () => false; context.gunAmmo = () => 10;
        context.HP = id => context.$gameMap.getCurrentEventHp(id);
        context.AudioManager = { playSe() {} }; context.$gameScreen = { startShake() {} };
        context.$gameActors = { actor: () => actor };
        context.$gameTemp.requestAnimation = () => {};
        const helper = engineSource.slice(engineSource.indexOf("function SspawnEventsShorcutH("));
        vm.runInContext(helper.slice(0, /\r?\n\}/.exec(helper).index + 3), context);
        vm.runInContext(officialCommand("spawnEvent"), context, { filename: "AE166b_real_spawn_command.js" });
    }
    context.$gameMap = new Game_Map(); context.$gameMap._interpreter = new context.Game_Interpreter();
    context.$gameSystem = new Game_System();
    context.$gamePlayer = {
        _realX: 0, _realY: 0, fixed: true,
        screenX() { return this._realX * 48; }, screenY() { return this._realY * 48; },
        x: 0, y: 0, direction: () => 6, forceMoveRoute() {}, isMoveRouteForcing: () => false,
        centerPositionPoint() { return { x: this._realX + 0.5, y: this._realY + 0.5 }; },
        reserveTransfer(...args) { logs.transfer = args; },
        positionPoint() { return { x: this._realX, y: this._realY }; },
        isDirectionFixed() { return this.fixed; }, setDirectionFix(v) { this.fixed = v; },
        setDirection(direction) { logs.playerDirection = direction; },
        turnToward(target, force) {
            if (target === "mouse or gamepad" && !context.ProjectRCombatPresence.isCombatActive()) return;
            if (logs.aimError) throw Error("test aim error");
            logs.aim = { target, force, fixed: this.fixed };
            if(options.officialAim) return context.Game_Character.prototype.turnToward.call(this,target,force);
        }
    };
    context.$dataMapInfos = JSON.parse(fs.readFileSync(path.join(root, "data/MapInfos.json")));
    for (let i = 1; i <= 12; i++) context.$dataSkills[i] = { id: i, name: `Card ${i}`, iconIndex: i,
        note: "<Card><CardCost:2><CardRarity:1><CardAttribute:Mars><CardType:Physical><CardTarget:Mouse><CardActionCE:1>" };
    context.$dataCommonEvents[1] = { id: 1, list: [script("observed.push(ProjectR.CardSkillDeck.currentContext());"), end] };
    if (options.realData) {
        context.$dataSkills = JSON.parse(fs.readFileSync(path.join(root, "data/Skills.json"), "utf8"));
        context.$dataCommonEvents = JSON.parse(fs.readFileSync(path.join(root, "data/CommonEvents.json"), "utf8"));
    }
    if (options.realBattle) {
        class Graphic extends Sprite {}
        for (const method of ["clear", "lineStyle", "beginFill", "endFill", "drawPolygon", "moveTo", "lineTo", "drawRoundedRect", "drawRect", "drawCircle", "arc"]) Graphic.prototype[method] = function() { return this; };
        context.PIXI = { Graphics: Graphic };
        context.ImageManager.loadBitmap = context.ImageManager.loadFace = () => new Bitmap(576, 288);
        context.Game_Followers = class { initialize() {} hide() {} show() {} refresh() {} };
        context.Game_Temp = class { reserveCommonEvent(id) { logs.reserved = id; } };
        Object.setPrototypeOf(context.$gameTemp, context.Game_Temp.prototype);
        context.Game_Character = context.Game_Character || class { turnToward() { logs.turned = true; } };
        context.Game_Player = class extends context.Game_Character { setDirectionFix(value) { this.fixed = value; } };
        Object.setPrototypeOf(context.$gamePlayer, context.Game_Player.prototype);
        delete context.$gamePlayer.setDirectionFix;
        delete context.$gamePlayer.turnToward;
        context.$gamePlayer.screenX = () => 960; context.$gamePlayer.screenY = () => 540;
        for (const name of ["ProjectR_CombatPresence", "ProjectR_PlayerFacing", "ProjectR_BattleHUD"]) {
            vm.runInContext(fs.readFileSync(path.join(root, "js/plugins", `${name}.js`), "utf8"), context, { filename: `${name}.js` });
        }
    }
    vm.runInContext(source, context, { filename: "ProjectR_CardSkillDeck.js" });
    context.DataManager.isDatabaseLoaded(); context.SceneManager._scene = new Scene_Map();
    const api = context.ProjectR.CardSkillDeck;
    const command = (name, args = {}, self = context.$gameMap._interpreter) => context.PluginManager.callCommand(self, "ProjectR_CardSkillDeck", name, args);
    const seedDeck = () => {
        for (let id = 1; id <= 8; id++) {
            api.gainCard(id, 4);
            for (let i = 0; i < (id === 8 ? 2 : 4); i++) assert.ok(api.addDeckCard(id).ok);
        }
    };
    const flush = () => {
        for (let i = 0; i < 100 && context.$gameMap._interpreter.isRunning(); i++) {
            context.Graphics.frameCount++; context.$gameMap._interpreter.update();
        }
        assert.equal(context.$gameMap._interpreter.isRunning(), false, "CE should finish"); context.Graphics.frameCount++;
    };
    const key = (type, code, repeat = false, extra = {}) => {
        const e = { code, repeat, target: {}, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...extra };
        for (const { fn } of [...listeners.get(type) || []].sort((a, b) => Number(b.capture) - Number(a.capture))) {
            fn(e); if (e.stopped) break;
        }
        return e;
    };
    const enemy = (id, x, y, note = "", comments = []) => {
        const data = { note }, page = { list: comments.map((text, i) => ({ code: i ? 408 : 108, parameters: [text] })) };
        const e = { _eventId: id, databaseEnemy: { id: 1 }, hp: 100, _realX: x, _realY: y,
            eventId: () => id, event: () => data, page: () => page, isTransparent: () => false,
            positionPoint() { return { x: this._realX, y: this._realY }; } };
        Object.setPrototypeOf(e, Game_Event.prototype); e._pageIndex = -1;
        context.$gameMap._events[id] = e; context.$gameMap.addEventToTagIndex(e); return e;
    };
    return { c: context, api, logs, command, seedDeck, flush, key, enemy };
}

test("empty new/old save defaults and 0/30 invalid deck", () => {
    const { c, api } = boot(); assert.deepEqual(clone(api.getDeck()), []); assert.equal(api.ownedCount(1), 0);
    assert.equal(api.validateDeck().valid, false); assert.equal(c.$gameSystem._projectRCardSkillDeck.version, 1);
});
test("all metadata tags, Japanese aliases and cache invalidation", () => {
    const { c, api } = boot(); c.$dataSkills[1].note = "<Card><CardCost:3><CardAttribute:火星><CardType:魔法><CardRarity:2><CardTarget:Nearest><CardRange:4.5><CardActionCE:1><CardVFX:MarsSlash01>";
    api.rebuildMetadataCache();
    assert.deepEqual(clone(api.metadata(1)), { skillId: 1, cost: 3, attribute: "Mars", type: "Magic", rarity: 2, target: "Nearest", range: 4.5, actionCE: 1, vfx: "MarsSlash01", valid: true });
    const saved = api.metadata(1); c.$dataSkills[1].note = ""; c.DataManager.isDatabaseLoaded(); assert.equal(api.metadata(1), saved);
    assert.ok(Object.isFrozen(saved)); api.rebuildMetadataCache(); assert.equal(api.metadata(1), null);
});
for (const [value, expected] of [["-3", 1], ["0", 1], ["11", 10], ["99", 10], ["abc", 1], ["Infinity", 1], ["", 1], ["2.9", 2]]) {
    test(`cost clamp/default ${JSON.stringify(value)} => ${expected}`, () => {
        const { c, api } = boot(); c.$dataSkills[1].note += `<CardCost:${value}>`; api.rebuildMetadataCache(); assert.equal(api.metadata(1).cost, expected);
    });
}
test("invalid data warns without crashing; non-card and missing CE rejected", () => {
    const { c, api, logs } = boot(); c.$dataSkills[1].note = "<Card><CardCost:no><CardAttribute:Unknown><CardType:no><CardRarity:no><CardRange:no><CardTarget:no><CardActionCE:999>";
    c.$dataSkills[2].note = ""; api.rebuildMetadataCache(); assert.equal(api.metadata(1).valid, false); assert.equal(api.metadata(1).range, 8);
    assert.ok(logs.warnings.length >= 6); assert.equal(api.gainCard(2, 3).ok, false); assert.equal(api.addDeckCard(1).ok, false);
    assert.equal(api.useSlot(999).ok, false); assert.equal(api.attributeMultiplier("???", "Mars"), 1);
});
for (const [rarity, limit] of [[1, 4], [2, 3], [3, 2]]) {
    test(`rarity ${rarity}: max ${limit} copies`, () => {
        const { c, api } = boot(); c.$dataSkills[1].note += `<CardRarity:${rarity}>`; api.rebuildMetadataCache(); api.gainCard(1, 10);
        for (let i = 0; i < limit; i++) assert.ok(api.addDeckCard(1).ok);
        assert.equal(api.addDeckCard(1).ok, false); assert.equal(api.getDeck().length, limit);
    });
}
test("owned limit; remove preserves ownership; Lose never silently removes deck cards", () => {
    const { api, seedDeck } = boot(); api.gainCard(9, 1); assert.ok(api.addDeckCard(9).ok); assert.equal(api.addDeckCard(9).ok, false);
    api.removeDeckAt(0); assert.equal(api.ownedCount(9), 1); seedDeck(); const before = clone(api.getDeck()); api.loseCard(1, 99);
    assert.deepEqual(clone(api.getDeck()), before); assert.equal(api.validateDeck().valid, false);
});
test("29 rejects start, 30 valid, cannot add 31st", () => {
    const { api, seedDeck } = boot(); seedDeck(); assert.equal(api.validateDeck().valid, true); assert.equal(api.addDeckCard(8).ok, false);
    api.removeDeckAt(29); assert.equal(api.validateDeck().valid, false); assert.equal(api.startCombat().ok, false);
    assert.match(api.lastResult().reason, /DECK INCOMPLETE/); api.addDeckCard(8); assert.equal(api.validateDeck().valid, true);
});
test("Fisher-Yates n-1 RNG calls, persistent deck untouched, hand5/draw25", () => {
    const { c, api, seedDeck } = boot(); seedDeck(); const before = clone(api.getDeck());
    vm.runInContext("randomCalls = 0; Math.random = () => { randomCalls++; return 0.1; };", c);
    assert.ok(api.startCombat().ok); assert.equal(c.randomCalls, 29); assert.equal(api.hand().length, 5);
    assert.equal(api.drawPileCount(), 25); assert.equal(api.discardPileCount(), 0); assert.deepEqual(clone(api.getDeck()), before);
    assert.notDeepEqual(clone(api.hand()), before.slice(-5));
});
test("use/cost/CE/discard/draw replaces only same slot; Mouse aim needs no enemy", () => {
    const { c, api, seedDeck, flush, logs } = boot(); seedDeck(); api.startCombat(); const before = clone(api.hand());
    assert.ok(api.useSlot(1).ok); assert.equal(api.energy(), 8); assert.equal(api.discardPileCount(), 1); assert.equal(api.drawPileCount(), 24);
    assert.deepEqual(clone(api.hand()).filter((v, i) => i !== 1), before.filter((v, i) => i !== 1)); flush();
    assert.equal(c.observed[0].skillId, before[1]); assert.equal(c.observed[0].slotIndex, 1); assert.ok(Object.isFrozen(c.observed[0]));
    assert.equal(c.observed[0].aimSource, "facing"); assert.ok(Number.isFinite(c.observed[0].aimAngle));
    assert.equal(c.$gamePlayer.fixed, true); assert.equal(c.ProjectRCombatPresence.isCombatActive(), true);
});
test("empty draw reshuffles all 26 discards including just-used card", () => {
    const { api, seedDeck, flush } = boot(); seedDeck(); api.startCombat();
    for (let i = 0; i < 25; i++) { api.setEnergy(10); assert.ok(api.useSlot(0).ok); flush(); }
    assert.equal(api.drawPileCount(), 0); assert.equal(api.discardPileCount(), 25); api.setEnergy(10); assert.ok(api.useSlot(0).ok);
    assert.equal(api.drawPileCount(), 25); assert.equal(api.discardPileCount(), 0);
});
test("energy 0..10, shortage preserves piles and no action", () => {
    const { api, seedDeck } = boot(); seedDeck(); api.startCombat(); api.setEnergy(99); assert.equal(api.energy(), 10);
    api.addEnergy(-50); assert.equal(api.energy(), 0); const before = clone(api.hand()); assert.equal(api.useSlot(0).ok, false);
    assert.deepEqual(clone(api.hand()), before); assert.equal(api.drawPileCount(), 25); assert.equal(api.discardPileCount(), 0);
    api.setEnergy(NaN); assert.equal(api.energy(), 0);
});
test("main-hit token gives +1 only once; next token +1; invalid/card tokens rejected", () => {
    const { api, seedDeck } = boot(); seedDeck(); api.startCombat(); api.setEnergy(5); const a = api.createMainAttackToken();
    assert.equal(api.notifyMainAttackHit(a), true); assert.equal(api.energy(), 6); assert.equal(api.notifyMainAttackHit(a), false);
    assert.equal(api.notifyMainAttackHit("second"), true); assert.equal(api.energy(), 7);
    for (const t of [null, {}, NaN, "", "card:1:1", { kind: "card", id: "x" }]) assert.equal(api.notifyMainAttackHit(t), false);
    api.setEnergy(10); api.notifyMainAttackHit("third"); assert.equal(api.energy(), 10);
});
test("card CE excluded from main-hit recovery", () => {
    const { c, api, seedDeck, flush } = boot(); seedDeck(); c.$dataCommonEvents[1].list = [script("observed.push(ProjectR.CardSkillDeck.notifyMainAttackHit('wrong-card-hit'));"), end];
    api.startCombat(); api.useSlot(0); flush(); assert.equal(c.observed[0], false); assert.equal(api.energy(), 8);
});
const planets = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const factors = [1, 1.5, 1.3, 1.15, 1, 1 / 1.15, 1 / 1.3, 1 / 1.5];
const mathEnvironment = boot();
for (let a = 0; a < 9; a++) for (let b = 0; b < 9; b++) {
    test(`planet ${planets[a]} -> ${planets[b]}`, () => near(mathEnvironment.api.attributeMultiplier(planets[a], planets[b]), a === b ? 1 : a === 8 || b === 8 ? 1.5 : factors[(b - a + 8) % 8]));
}
test("neutral, JP aliases, Physical/Magic multipliers, negative/invalid/default resist", () => {
    const { api, enemy } = boot(); const e = enemy(1, 1, 0, "<PlanetAttribute:火星><PhysicalResist:0.75><MagicResist:1.25>");
    near(api.attributeMultiplier("水星", "金星"), 1.5); assert.equal(api.attributeMultiplier("Mars", null), 1);
    near(api.resistanceMultiplier("Physical", e), .75); near(api.resistanceMultiplier("魔法", e), 1.25);
    near(api.cardDamageMultiplier({ attribute: "Earth", type: "Magic" }, e), 1.875);
    const n = enemy(2, 2, 0, "<PhysicalResist:-3><MagicResist:no>"); assert.equal(api.resistanceMultiplier("Physical", n), 0);
    assert.equal(api.resistanceMultiplier("Magic", n), 1); assert.equal(api.resistanceMultiplier("Physical", null), 1);
});
test("page 108/408 overrides event note; page switch refreshes cache", () => {
    const { api, enemy } = boot(); const e = enemy(1, 1, 0, "<PlanetAttribute:Mars><PhysicalResist:0.75>", ["<PlanetAttribute:Venus>", "<PhysicalResist:2>"]);
    near(api.cardDamageMultiplier({ attribute: "Mercury", type: "Physical" }, e), 3);
    e.page = () => ({ list: [{ code: 108, parameters: ["<PhysicalResist:0>"] }] }); assert.equal(api.resistanceMultiplier("Physical", e), 0);
});
test("Nearest: living official enemy, fractions, stable tie; no friendly/dead/erased", () => {
    const { c, api, seedDeck, enemy, flush } = boot(); seedDeck();
    for (const skill of c.$dataSkills.filter(Boolean)) skill.note += "<CardTarget:Nearest><CardRange:4>"; api.rebuildMetadataCache();
    enemy(1, 2.5, 0); enemy(2, 1.25, 0); enemy(3, 1.25, 0); enemy(4, .1, 0).hp = 0;
    enemy(5, .05, 0)._erased = true; enemy(6, .01, 0).databaseEnemy = null; enemy(7, .001, 0)._isMinionActor = true;
    api.startCombat(); assert.ok(api.useSlot(0).ok); flush(); assert.equal(c.observed[0].targetEventId, 2); assert.equal(c.$gameMap.scans, 1);
});
test("out-of-range target no consumption; loop-map distance works", () => {
    const { c, api, seedDeck, enemy } = boot(); seedDeck();
    for (const skill of c.$dataSkills.filter(Boolean)) skill.note += "<CardTarget:Nearest><CardRange:1.5>"; api.rebuildMetadataCache();
    enemy(1, 59, 0); api.startCombat(); assert.equal(api.useSlot(0).ok, false); assert.equal(api.energy(), 10); assert.equal(api.discardPileCount(), 0);
    c.$gameMap.loopX = true; assert.ok(api.useSlot(0).ok);
});
test("official aim exception restores direction fix and CombatPresence", () => {
    const { c, api, logs, seedDeck } = boot(); seedDeck(); api.startCombat(); logs.aimError = true;
    c.$gamePlayer.setDirection = () => { throw Error("direction test failure"); };
    assert.equal(api.useSlot(0).ok, false); assert.equal(c.$gamePlayer.fixed, true); assert.equal(c.ProjectRCombatPresence.isCombatActive(), true); assert.equal(api.energy(), 10);
});

test("CE busy rejects; immutable context survives waits and child common events", () => {
    const { c, api, seedDeck, flush } = boot(); seedDeck();
    c.$dataCommonEvents[2] = { list: [script("observed.push(ProjectR.CardSkillDeck.currentContext());"), end] };
    c.$dataCommonEvents[1].list = [script("observed.push(ProjectR.CardSkillDeck.currentContext());"), wait(2), { code: 117, indent: 0, parameters: [2] }, end];
    api.startCombat(); assert.ok(api.useSlot(0).ok); assert.equal(api.useSlot(1).ok, false); flush();
    assert.equal(c.observed.length, 2); assert.equal(c.observed[0], c.observed[1]);
    assert.equal(api.contextByActionId(c.observed[0].actionId), c.observed[0]); assert.equal(api.currentContext(), null);
    assert.ok(api.useSlot(1).ok); flush(); assert.notEqual(c.observed[0].actionId, c.observed[2].actionId);
});
test("reused map interpreter never leaks card context into normal events", () => {
    const { c, api, seedDeck, flush } = boot(); seedDeck(); api.startCombat(); api.useSlot(0); flush();
    c.$gameMap._interpreter.setup([script("observed.push(ProjectR.CardSkillDeck.currentContext());"), end], 0); flush(); assert.equal(c.observed[1], null);
});
test("UseCardSlot command creates child; parent resumes without replacement", () => {
    const { c, api, seedDeck, flush } = boot(); seedDeck(); api.startCombat();
    c.$gameMap._interpreter.setup([{ code: 357, indent: 0, parameters: ["ProjectR_CardSkillDeck", "UseCardSlot", "", { slot: "2" }] }, script("observed.push('parent-resumed');"), end], 4);
    flush(); assert.equal(c.observed[0].slotIndex, 1); assert.equal(c.observed[1], "parent-resumed");
});
test("reserved/foreign CE, invalid slot/CE, same-frame duplicate do not spend", () => {
    const { c, api, seedDeck, logs } = boot(); seedDeck(); api.startCombat(); logs.reserved = true;
    assert.equal(api.useSlot(0).ok, false); logs.reserved = false;
    c.$gameMap._interpreter.setup([wait(5), end], 0); const list = c.$gameMap._interpreter._list;
    assert.equal(api.useSlot(0).ok, false); assert.equal(c.$gameMap._interpreter._list, list); c.$gameMap._interpreter.clear();
    assert.equal(api.useSlot(-1).ok, false); assert.equal(api.useSlot(5).ok, false); assert.equal(api.energy(), 10);
    const saved = c.$dataCommonEvents[1]; c.$dataCommonEvents[1] = null; assert.equal(api.useSlot(0).ok, false); c.$dataCommonEvents[1] = saved;
    assert.ok(api.useSlot(0).ok); c.$gameMap._interpreter.update(); assert.equal(api.useSlot(1).ok, false); assert.equal(api.energy(), 8);
});
test("official damage wrapper requires matching context, skill and living enemy", () => {
    const { c, api, seedDeck, enemy, flush, logs } = boot(); seedDeck(); enemy(1, 1, 0, "<PlanetAttribute:Jupiter><PhysicalResist:0.5>");
    c.$dataCommonEvents[1].list = [script("const ctx=ProjectR.CardSkillDeck.currentContext(); observed.push(this.calculateDamageAgainstEvent($gameMap.event(1),'skill',ctx.skillId)); observed.push(this.calculateDamageAgainstEvent($gameMap.event(1),'weapon',ctx.skillId)); observed.push(this.calculateDamageAgainstEvent($gameMap.event(1),'skill',999));"), end];
    api.startCombat(); api.useSlot(0); flush(); assert.deepEqual(clone(c.observed), [75, 100, 100]);
    assert.equal(c.$gameMap._interpreter.calculateDamageAgainstEvent(c.$gameMap.event(1), "skill", 1), 100);
    logs.baseDamage = 0; api.setEnergy(10); api.useSlot(0); flush(); assert.equal(c.observed[3], 0);
});
test("explicit async binding supports zero resist; End invalidates every context", () => {
    const { c, api, seedDeck, enemy, flush } = boot(); seedDeck(); enemy(1, 1, 0, "<PhysicalResist:0>");
    api.startCombat(); api.useSlot(0); flush(); const id = c.observed[0].actionId;
    const other = new c.Game_Interpreter(); other.setup([wait(2), end], 0); assert.equal(api.bindActionContext(other, id), true);
    assert.equal(other.calculateDamageAgainstEvent(c.$gameMap.event(1), "skill", c.observed[0].skillId), 0);
    api.endCombat(); assert.equal(api.contextByActionId(id), null); assert.equal(api.currentContext(other), null);
    assert.equal(other.calculateDamageAgainstEvent(c.$gameMap.event(1), "skill", 1), 100);
});
test("combat save/autosave block; normal save; old-save lazy migration", async () => {
    const { c, api, seedDeck, logs } = boot(); seedDeck(); api.startCombat();
    assert.equal(c.$gameSystem.isSaveEnabled(), false); assert.equal(c.SceneManager._scene.shouldAutosave(), false);
    await assert.rejects(c.DataManager.saveGame(1), /カード戦闘終了後/); assert.equal(logs.saved, 0);
    api.endCombat(); assert.equal(c.$gameSystem.isSaveEnabled(), true); await c.DataManager.saveGame(1); assert.equal(logs.saved, 1);
    c.DataManager.extractSaveContents({ system: {} }); assert.deepEqual(clone(api.getDeck()), []); assert.equal(api.ownedCount(1), 0);
    c.DataManager.extractSaveContents({ system: { _projectRCardSkillDeck: { ownedCards: { 1: 2, 2: -1 }, deck: [1, 1, 1, 999] } } });
    assert.deepEqual(clone(api.getDeck()), [1, 1, 1, 999]); assert.equal(api.ownedCount(1), 2); assert.equal(api.ownedCount(2), 0); assert.equal(api.validateDeck().valid, false);
});
test("Phase3 transfer preserves piles; new game resets inventory; saved deck otherwise preserved", () => {
    const { c, api, seedDeck } = boot(); seedDeck(); const before = clone(api.getDeck()); api.startCombat(); api.useSlot(0);
    const hand = clone(api.hand());
    c.$gameMap.setup(2); assert.equal(api.isCombatActive(), true); assert.deepEqual(clone(api.hand()), hand);
    assert.equal(api.drawPileCount(), 24); assert.equal(api.discardPileCount(), 1); assert.deepEqual(clone(api.getDeck()), before);
    api.startCombat(); c.DataManager.setupNewGame(); assert.equal(api.isCombatActive(), false); assert.deepEqual(clone(api.getDeck()), []);
});
test("Q/E/X/C/V edge triggers; X does not forward Cancel, F and keyMapper untouched", () => {
    const { c, api, seedDeck, key, flush } = boot(); seedDeck(); api.startCombat(); let forwarded = 0;
    c.document.addEventListener("keydown", () => forwarded++); const mapper = clone(c.Input.keyMapper);
    for (const [i, letter] of ["Q", "E", "X", "C", "V"].entries()) {
        api.setEnergy(10); assert.equal(key("keydown", `Key${letter}`).stopped, true); c.SceneManager._scene.update(); flush();
        assert.equal(api.isAiming(), true);
        c.Graphics.frameCount++;
        key("mousedown", null, false, { button: 0, pageX: 200, pageY: 0 });
        key("mouseup", null, false, { button: 0 }); flush();
        const count = c.observed.length; key("keydown", `Key${letter}`, true); c.SceneManager._scene.update(); assert.equal(c.observed.length, count);
        key("keyup", `Key${letter}`); assert.equal(c.observed[i].slotIndex, i);
    }
    assert.equal(forwarded, 0); key("keydown", "KeyF"); assert.equal(forwarded, 1); assert.deepEqual(clone(c.Input.keyMapper), mapper);
    api.endCombat(); assert.notEqual(key("keydown", "KeyE").stopped, true); assert.equal(forwarded, 2);
});
test("text/modified keys not captured; scene transition discards input queue", () => {
    const { c, api, logs, seedDeck, key } = boot(); seedDeck(); api.startCombat();
    for (const extra of [{ ctrlKey: true }, { target: { tagName: "INPUT" } }, { target: { isContentEditable: true } }]) {
        assert.notEqual(key("keydown", "KeyC", false, extra).stopped, true); key("keyup", "KeyC");
    }
    logs.message = true; assert.notEqual(key("keydown", "KeyX").stopped, true); key("keyup", "KeyX"); logs.message = false;
    key("keydown", "KeyQ"); logs.changing = true; c.SceneManager._scene.update(); assert.equal(api.discardPileCount(), 0);
});
test("Hotbar assignments unchanged; every wrapper delegates normally after End", () => {
    const { c, api, seedDeck, logs } = boot(); seedDeck(); const slot = { useSlotContents() { logs.normal++; }, _config: { Button: "q" } };
    c.SceneManager._scene._skillUI = { _slots: new Map([["1", slot]]) }; c.$gameSystem._uiSlotData = { 1: { type: "skill", id: 100 } };
    const before = clone(c.$gameSystem._uiSlotData); c.PluginManager.registerCommand("Hendrix_Hotbar_Creator", "UseSlot", () => logs.normal++);
    api.startCombat(); slot.useSlotContents(); c.SceneManager._scene.updateSlotInputs(); c.PluginManager.callCommand(null, "Hendrix_Hotbar_Creator", "UseSlot", {});
    assert.equal(logs.normal, 0); api.endCombat(); slot.useSlotContents(); c.SceneManager._scene.updateSlotInputs(); c.PluginManager.callCommand(null, "Hendrix_Hotbar_Creator", "UseSlot", {});
    assert.equal(logs.normal, 3); assert.deepEqual(clone(c.$gameSystem._uiSlotData), before);
});
test("5 cards, keys, ENERGY HUD; only skill hidden; unchanged frames no redraw/Bitmap/scan", () => {
    const { c, api, seedDeck, logs } = boot(); seedDeck(); c.SceneManager._scene.createDisplayObjects();
    const hud = c.SceneManager._scene._projectRCardHandHUD, manager = c.ProjectR.BattleHUD._manager;
    hud.update(); assert.equal(hud.visible, false); assert.equal(manager._skillHUD.visible, true); api.startCombat(); hud.update();
    assert.equal(hud._cards.length, 5); assert.equal(manager._skillHUD.visible, false);
    for (const field of ["_playerHUD", "_weaponHUD", "_ultimateHUD", "_statusHUD"]) assert.equal(manager[field].visible, true);
    assert.deepEqual(clone(hud._cards.map(s => s.bitmap.text.at(-1))), ["Q", "E", "X", "C", "V"]);
    assert.ok(hud._energy.bitmap.text.some(t => t.includes("10 / 10")));
    const before = [logs.draws, logs.bitmaps, c.$gameMap.scans]; for (let i = 0; i < 60; i++) hud.update(); assert.deepEqual([logs.draws, logs.bitmaps, c.$gameMap.scans], before);
    c.Graphics.width = c.Graphics.boxWidth = 816; c.Graphics.height = c.Graphics.boxHeight = 624;
    manager.scale.set(816 / 1920, 624 / 1080); hud.update(); assert.ok(hud.scale.x < 1);
    api.setEnergy(8); hud.update(); assert.ok(hud._energy.bitmap.text.some(t => t.includes("8 / 10")));
    manager.visible = false; hud.update(); assert.equal(hud.visible, false); api.endCombat(); assert.equal(manager._skillHUD.visible, true);
});
test("restoration preserves old intentionally hidden skill HUD", () => {
    const { c, api, seedDeck } = boot(); seedDeck(); c.SceneManager._scene.createDisplayObjects(); c.ProjectR.BattleHUD._manager._skillHUD.visible = false;
    api.startCombat(); c.SceneManager._scene._projectRCardHandHUD.update(); api.endCombat(); assert.equal(c.ProjectR.BattleHUD._manager._skillHUD.visible, false);
});
test("MenuHUD SKILL one consume/SE/push; other six delegate unchanged", () => {
    const { c, api, logs } = boot(); const menu = new c.ProjectR.MenuHUD.Scene(); menu.confirm();
    assert.equal(logs.consumed, 1); assert.deepEqual(logs.sounds, ["ok"]); assert.equal(logs.pushes[0], api.Scene);
    for (let i = 1; i < 7; i++) { menu._index = i; menu.confirm(); } assert.equal(logs.normal, 6);
    logs.changing = true; menu._index = 0; menu.confirm(); assert.equal(logs.pushes.length, 1);
});
test("builder empty state, add/remove, limit buzzer once, mouse and keyboard focus", () => {
    const { c, api, logs } = boot(); const scene = new api.Scene(); scene.create(); assert.equal(scene._ownedWindow.maxItems(), 0); assert.equal(scene._deckWindow.maxItems(), 0);
    assert.ok(scene._summaryWindow.contents.text.some(t => t.includes("0 / 30"))); api.gainCard(1, 1); scene._ownedWindow.refreshList();
    scene.focusList("owned"); scene._ownedWindow.processOk(); assert.equal(api.getDeck().length, 1); assert.deepEqual(logs.sounds, ["ok"]);
    scene._ownedWindow.processOk(); assert.deepEqual(logs.sounds, ["ok", "buzzer"]); assert.ok(scene._summaryWindow.contents.text.some(t => t.includes("不足")));
    logs.touch = logs.click = true; c.TouchInput.x = scene._deckWindow.x + 30; c.TouchInput.y = scene._deckWindow.y + 30;
    scene._deckWindow.processTouch(); assert.equal(api.getDeck().length, 0); assert.equal(api.ownedCount(1), 1);
    scene.focusActions(); assert.equal(scene._actionsWindow.active, true); scene._actionsWindow.selectSymbol("back"); scene._actionsWindow.processOk(); assert.equal(logs.popped, true);
});
// Empty-list runtime regressions use MZ's real superclass initialization path.
function createBuilder(env) {
    const scene = new env.api.Scene(); scene.create(); return scene;
}
function seedOwnedKinds(env, count) {
    for (let id = 1; id <= count; id++) env.c.$dataSkills[id] = { ...env.c.$dataSkills[1], id, name: `Card ${id}` };
    env.api.rebuildMetadataCache();
    for (let id = 1; id <= count; id++) assert.ok(env.api.gainCard(id, 1).ok);
}
function assertEmptyList(list, text) {
    assert.equal(list.maxItems(), 0); assert.equal(list.index(), -1); assert.equal(list.row(), -1);
    assert.equal(list.currentEntry(), null); assert.equal(list.entryAt(-1), null); assert.equal(list.entryAt(0), null);
    assert.equal(list.isCurrentItemEnabled(), false); assert.equal(list.isCursorMovable(), false);
    assert.equal(list._cursorRect.width, 0); assert.equal(list._cursorRect.height, 0);
    assert.ok([list.scrollX(), list.scrollY(), list.origin.x, list.origin.y, list.topIndex(), list.maxRows()].every(Number.isFinite));
    assert.ok(list.contents.text.includes(text));
}
test("regression: Menu SKILL creates both lists through MZ initialize with undefined rows and index -1", () => {
    const env = boot(), { c, api, logs } = env, initial = [];
    const reselect = c.Window_Selectable.prototype.reselect;
    c.Window_Selectable.prototype.reselect = function() {
        if (this.constructor.name === "Window_CardDeckList" && this._mode === undefined) {
            initial.push([this._rows, this.index(), this.row(), this.currentEntry(), this.maxItems()]);
        }
        return reselect.call(this);
    };
    new c.ProjectR.MenuHUD.Scene().confirm(); assert.equal(logs.pushes[0], api.Scene);
    const scene = new logs.pushes[0](); scene.create();
    assert.deepEqual(initial, [[undefined, -1, -1, null, 0], [undefined, -1, -1, null, 0]]);
    for (const list of [scene._ownedWindow, scene._deckWindow]) {
        assert.equal(list.row, c.Window_Selectable.prototype.row);
        assert.equal(Object.hasOwn(Object.getPrototypeOf(list), "row"), false);
        assert.ok(scene.children.includes(list));
    }
});
test("regression: new save with no owned/deck/hand renders normal empty UI", () => {
    const env = boot(); env.c.DataManager.setupNewGame();
    const scene = createBuilder(env);
    assertEmptyList(scene._ownedWindow, "所持カードはありません"); assertEmptyList(scene._deckWindow, "デッキは空です");
    assert.deepEqual(clone(env.api.getDeck()), []); assert.deepEqual(clone(env.api.hand()), []);
    assert.ok(scene._summaryWindow.contents.text.includes("DECK 0 / 30  DECK INCOMPLETE"));
    assert.equal(scene._actionsWindow.active, true); assert.equal(scene._actionsWindow.maxItems(), 3);
});
test("regression: old save first migration opens the same empty builder", () => {
    const env = boot(); env.c.DataManager.extractSaveContents({ system: new env.c.Game_System() });
    const scene = createBuilder(env);
    assertEmptyList(scene._ownedWindow, "所持カードはありません"); assertEmptyList(scene._deckWindow, "デッキは空です");
    assert.equal(env.c.$gameSystem._projectRCardSkillDeck.version, 1); assert.deepEqual(clone(env.api.getDeck()), []);
});
test("regression: no card definitions in Skills database still opens empty builder", () => {
    const env = boot(); env.c.$dataSkills = [null]; env.api.rebuildMetadataCache();
    const scene = createBuilder(env);
    assert.equal(env.api.metadata(1), null); assertEmptyList(scene._ownedWindow, "所持カードはありません");
    assertEmptyList(scene._deckWindow, "デッキは空です");
});
test("regression: empty lifecycle select/deselect/activate/deactivate/reselect/ensure/refresh/draw is safe", () => {
    const scene = createBuilder(boot());
    for (const [list, text] of [[scene._ownedWindow, "所持カードはありません"], [scene._deckWindow, "デッキは空です"]]) {
        for (const operation of [() => list.select(0), () => list.deselect(), () => list.activate(), () => list.deactivate(),
            () => list.reselect(), () => list.ensureCursorVisible(true), () => list.ensureCursorVisible(false),
            () => list.drawItem(-1), () => list.drawItem(0), () => list.drawItem(999), () => list.refresh(),
            () => list.paint(), () => list.refreshList()]) {
            operation(); assertEmptyList(list, text);
        }
    }
});
test("regression: entry getters reject negative/out-of-range/non-integer indices", () => {
    const env = boot(); env.api.gainCard(1, 1); const list = createBuilder(env)._ownedWindow;
    assert.deepEqual(clone(list.entryAt(0)), { id: 1, count: 0 }); assert.equal(list.currentEntry(), list.entryAt(0));
    for (const index of [-1, -20, 1, 100, NaN, Infinity, 0.5, undefined, "0"]) assert.equal(list.entryAt(index), null);
    for (const index of [-1, 1, 100]) { list.select(index); assert.equal(list.currentEntry(), null); list.drawItem(index); }
});
test("regression: uninitialized/non-array/empty rows are safe in getters and MZ lifecycle", () => {
    const list = createBuilder(boot())._ownedWindow;
    for (const rows of [undefined, null, {}, { length: 3 }, []]) {
        list._rows = rows; list.select(0); list.deselect(); list.activate(); list.deactivate(); list.reselect();
        list.ensureCursorVisible(true); list.ensureCursorVisible(false); list.drawItem(0); list.refresh();
        assertEmptyList(list, "所持カードはありません");
    }
    delete list._rows; list.reselect(); assert.equal(list.currentEntry(), null); assert.equal(list.entryAt(0), null);
});
test("regression: empty directional/page input and direct wrapped cursor calls preserve index -1", () => {
    const env = boot(), scene = createBuilder(env);
    for (const mode of ["owned", "deck"]) {
        scene.focusList(mode); const list = mode === "owned" ? scene._ownedWindow : scene._deckWindow;
        for (const symbol of ["down", "up", "right", "left", "pageup", "pagedown"]) {
            env.logs.input = symbol; list.update(); assert.equal(list.index(), -1);
        }
        env.logs.input = null;
        list.cursorDown(true); list.cursorUp(true); list.cursorRight(true); list.cursorLeft(true);
        list.cursorPagedown(); list.cursorPageup(); list.select(NaN);
        assertEmptyList(list, mode === "owned" ? "所持カードはありません" : "デッキは空です");
        assert.equal(list.scrollY(), 0); assert.deepEqual(env.logs.sounds, []);
    }
});
test("regression: empty mouse clicks/hover/wheel never select an entry or edit cards", () => {
    const env = boot(), scene = createBuilder(env), { c, logs, api } = env;
    for (const [list, text] of [[scene._ownedWindow, "所持カードはありません"], [scene._deckWindow, "デッキは空です"]]) {
        scene.focusActions(); c.TouchInput.x = list.x + 30; c.TouchInput.y = list.y + 30;
        logs.touch = logs.click = true; list.update(); assert.equal(list.active, true); assert.equal(list.hitIndex(), -1);
        c.TouchInput.update(); logs.hover = true;
        for (const wheelY of [120, -120]) {
            c.TouchInput.wheelY = wheelY; list.update();
            for (let i = 0; i < 6; i++) list.updateSmoothScroll();
            assertEmptyList(list, text); assert.equal(list.scrollY(), 0);
        }
        c.TouchInput.wheelY = 0; c.TouchInput.update(); logs.release = true; list.update(); c.TouchInput.update();
    }
    assert.deepEqual(clone(api.getDeck()), []); assert.deepEqual(clone(api.hand()), []); assert.deepEqual(logs.sounds, []);
});
test("regression: empty OK buzzes once without consuming input, changing data or calling a CE", () => {
    const env = boot(), scene = createBuilder(env), before = clone(env.c.$gameSystem);
    for (const mode of ["owned", "deck"]) {
        scene.focusList(mode); const list = mode === "owned" ? scene._ownedWindow : scene._deckWindow;
        env.logs.input = "ok"; list.processHandling(); env.logs.input = null;
        assert.equal(list.active, true); assert.equal(list.index(), -1);
    }
    assert.deepEqual(env.logs.sounds, ["buzzer", "buzzer"]); assert.equal(env.logs.consumed || 0, 0);
    assert.deepEqual(clone(env.c.$gameSystem), before); assert.deepEqual(env.logs.commands, []);
});
test("regression: Cancel from either empty list returns to actions, then exits to previous scene", () => {
    for (const mode of ["owned", "deck"]) {
        const env = boot(), scene = createBuilder(env); scene.focusList(mode);
        const list = mode === "owned" ? scene._ownedWindow : scene._deckWindow;
        env.logs.input = "cancel"; list.processHandling();
        assert.equal(list.active, false); assert.equal(scene._actionsWindow.active, true); assert.equal(env.logs.popped, undefined);
        env.logs.input = "cancel"; scene._actionsWindow.processHandling();
        assert.equal(env.logs.popped, true); assert.deepEqual(env.logs.sounds, ["cancel", "cancel"]);
    }
});
test("regression: right-click Cancel on empty lists and Back command remain usable", () => {
    const env = boot(), scene = createBuilder(env); scene.focusList("deck");
    env.logs.touchCancel = true; scene._deckWindow.processTouch(); assert.equal(scene._actionsWindow.active, true);
    scene._actionsWindow.selectSymbol("back"); scene._actionsWindow.processOk(); assert.equal(env.logs.popped, true);
    assert.deepEqual(env.logs.sounds, ["cancel", "ok"]);
});
for (const count of [1, 2, 30, 100]) {
    test(`regression: ${count} owned cards preserve MZ numeric row, geometry and cursor scrolling`, () => {
        const env = boot(); seedOwnedKinds(env, count); const scene = createBuilder(env), list = scene._ownedWindow;
        scene.focusList("owned");
        for (const name of ["row", "maxRows", "maxCols", "topIndex", "itemRect", "ensureCursorVisible"])
            assert.equal(list[name], env.c.Window_Selectable.prototype[name]);
        assert.equal(list.maxItems(), count); assert.equal(list.maxRows(), count); assert.equal(list.maxCols(), 1);
        list.select(count - 1); list.ensureCursorVisible(false);
        assert.equal(list.row(), count - 1); assert.equal(list.currentEntry().id, count);
        assert.equal(list.scrollY(), Math.max(0, count * list.itemHeight() - list.innerHeight));
        assert.equal(list.topIndex(), Math.floor(list.scrollY() / list.itemHeight()));
        const rect = list.itemRect(count - 1);
        assert.equal(rect.x, list.colSpacing() / 2); // One column: MZ's index % maxCols geometry.
        assert.ok(rect.y - list.origin.y >= 0); assert.ok(rect.y - list.origin.y + rect.height <= list.innerHeight);
        list.cursorDown(true); for (let i = 0; i < 6; i++) list.updateSmoothScroll();
        assert.equal(list.index(), 0); assert.equal(list.scrollY(), 0);
        list.cursorUp(true); for (let i = 0; i < 6; i++) list.updateSmoothScroll(); assert.equal(list.index(), count - 1);
        list.cursorPageup(); list.cursorPagedown(); list.ensureCursorVisible(false);
        assert.ok(Number.isFinite(list.row())); assert.ok(list.currentEntry());
    });
}
test("regression: complete 30-card deck keeps grouped rows, add/remove and READY validation", () => {
    const env = boot(); env.seedDeck(); const scene = createBuilder(env), list = scene._deckWindow;
    assert.equal(env.api.getDeck().length, 30); assert.equal(list.maxItems(), 8);
    assert.equal(list._rows.reduce((n, row) => n + row.count, 0), 30);
    scene.focusList("deck"); list.select(7); list.processOk(); assert.equal(env.api.getDeck().length, 29);
    scene.focusList("owned"); scene._ownedWindow.select(7); scene._ownedWindow.processOk();
    assert.equal(env.api.getDeck().length, 30); assert.equal(env.api.validateDeck().valid, true);
    assert.ok(scene._summaryWindow.contents.text.includes("DECK 30 / 30  READY"));
});
test("regression: removing every deck row after scrolling ends at a visible 0/30 empty list", () => {
    const env = boot(); seedOwnedKinds(env, 30);
    for (let id = 1; id <= 30; id++) assert.ok(env.api.addDeckCard(id).ok);
    const scene = createBuilder(env), list = scene._deckWindow; scene.focusList("deck");
    list.select(29); list.ensureCursorVisible(false); assert.ok(list.scrollY() > 0);
    for (let i = 0; i < 30; i++) list.processOk();
    assertEmptyList(list, "デッキは空です"); assert.equal(list.scrollY(), 0); assert.equal(list.origin.y, 0);
    assert.equal(scene._ownedWindow.maxItems(), 30); assert.ok(scene._summaryWindow.contents.text.includes("DECK 0 / 30  DECK INCOMPLETE"));
    for (let id = 1; id <= 30; id++) assert.equal(env.api.ownedCount(id), 1);
});
test("regression: refreshing after losing all owned cards resets scroll and keeps the empty message", () => {
    const env = boot(); seedOwnedKinds(env, 100); const list = createBuilder(env)._ownedWindow;
    list.select(99); list.ensureCursorVisible(false); assert.ok(list.scrollY() > 0);
    for (let id = 1; id <= 100; id++) env.api.loseCard(id, 1);
    list.refreshList(); list.refresh(); assertEmptyList(list, "所持カードはありません");
    assert.equal(list.scrollY(), 0); assert.equal(list.origin.y, 0);
    env.api.gainCard(1, 1); list.refreshList(); assert.equal(list.index(), 0); assert.equal(list.currentEntry().id, 1);
});
test("regression: deselected nonempty list also treats index -1 as no current item", () => {
    const env = boot(); seedOwnedKinds(env, 2); const scene = createBuilder(env), list = scene._ownedWindow;
    scene.focusList("owned"); list.deselect(); list.deactivate(); list.activate(); list.reselect(); list.ensureCursorVisible(false);
    assert.equal(list.index(), -1); assert.equal(list.row(), -1); assert.equal(list.currentEntry(), null);
    list.drawItem(-1); list.processOk(); assert.deepEqual(env.logs.sounds, ["buzzer"]); assert.equal(env.api.getDeck().length, 0);
    list.select(0); list.processOk(); assert.deepEqual(clone(env.api.getDeck()), [1]);
});

test("debug opt-in; getter/validator commands write specified variable/switch", () => {
    const { api, logs, command, seedDeck } = boot(); command("DebugGrantCards"); assert.equal(api.ownedCount(1), 0); seedDeck();
    command("GetDeckCount", { variableId: "9" }); assert.deepEqual(logs.variable, [9, 30]); command("ValidateDeck", { switchId: "3" }); assert.deepEqual(logs.switch, [3, true]);
    command("SetEnergy", { value: "9" }); command("AddEnergy", { value: "-1" }); command("GetEnergy", { variableId: "4" }); assert.deepEqual(logs.variable, [4, 8]);
    const debug = boot({ debug: true }); debug.command("DebugGrantCards"); debug.command("DebugBuildDeck"); assert.equal(debug.api.validateDeck().valid, true);
});
test("unregistered/unready VFX makes zero asset or command requests", () => {
    const { c, api, logs, seedDeck, flush } = boot(); seedDeck(); for (const s of c.$dataSkills.filter(Boolean)) s.note += "<CardVFX:MarsSlash01>"; api.rebuildMetadataCache();
    api.startCombat(); api.useSlot(0); flush(); assert.equal(logs.commands.length, 0); assert.equal(logs.images.length, 0);
    api.registerVfx("MarsSlash01", { animationName: "Ice Wall", ready: false }); api.useSlot(0); flush(); assert.equal(logs.commands.length, 0);
});
test("ready VFX calls verified Animation Solution 2.0.7 library command", () => {
    const { c, api, logs, seedDeck } = boot(); seedDeck(); for (const s of c.$dataSkills.filter(Boolean)) s.note += "<CardVFX:MarsSlash01>"; api.rebuildMetadataCache();
    c.PluginManager.registerCommand("Hendrix_Animation_Solution", "showAnimationFromLibrary", () => {});
    api.registerVfx("MarsSlash01", { animationName: "Ice Wall", target: "player front", ready: true, stickMode: false }); api.startCombat(); api.useSlot(0);
    assert.deepEqual(clone(logs.commands[0]), ["Hendrix_Animation_Solution", "showAnimationFromLibrary", { animationName: "Ice Wall", eventId: "player front", loopCount: "1", stickMode: "false" }]);
});

test("death and fullscreen dialogue locks cannot be bypassed by card API/keys", () => {
    const { c, api, logs, seedDeck, key } = boot(); seedDeck();
    c.ProjectR.PlayerDeathControl = { isLocked: () => !!logs.dead };
    c.ProjectR.FullscreenDialogue = { isActive: () => !!logs.dialogue };
    logs.dead = true; assert.equal(api.startCombat().ok, false); logs.dead = false; api.startCombat();
    logs.dead = true; assert.equal(api.useSlot(0).ok, false); key("keydown", "KeyQ"); c.SceneManager._scene.update(); assert.equal(api.energy(), 10);
    logs.dead = false; logs.dialogue = true; assert.equal(api.useSlot(0).ok, false); assert.equal(api.discardPileCount(), 0);
});
test("malformed CE list or setup failure cannot consume cards or crash activation", () => {
    const { c, api, seedDeck } = boot(); seedDeck(); api.startCombat(); const saved = c.$dataCommonEvents[1].list;
    c.$dataCommonEvents[1].list = [null]; assert.equal(api.useSlot(0).ok, false); c.$dataCommonEvents[1].list = saved;
    c.$gameMap._interpreter.setup = () => { throw Error("setup test failure"); };
    assert.equal(api.useSlot(0).ok, false); assert.equal(api.energy(), 10); assert.equal(api.discardPileCount(), 0);
});
test("End never clears a foreign CE that reused the same interpreter", () => {
    const { c, api, seedDeck } = boot(); seedDeck(); api.startCombat(); api.useSlot(0);
    const foreign = [wait(3), end]; c.$gameMap._interpreter.setup(foreign, 4); api.endCombat();
    assert.equal(c.$gameMap._interpreter._list, foreign); assert.equal(c.$gameMap._interpreter.isRunning(), true);
});
test("returned arrays cannot mutate persistent/runtime state; editing combat deck rejects", () => {
    const { api, seedDeck } = boot(); seedDeck(); api.getDeck().pop(); assert.equal(api.getDeck().length, 30); api.startCombat();
    api.hand().pop(); assert.equal(api.hand().length, 5); assert.equal(api.removeDeckAt(0).ok, false); assert.equal(api.addDeckCard(8).ok, false);
    assert.equal(api.startCombat().ok, false); assert.equal(api.getDeck().length, 30);
});

test("ambiguous duplicate skill names never apply card multiplier to another skill", () => {
    const { c, api, seedDeck, enemy, flush } = boot(); seedDeck(); enemy(1, 1, 0, "<PhysicalResist:2>");
    for (const skill of c.$dataSkills.filter(Boolean)) skill.name = "duplicate"; api.rebuildMetadataCache();
    c.$dataCommonEvents[1].list = [script("observed.push(this.calculateDamageAgainstEvent($gameMap.event(1),'skill','duplicate')); observed.push(this.calculateDamageAgainstEvent($gameMap.event(1),'skill',ProjectR.CardSkillDeck.currentContext().skillId));"), end];
    api.startCombat(); api.useSlot(0); flush(); assert.deepEqual(clone(c.observed), [100, 200]);
});

// Phase 2: real Skills/CE/Map records with deterministic physics/HP/VFX stubs.
// Official MZ Interpreter lifecycle remains real; actual MZ/PIXI/DotMove play is manual.
function phase34(order = [164,165,158,161,166], options = {}) {
    const h = phase2(order, options);
    h.select = (slot = 0) => {
        const code = `Key${["Q","E","X","C","V"][slot]}`;
        h.key("keydown", code); h.c.SceneManager._scene.update(); h.key("keyup", code);
    };
    h.click = (button = 0, x = 200, y = 0, release = true) => {
        const event = h.key("mousedown", null, false, { button, pageX:x, pageY:y });
        if (release) h.key("mouseup", null, false, {button});
        return event;
    };
    return h;
}
for (const property of ["energy","hand","draw","discard","projectile","context","CE","VFX"]) test(`Phase34 selection preserves ${property}`,()=>{
    const h=phase34(),before=JSON.stringify(h.api.debugPiles()),commands=h.logs.commands.length;
    h.select(); assert.equal(h.api.isAiming(),true);assert.equal(h.api.aimingSlot(),0);
    assert.equal(h.api.energy(),10);assert.equal(JSON.stringify(h.api.debugPiles()),before);
    assert.equal(h.projectiles().length,0);assert.equal(h.api.currentContext(h.c.$gameMap._interpreter),null);
    assert.equal(h.c.$gameMap._interpreter.isRunning(),false);assert.equal(h.logs.commands.length,commands);
});
for(const id of [164,165]) for(const degrees of [0,45,90,135,180,225,270,315]) test(`Phase34 click ${id} ${degrees}`,()=>{
    const h=phase34([id]);h.select();h.tick();
    const r=degrees*Math.PI/180;h.click(0,200*Math.sin(r),-200*Math.cos(r));
    const c=h.api.currentContext(h.c.$gameMap._interpreter);
    assert.ok(c);angleNear(c.aimAngle,degrees);assert.equal(c.aimSource,"mouse");assert.ok(Object.isFrozen(c));
    h.c.TouchInput.x=-400;h.c.TouchInput.y=100;h.flush();angleNear(c.aimAngle,degrees);
    assert.equal(h.api.isAiming(),false);assert.equal(h.api.hand().length,5);
});
test("Phase34 click-time player/mouse position and mouse overrides active gamepad",()=>{
    const h=phase34();h.select();h.c.$gamePlayer._realX=3;h.c.$gamePlayer._realY=4;
    h.c.TouchInput.x=-900;h.c.TouchInput.y=900;h.c.checkGamepadInput=()=>({x:-1,y:0});h.tick();
    h.click(0,344,192);const c=h.api.currentContext(h.c.$gameMap._interpreter);
    angleNear(c.aimAngle,90);assert.equal(c.aimSource,"mouse");assert.equal(c.aim.realX,3);assert.equal(c.aim.realY,4);
});
test("Phase34 click charges/discards/draws once and replenished mouse card not selected",()=>{
    const h=phase34([164,165]);const before=h.api.hand()[0];h.select();h.tick();h.click();
    assert.equal(h.api.energy(),8);assert.equal(h.api.discardPileCount(),1);assert.equal(h.api.drawPileCount(),24);
    assert.equal(h.api.debugPiles().discard[0],before);assert.equal(h.api.isAiming(),false);
    h.click();assert.equal(h.api.discardPileCount(),1);
});
for(const reason of ["rightClick","escape","sameSlot","api"]) test(`Phase34 cancel ${reason} preserves piles and energy`,()=>{
    const h=phase34(),p=JSON.stringify(h.api.debugPiles());h.select();h.tick();
    if(reason==="rightClick")h.click(2);
    else if(reason==="escape")h.key("keydown","Escape");
    else if(reason==="sameSlot")h.select();else h.api.cancelAiming();
    assert.equal(h.api.isAiming(),false);assert.equal(h.api.energy(),10);assert.equal(JSON.stringify(h.api.debugPiles()),p);
});
test("Phase34 first escape consumed, repeats consumed, next fresh escape normal",()=>{
    const h=phase34();h.select();assert.equal(h.key("keydown","Escape").stopped,true);
    assert.equal(h.key("keydown","Escape",true).stopped,true);h.key("keyup","Escape");
    assert.notEqual(h.key("keydown","Escape").stopped,true);
});
for(const slot of [1,2])test(`Phase34 switch mouse to ${slot===1?"mouse":"nearest"}`,()=>{
    const h=phase34(),old=h.api.hand()[0];h.select();h.tick();h.select(slot);
    assert.equal(h.api.hand()[0],old);assert.equal(h.api.isAiming(),slot===1);
    assert.equal(h.api.discardPileCount(),slot===1?0:1);
});
test("Phase34 insufficient selection and confirmation preserve resources",()=>{
    const h=phase34();h.api.setEnergy(0);h.select();assert.equal(h.api.isAiming(),false);
    h.api.setEnergy(10);h.select();h.tick();h.api.setEnergy(0);h.click();
    assert.equal(h.api.isAiming(),true);assert.equal(h.api.discardPileCount(),0);
    assert.equal(h.api.debugSnapshot().aiming.confirm,"NOT ENOUGH ENERGY");
});
test("Phase34 same frame queued slot plus click selects only; requires fresh press",()=>{
    const h=phase34();h.key("keydown","KeyQ");assert.equal(h.click().stopped,true);
    h.c.SceneManager._scene.update();assert.equal(h.api.isAiming(),true);assert.equal(h.api.discardPileCount(),0);
    h.click();assert.equal(h.api.discardPileCount(),0);h.tick();h.click();assert.equal(h.api.discardPileCount(),1);
});
test("Phase34 held mouse and double click do not activate replenished card",()=>{
    const h=phase34();h.select();h.tick();h.click(0,200,0,false);h.click(0,200,0,false);
    assert.equal(h.api.discardPileCount(),1);h.key("mouseup",null,false,{button:0});h.click();
    assert.equal(h.api.discardPileCount(),1);
});
for(const block of ["message","event","scene","death","reserved"])test(`Phase34 confirm blocked by ${block}`,()=>{
    const h=phase34();h.select();h.tick();
    if(block==="message")h.logs.message=true;
    if(block==="event")h.c.$gameMap._interpreter.setup([script("observed.push(1)"),end],1);
    if(block==="scene")h.logs.changing=true;
    if(block==="death")h.c.ProjectR.PlayerDeathControl={isLocked:()=>true};
    if(block==="reserved")h.logs.reserved=1;
    h.click();assert.equal(h.api.discardPileCount(),0);assert.equal(h.api.energy(),10);
});
for(const cleanup of ["end","transfer","scene","load"])test(`Phase34 cleanup ${cleanup}`,()=>{
    const h=phase34();h.select();
    if(cleanup==="end")h.api.endCombat();
    if(cleanup==="transfer")h.c.$gameMap.setup(2);
    if(cleanup==="scene")h.c.SceneManager._scene.terminate();
    if(cleanup==="load")h.c.DataManager.extractSaveContents({system:{_projectRCardSkillDeck:clone(h.c.$gameSystem._projectRCardSkillDeck)}});
    assert.equal(h.api.isAiming(),false);
});
test("Phase34 UI button priority and menu never confirm",()=>{
    const h=phase34();h.c.SceneManager._scene.createDisplayObjects();h.select();h.tick();
    const scene=h.c.SceneManager._scene,b=scene._projectRCardEnergyButton;
    h.click(0,b.x+5,b.y+5);assert.equal(h.api.discardPileCount(),0);
    scene._menuButton={visible:true,getBounds:()=>({contains:(x,y)=>x===1800&&y===20})};
    h.click(0,1800,20);assert.equal(h.api.discardPileCount(),0);
});
test("Phase34 real official mouse input handlers never see confirm, next press restored",()=>{
    const h=phase34();h.c.Input._currentState={};h.c.MOUSE_LEFT="mouseLeft";
    const src=fs.readFileSync(path.join(root,"js/plugins/Hendrix_Keyboard_Gamepad.js"),"utf8");
    const begin=src.indexOf("document.addEventListener('mousedown', function (e)");
    const finish=src.indexOf("document.addEventListener('wheel'",begin);
    vm.runInContext(src.slice(begin,finish),h.c);
    let mapTouch=0;h.c.document.addEventListener("mousedown",()=>mapTouch++);
    h.select();h.tick();h.click();assert.notEqual(h.c.Input._currentState.mouseLeft,true);assert.equal(mapTouch,0);
    h.click(0,200,0,false);assert.equal(h.c.Input._currentState.mouseLeft,true);assert.equal(mapTouch,1);
    h.key("mouseup",null,false,{button:0});assert.equal(h.c.Input._currentState.mouseLeft,false);
});
test("Phase34 trace sequence includes selection, confirmation and consumption",()=>{
    const h=phase34();h.select();h.tick();h.click();const names=h.api.debugTrace().map(t=>t.message);
    for(const message of ["Mouse Card selected","Aiming started","Mouse confirm","Aim frozen","Main attack click suppressed","Card action accepted","Energy consumed","Discard","Draw","Aiming ended"])assert.ok(names.includes(message),message);
});
test("Phase34 generic Mouse tag supports cards other than Uranus/Neptune",()=>{
    const h=boot();h.seedDeck();h.api.startCombat();assert.equal(h.api.selectSlot(0).ok,true);
    assert.equal(h.api.isAiming(),true);assert.equal(h.api.discardPileCount(),0);
});
test("Phase34 same-position click remains finite and explicitly mouse sourced",()=>{
    const h=phase34();h.select();h.tick();h.click(0,0,0);
    const c=h.api.currentContext(h.c.$gameMap._interpreter);assert.ok(Number.isFinite(c.aimAngle));assert.equal(c.aimSource,"mouse");
});
test("Phase34 no enemy required",()=>{
    const h=phase34();h.earth._erased=h.pluto._erased=true;h.select();h.tick();h.click();assert.equal(h.api.discardPileCount(),1);
});
test("Phase34 CE start failure leaves selected card and energy intact",()=>{
    const h=phase34();h.select();h.tick();h.c.$gameMap._interpreter.setup=()=>{throw Error("test");};
    h.click();assert.equal(h.api.discardPileCount(),0);assert.equal(h.api.energy(),10);assert.equal(h.api.isAiming(),true);
});
test("Phase34 persistent save data excludes transient selection",()=>{
    const h=phase34(),before=JSON.stringify(h.c.$gameSystem._projectRCardSkillDeck);h.select();
    assert.equal(JSON.stringify(h.c.$gameSystem._projectRCardSkillDeck),before);
});
test("Phase34 arena and return buttons do not confirm",()=>{
    const h=phase34();h.c.SceneManager._scene.createDisplayObjects();h.select();h.tick();
    const b=h.c.SceneManager._scene._projectRCardArenaButton;h.click(0,b.x+5,b.y+5);
    assert.equal(h.api.discardPileCount(),0);assert.equal(h.api.energy(),10);
});
test("Phase34 guide reuses Graphics/Bitmap, follows moving player, clears on cancel",()=>{
    const h=phase34();const lines=[];
    h.c.PIXI={Graphics:class extends h.c.Sprite{clear(){lines.length=0;}lineStyle(){}moveTo(){}lineTo(x,y){lines.push([x,y]);}}};
    h.c.SceneManager._scene.createDisplayObjects();const p=h.c.SceneManager._scene._projectRCardAimPreview;
    h.select();h.c.TouchInput.x=200;h.c.TouchInput.y=0;p.update();const count=h.logs.bitmaps;
    assert.equal(p.visible,true);angleNear(Math.atan2(lines[0][0],-lines[0][1])*180/Math.PI,90);
    h.c.$gamePlayer._realX=2;h.c.TouchInput.x=96;h.c.TouchInput.y=-200;p.update();assert.equal(p.x,96);
    assert.equal(h.logs.bitmaps,count);assert.ok(Math.abs(lines[0][0])<1e-7);
    h.api.cancelAiming();p.update();assert.equal(p.visible,false);assert.equal(lines.length,0);
});
test("Phase34 HUD selected highlight moves and clears",()=>{
    const h=phase34();h.c.SceneManager._scene.createDisplayObjects();const hud=h.c.SceneManager._scene._projectRCardHandHUD;
    h.select();hud.redraw();assert.ok(hud._cards[0].bitmap.text.includes("AIM"));
    h.tick();h.select(1);hud.redraw();assert.ok(hud._cards[1].bitmap.text.includes("AIM"));
    h.api.cancelAiming();assert.equal(h.api.aimingSlot(),-1);
});
test("Phase34 battle exit cancels selection without changing existing end-combat policy",()=>{
    const h=phase34(),control=phase34();h.select();
    for(const run of [h,control]){run.c.ProjectRCombatPresence.isCombatActive=()=>false;run.c.SceneManager._scene.update();}
    assert.equal(h.api.isAiming(),false);assert.equal(JSON.stringify(h.api.debugPiles()),JSON.stringify(control.api.debugPiles()));
    assert.equal(h.api.energy(),control.api.energy());
});
function arenaFacingCase(mapId=10) {
    const h=phase34([164,165,158],{officialAim:true,realMain:true});h.c.$gameMap.setup(mapId);
    const p=h.c.$gamePlayer;p.fixed=false;p._direction=2;p.direction=function(){return this._direction;};p.resetStopCount=()=>{};
    const source=fs.readFileSync(path.join(root,"js/rmmz_objects.js"),"utf8");
    const tail=source.slice(source.indexOf("Game_CharacterBase.prototype.setDirection = function"));
    p.setDirection=vm.runInContext('('+tail.slice(tail.indexOf('function'),tail.indexOf('\n};')+2)+')',h.c);
    p.isOnLadder=()=>false;
    const dot=fs.readFileSync(path.join(root,"js/plugins/DotMoveSystem.js"),"utf8");
    const start=dot.indexOf("        setDirection(d) {");const method=dot.slice(start,dot.indexOf('\n        }',start)+10);
    const direction=vm.runInContext('({'+method+'}).setDirection',h.c);
    h.move=d=>{h.c.Input.dir4=d;direction.call({_character:p},d);p._realX+=.1;};
    h.update=()=>{h.c.Graphics.frameCount++;h.c.SceneManager._scene.update();};
    h.swing=()=>{h.logs.weaponType="sword";const i=new h.c.Game_Interpreter();h.api.beginMainAttack(i,"sword");
        p.setDirectionFix(false);p.turnToward("mouse or gamepad",false);
        h.c.PluginManager.callCommand(i,"Hendrix_Action_Engine","SwingWeapon",{eventId:"player",speed:"10"});return i;};
    return h;
}
for(const [angle,dir] of [[0,8],[90,6],[180,2],[270,4],[30,8],[120,6]])test(`Phase341 arena gun continuous ${angle}`,()=>{
    const h=arenaFacingCase();mousePoint(h,angle);h.update();assert.equal(h.c.$gamePlayer.direction(),dir);assert.equal(h.c.$gamePlayer.isDirectionFixed(),true);
});
for(const [move,angle,dir] of [[6,0,8],[4,90,6]])test(`Phase341 gun moving ${move} aim ${dir}`,()=>{
    const h=arenaFacingCase();mousePoint(h,angle);h.update();const x=h.c.$gamePlayer._realX;h.move(move);h.update();
    assert.equal(h.c.$gamePlayer.direction(),dir);assert.ok(h.c.$gamePlayer._realX>x);
});
test("Phase341 reproduce unlocked DotMove overwrite before swing lock",()=>{
    const h=arenaFacingCase();h.logs.weaponType="sword";mousePoint(h,90);h.c.$gamePlayer.turnToward("mouse or gamepad",false);
    assert.equal(h.c.$gamePlayer.direction(),6);h.move(8);assert.equal(h.c.$gamePlayer.direction(),8);
});
for(const [move,angle,dir] of [[6,0,8],[4,90,6],[2,270,4],[8,180,2]])test(`Phase341 sword moving ${move} freezes ${dir}`,()=>{
    const h=arenaFacingCase();mousePoint(h,angle);h.swing();const x=h.c.$gamePlayer._realX;
    for(let n=0;n<5;n++){mousePoint(h,(angle+180)%360);h.move(move);h.update();assert.equal(h.c.$gamePlayer.direction(),dir);}
    assert.ok(h.c.$gamePlayer._realX>x);for(let n=0;n<7;n++)h.update();h.move(move);
    assert.equal(h.c.$gamePlayer.isDirectionFixed(),false);assert.equal(h.c.$gamePlayer.direction(),move);
});
for(const prior of [false,true])test(`Phase341 sword restores prior fix ${prior}`,()=>{
    const h=arenaFacingCase();h.c.$gamePlayer.setDirectionFix(prior);mousePoint(h,90);h.swing();
    for(let n=0;n<12;n++)h.update();assert.equal(h.c.$gamePlayer.isDirectionFixed(),prior);
});
for(const cancel of ["escape","right","same","cast"])test(`Phase341 gun card ${cancel} resumes facing`,()=>{
    const h=arenaFacingCase();h.select();h.update();mousePoint(h,0);h.update();assert.equal(h.c.$gamePlayer.direction(),8);
    if(cancel==="escape")h.key("keydown","Escape");else if(cancel==="right")h.click(2);else if(cancel==="same")h.select();else{h.click();h.flush();}
    mousePoint(h,270);h.update();assert.equal(h.c.$gamePlayer.direction(),4);assert.equal(h.api.isAiming(),false);
});
test("Phase341 Map001 receives no extra continuous facing or sword fix",()=>{
    const h=arenaFacingCase(1);mousePoint(h,90);h.update();assert.equal(h.c.$gamePlayer.direction(),2);
    h.c.$gamePlayer.setDirectionFix(false);h.c.$gamePlayer.turnToward("mouse or gamepad",false);h.c.$gamePlayer.setDirectionFix(true);
    h.update();assert.equal(h.c.$gamePlayer.direction(),6);h.c.$gamePlayer.setDirectionFix(false);h.swing();assert.equal(h.c.$gamePlayer.isDirectionFixed(),false);
});
test("Phase341 Gun Sword Gun switch releases owned fix and resumes aim",()=>{
    const h=arenaFacingCase();mousePoint(h,90);h.update();h.logs.weaponType="sword";h.update();assert.equal(h.c.$gamePlayer.isDirectionFixed(),false);
    h.swing();h.logs.weaponType="gun";mousePoint(h,0);h.update();assert.equal(h.c.$gamePlayer.direction(),8);
});
for(const lock of ["message","scene","event"])test(`Phase341 gun ${lock} lock recovers`,()=>{
    const h=arenaFacingCase();mousePoint(h,90);h.update();
    if(lock==="message")h.logs.message=true;if(lock==="scene")h.logs.changing=true;
    if(lock==="event")h.c.$gameMap._interpreter.setup([script("observed.push(1)"),end],1);
    mousePoint(h,270);h.update();assert.equal(h.c.$gamePlayer.isDirectionFixed(),false);
    h.logs.message=h.logs.changing=false;h.c.$gameMap._interpreter.clear();h.update();assert.equal(h.c.$gamePlayer.direction(),4);
});
for(const cleanup of ["transfer","end","terminate"])test(`Phase341 owned facing cleanup ${cleanup}`,()=>{
    const h=arenaFacingCase();mousePoint(h,90);h.swing();
    if(cleanup==="transfer")h.c.$gameMap.setup(1);else if(cleanup==="end")h.api.endCombat();else h.c.SceneManager._scene.terminate();
    assert.equal(h.c.$gamePlayer.isDirectionFixed(),false);
});
test("Phase341 official Swing instance lifetime releases lock after final frame",()=>{
    const h=arenaFacingCase();h.logs.weaponType="sword";h.c.$gamePlayer.screenZ=()=>3;
    h.c.ImageManager.loadPicture=()=>new h.c.Bitmap(48,48);h.c.$gameMap.tileWidth=()=>48;
    const tail=engineSource.slice(engineSource.indexOf("class Sprite_WeaponSwing extends Sprite"));
    const end=/\r?\n\}/.exec(tail);vm.runInContext(tail.slice(0,end.index+end[0].length),h.c);
    vm.runInContext(officialCommand("SwingWeapon"),h.c);
    const parent=new h.c.Sprite();h.c.SceneManager._scene._spriteset={_tilemap:parent};
    mousePoint(h,90);const i=new h.c.Game_Interpreter();h.api.beginMainAttack(i,"sword");
    h.c.$gamePlayer.turnToward("mouse or gamepad",false);
    h.c.PluginManager.callCommand(i,"Hendrix_Action_Engine","SwingWeapon",{eventId:"player",weaponSprite:"Pan",offset:"0,-15",speed:"10",visualSettings:'{"traitEffect":"false"}'});
    const swing=parent.children[0];assert.ok(swing);h.c.Graphics.frameCount+=100;h.c.SceneManager._scene.update();
    assert.equal(h.c.$gamePlayer.isDirectionFixed(),true); // Not an arbitrary wall-clock timer.
    for(let n=0;n<10;n++){swing.update();h.move(8);h.update();assert.equal(h.c.$gamePlayer.direction(),6);}
    swing.update();h.update();assert.equal(h.c.$gamePlayer.isDirectionFixed(),false);h.move(8);assert.equal(h.c.$gamePlayer.direction(),8);
});
test("Phase341 actual CE4 keeps expanded hitbox in arena",()=>{
    const h=arenaFacingCase();h.logs.weaponType="sword";mousePoint(h,90);runCommon(h,4);
    assert.equal(h.c.$gamePlayer.direction(),6);const size=/<hitbox: ([\d.]+), ([\d.]+)>/.exec(h.logs.hitboxArgs.notetag);
    assert.ok(Math.abs(Number(size[1])-1.62)<1e-9);assert.ok(Math.abs(Number(size[2])-2.025)<1e-9);
    assert.match(h.logs.hitboxArgs.position,/1.25/);h.move(8);assert.equal(h.c.$gamePlayer.direction(),6);
});
function phase2(order = [158, 165, 164, 161, 166], options = {}) {
    const h = boot({ debug: true, realData: true, ...options });
    if (!h.api.debugSetupTestDeck().ok) return h;
    const deck = clone(h.api.getDeck());
    for (const id of order) { const index = deck.indexOf(id); assert.ok(index >= 0); deck.splice(index, 1); }
    h.c.$gameSystem._projectRCardSkillDeck.deck = [...deck, ...order.slice().reverse()];
    vm.runInContext("Math.random = () => 0.999999;", h.c);
    const map = JSON.parse(fs.readFileSync(path.join(root, "data/Map001.json"), "utf8"));
    h.earth = h.enemy(40, 1, 0, map.events[1].note); h.earth.hp = 10000;
    h.pluto = h.enemy(41, 2, 0, map.events[2].note); h.pluto.hp = 10000;
    assert.ok(h.api.startCombat().ok);
    h.tick = (n = 1) => { for (let i = 0; i < n; i++) { h.c.Graphics.frameCount++; h.c.$gameMap.update(true); } };
    h.projectiles = () => h.c.$gameMap.events().filter(e => h.api.projectileContext(e));
    h.run = (text, eventId = 0) => {
        const interpreter = new h.c.Game_Interpreter(); interpreter.setup([script(text), end], eventId); interpreter.update(); return interpreter;
    };
    h.gun = () => { h.run("ProjectR.CardSkillDeck.beginMainAttack(this); observed.push($gameMap.spawnEvent(1,0,0));"); return h.c.$gameMap.event(h.c.observed.pop()); };
    h.hit = (bullet, target = h.earth) => {
        bullet._realX = target._realX; bullet._realY = target._realY;
        h.run("if(checkCollide(this._eventId,'<weaponAttack>')) PluginManager.callCommand(this,'Hendrix_Action_Engine','UpdateEventHp',{eventId:'this',value:'- player weapon'});", target.eventId());
    };
    return h;
}
const phase2Expected = [
    [158,21,"水星弾","Mercury","Magic",1,1,"Nearest",8,4],
    [159,22,"金星光","Venus","Magic",1,2,"Nearest",7,4],
    [160,23,"岩砕撃","Earth","Physical",1,2,"Nearest",3,4],
    [161,24,"火星斬","Mars","Physical",1,2,"Nearest",3,4],
    [162,25,"木星雷","Jupiter","Magic",1,3,"Nearest",8,4],
    [163,26,"土星環刃","Saturn","Physical",2,3,"Nearest",5,3],
    [164,27,"天王風","Uranus","Magic",2,2,"Mouse",8,3],
    [165,28,"海王水槍","Neptune","Magic",3,3,"Mouse",10,2],
    [166,29,"冥蝕","Pluto","Magic",3,4,"Nearest",7,2]
];
for (const [id,ce,name,attribute,type,rarity,cost,target,range,copies] of phase2Expected) {
    test(`Phase2 real metadata ${id} ${attribute}, official sample formula, thin CE`, () => {
        const { c, api } = boot({ realData: true });
        const m = api.metadata(id), skill = c.$dataSkills[id];
        assert.deepEqual(clone({ ...m, vfx: undefined }), { skillId:id,actionCE:ce,attribute,type,rarity,cost,target,range,valid:true });
        assert.equal(skill.name, name); assert.equal(skill.damage.type, 1); assert.equal(skill.damage.elementId, 0);
        assert.equal(skill.damage.formula, type === "Physical" ? "a.atk - b.def" : "(a.mat + 15) / 2 - b.mdf");
        assert.equal(skill.hitType, type === "Physical" ? 1 : 2);
        assert.equal(c.$dataCommonEvents[ce].list[0].parameters[0], "ProjectR.CardSkillDeck.executeTestCard(this);");
        assert.equal(c.$dataCommonEvents[ce].list.length, 2);
        assert.equal(copies, 5 - rarity);
    });
    test(`Phase2 ${attribute} executes official Skill damage and no main-hit ENERGY`, () => {
        const h = phase2([id]); const energy = h.api.energy();
        assert.ok(h.api.useSlot(0).ok); h.flush(); h.tick(20);
        assert.equal(h.api.energy(), energy - cost);
        assert.ok(h.logs.damageSkills.some(d => d.source === "skill" && d.skill === id));
        assert.ok(h.earth.hp < 10000);
        assert.equal(h.api.discardPileCount(), 1); assert.equal(h.api.drawPileCount(), 24);
        assert.ok(h.logs.debug.some(row => row[1]?.skillId === id && row[1]?.type === type));
    });
}
test("Phase2 no automatic gifts; debug false rejects setup and command", () => {
    const h = boot({ realData: true });
    assert.equal(h.api.getDeck().length, 0); assert.equal(h.api.ownedCount(158), 0);
    assert.equal(h.api.debugSetupTestDeck().ok, false); h.command("DebugSetupTestDeck");
    assert.equal(h.api.getDeck().length, 0);
});
test("Phase2 exact owned counts, exact rarity caps, 30/5/25/0 and debug idempotence", () => {
    const h = boot({ debug:true,realData:true });
    assert.ok(h.api.debugSetupTestDeck().ok); assert.ok(h.api.debugSetupTestDeck().ok);
    assert.equal(h.api.getDeck().length,30); assert.equal(h.api.validateDeck().valid,true);
    for (const row of phase2Expected) {
        assert.equal(h.api.ownedCount(row[0]), row[9]);
        assert.equal(h.api.getDeck().filter(id=>id===row[0]).length,row[9]);
    }
    assert.ok(h.api.startCombat().ok);
    assert.equal(h.api.energy(),10); assert.equal(h.api.hand().length,5);
    assert.equal(h.api.drawPileCount(),25); assert.equal(h.api.discardPileCount(),0);
    assert.equal(h.api.debugSetupTestDeck().ok,false);
});
test("Phase2 malformed definition prevents transactional debug replacement", () => {
    const h=boot({debug:true,realData:true}); h.api.gainCard(158,1);
    h.c.$dataSkills[166].note=""; h.api.rebuildMetadataCache();
    assert.equal(h.api.debugSetupTestDeck().ok,false); assert.equal(h.api.ownedCount(158),1); assert.equal(h.api.getDeck().length,0);
});
test("Phase2 A/B projectile immutable context, simultaneous existence, delayed A hit", () => {
    const h=phase2([158,165]); h.api.useSlot(0); h.flush();
    const a=h.projectiles()[0],ca=h.api.projectileContext(a);
    h.api.useSlot(1); h.flush(); const b=h.projectiles().find(e=>e!==a),cb=h.api.projectileContext(b);
    assert.ok(Object.isFrozen(ca)); assert.ok(Object.isFrozen(cb)); assert.notEqual(ca.actionId,cb.actionId);
    assert.deepEqual([ca.skillId,ca.attribute,ca.type],[158,"Mercury","Magic"]);
    assert.deepEqual([cb.skillId,cb.attribute,cb.type],[165,"Neptune","Magic"]);
    assert.equal(h.projectiles().length,2); h.tick(3);
    assert.equal(h.logs.damageSkills[0].skill,158); assert.equal(h.logs.hpUpdates[0][1],-163);
    assert.equal(h.api.projectileContext(a),null); assert.equal(h.api.contextByActionId(ca.actionId),null);
    assert.equal(h.api.projectileContext(b).skillId,165); h.tick(8);
    assert.equal(h.logs.damageSkills[1].skill,165); assert.equal(h.logs.hpUpdates[1][1],-144);
    assert.equal(h.projectiles().length,0);
});
test("Phase2 destroyed projectile and reused numeric ID cannot inherit context or be erased", () => {
    const h=phase2([158]); h.api.useSlot(0); h.flush(); const p=h.projectiles()[0],ctx=h.api.projectileContext(p);
    const replacement=h.enemy(p.eventId(),1,1);
    h.tick(); assert.equal(h.c.$gameMap.event(p.eventId()),replacement); assert.equal(h.api.projectileContext(replacement),null);
    assert.equal(h.api.contextByActionId(ctx.actionId),null); assert.equal(h.api.destroyCardProjectile(p),false);
});
for (const mode of ["destroy","erase","end","map","expiry","wall","range"]) test(`Phase2 projectile cleanup ${mode}`,()=>{
    const h=phase2([158]); h.api.useSlot(0); h.flush(); const p=h.projectiles()[0],ctx=h.api.projectileContext(p);
    h.earth._erased=true; h.pluto._erased=true;
    if(mode==="destroy")h.api.destroyCardProjectile(p);
    if(mode==="erase"){p._erased=true;h.tick();}
    if(mode==="end")h.api.endCombat();
    if(mode==="map")h.c.$gameMap.setup(2);
    if(mode==="expiry"){p.route=null;h.tick(241);}
    if(mode==="wall"){h.enemy(42,0.25,0,"<destroyProjectile>").databaseEnemy=null;h.tick();}
    if(mode==="range")h.tick(40);
    assert.equal(h.api.projectileContext(p),null);assert.equal(h.api.contextByActionId(ctx.actionId),null);
    assert.equal(h.c.$gameMap.event(p.eventId()),null);assert.equal(h.c.SceneManager._scene._spriteset._characterSprites.length,0);
    assert.equal(h.logs.hpUpdates.length,0);assert.equal(h.api.energy(),mode==="end"?0:9);
});
test("Phase2 main-hit integration: 5, gun6, miss6, gun7, sword multi8, card8",()=>{
    const h=phase2([158]);h.api.setEnergy(5);
    const a=h.gun();h.hit(a);assert.equal(h.api.energy(),6);
    h.c.$gameMap.unspawnEvent(a.eventId());const missed=h.gun();h.c.$gameMap.unspawnEvent(missed.eventId());assert.equal(h.api.energy(),6);
    const b=h.gun();h.hit(b);assert.equal(h.api.energy(),7);h.hit(b);assert.equal(h.api.energy(),7);
    const sword=h.c.$gameMap.spawnEvent();const hitbox=h.c.$gameMap.event(sword);hitbox.event=()=>({note:"<playerAttack>"});
    hitbox._realX=1;hitbox._realY=0;h.pluto._realX=1;
    h.run("ProjectR.CardSkillDeck.beginMainAttack(this,'sword'); for(const id of [40,41,40]) if(checkCollide(id,'<playerAttack>')) PluginManager.callCommand(this,'Hendrix_Action_Engine','UpdateEventHp',{eventId:String(id),value:'- player weapon'});");
    assert.equal(h.api.energy(),8);
    h.api.useSlot(0);h.flush();h.api.setEnergy(8);h.tick(10);assert.equal(h.api.energy(),8);
});
test("Phase2 two bullets in flight retain separate shot tokens, older bullet hits last",()=>{
    const h=phase2();h.api.setEnergy(5);const a=h.gun(),b=h.gun();h.hit(b);assert.equal(h.api.energy(),6);
    b._realX=10;h.hit(a);assert.equal(h.api.energy(),7);h.hit(a);assert.equal(h.api.energy(),7);
});
test("Phase2 multiple bullets from one input still have per-shot tokens",()=>{
    const h=phase2();h.api.setEnergy(5);h.run("ProjectR.CardSkillDeck.beginMainAttack(this); observed.push($gameMap.spawnEvent(1),$gameMap.spawnEvent(1));");
    const[a,b]=h.c.observed.map(id=>h.c.$gameMap.event(id));h.hit(a);a._realX=10;h.hit(b);assert.equal(h.api.energy(),7);
});
test("Phase2 actual zero HP change, collision miss, and damage without collision give no ENERGY",()=>{
    const h=phase2();h.api.setEnergy(5);const a=h.gun();h.logs.immune=true;h.hit(a);assert.equal(h.api.energy(),5);
    h.logs.immune=false;h.logs.forceMiss=true;h.hit(a);assert.equal(h.api.energy(),5);
    h.run("ProjectR.CardSkillDeck.beginMainAttack(this);PluginManager.callCommand(this,'Hendrix_Action_Engine','UpdateEventHp',{eventId:'40',value:'-10'});");
    assert.equal(h.api.energy(),5);
});
test("Phase2 fallback entry token reused for one attack, next input recovers again",()=>{
    const h=phase2();h.api.setEnergy(5);const id=h.c.$gameMap.spawnEvent(),e=h.c.$gameMap.event(id);
    e.event=()=>({note:"<playerAttack>"});e._realX=1;e._realY=0;
    const attack="ProjectR.CardSkillDeck.beginMainAttack(this,'fallback');for(let n=0;n<2;n++)if(checkCollide(40,'<playerAttack>'))PluginManager.callCommand(this,'Hendrix_Action_Engine','UpdateEventHp',{eventId:'40',value:'-10'});";
    h.run(attack);assert.equal(h.api.energy(),6);h.run(attack);assert.equal(h.api.energy(),7);
});
test("Phase2 collision captures source before another interpreter overwrites lastSource",()=>{
    const h=phase2();h.api.setEnergy(5);const b=h.gun();b._realX=1;
    const i=new h.c.Game_Interpreter();i.setup([script("checkCollide(40,'<weaponAttack>');"),wait(1),script("PluginManager.callCommand(this,'Hendrix_Action_Engine','UpdateEventHp',{eventId:'40',value:'-10'});"),end],0);i.update();
    h.c.CollisionManager.lastSourceEventId=999;i.update();i.update();assert.equal(h.api.energy(),6);
});
test("Phase2 old combat tokens and bullets cannot recover in a new session",()=>{
    const h=phase2();const b=h.gun(),token=h.api.createMainAttackToken();h.api.endCombat();h.api.startCombat();h.api.setEnergy(5);
    h.hit(b);assert.equal(h.api.energy(),5);assert.equal(h.api.notifyMainAttackHit(token),false);
});
test("Phase2 inactive main notifications are inert and official damage still delegates",()=>{
    const h=phase2();h.api.endCombat();const b=h.gun();assert.equal(h.api.beginMainAttack(new h.c.Game_Interpreter()),null);
    h.hit(b);assert.equal(h.earth.hp,9990);assert.equal(h.api.energy(),0);
});
test("Phase2 direct/area cards have once-per-enemy damage, no Context retained",()=>{
    const h=phase2([163]);h.api.useSlot(0);const context=h.api.currentContext(h.c.$gameMap._interpreter);h.flush();
    assert.deepEqual(h.logs.hpUpdates.map(v=>v[0]),[40,41]);assert.equal(h.api.contextByActionId(context.actionId),null);
});
test("Phase2 live Earth/Pluto tags give reciprocal Pluto multiplier and correct resistance",()=>{
    const h=phase2();near(h.api.cardDamageMultiplier(166,h.earth),1.5*1.25);
    near(h.api.cardDamageMultiplier(160,h.pluto),1.5*1.25);near(h.api.cardDamageMultiplier(166,h.pluto),1*.75);
    near(h.api.resistanceMultiplier("Physical",h.earth),.75);near(h.api.resistanceMultiplier("Magic",h.earth),1.25);
});
test("Phase2 production damage emits no debug multiplier logs",()=>{
    const h=boot({realData:true});for(const row of phase2Expected){h.api.gainCard(row[0],row[9]);for(let n=0;n<row[9];n++)h.api.addDeckCard(row[0]);}
    h.enemy(40,1,0);vm.runInContext("Math.random=()=>0.999999;",h.c);h.api.startCombat();h.api.useSlot(0);h.flush();
    assert.equal(h.logs.debug.length,0);
});
test("Phase2 insufficient cost dims card, rejects input, preserves all piles",()=>{
    const h=phase2([166]);h.c.SceneManager._scene.createDisplayObjects();h.api.setEnergy(0);h.c.SceneManager._scene.update();
    const before=[clone(h.api.hand()),h.api.drawPileCount(),h.api.discardPileCount()];assert.equal(h.api.useSlot(0).ok,false);
    assert.deepEqual([clone(h.api.hand()),h.api.drawPileCount(),h.api.discardPileCount()],before);
    assert.ok(h.logs.fills.some(v=>v[4]==="rgba(0,0,0,0.55)"));
});
test("Phase2 exact deck reshuffles after 26 uses with manual ENERGY refill",()=>{
    const h=phase2();for(let n=0;n<26;n++){h.api.setEnergy(10);assert.ok(h.api.useSlot(0).ok);h.flush();h.tick(2);}
    assert.equal(h.api.discardPileCount(),0);assert.equal(h.api.drawPileCount(),25);assert.equal(h.api.hand().length,5);
});
for(const key of ["MercuryShot_Test","MarsSlash_Test","PlutoEclipse_Test"])test(`Phase2 VFX registry ${key}`,()=>{
    const {api}=boot();const v=api.testVfxRegistry[key];assert.ok(Object.isFrozen(v));assert.ok(v.rows>0&&v.columns>0);
    assert.ok(fs.existsSync(path.join(root,"img/pictures/ProjectR_CardTest",v.file+".png")));
});
for(const id of[158,161,166])test(`Phase2 real Show VFX args and owned sprite tint ${id}`,async()=>{
    const h=phase2([id],{assets:true});h.api.useSlot(0);h.flush();await new Promise(resolve=>setImmediate(resolve));h.tick();
    const cmd=h.logs.commands.find(v=>v[1]==="showAnimatedPicture"&&JSON.parse(v[2].positionSettings).eventId!=="player");assert.ok(cmd);
    assert.equal(JSON.parse(cmd[2].spritesheetSettings).spritesheetFile,"ProjectR_CardTest/"+h.api.testVfxRegistry[h.api.metadata(id).vfx].file);
    assert.equal(h.logs.effects.find(e=>e.note===cmd[2].note).sprite.tint,parseInt(h.api.testVfxRegistry[h.api.metadata(id).vfx].tint.slice(1),16));
});
test("Phase2 missing VFX never loads fatal ImageManager path or blocks damage",async()=>{
    const h=phase2([166],{assets:false});h.api.useSlot(0);h.flush();await new Promise(resolve=>setImmediate(resolve));h.tick();
    assert.ok(h.earth.hp<10000);assert.equal(h.logs.images.length,0);assert.equal(h.logs.effects.length,0);
    assert.ok(h.logs.warnings.some(s=>s.includes("VFX素材なし")));
});
test("Phase2 slow asset and target readiness is bounded; destroy/transfer cancels pending VFX",async()=>{
    const h=phase2([158],{assets:true});h.logs.bitmapNotReady=true;h.logs.spriteNotReady=true;
    h.api.useSlot(0);h.flush();await new Promise(resolve=>setImmediate(resolve));h.tick();assert.equal(h.logs.effects.length,0);
    h.api.endCombat();h.logs.bitmapNotReady=false;h.logs.spriteNotReady=false;h.tick();assert.equal(h.logs.effects.length,0);
});
test("Phase2 readiness polling waits for BOTH sheet and target before official Show VFX",async()=>{
    const h=phase2([166],{assets:true});h.logs.bitmapNotReady=true;h.logs.spriteNotReady=true;
    h.api.useSlot(0);h.flush();await new Promise(resolve=>setImmediate(resolve));h.tick();assert.equal(h.logs.effects.length,0);
    h.logs.bitmapNotReady=false;h.tick();assert.equal(h.logs.effects.length,0);h.logs.spriteNotReady=false;h.tick();assert.equal(h.logs.effects.length,2);
});
test("Phase2 bridge executes actual AE 1.6.6b UpdateEventHp command for gun and card",()=>{
    const h=phase2([158],{officialHp:true});h.api.setEnergy(5);const b=h.gun();h.hit(b);
    assert.equal(h.earth.hp,9990);assert.equal(h.api.energy(),6);
    h.api.useSlot(0);h.flush();h.tick(10);assert.equal(h.earth.hp,9827);assert.equal(h.api.energy(),5);
});
test("Phase2 replacing Nearest event between card use and CE does not hit reused ID",()=>{
    const h=phase2([161]);h.api.useSlot(0);const replacement=h.enemy(40,1,0);h.flush();
    assert.equal(replacement.hp,100);assert.equal(h.logs.hpUpdates.length,0);
});
test("Phase2 card hitbox matches official <hitbox: width, height> syntax",()=>{
    const h=phase2([158]);h.api.useSlot(0);h.flush();
    assert.match(h.logs.hitboxArgs.notetag,/<hitbox: 0\.3, 0\.3>/);assert.equal(h.logs.hitboxArgs.wait,"");
    assert.equal(h.logs.hitboxArgs.comment,"");
});
test("Phase2 range cleanup uses DotMovePoint getters, not object-spread _x/_y",()=>{
    const h=phase2([158]);h.earth._erased=true;h.pluto._erased=true;
    // Nearest still needs a live target for activation; erase it only after launch.
    h.earth._erased=false;assert.ok(h.api.useSlot(0).ok);h.flush();h.earth._erased=true;
    const p=h.projectiles()[0];assert.ok(p.positionPoint() instanceof h.c.DotMovePoint);
    h.tick(34);assert.equal(h.api.projectileContext(p),null);assert.equal(h.c.$gameMap.event(p.eventId()),null);
});
test("Phase2 Magic projectile A hits during Physical card B's waiting CE without changing Type",()=>{
    const h=phase2([158,161]);h.api.useSlot(0);h.flush();
    h.c.$dataCommonEvents[24].list=[script("ProjectR.CardSkillDeck.executeTestCard(this);"),wait(30),end];
    assert.ok(h.api.useSlot(1).ok);h.c.$gameMap._interpreter.update();
    assert.equal(h.api.currentContext(h.c.$gameMap._interpreter).type,"Physical");
    h.tick(3);
    const entry=h.logs.debug.find(row=>row[1]?.skillId===158)[1];
    assert.equal(entry.from,"Mercury");assert.equal(entry.type,"Magic");assert.equal(entry.resistance,1.25);
    assert.equal(h.api.currentContext(h.c.$gameMap._interpreter).skillId,161);
    assert.deepEqual(h.logs.hpUpdates.map(row=>row[1]),[-50,-163]);
});

// Phase 3 regressions: real AE collision / spawn-command / HP-command and real CE1/3/4.
function runCommon(h, id, eventId = 0) {
    const i = new h.c.Game_Interpreter(); i.setup(h.c.$dataCommonEvents[id].list, eventId);
    for (let n = 0; n < 100 && i.isRunning(); n++) { h.c.Graphics.frameCount++; i.update(); }
    assert.equal(i.isRunning(), false, `CE${id} finished`); return i;
}
function realGun() {
    const h = phase2([158], { officialCollision: true, officialHp: true, realMain: true });
    h.api.setEnergy(5); runCommon(h, 1);
    h.bullet = h.c.$gameMap.events().find(e => e.event().note === "<weaponAttack>");
    assert.ok(h.bullet); return h;
}
test("Phase3 CE1 -> official spawn -> Bullet -> real collision -> CE3 HP -> ENERGY +1 (no dmg tag)", () => {
    const h = realGun(); h.bullet._realX = h.earth._realX;
    h.c.CollisionManager.lastSourceEventId = 999; runCommon(h, 3, 40);
    assert.equal(h.earth.hp, 9990); assert.equal(h.api.energy(), 6);
    assert.equal(h.c.CollisionManager.lastSourceEventId, 999, "official no-dmg collision leaves global ID stale");
    const trace = h.api.debugTrace(), spawned = trace.find(e => e.message === "Projectile spawned");
    assert.match(spawned.token, /^gun:/);
    for (const message of ["gun start", "Projectile spawned", "Collision", "HP", "Energy recovery accepted"]) assert.ok(trace.some(e => e.message === message), message);
    assert.ok(trace.filter(e => ["Projectile spawned", "Collision", "HP", "Energy recovery accepted"].includes(e.message)).every(e => e.token === spawned.token));
    assert.equal(h.api.lastDebugResult().energyAfter, 6);
});
test("Phase3 real CE3 duplicate bullet recovers only once", () => {
    const h = realGun(); h.bullet._realX = 1; runCommon(h, 3, 40); runCommon(h, 3, 40);
    assert.equal(h.api.energy(), 6); assert.equal(h.earth.hp, 9990); // Official cooldown=0 also suppresses repeat collisions.
    assert.equal(h.api.notifyMainAttackHit(h.api.lastDebugResult().mainAttackToken), false);
    assert.ok(h.api.debugTrace().some(e => e.message.includes("ignored duplicate")));
});
test("Phase3 real gun miss never recovers", () => {
    const h = realGun(); h.logs.forceMiss = true; runCommon(h, 3, 40);
    assert.equal(h.earth.hp, 10000); assert.equal(h.api.energy(), 5);
});
test("Phase3 real gun zero damage never recovers", () => {
    const h = realGun(); h.bullet._realX = 1; h.c.MaithlCalculateDamagePlayerWeapon = () => 0;
    runCommon(h, 3, 40); assert.equal(h.api.energy(), 5); assert.equal(h.api.lastDebugResult().result, "no damage");
});
test("Phase3 real collision uses earlier bullet, never latest shot or stale source ID", () => {
    const h = realGun(), a = h.bullet; runCommon(h, 1);
    const b = h.c.$gameMap.events().filter(e => e.event().note === "<weaponAttack>").find(e => e !== a);
    b._realX = 1; runCommon(h, 3, 40); const bToken = h.api.lastDebugResult().mainAttackToken;
    b._realX = 20; a._realX = 1; runCommon(h, 3, 40);
    assert.equal(h.api.energy(), 7); assert.notEqual(h.api.lastDebugResult().mainAttackToken, bToken);
});
for (const miss of [false, true]) test(`Phase3 actual CE4 Sword ${miss ? "miss +0" : "hit +1"}`, () => {
    const h = phase2([158], { officialCollision: true, officialHp: true, realMain: true });
    h.logs.weaponType = "sword"; h.enemy(1, miss ? 20 : 1.25, 0, "<enemy>"); h.api.setEnergy(5);
    h.earth._realX = 20; h.pluto._realX = 20;
    runCommon(h, 4); assert.equal(h.api.energy(), miss ? 5 : 6);
    assert.ok(h.api.debugTrace().some(e => e.message === "sword start" && e.token.startsWith("sword:")));
});
test("Phase3 Sword multi-target collision keeps one swing token, logs duplicate", () => {
    const h = phase2([], { officialCollision: true }); h.api.setEnergy(5);
    h.pluto._realX = 1; const id = h.c.$gameMap.spawnEvent(), hitbox = h.c.$gameMap.event(id);
    hitbox.event = () => ({ note: "<playerAttack>" }); hitbox._realX = 1;
    h.run("ProjectR.CardSkillDeck.beginMainAttack(this,'sword'); for (const id of [40,41]) if(checkCollide(id,'<playerAttack>')) PluginManager.callCommand(this,'Hendrix_Action_Engine','UpdateEventHp',{eventId:String(id),value:'-10'});");
    assert.equal(h.api.energy(), 6); assert.equal(h.api.lastDebugResult().result, "duplicate");
});
test("Phase3 fallback uses typed tokens and no card source can become main attack", () => {
    const h = phase2([158], { officialCollision: true }); h.api.setEnergy(5);
    assert.equal(h.api.createMainAttackToken("fallback").attackKind, "fallback");
    h.api.useSlot(0); h.flush(); h.tick(10); assert.equal(h.api.energy(), 4);
    assert.equal(h.api.lastDebugResult().source, "card");
    assert.equal(h.api.debugTrace().filter(e => e.message === "Energy recovery accepted").length, 0);
});
for (const valid of [false, true]) test(`Phase3 AutoStart ${valid ? "valid" : "invalid"} deck and AlwaysShowCardHud`, () => {
    const h = boot({ parameters: { AutoStartCardCombat: "true", AlwaysShowCardHud: "true" } });
    if (valid) h.seedDeck(); h.c.SceneManager._scene.createDisplayObjects(); h.c.SceneManager._scene.start(); h.c.SceneManager._scene.update();
    assert.equal(h.api.isCombatActive(), valid);
    const hud = h.c.SceneManager._scene._projectRCardHandHUD; assert.equal(hud.visible, true); assert.equal(hud._cards.length, 5);
    assert.ok(hud._energy.bitmap.text.some(s => s.includes(valid ? "ENERGY  10" : "DECK INCOMPLETE  0 / 30")));
});
test("Phase3 missing new parameters default to battle auto start and follow BattleHUD visibility", () => {
    const h = boot({ parameters: { AutoStartCardCombat: undefined, AlwaysShowCardHud: undefined } });
    h.seedDeck(); h.c.SceneManager._scene.createDisplayObjects(); h.c.SceneManager._scene.start(); h.c.SceneManager._scene.update();
    assert.equal(h.api.isCombatActive(), true); h.c.ProjectR.BattleHUD._manager.visible = false;
    h.c.SceneManager._scene._projectRCardHandHUD.update(); assert.equal(h.c.SceneManager._scene._projectRCardHandHUD.visible, false);
});
test("Phase3 explicit End stays inactive until next battle entry and restores original visibility", () => {
    const h = boot({ debug: true, parameters: { AutoStartCardCombat: "true", AlwaysShowCardHud: "true" } });
    h.seedDeck(); h.c.SceneManager._scene.createDisplayObjects(); const skill = h.c.ProjectR.BattleHUD._manager._skillHUD;
    skill.visible = false; h.c.SceneManager._scene.start(); h.api.endCombat(); h.c.SceneManager._scene.update();
    assert.equal(h.api.isCombatActive(), false); assert.equal(skill.visible, false);
    assert.equal(h.api.debugSnapshot().active, false); assert.equal(h.api.lastDebugResult(), null);
    assert.equal(h.c.SceneManager._scene._projectRCardHandHUD.visible, false);
    h.c.SceneManager._scene.start(); assert.equal(h.api.isCombatActive(), false);
    h.logs.presence = false; h.c.SceneManager._scene.update();
    h.logs.presence = true; h.c.SceneManager._scene.update(); assert.equal(h.api.isCombatActive(), true);
});
test("Phase3 debug new game can prepare exact30 and autoStart without console", () => {
    const h = boot({ realData: true, debug: true, parameters: { DebugAutoSetupTestDeck: "true", AutoStartCardCombat: "true" } });
    h.c.DataManager.setupNewGame(); h.c.SceneManager._scene.start();
    assert.equal(h.api.validateDeck().valid, true); assert.equal(h.api.hand().length, 5); assert.equal(h.api.drawPileCount(), 25); assert.equal(h.api.energy(), 10);
});
test("Phase3 DebugAutoSetup never overwrites existing save or deck on scene entry/load", () => {
    const h = boot({ realData: true, debug: true, parameters: { DebugAutoSetupTestDeck: "true", AutoStartCardCombat: "true" } });
    h.c.DataManager.extractSaveContents({ system: { _projectRCardSkillDeck: { ownedCards: { 158: 2 }, deck: [158] } } });
    h.c.SceneManager._scene.start(); assert.deepEqual(clone(h.api.getDeck()), [158]); assert.equal(h.api.ownedCount(158), 2);
    h.c.DataManager.extractSaveContents({ system: {} }); h.c.SceneManager._scene.start(); assert.equal(h.api.getDeck().length, 0);
});
test("Phase3 production ignores all debug flags including autoSetup/refill/overlay/arena", () => {
    const h = boot({ realData: true, parameters: { DebugAutoSetupTestDeck: "true", DebugAutoRefillEnergy: "true", ShowDebugOverlay: "true" } });
    h.c.DataManager.setupNewGame(); h.c.SceneManager._scene.createDisplayObjects();
    assert.equal(h.api.getDeck().length, 0); assert.equal(h.c.SceneManager._scene._projectRCardDebug, undefined); assert.equal(h.api.openTestArena(), false);
    assert.equal(h.api.lastDebugResult(), null); assert.equal(h.api.debugSnapshot(), null);
});
test("Phase3 load valid saved deck auto-starts only on map entry", () => {
    const h = boot({ parameters: { AutoStartCardCombat: "true" } }); h.seedDeck();
    const data = clone(h.c.$gameSystem._projectRCardSkillDeck);
    h.c.DataManager.extractSaveContents({ system: { _projectRCardSkillDeck: data } }); assert.equal(h.api.isCombatActive(), false);
    h.c.SceneManager._scene.start(); assert.equal(h.api.energy(), 10); assert.equal(h.api.isCombatActive(), true);
});
test("Phase3 DebugOverlay caches immutable snapshots; unchanged frames no Bitmap or draw", () => {
    const h = phase2([161], { parameters: { ShowDebugOverlay: "true" } }); h.c.SceneManager._scene.createDisplayObjects(); h.c.SceneManager._scene.update();
    const first = h.api.debugSnapshot(), counts = [h.logs.draws, h.logs.bitmaps];
    for (let n = 0; n < 10; n++) h.c.SceneManager._scene.update();
    assert.equal(h.api.debugSnapshot(), first); assert.deepEqual([h.logs.draws, h.logs.bitmaps], counts);
    h.api.useSlot(0); h.flush(); h.c.SceneManager._scene.update(); const d = h.api.lastDebugResult();
    assert.equal(d.source, "card"); assert.equal(d.skillId, 161); assert.equal(d.cardType, "Physical");
    assert.equal(d.targetEventId, 40); assert.equal(d.targetAttribute, "Earth"); assert.equal(d.baseDamage, 100); assert.ok(d.finalDamage > 0);
    assert.ok(h.c.SceneManager._scene._projectRCardDebug.bitmap.text.some(s => s.includes("Damage:")));
    assert.notEqual(h.api.debugSnapshot(), first); assert.equal(Object.isFrozen(d), true);
});
test("Phase3 DebugAutoRefill allows >30 consecutive cards and reshuffle, no main recovery", () => {
    const h = phase2([], { parameters: { DebugAutoRefillEnergy: "true" } });
    for (let n = 0; n < 35; n++) { assert.ok(h.api.useSlot(0).ok); h.flush(); h.tick(2); assert.equal(h.api.energy(), 10); }
    assert.equal(h.api.hand().length + h.api.drawPileCount() + h.api.discardPileCount(), 30);
    assert.equal(h.api.debugSnapshot().autoEnergy, true);
    assert.equal(h.api.debugTrace().filter(t=>t.message === "Energy recovery accepted").length, 0);
});
test("Phase3 transfer cleans projectiles/tokens/VFX but preserves hand/draw/discard/energy", () => {
    const h = phase2([158], { parameters: { AutoStartCardCombat: "true" } });
    h.api.useSlot(0); h.flush(); const projectile = h.projectiles()[0], token = h.api.createMainAttackToken("gun");
    const before = [clone(h.api.hand()), h.api.drawPileCount(), h.api.discardPileCount(), h.api.energy()];
    h.c.$gameMap.setup(10); h.c.SceneManager._scene.start();
    assert.deepEqual([clone(h.api.hand()), h.api.drawPileCount(), h.api.discardPileCount(), h.api.energy()], before);
    assert.equal(h.api.projectileContext(projectile), null); assert.equal(h.api.notifyMainAttackHit(token), false);
    assert.equal(h.api.debugSnapshot().active, true);
});
for (const [id, name, p, m] of [[1,"Mercury",1,1],[2,"Venus",.75,1.25],[3,"Earth",.5,1.5],[4,"Mars",1.25,.75],[5,"Jupiter",1.5,.5],[6,"Saturn",.75,.75],[7,"Uranus",1.25,1.25],[8,"Neptune",.5,1.25],[9,"Pluto",1.25,.75]]) {
    test(`Phase3 Map010 ${name} graphic/attribute/resists/stationary1000HP`, () => {
        const map = JSON.parse(fs.readFileSync(path.join(root,"data/Map010.json"))), e = map.events[id], h = boot();
        const target = h.enemy(id, e.x, e.y, e.note);
        assert.equal(h.api.resistanceMultiplier("Physical", target), p); assert.equal(h.api.resistanceMultiplier("Magic", target), m);
        assert.ok(e.note.includes(`<PlanetAttribute:${name}>`) && e.note.includes("<enemy>"));
        assert.ok(e.note.includes("<hp: 魔獣>")); assert.equal(JSON.parse(fs.readFileSync(path.join(root,"data/Enemies.json")))[5].params[0], 1000);
        assert.equal(e.pages[0].moveType, 0); assert.deepEqual(e.pages[0].list.map(c=>c.code), [230,0]);
        assert.ok(fs.existsSync(path.join(root,"img/characters",e.pages[0].image.characterName+".png")));
        assert.equal(map.data.length, map.width*map.height*6); assert.ok(e.x < map.width && e.y < map.height);
    });
}
test("Phase3 Arena nine distinct graphics, valid MapInfos10, debug labels and F6 round trip", () => {
    const map = JSON.parse(fs.readFileSync(path.join(root,"data/Map010.json"))), h = boot({ debug:true, parameters:{ShowDebugOverlay:"true"} });
    assert.equal(new Set(map.events.filter(Boolean).map(e=>e.pages[0].image.characterName+":"+e.pages[0].image.characterIndex)).size, 9);
    const e=map.events[1];h.enemy(1,e.x,e.y,e.note);h.c.SceneManager._scene.createDisplayObjects();h.c.SceneManager._scene.update();
    assert.ok(h.c.SceneManager._scene.children.some(s=>s.bitmap?.text?.includes("[MERCURY]")));
    h.key("keydown","F6");h.c.SceneManager._scene.update();assert.deepEqual(h.logs.transfer,[10,16,21,8,0]);
    h.c.$gameMap.setup(10);assert.equal(h.api.openTestArena(),true);assert.deepEqual(h.logs.transfer,[1,0,0,6,0]);
});
test("Phase3 F6 refuses conflicting mapping and does not change keyMapper", () => {
    const h=boot({debug:true});h.c.Input.keyMapper[117]="existing";const before=clone(h.c.Input.keyMapper);
    const event=h.key("keydown","F6");h.c.SceneManager._scene.update();assert.equal(event.stopped,undefined);assert.equal(h.logs.transfer,undefined);
    assert.deepEqual(clone(h.c.Input.keyMapper),before);
});
for(const id of [164,165]) for(const degrees of [0,90,180,270]) test(`Phase3 Mouse ${id} aim/projectile/trail ${degrees} degrees, not nearest`,async()=>{
    const h=phase2([id],{assets:true});h.logs.aimDegrees=degrees;
    h.c.TouchInput.x=Math.sin(degrees*Math.PI/180)*200;h.c.TouchInput.y=-Math.cos(degrees*Math.PI/180)*200;
    h.api.useSlot(0);h.flush();
    const p=h.projectiles()[0];near(p._rotation,degrees);assert.equal(h.api.projectileContext(p).aimSource,"mouse");
    assert.equal(h.api.projectileContext(p).targetEventId,0);await new Promise(resolve=>setImmediate(resolve));
    const cmd=h.logs.commands.find(v=>v[1]==="showAnimatedPicture"&&JSON.parse(v[2].positionSettings).eventId===String(p.eventId()));
    assert.ok(cmd);near((Number(JSON.parse(cmd[2].transformSettings).rotation)+p._rotation)%360,degrees);
    h.tick();if(degrees===0)assert.ok(p._realY<0);if(degrees===180)assert.ok(p._realY>0);if(degrees===270)assert.ok(p._realX<0);
});
test("Phase3 Mercury launch/trail/hit and Pluto layers use only three existing assets",async()=>{
    const h=phase2([158],{assets:true});h.api.useSlot(0);h.flush();await new Promise(resolve=>setImmediate(resolve));h.tick(10);await new Promise(resolve=>setImmediate(resolve));
    const v=h.logs.commands.filter(v=>v[1]==="showAnimatedPicture");
    assert.ok(v.some(c=>JSON.parse(c[2].positionSettings).eventId==="player"));
    assert.ok(v.some(c=>JSON.parse(c[2].positionSettings).stickMode==="false"&&Number(c[2].loopCount)>1));
    assert.ok(v.some(c=>JSON.parse(c[2].spritesheetSettings).spritesheetFile.endsWith("Fire_Disc_Burst")));
    const p=phase2([166],{assets:true});p.api.useSlot(0);p.flush();await new Promise(resolve=>setImmediate(resolve));p.tick(6);
    assert.equal(p.logs.commands.filter(v=>v[1]==="showAnimatedPicture").length,3);
});
test("Phase3 all nine VFX have distinct visual recipes and no new assets",()=>{
    const {api}=boot(),v=Object.values(api.testVfxRegistry);
    assert.equal(v.length,9);assert.equal(new Set(v.map(p=>p.file)).size,3);assert.equal(new Set(v.map(p=>JSON.stringify(p))).size,9);
});

function equipmentEnvironment(options = {}) {
    const h=boot(options),c=h.c;const data=JSON.parse(fs.readFileSync(path.join(root,"data/Weapons.json")));
    const bag=new Map([[2,1],[51,1],[7,1]]);let current=data[1];
    const actor={equipSlots:()=>[1,2,3],equips:()=>[current,null,null],isEquipChangeOk:()=>!h.logs.equipLocked,
        canEquip:w=>[2,9].includes(w.wtypeId),changeEquip(slot,w){assert.equal(slot,0);assert.ok(bag.get(w.id)>0);bag.set(w.id,bag.get(w.id)-1);if(current)bag.set(current.id,(bag.get(current.id)||0)+1);current=w;h.logs.equipChanges=(h.logs.equipChanges||0)+1;}};
    c.$gameActors={actor:id=>id===1?actor:null};c.$gameParty.weapons=()=>[...bag].filter(([,n])=>n>0).map(([id])=>data[id]);c.$gameParty.hasItem=w=>(bag.get(w.id)||0)>0;
    c.DataManager.isWeapon=w=>data[w?.id]===w;c.$dataSystem.weaponTypes=JSON.parse(fs.readFileSync(path.join(root,"data/System.json"))).weaponTypes;
    c.$dataWeapons=data;c.$gameParty.gainItem=(w,n)=>bag.set(w.id,(bag.get(w.id)||0)+n);
    c.equippedWeaponType=type=>c.$dataSystem.weaponTypes[current?.wtypeId]===type;
    c.Window_Help=class extends c.Window_Base{setText(t){this.text=t;}};c.Scene_Item=class extends c.Scene_MenuBase{};c.SoundManager.playEquip=()=>h.logs.sounds.push("equip");
    vm.runInContext(fs.readFileSync(path.join(root,"js/plugins/ProjectR_ItemEquip.js"),"utf8"),c);
    h.equip=c.ProjectR.ItemEquip;h.weapons=data;h.bag=bag;return h;
}
test("Phase3 MenuHUD alias chain: SKILL deck, ITEM equipment, others original, one SE/push",()=>{
    const h=equipmentEnvironment(),c=h.c,m=new c.ProjectR.MenuHUD.Scene();m.confirm();m._index=2;m.confirm();
    assert.deepEqual(h.logs.pushes,[h.api.Scene,h.equip.Scene]);assert.deepEqual(h.logs.sounds,["ok","ok"]);assert.equal(h.logs.consumed,2);
    for(const i of[1,3,4,5,6]){m._index=i;m.confirm();}assert.equal(h.logs.normal,5);
    m._index=2;h.logs.changing=true;m.confirm();assert.equal(h.logs.pushes.length,2);
});
test("Phase3 equipment list shows equipped icon/name/type/ATK and two categories",()=>{
    const h=equipmentEnvironment(),s=new h.equip.Scene();s.create();s.start();
    assert.deepEqual(clone(s._categoryWindow._list.map(c=>c.symbol)),["item","weapon"]);
    assert.ok(s._weaponWindow.contents.text.some(t=>t.includes("EQUIPPED")));assert.ok(s._weaponWindow.contents.text.some(t=>t.includes("ATK")));
    assert.ok(h.equip.weaponList().includes(h.weapons[1]));
});
test("Phase3 ITEM delegates untouched MZ Scene_Item; return reactivates categories",()=>{
    const h=equipmentEnvironment(),s=new h.equip.Scene();s.create();s._categoryWindow.select(0);s._categoryWindow.processOk();
    assert.equal(h.logs.pushes.at(-1),h.c.Scene_Item);assert.equal(h.logs.sounds.filter(s=>s==="ok").length,1);
    s.start();assert.equal(s._categoryWindow.active,true);
});
test("Phase3 weapon UI swaps Sword/Gun using Actor1 changeEquip and trades inventory",()=>{
    const h=equipmentEnvironment(),s=new h.equip.Scene();s.create();const w=s._weaponWindow;
    for(const id of[2,51,2]){w.select(w._weapons.indexOf(h.weapons[id]));w.processOk();assert.equal(h.equip.currentWeapon(),h.weapons[id]);}
    assert.equal(h.logs.equipChanges,3);assert.deepEqual(h.logs.sounds,["equip","equip","equip"]);assert.equal(h.bag.get(51),1);assert.equal(h.equip.currentWeapon().wtypeId,2);
});
test("Phase3 invalid weapon rejects with one buzzer/reason; fixed or unowned also reject",()=>{
    const h=equipmentEnvironment(),s=new h.equip.Scene();s.create();const w=s._weaponWindow;
    w.select(w._weapons.indexOf(h.weapons[7]));w.processOk();assert.deepEqual(h.logs.sounds,["buzzer"]);
    assert.equal(h.equip.currentWeapon(),h.weapons[1]);assert.ok(s._helpWindow.text.includes("装備できません"));
    assert.ok(h.logs.paint.includes(false),"incompatible weapon is dimmed");
    h.logs.equipLocked=true;assert.equal(h.equip.equip(h.weapons[2]).ok,false);h.logs.equipLocked=false;
    h.bag.delete(2);assert.equal(h.equip.equip(h.weapons[2]).ok,false);assert.equal(h.logs.equipChanges,undefined);
});
test("Phase3 equipped weapon OK does not trade twice; empty lists stay safe",()=>{
    const h=equipmentEnvironment();assert.equal(h.equip.equip(h.weapons[1]).ok,true);assert.equal(h.logs.equipChanges,undefined);
    h.bag.clear();h.c.$gameActors.actor=()=>null;const s=new h.equip.Scene();s.create();assert.equal(s._weaponWindow.maxItems(),0);
    s._weaponWindow.processOk();assert.deepEqual(h.logs.sounds,["buzzer"]);
});
test("Phase3 registration order and explicit debug defaults",()=>{
    const c={};vm.runInNewContext(fs.readFileSync(path.join(root,"js/plugins.js"),"utf8"),c);
    const names=c.$plugins.map(p=>p.name);assert.ok(names.indexOf("ProjectR_MenuHUD")<names.indexOf("ProjectR_CardSkillDeck"));assert.ok(names.indexOf("ProjectR_CardSkillDeck")<names.indexOf("ProjectR_ItemEquip"));
    const p=c.$plugins.find(p=>p.name==="ProjectR_CardSkillDeck").parameters;
    assert.equal(p.AutoStartCardCombat,"true");
    for(const k of["AlwaysShowCardHud","DebugAutoSetupTestDeck","ShowDebugOverlay","DebugAutoRefillEnergy"]) {
        assert.match(p[k], /^(true|false)$/);
        assert.match(source, new RegExp("@param " + k + "[\\s\\S]*?@default false"));
    }
});

for(const id of[164,165]) for(const device of["mouse","gamepad"]) for(const degrees of[0,90,180,270]) {
    test(`Phase3 real AE aim/rotation ${id} ${device} ${degrees}`,async()=>{
        const h=phase2([id],{officialAim:true,assets:true});const rad=degrees*Math.PI/180;
        if(device==="mouse"){h.c.TouchInput.x=Math.round(Math.sin(rad)*200);h.c.TouchInput.y=Math.round(-Math.cos(rad)*200);}
        else h.logs.stick={x:Math.round(Math.sin(rad)),y:Math.round(-Math.cos(rad))}; // Standard gamepad Y: negative = up.
        h.api.useSlot(0);h.flush();const p=h.projectiles()[0];assert.ok(p);assert.equal(Math.round(p._rotation),degrees);
        assert.equal(h.logs.playerDirection,[8,6,2,4][degrees/90]);assert.equal(h.api.projectileContext(p).targetEventId,0);
        await new Promise(resolve=>setImmediate(resolve));
        const cmd=h.logs.commands.find(v=>v[1]==="showAnimatedPicture"&&JSON.parse(v[2].positionSettings).eventId===String(p.eventId()));
        assert.ok(cmd);assert.equal(Math.round((Number(JSON.parse(cmd[2].transformSettings).rotation)+p._rotation)%360),degrees);
    });
}
test("Phase3 debug new-game setup preserves a deck seeded by another new-game initializer",()=>{
    const h=boot({realData:true,debug:true,newGameDeck:[158],parameters:{DebugAutoSetupTestDeck:"true"}});
    h.c.DataManager.setupNewGame();assert.deepEqual(clone(h.api.getDeck()),[158]);assert.equal(h.api.ownedCount(158),0);
});
test("Phase3 production auto-refill flag does not erase real card costs",()=>{
    const h=boot({parameters:{DebugAutoRefillEnergy:"true"}});h.seedDeck();h.api.startCombat();h.api.useSlot(0);h.flush();assert.equal(h.api.energy(),8);
});
test("Phase3 End removes only owned VFX and prevents delayed layers after end",async()=>{
    const h=phase2([166],{assets:true});const removed=[];
    h.c.PluginManager.registerCommand("Hendrix_Animation_Solution","removeAnimation",args=>removed.push(args.notetag));
    h.api.useSlot(0);h.flush();await new Promise(resolve=>setImmediate(resolve));const before=h.logs.effects.length;
    h.api.endCombat();h.tick(12);assert.equal(h.logs.effects.length,before);assert.ok(removed.length);
    assert.ok(removed.every(id=>id.startsWith("card:")));assert.equal(h.api.lastDebugResult(),null);
});
test("Phase3 VFX cleanup resolves exact old target after event ID reuse, leaves foreign effects",async()=>{
    const h=phase2([166],{assets:true});h.api.useSlot(0);h.flush();await new Promise(resolve=>setImmediate(resolve));
    const effect=h.logs.effects[0];let disposed=0,foreignDisposed=0;
    const picture={target:h.earth,note:effect.note,dispose(){disposed++;}};
    h.c.AnimatedPictureManager={_animatedPictures:[picture,{target:h.earth,note:"foreign",dispose(){foreignDisposed++;}}]};
    h.enemy(40,1,0);h.api.endCombat();assert.equal(disposed,1);assert.equal(foreignDisposed,0);
});

// Phase 3.1: real protected plugin integration, real MZ input routing and
// Game_Actor/Party inventory trades. Rendering/devices are still headless.
function battleEnvironment(options = {}) {
    const h = boot({ realBattle: true, ...options, parameters: { AutoStartCardCombat: "true", ...options.parameters } });
    const scene = h.c.SceneManager._scene;
    if (options.valid !== false) h.seedDeck();
    scene.createDisplayObjects(); scene.start();
    h.scene = scene; h.hud = scene._projectRCardHandHUD; h.manager = scene._projectRBattleHudLayer;
    h.tick = (frames = 1) => { for (let i = 0; i < frames; i++) { h.c.Graphics.frameCount++; scene.update(); } };
    h.enter = () => {
        h.target = h.enemy(1, 20, 10);
        const sprite = new h.c.Sprite_Character(h.target);
        sprite.x = 960; sprite.y = 480; sprite.width = sprite.height = 48;
        scene._spriteset._characterSprites.push(sprite); h.tick(3);
    };
    h.piles = () => [clone(h.api.hand()), h.api.drawPileCount(), h.api.discardPileCount(), h.api.energy()];
    return h;
}

test("Phase31 real BattleHUD: normal exploration hides both HUDs, no automatic combat", () => {
    const h = battleEnvironment({ parameters: { AlwaysShowCardHud: "true" } }); h.tick(60);
    assert.equal(h.manager.visible, false); assert.equal(h.hud.visible, false); assert.equal(h.api.isCombatActive(), false);
});
test("Phase31 real CombatPresence entry shows BattleHUD and CardHUD, actually hides old skill container", () => {
    const h = battleEnvironment(); h.enter();
    assert.equal(h.c.ProjectRCombatPresence.isCombatActive(), true);
    assert.equal(h.manager.visible, true); assert.equal(h.hud.visible, true);
    assert.equal(h.manager._skillHUD.visible, false); assert.equal(h.api.isCombatActive(), true);
    for (const field of ["_playerHUD", "_weaponHUD", "_ultimateHUD"]) assert.equal(h.manager[field].visible, true);
    assert.equal(h.manager._cardDeckOriginalSkillVisible, true);
});
test("Phase31 real FHD layout uses exact original five slots and stays outside Player/Weapon HUD", () => {
    const h = battleEnvironment(); h.enter();
    const old = h.manager._skillHUD._slots;
    assert.deepEqual(clone(old.map(s => [s.x, s.y])), [[494,915],[684,915],[874,915],[1064,915],[1254,915]]);
    h.hud._cards.forEach((card, i) => {
        assert.equal(h.hud.x + card.x, old[i].x); assert.equal(h.hud.y + card.y, old[i].y);
        near(card.bitmap.width * card.scale.x, 172); near(card.bitmap.height * card.scale.y, 140);
    });
    assert.ok(h.hud.x > 400 && h.hud.x + 932 < 1540);
    h.c.Graphics.width = 960; h.c.Graphics.height = 540; h.tick();
    near(h.hud.x, 247); near(h.hud.scale.x, .5);
});
test("Phase31 real CombatPresence short loss respects existing 24-frame grace and never reshuffles", () => {
    const h = battleEnvironment(); h.enter(); const before = h.piles();
    h.target.hp = 0; h.tick(12);
    assert.equal(h.api.isCombatActive(), true); assert.deepEqual(h.piles(), before);
    h.target.hp = 100; h.tick(60); assert.deepEqual(h.piles(), before);
});
test("Phase31 real battle exit hides both HUDs, cleans runtime and restores exact visibility", () => {
    const h = battleEnvironment(); h.enter(); h.target.hp = 0; h.tick(27);
    assert.equal(h.c.ProjectRCombatPresence.isCombatActive(), false); assert.equal(h.api.isCombatActive(), false);
    assert.equal(h.manager.visible, false); assert.equal(h.hud.visible, false);
    assert.equal(h.manager._skillHUD.visible, true); assert.equal(h.api.hand().length, 0);
    assert.equal(h.manager._cardDeckOriginalSkillVisible, undefined);
});
test("Phase31 invalid deck hidden in exploration; battle shows INCOMPLETE and no old slots", () => {
    const h = battleEnvironment({ valid: false }); h.tick(); assert.equal(h.hud.visible, false);
    h.enter(); assert.equal(h.manager.visible, true); assert.equal(h.hud.visible, true);
    assert.equal(h.manager._skillHUD.visible, false); assert.equal(h.api.isCombatActive(), false);
    assert.ok(h.hud._energy.bitmap.text.some(t => t.includes("DECK INCOMPLETE  0 / 30")));
    h.target.hp = 0; h.tick(27); assert.equal(h.hud.visible, false); assert.equal(h.manager._skillHUD.visible, true);
});
test("Phase31 explicit End restores pre-hidden skill state and does not restart on menu return", () => {
    const h = battleEnvironment(); h.manager._skillHUD.visible = false; h.enter(); h.api.endCombat(); h.tick(6);
    assert.equal(h.api.isCombatActive(), false); assert.equal(h.hud.visible, false); assert.equal(h.manager._skillHUD.visible, false);
    h.scene.terminate(); h.c.SceneManager._scene = new h.c.Scene_MenuBase();
    h.c.SceneManager._scene = h.scene; h.scene.start(); h.tick(3);
    assert.equal(h.api.isCombatActive(), false); assert.equal(h.manager._skillHUD.visible, false);
});
test("Phase31 menu interruption preserves hand and energy despite CombatPresence terminate/start", () => {
    const h = battleEnvironment(); h.enter(); h.api.setEnergy(7); const before = h.piles();
    h.scene.terminate(); assert.equal(h.manager._skillHUD.visible, true);
    h.c.SceneManager._scene = new h.c.Scene_MenuBase(); assert.deepEqual(h.piles(), before);
    h.c.SceneManager._scene = h.scene; h.scene.start(); h.tick(6);
    assert.deepEqual(h.piles(), before); assert.equal(h.manager._skillHUD.visible, false);
});
test("Phase31 explicit End also hides incomplete HUD and restores slots until a new battle", () => {
    const h = battleEnvironment({ valid: false }); h.enter(); h.api.endCombat(); h.tick();
    assert.equal(h.hud.visible, false); assert.equal(h.manager._skillHUD.visible, true);
    h.target.hp = 0; h.tick(27); h.target.hp = 100; h.tick(3);
    assert.equal(h.hud.visible, true); assert.equal(h.manager._skillHUD.visible, false);
    h.seedDeck(); assert.ok(h.api.startCombat().ok); h.api.endCombat();
    assert.ok(h.api.startCombat().ok); h.tick(); assert.equal(h.hud.visible, true);
});
test("Phase31 current scene manager wins over a stale global manager", () => {
    const h = battleEnvironment(); const stale = { _skillHUD: { visible: true } };
    h.c.ProjectR.BattleHUD._manager = stale; h.enter();
    assert.equal(h.manager._skillHUD.visible, false); assert.equal(stale._skillHUD.visible, true);
    h.api.endCombat(); assert.equal(h.manager._skillHUD.visible, true);
});
test("Phase31 Arena integrates combat queries even with no living enemies; production does not", () => {
    for (const debug of [false, true]) {
        const h = battleEnvironment({ debug }); h.c.$gameMap.setup(10); h.scene.start(); h.tick(30);
        assert.equal(h.c.ProjectRCombatPresence.isCombatActive(), debug);
        assert.equal(h.c.ProjectRCombatPresence.canUseWeapon(), debug);
        assert.equal(h.c.ProjectRCombatPresence.refresh(), debug);
        assert.equal(h.manager.visible, debug); assert.equal(h.hud.visible, debug);
    }
});
test("Phase31 debug auto setup prepares only deck outside battle, not runtime", () => {
    const h = boot({ realData: true, debug: true, presence: false, parameters: { DebugAutoSetupTestDeck: "true", AutoStartCardCombat: "true" } });
    h.c.DataManager.setupNewGame(); h.c.SceneManager._scene.createDisplayObjects(); h.c.SceneManager._scene.start();
    assert.equal(h.api.getDeck().length, 30); assert.equal(h.api.isCombatActive(), false);
    assert.equal(h.c.SceneManager._scene._projectRCardHandHUD.visible, false);
});
test("Phase31 overlay hidden in exploration; debug button visible without ShowDebugOverlay", () => {
    const h = battleEnvironment({ debug: true, parameters: { ShowDebugOverlay: "true" } }); h.tick();
    assert.equal(h.scene._projectRCardDebug.visible, false); assert.equal(h.scene._projectRCardArenaButton.visible, true);
    h.enter(); assert.equal(h.scene._projectRCardDebug.visible, true);
    const b = battleEnvironment({ debug: true }); b.tick();
    assert.equal(b.scene._projectRCardDebug, undefined); assert.equal(b.scene._projectRCardArenaButton.visible, true);
});
test("Phase31 production creates no Arena button; message blocks debug clicks", () => {
    const normal = battleEnvironment(); assert.equal(normal.scene._projectRCardArenaButton, undefined);
    const h = battleEnvironment({ debug: true }); h.logs.message = true; h.tick();
    assert.equal(h.scene._projectRCardArenaButton.visible, false);
    assert.equal(h.key("mousedown", "", false, { button: 0, pageX: 1670, pageY: 20 }).stopped, undefined);
    h.tick(); assert.equal(h.logs.transfer, undefined);
});
test("Phase31 CARD TEST mouse capture transfers before weapon/map clicks; RETURN restores fractions/direction", () => {
    const h = battleEnvironment({ debug: true }); let forwarded = 0;
    h.c.document.addEventListener("mousedown", () => forwarded++);
    h.c.$gameTemp.clearDestination = () => { h.logs.destinationCleared = true; };
    Object.assign(h.c.$gamePlayer, { x: 29.25, y: 19.75, direction: () => 4 });
    const down = h.key("mousedown", "", false, { button: 0, pageX: 1670, pageY: 20 }); h.tick();
    assert.equal(down.stopped, true); assert.equal(forwarded, 0); assert.equal(h.logs.destinationCleared, true);
    assert.deepEqual(h.logs.transfer, [10,16,21,8,0]);
    assert.equal(h.key("mouseup", "", false, { button: 0 }).stopped, true);
    h.c.$gameMap.setup(10); h.scene.start(); h.tick();
    assert.ok(h.scene._projectRCardArenaButton.bitmap.text.includes("RETURN"));
    h.key("mousedown", "", false, { button: 0, pageX: 1670, pageY: 20 }); h.tick();
    assert.deepEqual(h.logs.transfer, [1,29.25,19.75,4,0]);
    assert.equal(JSON.stringify(h.c.$gameSystem).includes("29.25"), false);
});
test("Phase31 touch Arena button consumes input and prevents map movement", () => {
    const h = battleEnvironment({ debug: true }); h.c.TouchInput.x = 1670; h.c.TouchInput.y = 20;
    assert.equal(h.scene.isAnyButtonPressed(), true); h.logs.touch = true; h.tick();
    assert.equal(h.logs.touch, false); assert.deepEqual(h.logs.transfer, [10,16,21,8,0]);
});
test("Phase31 F6 accepts Hendrix's actual neutral f6 mapping without rewriting keyMapper", () => {
    const keyboard = fs.readFileSync(path.join(root, "js/plugins/Hendrix_Keyboard_Gamepad.js"), "utf8");
    const table = keyboard.match(/(?:const|let|var) charToKeyCode\s*=\s*\{[\s\S]*?\n    \};/);
    const fallback = keyboard.match(/for \(const char in charToKeyCode\) \{[\s\S]*?\n        \}/);
    assert.ok(table && fallback, "use the shipped keyboard mapping code, not an invented f6 mapping");
    const h = boot({ debug: true });
    vm.runInContext(`const MOUSE_LEFT=1000,MOUSE_RIGHT=1001,MOUSE_MIDDLE=1002,MOUSE_WHEEL_UP=1003,MOUSE_WHEEL_DOWN=1004;\n${table[0]}\n${fallback[0]}`, h.c);
    assert.equal(h.c.Input.keyMapper[117], "f6"); const before = clone(h.c.Input.keyMapper);
    assert.equal(h.key("keydown", "F6").stopped, true); h.c.SceneManager._scene.update();
    assert.deepEqual(h.logs.transfer, [10,16,21,8,0]); assert.deepEqual(clone(h.c.Input.keyMapper), before);
});

test("Phase31 ITEM selector and WEAPON use MZ processHandling instead of direct processOk", () => {
    const h = equipmentEnvironment(), s = new h.equip.Scene(); s.create(); s.start();
    assert.equal(s._categoryWindow.active, true); assert.equal(s._weaponWindow.active, false);
    s._categoryWindow.select(1); h.logs.input = "ok"; s._categoryWindow.processHandling();
    const w = s._weaponWindow; assert.equal(w.active, true); assert.equal(w.isOkEnabled(), true);
    assert.equal(s._categoryWindow.active, false); w.select(w._weapons.indexOf(h.weapons[2]));
    h.logs.input = "ok"; w.processHandling();
    assert.equal(h.equip.currentWeapon(), h.weapons[2]); assert.ok(w.contents.text.includes("ロングソード   EQUIPPED"));
    assert.equal(w.active, true); assert.equal(h.logs.sounds.filter(s => s === "equip").length, 1);
});
test("Phase31 MZ touch OK equips and cancel returns focus to ITEM/WEAPON", () => {
    const h = equipmentEnvironment(), s = new h.equip.Scene(); s.create();
    s._categoryWindow.select(1); h.logs.input = "ok"; s._categoryWindow.processHandling();
    const w = s._weaponWindow; w.select(w._weapons.indexOf(h.weapons[51]));
    w.hitIndex = () => w.index(); w.onTouchSelect(true); w.onTouchOk(); assert.equal(h.equip.currentWeapon(), h.weapons[51]);
    h.logs.input = "cancel"; w.processHandling(); assert.equal(w.active, false); assert.equal(s._categoryWindow.active, true);
});
test("Phase31 standard input rejects canEquip false without trading inventory", () => {
    const h = equipmentEnvironment(), s = new h.equip.Scene(); s.create();
    s._categoryWindow.select(1); h.logs.input = "ok"; s._categoryWindow.processHandling();
    s._weaponWindow.select(s._weaponWindow._weapons.indexOf(h.weapons[7])); h.logs.input = "ok"; s._weaponWindow.processHandling();
    assert.equal(h.equip.currentWeapon(), h.weapons[1]); assert.equal(h.logs.equipChanges, undefined);
    assert.equal(h.logs.sounds.at(-1), "buzzer"); assert.match(s._helpWindow.text, /装備できません/);
});
test("Phase31 first weapon slot detection supports a nonzero slot and dual-wield first slot", () => {
    const h = equipmentEnvironment(), a = h.c.$gameActors.actor(1);
    a.equipSlots = () => [2,1,1,3]; assert.equal(h.equip.weaponSlot(), 1);
    a.equipSlots = () => [1,1,3]; assert.equal(h.equip.weaponSlot(), 0);
    a.equipSlots = () => [2,3]; assert.equal(h.equip.weaponSlot(), -1); assert.equal(h.equip.equip(h.weapons[2]).ok, false);
});
test("Phase31 debug grants missing Sword/Gun once, includes equipped items, never on scene or load", () => {
    const h = equipmentEnvironment({ debug: true, parameters: { DebugAutoSetupTestDeck: "true" } });
    h.bag.delete(2); h.bag.delete(51); h.c.DataManager.setupNewGame();
    assert.equal(h.bag.get(2), 1); assert.equal(h.bag.get(51), 1);
    assert.deepEqual(clone(h.equip.debugGrantTestWeapons()), []);
    h.equip.equip(h.weapons[51]); assert.deepEqual(clone(h.equip.debugGrantTestWeapons()), []); assert.equal(h.bag.get(51), 0);
    h.bag.delete(2); const s = new h.equip.Scene(); s.create(); s.start();
    h.c.DataManager.extractSaveContents({ system: {} }); assert.equal(h.bag.has(2), false);
});
test("Phase31 debug grants require BOTH debug and setup flags; weapon diagnostics debug only", () => {
    for (const [debug, setup] of [[false,true],[true,false]]) {
        const h = equipmentEnvironment({ debug, parameters: { DebugAutoSetupTestDeck: String(setup) } });
        h.bag.delete(2); h.bag.delete(51); h.c.DataManager.setupNewGame();
        assert.equal(h.bag.has(2), false); assert.equal(h.bag.has(51), false);
        const s = new h.equip.Scene(); s.create(); s._weaponWindow.updateHelp();
        assert.equal(!!s._weaponWindow._debugWindow, debug);
        if (debug) assert.match(s._weaponWindow._debugWindow.text, /Current:.*\nCan Equip:.*Weapon Slot: 0/);
    }
});

function realEquipmentEnvironment(options = {}) {
    const h = equipmentEnvironment(options), c = h.c;
    for (const name of ["Actors", "Classes", "Armors", "States", "Items", "System"]) {
        c[`$data${name}`] = JSON.parse(fs.readFileSync(path.join(root, "data", `${name}.json`), "utf8"));
    }
    for (const [start, endName] of [["Game_Item", "Game_Action"], ["Game_ActionResult", "Game_Enemy"], ["Game_Actors", "Game_Troop"]]) {
        vm.runInContext(objects.slice(objects.indexOf(`function ${start}()`), objects.indexOf(`function ${endName}()`)), c, { filename: `MZ_${start}.js` });
    }
    vm.runInContext("Array.prototype.remove = function(v) { const i=this.indexOf(v); if(i>=0)this.splice(i,1); return this; }; Math.randomInt = n => Math.floor(Math.random()*n);", c);
    for (const [singular, plural] of [["Item","Items"],["Skill","Skills"],["Weapon","Weapons"],["Armor","Armors"]]) {
        c.DataManager[`is${singular}`] = item => !!item && c[`$data${plural}`][item.id] === item;
    }
    c.$gameMap.requestRefresh = () => {}; c.$gamePlayer.refresh = () => {};
    c.$gameSystem.isSideView = () => false;
    c.$gameActors = new c.Game_Actors(); c.$gameParty = new c.Game_Party(); c.$gameParty.setupStartingMembers();
    c.equippedWeaponType = type => c.$gameActors.actor(1).weapons().some(w => c.$dataSystem.weaponTypes[w.wtypeId] === type);
    h.actor = c.$gameActors.actor(1);
    return h;
}

test("Phase31 real MZ Game_Actor/Game_Party: Gun -> Sword -> Gun through window input, correct trades", () => {
    const h = realEquipmentEnvironment(), c = h.c, party = c.$gameParty, gun = h.weapons[51], sword = h.weapons[2];
    assert.equal(h.actor.canEquip(gun), true); assert.equal(h.actor.canEquip(sword), true);
    party.gainItem(gun, 1); if (!party.hasItem(sword, true)) party.gainItem(sword, 1); assert.ok(h.equip.equip(gun).ok);
    assert.equal(party.numItems(gun), 0);
    const s = new h.equip.Scene(); s.create(); s.start(); s._categoryWindow.select(1);
    h.logs.input = "ok"; s._categoryWindow.processHandling(); const w = s._weaponWindow;
    assert.ok(w._weapons.includes(gun), "equipped weapon appears even with zero inventory");
    c.$gamePlayer.fixed = true; w.select(w._weapons.indexOf(sword)); h.logs.input = "ok"; w.processHandling();
    assert.equal(h.actor.equips()[h.equip.weaponSlot()], sword);
    assert.equal(party.numItems(gun), 1); assert.equal(party.numItems(sword), 0); assert.equal(c.$gamePlayer.fixed, false);
    assert.ok(w.contents.text.includes("ロングソード   EQUIPPED"));
    w.select(w._weapons.indexOf(gun)); h.logs.input = "ok"; w.processHandling();
    assert.equal(h.actor.equips()[h.equip.weaponSlot()], gun);
    assert.equal(party.numItems(gun), 0); assert.equal(party.numItems(sword), 1); assert.equal(c.equippedWeaponType("銃"), true);
    assert.ok(w.contents.text.includes("テストハンドガン   EQUIPPED"));
});
test("Phase31 real MZ canEquip/slot seal prevents equip and preserves quantities", () => {
    const h = realEquipmentEnvironment(), c = h.c; c.$gameParty.gainItem(h.weapons[7], 1);
    assert.equal(h.actor.canEquip(h.weapons[7]), false); const previous = h.equip.currentWeapon();
    assert.equal(h.equip.equip(h.weapons[7]).ok, false); assert.equal(c.$gameParty.numItems(h.weapons[7]), 1);
    assert.equal(h.equip.currentWeapon(), previous);
});
test("Phase31 real MZ equipped ownership prevents duplicate debug grants", () => {
    const h = realEquipmentEnvironment({ debug: true, parameters: { DebugAutoSetupTestDeck: "true" } });
    assert.equal(h.equip.currentWeapon(), h.weapons[2]); // Actual Actor 1 initially equips Longsword.
    assert.deepEqual(clone(h.equip.debugGrantTestWeapons()), [51]);
    assert.ok(h.equip.equip(h.weapons[51]).ok); assert.equal(h.c.$gameParty.numItems(h.weapons[51]), 0);
    assert.deepEqual(clone(h.equip.debugGrantTestWeapons()), []);
    assert.equal(h.c.$gameParty.numItems(h.weapons[51]), 0); assert.equal(h.c.$gameParty.numItems(h.weapons[2]), 1);
});
test("Phase31 actual CombatPresence reuses gun sprite: hides on Sword, restores on Gun without deleting event", () => {
    const h = realEquipmentEnvironment({ realBattle: true }), c = h.c, scene = c.SceneManager._scene;
    h.seedDeck(); scene.createDisplayObjects();
    const target = h.enemy(1, 20, 10), targetSprite = new c.Sprite_Character(target);
    Object.assign(targetSprite, { x:960, y:480, width:48, height:48 }); scene._spriteset._characterSprites.push(targetSprite);
    const gunEvent = { _eventId:2, isPlayerChild:true, event:()=>({note:"<gun>"}) }; c.$gameMap._events[2] = gunEvent;
    const gunSprite = new c.Sprite_Character(gunEvent); scene._spriteset._characterSprites.push(gunSprite);
    c.$gameParty.gainItem(h.weapons[51],1); c.$gameParty.gainItem(h.weapons[2],1);
    h.equip.equip(h.weapons[51]); scene.start(); assert.equal(gunSprite.visible,true);
    h.equip.equip(h.weapons[2]); c.ProjectRCombatPresence.refresh(); assert.equal(gunSprite.visible,false);
    assert.equal(c.$gamePlayer.fixed,false); assert.equal(c.$gameMap.event(2),gunEvent);
    h.equip.equip(h.weapons[51]); c.ProjectRCombatPresence.refresh(); assert.equal(gunSprite.visible,true);
    c.$gamePlayer.turnToward("mouse or gamepad"); assert.equal(h.logs.turned,true);
});
