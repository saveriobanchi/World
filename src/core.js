'use strict';
/* =====================================================================
   THE LIVING ATLAS · core: constants, randomness, noise, peoples, names
   ===================================================================== */
const W=180,H=110,N=W*H;          // simulation grid
const K=4,PW=W*K,PH=H*K;          // terrain sampling resolution
const KR=8,RW=W*KR,RH=H*KR;       // painted map resolution
const SAVE_KEY='living-atlas-v3';
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const mix3=(c1,c2,t)=>[lerp(c1[0],c2[0],t),lerp(c1[1],c2[1],t),lerp(c1[2],c2[2],t)];
const cap1=s=>s.charAt(0).toUpperCase()+s.slice(1).toLowerCase();
const capF=s=>s.charAt(0).toUpperCase()+s.slice(1);
const d2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy};
function roman(n){const m=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let s='';for(const[v,r]of m)while(n>=v){s+=r;n-=v}return s}
function fmt(n){n=Math.round(n);if(n>=1e6)return(n/1e6).toFixed(n>=1e7?0:1)+'M';if(n>=1e4)return Math.round(n/1e3)+'k';if(n>=1e3)return(n/1e3).toFixed(1)+'k';return String(n)}
function fmtDead(n){n=Math.round(n);if(n<1000)return n.toLocaleString('en-US');return(Math.round(n/100)*100).toLocaleString('en-US')}
const ORD=['','First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth'];
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

