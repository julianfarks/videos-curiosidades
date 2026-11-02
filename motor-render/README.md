# Motor de render 3D — Curiosidades Extraordinarias

Animación 3D procedural y determinista hecha con **three.js r187** y renderizada fotograma a fotograma en Chromium headless (Playwright, WebGL por SwiftShader). Todo (personajes, escenarios, mundo microscópico, escena molecular, cámara y efectos) se genera por código, sin modelos externos.

## Archivos
- `src/main.js` — línea de tiempo maestra (escenas S1–S6), cámaras y transiciones.
- `src/gecko.js` — gecko procedural: cuerpo deformable, ojos, lengua, ciclo de marcha con IK y despegue de dedos.
- `src/man.js` — personaje humano con expresiones (susto, sospecha, parpadeo).
- `src/room.js` — sala, mobiliario e iluminación cálida/fría.
- `src/micro.js` — bosque de setas/espátulas (instancing) y modo contacto con cristal.
- `src/molecular.js` — espátulas sobre cristal y escena atómica de Van der Waals.
- `src/post.js` — DOF, bloom, tonemapping y shader de gradación (viñeta, grano, flash, zoom radial, rebobinado VHS).
- `renderseg.js` — renderiza rangos de fotogramas y los codifica por escena.
- `shot.js`, `sheet.js` — fotogramas sueltos / hojas de contacto para revisar.

## Uso
```bash
# 1) three.js (no se versiona aquí)
git clone --depth 1 --filter=blob:none --sparse https://github.com/mrdoob/three.js three
(cd three && git sparse-checkout set build examples/jsm)
# 2) servidor local
python3 -m http.server 8123 --bind 127.0.0.1 &
# 3) render por escenas (720x1280 interno -> 1080x1920 Lanczos, 30 fps)
node renderseg.js 720 1280 30 ../episodios/episodio-001-geckos/segs s1:0:239 s2:240:389 s3:390:533 s4:534:875 s5:876:1247 s6:1248:1559
```
Para un episodio nuevo: copiar `src/` a una rama/carpeta del episodio, sustituir personajes/escenas y mantener `post.js` + parámetros de la Biblia Visual.
