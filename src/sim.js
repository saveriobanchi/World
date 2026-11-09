/* =====================================================================
   SIMULATION · one tick is one season; four seasons make a year
   ===================================================================== */
const art=n=>n.startsWith('Clan ')?'':'the ';
const rlink=(r,name)=>`<a class="ref r" data-ref="r${r.id}" style="--c:${r.color}">${name||r.name}</a>`;
const rn=r=>art(r.name)+rlink(r);
const rnB=r=>rlink(r);
const rnOld=(r,name)=>art(name)+rlink(r,name);
const sn=s=>`<a class="ref s" data-ref="s${s.id}">${s.name}</a>`;
const bn=b=>`<a class="ref b" data-ref="b${b.id}">${b.name}</a>`;
const hn=h=>`<span class="hero">${h.name}${h.ep?' '+h.ep:''}</span>`;
const gn=p=>`<a class="ref g" data-ref="g${p.id}">${p.name}</a>`;
const wn=w=>`<a class="ref w" data-ref="w${w.id}">${w.name}</a>`;
let fresh=[];const fx=[];
function log(imp,cat,text,refs,x,y,extra){
  if(text.startsWith('the '))text='T'+text.slice(1);
  text=text.replace(/([.!?] )the /g,'$1The ');
  const e={y:S.year,s:S.season,t:text,i:imp,c:cat,r:(refs||[]).filter(Boolean)};
  if(x!=null){e.x=x;e.yy=y}
  S.log.push(e);if(S.log.length>1400)S.log.splice(0,S.log.length-1400);
  if(imp>=2){S.legends.push(e);if(S.legends.length>500)S.legends.splice(0,S.legends.length-500)}
  fresh.push(e);
  if(x!=null&&!X.silent)fx.push(Object.assign({x,y,t:performance.now(),c:cat,imp},extra||{}));
}
const Q=.25; // a season's share of a yearly chance

/* ---------- realms, rulers, settlements ---------- */
function realmColor(id){const hex=BANNER_INKS[(id*7+(S.seed%5))%BANNER_INKS.length];const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return{css:hex,rgb}}
function makeMotto(race){const w=shuffle(MOTTO_WORDS[race].slice()).slice(0,3);return w.join('. ')+'.'}
function hsl2rgb(h,s,l){const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1));return[Math.round(f(0)*255),Math.round(f(8)*255),Math.round(f(4)*255)]}
function realmName(r){return r.custom||GOV[r.race][r.tier][r.tmpl%GOV[r.race][r.tier].length].replace('{c}',r.core)}
function makeRealm(race,o={}){
  const id=S.realms.length,c=realmColor(id);
  const parent=o.parent!=null?S.realms[o.parent]:null;
  const k={};for(const f of FK)k[f]=o.k?o.k[f]:0;
  const r={id,race,core:coreName(race),tier:o.tier??0,tmpl:ri(0,9),custom:o.custom||null,color:c.css,rgb:c.rgb,founded:S.year,alive:true,cap:-1,
    dynasty:placeName(race),k,tech:0,stab:60,faith:o.faith??S.raceFaith[race],golden:0,regnal:{},parent:o.parent??null,fell:null,peak:0,peakCells:0,
    ruler:null,gold:o.gold??200,income:0,reigns:[],arms:makeArms(race,parent?parent.arms:null),overlord:null,vassalSince:null,law:LAWS[race],motto:makeMotto(race)};
  r.name=realmName(r);r.ruler=newRuler(r);S.realms.push(r);return r;
}
function newRuler(r,o={}){
  const f=o.f??chance(.4),name=o.name||given(r.race,f),n=(r.regnal[name]||0)+1;r.regnal[name]=n;
  const traits=o.traits||[];while(traits.length<(chance(.45)?2:1)){const t=pick(TRAIT_KEYS);if(!traits.includes(t))traits.push(t)}
  return{name,n,f,born:o.born??(S.year-Math.round(ri(16,36)*RACES[r.race].life)),crowned:S.year,traits,dyn:o.dyn||r.dynasty,spouse:null,kids:[],regent:o.regent||null};
}
const titleOf=(r,ru=r.ruler)=>TITLES[r.race][r.tier][ru.f?1:0];
const rulerStr=(r,ru=r.ruler)=>`${titleOf(r,ru)} ${ru.name}${ru.n>1?' '+roman(ru.n):''}`;
const hasT=(r,t)=>r.ruler.traits.includes(t);
const ageOf=(r,ru=r.ruler)=>S.year-ru.born;
const kind=p=>p<400?'Hamlet':p<1500?'Village':p<6000?'Town':p<20000?'City':'Great city';
const faithOf=r=>S.faiths[r.faith]||S.faiths[0];
function tenet(r,key,def){let v=def;for(const t of faithOf(r).tenets||[]){const x=TENETS[t][key];if(x!=null)v=def===1?v*x:v+x}return v}
function techOf(r){let s=0;for(const f of FK)s+=r.k[f];return s/FK.length}
function closeReign(r,how){r.reigns.push({s:rulerStr(r),d:r.ruler.dyn,a:r.ruler.crowned,b:S.year,h:how});if(r.reigns.length>48)r.reigns.shift();
  const yrs=S.year-r.ruler.crowned;if(!S.rec.reign||yrs>S.rec.reign.v)S.rec.reign={v:yrs,t:`${rulerStr(r)} of ${r.name}`,y:S.year}}
function addSettlement(r,cell,pop,mix){
  const x=cell%W,y=(cell/W)|0;let ore=false;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const k=G.res[yy*W+xx];if(k===1||k===2||k===3)ore=true}
  const s={id:S.nid++,name:placeName(r.race),x,y,cell,realm:r.id,pop,founded:S.year,w:[],port:!!G.coast[cell],mix:mix?Object.assign({},mix):{[r.race]:1},food:.6,b:{},ore,unrest:0};
  S.sets.push(s);S.owner[cell]=r.id;
  for(const[dx,dy]of DIRS){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const j=yy*W+xx;if(S.owner[j]<0&&isLand(G.biome[j]))S.owner[j]=r.id}
  return s;
}
const setsOf=id=>X.sets[id]||[];
function agg(){
  const n=S.realms.length,sets=[],pop=new Float64Array(n),at=new Map(),byId=new Map();
  for(let k=0;k<n;k++)sets.push([]);
  for(const s of S.sets){sets[s.realm].push(s);pop[s.realm]+=s.pop;at.set(s.cell,s);byId.set(s.id,s)}
  X.sets=sets;X.pop=pop;X.at=at;X.byId=byId;X.atWar=new Set();for(const w of S.wars){X.atWar.add(w.a);X.atWar.add(w.b)}
  X.gens=new Set(S.greats.filter(p=>p.alive&&p.kind==='general').map(p=>p.realm));
  X.vassals=new Map();for(const r of S.realms)if(r.alive&&r.overlord!=null){if(!X.vassals.has(r.overlord))X.vassals.set(r.overlord,[]);X.vassals.get(r.overlord).push(r.id)}
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
function power(r){return(X.pop[r.id]||0)/100*RACES[r.race].martial*(1+r.k.metal*.08)*(.6+r.stab/250)*(hasT(r,'Brave')?1.1:1)*(X.gens&&X.gens.has(r.id)?1.25:1)*(1+Math.min(1,r.gold/6000)*.2)*tenet(r,'mil',1)}
function bloc(r){let p=power(r);for(const v of X.vassals.get(r.id)||[])p+=power(S.realms[v])*.6;return p}
function aggr(r){let a=RACES[r.race].aggr;for(const t of r.ruler.traits)a+=TRAITS[t].ag||0;a=tenet(r,'ag',a);return clamp(a,.02,1.2)}
function near(x,y){
  let best=null,bd=1e9;for(const s of S.sets){const d=d2(s.x,s.y,x,y);if(d<bd){bd=d;best=s}}
  if(best&&bd<=100)return`near ${sn(best)}`;
  const v=y<H*.33?'north':y>H*.66?'south':'',h=x<W*.33?'west':x>W*.66?'east':'';
  return v||h?`in the wild ${v&&h?v+'-'+h:v||h}`:'in the wild heartlands';
}
function findWar(a,b){return S.wars.find(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a))}
function enemiesOf(id){const e=[];for(const w of S.wars){if(w.a===id)e.push(w.b);else if(w.b===id)e.push(w.a)}return e}
function tooClose(x,y,m){const m2=m*m;for(const s of S.sets)if(d2(s.x,s.y,x,y)<m2)return true;return false}
function weatherAt(x,y){return clamp(.55+.95*vnoise(x/24+S.year*13.37,y/24+S.year*7.13,S.seed+555)-(S.winter>S.year?.35:0),.15,1.6)}
function record(k,v,t){if(!S.rec[k]||v>S.rec[k].v)S.rec[k]={v,t,y:S.year}}

function stepSeason(){
  S.tick++;S.year=Math.floor(S.tick/4);S.season=S.tick%4;
  agg();computeBorders();scarMul();
  growSeason();
  expandTerritory();
  armiesStep();
  plagueStep();
  bandsStep();
  agg();diplomacySeason();
  if(S.season===2)harvest();
  if(S.season===3)yearEnd();
  agg();beastStep();heroStep();events();
  if(S.season===3&&S.year%5===0){recordHist();buildNetworks()}
  dirtyPol=true;
}
function yearEnd(){
  if(S.year%4===0)decayTerritory();
  foundSettlements();agg();
  economy();buildings();landUse();migration();assimilate();
  rulerYear();agg();upkeep();knowledge();vassalYear();faithYear();greatStep();spawnPeoples();eraCheck();
}

