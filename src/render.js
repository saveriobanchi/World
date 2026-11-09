/* =====================================================================
   RENDERING · the painted map and everything that lives on it
   ===================================================================== */
const cv=$('#map'),ctx=cv.getContext('2d');
const polCv=document.createElement('canvas');polCv.width=W;polCv.height=H;const pctx=polCv.getContext('2d');
const scarCv=document.createElement('canvas');scarCv.width=W;scarCv.height=H;const sctx=scarCv.getContext('2d');
const FS=6,farmCv=document.createElement('canvas');farmCv.width=W*FS;farmCv.height=H*FS;const fctx=farmCv.getContext('2d');
let view={z:1,ox:0,oy:0},cam=null,base=1,cw=0,ch=0,dpr=1,mode='realms',sel=null,hover=null,dirtyPol=true,dirtyNet=true,farmDirty=true,clouds=null;
let opts={clouds:true,labels:2,follow:false,farms:true};
let paths={soft:new Path2D(),hard:new Path2D(),war:new Path2D(),sel:new Path2D(),edge:[]};
let net={roads:new Path2D(),land:[],sea:[]};
const pal=k=>(DOMAIN[k]||DOMAIN.politics).c;

/* ---------- Tabler symbols on canvas: rasterised once per (icon, size, colour, style) ---------- */
const TP={};
function tiPaths(k){return TP[k]||(TP[k]=(TI[k]||TI['circle-dot']).map(([d,f])=>[new Path2D(d),f]))}
const ICON_BMP=new Map();
function token(k,size,color,o={}){
  // o.bg fill, o.ring colour, o.shape 'circle'|'square', o.sw stroke width in px
  const px=Math.round(size*dpr),key=[k,px,color,o.bg,o.ring,o.shape,o.sw,o.halo].join('|');let b=ICON_BMP.get(key);
  if(!b){b=document.createElement('canvas');const pad=Math.ceil(2*dpr)+(o.halo?Math.ceil(3*dpr):0);b.width=b.height=px+pad*2;const c=b.getContext('2d');c.translate(pad,pad);
    if(o.bg){c.beginPath();if(o.shape==='square'){const r=px*.28;c.roundRect(0,0,px,px,r)}else c.arc(px/2,px/2,px/2,0,7);
      if(o.halo){c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=4*dpr}c.fillStyle=o.bg;c.fill();c.shadowBlur=0;
      if(o.ring){c.lineWidth=1.5*dpr;c.strokeStyle=o.ring;c.stroke()}}
    const inset=o.bg?px*.22:0,s=(px-inset*2)/24;c.translate(inset,inset);c.scale(s,s);
    c.lineWidth=(o.sw||1.9)*(o.bg?1:1.05);c.lineCap='round';c.lineJoin='round';c.strokeStyle=color;c.fillStyle=color;
    if(o.halo&&!o.bg){c.save();c.strokeStyle='rgba(8,10,14,.85)';c.lineWidth=(o.sw||1.9)+3.2/s*dpr;for(const[p]of tiPaths(k))c.stroke(p);c.restore()}
    for(const[p,f]of tiPaths(k)){if(f)c.fill(p);else c.stroke(p)}
    b._pad=pad;if(ICON_BMP.size>900)ICON_BMP.clear();ICON_BMP.set(key,b)}
  return b;
}
function drawToken(c,k,x,y,size,color,o){const b=token(k,size,color,o);const s=b.width/dpr;c.drawImage(b,x-s/2,y-s/2,s,s)}

/* ---------- view ---------- */
function resize(){
  const r=cv.parentElement.getBoundingClientRect();cw=r.width;ch=r.height;dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.max(1,Math.round(cw*dpr));cv.height=Math.max(1,Math.round(ch*dpr));base=Math.max(cw/W,ch/H)*.985;if(cw<700)base=Math.min(cw/W,ch/H);
  clampView();bgKey='';if(typeof sizeChart==='function')sizeChart();
}
function clampView(v=view){
  const mw=W*base*v.z,mh=H*base*v.z;
  v.ox=mw<=cw?(cw-mw)/2:clamp(v.ox,cw-mw,0);
  v.oy=mh<=ch?(ch-mh)/2:clamp(v.oy,ch-mh,0);
}
function zoomAt(f,sx,sy){cam=null;const z=clamp(view.z*f,1,9),k=z/view.z;view.ox=sx-(sx-view.ox)*k;view.oy=sy-(sy-view.oy)*k;view.z=z;clampView()}
function flyTo(x,y,z){const t={z:clamp(z,1,9),ox:0,oy:0};const s=base*t.z;t.ox=cw/2-(x+.5)*s;t.oy=ch/2-(y+.5)*s;clampView(t);cam=t}
function stepCamera(dt){if(!cam)return;const k=1-Math.pow(.02,dt);view.z=lerp(view.z,cam.z,k);view.ox=lerp(view.ox,cam.ox,k);view.oy=lerp(view.oy,cam.oy,k);clampView();
  if(Math.abs(view.z-cam.z)<.003&&Math.abs(view.ox-cam.ox)<.5&&Math.abs(view.oy-cam.oy)<.5)cam=null}

