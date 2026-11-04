# Motor 3D del episodio 004

Escenas procedurales en three.js r187:
- `human.js`: personaje estilizado (Percy Spencer o persona moderna) con cabeza de una sola malla, cara paramétrica (párpados, cejas, boca, mirada), brazos por IK y chocolatina deformable que se derrite.
- `world.js`: laboratorio de 1945 (armarios con válvulas, osciloscopio, magnetrón con bocina, frentes de onda, maíz y palomitas, Radarange), cocina moderna con microondas y vista molecular del agua en un campo oscilante.
- `main.js`: línea de tiempo.

Uso: enlaza `three/` con la distribución de three.js r187, sirve esta carpeta (`python3 -m http.server 8126`) y renderiza con
`node renderseg.js 720 1280 30 <salida> s1:0:227 s2a:228:383 s2b:384:539 s3:540:851 s4:852:947 s5:948:1217 s6:1218:1345 s7:1346:1568`.
Después ejecuta `../montaje.sh`.
