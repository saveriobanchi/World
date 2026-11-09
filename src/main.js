/* =====================================================================
   MAIN · loop and boot
   ===================================================================== */
function makeClouds(seed){
  // shadow and cloud baked into one wrapping sheet: drawn four times a frame
  const light=genClouds(seed),w=light.width,h=light.height;
  const dark=document.createElement('canvas');dark.width=w;dark.height=h;const d=dark.getContext('2d');d.drawImage(light,0,0);d.globalCompositeOperation='source-in';d.fillStyle='#0a0f1c';d.fillRect(0,0,w,h);
  const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d');const ox=Math.round(1.6*w/W),oy=Math.round(1.2*h/H);
  c.globalAlpha=.55;for(const ax of[ox-w,ox])for(const ay of[oy-h,oy])c.drawImage(dark,ax,ay);
  c.globalAlpha=1;c.drawImage(light,0,0);
  return out;
}
function afterTicks(newYear){renderHeader();flushLog();uiDirty=true;if(newYear){chartDirty=true;if(S.year%10===0)save()}}
let lastPol=0,lastMini=0;
function frame(now){
  const dt=Math.min(.25,(now-last)/1000);last=now;
  if(S&&playing){acc+=dt*speed;let n=0,y0=S.year;while(acc>=1&&n<16){stepSeason();acc-=1;n++}if(n)afterTicks(S.year!==y0)}
  if(S){
    $('#seasonBar').style.width=(playing?clamp(acc,0,1)*100:0)+'%';
    if(dirtyPol&&now-lastPol>(speed>=4&&playing?200:0)){lastPol=now;rebuildPol()}
    if(chartDirty)drawChart();
    if(uiDirty&&now-lastUi>600){lastUi=now;uiDirty=false;renderCurrent();if(mode!=='terrain')renderLegend()}
    if(miniDirty&&now-lastMini>250){lastMini=now;drawMini()}
  }
  stepCamera(dt);draw(now,dt);Sound.tick();
  requestAnimationFrame(frame);
}
function showBanner(years,events){
  const el=$('#banner');
  el.innerHTML=`<h3>${years} years passed while you were away</h3><p>${S.name} kept turning without you. These were its greatest moments:</p><div class="log">${events.slice(-7).reverse().map(e=>evEl(e,false).outerHTML).join('')||'<div class="empty">The years were quiet.</div>'}</div><button class="btn primary" type="button" id="bannerOk">Continue watching</button>`;
  el.hidden=false;$('#scrim').hidden=false;$('#bannerOk').onclick=()=>{el.hidden=true;$('#scrim').hidden=true};
}
function afterLoad(){
  sel=null;navStack.length=0;fx.length=0;fresh=[];dirtyPol=true;dirtyNet=true;farmDirty=true;chartDirty=true;view.z=1;cam=null;clampView();
  clouds=makeClouds(S.seed);
  renderHeader();rebuildLog();setTab(tab);renderLegend();
  $('#loading').hidden=true;
}
function genesis(seed){
  $('#loadingSub').textContent='Raising mountains…';$('#loading').hidden=false;$('#banner').hidden=true;
  setTimeout(()=>{newWorld(seed);afterLoad();save()},60);
}
function start(data){
  resize();
  setTimeout(()=>{
    let ok=false;
    if(data&&data.save){try{ok=restore(data.save)}catch(e){ok=false}}
    if(!ok)ok=loadSaved();
    if(ok){
      const away=(Date.now()-(S.saved||Date.now()))/60000;const seasons=Math.min(1000,Math.floor(away*8));
      if(seasons>=12&&!(data&&data.save)){$('#loadingSub').textContent='Catching up on lost years…';
        setTimeout(()=>{const y0=S.year;X.silent=true;for(let i=0;i<seasons;i++)stepSeason();X.silent=false;fresh=[];
          const ev=S.legends.filter(e=>e.y>y0&&e.i===2);afterLoad();showBanner(S.year-y0,ev);save();requestAnimationFrame(t=>{last=t;frame(t)})},30);return}
      afterLoad();
    }else{newWorld((Math.random()*2**31)|0);afterLoad();save()}
    requestAnimationFrame(t=>{last=t;frame(t)});
  },60);
}
new ResizeObserver(()=>{resize();chartDirty=true;uiDirty=true;miniDirty=true}).observe($('#mapwrap'));
window.addEventListener('pagehide',()=>{if(S)save()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S)save()});
window.claude?.hot?.snapshot?.(()=>({save:S?serialize():null}));
window.__atlas={get S(){return S},get X(){return X},stepSeason,flyTo,select};
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