/* ---------- territory layers ---------- */
function realmRGB(r){if(r.overlord!=null&&mode==='realms'){const o=S.realms[r.overlord];if(o)return mix3(r.rgb,o.rgb,.5)}return r.rgb}
function rebuildPol(){
  dirtyPol=false;
  const img=pctx.createImageData(W,H),d=img.data,o=S.owner;
  const sr=sel&&sel.t==='r'?sel.id:-1;
  if(mode==='density'){
    const heat=new Float32Array(N);
    for(const s of S.sets){const R=Math.min(9,2+Math.sqrt(s.pop)/28);const r2=R*R;for(let y=Math.max(0,Math.floor(s.y-R));y<=Math.min(H-1,s.y+R);y++)for(let x=Math.max(0,Math.floor(s.x-R));x<=Math.min(W-1,s.x+R);x++){const dd=d2(x,y,s.x,s.y);if(dd<=r2)heat[y*W+x]+=s.pop*(1-dd/r2)}}
    for(let i=0;i<N;i++){if(!isLand(G.biome[i]))continue;const v=clamp(Math.log10(1+heat[i])/4.6,0,1);if(v<.05)continue;
      const c=v<.5?mix3([46,52,120],[214,72,120],v*2):mix3([214,72,120],[255,214,120],(v-.5)*2);d[i*4]=c[0];d[i*4+1]=c[1];d[i*4+2]=c[2];d[i*4+3]=60+v*195}
  }else if(mode!=='terrain'){
    const warring=new Set();for(const w of S.wars){warring.add(w.a);warring.add(w.b)}
    for(let i=0;i<N;i++){const a=o[i];if(a<0)continue;const r=S.realms[a];let c,al=255;
      if(mode==='faith')c=(S.faiths[r.faith]||S.faiths[0]).rgb;
      else if(mode==='peoples')c=RACE_RGB[r.race];
      else if(mode==='trade'){c=r.rgb;al=100}
      else if(mode==='military'){c=warring.has(a)?[226,86,70]:[120,126,140];al=warring.has(a)?230:120}
      else if(mode==='knowledge'){const t=techOf(r)/6;c=mix3([52,64,110],[120,170,255],t);c=mix3(c,[236,242,255],Math.max(0,t-.6)*1.5)}
      else if(mode==='diplomacy'&&sr>=0){if(a===sr)c=[244,192,106];else if(findWar(a,sr))c=[226,86,70];else if(r.overlord===sr||S.realms[sr].overlord===a)c=[183,156,255];else if(S.allies[rkey(a,sr)])c=[58,209,169];else{const v=S.rel[rkey(a,sr)];c=v==null?[110,116,130]:v>0?mix3([150,150,150],[90,200,160],v/100):mix3([150,150,150],[220,110,90],-v/100)}}
      else c=realmRGB(r);
      d[i*4]=c[0];d[i*4+1]=c[1];d[i*4+2]=c[2];d[i*4+3]=mode==='realms'&&sr>=0&&sr!==a&&S.realms[a].overlord!==sr?100:al}
  }
  pctx.putImageData(img,0,0);
  const si=sctx.createImageData(W,H);
  for(const s of S.scars){const r2=s.r*s.r;for(let y=Math.max(0,s.y-s.r-1);y<=Math.min(H-1,s.y+s.r+1);y++)for(let x=Math.max(0,s.x-s.r-1);x<=Math.min(W-1,s.x+s.r+1);x++){const dd=d2(x,y,s.x,s.y);if(dd>r2+1)continue;const i=(y*W+x)*4;const a=clamp(1-dd/(r2+1),0,1)*.9+.1;
    const c=s.kind==='blight'?[170,70,220]:[60,52,48];si.data[i]=c[0];si.data[i+1]=c[1];si.data[i+2]=c[2];si.data[i+3]=Math.max(si.data[i+3],a*230)}}
  sctx.putImageData(si,0,0);
  const soft=[],hard=[],war=[],sp=[],edge=[];
  const warSet=new Set(S.wars.map(w=>bkey(w.a,w.b)));
  const E=a=>edge[a]||(edge[a]=[]);
  const seg=(a,b,x0,y0,x1,y1,la,lb)=>{
    if(a===b)return;
    if(sr>=0&&(a===sr||b===sr))sp.push(x0,y0,x1,y1);
    if(a>=0)E(a).push(x0,y0,x1,y1);if(b>=0)E(b).push(x0,y0,x1,y1);
    if(!la||!lb)return;
    const ov=a>=0&&b>=0&&(S.realms[a].overlord===b||S.realms[b].overlord===a);
    (a>=0&&b>=0?(warSet.has(bkey(a,b))?war:ov?soft:hard):soft).push(x0,y0,x1,y1);
  };
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,a=o[i],la=isLand(G.biome[i]);
    if(x<W-1)seg(a,o[i+1],x+1,y,x+1,y+1,la,isLand(G.biome[i+1]));
    if(y<H-1)seg(a,o[i+W],x,y+1,x+1,y+1,la,isLand(G.biome[i+W]));
  }
  polVer++;
  paths={soft:smoothPath(soft),hard:smoothPath(hard),war:smoothPath(war),sel:smoothPath(sp),edge:edge.map(e=>e&&smoothPath(e))};
}
// Chain lattice edges into polylines and round them off, so borders read as drawn lines rather than cell steps.
function smoothPath(segs){
  const p=new Path2D(),n=segs.length/4;if(!n)return p;
  const VW=W+1,adj=new Map(),used=new Uint8Array(n);
  const add=(v,e)=>{let a=adj.get(v);if(!a)adj.set(v,a=[]);a.push(e)};
  for(let e=0;e<n;e++){add(segs[e*4+1]*VW+segs[e*4],e);add(segs[e*4+3]*VW+segs[e*4+2],e)}
  const other=(e,v)=>{const a=segs[e*4+1]*VW+segs[e*4];return a===v?segs[e*4+3]*VW+segs[e*4+2]:a};
  const walk=(v0,e0)=>{const pts=[v0];let v=v0,e=e0;
    for(;;){used[e]=1;v=other(e,v);pts.push(v);const a=adj.get(v);if(a.length!==2)break;const nx=a[0]===e?a[1]:a[0];if(used[nx])break;e=nx}
    return pts};
  const emit=pts=>{const closed=pts[0]===pts[pts.length-1]&&pts.length>3;let P=pts.map(v=>[v%VW,(v/VW)|0]);if(closed)P.pop();
    for(let it=0;it<2;it++){if(P.length<3)break;const Q2=[];const L=P.length;
      if(!closed)Q2.push(P[0]);
      for(let i=0;i<(closed?L:L-1);i++){const a=P[i],b=P[(i+1)%L];Q2.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75])}
      if(!closed)Q2.push(P[L-1]);P=Q2}
    p.moveTo(P[0][0],P[0][1]);for(let i=1;i<P.length;i++)p.lineTo(P[i][0],P[i][1]);if(closed)p.closePath()};
  for(const[v,a]of adj){if(a.length===2)continue;for(const e of a)if(!used[e])emit(walk(v,e))}
  for(let e=0;e<n;e++)if(!used[e])emit(walk(segs[e*4+1]*VW+segs[e*4],e));
  return p;
}
function rebuildFarms(){
  farmDirty=false;fctx.clearRect(0,0,farmCv.width,farmCv.height);
  const cols=['rgba(214,190,110,.42)','rgba(170,186,96,.38)','rgba(196,160,96,.38)','rgba(150,170,90,.34)'];
  for(let i=0;i<N;i++){const f=S.farm[i];if(!f)continue;const x=(i%W)*FS,y=((i/W)|0)*FS,h=hash2(i,7,S.seed);
    const vert=h<.5,n=2+((h*10|0)%2);
    for(let k=0;k<n;k++){fctx.fillStyle=cols[(k+(h*97|0))%4];if(vert)fctx.fillRect(x+k*FS/n,y,FS/n-.4,FS-.4);else fctx.fillRect(x,y+k*FS/n,FS-.4,FS/n-.4)}
    if(f===2){fctx.fillStyle='rgba(120,90,50,.18)';fctx.fillRect(x,y,FS,FS)}}
  bgKey='';
}
function rebuildNet(){
  dirtyNet=false;const roads=new Path2D(),land=[],sea=[];
  for(const[a,b]of X.roads||[]){const A=X.byId.get(a),Bb=X.byId.get(b);if(!A||!Bb)continue;
    const mx=(A.x+Bb.x)/2+.5+(hash2(a,b,3)-.5)*1.4,my=(A.y+Bb.y)/2+.5+(hash2(b,a,5)-.5)*1.4;roads.moveTo(A.x+.5,A.y+.5);roads.quadraticCurveTo(mx,my,Bb.x+.5,Bb.y+.5)}
  for(const t of X.routes||[]){const A=X.byId.get(t.a),Bb=X.byId.get(t.b);if(!A||!Bb)continue;const p=new Path2D();
    const dx=Bb.x-A.x,dy=Bb.y-A.y,L=Math.hypot(dx,dy)||1,k=t.sea?.22:.08,sg=hash2(t.a,t.b,9)<.5?-1:1;
    const mx=(A.x+Bb.x)/2+.5-dy/L*L*k*sg,my=(A.y+Bb.y)/2+.5+dx/L*L*k*sg;
    p.moveTo(A.x+.5,A.y+.5);p.quadraticCurveTo(mx,my,Bb.x+.5,Bb.y+.5);(t.sea?sea:land).push({p,v:t.v})}
  net={roads,land,sea};
}

