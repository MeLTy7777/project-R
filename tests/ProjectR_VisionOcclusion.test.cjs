"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm");
const fs=require("node:fs"),path=require("node:path"),root=path.resolve(__dirname,"..");
function harness(options={}) {
    class Point {constructor(x=0,y=0){this.x=x;this.y=y;}copyFrom(p){this.x=p.x;this.y=p.y;return this;}}
    class Container {
        constructor(){this.children=[];for(const k of ["position","pivot","skew"])this[k]=new Point();this.scale=new Point(1,1);this.rotation=0;this.alpha=1;this.visible=true;this.renderable=true;}
        get x(){return this.position.x;}set x(v){this.position.x=v;}get y(){return this.position.y;}set y(v){this.position.y=v;}
        addChild(...cs){for(const c of cs){c.parent?.removeChild(c);this.children.push(c);c.parent=this;}return cs[0];}
        removeChild(c){this.children.splice(this.children.indexOf(c),1);c.parent=null;return c;}
        removeChildAt(i){return this.removeChild(this.children[i]);}
        setChildIndex(c,i){this.children.splice(this.children.indexOf(c),1);this.children.splice(i,0,c);}
        toLocal(point){const chain=[];for(let c=this;c;c=c.parent)chain.push(c);let p={...point};for(const c of chain.reverse()){
            p.x=(p.x-c.x)/c.scale.x;p.y=(p.y-c.y)/c.scale.y;}return p;}
        destroy(options){this.destroyOptions=options;if(options?.children)for(const c of this.children)c.destroy(options);this.children=[];this.destroyed=true;}
    }
    class Sprite extends Container {constructor(texture={id:"empty"}){super();this.texture=texture;this.anchor=new Point();this.tint=0xffffff;this.blendMode=0;}}
    class Graphics extends Container {
        constructor(){super();this.ops=[];}
        clear(){this.ops=[];return this;}
    }
    for(const name of ["beginFill","endFill","drawRect","beginHole","endHole","drawPolygon","lineStyle","moveTo","lineTo","drawCircle"])
        Graphics.prototype[name]=function(...args){this.ops.push([name,...args]);return this;};
    class Tilemap extends Container {
        constructor(){super();this.origin=new Point();this._bitmaps=[];this.flags=[];this.width=480;this.height=384;this.animationCount=0;this.animationFrame=0;this.drawn=[];}
        setData(w,h,data){this._mapWidth=w;this._mapHeight=h;this._mapData=data;}
        setBitmaps(b){this._bitmaps=b;}refresh(){this.refreshCount=(this.refreshCount||0)+1;}
        _readMapData(x,y,z){if(this.horizontalWrap)x=((x%this._mapWidth)+this._mapWidth)%this._mapWidth;
            if(this.verticalWrap)y=((y%this._mapHeight)+this._mapHeight)%this._mapHeight;
            return this._mapData[(z*this._mapHeight+y)*this._mapWidth+x]||0;}
        _addSpot(sx,sy,x,y){this.drawn.push([sx+x,sy+y]);}
    }
    class Game_Map {setup(){this._id++;}update(){this.updated=(this.updated||0)+1;}}
    class Game_Event {}
    const regions=new Map(),events=[],w=options.width||30,h=options.height||20,data=new Array(w*h*6).fill(0);
    const map=new Game_Map();map._id=1;map.dx=0;map.dy=0;map.regionReads=0;
    Object.assign(map,{mapId:()=>map._id,width:()=>w,height:()=>h,data:()=>data,
        regionId:(x,y)=>{map.regionReads++;return regions.get(`${x},${y}`)||0;},
        roundX:x=>options.loopX?((x%w)+w)%w:x,roundY:y=>options.loopY?((y%h)+h)%h:y,
        isValid:(x,y)=>x>=0&&y>=0&&x<w&&y<h,isLoopHorizontal:()=>!!options.loopX,isLoopVertical:()=>!!options.loopY,
        deltaX:(a,b)=>options.loopX?(a-b+w*1.5)%w-w/2:a-b,deltaY:(a,b)=>options.loopY?(a-b+h*1.5)%h-h/2:a-b,
        adjustX:x=>options.loopX&&x<map.dx-(w-10)/2?x-map.dx+w:x-map.dx,
        adjustY:y=>options.loopY&&y<map.dy-(h-8)/2?y-map.dy+h:y-map.dy,
        displayX:()=>map.dx,displayY:()=>map.dy,tileWidth:()=>48,tileHeight:()=>48,
        events:()=>events.filter(Boolean),event:id=>events.find(e=>e?._eventId===id),isPassable:()=>options.passable!==false});
    class Spriteset_Map extends Container {
        createLowerLayer(){this._baseSprite=new Container();this._tilemap=new Tilemap();this._baseSprite.addChild(this._tilemap);this.addChild(this._baseSprite);
            this._weather=new Container();this.addChild(this._weather);this._tilemap.setData(w,h,data);}
        update(){this._tilemap.origin.x=map.dx*48;this._tilemap.origin.y=map.dy*48;this._tilemap.animationCount++;this._tilemap.animationFrame=Math.floor(this._tilemap.animationCount/30);}
    }
    const commands=new Map(),context={console,PIXI:{Container,Sprite,Graphics,Point},Tilemap,Game_Map,Game_Event,Spriteset_Map,
        Graphics:{width:480,height:384},PluginManager:{parameters:n=>n==="ProjectR_VisionOcclusion"?(options.params||{}):{VisionWallRegionId:"255"},
            registerCommand:(p,n,f)=>commands.set(n,f)},DataManager:{extractSaveContents(c){context.$gameSystem=c.system;context.$gameMap=c.map||map;}},
        $gameMap:map,$gamePlayer:{_realX:1,_realY:3,direction:()=>2},$gameSystem:{},};
    context.window=context;vm.createContext(context);
    for(const file of ["ProjectR_CombatOcclusion.js","ProjectR_VisionOcclusion.js"])
        vm.runInContext(fs.readFileSync(path.join(root,"js/plugins",file),"utf8"),context,{filename:file});
    const api=context.ProjectR.VisionOcclusion,combat=context.ProjectR.CombatOcclusion;
    function region(x,y,r){regions.set(`${x},${y}`,r);data[(5*h+y)*w+x]=r;api.invalidateCache();}
    function event(id,x,y,note="",comments=[]) {
        const e=new Game_Event();e._eventId=id;e._realX=x;e._realY=y;e._data={note};e._page={list:comments.map(t=>({code:108,parameters:[t]}))};
        Object.assign(e,{eventId:()=>id,event:()=>e._data,page:()=>e._page,collisionRect:()=>({x:e._realX,y:e._realY,width:1,height:1})});events.push(e);return e;
    }
    function build(origin={x:1.5,y:3.5},bounds={left:0,top:0,right:10,bottom:8},config={angle:360,range:0}) {
        const geometry=api.snapshot(bounds);return {points:api.polygon(origin,bounds,geometry,config),geometry};
    }
    function owner(){const o=new Spriteset_Map();o.createLowerLayer();return o;}
    function character(owner,e){const s=new Sprite({id:`event-${e.eventId()}`});s._character=e;s.z=3;s.y=e._realY*48;s.spriteId=e.eventId();owner._tilemap.addChild(s);return s;}
    return {context,api,combat,map,regions,events,data,region,event,build,owner,character,commands,Sprite,Graphics,Container};
}
const visible=(h,p,poly)=>h.api.inside(p,poly);
function tileSampleVisibility(h,x,y,origin={x:1.5,y:3.5}) {
    const b={left:0,top:0,right:12,bottom:10},g=h.api.snapshot(b),index=h.api.spatialIndex(g.segments,b);
    return h.api.isVisionStructureTileVisible(origin,x,y,g,index);
}
function lWall(){const h=harness();for(let x=2;x<=6;x++)h.region(x,2,255);for(let y=2;y<=6;y++)h.region(2,y,255);return h;}
const exposed=(h,origin={x:1.5,y:3.5},bounds={left:0,top:0,right:10,bottom:8})=>
    h.api.exposure(origin,bounds,h.api.snapshot(bounds),{angle:360,range:0});
