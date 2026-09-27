#!/usr/bin/env bash
# Joins the picture parts, lays the original song under them, and encodes the delivery MP4:
# H.264 High 4.1, 1920x1080, 30 fps, two-pass at a fixed size budget (stays under GitHub's 100 MB file limit),
# AAC 256 kb/s 48 kHz stereo.
set -euo pipefail
cd "$(dirname "$0")/../.."
FF="${FFMPEG_PATH:-ffmpeg}"
PARTS="$1"; OUT="$2"
VBR="${VBR:-6000k}"
LIST="$PARTS/list.txt"; : > "$LIST"
for f in "$PARTS"/p*.mkv; do echo "file '$(realpath "$f")'" >> "$LIST"; done
COMMON=(-f concat -safe 0 -i "$LIST" -i media/audio/ハート泥棒.mp3 -map 0:v:0 -map 1:a:0 -t 118.8
  -c:v libx264 -preset slower -tune animation -profile:v high -level 4.1 -pix_fmt yuv420p
  -b:v "$VBR" -maxrate 14M -bufsize 20M -g 60 -bf 3
  -color_primaries bt709 -color_trc bt709 -colorspace bt709)
"$FF" -hide_banner -loglevel error -y "${COMMON[@]}" -pass 1 -passlogfile "$PARTS/x264" -an -f mp4 /dev/null
"$FF" -hide_banner -loglevel error -y "${COMMON[@]}" -pass 2 -passlogfile "$PARTS/x264" \
  -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart -metadata title="ハート泥棒 — Music Video (v3)" "$OUT"
ls -la "$OUT"