/* ---------- randomness ---------- */
let S=null,G=null;         // S: saved world state · G: terrain derived from the seed
const X={};                // per-year caches, never saved
function rand(){let a=S.rng=(S.rng+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
const ri=(a,b)=>a+Math.floor(rand()*(b-a+1));
const pick=a=>a[Math.floor(rand()*a.length)];
const chance=p=>rand()<p;
function wpick(arr,f){let t=0;for(const a of arr)t+=Math.max(0,f(a));if(t<=0)return arr[0];let r=rand()*t;for(const a of arr){r-=Math.max(0,f(a));if(r<=0)return a}return arr[arr.length-1]}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- noise ---------- */
function hash2(x,y,s){let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,982451653))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296}
function vnoise(x,y,s,p){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  let x0=xi,x1=xi+1,y0=yi,y1=yi+1;if(p){x0=((x0%p)+p)%p;x1=((x1%p)+p)%p;y0=((y0%p)+p)%p;y1=((y1%p)+p)%p}
  const a=hash2(x0,y0,s),b=hash2(x1,y0,s),c=hash2(x0,y1,s),d=hash2(x1,y1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,y,s,oct){let sum=0,amp=.5,f=1,norm=0;for(let i=0;i<oct;i++){sum+=amp*vnoise(x*f,y*f,s+i*101);norm+=amp;amp*=.5;f*=2.03}return sum/norm}
function fbmP(x,y,s,oct,p){let sum=0,amp=.5,f=1,norm=0;for(let i=0;i<oct;i++){sum+=amp*vnoise(x*f,y*f,s+i*101,p*f);norm+=amp;amp*=.5;f*=2}return sum/norm}

/* ---------- biomes ---------- */
const B={DEEP:0,SEA:1,PLAINS:2,FOREST:3,JUNGLE:4,DESERT:5,SAVANNA:6,TUNDRA:7,SNOW:8,SWAMP:9,HILLS:10,MOUNTAIN:11,PEAK:12,TAIGA:13};
const BIOME=[
  {n:'Deep ocean',f:0},{n:'Coastal sea',f:0},{n:'Grassland',f:1},{n:'Forest',f:.7},{n:'Jungle',f:.6},{n:'Desert',f:.12},{n:'Savanna',f:.6},
  {n:'Tundra',f:.22},{n:'Glacier',f:0},{n:'Marsh',f:.35},{n:'Hills',f:.5},{n:'Mountains',f:.18},{n:'High peaks',f:0},{n:'Taiga',f:.38},
];
const isLand=b=>b>1;

/* ---------- resources ---------- */
const RES=[
  null,
  {k:'iron',n:'Iron',v:3,b:[B.HILLS,B.MOUNTAIN],p:.16},
  {k:'gold',n:'Gold',v:7,b:[B.MOUNTAIN,B.HILLS,B.DESERT],p:.035},
  {k:'gems',n:'Gemstones',v:6,b:[B.MOUNTAIN,B.PEAK,B.JUNGLE],p:.04},
  {k:'timber',n:'Timber',v:2,b:[B.FOREST,B.TAIGA],p:.12},
  {k:'horses',n:'Horses',v:3,b:[B.PLAINS,B.SAVANNA],p:.06},
  {k:'spice',n:'Spices',v:5,b:[B.JUNGLE,B.SAVANNA,B.DESERT],p:.07},
  {k:'fish',n:'Fisheries',v:2,b:['coast'],p:.08},
  {k:'wine',n:'Wine',v:4,b:[B.PLAINS,B.HILLS],p:.04},
];

/* ---------- peoples ---------- */
//              DEEP SEA PLN FOR JUN DES SAV TUN SNW SWP HIL MTN PEK TAI
const RACES={
  human:   {n:'Human',   pl:'humans',   habit:[0,0,1,.6,.35,.25,.75,.2,0,.3,.6,.15,0,.4],  grow:1,   expand:1,   aggr:.5,  martial:1,   life:1,   weapon:'the sword', sea:1},
  elf:     {n:'Elven',   pl:'elves',    habit:[0,0,.45,1,.9,.05,.35,.1,0,.4,.35,.1,0,.7], grow:.72, expand:.8,  aggr:.3,  martial:1.3, life:4,   weapon:'the bow', sea:.7},
  dwarf:   {n:'Dwarven', pl:'dwarves',  habit:[0,0,.3,.3,.1,.15,.2,.35,.05,.1,1,.9,.2,.4],grow:.82, expand:.7,  aggr:.35, martial:1.4, life:2.2, weapon:'the axe', sea:.3},
  orc:     {n:'Orcish',  pl:'orcs',     habit:[0,0,.85,.4,.3,.7,.8,.5,.05,.5,.6,.35,0,.4], grow:1.1, expand:1.2, aggr:.85, martial:1.25,life:.85, weapon:'the cleaver', sea:.6},
  halfling:{n:'Halfling',pl:'halflings',habit:[0,0,1,.55,.2,.1,.5,.15,0,.25,.8,.05,0,.2],  grow:1.15,expand:.9,  aggr:.12, martial:.6,  life:1.3, weapon:'a borrowed sword', sea:.5},
};
const RK=Object.keys(RACES);
const RACE_RGB={human:[214,164,92],elf:[98,176,120],dwarf:[176,120,88],orc:[150,78,70],halfling:[200,190,98]};
const ENMITY={'elf|orc':-35,'dwarf|orc':-35,'dwarf|elf':-12,'human|orc':-15,'halfling|orc':-20,'halfling|human':10,'dwarf|human':5,'elf|halfling':8};
const NM={
  human:{ps:['Al','Bran','Cor','Dun','Ed','Fal','Gar','Hal','Ost','Mer','Ral','Tor','Wes','Ash','Ber','Card','Lin','Mar','Sel','Ver','Rot','Sten','Kel','Ald','Bel','Hen','Wyn','Thorn','Ead','Grey'],
    pe:['ford','wick','ham','mere','dale','gate','holm','bury','stead','moor','haven','ton','field','crest','bridge','march','wall','cross'],
    ce:['ia','or','and','mark','eth','ara','orn','ence','ain','on'],gm:['ric','win','ald','an','old','ard','mund','bert','hal','os'],gf:['a','wyn','is','elle','ane','ith','ild','ora','enna']},
  elf:{ps:['Ae','Ith','Sil','Cal','Lir','Fae','Ny','El','Thal','Ser','Vael','Ili','Aru','Mel','Syl','Quel','Ora','Tir','Esh','Lua'],
    pe:['thil','wen','ara','lis','dor','las','ien','andel','eth','iel','ora','vyn','rith','sael'],
    ce:['ae','eth','ion','ara','essa','iel','ond'],gm:['ion','as','ir','andil','ael','orin'],gf:['iel','wen','ara','ys','ethe','aine']},
  dwarf:{ps:['Bar','Dur','Grom','Thar','Kor','Brun','Mor','Bal','Dvor','Hald','Rag','Thrum','Ost','Gund','Vorn','Bror','Hurn','Skal','Thor','Drak'],
    pe:['hold','delve','forge','deep','gard','mount','heim','anvil','rock','vault','hall','stone'],
    ce:['ak','um','ar','und','eth','grim','orn'],gm:['in','ak','ur','or','grim','ok','rek','rik','li'],gf:['a','is','hild','ra','dis','una']},
  orc:{ps:['Gor','Ugr','Mak','Zug','Kra','Ruk','Grash','Nar','Ghor','Thok','Vrak','Skar','Brug','Yaz','Durz','Mog','Lug','Rak','Ozz','Krag'],
    pe:['ash','gul','mak','rok','zar','gash','thul','dush','kar','grot','mok'],
    ce:['ash','ul','ak','oth','uz','ar'],gm:['ash','ug','ok','nak','gor','ruk','az','th'],gf:['a','ka','sha','ga','zha']},
  halfling:{ps:['Bram','Pip','Tull','Mer','Nib','Ros','Wil','Hob','Fen','Clov','Tam','Bel','Dob','Lob','Bun','Mil','Pud','Hal','Sam','Tod'],
    pe:['bottom','burrow','hollow','well','by','combe','field','brook','ley','dell','wick','green'],
    ce:['ley','ford','wood','dale','mead'],gm:['o','in','y','bert','ry','ock','wise'],gf:['a','ie','ly','sa','belle','ry']},
};
const GOV={
  human:[['Tribes of {c}','{c} Clans'],['Kingdom of {c}','Principality of {c}','Grand Duchy of {c}','Holy Realm of {c}'],['{c} Empire','Empire of {c}']],
  elf:[['{c} Circle','Wildfolk of {c}'],['Realm of {c}','{c} Concord','High Court of {c}'],['{c} Dominion','Eternal Court of {c}']],
  dwarf:[['Clan {c}','{c} Kin'],['{c} Hold','Mountain Kingdom of {c}','{c} Thanedom'],['Under-Empire of {c}','{c} High Kingdom']],
  orc:[['{c} Warband','{c} Tribe'],['{c} Horde','Khaganate of {c}','{c} Warlordship'],['Great Horde of {c}','{c} Dread Empire']],
  halfling:[['{c} Hamlets','{c} Folk'],['{c} Commonwealth','Free Fields of {c}','{c} Mootland'],['{c} Confederacy','Grand Moot of {c}']],
};
const TITLES={
  human:[['Chieftain','Chieftain'],['King','Queen'],['Emperor','Empress']],
  elf:[['Elder','Elder'],['High Lord','High Lady'],['Eternal Sovereign','Eternal Sovereign']],
  dwarf:[['Clanfather','Clanmother'],['Thane-King','Thane-Queen'],['High King','High Queen']],
  orc:[['Warchief','Warchief'],['Khan','Khatun'],['Overlord','Overlord']],
  halfling:[['Elder','Elder'],['Mayor','Mayor'],['Moot-Speaker','Moot-Speaker']],
};
const TRAITS={Wise:{st:1},Just:{st:1,ag:-.1,rel:4},Cruel:{st:-1,ag:.2,rel:-8},Ambitious:{ag:.25},Brave:{ag:.1},Craven:{ag:-.2},Pious:{pi:1},Scholar:{te:1},Mad:{st:-1.5,ag:.3},Greedy:{st:-.5,go:1},Gentle:{ag:-.25,st:.5,rel:6},Builder:{wo:1},Seafarer:{se:1}};
const TRAIT_KEYS=Object.keys(TRAITS);
const WORK_A=['Seven Winds','the Drowned Stars','Silver Rain','the First Kings','Ash and Iron','the Long Road','Hidden Fire','Quiet Waters','the Thousand Doors','Falling Leaves','the Last Summer','Glass Mountains'];

/* ---------- names ---------- */
function placeName(race){const n=NM[race];for(let k=0;k<8;k++){const s=cap1(pick(n.ps)+pick(n.pe)).replace(/(.)\1\1/g,'$1$1');if(!X.names||!X.names.has(s)){X.names&&X.names.add(s);return s}}return cap1(pick(n.ps)+pick(n.pe))}
function coreName(race){const n=NM[race];return cap1(pick(n.ps)+pick(n.ce)).replace(/(.)\1\1/g,'$1$1')}
function given(race,f){const n=NM[race];return cap1(pick(n.ps)+pick(f?n.gf:n.gm)).replace(/(.)\1\1/g,'$1$1')}
function worldName(){return pick(['Ae','Thal','Vor','Ery','Os','Mir','Kal','Ula','Ser','Ith','Bra'])+pick(['dora','ethis','anor','yssia','ia','undar','eth','aris','enmoor','oth'])}
const WAR_N=['Crowns','Ashes','the Broken Oath','Thorns','Salt','the Iron Pass','the Red Banner','Ravens','the Severed Hand','Embers','Three Rivers','the Pale Sun','Tears','Lanterns','Bells','the Long Winter','the Burning Bridges','Silver'];
const CAUSES=['a border dispute','a murdered envoy','a stolen relic','an insult to the crown','grazing rights','a broken marriage pact','old grudges','river tolls','a disputed heir','the mountain passes','a raided caravan','rich mines on the border'];
const F_A=['Burning','Silver','Drowned','Hollow','Eternal','Weeping','Golden','Nameless','Ashen','Starlit','Thousandfold','Iron','Pale','Sleeping','Seventh'];
const F_B=['Eye','Stag','King','Mother','Flame','Tree','Serpent','Moon','Wheel','Crown','Hand','Tide','Lantern','Choir','Gate'];
const F_P=['Church of the {x}','Way of the {x}','Cult of the {x}','Covenant of the {x}','Children of the {x}','Order of the {x}'];
const PL_A=['Grey','Red','Weeping','Crimson','Pale','Laughing','Withering','Blue','Black','Sleeping'];
const PL_B=['Fever','Pox','Cough','Rot','Death','Blight','Sweat','Plague'];
const WON_A=['Glass','Starfall','Golden','Ivory','Ever-Burning','Singing','Endless','Moonlit','Iron','Crystal','Hundred-Bell','Sunken'];
const WON_B=['Spire','Library','Lighthouse','Observatory','Cathedral','Colossus','Arcanum','Bridge','Gardens','Ziggurat','Hall of Ancestors','Amphitheatre'];
