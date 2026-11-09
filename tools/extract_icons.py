"""Extract the glyphs used by the atlas into src/icons.js.

All symbols and heraldic charges come from game-icons.net (CC BY 3.0), via @iconify-json/game-icons.

Usage: python3 tools/extract_icons.py path/to/game-icons/icons.json
"""
import json, re, sys

# Every symbol key used by the code, mapped to an engraved game-icons glyph (or a hand-drawn control glyph).
SYMBOLS = {
  'swords':'crossed-swords','sword':'broadsword','building-fortress':'siege-tower','flag-2':'flag-objective','flame':'flame','leaf':'falling-leaf',
  'dove':'peace-dove','heart-handshake':'shaking-hands','crown':'crown','award':'laurel-crown','shield-off':'broken-shield','shield-x':'broken-shield',
  'shield-star':'visored-helm','shield-half':'checked-shield','building-castle':'castle','link':'linked-rings','hand-ring-finger':'big-diamond-ring',
  'baby-carriage':'baby-bottle','grave-2':'tombstone','building-arch':'ancient-ruins','home':'village','campfire':'campfire','walk':'walking-boot',
  'sailboat':'sailboat','ship':'galleon','route':'caravan','coins':'coins','hammer':'claw-hammer','building-store':'shop','building-church':'church',
  'script':'scroll-unfurled','git-fork':'crossroad','pray':'prayer','sparkles':'sparkles','flask':'fizzing-flask','book-2':'open-book','palette':'palette',
  'compass':'compass','wand':'wizard-staff','spiral':'magic-swirl','building-monument':'greek-temple','sun':'sun','virus':'plague-doctor-profile',
  'wheat':'wheat','grain':'grain','snowflake':'snowflake-2','volcano':'volcano','droplet':'water-drop','comet':'comet-spark','moon':'moon',
  'confetti':'jester-hat','trophy':'trophy','tournament':'trophy-cup','dragon':'dragon-head','paw':'giant','ripple':'sea-serpent','skull':'crowned-skull',
  'ghost':'ghost','hand-rock':'giant','mask':'hood','spy':'stiletto','anchor':'anchor','hourglass':'hourglass','timeline':'sands-of-time',
  'users':'family-tree','users-group':'three-friends','user':'person','chart-dots':'village','mountain':'mountains','world':'world',
  'search':'magnifying-glass','adjustments-horizontal':'settings-knobs','volume':'harp','volume-off':'harp','focus-centered':'spyglass',
  'cloud':'fluffy-cloud','layout-sidebar-right-collapse':'open-book','layout-sidebar-right-expand':'book-cover','map-pin':'position-marker',
  'list':'quill-ink','scale':'scales','building-bank':'locked-chest','pick':'mining','tree':'oak','trees':'pine-tree','fish':'fishing',
  'horse':'horse-head','diamond':'cut-diamond','grape':'grapes','building-lighthouse':'lighthouse','medal':'medal','military-award':'medal',
  'school':'bookshelf','wall':'stone-wall','tower':'stone-tower','tent':'camping-tent','helmet':'barbute','seedling':'sprout','storm':'tornado',
  'gavel':'scales','star':'star-formation','chart-area-line':'histogram','building-community':'tower-flag','crosshair':'eye-target','refresh':'cycle',
  'trophy-almanac':'trophy','astrolabe':'sundial','telescope':'telescope','map':'treasure-map','crystal':'crystal-ball','star-shield':'checked-shield',
}
# Plain geometric controls, drawn on the same 512 grid as the engraved glyphs.
HANDMADE = {
  'player-play':'M156 92 L420 256 L156 420 Z',
  'player-pause':'M140 96h84v320h-84zM288 96h84v320h-84z',
  'plus':'M222 92h68v130h130v68H290v130h-68V290H92v-68h130z',
  'minus':'M92 222h328v68H92z',
  'x':'M144 96l112 112 112-112 48 48-112 112 112 112-48 48-112-112-112 112-48-48 112-112-112-112z',
  'arrow-left':'M228 92L64 256l164 164 48-48-82-82h254v-68H194l82-82z',
  'chevron-down':'M92 180l48-48 116 116 116-116 48 48-164 164z',
  'chevron-right':'M180 92l-48 48 116 116-116 116 48 48 164-164z',
  'circle-dot':'M256 168a88 88 0 1 0 .1 0z',
}
CHARGES = {
  'c-lion':'lion','c-wolf':'wolf-head','c-eagle':'eagle-emblem','c-stag':'stag-head','c-bear':'bear-head','c-tower':'stone-tower',
  'c-griffin':'griffin-symbol','c-unicorn':'unicorn','c-rose':'rose','c-snake':'snake','c-raven':'raven','c-boar':'boar','c-sun':'sun',
  'c-moon':'moon','c-star':'polar-star','c-dragon':'dragon-head','c-key':'key','c-bull':'bull','c-owl':'owl','c-oak':'oak','c-anvil':'anvil',
  'c-axe':'battle-axe','c-hammer':'thor-hammer','c-sword':'broadsword','c-harp':'harp','c-ship':'drakkar','c-bee':'bee','c-spider':'spider-face',
  'c-frog':'frog','c-skull':'skull-crossed-bones','c-trident':'trident','c-fist':'fist','c-crown':'crown','c-castle':'castle','c-leaf':'oak-leaf',
  'c-pine':'pine-tree','c-howl':'wolf-howl','c-serpent':'sea-serpent','c-fox':'fox-head',
}

def symbols(path):
    data = json.load(open(path)); icons = data['icons']; out = {}
    for key, name in SYMBOLS.items():
        ds = re.findall(r'\sd="([^"]+)"', icons[name]['body'])
        out[key] = [[' '.join(ds), 1]]
    for key, d in HANDMADE.items():
        out[key] = [[d, 1]]
    return out

def charges(path):
    icons = json.load(open(path))['icons']
    return {k: ' '.join(re.findall(r'\sd="([^"]+)"', icons[v]['body'])) for k, v in CHARGES.items()}

ti, ch = symbols(sys.argv[1]), charges(sys.argv[1])
with open('src/icons.js', 'w') as f:
    f.write('/* Symbols and heraldic charges: game-icons.net by Lorc, Delapouite and contributors (CC BY 3.0). Control glyphs drawn for the atlas. All on a 512 grid. */\n')
    f.write('const TI=' + json.dumps(ti, separators=(',', ':')) + ';\n')
    f.write('const CHARGES=' + json.dumps(ch, separators=(',', ':')) + ';\n')
print(len(ti), 'symbols,', len(ch), 'charges')