function twoRegionWalls(){const h=harness();for(let y=0;y<8;y++){h.region(4,y,255);h.region(7,y,255);}return h;}
test("default is enabled 360 degrees, unlimited range, opaque, 255/254, debug off",()=>{
    const h=harness();assert.deepEqual(JSON.parse(JSON.stringify(h.api.settings())),{enabled:true,angle:360,range:0,opacity:1,debug:false});
});
test("no wall: entire viewport visible including behind player",()=>{
    const h=harness(),p=h.build().points;for(const point of [{x:.1,y:.1},{x:9.9,y:7.9},{x:1,y:1},{x:9,y:3.5}])assert.ok(visible(h,point,p));
});
test("region wall: ray reaches wall face and stops; far side not in polygon",()=>{
    const h=harness();for(let y=0;y<8;y++)h.region(4,y,255);
    const {points,geometry}=h.build();assert.ok(visible(h,{x:3.9,y:3.5},points));assert.equal(visible(h,{x:5.1,y:3.5},points),false);
    const ray=h.combat.raycastVisionGeometry({x:1.5,y:3.5},{x:10,y:3.5},geometry.segments);assert.equal(ray.point.x,4);
});
test("corner rays keep a narrow visible gap and stop at adjacent wall corners",()=>{
    const h=harness();for(let y=0;y<8;y++)if(y!==3)h.region(4,y,255);
    const {points}=h.build();assert.ok(visible(h,{x:8,y:3.5},points));assert.equal(visible(h,{x:8,y:1},points),false);
});
test("moving enemy emerges from shadow without changing its gameplay visibility",()=>{
    const h=harness();for(let y=0;y<8;y++)h.region(4,y,255);const e=h.event(1,6,3,"<enemy>");
    const p=h.build().points;assert.equal(visible(h,{x:e._realX+.5,y:e._realY+.5},p),false);
    e._realX=2;assert.ok(visible(h,{x:e._realX+.5,y:e._realY+.5},p));assert.equal(e._erased,undefined);
});
test("VisionWall uses existing event geometry and is keep-visible",()=>{
    const h=harness(),e=h.event(1,4,3,"<VisionWall>");const {points}=h.build();assert.equal(visible(h,{x:5.5,y:3.5},points),false);
    assert.equal(h.api.eventTags(e).keep,true);assert.equal(h.combat.firstBlockerBetween({x:1.5,y:3.5},{x:8,y:3.5},{mode:"vision"}).kind,"event");
});
test("CombatWall blocks combat but never vision",()=>{
    const h=harness();h.event(1,4,3,"<CombatWall>");assert.ok(visible(h,{x:8,y:3.5},h.build().points));
    assert.equal(h.combat.firstBlockerBetween({x:1.5,y:3.5},{x:8,y:3.5},{mode:"combat"}).kind,"event");
});
test("normal impassability never becomes a vision wall",()=>{
    const h=harness({passable:false});assert.ok(visible(h,{x:8,y:3.5},h.build().points));assert.equal(h.build().geometry.segments.length,0);
});
test("254 structure and reserved 250 do not block vision or combat region ray",()=>{
    const h=harness();h.region(4,3,254);h.region(5,3,250);assert.equal(h.build().geometry.segments.length,0);
    assert.equal(h.combat.firstBlockerBetween({x:1.5,y:3.5},{x:8,y:3.5},{mode:"combat"}),null);
});
test("KeepVisible keeps only itself and does not block the ray",()=>{
    const h=harness(),e=h.event(1,4,3,"<VisionKeepVisible>");assert.ok(visible(h,{x:8,y:3.5},h.build().points));
    assert.equal(h.api.eventTags(e).wall,false);assert.equal(h.api.eventTags(e).keep,true);
});
test("Erase/Delete and disabled event page immediately remove vision geometry",()=>{
    const h=harness(),e=h.event(1,4,3,"<VisionWall>");assert.ok(h.build().geometry.segments.length);
    e._erased=true;assert.equal(h.build().geometry.segments.length,0);e._erased=false;e._page=null;assert.equal(h.build().geometry.segments.length,0);
    e._page={list:[]};h.events.length=0;assert.equal(h.build().geometry.segments.length,0);
});
test("active page comments work and page switch invalidates tags",()=>{
    const h=harness(),e=h.event(1,4,3,"",["<VisionWall>"]);assert.equal(h.api.eventTags(e).wall,true);
    e._page={list:[{code:108,parameters:["<CombatWall>"]}]};assert.equal(h.api.eventTags(e).wall,false);
});
test("dynamic/prefab VisionWall follows fractional movement without stale cache",()=>{
    const h=harness();h.build();const e=h.event(99,4,3,"<VisionWall>");const ray=()=>h.combat.raycastVisionGeometry({x:1.5,y:3.5},{x:9,y:3.5},h.build().geometry.segments);
    assert.equal(ray().point.x,4);e._realX=4.375;assert.equal(ray().point.x,4.375);
});
test("sub-tile player movement updates polygon continuously",()=>{
    const h=harness();h.region(4,3,255);const a=h.build({x:1.5,y:3.5}).points,b=h.build({x:1.51,y:3.5}).points;
    assert.notEqual(JSON.stringify(a),JSON.stringify(b));assert.ok(b.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
});
test("scroll affects screen conversion once while world ray remains unchanged",()=>{
    const h=harness();h.region(4,3,255);const a=h.build().points;h.map.dx=.375;h.map.dy=1.125;assert.equal(JSON.stringify(h.build().points),JSON.stringify(a));
    const o=h.owner(),layer=o._projectRVisionLayer;const hole=layer.dark.ops.find(v=>v[0]==="drawPolygon")[1];assert.ok(hole.every(Number.isFinite));
    assert.equal(layer.tiles.origin.x,0);o.update();assert.equal(layer.tiles.origin.x,18);assert.equal(layer.tiles.origin.y,54);
});
test("map transfer discards old walls and static cache; restored saves rebuild",()=>{
    const h=harness();h.region(4,3,255);const a=h.api.cache();h.regions.clear();h.map.setup();const b=h.api.cache();assert.notEqual(a,b);assert.equal(b.walls.size,0);
    h.context.DataManager.extractSaveContents({system:{}});assert.notEqual(h.api.cache(),b);assert.equal(h.api.settings().angle,360);
});
test("static region queries are not repeated every frame",()=>{
    const h=harness();h.region(4,3,255);const o=h.owner(),before=h.map.regionReads;for(let i=0;i<10;i++)o.update();
    assert.ok(h.map.regionReads-before<30,"only constant origin queries are allowed, never full-map region scans");
});
test("merged long wall removes internal edges and preserves corners",()=>{
    const h=harness();for(let y=1;y<=7;y++)h.region(4,y,255);const c=h.api.cache();assert.equal(c.segments.length,4);
});
test("range circle caps visibility and zero restores viewport",()=>{
    const h=harness(),p=h.build(undefined,undefined,{angle:360,range:2}).points;assert.ok(visible(h,{x:2,y:3.5},p));assert.equal(visible(h,{x:4,y:3.5},p),false);
    assert.ok(p.every(v=>Math.hypot(v.x-1.5,v.y-3.5)<=2+1e-9));
});
test("optional cone follows direction, default 360 remains omnidirectional",()=>{
    const h=harness();const b={left:0,top:0,right:10,bottom:8},g=h.api.snapshot(b);
    const p=h.api.polygon({x:5,y:4},b,g,{angle:90,range:0},6);assert.ok(visible(h,{x:8,y:4},p));assert.equal(visible(h,{x:2,y:4},p),false);
});
test("origin within blocker fails closed without NaN or leaking",()=>{
    const h=harness();h.region(1,3,255);assert.equal(h.build().points.length,0);
    const k=harness();k.event(1,1,3,"<VisionWall>");assert.equal(k.build().points.length,0);
});
test("loop seam repeats static blocker geometry and rejects far side",()=>{
    const h=harness({width:10,height:8,loopX:true});for(let y=0;y<8;y++)h.region(0,y,255);
    const {geometry}=h.build({x:9.5,y:3.5},{left:8,top:0,right:18,bottom:8});
    assert.equal(h.combat.raycastVisionGeometry({x:9.5,y:3.5},{x:15,y:3.5},geometry.segments).point.x,10);
});
test("loop seam repeats dynamic event geometry",()=>{
    const h=harness({width:10,height:8,loopX:true});h.event(1,0,3,"<VisionWall>");
    const {geometry}=h.build({x:9.5,y:3.5},{left:8,top:0,right:18,bottom:8});
    assert.equal(h.combat.raycastVisionGeometry({x:9.5,y:3.5},{x:15,y:3.5},geometry.segments).point.x,10);
});
test("structure tilemap selects only 255/254 and contains no characters",()=>{
    const h=harness();h.region(4,3,255);h.region(2,3,254);h.region(6,3,250);const o=h.owner(),t=o._projectRVisionLayer.tiles;
    for(let x=0;x<10;x++)t._addSpot(0,0,x,3);assert.deepEqual(t.drawn,[[2,3],[4,3]]);assert.equal(t.children.some(s=>s._character),false);
});
test("structure selection respects looped tiles",()=>{
    const h=harness({width:10,loopX:true});h.region(0,3,254);const t=h.owner()._projectRVisionLayer.tiles;t._addSpot(10,0,0,3);assert.deepEqual(t.drawn,[[10,3]]);
});
test("darkness has only visibility hole: structure rectangle never exposes NPC or enemy",()=>{
    const h=harness();for(let y=0;y<8;y++)h.region(4,y,255);h.region(6,3,254);const o=h.owner();const enemy=h.event(1,6,3,"<enemy>"),npc=h.event(2,6,3,"");h.character(o,enemy);h.character(o,npc);o.update();
    const l=o._projectRVisionLayer;assert.equal(l.copies.size,0);assert.equal(l.dark.ops.filter(v=>v[0]==="beginHole").length,1);
    assert.equal(l.dark.ops.filter(v=>v[0]==="drawRect").length,1);assert.equal(l.keep.mask,l.keepMask);
});
test("wall/KeepVisible mirrors only tagged sprite including bush children and transforms",()=>{
    const h=harness(),o=h.owner(),wall=h.event(1,4,3,"<VisionWall>"),keep=h.event(2,6,5,"<VisionKeepVisible>"),enemy=h.event(3,6,3,"<enemy>");
    const a=h.character(o,wall),b=h.character(o,keep);h.character(o,enemy);a.scale.x=1.5;a.rotation=.4;a.alpha=.75;a.addChild(new h.Sprite({id:"bush"}));o.update();
    const l=o._projectRVisionLayer;assert.equal(l.copies.size,2);const copy=l.copies.get(a);assert.equal(copy.texture,a.texture);assert.equal(copy.rotation,.4);assert.equal(copy.scale.x,1.5);assert.equal(copy.alpha,.75);assert.equal(copy.children[0].texture,a.children[0].texture);
    b.visible=false;o.update();assert.equal(l.copies.get(b).visible,false);
});
test("Erase/Delete removes kept sprite and does not destroy borrowed texture",()=>{
    const h=harness(),o=h.owner(),e=h.event(1,4,3,"<VisionWall>"),s=h.character(o,e);o.update();const l=o._projectRVisionLayer,copy=l.copies.get(s);
    e._erased=true;o.update();assert.equal(l.copies.size,0);assert.equal(copy.destroyOptions.texture,false);
    e._erased=false;o.update();h.events.length=0;o.update();assert.equal(l.copies.size,0);
});
test("darkness stays inside base map below weather, pictures and scene UI",()=>{
    const h=harness(),o=h.owner();o.addChild(new h.Container());const scene=new h.Container(),ui=new h.Container();scene.addChild(o,ui);
    assert.deepEqual(o._baseSprite.children,[o._tilemap,o._projectRVisionLayer]);assert.equal(o.children[0],o._baseSprite);assert.equal(o.children[1],o._weather);assert.equal(scene.children[1],ui);
});
test("spriteset zoom/shake applies equally to vision; clone origin matches source",()=>{
    const h=harness(),o=h.owner();o.scale.x=o.scale.y=1.5;o.x=-30;o.y=-20;o._tilemap.x=7;o.update();const l=o._projectRVisionLayer;
    assert.equal(l.x,7);assert.equal(l.toLocal({x:100,y:100}).x,o._tilemap.toLocal({x:100,y:100}).x);
});
test("all seven commands persist, load restores them, old save defaults work",()=>{
    const h=harness();assert.equal(h.commands.size,7);h.commands.get("Disable")({});assert.equal(h.api.settings().enabled,false);
    h.commands.get("Enable")({});h.commands.get("SetRange")({Value:"8"});h.commands.get("SetAngle")({Value:"270"});h.commands.get("SetOpacity")({Value:".85"});h.commands.get("DebugOn")({});
    const saved=JSON.parse(JSON.stringify(h.context.$gameSystem));h.context.DataManager.extractSaveContents({system:saved});assert.equal(h.api.settings().range,8);assert.equal(h.api.settings().angle,270);assert.equal(h.api.settings().opacity,.85);assert.equal(h.api.settings().debug,true);
    h.commands.get("DebugOff")({});assert.equal(h.api.settings().debug,false);h.context.DataManager.extractSaveContents({system:{}});assert.equal(h.api.settings().range,0);
});
test("invalid command values clamp or retain valid settings",()=>{
    const h=harness();h.commands.get("SetOpacity")({Value:"4"});assert.equal(h.api.settings().opacity,1);h.commands.get("SetAngle")({Value:"0"});assert.equal(h.api.settings().angle,1);
    h.commands.get("SetRange")({Value:"NaN"});assert.equal(h.api.settings().range,0);
});
test("disabled system hides drawing; opacity zero skips structure replay",()=>{
    const h=harness(),o=h.owner(),l=o._projectRVisionLayer;h.commands.get("Disable")({});o.update();assert.equal(l.visible,false);
    h.commands.get("Enable")({});h.commands.get("SetOpacity")({Value:"0"});o.update();assert.equal(l.dark.alpha,0);assert.equal(l.keep.visible,false);
});
test("debug OFF draws no debug geometry; ON colors all requested categories",()=>{
    const h=harness();h.region(4,3,255);h.region(6,3,254);h.event(1,7,3,"<VisionWall>");const o=h.owner(),l=o._projectRVisionLayer;
    assert.equal(l.debugGraphics.ops.length,0);h.commands.get("DebugOn")({});o.update();const colors=l.debugGraphics.ops.filter(v=>v[0]==="lineStyle").map(v=>v[2]);
    for(const color of [0xffff00,0x00ff88,0xff4444,0xdd44ff,0x4488ff])assert.ok(colors.includes(color));assert.ok(l.debugGraphics.ops.some(v=>v[0]==="drawCircle"));
    h.commands.get("DebugOff")({});o.update();assert.equal(l.debugGraphics.ops.length,0);
});
test("unchanged frame reuses graphics; autotile clock and bitmap/flags stay synchronized",()=>{
    const h=harness(),o=h.owner(),l=o._projectRVisionLayer,ops=l.dark.ops;for(let i=0;i<40;i++)o.update();assert.equal(l.dark.ops,ops);assert.equal(l.tiles.animationFrame,1);
    const bitmap={id:"changed"};o._tilemap._bitmaps=[bitmap];o._tilemap.flags=[99];o.update();assert.equal(l.tiles._bitmaps[0],bitmap);assert.equal(l.tiles.flags[0],99);
});
test("new API leaves ordinary combat and vision firstBlocker results intact",()=>{
    const h=harness();h.region(4,3,255);h.event(1,7,3,"<CombatWall>");const from={x:1.5,y:3.5},to={x:9,y:3.5};
    const before=JSON.stringify(h.combat.firstBlockerBetween(from,to,{mode:"combat"}));h.owner().update();
    assert.equal(JSON.stringify(h.combat.firstBlockerBetween(from,to,{mode:"combat"})),before);assert.equal(h.combat.firstBlockerBetween(from,to,{mode:"vision"}).point.x,4);
});
test("region mismatch and reserved 250 are rejected before any gameplay edits",()=>{
    assert.throws(()=>harness({params:{VisionWallRegionId:"253"}}),/一致/);assert.throws(()=>harness({params:{StructureRegionId:"250"}}),/250/);
});
test("spatial acceleration matches unindexed rays including corners and collinear contacts",()=>{
    const h=harness();for(let y=1;y<8;y+=2)for(let x=3;x<10;x+=2)h.region(x,y,255);
    const bounds={left:0,top:0,right:12,bottom:10},g=h.api.snapshot(bounds),index=h.api.spatialIndex(g.segments,bounds);
    for(const origin of [{x:1.5,y:3.5},{x:2,y:2},{x:3,y:0}])for(let i=0;i<720;i++){
        const a=i*Math.PI/360,end={x:origin.x+12*Math.cos(a),y:origin.y+10*Math.sin(a)};
        const plain=h.combat.raycastVisionGeometry(origin,end,g.segments),fast=h.combat.raycastVisionGeometry(origin,end,g.segments,index);
        assert.ok(Math.abs(plain.fraction-fast.fraction)<1e-8,`${JSON.stringify(origin)} angle ${i}`);
    }
});
test("visible-corner pruning matches exhaustive corner polygon at sampled points",()=>{
    const h=harness();for(let y=1;y<8;y+=2)for(let x=3;x<10;x+=2)h.region(x,y,255);
    const origin={x:1.5,y:3.5},bounds={left:0,top:0,right:12,bottom:10},g=h.api.snapshot(bounds),fast=h.api.polygon(origin,bounds,g,{angle:360,range:0}),angles=[];
    for(const p of [{x:0,y:0},{x:12,y:0},{x:12,y:10},{x:0,y:10},...g.segments.flatMap(s=>[s.a,s.b])]){
        const a=Math.atan2(p.y-origin.y,p.x-origin.x);for(const offset of [-1e-7,0,1e-7])angles.push(a+offset);
    }
    const points=angles.sort((a,b)=>a-b).map(a=>{const dx=Math.cos(a),dy=Math.sin(a);let length=Infinity;
        if(dx>1e-12)length=Math.min(length,(bounds.right-origin.x)/dx);if(dx<-1e-12)length=Math.min(length,(bounds.left-origin.x)/dx);
        if(dy>1e-12)length=Math.min(length,(bounds.bottom-origin.y)/dy);if(dy<-1e-12)length=Math.min(length,(bounds.top-origin.y)/dy);
        return h.combat.raycastVisionGeometry(origin,{x:origin.x+dx*length,y:origin.y+dy*length},g.segments).point;});
    for(let y=.13;y<10;y+=.19)for(let x=.17;x<12;x+=.23)assert.equal(visible(h,{x,y},fast),visible(h,{x,y},points),`sample ${x},${y}`);
});
test("registration inserts exactly after CombatOcclusion and preserves existing order",()=>{
    const c={};vm.runInNewContext(fs.readFileSync(path.join(root,"js/plugins.js"),"utf8"),c);const ps=c.$plugins;
    const i=ps.findIndex(p=>p.name==="ProjectR_CombatOcclusion");assert.equal(ps[i+1].name,"ProjectR_VisionOcclusion");
    // Rebuild: CardSkillDeck(旧)は無いので、MenuHUDの直後・カード基盤(CardDeckCore)より前であることを確認する。
    const names=ps.map(p=>p.name);assert.equal(names[i-1],"ProjectR_MenuHUD");assert.ok(names.indexOf("ProjectR_CardDeckCore")>i+1);
    assert.equal(ps.filter(p=>p.name==="ProjectR_VisionOcclusion").length,1);assert.equal(ps[i+1].status,true);
});
test("geometry CPU benchmark: 1920x1080 viewport, moving player, 200 isolated wall tiles",t=>{
    const h=harness({width:80,height:45});h.context.Graphics.width=1920;h.context.Graphics.height=1080;
    for(let y=2;y<22;y+=2)for(let x=5;x<45;x+=2)h.region(x,y,255);
    const o=h.owner(),samples=[];
    for(let i=0;i<35;i++){h.context.$gamePlayer._realX=1+i*.01;const start=performance.now();o.update();if(i>=5)samples.push(performance.now()-start);}
    samples.sort((a,b)=>a-b);t.diagnostic(`CPU only: median=${samples[15].toFixed(2)}ms p95=${samples[28].toFixed(2)}ms; rendering/real MZ FPS unverified`);
    assert.ok(o._projectRVisionLayer.dark.ops.some(v=>v[0]==="drawPolygon"));
});
test("v101 first region wall A is selected as visible first blocker",()=>{
    const h=twoRegionWalls(),v=exposed(h);assert.ok(v.visibleRegionTiles.has("4,3"));assert.ok(v.visibleVisionBlockers.tiles.has("4,3"));
});
test("v101 region wall B behind A is never selected",()=>{
    const h=twoRegionWalls(),v=exposed(h);for(let y=0;y<8;y++)assert.equal(v.visibleRegionTiles.has(`7,${y}`),false);
});
test("v101 walking around region wall A exposes B",()=>{
    const h=twoRegionWalls();assert.ok(exposed(h,{x:5.5,y:3.5}).visibleRegionTiles.has("7,3"));
});
test("v101 first VisionWall event A remains visible",()=>{
    const h=harness();h.event(1,4,3,"<VisionWall>");h.event(2,7,3,"<VisionWall>");const v=exposed(h);
    assert.ok(v.visibleKeepEvents.has(1));assert.ok(v.visibleVisionBlockers.events.has(1));
});
test("v101 VisionWall event B behind A is hidden and reappears with LoS",()=>{
    const h=harness();h.event(1,4,3,"<VisionWall>");h.event(2,7,3,"<VisionWall>");const v=exposed(h);
    assert.equal(v.visibleKeepEvents.has(2),false);assert.equal(v.visibleVisionBlockers.events.has(2),false);
    assert.ok(exposed(h,{x:5.5,y:3.5}).visibleKeepEvents.has(2));
});
test("v102 structure 254 behind region wall is always restored",()=>{
    const h=twoRegionWalls();h.region(6,3,254);assert.ok(exposed(h).visibleRegionTiles.has("6,3"));
});
test("v101 structure 254 with unobstructed LoS is restored",()=>{
    const h=twoRegionWalls();h.region(6,3,254);assert.ok(exposed(h,{x:5.5,y:3.5}).visibleRegionTiles.has("6,3"));
});
test("v101 KeepVisible behind VisionWall is not mirrored",()=>{
    const h=harness(),o=h.owner();h.event(1,4,3,"<VisionWall>");const e=h.event(2,7,3,"<VisionKeepVisible>"),s=h.character(o,e);o.update();
    assert.equal(o._projectRVisionLayer.copies.has(s),false);
});
test("v101 KeepVisible without intervening wall is mirrored",()=>{
    const h=harness(),o=h.owner();h.event(1,4,3,"<VisionWall>");const e=h.event(2,7,3,"<VisionKeepVisible>"),s=h.character(o,e);
    h.context.$gamePlayer._realX=5;o.update();assert.ok(o._projectRVisionLayer.copies.has(s));
});
test("v101 enemy behind wall never joins structure layer",()=>{
    const h=twoRegionWalls(),o=h.owner(),e=h.event(99,6,3,"<enemy>"),s=h.character(o,e);o.update();
    assert.equal(o._projectRVisionLayer.copies.has(s),false);assert.equal(visible(h,{x:6.5,y:3.5},o._projectRVisionLayer.visibility.points),false);
});
test("v101 merged first-wall edge restores every front tile without gaps",()=>{
    const h=twoRegionWalls(),v=exposed(h);for(let y=0;y<8;y++)assert.ok(v.visibleRegionTiles.has(`4,${y}`),`front tile ${y}`);
});
test("v101 KeepVisible movement/tag/Erase updates exposure while player is stationary",()=>{
    const h=twoRegionWalls(),o=h.owner(),e=h.event(1,6,3,"<VisionKeepVisible>"),s=h.character(o,e);o.update();const l=o._projectRVisionLayer;
    assert.equal(l.copies.has(s),false);e._realX=2;o.update();assert.ok(l.copies.has(s));
    e._erased=true;o.update();assert.equal(l.copies.has(s),false);e._erased=false;e._page={list:[]};e._data={note:""};o.update();assert.equal(l.copies.has(s),false);
});
test("v102 range darkness preserves 254 independently of LoS",()=>{
    const h=twoRegionWalls();h.region(2,6,254);h.region(6,3,254);const b={left:0,top:0,right:10,bottom:8};
    const v=h.api.exposure({x:1.5,y:3.5},b,h.api.snapshot(b),{angle:360,range:1});
    assert.ok(v.visibleRegionTiles.has("2,6"));assert.ok(v.visibleRegionTiles.has("6,3"));
});
const v102Cases=[
    ["254 inside vision stays selected",()=>{const h=harness();h.region(2,3,254);assert.ok(exposed(h).visibleRegionTiles.has("2,3"));}],
    ["254 outside range stays selected",()=>{const h=harness();h.region(6,6,254);const b={left:0,top:0,right:10,bottom:8};const v=h.api.exposure({x:1.5,y:3.5},b,h.api.snapshot(b),{angle:360,range:1});assert.ok(v.visibleRegionTiles.has("6,6"));}],
    ["254 behind 255 stays selected",()=>{const h=twoRegionWalls();h.region(6,3,254);assert.ok(exposed(h).visibleRegionTiles.has("6,3"));}],
    ["enemy on hidden 254 is never copied",()=>{const h=twoRegionWalls();h.region(6,3,254);const o=h.owner(),e=h.event(20,6,3,"<enemy>"),s=h.character(o,e);o.update();assert.equal(o._projectRVisionLayer.copies.has(s),false);assert.equal(visible(h,{x:6.5,y:3.5},o._projectRVisionLayer.visibility.points),false);}],
    ["enemy behind protected structure remains outside polygon",()=>{const h=twoRegionWalls();h.region(5,3,254);const p=exposed(h).points;assert.equal(visible(h,{x:6.5,y:3.5},p),false);}],
    ["254 never stops vision ray",()=>{const h=harness();h.region(4,3,254);const g=h.api.snapshot({left:0,top:0,right:10,bottom:8});assert.equal(h.combat.raycastVisionGeometry({x:1.5,y:3.5},{x:9,y:3.5},g.segments).blocker,null);}],
    ["first 255 is still selected",()=>{const h=twoRegionWalls();h.region(6,3,254);assert.ok(exposed(h).visibleVisionBlockers.tiles.has("4,3"));}],
    ["rear 255 stays hidden despite 254 protection",()=>{const h=twoRegionWalls();h.region(6,3,254);assert.equal(exposed(h).visibleRegionTiles.has("7,3"),false);}],
    ["walking around still exposes rear 255",()=>{const h=twoRegionWalls();h.region(6,3,254);assert.ok(exposed(h,{x:5.5,y:3.5}).visibleRegionTiles.has("7,3"));}],
    ["multiple protected 254 cells all selected",()=>{const h=twoRegionWalls();for(let y=1;y<7;y++)h.region(6,y,254);const v=exposed(h);for(let y=1;y<7;y++)assert.ok(v.visibleRegionTiles.has(`6,${y}`));}],
    ["scroll keeps structure origin equal to original tilemap",()=>{const h=twoRegionWalls();h.region(6,3,254);const o=h.owner();h.map.dx=.375;h.map.dy=.625;o.update();const l=o._projectRVisionLayer;assert.equal(l.tiles.origin.x,o._tilemap.origin.x);assert.equal(l.tiles.origin.y,o._tilemap.origin.y);assert.ok(l.tiles.visibleRegionTiles.has("6,3"));}],
    ["transfer rebuilds 254 cache instead of preserving old cells",()=>{const h=harness();h.region(6,3,254);const a=h.api.cache();h.regions.clear();h.region(8,3,254);h.map.setup();const b=h.api.cache();assert.notEqual(a,b);assert.equal(b.structureTiles.has(3*h.map.width()+6),false);assert.ok(b.structureTiles.has(3*h.map.width()+8));}],
];
for(const [name,check]of v102Cases)test(`v102 regression: ${name}`,check);
test("v102 254 protection survives an empty polygon and does not register a blocker",()=>{
    const h=harness();h.region(1,3,255);h.region(6,3,254);const v=exposed(h);assert.equal(v.points.length,0);assert.ok(v.visibleRegionTiles.has("6,3"));assert.equal(v.visibleVisionBlockers.tiles.has("6,3"),false);
});
test("v102 protected tile does not copy NPC, ordinary or dynamic events",()=>{
    const h=twoRegionWalls();h.region(6,3,254);const o=h.owner();for(const [id,note]of [[11,""],[12,"<npc>"],[999,"<enemy>"]])h.character(o,h.event(id,6,3,note));o.update();assert.equal(o._projectRVisionLayer.copies.size,0);
});
const v103Cases=[
    ["single wall accepts its own first contact",()=>{const h=harness();h.region(4,3,255);assert.ok(tileSampleVisibility(h,4,3));}],
    ["front straight wall remains visible",()=>{const h=twoRegionWalls();assert.ok(tileSampleVisibility(h,4,3));}],
    ["rear straight wall remains hidden",()=>{const h=twoRegionWalls();assert.equal(tileSampleVisibility(h,7,3),false);}],
    ["L corner is selected",()=>{const h=lWall();assert.ok(exposed(h,{x:4.5,y:4.5}).visibleRegionTiles.has("2,2"));}],
    ["L inner corner is visible by fallback",()=>{assert.ok(tileSampleVisibility(lWall(),2,2,{x:4.5,y:4.5}));}],
    ["L outer corner is visible by fallback",()=>{assert.ok(tileSampleVisibility(lWall(),2,2,{x:1.5,y:1.5}));}],
    ["adjacent wall blocks center but another sample reaches target",()=>{const h=harness();h.region(4,3,255);h.region(3,3,255);
        let found=false;const b={left:0,top:0,right:12,bottom:10},g=h.api.snapshot(b),index=h.api.spatialIndex(g.segments,b);
        for(let y=2.05;y<3;y+=.05){const o={x:1.5,y},ps=h.api.visionTileSamples(4,3);if(!h.api.hasLineOfSightToStructureSample(o,ps[0],4,3,g,index)&&ps.some(p=>h.api.hasLineOfSightToStructureSample(o,p,4,3,g,index)))found=true;}assert.ok(found);}],
    ["all nine samples blocked stay hidden",()=>{const h=twoRegionWalls(),b={left:0,top:0,right:12,bottom:10},g=h.api.snapshot(b),index=h.api.spatialIndex(g.segments,b);
        assert.equal(h.api.visionTileSamples(7,3).length,9);for(const p of h.api.visionTileSamples(7,3))assert.equal(h.api.hasLineOfSightToStructureSample({x:1.5,y:3.5},p,7,3,g,index),false);}],
    ["enemy on corner is never copied",()=>{const h=lWall(),o=h.owner();h.context.$gamePlayer._realX=4;h.context.$gamePlayer._realY=4;const e=h.event(77,2,2,"<enemy>"),s=h.character(o,e);o.update();assert.equal(o._projectRVisionLayer.copies.has(s),false);}],
    ["enemy behind corner remains occluded",()=>{const h=lWall();assert.equal(visible(h,{x:1.5,y:1.5},exposed(h,{x:4.5,y:4.5}).points),false);}],
    ["scroll preserves corner tile origin",()=>{const h=lWall(),o=h.owner();h.context.$gamePlayer._realX=4;h.context.$gamePlayer._realY=4;h.map.dx=.375;h.map.dy=.625;o.update();assert.equal(o._projectRVisionLayer.tiles.origin.x,o._tilemap.origin.x);assert.ok(o._projectRVisionLayer.tiles.visibleRegionTiles.has("2,2"));}],
    ["small DotMove steps do not flicker at exposed corner",()=>{const h=lWall();for(let i=0;i<=20;i++)assert.ok(exposed(h,{x:4.4+i*.01,y:4.4+i*.01}).visibleRegionTiles.has("2,2"));}],
];for(const [name,check]of v103Cases)test(`v103 regression: ${name}`,check);
test("v103 samples are exactly nine inside-cell points with epsilon .02",()=>{
    const h=harness();assert.equal(h.api.TILE_SAMPLE_EPSILON,.02);assert.deepEqual(JSON.parse(JSON.stringify(h.api.visionTileSamples(0,0))),
        [{x:.5,y:.5},{x:.5,y:.02},{x:.5,y:.98},{x:.02,y:.5},{x:.98,y:.5},{x:.02,y:.02},{x:.98,y:.02},{x:.02,y:.98},{x:.98,y:.98}]);
});
test("v103 an earlier event VisionWall rejects target region samples",()=>{
    const h=harness();h.event(1,3,3,"<VisionWall>");h.region(5,3,255);assert.equal(tileSampleVisibility(h,5,3),false);
});
