/* =====================================================================
   TERRAIN · the land itself, derived entirely from the seed
   ===================================================================== */
function fields(nx,ny,seed){
  const A=W/H,X0=nx*A*2.6,Y0=ny*2.6;
  const wx=(fbm(X0*.8,Y0*.8,seed+11,3)-.5)*1.6,wy=(fbm(X0*.8+9.1,Y0*.8+3.7,seed+17,3)-.5)*1.6;
  let e=fbm(X0+wx,Y0+wy,seed,6);
  // ridges sharpen the mountain chains
  const rr=1-Math.abs(fbm(X0*1.7+3,Y0*1.7+8,seed+23,4)*2-1);e+=Math.max(0,e-.5)*rr*rr*.35;
  const dx=Math.abs(nx-.5)*2,dy=Math.abs(ny-.5)*2,d=Math.max(dx,dy*.95);
  e=e-Math.pow(d,5)*.45+.02*(1-d);
  return [e,fbm(X0*1.3+40,Y0*1.3+11,seed+31,4),fbm(X0*1.1+70,Y0*1.1+5,seed+47,3)];
}
function tempAt(ny,e,tn,g){return(1-Math.abs(ny-.5)*2)*.85+(tn-.5)*.6+.12-Math.max(0,e-g.sea)*1.6}
function biomeOf(e,m,t,g){
  if(e<g.sea)return e<g.sea-.05?B.DEEP:B.SEA;
  if(e>g.peak)return B.PEAK;
  if(e>g.mount)return B.MOUNTAIN;
  if(t<.1)return B.SNOW;
  if(t<.24)return B.TUNDRA;
  if(e>g.hill)return B.HILLS;
  if(t<.38)return m>.45?B.TAIGA:B.TUNDRA;
  if(m<.3)return t>.55?B.DESERT:B.PLAINS;
  if(m>.7&&e<g.sea+.035)return B.SWAMP;
  if(t>.72)return m>.58?B.JUNGLE:B.SAVANNA;
  if(m>.52)return B.FOREST;
  return B.PLAINS;
}
function heightFrac(e,g){
  if(e<g.hill)return(e-g.sea)/(g.hill-g.sea)*.5;
  if(e<g.mount)return .5+(e-g.hill)/(g.mount-g.hill)*.25;
  return .75+(e-g.mount)/(g.peak-g.mount)*.25;
}
const C_LUSH=[64,98,52],C_GRASS=[138,150,84],C_DRY=[186,168,110],C_SAND=[220,196,140],C_JUNGLE=[44,84,50],C_COLD=[128,138,124],
  C_SNOW=[238,240,242],C_ROCK=[118,108,98],C_HILL=[142,130,96],C_MARSH=[84,98,72];
function landColor(e,m,t,g){
  let c=mix3(C_DRY,C_GRASS,smooth(.18,.45,m));c=mix3(c,C_LUSH,smooth(.5,.88,m));
  c=mix3(c,C_SAND,smooth(.5,.7,t)*(1-smooth(.18,.36,m)));
  c=mix3(c,C_JUNGLE,smooth(.68,.84,t)*smooth(.55,.8,m));
  c=mix3(c,C_MARSH,smooth(.66,.8,m)*(1-smooth(0,.035,e-g.sea))*.7);
  c=mix3(c,C_COLD,1-smooth(.2,.42,t));
  const h=heightFrac(e,g);
  c=mix3(c,C_HILL,smooth(.45,.62,h)*.55);
  c=mix3(c,C_ROCK,smooth(.7,.84,h));
  c=mix3(c,C_SNOW,Math.max(smooth(.93,1.03,h),1-smooth(.05,.15,t)));
  return c;
}
function seaColor(e,g){
  const t=clamp((g.sea-e)/.16,0,1);
  return t<.35?mix3([78,134,150],[38,86,114],t/.35):mix3([38,86,114],[14,38,64],(t-.35)/.65);
}
function contour(E,w,h,lev){
  // marching squares → flat array of segments x0,y0,x1,y1 (sample coordinates)
  const out=[];
  for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){
    const a=E[y*w+x],b=E[y*w+x+1],c=E[(y+1)*w+x+1],d=E[(y+1)*w+x];
    const idx=(a>lev?8:0)|(b>lev?4:0)|(c>lev?2:0)|(d>lev?1:0);if(idx===0||idx===15)continue;
    const t=(p,q)=>(lev-p)/(q-p);
    const T=[x+t(a,b),y],R=[x+1,y+t(b,c)],Bo=[x+t(d,c),y+1],L=[x,y+t(a,d)];
    const P=(p,q)=>out.push(p[0],p[1],q[0],q[1]);
    switch(idx){case 1:case 14:P(L,Bo);break;case 2:case 13:P(Bo,R);break;case 3:case 12:P(L,R);break;case 4:case 11:P(T,R);break;
      case 5:P(L,T);P(Bo,R);break;case 6:case 9:P(T,Bo);break;case 7:case 8:P(L,T);break;case 10:P(T,R);P(L,Bo);break}
  }
  return out;
}
function strokeSegs(c,segs,sc){c.beginPath();for(let k=0;k<segs.length;k+=4){c.moveTo((segs[k]+.5)*sc,(segs[k+1]+.5)*sc);c.lineTo((segs[k+2]+.5)*sc,(segs[k+3]+.5)*sc)}c.stroke()}

