/* =====================================================================
   UI · the codex, the clock, the index
   ===================================================================== */
(function buildSprite(){
  let s='<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden">';
  for(const k in TI)s+=`<symbol id="i-${k}" viewBox="0 0 512 512">${TI[k].map(([d])=>`<path d="${d}"/>`).join('')}</symbol>`;
  $('#sprite').innerHTML=s+'</svg>';
})();
const ico=(k,cls='i')=>`<svg class="${cls}" aria-hidden="true"><use href="#i-${TI[k]?k:'circle-dot'}"/></svg>`;
const icd=(k,d)=>`<span class="ic" style="--d:${pal(d)}">${ico(k)}</span>`;
const chip=c=>icd(catIcon(c),catDom(c));
// domain emblems: engraved art (assets/emblems) used as masks, so each takes its domain's ink
(function emblemStyles(){const st=document.createElement('style');st.textContent=Object.entries(ART.emblem).map(([k,u])=>`.e-${k}{-webkit-mask-image:url(${u});mask-image:url(${u})}`).join('');document.head.appendChild(st)})();
const emb=(d,cls='')=>`<i class="emb e-${ART.emblem[d]?d:'era'} ${cls}" aria-hidden="true"></i>`;
const sigil=d=>emb(d,'sigil');
const tag=(t,cls='')=>`<span class="tag ${cls}">${t}</span>`;

let playing=true,speed=1,acc=0,last=performance.now(),uiDirty=true,lastUi=0,logLevel=1,tab='chronicle',realmSort='pop',sideOpen=true,fallenOpen=false,legendCollapsed=window.innerWidth<1000;
let domOff=new Set();const navStack=[];
const logEl=$('#log');

/* ---------- chronicle ---------- */
function domainChips(){$('#domainChips').innerHTML=DOMAIN_KEYS.map(k=>`<button type="button" class="sg" data-d="${k}" aria-pressed="${!domOff.has(k)}" aria-label="${DOMAIN[k].n}" data-tip="${DOMAIN[k].n}" style="--d:${pal(k)}">${emb(k)}</button>`).join('')}
const visible=e=>e.i>=logLevel&&(e.i===3||!domOff.has(catDom(e.c)));
function evEl(e,isFresh){
  if(e.i===3){const d=document.createElement('div');d.className='era-row';d.innerHTML=`<div>${e.t.replace(/^The /,'')}</div><small>Anno ${e.y} · a new age</small>`;return d}
  const d=document.createElement('div');const dom=catDom(e.c);d.className=`ev i${e.i}${isFresh?' fresh':''}`;d.style.setProperty('--d',pal(dom));
  d.innerHTML=`${e.i===2?`<span class="ic">${emb(dom)}</span>`:chip(e.c)}<div><div class="t">${e.t}</div><div class="meta"><span class="dom">${DOMAIN[dom].n}</span><span>·</span><span>${SEASONS[e.s??0]}</span></div></div>`;return d}
function yearHead(y){const h=document.createElement('div');h.className='yearhead';h.dataset.y=y;h.innerHTML=`<span class="y">Anno<b>${y}</b></span><span class="rn">${roman(Math.max(1,y))}</span>`;return h}
function rebuildLog(){
  logEl.textContent='';const items=S.log.filter(visible).slice(-320).reverse();const f=document.createDocumentFragment();let y=null;
  for(const e of items){if(e.i!==3&&e.y!==y){y=e.y;f.appendChild(yearHead(y))}f.appendChild(evEl(e,false))}
  if(!items.length){const d=document.createElement('div');d.className='empty';d.textContent='Nothing yet matches these filters. History is still being written.';f.appendChild(d)}
  logEl.appendChild(f);
}
function flushLog(){
  if(!fresh.length)return;
  const items=fresh.filter(visible);
  if(items.length>40)rebuildLog();
  else for(const e of items){
    const first=logEl.firstElementChild;if(first&&first.classList.contains('empty'))first.remove();
    const top=logEl.firstElementChild;
    if(e.i===3)logEl.prepend(evEl(e,true));
    else if(top&&top.classList.contains('yearhead')&&+top.dataset.y===e.y)top.after(evEl(e,true));
    else{logEl.prepend(evEl(e,true));logEl.prepend(yearHead(e.y))}
  }
  while(logEl.children.length>380)logEl.lastChild.remove();
  const great=fresh.filter(e=>e.i>=2);
  if(great.length&&playing){for(const e of great.slice(-2))toast(e);const g=great[great.length-1];Sound.cue(g.c);
    if(opts.follow){const e=[...great].reverse().find(e=>e.x!=null);if(e)flyTo(e.x,e.yy,Math.max(2.2,Math.min(view.z,3.4)))}}
  else if(fresh.length){const c=fresh.find(e=>e.i>=1&&(e.c==='war'||e.c==='battle'));if(c)Sound.cue(c.c)}
  fresh=[];
}
function toast(e){
  if(e.i===3)return;
  const el=document.createElement('div');el.className='herald';el.style.setProperty('--d',pal(catDom(e.c)));
  el.innerHTML=`<span class="ic">${emb(catDom(e.c))}</span><div><span class="yy">${DOMAIN[catDom(e.c)].n} · ${SEASONS[e.s??0]}, anno ${e.y}</span>${e.t}</div>`;
  el.addEventListener('click',ev=>{if(ev.target.closest('[data-ref]'))return;if(e.x!=null)flyTo(e.x,e.yy,3);if(e.r[0])selectRef(e.r[0])});
  const box=$('#toasts');box.prepend(el);while(box.children.length>2)box.lastChild.remove();
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),500)},7000);
}

/* ---------- clock & header ---------- */
// the moon waxes through the year: a sliver in spring, full by summer's end, waning in autumn, dark in winter
function moonPath(f){const r=15,cx=30,cy=30,k=Math.cos(f*Math.PI*2),rx=Math.abs(k)*r;
  if(f<.5)return`M${cx} ${cy-r}A${r} ${r} 0 0 1 ${cx} ${cy+r}A${rx} ${r} 0 0 ${k>0?0:1} ${cx} ${cy-r}Z`;
  return`M${cx} ${cy-r}A${r} ${r} 0 0 0 ${cx} ${cy+r}A${rx} ${r} 0 0 ${k>0?1:0} ${cx} ${cy-r}Z`}
function setRete(frac){
  if(!S)return;const t=(S.season+frac)/4,a=t*Math.PI*2-Math.PI/2;
  const d=$('#moonDot');d.setAttribute('cx',(30+Math.cos(a)*27).toFixed(2));d.setAttribute('cy',(30+Math.sin(a)*27).toFixed(2));
  $('#moonPhase').setAttribute('d',moonPath((t*.5+.12)%1));
}
function renderHeader(){
  $('#worldName').textContent=S.name;$('#eraName').textContent=S.eras[S.eras.length-1].name;$('#year').textContent=S.year;
  $('#seasonName').textContent=SEASONS[S.season].toLowerCase();$('#yearRoman').textContent=roman(Math.max(1,S.year));
  const alive=S.realms.filter(r=>r.alive),indep=alive.filter(r=>r.overlord==null).length;let pop=0;for(const s of S.sets)pop+=s.pop;
  const wars=new Set(S.wars.map(w=>w.name)).size,soldiers=S.armies.reduce((a,b)=>a+b.size,0);
  const K=(d,h)=>`<span style="--d:${pal(d)}">${sigil(d)}${h}</span>`;
  $('#kpis').innerHTML=K('people',`<b>${fmt(pop)}</b> souls`)+K('politics',`<b>${indep}</b> realms${alive.length>indep?`, ${alive.length-indep} vassals`:''}`)+K('nature',`<b>${S.sets.length}</b> settlements`)+
    K('war',`<b>${wars}</b> war${wars===1?'':'s'}${soldiers?`, ${fmt(soldiers)} under arms`:''}`)+K('economy',`<b>${(X.routes||[]).length}</b> trade roads`)+
    (S.plagues.length?K('death',`<b>${S.plagues.length}</b> plague${S.plagues.length>1?'s':''}`):'')+(S.winter>S.year?K('knowledge','the long winter'):'');
  document.title=`${S.name} · ${SEASONS[S.season]}, Anno ${S.year}`;
}

