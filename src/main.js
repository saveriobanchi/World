/* =====================================================================
   MAIN · loop and boot
   ===================================================================== */
function makeClouds(seed){
  // shadow and cloud baked into one wrapping sheet: drawn four times a frame instead of eight
  const light=genClouds(seed),w=light.width,h=light.height;
  const dark=document.createElement('canvas');dark.width=w;dark.height=h;const d=dark.getContext('2d');d.drawImage(light,0,0);d.globalCompositeOperation='source-in';d.fillStyle='#0a0f1c';d.fillRect(0,0,w,h);
  const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d');const ox=Math.round(1.6*w/W),oy=Math.round(1.2*h/H);
  c.globalAlpha=.55;for(const ax of[ox-w,ox])for(const ay of[oy-h,oy])c.drawImage(dark,ax,ay);
  c.globalAlpha=1;c.drawImage(light,0,0);
  return out;
}
function afterYears(){renderHeader();flushLog();chartDirty=true;uiDirty=true;if(S.year%20===0)save()}
let lastPol=0;
function frame(now){
  const dt=Math.min(.25,(now-last)/1000);last=now;
  if(S&&playing){acc+=dt*speed;let n=0;while(acc>=1&&n<40){stepYear();X.explore=null;acc-=1;n++}if(n)afterYears()}
  if(S){
    if(dirtyPol&&now-lastPol>(speed>=10&&playing?220:0)){lastPol=now;rebuildPol()}
    if(chartDirty)drawChart();
    if(uiDirty&&now-lastUi>500){lastUi=now;uiDirty=false;
      if(tab==='realms')renderRealms();else if(tab==='inspect')renderInspect();else if(tab==='figures')renderFigures();else if(tab==='ages')renderAges()}
  }
  stepCamera(dt);draw(now,dt);Sound.tick();
  requestAnimationFrame(frame);
}
function showBanner(years,events){
  const el=$('#banner');
  el.innerHTML=`<h3>${years} years passed while you were away</h3><p>${S.name} kept turning without you. These were the greatest events:</p><ul>${events.slice(-7).reverse().map(e=>`<li><b>${e.y}</b>${e.t}</li>`).join('')||'<li>The years were quiet.</li>'}</ul><button class="btn-gold" type="button" id="bannerOk">Continue watching</button>`;
  el.hidden=false;$('#bannerOk').onclick=()=>{el.hidden=true};
}
function afterLoad(){
  sel=null;fx.length=0;fresh=[];dirtyPol=true;dirtyNet=true;chartDirty=true;view.z=1;cam=null;clampView();
  clouds=makeClouds(S.seed);
  renderHeader();rebuildLog();renderInspect();if(tab==='realms')renderRealms();
  $('#loading').hidden=true;
}
function genesis(seed){
  $('#loadingSub').textContent='Raising mountains…';$('#loading').hidden=false;$('#banner').hidden=true;
  setTimeout(()=>{newWorld(seed);afterLoad();save()},40);
}
function start(data){
  resize();
  setTimeout(()=>{
    let ok=false;
    if(data&&data.save){try{ok=restore(data.save)}catch(e){ok=false}}
    if(!ok)ok=loadSaved();
    if(ok){
      const away=(Date.now()-(S.saved||Date.now()))/60000;const yrs=Math.min(250,Math.floor(away*2));
      if(yrs>=3&&!(data&&data.save)){const y0=S.year;X.silent=true;for(let i=0;i<yrs;i++){stepYear();X.explore=null}X.silent=false;fresh=[];
        const ev=S.legends.filter(e=>e.y>y0&&e.i===2);afterLoad();showBanner(yrs,ev);save()}
      else afterLoad();
    }else{newWorld((Math.random()*2**31)|0);afterLoad();save()}
    requestAnimationFrame(t=>{last=t;frame(t)});
  },40);
}
new ResizeObserver(()=>{resize();chartDirty=true;uiDirty=true}).observe($('#mapwrap'));
window.addEventListener('pagehide',()=>{if(S)save()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S)save()});
window.claude?.hot?.snapshot?.(()=>({save:S?serialize():null}));
window.__atlas={get S(){return S},get X(){return X},stepYear,flyTo};
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
