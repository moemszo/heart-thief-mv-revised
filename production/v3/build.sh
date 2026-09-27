#!/usr/bin/env bash
# Builds the v3 MV end to end: JIZURA lyric frames → picture (4 parallel parts) → final H.264/AAC MP4.
#   JIZURA_DIR=/path/to/JIZURA production/v3/build.sh
# Needs Node 20+, Python 3 with Pillow + NumPy, FFmpeg with libx264, and Playwright + Chromium (for JIZURA).
set -euo pipefail
cd "$(dirname "$0")/../.."
FF="${FFMPEG_PATH:-ffmpeg}"
WORK="${WORK:-renders/v3}"
OUT="${OUT:-ハート泥棒_MV_v3.mp4}"
mkdir -p "$WORK/parts"
python3 production/v3/analyze_beats.py "$FF"
python3 production/v3/make_jizura_project.py
node production/v3/jizura_export.cjs --out="$WORK/lyrics"
python3 production/v3/measure_lyrics.py "$WORK/lyrics"
for i in 0 1 2 3; do
  node production/v3/render.cjs --lyrics="$WORK/lyrics" --start=$(python3 -c "print($i*29.7)") --duration=29.7 --out="$WORK/parts/p$i.mkv" &
done
wait
production/v3/encode.sh "$WORK/parts" "$OUT"