/* ---------- realms ---------- */
function realmRow(r,vassal){
  const ss=setsOf(r.id),war=X.atWar.has(r.id)&&r.alive;
  const sub=r.alive?`${rulerStr(r)}`:`${r.founded}–${r.fell}${r.merged!=null?', joined '+S.realms[r.merged].name:''}`;
  const num=!r.alive?`${RACES[r.race].n}<small>peak ${fmt(r.peak)}</small>`:realmSort==='gold'?`${fmt(r.gold)}<small>${r.income>=0?'+':''}${fmt(r.income)} a year</small>`:realmSort==='land'?`${((X.cells[r.id]||0)/G.land*100).toFixed(1)}%<small>${ss.length} holdings</small>`:realmSort==='age'?`${S.year-r.founded}<small>years</small>`:`${fmt(X.pop[r.id]||0)}<small>${ss.length} holdings</small>`;
  return`<div class="rrow${vassal?' vassal':''}" data-ref="r${r.id}" role="button" tabindex="0">${bannerSVG(r,22)}<div style="min-width:0"><div class="nm">${r.name}${war?tag('war','war'):''}${r.golden>S.year?tag('golden age','gold'):''}</div><div class="sub">${sub}</div></div><div class="num">${num}</div></div>`;
}
function renderRealms(){
  const key={pop:r=>X.pop[r.id]||0,land:r=>X.cells[r.id]||0,gold:r=>r.gold,age:r=>S.year-r.founded}[realmSort];
  const alive=S.realms.filter(r=>r.alive),top=alive.filter(r=>r.overlord==null).sort((a,b)=>key(b)-key(a));
  const dead=S.realms.filter(r=>!r.alive).sort((a,b)=>b.fell-a.fell).slice(0,40);
  let html=`<div class="list-head"><span class="count">${top.length} realms, ${alive.length-top.length} vassals</span><div class="words" id="realmSort">${[['pop','people'],['land','land'],['gold','gold'],['age','age']].map(([k,l])=>`<button type="button" data-k="${k}" aria-pressed="${realmSort===k}">${l}</button>`).join('')}</div></div>`;
  for(const r of top){html+=realmRow(r);for(const v of (X.vassals.get(r.id)||[]).map(i=>S.realms[i]).sort((a,b)=>key(b)-key(a)))html+=realmRow(v,true)}
  if(dead.length)html+=`<details class="fold" id="fallenBox"${fallenOpen?' open':''}><summary>Fallen realms · ${S.realms.length-alive.length}</summary>${dead.map(r=>realmRow(r)).join('')}</details>`;
  $('#view-realms').innerHTML=html;
  const fb=$('#fallenBox');if(fb)fb.addEventListener('toggle',()=>{fallenOpen=fb.open});
  for(const b of $$('#realmSort button'))b.addEventListener('click',()=>{realmSort=b.dataset.k;renderRealms()});
}

/* ---------- figures ---------- */
function renderFigures(){
  const fig=(k,d,nm,sub,ref,dead,right='')=>`<div class="fig${dead?' dead':''}"${ref?` data-ref="${ref}" role="button" tabindex="0"`:''}>${icd(k,d)}<div style="min-width:0"><div class="nm">${nm}</div><div class="sub">${sub}</div></div><div class="num">${right}</div></div>`;
  const live=a=>a.filter(x=>x.alive);
  const rulers=S.realms.filter(r=>r.alive&&r.overlord==null).sort((a,b)=>(X.pop[b.id]||0)-(X.pop[a.id]||0)).slice(0,8);
  let h=`<div class="sect">Sovereigns</div>`+rulers.map(r=>fig('crown','politics',rulerStr(r),`${r.name}, House ${r.ruler.dyn}${r.ruler.regent?', in regency':''}`,'r'+r.id,false,`${ageOf(r)} yrs`)).join('');
  h+=`<div class="sect">Armies in the field</div>`+(S.armies.length?S.armies.slice().sort((a,b)=>b.size-a.size).slice(0,10).map(a=>fig('swords','war',capF(a.name),`${S.realms[a.realm].name}, ${a.state==='siege'?'besieging '+(X.byId.get(a.target)||{name:'?'}).name:a.state==='retreat'?'in retreat':a.target!=null?'marching on '+(X.byId.get(a.target)||{name:'?'}).name:'holding'}`,'a'+a.id,false,fmt(a.size))).join(''):'<div class="empty">Every army is at home. The world is at peace.</div>');
  h+=`<div class="sect">Monsters abroad</div>`+(live(S.beasts).map(b=>fig(catIcon(b.kind),'monster',b.name,`${capF(b.kind)}, first seen ${b.born}, ${fmtDead(b.kills)} victims`,'b'+b.id)).join('')||'<div class="empty">No monster troubles the world.</div>');
  h+=`<div class="sect">Outlaws</div>`+(S.bands.map(b=>fig(b.kind==='pirate'?'anchor':'mask','war',capF(b.name),`${b.kind==='pirate'?'Pirates':'Brigands'} since ${b.born}, ${fmt(b.loot)} crowns of plunder`,null,false,fmt(b.size))).join('')||'<div class="empty">The roads and seas are safe, for now.</div>');
  h+=`<div class="sect">Heroes</div>`+(live(S.heroes).map(h=>fig('shield-star','people',h.name+(h.ep?' '+h.ep:''),`of ${h.home}, ${S.realms[h.realm].name}, age ${Math.round(S.year-h.born)}`,null)).join('')||'<div class="empty">No heroes walk the land.</div>');
  h+=`<div class="sect">Great minds &amp; captains</div>`+(live(S.greats).map(p=>fig(catIcon(GREAT[p.kind].ico),catDom(GREAT[p.kind].ico),p.name,`${GREAT[p.kind].n} of ${S.realms[p.realm].name}${p.works.length?`, ${p.works.length} work${p.works.length>1?'s':''}`:''}`,'g'+p.id)).join('')||'<div class="empty">None of renown, yet.</div>');
  const gone=[...S.greats.filter(p=>!p.alive).slice(-8).reverse().map(p=>fig(catIcon(GREAT[p.kind].ico),catDom(GREAT[p.kind].ico),p.name,`${GREAT[p.kind].n}, died ${p.died||'?'}`,'g'+p.id,true)),...S.beasts.filter(b=>!b.alive).slice(-6).reverse().map(b=>fig(catIcon(b.kind),'monster',b.name,b.slain?`Slain in ${b.slain}`:'Vanished','b'+b.id,true))];
  h+=`<div class="sect">Remembered</div>`+(gone.join('')||'<div class="empty">History has yet to remember anyone.</div>');
  $('#view-figures').innerHTML=h;
}

/* ---------- ages ---------- */
const agesCv=$('#ages');let agesRows=[];
function renderAges(){
  const pane=$('#view-ages'),w=pane.clientWidth-16;if(w<50)return;
  const rs=S.realms.filter(r=>r.alive||(r.fell-r.founded)>=25).sort((a,b)=>a.founded-b.founded||a.id-b.id);
  const rowH=20,top=72,h=top+rs.length*rowH+20;
  agesCv.width=Math.round(w*dpr);agesCv.height=Math.round(h*dpr);agesCv.style.height=h+'px';
  const c=agesCv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const L=20,R=w-20,Y=S.year||1,X_=y=>L+(y/Y)*(R-L);
  S.eras.forEach((e,i)=>{const x0=X_(e.start),x1=X_(i<S.eras.length-1?S.eras[i+1].start:Y);
    c.strokeStyle='rgba(222,196,150,.18)';c.beginPath();c.moveTo(x0+.5,20);c.lineTo(x0+.5,h-10);c.stroke();
    c.fillStyle='#cfa960';c.beginPath();c.arc(x0+.5,20,2,0,7);c.fill();
    c.save();c.beginPath();c.rect(x0+6,6,Math.max(0,x1-x0-10),40);c.clip();c.fillStyle='#e9cd8f';c.font="italic 500 15px 'Cormorant Garamond', Georgia, serif";c.textBaseline='middle';c.fillText(e.name.replace(/^The /,''),x0+8,24);c.restore()});
  c.fillStyle='#7d7362';c.font="500 10px Jost, sans-serif";c.textBaseline='alphabetic';c.textAlign='left';c.fillText('0',L,56);c.textAlign='right';c.fillText(String(Y),R,56);c.textAlign='center';c.fillText(String(Math.round(Y/2)),X_(Y/2),56);
  agesRows=[];
  rs.forEach((r,i)=>{const y=top+i*rowH,x0=X_(r.founded),x1=X_(r.alive?Y:r.fell);c.fillStyle=r.color;c.globalAlpha=r.alive?1:.45;c.beginPath();c.roundRect(x0,y+6,Math.max(3,x1-x0),rowH-12,4);c.fill();c.globalAlpha=1;
    if(r.overlord!=null&&r.vassalSince!=null){c.fillStyle='rgba(12,11,10,.5)';c.fillRect(X_(r.vassalSince),y+6,Math.max(1,x1-X_(r.vassalSince)),rowH-12)}
    if(sel&&sel.t==='r'&&sel.id===r.id){c.strokeStyle='#e9cd8f';c.lineWidth=1;c.strokeRect(x0-2,y+4,Math.max(3,x1-x0)+4,rowH-8)}
    c.font="500 15px 'Cormorant Garamond', Georgia, serif";c.textBaseline='middle';const tw=c.measureText(r.name).width;c.fillStyle=r.alive?'#ece2cf':'#7d7362';c.textAlign='left';
    c.fillText(r.name,x1+tw+8<R?x1+6:Math.max(L,x0-tw-6),y+rowH/2);
    agesRows.push({y0:y,y1:y+rowH,id:r.id})});
}
agesCv.addEventListener('click',e=>{const r=agesCv.getBoundingClientRect(),y=e.clientY-r.top;const row=agesRows.find(o=>y>=o.y0&&y<o.y1);if(row)select({t:'r',id:row.id})});

