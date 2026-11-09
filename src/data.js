/* =====================================================================
   DATA · domains, categories, seasons, knowledge, buildings, tenets
   ===================================================================== */
// Every event belongs to a domain; the domain sets its colour everywhere it appears.
const DOMAIN={
  war:{n:'War',c:'#ff6b5b'},politics:{n:'Politics',c:'#f4c06a'},people:{n:'Society',c:'#6cc3ff'},faith:{n:'Faith',c:'#b79cff'},
  economy:{n:'Economy',c:'#3ad1a9'},nature:{n:'Nature',c:'#9bd46a'},disaster:{n:'Disaster',c:'#ff9a4d'},magic:{n:'Magic',c:'#f07ff2'},
  monster:{n:'Monsters',c:'#ff5f8f'},knowledge:{n:'Knowledge',c:'#7aa7ff'},death:{n:'Death',c:'#9aa3b5'},
};
const DOMAIN_KEYS=Object.keys(DOMAIN);
const CAT={
  war:['swords','war'],battle:['sword','war'],siege:['building-fortress','war'],capture:['flag-2','war'],revolt:['flame','war'],army:['helmet','war'],
  bandit:['mask','war'],pirate:['anchor','war'],general:['military-award','war'],
  peace:['leaf','politics'],ally:['heart-handshake','politics'],crown:['crown','politics'],rise:['award','politics'],fall:['shield-x','politics'],
  castle:['building-castle','politics'],vassal:['link','politics'],independence:['shield-half','politics'],marriage:['hand-ring-finger','politics'],
  golden:['sun','politics'],era:['hourglass','politics'],intrigue:['spy','politics'],law:['gavel','politics'],union:['crown','politics'],
  birth:['baby-carriage','people'],found:['home','people'],people:['campfire','people'],migration:['walk','people'],festival:['confetti','people'],
  tournament:['trophy','people'],artist:['palette','people'],hero:['shield-star','people'],
  death:['grave-2','death'],ruin:['building-arch','death'],plague:['virus','death'],
  colony:['sailboat','economy'],ship:['ship','economy'],trade:['route','economy'],coins:['coins','economy'],build:['hammer','economy'],
  market:['building-store','economy'],wonder:['building-monument','economy'],
  faith:['building-church','faith'],prophet:['script','faith'],schism:['git-fork','faith'],pilgrim:['pray','faith'],holy:['sparkles','faith'],
  tech:['flask','knowledge'],scholar:['book-2','knowledge'],explorer:['compass','knowledge'],
  mage:['wand','magic'],blight:['spiral','magic'],comet:['comet','magic'],omen:['moon','magic'],
  harvest:['wheat','nature'],winter:['snowflake','nature'],storm:['storm','nature'],thaw:['sun','nature'],
  famine:['grain','disaster'],quake:['volcano','disaster'],flood:['droplet','disaster'],fire:['flame','disaster'],
  dragon:['dragon','monster'],giant:['hand-rock','monster'],lich:['skull','monster'],serpent:['ripple','monster'],slay:['medal','monster'],
};
const catIcon=c=>(CAT[c]||CAT.era)[0];
const catDom=c=>(CAT[c]||CAT.era)[1];
const SEASONS=['Spring','Summer','Autumn','Winter'];
const SEASON_ICON=['seedling','sun','leaf','snowflake'];

// Knowledge advances field by field and spreads along borders and trade routes.
const FIELDS={
  agri:{n:'Agriculture',ico:'wheat',l:['the plough','crop rotation','irrigation canals','windmills','selective breeding','alchemical soil-craft']},
  metal:{n:'Metallurgy',ico:'hammer',l:['bronze casting','iron smelting','tempered steel','mail armour','plate armour','runic forging']},
  sea:{n:'Seafaring',ico:'sailboat',l:['oared galleys','the lateen sail','the lodestone compass','deep-hulled carracks','star charts','aether sails']},
  arcane:{n:'Arcana',ico:'wand',l:['hedge magic','runic wards','circle magic','the arcane lattice','true summoning','planar gates']},
  letters:{n:'Letters',ico:'book-2',l:['writing','law codes','natural philosophy','the printing press','universities','the great encyclopedia']},
};
const FK=Object.keys(FIELDS);
const TECH_AGE=['Stone','Bronze','Iron','Steel','Runes','Arcana','Aether'];

