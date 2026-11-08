/* =====================================================================
   SIMULATION · one call to stepYear() is one year
   ===================================================================== */
const art=n=>n.startsWith('Clan ')?'':'the ';
const rn=r=>art(r.name)+`<a class="ref r" data-ref="r${r.id}" style="--c:${r.color}">${r.name}</a>`;
const rnB=r=>`<a class="ref r" data-ref="r${r.id}" style="--c:${r.color}">${r.name}</a>`;
const rnOld=(r,name)=>art(name)+`<a class="ref r" data-ref="r${r.id}" style="--c:${r.color}">${name}</a>`;
const sn=s=>`<a class="ref s" data-ref="s${s.id}">${s.name}</a>`;
const bn=b=>`<a class="ref b" data-ref="b${b.id}">${b.name}</a>`;
const hn=h=>`<span class="hero">${h.name}${h.ep?' '+h.ep:''}</span>`;
const gn=p=>`<a class="ref g" data-ref="g${p.id}">${p.name}</a>`;
let fresh=[];const fx=[];
function log(imp,cat,text,refs,x,y,extra){
  if(text.startsWith('the '))text='T'+text.slice(1);
  const e={y:S.year,t:text,i:imp,c:cat,r:(refs||[]).filter(Boolean)};
  if(x!=null){e.x=x;e.yy=y}
  S.log.push(e);if(S.log.length>900)S.log.splice(0,S.log.length-900);
  if(imp>=2){S.legends.push(e);if(S.legends.length>400)S.legends.splice(0,S.legends.length-400)}
  fresh.push(e);
  if(x!=null&&!X.silent)fx.push(Object.assign({x,y,t:performance.now(),c:cat,imp},extra||{}));
}

/* ---------- realms, rulers, settlements ---------- */
function realmColor(id){const h=(id*137.508+S.seed%360)%360,s=46+(id*7%3)*9,l=50+(id*11%3)*5;return{css:`hsl(${h.toFixed(1)} ${s}% ${l}%)`,rgb:hsl2rgb(h,s/100,l/100)}}
function hsl2rgb(h,s,l){const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1));return[Math.round(f(0)*255),Math.round(f(8)*255),Math.round(f(4)*255)]}
function realmName(r){return r.custom||GOV[r.race][r.tier][r.tmpl%GOV[r.race][r.tier].length].replace('{c}',r.core)}
function makeRealm(race,o={}){
  const id=S.realms.length,c=realmColor(id);
  const parent=o.parent!=null?S.realms[o.parent]:null;
  const r={id,race,core:coreName(race),tier:o.tier??0,tmpl:ri(0,9),custom:o.custom||null,color:c.css,rgb:c.rgb,founded:S.year,alive:true,cap:-1,
    dynasty:placeName(race),tech:o.tech??0,stab:60,faith:o.faith??S.raceFaith[race],golden:0,regnal:{},parent:o.parent??null,fell:null,peak:0,peakCells:0,
    ruler:null,gold:o.gold??200,income:0,reigns:[],arms:makeArms(race,parent?parent.arms:null),colony:o.colony??null};
  r.name=realmName(r);r.ruler=newRuler(r);S.realms.push(r);return r;
}
function newRuler(r,o={}){
  const f=o.f??chance(.4),name=o.name||given(r.race,f),n=(r.regnal[name]||0)+1;r.regnal[name]=n;
  const traits=o.traits||[];while(traits.length<(chance(.45)?2:1)){const t=pick(TRAIT_KEYS);if(!traits.includes(t))traits.push(t)}
  return{name,n,f,born:S.year-Math.round(ri(16,36)*RACES[r.race].life),crowned:S.year,traits,dyn:r.dynasty};
}
const rulerStr=(r,ru=r.ruler)=>`${TITLES[r.race][r.tier][ru.f?1:0]} ${ru.name}${ru.n>1?' '+roman(ru.n):''}`;
const hasT=(r,t)=>r.ruler.traits.includes(t);
const kind=p=>p<400?'Hamlet':p<1500?'Village':p<6000?'Town':p<20000?'City':'Great city';
function closeReign(r,how){r.reigns.push({s:rulerStr(r),d:r.ruler.dyn,a:r.ruler.crowned,b:S.year,h:how});if(r.reigns.length>40)r.reigns.shift()}
function addSettlement(r,cell,pop){
  const s={id:S.nid++,name:placeName(r.race),x:cell%W,y:(cell/W)|0,cell,realm:r.id,pop,founded:S.year,w:[],port:!!G.coast[cell]};
  S.sets.push(s);S.owner[cell]=r.id;
  for(const[dx,dy]of DIRS){const x=s.x+dx,y=s.y+dy;if(x<0||y<0||x>=W||y>=H)continue;const j=y*W+x;if(S.owner[j]<0&&isLand(G.biome[j]))S.owner[j]=r.id}
  return s;
}
const setsOf=id=>X.sets[id]||[];
function agg(){
  const n=S.realms.length,sets=[],pop=new Float64Array(n),at=new Map(),byId=new Map();
  for(let k=0;k<n;k++)sets.push([]);
  for(const s of S.sets){sets[s.realm].push(s);pop[s.realm]+=s.pop;at.set(s.cell,s);byId.set(s.id,s)}
  X.sets=sets;X.pop=pop;X.at=at;X.byId=byId;X.atWar=new Set();for(const w of S.wars){X.atWar.add(w.a);X.atWar.add(w.b)}
  X.gens=new Set(S.greats.filter(p=>p.alive&&p.kind==='general').map(p=>p.realm));
}
const bkey=(a,b)=>a<b?a*4096+b:b*4096+a;
const rkey=(a,b)=>a<b?a+'-'+b:b+'-'+a;
function computeBorders(){
  const n=S.realms.length,cells=new Int32Array(n),sx=new Float64Array(n),sy=new Float64Array(n),sxx=new Float64Array(n),syy=new Float64Array(n),sxy=new Float64Array(n),
    border=new Map(),free=[],byR=[],resc=[];
  for(let k=0;k<n;k++){byR.push([]);resc.push(new Int16Array(RES.length))}
  const o=S.owner,bi=G.biome;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,a=o[i];
    if(a>=0){cells[a]++;sx[a]+=x;sy[a]+=y;sxx[a]+=x*x;syy[a]+=y*y;sxy[a]+=x*y;byR[a].push(i);if(G.res[i])resc[a][G.res[i]]++}
    else if(isLand(bi[i])&&G.best[i]>=.5)free.push(i);
    if(x<W-1){const b=o[i+1];if(a!==b&&a>=0&&b>=0){const k=bkey(a,b);border.set(k,(border.get(k)||0)+1)}}
    if(y<H-1){const b=o[i+W];if(a!==b&&a>=0&&b>=0){const k=bkey(a,b);border.set(k,(border.get(k)||0)+1)}}
  }
  X.cells=cells;X.sx=sx;X.sy=sy;X.border=border;X.free=free;X.byR=byR;X.resc=resc;
  X.angle=new Float64Array(n);
  for(let k=0;k<n;k++){const c=cells[k];if(c<5)continue;const mx=sx[k]/c,my=sy[k]/c,cxx=sxx[k]/c-mx*mx,cyy=syy[k]/c-my*my,cxy=sxy[k]/c-mx*my;X.angle[k]=.5*Math.atan2(2*cxy,cxx-cyy)}
}
function scarMul(){
  const m=new Float32Array(N).fill(1);
  S.scars=S.scars.filter(s=>s.until>S.year);
  for(const s of S.scars){const r2=s.r*s.r;for(let y=Math.max(0,s.y-s.r);y<=Math.min(H-1,s.y+s.r);y++)for(let x=Math.max(0,s.x-s.r);x<=Math.min(W-1,s.x+s.r);x++){const d=d2(x,y,s.x,s.y);if(d<=r2)m[y*W+x]=Math.min(m[y*W+x],s.kind==='blight'?.05:.3)}}
  X.scar=m;
}
function power(r){return(X.pop[r.id]||0)/100*RACES[r.race].martial*(1+r.tech*.08)*(.6+r.stab/250)*(hasT(r,'Brave')?1.1:1)*(X.gens&&X.gens.has(r.id)?1.25:1)*(1+Math.min(1,r.gold/6000)*.2)}
function aggr(r){let a=RACES[r.race].aggr;for(const t of r.ruler.traits)a+=TRAITS[t].ag||0;return clamp(a,.02,1.2)}
function near(x,y){
  let best=null,bd=1e9;for(const s of S.sets){const d=d2(s.x,s.y,x,y);if(d<bd){bd=d;best=s}}
  if(best&&bd<=100)return`near ${sn(best)}`;
  const v=y<H*.33?'north':y>H*.66?'south':'',h=x<W*.33?'west':x>W*.66?'east':'';
  return v||h?`in the wild ${v&&h?v+'-'+h:v||h}`:'in the wild heartlands';
}
function findWar(a,b){return S.wars.find(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a))}
function tooClose(x,y,m){const m2=m*m;for(const s of S.sets)if(d2(s.x,s.y,x,y)<m2)return true;return false}

