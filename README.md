# The Living Atlas

A fantasy world that runs by itself. Open `index.html` in a browser and watch it grow, fight, pray, trade, starve, marry and fall apart.

Time passes in seasons, four to a year. At normal speed a year takes about four seconds, so history unfolds at a pace you can follow.

## The world

Each world grows from a random seed: continents with ridged mountain chains, rivers, climates from glaciers to jungle, and eight kinds of resources. Humans, elves, dwarves, orcs and halflings settle the land, and from there everything is simulated:

- **Seasons and food.** Regional weather drives each autumn's harvest. Granaries buffer bad years, and famine and hunger follow poor ones. Farmland spreads around growing towns and forests are cleared. You can watch the patchwork of fields grow on the map.
- **Peoples.** Settlements hold a mix of peoples. Conquest and migration mix them, and minorities assimilate over generations. Hungry or restless towns send migrants to better places, even across borders.
- **Realms, vassals and unions.** Tribes unite into kingdoms and kingdoms into empires. Small realms swear fealty to strong neighbours, pay tribute, follow their overlords to war, and sometimes rise in wars of independence. Long-loyal vassals may be peacefully absorbed.
- **Rulers and dynasties.** Rulers marry, often into neighbouring dynasties, which brings alliances, and have heirs. Succession follows each people's law: primogeniture, elective councils, tanistry or elected mayors. Child rulers get regents. Rulers are assassinated, usurped or killed in battle. A ruler who dies childless can pass the crown to a foreign spouse's house, joining two realms in personal union.
- **War.** Armies are raised from each realm's population and march across the map. They intercept each other, fight battles where terrain, generals, morale and metallurgy matter, and besiege cities, where walls and castles count. Campaigns run from spring to autumn and armies suffer in winter. Wars end through exhaustion, with tribute, vassalage or a stalemate.
- **Economy.** Taxes, resources, markets and trade routes fill treasuries. These pay for armies, court upkeep and buildings: granaries, walls, temples, markets, harbours, mines, barracks, libraries, castles and universities. Neglected buildings fall into ruin. Wealthy realms commission wonders.
- **Knowledge.** Five fields (agriculture, metallurgy, seafaring, arcana, letters) advance through scholars, libraries and universities, and spread along borders and trade routes. The first realm in the world to master a discovery goes down in the legends.
- **Faith.** Prophets found faiths with tenets (pacifist, zealous, mercantile, scholarly and more) that shape how realms behave. Faiths have holy cities, spread through missionaries and temples, survive in secret, and split in schisms.
- **Plague.** Epidemics travel city to city along roads and trade routes, then burn out, leaving survivors immune for a generation.
- **Outlaws, monsters and heroes.** Bandits and pirates raid towns and shipping until they are hunted down. Dragons (with hoards), giants, liches and sea serpents prey on settlements. Heroes hunt them, and some are raised to the throne.
- **Great people.** Scholars, artists, generals, explorers and archmages each change their realm in their own way.
- **The wider world.** Long winters, eruptions, floods, great fires, festivals, tournaments, comets, eclipses, nomad hordes from the wastes and wild-magic blights all occur.
- **Records.** The world keeps an almanac: greatest city, longest reign, bloodiest battle, deadliest plague and more.

## The interface

The page is laid out like a Byzantine imperial codex on a cartographer's table. The painted chart fills the screen inside an engraver's neatline. Around it lie the instruments of a scriptorium:

- **The astrolabe** at the top is the clock of the world. Its needle sweeps through the four seasons, the brass button pauses time, and the crimson banner gives the season and the year, *Anno 412 · CDXII*. The Roman numerals beneath set the pace.
- **The cartouche** carries the world's name in gold-leaf blackletter and the current age.
- **Wax seals** (top right) open the Index (search), the follow camera, the music of the spheres, the settings and the codex.
- **Layer medallions** (left) switch the map between realms, peoples, faiths, wars and armies, diplomacy, trade, knowledge, population and bare terrain. Each layer has a legend slip with heraldic-shield swatches.
- **The codex** (right) is a leaf of purple-dyed vellum, bookmarked with five silk ribbons:
  - *Chronicle:* years rubricated as *Anno* in red, legends opened with blackletter initials, ages marked by gilt titles.
  - *Realms:* vassals nested under their overlords.
  - *Figures:* rulers, armies, monsters, outlaws, heroes and great minds.
  - *Ages:* a timeline of every realm.
  - *Almanac:* the world's ledger and records.
- **Detail pages** for every realm, city, army, war, beast and person are kept like ledgers, with dotted leaders rather than dashboard cards: arms and blazon, line of rulers, works, peoples, knowledge and diplomacy.
- **The scroll** at the bottom, between its wooden rods, charts every realm's population through the centuries. **The inset map** beside it shows where you are looking.
- **Heralds** unfurl a banner for each great event. The **Index** (`/` or Ctrl/Cmd+K) finds anything by name.
- **Keyboard:** `Space` pause, `1`–`5` pace, `F` follow, `B` codex, `Esc` back.

The world is saved in your browser and catches up while you are away (two years per minute, up to 250 years).

## Design system

- **Materials.** Murex-purple vellum with a generated fibre texture, double gilt rules and engraved corner fleurons. Text is in gold and silver ink. Gold leaf is reserved for names: the world, ages, realms and the Index.
- **Domains.** Every event belongs to a domain. Each domain has a medieval pigment and a planetary or alchemical sigil, drawn for the atlas:

  | Sigil | Domain | Pigment |
  |---|---|---|
  | ♂ | War | vermilion |
  | ♃ | Politics | gold leaf |
  | ♀ | Society | rose madder |
  | ☉ | Faith | lead white |
  | ☿ | Trade | malachite |
  | 🜃 | Nature | sap green |
  | 🜂 | Calamity | orpiment |
  | ☽ | Magic | orchil |
  | ⚸ | Monsters | dragon's blood |
  | 🜔 | Knowledge | lapis |
  | ♄ | Death | bone black |

  The same sigil and pigment mark an event in the chronicle, its filter, its herald banner and its ripple on the map.
- **Symbols.** Engraved silhouettes from game-icons.net, used everywhere: inside enamel roundels in the chronicle, as seals and medallions in the controls, and as tokens on the map. The same collection supplies the heraldic charges.
- **Letters.** Grenze Gotisch (blackletter) for names and titles, EB Garamond with old-style figures for the text, and Cormorant SC for rubrics and labels.

## Building

The source lives in `src/`: `icons`, `core`, `data`, `terrain`, `heraldry`, `sim`, `render`, `audio`, `ui` and `main`, plus `style.css` and `shell.html`. `./build.sh` inlines everything into `world.html` (the published page) and `index.html` (standalone). `src/icons.js` is generated by `tools/extract_icons.py` from the `@iconify-json/game-icons` npm package.

## Credits

- Symbols and heraldic charges: [game-icons.net](https://game-icons.net) by Lorc, Delapouite and contributors, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Fonts: Grenze Gotisch, EB Garamond and Cormorant SC from Google Fonts, SIL Open Font License.
- Sigils, ornaments, the astrolabe, textures and terrain are drawn or generated by the atlas itself.