/* ---------- the static layers, painted once per view and border change ---------- */
const bgCv=document.createElement('canvas'),bgx=bgCv.getContext('2d');let bgKey='',polVer=0;
const SEASON_TINT=['rgba(170,230,150,.05)',null,'rgba(230,150,60,.08)','rgba(225,235,255,.1)'];
function drawBackground(s,political){
  if(bgCv.width!==cv.width||bgCv.height!==cv.height){bgCv.width=cv.width;bgCv.height=cv.height}
  const c=bgx;c.setTransform(1,0,0,1,0,0);c.fillStyle='#0c1220';c.fillRect(0,0,bgCv.width,bgCv.height);
  c.setTransform(dpr*s,0,0,dpr*s,dpr*view.ox,dpr*view.oy);
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(G.canvas,0,0,W,H);
  if(opts.farms&&mode!=='density')c.drawImage(farmCv,0,0,W,H);
  const tint=SEASON_TINT[S.season];if(tint){c.fillStyle=tint;c.fillRect(0,0,W,H)}
  if(S.season===3||S.winter>S.year){const a=S.winter>S.year?.55:.32;const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,`rgba(242,247,255,${a})`);g.addColorStop(.3,'rgba(242,247,255,0)');g.addColorStop(.7,'rgba(242,247,255,0)');g.addColorStop(1,`rgba(242,247,255,${a})`);c.fillStyle=g;c.fillRect(0,0,W,H)}
  if(mode!=='terrain'){c.globalAlpha=mode==='density'?.85:mode==='trade'?.32:mode==='military'?.4:.38;c.drawImage(polCv,0,0,W,H);c.globalAlpha=1}
  c.lineCap='round';c.lineJoin='round';
  if(political){
    if(mode==='realms'){c.globalAlpha=.6;c.lineWidth=3/s;for(let a=0;a<paths.edge.length;a++){if(!paths.edge[a])continue;const r=S.realms[a];c.strokeStyle=r.overlord!=null?`rgb(${realmRGB(r).join(',')})`:r.color;c.stroke(paths.edge[a])}c.globalAlpha=1}
    c.strokeStyle='rgba(20,16,12,.3)';c.lineWidth=1/s;c.setLineDash([2/s,2/s]);c.stroke(paths.soft);c.setLineDash([]);
    c.strokeStyle='rgba(16,12,8,.72)';c.lineWidth=1.25/s;c.stroke(paths.hard);
  }
  c.strokeStyle='#f4c06a';c.lineWidth=2.4/s;c.stroke(paths.sel);
  if(mode!=='density'){c.strokeStyle='rgba(70,50,30,.55)';c.lineWidth=Math.max(.8,1.05*Math.sqrt(view.z))/s;c.setLineDash([2.4/s,2/s]);c.stroke(net.roads);c.setLineDash([])}
}