function stepYear(){
  S.year++;
  agg();computeBorders();scarMul();
  growSettlements();
  expandTerritory();
  if(S.year%4===0)decayTerritory();
  foundSettlements();
  agg();economy();diplomacy();
  warStep();
  agg();rulerStep();upkeep();
  agg();beastStep();heroStep();greatStep();events();
  spawnPeoples();
  eraCheck();
  if(S.year%5===0){recordHist();buildNetworks()}
  dirtyPol=true;
}

function growSettlements(){
  const winter=S.winter>S.year;
  for(const s of S.sets){
    const r=S.realms[s.realm],R=RACES[r.race];let lf=0;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=s.x+dx,y=s.y+dy;if(x<0||y<0||x>=W||y>=H)continue;const i=y*W+x;if(S.owner[i]===s.realm||S.owner[i]<0)lf+=G.fert[i]*X.scar[i]}
    lf/=25;
    const cap=(500+lf*15000)*R.grow*(1+r.tech*.07)*(r.cap===s.id?1.45:1)*(r.golden>S.year?1.15:1)*(s.port?1.1:1)+s.w.length*2500+(X.tradeCity&&X.tradeCity.get(s.id)||0)*1500;
    let rate=.035*(1-s.pop/cap);if(X.atWar.has(r.id))rate-=.004;if(winter)rate-=.012;
    s.pop=Math.max(25,s.pop*(1+rate+(rand()-.5)*.012));
  }
}
function buildReach(mult){
  const reach=[];for(let k=0;k<S.realms.length;k++)reach.push([]);
  for(const s of S.sets){const R=2.6+Math.sqrt(s.pop)/20;reach[s.realm].push(s.x,s.y,R*R*mult)}
  return reach;
}
function inReach(arr,x,y){for(let k=0;k<arr.length;k+=3)if(d2(arr[k],arr[k+1],x,y)<=arr[k+2])return true;return false}
function expandTerritory(){
  const reach=buildReach(1),claims=[],o=S.owner;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(o[i]>=0||!isLand(G.biome[i]))continue;
    const st=(rand()*4)|0;let own=-1;
    for(let k=0;k<4;k++){const[dx,dy]=DIRS[(st+k)&3],xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const q=o[yy*W+xx];if(q>=0){own=q;break}}
    if(own<0)continue;const r=S.realms[own];
    if(!inReach(reach[own],x,y))continue;
    if(chance(.13*RACES[r.race].habit[G.biome[i]]*RACES[r.race].expand*(G.res[i]?1.6:1)))claims.push(i,own);
  }
  for(let k=0;k<claims.length;k+=2)o[claims[k]]=claims[k+1];
}
function decayTerritory(){
  const reach=buildReach(1.8),o=S.owner;
  for(let i=0;i<N;i++){const a=o[i];if(a<0)continue;if(!S.realms[a].alive){o[i]=-1;continue}
    if(!inReach(reach[a],i%W,(i/W)|0)&&chance(.35))o[i]=-1}
}
function foundSettlements(){
  for(const r of S.realms){if(!r.alive)continue;
    const ss=setsOf(r.id);if(!ss.length)continue;
    const avg=X.pop[r.id]/ss.length;const p=clamp((avg-700)/5000,0,.35)*RACES[r.race].expand;
    if(chance(p)){
      const cells=X.byR[r.id];if(cells&&cells.length){
        let best=-1,bs=0;
        for(let t=0;t<24;t++){const c=cells[(rand()*cells.length)|0];const x=c%W+ri(-3,3),y=((c/W)|0)+ri(-3,3);if(x<0||y<0||x>=W||y>=H)continue;
          const i=y*W+x;if(!isLand(G.biome[i]))continue;if(S.owner[i]!==r.id&&S.owner[i]!==-1)continue;
          const h=RACES[r.race].habit[G.biome[i]];if(h<.25)continue;if(tooClose(x,y,4))continue;
          const sc=G.fert[i]*h*X.scar[i]+(G.res[i]?.3:0)+rand()*.15;if(sc>bs){bs=sc;best=i}}
        if(best>=0){
          const src=ss.reduce((a,b)=>b.pop>a.pop?b:a);const moved=Math.min(src.pop*.15,ri(150,400));src.pop-=moved;
          const ns=addSettlement(r,best,moved);
          log(0,'found',`Settlers from ${sn(src)} founded ${sn(ns)}${G.res[best]?`, drawn by its ${RES[G.res[best]].n.toLowerCase()}`:''}.`,['r'+r.id,'s'+ns.id,'s'+src.id],ns.x,ns.y);
        }
      }
    }
    // overseas colonies
    const ports=ss.filter(s=>s.port&&s.pop>1500);
    if(ports.length&&(r.tech>=2||hasT(r,'Seafarer'))&&chance(.03*RACES[r.race].sea*(hasT(r,'Seafarer')?2.5:1)*(X.explore===r.id?6:1)))colonize(r,ports);
  }
}
function colonize(r,ports){
  const from=pick(ports);let best=-1,bs=0;
  for(let t=0;t<60;t++){const i=X.free.length?X.free[(rand()*X.free.length)|0]:-1;if(i<0)break;if(!G.coast[i]||S.owner[i]>=0)continue;
    const x=i%W,y=(i/W)|0,d=d2(x,y,from.x,from.y);if(d>75*75||d<12*12)continue;if(G.mass[i]===G.mass[from.cell]&&d<30*30)continue;if(tooClose(x,y,6))continue;
    const sc=RACES[r.race].habit[G.biome[i]]*G.fert[i]+(G.res[i]?.4:0)+rand()*.2;if(sc>bs){bs=sc;best=i}}
  if(best<0)return;
  const moved=Math.min(from.pop*.12,ri(200,450));from.pop-=moved;
  const ns=addSettlement(r,best,moved);
  log(1,'ship',`Ships from ${sn(from)} crossed the sea and planted the colony of ${sn(ns)} for ${rn(r)}.`,['r'+r.id,'s'+ns.id,'s'+from.id],ns.x,ns.y,{t0x:from.x,t0y:from.y,ship:true});
}