function genTerrain(seed){
  const elev=new Float32Array(N),mo=new Float32Array(N),tn=new Float32Array(N);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const f=fields((x+.5)/W,(y+.5)/H,seed),i=y*W+x;elev[i]=f[0];mo[i]=f[1];tn[i]=f[2]}
  const sorted=Float32Array.from(elev).sort();const si=Math.floor(N*.55);const land=sorted.subarray(si);
  const g={seed,sea:sorted[si],hill:land[Math.floor(land.length*.72)],mount:land[Math.floor(land.length*.88)],peak:land[Math.floor(land.length*.975)],
    mMin:1,mMax:0,elev,biome:new Uint8Array(N),fert:new Float32Array(N),river:new Uint8Array(N),coast:new Uint8Array(N),best:new Float32Array(N),
    nearMtn:new Uint8Array(N),res:new Uint8Array(N),seaDist:new Uint8Array(N),land:0,rivers:[]};
  for(let i=0;i<N;i++){if(mo[i]<g.mMin)g.mMin=mo[i];if(mo[i]>g.mMax)g.mMax=mo[i]}
  const nm=m=>clamp((m-g.mMin)/(g.mMax-g.mMin),0,1);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;g.biome[i]=biomeOf(elev[i],nm(mo[i]),tempAt((y+.5)/H,elev[i],tn[i],g),g)}
  let landN=0;for(let i=0;i<N;i++)if(isLand(g.biome[i]))landN++;g.land=landN;
  // rivers
  const lr=mulberry(seed^0x2545F491);
  const src=[];for(let i=0;i<N;i++){const b=g.biome[i];if((b===B.HILLS||b===B.MOUNTAIN)&&nm(mo[i])>.42)src.push(i)}
  for(let i=src.length-1;i>0;i--){const j=Math.floor(lr()*(i+1));[src[i],src[j]]=[src[j],src[i]]}
  const want=Math.round(landN/300);
  for(const s of src){
    if(g.rivers.length>=want)break;if(g.river[s])continue;
    const path=[s],seen=new Set([s]);let cur=s,ok=false;
    for(let step=0;step<260;step++){
      const cx=cur%W,cy=(cur/W)|0;let best=-1,be=1e9;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=W||y>=H)continue;const j=y*W+x;if(seen.has(j))continue;const e=elev[j]+(dx&&dy?.002:0);if(e<be){be=e;best=j}}
      if(best<0||be>elev[cur]+.015)break;
      path.push(best);seen.add(best);
      if(!isLand(g.biome[best])||g.river[best]){ok=true;break}
      cur=best;
    }
    if(ok&&path.length>=6){for(const c of path)if(isLand(g.biome[c]))g.river[c]=1;g.rivers.push(path)}
  }
  // derived per-cell data
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,b=g.biome[i];if(!isLand(b))continue;
    let co=0,mt=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const bb=g.biome[yy*W+xx];if(Math.abs(dx)+Math.abs(dy)===1&&!isLand(bb))co=1;if(bb===B.MOUNTAIN||bb===B.PEAK)mt=1}
    g.coast[i]=co;g.nearMtn[i]=mt;g.fert[i]=BIOME[b].f+(g.river[i]?.35:0)+(co?.15:0);
    let bh=0;for(const r of RK)bh=Math.max(bh,RACES[r].habit[b]);g.best[i]=bh;
    for(let k=1;k<RES.length;k++){const R=RES[k];if((R.b.includes(b)||(R.b[0]==='coast'&&co))&&lr()<R.p){g.res[i]=k;break}}
  }
  // distance to sea (for naval reach), BFS over water from the coast
  g.seaDist.fill(255);const q=[];
  for(let i=0;i<N;i++)if(!isLand(g.biome[i])){const x=i%W,y=(i/W)|0;for(const[dx,dy]of DIRS){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;if(isLand(g.biome[yy*W+xx])){g.seaDist[i]=0;q.push(i);break}}}
  for(let h=0;h<q.length;h++){const i=q[h],x=i%W,y=(i/W)|0;for(const[dx,dy]of DIRS){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const j=yy*W+xx;if(!isLand(g.biome[j])&&g.seaDist[j]===255){g.seaDist[j]=Math.min(254,g.seaDist[i]+1);q.push(j)}}}
  paintTerrain(g,seed,nm);
  return g;
}