/* ---------- settlements ---------- */
function markerR(p,zk){return(p<400?2:p<1500?2.8:p<6000?3.6:p<20000?4.6:5.8)*zk}
function drawMarker(t,x,y,zk,isCap){
  const R=S.realms[t.realm],col=mode==='terrain'||mode==='density'?'#eef0f4':`rgb(${realmRGB(R).join(',')})`;
  const r=markerR(t.pop,zk);
  if(t.b.walls&&t.pop>=1500){ctx.beginPath();ctx.arc(x,y,r+2.6,0,7);ctx.strokeStyle='rgba(12,14,20,.9)';ctx.lineWidth=2.6;ctx.setLineDash([2.2,1.6]);ctx.stroke();ctx.setLineDash([])}
  ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=t.pop>=6000?2:1.4;ctx.strokeStyle='#0d1018';ctx.stroke();
  if(t.pop>=1500){ctx.beginPath();ctx.arc(x,y,r*.38,0,7);ctx.fillStyle='rgba(13,16,24,.9)';ctx.fill()}
  if(isCap){ctx.beginPath();ctx.arc(x,y,r+(t.b.walls?5:3),0,7);ctx.strokeStyle='#f4c06a';ctx.lineWidth=1.4;ctx.stroke()}
}
function drawCompass(x,y,r){
  ctx.save();ctx.translate(x,y);
  ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fillStyle='rgba(13,16,24,.55)';ctx.fill();ctx.strokeStyle='rgba(238,240,244,.25)';ctx.lineWidth=1;ctx.stroke();
  for(let k=0;k<4;k++){const a=k*Math.PI/2-Math.PI/2;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.86,Math.sin(a)*r*.86);ctx.lineTo(Math.cos(a+.32)*r*.2,Math.sin(a+.32)*r*.2);ctx.lineTo(Math.cos(a-.32)*r*.2,Math.sin(a-.32)*r*.2);ctx.closePath();ctx.fillStyle=k===0?'#f4c06a':'rgba(238,240,244,.65)';ctx.fill()}
  ctx.font=`700 ${Math.round(r*.36)}px Manrope, system-ui, sans-serif`;ctx.fillStyle='#f4c06a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('N',0,-r-r*.4);
  ctx.restore();
}
function drawScale(x,y){
  const s=base*view.z,lpc=12;let L=100;for(const o of[25,50,100,200,400,800]){if(o/lpc*s>64){L=o;break}}
  const w=L/lpc*s;ctx.save();
  ctx.fillStyle='rgba(238,240,244,.85)';ctx.fillRect(x,y,w,2);ctx.fillRect(x,y-4,1.5,6);ctx.fillRect(x+w-1.5,y-4,1.5,6);ctx.fillRect(x+w/2-.75,y-2,1.5,4);
  ctx.font=`600 10.5px Manrope, system-ui, sans-serif`;ctx.textAlign='right';ctx.textBaseline='alphabetic';ctx.fillText(`${L} leagues`,x+w,y-7);ctx.restore();
}

