/* =====================================================================
   DATA · domains, categories, seasons, knowledge, buildings, tenets
   ===================================================================== */
// Every event belongs to a domain. Each domain has a medieval pigment and a planetary or alchemical sigil.
const DOMAIN={
  war:{n:'War',c:'#e8603f',p:'vermilion',sig:'M10 14m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M13.6 10.4L20 4M14.5 4H20V9.5'},
  politics:{n:'Politics',c:'#e6b85c',p:'gold leaf',sig:'M5 9c0-4 7-5 7.5-.5C13 12 5 16 5 16h14M15.5 4v16'},
  people:{n:'Society',c:'#e88fa6',p:'rose madder',sig:'M12 9m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M12 14v7M8.5 17.5h7'},
  faith:{n:'Faith',c:'#efe3c4',p:'lead white',sig:'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12m-1.4 0a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0'},
  economy:{n:'Trade',c:'#5cbf93',p:'malachite',sig:'M8 2.5c0 3.2 8 3.2 8 0M12 10m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 14v7M8.5 17.5h7'},
  nature:{n:'Nature',c:'#a3c76c',p:'sap green',sig:'M4 5h16L12 20ZM7.2 10.5h9.6'},
  disaster:{n:'Calamity',c:'#f29c43',p:'orpiment',sig:'M12 4L20.5 19.5h-17Z'},
  magic:{n:'Magic',c:'#c7a2f4',p:'orchil',sig:'M15 3.5a8.5 8.5 0 1 0 0 17a7 7 0 1 1 0-17Z'},
  monster:{n:'Monsters',c:'#d6455b',p:'dragon’s blood',sig:'M14 2.5a6 6 0 1 0 0 11a4.8 4.8 0 1 1 0-11ZM10.5 13.5v8M7 18h7'},
  knowledge:{n:'Knowledge',c:'#78a3ee',p:'lapis',sig:'M12 12m-7.5 0a7.5 7.5 0 1 0 15 0a7.5 7.5 0 1 0-15 0M4.5 12h15'},
  death:{n:'Death',c:'#aaa29c',p:'bone black',sig:'M7 4.5h7M10.5 2v13c0-4.5 7-4.5 7 .5c0 3-3 3.5-3 6'},
};
const DOMAIN_KEYS=Object.keys(DOMAIN);
const CAT={
  war:['swords','war'],battle:['sword','war'],siege:['building-fortress','war'],capture:['flag-2','war'],revolt:['flame','war'],army:['helmet','war'],
  bandit:['mask','war'],pirate:['anchor','war'],general:['military-award','war'],
  peace:['dove','politics'],ally:['heart-handshake','politics'],crown:['crown','politics'],rise:['award','politics'],fall:['shield-x','politics'],
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
