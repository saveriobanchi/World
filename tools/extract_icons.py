"""Extract the glyphs used by the atlas into src/icons.js.

  UI, map and event symbols: Tabler Icons (MIT), via @iconify-json/tabler.
  Heraldic charges:          game-icons.net (CC BY 3.0), via @iconify-json/game-icons.

Usage: python3 tools/extract_icons.py path/to/tabler/icons.json path/to/game-icons/icons.json
"""
import json, re, sys

TABLER = '''swords sword building-fortress flag-2 flame leaf heart-handshake crown award shield-off shield-x shield-star shield-half
building-castle link hand-ring-finger baby-carriage grave-2 building-arch home campfire walk sailboat ship route coins hammer
building-store building-church script git-fork pray sparkles flask book-2 palette compass wand spiral building-monument sun virus
wheat grain snowflake volcano droplet comet moon confetti trophy dragon paw ripple skull ghost hand-rock mask anchor hourglass
users users-group user chart-dots mountain world search adjustments-horizontal volume volume-off focus-centered player-play
player-pause x arrow-left chevron-right chevron-down cloud layout-sidebar-right-collapse layout-sidebar-right-expand plus minus
map-pin timeline list command trending-up trending-down bolt scale building-bank pick tree trees fish horse diamond grape
building-lighthouse medal school wall tower tent helmet seedling cloud-rain storm temperature biohazard target crosshair
calendar history gavel eye info-circle star bell-ringing refresh key lock spy bow axe map-2 stack-2 chart-area-line
building-community dice-5 military-award arrows-split tournament meat bread wind circle-dot'''.split()

CHARGES = {
  'c-lion':'lion','c-wolf':'wolf-head','c-eagle':'eagle-emblem','c-stag':'stag-head','c-bear':'bear-head','c-tower':'stone-tower',
  'c-griffin':'griffin-symbol','c-unicorn':'unicorn','c-rose':'rose','c-snake':'snake','c-raven':'raven','c-boar':'boar','c-sun':'sun',
  'c-moon':'moon','c-star':'polar-star','c-dragon':'dragon-head','c-key':'key','c-bull':'bull','c-owl':'owl','c-oak':'oak','c-anvil':'anvil',
  'c-axe':'battle-axe','c-hammer':'thor-hammer','c-sword':'broadsword','c-harp':'harp','c-ship':'drakkar','c-bee':'bee','c-spider':'spider-face',
  'c-frog':'frog','c-skull':'skull-crossed-bones','c-trident':'trident','c-fist':'fist','c-crown':'crown','c-castle':'castle','c-leaf':'oak-leaf',
  'c-pine':'pine-tree','c-howl':'wolf-howl','c-serpent':'sea-serpent','c-fox':'fox-head',
}

def tabler(path):
    data = json.load(open(path)); icons = data['icons']; out = {}
    for name in TABLER:
        key = name if name in icons else data['aliases'][name]['parent']
        body = icons[key]['body']
        parts = []
        for el in re.finditer(r'<path([^>]*)/?>', body):
            attrs = el.group(1)
            d = re.search(r'\sd="([^"]+)"', attrs).group(1)
            parts.append([d, 1 if 'fill="currentColor"' in attrs else 0])
        if not parts:
            raise SystemExit(f'no paths in {name}')
        out[name] = parts
    return out

def charges(path):
    icons = json.load(open(path))['icons']
    return {k: ' '.join(re.findall(r'\sd="([^"]+)"', icons[v]['body'])) for k, v in CHARGES.items()}

ti, ch = tabler(sys.argv[1]), charges(sys.argv[2])
with open('src/icons.js', 'w') as f:
    f.write('/* Symbols: Tabler Icons (MIT, tabler.io). Heraldic charges: game-icons.net by Lorc, Delapouite and contributors (CC BY 3.0). */\n')
    f.write('const TI=' + json.dumps(ti, separators=(',', ':')) + ';\n')
    f.write('const CHARGES=' + json.dumps(ch, separators=(',', ':')) + ';\n')
print(len(ti), 'symbols,', len(ch), 'charges')