/* ---------- economy, roads and trade ---------- */
function economy(){
  const routeInc=new Float64Array(S.realms.length);
  for(const t of X.routes||[]){routeInc[t.ra]+=t.v;routeInc[t.rb]+=t.v}
  for(const r of S.realms){if(!r.alive)continue;
    const rc=X.resc[r.id]||[];let res=0;for(let k=1;k<RES.length;k++)res+=(rc[k]||0)*RES[k].v;
    const inc=(X.pop[r.id]||0)/900+res*.5+routeInc[r.id]*(hasT(r,'Greedy')?1.3:1);
    const upkeep=(X.atWar.has(r.id)?.25:.08)*inc;
    r.income=inc-upkeep;r.gold=Math.max(0,r.gold+r.income);
  }
}
function buildNetworks(){
  agg();
  // roads: a spanning tree of each realm's holdings
  const roads=[];
  for(const r of S.realms){if(!r.alive)continue;const ss=setsOf(r.id);if(ss.length<2)continue;
    const inT=new Set([ss.reduce((a,b)=>b.pop>a.pop?b:a).id]);const left=ss.filter(s=>!inT.has(s.id));
    while(left.length){let bi=-1,bj=null,bd=1e9;
      for(let i=0;i<left.length;i++){const a=left[i];for(const id of inT){const b=X.byId.get(id);if(G.mass[a.cell]!==G.mass[b.cell])continue;const d=d2(a.x,a.y,b.x,b.y);if(d<bd){bd=d;bi=i;bj=b}}}
      if(bi<0||bd>16*16)break;const a=left.splice(bi,1)[0];inT.add(a.id);roads.push([a.id,bj.id,r.id]);}
  }
  X.roads=roads;
  // trade between cities of realms at peace
  const big=S.sets.filter(s=>s.pop>2500).sort((a,b)=>b.pop-a.pop).slice(0,70),cand=[];
  for(let i=0;i<big.length;i++)for(let j=i+1;j<big.length;j++){const a=big[i],b=big[j];if(a.realm===b.realm)continue;
    if(findWar(a.realm,b.realm))continue;const d=Math.sqrt(d2(a.x,a.y,b.x,b.y));
    const land=G.mass[a.cell]===G.mass[b.cell]&&d<34,sea=a.port&&b.port&&d<80;if(!land&&!sea)continue;
    if(S.beasts.some(m=>m.alive&&m.kind==='serpent'&&!land&&d2(m.x,m.y,(a.x+b.x)/2,(a.y+b.y)/2)<200))continue;
    cand.push({a:a.id,b:b.id,ra:a.realm,rb:b.realm,sea:!land,d,sc:Math.sqrt(a.pop*b.pop)/(d+8)});}
  cand.sort((p,q)=>q.sc-p.sc);
  const deg=new Map(),routes=[],tc=new Map();
  for(const c of cand){if(routes.length>=42)break;if((deg.get(c.a)||0)>=3||(deg.get(c.b)||0)>=3)continue;
    deg.set(c.a,(deg.get(c.a)||0)+1);deg.set(c.b,(deg.get(c.b)||0)+1);c.v=clamp(c.sc/60,1,14);routes.push(c);
    tc.set(c.a,(tc.get(c.a)||0)+1);tc.set(c.b,(tc.get(c.b)||0)+1);}
  const before=new Set((X.routes||[]).map(t=>rkey(t.ra,t.rb)));
  X.routes=routes;X.tradeCity=tc;
  if(!X.silent&&S.year>0){for(const t of routes){const k=rkey(t.ra,t.rb);if(!before.has(k)&&!S.tradeSeen[k]){S.tradeSeen[k]=S.year;const a=X.byId.get(t.a),b=X.byId.get(t.b);
    log(1,'trade',`${t.sea?'A sea lane':'A caravan road'} opened between ${sn(a)} of ${rn(S.realms[t.ra])} and ${sn(b)} of ${rn(S.realms[t.rb])}.`,['r'+t.ra,'r'+t.rb,'s'+t.a,'s'+t.b],a.x,a.y);break}}}
  dirtyNet=true;
}