/* ---------- shared pieces ---------- */
function shareBar(parts){const tot=parts.reduce((a,p)=>a+p.v,0)||1;
  return`<div class="mixbar">${parts.map(p=>`<i style="width:${p.v/tot*100}%;background:${p.c}"></i>`).join('')}</div><div class="mixkeys">${parts.filter(p=>p.v/tot>.01).map(p=>`<span><b style="background:${p.c}"></b>${p.n} ${(p.v/tot*100).toFixed(0)}%</span>`).join('')}</div>`}
function mixBar(mix){return shareBar(Object.entries(mix).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({n:RACES[k].pl.replace(/^./,c=>c.toUpperCase()),v,c:`rgb(${RACE_RGB[k].join(',')})`})))}
const bar=(k,v,f,d)=>`<div class="bar"><span class="k">${k}</span><span class="t"><i style="width:${clamp(f,0,1)*100}%${d?`;--d:${d}`:''}"></i></span><span class="v">${v}</span></div>`;
const fact=(k,v)=>`<div class="fact"><div class="k">${k}</div><div class="v">${v}</div></div>`;
function historyFor(pred){const items=S.log.filter(pred).slice(-40).reverse();return items.length?`<div class="log">${items.map(e=>evEl(e,false).outerHTML).join('')}</div>`:'<div class="empty">Nothing recorded yet.</div>'}
const byRef=ref=>e=>e.r.includes(ref);
function spark(id){
  const pts=S.hist.filter(h=>h.p[id]!=null);if(pts.length<2)return'<div class="empty">Too young to chart.</div>';
  const y0=pts[0].y,y1=pts[pts.length-1].y,mx=Math.max(...pts.map(h=>h.p[id]));
  const P=pts.map(h=>`${((h.y-y0)/Math.max(1,y1-y0)*300).toFixed(1)},${(52-h.p[id]/mx*46).toFixed(1)}`).join(' ');
  return`<svg class="spark" viewBox="0 0 300 54" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sg${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#cfa960" stop-opacity=".28"/><stop offset="1" stop-color="#cfa960" stop-opacity="0"/></linearGradient></defs><polygon points="0,54 ${P} 300,54" fill="url(#sg${id})"/><polyline points="${P}" fill="none" stroke="#e9cd8f" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg><div class="spark-l"><span>${y0}</span><span>PEAK ${fmt(mx)}</span><span>${y1}</span></div>`;
}
function relBar(v){const w=Math.abs(v)/2;return`<span class="rel"><i style="${v<0?`right:50%;width:${w}%;background:#c8574a`:`left:50%;width:${w}%;background:#79a891`}"></i></span>`}

/* ---------- almanac ---------- */
function renderAlmanac(){
  let pop=0;const byRace={},byFaith={};for(const s of S.sets){pop+=s.pop;for(const k in s.mix)byRace[k]=(byRace[k]||0)+s.pop*s.mix[k];const f=S.realms[s.realm].faith;byFaith[f]=(byFaith[f]||0)+s.pop}
  const farm=S.farm.reduce((a,v)=>a+(v?1:0),0),wonders=S.sets.reduce((a,s)=>a+s.w.length,0);
  const fr=Object.entries(byFaith).sort((a,b)=>b[1]-a[1]);const top=fr.slice(0,6).map(([f,v])=>({n:S.faiths[f].name.replace(/^(Church|Way|Cult|Covenant|Children|Order) of the /,''),v,c:S.faiths[f].css}));if(fr.length>6)top.push({n:'Others',v:fr.slice(6).reduce((a,x)=>a+x[1],0),c:'#4a4338'});
  const rec=S.rec;const R=(k,icon,d,label,fmtv)=>rec[k]?`<div class="record">${icd(icon,d)}<div style="min-width:0"><div class="k">${label}</div><div class="t">${rec[k].t}</div></div><div class="v">${fmtv(rec[k].v)}<small>anno ${rec[k].y}</small></div></div>`:'';
  const alive=S.realms.filter(r=>r.alive);
  const frontier=FK.map(f=>{let best=null;for(const r of alive)if(!best||r.k[f]>best.k[f])best=r;return{f,lv:best?best.k[f]:0,r:best}});
  $('#view-almanac').innerHTML=`<div class="sect">The world of ${S.name}</div>
    <div class="facts">${[['Souls',fmt(pop)],['Years',S.year],['Realms',alive.filter(r=>r.overlord==null).length],['Vassals',alive.filter(r=>r.overlord!=null).length],['Settlements',S.sets.length],['Wonders',wonders],['Farmland',(farm/G.land*100).toFixed(0)+'%'],['Faiths',S.faiths.filter(f=>f.ext==null).length],['Ruins',S.ruins.length],['Ages',S.eras.length]].map(([k,v])=>fact(k,v)).join('')}</div>
    <div class="sect">Peoples</div>${shareBar(RK.map(k=>({n:RACES[k].pl.replace(/^./,c=>c.toUpperCase()),v:byRace[k]||0,c:`rgb(${RACE_RGB[k].join(',')})`})))}
    <div class="sect">Faiths, by followers</div>${shareBar(top)}
    <div class="sect">The frontier of knowledge</div><div class="fields">${frontier.map(({f,lv,r})=>`<div class="field">${ico(FIELDS[f].ico)}<span>${FIELDS[f].n}</span><span class="pips">${[0,1,2,3,4,5].map(i=>`<i class="${i<lv?'on':''}"></i>`).join('')}</span>${r&&lv?`<small>${capF(FIELDS[f].l[lv-1])}, held by ${r.name}</small>`:''}</div>`).join('')}</div>
    <div class="sect">Records</div><div class="records">
      ${R('city','building-community','people','Greatest city',v=>fmt(v))}${R('realm','building-castle','politics','Widest realm',v=>v.toFixed(1)+'%')}${R('oldRealm','hourglass','politics','Longest-lived fallen realm',v=>v+' yrs')}
      ${R('reign','crown','politics','Longest reign',v=>v+' yrs')}${R('gold','coins','economy','Richest treasury',v=>fmt(v))}${R('battle','sword','war','Bloodiest battle',v=>fmtDead(v))}
      ${R('war','swords','war','Longest war',v=>v+' yrs')}${R('plague','virus','death','Deadliest plague',v=>fmtDead(v))}</div>
    ${Object.keys(rec).length?'':'<div class="empty">Records appear as history is made.</div>'}`;
}

/* ---------- character sheets ---------- */
let locate=null;
const head=(art,name,house,motto,tags,kick)=>`<div class="sheet-head">${art}<div><h2>${name}</h2>${house?`<div class="house">${house}</div>`:''}${motto?`<div class="motto">${motto}</div>`:''}${tags?`<div class="tags">${tags}</div>`:''}${kick?`<div class="kicker">${kick}</div>`:''}</div></div>`;
const emblem=(k,d)=>`<span class="emblem-badge" style="--d:${pal(d)}">${ico(k)}</span>`;
function renderDetail(){
  const el=$('#detail');if(!sel)return;locate=null;
  $('#backLbl').textContent=navStack.length?'Back':TAB_LBL[tab]||'Back';
  const alive=S.realms.filter(r=>r.alive);const maxOf=f=>Math.max(1,...alive.map(f));
  if(sel.t==='r'){
    const r=S.realms[sel.id];if(!r)return closeDetail();
    const ss=S.sets.filter(s=>s.realm===r.id).sort((a,b)=>b.pop-a.pop),cap=ss.find(s=>s.id===r.cap);if(cap)locate=[cap.x,cap.y,2.6];
    const cells=X.cells[r.id]||0,faith=faithOf(r),pop=X.pop[r.id]||0;
    const wars=S.wars.filter(w=>w.a===r.id||w.b===r.id).map(w=>{const o=S.realms[w.a===r.id?w.b:w.a];return`<li><span>${rnB(o)}${tag('war','war')}</span><span>${wn(w)}</span></li>`}).join('');
    const allies=Object.keys(S.allies).map(k=>k.split('-').map(Number)).filter(([a,b])=>a===r.id||b===r.id).map(([a,b])=>S.realms[a===r.id?b:a]);
    const vass=(X.vassals.get(r.id)||[]).map(i=>S.realms[i]);
    const neigh=[];for(const[k]of X.border){const a=Math.floor(k/4096),b=k%4096;if(a!==r.id&&b!==r.id)continue;const o=a===r.id?b:a;neigh.push([S.realms[o],S.rel[rkey(a,b)]||0])}
    neigh.sort((a,b)=>a[1]-b[1]);
    const rc=X.resc[r.id]||[];const RI={iron:'pick',gold:'coins',gems:'diamond',timber:'trees',horses:'horse',spice:'flame',fish:'fish',wine:'grape'};
    const res=[];for(let k=1;k<RES.length;k++)if(rc[k])res.push(`<li><span>${ico(RI[RES[k].k])}${RES[k].n}</span><span>${rc[k]} lands</span></li>`);
    const armies=S.armies.filter(a=>a.realm===r.id);
    const ru=r.ruler,mix={};for(const s of ss)for(const k in s.mix)mix[k]=(mix[k]||0)+s.mix[k]*s.pop;
    const builds={};for(const s of ss)for(const k in s.b)builds[k]=(builds[k]||0)+1;
    const figs=[...S.greats.filter(p=>p.alive&&p.realm===r.id).map(p=>`<li><span>${gn(p)}</span><span>${GREAT[p.kind].n.toLowerCase()}</span></li>`),...S.heroes.filter(h=>h.alive&&h.realm===r.id).map(h=>`<li><span>${hn(h)}</span><span>hero</span></li>`)].join('');
    const tags=[r.overlord!=null?tag('vassal','violet'):'',vass.length?tag(`${vass.length} vassal${vass.length>1?'s':''}`,'violet'):'',X.atWar.has(r.id)?tag('at war','war'):'',r.golden>S.year?tag('golden age','gold'):'',!r.alive?tag(r.merged!=null?'joined '+S.realms[r.merged].core:'fallen','grey'):''].join('');
    const saying=SAYINGS[ru.traits[0]];
    el.innerHTML=head(bannerSVG(r,70),r.name,`${RACES[r.race].n} ${r.tier===2?'empire':r.tier===1?'kingdom':'tribe'} · since anno ${r.founded}`,r.motto,tags,r.overlord!=null?`Sworn to ${rnB(S.realms[r.overlord])} since ${r.vassalSince}.`:r.parent!=null?`Broke from ${rnB(S.realms[r.parent])}.`:'')+
      (r.alive?`${saying?`<div class="quote">${saying}<cite>${rulerStr(r)}</cite></div>`:''}
      <h4 class="h">Standing among the realms</h4><div class="bars">
        ${bar('Population',fmt(pop),pop/maxOf(o=>X.pop[o.id]||0))}${bar('Territory',(cells/G.land*100).toFixed(1)+'%',cells/maxOf(o=>X.cells[o.id]||0))}${bar('Treasury',fmt(r.gold),r.gold/maxOf(o=>o.gold))}
        ${bar('Military',fmt(power(r)*10),power(r)/maxOf(power),'#c8574a')}${bar('Stability',Math.round(r.stab)+' / 100',r.stab/100,r.stab<30?'#c8574a':'#79a891')}${bar('Learning',TECH_AGE[Math.round(techOf(r))],techOf(r)/6,'#86a3c4')}</div>
      <div class="facts" style="margin-top:16px">${fact('Seat',cap?sn(cap):'none')}${fact('Holdings',ss.length)}${fact('Income',(r.income>=0?'+':'')+fmt(r.income)+' a year')}${fact('Law',capF(r.law))}</div>
      <h4 class="h">The crown</h4><div class="ruler"><span class="crown">${ico('crown')}</span><div><div class="nm">${rulerStr(r)}</div><div class="sub">House ${ru.dyn}, aged ${ageOf(r)}, reigning since ${ru.crowned}${ru.regent?`, under the regent ${ru.regent}`:''}</div></div></div>
      <div class="traits">${ru.traits.map(t=>tag(t,'line gold')).join('')}</div>
      ${ru.spouse||ru.kids.length?`<ul class="mini" style="margin-top:10px">${ru.spouse?`<li><span>${ico('hand-ring-finger')}${ru.spouse.name} of House ${ru.spouse.dyn}</span><span>${ru.spouse.realm!=null&&S.realms[ru.spouse.realm]?S.realms[ru.spouse.realm].core:'consort'}</span></li>`:''}${ru.kids.slice().sort((a,b)=>a.born-b.born).map((k,i)=>`<li><span>${ico('user')}${k.name}${i===0?tag('heir','gold'):''}</span><span>${k.f?'daughter':'son'}, ${S.year-k.born}</span></li>`).join('')}</ul>`:''}
      <h4 class="h">Population through the years</h4>${spark(r.id)}
      <h4 class="h">Peoples</h4>${mixBar(mix)}
      <h4 class="h">Faith</h4><div class="kicker" style="margin-top:0"><b style="font-style:normal">${faith.name}</b>${(faith.tenets||[]).length?`, which ${faith.tenets.map(t=>TENETS[t].d).join(' and ')}`:''}.</div>
      <h4 class="h">Knowledge</h4><div class="fields">${FK.map(f=>`<div class="field">${ico(FIELDS[f].ico)}<span>${FIELDS[f].n}</span><span class="pips">${[0,1,2,3,4,5].map(i=>`<i class="${i<r.k[f]?'on':''}"></i>`).join('')}</span>${r.k[f]?`<small>${capF(FIELDS[f].l[r.k[f]-1])}</small>`:''}</div>`).join('')}</div>
      ${Object.keys(builds).length?`<h4 class="h">Works</h4><div class="works">${BK.map(k=>`<div class="work${builds[k]?' on':''}" title="${BUILD[k].n}: ${BUILD[k].d}">${ico(BUILD[k].ico)}${BUILD[k].n}${builds[k]?` ${builds[k]}`:''}</div>`).join('')}</div>`:''}
      ${res.length?`<h4 class="h">Resources</h4><ul class="mini">${res.join('')}</ul>`:''}
      ${armies.length?`<h4 class="h">Armies</h4><ul class="mini">${armies.map(a=>`<li><span><a class="ref" data-ref="a${a.id}">${capF(a.name)}</a></span><span>${fmt(a.size)}, ${a.state}</span></li>`).join('')}</ul>`:''}
      <h4 class="h">Friends &amp; foes</h4><ul class="mini">${r.overlord!=null?`<li><span>${rnB(S.realms[r.overlord])}${tag('overlord','violet')}</span><span>since ${r.vassalSince}</span></li>`:''}${vass.map(v=>`<li><span>${rnB(v)}${tag('vassal','violet')}</span><span>since ${v.vassalSince}</span></li>`).join('')}${wars}${allies.map(a=>`<li><span>${rnB(a)}${tag('ally','teal')}</span><span></span></li>`).join('')}${neigh.filter(([o])=>!findWar(o.id,r.id)&&!S.allies[rkey(o.id,r.id)]&&o.overlord!==r.id&&r.overlord!==o.id).map(([o,v])=>`<li><span>${rnB(o)}</span><span>${v>30?'friendly':v<-30?'hostile':'wary'}${relBar(v)}</span></li>`).join('')}</ul>
      ${figs?`<h4 class="h">Notable figures</h4><ul class="mini">${figs}</ul>`:''}
      <h4 class="h">Holdings</h4><ul class="mini">${ss.slice(0,16).map(s=>`<li><span>${sn(s)}${s.id===r.cap?tag('seat','gold'):''}${s.w.length?tag('wonder','line gold'):''}</span><span>${kind(s.pop).toLowerCase()}, ${fmt(s.pop)}</span></li>`).join('')}</ul>`
      :`<div class="facts" style="margin-top:14px">${fact('Peak population',fmt(r.peak))}${fact('Endured',(r.fell-r.founded)+' years')}${fact('Greatest extent',(r.peakCells/G.land*100).toFixed(1)+'%')}${fact('Fell',`anno ${r.fell}`)}</div>`)+
      `${r.reigns.length||r.alive?`<h4 class="h">Line of rulers</h4><ul class="reigns">${r.alive?`<li class="now">${rulerStr(r)}<small>House ${ru.dyn}, ${ru.crowned} to this day</small></li>`:''}${r.reigns.slice().reverse().slice(0,16).map(g=>`<li>${g.s}<small>House ${g.d}, ${g.a}–${g.b}</small></li>`).join('')}</ul>`:''}
      <h4 class="h">Chronicle</h4>${historyFor(byRef('r'+r.id))}`;
  }else if(sel.t==='s'){
    const s=S.sets.find(q=>q.id===sel.id);
    if(!s){const ru=S.ruins.find(q=>q.sid===sel.id);if(ru)locate=[ru.x,ru.y,3];el.innerHTML=head(emblem('building-arch','death'),ru?'Ruins of '+ru.name:'A lost place','',null,'',ru?`Founded ${ru.founded}, destroyed ${ru.year}. At its height ${fmt(ru.peak)} lived here.${ru.w.length?' Once home to '+ru.w.join(' and ')+'.':''}`:'Nothing remains of it.')+`<h4 class="h">Chronicle</h4>${historyFor(byRef('s'+sel.id))}`;$('#locateBtn').hidden=!locate;return}
    locate=[s.x,s.y,3.4];
    const r=S.realms[s.realm],big=Math.max(1,...S.sets.map(t=>t.pop));
    const trade=(X.routes||[]).filter(t=>t.a===s.id||t.b===s.id).map(t=>{const o=X.byId.get(t.a===s.id?t.b:t.a);return o?`<li><span>${sn(o)}, ${rnB(S.realms[o.realm])}</span><span>${t.sea?'by sea':'by road'}</span></li>`:''}).join('');
    const born=S.greats.filter(p=>p.home===s.name).map(p=>`<li><span>${gn(p)}</span><span>${GREAT[p.kind].n.toLowerCase()}</span></li>`).join('');
    const sick=S.plagues.find(p=>p.act[s.id]!=null),siege=S.armies.find(a=>a.target===s.id&&a.state==='siege'),tc=(X.tradeCity&&X.tradeCity.get(s.id))||0;
    const tags=[r.cap===s.id?tag('seat','gold'):'',s.port?tag('harbour','teal'):'',sick?tag('plague','violet'):'',siege?tag('besieged','war'):'',s.food<.05?tag('hungry','war'):'',S.faiths.some(f=>f.site===s.id)?tag('holy city','line gold'):''].join('');
    el.innerHTML=head(bannerSVG(r,56),s.name,`${kind(s.pop)} of ${r.name}`,`founded anno ${s.founded}`,tags,'')+
      `<h4 class="h">The city</h4><div class="bars">${bar('People',Math.round(s.pop).toLocaleString('en-US'),s.pop/big)}${bar('Granaries',Math.round(clamp(s.food/1.6,0,1)*100)+'%',s.food/1.6,s.food<.1?'#c8574a':'#9aa868')}${bar('Unrest',Math.round(s.unrest*100)+'%',s.unrest,'#c8574a')}${bar('Trade',tc+' road'+(tc===1?'':'s'),tc/3,'#79a891')}</div>
      <div class="facts" style="margin-top:16px">${fact('Land',BIOME[G.biome[s.cell]].n+(G.river[s.cell]?', river':''))}${fact('Resource',G.res[s.cell]?RES[G.res[s.cell]].n:'none')}${fact('Last harvest',s.harvest?(s.harvest>1.2?'rich':s.harvest<.8?'poor':'fair'):'none yet')}${fact('Realm',rnB(r))}</div>
      <h4 class="h">Peoples</h4>${mixBar(s.mix)}
      <h4 class="h">Works</h4><div class="works">${BK.map(k=>`<div class="work${s.b[k]?' on':''}" title="${BUILD[k].n}: ${BUILD[k].d}${s.b[k]?`, built ${s.b[k]}`:''}">${ico(BUILD[k].ico)}${BUILD[k].n}</div>`).join('')}</div>
      ${s.w.length?`<h4 class="h">Wonders</h4><ul class="mini">${s.w.map(w=>`<li><span>${capF(w.n)}</span><span>${w.y}</span></li>`).join('')}</ul>`:''}
      ${trade?`<h4 class="h">Trade roads</h4><ul class="mini">${trade}</ul>`:''}
      ${born?`<h4 class="h">Born here</h4><ul class="mini">${born}</ul>`:''}
      <h4 class="h">Chronicle</h4>${historyFor(byRef('s'+s.id))}`;
  }else if(sel.t==='a'){
    const a=S.armies.find(q=>q.id===sel.id);if(!a){el.innerHTML=`<div class="empty" style="padding-top:24px">This army has been disbanded or destroyed.</div>`;$('#locateBtn').hidden=true;return}
    locate=[a.x,a.y,3.2];const r=S.realms[a.realm],t=X.byId.get(a.target),gen=a.gen?S.greats.find(p=>p.id===a.gen):null;
    el.innerHTML=head(bannerSVG(r,56),capF(a.name),`Army of ${r.name}`,gen?`led by ${gen.name}`:'',tag(a.state==='siege'?'besieging':a.state==='retreat'?'retreating':'on campaign','war'),'')+
      `<h4 class="h">In the field</h4><div class="bars">${bar('Soldiers',fmt(a.size),a.size/Math.max(1,...S.armies.map(b=>b.size)),'#c8574a')}${bar('Strength',Math.round(a.size/a.max*100)+'%',a.size/a.max)}${bar('Morale',Math.round(a.morale*100)+'%',a.morale)}${a.state==='siege'?bar('Siege',Math.round(a.siege*100)+'%',a.siege,'#c8574a'):''}</div>
      <div class="facts" style="margin-top:16px">${fact('Objective',t?sn(t):'none')}${fact('Realm',rnB(r))}</div>
      <h4 class="h">Wars</h4><ul class="mini">${S.wars.filter(w=>w.a===r.id||w.b===r.id).map(w=>`<li><span>${wn(w)}</span><span>since ${w.start}</span></li>`).join('')}</ul>`;
  }else if(sel.t==='w'){
    const w=S.wars.find(q=>q.id===sel.id);
    if(!w){el.innerHTML=head(emblem('dove','politics'),'A war now ended','',null,'','Its story is told in the chronicle.')+historyFor(byRef('w'+sel.id));$('#locateBtn').hidden=true;return}
    if(w.fx!=null)locate=[w.fx,w.fy,3];const A=S.realms[w.a],Bb=S.realms[w.b],tot=Math.max(1,Math.abs(w.score)+20),pa=clamp(50+w.score/tot*50,5,95);
    el.innerHTML=head(emblem('swords','war'),w.name.replace(/^The /,''),`${SEASONS[w.ss||0]}, anno ${w.start}`,`${S.year-w.start} years of fighting`,'','')+
      `<div class="score-l" style="margin-top:16px"><span>${rnB(A)}</span><span>${rnB(Bb)}</span></div><div class="scorebar"><i style="width:${pa}%;background:${A.color}"></i><i style="width:${100-pa}%;background:${Bb.color}"></i></div>
      <div class="facts" style="margin-top:14px">${fact('Battles',w.battles)}${fact('Sieges',w.sieges)}${fact(A.core+' fallen',fmtDead(w.lossA))}${fact(Bb.core+' fallen',fmtDead(w.lossB))}${fact('Advantage',Math.abs(w.score)<10?'neither':(w.score>0?A:Bb).name)}</div>
      <h4 class="h">Armies</h4><ul class="mini">${S.armies.filter(a=>a.realm===w.a||a.realm===w.b).map(a=>`<li><span><a class="ref" data-ref="a${a.id}">${capF(a.name)}</a>, ${S.realms[a.realm].core}</span><span>${fmt(a.size)}</span></li>`).join('')||'<li><span>No armies in the field</span><span></span></li>'}</ul>
      <h4 class="h">Chronicle</h4>${historyFor(e=>e.y>=w.start&&e.r.includes('r'+w.a)&&e.r.includes('r'+w.b))}`;
  }else if(sel.t==='b'){
    const b=S.beasts.find(q=>q.id===sel.id);if(!b)return closeDetail();locate=[b.x,b.y,3];
    const age=(b.alive?S.year:(b.slain||S.year))-b.born;
    el.innerHTML=head(emblem(catIcon(b.kind),'monster'),b.name,capF(b.kind),`first seen anno ${b.born}`,b.alive?'':tag(b.slain?'slain '+b.slain:'vanished','grey'),'')+
      `<h4 class="h">The beast</h4><div class="bars">${bar('Might',b.power+' / 12',b.power/12,'#b9475a')}${bar('Victims',fmtDead(b.kills),b.kills/Math.max(1,...S.beasts.map(x=>x.kills)),'#b9475a')}${bar('Hoard',fmt(b.hoard||0),(b.hoard||0)/Math.max(1,...S.beasts.map(x=>x.hoard||0)))}${bar('Age',age+' yrs',age/b.life)}</div>
      <h4 class="h">Chronicle</h4>${historyFor(byRef('b'+b.id))}`;
  }else if(sel.t==='g'){
    const p=S.greats.find(q=>q.id===sel.id);if(!p)return closeDetail();const r=S.realms[p.realm];const d=catDom(GREAT[p.kind].ico);
    el.innerHTML=head(emblem(catIcon(GREAT[p.kind].ico),d),p.name,`${GREAT[p.kind].n} of ${r.name}`,`born in ${p.home}`,p.alive?'':tag('died '+(p.died||'?'),'grey'),'')+
      `${p.works.length?`<h4 class="h">Works</h4><ul class="mini">${p.works.map(w=>`<li><span style="font-style:italic">${capF(w.n)}</span><span>${w.y}</span></li>`).join('')}</ul>`:''}
      <h4 class="h">Chronicle</h4>${historyFor(byRef('g'+p.id))}`;
  }else if(sel.t==='ruin'){
    const ru=S.ruins.find(q=>q.id===sel.id);if(!ru)return closeDetail();locate=[ru.x,ru.y,3];
    el.innerHTML=head(emblem('building-arch','death'),'Ruins of '+ru.name,'',null,'',`Founded ${ru.founded}, destroyed ${ru.year}. At its height ${fmt(ru.peak)} lived here.${ru.w.length?' Once home to '+ru.w.join(' and ')+'.':''}`)+`<h4 class="h">Chronicle</h4>${historyFor(byRef('s'+ru.sid))}`;
  }
  $('#locateBtn').hidden=!locate;
}
const TAB_LBL={chronicle:'Chronicle',realms:'Realms',figures:'Figures',ages:'Ages',almanac:'Almanac'};

/* ---------- legends ---------- */
const LEGENDS={
  realms:()=>['Realms','Each realm in its banner ink. Vassals lean toward their overlord’s colour.',S.realms.filter(r=>r.alive&&r.overlord==null).sort((a,b)=>(X.cells[b.id]||0)-(X.cells[a.id]||0)).slice(0,6).map(r=>[r.color,r.name,((X.cells[r.id]||0)/G.land*100).toFixed(0)+'%'])],
  peoples:()=>['Peoples','Which people rules each land.',RK.map(k=>[`rgb(${RACE_RGB[k].join(',')})`,RACES[k].pl.replace(/^./,c=>c.toUpperCase()),S.realms.filter(r=>r.alive&&r.race===k).length])],
  faith:()=>{const c={};for(const r of S.realms)if(r.alive)c[r.faith]=(c[r.faith]||0)+(X.cells[r.id]||0);return['Faiths','The faith each realm keeps.',Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([f,v])=>[S.faiths[f].css,S.faiths[f].name.replace(/^(Church|Way|Cult|Covenant|Children|Order) of the /,''),(v/G.land*100).toFixed(0)+'%'])]},
  military:()=>['Wars','Realms at war in red. Armies march along dashed lines; a red ring marks a siege.',[['#c8574a','At war',S.wars.length?new Set(S.wars.flatMap(w=>[w.a,w.b])).size:''],['#6b6458','At peace','']]],
  diplomacy:()=>['Friends & foes',sel&&sel.t==='r'?`How the world regards ${S.realms[sel.id].name}.`:'Choose a realm on the map.',[['#cfa960','The realm',''],['#79a891','Allies',''],['#a99ccc','Overlord & vassals',''],['#c8574a','At war',''],['#8a8478','Others, by sentiment','']]],
  trade:()=>['Trade','Caravan roads in gold, sea lanes in pale blue, and every resource of the land.',[['#cfa960','Caravan roads',(X.routes||[]).filter(t=>!t.sea).length],['#bcd6dc','Sea lanes',(X.routes||[]).filter(t=>t.sea).length]]],
  knowledge:()=>['Knowledge','Brighter realms know more. Learning travels along borders and trade roads.',null,'linear-gradient(90deg,#2a3346,#86a3c4,#ece2cf)',['Stone','Aether']],
  density:()=>['Population','From empty wilds to teeming cities.',null,'linear-gradient(90deg,#2a2638,#a14a4a,#e9cd8f)',['sparse','teeming']],
  terrain:()=>['Terrain','The bare land, with the fields people have cleared.',null],
};
function renderLegend(){
  const L=LEGENDS[mode];if(!L||!S)return;const[t,p,keys,ramp,rl]=L();
  const lg=$('#legend');lg.classList.toggle('collapsed',legendCollapsed);
  lg.innerHTML=`<button type="button" class="lg-head" id="lgHead" aria-expanded="${!legendCollapsed}"><h3>${t}</h3>${ico('chevron-down')}</button><div class="lg-body"><p>${p}</p>${keys?`<div class="keylist">${keys.slice(0,6).map(([c,n,v])=>`<div class="key"><i style="background:${c}"></i><span>${n}</span>${v!==''&&v!=null?`<em>${v}</em>`:''}</div>`).join('')}</div>`:''}${ramp?`<div class="ramp" style="background:${ramp}"></div><div class="ramp-lbl"><span>${rl[0]}</span><span>${rl[1]}</span></div>`:''}</div>`;
  $('#lgHead').onclick=()=>{legendCollapsed=!legendCollapsed;renderLegend()};
}

