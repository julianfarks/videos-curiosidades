#!/usr/bin/env bash
# Montaje final del Episodio 004. Requiere segs/s1..s7 (s2 en dos partes), audio/mezcla_final.wav, subtitulos/subtitulos.ass
set -euo pipefail
cd "$(dirname "$0")"
printf "file '%s.mp4'\n" s1 s2a s2b s3 s4 s5 s6 s7 > segs/lista.txt
ffmpeg -y -v error -f concat -safe 0 -i segs/lista.txt -c copy video_mudo.mp4
ffmpeg -y -v error -i video_mudo.mp4 -i audio/mezcla_final.wav \
  -map 0:v -map 1:a -vf "ass=subtitulos/subtitulos.ass" \
  -c:v libx264 -preset medium -crf 20 -maxrate 6M -bufsize 12M -pix_fmt yuv420p -r 30 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart episodio-004-origen-microondas.part.mp4
mv episodio-004-origen-microondas.part.mp4 episodio-004-origen-microondas.mp4
echo "OK -> episodio-004-origen-microondas.mp4"