/* ---------- diplomacy & war ---------- */
function traitRel(r){let v=0;for(const t of r.ruler.traits)v+=TRAITS[t].rel||0;if(hasT(r,'Mad'))v+=(rand()-.5)*20;return v}
function allyCount(id){let n=0;for(const k in S.allies){const[a,b]=k.split('-').map(Number);if(a===id||b===id)n++}return n}
function diplomacy(){
  const trade=new Set((X.routes||[]).map(t=>rkey(t.ra,t.rb)));
  for(const[k,bc]of X.border){
    const a=Math.floor(k/4096),b=k%4096,A=S.realms[a],B2=S.realms[b];if(!A.alive||!B2.alive)continue;
    const key=rkey(a,b);let rel=S.rel[key]??0;
    const target=(A.race===B2.race?15:0)+(ENMITY[A.race+'|'+B2.race]??ENMITY[B2.race+'|'+A.race]??0)+(A.faith===B2.faith?20:-12)-Math.min(30,bc*.25)+(S.allies[key]?25:0)+(trade.has(key)?12:0)+traitRel(A)+traitRel(B2);
    rel=clamp(rel+(target-rel)*.06+(rand()-.5)*10,-100,100);S.rel[key]=rel;
    if(findWar(a,b)||(S.truce[key]||0)>S.year)continue;
    if(!S.allies[key]&&rel>50&&chance(.025)&&allyCount(a)<3&&allyCount(b)<3){
      S.allies[key]=S.year;log(1,'ally',`${rn(A)} and ${rn(B2)} swore an alliance.`,['r'+a,'r'+b]);
    }else if(S.allies[key]&&rel<5){
      delete S.allies[key];log(1,'fall',`The alliance between ${rn(A)} and ${rn(B2)} collapsed in mutual suspicion.`,['r'+a,'r'+b]);
    }else if(!S.allies[key]&&rel<-25){
      const pa=power(A),pb=power(B2);const atkA=aggr(A)*pa>=aggr(B2)*pb;
      const att=atkA?A:B2,def=atkA?B2:A,ratio=clamp((atkA?pa:pb)/((atkA?pb:pa)+1),.3,3);
      if(chance((.006+(-rel-25)*.0009)*aggr(att)*ratio))declareWar(att,def);
    }
  }
}
function warName(att,def){
  let base=chance(.5)?`The War of ${pick(WAR_N)}`:`The ${att.core}–${def.core} War`;
  const c=S.wn[base]=(S.wn[base]||0)+1;
  if(c>1)base=base.replace('The ',`The ${ORD[c]||c+'th'} `);
  return base;
}
function declareWar(att,def,name,cause){
  const key=rkey(att.id,def.id);delete S.allies[key];
  cause=cause||(att.faith!==def.faith&&hasT(att,'Pious')?'heresy, proclaiming a holy war':pick(CAUSES));
  name=name||warName(att,def);
  S.wars.push({id:S.nid++,a:att.id,b:def.id,start:S.year,name,score:0,fx:null,fy:null});
  const big=setsOf(att.id).length>=3&&setsOf(def.id).length>=3;
  const ac=X.byId.get(att.cap);
  log(big?2:1,'war',`${rn(att)} declared war on ${rn(def)} over ${cause}. So began ${name}.`,['r'+att.id,'r'+def.id],ac?ac.x:null,ac?ac.y:null);
  for(const k in S.allies){const[a,b]=k.split('-').map(Number);if(a!==def.id&&b!==def.id)continue;const o=a===def.id?b:a;const O=S.realms[o];
    if(o===att.id||!O.alive||findWar(o,att.id)||!chance(.65))continue;
    S.wars.push({id:S.nid++,a:o,b:att.id,start:S.year,name,score:0,fx:null,fy:null});
    log(1,'war',`${rn(O)} honoured its oath to ${rn(def)} and marched against ${rn(att)}.`,['r'+o,'r'+att.id,'r'+def.id]);
  }
}
function warStep(){
  for(const w of S.wars.slice()){
    if(!S.wars.includes(w))continue;
    const A=S.realms[w.a],B2=S.realms[w.b];if(!A.alive||!B2.alive){S.wars.splice(S.wars.indexOf(w),1);continue}
    const bc=X.border.get(bkey(w.a,w.b))||0,dur=S.year-w.start;
    if(bc>0){
      const pa=power(A)*(.5+rand()),pb=power(B2)*1.1*(.5+rand());
      const Wn=pa>pb?A:B2,L=pa>pb?B2:A,ratio=Math.max(pa,pb)/Math.max(1,Math.min(pa,pb));
      const took=flipCells(Wn,L,Math.floor(Math.min(28,(ratio-1)*7+rand()*4)),w);
      w.score+=(Wn===A?1:-1)*took;w.lead=Wn.id;
      if(L.alive&&ratio>1.4&&chance(.3))siege(Wn,L);
      for(const s of S.sets){if(s.realm===L.id)s.pop*=.985;else if(s.realm===Wn.id)s.pop*=.993}
      Wn.gold*=.97;L.gold*=.94;
      if(L.alive&&chance(.3))battle(w,Wn,L);
    }
    if(!S.wars.includes(w))continue;
    if(chance(.025+dur*.006+(bc===0?.25:0)+(Math.abs(w.score)>60?.08:0)))makePeace(w);
  }
}
function flipCells(Wn,L,n,w){
  const cand=[],o=S.owner;
  for(const i of X.byR[L.id]||[]){if(o[i]!==L.id)continue;const x=i%W,y=(i/W)|0;
    for(const[dx,dy]of DIRS){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;if(o[yy*W+xx]===Wn.id){cand.push(i);break}}}
  if(w&&cand.length){let mx=0,my=0;for(const i of cand){mx+=i%W;my+=(i/W)|0}w.fx=mx/cand.length;w.fy=my/cand.length;
    let bi=cand[0],bd=1e9;for(const i of cand){const d=d2(i%W,(i/W)|0,w.fx,w.fy);if(d<bd){bd=d;bi=i}}w.fx=bi%W;w.fy=(bi/W)|0}
  if(n<=0)return 0;
  shuffle(cand);let took=0;
  for(const i of cand){if(took>=n||!L.alive)break;
    const s=X.at.get(i);
    if(s&&!s.dead&&s.realm===L.id){if(chance(.35))captureSettlement(s,Wn,L);else continue}
    else o[i]=Wn.id;
    took++;
  }
  return took;
}
function siege(Wn,L){
  const ss=S.sets.filter(s=>s.realm===L.id);let best=null,bd=1e9;
  for(const s of ss){for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const x=s.x+dx,y=s.y+dy;if(x<0||y<0||x>=W||y>=H)continue;if(S.owner[y*W+x]===Wn.id){const d=dx*dx+dy*dy;if(d<bd){bd=d;best=s}}}}
  if(best)captureSettlement(best,Wn,L,true);
}
function captureSettlement(s,Wn,L,siege){
  const wasCap=L.cap===s.id;
  const razeP=(Wn.race==='orc'?.3:.06)+(hasT(Wn,'Cruel')?.2:0);
  let razed=false;
  if(chance(razeP)){razed=true;destroySettlement(s,`was put to the torch by ${rn(Wn)}`,[`r${Wn.id}`,`r${L.id}`],'ruin');}
  else{
    s.realm=Wn.id;s.pop*=.82;S.owner[s.cell]=Wn.id;const loot=L.gold*.15;L.gold-=loot;Wn.gold+=loot;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=s.x+dx,y=s.y+dy;if(x<0||y<0||x>=W||y>=H)continue;const j=y*W+x;if(S.owner[j]===L.id&&!X.at.get(j))S.owner[j]=Wn.id}
    const imp=wasCap||s.pop>6000?2:1;
    log(imp,siege?'siege':'capture',wasCap?`${sn(s)}, seat of ${rn(L)}, fell to ${rn(Wn)}${siege?' after a long siege':''}.`:`${rn(Wn)} ${siege?'besieged and took':'captured'} ${sn(s)} from ${rn(L)}.`,['r'+Wn.id,'r'+L.id,'s'+s.id],s.x,s.y);
  }
  if(wasCap&&!razed)relocateCapital(L);
  if(L.alive&&!S.sets.some(t=>t.realm===L.id))killRealm(L,Wn);
}
function destroySettlement(s,how,refs,cat){
  const i=S.sets.indexOf(s);if(i<0)return;S.sets.splice(i,1);s.dead=true;
  S.ruins.push({id:S.nid++,sid:s.id,name:s.name,x:s.x,y:s.y,year:S.year,founded:s.founded,w:s.w.map(w=>w.n),peak:Math.round(s.pop)});
  if(S.ruins.length>160)S.ruins.shift();
  log(s.pop>5000?2:1,cat||'ruin',`${sn(s)} ${how}. Only ruins remain.`,['s'+s.id,'r'+s.realm,...(refs||[])],s.x,s.y);
  const r=S.realms[s.realm];
  if(r.cap===s.id)relocateCapital(r);
  if(r.alive&&!S.sets.some(t=>t.realm===r.id))killRealm(r,null);
}
function relocateCapital(r){
  const ss=S.sets.filter(s=>s.realm===r.id);if(!ss.length){r.cap=-1;return}
  const c=ss.reduce((a,b)=>b.pop>a.pop?b:a);r.cap=c.id;r.stab=Math.max(0,r.stab-15);
  log(1,'castle',`${rn(r)} moved its seat to ${sn(c)}.`,['r'+r.id,'s'+c.id]);
}
function killRealm(r,by){
  if(!r.alive)return;r.alive=false;r.fell=S.year;closeReign(r,'fall');
  for(let i=0;i<N;i++)if(S.owner[i]===r.id)S.owner[i]=-1;
  S.wars=S.wars.filter(w=>w.a!==r.id&&w.b!==r.id);
  for(const k of Object.keys(S.allies)){const[a,b]=k.split('-').map(Number);if(a===r.id||b===r.id)delete S.allies[k]}
  for(const k of Object.keys(S.rel)){const[a,b]=k.split('-').map(Number);if(a===r.id||b===r.id)delete S.rel[k]}
  if(by)by.gold+=r.gold*.5;
  const age=S.year-r.founded;
  log(age>40||r.tier>0?2:1,'fall',`${rn(r)} fell${by?' to '+rn(by):''}, ${age} years after its founding.`,['r'+r.id,by&&'r'+by.id]);
}
function makePeace(w){
  S.wars.splice(S.wars.indexOf(w),1);
  const key=rkey(w.a,w.b);S.truce[key]=S.year+ri(15,30);S.rel[key]=Math.max(S.rel[key]||0,-15);
  const A=S.realms[w.a],B2=S.realms[w.b],dur=S.year-w.start;
  let res='neither side could claim victory';
  if(Math.abs(w.score)>=10){const Wn=w.score>0?A:B2,L=w.score>0?B2:A;const trib=Math.min(L.gold*.3,4000);L.gold-=trib;Wn.gold+=trib;res=`${rn(Wn)} prevailed, kept the lands it had taken and exacted ${fmt(trib)} crowns in tribute`}
  log(dur>=6||Math.abs(w.score)>40?2:1,'peace',`${w.name} ended after ${dur} year${dur===1?'':'s'}; ${res}.`,['r'+w.a,'r'+w.b]);
}
function battle(w,Wn,L){
  const wc=X.byId.get(Wn.cap)||setsOf(Wn.id)[0];if(!wc)return;
  const ls=S.sets.filter(s=>s.realm===L.id);if(!ls.length)return;
  const fx_=w.fx??wc.x,fy_=w.fy??wc.y;
  const s=ls.reduce((a,b)=>d2(b.x,b.y,fx_,fy_)<d2(a.x,a.y,fx_,fy_)?b:a);
  const place=`${s.name} ${pick(['Fields','Ford','Hill','Gate','Bridge','Marsh','Heights','Crossing'])}`;
  const dead=Math.min(X.pop[Wn.id]||0,X.pop[L.id]||0)*.012*(.5+rand());
  const h=S.heroes.find(h=>h.alive&&h.realm===Wn.id);const gen=S.greats.find(p=>p.alive&&p.kind==='general'&&p.realm===Wn.id);
  let lead='';if(gen&&chance(.6)){gen.deeds++;lead=`, led by the general ${gn(gen)},`}else if(h&&chance(.35)){h.deeds++;lead=`, led by ${hn(h)},`}
  log(1,'battle',`At the Battle of ${place}, ${rn(Wn)}${lead} routed the host of ${rn(L)}. ${fmtDead(dead)} fell.`,['r'+Wn.id,'r'+L.id,'s'+s.id,gen&&'g'+gen.id],w.fx??s.x,w.fy??s.y);
}

