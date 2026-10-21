#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="$ROOT/docs/media"
SOURCE="$ROOT/.github/readme-media/source"
CHROMIUM_BIN="${CHROMIUM_BIN:-chromium}"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

render_loop() {
  local name="$1" page="$2" width="$3" height="$4" frames="${5:-12}"
  local dir="$TMP/$name"
  mkdir -p "$dir"
  for ((frame=0; frame<frames; frame++)); do
    printf -v number '%02d' "$frame"
    echo "[$name] Rendering frame $((frame + 1))/$frames"
    "$CHROMIUM_BIN" --headless --no-sandbox --disable-dev-shm-usage --disable-gpu --disable-extensions \
      --user-data-dir="$dir/profile-$number" --hide-scrollbars --window-size="$width,$height" \
      --virtual-time-budget=250 --screenshot="$dir/frame-$number.png" \
      "file://$SOURCE/$page?frame=$frame" >/dev/null 2>&1
    test -s "$dir/frame-$number.png"
  done
  "$CHROMIUM_BIN" --headless --no-sandbox --disable-dev-shm-usage --disable-gpu --disable-extensions \
    --user-data-dir="$dir/still-profile" --hide-scrollbars --window-size="$width,$height" \
    --virtual-time-budget=250 --screenshot="$OUT/$name-still.png" \
    "file://$SOURCE/$page?frame=0" >/dev/null 2>&1
  test -s "$OUT/$name-still.png"
  ffmpeg -loglevel error -y -framerate 4 -start_number 0 -i "$dir/frame-%02d.png" \
    -vf "scale='min(1200,iw)':-2:flags=lanczos,palettegen=max_colors=128:stats_mode=diff" \
    -frames:v 1 "$dir/palette.png"
  ffmpeg -loglevel error -y -framerate 4 -start_number 0 -i "$dir/frame-%02d.png" -i "$dir/palette.png" \
    -lavfi "scale='min(1200,iw)':-2:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4" \
    -loop 0 "$OUT/$name.gif"
}

render_loop hero hero.html 1280 620 12
render_loop breathing breathing.html 720 400 12
printf 'Rendered README media in %s\n' "$OUT"
