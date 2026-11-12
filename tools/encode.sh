#!/usr/bin/env bash
# Junta os quadros renderizados com o áudio final -> saida/ep01-o-farol-da-mare.mp4
set -e
cd "$(dirname "$0")/.."
FPS=${1:-30}
mkdir -p saida
ffmpeg -y -v error -framerate "$FPS" -i build/frames/f%05d.jpg -i build/audio_final.wav \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 192k -shortest saida/ep01-o-farol-da-mare.mp4
ls -la saida/ep01-o-farol-da-mare.mp4
