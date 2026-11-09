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

- **Map layers:** Realms (with vassals), Peoples, Faiths, Wars and armies, Diplomacy of the selected realm, Trade, Knowledge, Population and Terrain. Each layer has its own legend.
- **On the map:** armies with banners, campaign lines and siege rings; outlaws; monsters; plague halos; farmland; drifting clouds; seasonal colours; coats of arms on capitals; a minimap.
- **The codex:**
  - *Chronicle:* grouped by year, filterable by importance and by domain.
  - *Realms:* vassals nested under their overlords.
  - *Figures:* sovereigns, armies, monsters, outlaws, heroes and great people.
  - *Ages:* a timeline of every realm's life.
  - *Almanac:* world statistics, shares of peoples and faiths, the frontier of knowledge, and records.
- **Detail pages** cover every realm, city, army, war, monster, person and ruin, with back navigation.
- **Search** with `/` or Ctrl/Cmd+K. Hover cards, toasts for great events, a follow camera and a generative soundtrack.
- **Keyboard:** `Space` play/pause, `1`–`5` speed, `F` follow, `B` toggle the codex, `Esc` back.

The world is saved in your browser and catches up while you are away: two years per minute, up to 250 years.

## Design system

- **Colour.** One dark theme with a single accent (candle-gold). Every event belongs to a domain (War, Politics, Society, Faith, Economy, Nature, Disaster, Magic, Monsters, Knowledge, Death). Each domain has one colour, used everywhere that event appears: chronicle chips, filters, toasts and map ripples.
- **Type.** Fraunces for names in the world, Manrope for the interface, Geist Mono for numbers.
- **Symbols.** Tabler Icons, one stroke weight, drawn the same way in the interface and on the map.

## Building

The source lives in `src/`: `icons`, `core`, `data`, `terrain`, `heraldry`, `sim`, `render`, `audio`, `ui` and `main`, plus `style.css` and `shell.html`. `./build.sh` inlines everything into `world.html` (the published page) and `index.html` (standalone). `src/icons.js` is generated by `tools/extract_icons.py` from the `@iconify-json/tabler` and `@iconify-json/game-icons` npm packages.

## Credits

- Symbols: [Tabler Icons](https://tabler.io/icons), MIT licence.
- Heraldic charges: [game-icons.net](https://game-icons.net) by Lorc, Delapouite and contributors, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Fonts: Fraunces, Manrope and Geist Mono from Google Fonts, SIL Open Font License.
