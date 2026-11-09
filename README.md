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

The painted chart fills the screen. A few quiet cards rest on it, each edged like a tarot card: a thin outer line, a finer inner line and a single star.

- **The title** of the world is set directly on the map in widely spaced capitals, with the current age in italic beneath a gilt hairline.
- **The clock** is a slim capsule. A moon waxes and wanes through the four seasons while a point of light travels its orbit. Beside it: *Anno 412 · autumn · CDXII*, the pause button, and the pace (½, 1, 2, 4, 8 seasons a second).
- **Layers** hang on a hairline rail at the left: realms, peoples, faiths, wars, friends and foes, trade, knowledge, population and terrain. Each has a small legend card whose swatches are cut like banners.
- **The codex** (right) holds five sections:
  - *Chronicle:* a hairline timeline with a star at the turning of each year and a symbol for each deed, filtered by importance and by domain sigil.
  - *Realms:* each with its banner, vassals nested beneath their overlords.
  - *Figures*, *Ages* and the *Almanac*.
- **Character sheets** open for every realm, city, army, war, beast and person:
  - **Heading:** a hanging banner, the name in spaced capitals, the house line and the realm's tagline (*Unity. Valour. Mercy.*), and notched status tags.
  - **The ruler's saying** as a quote.
  - **Attribute bars** measured against the leading realm of the world: population, territory, treasury, military, stability and learning.
  - **The rest:** the crown and its heirs, peoples, faith, knowledge, works, friends and foes, holdings, the line of rulers, and the chronicle.
- **Heralds** announce great events, and the **Index** (`/` or Ctrl/Cmd+K) finds anything by name.
- **Keyboard:** `Space` pause, `1`–`5` pace, `F` follow, `B` codex, `Esc` back.

The world is saved in your browser and catches up while you are away (two years per minute, up to 250 years).

## Design system

- **Palette.** Warm ink and bone, one gold, and a thread of red. Realms fly banners in a curated set of muted inks (teal, oxblood, ochre, slate, olive, plum, rust, sage…) instead of a rainbow, so the map stays calm.
- **Banners.** Each realm's banner hangs from a gilt rod and is cut to its people's fashion: pointed for humans, swallowtail for elves, square for dwarves, tattered for orcs, rounded for halflings. It carries the realm's emblem inside a thin orbit between two four-point stars. The same banner appears in lists, on character sheets, in hover cards and above each capital on the map.
- **Domains.** Every event belongs to a domain with a muted ink and a planetary or alchemical sigil (♂ war, ♃ politics, ♀ society, ☉ faith, ☿ trade, 🜃 nature, 🜂 calamity, ☽ magic, ⚸ monsters, 🜔 knowledge, ♄ death). The same sign and colour mark an event in the chronicle, its filter, its herald and its ripple on the map.
- **Ornament.** Hairlines, thin orbits, four-point stars, notched tags and tarot double borders, used sparingly.
- **Letters.** Cormorant Garamond for names and text, in widely spaced capitals for titles and italic for subtitles. Jost for small capitals, labels and figures.
- **Symbols.** Engraved silhouettes from game-icons.net, used for emblems, events, controls and map tokens alike.

## Building

The source lives in `src/`: `icons`, `core`, `data`, `terrain`, `heraldry`, `sim`, `render`, `audio`, `ui` and `main`, plus `style.css` and `shell.html`. `./build.sh` inlines everything into `world.html` (the published page) and `index.html` (standalone). `src/icons.js` is generated by `tools/extract_icons.py` from the `@iconify-json/game-icons` npm package.

## Credits

- Emblems, symbols and heraldic charges: [game-icons.net](https://game-icons.net) by Lorc, Delapouite and contributors, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Fonts: Cormorant Garamond and Jost from Google Fonts, SIL Open Font License.
- Banners, sigils, ornaments, the moon clock, textures and terrain are drawn or generated by the atlas itself.