/* ---------- people, food, land ---------- */
const GROW_SHARE=[.3,.32,.28,.1];
function growSeason(){
  const winter=S.winter>S.year;
  for(const s of S.sets){
    const r=S.realms[s.realm],R=RACES[r.race];let lf=0;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=s.x+dx,y=s.y+dy;if(x<0||y<0||x>=W||y>=H)continue;const i=y*W+x;if(S.owner[i]===s.realm||S.owner[i]<0)lf+=G.fert[i]*X.scar[i]*(S.farm[i]?1.3:1)}
    lf/=25;
    const cap=(500+lf*15000)*R.grow*(1+r.k.agri*.07)*(r.cap===s.id?1.45:1)*(r.golden>S.year?1.15:1)*(s.port?1.1:1)*tenet(r,'grow',1)+s.w.length*2500+(X.tradeCity&&X.tradeCity.get(s.id)||0)*1500+(s.b.market?1500:0)+(s.b.granary?400:0);
    let rate=.035*(1-s.pop/cap);if(X.atWar.has(r.id))rate-=.004;if(winter)rate-=.012;if(s.food<.05)rate-=.01;
    s.pop=Math.max(25,s.pop*(1+rate*GROW_SHARE[S.season]*4*.25+(rand()-.5)*.004));
  }
}
function harvest(){
  const famine=new Map(),bounty=new Map();
  for(const s of S.sets){const r=S.realms[s.realm];
    const h=weatherAt(s.x,s.y)*tenet(r,'food',1)*(1+r.k.agri*.03);s.harvest=h;
    const cap=s.b.granary?1.6:.8;s.food=clamp(s.food+(h-1)*.7,-.6,cap);
    if(h>1.3)bounty.set(r.id,(bounty.get(r.id)||0)+1);
    if(s.food<0){const loss=s.pop*Math.min(.3,-s.food*.35);s.pop-=loss;s.unrest=Math.min(1,s.unrest+.3);s.food=0;famine.set(r.id,(famine.get(r.id)||0)+loss);s.hungry=S.year}
  }
  const hit=[];let total=0;
  for(const[id,dead]of famine){const r=S.realms[id];r.stab-=Math.min(15,dead/800);if(dead>800){hit.push([r,dead]);total+=dead}}
  hit.sort((a,b)=>b[1]-a[1]);
  if(hit.length===1){const[r,dead]=hit[0],c=setsOf(r.id).find(s=>s.hungry===S.year);log(dead>6000?2:1,'famine',`Blighted fields and an empty autumn brought famine to ${rn(r)}. ${fmtDead(dead)} starved.`,['r'+r.id],c?c.x:null,c?c.y:null)}
  else if(hit.length>1){const names=hit.slice(0,3).map(([r])=>rn(r));const more=hit.length-3;const c=setsOf(hit[0][0].id).find(s=>s.hungry===S.year);
    log(total>12000?2:1,'famine',`A hungry autumn: famine stalked ${names.slice(0,-1).join(', ')}${more>0?', '+names[names.length-1]+` and ${more} other realm${more>1?'s':''}`:' and '+names[names.length-1]}. ${fmtDead(total)} starved.`,hit.map(([r])=>'r'+r.id),c?c.x:null,c?c.y:null)}
  for(const[id,n]of bounty){const r=S.realms[id];if(n>=4&&chance(.08)){r.stab=Math.min(100,r.stab+3);log(0,'harvest',`A bountiful harvest filled the granaries of ${rn(r)}.`,['r'+id])}}
}
function landUse(){
  const want=new Uint8Array(N);
  for(const s of S.sets){if(s.pop<800)continue;const R=.6+Math.sqrt(s.pop)/62,r2=R*R;
    for(let y=Math.max(0,Math.floor(s.y-R));y<=Math.min(H-1,s.y+R);y++)for(let x=Math.max(0,Math.floor(s.x-R));x<=Math.min(W-1,s.x+R);x++){const i=y*W+x;if(d2(x,y,s.x,s.y)>r2||S.owner[i]!==s.realm)continue;
      const b=G.biome[i];if(b===B.MOUNTAIN||b===B.PEAK||b===B.SNOW||b===B.DESERT||b===B.SWAMP)continue;want[i]=1}}
  let cleared=0;
  for(let i=0;i<N;i++){if(want[i]&&!S.farm[i]&&chance(.35)){const b=G.biome[i];S.farm[i]=b===B.FOREST||b===B.JUNGLE||b===B.TAIGA?2:1;if(S.farm[i]===2)cleared++;farmDirty=true}
    else if(!want[i]&&S.farm[i]&&chance(.06)){S.farm[i]=0;farmDirty=true}}
  S.cleared=(S.cleared||0)+cleared;
}
function migration(){
  if(S.sets.length<4)return;
  const hungry=S.sets.filter(s=>(s.food<.05||s.unrest>.6)&&s.pop>900);
  for(const s of hungry.slice(0,6)){
    let best=null,bs=0;for(const t of S.sets){if(t===s)continue;const d=d2(s.x,s.y,t.x,t.y);if(d>400)continue;const sc=(t.food+.2)*(1-t.unrest)/(1+Math.sqrt(d)/6);if(sc>bs){bs=sc;best=t}}
    if(!best||best.food<.2)continue;
    const n=s.pop*(.06+rand()*.1);s.pop-=n;mixInto(best,s.mix,n);
    const main=Object.entries(s.mix).sort((a,b)=>b[1]-a[1])[0][0];
    if(n>600)log(n>2500?1:0,'migration',`${fmt(n)} ${RACES[main].pl} left ${sn(s)} in search of bread and safety, settling in ${sn(best)}${best.realm!==s.realm?' of '+rn(S.realms[best.realm]):''}.`,['s'+s.id,'s'+best.id,'r'+s.realm,'r'+best.realm],best.x,best.y);
  }
}
function mixInto(t,mix,n){const tot=t.pop+n;for(const k in t.mix)t.mix[k]*=t.pop/tot;for(const k in mix)t.mix[k]=(t.mix[k]||0)+mix[k]*n/tot;t.pop=tot}
function assimilate(){
  for(const s of S.sets){const race=S.realms[s.realm].race;let other=0;
    for(const k in s.mix){if(k===race)continue;s.mix[k]*=.985;if(s.mix[k]<.01)delete s.mix[k];else other+=s.mix[k]}
    s.mix[race]=1-other;s.unrest=Math.max(0,s.unrest*.8+other*.05-(s.b.temple?.03:0))}
}

/* ---------- territory & founding ---------- */
function buildReach(mult){
  const reach=[];for(let k=0;k<S.realms.length;k++)reach.push([]);
  for(const s of S.sets){const R=2.6+Math.sqrt(s.pop)/20;reach[s.realm].push(s.x,s.y,R*R*mult)}
  return reach;
}
function inReach(arr,x,y){for(let k=0;k<arr.length;k+=3)if(d2(arr[k],arr[k+1],x,y)<=arr[k+2])return true;return false}
function expandTerritory(){
  const reach=buildReach(1),claims=[],o=S.owner,season=S.season===3?.2:.4;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(o[i]>=0||!isLand(G.biome[i]))continue;
    const st=(rand()*4)|0;let own=-1;
    for(let k=0;k<4;k++){const[dx,dy]=DIRS[(st+k)&3],xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const q=o[yy*W+xx];if(q>=0){own=q;break}}
    if(own<0)continue;const r=S.realms[own];
    if(!inReach(reach[own],x,y))continue;
    if(chance(.13*season*RACES[r.race].habit[G.biome[i]]*RACES[r.race].expand*(G.res[i]?1.6:1)))claims.push(i,own);
  }
  for(let k=0;k<claims.length;k+=2)o[claims[k]]=claims[k+1];
}
function decayTerritory(){
  const reach=buildReach(1.8),o=S.owner,occ=new Set(S.armies.map(a=>a.realm));
  for(let i=0;i<N;i++){const a=o[i];if(a<0)continue;if(!S.realms[a].alive){o[i]=-1;continue}
    if(!inReach(reach[a],i%W,(i/W)|0)&&!occ.has(a)&&chance(.35))o[i]=-1}
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
          const ns=addSettlement(r,best,moved,src.mix);
          log(0,'found',`Settlers from ${sn(src)} founded ${sn(ns)}${G.res[best]?`, drawn by its ${RES[G.res[best]].n.toLowerCase()}`:''}.`,['r'+r.id,'s'+ns.id,'s'+src.id],ns.x,ns.y);
        }
      }
    }
    const ports=ss.filter(s=>s.port&&s.pop>1500);
    if(ports.length&&(r.k.sea>=2||hasT(r,'Seafarer'))&&chance(.03*RACES[r.race].sea*(1+r.k.sea*.25)*(ports.some(s=>s.b.harbor)?1.6:1)*(hasT(r,'Seafarer')?2.5:1)*(X.explore===r.id?6:1)))colonize(r,ports);
  }
  X.explore=null;
}
function colonize(r,ports){
  const from=pick(ports);let best=-1,bs=0;const range=50+r.k.sea*10;
  for(let t=0;t<60;t++){const i=X.free.length?X.free[(rand()*X.free.length)|0]:-1;if(i<0)break;if(!G.coast[i]||S.owner[i]>=0)continue;
    const x=i%W,y=(i/W)|0,d=d2(x,y,from.x,from.y);if(d>range*range||d<12*12)continue;if(G.mass[i]===G.mass[from.cell]&&d<30*30)continue;if(tooClose(x,y,6))continue;
    const sc=RACES[r.race].habit[G.biome[i]]*G.fert[i]+(G.res[i]?.4:0)+rand()*.2;if(sc>bs){bs=sc;best=i}}
  if(best<0)return;
  const moved=Math.min(from.pop*.12,ri(200,450));from.pop-=moved;
  const ns=addSettlement(r,best,moved,from.mix);
  log(1,'colony',`Ships from ${sn(from)} crossed the sea and planted the colony of ${sn(ns)} for ${rn(r)}.`,['r'+r.id,'s'+ns.id,'s'+from.id],ns.x,ns.y,{t0x:from.x,t0y:from.y,ship:true});
}

/* ---------- economy, buildings, roads and trade ---------- */
function economy(){
  const routeInc=new Float64Array(S.realms.length);
  for(const t of X.routes||[]){routeInc[t.ra]+=t.v;routeInc[t.rb]+=t.v}
  for(const r of S.realms){if(!r.alive)continue;
    const rc=X.resc[r.id]||[];let res=0;for(let k=1;k<RES.length;k++)res+=(rc[k]||0)*RES[k].v;
    let bonus=0,maint=0;for(const s of setsOf(r.id)){if(s.b.market)bonus+=s.pop/5000;if(s.b.mine)bonus+=5;if(s.b.harbor)bonus+=3;for(const k in s.b)maint+=BUILD[k].cost*.012}
    const inc=(X.pop[r.id]||0)/2000+res*.35+bonus+routeInc[r.id]*.6*(hasT(r,'Greedy')?1.3:1)*tenet(r,'trade',1);
    const court=Math.max(0,setsOf(r.id).length-4)*1.5*(1+r.tier*.5);
    const upkeep=(X.atWar.has(r.id)?.3:.12)*inc+court+maint+S.armies.filter(a=>a.realm===r.id).reduce((t,a)=>t+a.size/500,0);
    r.income=inc-upkeep;r.gold=r.gold+r.income;
    if(r.gold<0){r.gold=0;r.stab-=3;const ss=setsOf(r.id).filter(s=>Object.keys(s.b).length);if(ss.length&&chance(.35)){const s=pick(ss),k=pick(Object.keys(s.b));delete s.b[k];
      log(0,'build',`Unpaid and neglected, the ${BUILD[k].n.toLowerCase()} of ${sn(s)} fell into ruin.`,['s'+s.id,'r'+r.id])}}
    if(r.overlord!=null&&r.income>0){const o=S.realms[r.overlord];const t=r.income*.15;r.gold-=t;o.gold+=t;r.tribute=t}else r.tribute=0;
    record('gold',r.gold,r.name);
  }
}
function buildings(){
  for(const r of S.realms){if(!r.alive||r.gold<300)continue;
    const ss=setsOf(r.id).slice().sort((a,b)=>b.pop-a.pop);let built=0;
    const order=X.atWar.has(r.id)?['walls','barracks','castle','granary','temple','market','harbor','mine','library','university']:['granary','temple','market','walls','harbor','mine','library','barracks','castle','university'];
    for(const s of ss){if(built>=1+Math.floor(ss.length/8))break;
      for(const k of order){const B_=BUILD[k];if(s.b[k]||!B_.req(s,r))continue;const cost=B_.cost*1.5*(hasT(r,'Builder')?.7:1);if(r.gold<cost*1.3||r.income<B_.cost*.02)break;
        r.gold-=cost;s.b[k]=S.year;built++;
        log(k==='castle'||k==='university'?1:0,'build',`${k==='walls'?'Stone walls rose around':k==='university'?'A university was chartered in':k==='castle'?'A great castle was raised over':`A ${B_.n.toLowerCase()} was built in`} ${sn(s)}.`,['s'+s.id,'r'+r.id],s.x,s.y);break}
    }
  }
}
function buildNetworks(){
  agg();
  const roads=[];
  for(const r of S.realms){if(!r.alive)continue;const ss=setsOf(r.id);if(ss.length<2)continue;
    const inT=new Set([ss.reduce((a,b)=>b.pop>a.pop?b:a).id]);const left=ss.filter(s=>!inT.has(s.id));
    while(left.length){let bi=-1,bj=null,bd=1e9;
      for(let i=0;i<left.length;i++){const a=left[i];for(const id of inT){const b=X.byId.get(id);if(G.mass[a.cell]!==G.mass[b.cell])continue;const d=d2(a.x,a.y,b.x,b.y);if(d<bd){bd=d;bi=i;bj=b}}}
      if(bi<0||bd>16*16)break;const a=left.splice(bi,1)[0];inT.add(a.id);roads.push([a.id,bj.id,r.id]);}
  }
  X.roads=roads;
  const big=S.sets.filter(s=>s.pop>2500).sort((a,b)=>b.pop-a.pop).slice(0,70),cand=[];
  for(let i=0;i<big.length;i++)for(let j=i+1;j<big.length;j++){const a=big[i],b=big[j];if(a.realm===b.realm)continue;
    if(findWar(a.realm,b.realm))continue;const d=Math.sqrt(d2(a.x,a.y,b.x,b.y));
    const ra=S.realms[a.realm],rb=S.realms[b.realm],range=60+Math.min(ra.k.sea,rb.k.sea)*10;
    const land=G.mass[a.cell]===G.mass[b.cell]&&d<34,sea=a.port&&b.port&&d<range;if(!land&&!sea)continue;
    if(!land&&S.bands.some(m=>m.kind==='pirate'&&d2(m.x,m.y,(a.x+b.x)/2,(a.y+b.y)/2)<150))continue;
    if(S.beasts.some(m=>m.alive&&m.kind==='serpent'&&!land&&d2(m.x,m.y,(a.x+b.x)/2,(a.y+b.y)/2)<200))continue;
    cand.push({a:a.id,b:b.id,ra:a.realm,rb:b.realm,sea:!land,d,sc:Math.sqrt(a.pop*b.pop)/(d+8)*(a.b.market?1.3:1)*(b.b.market?1.3:1)});}
  cand.sort((p,q)=>q.sc-p.sc);
  const deg=new Map(),routes=[],tc=new Map();
  for(const c of cand){if(routes.length>=44)break;if((deg.get(c.a)||0)>=3||(deg.get(c.b)||0)>=3)continue;
    deg.set(c.a,(deg.get(c.a)||0)+1);deg.set(c.b,(deg.get(c.b)||0)+1);c.v=clamp(c.sc/60,1,14);routes.push(c);
    tc.set(c.a,(tc.get(c.a)||0)+1);tc.set(c.b,(tc.get(c.b)||0)+1);}
  const before=new Set((X.routes||[]).map(t=>rkey(t.ra,t.rb)));
  X.routes=routes;X.tradeCity=tc;
  if(!X.silent&&S.year>0){for(const t of routes){const k=rkey(t.ra,t.rb);if(!before.has(k)&&!S.tradeSeen[k]){S.tradeSeen[k]=S.year;const a=X.byId.get(t.a),b=X.byId.get(t.b);
    log(1,'trade',`${t.sea?'A sea lane':'A caravan road'} opened between ${sn(a)} of ${rn(S.realms[t.ra])} and ${sn(b)} of ${rn(S.realms[t.rb])}.`,['r'+t.ra,'r'+t.rb,'s'+t.a,'s'+t.b],a.x,a.y);break}}}
  dirtyNet=true;
}

