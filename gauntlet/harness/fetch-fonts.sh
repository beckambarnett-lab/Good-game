#!/bin/sh
# Cache the game's Google Fonts locally (headless Chromium here can't reach the font CDN). Run once after npm i.
set -e
cd "$(dirname "$0")" && mkdir -p cache/fonts/f && cd cache/fonts
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
curl -sS -A "$UA" 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DotGothic16&family=Yusei+Magic&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap' -o fonts.css
grep -o 'https://fonts.gstatic.com[^)]*' fonts.css | sort -u > urls.txt
# file names are md5(url + newline), which lib.mjs computes the same way
xargs -P 16 -I{} sh -c 'u="{}"; n=$(echo "$u" | md5sum | cut -c1-16); [ -s f/$n ] || curl -sS -o f/$n "$u"' < urls.txt
echo "cached $(ls f | wc -l) font files"
