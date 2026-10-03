/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR shared combat walls and vision occlusion (world tile coordinates).
 * @author ProjectR
 * @param VisionWallRegionId
 * @type number
 * @min 1
 * @max 255
 * @default 255
 * @help
 * Region 255 blocks combat and vision; Region 250 is NOT repurposed.
 * <CombatWall> in event note/active-page comments blocks combat only.
 * <VisionWall> blocks combat and vision. Erased events are ignored.
 * Combat tile crossings use native MZ isPassable on BOTH sides of each edge.
 * Ordinary impassable tiles do not block vision. Graphics are never wall geometry.
 * API: ProjectR.CombatOcclusion.firstBlockerBetween(from,to,options),
 * raycastWall(from,angleDegrees,distance,options), hasLineOfSight(from,to,options),
 * hasLineToPolygon(from,worldVertices,options). All coordinates are tile units.
 * options: mode:"combat"|"vision", unwrapped:boolean, ignoreEventIds:[],
 * footprint:[{x,y}] (offsets about moving origin); no event/core edits required.
 */
(() => {
    "use strict";
    const params = PluginManager.parameters("ProjectR_CombatOcclusion");
    const region = Number(params.VisionWallRegionId || 255);
    if (!Number.isInteger(region) || region < 1 || region > 255 || region === 250)
        throw new Error("CombatOcclusion: VisionWallRegionId must be 1..255, excluding reserved 250");
    const EPS = 1e-9;
    const map = () => $gameMap;
    const canonical = p => ({ x: map().roundX(Math.floor(p.x)), y: map().roundY(Math.floor(p.y)) });
    const valid = p => map().isValid ? map().isValid(p.x, p.y) :
        p.x >= 0 && p.y >= 0 && p.x < map().width() && p.y < map().height();
    const visionAt = p => valid(canonical(p)) && map().regionId(canonical(p).x, canonical(p).y) === region;
    const tags = e => {
        if (!e || e._erased) return "";
        return (e.event?.()?.note || "") + "\n" + (e.page?.()?.list || [])
            .filter(c => c.code === 108 || c.code === 408).map(c => c.parameters[0]).join("\n");
    };
    const wallEvents = options => map().events().filter(e => {
        if ((options.ignoreEventIds || []).includes(e.eventId())) return false;
        const t = tags(e);
        return /<VisionWall>/i.test(t) || (options.mode !== "vision" && /<CombatWall>|<destroyProjectile>/i.test(t));
    });
    function eventPolygon(e, collisionMode = null) {
        // Native AE attack rectangle, not artwork bounds. Read cache on a disposable view.
        const view = Object.create(e), tw = map().tileWidth(), th = map().tileHeight();
        const b = view.hitboxData?.();
        if (!b) { // Native DotMove body when no AE hitbox API is present.
            const r = e.collisionRect?.();
            return r ? rect(r.x, r.y, r.width, r.height) : [];
        }
        const angle = e.customRotationPoint ? e._rotation || 0 : 0, rad = angle * Math.PI / 180;
        const sx = e.screenX(), sy = e.screenY(), py = sy + (angle ? th / 2 : 0);
        const points = rect(sx - tw / 2 + b.offsetX, py - th + b.offsetY, b.width * tw, b.height * th);
        const screen = points.map(p => !angle && collisionMode !== "SAT" ? p : ({
            x: sx + (p.x - sx) * Math.cos(rad) - (p.y - (py - th / 2)) * Math.sin(rad),
            y: py + (p.x - sx) * Math.sin(rad) + (p.y - (py - th / 2)) * Math.cos(rad)
        }));
        return screen.map(p => ({ x: map().displayX() + p.x / tw, y: map().displayY() + p.y / th }));
    }
    function rect(x, y, w, h) { return [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]; }
    function firstContact(from, to, polygon, footprint = [{x:0,y:0}]) {
        if (polygon.length < 2) return null;
        let enter = 0, exit = 1;
        const axes = shape => shape.length < 2 ? [] : shape.map((p,i) => {
            const q = shape[(i+1)%shape.length]; return {x:-(q.y-p.y),y:q.x-p.x};
        });
        for (const n of [...axes(polygon), ...axes(footprint), {x:1,y:0}, {x:0,y:1}]) {
            if (Math.abs(n.x)+Math.abs(n.y)<EPS) continue;
            const values = polygon.map(p => p.x*n.x+p.y*n.y), offsets = footprint.map(p => p.x*n.x+p.y*n.y);
            const lo = Math.min(...values)-Math.max(...offsets), hi = Math.max(...values)-Math.min(...offsets);
            const start = from.x*n.x+from.y*n.y, speed=(to.x-from.x)*n.x+(to.y-from.y)*n.y;
            if (Math.abs(speed)<EPS) { if(start<lo-EPS||start>hi+EPS)return null; continue; }
            const a=(lo-start)/speed,b=(hi-start)/speed;
            enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
            if(enter>exit+EPS)return null;
        }
        return enter<=1+EPS&&exit>=-EPS ? Math.max(0,Math.min(1,enter)) : null;
    }
    function firstBlockerBetween(from, end, options = {}) {
        if (![from.x,from.y,end.x,end.y].every(Number.isFinite)) return null;
        const to = options.unwrapped ? end : {x:from.x+map().deltaX(end.x,from.x),y:from.y+map().deltaY(end.y,from.y)};
        const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy),foot=options.footprint || [{x:0,y:0}];
        let first=null;
        const consider=(t,kind,extra={})=>{
            if(t!==null&&t>=-EPS&&t<=1+EPS&&(!first||t<first.fraction-EPS))
                first={kind,...extra,fraction:t,distance:t*length,point:{x:from.x+dx*t,y:from.y+dy*t}};
        };
        // Examine the finite swept bounding box. Integer coordinates remain unwrapped;
        // only map queries wrap, so seam crossings and multi-wrap projectiles are correct.
        const xs=foot.map(p=>p.x),ys=foot.map(p=>p.y);
        const minX=Math.floor(Math.min(from.x,to.x)+Math.min(...xs))-1,maxX=Math.floor(Math.max(from.x,to.x)+Math.max(...xs))+1;
        const minY=Math.floor(Math.min(from.y,to.y)+Math.min(...ys))-1,maxY=Math.floor(Math.max(from.y,to.y)+Math.max(...ys))+1;
        for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
            const cell=canonical({x,y}); if(!valid(cell))continue;
            if(visionAt({x,y}))consider(firstContact(from,to,rect(x,y,1,1),foot),"region",{regionId:region,tile:{x:cell.x,y:cell.y}});
            if(options.mode==="vision")continue;
            // Native isPassable retains ★ / stacked layer / directional flag semantics.
            for(const [ex,ey,d,reverse] of [[1,0,6,4],[0,1,2,8]]){
                const next=canonical({x:x+ex,y:y+ey});
                if(!valid(next))continue; // Existing map-edge lifecycle stays with its owner.
                if(map().isPassable(cell.x,cell.y,d)&&map().isPassable(next.x,next.y,reverse))continue;
                // Only the edge crossed by this sweep is relevant. A projectile touching
                // an adjacent non-crossed edge is not a new wall collision.
                if(ex&&Math.abs(dx)<EPS||ey&&Math.abs(dy)<EPS)continue;
                const edge=ex?rect(x+1,y,0,1):rect(x,y+1,1,0);
                consider(firstContact(from,to,edge,foot),"tile",{tile:{x:cell.x,y:cell.y},direction:d});
            }
        }
        for(const e of wallEvents(options)){
            const mode=options.projectileAngle || (e.customRotationPoint && e._rotation) ? "SAT" : "AABB";
            const poly=eventPolygon(e,options.collisionFootprints ? mode : null);if(poly.length<3)continue;
            const eventFoot=options.collisionFootprints?.[mode] || foot;
            const cx=poly.reduce((s,p)=>s+p.x/poly.length,0),cy=poly.reduce((s,p)=>s+p.y/poly.length,0);
            // Repeat event geometry across every loop image potentially touched by this ray.
            const wx=map().isLoopHorizontal()?map().width():Infinity,wy=map().isLoopVertical()?map().height():Infinity;
            const rx=Number.isFinite(wx)?Math.ceil((maxX-minX)/wx)+1:0,ry=Number.isFinite(wy)?Math.ceil((maxY-minY)/wy)+1:0;
            const ox=map().deltaX(cx,from.x)-(cx-from.x),oy=map().deltaY(cy,from.y)-(cy-from.y);
            for(let ix=-rx;ix<=rx;ix++)for(let iy=-ry;iy<=ry;iy++){
                const p=poly.map(v=>({x:v.x+ox+(ix?ix*wx:0),y:v.y+oy+(iy?iy*wy:0)}));
                consider(firstContact(from,to,p,eventFoot),"event",{eventId:e.eventId(),collisionMode:mode});
            }
        }
        return first;
    }
    const hasLineOfSight=(from,to,options={})=>!firstBlockerBetween(from,to,{...options,mode:options.mode||"vision"});
    function hasLineToPolygon(from, polygon, options={}) {
        if(polygon.length<3)return false;
        if(options.clipPolygon){
            const clip=options.clipPolygon;
            const area=clip.reduce((s,p,i)=>{const q=clip[(i+1)%clip.length];return s+p.x*q.y-p.y*q.x;},0),sign=area>=0?1:-1;
            for(let i=0;i<clip.length;i++){
                const a=clip[i],b=clip[(i+1)%clip.length],input=polygon;polygon=[];
                const side=p=>sign*((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x));
                for(let j=0;j<input.length;j++){
                    const p=input[j],q=input[(j+1)%input.length],sp=side(p),sq=side(q);
                    if(sp>=-EPS)polygon.push(p);
                    if((sp>=0)!==(sq>=0)){const t=sp/(sp-sq);polygon.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}
                }
                if(polygon.length<3)return false;
            }
        }
        const points=polygon.map(p=>({x:from.x+map().deltaX(p.x,from.x),y:from.y+map().deltaY(p.y,from.y)}));
        const candidates=[];
        // Visibility changes only at obstacle vertex rays. Split target edges there,
        // and at attack-circle intersections, then test every resulting interval.
        const bounds={x:Math.floor(Math.min(from.x,...points.map(p=>p.x))),y:Math.floor(Math.min(from.y,...points.map(p=>p.y))),
            right:Math.ceil(Math.max(from.x,...points.map(p=>p.x))),bottom:Math.ceil(Math.max(from.y,...points.map(p=>p.y)))};
        const corners=[];
        for(let y=bounds.y;y<=bounds.bottom;y++)for(let x=bounds.x;x<=bounds.right;x++)corners.push({x,y});
        for(const e of wallEvents(options))corners.push(...eventPolygon(e));
        for(let i=0;i<points.length;i++){
            const a=points[i],b=points[(i+1)%points.length],vx=b.x-a.x,vy=b.y-a.y,ts=[0,1];
            for(const c of corners){const dx=c.x-from.x,dy=c.y-from.y,den=vx*dy-vy*dx;
                if(Math.abs(den)<EPS)continue;
                const t=((from.x-a.x)*dy-(from.y-a.y)*dx)/den;
                const r=Math.abs(dx)>Math.abs(dy)?(a.x+vx*t-from.x)/dx:(a.y+vy*t-from.y)/dy;
                if(t>0&&t<1&&r>=0)ts.push(t);
            }
            if(options.radius!==undefined){
                const px=a.x-from.x,py=a.y-from.y,A=vx*vx+vy*vy,B=2*(px*vx+py*vy),C=px*px+py*py-options.radius**2,D=B*B-4*A*C;
                if(A>EPS&&D>=-EPS)for(const t of [(-B-Math.sqrt(Math.max(0,D)))/(2*A),(-B+Math.sqrt(Math.max(0,D)))/(2*A)])if(t>=0&&t<=1)ts.push(t);
            }
            ts.sort((x,y)=>x-y);
            for(let j=0;j<ts.length;j++){
                for(const t of [ts[j],j? (ts[j-1]+ts[j])/2:ts[j]])candidates.push({x:a.x+vx*t,y:a.y+vy*t});
            }
        }
        // Origin inside target: zero-length visibility is sufficient.
        const cross=points.map((p,i)=>{const q=points[(i+1)%points.length];return (q.x-p.x)*(from.y-p.y)-(q.y-p.y)*(from.x-p.x);});
        if(cross.every(v=>v>=-EPS)||cross.every(v=>v<=EPS))candidates.push(from);
        return candidates.some(p=>(options.radius===undefined||Math.hypot(p.x-from.x,p.y-from.y)<=options.radius+EPS)&&
            !firstBlockerBetween(from,p,{...options,mode:"combat"}));
    }
    const API = (window.ProjectR=window.ProjectR||{}).CombatOcclusion={};
    // Read-only visual raycast over a caller-owned, cached vision boundary snapshot.
    // No hooks or changes to the combat raycast, wall ownership or damage flow.
    function raycastVisionGeometry(from, to, segments, spatial = null) {
        const dx=to.x-from.x,dy=to.y-from.y;
        let fraction=1,hit=null;
        function* candidates(){
            if(!spatial){yield* segments;return;}
            const size=spatial.size,seen=new Set();
            let x=Math.floor(from.x/size),y=Math.floor(from.y/size);
            const sx=Math.sign(dx),sy=Math.sign(dy),tx=dx?size/Math.abs(dx):Infinity,ty=dy?size/Math.abs(dy):Infinity;
            let nextX=dx?((x+(sx>0?1:0))*size-from.x)/dx:Infinity;
            let nextY=dy?((y+(sy>0?1:0))*size-from.y)/dy:Infinity;
            for(let step=0;step<spatial.maxSteps;step++){
                for(const s of spatial.buckets.get(`${x},${y}`)||[])if(!seen.has(s)){seen.add(s);yield s;}
                const next=Math.min(nextX,nextY);
                if(next>fraction+EPS||next>1||!Number.isFinite(next))return;
                // Traverse both sides when the ray crosses a grid corner exactly.
                if(nextX<=nextY){x+=sx;nextX+=tx;}else{y+=sy;nextY+=ty;}
            }
        }
        for(const s of candidates()){
            const vx=s.b.x-s.a.x,vy=s.b.y-s.a.y,px=s.a.x-from.x,py=s.a.y-from.y;
            const den=dx*vy-dy*vx;
            let t;
            if(Math.abs(den)<EPS){
                if(Math.abs(px*dy-py*dx)>EPS)continue;
                const len=dx*dx+dy*dy;if(len<EPS)continue;
                const a=(px*dx+py*dy)/len,b=((s.b.x-from.x)*dx+(s.b.y-from.y)*dy)/len;
                if(Math.max(a,b)<-EPS||Math.min(a,b)>1+EPS)continue;
                t=Math.max(0,Math.min(a,b));
            }else{
                t=(px*vy-py*vx)/den;
                const u=(px*dy-py*dx)/den;
                if(t<-EPS||t>1+EPS||u<-EPS||u>1+EPS)continue;
            }
            if(t<=fraction){fraction=Math.max(0,Math.min(1,t));hit=s;}
        }
        return {point:{x:from.x+dx*fraction,y:from.y+dy*fraction},fraction,blocker:hit};
    }
    Object.assign(API, {
        raycastVisionGeometry,
        version:"0.1.0",VisionWallRegionId:region,firstBlockerBetween,firstContact,eventPolygon,hasLineOfSight,hasLineToPolygon,
        raycastWall:(from,angle,distance,options={})=>{const r=angle*Math.PI/180;return firstBlockerBetween(from,
            {x:from.x+Math.sin(r)*distance,y:from.y-Math.cos(r)*distance},{...options,unwrapped:true});},
        isVisionBlockedAt:(x,y)=>visionAt({x,y}),
        isCombatBlockedAt:(x,y)=>visionAt({x,y})||![2,4,6,8].some(d=>map().isPassable(map().roundX(x),map().roundY(y),d))
    });
    // Gun ownership is independent of having a valid card deck/combat session.
    // Keep native CE3 / HP / ENERGY code; veto only an occluded bullet collision.
    const bullets=new Map(), probes=[];
    const center=e=>{const p=eventPolygon(e);return p.length?p.reduce((s,v)=>({x:s.x+v.x/p.length,y:s.y+v.y/p.length}),{x:0,y:0}):null;};
    const spawn=Game_Map.prototype.spawnEvent;
    if(spawn)Game_Map.prototype.spawnEvent=function(){
        const id=spawn.apply(this,arguments),e=this.event(id),p=e&&center(e);
        if(p&&/<weaponAttack>/i.test(e.event()?.note||""))bullets.set(e,{mapId:this.mapId(),origin:p,previous:p});
        return id;
    };
    const nativeDamage=Game_Event.prototype.getDamageFromNoteTag;
    if(nativeDamage)Game_Event.prototype.getDamageFromNoteTag=function(){
        if(probes.length)probes[probes.length-1].source=this;
        return nativeDamage.apply(this,arguments);
    };
    const collision=window.checkCollide;
    if(collision)window.checkCollide=function(targetId){
        const probe={};probes.push(probe);let hit;
        try{hit=collision.apply(this,arguments);}finally{probes.pop();}
        const e=probe.source,record=bullets.get(e),target=map().event(Number(targetId));
        if(hit&&record&&target&&!API.hasLineToPolygon(record.origin,eventPolygon(target),{ignoreEventIds:[e.eventId(),target.eventId()]})){
            bullets.delete(e);map().unspawnEvent(e.eventId());return false;
        }
        return hit;
    };
    const update=Game_Map.prototype.update;
    if(update)Game_Map.prototype.update=function(){
        const value=update.apply(this,arguments);
        for(const [e,r] of bullets){
            if(r.mapId!==this.mapId()||e._erased||this.event(e.eventId())!==e){bullets.delete(e);continue;}
            const vertices=eventPolygon(e),p=center(e);if(!p)continue;
            const to={x:r.previous.x+this.deltaX(p.x,r.previous.x),y:r.previous.y+this.deltaY(p.y,r.previous.y)};
            const wall=API.firstBlockerBetween(r.previous,to,{mode:"combat",unwrapped:true,
                footprint:vertices.map(v=>({x:this.deltaX(v.x,p.x),y:this.deltaY(v.y,p.y)})),ignoreEventIds:[e.eventId()]});
            let enemyBeforeWall=false;
            if(wall&&this.hitboxesAreColliding)for(const target of this.events()){
                if(target===e||target._erased||!target.databaseEnemy||target.databaseActor||target.isTransparent?.()||
                    !target.page?.()||Number(this.getCurrentEventHp(target.eventId()))<=0)continue;
                const av=Object.create(e),bv=Object.create(target),angle=e.customRotationPoint?e._rotation||0:0,
                    targetAngle=target.customRotationPoint?target._rotation||0:0;
                if(!this.hitboxesAreColliding(e.screenX(),e.screenY(),av.hitboxData(),target.screenX(),target.screenY(),
                    bv.hitboxData(),angle,targetAngle))continue;
                const mode=angle||targetAngle?"SAT":"AABB",moving=eventPolygon(e,mode);
                const t=firstContact(r.previous,to,eventPolygon(target,mode),moving.map(v=>({x:this.deltaX(v.x,p.x),y:this.deltaY(v.y,p.y)})));
                if(t!==null&&t<wall.fraction-EPS){enemyBeforeWall=true;break;}
            }
            if(wall&&!enemyBeforeWall){bullets.delete(e);this.unspawnEvent(e.eventId());}else r.previous=p;
        }
        return value;
    };
})();
