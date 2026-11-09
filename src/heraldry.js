/* =====================================================================
   HERALDRY · procedural coats of arms
   ===================================================================== */
const TINCT={or:'#d4aa3c',argent:'#ece6d6',gules:'#b3302a',azure:'#2a55a3',vert:'#2d7a46',sable:'#1d1c22',purpure:'#6b3a86',tenne:'#b8682a'};
const METALS=['or','argent'],COLOURS=['gules','azure','vert','sable','purpure','tenne'];
const DIVS=['plain','plain','pale','fess','bend','quarterly','chevron','chief','cross','saltire','bordure','fessbar','palebar','bendbar','gyronny'];
const RACE_CHARGES={
  human:['lion','eagle','stag','bear','tower','griffin','rose','key','bull','crown','castle','sword','boar','star','sun'],
  elf:['stag','unicorn','owl','leaf','moon','star','rose','harp','raven','pine','sun','oak','serpent'],
  dwarf:['anvil','hammer','axe','bear','tower','castle','key','bull','crown','star','dragon'],
  orc:['skull','howl','boar','fist','axe','spider','snake','dragon','raven','wolf','bull'],
  halfling:['bee','oak','frog','rose','owl','sun','key','harp','fox','leaf','moon'],
};
const CHARGE_NAME={lion:'a lion',eagle:'an eagle',stag:'a stag’s head',bear:'a bear’s head',tower:'a tower',griffin:'a griffin',rose:'a rose',key:'a key',bull:'a bull',crown:'a crown',castle:'a castle',sword:'a sword',boar:'a boar',star:'a star',sun:'a sun in splendour',unicorn:'a unicorn',owl:'an owl',leaf:'an oak leaf',moon:'a crescent moon',harp:'a harp',raven:'a raven',pine:'a pine tree',oak:'an oak',serpent:'a sea-serpent',anvil:'an anvil',hammer:'a hammer',axe:'an axe',dragon:'a dragon’s head',skull:'a skull',howl:'a howling wolf',fist:'a clenched fist',spider:'a spider',snake:'a serpent',wolf:'a wolf’s head',bee:'a bee',frog:'a frog',fox:'a fox’s head'};
const CHARGE_KEY={wolf:'c-wolf',howl:'c-howl',leaf:'c-leaf',pine:'c-pine',serpent:'c-serpent'};
function makeArms(race,parent){
  const metalFirst=chance(.5);
  const t1=metalFirst?pick(METALS):pick(COLOURS),t2=metalFirst?pick(COLOURS):pick(METALS);
  const a={f:t1,s:t2,d:pick(DIVS),c:pick(RACE_CHARGES[race]),ct:null,mark:null};
  if(parent){a.f=parent.f;a.s=parent.s;a.d=parent.d;a.c=chance(.6)?parent.c:pick(RACE_CHARGES[race]);a.mark=pick(['label','bordure','canton'])}
  // the charge sits on the field: metal on colour, colour on metal
  const fieldIsMetal=METALS.includes(a.f);
  a.ct=['plain','chief','bordure','cross','saltire','fessbar','palebar','bendbar'].includes(a.d)?(fieldIsMetal?pick(COLOURS.filter(c=>c!==a.s)):pick(METALS)):(METALS.includes(a.s)?pick(COLOURS):pick(METALS));
  if(a.ct===a.f)a.ct=fieldIsMetal?'sable':'argent';
  // a charge laid across a divided field must stand apart from both halves
  if(['pale','fess','bend','quarterly','gyronny','chevron'].includes(a.d))a.ct=(a.f==='sable'||a.s==='sable')?'or':'sable';
  return a;
}
const SHIELD='M6 6 H94 V52 C94 86 72 104 50 114 C28 104 6 86 6 52 Z';
function armsSVG(a,size,extra=''){
  if(!a)return'';
  const f=TINCT[a.f],s=TINCT[a.s],ct=TINCT[a.ct];
  const id='cl'+Math.random().toString(36).slice(2,8);
  let div='';
  switch(a.d){
    case'pale':div=`<rect x="50" y="0" width="50" height="120" fill="${s}"/>`;break;
    case'fess':div=`<rect x="0" y="58" width="100" height="62" fill="${s}"/>`;break;
    case'bend':div=`<path d="M0 0 L100 120 L100 0 Z" fill="${s}"/>`;break;
    case'quarterly':div=`<rect x="50" y="0" width="50" height="58" fill="${s}"/><rect x="0" y="58" width="50" height="62" fill="${s}"/>`;break;
    case'chevron':div=`<path d="M0 92 L50 48 L100 92 L100 114 L50 70 L0 114 Z" fill="${s}"/>`;break;
    case'chief':div=`<rect x="0" y="0" width="100" height="32" fill="${s}"/>`;break;
    case'cross':div=`<rect x="42" y="0" width="16" height="120" fill="${s}"/><rect x="0" y="44" width="100" height="16" fill="${s}"/>`;break;
    case'saltire':div=`<path d="M0 0 L12 0 L100 108 L100 120 L88 120 L0 12 Z M100 0 L100 12 L12 120 L0 120 L0 108 L88 0 Z" fill="${s}"/>`;break;
    case'bordure':div=`<path d="${SHIELD}" fill="none" stroke="${s}" stroke-width="16"/>`;break;
    case'fessbar':div=`<rect x="0" y="46" width="100" height="22" fill="${s}"/>`;break;
    case'palebar':div=`<rect x="38" y="0" width="24" height="120" fill="${s}"/>`;break;
    case'bendbar':div=`<path d="M0 8 L14 -4 L104 106 L90 118 Z" fill="${s}"/>`;break;
    case'gyronny':div=`<path d="M50 58 L50 0 L100 0 Z M50 58 L100 58 L100 120 Z M50 58 L50 120 L0 120 Z M50 58 L0 58 L0 0 Z" fill="${s}"/>`;break;
  }
  const big=['plain','bordure','chief'].includes(a.d);
  const cs=big?54:44,cx=50-cs/2,cy=(a.d==='chief'?40:28)+(big?0:4);
  const key=CHARGE_KEY[a.c]||'c-'+a.c;
  const charge=CHARGES[key]?`<g transform="translate(${cx} ${cy}) scale(${cs/512})"><path d="${CHARGES[key]}" fill="${ct}" stroke="${a.ct==='sable'?'rgba(255,240,210,.55)':'rgba(0,0,0,.4)'}" stroke-width="12"/></g>`:'';
  let mark='';
  if(a.mark==='label')mark=`<path d="M22 14 H78 M30 14 V24 M50 14 V24 M70 14 V24" stroke="${a.ct==='argent'?TINCT.sable:TINCT.argent}" stroke-width="4" fill="none"/>`;
  else if(a.mark==='bordure')mark=`<path d="${SHIELD}" fill="none" stroke="${TINCT.argent}" stroke-width="6" stroke-dasharray="7 5"/>`;
  else if(a.mark==='canton')mark=`<rect x="6" y="6" width="26" height="24" fill="${TINCT.argent}"/>`;
  return`<svg class="arms" ${extra} viewBox="0 0 100 120" width="${size}" height="${Math.round(size*1.2)}" aria-hidden="true"><defs><clipPath id="${id}"><path d="${SHIELD}"/></clipPath><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs><g clip-path="url(#${id})"><rect width="100" height="120" fill="${f}"/>${div}${charge}${mark}<rect width="100" height="120" fill="url(#${id}g)"/></g><path d="${SHIELD}" fill="none" stroke="#1a140c" stroke-width="3.5"/><path d="${SHIELD}" fill="none" stroke="#e6c36a" stroke-width="1.2" transform="translate(50 60) scale(.93) translate(-50 -60)" opacity=".55"/></svg>`;
}
function blazon(a){
  if(!a)return'';
  const T=t=>capF(t);
  const d={plain:'',pale:` per pale ${T(a.s)}`,fess:` per fess ${T(a.s)}`,bend:` per bend ${T(a.s)}`,quarterly:` quarterly with ${T(a.s)}`,chevron:`, a chevron ${T(a.s)}`,chief:`, a chief ${T(a.s)}`,
    cross:`, a cross ${T(a.s)}`,saltire:`, a saltire ${T(a.s)}`,bordure:`, a bordure ${T(a.s)}`,fessbar:`, a fess ${T(a.s)}`,palebar:`, a pale ${T(a.s)}`,bendbar:`, a bend ${T(a.s)}`,gyronny:` gyronny of eight ${T(a.s)}`}[a.d];
  return`${T(a.f)}${d}, ${CHARGE_NAME[a.c]||'a charge'} ${T(a.ct)}${a.mark?`, differenced by a ${a.mark}`:''}`;
}
const armsImg={};
function armsImage(r){
  const k=r.id+':'+JSON.stringify(r.arms);let e=armsImg[r.id];
  if(e&&e.k===k)return e.img.complete&&e.img.naturalWidth?e.img:null;
  const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(armsSVG(r.arms,64,'xmlns="http://www.w3.org/2000/svg"'));
  armsImg[r.id]={k,img};return null;
}