/* ---------- diplomacy ---------- */
function traitRel(r){let v=0;for(const t of r.ruler.traits)v+=TRAITS[t].rel||0;if(hasT(r,'Mad'))v+=(rand()-.5)*20;return v}
function allyCount(id){let n=0;for(const k in S.allies){const[a,b]=k.split('-').map(Number);if(a===id||b===id)n++}return n}
function marriedRealms(a,b){const A=S.realms[a],Bb=S.realms[b];return(A.ruler.spouse&&A.ruler.spouse.realm===b)||(Bb.ruler.spouse&&Bb.ruler.spouse.realm===a)}
function diplomacySeason(){
  const trade=new Set((X.routes||[]).map(t=>rkey(t.ra,t.rb)));
  const campaign=S.season<=1;
  for(const[k,bc]of X.border){
    const a=Math.floor(k/4096),b=k%4096,A=S.realms[a],B2=S.realms[b];if(!A.alive||!B2.alive)continue;
    const key=rkey(a,b);let rel=S.rel[key]??0;
    const holy=(faithOf(A).tenets||[]).includes('Zealous')||(faithOf(B2).tenets||[]).includes('Zealous');
    const target=(A.race===B2.race?15:0)+(ENMITY[A.race+'|'+B2.race]??ENMITY[B2.race+'|'+A.race]??0)+(A.faith===B2.faith?20:(holy?-25:-12))-Math.min(30,bc*.25)+(S.allies[key]?25:0)+(trade.has(key)?12:0)+(marriedRealms(a,b)?20:0)+(A.overlord===b||B2.overlord===a?10:0)+traitRel(A)+traitRel(B2);
    rel=clamp(rel+(target-rel)*.03+(rand()-.5)*6,-100,100);S.rel[key]=rel;
    if(findWar(a,b)||(S.truce[key]||0)>S.year)continue;
    if(A.overlord===b||B2.overlord===a){
      const v=A.overlord===b?A:B2,o=v===A?B2:A;
      if(campaign&&power(v)>power(o)*.75&&chance(.04*Q*(hasT(v,'Ambitious')?2:1)))declareWar(v,o,`The ${v.core} War of Independence`,'its freedom','independence');
      continue;
    }
    if(A.overlord!=null||B2.overlord!=null)continue; // vassals do not make their own wars
    if(!S.allies[key]&&rel>50&&chance(.025*Q)&&allyCount(a)<3&&allyCount(b)<3){
      S.allies[key]=S.year;log(1,'ally',`${rn(A)} and ${rn(B2)} swore an alliance.`,['r'+a,'r'+b]);
    }else if(S.allies[key]&&rel<5){
      delete S.allies[key];log(1,'fall',`The alliance between ${rn(A)} and ${rn(B2)} collapsed in mutual suspicion.`,['r'+a,'r'+b]);
    }else if(campaign&&!S.allies[key]&&rel<-25){
      const pa=bloc(A),pb=bloc(B2);const atkA=aggr(A)*pa>=aggr(B2)*pb;
      const att=atkA?A:B2,def=atkA?B2:A,ratio=clamp((atkA?pa:pb)/((atkA?pb:pa)+1),.3,3);
      if(chance((.006+(-rel-25)*.0009)*aggr(att)*ratio*.8))declareWar(att,def);
    }
  }
}

/* ---------- war ---------- */
function warName(att,def){
  let base=chance(.5)?`The War of ${pick(WAR_N)}`:`The ${att.core}–${def.core} War`;
  const c=S.wn[base]=(S.wn[base]||0)+1;
  if(c>1)base=base.replace('The ',`The ${ORD[c]||c+'th'} `);
  return base;
}
function newWar(a,b,name){const w={id:S.nid++,a,b,start:S.year,ss:S.season,name,score:0,lossA:0,lossB:0,battles:0,sieges:0,fx:null,fy:null};S.wars.push(w);X.atWar.add(a);X.atWar.add(b);raiseArmies(S.realms[a]);raiseArmies(S.realms[b]);return w}
function declareWar(att,def,name,cause,cat){
  const key=rkey(att.id,def.id);delete S.allies[key];
  const site=S.faiths.find(f=>f.site!=null&&f.id===att.faith&&X.byId.get(f.site)&&X.byId.get(f.site).realm===def.id);
  cause=cause||(site?`the holy city of ${X.byId.get(site.site).name}`:att.faith!==def.faith&&(hasT(att,'Pious')||(faithOf(att).tenets||[]).includes('Zealous'))?'heresy, proclaiming a holy war':pick(CAUSES));
  name=name||warName(att,def);
  const w=newWar(att.id,def.id,name);
  const big=setsOf(att.id).length>=3&&setsOf(def.id).length>=3;
  const ac=X.byId.get(att.cap);
  log(big||cat==='independence'?2:1,cat||'war',`${rn(att)} declared war on ${rn(def)} over ${cause}. So began ${wn(w)}.`,['r'+att.id,'r'+def.id,'w'+w.id],ac?ac.x:null,ac?ac.y:null);
  const helpers=[];
  if(def.overlord!=null&&def.overlord!==att.id)helpers.push([def.overlord,.92,'came to the defence of its vassal']);
  for(const v of X.vassals.get(att.id)||[])if(v!==def.id)helpers.push([v,.7,'marched beside its overlord','att']);
  for(const v of X.vassals.get(def.id)||[])if(v!==att.id)helpers.push([v,.7,'rallied to its overlord']);
  for(const k in S.allies){const[a,b]=k.split('-').map(Number);if(a!==def.id&&b!==def.id)continue;helpers.push([a===def.id?b:a,.65,`honoured its oath to ${rn(def)}`])}
  for(const[o,p,why,side]of helpers){const O=S.realms[o];const foe=side==='att'?def:att;
    if(o===foe.id||!O.alive||findWar(o,foe.id)||!chance(p))continue;
    const w2=newWar(o,foe.id,name);log(1,'war',`${rn(O)} ${why} and marched against ${rn(foe)}.`,['r'+o,'r'+foe.id,'w'+w2.id]);}
}
function raiseArmies(r){
  if(!r||!r.alive)return;
  const ss=setsOf(r.id);if(!ss.length)return;
  const have=S.armies.filter(a=>a.realm===r.id);const n=clamp(Math.ceil(ss.length/5),1,4);
  const barracks=ss.filter(s=>s.b.barracks).length;
  const levy=(X.pop[r.id]||0)*.035*RACES[r.race].martial*(1+r.k.metal*.06)*(1+barracks*.1)*tenet(r,'mil',1);
  const en=enemiesOf(r.id).map(e=>S.realms[e]);
  for(let i=have.length;i<n;i++){
    let base=ss[0],bd=1e9;for(const s of ss)for(const e of en){const c=X.byId.get(e.cap);if(!c)continue;const d=d2(s.x,s.y,c.x,c.y);if(d<bd){bd=d;base=s}}
    const gen=S.greats.find(p=>p.alive&&p.kind==='general'&&p.realm===r.id&&!S.armies.some(a=>a.gen===p.id));
    const a={id:S.nid++,realm:r.id,x:base.x+(rand()-.5)*1.5,y:base.y+(rand()-.5)*1.5,size:Math.max(200,levy/n),max:Math.max(200,levy/n),morale:1,gen:gen?gen.id:null,target:null,state:'march',siege:0,home:base.id,
      name:`the ${pick(['First','Second','Third','Royal','Iron','Northern','Southern','Eastern','Western','Grey','Golden'])} ${r.race==='orc'?'Warband':pick(['Host','Legion','Army','Banner'])}`};
    S.armies.push(a);
  }
}
function moveCost(x,y){const b=G.biome[clamp(Math.round(y),0,H-1)*W+clamp(Math.round(x),0,W-1)];return b===B.MOUNTAIN||b===B.PEAK?.45:b===B.SWAMP||b===B.FOREST||b===B.JUNGLE||b===B.HILLS?.75:1}
function armiesStep(){
  for(const a of S.armies.slice()){const r=S.realms[a.realm];if(!r.alive||!X.atWar.has(r.id)){const home=X.byId.get(a.home)||setsOf(r.id)[0];if(home&&r.alive)home.pop+=a.size*.6;S.armies.splice(S.armies.indexOf(a),1)}}
  const winter=S.season===3;
  for(const a of S.armies.slice()){
    if(!S.armies.includes(a))continue;
    const r=S.realms[a.realm];const foes=new Set(enemiesOf(r.id));
    const own=S.owner[clamp(Math.round(a.y),0,H-1)*W+clamp(Math.round(a.x),0,W-1)]===r.id;
    if(winter){a.size*=own?.97:.93;a.morale=Math.min(1,a.morale+.05);if(a.size<120){disband(a,'melted away in the winter snows');continue}if(a.state==='siege')siegeTick(a,r,.5);continue}
    if(own){a.size=Math.min(a.max,a.size+a.max*.06);a.morale=Math.min(1,a.morale+.1)}
    let foeA=null,fd=1e9;for(const b of S.armies){if(!foes.has(b.realm))continue;const d=d2(a.x,a.y,b.x,b.y);if(d<fd){fd=d;foeA=b}}
    if(foeA&&fd<=2.2*2.2){fieldBattle(a,foeA);continue}
    if(a.state==='retreat'){const h=X.byId.get(a.home)||setsOf(r.id)[0];if(!h){disband(a);continue}stepToward(a,h.x,h.y);if(d2(a.x,a.y,h.x,h.y)<2)a.state='march';continue}
    const threatened=foeA&&setsOf(r.id).some(s=>d2(s.x,s.y,foeA.x,foeA.y)<64);
    if(threatened&&(power(r)<bloc(S.realms[foeA.realm])*.9||chance(.5))){a.state='march';a.target=null;stepToward(a,foeA.x,foeA.y);occupy(a,r,foes);continue}
    let t=a.target!=null?X.byId.get(a.target):null;
    if(!t||!foes.has(t.realm)){t=null;let bd=1e9;const mass=G.mass[clamp(Math.round(a.y),0,H-1)*W+clamp(Math.round(a.x),0,W-1)];
      for(const s of S.sets){if(!foes.has(s.realm))continue;if(mass>=0&&G.mass[s.cell]!==mass)continue;const d=d2(s.x,s.y,a.x,a.y)*(s.id===S.realms[s.realm].cap?.7:1);if(d<bd){bd=d;t=s}}
      a.target=t?t.id:null;a.siege=0;a.state='march'}
    if(!t)continue;
    if(d2(a.x,a.y,t.x,t.y)<=1.2){a.state='siege';siegeTick(a,r,1)}
    else{a.state='march';stepToward(a,t.x,t.y);occupy(a,r,foes)}
  }
}
function stepToward(a,x,y){const dx=x-a.x,dy=y-a.y,d=Math.hypot(dx,dy)||1,sp=Math.min(d,2.2*moveCost(a.x,a.y));const nx=a.x+dx/d*sp,ny=a.y+dy/d*sp;
  const i=clamp(Math.round(ny),0,H-1)*W+clamp(Math.round(nx),0,W-1);if(isLand(G.biome[i])){a.x=nx;a.y=ny}else{a.x+=dx/d*sp*.3;a.y+=dy/d*sp*.3}}