/* ---------- chart ---------- */
const chartCv=$('#chart'),cctx=chartCv.getContext('2d');let chartW=0,chartH=0,chartDirty=true;
function sizeChart(){const r=chartCv.getBoundingClientRect();chartW=r.width;chartH=r.height;chartCv.width=Math.max(1,Math.round(chartW*dpr));chartCv.height=Math.max(1,Math.round(chartH*dpr));chartDirty=true}
const CH_PAD={l:8,r:8,t:8,b:6};
function drawChart(){
  chartDirty=false;const c=cctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,chartW,chartH);
  const hs=S.hist;if(hs.length<2||chartH<16)return;
  const y0=hs[0].y,y1=hs[hs.length-1].y,pw=chartW-CH_PAD.l-CH_PAD.r,ph=chartH-CH_PAD.t-CH_PAD.b;
  let mx=1;for(const h of hs){let t=0;for(const k in h.p)t+=h.p[k];if(t>mx)mx=t}
  const X_=y=>CH_PAD.l+(y-y0)/Math.max(1,y1-y0)*pw,Y_=v=>CH_PAD.t+ph-v/mx*ph;
  const ids=new Set();for(const h of hs)for(const k in h.p)ids.add(+k);const order=[...ids].sort((a,b)=>a-b);
  const cum=new Float64Array(hs.length);
  for(const id of order){const r=S.realms[id];if(!r)continue;c.beginPath();
    for(let i=0;i<hs.length;i++){const v=cum[i]+(hs[i].p[id]||0);const x=X_(hs[i].y),y=Y_(v);i?c.lineTo(x,y):c.moveTo(x,y)}
    for(let i=hs.length-1;i>=0;i--)c.lineTo(X_(hs[i].y),Y_(cum[i]));
    c.closePath();c.fillStyle=r.color;c.globalAlpha=.78;c.fill();c.globalAlpha=1;
    for(let i=0;i<hs.length;i++)cum[i]+=hs[i].p[id]||0;
  }
  c.strokeStyle='#e9cd8f';c.lineWidth=1.2;c.beginPath();for(let i=0;i<hs.length;i++){const x=X_(hs[i].y),y=Y_(cum[i]);i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();
  for(const e of S.eras){if(e.start<=y0||e.start>y1)continue;const x=X_(e.start);c.strokeStyle='rgba(233,205,143,.3)';c.beginPath();c.moveTo(x+.5,CH_PAD.t);c.lineTo(x+.5,CH_PAD.t+ph);c.stroke();
    const s=3.5,cy=CH_PAD.t;c.fillStyle='#e9cd8f';c.beginPath();c.moveTo(x,cy-s);c.quadraticCurveTo(x+.6,cy-.6,x+s,cy);c.quadraticCurveTo(x+.6,cy+.6,x,cy+s);c.quadraticCurveTo(x-.6,cy+.6,x-s,cy);c.quadraticCurveTo(x-.6,cy-.6,x,cy-s);c.fill()}
}
chartCv.addEventListener('mousemove',e=>{
  const hs=S&&S.hist;const tip=$('#chartTip');if(!hs||hs.length<2){tip.hidden=true;return}
  const r=chartCv.getBoundingClientRect(),mx=e.clientX-r.left;const y0=hs[0].y,y1=hs[hs.length-1].y,pw=chartW-CH_PAD.l-CH_PAD.r;
  const yr=y0+(mx-CH_PAD.l)/pw*(y1-y0);let best=hs[0];for(const h of hs)if(Math.abs(h.y-yr)<Math.abs(best.y-yr))best=h;
  const top=Object.entries(best.p).sort((a,b)=>b[1]-a[1]).slice(0,4);let tot=0;for(const k in best.p)tot+=best.p[k];
  const era=[...S.eras].reverse().find(x=>x.start<=best.y);
  tip.innerHTML=`<b>Anno ${best.y}</b>, ${fmt(tot)} souls${era?`<br><i>${era.name}</i>`:''}<br>`+top.map(([id,v])=>`<span class="ref r" style="--c:${S.realms[id].color};background:none">${S.realms[id].name}</span> ${fmt(v)}`).join('<br>');
  tip.hidden=false;tip.style.left=clamp(mx+12,0,chartW-tip.offsetWidth-4)+'px';
});
chartCv.addEventListener('mouseleave',()=>{$('#chartTip').hidden=true});

