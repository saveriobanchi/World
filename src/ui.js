/* =====================================================================
   UI · codex, chronicle, inspector, controls
   ===================================================================== */
(function buildSprite(){
  let s='<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0">';
  for(const k in ICONS)s+=`<symbol id="i-${k}" viewBox="0 0 512 512"><path d="${ICONS[k]}"/></symbol>`;
  $('#sprite').innerHTML=s+'</svg>';$('#sprite').hidden=false;$('#sprite').style.cssText='position:absolute;width:0;height:0;overflow:hidden';
})();
const ico=(k,cls='')=>`<svg class="${cls}" aria-hidden="true"><use href="#i-${ICONS[k]?k:'era'}"/></svg>`;

let playing=true,speed=3,acc=0,last=performance.now(),uiDirty=true,lastUi=0,logFilter=1,tab='chronicle',follow=false,fallenOpen=false,realmSort='pop';
const logEl=$('#log');

/* ---------- chronicle ---------- */
function liFor(e,isFresh){const li=document.createElement('li');li.className=`i${e.i} t-${e.c||''}${isFresh?' fresh':''}`;
  li.innerHTML=`<span class="ic">${ico(e.c)}</span><span class="y">${e.i===3?'Year '+e.y:e.y}</span><span class="t">${e.t}</span>`;return li}
function rebuildLog(){logEl.textContent='';const items=S.log.filter(e=>e.i>=logFilter).slice(-280).reverse();const f=document.createDocumentFragment();for(const e of items)f.appendChild(liFor(e,false));logEl.appendChild(f)}
function flushLog(){
  if(!fresh.length)return;
  const items=fresh.filter(e=>e.i>=logFilter);const many=items.length>30;
  const f=document.createDocumentFragment();for(const e of items.slice(-60).reverse())f.appendChild(liFor(e,!many));
  logEl.insertBefore(f,logEl.firstChild);while(logEl.children.length>280)logEl.lastChild.remove();
  const great=fresh.filter(e=>e.i>=2);
  if(great.length&&playing){for(const e of great.slice(-2))toast(e);const g=great[great.length-1];Sound.cue(g.c);
    if(follow){const e=[...great].reverse().find(e=>e.x!=null);if(e)flyTo(e.x,e.yy,Math.max(2.2,Math.min(view.z,3.4)))}}
  else if(fresh.length){const c=fresh.find(e=>e.i>=1&&(e.c==='war'||e.c==='battle'));if(c)Sound.cue(c.c)}
  fresh=[];
}
function toast(e){
  const el=document.createElement('div');el.className='toast';el.innerHTML=`<span class="ic">${ico(e.c)}</span><span><span class="yy">Year ${e.y}</span>${e.t}</span>`;
  el.addEventListener('click',ev=>{if(ev.target.closest('[data-ref]'))return;if(e.x!=null)flyTo(e.x,e.yy,3);if(e.r[0])selectRef(e.r[0])});
  const box=$('#toasts');box.prepend(el);while(box.children.length>3)box.lastChild.remove();
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),500)},6000);
}

/* ---------- header ---------- */
function renderHeader(){
  $('#worldName').textContent=S.name;$('#eraName').textContent=S.eras[S.eras.length-1].name;$('#year').textContent=S.year;
  const alive=S.realms.filter(r=>r.alive);let pop=0;for(const s of S.sets)pop+=s.pop;
  const beasts=S.beasts.filter(b=>b.alive).length,wars=new Set(S.wars.map(w=>w.name)).size;
  $('#stats').innerHTML=`<span><b>${fmt(pop)}</b> souls</span><span><b>${alive.length}</b> realms</span><span><b>${S.sets.length}</b> settlements</span><span><b>${wars}</b> war${wars===1?'':'s'}</span><span><b>${(X.routes||[]).length}</b> trade routes</span><span><b>${S.faiths.filter(f=>f.ext==null).length}</b> faiths</span><span><b>${beasts}</b> monster${beasts===1?'':'s'}</span>${S.winter>S.year?'<span><b>&#10052;</b> long winter</span>':''}`;
  document.title=`${S.name} · Year ${S.year}`;
}

