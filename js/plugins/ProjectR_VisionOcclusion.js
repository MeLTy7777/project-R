/*:
 * @target MZ
 * @plugindesc v1.0.3 壁で遮られる360°プレイヤー視界。壁255の露出を9点で補完します。
 * @author ProjectR
 * @base ProjectR_CombatOcclusion
 * @orderAfter ProjectR_CombatOcclusion
 * @param Enabled
 * @text 視界システム有効
 * @type boolean
 * @default true
 * @param VisionAngle
 * @text 視界角度
 * @type number
 * @min 1
 * @max 360
 * @decimals 2
 * @default 360
 * @param VisionRangeTiles
 * @text 視界距離
 * @desc タイル数。0は画面端／マップ境界まで。
 * @type number
 * @min 0
 * @decimals 2
 * @default 0
 * @param DarknessOpacity
 * @text 暗闇の濃さ
 * @type number
 * @min 0
 * @max 1
 * @decimals 2
 * @default 1.0
 * @param VisionWallRegionId
 * @text 視界壁リージョンID
 * @desc CombatOcclusionと同じ値を使用。250は禁止。判定の不一致を防ぐため値が違う場合は起動時に通知します。
 * @type number
 * @min 1
 * @max 255
 * @default 255
 * @param StructureRegionId
 * @text 建物表示リージョンID
 * @desc 視界や壁の有無に関係なく、このリージョンのマップ画像だけを保持します。250は禁止。
 * @type number
 * @min 1
 * @max 255
 * @default 254
 * @param Debug
 * @text 視界デバッグ表示
 * @type boolean
 * @default false
 * @command Enable
 * @text 視界を有効化
 * @command Disable
 * @text 視界を無効化
 * @command SetRange
 * @text 視界距離変更
 * @arg Value
 * @text 距離（タイル）
 * @type number
 * @min 0
 * @decimals 2
 * @default 0
 * @command SetAngle
 * @text 視界角度変更
 * @arg Value
 * @text 角度
 * @type number
 * @min 1
 * @max 360
 * @decimals 2
 * @default 360
 * @command SetOpacity
 * @text 暗闇濃度変更
 * @arg Value
 * @text 濃さ
 * @type number
 * @min 0
 * @max 1
 * @decimals 2
 * @default 1.0
 * @command DebugOn
 * @text デバッグ表示ON
 * @command DebugOff
 * @text デバッグ表示OFF
 * @help
 * ProjectR_CombatOcclusionの直後に登録してください。
 * Region255と<VisionWall>だけが視界を遮ります（既存Combat仕様を保持）。
 * Region254は視界や壁に関係なくマップ画像だけを保持します。敵や通常イベントは含みません。
 * 通常の通行不能／<CombatWall>は視界を遮りません。
 * <VisionWall>／<VisionKeepVisible>はイベントのメモ、または有効ページの注釈に記入。
 * 別の壁に遮られないイベント自身の画像だけを保持し、背後の敵・NPCは隠します。
 * Region255／VisionWallも最初に見える壁だけを保持。奥の壁を透視しません。
 * Erase、無効ページ、Deleteされたイベントは対象外。透明イベントを強制表示しません。
 * 壁の判定形状はCombatOcclusionのAction Combat／DotMove形状を使用します。
 * 壁画像と判定形状の大きさが違う場合はイベントの当たり判定を調整してください。
 * 設定コマンドの結果はセーブに保持されます。旧セーブでは初期値を使用します。
 * マップ／戦闘判定／カード／Region250のデータは変更しません。
 * 静的リージョンはマップ初回表示時にキャッシュ。特殊なスクリプトでリージョンを
 * 実行中に書き換えた場合だけ ProjectR.VisionOcclusion.invalidateCache() を呼んでください。
 * Debug: 原点=白、視界=緑、Ray=黄、リージョン壁=赤、イベント壁=紫、建物=青。
 */
