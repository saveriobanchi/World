/* =====================================================================
   RENDERING · the painted map and everything that lives on it
   ===================================================================== */
const cv=$('#map'),ctx=cv.getContext('2d');
const polCv=document.createElement('canvas');polCv.width=W;polCv.height=H;const pctx=polCv.getContext('2d');
const scarCv=document.createElement('canvas');scarCv.width=W;scarCv.height=H;const sctx=scarCv.getContext('2d');
let view={z:1,ox:0,oy:0},cam=null,base=1,cw=0,ch=0,dpr=1,mode='realms',sel=null,hover=null,dirtyPol=true,dirtyNet=true,clouds=null,showClouds=true;
let paths={soft:new Path2D(),hard:new Path2D(),war:new Path2D(),sel:new Path2D(),edge:[]};
let net={roads:new Path2D(),land:[],sea:[]};
const ICON_P={};
function iconPath(k){return ICON_P[k]||(ICON_P[k]=new Path2D(ICONS[k]||ICONS.era))}
// icons are vector paths; each (icon, colour, size) is rasterised once and then blitted
const ICON_BMP=new Map();
function iconBitmap(k,size,fill,stroke){
  const px=Math.max(4,Math.round(size*dpr*2)/2),key=k+'|'+px+'|'+fill+'|'+(stroke?stroke.join():'');let b=ICON_BMP.get(key);
  if(!b){const pad=stroke?Math.ceil(stroke[1]*dpr)+1:1;b=document.createElement('canvas');b.width=b.height=Math.ceil(px+pad*2);const c=b.getContext('2d');
    c.translate(pad,pad);c.scale(px/512,px/512);if(stroke){c.lineWidth=stroke[1]*dpr*2*512/px;c.strokeStyle=stroke[0];c.lineJoin='round';c.stroke(iconPath(k))}c.fillStyle=fill;c.fill(iconPath(k));
    b._pad=pad;if(ICON_BMP.size>600)ICON_BMP.clear();ICON_BMP.set(key,b)}
  return b;
}
function drawIcon(c,k,x,y,size,fill,stroke){const b=iconBitmap(k,size,fill,stroke);const s=b.width/dpr;c.drawImage(b,x-s/2,y-s/2,s,s)}