function occupy(a,r,foes){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=Math.round(a.x)+dx,y=Math.round(a.y)+dy;if(x<0||y<0||x>=W||y>=H)continue;const i=y*W+x;if(foes.has(S.owner[i])&&!X.at.get(i)&&chance(.7))S.owner[i]=r.id}}
function disband(a,why){const i=S.armies.indexOf(a);if(i>=0)S.armies.splice(i,1);if(why){const r=S.realms[a.realm];log(1,'army',`${capF(a.name)} of ${rn(r)} ${why}.`,['r'+r.id],a.x,a.y)}}
function fieldBattle(a,b){
  const ra=S.realms[a.realm],rb=S.realms[b.realm];
  const terrain=(x,y,r)=>{const i=clamp(Math.round(y),0,H-1)*W+clamp(Math.round(x),0,W-1),bb=G.biome[i];return S.owner[i]===r.id&&(bb===B.HILLS||bb===B.MOUNTAIN||bb===B.FOREST)?1.25:1};
  const str=(A,R)=>A.size*RACES[R.race].martial*(1+R.k.metal*.07)*A.morale*(A.gen?1.3:1)*terrain(A.x,A.y,R)*tenet(R,'mil',1)*(.75+rand()*.5);
  const sa=str(a,ra),sb=str(b,rb);const win=sa>sb?a:b,lose=win===a?b:a,Rw=S.realms[win.realm],Rl=S.realms[lose.realm];
  const ratio=Math.max(sa,sb)/Math.max(1,Math.min(sa,sb));
  const lw=win.size*clamp(.08+.18/ratio,.05,.3),ll=lose.size*clamp(.25+.15*ratio,.3,.75);
  win.size-=lw;lose.size-=ll;win.morale=Math.min(1,win.morale+.1);lose.morale=Math.max(.3,lose.morale-.35);lose.state='retreat';lose.target=null;
  const w=findWar(a.realm,b.realm);if(w){w.battles++;w.score+=(Rw.id===w.a?1:-1)*Math.round(4+ratio*3);if(Rw.id===w.a){w.lossA+=lw;w.lossB+=ll}else{w.lossA+=ll;w.lossB+=lw}w.fx=(a.x+b.x)/2;w.fy=(a.y+b.y)/2}
  if(win.gen){const p=S.greats.find(q=>q.id===win.gen);if(p)p.deeds++}
  const nearS=S.sets.reduce((m,s)=>!m||d2(s.x,s.y,a.x,a.y)<d2(m.x,m.y,a.x,a.y)?s:m,null);
  const place=nearS?`${nearS.name} ${pick(['Fields','Ford','Hill','Gate','Bridge','Marsh','Heights','Crossing','Moor','Pass'])}`:`the ${BIOME[G.biome[clamp(Math.round(a.y),0,H-1)*W+clamp(Math.round(a.x),0,W-1)]].n}`;
  const dead=lw+ll,gen=win.gen?S.greats.find(q=>q.id===win.gen):null;
  record('battle',dead,`the Battle of ${place}`);
  log(dead>4000?2:1,'battle',`At the Battle of ${place}, ${win.name} of ${rn(Rw)}${gen?`, led by ${gn(gen)},`:''} ${ratio>2?'shattered':'defeated'} ${lose.name} of ${rn(Rl)}. ${fmtDead(dead)} fell.`,['r'+Rw.id,'r'+Rl.id,w&&'w'+w.id,gen&&'g'+gen.id],(a.x+b.x)/2,(a.y+b.y)/2);
  if(lose.size<150||(lose.morale<=.3&&lose.size<lose.max*.2))disband(lose,'was destroyed');
  if(chance(.03)&&ageOf(Rl)>16)succession(Rl,'fell in battle');
}
function siegeTick(a,r,k){
  const t=X.byId.get(a.target);if(!t||t.dead){a.state='march';a.target=null;return}
  const def=t.pop*.05*(t.b.walls?2.5:1)*(t.b.castle?1.6:1)+150;
  const per=a.size/def*.35;a.siege+=per*k;
  if(a.siege>=1){
    const L=S.realms[t.realm],w=findWar(r.id,L.id),seasons=Math.max(1,Math.round(1/Math.max(.01,per)));
    if(w){w.sieges++;w.score+=(r.id===w.a?1:-1)*(t.id===L.cap?25:10);w.fx=t.x;w.fy=t.y}
    captureSettlement(t,r,L,seasons);a.target=null;a.siege=0;a.state='march';
  }
}
function captureSettlement(s,Wn,L,siege){
  const wasCap=L.cap===s.id;
  const razeP=(Wn.race==='orc'?.25:.05)+(hasT(Wn,'Cruel')?.2:0);
  let razed=false;
  if(chance(razeP)){razed=true;destroySettlement(s,`was put to the torch by ${rn(Wn)}`,[`r${Wn.id}`,`r${L.id}`],'ruin');}
  else{
    s.realm=Wn.id;s.pop*=.85;S.owner[s.cell]=Wn.id;s.unrest=Math.min(1,s.unrest+.4);const loot=L.gold*.15;L.gold-=loot;Wn.gold+=loot;
    if(s.b.walls&&chance(.4))delete s.b.walls;
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const x=s.x+dx,y=s.y+dy;if(x<0||y<0||x>=W||y>=H||dx*dx+dy*dy>9)continue;const j=y*W+x;if(S.owner[j]===L.id&&!X.at.get(j))S.owner[j]=Wn.id}
    log(wasCap||s.pop>6000?2:1,siege?'siege':'capture',wasCap?`${sn(s)}, seat of ${rn(L)}, fell to ${rn(Wn)}${siege?` after a siege of ${siege} season${siege>1?'s':''}`:''}.`:`${rn(Wn)} took ${sn(s)} from ${rn(L)}${siege?` after a siege of ${siege} season${siege>1?'s':''}`:''}.`,['r'+Wn.id,'r'+L.id,'s'+s.id],s.x,s.y);
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
  for(let i=0;i<N;i++)if(S.owner[i]===r.id)S.owner[i]=by&&chance(.5)?by.id:-1;
  S.wars=S.wars.filter(w=>w.a!==r.id&&w.b!==r.id);
  S.armies=S.armies.filter(a=>a.realm!==r.id);
  for(const v of S.realms)if(v.alive&&v.overlord===r.id){v.overlord=null;log(1,'independence',`With the fall of its overlord, ${rn(v)} stood alone once more.`,['r'+v.id])}
  for(const k of Object.keys(S.allies)){const[a,b]=k.split('-').map(Number);if(a===r.id||b===r.id)delete S.allies[k]}
  for(const k of Object.keys(S.rel)){const[a,b]=k.split('-').map(Number);if(a===r.id||b===r.id)delete S.rel[k]}
  if(by)by.gold+=r.gold*.5;
  const age=S.year-r.founded;record('oldRealm',age,r.name);
  log(age>40||r.tier>0?2:1,'fall',`${rn(r)} fell${by?' to '+rn(by):''}, ${age} years after its founding.`,['r'+r.id,by&&'r'+by.id]);
}
function warsWinter(){
  for(const w of S.wars.slice()){
    if(!S.wars.includes(w))continue;
    const A=S.realms[w.a],B2=S.realms[w.b];if(!A.alive||!B2.alive){S.wars.splice(S.wars.indexOf(w),1);continue}
    const dur=S.year-w.start;const pa=X.pop[A.id]||1,pb=X.pop[B2.id]||1;
    const exh=dur*.06+(w.lossA/pa+w.lossB/pb)*3;
    const idle=!S.armies.some(a=>(a.realm===w.a||a.realm===w.b)&&a.target!=null);
    if(chance(.06+exh*.25+(idle&&dur>=1?.25:0)+(Math.abs(w.score)>80?.25:0)))makePeace(w);
  }
}
function makePeace(w){
  S.wars.splice(S.wars.indexOf(w),1);
  const key=rkey(w.a,w.b);S.truce[key]=S.year+ri(12,25);S.rel[key]=Math.max(S.rel[key]||0,-15);
  const A=S.realms[w.a],B2=S.realms[w.b],dur=S.year-w.start;
  record('war',dur,w.name);
  let res='neither side could claim victory';
  if(Math.abs(w.score)>=12){const Wn=w.score>0?A:B2,L=w.score>0?B2:A;
    if(L.overlord===Wn.id&&w.name.includes('Independence'))res=`${rn(Wn)} crushed the rising and kept its vassal`;
    else if(Wn.overlord===L.id&&w.name.includes('Independence')){Wn.overlord=null;Wn.vassalSince=null;res=`${rn(Wn)} won its freedom`;log(2,'independence',`${rn(Wn)} threw off the rule of ${rn(L)}.`,['r'+Wn.id,'r'+L.id])}
    else if(Math.abs(w.score)>=40&&power(L)<power(Wn)*.45&&L.overlord==null&&!X.vassals.has(L.id)&&Wn.overlord==null){L.overlord=Wn.id;L.vassalSince=S.year;res=`${rn(L)} bent the knee and became a vassal of ${rn(Wn)}`}
    else{const trib=Math.min(L.gold*.3,4000);L.gold-=trib;Wn.gold+=trib;res=`${rn(Wn)} prevailed, kept the lands it had taken and exacted ${fmt(trib)} crowns in tribute`}}
  log(dur>=4||Math.abs(w.score)>40?2:1,'peace',`${wn(w)} ended after ${dur<1?'less than a year':dur+' year'+(dur===1?'':'s')}, ${w.battles} battle${w.battles===1?'':'s'} and ${w.sieges} siege${w.sieges===1?'':'s'}; ${res}.`,['r'+w.a,'r'+w.b,'w'+w.id]);
}