// Buildings are raised from the treasury and change what a settlement can do.
const BUILD={
  granary:{n:'Granary',ico:'grain',cost:250,d:'stores grain against famine',req:s=>s.pop>=700},
  walls:{n:'Walls',ico:'wall',cost:600,d:'doubles the cost of a siege',req:s=>s.pop>=1500},
  temple:{n:'Temple',ico:'building-church',cost:400,d:'steadies the people and spreads the faith',req:s=>s.pop>=1000},
  market:{n:'Market',ico:'building-store',cost:500,d:'raises trade and taxes',req:s=>s.pop>=2000},
  harbor:{n:'Harbour',ico:'anchor',cost:550,d:'sends ships and colonists overseas',req:s=>s.port&&s.pop>=1500},
  mine:{n:'Mines',ico:'pick',cost:450,d:'works nearby iron, gold and gems',req:s=>!!s.ore},
  barracks:{n:'Barracks',ico:'helmet',cost:500,d:'trains larger levies',req:s=>s.pop>=3000},
  library:{n:'Library',ico:'book-2',cost:700,d:'advances learning',req:(s,r)=>s.pop>=5000&&r.k.letters>=2},
  castle:{n:'Castle',ico:'building-castle',cost:1400,d:'a keep that withstands long sieges',req:(s,r)=>s.b.walls&&(r.cap===s.id||s.pop>=8000)},
  university:{n:'University',ico:'school',cost:2200,d:'draws scholars from across the world',req:(s,r)=>s.b.library&&s.pop>=15000&&r.k.letters>=4},
};
const BK=Object.keys(BUILD);
const TENETS={
  Pacifist:{d:'shuns war',ag:-.25},Zealous:{d:'wages holy war',ag:.15,conv:2},Mercantile:{d:'blesses trade',trade:1.3},Ascetic:{d:'prizes austerity',st:6,grow:.92},
  Martial:{d:'glorifies battle',mil:1.15},Scholarly:{d:'reveres learning',tech:1.6},Verdant:{d:'tends the land',food:1.12},Ancestral:{d:'honours the dead',st:4},Missionary:{d:'spreads the word',conv:2.5},
};
const TENET_KEYS=Object.keys(TENETS);
const LAWS={human:'primogeniture',elf:'elective council',dwarf:'primogeniture',orc:'tanistry',halfling:'elected mayoralty'};
const GREAT={
  scholar:{n:'Scholar',w:['the Codex of {a}','On the Nature of {a}','the Book of {a}','the Treatise on {a}'],ico:'scholar'},
  artist:{n:'Artist',w:['the Fresco of {a}','the Lament for {a}','the Ballad of {a}','the Tapestry of {a}'],ico:'artist'},
  general:{n:'General',w:[],ico:'general'},
  explorer:{n:'Explorer',w:[],ico:'explorer'},
  mage:{n:'Archmage',w:['the Grimoire of {a}','the Incantations of {a}'],ico:'mage'},
};
const BANDIT_N=['the Red Hand','the Crows','the Grey Wolves','the Brotherhood of Ash','the Laughing Knives','the Hollow Men','the Black Boar Company','the Free Spears','the Thornback Riders'];
const PIRATE_N=['the Salt Reavers','the Kraken’s Teeth','the Black Gulls','the Drowned Crown','the Tide Wolves','the Brine Sisters','the Red Sails'];
const FESTIVALS=['a midsummer fair','the Feast of Lanterns','a great tourney','the harvest games','a wedding feast that lasted a fortnight','the Night of Masks'];