/* ---------- navigation ---------- */
function setTab(t){tab=t;navStack.length=0;sel=null;dirtyPol=true;
  for(const b of $$('#nav button'))b.setAttribute('aria-selected',b.dataset.tab===t?'true':'false');
  for(const p of['chronicle','realms','figures','ages','almanac','detail'])$('#view-'+p).hidden=p!==t;uiDirty=true;lastUi=0;renderCurrent()}
function select(s,push=true){
  if(!s){closeDetail();return}
  if(push&&sel&&!(sel.t===s.t&&sel.id===s.id))navStack.push(sel);
  sel=s;dirtyPol=true;if(!sideOpen)toggleSide(true);
  for(const p of['chronicle','realms','figures','ages','almanac'])$('#view-'+p).hidden=true;
  $('#view-detail').hidden=false;
  renderDetail();$('#detail').scrollTop=0;if(mode==='diplomacy')renderLegend();
}
function closeDetail(){if(navStack.length){sel=navStack.pop();dirtyPol=true;renderDetail();return}sel=null;dirtyPol=true;$('#view-detail').hidden=true;$('#view-'+tab).hidden=false;renderCurrent()}
function selectRef(ref){if(!ref)return;const t=ref[0],id=+ref.slice(1);if('rsbgwa'.includes(t))select({t,id})}
function renderCurrent(){if(sel){renderDetail();return}if(tab==='realms')renderRealms();else if(tab==='figures')renderFigures();else if(tab==='ages')renderAges();else if(tab==='almanac')renderAlmanac()}
function toggleSide(force){sideOpen=force??!sideOpen;$('#app').classList.toggle('side-closed',!sideOpen);$('#sideUse').setAttribute('href',sideOpen?'#i-layout-sidebar-right-collapse':'#i-layout-sidebar-right-expand');setTimeout(()=>{sizeChart();chartDirty=true},520)}
$('#backBtn').addEventListener('click',closeDetail);
$('#locateBtn').addEventListener('click',()=>{if(locate)flyTo(locate[0],locate[1],locate[2])});
document.addEventListener('click',e=>{const a=e.target.closest('[data-ref]');if(a&&!a.closest('#map')){e.preventDefault();selectRef(a.dataset.ref)}});
for(const b of $$('#nav button'))b.addEventListener('click',()=>setTab(b.dataset.tab));
domainChips();
$('#domainChips').addEventListener('click',e=>{const b=e.target.closest('.sg');if(!b)return;const d=b.dataset.d;
  if(e.altKey||e.metaKey){const only=domOff.size===DOMAIN_KEYS.length-1&&!domOff.has(d);domOff=new Set(only?[]:DOMAIN_KEYS.filter(k=>k!==d))}else{domOff.has(d)?domOff.delete(d):domOff.add(d)}domainChips();rebuildLog()});