/* ---------- rulers, marriages, succession ---------- */
function deathCause(age,war){
  if(war&&chance(.3))return pick(['fell in battle','was slain leading a charge','died of wounds taken in the war']);
  if(age<38)return pick(['died of a sudden fever','was thrown from a horse','was poisoned at a feast','drowned crossing a river','died in a hunting accident']);
  return pick(['died in old age','died peacefully','died after a long illness','passed away, old and grey']);
}
function rulerYear(){
  for(const r of S.realms){if(!r.alive)continue;
    const ru=r.ruler,L=RACES[r.race].life,age=ageOf(r)/L,war=X.atWar.has(r.id);
    if(!ru.spouse&&age>=18&&chance(.22)){
      const cands=S.realms.filter(o=>o.alive&&o.id!==r.id&&(S.rel[rkey(o.id,r.id)]||0)>5&&(X.border.has(bkey(o.id,r.id))||S.allies[rkey(o.id,r.id)]));
      if(cands.length&&chance(.6)){const o=pick(cands);ru.spouse={name:given(o.race,!ru.f),dyn:o.ruler.dyn,realm:o.id,race:o.race};S.rel[rkey(o.id,r.id)]=Math.min(100,(S.rel[rkey(o.id,r.id)]||0)+25);
        log(setsOf(r.id).length>=3||setsOf(o.id).length>=3?1:0,'marriage',`A royal wedding: ${rulerStr(r)} of ${rn(r)} married ${ru.spouse.name} of House ${o.ruler.dyn}, kin of ${rn(o)}.`,['r'+r.id,'r'+o.id]);
        if(!S.allies[rkey(o.id,r.id)]&&chance(.35)&&allyCount(r.id)<3&&allyCount(o.id)<3&&!findWar(r.id,o.id)&&r.overlord==null&&o.overlord==null)S.allies[rkey(o.id,r.id)]=S.year}
      else ru.spouse={name:given(r.race,!ru.f),dyn:placeName(r.race),realm:null,race:r.race};
    }
    if(ru.spouse&&age<46&&ru.kids.length<6&&chance(.2)){const f=chance(.5);const k={name:given(r.race,f),f,born:S.year};ru.kids.push(k);
      if(ru.kids.length===1&&setsOf(r.id).length>=3)log(0,'birth',`An heir, ${k.name}, was born to ${rulerStr(r)} of ${rn(r)}.`,['r'+r.id])}
    ru.kids=ru.kids.filter(k=>!(S.year-k.born<5&&chance(.04))&&!chance(.006));
    if(ru.regent&&S.year-ru.born>=16){log(0,'crown',`${rulerStr(r)} of ${rn(r)} came of age and ended the regency of ${ru.regent}.`,['r'+r.id]);ru.regent=null}
    const p=.006+(age>40?(age-40)*.0065:0)+(war?.006:0)+(hasT(r,'Mad')?.01:0);
    if(chance(p))succession(r,deathCause(age,war));
    else if(setsOf(r.id).length>=4&&chance(.004+(r.stab<30?.01:0)))succession(r,pick(['was murdered by a trusted courtier','was found poisoned in the royal chambers','was stabbed on the palace stairs']),true);
  }
}
function succession(r,cause,murder){
  if(!r.alive)return;
  const old=r.ruler,reign=S.year-old.crowned,oldStr=rulerStr(r),ss=setsOf(r.id).length;
  closeReign(r,cause);
  const law=r.law,kids=old.kids.slice().sort((a,b)=>a.born-b.born);
  const hero=S.heroes.find(h=>h.alive&&h.realm===r.id&&h.ep);
  let txt,crisis=false;
  const heirOk=kids.length&&(law==='primogeniture'||(law==='tanistry'&&chance(.55))||(law==='elective council'&&chance(.5)));
  const sp=old.spouse&&old.spouse.realm!=null?S.realms[old.spouse.realm]:null;
  if(murder&&chance(.5)){r.dynasty=placeName(r.race);r.ruler=newRuler(r);r.stab-=12;txt=`The murderer's patron, ${rulerStr(r)} of House ${r.dynasty}, took the throne.`}
  else if(hero&&chance(.3)){
    r.dynasty=placeName(r.race);r.ruler=newRuler(r,{name:hero.name,f:hero.f,born:hero.born});hero.alive=false;hero.crowned=S.year;
    txt=`The people raised the hero ${hn(hero)} to the throne as ${rulerStr(r)}, founding House ${r.dynasty}.`;
  }else if(heirOk){
    const k=kids[0];const young=S.year-k.born<16;
    r.ruler=newRuler(r,{name:k.name,f:k.f,born:k.born,dyn:old.dyn,regent:young?(old.spouse?old.spouse.name:given(r.race,chance(.5))):null});
    txt=young?`The child ${rulerStr(r)}, aged ${S.year-k.born}, inherited the throne under the regency of ${r.ruler.regent}.`:`${old.f?'Her':'His'} ${k.f?'daughter':'son'} succeeded as ${rulerStr(r)}.`;
    if(young)r.stab-=8;
  }else if(!kids.length&&sp&&sp.alive&&sp.ruler.dyn===old.spouse.dyn&&sp.overlord==null&&r.overlord==null&&!X.vassals.has(r.id)&&chance(.45)&&!findWar(r.id,sp.id)){
    personalUnion(r,sp,oldStr,cause);return;
  }else if(law==='elected mayoralty'||law==='elective council'){
    r.dynasty=placeName(r.race);r.ruler=newRuler(r);txt=law==='elected mayoralty'?`The moot elected ${rulerStr(r)} of the ${r.dynasty} family.`:`The council of elders chose ${rulerStr(r)} of House ${r.dynasty}.`;
  }else{
    r.dynasty=placeName(r.race);r.ruler=newRuler(r);r.stab-=10;crisis=!kids.length;
    txt=law==='tanistry'?`The warlord ${rulerStr(r)} of the ${r.dynasty} clan seized power by strength of arms.`:`With no heir of the blood, ${rulerStr(r)} of House ${r.dynasty} claimed the crown.`;
  }
  log(ss>=8||r.tier===2||murder?1:0,murder?'intrigue':'crown',`${oldStr} of ${rn(r)} ${cause} after ${reign} year${reign===1?'':'s'} of rule. ${txt}`,['r'+r.id]);
  if(ss>=8&&chance((crisis?.25:.04)+(55-r.stab)/300))civilWar(r,'succession');
}
function personalUnion(r,heir,oldStr,cause){
  log(2,'union',`${oldStr} of ${rn(r)} ${cause} without children. By right of marriage the crown passed to ${rulerStr(heir)} of ${rn(heir)}, and the two realms were joined.`,['r'+r.id,'r'+heir.id]);
  if(setsOf(r.id).length>=3||chance(.5)){r.overlord=heir.id;r.vassalSince=S.year;r.dynasty=heir.ruler.dyn;r.ruler=newRuler(r,{dyn:heir.ruler.dyn});
    for(const w of S.wars.filter(w=>w.a===r.id||w.b===r.id))S.wars.splice(S.wars.indexOf(w),1)}
  else{for(const s of S.sets)if(s.realm===r.id)s.realm=heir.id;for(let i=0;i<N;i++)if(S.owner[i]===r.id)S.owner[i]=heir.id;r.alive=false;r.fell=S.year;r.merged=heir.id;
    S.wars=S.wars.filter(w=>w.a!==r.id&&w.b!==r.id);S.armies=S.armies.filter(a=>a.realm!==r.id);for(const v of S.realms)if(v.overlord===r.id)v.overlord=heir.id}
}
function upkeep(){
  for(const r of S.realms){if(!r.alive)continue;
    const ss=setsOf(r.id),pop=X.pop[r.id]||0;
    let st=0;for(const t of r.ruler.traits)st+=TRAITS[t].st||0;
    const artists=S.greats.filter(p=>p.alive&&p.kind==='artist'&&p.realm===r.id).length;
    let unrest=0;for(const s of ss)unrest+=s.unrest*s.pop;unrest/=Math.max(1,pop);
    const target=60+st*8+artists*5+tenet(r,'st',0)-Math.max(0,ss.length-8)*1.5-(X.atWar.has(r.id)?10:0)+(r.golden>S.year?15:0)-(S.winter>S.year?6:0)-unrest*40-(r.ruler.regent?8:0)-(r.overlord!=null?4:0);
    r.stab=clamp(r.stab+(target-r.stab)*.12+(rand()-.5)*5,0,100);
    if(r.tier===0&&ss.length>=3&&pop>=5000){
      const old=r.name;r.tier=1;r.custom=null;r.name=realmName(r);
      log(2,'rise',`${rnOld(r,old)} united under ${rulerStr(r)} as ${rn(r)}.`,['r'+r.id]);
    }else if(r.tier===1&&ss.length>=14&&pop>=120000&&r.overlord==null&&chance(.03)){
      const old=r.name;r.tier=2;r.name=realmName(r);const cap=X.byId.get(r.cap)||ss[0];
      log(2,'crown',`${rulerStr(r)} was crowned in ${sn(cap)}, and ${rnOld(r,old)} became ${rn(r)}.`,['r'+r.id],cap.x,cap.y);
    }else if(r.tier===2&&ss.length<5){
      const old=r.name;r.tier=1;r.name=realmName(r);
      log(2,'fall',`Shrunk to a handful of holdings, ${rnOld(r,old)} was an empire no more. It endured as ${rn(r)}.`,['r'+r.id]);
    }
    if(r.golden<S.year&&r.stab>78&&ss.length>=3&&chance(.012)){r.golden=S.year+ri(20,50);log(2,'golden',`A golden age dawned in ${rn(r)} under ${rulerStr(r)}.`,['r'+r.id])}
    if(ss.length>=7&&r.stab<20&&chance(.05))civilWar(r,'revolt');
    if(pop>r.peak)r.peak=pop;if((X.cells[r.id]||0)>r.peakCells)r.peakCells=X.cells[r.id];
    record('realm',(X.cells[r.id]||0)/G.land*100,r.name);
    for(const s of ss)record('city',s.pop,s.name);
    r.tech=Math.round(techOf(r));
  }
}
function civilWar(r,why){
  const ss=S.sets.filter(s=>s.realm===r.id);const cap=ss.find(s=>s.id===r.cap)||ss[0];if(!cap)return;
  const cands=ss.filter(s=>s!==cap);if(cands.length<2)return;
  const seed=cands.reduce((a,b)=>d2(b.x,b.y,cap.x,cap.y)*Math.sqrt(b.pop)*(1+b.unrest)>d2(a.x,a.y,cap.x,cap.y)*Math.sqrt(a.pop)*(1+a.unrest)?b:a);
  const moved=cands.filter(s=>d2(s.x,s.y,seed.x,seed.y)<d2(s.x,s.y,cap.x,cap.y));
  const nr=makeRealm(r.race,{parent:r.id,faith:r.faith,k:r.k,tier:moved.length>=3?1:0,custom:moved.length<3?`Free City of ${seed.name}`:null,gold:r.gold*.3});
  r.gold*=.7;
  for(const s of moved)s.realm=nr.id;nr.cap=seed.id;
  for(let i=0;i<N;i++){if(S.owner[i]!==r.id)continue;const x=i%W,y=(i/W)|0;let bs=null,bd=1e9;for(const s of ss){const d=d2(s.x,s.y,x,y);if(d<bd){bd=d;bs=s}}if(bs)S.owner[i]=bs.realm}
  const name=why==='succession'?`The War of the ${r.core} Succession`:`The ${seed.name} Rebellion`;
  log(2,'revolt',why==='succession'?`A succession crisis tore ${rn(r)} apart. ${sn(seed)} and ${moved.length-1} other holding${moved.length===2?'':'s'} rose as ${rn(nr)}.`
    :`Revolt! Weary of ${rulerStr(r)}, ${sn(seed)} and ${moved.length-1} other holding${moved.length===2?'':'s'} broke from ${rn(r)} as ${rn(nr)}.`,['r'+r.id,'r'+nr.id,'s'+seed.id],seed.x,seed.y);
  agg();newWar(nr.id,r.id,name);
  r.stab=Math.min(100,r.stab+20);nr.stab=55;
}
function vassalYear(){
  for(const r of S.realms){if(!r.alive)continue;
    if(r.overlord!=null){const o=S.realms[r.overlord];if(!o.alive){r.overlord=null;continue}
      if(o.race===r.race&&S.year-r.vassalSince>60&&setsOf(r.id).length<=4&&!X.atWar.has(r.id)&&chance(.02)){
        for(const s of S.sets)if(s.realm===r.id)s.realm=o.id;for(let i=0;i<N;i++)if(S.owner[i]===r.id)S.owner[i]=o.id;
        r.alive=false;r.fell=S.year;r.merged=o.id;closeReign(r,'integrated');S.armies=S.armies.filter(a=>a.realm!==r.id);
        for(const v of S.realms)if(v.overlord===r.id)v.overlord=o.id;
        log(2,'vassal',`After ${S.year-r.vassalSince} years as a vassal, ${rn(r)} was peacefully absorbed into ${rn(o)}.`,['r'+r.id,'r'+o.id]);}
      continue}
    if(X.vassals.has(r.id)||X.atWar.has(r.id))continue;
    const ss=setsOf(r.id);if(ss.length>3)continue;
    for(const[k]of X.border){const a=Math.floor(k/4096),b=k%4096;if(a!==r.id&&b!==r.id)continue;const o=S.realms[a===r.id?b:a];
      if(!o.alive||o.overlord!=null||power(o)<power(r)*4)continue;if((S.rel[rkey(o.id,r.id)]||0)<20)continue;if(o.race!==r.race&&o.faith!==r.faith)continue;
      if(chance(.015)){r.overlord=o.id;r.vassalSince=S.year;log(1,'vassal',`Seeking protection, ${rn(r)} swore fealty to ${rn(o)} and became its vassal.`,['r'+r.id,'r'+o.id]);break}}
  }
}