/* ---------- rulers & realm upkeep ---------- */
function deathCause(age,war){
  if(war&&chance(.4))return pick(['fell in battle','was slain leading a charge','died of wounds taken in the war']);
  if(age<38)return pick(['died of a sudden fever','was thrown from a horse','was poisoned at a feast','drowned crossing a river','died in a hunting accident']);
  return pick(['died in old age','died peacefully','died after a long illness','passed away, old and grey']);
}
function rulerStep(){
  for(const r of S.realms){if(!r.alive)continue;
    const ru=r.ruler,age=(S.year-ru.born)/RACES[r.race].life,war=X.atWar.has(r.id);
    const p=.006+(age>40?(age-40)*.0065:0)+(war?.008:0)+(hasT(r,'Mad')?.01:0);
    if(chance(p))succession(r,deathCause(age,war));
  }
}
function succession(r,cause){
  const old=r.ruler,reign=S.year-old.crowned,oldStr=rulerStr(r),ss=setsOf(r.id).length;
  closeReign(r,cause);
  const hero=S.heroes.find(h=>h.alive&&h.realm===r.id&&h.ep);
  let txt;
  if(hero&&chance(.4)){
    r.dynasty=placeName(r.race);r.ruler=newRuler(r,{name:hero.name,f:hero.f});r.ruler.born=hero.born;hero.alive=false;hero.crowned=S.year;
    txt=`The people raised the hero ${hn(hero)} to the throne as ${rulerStr(r)}, founding House ${r.dynasty}.`;
  }else if(chance(.1)){
    r.dynasty=placeName(r.race);r.ruler=newRuler(r);r.stab-=10;
    txt=`In the confusion, ${rulerStr(r)} of House ${r.dynasty} seized power.`;
  }else{
    r.ruler=newRuler(r);txt=`${rulerStr(r)} succeeded.`;
  }
  log(ss>=8||r.tier===2?1:0,'crown',`${oldStr} of ${rn(r)} ${cause} after ${reign} year${reign===1?'':'s'} of rule. ${txt}`,['r'+r.id]);
  if(ss>=8&&chance(.05+(55-r.stab)/250))civilWar(r,'succession');
}
function upkeep(){
  for(const r of S.realms){if(!r.alive)continue;
    const ss=setsOf(r.id),pop=X.pop[r.id]||0;
    let st=0;for(const t of r.ruler.traits)st+=TRAITS[t].st||0;
    const artists=S.greats.filter(p=>p.alive&&p.kind==='artist'&&p.realm===r.id).length;
    const target=60+st*8+artists*5-Math.max(0,ss.length-8)*1.5-(X.atWar.has(r.id)?10:0)+(r.golden>S.year?15:0)-(S.winter>S.year?6:0);
    r.stab=clamp(r.stab+(target-r.stab)*.05+(rand()-.5)*3,0,100);
    const scholars=S.greats.filter(p=>p.alive&&p.kind==='scholar'&&p.realm===r.id).length;
    if(r.tech<TECH.length-1&&chance(.002+Math.min(.02,pop/2e6)+(hasT(r,'Scholar')?.006:0)+scholars*.008)){
      r.tech++;log(ss.length>=2?1:0,'tech',`Scholars of ${rn(r)} mastered ${TECH[r.tech]}.`,['r'+r.id]);
    }
    if(r.tier===0&&ss.length>=3&&pop>=5000){
      const old=r.name;r.tier=1;r.custom=null;r.name=realmName(r);
      log(2,'rise',`${rnOld(r,old)} united under ${rulerStr(r)} as ${rn(r)}.`,['r'+r.id]);
    }else if(r.tier===1&&ss.length>=14&&pop>=120000&&chance(.03)){
      const old=r.name;r.tier=2;r.name=realmName(r);const cap=X.byId.get(r.cap)||ss[0];
      log(2,'crown',`${rulerStr(r)} was crowned in ${sn(cap)}, and ${rnOld(r,old)} became ${rn(r)}.`,['r'+r.id],cap.x,cap.y);
    }else if(r.tier===2&&ss.length<5){
      const old=r.name;r.tier=1;r.name=realmName(r);
      log(2,'fall',`Shrunk to a handful of holdings, ${rnOld(r,old)} was an empire no more. It endured as ${rn(r)}.`,['r'+r.id]);
    }
    if(r.golden<S.year&&r.stab>78&&ss.length>=3&&chance(.012)){
      r.golden=S.year+ri(20,50);log(2,'golden',`A golden age dawned in ${rn(r)} under ${rulerStr(r)}.`,['r'+r.id]);
    }
    if(ss.length>=7&&r.stab<20&&chance(.05))civilWar(r,'revolt');
    if(pop>r.peak)r.peak=pop;if((X.cells[r.id]||0)>r.peakCells)r.peakCells=X.cells[r.id];
  }
}
function civilWar(r,why){
  const ss=S.sets.filter(s=>s.realm===r.id);const cap=ss.find(s=>s.id===r.cap)||ss[0];if(!cap)return;
  const cands=ss.filter(s=>s!==cap);if(cands.length<2)return;
  const seed=cands.reduce((a,b)=>d2(b.x,b.y,cap.x,cap.y)*Math.sqrt(b.pop)>d2(a.x,a.y,cap.x,cap.y)*Math.sqrt(a.pop)?b:a);
  const moved=cands.filter(s=>d2(s.x,s.y,seed.x,seed.y)<d2(s.x,s.y,cap.x,cap.y));
  const nr=makeRealm(r.race,{parent:r.id,faith:r.faith,tech:r.tech,tier:moved.length>=3?1:0,custom:moved.length<3?`Free City of ${seed.name}`:null,gold:r.gold*.3});
  r.gold*=.7;
  for(const s of moved)s.realm=nr.id;nr.cap=seed.id;
  for(let i=0;i<N;i++){if(S.owner[i]!==r.id)continue;const x=i%W,y=(i/W)|0;let bs=null,bd=1e9;for(const s of ss){const d=d2(s.x,s.y,x,y);if(d<bd){bd=d;bs=s}}if(bs)S.owner[i]=bs.realm}
  const name=why==='succession'?`The War of the ${r.core} Succession`:`The ${seed.name} Rebellion`;
  log(2,'revolt',why==='succession'?`A succession crisis tore ${rn(r)} apart. ${sn(seed)} and ${moved.length-1} other holding${moved.length===2?'':'s'} rose as ${rn(nr)}.`
    :`Revolt! Weary of ${rulerStr(r)}, ${sn(seed)} and ${moved.length-1} other holding${moved.length===2?'':'s'} broke from ${rn(r)} as ${rn(nr)}.`,['r'+r.id,'r'+nr.id,'s'+seed.id],seed.x,seed.y);
  S.wars.push({id:S.nid++,a:nr.id,b:r.id,start:S.year,name,score:0,fx:null,fy:null});
  r.stab=Math.min(100,r.stab+20);nr.stab=55;
}