function resize(){
  const r=cv.parentElement.getBoundingClientRect();cw=r.width;ch=r.height;dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.max(1,Math.round(cw*dpr));cv.height=Math.max(1,Math.round(ch*dpr));base=Math.max(cw/W,ch/H)*.985;if(cw<700)base=Math.min(cw/W,ch/H);
  clampView();if(typeof sizeChart==='function')sizeChart();
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

function rebuildPol(){
  dirtyPol=false;
  const img=pctx.createImageData(W,H),d=img.data,o=S.owner;
  const sr=sel&&sel.t==='r'?sel.id:-1;
  if(mode==='density'){
    const heat=new Float32Array(N);
    for(const s of S.sets){const R=Math.min(9,2+Math.sqrt(s.pop)/28);const r2=R*R;for(let y=Math.max(0,Math.floor(s.y-R));y<=Math.min(H-1,s.y+R);y++)for(let x=Math.max(0,Math.floor(s.x-R));x<=Math.min(W-1,s.x+R);x++){const dd=d2(x,y,s.x,s.y);if(dd<=r2)heat[y*W+x]+=s.pop*(1-dd/r2)}}
    for(let i=0;i<N;i++){if(!isLand(G.biome[i]))continue;const v=clamp(Math.log10(1+heat[i])/4.6,0,1);if(v<.05)continue;
      const c=v<.5?mix3([60,40,110],[200,60,70],v*2):mix3([200,60,70],[255,214,110],(v-.5)*2);d[i*4]=c[0];d[i*4+1]=c[1];d[i*4+2]=c[2];d[i*4+3]=60+v*195}
  }else if(mode!=='terrain'){
    for(let i=0;i<N;i++){const a=o[i];if(a<0)continue;const r=S.realms[a];let c,al=255;
      if(mode==='faith')c=(S.faiths[r.faith]||S.faiths[0]).rgb;
      else if(mode==='peoples')c=RACE_RGB[r.race];
      else if(mode==='trade'){c=r.rgb;al=110}
      else if(mode==='diplomacy'&&sr>=0){if(a===sr)c=[240,200,100];else if(findWar(a,sr))c=[214,64,48];else if(S.allies[rkey(a,sr)])c=[70,170,140];else{const v=S.rel[rkey(a,sr)];c=v==null?[120,120,130]:v>0?mix3([150,150,140],[110,190,150],v/100):mix3([150,150,140],[200,110,80],-v/100)}}
      else c=r.rgb;
      d[i*4]=c[0];d[i*4+1]=c[1];d[i*4+2]=c[2];d[i*4+3]=mode==='realms'&&sr>=0&&sr!==a?110:al}
  }
  pctx.putImageData(img,0,0);
  // scars of magic and fire
  const si=sctx.createImageData(W,H);
  if(S.scars.length){for(const s of S.scars){const r2=s.r*s.r;for(let y=Math.max(0,s.y-s.r-1);y<=Math.min(H-1,s.y+s.r+1);y++)for(let x=Math.max(0,s.x-s.r-1);x<=Math.min(W-1,s.x+s.r+1);x++){const dd=d2(x,y,s.x,s.y);if(dd>r2+1)continue;const i=(y*W+x)*4;const a=clamp(1-dd/(r2+1),0,1)*.9+.1;
    const c=s.kind==='blight'?[150,60,200]:[60,52,48];si.data[i]=c[0];si.data[i+1]=c[1];si.data[i+2]=c[2];si.data[i+3]=Math.max(si.data[i+3],a*230)}}}
  sctx.putImageData(si,0,0);
  // borders
  const soft=[],hard=[],war=[],sp=[],edge=[];
  const warSet=new Set(S.wars.map(w=>bkey(w.a,w.b)));
  const E=a=>edge[a]||(edge[a]=[]);
  const seg=(a,b,x0,y0,x1,y1,la,lb)=>{
    if(a===b)return;
    if(sr>=0&&(a===sr||b===sr))sp.push(x0,y0,x1,y1);
    if(a>=0)E(a).push(x0,y0,x1,y1);if(b>=0)E(b).push(x0,y0,x1,y1);
    if(!la||!lb)return;
    (a>=0&&b>=0?(warSet.has(bkey(a,b))?war:hard):soft).push(x0,y0,x1,y1);
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
    for(let it=0;it<2;it++){if(P.length<3)break;const Q=[];const L=P.length;
      if(!closed)Q.push(P[0]);
      for(let i=0;i<(closed?L:L-1);i++){const a=P[i],b=P[(i+1)%L];Q.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75])}
      if(!closed)Q.push(P[L-1]);P=Q}
    p.moveTo(P[0][0],P[0][1]);for(let i=1;i<P.length;i++)p.lineTo(P[i][0],P[i][1]);if(closed)p.closePath()};
  for(const[v,a]of adj){if(a.length===2)continue;for(const e of a)if(!used[e])emit(walk(v,e))}
  for(let e=0;e<n;e++)if(!used[e])emit(walk(segs[e*4+1]*VW+segs[e*4],e));
  return p;
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

