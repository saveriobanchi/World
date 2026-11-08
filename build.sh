#!/usr/bin/env bash
# Wraps world.html (the page body, also published as an Artifact) into a standalone index.html.
set -euo pipefail
cd "$(dirname "$0")"
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>body{margin:0}img{max-width:100%%}</style>\n</head>\n<body>\n'
  cat world.html
  printf '\n</body>\n</html>\n'
} > index.html
echo "Built index.html"