/* ---------- monsters, heroes, great people ---------- */
function spawnBeast(){
  const roll=rand();let kind,cell=-1,name,ruin=null;
  if(roll<.2&&S.ruins.length){kind='lich';ruin=pick(S.ruins);cell=ruin.y*W+ruin.x}
  else if(roll<.34){kind='serpent';for(let t=0;t<400;t++){const i=(rand()*N)|0;if(!isLand(G.biome[i])&&G.seaDist[i]>=2&&G.seaDist[i]<=6){cell=i;break}}}
  else{kind=roll<.76?'dragon':'giant';const want=kind==='dragon'?[B.MOUNTAIN,B.PEAK]:[B.HILLS,B.MOUNTAIN];
    for(let t=0;t<300;t++){const i=(rand()*N)|0;if(want.includes(G.biome[i])){cell=i;break}}}
  if(cell<0)return;
  const x=cell%W,y=(cell/W)|0;
  if(kind==='dragon')name=cap1(pick(['Vor','Ska','Ith','Zar','Mal','Kry','Aur','Thra','Neth','Ghal','Oro','Syx'])+pick(['athax','iss','omir','yrex','ugor','andrax','esh','ion','abrax','emoth']))+' the '+pick(['Ashen','Red','Pale','Devourer','Undying','Gilded','Black','Stormborn','Old','Hungering']);
  else if(kind==='giant')name=given('orc',false)+' the '+pick(['Stone-Giant','Frost-Giant','Hill-King','Cyclops','Mountain-Shaker']);
  else if(kind==='serpent')name=cap1(pick(['Leviath','Thal','Mor','Ugl','Kra','Ny','Hy'])+pick(['assa','oth','ugor','ken','dris','yra']))+' the '+pick(['Deep-Coil','Ship-Breaker','Drowner','Sea-Wyrm','Abyssal']);
  else name=`Lich ${given('human',chance(.4))} of ${ruin.name}`;
  const b={id:S.nid++,kind,name,x,y,born:S.year,life:kind==='dragon'?ri(300,800):kind==='giant'?ri(60,180):kind==='serpent'?ri(100,400):ri(150,600),power:kind==='dragon'?ri(8,12):kind==='lich'?ri(6,10):kind==='serpent'?ri(6,9):ri(4,7),alive:true,kills:0};
  S.beasts.push(b);if(S.beasts.length>50)S.beasts.splice(0,S.beasts.findIndex(q=>!q.alive)+1||1);
  const msg=kind==='dragon'?`${bn(b)} awoke in the mountains ${near(x,y)}.`:kind==='giant'?`${bn(b)} came down from the high country ${near(x,y)}.`:kind==='serpent'?`Sailors spoke in terror of ${bn(b)}, risen from the deep ${near(x,y)}.`:`In the ruins of ${ruin.name}, ${bn(b)} rose from the grave.`;
  log(2,kind==='serpent'?'serpent':kind,msg,['b'+b.id],x,y);
}
function beastStep(){
  const alive=S.beasts.filter(b=>b.alive);
  if(alive.length<3&&S.year>30&&chance(.012))spawnBeast();
  for(const b of alive){
    if(S.year-b.born>b.life){b.alive=false;log(1,b.kind,b.kind==='lich'?`The unlife of ${bn(b)} guttered out at last.`:`${bn(b)} was never seen again. Some say it sleeps still.`,['b'+b.id]);continue}
    if(chance(.2)){
      let t=S.sets.filter(s=>d2(s.x,s.y,b.x,b.y)<256);if(b.kind==='serpent')t=t.filter(s=>s.port);if(!t.length)continue;
      const s=wpick(t,s=>Math.sqrt(s.pop)/(1+Math.sqrt(d2(s.x,s.y,b.x,b.y))));
      const loss=s.pop*(.05+rand()*.22);b.kills+=loss;
      if(s.pop<450||chance(.05)){destroySettlement(s,b.kind==='dragon'?`was burned to ash by ${bn(b)}`:b.kind==='lich'?`was emptied by the dead servants of ${bn(b)}`:b.kind==='serpent'?`was dragged beneath the waves by ${bn(b)}`:`was crushed to rubble by ${bn(b)}`,['b'+b.id],b.kind);}
      else{s.pop-=loss;log(1,b.kind,`${bn(b)} fell upon ${sn(s)}. ${fmtDead(loss)} perished.`,['b'+b.id,'s'+s.id,'r'+s.realm],s.x,s.y)}
    }
    if(b.kind!=='lich'&&chance(.04)){for(let t=0;t<60;t++){const x=clamp(b.x+ri(-15,15),0,W-1),y=clamp(b.y+ri(-15,15),0,H-1),i=y*W+x,bb=G.biome[i];
      if(b.kind==='serpent'?(!isLand(bb)&&G.seaDist[i]>=1&&G.seaDist[i]<=7):(bb===B.MOUNTAIN||bb===B.PEAK||bb===B.HILLS)){b.x=x;b.y=y;break}}}
  }
}
const EPITHET={dragon:'Dragonsbane',lich:'the Lightbringer',giant:'Giantfeller',serpent:'the Wave-Rider'};
function heroStep(){
  const beasts=S.beasts.filter(b=>b.alive),heroes=S.heroes.filter(h=>h.alive);
  if(heroes.length<6&&S.sets.length&&chance(.012+beasts.length*.025)){
    const s=beasts.length?wpick(S.sets,s=>1/(1+Math.min(...beasts.map(b=>d2(s.x,s.y,b.x,b.y))))):pick(S.sets);
    const r=S.realms[s.realm],f=chance(.4);
    const h={id:S.nid++,name:given(r.race,f),f,race:r.race,realm:r.id,home:s.name,hx:s.x,hy:s.y,born:S.year-ri(16,24),alive:true,ep:null,deeds:0};
    S.heroes.push(h);if(S.heroes.length>60)S.heroes.splice(0,S.heroes.findIndex(q=>!q.alive)+1||1);
    log(1,'hero',`${hn(h)} of ${sn(s)} took up ${RACES[r.race].weapon}${beasts.length?', swearing to rid the land of monsters':''}.`,['s'+s.id,'r'+r.id],s.x,s.y);
  }
  for(const h of S.heroes){if(!h.alive)continue;
    const age=(S.year-h.born)/RACES[h.race].life;
    if(age>55+rand()*25&&chance(.15)){h.alive=false;if(h.ep||h.deeds>2)log(1,'death',`${hn(h)} died, and was mourned across ${S.realms[h.realm].alive?rn(S.realms[h.realm]):'the land'}.`,['r'+h.realm]);continue}
    const live=S.beasts.filter(b=>b.alive);if(!live.length||!chance(.2))continue;
    const b=live.reduce((a,c)=>d2(c.x,c.y,h.hx,h.hy)<d2(a.x,a.y,h.hx,h.hy)?c:a);if(d2(b.x,b.y,h.hx,h.hy)>1225)continue;
    if(chance(clamp(.3+h.deeds*.06-b.power*.012,.08,.7))){
      b.alive=false;b.slain=S.year;h.ep=h.ep||EPITHET[b.kind];h.deeds+=3;
      const R=S.realms[h.realm];if(R.alive){R.stab=Math.min(100,R.stab+12);R.gold+=b.kills/20}
      log(2,'slay',`${hn(h)} slew ${bn(b)}, ending ${S.year-b.born} years of terror${b.kind==='dragon'?', and carried home a dragon’s hoard':''}.`,['b'+b.id,'r'+h.realm],b.x,b.y);
    }else{h.alive=false;log(1,'death',`${hn(h)} rode out to face ${bn(b)} and was never seen again.`,['b'+b.id,'r'+h.realm],b.x,b.y)}
  }
}
function greatStep(){
  const alive=S.greats.filter(p=>p.alive);
  if(alive.length<10){for(const r of S.realms){if(!r.alive)continue;const ss=setsOf(r.id);if(ss.length<2)continue;
    if(!chance(.0035*(1+r.tech*.25)*Math.min(3,ss.length/4)*(r.golden>S.year?2:1)))continue;
    const kinds=['scholar','artist','general','explorer','mage'];
    const k=wpick(kinds,k=>k==='general'?(X.atWar.has(r.id)?3:.6):k==='mage'?(r.tech>=4?1.4:.3):k==='explorer'?(ss.some(s=>s.port)?1:0):1.2);
    const s=wpick(ss,s=>s.pop),f=chance(.45);
    const p={id:S.nid++,kind:k,name:given(r.race,f),f,realm:r.id,home:s.name,born:S.year-ri(18,30),alive:true,works:[],deeds:0,race:r.race};
    S.greats.push(p);if(S.greats.length>90)S.greats.splice(0,S.greats.findIndex(q=>!q.alive)+1||1);
    const intro={scholar:`The scholar ${gn(p)} began teaching in ${sn(s)}.`,artist:`In ${sn(s)}, the young artist ${gn(p)} drew crowds and patrons alike.`,
      general:`${gn(p)} of ${sn(s)} rose through the ranks to command the armies of ${rn(r)}.`,explorer:`The explorer ${gn(p)} set sail from ${sn(s)} to chart the unknown seas.`,
      mage:`${gn(p)} of ${sn(s)} was named Archmage of ${rn(r)}.`}[k];
    log(1,GREAT[k].ico,intro,['r'+r.id,'s'+s.id,'g'+p.id],s.x,s.y);break}}
  for(const p of S.greats){if(!p.alive)continue;const r=S.realms[p.realm];
    const age=(S.year-p.born)/RACES[p.race].life;
    if(!r.alive||(age>50&&chance(.04+(age-50)*.01))){p.alive=false;p.died=S.year;if(p.works.length||p.deeds>2)log(1,'death',`${capF(GREAT[p.kind].n.toLowerCase())==='Archmage'?'The Archmage':'The '+GREAT[p.kind].n.toLowerCase()} ${gn(p)} died${p.works.length?', remembered for '+p.works.map(w=>w.n).join(' and '):''}.`,['g'+p.id,'r'+p.realm]);continue}
    if(GREAT[p.kind].w.length&&p.works.length<3&&chance(.06)){const n=pick(GREAT[p.kind].w).replace('{a}',pick(WORK_A)).replace(/\bthe the /g,'the ');p.works.push({n,y:S.year});
      log(p.works.length===1?1:0,GREAT[p.kind].ico,`${gn(p)} completed ${n}.`,['g'+p.id,'r'+p.realm])}
    if(p.kind==='explorer'&&chance(.08)){X.explore=p.realm;p.deeds++;if(chance(.5)){log(1,'explorer',`${gn(p)} returned with charts of distant shores, and ships of ${rn(r)} followed.`,['g'+p.id,'r'+p.realm])}}
    if(p.kind==='mage'&&chance(.012)){
      const s=X.byId.get(r.cap)||setsOf(r.id)[0];if(!s)continue;
      if(chance(.45)){const rad=ri(3,6);const cx=clamp(s.x+ri(-8,8),0,W-1),cy=clamp(s.y+ri(-8,8),0,H-1);S.scars.push({kind:'blight',x:cx,y:cy,r:rad,until:S.year+ri(60,160),cause:p.name});
        let dead=0;for(const t of S.sets.slice())if(d2(t.x,t.y,cx,cy)<=rad*rad){if(t.pop<800){dead+=t.pop;destroySettlement(t,`was unmade by wild magic`,['g'+p.id],'blight')}else{dead+=t.pop*.4;t.pop*=.6}}
        p.alive=false;p.died=S.year;
        log(2,'blight',`An experiment of the Archmage ${gn(p)} went terribly wrong. A blight of wild magic scarred the land ${near(cx,cy)}${dead>0?` and ${fmtDead(dead)} perished`:''}.`,['g'+p.id,'r'+p.realm],cx,cy);}
      else if(r.tech<TECH.length-1){r.tech++;log(1,'mage',`The Archmage ${gn(p)} unlocked the secrets of ${TECH[r.tech]} for ${rn(r)}.`,['g'+p.id,'r'+p.realm])}
    }
  }
}