function drawMarker(t,x,y,r,isCap,zk){
  const R=S.realms[t.realm],col=mode==='terrain'||mode==='density'?'#efe6cf':R.color;
  const p=t.pop;
  ctx.lineJoin='round';
  if(p<400){ctx.beginPath();ctx.arc(x,y,1.7*zk,0,7);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='rgba(18,13,8,.85)';ctx.stroke();return}
  if(p<1500){ctx.beginPath();ctx.arc(x,y,2.6*zk,0,7);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=1.2;ctx.strokeStyle='#160f08';ctx.stroke();return}
  if(p<6000){const s=3.4*zk;ctx.beginPath();ctx.arc(x,y,s,0,7);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=1.4;ctx.strokeStyle='#160f08';ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,s*.38,0,7);ctx.fillStyle='#160f08';ctx.fill();return}
  // walled city: crenellated ring
  const s=(p<20000?4.6:6.2)*zk;const n=p<20000?8:12;
  ctx.beginPath();for(let k=0;k<n;k++){const a0=k/n*Math.PI*2,a1=(k+.5)/n*Math.PI*2;
    ctx.lineTo(x+Math.cos(a0)*s*1.18,y+Math.sin(a0)*s*1.18);ctx.lineTo(x+Math.cos(a1)*s*1.18,y+Math.sin(a1)*s*1.18);ctx.lineTo(x+Math.cos(a1)*s*.98,y+Math.sin(a1)*s*.98);ctx.lineTo(x+Math.cos((k+1)/n*Math.PI*2)*s*.98,y+Math.sin((k+1)/n*Math.PI*2)*s*.98)}
  ctx.closePath();ctx.fillStyle='#2a2017';ctx.fill();
  ctx.beginPath();ctx.arc(x,y,s*.86,0,7);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='#160f08';ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,s*.34,0,7);ctx.fillStyle='rgba(22,15,8,.85)';ctx.fill();
  if(p>=20000){ctx.beginPath();ctx.arc(x,y,s*.6,0,7);ctx.strokeStyle='rgba(22,15,8,.6)';ctx.stroke()}
}
function drawCompass(x,y,r){
  ctx.save();ctx.translate(x,y);ctx.globalAlpha=.85;
  ctx.strokeStyle='rgba(236,222,186,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r*.78,0,7);ctx.stroke();
  for(let k=0;k<32;k++){const a=k/32*Math.PI*2,l=k%4===0?.14:.07;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a)*r*(1-l),Math.sin(a)*r*(1-l));ctx.stroke()}
  const pt=(a,l,w)=>{ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a-w)*l*.28,Math.sin(a-w)*l*.28);ctx.lineTo(Math.cos(a)*l,Math.sin(a)*l);ctx.closePath()};
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2-Math.PI/2,l=k%2?r*.62:r*.95;
    pt(a,l,.35);ctx.fillStyle=k===0?'#c9483a':'#e9dcb6';ctx.fill();
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a+.35)*l*.28,Math.sin(a+.35)*l*.28);ctx.lineTo(Math.cos(a)*l,Math.sin(a)*l);ctx.closePath();ctx.fillStyle=k===0?'#7d2219':'#8f8263';ctx.fill()}
  ctx.font=`600 ${Math.round(r*.32)}px 'Cormorant SC', Georgia, serif`;ctx.fillStyle='#efe2bd';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('N',0,-r-r*.28);
  ctx.restore();
}
function drawScale(x,y){
  const s=base*view.z;const leaguesPerCell=12;let L=100;const opts=[25,50,100,200,400,800];for(const o of opts){if(o/leaguesPerCell*s>70){L=o;break}}
  const w=L/leaguesPerCell*s;
  ctx.save();ctx.fillStyle='rgba(16,20,34,.55)';ctx.fillRect(x-6,y-16,w+12,26);
  ctx.strokeStyle='#efe2bd';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w,5);ctx.fillStyle='#efe2bd';ctx.fillRect(x+.5,y+.5,w/4,5);ctx.fillRect(x+w/2+.5,y+.5,w/4,5);
  ctx.font=`11px 'Alegreya Sans SC', 'Trebuchet MS', sans-serif`;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText(`${L} leagues`,x,y-4);ctx.restore();
}