/* ---------- realms ---------- */
function realmRow(r){
  const ss=setsOf(r.id),war=X.atWar.has(r.id)&&r.alive;
  const sub=r.alive?`${RACES[r.race].n} · ${rulerStr(r)}`:`${RACES[r.race].n} · ${r.founded}–${r.fell}`;
  const num=!r.alive?`fallen<small>peak ${fmt(r.peak)}</small>`:realmSort==='gold'?`${fmt(r.gold)}<small>+${fmt(r.income)}/yr</small>`:realmSort==='land'?`${((X.cells[r.id]||0)/G.land*100).toFixed(1)}%<small>${ss.length} holdings</small>`:realmSort==='age'?`${S.year-r.founded} yrs<small>since ${r.founded}</small>`:`${fmt(X.pop[r.id]||0)}<small>${ss.length} holdings</small>`;
  return`<div class="realm-row" data-ref="r${r.id}" role="button" tabindex="0">${armsSVG(r.arms,26)}<div style="min-width:0"><div class="nm">${r.name}${war?'<span class="chip war">war</span>':''}${r.golden>S.year?'<span class="chip gold">golden age</span>':''}</div><div class="sub">${sub}</div></div><div class="num">${num}</div></div>`;
}
function renderRealms(){
  const key={pop:r=>X.pop[r.id]||0,land:r=>X.cells[r.id]||0,gold:r=>r.gold,age:r=>S.year-r.founded}[realmSort];
  const alive=S.realms.filter(r=>r.alive).sort((a,b)=>key(b)-key(a));
  const dead=S.realms.filter(r=>!r.alive).sort((a,b)=>b.fell-a.fell).slice(0,40);
  $('#pane-realms').innerHTML=`<div class="list-head"><span>${alive.length} living realms</span><select id="realmSort" aria-label="Sort realms"><option value="pop"${realmSort==='pop'?' selected':''}>By population</option><option value="land"${realmSort==='land'?' selected':''}>By territory</option><option value="gold"${realmSort==='gold'?' selected':''}>By treasury</option><option value="age"${realmSort==='age'?' selected':''}>By age</option></select></div>`+
    alive.map(realmRow).join('')+(dead.length?`<details class="fallen" id="fallenBox"${fallenOpen?' open':''}><summary>Fallen realms (${S.realms.length-alive.length})</summary>${dead.map(realmRow).join('')}</details>`:'');
  const fb=$('#fallenBox');if(fb)fb.addEventListener('toggle',()=>{fallenOpen=fb.open});
  $('#realmSort').addEventListener('change',e=>{realmSort=e.target.value;renderRealms()});
}

/* ---------- figures ---------- */
function renderFigures(){
  const heroes=S.heroes.slice().reverse(),greats=S.greats.slice().reverse(),beasts=S.beasts.slice().reverse();
  const hRow=h=>`<div class="fig${h.alive?'':' dead'}"><span class="ic">${ico('hero')}</span><div><div class="nm">${h.name}${h.ep?' '+h.ep:''}</div><div class="sub">Hero of ${h.home} · ${S.realms[h.realm].name}${h.crowned?` · crowned ${h.crowned}`:h.alive?` · age ${Math.round(S.year-h.born)}`:''}</div></div></div>`;
  const gRow=p=>`<div class="fig${p.alive?'':' dead'}" data-ref="g${p.id}" role="button" tabindex="0"><span class="ic">${ico(GREAT[p.kind].ico)}</span><div><div class="nm">${p.name}</div><div class="sub">${GREAT[p.kind].n} of ${S.realms[p.realm].name}${p.works.length?` · ${p.works.length} work${p.works.length>1?'s':''}`:''}${p.alive?'':` · died ${p.died||''}`}</div></div></div>`;
  const bRow=b=>`<div class="fig${b.alive?'':' dead'}" data-ref="b${b.id}" role="button" tabindex="0"><span class="ic" style="color:#ff9d80">${ico(b.kind)}</span><div><div class="nm">${b.name}</div><div class="sub">${capF(b.kind)} · first seen ${b.born}${b.alive?'':b.slain?` · slain ${b.slain}`:' · vanished'} · ${fmtDead(b.kills)} victims</div></div></div>`;
  const live=a=>a.filter(x=>x.alive),dead=a=>a.filter(x=>!x.alive).slice(0,12);
  $('#pane-figures').innerHTML=
    `<div class="sect">Monsters abroad</div>${live(beasts).map(bRow).join('')||'<div class="empty">No monster troubles the world.</div>'}`+
    `<div class="sect">Living heroes</div>${live(heroes).map(hRow).join('')||'<div class="empty">No heroes walk the land.</div>'}`+
    `<div class="sect">Great minds &amp; captains</div>${live(greats).map(gRow).join('')||'<div class="empty">None of renown, yet.</div>'}`+
    `<div class="sect">Remembered</div>${[...dead(greats).map(gRow),...dead(heroes).filter(h=>h.ep||h.crowned).map(hRow),...dead(beasts).map(bRow)].join('')||'<div class="empty">History has yet to remember anyone.</div>'}`;
}