for(const b of $$('#levelSeg button'))b.addEventListener('click',()=>{logLevel=+b.dataset.l;for(const o of $$('#levelSeg button'))o.setAttribute('aria-pressed',o===b?'true':'false');rebuildLog()});

/* ---------- controls ---------- */
function togglePlay(){playing=!playing;$('#playUse').setAttribute('href',playing?'#i-player-pause':'#i-player-play');$('#playBtn').setAttribute('aria-label',playing?'Pause':'Resume');last=performance.now()}
function setSpeed(v){speed=v;for(const o of $$('#speedSeg button'))o.setAttribute('aria-pressed',String(+o.dataset.s===v))}
$('#playBtn').addEventListener('click',togglePlay);
for(const b of $$('#speedSeg button'))b.addEventListener('click',()=>setSpeed(+b.dataset.s));
function setMode(m){mode=m;dirtyPol=true;for(const o of $$('#modeRail>button[data-m]'))o.setAttribute('aria-pressed',String(o.dataset.m===m));renderLegend()}
for(const b of $$('#modeRail>button[data-m]'))b.addEventListener('click',()=>setMode(b.dataset.m));
function setFollow(v){opts.follow=v;$('#followBtn').setAttribute('aria-pressed',String(v))}
$('#followBtn').addEventListener('click',()=>setFollow(!opts.follow));
$('#soundBtn').addEventListener('click',e=>{const b=e.currentTarget;if(Sound.on){Sound.stop();b.setAttribute('aria-pressed','false')}else if(Sound.start())b.setAttribute('aria-pressed','true')});
$('#sideBtn').addEventListener('click',()=>toggleSide());
const pop=$('#settings');
$('#settingsBtn').addEventListener('click',e=>{e.stopPropagation();pop.hidden=!pop.hidden;$('#settingsBtn').setAttribute('aria-expanded',String(!pop.hidden));if(!pop.hidden)$('#seedNote').textContent=`${S.name} grew from seed ${S.seed}, and is ${S.year} years old.`});
document.addEventListener('click',e=>{if(!pop.hidden&&!e.target.closest('#settings')&&!e.target.closest('#settingsBtn')){pop.hidden=true;$('#settingsBtn').setAttribute('aria-expanded','false')}});
$('#optClouds').addEventListener('change',e=>{opts.clouds=e.target.checked});
$('#optFarms').addEventListener('change',e=>{opts.farms=e.target.checked;bgKey=''});
for(const b of $$('#optLabels button'))b.addEventListener('click',()=>{opts.labels=+b.dataset.v;for(const o of $$('#optLabels button'))o.setAttribute('aria-pressed',String(o===b))});
let newArm=0;
$('#newBtn').addEventListener('click',()=>{
  const b=$('#newBtn'),lbl=b.querySelector('span');
  if(Date.now()-newArm>4000){newArm=Date.now();lbl.textContent=`Unmake ${S.name}? Press again`;b.classList.add('armed');setTimeout(()=>{if(Date.now()-newArm>=3900){lbl.textContent='Begin a new world';b.classList.remove('armed')}},4000);return}
  newArm=0;lbl.textContent='Begin a new world';b.classList.remove('armed');pop.hidden=true;genesis((Math.random()*2**31)|0);
});
$('#zin').addEventListener('click',()=>zoomAt(1.4,cw/2,ch/2));
$('#zout').addEventListener('click',()=>zoomAt(1/1.4,cw/2,ch/2));
$('#zreset').addEventListener('click',()=>flyTo(W/2,H/2,1));
(function(){const m=$('#minimap');let down=false;const go=e=>{const r=m.getBoundingClientRect();flyTo((e.clientX-r.left)/r.width*W-.5,(e.clientY-r.top)/r.height*H-.5,Math.max(view.z,1.8));if(down&&cam){view.z=cam.z;view.ox=cam.ox;view.oy=cam.oy;clampView();cam=null}};
  m.addEventListener('pointerdown',e=>{down=true;m.setPointerCapture(e.pointerId);go(e)});m.addEventListener('pointermove',e=>{if(down)go(e)});m.addEventListener('pointerup',()=>{down=false})})();