/* ---------- knowledge ---------- */
function knowledge(){
  const nb=new Map();const link=(a,b)=>{if(!nb.has(a))nb.set(a,new Set());nb.get(a).add(b)};
  for(const[k]of X.border){const a=Math.floor(k/4096),b=k%4096;link(a,b);link(b,a)}
  for(const t of X.routes||[]){link(t.ra,t.rb);link(t.rb,t.ra)}
  for(const r of S.realms){if(!r.alive)continue;const ss=setsOf(r.id),pop=X.pop[r.id]||0;
    const lib=ss.filter(s=>s.b.library).length,uni=ss.filter(s=>s.b.university).length,sch=S.greats.filter(p=>p.alive&&p.kind==='scholar'&&p.realm===r.id).length;
    const base=(.0005+Math.min(.0025,pop/1e7)+sch*.002+Math.min(3,lib)*.0008+uni*.002+(hasT(r,"Scholar")?.0015:0))*tenet(r,"tech",1);
    for(const f of FK){const lv=r.k[f];if(lv>=6)continue;
      let src=null;for(const o of nb.get(r.id)||[]){const R=S.realms[o];if(R.alive&&R.k[f]>lv&&(!src||R.k[f]>src.k[f]))src=R}
      const bias=f==='sea'?(ss.some(s=>s.port)?1.3:.2):f==='arcane'?(r.race==='elf'?1.4:1):f==='metal'?(r.race==='dwarf'?1.5:1):f==='agri'?(r.race==='halfling'?1.4:1):1;
      if(src&&chance(.0035*bias*(src.k[f]-lv))){r.k[f]++;log(0,'tech',`Knowledge of ${FIELDS[f].l[lv]} reached ${rn(r)} from ${rn(src)}.`,['r'+r.id,'r'+src.id])}
      else if(chance(base*bias*Math.pow(.7,lv))){r.k[f]++;const first=!S.firsts[f+lv];if(first)S.firsts[f+lv]=r.id;
        log(first?(lv>=3?2:1):(ss.length>=3?1:0),'tech',`${first?'For the first time in the world, s':'S'}cholars of ${rn(r)} mastered ${FIELDS[f].l[lv]}.`,['r'+r.id])}
    }
  }
}

/* ---------- faith ---------- */
function newFaith(origin,parent){
  const id=S.faiths.length,h=(id*97.3+S.seed%180+40)%360;
  const tenets=parent?[parent.tenets[0]]:[];while(tenets.length<2){const t=pick(TENET_KEYS);if(!tenets.includes(t))tenets.push(t)}
  const base=parent?parent.name.replace(/^(Reformed|Orthodox|True|Purified|Old) /,''):null;
  const name=parent?`${pick(['Reformed','Orthodox','True','Purified','Old'])} ${base}`:pick(F_P).replace('{x}',pick(F_A)+' '+pick(F_B));
  const f={id,name,founded:S.year,origin:origin?origin.name:null,site:origin?origin.id:null,css:`hsl(${h.toFixed(1)} 55% 58%)`,rgb:hsl2rgb(h,.55,.58),ext:null,tenets,parent:parent?parent.id:null};
  S.faiths.push(f);return f;
}
function faithYear(){
  const alive=S.realms.filter(r=>r.alive);
  for(const f of S.faiths.slice()){if(f.ext!=null||S.year-f.founded<30)continue;const fol=alive.filter(r=>r.faith===f.id);
    if(fol.length>=4&&chance(.012)){const r=pick(fol.slice(1));const c=X.byId.get(r.cap);const nf=newFaith(c,f);r.faith=nf.id;
      log(2,'schism',`Schism! Preachers in ${c?sn(c):rn(r)} denounced the ${f.name} as corrupt. ${rn(r)} broke away to follow the ${nf.name}.`,['r'+r.id],c?c.x:null,c?c.y:null)}}
  for(const f of S.faiths){if(f.site==null||f.ext!=null)continue;const s=X.byId.get(f.site);if(!s)continue;
    if(S.realms[s.realm].faith===f.id&&alive.filter(r=>r.faith===f.id).length>=2&&chance(.02))log(0,'pilgrim',`Pilgrims of the ${f.name} crowded the roads to the holy city of ${sn(s)}.`,['s'+s.id])}
  if(S.year%10===0){for(const f of S.faiths){if(f.ext!=null||f.hidden!=null)continue;if(S.year-f.founded<5)continue;if(!alive.some(r=>r.faith===f.id)){f.ext=S.year;log(1,'faith',`The last followers of the ${f.name} passed from the world.`,[])}}}
}

/* ---------- plague ---------- */
function plagueStep(){
  if(S.sets.length>10&&chance(.012*Q)){
    const o=wpick(S.sets,s=>s.immune>S.year?0:s.pop*(1+((X.tradeCity&&X.tradeCity.get(s.id))||0)));
    if(o&&!(o.immune>S.year)){const p={id:S.nid++,name:`the ${pick(PL_A)} ${pick(PL_B)}`,born:S.year,act:{[o.id]:S.tick},dead:0,sev:.025+rand()*.05,inf:.6+rand()*.6,cities:1};S.plagues.push(p);o.immune=S.year+40;
      log(2,'plague',`${capF(p.name)} broke out in ${sn(o)}.`,['s'+o.id,'r'+o.realm],o.x,o.y)}}
  const links=new Map();const add=(a,b)=>{if(!links.has(a))links.set(a,[]);links.get(a).push(b)};
  for(const t of X.routes||[]){add(t.a,t.b);add(t.b,t.a)}for(const[a,b]of X.roads||[]){add(a,b);add(b,a)}
  for(const p of S.plagues.slice()){
    let any=false;
    for(const id in p.act){const age=S.tick-p.act[id];const s=X.byId.get(+id);if(age>3||!s){delete p.act[id];continue}any=true;
      const loss=s.pop*p.sev*(s.b.temple?.85:1);s.pop-=loss;p.dead+=loss;s.unrest=Math.min(1,s.unrest+.1);
      const cand=[...(links.get(s.id)||[]).map(i=>[i,.16]),...S.sets.filter(t=>t!==s&&d2(t.x,t.y,s.x,s.y)<36).map(t=>[t.id,.05])];
      for(const[i,pr]of cand){const t=X.byId.get(i);if(!t||t.immune>S.year||p.act[i]!=null||!chance(pr*(p.inf||1)*(S.season===3?.5:1)))continue;p.act[i]=S.tick;t.immune=S.year+40;p.cities++;
        const r=S.realms[t.realm];if(r.cap===t.id)log(1,'plague',`${capF(p.name)} reached ${sn(t)}, seat of ${rn(r)}.`,['s'+t.id,'r'+r.id],t.x,t.y)}}
    if(!any){S.plagues.splice(S.plagues.indexOf(p),1);record('plague',p.dead,p.name);
      const yrs=Math.max(1,S.year-p.born);
      log(p.dead>20000?2:1,'plague',`${capF(p.name)} burned itself out after ${yrs} year${yrs>1?'s':''}, having struck ${p.cities} settlement${p.cities>1?'s':''} and killed ${fmtDead(p.dead)}.`,[])}
  }
}

/* ---------- outlaws ---------- */
function bandsStep(){
  if(S.bands.length<6&&S.year>20){
    if(chance(.05*Q)){const poor=S.realms.filter(r=>r.alive&&r.stab<40&&setsOf(r.id).length>=2);const r=poor.length?pick(poor):null;
      const cells=r?X.byR[r.id]:X.free;if(cells&&cells.length){const i=pick(cells);const used=new Set(S.bands.map(b=>b.name));const nm=pick(BANDIT_N.filter(n=>!used.has(n)))||'the Nameless';
        const b={id:S.nid++,kind:'bandit',name:nm,x:i%W,y:(i/W)|0,size:ri(60,300),born:S.year,loot:0,life:ri(5,30)};S.bands.push(b);
        log(1,'bandit',`Outlaws calling themselves ${b.name} took to the roads ${near(b.x,b.y)}.`,[r&&'r'+r.id],b.x,b.y)}}
    if((X.routes||[]).filter(t=>t.sea).length>4&&chance(.035*Q)){let i=-1;for(let t=0;t<200;t++){const j=(rand()*N)|0;if(!isLand(G.biome[j])&&G.seaDist[j]>=1&&G.seaDist[j]<=4){i=j;break}}
      if(i>=0){const used=new Set(S.bands.map(b=>b.name));const nm=pick(PIRATE_N.filter(n=>!used.has(n)))||'the Sea Dogs';const b={id:S.nid++,kind:'pirate',name:nm,x:i%W,y:(i/W)|0,size:ri(80,350),born:S.year,loot:0,life:ri(5,25)};S.bands.push(b);
        log(1,'pirate',`Pirates flying the colours of ${b.name} began to prey on shipping ${near(b.x,b.y)}.`,[],b.x,b.y)}}
  }
  for(const b of S.bands.slice()){
    if(S.year-b.born>b.life){S.bands.splice(S.bands.indexOf(b),1);log(0,b.kind,`${capF(b.name)} scattered, rich and forgotten.`,[]);continue}
    for(let t=0;t<10;t++){const x=clamp(b.x+ri(-2,2),0,W-1),y=clamp(b.y+ri(-2,2),0,H-1),i=y*W+x;if(b.kind==='pirate'?(!isLand(G.biome[i])&&G.seaDist[i]<=5):isLand(G.biome[i])){b.x=x;b.y=y;break}}
    const t=S.sets.filter(s=>d2(s.x,s.y,b.x,b.y)<49&&(b.kind!=='pirate'||s.port));
    if(t.length&&chance(.3)){const s=pick(t),r=S.realms[s.realm];const take=Math.min(r.gold*.08,40+s.pop*.02);r.gold-=take;b.loot+=take;s.pop*=.99;b.size+=20;
      if(chance(.35))log(0,b.kind,`${capF(b.name)} ${b.kind==='pirate'?'raided the harbour of':'plundered the roads around'} ${sn(s)}, carrying off ${fmt(take)} crowns.`,['s'+s.id,'r'+r.id],s.x,s.y)}
    const owner=S.owner[b.y*W+b.x];const R=owner>=0?S.realms[owner]:null;
    const army=S.armies.find(a=>d2(a.x,a.y,b.x,b.y)<6);
    const hunted=army||(R&&chance(.06*(setsOf(R.id).some(s=>s.b.barracks)?2:1)*(power(R)>b.size/10?1:.3)));
    if(hunted){S.bands.splice(S.bands.indexOf(b),1);const by=army?S.realms[army.realm]:R;
      log(1,b.kind,`${capF(b.name)} ${b.kind==='pirate'?'were run down at sea':'were hunted down'}${by?' by the soldiers of '+rn(by):''}${b.loot>200?`, and ${fmt(b.loot)} crowns of plunder recovered`:''}.`,[by&&'r'+by.id],b.x,b.y);if(by)by.gold+=b.loot*.5}
  }
}