/* ---------- ages timeline ---------- */
const agesCv=$('#ages');let agesRows=[];
function renderAges(){
  const pane=$('#pane-ages'),w=pane.clientWidth;if(!w)return;
  const rs=S.realms.filter(r=>r.alive||(r.fell-r.founded)>=25).sort((a,b)=>a.founded-b.founded||a.id-b.id);
  const rowH=16,top=58,h=top+rs.length*rowH+16;
  agesCv.width=Math.round(w*dpr);agesCv.height=Math.round(h*dpr);agesCv.style.height=h+'px';
  const c=agesCv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const L=14,R=w-14,Y=S.year||1,X_=y=>L+(y/Y)*(R-L);
  // eras band
  S.eras.forEach((e,i)=>{const x0=X_(e.start),x1=X_(i<S.eras.length-1?S.eras[i+1].start:Y);c.fillStyle=i%2?'rgba(216,179,94,.12)':'rgba(216,179,94,.2)';c.fillRect(x0,8,Math.max(1,x1-x0),20);
    c.strokeStyle='rgba(216,179,94,.25)';c.beginPath();c.moveTo(x0+.5,8);c.lineTo(x0+.5,h-8);c.stroke();
    c.save();c.beginPath();c.rect(x0+2,8,Math.max(0,x1-x0-4),20);c.clip();c.fillStyle='#f3d68a';c.font="italic 600 12px 'Cormorant Garamond', Georgia, serif";c.textBaseline='middle';c.fillText(e.name.replace(/^The /,''),x0+5,18.5);c.restore()});
  c.fillStyle='#9aa5b9';c.font="10.5px 'JetBrains Mono', monospace";c.textBaseline='alphabetic';c.textAlign='left';c.fillText('0',L,46);c.textAlign='right';c.fillText(String(Y),R,46);c.textAlign='center';c.fillText(String(Math.round(Y/2)),X_(Y/2),46);
  agesRows=[];
  rs.forEach((r,i)=>{const y=top+i*rowH,x0=X_(r.founded),x1=X_(r.alive?Y:r.fell);c.fillStyle=r.color;c.globalAlpha=r.alive?.95:.55;c.fillRect(x0,y+3,Math.max(2,x1-x0),rowH-6);c.globalAlpha=1;
    if(sel&&sel.t==='r'&&sel.id===r.id){c.strokeStyle='#f3d68a';c.lineWidth=1.5;c.strokeRect(x0-1,y+2,Math.max(2,x1-x0)+2,rowH-4)}
    c.font="600 12px 'Cormorant Garamond', Georgia, serif";c.textBaseline='middle';const tw=c.measureText(r.name).width;
    const inside=x1-x0>tw+8;c.fillStyle=inside?'#140e08':'#efe5cb';c.textAlign='left';c.fillText(r.name,inside?x0+4:Math.min(x1+4,R-tw),y+rowH/2+.5);
    agesRows.push({y0:y,y1:y+rowH,id:r.id})});
}
agesCv.addEventListener('click',e=>{const r=agesCv.getBoundingClientRect(),y=e.clientY-r.top;const row=agesRows.find(o=>y>=o.y0&&y<o.y1);if(row)select({t:'r',id:row.id})});

/* ---------- inspector ---------- */
function historyFor(ref){const items=S.log.filter(e=>e.r.includes(ref)).slice(-40).reverse();return items.length?`<ul class="log">${items.map(e=>`<li class="i${e.i} t-${e.c}"><span class="ic">${ico(e.c)}</span><span class="y">${e.y}</span><span class="t">${e.t}</span></li>`).join('')}</ul>`:'<div class="empty">Nothing recorded yet.</div>'}
function warHistory(w){const a='r'+w.a,b='r'+w.b;const items=S.log.filter(e=>e.y>=w.start&&e.r.includes(a)&&e.r.includes(b)).slice(-40).reverse();
  return items.length?`<ul class="log">${items.map(e=>`<li class="i${e.i} t-${e.c}"><span class="ic">${ico(e.c)}</span><span class="y">${e.y}</span><span class="t">${e.t}</span></li>`).join('')}</ul>`:'<div class="empty">Nothing recorded yet.</div>'}
