# Motor 3D del episodio 002

Escenas procedurales en three.js r187: `wombat.js` (wombat de nariz desnuda), `forest.js` (bosque de eucaliptos y cubos), `gut.js` (aparato digestivo en rayos X, corte del intestino, sección transversal y comparación) y `main.js` (línea de tiempo).

Uso: enlaza `three/` con la distribución de three.js r187, sirve esta carpeta (`python3 -m http.server 8124`) y renderiza con
`node renderseg.js 720 1280 30 <salida> s1:0:239 s2:240:449 s3:450:809 s4:810:1184 s5:1185:1484`.
El escalado a 1080×1920 se hace en ffmpeg (Lanczos + unsharp). Después ejecuta `../montaje.sh`.