/* ---------- the frame ---------- */
function draw(now,dt){
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(!G||!S){ctx.fillStyle='#0c1220';ctx.fillRect(0,0,cw,ch);return}
  const s=base*view.z,T=now/1000;
  const political=mode!=='terrain'&&mode!=='density';
  if(dirtyNet){rebuildNet();bgKey=''}
  if(farmDirty)rebuildFarms();
  const key=[cw,ch,dpr,view.z.toFixed(4),view.ox.toFixed(1),view.oy.toFixed(1),mode,polVer,S.season,S.winter>S.year,opts.farms].join('|');
  if(key!==bgKey){bgKey=key;drawBackground(s,political);miniDirty=true}
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(bgCv,0,0);
  ctx.setTransform(dpr*s,0,0,dpr*s,dpr*view.ox,dpr*view.oy);
  if(S.scars.length){ctx.globalAlpha=.5+Math.sin(T*2)*.12;ctx.drawImage(scarCv,0,0,W,H);ctx.globalAlpha=1}
  ctx.lineCap='round';ctx.lineJoin='round';
  if(political){ctx.strokeStyle='rgba(255,107,91,.95)';ctx.lineWidth=2.2/s;ctx.setLineDash([4/s,3/s]);ctx.lineDashOffset=-T*12/s;ctx.stroke(paths.war);ctx.setLineDash([])}
  if(mode!=='density'&&mode!=='military'){
    const tm=mode==='trade'?1.7:1;
    for(const r of net.land){ctx.strokeStyle='rgba(244,192,106,.85)';ctx.lineWidth=(1+r.v*.12)*tm/s;ctx.setLineDash([5/s,4/s]);ctx.lineDashOffset=-T*14/s;ctx.stroke(r.p)}
    for(const r of net.sea){ctx.strokeStyle='rgba(200,236,240,.6)';ctx.lineWidth=(1+r.v*.1)*tm/s;ctx.setLineDash([2/s,5/s]);ctx.lineDashOffset=-T*10/s;ctx.stroke(r.p)}
    ctx.setLineDash([]);
  }
  // campaigns: each marching army draws its line of advance
  for(const a of S.armies){if(a.target==null||a.state==='retreat')continue;const t=X.byId.get(a.target);if(!t)continue;
    ctx.strokeStyle=S.realms[a.realm].color;ctx.globalAlpha=.75;ctx.lineWidth=1.4/s;ctx.setLineDash([3/s,3/s]);ctx.lineDashOffset=-T*10/s;
    ctx.beginPath();ctx.moveTo((a._x??a.x)+.5,(a._y??a.y)+.5);ctx.lineTo(t.x+.5,t.y+.5);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1}
  if(hover&&hover.cell!=null){ctx.strokeStyle='rgba(238,240,244,.85)';ctx.lineWidth=1.2/s;ctx.strokeRect(hover.cell%W,(hover.cell/W)|0,1,1)}
  if(opts.clouds&&clouds){
    const ox=(T*.35)%W,oy=(T*.12)%H;ctx.globalAlpha=view.z>3?.2:.32;
    for(const ax of[ox-W,ox])for(const ay of[oy-H,oy])ctx.drawImage(clouds,ax,ay,W,H);ctx.globalAlpha=1;
  }
  // ---------- screen space ----------
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const sx=x=>view.ox+(x+.5)*s,sy=y=>view.oy+(y+.5)*s;
  const boxes=[];
  const fits=(x,y,w,h)=>{for(const b of boxes)if(x<b[0]+b[2]&&x+w>b[0]&&y<b[1]+b[3]&&y+h>b[1])return false;boxes.push([x,y,w,h]);return true};
  const inView=(x,y,m=24)=>x>-m&&y>-m&&x<cw+m&&y<ch+m;
  // ruins
  for(const r of S.ruins){const x=sx(r.x),y=sy(r.y);if(!inView(x,y))continue;
    if(view.z>=2.2)drawToken(ctx,'building-arch',x,y,13,'rgba(206,196,176,.9)',{halo:1,sw:1.8});
    else{ctx.strokeStyle='rgba(40,30,22,.8)';ctx.lineWidth=1.3;const q=2.2;ctx.beginPath();ctx.moveTo(x-q,y-q);ctx.lineTo(x+q,y+q);ctx.moveTo(x+q,y-q);ctx.lineTo(x-q,y+q);ctx.stroke()}}
  // resources
  if(view.z>=2.6||mode==='trade'){const sz=view.z<2.6?11:Math.min(16,7+view.z*1.4);const RI={iron:'pick',gold:'coins',gems:'diamond',timber:'trees',horses:'horse',spice:'flame',fish:'fish',wine:'grape'};
    for(let i=0;i<N;i++){const k=G.res[i];if(!k)continue;if(mode==='trade'&&view.z<2.6&&S.owner[i]<0)continue;const x=sx(i%W),y=sy((i/W)|0);if(!inView(x,y))continue;
      drawToken(ctx,RI[RES[k].k],x,y,sz,'#ffe9b0',{halo:1,sw:1.9})}}
  // realm names along each realm's long axis
  if(political&&opts.labels>0){
    ctx.textAlign='center';ctx.textBaseline='middle';
    const rs=S.realms.filter(r=>r.alive&&(X.cells[r.id]||0)>=28).sort((a,b)=>X.cells[b.id]-X.cells[a.id]);
    for(const r of rs){const c=X.cells[r.id],x=sx(X.sx[r.id]/c),y=sy(X.sy[r.id]/c);
      const fs=clamp(Math.sqrt(c)*.6*Math.sqrt(view.z),10,26);ctx.font=`600 ${fs}px Fraunces, Georgia, serif`;
      const label=r.name.toUpperCase();const sp=fs*.14;const w=ctx.measureText(label).width+sp*label.length;
      const ang=clamp(X.angle[r.id]||0,-.45,.45),ca=Math.abs(Math.cos(ang)),sa=Math.abs(Math.sin(ang));
      const bw=w*ca+fs*sa,bh=w*sa+fs*ca;if(!fits(x-bw/2-8,y-bh/2-4,bw+16,bh+8))continue;
      ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.letterSpacing=sp+'px';
      ctx.lineWidth=3.5;ctx.strokeStyle='rgba(10,12,18,.42)';ctx.strokeText(label,0,0);
      ctx.fillStyle='rgba(255,250,238,.84)';ctx.fillText(label,0,0);ctx.letterSpacing='0px';ctx.restore();
    }
  }
  // plague halos
  const sick=new Set();for(const p of S.plagues)for(const id in p.act)sick.add(+id);
  // settlements
  const zk=Math.min(1.6,Math.sqrt(view.z));
  const order=S.sets.slice().sort((a,b)=>a.pop-b.pop);
  for(const t of order){const x=sx(t.x),y=sy(t.y);if(!inView(x,y))continue;
    if(sick.has(t.id)){const k=(Math.sin(T*3+t.id)+1)/2;ctx.beginPath();ctx.arc(x,y,markerR(t.pop,zk)+6+k*4,0,7);ctx.fillStyle=`rgba(176,140,255,${.18+k*.12})`;ctx.fill()}
    const R=S.realms[t.realm],isCap=R.cap===t.id;drawMarker(t,x,y,zk,isCap);
    if(t.w.length)drawToken(ctx,'building-monument',x+markerR(t.pop,zk)+5,y-markerR(t.pop,zk)-4,13,'#f4c06a',{halo:1,sw:2});
    if(sel&&sel.t==='s'&&sel.id===t.id){ctx.strokeStyle='#f4c06a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,markerR(t.pop,zk)+8+Math.sin(T*4)*1.5,0,7);ctx.stroke()}
  }
  // capitals carry their arms
  for(const r of S.realms){if(!r.alive)continue;const t=X.byId&&X.byId.get(r.cap);if(!t)continue;if((X.cells[r.id]||0)<14&&view.z<1.8)continue;
    const x=sx(t.x),y=sy(t.y);if(!inView(x,y))continue;const img=armsImage(r);const w=Math.round(10*zk+3),h=Math.round(w*1.2);
    if(img){const top=y-markerR(t.pop,zk)-h-5;ctx.drawImage(img,x-w/2,top,w,h);boxes.push([x-w/2,top,w,h])}}
  // settlement labels
  if(opts.labels>0){
  ctx.textAlign='left';ctx.textBaseline='middle';
  const minPop=(view.z>=3?600:view.z>=1.8?3000:11000)*(opts.labels===1?2.5:1);
  const lab=S.sets.filter(t=>t.pop>=minPop||(S.realms[t.realm].cap===t.id&&(view.z>=1.6||(X.cells[t.realm]||0)>=50))||(sel&&sel.t==='s'&&sel.id===t.id)).sort((a,b)=>b.pop-a.pop);
  for(const t of lab){const x=sx(t.x),y=sy(t.y);if(!inView(x,y))continue;const big=t.pop>15000||S.realms[t.realm].cap===t.id;const fs=big?12.5:11;
    ctx.font=`${big?800:700} ${fs}px Manrope, system-ui, sans-serif`;const w=ctx.measureText(t.name).width;const off=markerR(t.pop,zk)+5;
    const lx=x+off;if(!fits(lx,y-fs/2,w,fs))continue;
    ctx.lineWidth=3.2;ctx.strokeStyle='rgba(10,12,18,.8)';ctx.strokeText(t.name,lx,y);ctx.fillStyle=big?'#fffaf0':'#eef0f4';ctx.fillText(t.name,lx,y);
  }}
  // outlaws
  for(const b of S.bands){const x=sx(b.x),y=sy(b.y);if(!inView(x,y))continue;drawToken(ctx,b.kind==='pirate'?'anchor':'mask',x,y,20,pal('war'),{bg:'rgba(17,20,28,.92)',ring:'rgba(255,107,91,.6)',halo:1})}
  // armies
  for(const a of S.armies){a._x=a._x==null?a.x:lerp(a._x,a.x,Math.min(1,dt*2.5));a._y=a._y==null?a.y:lerp(a._y,a.y,Math.min(1,dt*2.5));
    const x=sx(a._x),y=sy(a._y);if(!inView(x,y,40))continue;const R=S.realms[a.realm],sz=clamp(15+Math.sqrt(a.size)/7,18,30);
    ctx.beginPath();ctx.arc(x,y,sz/2+2,0,7);ctx.fillStyle='rgba(10,12,18,.75)';ctx.fill();
    drawToken(ctx,a.state==='siege'?'building-fortress':'swords',x,y,sz,'#fffaf0',{bg:R.color,ring:'rgba(10,12,18,.9)',halo:1,sw:2.1});
    if(a.state==='siege'){ctx.beginPath();ctx.arc(x,y,sz/2+4,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(a.siege,0,1));ctx.strokeStyle='#ff6b5b';ctx.lineWidth=2.5;ctx.stroke()}
    if(a.state==='retreat'){ctx.beginPath();ctx.arc(x,y,sz/2+4,0,7);ctx.strokeStyle='rgba(238,240,244,.4)';ctx.setLineDash([2,3]);ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([])}
    if(view.z>=1.6){ctx.font='700 10.5px Manrope, system-ui, sans-serif';ctx.textAlign='center';const lbl=fmt(a.size);ctx.lineWidth=3;ctx.strokeStyle='rgba(10,12,18,.85)';ctx.strokeText(lbl,x,y+sz/2+10);ctx.fillStyle='#fffaf0';ctx.fillText(lbl,x,y+sz/2+10);ctx.textAlign='left'}
    boxes.push([x-sz/2,y-sz/2,sz,sz]);
    if(sel&&sel.t==='a'&&sel.id===a.id){ctx.beginPath();ctx.arc(x,y,sz/2+8,0,7);ctx.strokeStyle='#f4c06a';ctx.lineWidth=2;ctx.stroke()}
  }
  // monsters
  for(const b of S.beasts){if(!b.alive)continue;const x=sx(b.x),y=sy(b.y)+Math.sin(T*2+b.id)*1.5;if(!inView(x,y,40))continue;const k=Math.min(1.4,.9+view.z*.1);
    const gr=ctx.createRadialGradient(x,y,2,x,y,20*k);gr.addColorStop(0,'rgba(255,95,143,.55)');gr.addColorStop(1,'rgba(255,95,143,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,20*k,0,7);ctx.fill();
    drawToken(ctx,catIcon(b.kind),x,y,24*k,pal('monster'),{bg:'rgba(17,20,28,.94)',ring:pal('monster'),halo:1});
    if(view.z>=1.4){ctx.font=`italic 600 12px Fraunces, Georgia, serif`;const nm=b.name.split(' the ')[0].split(' of ')[0];const w=ctx.measureText(nm).width;
      if(fits(x-w/2,y+13*k,w,13)){ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(10,12,18,.85)';ctx.strokeText(nm,x,y+19*k);ctx.fillStyle='#ff9bb8';ctx.fillText(nm,x,y+19*k);ctx.textAlign='left'}}
  }
  // event ripples and ships under sail
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];
    if(f.ship){const a=Math.max(0,(now-f.t)/3600);if(a>=1){f.ship=false;f.t=now;continue}
      const x0=f.t0x,y0=f.t0y,x1=f.x,y1=f.y,mx=(x0+x1)/2-(y1-y0)*.2,my=(y0+y1)/2+(x1-x0)*.2,e=a<.5?2*a*a:1-Math.pow(-2*a+2,2)/2;
      const px=(1-e)*(1-e)*x0+2*(1-e)*e*mx+e*e*x1,py=(1-e)*(1-e)*y0+2*(1-e)*e*my+e*e*y1;
      ctx.globalAlpha=Math.min(1,(1-a)*4);drawToken(ctx,'sailboat',sx(px),sy(py)+Math.sin(T*6),22,pal('economy'),{bg:'rgba(17,20,28,.92)',ring:pal('economy'),halo:1});ctx.globalAlpha=1;continue}
    const a=Math.max(0,(now-f.t)/(f.imp>=2?2600:1600));if(a>=1){fx.splice(i,1);continue}
    const x=sx(f.x),y=sy(f.y),col=pal(catDom(f.c));
    ctx.globalAlpha=1-a;ctx.strokeStyle=col;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y,4+a*(f.imp>=2?36:22),0,7);ctx.stroke();
    if(f.imp>=2){ctx.beginPath();ctx.arc(x,y,4+a*18,0,7);ctx.stroke()}
    if(f.imp>=1){const k=1-Math.pow(1-Math.min(1,a*3),3);drawToken(ctx,catIcon(f.c),x,y-16-k*8,f.imp>=2?24:20,col,{bg:'rgba(17,20,28,.94)',ring:col,shape:'square',halo:1})}
    ctx.globalAlpha=1;
  }
  if(cw>700){drawCompass(cw-(sideOpen?452:64),ch-110,22);drawScale(cw-(sideOpen?520:132),ch-56)}
}

/* ---------- minimap ---------- */
let miniDirty=true;const miniCv=$('#minimap'),mctx=miniCv?miniCv.getContext('2d'):null;
function drawMini(){
  if(!mctx||!S||!G)return;miniDirty=false;const w=miniCv.clientWidth,h=miniCv.clientHeight;if(!w)return;
  if(miniCv.width!==Math.round(w*dpr)){miniCv.width=Math.round(w*dpr);miniCv.height=Math.round(h*dpr)}
  const c=mctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);c.imageSmoothingEnabled=true;c.drawImage(G.canvas,0,0,w,h);
  if(mode!=='terrain'){c.globalAlpha=.55;c.drawImage(polCv,0,0,w,h);c.globalAlpha=1}
  const s=base*view.z,x0=-view.ox/s/W*w,y0=-view.oy/s/H*h,vw=cw/s/W*w,vh=ch/s/H*h;
  c.fillStyle='rgba(10,12,18,.35)';c.beginPath();c.rect(0,0,w,h);c.rect(x0+vw,y0,-vw,vh);c.fill('evenodd');
  c.strokeStyle='#f4c06a';c.lineWidth=1.5;c.strokeRect(x0+.5,y0+.5,vw-1,vh-1);
}