function kv(k,v,meter,txt){return`<div><div class="k">${k}</div><div class="v${txt?' txt':''}">${v}</div>${meter!=null?`<div class="meter"><i style="width:${clamp(meter,0,100)}%"></i></div>`:''}</div>`}
function sparkSVG(id){
  const pts=S.hist.filter(h=>h.p[id]!=null);if(pts.length<2)return'';
  const y0=pts[0].y,y1=pts[pts.length-1].y,mx=Math.max(...pts.map(h=>h.p[id]));
  const P=pts.map(h=>`${((h.y-y0)/Math.max(1,y1-y0)*300).toFixed(1)},${(44-h.p[id]/mx*40).toFixed(1)}`).join(' ');
  return`<svg class="spark" viewBox="0 0 300 46" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,46 ${P} 300,46" fill="${S.realms[id].color}" opacity=".35"/><polyline points="${P}" fill="none" stroke="${S.realms[id].color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg><div class="kicker" style="display:flex;justify-content:space-between;font-family:var(--f-mono);font-size:11px"><span>${y0}</span><span>peak ${fmt(mx)}</span><span>${y1}</span></div>`;
}
function renderInspect(){
  const el=$('#pane-inspect');
  if(!sel){el.innerHTML='<div class="empty">Click a realm, city, ruin, army or monster on the map, or any name in the chronicle, to open its page in the codex.</div>';return}
  const top=(x,y)=>`<button class="close" type="button" id="clearSel">Close</button>${x!=null?`<button class="flyto close" type="button" id="flyBtn" data-x="${x}" data-y="${y}">Show on map</button>`:''}`;
  if(sel.t==='r'){
    const r=S.realms[sel.id];if(!r){sel=null;return renderInspect()}
    const ss=S.sets.filter(s=>s.realm===r.id).sort((a,b)=>b.pop-a.pop),cap=ss.find(s=>s.id===r.cap);
    const cells=X.cells[r.id]||0,faith=S.faiths[r.faith];
    const wars=S.wars.filter(w=>w.a===r.id||w.b===r.id).map(w=>{const o=S.realms[w.a===r.id?w.b:w.a];return`<li><span>${rnB(o)} <span class="chip war">war</span></span><span>${w.name.replace(/^The /,'')}</span></li>`}).join('');
    const allies=Object.keys(S.allies).map(k=>k.split('-').map(Number)).filter(([a,b])=>a===r.id||b===r.id).map(([a,b])=>S.realms[a===r.id?b:a]);
    const neigh=[];for(const[k]of X.border){const a=Math.floor(k/4096),b=k%4096;if(a!==r.id&&b!==r.id)continue;const o=a===r.id?b:a;neigh.push([S.realms[o],S.rel[rkey(a,b)]||0])}
    neigh.sort((a,b)=>a[1]-b[1]);
    const relBar=v=>{const w=Math.abs(v)/2;return`<span class="rel"><i style="${v<0?`right:50%;width:${w}%;background:var(--vermilion)`:`left:50%;width:${w}%;background:var(--verdigris)`}"></i></span>`};
    const rc=X.resc[r.id]||[];const res=[];for(let k=1;k<RES.length;k++)if(rc[k])res.push(`<span class="res">${ico(RES[k].k)}${RES[k].n} <b>${rc[k]}</b></span>`);
    const trade=(X.routes||[]).filter(t=>t.ra===r.id||t.rb===r.id).map(t=>{const mine=X.byId.get(t.ra===r.id?t.a:t.b),theirs=X.byId.get(t.ra===r.id?t.b:t.a);return`<li><span>${sn(mine)} &harr; ${sn(theirs)}</span><span>${t.sea?'by sea':'by road'}</span></li>`}).join('');
    const figs=[...S.greats.filter(p=>p.alive&&p.realm===r.id).map(p=>`<li><span>${gn(p)}</span><span>${GREAT[p.kind].n}</span></li>`),...S.heroes.filter(h=>h.alive&&h.realm===r.id).map(h=>`<li><span>${hn(h)}</span><span>Hero</span></li>`)].join('');
    const ru=r.ruler,age=S.year-ru.born;
    el.innerHTML=`${top(cap?cap.x:null,cap?cap.y:null)}<div class="hero-card">${armsSVG(r.arms,78)}<div><h2>${r.name}</h2>
      <div class="kicker">${RACES[r.race].n} realm · founded ${r.founded}${r.parent!=null?` · broke from ${rnB(S.realms[r.parent])}`:''}${r.alive?'':` · <span style="color:var(--vermilion)">fell ${r.fell}</span>`}</div>
      <div class="blazon">${blazon(r.arms)}</div></div></div>
      ${r.alive?`<div class="ruler"><div class="nm">${rulerStr(r)}</div><div>House ${ru.dyn} · age ${age} · reigning since ${ru.crowned}</div><div>${ru.traits.map(t=>`<span class="trait">${t}</span>`).join('')}</div></div>
      <h4>The realm</h4><div class="kv">${kv('Population',fmt(X.pop[r.id]||0))}${kv('Holdings',ss.length)}${kv('Territory',(cells/G.land*100).toFixed(1)+'%')}${kv('Treasury',fmt(r.gold)+' cr')}${kv('Income',(r.income>=0?'+':'')+fmt(r.income)+'/yr')}${kv('Military',fmt(power(r)*10))}${kv('Stability',Math.round(r.stab),r.stab)}${kv('Learning',TECH_AGE[r.tech],(r.tech/(TECH.length-1))*100)}${kv('Seat',cap?sn(cap):'none',null,true)}</div>
      <div class="kv" style="grid-template-columns:1fr;margin-top:10px">${kv('Faith',faith?faith.name:'none',null,true)}</div>
      <h4>Population over time</h4>${sparkSVG(r.id)}
      ${res.length?`<h4>Resources</h4><div class="res-row">${res.join('')}</div>`:''}
      <h4>Diplomacy</h4><ul class="mini">${wars}${allies.map(a=>`<li><span>${rnB(a)} <span class="chip teal">ally</span></span><span></span></li>`).join('')}${neigh.filter(([o])=>!findWar(o.id,r.id)&&!S.allies[rkey(o.id,r.id)]).map(([o,v])=>`<li><span>${rnB(o)}</span><span>${v>30?'friendly':v<-30?'hostile':'wary'}${relBar(v)}</span></li>`).join('')}</ul>${!wars&&!allies.length&&!neigh.length?'<div class="empty">No neighbours yet.</div>':''}
      ${trade?`<h4>Trade routes</h4><ul class="mini">${trade}</ul>`:''}
      ${figs?`<h4>Notable figures</h4><ul class="mini">${figs}</ul>`:''}
      <h4>Holdings</h4><ul class="mini">${ss.slice(0,16).map(s=>`<li><span>${sn(s)}${s.id===r.cap?' <span class="chip gold">seat</span>':''}${s.w.length?' <span class="chip gold">wonder</span>':''}</span><span>${kind(s.pop)} · ${fmt(s.pop)}</span></li>`).join('')}</ul>`
      :`<div class="kv">${kv('Peak population',fmt(r.peak))}${kv('Lasted',(r.fell-r.founded)+' yrs')}${kv('Greatest extent',(r.peakCells/G.land*100).toFixed(1)+'%')}</div>`}
      ${r.reigns.length||r.alive?`<h4>Line of rulers</h4><ul class="reigns">${r.alive?`<li><span>${ru.crowned}–now</span><span>${rulerStr(r)} <span style="color:var(--muted)">· House ${ru.dyn}</span></span></li>`:''}${r.reigns.slice().reverse().slice(0,14).map(g=>`<li><span>${g.a}–${g.b}</span><span>${g.s} <span style="color:var(--muted)">· House ${g.d}</span></span></li>`).join('')}</ul>`:''}
      <h4>Chronicle</h4>${historyFor('r'+r.id)}`;
  }else if(sel.t==='s'){
    const s=S.sets.find(q=>q.id===sel.id);
    if(!s){const ru=S.ruins.find(q=>q.sid===sel.id);el.innerHTML=`${top(ru?ru.x:null,ru?ru.y:null)}<h2>${ru?'Ruins of '+ru.name:'A lost place'}</h2><div class="kicker">${ru?`Founded ${ru.founded}, destroyed ${ru.year}.${ru.w.length?' Once home to '+ru.w.join(' and ')+'.':''}`:'Nothing remains of it.'}</div><h4>Chronicle</h4>${historyFor('s'+sel.id)}`;return}
    const r=S.realms[s.realm];const trade=(X.routes||[]).filter(t=>t.a===s.id||t.b===s.id).map(t=>{const o=X.byId.get(t.a===s.id?t.b:t.a);return o?`<li><span>${sn(o)} · ${rnB(S.realms[o.realm])}</span><span>${t.sea?'by sea':'by road'}</span></li>`:''}).join('');
    const res=G.res[s.cell]?RES[G.res[s.cell]].n:'none';
    const born=S.greats.filter(p=>p.home===s.name).map(p=>`<li><span>${gn(p)}</span><span>${GREAT[p.kind].n}</span></li>`).join('');
    el.innerHTML=`${top(s.x,s.y)}<div class="hero-card">${armsSVG(r.arms,54)}<div><h2>${s.name}</h2><div class="kicker">${kind(s.pop)} of ${rnB(r)}${r.cap===s.id?' · seat of the realm':''}${s.port?' · harbour':''}</div></div></div>
      <div class="kv">${kv('Population',Math.round(s.pop).toLocaleString('en-US'))}${kv('Founded',s.founded)}${kv('Folk',RACES[r.race].pl,null,true)}${kv('Land',BIOME[G.biome[s.cell]].n+(G.river[s.cell]?', river':''),null,true)}${kv('Resource',res,null,true)}${kv('Trade links',(X.tradeCity&&X.tradeCity.get(s.id))||0)}</div>
      ${s.w.length?`<h4>Wonders</h4><ul class="mini">${s.w.map(w=>`<li><span>${capF(w.n)}</span><span>${w.y}</span></li>`).join('')}</ul>`:''}
      ${trade?`<h4>Trade routes</h4><ul class="mini">${trade}</ul>`:''}
      ${born?`<h4>Born here</h4><ul class="mini">${born}</ul>`:''}
      <h4>Chronicle</h4>${historyFor('s'+s.id)}`;
  }else if(sel.t==='b'){
    const b=S.beasts.find(q=>q.id===sel.id);if(!b){sel=null;return renderInspect()}
    el.innerHTML=`${top(b.x,b.y)}<div class="hero-card"><span class="ic" style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;border:1px solid #ff9d80;color:#ff9d80;background:rgba(224,87,62,.12)">${ico(b.kind).replace('<svg','<svg style="width:36px;height:36px"')}</span><div><h2>${b.name}</h2><div class="kicker">${capF(b.kind)} · first seen ${b.born}${b.alive?'':b.slain?` · slain ${b.slain}`:' · vanished'}</div></div></div>
      <div class="kv">${kv('Age',(b.alive?S.year:(b.slain||S.year))-b.born+' yrs')}${kv('Victims',fmtDead(b.kills))}${kv('Might',b.power+'/12',b.power/12*100)}</div>
      <h4>Chronicle</h4>${historyFor('b'+b.id)}`;
  }else if(sel.t==='g'){
    const p=S.greats.find(q=>q.id===sel.id);if(!p){sel=null;return renderInspect()}
    const r=S.realms[p.realm];
    el.innerHTML=`${top()}<div class="hero-card"><span class="ic" style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line-2);color:var(--gold-hi);background:rgba(216,179,94,.1)">${ico(GREAT[p.kind].ico).replace('<svg','<svg style="width:34px;height:34px"')}</span><div><h2>${p.name}</h2><div class="kicker">${GREAT[p.kind].n} of ${rnB(r)} · born in ${p.home}${p.alive?'':` · died ${p.died||''}`}</div></div></div>
      ${p.works.length?`<h4>Works</h4><ul class="mini">${p.works.map(w=>`<li><span style="font-style:italic">${capF(w.n)}</span><span>${w.y}</span></li>`).join('')}</ul>`:''}
      <h4>Chronicle</h4>${historyFor('g'+p.id)}`;
  }else if(sel.t==='ruin'){
    const ru=S.ruins.find(q=>q.id===sel.id);if(!ru){sel=null;return renderInspect()}
    el.innerHTML=`${top(ru.x,ru.y)}<div class="hero-card"><span class="ic" style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line-2);color:var(--muted)">${ico('ruin').replace('<svg','<svg style="width:34px;height:34px"')}</span><div><h2>Ruins of ${ru.name}</h2><div class="kicker">Founded ${ru.founded}, destroyed ${ru.year}. At its height ${fmt(ru.peak)} lived here.</div></div></div>${ru.w.length?`<p class="blazon">Once home to ${ru.w.join(' and ')}.</p>`:''}<h4>Chronicle</h4>${historyFor('s'+ru.sid)}`;
  }else if(sel.t==='w'){
    const w=S.wars.find(q=>q.id===sel.id);if(!w){sel=null;return renderInspect()}
    const A=S.realms[w.a],Bb=S.realms[w.b];
    el.innerHTML=`${top(w.fx,w.fy)}<div class="hero-card"><span class="ic" style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--vermilion);color:var(--vermilion);background:rgba(224,87,62,.1)">${ico('war').replace('<svg','<svg style="width:34px;height:34px"')}</span><div><h2>${w.name}</h2><div class="kicker">Raging since ${w.start} · ${S.year-w.start} years</div></div></div>
      <div class="kv">${kv('Attacker',rnB(A),null,true)}${kv('Defender',rnB(Bb),null,true)}${kv('Ground taken',Math.abs(w.score)+' leagues²')}</div>
      <p class="blazon">${Math.abs(w.score)<10?'The war hangs in the balance.':`${w.score>0?A.name:Bb.name} has the upper hand.`}</p>
      <h4>Chronicle</h4>${warHistory(w)}`;
  }
  const cb=$('#clearSel');if(cb)cb.onclick=()=>select(null);
  const fb=$('#flyBtn');if(fb)fb.onclick=()=>flyTo(+fb.dataset.x,+fb.dataset.y,3.2);
}

