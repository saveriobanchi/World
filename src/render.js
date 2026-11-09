/* =====================================================================
   RENDERING · the painted map and everything that lives on it
   ===================================================================== */
const cv=$('#map'),ctx=cv.getContext('2d');
const polCv=document.createElement('canvas');polCv.width=W;polCv.height=H;const pctx=polCv.getContext('2d');
const scarCv=document.createElement('canvas');scarCv.width=W;scarCv.height=H;const sctx=scarCv.getContext('2d');
const FS=6,farmCv=document.createElement('canvas');farmCv.width=W*FS;farmCv.height=H*FS;const fctx=farmCv.getContext('2d');
let view={z:1,ox:0,oy:0},cam=null,base=1,cw=0,ch=0,dpr=1,mode='realms',sel=null,hover=null,dirtyPol=true,dirtyNet=true,farmDirty=true,clouds=null;
let opts={clouds:false,labels:2,follow:false,farms:true};
let paths={soft:new Path2D(),hard:new Path2D(),war:new Path2D(),sel:new Path2D(),edge:[]};
let net={roads:new Path2D(),land:[],sea:[]};
const pal=k=>(DOMAIN[k]||DOMAIN.politics).c;

/* ---------- Tabler symbols on canvas: rasterised once per (icon, size, colour, style) ---------- */
const TP={};
function tiPaths(k){return TP[k]||(TP[k]=(TI[k]||TI['circle-dot']).map(([d,f])=>[new Path2D(d),f]))}
const ICON_BMP=new Map();
function token(k,size,color,o={}){
  // o.bg: draw as a seal (dark enamel disc with a pigment ring); o.halo: ink halo around a bare glyph
  const px=Math.round(size*dpr),key=[k,px,color,o.bg,o.ring,o.halo].join('|');let b=ICON_BMP.get(key);
  if(!b){b=document.createElement('canvas');const pad=Math.ceil(3*dpr);b.width=b.height=px+pad*2;const c=b.getContext('2d');c.translate(pad,pad);
    if(o.bg){c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=5*dpr;c.beginPath();c.arc(px/2,px/2,px/2-.5*dpr,0,7);c.fillStyle='rgba(16,14,12,.9)';c.fill();c.shadowBlur=0;
      c.lineWidth=1*dpr;c.strokeStyle=o.ring||color;c.beginPath();c.arc(px/2,px/2,px/2-1*dpr,0,7);c.stroke()}
    const inset=o.bg?px*.25:0,s=(px-inset*2)/512;c.translate(inset,inset);c.scale(s,s);
    if(o.halo){c.lineJoin='round';c.lineWidth=3.2*dpr/s;c.strokeStyle=o.halo===2?'rgba(234,220,190,.85)':'rgba(16,8,18,.88)';for(const[p]of tiPaths(k))c.stroke(p)}
    c.fillStyle=color;for(const[p]of tiPaths(k))c.fill(p);
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
  const c=bgx;c.setTransform(1,0,0,1,0,0);c.fillStyle='#0c0b0a';c.fillRect(0,0,bgCv.width,bgCv.height);
  c.setTransform(dpr*s,0,0,dpr*s,dpr*view.ox,dpr*view.oy);
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(G.canvas,0,0,W,H);
  if(opts.farms&&mode!=='density')c.drawImage(farmCv,0,0,W,H);
  const tint=SEASON_TINT[S.season];if(tint){c.fillStyle=tint;c.fillRect(0,0,W,H)}
  if(S.season===3||S.winter>S.year){const a=S.winter>S.year?.4:.2;const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,`rgba(242,247,255,${a})`);g.addColorStop(.3,'rgba(242,247,255,0)');g.addColorStop(.7,'rgba(242,247,255,0)');g.addColorStop(1,`rgba(242,247,255,${a})`);c.fillStyle=g;c.fillRect(0,0,W,H)}
  // political colour goes on like watercolour: multiplied into the paper so the engraving shows through
  if(mode!=='terrain'){if(mode!=='density')c.globalCompositeOperation='multiply';c.globalAlpha=mode==='density'?.8:mode==='trade'?.3:mode==='military'?.42:.44;c.drawImage(polCv,0,0,W,H);c.globalAlpha=1;c.globalCompositeOperation='source-over'}
  c.lineCap='round';c.lineJoin='round';
  if(political){
    if(mode==='realms'){c.globalAlpha=.55;c.globalCompositeOperation='multiply';c.lineWidth=3.2/s;for(let a=0;a<paths.edge.length;a++){if(!paths.edge[a])continue;const r=S.realms[a];c.strokeStyle=r.overlord!=null?`rgb(${realmRGB(r).join(',')})`:r.color;c.stroke(paths.edge[a])}c.globalAlpha=1;c.globalCompositeOperation='source-over'}
    c.strokeStyle='rgba(20,16,12,.3)';c.lineWidth=1/s;c.setLineDash([2/s,2/s]);c.stroke(paths.soft);c.setLineDash([]);
    c.strokeStyle='rgba(30,22,14,.8)';c.lineWidth=1.2/s;c.stroke(paths.hard);
  }
  c.strokeStyle='#a8382c';c.lineWidth=2.2/s;c.stroke(paths.sel);
  if(mode!=='density'){c.strokeStyle='rgba(70,50,30,.55)';c.lineWidth=Math.max(.8,1.05*Math.sqrt(view.z))/s;c.setLineDash([2.4/s,2/s]);c.stroke(net.roads);c.setLineDash([])}
}