/* ---------- faiths, plagues, wonders, disasters, climate ---------- */
function newFaith(origin){
  const id=S.faiths.length,h=(id*97.3+S.seed%180+40)%360;
  const f={id,name:pick(F_P).replace('{x}',pick(F_A)+' '+pick(F_B)),founded:S.year,origin,css:`hsl(${h.toFixed(1)} 55% 55%)`,rgb:hsl2rgb(h,.55,.55),ext:null};
  S.faiths.push(f);return f;
}
function events(){
  const alive=S.realms.filter(r=>r.alive);
  if(S.sets.length>10&&chance(.01)){
    const o=wpick(S.sets,s=>s.pop),nm=`the ${pick(PL_A)} ${pick(PL_B)}`;let dead=0;
    for(const s of S.sets)if(d2(s.x,s.y,o.x,o.y)<400){const m=.55+rand()*.35;dead+=s.pop*(1-m);s.pop*=m}
    log(dead>15000?2:1,'plague',`${capF(nm)} broke out in ${sn(o)} and spread through the surrounding lands. ${fmtDead(dead)} perished.`,['s'+o.id,'r'+o.realm],o.x,o.y);
  }
  if(alive.length&&chance(.01+(S.winter>S.year?.05:0))){const r=pick(alive);const ss=setsOf(r.id);if(ss.length>=2){for(const s of ss)s.pop*=.9;r.stab-=10;r.gold*=.85;log(1,'famine',`Failed harvests brought famine to ${rn(r)}.`,['r'+r.id])}}
  for(const s of S.sets){if(s.pop>12000&&s.w.length<2){const r=S.realms[s.realm];if(r.tier>=1&&r.gold>4000&&chance(.0012*(1+r.tech*.25)*(hasT(r,'Builder')?3:1))){
    r.gold-=4000;const n=`the ${pick(WON_A)} ${pick(WON_B)}`;s.w.push({n,y:S.year});log(2,'wonder',`Builders of ${rn(r)} completed ${n} in ${sn(s)}.`,['r'+r.id,'s'+s.id],s.x,s.y)}}}
  const living=new Set(alive.map(r=>r.faith));
  if(S.sets.length&&chance(.005+(living.size<3?.012:0))){
    const s=pick(S.sets),r=S.realms[s.realm],f=newFaith(s.name);
    if(chance(.55)||hasT(r,'Pious')){r.faith=f.id;log(2,'prophet',`A prophet in ${sn(s)} proclaimed the ${f.name}. ${rn(r)} embraced the new faith.`,['s'+s.id,'r'+r.id],s.x,s.y)}
    else{r.stab-=8;log(2,'prophet',`A prophet in ${sn(s)} proclaimed the ${f.name}, and was cast out by ${rulerStr(r)}. The faith spread in secret.`,['s'+s.id,'r'+r.id],s.x,s.y);f.hidden=r.id}
  }
  for(const f of S.faiths){if(f.hidden!=null&&f.ext==null&&chance(.03)){const r=S.realms[f.hidden];if(r.alive){r.faith=f.id;f.hidden=null;log(2,'faith',`The hidden ${f.name} won over ${rn(r)} at last.`,['r'+r.id])}}}
  if(chance(.6)){for(const[k]of X.border){const a=S.realms[Math.floor(k/4096)],b=S.realms[k%4096];if(!a.alive||!b.alive||a.faith===b.faith)continue;
    const p=.006+(hasT(a,'Pious')||hasT(b,'Pious')?.02:0);if(!chance(p))continue;
    const big=(X.cells[a.id]||0)>=(X.cells[b.id]||0)?a:b,small=big===a?b:a;if((S.rel[rkey(a.id,b.id)]||0)<-20)continue;
    small.faith=big.faith;log(1,'faith',`${rn(small)} converted to the ${S.faiths[big.faith].name}, preached by missionaries from ${rn(big)}.`,['r'+small.id,'r'+big.id]);break}}
  if(S.year%10===0){for(const f of S.faiths){if(f.ext!=null||f.hidden!=null)continue;if(S.year-f.founded<5)continue;if(!alive.some(r=>r.faith===f.id)){f.ext=S.year;log(1,'faith',`The last followers of the ${f.name} passed from the world.`,[])}}}
  if(S.sets.length&&chance(.007)){
    const c=S.sets.filter(s=>G.nearMtn[s.cell]||G.river[s.cell]);if(c.length){const s=pick(c);const mtn=G.nearMtn[s.cell];
      if(mtn&&chance(.4)){S.scars.push({kind:'ash',x:s.x,y:s.y,r:ri(2,4),until:S.year+ri(25,70)});}
      if(mtn&&s.pop<1500&&chance(.3))destroySettlement(s,pick(['was buried when the mountain above it erupted','was swallowed by a great earthquake']),[],'quake');
      else{const m=mtn?.45+rand()*.3:.75+rand()*.15,dead=s.pop*(1-m);s.pop*=m;log(1,mtn?'quake':'flood',mtn?`${pick(['An earthquake','A volcanic eruption'])} struck ${sn(s)}. ${fmtDead(dead)} died.`:`The river rose and flooded ${sn(s)}. ${fmtDead(dead)} drowned.`,['s'+s.id,'r'+s.realm],s.x,s.y)}}
  }
  if(!(S.winter>S.year)&&S.year>60&&chance(.0035)){S.winter=S.year+ri(4,12);log(2,'winter',`The sun dimmed and ${pick(['the Long Winter','the Fimbul Frost','the Grey Years','the Season of Ice'])} began. Snow fell in summer and harvests failed across ${S.name}.`,[])}
  else if(S.winter===S.year)log(1,'golden',`The long winter broke at last, and the rivers ran free again.`,[]);
  if(chance(.004))log(1,'comet',`A comet with a ${pick(['green','crimson','silver','golden','violet'])} tail blazed across the sky for ${ri(9,40)} nights. Seers argued over its meaning.`,[]);
}
function spawnPeoples(){
  const alive=S.realms.filter(r=>r.alive).length;const fr=X.free.length/G.land;
  if(alive>=30||X.free.length<40||!chance(.02+fr*.12))return;
  for(let t=0;t<40;t++){
    const i=X.free[(rand()*X.free.length)|0];const x=i%W,y=(i/W)|0;
    if(S.owner[i]>=0||tooClose(x,y,8)||X.scar[i]<1)continue;
    let ok=true;for(let dy=-4;dy<=4&&ok;dy++)for(let dx=-4;dx<=4;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;if(S.owner[yy*W+xx]>=0){ok=false;break}}
    if(!ok)continue;
    const race=RK.reduce((a,b)=>RACES[b].habit[G.biome[i]]+rand()*.3>RACES[a].habit[G.biome[i]]+rand()*.3?b:a);
    const where=near(x,y);const r=makeRealm(race);const s=addSettlement(r,i,ri(250,600));r.cap=s.id;
    log(1,'people',`A people of ${RACES[race].pl} raised their first hearths ${where} and named themselves ${rn(r)}.`,['r'+r.id,'s'+s.id],x,y);
    return;
  }
}
function newEra(name,heg){S.eras.push({name,start:S.year,heg:heg??null});if(S.year>0)log(3,'era',name,[])}
function eraCheck(){
  const cur=S.eras[S.eras.length-1],age=S.year-cur.start;
  let big=null,bc=0;for(const r of S.realms)if(r.alive&&(X.cells[r.id]||0)>bc){bc=X.cells[r.id];big=r}
  if(big&&bc>G.land*.3&&cur.heg!==big.id&&age>40){newEra(`The Age of the ${big.core} ${pick(['Ascendancy','Hegemony','Dominion','Peace'])}`,big.id);return}
  if(S.winter>S.year&&!cur.name.includes('Frost')&&age>30&&chance(.15)){newEra(pick(['The Age of Frost','The Frost Years','The White Age']));return}
  if(age>140&&chance(.012)){
    const beasts=S.beasts.filter(b=>b.alive).length,wars=new Set(S.wars.map(w=>w.name)).size;
    const used=new Set(S.eras.map(e=>e.name));
    const opts=wars>=4?['Strife','Banners','Blood','Iron']:beasts>=3?['Dragons','Shadow','Fear']:S.faiths.filter(f=>f.ext==null).length>=6?['Prophets','Many Gods','Candles']:(X.routes||[]).length>30?['Sails','Caravans','Gold','Merchants']:['Lanterns','Stars','Silence','Storms','Thorns','Embers','Rivers','Mist','Bells','Masks','Wonders'];
    let n=null;for(const o of shuffle(opts.slice())){const c=`The Age of ${o}`;if(!used.has(c)){n=c;break}}
    if(!n)n=`The ${ORD[Math.min(10,S.eras.length)]||'Later'} Age of ${pick(opts)}`;
    newEra(n);
  }
}
function recordHist(){
  const p={},c={};for(const r of S.realms)if(r.alive&&X.pop[r.id]){p[r.id]=Math.round(X.pop[r.id]);c[r.id]=X.cells[r.id]||0}
  S.hist.push({y:S.year,p,c});
  if(S.hist.length>400)S.hist=S.hist.filter((_,i,a)=>i%2===0||i===a.length-1);
}