/* ---------- chart ---------- */
const chartCv=$('#chart'),cctx=chartCv.getContext('2d');let chartW=0,chartH=0,chartDirty=true;
function sizeChart(){const r=chartCv.getBoundingClientRect();chartW=r.width;chartH=r.height;chartCv.width=Math.max(1,Math.round(chartW*dpr));chartCv.height=Math.max(1,Math.round(chartH*dpr));chartDirty=true}
const CH_PAD={l:50,r:14,t:28,b:22};
function drawChart(){
  chartDirty=false;const c=cctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,chartW,chartH);
  const hs=S.hist;if(hs.length<2)return;
  const y0=hs[0].y,y1=hs[hs.length-1].y,pw=chartW-CH_PAD.l-CH_PAD.r,ph=chartH-CH_PAD.t-CH_PAD.b;
  let mx=1;for(const h of hs){let t=0;for(const k in h.p)t+=h.p[k];if(t>mx)mx=t}
  const X_=y=>CH_PAD.l+(y-y0)/Math.max(1,y1-y0)*pw,Y_=v=>CH_PAD.t+ph-v/mx*ph;
  // era bands
  S.eras.forEach((e,i)=>{const a=Math.max(e.start,y0),b=i<S.eras.length-1?S.eras[i+1].start:y1;if(b<=y0)return;if(i%2){c.fillStyle='rgba(216,179,94,.05)';c.fillRect(X_(a),CH_PAD.t,X_(b)-X_(a),ph)}});
  c.strokeStyle='rgba(154,165,185,.16)';c.lineWidth=1;c.font="10.5px 'JetBrains Mono', monospace";c.fillStyle='#9aa5b9';c.textBaseline='middle';c.textAlign='right';
  for(const f of[0,.5,1]){const yy=Math.round(Y_(mx*f))+.5;c.beginPath();c.moveTo(CH_PAD.l,yy);c.lineTo(chartW-CH_PAD.r,yy);c.stroke();c.fillText(fmt(mx*f),CH_PAD.l-7,yy)}
  const ids=new Set();for(const h of hs)for(const k in h.p)ids.add(+k);const order=[...ids].sort((a,b)=>a-b);
  const cum=new Float64Array(hs.length);
  for(const id of order){const r=S.realms[id];if(!r)continue;c.beginPath();
    for(let i=0;i<hs.length;i++){const v=cum[i]+(hs[i].p[id]||0);const x=X_(hs[i].y),y=Y_(v);i?c.lineTo(x,y):c.moveTo(x,y)}
    for(let i=hs.length-1;i>=0;i--)c.lineTo(X_(hs[i].y),Y_(cum[i]));
    c.closePath();c.fillStyle=r.color;c.globalAlpha=.9;c.fill();c.globalAlpha=1;
    for(let i=0;i<hs.length;i++)cum[i]+=hs[i].p[id]||0;
  }
  c.strokeStyle='rgba(243,214,138,.9)';c.lineWidth=1.4;c.beginPath();for(let i=0;i<hs.length;i++){const x=X_(hs[i].y),y=Y_(cum[i]);i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();
  c.strokeStyle='rgba(243,214,138,.45)';c.setLineDash([3,3]);c.lineWidth=1;
  for(const e of S.eras){if(e.start<=y0||e.start>y1)continue;const x=Math.round(X_(e.start))+.5;c.beginPath();c.moveTo(x,CH_PAD.t);c.lineTo(x,CH_PAD.t+ph);c.stroke()}
  c.setLineDash([]);
  c.fillStyle='#9aa5b9';c.font="10.5px 'JetBrains Mono', monospace";c.textBaseline='alphabetic';
  c.textAlign='left';c.fillText('Y'+y0,CH_PAD.l,chartH-6);c.textAlign='right';c.fillText('Y'+y1,chartW-CH_PAD.r,chartH-6);
}
chartCv.addEventListener('mousemove',e=>{
  const hs=S&&S.hist;const tip=$('#chartTip');if(!hs||hs.length<2){tip.hidden=true;return}
  const r=chartCv.getBoundingClientRect(),mx=e.clientX-r.left;const y0=hs[0].y,y1=hs[hs.length-1].y,pw=chartW-CH_PAD.l-CH_PAD.r;
  const yr=y0+(mx-CH_PAD.l)/pw*(y1-y0);let best=hs[0];for(const h of hs)if(Math.abs(h.y-yr)<Math.abs(best.y-yr))best=h;
  const top=Object.entries(best.p).sort((a,b)=>b[1]-a[1]).slice(0,4);let tot=0;for(const k in best.p)tot+=best.p[k];
  const era=[...S.eras].reverse().find(x=>x.start<=best.y);
  tip.innerHTML=`<b>Year ${best.y}</b> · ${fmt(tot)} souls${era?`<br><i style="color:var(--gold-hi)">${era.name}</i>`:''}<br>`+top.map(([id,v])=>`<span class="ref r" style="--c:${S.realms[id].color};border:0">${S.realms[id].name}</span> ${fmt(v)}`).join('<br>');
  tip.hidden=false;tip.style.left=clamp(mx+12,0,chartW-tip.offsetWidth-4)+'px';
});
chartCv.addEventListener('mouseleave',()=>{$('#chartTip').hidden=true});

