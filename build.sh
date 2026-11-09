#!/usr/bin/env bash
# Assembles src/ into world.html (the published page body) and index.html (standalone).
set -euo pipefail
cd "$(dirname "$0")"
python3 - <<'EOF'
order = ['art', 'icons', 'core', 'data', 'terrain', 'heraldry', 'sim', 'render', 'audio', 'ui', 'main']
js = '\n'.join(open(f'src/{m}.js').read() for m in order)
css = open('src/style.css').read()
page = open('src/shell.html').read().replace('/*@@CSS@@*/', css).replace('/*@@JS@@*/', js)
open('world.html', 'w').write(page)
head = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<style>body{margin:0}img{max-width:100%}</style>\n</head>\n<body>\n')
open('index.html', 'w').write(head + page + '\n</body>\n</html>\n')
print(f'Built world.html and index.html ({len(page)//1024} KB)')
EOF