// the static layers (land, territory, borders, roads) are painted once per view and border change
const bgCv=document.createElement('canvas'),bgx=bgCv.getContext('2d');let bgKey='',polVer=0;
function drawBackground(s,political){
  if(bgCv.width!==cv.width||bgCv.height!==cv.height){bgCv.width=cv.width;bgCv.height=cv.height}
  const c=bgx;c.setTransform(1,0,0,1,0,0);c.fillStyle='#0d1626';c.fillRect(0,0,bgCv.width,bgCv.height);
  c.setTransform(dpr*s,0,0,dpr*s,dpr*view.ox,dpr*view.oy);
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(G.canvas,0,0,W,H);
  if(S.winter>S.year){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(240,246,255,.55)');g.addColorStop(.45,'rgba(230,240,252,.12)');g.addColorStop(.55,'rgba(230,240,252,.12)');g.addColorStop(1,'rgba(240,246,255,.55)');c.fillStyle=g;c.fillRect(0,0,W,H)}
  if(mode!=='terrain'){c.globalAlpha=mode==='density'?.85:mode==='trade'?.35:.4;c.drawImage(polCv,0,0,W,H);c.globalAlpha=1}
  c.lineCap='round';c.lineJoin='round';
  if(political){
    if(mode==='realms'){c.globalAlpha=.55;c.lineWidth=3.2/s;for(let a=0;a<paths.edge.length;a++){if(!paths.edge[a])continue;c.strokeStyle=S.realms[a].color;c.stroke(paths.edge[a])}c.globalAlpha=1}
    c.strokeStyle='rgba(28,22,16,.32)';c.lineWidth=1/s;c.stroke(paths.soft);
    c.strokeStyle='rgba(24,18,12,.75)';c.lineWidth=1.3/s;c.stroke(paths.hard);
  }
  c.strokeStyle='#f3cf6e';c.lineWidth=2.6/s;c.stroke(paths.sel);
  if(mode!=='density'){c.strokeStyle='rgba(74,52,30,.62)';c.lineWidth=Math.max(.9,1.1*Math.sqrt(view.z))/s;c.setLineDash([2.4/s,2/s]);c.stroke(net.roads);c.setLineDash([])}
}
function draw(now,dt){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0d1626';ctx.fillRect(0,0,cw,ch);
  if(!G||!S)return;
  const s=base*view.z,T=now/1000;
  const political=mode!=='terrain'&&mode!=='density';
  if(dirtyNet){rebuildNet();bgKey=''}
  const key=[cw,ch,dpr,view.z.toFixed(4),view.ox.toFixed(1),view.oy.toFixed(1),mode,polVer,S.winter>S.year].join('|');
  if(key!==bgKey){bgKey=key;drawBackground(s,political)}
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(bgCv,0,0);
  ctx.setTransform(dpr*s,0,0,dpr*s,dpr*view.ox,dpr*view.oy);
  if(S.scars.length){ctx.globalAlpha=.5+Math.sin(T*2)*.12;ctx.drawImage(scarCv,0,0,W,H);ctx.globalAlpha=1}
  ctx.lineCap='round';ctx.lineJoin='round';
  if(political){ctx.strokeStyle='rgba(222,62,40,.95)';ctx.lineWidth=2.2/s;ctx.setLineDash([4/s,3/s]);ctx.lineDashOffset=-T*12/s;ctx.stroke(paths.war);ctx.setLineDash([])}
  if(mode!=='density'){
    const tm=mode==='trade'?1.6:1;
    for(const r of net.land){ctx.strokeStyle='rgba(240,196,92,.8)';ctx.lineWidth=(1+r.v*.12)*tm/s;ctx.setLineDash([5/s,4/s]);ctx.lineDashOffset=-T*14/s;ctx.stroke(r.p)}
    for(const r of net.sea){ctx.strokeStyle='rgba(230,240,240,.55)';ctx.lineWidth=(1+r.v*.1)*tm/s;ctx.setLineDash([2/s,5/s]);ctx.lineDashOffset=-T*10/s;ctx.stroke(r.p)}
    ctx.setLineDash([]);
  }
  // ruins
  if(hover&&hover.cell!=null){ctx.strokeStyle='rgba(244,236,216,.8)';ctx.lineWidth=1.2/s;ctx.strokeRect(hover.cell%W,(hover.cell/W)|0,1,1)}
  // clouds
  if(showClouds&&clouds){
    const ox=(T*.35)%W,oy=(T*.12)%H;
    const sheet=(img,dx,dy)=>{for(const ax of[ox-W,ox])for(const ay of[oy-H,oy])ctx.drawImage(img,ax+dx,ay+dy,W,H)};
    ctx.globalAlpha=view.z>3?.22:.36;sheet(clouds,0,0);
    ctx.globalAlpha=1;
  }
  // ---------- screen space ----------
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const sx=x=>view.ox+(x+.5)*s,sy=y=>view.oy+(y+.5)*s;
  const boxes=[];
  const fits=(x,y,w,h)=>{for(const b of boxes)if(x<b[0]+b[2]&&x+w>b[0]&&y<b[1]+b[3]&&y+h>b[1])return false;boxes.push([x,y,w,h]);return true};
  // ruins
  ctx.strokeStyle='rgba(44,30,20,.85)';ctx.lineWidth=1.3;
  for(const r of S.ruins){const x=sx(r.x),y=sy(r.y);if(x<-10||y<-10||x>cw+10||y>ch+10)continue;
    if(view.z>=2.4)drawIcon(ctx,'ruin',x,y,13,'rgba(70,52,36,.9)',['rgba(240,228,200,.55)',2]);else{const q=2.4;ctx.beginPath();ctx.moveTo(x-q,y-q);ctx.lineTo(x+q,y+q);ctx.moveTo(x+q,y-q);ctx.lineTo(x-q,y+q);ctx.stroke()}}
  // resources
  if(view.z>=2.4||mode==='trade'){const sz=mode==='trade'&&view.z<2.4?7:Math.min(13,4+view.z*1.6);
    for(let i=0;i<N;i++){const k=G.res[i];if(!k)continue;if(mode==='trade'&&view.z<2.4&&S.owner[i]<0)continue;const x=sx(i%W),y=sy((i/W)|0);if(x<-10||y<-10||x>cw+10||y>ch+10)continue;
      drawIcon(ctx,RES[k].k,x,y,sz,'rgba(250,236,196,.82)',['rgba(20,14,8,.6)',2])}}
  // realm names along each realm's long axis
  if(political){
    ctx.textAlign='center';ctx.textBaseline='middle';
    const rs=S.realms.filter(r=>r.alive&&(X.cells[r.id]||0)>=28).sort((a,b)=>X.cells[b.id]-X.cells[a.id]);
    for(const r of rs){const c=X.cells[r.id],x=sx(X.sx[r.id]/c),y=sy(X.sy[r.id]/c);
      const fs=clamp(Math.sqrt(c)*.62*Math.sqrt(view.z),10,28);ctx.font=`600 ${fs}px 'Cormorant SC', Georgia, serif`;
      const label=r.name.toUpperCase();const sp=fs*.16;const w=ctx.measureText(label).width+sp*label.length;
      const ang=clamp(X.angle[r.id]||0,-.45,.45),ca=Math.abs(Math.cos(ang)),sa=Math.abs(Math.sin(ang));
      const bw=w*ca+fs*sa,bh=w*sa+fs*ca;if(!fits(x-bw/2-8,y-bh/2-4,bw+16,bh+8))continue;
      ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.letterSpacing=sp+'px';
      ctx.lineWidth=3.5;ctx.strokeStyle='rgba(18,14,10,.4)';ctx.strokeText(label,0,0);
      ctx.fillStyle='rgba(250,242,222,.8)';ctx.fillText(label,0,0);ctx.letterSpacing='0px';ctx.restore();
    }
  }
  // settlements
  const zk=Math.min(1.7,Math.sqrt(view.z));
  const order=S.sets.slice().sort((a,b)=>a.pop-b.pop);
  for(const t of order){const x=sx(t.x),y=sy(t.y);if(x<-20||y<-20||x>cw+20||y>ch+20)continue;
    const R=S.realms[t.realm],isCap=R.cap===t.id;drawMarker(t,x,y,0,isCap,zk);
    if(t.w.length)drawIcon(ctx,'wonder',x+7*zk,y-7*zk,9*zk,'#f3cf6e',['#1a120a',1.5]);
    if(sel&&sel.t==='s'&&sel.id===t.id){ctx.strokeStyle='#f3cf6e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,10*zk+Math.sin(T*4)*1.5,0,7);ctx.stroke()}
  }
  // capitals carry their arms
  for(const r of S.realms){if(!r.alive)continue;const t=X.byId&&X.byId.get(r.cap);if(!t)continue;if((X.cells[r.id]||0)<12&&view.z<1.8)continue;
    const x=sx(t.x),y=sy(t.y);if(x<-20||y<-30||x>cw+20||y>ch+20)continue;const img=armsImage(r);const w=Math.round(11*zk+3),h=Math.round(w*1.2);
    if(img){ctx.drawImage(img,x-w/2,y-h-6*zk,w,h);boxes.push([x-w/2,y-h-6*zk,w,h])}}
  // settlement labels
  ctx.textAlign='left';ctx.textBaseline='middle';
  const minPop=view.z>=3?600:view.z>=1.8?3000:11000;
  const lab=S.sets.filter(t=>t.pop>=minPop||(S.realms[t.realm].cap===t.id&&(view.z>=1.6||(X.cells[t.realm]||0)>=50))||(sel&&sel.t==='s'&&sel.id===t.id)).sort((a,b)=>b.pop-a.pop);
  for(const t of lab){const x=sx(t.x),y=sy(t.y),big=t.pop>15000||S.realms[t.realm].cap===t.id;const fs=big?14:12;
    ctx.font=`${big?700:600} ${fs}px 'Cormorant Garamond', Georgia, serif`;const w=ctx.measureText(t.name).width;const off=(t.pop<6000?5:8)*zk;
    const lx=x+off;if(!fits(lx,y-fs/2,w,fs))continue;
    ctx.lineWidth=3.2;ctx.strokeStyle='rgba(14,10,6,.78)';ctx.strokeText(t.name,lx,y);ctx.fillStyle=big?'#fff3d6':'#f2e8d0';ctx.fillText(t.name,lx,y);
  }
  // armies at the fronts
  for(const w of S.wars){if(w.fx==null)continue;w._x=w._x==null?w.fx:lerp(w._x,w.fx,Math.min(1,dt*2));w._y=w._y==null?w.fy:lerp(w._y,w.fy,Math.min(1,dt*2));
    const x=sx(w._x),y=sy(w._y);if(x<-30||y<-30||x>cw+30||y>ch+30)continue;const A=S.realms[w.a],Bb=S.realms[w.b];const k=Math.min(1.3,.8+view.z*.12);
    for(const[R,dx]of[[A,-9],[Bb,9]]){const fx_=x+dx*k,fy_=y-2;ctx.strokeStyle='#1a120a';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(fx_,fy_+9*k);ctx.lineTo(fx_,fy_-10*k);ctx.stroke();
      const wave=Math.sin(T*5+dx)*1.2,dir=dx<0?1:-1;ctx.beginPath();ctx.moveTo(fx_,fy_-10*k);ctx.quadraticCurveTo(fx_+dir*5*k,fy_-10*k+wave,fx_+dir*10*k,fy_-8*k);ctx.lineTo(fx_+dir*10*k,fy_-2*k);ctx.quadraticCurveTo(fx_+dir*5*k,fy_-4*k-wave,fx_,fy_-3*k);ctx.closePath();
      ctx.fillStyle=R.color;ctx.fill();ctx.lineWidth=1;ctx.stroke()}
    ctx.beginPath();ctx.arc(x,y+2,7*k,0,7);ctx.fillStyle='rgba(30,10,8,.85)';ctx.fill();ctx.strokeStyle='#e0533b';ctx.lineWidth=1.2;ctx.stroke();
    drawIcon(ctx,'war',x,y+2,10*k,'#f6dcc8');boxes.push([x-18,y-14,36,26]);
  }
  // monsters
  for(const b of S.beasts){if(!b.alive)continue;const x=sx(b.x),y=sy(b.y)+Math.sin(T*2+b.id)*1.5;const k=Math.min(1.5,.85+view.z*.12);
    const col=b.kind==='dragon'?'#e0553a':b.kind==='lich'?'#8fe0b0':b.kind==='serpent'?'#6fc6e0':'#d6b07a';
    const gr=ctx.createRadialGradient(x,y,2,x,y,18*k);gr.addColorStop(0,col+'aa');gr.addColorStop(1,col+'00');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,18*k,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(x,y,9*k,0,7);ctx.fillStyle='#120b08';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=col;ctx.stroke();
    drawIcon(ctx,b.kind==='serpent'?'serpent':b.kind,x,y,13*k,col);
    if(view.z>=1.4){ctx.font=`italic 600 12px 'Cormorant Garamond', Georgia, serif`;const nm=b.name.split(' the ')[0].split(' of ')[0];const w=ctx.measureText(nm).width;
      if(fits(x-w/2,y+11*k,w,13)){ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(14,10,6,.85)';ctx.strokeText(nm,x,y+17*k);ctx.fillStyle=col;ctx.fillText(nm,x,y+17*k);ctx.textAlign='left'}}
  }
  // event ripples, ships under sail
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];
    if(f.ship){const a=Math.max(0,(now-f.t)/3200);if(a>=1){f.ship=false;f.t=now;continue}
      const x0=f.t0x,y0=f.t0y,x1=f.x,y1=f.y,mx=(x0+x1)/2-(y1-y0)*.2,my=(y0+y1)/2+(x1-x0)*.2,e=a<.5?2*a*a:1-Math.pow(-2*a+2,2)/2;
      const px=(1-e)*(1-e)*x0+2*(1-e)*e*mx+e*e*x1,py=(1-e)*(1-e)*y0+2*(1-e)*e*my+e*e*y1;
      ctx.globalAlpha=Math.min(1,(1-a)*4);drawIcon(ctx,'ship',sx(px),sy(py)+Math.sin(T*6)*1,18,'#f4ead0',['#140d06',2.5]);ctx.globalAlpha=1;continue}
    const a=Math.max(0,(now-f.t)/(f.imp>=2?2400:1500));if(a>=1){fx.splice(i,1);continue}
    const x=sx(f.x),y=sy(f.y),gold=f.imp>=2;
    const col=f.c==='war'||f.c==='battle'||f.c==='siege'||f.c==='capture'?'#ff6a4a':f.c==='plague'||f.c==='blight'?'#b07cff':gold?'#f3cf6e':'#f4ecd8';
    ctx.globalAlpha=1-a;ctx.strokeStyle=col;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y,4+a*(gold?34:22),0,7);ctx.stroke();
    if(gold){ctx.beginPath();ctx.arc(x,y,4+a*18,0,7);ctx.stroke()}
    if(f.imp>=1&&ICONS[f.c]){const k=1-Math.pow(1-Math.min(1,a*3),3);drawIcon(ctx,f.c,x,y-14-k*8,gold?18:14,col,['rgba(10,6,4,.9)',2.5])}
    ctx.globalAlpha=1;
  }
  // furniture: compass and scale
  if(cw>520){drawCompass(cw-62,ch-120,34);drawScale(cw-150,ch-56)}
}