/* ---------- selection & controls ---------- */
function setTab(t){tab=t;for(const b of $$('.tabs button'))b.setAttribute('aria-selected',b.dataset.tab===t?'true':'false');
  for(const p of['chronicle','realms','figures','ages','inspect'])$('#pane-'+p).hidden=p!==t;uiDirty=true;lastUi=0}
function select(s){sel=s;dirtyPol=true;if(s)setTab('inspect');renderInspect();if(s)$('#pane-inspect').scrollTop=0;if(mode==='diplomacy')updateHint()}
function selectRef(ref){if(!ref)return;const t=ref[0],id=+ref.slice(1);if('rsbg'.includes(t))select({t,id})}
document.addEventListener('click',e=>{const a=e.target.closest('[data-ref]');if(a&&!a.closest('#map')){e.preventDefault();selectRef(a.dataset.ref)}});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.realm-row,.fig[data-ref]')){e.preventDefault();selectRef(e.target.dataset.ref)}
  if(e.target.matches('input,select,textarea'))return;if(e.key===' '&&e.target===document.body){e.preventDefault();togglePlay()}});
for(const b of $$('.tabs button'))b.addEventListener('click',()=>setTab(b.dataset.tab));
$('#logFilter').addEventListener('change',e=>{logFilter=+e.target.value;rebuildLog()});
function togglePlay(){playing=!playing;$('#playIcon').setAttribute('d',playing?'M7 5h3v14H7zM14 5h3v14h-3z':'M8 5l11 7-11 7z');$('#playBtn').setAttribute('aria-label',playing?'Pause':'Resume');last=performance.now()}
$('#playBtn').addEventListener('click',togglePlay);
for(const b of $$('#speedSeg button'))b.addEventListener('click',()=>{speed=+b.dataset.s;for(const o of $$('#speedSeg button'))o.setAttribute('aria-pressed',o===b?'true':'false')});
const HINTS={peoples:'Each realm tinted by its people: humans, elves, dwarves, orcs and halflings.',faith:'Each realm tinted by the faith it follows.',trade:'Caravan roads in gold, sea lanes in white, and every resource on the map.',
  density:'Where people live: dark violet for the wilds, gold for the great cities.',diplomacy:'Select a realm to see how the world regards it: allies in green, enemies in red.',terrain:'The bare land, without borders.'};