function paintTerrain(g,seed,nm){
  const Ep=new Float32Array(PW*PH),Mp=new Float32Array(PW*PH),Tp=new Float32Array(PW*PH);
  for(let py=0;py<PH;py++)for(let px=0;px<PW;px++){const ny=(py+.5)/PH,f=fields((px+.5)/PW,ny,seed),i=py*PW+px;Ep[i]=f[0];Mp[i]=nm(f[1]);Tp[i]=tempAt(ny,f[0],f[2],g)}
  const base=document.createElement('canvas');base.width=PW;base.height=PH;const bc=base.getContext('2d');
  const img=bc.createImageData(PW,PH),d=img.data;
  for(let py=0;py<PH;py++)for(let px=0;px<PW;px++){
    const i=py*PW+px,e=Ep[i];let c;
    if(e<g.sea){c=seaColor(e,g);const w=(vnoise(px*.09,py*.09,seed+5)-.5)*8;c=[c[0]+w,c[1]+w,c[2]+w*1.2]}
    else{c=landColor(e,Mp[i],Tp[i],g);
      const ex=(px<PW-1?Ep[i+1]:e)-(px>0?Ep[i-1]:e),ey=(py<PH-1?Ep[i+PW]:e)-(py>0?Ep[i-PW]:e);
      const h=heightFrac(e,g);const sh=clamp((ex+ey)*-22*(1+smooth(.5,.85,h)*1.6),-.42,.42);
      c=[c[0]*(1+sh),c[1]*(1+sh),c[2]*(1+sh*1.05)];
      if(e-g.sea<.0035)c=mix3(c,[210,194,150],.5);
    }
    const gr=(hash2(px,py,seed+7)-.5)*7;
    d[i*4]=clamp(c[0]+gr,0,255);d[i*4+1]=clamp(c[1]+gr,0,255);d[i*4+2]=clamp(c[2]+gr,0,255);d[i*4+3]=255;
  }
  bc.putImageData(img,0,0);
  // painted at 1.5x the layout resolution so zoomed views stay crisp; all drawing below uses layout units
  const TS=1.5,cvs=document.createElement('canvas');cvs.width=RW*TS;cvs.height=RH*TS;const c=cvs.getContext('2d');c.setTransform(TS,0,0,TS,0,0);
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(base,0,0,RW,RH);
  const sc=RW/PW;c.lineCap='round';c.lineJoin='round';
  // depth contours and the inked shoreline
  const lines=[[.03,.07,1],[.016,.1,1],[.007,.16,1.1]];
  for(const[off,a,w]of lines){c.strokeStyle=`rgba(214,232,232,${a})`;c.lineWidth=w;strokeSegs(c,contour(Ep,PW,PH,g.sea-off),sc)}
  const coast=contour(Ep,PW,PH,g.sea);
  c.strokeStyle='rgba(240,232,206,.28)';c.lineWidth=3.2;strokeSegs(c,coast,sc);
  c.strokeStyle='rgba(38,30,22,.85)';c.lineWidth=1.3;strokeSegs(c,coast,sc);
  // rivers, widening toward the sea
  for(const p of g.rivers){
    const pts=p.map(j=>[((j%W)+.5)*KR,(((j/W)|0)+.5)*KR]);
    for(let k=0;k<pts.length-1;k++){
      const a=k?[(pts[k-1][0]+pts[k][0])/2,(pts[k-1][1]+pts[k][1])/2]:pts[0],b=[(pts[k][0]+pts[k+1][0])/2,(pts[k][1]+pts[k+1][1])/2];
      c.beginPath();c.moveTo(a[0],a[1]);c.quadraticCurveTo(pts[k][0],pts[k][1],b[0],b[1]);
      c.strokeStyle='rgba(40,82,112,.95)';c.lineWidth=.7+2.6*(k/pts.length);c.stroke();
    }
  }
  drawGlyphs(c,g,seed);
  // paper grain and stains
  const tile=document.createElement('canvas');tile.width=tile.height=256;const tc=tile.getContext('2d');const ti=tc.createImageData(256,256);
  for(let i=0;i<256*256;i++){const v=128+(hash2(i%256,(i/256)|0,seed+77)-.5)*70;ti.data[i*4]=ti.data[i*4+1]=ti.data[i*4+2]=v;ti.data[i*4+3]=255}
  tc.putImageData(ti,0,0);
  c.globalCompositeOperation='overlay';c.globalAlpha=.16;c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,0,RW,RH);
  const st=document.createElement('canvas');st.width=180;st.height=110;const sx=st.getContext('2d');const si=sx.createImageData(180,110);
  for(let i=0;i<180*110;i++){const v=fbm((i%180)/22,((i/180)|0)/22,seed+91,4);const k=128+(v-.5)*120;si.data[i*4]=k;si.data[i*4+1]=k*.96;si.data[i*4+2]=k*.86;si.data[i*4+3]=255}
  sx.putImageData(si,0,0);c.globalAlpha=.22;c.drawImage(st,0,0,RW,RH);
  c.globalCompositeOperation='multiply';c.globalAlpha=1;
  const vg=c.createRadialGradient(RW/2,RH/2,RH*.42,RW/2,RH/2,RW*.62);vg.addColorStop(0,'rgba(255,255,255,1)');vg.addColorStop(1,'rgba(150,140,120,1)');
  c.fillStyle=vg;c.fillRect(0,0,RW,RH);
  c.globalCompositeOperation='source-over';
  // graticule
  c.strokeStyle='rgba(230,220,190,.07)';c.lineWidth=1;c.beginPath();
  for(let x=0;x<=W;x+=15){c.moveTo(x*KR,0);c.lineTo(x*KR,RH)}for(let y=0;y<=H;y+=15){c.moveTo(0,y*KR);c.lineTo(RW,y*KR)}c.stroke();
  g.canvas=cvs;
}