(() => {
    "use strict";
    const NAME = "ProjectR_VisionOcclusion", VERSION = "1.0.3";
    const combat = window.ProjectR?.CombatOcclusion;
    if (!combat?.raycastVisionGeometry || !combat.eventPolygon)
        throw new Error(`${NAME}: 更新したProjectR_CombatOcclusionを直前で有効にしてください。`);
    const params = PluginManager.parameters(NAME);
    const number = (v, fallback, min, max) => Number.isFinite(Number(v)) && v !== "" && v != null
        ? Math.max(min, Math.min(max, Number(v))) : fallback;
    const wallRegion = number(params.VisionWallRegionId, 255, 1, 255);
    const structureRegion = number(params.StructureRegionId, 254, 1, 255);
    if (!Number.isInteger(wallRegion) || !Number.isInteger(structureRegion) || wallRegion === 250 || structureRegion === 250)
        throw new Error(`${NAME}: リージョンIDは整数、250以外にしてください。`);
    if (wallRegion !== combat.VisionWallRegionId)
        throw new Error(`${NAME}: 視界壁リージョンIDをCombatOcclusionと一致させてください。`);
    const defaults = {enabled: params.Enabled !== "false", angle: number(params.VisionAngle, 360, 1, 360),
        range: number(params.VisionRangeTiles, 0, 0, 9999), opacity: number(params.DarknessOpacity, 1, 0, 1),
        debug: params.Debug === "true"};
    function settings() {
        const saved = $gameSystem._projectRVisionOcclusion || {};
        return {enabled: typeof saved.enabled === "boolean" ? saved.enabled : defaults.enabled,
            angle: number(saved.angle, defaults.angle, 1, 360), range: number(saved.range, defaults.range, 0, 9999),
            opacity: number(saved.opacity, defaults.opacity, 0, 1),
            debug: typeof saved.debug === "boolean" ? saved.debug : defaults.debug};
    }
    function change(key, value) { $gameSystem._projectRVisionOcclusion = {...settings(), [key]: value}; }
    for (const [name, key, value] of [["Enable", "enabled", true], ["Disable", "enabled", false],
        ["DebugOn", "debug", true], ["DebugOff", "debug", false]])
        PluginManager.registerCommand(NAME, name, () => change(key, value));
    for (const [name, key, min, max] of [["SetRange", "range", 0, 9999], ["SetAngle", "angle", 1, 360],
        ["SetOpacity", "opacity", 0, 1]])
        PluginManager.registerCommand(NAME, name, args => change(key, number(args.Value, settings()[key], min, max)));

    const TAU = Math.PI * 2, RAY_EPS = 1e-7;
    const rect = (x, y, w, h) => [{x, y}, {x: x+w, y}, {x: x+w, y: y+h}, {x, y: y+h}];
    const edges = (polygon, kind) => polygon.map((a, i) => ({a, b: polygon[(i+1)%polygon.length], kind}));
    const normalize = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
    const tagCache = new WeakMap();
    function eventTags(e) {
        if (!e || e._erased || !e.page?.()) return {wall: false, keep: false};
        const page = e.page(), data = e.event(), cached = tagCache.get(e);
        if (cached?.page === page && cached.data === data) return cached.tags;
        const text = (data?.note || "") + "\n" + (page.list || [])
            .filter(c => c.code === 108 || c.code === 408).map(c => c.parameters[0]).join("\n");
        const tags = {wall: /<VisionWall>/i.test(text), keep: /<VisionWall>|<VisionKeepVisible>/i.test(text)};
        tagCache.set(e, {page, data, tags});
        return tags;
    }
    // Collinear exposed tile edges are merged; interior shared edges never emit rays.
    function mergeEdges(input) {
        const groups = new Map(), result = [];
        for (const s of input) {
            const horizontal = s.a.y === s.b.y, fixed = horizontal ? s.a.y : s.a.x;
            const key = `${horizontal}:${fixed}`;
            if (!groups.has(key)) groups.set(key, {horizontal, fixed, intervals: []});
            groups.get(key).intervals.push(horizontal ? [s.a.x, s.b.x] : [s.a.y, s.b.y]);
        }
        for (const {horizontal, fixed, intervals} of groups.values()) {
            intervals.sort((a, b) => a[0]-b[0]);
            const merged = [];
            for (const [lo, hi] of intervals) {
                const last = merged[merged.length-1];
                if (last && lo <= last[1]) last[1] = Math.max(last[1], hi); else merged.push([lo, hi]);
            }
            for (const [lo, hi] of merged) result.push({kind: "region", a: horizontal ? {x: lo, y: fixed} : {x: fixed, y: lo},
                b: horizontal ? {x: hi, y: fixed} : {x: fixed, y: hi}});
        }
        return result;
    }
    let staticCache = null;
    function invalidateCache() { staticCache = null; }
    function cache() {
        const m = $gameMap;
        if (staticCache?.map === m && staticCache.id === m.mapId() && staticCache.data === m.data()) return staticCache;
        const walls = new Set(), structures = [], structureTiles=new Set(), w = m.width(), h = m.height();
        for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
            const r = m.regionId(x, y);
            if (combat.isVisionBlockedAt(x, y)) walls.add(y*w+x);
            if (r === structureRegion){structures.push({x,y});structureTiles.add(y*w+x);}
        }
        const has = (x, y) => {
            if (m.isLoopHorizontal()) x = m.roundX(x);
            if (m.isLoopVertical()) y = m.roundY(y);
            return x>=0 && y>=0 && x<w && y<h && walls.has(y*w+x);
        };
        const boundary = [];
        for (const id of walls) {
            const x = id%w, y = Math.floor(id/w);
            if (!has(x, y-1)) boundary.push({a:{x,y}, b:{x:x+1,y}});
            if (!has(x, y+1)) boundary.push({a:{x,y:y+1}, b:{x:x+1,y:y+1}});
            if (!has(x-1, y)) boundary.push({a:{x,y}, b:{x,y:y+1}});
            if (!has(x+1, y)) boundary.push({a:{x:x+1,y}, b:{x:x+1,y:y+1}});
        }
        staticCache = {map:m, id:m.mapId(), data:m.data(), walls, structures, structureTiles,segments:mergeEdges(boundary)};
        return staticCache;
    }
    const setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { const value = setup.apply(this, arguments); invalidateCache(); return value; };
    const extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() { const value = extract.apply(this, arguments); invalidateCache(); return value; };
    function intersects(s, b) {
        return Math.max(s.a.x,s.b.x)>=b.left && Math.min(s.a.x,s.b.x)<=b.right &&
            Math.max(s.a.y,s.b.y)>=b.top && Math.min(s.a.y,s.b.y)<=b.bottom;
    }
    function offsets(min, max, length, loop) {
        if (!loop) return [0];
        const out = [];
        for (let i=Math.floor(min/length)-1; i<=Math.ceil(max/length)+1; i++) out.push(i*length);
        return out;
    }
    function snapshot(bounds) {
        const m=$gameMap, c=cache(), result=[];
        const xs=offsets(bounds.left,bounds.right,m.width(),m.isLoopHorizontal());
        const ys=offsets(bounds.top,bounds.bottom,m.height(),m.isLoopVertical());
        for (const x of xs) for (const y of ys) for (const s of c.segments) {
            const copy = {kind:s.kind, a:{x:s.a.x+x,y:s.a.y+y}, b:{x:s.b.x+x,y:s.b.y+y}};
            if (intersects(copy,bounds)) result.push(copy);
        }
        const eventPolygons=[],keepCandidates=[];
        for (const e of m.events()) {
            const tags=eventTags(e);if(!tags.keep)continue;
            const poly=combat.eventPolygon(e);
            if (poly.length<3) continue;
            keepCandidates.push({id:e.eventId(),wall:tags.wall,polygon:poly});
            if(!tags.wall)continue;
            // API eventPolygon uses screen positions; canonicalize once before repeating loop images.
            const cx=poly.reduce((s,p)=>s+p.x/poly.length,0), cy=poly.reduce((s,p)=>s+p.y/poly.length,0);
            const ox=m.isLoopHorizontal()?m.roundX(cx)-cx:0, oy=m.isLoopVertical()?m.roundY(cy)-cy:0;
            for (const x of xs) for (const y of ys) {
                const p=poly.map(v=>({x:v.x+ox+x,y:v.y+oy+y})), ss=edges(p,"event");
                for(const s of ss)s.eventId=e.eventId();
                const xs=p.map(v=>v.x),ys=p.map(v=>v.y);
                if (Math.max(...xs)>=bounds.left && Math.min(...xs)<=bounds.right &&
                    Math.max(...ys)>=bounds.top && Math.min(...ys)<=bounds.bottom) {
                    eventPolygons.push(p);result.push(...ss);
                }
            }
        }
        return {segments:result,eventPolygons,keepCandidates};
    }
    function inside(point, poly) {
        let result=false;
        for (let i=0,j=poly.length-1;i<poly.length;j=i++) {
            const a=poly[i],b=poly[j];
            if ((a.y>point.y)!==(b.y>point.y) && point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) result=!result;
        }
        return result;
    }
    function spatialIndex(segments, bounds) {
        const size=2,buckets=new Map();
        for(const s of segments) {
            // Include both sides of cell boundaries; corner/tangent rays must not slip through.
            const minX=Math.floor((Math.min(s.a.x,s.b.x)-1e-9)/size),maxX=Math.floor((Math.max(s.a.x,s.b.x)+1e-9)/size);
            const minY=Math.floor((Math.min(s.a.y,s.b.y)-1e-9)/size),maxY=Math.floor((Math.max(s.a.y,s.b.y)+1e-9)/size);
            for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++) {
                const key=`${x},${y}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(s);
            }
        }
        return {size,buckets,maxSteps:Math.ceil((bounds.right-bounds.left+bounds.bottom-bounds.top)/size)+8};
    }
    function polygon(origin, bounds, geometry, config, direction=2, firstHits=null, preparedIndex=null) {
        if (combat.isVisionBlockedAt(origin.x,origin.y) || geometry.eventPolygons.some(p=>inside(origin,p))) return [];
        const facing = {2:Math.PI/2,4:Math.PI,6:0,8:-Math.PI/2}[direction] ?? Math.PI/2;
        const half=config.angle*Math.PI/360, full=config.angle>=360, angles=new Set();
        const add = a => { const relative=normalize(a-facing); if(full || Math.abs(relative)<=half+1e-10) angles.add(relative); };
        const spatial=preparedIndex || spatialIndex(geometry.segments,bounds);
        const corners=rect(bounds.left,bounds.top,bounds.right-bounds.left,bounds.bottom-bounds.top);
        const unique=new Map();
        for(const s of geometry.segments)for(const p of [s.a,s.b])unique.set(`${p.x},${p.y}`,p);
        for(const p of unique.values()) {
            const ray=combat.raycastVisionGeometry(origin,p,geometry.segments,spatial);
            // A corner strictly behind another boundary cannot change the visible outline.
            if(ray.fraction>=1-1e-9)corners.push(p);
        }
        for (const p of corners) {
            const a=Math.atan2(p.y-origin.y,p.x-origin.x);
            add(a-RAY_EPS);add(a);add(a+RAY_EPS);
        }
        // Baseline samples only smooth the optional range circle; blocker corners drive precision.
        const steps=config.range>0 ? 128 : 16;
        for (let i=0;i<=steps;i++) add(facing-Math.PI+i*TAU/steps);
        if(!full){angles.add(-half);angles.add(half);}
        const points=[];
        for(const relative of [...angles].sort((a,b)=>a-b)) {
            const a=relative+facing, dx=Math.cos(a),dy=Math.sin(a);
            let length=Infinity;
            if(dx>1e-12)length=Math.min(length,(bounds.right-origin.x)/dx);
            if(dx<-1e-12)length=Math.min(length,(bounds.left-origin.x)/dx);
            if(dy>1e-12)length=Math.min(length,(bounds.bottom-origin.y)/dy);
            if(dy<-1e-12)length=Math.min(length,(bounds.top-origin.y)/dy);
            if(config.range>0)length=Math.min(length,config.range);
            const end={x:origin.x+dx*Math.max(0,length),y:origin.y+dy*Math.max(0,length)};
            const hit=combat.raycastVisionGeometry(origin,end,geometry.segments,spatial);
            points.push(hit.point);if(firstHits)firstHits.push(hit);
        }
        return full?points:[origin,...points];
    }

    const tileKey=(x,y)=>`${x},${y}`;
    function regionTilesAt(point,visible) {
        const m=$gameMap,c=cache(),w=m.width();
        // At a grid corner both exposed neighboring tiles may be first surfaces.
        for(let y=Math.floor(point.y-1e-8);y<=Math.floor(point.y+1e-8);y++)
            for(let x=Math.floor(point.x-1e-8);x<=Math.floor(point.x+1e-8);x++) {
                const mx=m.roundX(x),my=m.roundY(y);
                if(mx>=0&&my>=0&&mx<m.width()&&my<m.height()&&c.walls.has(my*w+mx))visible.add(tileKey(x,y));
            }
    }
    function exposedBoundary(a,b,visible) {
        // Consecutive rays hitting the same merged edge expose the continuous interval.
        // This restores every front tile of a long wall, even without internal corner rays.
        const count=Math.ceil(Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))*2);
        for(let i=0;i<=count;i++) {
            const t=count?i/count:0;regionTilesAt({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},visible);
        }
    }
    function samples(poly) {
        if(!poly.length)return [];
        const center=poly.reduce((s,p)=>({x:s.x+p.x/poly.length,y:s.y+p.y/poly.length}),{x:0,y:0});
        const result=[center];
        for(let i=0;i<poly.length;i++) {
            const a=poly[i],b=poly[(i+1)%poly.length];
            // Insets avoid treating a zero-area tangent to an intervening wall as LoS.
            for(const p of [a,{x:(a.x+b.x)/2,y:(a.y+b.y)/2}])
                result.push({x:p.x+(center.x-p.x)*1e-5,y:p.y+(center.y-p.y)*1e-5});
        }
        return result;
    }
    function unobstructed(origin,poly,geometry,index,targetEventId=null) {
        return samples(poly).some(p=>{
            const hit=combat.raycastVisionGeometry(origin,p,geometry.segments,index);
            return !hit.blocker || hit.fraction>=1-1e-9 ||
                (targetEventId!==null && hit.blocker.kind==="event" && hit.blocker.eventId===targetEventId);
        });
    }
    const TILE_SAMPLE_EPSILON=0.02;
    function visionTileSamples(x,y) {
        const e=TILE_SAMPLE_EPSILON;
        return [[.5,.5],[.5,e],[.5,1-e],[e,.5],[1-e,.5],
            [e,e],[1-e,e],[e,1-e],[1-e,1-e]].map(([dx,dy])=>({x:x+dx,y:y+dy}));
    }
    function hasLineOfSightToStructureSample(origin,point,x,y,geometry,index) {
        const hit=combat.raycastVisionGeometry(origin,point,geometry.segments,index);
        if(!hit.blocker)return true;
        if(hit.blocker.kind!=="region")return false;
        // Compare the first contact to entry into THIS cell, not its center.
        // Merged region boundaries can belong to several cells; no combat geometry is edited.
        const entry=combat.firstContact(origin,point,rect(x,y,1,1));
        return entry!==null && Math.abs(hit.fraction-entry)<=1e-8;
    }
    function isVisionStructureTileVisible(origin,x,y,geometry,index) {
        return visionTileSamples(x,y).some(p=>hasLineOfSightToStructureSample(origin,p,x,y,geometry,index));
    }
    function exposure(origin,bounds,geometry,config,direction=2) {
        const index=spatialIndex(geometry.segments,bounds),firstHits=[];
        const points=polygon(origin,bounds,geometry,config,direction,firstHits,index);
        const visibleRegionTiles=new Set(),visibleVisionBlockers={tiles:new Set(),events:new Set()},visibleKeepEvents=new Set();
        const m=$gameMap,w=m.width(),c=cache();
        for(let i=0;i<firstHits.length;i++) {
            const hit=firstHits[i],s=hit.blocker;if(!s)continue;
            if(s.kind==="event")visibleVisionBlockers.events.add(s.eventId);
            if(s.kind==="region") {
                regionTilesAt(hit.point,visibleRegionTiles);
                const next=firstHits[(i+1)%firstHits.length];
                if(next?.blocker===s && (config.angle>=360 || i+1<firstHits.length))exposedBoundary(hit.point,next.point,visibleRegionTiles);
            }
        }
        // First-hit fast path stays intact; only unselected viewport cells need fallback.
        if(points.length)for(let y=Math.floor(bounds.top);y<Math.ceil(bounds.bottom);y++)
            for(let x=Math.floor(bounds.left);x<Math.ceil(bounds.right);x++) {
                const mx=m.roundX(x),my=m.roundY(y),key=tileKey(x,y);
                if(mx<0||my<0||mx>=m.width()||my>=m.height()||!c.walls.has(my*w+mx)||visibleRegionTiles.has(key))continue;
                // Isolated tiles have all four corners in the polygon ray set already.
                // Only connected walls lose internal corners when their boundary is merged.
                const connected=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([nx,ny])=>{
                    nx=m.roundX(nx);ny=m.roundY(ny);
                    return nx>=0&&ny>=0&&nx<m.width()&&ny<m.height()&&c.walls.has(ny*w+nx);
                });
                if(!connected)continue;
                if(isVisionStructureTileVisible(origin,x,y,geometry,index))visibleRegionTiles.add(key);
            }
        for(const key of visibleRegionTiles) {
            const [x,y]=key.split(",").map(Number);visibleVisionBlockers.tiles.add(tileKey(m.roundX(x),m.roundY(y)));
        }
        // Region254 protects map artwork, independently of rays/LoS/polygon.
        // Query cached cells in the viewport only; no per-tile raycast or full-map scan.
        for(let y=Math.floor(bounds.top);y<Math.ceil(bounds.bottom);y++)
            for(let x=Math.floor(bounds.left);x<Math.ceil(bounds.right);x++) {
                const mx=m.roundX(x),my=m.roundY(y);
                if(mx>=0&&my>=0&&mx<m.width()&&my<m.height()&&c.structureTiles.has(my*w+mx))
                    visibleRegionTiles.add(tileKey(x,y));
            }
        if(points.length) {
            for(const target of geometry.keepCandidates) {
                // A wall may hit its own representative ray; earlier blockers still veto it.
                const exposed=(target.wall && visibleVisionBlockers.events.has(target.id)) ||
                    unobstructed(origin,target.polygon,geometry,index,target.wall?target.id:null);
                if(exposed){visibleKeepEvents.add(target.id);if(target.wall)visibleVisionBlockers.events.add(target.id);}
            }
        }
        return {points,visibleRegionTiles,visibleVisionBlockers,visibleKeepEvents};
    }

    class StructureTilemap extends Tilemap {
        _addSpot(startX,startY,x,y) {
            const region=this._readMapData(startX+x,startY+y,5);
            if((region===wallRegion || region===structureRegion) &&
                this.visibleRegionTiles?.has(tileKey(startX+x,startY+y)))super._addSpot(startX,startY,x,y);
        }
    }
    // A drawing-only mirror: no duplicate Sprite_Character update or Action Combat hooks.
    function mirror(source, target) {
        target.texture=source.texture;
        for(const key of ["position","scale","pivot","skew","anchor"]) if(source[key] && target[key]) target[key].copyFrom(source[key]);
        for(const key of ["rotation","alpha","visible","renderable","tint","blendMode","z","spriteId"]) if(source[key]!==undefined) target[key]=source[key];
        target.filters=source.filters;
        const children=(source.children || []).filter(c=>c instanceof PIXI.Sprite);
        while(target.children.length>children.length) target.removeChildAt(target.children.length-1).destroy({children:true,texture:false,baseTexture:false});
        children.forEach((child,i)=>{
            if(!target.children[i])target.addChild(new PIXI.Sprite());
            mirror(child,target.children[i]);
        });
    }
    class VisionLayer extends PIXI.Container {
        constructor(owner) {
            super();this.owner=owner;this.dark=new PIXI.Graphics();this.keep=new PIXI.Container();
            this.keepMask=new PIXI.Graphics();this.debugGraphics=new PIXI.Graphics();this.tiles=new StructureTilemap();
            // PIXI 5 isFastRect ignores holes. Force stencil masking so visible terrain
            // is never redrawn over characters and the polygon hole is actually respected.
            this.keepMask.isFastRect=()=>false;
            this.tiles.tileWidth=$gameMap.tileWidth();this.tiles.tileHeight=$gameMap.tileHeight();
            this.tiles.setData($gameMap.width(),$gameMap.height(),$gameMap.data());
            this.tiles.horizontalWrap=$gameMap.isLoopHorizontal();this.tiles.verticalWrap=$gameMap.isLoopVertical();
            this.keep.addChild(this.tiles);this.addChild(this.dark,this.keep,this.keepMask,this.debugGraphics);
            this.keep.mask=this.keepMask;this.copies=new Map();this.lastKey="";this.lastTileset=null;this.lastCache=null;
        }
        syncTiles() {
            const original=this.owner._tilemap;
            if(this.lastTileset!==original._bitmaps || this.tiles.flags!==original.flags) {
                this.lastTileset=original._bitmaps;this.tiles.setBitmaps(original._bitmaps);this.tiles.flags=original.flags;
            }
            this.tiles.origin.copyFrom(original.origin);this.tiles.animationCount=original.animationCount;
            this.tiles.animationFrame=original.animationFrame;
            if(this.tiles.width!==original.width || this.tiles.height!==original.height) {
                this.tiles.width=original.width;this.tiles.height=original.height;this.tiles.refresh();
            }
        }
        syncEvents() {
            const live=new Set(), m=$gameMap;
            // Tilemap children include Action Combat spawned sprites even when their array is rebuilt.
            const sources=this.owner._tilemap.children.filter(s=>s._character && typeof s._character.eventId==="function");
            sources.sort((a,b)=>(a.z-b.z)||(a.y-b.y)||(a.spriteId-b.spriteId));
            for(const source of sources) {
                const e=source._character;
                if(m.event(e.eventId())!==e || !eventTags(e).keep || !this.visibility?.visibleKeepEvents.has(e.eventId())) continue;
                live.add(source);
                let copy=this.copies.get(source);
                if(!copy){copy=new PIXI.Sprite();this.copies.set(source,copy);this.tiles.addChild(copy);}
                // Native tilemap sorting retains lower-event / roof / upper-event priority.
                mirror(source,copy);this.tiles.setChildIndex(copy,this.tiles.children.length-1);
            }
            for(const [source,copy] of this.copies) if(!live.has(source)) {
                this.tiles.removeChild(copy);copy.destroy({children:true,texture:false,baseTexture:false});this.copies.delete(source);
            }
        }
        drawDark(graphics,outer,points) {
            graphics.clear();graphics.beginFill(0x000000,1);graphics.drawRect(outer.x,outer.y,outer.w,outer.h);
            if(points.length>=3){graphics.beginHole();graphics.drawPolygon(points.flatMap(p=>[p.x,p.y]));graphics.endHole();}
            graphics.endFill();
        }
        drawDebug(origin,points,geometry,bounds,toScreen) {
            const g=this.debugGraphics;g.clear();
            g.lineStyle(1,0xffff00,0.25);
            const o=toScreen(origin);
            for(const p of points){g.moveTo(o.x,o.y);g.lineTo(p.x,p.y);}
            g.lineStyle(2,0x00ff88,1);if(points.length>=3)g.drawPolygon(points.flatMap(p=>[p.x,p.y]));
            for(const s of geometry.segments){const a=toScreen(s.a),b=toScreen(s.b);g.lineStyle(2,s.kind==="region"?0xff4444:0xdd44ff,1);g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);}
            const m=$gameMap;
            g.lineStyle(1,0x4488ff,1);
            for(const x of offsets(bounds.left,bounds.right,m.width(),m.isLoopHorizontal()))
                for(const y of offsets(bounds.top,bounds.bottom,m.height(),m.isLoopVertical()))
                    for(const tile of cache().structures){const p={x:tile.x+x,y:tile.y+y};
                        if(p.x+1<bounds.left||p.x>bounds.right||p.y+1<bounds.top||p.y>bounds.bottom)continue;
                        const s=toScreen(p);g.drawRect(s.x,s.y,m.tileWidth(),m.tileHeight());}
            g.lineStyle(0);g.beginFill(0xffffff);g.drawCircle(o.x,o.y,4);g.endFill();
        }
        updateVision() {
            const config=settings();this.visible=config.enabled;
            if(!this.visible)return;
            const m=$gameMap, original=this.owner._tilemap;
            // Same local transform as the source tilemap. Spriteset zoom/shake applies to both once.
            for(const key of ["position","scale","pivot","skew"])this[key].copyFrom(original[key]);
            this.rotation=original.rotation;
            const tw=m.tileWidth(),th=m.tileHeight(),displayX=m.displayX(),displayY=m.displayY();
            const origin={x:displayX+m.adjustX($gamePlayer._realX)+0.5,y:displayY+m.adjustY($gamePlayer._realY)+0.5};
            const screenCorners=[[0,0],[Graphics.width,0],[Graphics.width,Graphics.height],[0,Graphics.height]]
                .map(([x,y])=>this.toLocal(new PIXI.Point(x,y)));
            const view={left:displayX+Math.min(...screenCorners.map(p=>p.x))/tw,
                right:displayX+Math.max(...screenCorners.map(p=>p.x))/tw,
                top:displayY+Math.min(...screenCorners.map(p=>p.y))/th,
                bottom:displayY+Math.max(...screenCorners.map(p=>p.y))/th};
            const bounds={left:Math.min(view.left-1,origin.x-1),right:Math.max(view.right+1,origin.x+1),
                top:Math.min(view.top-1,origin.y-1),bottom:Math.max(view.bottom+1,origin.y+1)};
            if(!m.isLoopHorizontal()){bounds.left=Math.max(0,bounds.left);bounds.right=Math.min(m.width(),bounds.right);}
            if(!m.isLoopVertical()){bounds.top=Math.max(0,bounds.top);bounds.bottom=Math.min(m.height(),bounds.bottom);}
            const geometry=snapshot(bounds), c=cache();
            if(c!==this.lastCache){this.lastCache=c;this.tiles.refresh();this.lastKey="";}
            this.syncTiles();
            const key=JSON.stringify([origin,view,bounds,config,$gamePlayer.direction(),geometry.segments,geometry.keepCandidates]);
            if(key===this.lastKey){this.syncEvents();return;}
            this.lastKey=key;
            const toScreen=p=>({x:(p.x-displayX)*tw,y:(p.y-displayY)*th});
            this.visibility=exposure(origin,bounds,geometry,config,$gamePlayer.direction());
            // The tilemap only repaints when the selected world cells actually change.
            const selected=this.visibility.visibleRegionTiles,previous=this.tiles.visibleRegionTiles;
            if(!previous || previous.size!==selected.size || [...selected].some(k=>!previous.has(k)))this.tiles.refresh();
            this.tiles.visibleRegionTiles=selected;this.syncEvents();
            const worldPoints=this.visibility.points;
            const points=worldPoints.map(toScreen);
            const outer={x:(Math.min(view.left,bounds.left)-2-displayX)*tw,
                y:(Math.min(view.top,bounds.top)-2-displayY)*th,
                w:(Math.max(view.right,bounds.right)-Math.min(view.left,bounds.left)+4)*tw,
                h:(Math.max(view.bottom,bounds.bottom)-Math.min(view.top,bounds.top)+4)*th};
            this.drawDark(this.dark,outer,points);this.dark.alpha=config.opacity;
            this.drawDark(this.keepMask,outer,points);
            // At opacity zero there is no obscured image to restore.
            this.keep.visible=config.opacity>0;
            this.debugGraphics.visible=config.debug;
            if(config.debug)this.drawDebug(origin,points,geometry,bounds,toScreen);else this.debugGraphics.clear();
        }
        destroy(options) {
            this.keep.mask=null;
            for(const copy of this.copies.values()){
                copy.filters=null;this.tiles.removeChild(copy);
                copy.destroy({children:true,texture:false,baseTexture:false});
            }
            this.copies.clear();this.owner=null;
            // Borrowed character textures must survive map/menu transitions.
            super.destroy({...options,children:true,texture:false,baseTexture:false});
        }
    }
    const create=Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer=function() {
        create.apply(this,arguments);
        this._projectRVisionLayer=new VisionLayer(this);
        this._baseSprite.addChild(this._projectRVisionLayer);
        this._projectRVisionLayer.updateVision();
    };
    const update=Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update=function() {
        const value=update.apply(this,arguments);
        this._projectRVisionLayer?.updateVision();return value;
    };
    window.ProjectR.VisionOcclusion={version:VERSION,settings,invalidateCache,
        // Pure/read-only entry points support targeted tests and F8 diagnosis.
        eventTags,cache,snapshot,polygon,inside,spatialIndex,exposure,StructureTilemap,
        visionTileSamples,hasLineOfSightToStructureSample,isVisionStructureTileVisible,TILE_SAMPLE_EPSILON};
})();