function updateHint(){const h=$('#modeHint');let t=HINTS[mode];if(mode==='diplomacy'&&sel&&sel.t==='r')t=`How the world regards ${S.realms[sel.id].name}: allies in green, enemies in red, the rest by sentiment.`;if(t){h.textContent=t;h.hidden=false}else h.hidden=true}
for(const b of $$('#modeRail>button'))b.addEventListener('click',()=>{mode=b.dataset.m;dirtyPol=true;for(const o of $$('#modeRail>button'))o.setAttribute('aria-pressed',o===b?'true':'false');updateHint()});
$('#followBtn').addEventListener('click',e=>{follow=!follow;e.currentTarget.setAttribute('aria-pressed',String(follow))});
$('#cloudBtn').addEventListener('click',e=>{showClouds=!showClouds;e.currentTarget.setAttribute('aria-pressed',String(showClouds))});
$('#soundBtn').addEventListener('click',e=>{const b=e.currentTarget;if(Sound.on){Sound.stop();b.setAttribute('aria-pressed','false')}else if(Sound.start())b.setAttribute('aria-pressed','true')});
let newArm=0;
$('#newBtn').addEventListener('click',()=>{
  const b=$('#newBtn'),lbl=b.querySelector('span');
  if(Date.now()-newArm>4000){newArm=Date.now();lbl.textContent='Replace?';b.classList.add('warn');setTimeout(()=>{if(Date.now()-newArm>=3900){lbl.textContent='New world';b.classList.remove('warn')}},4000);return}
  newArm=0;lbl.textContent='New world';b.classList.remove('warn');genesis((Math.random()*2**31)|0);
});
$('#zin').addEventListener('click',()=>zoomAt(1.4,cw/2,ch/2));
$('#zout').addEventListener('click',()=>zoomAt(1/1.4,cw/2,ch/2));
$('#zreset').addEventListener('click',()=>{flyTo(W/2,H/2,1)});