function drawGlyphs(c,g,seed){
  const r=mulberry(seed^0x51ED27);const gl=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,b=g.biome[i];const px=(x+.5)*KR,py=(y+.5)*KR;
    if(b===B.MOUNTAIN||b===B.PEAK){if(r()<.62)gl.push({t:'m',x:px+(r()-.5)*5,y:py+(r()-.5)*4,s:KR*(b===B.PEAK?2.1:1.5)*(.85+r()*.4),snow:b===B.PEAK||tempAt((y+.5)/H,g.elev[i],.5,g)<.2})}
    else if(b===B.HILLS){if(r()<.32)gl.push({t:'h',x:px+(r()-.5)*5,y:py+(r()-.5)*5,s:KR*(.9+r()*.5)})}
    else if(b===B.FOREST||b===B.JUNGLE||b===B.TAIGA){const n=b===B.JUNGLE?3:2;for(let k=0;k<n;k++)if(r()<.62)gl.push({t:b===B.TAIGA?'p':b===B.JUNGLE?'j':'f',x:px+(r()-.5)*KR,y:py+(r()-.5)*KR,s:KR*(.42+r()*.2)})}
    else if(b===B.SWAMP){if(r()<.4)gl.push({t:'s',x:px+(r()-.5)*5,y:py+(r()-.5)*5,s:KR*.6})}
    else if(b===B.DESERT){if(r()<.22)gl.push({t:'d',x:px+(r()-.5)*6,y:py+(r()-.5)*6,s:KR*(.8+r()*.5)})}
  }
  gl.sort((a,b)=>a.y-b.y);
  const ink='rgba(38,30,22,.78)';
  for(const o of gl){const{x,y,s}=o;
    if(o.t==='m'){const h=s*.78;
      c.beginPath();c.moveTo(x-s/2,y+h*.35);c.lineTo(x-s*.04,y-h*.65);c.lineTo(x+s/2,y+h*.35);c.closePath();c.fillStyle='rgba(150,138,122,.92)';c.fill();
      c.beginPath();c.moveTo(x-s*.04,y-h*.65);c.lineTo(x+s/2,y+h*.35);c.lineTo(x+s*.08,y+h*.35);c.closePath();c.fillStyle='rgba(78,68,60,.75)';c.fill();
      if(o.snow){c.beginPath();c.moveTo(x-s*.04,y-h*.65);c.lineTo(x-s*.2,y-h*.3);c.lineTo(x-s*.08,y-h*.36);c.lineTo(x+s*.02,y-h*.24);c.lineTo(x+s*.16,y-h*.34);c.closePath();c.fillStyle='rgba(246,246,242,.95)';c.fill()}
      c.beginPath();c.moveTo(x-s/2,y+h*.35);c.lineTo(x-s*.04,y-h*.65);c.lineTo(x+s/2,y+h*.35);c.strokeStyle=ink;c.lineWidth=1.05;c.stroke();
      c.beginPath();c.moveTo(x+s*.12,y-h*.3);c.lineTo(x+s*.3,y+h*.1);c.moveTo(x+s*.2,y-h*.42);c.lineTo(x+s*.38,y-h*.02);c.lineWidth=.6;c.stroke();
    }else if(o.t==='h'){c.beginPath();c.moveTo(x-s/2,y+s*.15);c.quadraticCurveTo(x,y-s*.55,x+s/2,y+s*.15);c.strokeStyle=ink;c.lineWidth=.9;c.stroke();
      c.beginPath();c.moveTo(x+s*.05,y-s*.18);c.quadraticCurveTo(x+s*.3,y-s*.05,x+s*.38,y+s*.1);c.strokeStyle='rgba(38,30,22,.35)';c.stroke();
    }else if(o.t==='f'||o.t==='j'){const cr=o.t==='j'?[46,96,52]:[60,92,48];
      c.beginPath();c.moveTo(x,y+s*.9);c.lineTo(x,y+s*.2);c.strokeStyle='rgba(60,44,30,.7)';c.lineWidth=.8;c.stroke();
      c.beginPath();c.arc(x,y,s*.62,0,Math.PI*2);c.fillStyle=`rgb(${cr[0]},${cr[1]},${cr[2]})`;c.fill();
      c.beginPath();c.arc(x-s*.18,y-s*.18,s*.3,0,Math.PI*2);c.fillStyle='rgba(170,200,120,.28)';c.fill();
      c.beginPath();c.arc(x,y,s*.62,0,Math.PI*2);c.strokeStyle='rgba(30,40,22,.6)';c.lineWidth=.6;c.stroke();
    }else if(o.t==='p'){c.beginPath();c.moveTo(x,y-s*.9);c.lineTo(x+s*.48,y+s*.55);c.lineTo(x-s*.48,y+s*.55);c.closePath();c.fillStyle='rgb(48,76,58)';c.fill();c.strokeStyle='rgba(22,32,24,.65)';c.lineWidth=.6;c.stroke();
    }else if(o.t==='s'){c.strokeStyle='rgba(40,52,36,.7)';c.lineWidth=.7;c.beginPath();for(let k=-1;k<=1;k++){c.moveTo(x+k*s*.35,y+s*.3);c.lineTo(x+k*s*.42,y-s*.35)}c.moveTo(x-s*.6,y+s*.32);c.lineTo(x+s*.6,y+s*.32);c.stroke();
    }else if(o.t==='d'){c.beginPath();c.moveTo(x-s/2,y);c.quadraticCurveTo(x,y-s*.35,x+s/2,y+s*.05);c.strokeStyle='rgba(140,108,60,.5)';c.lineWidth=.8;c.stroke()}
  }
}

function genClouds(seed){
  // one seamless sheet the size of the map, wrapping in both directions
  const CW=360,CH=220,cv=document.createElement('canvas');cv.width=CW;cv.height=CH;const c=cv.getContext('2d'),im=c.createImageData(CW,CH);
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){const v=(fbmP(x/CW*9,y/CH*9,seed+333,5,9)+fbmP(x/CW*9,y/CH*9,seed+334,5,9))/2;const a=smooth(.47,.62,v);const i=(y*CW+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=255;im.data[i+3]=a*235}
  c.putImageData(im,0,0);return cv;
}