/* ---------- world creation & persistence ---------- */
function newWorld(seed){
  G=genTerrain(seed);labelMasses(G);
  S={v:2,seed,rng:(seed^0x5bd1e995)>>>0,year:0,name:'',owner:new Int16Array(N).fill(-1),realms:[],sets:[],ruins:[],beasts:[],heroes:[],greats:[],faiths:[],
    wars:[],allies:{},truce:{},rel:{},log:[],legends:[],hist:[],eras:[],scars:[],winter:0,nid:1,wn:{},raceFaith:{},tradeSeen:{},saved:Date.now()};
  S.name=worldName();X.names=new Set();X.routes=[];X.roads=[];
  for(const r of RK)S.raceFaith[r]=newFaith(null).id;
  newEra('The Age of '+pick(['Dawn','First Fires','Wandering','Awakening']));
  agg();computeBorders();scarMul();
  let made=0;
  for(let k=0;k<9;k++){
    const race=RK[k%5];let best=-1,bs=0;
    for(let t=0;t<500;t++){const i=(rand()*N)|0;if(!isLand(G.biome[i]))continue;const x=i%W,y=(i/W)|0;if(tooClose(x,y,16))continue;
      const sc=RACES[race].habit[G.biome[i]]*G.fert[i]+rand()*.2;if(sc>bs){bs=sc;best=i}}
    if(best<0)continue;const r=makeRealm(race);const s=addSettlement(r,best,ri(300,700));r.cap=s.id;made++;
  }
  log(2,'people',`The world of ${S.name} was young. ${made} peoples lit their first fires: ${S.realms.map(rn).join(', ')}.`,S.realms.map(r=>'r'+r.id));
  agg();computeBorders();recordHist();buildNetworks();
}
function labelMasses(g){
  g.mass=new Int16Array(N).fill(-1);let id=0;
  for(let i=0;i<N;i++){if(g.mass[i]>=0||!isLand(g.biome[i]))continue;const q=[i];g.mass[i]=id;
    for(let h=0;h<q.length;h++){const j=q[h],x=j%W,y=(j/W)|0;for(const[dx,dy]of DIRS){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const k=yy*W+xx;if(g.mass[k]<0&&isLand(g.biome[k])){g.mass[k]=id;q.push(k)}}}
    id++}
}
function serialize(){return JSON.stringify(Object.assign({},S,{owner:Array.from(S.owner)}))}
function restore(text){
  const o=JSON.parse(text);if(!o||o.v!==2||!Array.isArray(o.owner))return false;
  o.owner=Int16Array.from(o.owner);S=o;G=genTerrain(S.seed);labelMasses(G);
  X.names=new Set([...S.sets.map(s=>s.name),...S.ruins.map(r=>r.name)]);
  agg();computeBorders();scarMul();X.silent=true;buildNetworks();X.silent=false;return true;
}
function save(){try{S.saved=Date.now();localStorage.setItem(SAVE_KEY,serialize())}catch(e){}}
function loadSaved(){try{const t=localStorage.getItem(SAVE_KEY);return t?restore(t):false}catch(e){return false}}
