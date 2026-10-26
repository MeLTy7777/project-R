"use strict";
// Isolated PIXI/MZ Tilemap rendering fixture. Never launches the game or MZ editor.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
async function main(){
    const packagePath=process.env.PROJECTR_PLAYWRIGHT_PATH || "C:/Users/hmats/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
    const {chromium}=require(packagePath);
    const executablePath=process.env.PROJECTR_BROWSER_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
    const browser=await chromium.launch({executablePath,headless:true,args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
    try{
        const page=await browser.newPage({viewport:{width:480,height:384}}),errors=[];
        page.on("pageerror",e=>errors.push(e.message));
        await page.setContent("<!doctype html><html><body style='margin:0'></body></html>");
        for(const file of ["js/libs/pixi.js","js/rmmz_core.js"])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),"utf8")});
        await page.evaluate(()=>{
            Graphics._width=480;Graphics._height=384;
            const w=10,h=8,data=new Array(w*h*6).fill(0),events=[];
            for(let y=0;y<h;y++)for(let x=0;x<w;x++)data[y*w+x]=1;
            for(let y=0;y<h;y++){data[y*w+4]=2;data[(5*h+y)*w+4]=255;}
            for(let y=0;y<h;y++){data[y*w+8]=2;data[(5*h+y)*w+8]=255;}
            data[3*w+6]=3;data[(5*h+3)*w+6]=254;
            data[3*w+2]=3;data[(5*h+3)*w+2]=254;
            // Protected stack: lower B tile, another normal layer, and a star upper tile.
            data[4*w+6]=1;data[(h+4)*w+6]=3;data[(2*h+4)*w+6]=4;data[(3*h+4)*w+6]=5;
            data[(5*h+4)*w+6]=254;data[5*w+6]=3;data[(5*h+5)*w+6]=254;
            window.Game_Map=function(){};Game_Map.prototype.setup=function(){};Game_Map.prototype.update=function(){};
            window.Game_Event=function(){};
            window.$gameMap=new Game_Map();Object.assign($gameMap,{dx:0,dy:0,mapId:()=>1,width:()=>w,height:()=>h,data:()=>data,
                roundX:x=>x,roundY:y=>y,isValid:(x,y)=>x>=0&&y>=0&&x<w&&y<h,isLoopHorizontal:()=>false,isLoopVertical:()=>false,
                deltaX:(a,b)=>a-b,deltaY:(a,b)=>a-b,adjustX:x=>x-$gameMap.dx,adjustY:y=>y-$gameMap.dy,
                displayX:()=>$gameMap.dx,displayY:()=>$gameMap.dy,tileWidth:()=>48,tileHeight:()=>48,
                regionId:(x,y)=>data[(5*h+y)*w+x]||0,events:()=>events,event:id=>events.find(e=>e._eventId===id),isPassable:()=>true});
            window.$gameSystem={};window.$gamePlayer={_realX:1,_realY:3,direction:()=>2};
            window.PluginManager={parameters:()=>({}),commands:{},registerCommand(p,n,f){this.commands[n]=f;}};
            window.DataManager={extractSaveContents(){}};
            const sheet=new Bitmap(768,768);sheet.fillRect(48,0,48,48,"#444444");sheet.fillRect(96,0,48,48,"#ba784a");sheet.fillRect(144,0,48,48,"#3388ee");
            sheet.fillRect(192,0,48,8,"#ffff00");sheet.fillRect(240,0,8,48,"#ffffff");
            window.Spriteset_Map=class extends PIXI.Container {
                createLowerLayer(){this._baseSprite=new PIXI.Container();this._tilemap=new Tilemap();this._tilemap.setData(w,h,data);
                    this._tilemap.setBitmaps(new Array(9).fill(sheet));this._tilemap.flags=new Array(8192).fill(0);
                    this._tilemap.flags[5]=0x10;
                    this._baseSprite.addChild(this._tilemap);this.addChild(this._baseSprite);this._weather=new PIXI.Container();this.addChild(this._weather);}
                update(){this._tilemap.origin.x=$gameMap.dx*48;this._tilemap.origin.y=$gameMap.dy*48;this._tilemap.update();}
            };
            window.makeEvent=(id,x,y,note,color)=>{
                const e=new Game_Event();e._eventId=id;e._realX=x;e._realY=y;const page={list:[]};
                Object.assign(e,{eventId:()=>id,event:()=>({note}),page:()=>page,collisionRect:()=>({x:e._realX,y:e._realY,width:1,height:1})});
                events.push(e);const sprite=new PIXI.Sprite(PIXI.Texture.WHITE);sprite._character=e;sprite.position.set(x*48+12,y*48+12);
                sprite.width=24;sprite.height=24;sprite.tint=color;sprite.z=3;sprite.spriteId=id;
                fixtureOwner._tilemap.addChild(sprite);return {e,sprite};
            };
        });
        for(const file of ["ProjectR_CombatOcclusion.js","ProjectR_VisionOcclusion.js"])
            await page.addScriptTag({content:fs.readFileSync(path.join(root,"js/plugins",file),"utf8")});
        const result=await page.evaluate(()=>{
            window.fixtureOwner=new Spriteset_Map();fixtureOwner.createLowerLayer();
            const enemy=makeEvent(1,6,3,"<enemy>",0xff0000),npc=makeEvent(2,7,3,"",0xff0000),
                keep=makeEvent(3,7,5,"<VisionKeepVisible>",0x00ff00),wall=makeEvent(4,7,1,"<VisionWall>",0xff00ff);
            makeEvent(5,2,3,"<enemy>",0xff0000);
            makeEvent(6,6,4,"<enemy>",0xff0000);
            const stage=new PIXI.Container();stage.addChild(fixtureOwner);
            const hud=new PIXI.Sprite(PIXI.Texture.WHITE);hud.position.set(408,0);hud.width=48;hud.height=24;hud.tint=0xffff00;stage.addChild(hud);
            const renderer=new PIXI.Renderer({width:480,height:384,backgroundColor:0xffffff,antialias:false,preserveDrawingBuffer:true});document.body.appendChild(renderer.view);
            const render=()=>{fixtureOwner.update();renderer.render(stage);return renderer.plugins.extract.pixels();};
            let pixels=render();
            const rgb=(x,y)=>Array.from(pixels.slice(((383-Math.floor(y))*480+Math.floor(x))*4,((383-Math.floor(y))*480+Math.floor(x))*4+3));
            const colors={visible:rgb(168,168),regionWall:rgb(216,168),shadow:rgb(264,168),structureNoEnemy:rgb(312,168),
                hiddenNpc:rgb(360,168),keepEvent:rgb(360,264),wallEvent:rgb(360,72),hud:rgb(420,12),visibleCharacterOnStructure:rgb(120,168),rearWall:rgb(408,168)};
            const frontTiles=Array.from({length:8},(_,y)=>rgb(216,y*48+24));
            const protectedStack={lower:rgb(312,216),normalUpper:rgb(312,194),starUpper:rgb(290,216),multiple:rgb(312,264)};
            $gamePlayer._realX=5;pixels=render();
            const around={rearWall:rgb(408,168),structureEdge:rgb(291,168),keepEvent:rgb(360,264),wallEvent:rgb(360,72)};
            PluginManager.commands.SetRange({Value:"1"});pixels=render();const eraseBefore=rgb(360,264);
            keep.e._erased=true;keep.sprite.visible=false;const erasedPixels=render();const erased=Array.from(erasedPixels.slice(((383-264)*480+360)*4,((383-264)*480+360)*4+3));
            PluginManager.commands.SetRange({Value:"0"});
            $gameMap.dx=.375;$gameMap.dy=.25;const scrollPixels=render();const scrollWall=Array.from(scrollPixels.slice(((383-156)*480+198)*4,((383-156)*480+198)*4+3));
            const scrollStructure=Array.from(scrollPixels.slice(((383-204)*480+294)*4,((383-204)*480+294)*4+3));
            // Separate event-only A/B regression, with no region wall hiding the cause.
            $gameMap.dx=0;$gameMap.dy=0;$gamePlayer._realX=1;
            for(let y=0;y<8;y++)for(let x=0;x<10;x++)$gameMap.data()[(5*8+y)*10+x]=0;
            for(const e of $gameMap.events())e._erased=true;
            const eventA=makeEvent(10,4,3,"<VisionWall>",0xff00ff),eventB=makeEvent(11,7,3,"<VisionWall>",0x00ffff),eventKeep=makeEvent(12,6,3,"<VisionKeepVisible>",0x00ff00);
            ProjectR.VisionOcclusion.invalidateCache();pixels=render();
            const eventOnly={first:rgb(216,168),rear:rgb(360,168),keepBehind:rgb(312,168)};
            $gamePlayer._realX=5;pixels=render();eventOnly.rearAround=rgb(360,168);eventOnly.keepAround=rgb(312,168);
            // Corner tile artwork must be complete; its enemy and the floor behind stay dark.
            for(const e of $gameMap.events())e._erased=true;
            for(const s of fixtureOwner._tilemap.children)if(s._character)s.visible=false;
            const ld=$gameMap.data();for(let y=0;y<8;y++)for(let x=0;x<10;x++)ld[(5*8+y)*10+x]=0;
            for(let x=2;x<=6;x++){ld[2*10+x]=2;ld[(5*8+2)*10+x]=255;}
            for(let y=2;y<=6;y++){ld[y*10+2]=2;ld[(5*8+y)*10+2]=255;}
            makeEvent(20,2,2,"<enemy>",0xff0000);$gamePlayer._realX=4;$gamePlayer._realY=4;
            ProjectR.VisionOcclusion.invalidateCache();fixtureOwner._tilemap.refresh();pixels=render();
            const lCorner=[[120,120],[102,102],[138,102],[102,138],[138,138]].map(([x,y])=>rgb(x,y));
            const cornerBehind=rgb(72,72);
            for(let y=0;y<8;y++)for(let x=0;x<10;x++)ld[(5*8+y)*10+x]=0;
            for(let x=1;x<=6;x++){ld[6*10+x]=2;ld[(5*8+6)*10+x]=255;}
            for(let y=2;y<=6;y++){ld[y*10+6]=2;ld[(5*8+y)*10+6]=255;}
            ProjectR.VisionOcclusion.invalidateCache();fixtureOwner._tilemap.refresh();pixels=render();const oppositeCorner=rgb(312,312);
            // Pixel test plus actual V8 CPU timings on the same browser (drawing excluded for benchmark).
            const layer=fixtureOwner._projectRVisionLayer,samples=[];
            for(let i=0;i<65;i++){$gamePlayer._realX=1+i*.001;const t=performance.now();layer.updateVision();if(i>=5)samples.push(performance.now()-t);}
            samples.sort((a,b)=>a-b);
            const stressData=new Array(80*45*6).fill(0);
            for(let y=2;y<22;y+=2)for(let x=5;x<45;x+=2)stressData[(5*45+y)*80+x]=255;
            Object.assign($gameMap,{width:()=>80,height:()=>45,data:()=>stressData,regionId:(x,y)=>stressData[(5*45+y)*80+x]||0,
                isValid:(x,y)=>x>=0&&y>=0&&x<80&&y<45,events:()=>[],event:()=>null});
            Graphics._width=1920;Graphics._height=1080;ProjectR.VisionOcclusion.invalidateCache();
            const stress=[];for(let i=0;i<65;i++){$gamePlayer._realX=1+i*.001;const t=performance.now();layer.updateVision();if(i>=5)stress.push(performance.now()-t);}
            stress.sort((a,b)=>a-b);
            const commandDisabled=(()=>{PluginManager.commands.Disable({});fixtureOwner.update();return !layer.visible;})();
            stage.destroy({children:true,texture:false,baseTexture:false});renderer.destroy(true);
            return {colors,protectedStack,frontTiles,around,eventOnly,lCorner,cornerBehind,oppositeCorner,eraseBefore,erased,scrollWall,scrollStructure,commandDisabled,cpuMedian:samples[30],cpuP95:samples[57],stress200Median:stress[30],stress200P95:stress[57]};
        });
        const expected={visible:[68,68,68],regionWall:[186,120,74],shadow:[0,0,0],structureNoEnemy:[51,136,238],hiddenNpc:[0,0,0],keepEvent:[0,0,0],wallEvent:[0,0,0],hud:[255,255,0],visibleCharacterOnStructure:[255,0,0],rearWall:[0,0,0]};
        for(const [name,color]of Object.entries(expected))assert.deepEqual(result.colors[name],color,name);
        assert.deepEqual(result.eraseBefore,[0,255,0]);assert.deepEqual(result.erased,[0,0,0],"erased kept event becomes dark");assert.deepEqual(result.scrollWall,[186,120,74],"scroll wall alignment");
        for(const color of result.frontTiles)assert.deepEqual(color,[186,120,74],"all first-wall tiles remain visible");
        assert.deepEqual(result.around.rearWall,[186,120,74]);assert.deepEqual(result.around.structureEdge,[51,136,238]);
        assert.deepEqual(result.around.keepEvent,[0,255,0]);assert.deepEqual(result.around.wallEvent,[255,0,255]);
        assert.deepEqual(result.eventOnly,{first:[255,0,255],rear:[0,0,0],keepBehind:[0,0,0],rearAround:[0,255,255],keepAround:[0,255,0]});
        assert.deepEqual(result.protectedStack,{lower:[51,136,238],normalUpper:[255,255,0],starUpper:[255,255,255],multiple:[51,136,238]});
        assert.deepEqual(result.scrollStructure,[51,136,238]);
        for(const color of result.lCorner)assert.deepEqual(color,[186,120,74],"whole L corner tile restored above its enemy");
        assert.deepEqual(result.cornerBehind,[0,0,0]);assert.deepEqual(result.oppositeCorner,[186,120,74]);
        assert.equal(result.commandDisabled,true);assert.deepEqual(errors,[]);
        console.log(JSON.stringify({pixelChecks:42,commandChecks:1,pageErrors:errors,results:result},null,2));
    }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
