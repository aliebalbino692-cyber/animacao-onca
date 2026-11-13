#!/usr/bin/env bash
# Junta os quadros renderizados com o áudio final de um episódio.
# Uso: tools/encode.sh ep02 [fps]  ->  saida/<arquivo do episódio>.mp4 (+ versão leve)
set -e
cd "$(dirname "$0")/.."
EP=${1:-ep01}; FPS=${2:-30}
case "$EP" in
  ep01) NAME=ep01-o-farol-da-mare ;;
  ep02) NAME=ep02-a-fumaca-na-mata ;;
  *) NAME=$EP ;;
esac
mkdir -p saida
ffmpeg -y -v error -framerate "$FPS" -i "build/$EP/frames/f%05d.jpg" -i "build/$EP/audio_final.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 192k -shortest "saida/$NAME.mp4"
ffmpeg -y -v error -i "saida/$NAME.mp4" -vf scale=720:1280 -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p \
  -movflags +faststart -c:a aac -b:a 128k "saida/$NAME-leve.mp4"
ls -la "saida/$NAME.mp4" "saida/$NAME-leve.mp4"