/* ---------- the index ---------- */
let palSel=0,palItems=[];
function openPalette(){$('#scrim').hidden=false;$('#palette').hidden=false;const i=$('#palInput');i.value='';runSearch('');setTimeout(()=>i.focus(),10)}
function closePalette(){$('#scrim').hidden=true;$('#palette').hidden=true}
function runSearch(q){
  q=q.trim().toLowerCase();const out=[];
  const add=(grp,icon,d,nm,sub,ref,score)=>out.push({grp,icon,d,nm,sub,ref,score});
  const m=n=>!q||n.toLowerCase().includes(q);
  for(const r of S.realms)if(m(r.name))add('Realms','building-castle','politics',r.name,r.alive?`${RACES[r.race].n}, ${fmt(X.pop[r.id]||0)} souls`:`fallen ${r.fell}`,'r'+r.id,(r.alive?2:0)+(X.pop[r.id]||0)/1e6);
  for(const s of S.sets)if(m(s.name))add('Settlements','home','people',s.name,`${kind(s.pop).toLowerCase()} of ${S.realms[s.realm].name}`,'s'+s.id,s.pop/1e6);
  for(const p of S.greats)if(m(p.name))add('People',catIcon(GREAT[p.kind].ico),catDom(GREAT[p.kind].ico),p.name,`${GREAT[p.kind].n.toLowerCase()} of ${S.realms[p.realm].name}`,'g'+p.id,p.alive?1:0);
  for(const b of S.beasts)if(m(b.name))add('Beasts',catIcon(b.kind),'monster',b.name,b.alive?`${b.kind}, abroad`:'gone','b'+b.id,b.alive?1:0);
  for(const w of S.wars)if(m(w.name))add('Wars','swords','war',w.name,`since ${w.start}`,'w'+w.id,1);
  const grps=['Realms','Settlements','Wars','People','Beasts'];palItems=[];let html='';
  for(const g of grps){const items=out.filter(o=>o.grp===g).sort((a,b)=>b.score-a.score).slice(0,q?8:4);if(!items.length)continue;html+=`<div class="idx-grp">${g}</div>`;
    for(const it of items){palItems.push(it);html+=`<button type="button" class="idx-item" data-i="${palItems.length-1}">${icd(it.icon,it.d)}<span><span class="nm">${it.nm}</span><br><span class="sub">${it.sub}</span></span></button>`}}
  $('#palRes').innerHTML=html||'<div class="empty" style="padding:16px 4px">No entry of that name.</div>';palSel=0;markPal();
}
function markPal(){$$('.idx-item').forEach((b,i)=>b.setAttribute('aria-selected',String(i===palSel)));const s=$$('.idx-item')[palSel];if(s)s.scrollIntoView({block:'nearest'})}
function choosePal(i){const it=palItems[i];if(!it)return;closePalette();selectRef(it.ref);setTimeout(()=>{if(locate)flyTo(locate[0],locate[1],locate[2])},30)}
$('#searchBtn').addEventListener('click',openPalette);
$('#scrim').addEventListener('click',()=>{closePalette();$('#banner').hidden=true});
$('#palInput').addEventListener('input',e=>runSearch(e.target.value));
$('#palInput').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){palSel=Math.min(palItems.length-1,palSel+1);markPal();e.preventDefault()}else if(e.key==='ArrowUp'){palSel=Math.max(0,palSel-1);markPal();e.preventDefault()}else if(e.key==='Enter'){choosePal(palSel)}else if(e.key==='Escape'){closePalette()}});
$('#palRes').addEventListener('click',e=>{const b=e.target.closest('.idx-item');if(b)choosePal(+b.dataset.i)});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,select,textarea'))return;
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('.rrow,.fig[data-ref]')){e.preventDefault();selectRef(e.target.dataset.ref);return}
  if(e.key===' '){e.preventDefault();togglePlay()}
  else if(e.key==='/'||(e.key.toLowerCase()==='k'&&(e.metaKey||e.ctrlKey))){e.preventDefault();openPalette()}
  else if(e.key==='Escape'){if(!$('#palette').hidden)closePalette();else if(!$('#banner').hidden){$('#banner').hidden=true;$('#scrim').hidden=true}else if(sel)closeDetail()}
  else if(e.key>='1'&&e.key<='5'&&!e.metaKey&&!e.ctrlKey)setSpeed([.5,1,2,4,8][+e.key-1]);
  else if(e.key.toLowerCase()==='f'&&!e.metaKey&&!e.ctrlKey)setFollow(!opts.follow);
  else if(e.key.toLowerCase()==='b'&&!e.metaKey&&!e.ctrlKey)toggleSide();
});

