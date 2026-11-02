#!/usr/bin/env bash
# Montaje final del Episodio 001.
# Requiere: segs/s1..s6.mp4 (render del motor), audio/mezcla_final.wav, subtitulos/subtitulos.ass
set -euo pipefail
cd "$(dirname "$0")"
printf "file 's%s.mp4'\n" 1 2 3 4 5 6 > segs/lista.txt
# 1) unir escenas sin recodificar
ffmpeg -y -v error -f concat -safe 0 -i segs/lista.txt -c copy video_mudo.mp4
# 2) quemar subtítulos (única recodificación) y añadir la mezcla de audio
ffmpeg -y -v error -i video_mudo.mp4 -i audio/mezcla_final.wav \
  -map 0:v -map 1:a -vf "ass=subtitulos/subtitulos.ass" \
  -c:v libx264 -preset medium -crf 20 -maxrate 6M -bufsize 12M -pix_fmt yuv420p -r 30 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart episodio-001-geckos.part.mp4
mv episodio-001-geckos.part.mp4 episodio-001-geckos.mp4
echo "OK -> episodio-001-geckos.mp4"
