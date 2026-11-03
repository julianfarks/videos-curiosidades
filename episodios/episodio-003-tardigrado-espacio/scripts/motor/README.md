# Motor 3D del episodio 003

Escenas procedurales en three.js r187:
- `tardigrade.js`: tardígrado con cuerpo segmentado deformable, 4 pares de patas con uñas, ojos expresivos y transición a «tonel» (criptobiosis).
- `world.js`: espacio con la Tierra y la bandeja del experimento, hoja de musgo con gotas y yema de dedo, y laboratorio con aguja, agua y calor.
- `main.js`: línea de tiempo.

Uso: enlaza `three/` con la distribución de three.js r187, sirve esta carpeta (`python3 -m http.server 8125`) y renderiza con
`node renderseg.js 720 1280 30 <salida> s1:0:182 s2:183:278 s3:279:497 s4a:498:683 s4b:684:869 s5:870:1097 s6:1098:1226 s7:1227:1490`.
El escalado a 1080×1920 se hace en ffmpeg (Lanczos + unsharp). Después ejecuta `../montaje.sh`.
