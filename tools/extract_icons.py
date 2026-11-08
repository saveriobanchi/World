"""Extract the game-icons.net glyphs used by the atlas into src/icons.js.

Source: @iconify-json/game-icons (CC BY 3.0, game-icons.net contributors).
Usage: python3 tools/extract_icons.py path/to/icons.json
"""
import json, re, sys

NAMES = {
  # chronicle / event glyphs
  'war':'crossed-swords','peace':'peace-dove','ally':'shaking-hands','crown':'crown','death':'tombstone','fall':'broken-shield',
  'ruin':'ancient-ruins','found':'village','rise':'laurel-crown','siege':'siege-tower','capture':'flag-objective','battle':'broadsword',
  'dragon':'dragon-head','giant':'giant','lich':'crowned-skull','serpent':'sea-serpent','hero':'visored-helm','slay':'sword-in-stone',
  'faith':'church','prophet':'scroll-unfurled','plague':'plague-doctor-profile','famine':'wheat','quake':'volcano','flood':'wave-crest',
  'wonder':'greek-temple','tech':'spell-book','golden':'sun','comet':'comet-spark','revolt':'pitchfork','era':'hourglass','ship':'galleon',
  'trade':'caravan','scholar':'quill-ink','artist':'lyre','general':'knight-banner','mage':'wizard-staff','blight':'magic-swirl',
  'winter':'snowflake-1','explorer':'treasure-map','people':'campfire','book':'open-book','coins':'coins','scales':'scales',
  'castle':'castle','tower':'stone-tower','sound':'harp','camera':'treasure-map',
  # resources
  'iron':'ore','gold':'gold-bar','gems':'cut-diamond','timber':'wood-pile','horses':'horse-head','spice':'powder','fish':'fishing','wine':'grapes',
  # heraldic charges
  'c-lion':'lion','c-wolf':'wolf-head','c-eagle':'eagle-emblem','c-stag':'stag-head','c-bear':'bear-head','c-tower':'stone-tower',
  'c-griffin':'griffin-symbol','c-unicorn':'unicorn','c-rose':'rose','c-snake':'snake','c-raven':'raven','c-boar':'boar','c-sun':'sun',
  'c-moon':'moon','c-star':'polar-star','c-dragon':'dragon-head','c-key':'key','c-bull':'bull','c-owl':'owl','c-oak':'oak','c-anvil':'anvil',
  'c-axe':'battle-axe','c-hammer':'thor-hammer','c-sword':'broadsword','c-harp':'harp','c-ship':'drakkar','c-bee':'bee','c-spider':'spider-face',
  'c-frog':'frog','c-skull':'skull-crossed-bones','c-trident':'trident','c-fist':'fist','c-crown':'crown','c-castle':'castle','c-leaf':'oak-leaf',
  'c-pine':'pine-tree','c-howl':'wolf-howl','c-serpent':'sea-serpent','c-fox':'fox-head',
}

def main(path):
    icons = json.load(open(path))['icons']
    out = {}
    for key, name in NAMES.items():
        body = icons[name]['body']
        ds = re.findall(r'\sd="([^"]+)"', body)
        if not ds:
            raise SystemExit(f'no path data in {name}')
        out[key] = ' '.join(ds)
    with open('src/icons.js', 'w') as f:
        f.write('/* Glyphs from game-icons.net by Lorc, Delapouite and contributors, licensed CC BY 3.0. */\n')
        f.write('const ICONS=' + json.dumps(out, separators=(',', ':')) + ';\n')
    print(len(out), 'icons,', sum(len(v) for v in out.values()) // 1024, 'KB')

main(sys.argv[1])