/* ---------- settlements ---------- */
function markerR(p,zk){return(p<400?2:p<1500?2.8:p<6000?3.6:p<20000?4.6:5.8)*zk}
const INK='#2a1f16',PAPER='#e8dcc0',THREAD='#a8382c';
// which engraved stamp a town earns when the chart is zoomed in
function townStamp(t,isCap){
  if(view.z<2.3||!(isCap||t.pop>=4000||t.b.walls))return null;
  const k=isCap?'castle':t.b.temple&&hash2(t.id,3,1)<.45?'temple':'fort',im=ARTIMG.stamp[k];if(!im)return null;
  const w=(isCap?34:t.pop>12000?28:22)*Math.min(1.5,Math.sqrt(view.z/2.3));return{im,w,h:w*im.height/im.width};
}
function markOff(t,zk,isCap){const st=townStamp(t,isCap);return st?st.w/2:markerR(t.pop,zk)}
function drawMarker(t,x,y,zk,isCap){
  const R=S.realms[t.realm],col=mode==='terrain'||mode==='density'?PAPER:`rgb(${realmRGB(R).join(',')})`;
  const st=townStamp(t,isCap);
  if(st){ctx.beginPath();ctx.ellipse(x,y+st.h*.12,st.w*.46,st.h*.16,0,0,7);ctx.fillStyle=col;ctx.globalAlpha=.75;ctx.fill();ctx.globalAlpha=1;
    ctx.drawImage(st.im,x-st.w/2,y-st.h*.8,st.w,st.h);
    if(isCap){ctx.fillStyle=THREAD;star4(ctx,x,y-st.h*.8-6,4)}return}
  const r=markerR(t.pop,zk)*.8;
  if(t.pop<1500){ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=INK;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='rgba(236,224,196,.8)';ctx.stroke();return}
  if(t.b.walls){ctx.beginPath();ctx.arc(x,y,r+2.4,0,7);ctx.strokeStyle=INK;ctx.lineWidth=.9;ctx.stroke()}
  ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=1.4;ctx.strokeStyle=INK;ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,r*.34,0,7);ctx.fillStyle=INK;ctx.fill();
  if(isCap){ctx.fillStyle=THREAD;star4(ctx,x,y-r-6,3.4)}
}
const star4=(c,x,y,r)=>{c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r*.15,y-r*.15,x+r,y);c.quadraticCurveTo(x+r*.15,y+r*.15,x,y+r);c.quadraticCurveTo(x-r*.15,y+r*.15,x-r,y);c.quadraticCurveTo(x-r*.15,y-r*.15,x,y-r);c.fill()};
function drawCompass(x,y,r){
  if(compassImg){const d=r*5.4;ctx.save();ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=10;ctx.drawImage(compassImg,x-d/2,y-d/2,d,d);ctx.restore();
    ctx.font=`600 ${Math.round(r*.7)}px 'Cormorant Garamond', Georgia, serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='rgba(12,10,8,.7)';ctx.strokeText('N',x,y-d/2-6);ctx.fillStyle='#e9cd8f';ctx.fillText('N',x,y-d/2-6);return}
  ctx.save();ctx.translate(x,y);ctx.fillStyle='#e9cd8f';star4(ctx,0,0,r*.95);ctx.restore();
}
function drawScale(x,y){
  const s=base*view.z,lpc=12;let L=100;for(const o of[25,50,100,200,400,800]){if(o/lpc*s>64){L=o;break}}
  const w=L/lpc*s;ctx.save();ctx.strokeStyle='rgba(236,226,207,.75)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);for(const f of[0,.5,1]){ctx.moveTo(x+w*f,y-(f===.5?3:5));ctx.lineTo(x+w*f,y+(f===.5?3:5))}ctx.stroke();
  ctx.font=`italic 500 15px 'Cormorant Garamond', Georgia, serif`;ctx.fillStyle='#ece2cf';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=6;
  ctx.fillText(`${L} leagues`,x+w/2,y-9);ctx.restore();
}
// a tarot border around the whole chart: two hairlines, a star at each corner and at the middle of each edge
function drawNeatline(){
  const m=9;ctx.save();ctx.strokeStyle='rgba(222,196,150,.38)';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(m+.5,m+.5,cw-2*m-1,ch-2*m-1,20);ctx.stroke();
  ctx.strokeStyle='rgba(222,196,150,.16)';ctx.beginPath();ctx.roundRect(m+6.5,m+6.5,cw-2*m-13,ch-2*m-13,15);ctx.stroke();
  ctx.fillStyle='#cfa960';for(const[x,y]of[[cw/2,m+.5],[cw/2,ch-m-.5],[m+.5,ch/2],[cw-m-.5,ch/2]])star4(ctx,x,y,5);
  ctx.restore();
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
    for(const r of net.land){ctx.strokeStyle=mode==='trade'?'rgba(168,56,44,.8)':'rgba(168,56,44,.38)';ctx.lineWidth=(.8+r.v*.1)*tm/s;ctx.setLineDash([5/s,4/s]);ctx.lineDashOffset=-T*14/s;ctx.stroke(r.p)}
    for(const r of net.sea){ctx.strokeStyle='rgba(226,208,170,.55)';ctx.lineWidth=(1+r.v*.1)*tm/s;ctx.setLineDash([2/s,5/s]);ctx.lineDashOffset=-T*10/s;ctx.stroke(r.p)}
    ctx.setLineDash([]);
  }
  // campaigns: each marching army draws its line of advance
  for(const a of S.armies){if(a.target==null||a.state==='retreat')continue;const t=X.byId.get(a.target);if(!t)continue;
    ctx.strokeStyle=S.realms[a.realm].color;ctx.globalAlpha=.75;ctx.lineWidth=1.4/s;ctx.setLineDash([3/s,3/s]);ctx.lineDashOffset=-T*10/s;
    ctx.beginPath();ctx.moveTo((a._x??a.x)+.5,(a._y??a.y)+.5);ctx.lineTo(t.x+.5,t.y+.5);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1}
  if(hover&&hover.cell!=null){ctx.strokeStyle='rgba(30,22,14,.85)';ctx.lineWidth=1.2/s;ctx.strokeRect(hover.cell%W,(hover.cell/W)|0,1,1)}
  if(opts.clouds&&clouds){
    const ox=(T*.35)%W,oy=(T*.12)%H;ctx.globalAlpha=view.z>3?.1:.18;
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
    if(view.z>=2.2&&ARTIMG.stamp.tower){const im=ARTIMG.stamp.tower,w=16*Math.min(1.4,Math.sqrt(view.z/2.2)),h=w*im.height/im.width;ctx.globalAlpha=.85;ctx.drawImage(im,x-w/2,y-h*.8,w,h);ctx.globalAlpha=1}
    else{ctx.strokeStyle='rgba(40,30,22,.8)';ctx.lineWidth=1.3;const q=2.2;ctx.beginPath();ctx.moveTo(x-q,y-q);ctx.lineTo(x+q,y+q);ctx.moveTo(x+q,y-q);ctx.lineTo(x-q,y+q);ctx.stroke()}}
  // resources
  if(view.z>=2.6||mode==='trade'){const sz=view.z<2.6?11:Math.min(16,7+view.z*1.4);const RI={iron:'pick',gold:'coins',gems:'diamond',timber:'trees',horses:'horse',spice:'flame',fish:'fish',wine:'grape'};
    for(let i=0;i<N;i++){const k=G.res[i];if(!k)continue;if(mode==='trade'&&view.z<2.6&&S.owner[i]<0)continue;const x=sx(i%W),y=sy((i/W)|0);if(!inView(x,y))continue;
      drawToken(ctx,RI[RES[k].k],x,y,sz+1,'#3a2c1e',{halo:2})}}
  // realm names along each realm's long axis
  if(political&&opts.labels>0){
    ctx.textAlign='center';ctx.textBaseline='middle';
    const rs=S.realms.filter(r=>r.alive&&(X.cells[r.id]||0)>=28).sort((a,b)=>X.cells[b.id]-X.cells[a.id]);
    for(const r of rs){const c=X.cells[r.id],x=sx(X.sx[r.id]/c),y=sy(X.sy[r.id]/c);
      const fs=clamp(Math.sqrt(c)*.6*Math.sqrt(view.z),10,26);ctx.font=`600 ${fs}px 'Cormorant Garamond', Georgia, serif`;
      const label=r.name.toUpperCase();const sp=fs*.32;const w=ctx.measureText(label).width+sp*label.length;
      const ang=clamp(X.angle[r.id]||0,-.45,.45),ca=Math.abs(Math.cos(ang)),sa=Math.abs(Math.sin(ang));
      const bw=w*ca+fs*sa,bh=w*sa+fs*ca;if(!fits(x-bw/2-8,y-bh/2-4,bw+16,bh+8))continue;
      ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.letterSpacing=sp+'px';
      ctx.lineWidth=3.5;ctx.strokeStyle='rgba(234,220,190,.5)';ctx.strokeText(label,0,0);ctx.fillStyle='rgba(42,30,20,.86)';ctx.fillText(label,0,0);ctx.letterSpacing='0px';ctx.restore();
    }
  }
  // plague halos
  const sick=new Set();for(const p of S.plagues)for(const id in p.act)sick.add(+id);
  // settlements
  const zk=Math.min(1.6,Math.sqrt(view.z));
  const order=S.sets.slice().sort((a,b)=>a.pop-b.pop);
  for(const t of order){const x=sx(t.x),y=sy(t.y);if(!inView(x,y))continue;
    if(sick.has(t.id)){const k=(Math.sin(T*3+t.id)+1)/2;ctx.beginPath();ctx.arc(x,y,markerR(t.pop,zk)+6+k*4,0,7);ctx.fillStyle=`rgba(199,162,244,${.18+k*.12})`;ctx.fill()}
    const R=S.realms[t.realm],isCap=R.cap===t.id;drawMarker(t,x,y,zk,isCap);
    if(t.w.length)drawToken(ctx,'building-monument',x+markOff(t,zk,isCap)+6,y-markOff(t,zk,isCap)-5,14,'#8a5a1c',{halo:2});
    if(sel&&sel.t==='s'&&sel.id===t.id){ctx.strokeStyle=THREAD;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,markOff(t,zk,isCap)+8+Math.sin(T*4)*1.5,0,7);ctx.stroke()}
  }
  // capitals carry their arms
  for(const r of S.realms){if(!r.alive)continue;const t=X.byId&&X.byId.get(r.cap);if(!t)continue;if((X.cells[r.id]||0)<14&&view.z<1.8)continue;
    const x=sx(t.x),y=sy(t.y);if(!inView(x,y))continue;const img=bannerImage(r);const w=Math.round(9*zk+5),h=Math.round(w*100/60);
    if(img){const st=townStamp(t,true);const top=y-(st?st.h*.8+12:markerR(t.pop,zk)+9)-h;ctx.drawImage(img,x-w/2,top,w,h);boxes.push([x-w/2,top,w,h])}}
  // settlement labels
  if(opts.labels>0){
  ctx.textAlign='left';ctx.textBaseline='middle';
  const minPop=(view.z>=3?600:view.z>=1.8?3000:11000)*(opts.labels===1?2.5:1);
  const lab=S.sets.filter(t=>t.pop>=minPop||(S.realms[t.realm].cap===t.id&&(view.z>=1.6||(X.cells[t.realm]||0)>=50))||(sel&&sel.t==='s'&&sel.id===t.id)).sort((a,b)=>b.pop-a.pop);
  for(const t of lab){const x=sx(t.x),y=sy(t.y);if(!inView(x,y))continue;const big=t.pop>15000||S.realms[t.realm].cap===t.id;const fs=big?12.5:11;
    ctx.font=`${big?'':'italic '}${big?600:500} ${fs+4}px 'Cormorant Garamond', Georgia, serif`;const w=ctx.measureText(t.name).width;const off=markOff(t,zk,S.realms[t.realm].cap===t.id)+5;
    const lx=x+off;if(!fits(lx,y-fs/2,w,fs))continue;
    ctx.lineWidth=3.2;ctx.strokeStyle='rgba(236,224,196,.78)';ctx.strokeText(t.name,lx,y);ctx.fillStyle=big?'#1e160e':'#33271b';ctx.fillText(t.name,lx,y);
  }}
  // outlaws
  for(const b of S.bands){const x=sx(b.x),y=sy(b.y);if(!inView(x,y))continue;drawToken(ctx,b.kind==='pirate'?'anchor':'mask',x,y,22,'#ece2cf',{bg:1,ring:pal('war')})}
  // armies
  for(const a of S.armies){a._x=a._x==null?a.x:lerp(a._x,a.x,Math.min(1,dt*2.5));a._y=a._y==null?a.y:lerp(a._y,a.y,Math.min(1,dt*2.5));
    const x=sx(a._x),y=sy(a._y);if(!inView(x,y,40))continue;const R=S.realms[a.realm],sz=clamp(15+Math.sqrt(a.size)/7,18,30);
        drawToken(ctx,a.state==='siege'?'building-fortress':'swords',x,y,sz,'#ece2cf',{bg:1,ring:R.color});
    if(a.state==='siege'){ctx.beginPath();ctx.arc(x,y,sz/2+4,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(a.siege,0,1));ctx.strokeStyle='#c8574a';ctx.lineWidth=2;ctx.stroke()}
    if(a.state==='retreat'){ctx.beginPath();ctx.arc(x,y,sz/2+4,0,7);ctx.strokeStyle='rgba(238,240,244,.4)';ctx.setLineDash([2,3]);ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([])}
    if(view.z>=1.6){ctx.font="500 11px Jost, sans-serif";ctx.textAlign='center';const lbl=fmt(a.size);ctx.lineWidth=3;ctx.strokeStyle='rgba(10,12,18,.85)';ctx.strokeText(lbl,x,y+sz/2+10);ctx.fillStyle='#fffaf0';ctx.fillText(lbl,x,y+sz/2+10);ctx.textAlign='left'}
    boxes.push([x-sz/2,y-sz/2,sz,sz]);
    if(sel&&sel.t==='a'&&sel.id===a.id){ctx.beginPath();ctx.arc(x,y,sz/2+8,0,7);ctx.strokeStyle='#f6dd98';ctx.lineWidth=2;ctx.stroke()}
  }
  // monsters
  for(const b of S.beasts){if(!b.alive)continue;const x=sx(b.x),y=sy(b.y)+Math.sin(T*2+b.id)*1.5;if(!inView(x,y,40))continue;const k=Math.min(1.4,.9+view.z*.1);
    const gr=ctx.createRadialGradient(x,y,2,x,y,20*k);gr.addColorStop(0,'rgba(185,71,90,.4)');gr.addColorStop(1,'rgba(185,71,90,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,20*k,0,7);ctx.fill();
    drawToken(ctx,catIcon(b.kind),x,y,26*k,'#e7b2b9',{bg:1,ring:pal('monster')});
    if(view.z>=1.4){ctx.font=`italic 500 16px 'Cormorant Garamond', Georgia, serif`;const nm=b.name.split(' the ')[0].split(' of ')[0];const w=ctx.measureText(nm).width;
      if(fits(x-w/2,y+13*k,w,13)){ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(10,12,18,.85)';ctx.strokeText(nm,x,y+19*k);ctx.fillStyle='#e7b2b9';ctx.fillText(nm,x,y+19*k);ctx.textAlign='left'}}
  }
  // event ripples and ships under sail
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];
    if(f.ship){const a=Math.max(0,(now-f.t)/3600);if(a>=1){f.ship=false;f.t=now;continue}
      const x0=f.t0x,y0=f.t0y,x1=f.x,y1=f.y,mx=(x0+x1)/2-(y1-y0)*.2,my=(y0+y1)/2+(x1-x0)*.2,e=a<.5?2*a*a:1-Math.pow(-2*a+2,2)/2;
      const px=(1-e)*(1-e)*x0+2*(1-e)*e*mx+e*e*x1,py=(1-e)*(1-e)*y0+2*(1-e)*e*my+e*e*y1;
      ctx.globalAlpha=Math.min(1,(1-a)*4);drawToken(ctx,'sailboat',sx(px),sy(py)+Math.sin(T*6),24,'#ece2cf',{bg:1,ring:pal('economy')});ctx.globalAlpha=1;continue}
    const a=Math.max(0,(now-f.t)/(f.imp>=2?2600:1600));if(a>=1){fx.splice(i,1);continue}
    const x=sx(f.x),y=sy(f.y),col=pal(catDom(f.c));
    ctx.globalAlpha=1-a;ctx.strokeStyle=col;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y,4+a*(f.imp>=2?36:22),0,7);ctx.stroke();
    if(f.imp>=2){ctx.beginPath();ctx.arc(x,y,4+a*18,0,7);ctx.stroke()}
    if(f.imp>=1){const k=1-Math.pow(1-Math.min(1,a*3),3);drawToken(ctx,catIcon(f.c),x,y-17-k*8,f.imp>=2?28:22,col,{bg:1,ring:col})}
    ctx.globalAlpha=1;
  }
  if(cw>700){drawCompass(cw-(sideOpen?470:72),ch-(sideOpen?200:186),17);drawScale(cw-(sideOpen?636:236),ch-(sideOpen?176:166));drawNeatline()}
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
  c.strokeStyle='#e9cd8f';c.lineWidth=1;c.strokeRect(x0+.5,y0+.5,vw-1,vh-1);
}