/* ---------- the map under the hand ---------- */
const ptrs=new Map();let drag=null,pinch=null;
function cellAt(mx,my){const s=base*view.z,x=Math.floor((mx-view.ox)/s),y=Math.floor((my-view.oy)/s);if(x<0||y<0||x>=W||y>=H)return null;return{x,y,cell:y*W+x,fx:(mx-view.ox)/s-.5,fy:(my-view.oy)/s-.5}}
function thingAt(c){
  if(!c)return null;
  const s=base*view.z,tol=Math.max(1.1,11/s),t2=tol*tol;
  let best=null,bd=t2;const consider=(t,id,x,y,o)=>{const d=d2(x,y,c.fx,c.fy);if(d<bd){bd=d;best={t,id,o}}};
  for(const a of S.armies)consider('a',a.id,a._x??a.x,a._y??a.y,a);
  for(const b of S.beasts)if(b.alive)consider('b',b.id,b.x,b.y,b);
  if(best)return best;
  for(const t of S.sets)consider('s',t.id,t.x,t.y,t);if(best)return best;
  bd=Math.min(t2,1);for(const r of S.ruins)consider('ruin',r.id,r.x,r.y,r);if(best)return best;
  const o=S.owner[c.cell];if(o>=0)return{t:'r',id:o,o:S.realms[o]};
  return null;
}
function showTip(mx,my){
  const tip=$('#tip'),c=cellAt(mx,my);hover=c;if(!c||!S){tip.hidden=true;return}
  const th=thingAt(c),b=G.biome[c.cell],o=S.owner[c.cell];let h='';
  const hc=(k,d)=>`<span class="hc-ico" style="--d:${pal(d)}">${ico(k)}</span>`;
  if(th&&th.t==='s'){const t=th.o,r=S.realms[t.realm];const sick=S.plagues.some(p=>p.act[t.id]!=null);
    h=`<span class="hc-ico">${bannerSVG(r,20)}</span><b>${t.name}</b><span class="k">${kind(t.pop).toLowerCase()} of ${fmt(t.pop)} souls, ${r.name}</span><span>${r.cap===t.id?tag('seat','gold'):''}${t.b.walls?tag('walled','blue'):''}${t.w.length?tag('wonder','line gold'):''}${sick?tag('plague','violet'):''}${t.food<.05?tag('hungry','war'):''}</span>`}
  else if(th&&th.t==='a'){const a=th.o,r=S.realms[a.realm],t=X.byId.get(a.target);h=`<span class="hc-ico">${bannerSVG(r,20)}</span><b>${capF(a.name)}</b><span class="k">${fmt(a.size)} soldiers of ${r.name}</span><span class="k">${a.state==='siege'?`besieging ${t?t.name:''}, ${Math.round(a.siege*100)}%`:a.state==='retreat'?'in retreat':t?`marching on ${t.name}`:'holding'}</span>`}
  else if(th&&th.t==='b')h=`${hc(catIcon(th.o.kind),'monster')}<b>${th.o.name}</b><span class="k">${th.o.kind}, first seen in ${th.o.born}</span>`;
  else if(th&&th.t==='ruin')h=`${hc('building-arch','death')}<b>Ruins of ${th.o.name}</b><span class="k">destroyed in ${th.o.year}</span>`;
  else if(o>=0){const r=S.realms[o];h=`<span class="hc-ico">${bannerSVG(r,20)}</span><b>${r.name}</b><span class="k">${BIOME[b].n}${G.river[c.cell]?', river':''}${G.res[c.cell]?', '+RES[G.res[c.cell]].n.toLowerCase():''}${S.farm[c.cell]?', fields':''}</span><span>${r.overlord!=null?tag('vassal','violet'):''}${X.atWar.has(r.id)?tag('at war','war'):''}${X.scar[c.cell]<1?tag('blighted','violet'):''}</span>`}
  else h=`${hc(isLand(b)?'mountain':'ship',isLand(b)?'nature':'knowledge')}<b>${BIOME[b].n}</b><span class="k">${isLand(b)?'unclaimed wilds':'open water'}${G.res[c.cell]?', '+RES[G.res[c.cell]].n.toLowerCase():''}</span>`;
  tip.innerHTML=h;tip.hidden=false;
  const tw=tip.offsetWidth,tht=tip.offsetHeight;tip.style.left=clamp(mx+16,4,cw-tw-4)+'px';tip.style.top=clamp(my+16,4,ch-tht-4)+'px';
}
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});cam=null;
  if(ptrs.size===1)drag={x:e.offsetX,y:e.offsetY,ox:view.ox,oy:view.oy,moved:false};
  else if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:view.z};drag=null}});
cv.addEventListener('pointermove',e=>{
  if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(pinch&&ptrs.size===2){const[a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);zoomAt(pinch.z*d/pinch.d/view.z,(a.x+b.x)/2,(a.y+b.y)/2);return}
  if(drag){const dx=e.offsetX-drag.x,dy=e.offsetY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4){drag.moved=true;cv.classList.add('dragging')}
    if(drag.moved){view.ox=drag.ox+dx;view.oy=drag.oy+dy;clampView();$('#tip').hidden=true;return}}
  if(e.pointerType==='mouse')showTip(e.offsetX,e.offsetY);
});
function endPtr(e){
  const wasDrag=drag;ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;
  if(wasDrag&&!wasDrag.moved&&e.type==='pointerup'&&S){const th=thingAt(cellAt(e.offsetX,e.offsetY));if(th){navStack.length=0;select({t:th.t,id:th.id},false)}else if(sel){navStack.length=0;closeDetail()}if(e.pointerType!=='mouse')showTip(e.offsetX,e.offsetY)}
  drag=null;cv.classList.remove('dragging');
}
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){$('#tip').hidden=true;hover=null}});
cv.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.deltaY<0?1.18:1/1.18,e.offsetX,e.offsetY)},{passive:false});