/* ---------- map pointer handling ---------- */
const ptrs=new Map();let drag=null,pinch=null;
function cellAt(mx,my){const s=base*view.z,x=Math.floor((mx-view.ox)/s),y=Math.floor((my-view.oy)/s);if(x<0||y<0||x>=W||y>=H)return null;return{x,y,cell:y*W+x,fx:(mx-view.ox)/s-.5,fy:(my-view.oy)/s-.5}}
function thingAt(c){
  if(!c)return null;
  const s=base*view.z,tol=Math.max(1.1,10/s),t2=tol*tol;
  let bb=null,bd=t2;for(const b of S.beasts)if(b.alive){const d=d2(b.x,b.y,c.fx,c.fy);if(d<bd){bd=d;bb=b}}if(bb)return{t:'b',id:bb.id,o:bb};
  let bw=null;bd=t2;for(const w of S.wars)if(w.fx!=null){const d=d2(w._x??w.fx,w._y??w.fy,c.fx,c.fy);if(d<bd){bd=d;bw=w}}if(bw)return{t:'w',id:bw.id,o:bw};
  let bs=null;bd=t2;for(const t of S.sets){const d=d2(t.x,t.y,c.fx,c.fy);if(d<bd){bd=d;bs=t}}if(bs)return{t:'s',id:bs.id,o:bs};
  let br=null;bd=Math.min(t2,1);for(const r of S.ruins){const d=d2(r.x,r.y,c.fx,c.fy);if(d<bd){bd=d;br=r}}if(br)return{t:'ruin',id:br.id,o:br};
  const o=S.owner[c.cell];if(o>=0)return{t:'r',id:o,o:S.realms[o]};
  return null;
}
function showTip(mx,my){
  const tip=$('#tip'),c=cellAt(mx,my);hover=c;if(!c||!S){tip.hidden=true;return}
  const th=thingAt(c),b=G.biome[c.cell],o=S.owner[c.cell];let h='';
  if(th&&th.t==='s'){const r=S.realms[th.o.realm];h=`${armsSVG(r.arms,26)}<b>${th.o.name}</b><br><span class="k">${kind(th.o.pop)} · ${fmt(th.o.pop)} souls</span><br>${r.name}${th.o.w.length?'<br><span class="k">'+th.o.w.map(w=>capF(w.n)).join(', ')+'</span>':''}`}
  else if(th&&th.t==='b')h=`<b style="color:#ff9d80">${th.o.name}</b><br><span class="k">${capF(th.o.kind)}, first seen in year ${th.o.born}</span>`;
  else if(th&&th.t==='w')h=`<b style="color:var(--vermilion)">${th.o.name}</b><br><span class="k">${S.realms[th.o.a].name} against ${S.realms[th.o.b].name} · since ${th.o.start}</span>`;
  else if(th&&th.t==='ruin')h=`<b>Ruins of ${th.o.name}</b><br><span class="k">destroyed in year ${th.o.year}</span>`;
  else h=`${o>=0?`${armsSVG(S.realms[o].arms,26)}<b>${S.realms[o].name}</b><br>`:''}<span class="k">${BIOME[b].n}${G.river[c.cell]?' · river':''}${G.res[c.cell]?' · '+RES[G.res[c.cell]].n:''}${o<0&&isLand(b)?' · unclaimed':''}${X.scar[c.cell]<1?' · <span style="color:var(--violet)">blighted</span>':''}</span>`;
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
  if(wasDrag&&!wasDrag.moved&&e.type==='pointerup'&&S){const th=thingAt(cellAt(e.offsetX,e.offsetY));select(th?{t:th.t,id:th.id}:null);if(e.pointerType!=='mouse')showTip(e.offsetX,e.offsetY)}
  drag=null;cv.classList.remove('dragging');
}
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){$('#tip').hidden=true;hover=null}});
cv.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.deltaY<0?1.18:1/1.18,e.offsetX,e.offsetY)},{passive:false});