/* ---------- monsters, heroes, great people ---------- */
function spawnBeast(){
  const roll=rand();let kind,cell=-1,name,ruin=null;
  const wild=c=>!tooClose(c%W,(c/W)|0,9);
  if(roll<.2&&S.ruins.length){kind='lich';ruin=pick(S.ruins);cell=ruin.y*W+ruin.x}
  else if(roll<.34){kind='serpent';for(let t=0;t<400;t++){const i=(rand()*N)|0;if(!isLand(G.biome[i])&&G.seaDist[i]>=2&&G.seaDist[i]<=6){cell=i;break}}}
  else{kind=roll<.76?'dragon':'giant';const want=kind==='dragon'?[B.MOUNTAIN,B.PEAK]:[B.HILLS,B.MOUNTAIN];
    for(let t=0;t<300;t++){const i=(rand()*N)|0;if(want.includes(G.biome[i])&&wild(i)){cell=i;break}}}
  if(cell<0)return;
  const x=cell%W,y=(cell/W)|0;
  if(kind==='dragon')name=cap1(pick(['Vor','Ska','Ith','Zar','Mal','Kry','Aur','Thra','Neth','Ghal','Oro','Syx'])+pick(['athax','iss','omir','yrex','ugor','andrax','esh','ion','abrax','emoth']))+' the '+pick(['Ashen','Red','Pale','Devourer','Undying','Gilded','Black','Stormborn','Old','Hungering']);
  else if(kind==='giant')name=given('orc',false)+' the '+pick(['Stone-Giant','Frost-Giant','Hill-King','Cyclops','Mountain-Shaker']);
  else if(kind==='serpent')name=cap1(pick(['Leviath','Thal','Mor','Ugl','Kra','Ny','Hy'])+pick(['assa','oth','ugor','ken','dris','yra']))+' the '+pick(['Deep-Coil','Ship-Breaker','Drowner','Sea-Wyrm','Abyssal']);
  else name=`Lich ${given('human',chance(.4))} of ${ruin.name}`;
  const b={id:S.nid++,kind,name,x,y,born:S.year,life:kind==='dragon'?ri(300,800):kind==='giant'?ri(60,180):kind==='serpent'?ri(100,400):ri(150,600),power:kind==='dragon'?ri(8,12):kind==='lich'?ri(6,10):kind==='serpent'?ri(6,9):ri(4,7),alive:true,kills:0,hoard:0};
  S.beasts.push(b);if(S.beasts.length>50)S.beasts.splice(0,S.beasts.findIndex(q=>!q.alive)+1||1);
  const msg=kind==='dragon'?`${bn(b)} awoke in the mountains ${near(x,y)}.`:kind==='giant'?`${bn(b)} came down from the high country ${near(x,y)}.`:kind==='serpent'?`Sailors spoke in terror of ${bn(b)}, risen from the deep ${near(x,y)}.`:`In the ruins of ${ruin.name}, ${bn(b)} rose from the grave.`;
  log(2,kind,msg,['b'+b.id],x,y);
}
function beastStep(){
  const alive=S.beasts.filter(b=>b.alive);
  const wild=X.free.length/G.land;
  if(alive.length<3&&S.year>30&&chance(.012*Q*(.4+wild*2)))spawnBeast();
  for(const b of alive){
    if(S.year-b.born>b.life){b.alive=false;log(1,b.kind,b.kind==='lich'?`The unlife of ${bn(b)} guttered out at last.`:`${bn(b)} was never seen again. Some say it sleeps still.`,['b'+b.id]);continue}
    if(chance(.2*Q)){
      let t=S.sets.filter(s=>d2(s.x,s.y,b.x,b.y)<256);if(b.kind==='serpent')t=t.filter(s=>s.port);if(!t.length)continue;
      const s=wpick(t,s=>Math.sqrt(s.pop)/(1+Math.sqrt(d2(s.x,s.y,b.x,b.y))));
      const loss=s.pop*(.05+rand()*.2)/(s.b.walls?1.6:1);b.kills+=loss;const r=S.realms[s.realm];if(b.kind==='dragon'){const g=r.gold*.1;r.gold-=g;b.hoard+=g}
      if(s.pop<450||chance(.04)){destroySettlement(s,b.kind==='dragon'?`was burned to ash by ${bn(b)}`:b.kind==='lich'?`was emptied by the dead servants of ${bn(b)}`:b.kind==='serpent'?`was dragged beneath the waves by ${bn(b)}`:`was crushed to rubble by ${bn(b)}`,['b'+b.id],b.kind);}
      else{s.pop-=loss;log(1,b.kind,`${bn(b)} fell upon ${sn(s)}. ${fmtDead(loss)} perished.`,['b'+b.id,'s'+s.id,'r'+s.realm],s.x,s.y)}
    }
    if(b.kind!=='lich'&&chance(.04*Q)){for(let t=0;t<60;t++){const x=clamp(b.x+ri(-15,15),0,W-1),y=clamp(b.y+ri(-15,15),0,H-1),i=y*W+x,bb=G.biome[i];
      if(b.kind==='serpent'?(!isLand(bb)&&G.seaDist[i]>=1&&G.seaDist[i]<=7):(bb===B.MOUNTAIN||bb===B.PEAK||bb===B.HILLS)){b.x=x;b.y=y;break}}}
  }
}
const EPITHET={dragon:'Dragonsbane',lich:'the Lightbringer',giant:'Giantfeller',serpent:'the Wave-Rider'};
function heroStep(){
  const beasts=S.beasts.filter(b=>b.alive),heroes=S.heroes.filter(h=>h.alive);
  if(heroes.length<6&&S.sets.length&&chance((.012+beasts.length*.025)*Q)){
    const s=beasts.length?wpick(S.sets,s=>1/(1+Math.min(...beasts.map(b=>d2(s.x,s.y,b.x,b.y))))):pick(S.sets);
    const r=S.realms[s.realm],f=chance(.4);
    const h={id:S.nid++,name:given(r.race,f),f,race:r.race,realm:r.id,home:s.name,hx:s.x,hy:s.y,born:S.year-ri(16,24),alive:true,ep:null,deeds:0};
    S.heroes.push(h);if(S.heroes.length>60)S.heroes.splice(0,S.heroes.findIndex(q=>!q.alive)+1||1);
    log(1,'hero',`${hn(h)} of ${sn(s)} took up ${RACES[r.race].weapon}${beasts.length?', swearing to rid the land of monsters':''}.`,['s'+s.id,'r'+r.id],s.x,s.y);
  }
  for(const h of S.heroes){if(!h.alive)continue;
    const age=(S.year-h.born)/RACES[h.race].life;
    if(age>55+rand()*25&&chance(.15*Q)){h.alive=false;if(h.ep||h.deeds>2)log(1,'death',`${hn(h)} died, and was mourned across ${S.realms[h.realm].alive?rn(S.realms[h.realm]):'the land'}.`,['r'+h.realm]);continue}
    const live=S.beasts.filter(b=>b.alive);if(!live.length||!chance(.2*Q))continue;
    const b=live.reduce((a,c)=>d2(c.x,c.y,h.hx,h.hy)<d2(a.x,a.y,h.hx,h.hy)?c:a);if(d2(b.x,b.y,h.hx,h.hy)>1225)continue;
    if(chance(clamp(.3+h.deeds*.06-b.power*.012,.08,.7))){
      b.alive=false;b.slain=S.year;h.ep=h.ep||EPITHET[b.kind];h.deeds+=3;
      const R=S.realms[h.realm];if(R.alive){R.stab=Math.min(100,R.stab+12);R.gold+=b.kills/20+b.hoard}
      log(2,'slay',`${hn(h)} slew ${bn(b)}, ending ${S.year-b.born} years of terror${b.hoard>100?` and carrying home a hoard of ${fmt(b.hoard)} crowns`:''}.`,['b'+b.id,'r'+h.realm],b.x,b.y);
    }else{h.alive=false;log(1,'death',`${hn(h)} rode out to face ${bn(b)} and was never seen again.`,['b'+b.id,'r'+h.realm],b.x,b.y)}
  }
}
function greatStep(){
  const alive=S.greats.filter(p=>p.alive);
  if(alive.length<12){for(const r of S.realms){if(!r.alive)continue;const ss=setsOf(r.id);if(ss.length<2)continue;
    if(!chance(.0035*(1+techOf(r)*.25)*Math.min(3,ss.length/4)*(r.golden>S.year?2:1)*(ss.some(s=>s.b.university)?1.6:1)))continue;
    const kinds=['scholar','artist','general','explorer','mage'];
    const k=wpick(kinds,k=>k==='general'?(X.atWar.has(r.id)?3:.6):k==='mage'?(r.k.arcane>=3?1.4:.3):k==='explorer'?(ss.some(s=>s.port)?1:0):1.2);
    const s=wpick(ss,s=>s.pop),f=chance(.45);
    const p={id:S.nid++,kind:k,name:given(r.race,f),f,realm:r.id,home:s.name,born:S.year-ri(18,30),alive:true,works:[],deeds:0,race:r.race};
    S.greats.push(p);if(S.greats.length>100)S.greats.splice(0,S.greats.findIndex(q=>!q.alive)+1||1);
    const intro={scholar:`The scholar ${gn(p)} began teaching in ${sn(s)}.`,artist:`In ${sn(s)}, the young artist ${gn(p)} drew crowds and patrons alike.`,
      general:`${gn(p)} of ${sn(s)} rose through the ranks to command the armies of ${rn(r)}.`,explorer:`The explorer ${gn(p)} set sail from ${sn(s)} to chart the unknown seas.`,
      mage:`${gn(p)} of ${sn(s)} was named Archmage of ${rn(r)}.`}[k];
    log(1,GREAT[k].ico,intro,['r'+r.id,'s'+s.id,'g'+p.id],s.x,s.y);break}}
  for(const p of S.greats){if(!p.alive)continue;const r=S.realms[p.realm];
    const age=(S.year-p.born)/RACES[p.race].life;
    if(!r.alive||(age>50&&chance(.04+(age-50)*.01))){p.alive=false;p.died=S.year;if(p.works.length||p.deeds>2)log(1,'death',`${p.kind==='mage'?'The Archmage':'The '+GREAT[p.kind].n.toLowerCase()} ${gn(p)} died${p.works.length?', remembered for '+p.works.map(w=>w.n).join(' and '):''}.`,['g'+p.id,'r'+p.realm]);continue}
    if(GREAT[p.kind].w.length&&p.works.length<3&&chance(.06)){const n=pick(GREAT[p.kind].w).replace('{a}',pick(WORK_A));p.works.push({n,y:S.year});
      log(p.works.length===1?1:0,GREAT[p.kind].ico,`${gn(p)} completed ${n}.`,['g'+p.id,'r'+p.realm])}
    if(p.kind==='explorer'&&chance(.08)){X.explore=p.realm;p.deeds++;if(chance(.5))log(1,'explorer',`${gn(p)} returned with charts of distant shores, and ships of ${rn(r)} followed.`,['g'+p.id,'r'+p.realm])}
    if(p.kind==='mage'&&chance(.012)){
      const s=X.byId.get(r.cap)||setsOf(r.id)[0];if(!s)continue;
      if(chance(.45)){const rad=ri(3,6);const cx=clamp(s.x+ri(-8,8),0,W-1),cy=clamp(s.y+ri(-8,8),0,H-1);S.scars.push({kind:'blight',x:cx,y:cy,r:rad,until:S.year+ri(60,160),cause:p.name});
        let dead=0;for(const t of S.sets.slice())if(d2(t.x,t.y,cx,cy)<=rad*rad){if(t.pop<800){dead+=t.pop;destroySettlement(t,`was unmade by wild magic`,['g'+p.id],'blight')}else{dead+=t.pop*.4;t.pop*=.6}}
        p.alive=false;p.died=S.year;
        log(2,'blight',`An experiment of the Archmage ${gn(p)} went terribly wrong. A blight of wild magic scarred the land ${near(cx,cy)}${dead>0?` and ${fmtDead(dead)} perished`:''}.`,['g'+p.id,'r'+p.realm],cx,cy);}
      else if(r.k.arcane<6){const lv=r.k.arcane;r.k.arcane++;log(1,'mage',`The Archmage ${gn(p)} unlocked the secrets of ${FIELDS.arcane.l[lv]} for ${rn(r)}.`,['g'+p.id,'r'+p.realm])}
    }
  }
}

/* ---------- the turning of the seasons ---------- */
function events(){
  const alive=S.realms.filter(r=>r.alive);
  if(S.season===3)warsWinter();
  if(S.season===1)for(const s of S.sets){if(s.pop>12000&&s.w.length<2){const r=S.realms[s.realm];if(r.tier>=1&&r.gold>700&&r.income>25&&chance(.005*(1+techOf(r)*.25)*(hasT(r,'Builder')?3:1)*(r.golden>S.year?2:1))){
    r.gold-=700;const n=`the ${pick(WON_A)} ${pick(WON_B)}`;s.w.push({n,y:S.year});log(2,'wonder',`Builders of ${rn(r)} completed ${n} in ${sn(s)}.`,['r'+r.id,'s'+s.id],s.x,s.y)}}}
  const living=new Set(alive.map(r=>r.faith));
  if(S.sets.length&&chance((.005+(living.size<3?.012:0))*Q)){
    const s=pick(S.sets),r=S.realms[s.realm],f=newFaith(s);
    if(chance(.55)||hasT(r,'Pious')){r.faith=f.id;log(2,'prophet',`A prophet in ${sn(s)} proclaimed the ${f.name}, a faith that ${TENETS[f.tenets[0]].d} and ${TENETS[f.tenets[1]].d}. ${rn(r)} embraced it.`,['s'+s.id,'r'+r.id],s.x,s.y)}
    else{r.stab-=8;log(2,'prophet',`A prophet in ${sn(s)} proclaimed the ${f.name}, and was cast out by ${rulerStr(r)}. The faith spread in secret.`,['s'+s.id,'r'+r.id],s.x,s.y);f.hidden=r.id}
  }
  for(const f of S.faiths){if(f.hidden!=null&&f.ext==null&&chance(.03*Q)){const r=S.realms[f.hidden];if(r.alive){r.faith=f.id;f.hidden=null;log(2,'faith',`The hidden ${f.name} won over ${rn(r)} at last.`,['r'+r.id])}}}
  if(chance(.6*Q)){for(const[k]of X.border){const a=S.realms[Math.floor(k/4096)],b=S.realms[k%4096];if(!a.alive||!b.alive||a.faith===b.faith)continue;
    const big=(X.cells[a.id]||0)>=(X.cells[b.id]||0)?a:b,small=big===a?b:a;
    const p=(.006+(hasT(big,'Pious')?.02:0))*tenet(big,'conv',1)*(setsOf(big.id).some(s=>s.b.temple)?1.5:1);if(!chance(p))continue;
    if((S.rel[rkey(a.id,b.id)]||0)<-20)continue;
    small.faith=big.faith;log(1,'faith',`${rn(small)} converted to the ${S.faiths[big.faith].name}, preached by missionaries from ${rn(big)}.`,['r'+small.id,'r'+big.id]);break}}
  if(S.sets.length&&chance(.007*Q)){
    const c=S.sets.filter(s=>G.nearMtn[s.cell]||G.river[s.cell]);if(c.length){const s=pick(c);const mtn=G.nearMtn[s.cell];
      if(mtn&&chance(.4))S.scars.push({kind:'ash',x:s.x,y:s.y,r:ri(2,4),until:S.year+ri(25,70)});
      if(mtn&&s.pop<1500&&chance(.3))destroySettlement(s,pick(['was buried when the mountain above it erupted','was swallowed by a great earthquake']),[],'quake');
      else{const m=mtn?.45+rand()*.3:.75+rand()*.15,dead=s.pop*(1-m);s.pop*=m;if(!mtn&&s.food>0)s.food*=.5;log(1,mtn?'quake':'flood',mtn?`${pick(['An earthquake','A volcanic eruption'])} struck ${sn(s)}. ${fmtDead(dead)} died.`:`The river rose and flooded ${sn(s)}, drowning ${fmtDead(dead)} and rotting the stores.`,['s'+s.id,'r'+s.realm],s.x,s.y)}}
  }
  if(S.sets.length&&S.season===1&&chance(.03)){const big=S.sets.filter(t=>t.pop>4000);if(big.length){const s=wpick(big,t=>t.pop);const dead=s.pop*(.03+rand()*.08);s.pop-=dead;const lost=Object.keys(s.b).filter(k=>k!=='walls');let what='';if(lost.length&&chance(.4)){const k=pick(lost);delete s.b[k];what=`, and the ${BUILD[k].n.toLowerCase()} with it`}
    log(1,'fire',`A great fire swept through ${sn(s)}, killing ${fmtDead(dead)}${what}.`,['s'+s.id,'r'+s.realm],s.x,s.y)}}
  if(S.season===1&&chance(.04)){const r=alive.filter(x=>x.stab>60&&x.gold>800&&setsOf(x.id).length>=3);if(r.length){const R=pick(r),c=X.byId.get(R.cap);if(c){R.stab=Math.min(100,R.stab+3);R.gold-=150;
    log(0,chance(.5)?'festival':'tournament',`${rulerStr(R)} held ${pick(FESTIVALS)} in ${sn(c)}, and folk came from across ${rn(R)}.`,['r'+R.id,'s'+c.id])}}}
  if(!(S.winter>S.year)&&S.year>60&&S.season===3&&chance(.0035)){S.winter=S.year+ri(4,12);log(2,'winter',`The sun dimmed and ${pick(['the Long Winter','the Fimbul Frost','the Grey Years','the Season of Ice'])} began. Snow fell in summer and harvests failed across ${S.name}.`,[])}
  else if(S.winter&&S.winter<=S.year&&S.season===1){S.winter=0;log(1,'thaw',`The long winter broke at last, and the rivers ran free again.`,[])}
  if(chance(.004*Q))log(1,'comet',`A comet with a ${pick(['green','crimson','silver','golden','violet'])} tail blazed across the sky for ${ri(9,40)} nights. Seers argued over its meaning.`,[]);
  if(alive.length&&chance(.003*Q)){const r=pick(alive);log(0,'omen',`The sun went dark at midday. In ${rn(r)} it was taken as an omen.`,['r'+r.id])}
  if(S.season===0&&S.year>80&&chance(.004)){const edge=X.free.filter(i=>{const x=i%W,y=(i/W)|0;return(x<25||x>W-25||y<18||y>H-18)&&!tooClose(x,y,10)});if(edge.length){const i=pick(edge);const where=near(i%W,(i/W)|0);
    const r=makeRealm('orc',{tier:0,k:{agri:0,metal:2,sea:0,arcane:0,letters:0},gold:1200});r.custom=`The ${r.core} Horde`;r.name=r.custom;const s=addSettlement(r,i,ri(1500,3000));r.cap=s.id;
    agg();const tgt=S.sets.filter(t=>t.realm!==r.id).sort((a,b)=>d2(a.x,a.y,s.x,s.y)-d2(b.x,b.y,s.x,s.y))[0];
    log(2,'army',`From the wastes ${where} came ${rn(r)}, a horde of riders numbering in the thousands.`,['r'+r.id],s.x,s.y);
    if(tgt&&chance(.8)){S.rel[rkey(r.id,tgt.realm)]=-80;declareWar(r,S.realms[tgt.realm],null,'plunder')}}}
}
function spawnPeoples(){
  const alive=S.realms.filter(r=>r.alive).length;const fr=X.free.length/G.land;
  if(alive>=32||X.free.length<40||!chance(.02+fr*.12))return;
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
  if(S.winter>S.year&&!/Frost|White/.test(cur.name)&&age>30&&chance(.15)){newEra(pick(['The Age of Frost','The Frost Years','The White Age']));return}
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
  S={v:3,seed,rng:(seed^0x5bd1e995)>>>0,tick:0,year:0,season:0,name:'',owner:new Int16Array(N).fill(-1),farm:new Uint8Array(N),realms:[],sets:[],ruins:[],beasts:[],heroes:[],greats:[],faiths:[],
    wars:[],armies:[],plagues:[],bands:[],allies:{},truce:{},rel:{},log:[],legends:[],hist:[],eras:[],scars:[],winter:0,nid:1,wn:{},raceFaith:{},tradeSeen:{},firsts:{},rec:{},saved:Date.now()};
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
  agg();computeBorders();recordHist();buildNetworks();farmDirty=true;
}
function labelMasses(g){
  g.mass=new Int16Array(N).fill(-1);let id=0;
  for(let i=0;i<N;i++){if(g.mass[i]>=0||!isLand(g.biome[i]))continue;const q=[i];g.mass[i]=id;
    for(let h=0;h<q.length;h++){const j=q[h],x=j%W,y=(j/W)|0;for(const[dx,dy]of DIRS){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const k=yy*W+xx;if(g.mass[k]<0&&isLand(g.biome[k])){g.mass[k]=id;q.push(k)}}}
    id++}
}
function serialize(){return JSON.stringify(Object.assign({},S,{owner:Array.from(S.owner),farm:Array.from(S.farm)}))}
function restore(text){
  const o=JSON.parse(text);if(!o||o.v!==3||!Array.isArray(o.owner))return false;
  o.owner=Int16Array.from(o.owner);o.farm=Uint8Array.from(o.farm||[]);if(o.farm.length!==N)o.farm=new Uint8Array(N);S=o;G=genTerrain(S.seed);labelMasses(G);
  X.names=new Set([...S.sets.map(s=>s.name),...S.ruins.map(r=>r.name)]);
  for(const r of S.realms){const c=realmColor(r.id);r.color=c.css;r.rgb=c.rgb;if(!r.motto)r.motto=makeMotto(r.race)}
  agg();computeBorders();scarMul();X.silent=true;buildNetworks();X.silent=false;farmDirty=true;return true;
}
function save(){try{S.saved=Date.now();localStorage.setItem(SAVE_KEY,serialize())}catch(e){}}
function loadSaved(){try{const t=localStorage.getItem(SAVE_KEY);return t?restore(t):false}catch(e){return false}}
